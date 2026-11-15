# 15 — `services/extraction_service.py` (199 lines)

**Purpose:** send prescription page images to Gemini and return structured JSON (a draft).
**Called by:** `prescription_service.read_in_background` (`prescription_service.py:161`); stubbed in
tests (`tests/test_prescriptions.py:64-78`). **Calls:** `google.genai`, settings.
→ Skill: `18-llm-gemini.md` (full explanation of schema, prompt and errors).

## Structure

| Lines | Part |
|---|---|
| 1-4 | Docstring: "The output is a draft only: a dentist always reviews it before it is filed." |
| 6-15 | imports: `json`, `logging`, `date`, `httpx` (transport errors), `genai`, `errors`, `types`, settings |
| 17 | `logger = logging.getLogger("rootrecord.extraction")` — child of the app logger |
| 20-21 | `class ExtractionError(Exception)` — "message is safe to show to staff" |
| 24 | `_NULLABLE_STRING = {"type": ["string", "null"]}` — reused JSON-schema fragment |
| 27-84 | `EXTRACTION_SCHEMA` — every key required, no extra keys, nullable values, `uncertain_fields` |
| 86-134 | `SYSTEM_PROMPT` — role, rules, domain knowledge (abbreviations, Palmer→FDI), formats |
| 137-199 | `extract()` — client, call, error mapping, finish-reason checks, JSON parse |

## Line-by-line: `extract()`

```python
137 def extract(images: list[bytes], media_type: str = "image/jpeg", today: date | None = None) -> dict[str, Any]:
140     """Return the fields read from a prescription's pages, matching EXTRACTION_SCHEMA."""
141     settings = get_settings()
142     if not settings.gemini_api_key:                                  # feature flag by config
143         raise ExtractionError("Automatic reading is not set up (no Gemini API key). Fill in the details by hand.")
146     client = genai.Client(
147         api_key=settings.gemini_api_key,
148         http_options=types.HttpOptions(
149             timeout=90_000,  # milliseconds
150             # The free tier often answers 503 (busy); reading runs in the background, so retry.
151             retry_options=types.HttpRetryOptions(attempts=3),
152         ),
153     )
154     today_text = (today or date.today()).isoformat()                 # caller passes clinic_today()
```
`media_type` default is JPEG because every stored page is re-encoded to JPEG.

```python
156     try:
157         response = client.models.generate_content(
158             model=settings.gemini_model,
159             contents=[
160                 *(types.Part.from_bytes(data=image, mime_type=media_type) for image in images),   # unpack generator into list
161                 f"Today's date is {today_text}.",
162             ],
163             config=types.GenerateContentConfig(
164                 system_instruction=SYSTEM_PROMPT,
165                 response_mime_type="application/json",
166                 response_json_schema=EXTRACTION_SCHEMA,
167                 max_output_tokens=16000,
168             ),
169         )
```
Images first, then the short text part; instructions live in `system_instruction`.

```python
170     except errors.APIError as exc:
171         if exc.code in (401, 403) or (exc.code == 400 and "API key" in (exc.message or "")):
172             raise ExtractionError("The Gemini API key was rejected. Ask the admin to check it.") from exc
175         if exc.code == 429:
176             raise ExtractionError("The free reading limit has been reached for now. Try again later or fill it in by hand.") from exc
179         logger.warning("Extraction failed: %s %s", exc.code, exc.message)   # lazy %-formatting
180         raise ExtractionError("The prescription could not be read. Try again or fill it in by hand.") from exc
181     except httpx.TransportError as exc:                                     # DNS, connection, timeout
182         raise ExtractionError("Could not reach the reading service. Check the internet connection.") from exc
```
Google returns 400 (not 401) for an invalid key, hence the message check on line 171.

```python
184     if response.prompt_feedback and response.prompt_feedback.block_reason:
185         raise ExtractionError("The reading service declined this image. Fill in the details by hand.")
186     finish_reason = response.candidates[0].finish_reason if response.candidates else None
187     if finish_reason == types.FinishReason.MAX_TOKENS:
188         raise ExtractionError("The prescription was too long to read automatically. Fill it in by hand.")
189     if finish_reason in (types.FinishReason.SAFETY, types.FinishReason.PROHIBITED_CONTENT):
190         raise ExtractionError("The reading service declined this image. Fill in the details by hand.")

192     text = response.text
193     if not text:
194         raise ExtractionError("The prescription could not be read. Try again or fill it in by hand.")
195     try:
196         return json.loads(text)
197     except json.JSONDecodeError as exc:
198         logger.warning("Extraction returned invalid JSON: %.200s", text)   # ⚠️ may log patient data
199         raise ExtractionError("The prescription could not be read. Try again or fill it in by hand.") from exc
```
`MAX_TOKENS` check matters because truncated JSON would fail to parse anyway — this gives a clearer
message. `%.200s` truncates the logged string to 200 characters.

## Q&A

**Q:** 🟢 What happens when `GEMINI_API_KEY` is empty?

**A:** `extract` raises `ExtractionError` immediately; the background task stores the message on the
draft; staff see it and fill the form by hand (`extraction_service.py:142-145`, `README.md:15`).

**Q:** 🟡 Why include "Today's date is …" in the request?

**A:** The model has no clock. Prescriptions often say "after 7 days" or use 2-digit years; the prompt
tells it to compute relative dates from the visit date and pick the year closest to today
(`SYSTEM_PROMPT` lines 120-122).

**Q:** 🟡 Why make every schema field required but nullable?

**A:** It forces an explicit decision per field ("unknown → null") and guarantees all keys exist for
parsing; optional keys let models silently skip fields.

**Q:** 🔴 Why is retrying safe here, and when wouldn't it be?

**A:** Reading is idempotent (no side effects at Google; results replace the draft) and runs in the
background, so extra latency is acceptable. Retrying would be unsafe for non-idempotent calls (e.g.
"send SMS") without idempotency keys.

**Q:** 🟡 What does `raise … from exc` add?

**A:** Exception chaining: logs show the original Google/httpx error as the cause while staff see a
friendly message.

**Q:** 🔴 How would you evaluate a prompt change?

**A:** Build a labelled set of anonymised prescriptions; run old and new prompts; compare field-level
accuracy and `uncertain_fields` calibration. The app already stores `extracted` and the dentist's final
values, so production data (with consent) can seed the set.

**Q:** 🟢 Where does the Palmer → FDI conversion happen?

**A:** In the model, instructed by the prompt (lines 99-105, 123-126); the code doesn't post-process
tooth numbers.

**Q:** 🟡 What is `finish_reason` and why check it?

**A:** Why generation stopped: `STOP` (normal), `MAX_TOKENS` (truncated), `SAFETY`/`PROHIBITED_CONTENT`
(blocked). Checking it turns ambiguous failures into specific messages (lines 186-190).
