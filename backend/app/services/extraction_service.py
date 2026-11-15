"""Read a photographed handwritten dental prescription with Gemini vision.

The output is a draft only: a dentist always reviews it before it is filed.
"""

import io
import json
import logging
import time
from datetime import date
from typing import Any

import httpx
from google import genai
from google.genai import errors, types
from PIL import Image

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
- patient_id: the clinic's patient ID is an 8-digit number, often written as \
1234-5678 by the receptionist near the top. Return its 8 digits only, without spaces \
or dashes.
- age_years: whole years only.
- phone: digits as written.
- Transcribe text in the language it is written in, keeping Bangla as Bangla.
- notes: anything clinically relevant that fits nowhere else.
- uncertain_fields: names of fields you are unsure about, using dotted paths such as \
"patient.full_name", "visit_date" or "medications.1.frequency" (0-based index).
If the image is not a prescription or is unreadable, return nulls and empty lists and \
explain in notes."""


HEADER_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["patient", "uncertain_fields"],
    "properties": {
        "patient": EXTRACTION_SCHEMA["properties"]["patient"],
        "uncertain_fields": {"type": "array", "items": {"type": "string"}},
    },
}

HEADER_PROMPT = """\
You read the header of a photographed handwritten prescription from a dental clinic \
in Bangladesh: the patient's name, age, sex, phone number and the clinic's patient ID \
(an 8-digit number, sometimes written as 1234-5678; return its digits only). Return \
only what you can read with confidence; leave anything else null and list it in \
uncertain_fields using the paths "patient.full_name", "patient.phone", \
"patient.patient_id", "patient.age_years" or "patient.sex". Keep Bangla names in \
Bangla. phone: digits as written. age_years: whole years only."""

# Long edge of the photo sent for the header read: enough for the name and phone.
HEADER_IMAGE_EDGE = 1600


def _shrink(image: bytes, edge: int) -> bytes:
    with Image.open(io.BytesIO(image)) as img:
        if max(img.size) <= edge:
            return image
        img = img.convert("RGB")
        img.thumbnail((edge, edge))
        out = io.BytesIO()
        img.save(out, "JPEG", quality=85)
        return out.getvalue()


def _generate(
    *,
    model: str,
    contents: list[Any],
    system_prompt: str,
    schema: dict[str, Any],
    thinking_level: str | None,
    max_output_tokens: int,
    timeout_ms: int,
    attempts: int,
) -> dict[str, Any]:
    """One structured-output call to Gemini; errors become ExtractionError."""
    settings = get_settings()
    if not settings.gemini_api_key:
        raise ExtractionError(
            "Automatic reading is not set up (no Gemini API key). Fill in the details by hand."
        )
    client = genai.Client(
        api_key=settings.gemini_api_key,
        http_options=types.HttpOptions(
            timeout=timeout_ms,
            # The free tier often answers 503 (busy), so retry.
            retry_options=types.HttpRetryOptions(attempts=attempts),
        ),
    )
    thinking = (
        types.ThinkingConfig(thinking_level=types.ThinkingLevel(thinking_level.upper()))
        if thinking_level
        else None
    )

    try:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_json_schema=schema,
                max_output_tokens=max_output_tokens,
                thinking_config=thinking,
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
    except httpx.TimeoutException as exc:
        raise ExtractionError("Reading took too long. Try again or fill it in by hand.") from exc
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
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        logger.warning("Extraction returned invalid JSON: %.200s", text)
        raise ExtractionError("The prescription could not be read. Try again or fill it in by hand.") from exc
    if not isinstance(data, dict):
        raise ExtractionError("The prescription could not be read. Try again or fill it in by hand.")
    return data


def extract(
    images: list[bytes], media_type: str = "image/jpeg", today: date | None = None
) -> dict[str, Any]:
    """Return everything read from a prescription's pages, matching EXTRACTION_SCHEMA."""
    settings = get_settings()
    today_text = (today or date.today()).isoformat()
    started = time.monotonic()
    data = _generate(
        model=settings.gemini_model,
        contents=[
            *(types.Part.from_bytes(data=image, mime_type=media_type) for image in images),
            f"Today's date is {today_text}.",
        ],
        system_prompt=SYSTEM_PROMPT,
        schema=EXTRACTION_SCHEMA,
        thinking_level=settings.gemini_thinking_level,
        max_output_tokens=16000,
        timeout_ms=90_000,
        attempts=3,
    )
    logger.info("Full read took %.1fs for %d page(s)", time.monotonic() - started, len(images))
    return data


def extract_header(first_page: bytes) -> dict[str, Any]:
    """Quickly read only the patient details, matching HEADER_SCHEMA.

    The assistant waits for this at the counter, so it is kept small and short:
    one downscaled page, little thinking, a tight timeout and a single retry.
    """
    settings = get_settings()
    started = time.monotonic()
    data = _generate(
        model=settings.gemini_header_model or settings.gemini_model,
        contents=[types.Part.from_bytes(data=_shrink(first_page, HEADER_IMAGE_EDGE), mime_type="image/jpeg")],
        system_prompt=HEADER_PROMPT,
        schema=HEADER_SCHEMA,
        thinking_level=settings.gemini_header_thinking_level,
        max_output_tokens=1000,
        # A healthy read takes 3-5 s; the free tier sometimes stalls, and retrying
        # a stalled request is faster than waiting it out.
        timeout_ms=8_000,
        attempts=2,
    )
    logger.info("Header read took %.1fs", time.monotonic() - started)
    return data
