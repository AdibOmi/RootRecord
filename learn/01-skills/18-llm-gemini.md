# 18 — LLM APIs: Google Gemini vision + structured output

> **Where it lives:** `backend/app/services/extraction_service.py` (the call),
> `backend/app/services/prescription_service.py:74-176` (sanitising + background flow),
> `backend/app/core/config.py:30-33` (key/model), UI for uncertainty in
> `frontend/src/features/prescriptions/form.ts:127-133` and `pages/PrescriptionReviewPage.tsx:135-141`.
> SDK: `google-genai>=2.33,<3` (`requirements.txt:13`).

---

## 1. What & why

**LLM (Large Language Model)** — a neural network trained on huge text (and, for multimodal models,
image) corpora that predicts the next **token**; prompted well, it can transcribe, summarise,
classify and extract. **Gemini** — Google's multimodal model family; "flash" models are fast and
cheap. **Vision / multimodal input** — sending images alongside text.

**Structured output** — constraining the model to return JSON matching a **JSON Schema**, so code
can parse it reliably.

**The job here:** turn a photo of a handwritten Bangladeshi dental prescription into fields
(patient, date, diagnosis, procedures, medicines, advice, follow-up) — classic **document
extraction**, previously done with OCR + rules.

**Analogy:** a fast junior assistant who can read messy handwriting but sometimes guesses; you ask
them to mark what they weren't sure about, and a dentist signs off on everything.

**When NOT to use an LLM:** when exact, auditable, deterministic results are legally required with
no human review; when a regex or OCR + template is enough; when data can't leave your network
(unless you self-host a model).

---

## 2. Fundamentals

### 2.1 The call

📍 `extraction_service.py:137-169`:

```python
def extract(images: list[bytes], media_type: str = "image/jpeg", today: date | None = None) -> dict[str, Any]:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise ExtractionError("Automatic reading is not set up (no Gemini API key). Fill in the details by hand.")
    client = genai.Client(
        api_key=settings.gemini_api_key,
        http_options=types.HttpOptions(
            timeout=90_000,  # milliseconds
            # The free tier often answers 503 (busy); reading runs in the background, so retry.
            retry_options=types.HttpRetryOptions(attempts=3),
        ),
    )
    today_text = (today or date.today()).isoformat()
    response = client.models.generate_content(
        model=settings.gemini_model,                       # "gemini-3.6-flash" by default
        contents=[
            *(types.Part.from_bytes(data=image, mime_type=media_type) for image in images),  # every page
            f"Today's date is {today_text}.",              # grounding for relative/2-digit dates
        ],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_json_schema=EXTRACTION_SCHEMA,
            max_output_tokens=16000,
        ),
    )
```

| Piece | Why |
|---|---|
| Graceful "no key" | the app still works; staff type the record by hand (`README.md:15`) |
| `timeout` 90 s | never hang a worker thread forever |
| `retry_options` attempts=3 | free tier returns transient 503s; safe because the read is idempotent and runs in the background |
| all pages in one request | the model sees front + back as one prescription (`test_pages_are_read_together`) |
| today's date in the prompt | models don't know "today"; needed for "after 7 days" and 2-digit years |
| `system_instruction` | role + rules, separate from the content |
| `response_json_schema` | constrained decoding → valid JSON shape |
| `max_output_tokens` | cost/latency cap; also detect truncation |

### 2.2 Tokens, context, cost

- **Token** — a chunk of text (~4 English characters); images are converted to a number of tokens
  based on resolution. Pricing and limits are per input/output token.
- **Context window** — max tokens per request (input + output).
- Cost control here: images are **downscaled to ≤ 2400 px** on the phone and the server
  (`frontend/src/lib/image.ts:2`, `prescription_service.py:32`: "keeps uploads to Gemini small"),
  output capped at 16k tokens, one request per prescription.
- **Rate limits** — requests/tokens per minute; 429 is mapped to a friendly message (`:175-178`).

### 2.3 The JSON Schema

📍 `extraction_service.py:24-84` (abridged):

```python
_NULLABLE_STRING = {"type": ["string", "null"]}
EXTRACTION_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["patient", "visit_date", "chief_complaint", "diagnosis", "procedures",
                 "medications", "advice", "follow_up_date", "notes", "uncertain_fields"],
    "properties": {
        "patient": {"type": "object", "additionalProperties": False,
                    "required": ["patient_id", "full_name", "age_years", "sex", "phone"],
                    "properties": {"patient_id": _NULLABLE_STRING, "age_years": {"type": ["integer", "null"]},
                                   "sex": {"anyOf": [{"type": "string", "enum": ["male", "female", "other"]}, {"type": "null"}]}, …}},
        "visit_date": {**_NULLABLE_STRING, "description": "YYYY-MM-DD"},
        "medications": {"type": "array", "items": {"type": "object", "required": ["name", "dosage", "frequency", "duration", "instructions"], …}},
        "uncertain_fields": {"type": "array", "items": {"type": "string"}},
    },
}
```

Design choices:
- **Every key required, nullable values** — the model must *decide* "unknown = null" for each field
  instead of silently omitting keys; parsing code never hits `KeyError`.
- `additionalProperties: False` — no invented fields.
- `enum` for sex; `description` hints the date format.
- `uncertain_fields` — the model self-reports low-confidence fields using dotted paths
  (`"medications.1.frequency"`), which the UI turns into **Check** badges.

### 2.4 The prompt

📍 `SYSTEM_PROMPT` (`extraction_service.py:86-134`) is a good example of **prompt engineering**:

1. **Role + task:** "You transcribe photographs of handwritten prescriptions from a dental clinic in
   Bangladesh into structured data."
2. **Priority rule:** "accuracy matters more than completeness: if you cannot read something with
   confidence, leave it null rather than guessing, and list the field in uncertain_fields." —
   reduces **hallucination** (confident but false output).
3. **Domain knowledge:** abbreviations (C/C, O/E, Dx, Rx, Adv, Inv), dose patterns (`1+0+1`),
   **Palmer notation** for teeth and how to map quadrants to **FDI** numbers.
4. **Output conventions:** dates are DD/MM in → ISO out; keep dose patterns verbatim; keep Bangla
   as Bangla; expand abbreviations only in instructions.
5. **Fallback:** "If the image is not a prescription or is unreadable, return nulls and empty lists
   and explain in notes."

---

## 3. Intermediate

### 3.1 Error handling (map provider errors to user-safe messages)

📍 `extraction_service.py:170-199`:

| Condition | Message shown to staff |
|---|---|
| `APIError` 401/403 or 400 "API key" | "The Gemini API key was rejected. Ask the admin to check it." |
| 429 | "The free reading limit has been reached for now…" |
| other `APIError` | logged with code, generic "could not be read" |
| `httpx.TransportError` | "Could not reach the reading service. Check the internet connection." |
| `prompt_feedback.block_reason` | "declined this image" (input blocked by safety filters) |
| `finish_reason == MAX_TOKENS` | "too long to read automatically" (output truncated → JSON incomplete) |
| `finish_reason in (SAFETY, PROHIBITED_CONTENT)` | "declined this image" |
| empty text / invalid JSON | generic + log first 200 chars |

`ExtractionError` (`:20-21`) carries only staff-safe text; `read_in_background` stores it on the draft
(`prescription_service.py:163-172`) instead of raising — the photo is never lost (`README.md:15`).

### 3.2 Never trust model output: sanitise

Even with a schema, treat output as untrusted input. 📍 `prescription_service.py:74-120`:

```python
def _text(value, limit=4000):            # non-strings → None, trim, cap length, '' → None
def _date(value):                        # invalid ISO dates → None (no crash on "2026-13-45")
def _strings(values):                    # lists of cleaned, non-empty strings, max 50
def _medications(values):                # drop items without a name, validate via Medication model
def _apply_extraction(prescription, data):
    prescription.extracted = data        # keep the raw output for audit/comparison
    prescription.visit_date = _date(data.get("visit_date"))
    …
```

Tested by `test_scan_creates_a_cleaned_up_draft` (blank procedures `"  "` and a nameless medicine are
dropped, `tests/test_prescriptions.py:171-190`).

### 3.3 Human-in-the-loop

**Human-in-the-loop (HITL)** — AI output is a *draft* that a qualified person must approve. Here:
- Status `draft` until a dentist saves (`models/patient.py:20-24`).
- Only `ClinicalUser` can file (`api/v1/prescriptions.py:98-104`).
- UI flags uncertain fields and missing phone numbers (`PrescriptionReviewPage.tsx:228-233, 399-401`).
- Patient **matching** suggestions (same ID / phone / similar name) instead of auto-linking
  (`patient_service.py:137-180`); only strong matches are pre-selected (`form.ts:59-66`).

This is the single most important design decision to talk about in interviews.

### 3.4 Asynchronous UX for slow models

LLM calls take 15–40 s (`README.md:10`). The API returns a draft immediately and reads in a
**background task**; the UI polls every 2 s (`features/prescriptions/hooks.ts:10, 35`) and the form
remounts when reading finishes (`PrescriptionReviewPage.tsx:93-94`). Staff can scan the next
prescription meanwhile.

---

## 4. Advanced

### 4.1 Prompt injection

**Prompt injection** — content (here, text *written on the photographed paper*) that tries to
override instructions ("ignore previous instructions…"). Impact is limited because: output is
schema-constrained, sanitised, never executed, and reviewed by a dentist. Never let model output
trigger privileged actions without validation.

### 4.2 Evaluation

LLM features need **evals**: a labelled set of real (anonymised) prescriptions, run on each prompt
or model change, scoring field-level accuracy. 💡 Because `extracted` (raw model output) and the
dentist's final values are both stored, the app already collects the data to measure accuracy per
field — a strong interview talking point.

### 4.3 Determinism and parameters

`temperature` (randomness), `top_p`, `top_k`, `seed`. Not set here (defaults). For extraction, a low
temperature is usually preferable for consistency; structured output already narrows choices.

### 4.4 Streaming

Streaming returns tokens as they're generated (SSE) — great for chat UIs, pointless for JSON that
must be complete before use. Not used.

### 4.5 Privacy, compliance, cost

- ⚠️ Free tier data may be used by Google (`README.md:43`) → use a paid tier / Vertex AI with a data
  processing agreement for real patient data.
- Logs: avoid writing model output containing patient data (⚠️ `extraction_service.py:198`).
- Cost per read ≈ (image tokens × pages + prompt tokens) × input price + output tokens × output
  price; batch/flash models are cheapest.

### 4.6 Model configuration

Model name is configurable (`GEMINI_MODEL`, `core/config.py:33`), so upgrading needs no code change.
⚠️ A new `genai.Client` is created per call (`:146`); reusing one client would reuse HTTP
connections (minor at this volume).

---

## 5. Comparisons

| X vs Y | Answer |
|---|---|
| LLM extraction vs classic OCR (Tesseract) + regex | handles messy handwriting, layout, abbreviations, Bangla mix vs cheap, deterministic, brittle |
| Gemini vs GPT-4o vs Claude | all multimodal with structured output; choice by price, latency, accuracy on your eval set, data terms |
| JSON mode vs JSON Schema structured output | "valid JSON" vs "valid JSON *of this shape*" |
| function/tool calling vs structured output | model chooses to call tools with args vs always returns one schema |
| sync call vs background job | blocks the request vs instant response + polling |
| hosted API vs self-hosted model | quality, zero ops vs privacy/control, GPU cost |

---

## 6. Patterns & anti-patterns

- ✅ Schema-constrained output, sanitisation, raw output stored, human approval, friendly errors,
  retries with timeouts, graceful degradation without a key, stubbed in tests.
- ❌ Trusting output blindly; synchronous calls in request handlers; sending full-resolution images;
  logging prompts/responses with PII; hard-coding model names.

---

## 7. Cheat sheet

```python
client = genai.Client(api_key=KEY, http_options=types.HttpOptions(timeout=90_000,
            retry_options=types.HttpRetryOptions(attempts=3)))
resp = client.models.generate_content(model=MODEL,
         contents=[types.Part.from_bytes(data=img, mime_type="image/jpeg"), "text"],
         config=types.GenerateContentConfig(system_instruction=PROMPT,
           response_mime_type="application/json", response_json_schema=SCHEMA, max_output_tokens=16000))
resp.text; resp.candidates[0].finish_reason; resp.prompt_feedback.block_reason
except errors.APIError as e: e.code, e.message
```

---

## 8. Why Gemini here

A free tier with vision and JSON-schema output lets a single clinic try automatic reading at zero
cost (`README.md:10, 43`); Flash models are fast enough for background reads. The service is isolated
behind one function (`extract`) so swapping providers means rewriting ~60 lines.
