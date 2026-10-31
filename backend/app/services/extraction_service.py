"""Read a photographed handwritten dental prescription with Gemini vision.

The output is a draft only: a dentist always reviews it before it is filed.
"""

import json
import logging
from datetime import date
from typing import Any

import httpx
from google import genai
from google.genai import errors, types

from app.core.config import get_settings

logger = logging.getLogger("rootrecord.extraction")


class ExtractionError(Exception):
    """The photo could not be read; the message is safe to show to staff."""


_NULLABLE_STRING = {"type": ["string", "null"]}

# JSON schema for structured outputs: every key required, nothing extra.
EXTRACTION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "patient",
        "visit_date",
        "chief_complaint",
        "diagnosis",
        "procedures",
        "medications",
        "advice",
        "follow_up_date",
        "notes",
        "uncertain_fields",
    ],
    "properties": {
        "patient": {
            "type": "object",
            "additionalProperties": False,
            "required": ["patient_id", "full_name", "age_years", "sex", "phone"],
            "properties": {
                "patient_id": _NULLABLE_STRING,
                "full_name": _NULLABLE_STRING,
                "age_years": {"type": ["integer", "null"]},
                "sex": {
                    "anyOf": [
                        {"type": "string", "enum": ["male", "female", "other"]},
                        {"type": "null"},
                    ]
                },
                "phone": _NULLABLE_STRING,
            },
        },
        "visit_date": {**_NULLABLE_STRING, "description": "YYYY-MM-DD"},
        "chief_complaint": _NULLABLE_STRING,
        "diagnosis": _NULLABLE_STRING,
        "procedures": {"type": "array", "items": {"type": "string"}},
        "medications": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["name", "dosage", "frequency", "duration", "instructions"],
                "properties": {
                    "name": {"type": "string"},
                    "dosage": _NULLABLE_STRING,
                    "frequency": _NULLABLE_STRING,
                    "duration": _NULLABLE_STRING,
                    "instructions": _NULLABLE_STRING,
                },
            },
        },
        "advice": {"type": "array", "items": {"type": "string"}},
        "follow_up_date": {**_NULLABLE_STRING, "description": "YYYY-MM-DD"},
        "notes": _NULLABLE_STRING,
        "uncertain_fields": {"type": "array", "items": {"type": "string"}},
    },
}

SYSTEM_PROMPT = """\
You transcribe photographs of handwritten prescriptions from a dental clinic in \
Bangladesh into structured data. When there are several photos, they are the pages \
(or front and back) of one prescription for one visit, in order. A dentist reviews your output before it is saved, \
so accuracy matters more than completeness: if you cannot read something with \
confidence, leave it null rather than guessing, and list the field in uncertain_fields.

What these prescriptions usually contain:
- A header with the patient's name, age, sex, an ID or registration number, phone \
number and the date. Some of these may be missing.
- Clinical notes, often abbreviated: C/C (chief complaint), M/H (medical history), \
O/E (on examination), Dx or Diagnosis, Tx / Rx done (treatment), Inv (investigations, \
e.g. X-ray/OPG). Tooth numbers may use FDI (e.g. 36), Palmer notation, or words.
- Palmer notation: a tooth number 1-8 (or letter A-E for a milk tooth) drawn in the \
corner of a cross, with a horizontal line above or below it and a vertical line beside \
it, like "5┘" or "└6". The lines are not text: never copy them as "|", "_", "/", "+" \
or "L". Work out the quadrant from where the lines are (the chart is drawn as if \
facing the patient): number above the horizontal line and left of the vertical line = \
upper right; above and right = upper left; below and left = lower right; below and \
right = lower left.
- Rx: medicines, typically "Tab./Cap./Syp./Mouthwash <brand> <strength>" with a dose \
pattern such as 1+0+1 (morning+noon+night) and a duration such as "5 days" or "x 7d", \
plus instructions such as "after meal".
- Adv: advice and instructions for the patient.
- A follow-up or "next visit" date, sometimes written relative to today ("after 7 days").

How to fill the fields:
- procedures: what was done at this visit (e.g. "Scaling and polishing", \
"RCT 36 - access opening", "Extraction of 48"). Put the diagnosis and examination \
findings in diagnosis, not here. Planned future treatment goes in notes.
- medications: one entry per medicine. Keep the brand name, strength and the dose \
pattern exactly as written (keep "1+0+1"; do not convert it). Expand obvious \
abbreviations only in instructions (e.g. "a/m" -> "after meal").
- advice: one short instruction per item.
- Dates are written day first (DD/MM/YY or DD/MM/YYYY). Return YYYY-MM-DD. If the \
follow-up is relative, compute it from the visit date. If the year is missing or two \
digits, choose the year closest to today's date given below.
- Teeth: write every tooth as its two-digit FDI number (upper right 1x, upper left 2x, \
lower left 3x, lower right 4x; milk teeth 5x-8x), e.g. "Sensitivity on 15", "Extraction \
of 48". If the quadrant is unclear, still give your best FDI number and list the field \
in uncertain_fields.
- age_years: whole years only.
- phone: digits as written.
- Transcribe text in the language it is written in, keeping Bangla as Bangla.
- notes: anything clinically relevant that fits nowhere else.
- uncertain_fields: names of fields you are unsure about, using dotted paths such as \
"patient.full_name", "visit_date" or "medications.1.frequency" (0-based index).
If the image is not a prescription or is unreadable, return nulls and empty lists and \
explain in notes."""


def extract(
    images: list[bytes], media_type: str = "image/jpeg", today: date | None = None
) -> dict[str, Any]:
    """Return the fields read from a prescription's pages, matching EXTRACTION_SCHEMA."""
    settings = get_settings()
    if not settings.gemini_api_key:
        raise ExtractionError(
            "Automatic reading is not set up (no Gemini API key). Fill in the details by hand."
        )
    client = genai.Client(
        api_key=settings.gemini_api_key,
        http_options=types.HttpOptions(
            timeout=90_000,  # milliseconds
            # The free tier often answers 503 (busy); reading runs in the background, so retry.
            retry_options=types.HttpRetryOptions(attempts=3),
        ),
    )
    today_text = (today or date.today()).isoformat()

    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=[
                *(types.Part.from_bytes(data=image, mime_type=media_type) for image in images),
                f"Today's date is {today_text}.",
            ],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_json_schema=EXTRACTION_SCHEMA,
                max_output_tokens=16000,
            ),
        )
    except errors.APIError as exc:
        if exc.code in (401, 403) or (exc.code == 400 and "API key" in (exc.message or "")):
            raise ExtractionError(
                "The Gemini API key was rejected. Ask the admin to check it."
            ) from exc
        if exc.code == 429:
            raise ExtractionError(
                "The free reading limit has been reached for now. Try again later or fill it in by hand."
            ) from exc
        logger.warning("Extraction failed: %s %s", exc.code, exc.message)
        raise ExtractionError("The prescription could not be read. Try again or fill it in by hand.") from exc
    except httpx.TransportError as exc:
        raise ExtractionError("Could not reach the reading service. Check the internet connection.") from exc

    if response.prompt_feedback and response.prompt_feedback.block_reason:
        raise ExtractionError("The reading service declined this image. Fill in the details by hand.")
    finish_reason = response.candidates[0].finish_reason if response.candidates else None
    if finish_reason == types.FinishReason.MAX_TOKENS:
        raise ExtractionError("The prescription was too long to read automatically. Fill it in by hand.")
    if finish_reason in (types.FinishReason.SAFETY, types.FinishReason.PROHIBITED_CONTENT):
        raise ExtractionError("The reading service declined this image. Fill in the details by hand.")

    text = response.text
    if not text:
        raise ExtractionError("The prescription could not be read. Try again or fill it in by hand.")
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        logger.warning("Extraction returned invalid JSON: %.200s", text)
        raise ExtractionError("The prescription could not be read. Try again or fill it in by hand.") from exc
