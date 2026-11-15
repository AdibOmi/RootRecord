# LLM APIs & Gemini — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

## Concepts

**Q:** 🟢 What is a large language model?

**A:** A neural network trained to predict the next token on huge datasets; with prompting it can transcribe, extract, summarise and reason.

**Q:** 🟢 What is a multimodal model?

**A:** One that accepts multiple input types (text + images); Gemini reads prescription photos directly.

**Q:** 🟢 What is a token?

**A:** A chunk of text (~4 English characters) — or an image tile's encoded representation — used for billing and context limits.

**Q:** 🟢 What is a context window?

**A:** The maximum tokens (input + output) a model processes in one request.

**Q:** 🟢 What is a prompt?

**A:** The instructions and inputs sent to the model; here `SYSTEM_PROMPT` + images + today's date (`extraction_service.py:86-134, 159-162`).

**Q:** 🟢 What is a system instruction?

**A:** A high-priority instruction defining the model's role and rules, separate from user content (`system_instruction=SYSTEM_PROMPT`, `:164`).

**Q:** 🟢 What is structured output?

**A:** Constraining the response to JSON matching a schema (`response_mime_type="application/json"`, `response_json_schema`, `:165-166`).

**Q:** 🟢 What is hallucination?

**A:** Confident but false output. Mitigated by "leave it null rather than guessing" and uncertainty reporting (`:90-91`).

**Q:** 🟢 What does `max_output_tokens` do?

**A:** Caps response length, bounding cost and latency; hitting it sets `finish_reason=MAX_TOKENS` (`:167, 187`).

**Q:** 🟢 What happens without a Gemini key?

**A:** `ExtractionError` "Automatic reading is not set up"; staff fill the form manually (`:142-145`).

**Q:** 🟡 Why make every schema property required but nullable?

**A:** Forces an explicit value for every field (null if unknown) and guarantees keys exist for parsing.

**Q:** 🟡 What does `additionalProperties: false` do?

**A:** Prevents the model from inventing extra fields.

**Q:** 🟡 What is `uncertain_fields`?

**A:** The model's list of dotted paths it's unsure about; the UI shows "Check" badges on those fields (`form.ts:131-133`).

**Q:** 🟡 Why send all pages in one request?

**A:** Front/back pages belong to one prescription; the model needs the full context to fill one record.

**Q:** 🟡 Why include today's date?

**A:** To resolve relative follow-ups ("after 7 days") and 2-digit years — models don't know the current date.

**Q:** 🟡 How does the prompt handle Palmer notation?

**A:** It explains the quadrant symbols and instructs converting to two-digit FDI numbers (`:99-105, 123-126`).

**Q:** 🟡 Why keep dose patterns like `1+0+1` verbatim?

**A:** They're the clinic's convention; converting could introduce errors (`:116-117`).

**Q:** 🟡 How are API errors mapped?

**A:** 401/403/invalid key → "key rejected"; 429 → "limit reached"; other → generic; transport errors → "check internet" (`:170-182`).

**Q:** 🟡 What do `finish_reason` and `block_reason` tell you?

**A:** Why generation stopped (STOP, MAX_TOKENS, SAFETY…) and whether the prompt was blocked; handled with specific messages (`:184-190`).

**Q:** 🟡 Why configure timeouts and retries?

**A:** Avoid hanging threads (90 s) and survive transient 503s on the free tier (3 attempts) (`:146-152`).

**Q:** 🟡 Why is retrying safe for this call?

**A:** Reading is idempotent and runs in the background; duplicate calls only cost tokens.

**Q:** 🟡 Why sanitise output despite structured output?

**A:** Schemas constrain shape not content — strings may be blank/too long, dates invalid, medicines nameless (`prescription_service.py:74-120`).

**Q:** 🟡 What is human-in-the-loop?

**A:** AI output is a draft; a qualified person must review and approve before it becomes a record (`ClinicalUser` saves, `prescriptions.py:98-104`).

**Q:** 🟡 Why run the LLM call in the background?

**A:** It takes 15–40 s; the API answers immediately and the UI polls until `reading` is false (`README.md:10`).

**Q:** 🟡 How does the system detect a read that died mid-way?

**A:** `reading_started_at` older than 5 minutes → "interrupted", re-read allowed (`prescription_service.py:37-38, 123-131`).

**Q:** 🟡 How does the app reduce token cost for images?

**A:** Downscales to ≤ 2400 px on the phone and server (`lib/image.ts:2`, `prescription_service.py:32`).

**Q:** 🟡 What is `temperature`?

**A:** Sampling randomness; lower values make outputs more deterministic — sensible for extraction (not set here, defaults used).

**Q:** 🟡 What is streaming and why isn't it used?

**A:** Receiving tokens incrementally; useful for chat UIs, not for JSON that must be complete before parsing.

**Q:** 🟡 JSON mode vs JSON Schema output?

**A:** JSON mode guarantees valid JSON; schema mode guarantees valid JSON of a specified shape.

**Q:** 🟡 Structured output vs function calling?

**A:** Structured output always returns one schema; function/tool calling lets the model choose tools and arguments in agentic flows.

**Q:** 🔴 What is prompt injection here?

**A:** Text written on a photographed paper ("ignore instructions…") trying to manipulate output; impact limited by schema, sanitisation, no tools, and dentist review.

**Q:** 🔴 How would you evaluate extraction quality?

**A:** A labelled dataset of anonymised prescriptions; per-field accuracy/F1 across prompt/model versions; check calibration of `uncertain_fields`; use stored `extracted` vs saved values as production signal.

**Q:** 🔴 What privacy concerns exist?

**A:** Patient health data sent to Google; the free tier may use data for improvement (`README.md:43`); logs may contain output (`extraction_service.py:198`). Use paid/enterprise terms (Vertex AI), minimise data, avoid logging PHI.

**Q:** 🔴 How would you switch to another provider?

**A:** Reimplement `extract()` (~60 lines) with the same signature and `ExtractionError` contract; keep the JSON schema; compare on the eval set.

**Q:** 🔴 How would you estimate cost per prescription?

**A:** (prompt tokens + image tokens × pages) × input price + output tokens × output price; log `usage_metadata` from responses to measure.

**Q:** 🔴 How would you handle rate limits at scale?

**A:** A queue with concurrency limits, exponential backoff with jitter on 429, quotas per clinic, and a paid tier.

**Q:** 🔴 Why store the raw `extracted` output?

**A:** Audit, debugging, and measuring model accuracy against dentist corrections; and `uncertain_fields` for UI.

## Predict / find the bug

**Q:** 🟡 Bug: calling the LLM synchronously in the request handler.

**A:** Ties up a worker for 40 s and risks timeouts; move to background tasks/queues.

**Q:** 🟡 Bug: trusting `json.loads(response.text)` directly into the DB.

**A:** Unvalidated content can be invalid or malicious; sanitise and validate (done).

**Q:** 🟡 Predict: model output is truncated by `max_output_tokens`.

**A:** `finish_reason == MAX_TOKENS` → "too long to read automatically" (`:187-188`).

**Q:** 🟡 Predict: invalid API key.

**A:** Google returns 400/401/403 → "The Gemini API key was rejected…" (`:171-174`).

**Q:** 🟡 Bug: logging full prompts/responses.

**A:** Leaks patient data into logs; log only metadata (codes, latency, token counts).

**Q:** 🔴 Predict: Gemini returns `"visit_date": "2026-02-30"`.

**A:** `_date` returns `None`; the field stays empty for the dentist to fill (`prescription_service.py:81-85`).

## Scenarios & tasks

**Q:** 🟡 Write a minimal Gemini call with JSON schema output.

**A:**
```python
client.models.generate_content(model=MODEL,
  contents=[types.Part.from_bytes(data=img, mime_type="image/jpeg"), "Extract fields."],
  config=types.GenerateContentConfig(response_mime_type="application/json", response_json_schema=SCHEMA))
```

**Q:** 🟡 How would you add confidence scores per field?

**A:** Extend the schema with `{value, confidence}` per field, or ask for `uncertain_fields` (current approach) — self-reported confidence is imperfect; calibrate with evals.

**Q:** 🟡 How would you support Bangla handwriting better?

**A:** Collect Bangla samples in the eval set, add examples to the prompt (few-shot), try newer/larger models, and keep "transcribe in the original language" (`:129`).

**Q:** 🟡 How do you test code that calls an LLM?

**A:** Stub the client function in unit/integration tests (`test_prescriptions.py:64-78`); run real-model evals separately.

**Q:** 🟡 How would you show progress to users?

**A:** Return a draft immediately, poll every 2 s, show a "Reading…" banner, auto-fill when done (`hooks.ts:35`, `PrescriptionReviewPage.tsx:178-190`).

**Q:** 🔴 Design a durable extraction pipeline.

**A:** Upload → store photos → enqueue job (Redis/Celery) → worker calls model with retries/backoff → write results + status → notify via SSE/WebSocket → dentist review; dead-letter queue for failures; metrics on latency/cost/accuracy.

**Q:** 🟡 How would you choose between models?

**A:** Run the eval set on candidates; compare accuracy, latency, cost, rate limits and data-processing terms.

## Interview

**Q:** 🟡 LLM extraction vs traditional OCR?

**A:** LLMs handle messy handwriting, layout and domain abbreviations with one prompt; OCR + rules is cheaper and deterministic but brittle. Hybrid (OCR text + LLM structuring) is also common.

**Q:** 🟡 What is RAG and does this app need it?

**A:** Retrieval-Augmented Generation adds retrieved documents to prompts. Not needed — the input is the image; a drug-name lookup could be a future retrieval step.

**Q:** 🟡 What are few-shot examples?

**A:** Example input/output pairs in the prompt to guide format and style.

**Q:** 🟡 What's the role of the dentist review in liability?

**A:** The AI never files records; a professional confirms, and the PDF shows "Checked by" (`pdf_service.py:150-154`).

**Q:** 🟢 What model does the app use by default?

**A:** `gemini-3.6-flash`, configurable via `GEMINI_MODEL` (`config.py:33`).

**Q:** 🟡 Why create the client per call and what's the alternative?

**A:** Simplicity; reusing a module-level client would reuse HTTP connections (minor at low volume).

**Q:** 🟡 What does `types.Part.from_bytes` do?

**A:** Wraps raw image bytes with a MIME type as a content part (`:160`).

**Q:** 🟡 Why is `media_type` always JPEG?

**A:** All stored pages are re-encoded to JPEG before reading (`prescription_service.py:63`).

**Q:** 🟡 What is `ExtractionError` and why is its message "safe to show to staff"?

**A:** A custom exception whose messages are written for clinic staff (no stack traces or provider details); the background task stores `str(exc)` on the draft (`extraction_service.py:20-21`, `prescription_service.py:163-171`).

**Q:** 🟡 How does the UI tell staff that reading failed?

**A:** `extraction_error` is shown in an alert with a "Read again" button for drafts (`PrescriptionReviewPage.tsx:199-226`) and an "Unreadable" badge in lists (`PrescriptionRow.tsx:30-35`).

**Q:** 🟡 What does the prompt say to do with non-prescription images?

**A:** Return nulls and empty lists and explain in `notes` (`extraction_service.py:133-134`).

**Q:** 🟡 Why tell the model dates are written day-first?

**A:** Bangladesh uses DD/MM/YYYY; without the hint, `08/10/2026` could be read as 10 August (`extraction_service.py:120`).

**Q:** 🔴 How does the system avoid a background read overwriting a dentist's saved work?

**A:** After the model returns, the task refreshes the row and only applies results if it's still a draft (`prescription_service.py:166-169`); `save` also refuses to file while reading (`:328-329`).

**Q:** 🔴 What is "graceful degradation" in this AI feature?

**A:** Every failure mode (no key, quota, network, safety block, invalid JSON, crash) still leaves the photo stored as a draft that staff can fill by hand or re-read (`README.md:15`).

**Q:** 🟡 What does `HttpRetryOptions(attempts=3)` retry?

**A:** Transient HTTP failures (e.g. 503/429-like retryable statuses per SDK policy) up to three attempts with backoff, inside the 90 s per-attempt timeout (`extraction_service.py:148-151`).

**Q:** 🟢 Which roles can trigger a re-read?

**A:** Any staff (`ScanUser`) via `POST /prescriptions/{id}/extract` (`prescriptions.py:71-79`).
