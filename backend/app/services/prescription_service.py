"""Scanned prescriptions: store the photo, read it, file it under a patient at
payment, and let a dentist check what was read."""

import io
import logging
import uuid
from collections.abc import Callable
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core import db as db_module
from app.core.config import get_settings
from app.core.errors import BadRequest, Forbidden, NotFound
from app.core.time import clinic_today, utcnow
from app.models.patient import Prescription, PrescriptionStatus
from app.models.user import User, UserRole
from app.schemas.common import PageParams
from app.schemas.patient import PatientMatch, PatientOut, PatientRef
from app.schemas.prescription import (
    Medication,
    PaymentFields,
    PrescriptionDetail,
    PrescriptionRegister,
    PrescriptionSave,
    PrescriptionSummary,
    StaffRef,
)
from app.services import extraction_service, patient_service

logger = logging.getLogger("rootrecord.prescriptions")

# Long edge of the stored photo. Enough to read handwriting; keeps uploads to Gemini small.
MAX_IMAGE_EDGE = 2400
# Pages per prescription (front and back of a few sheets).
MAX_PAGES = 6
# Longer than the slowest read (timeouts and retries included). A read still
# "running" after this was cut off, e.g. by a server restart.
READING_TIMEOUT = timedelta(minutes=5)
INTERRUPTED_MESSAGE = "Reading was interrupted. Press Read again or fill it in by hand."


def _storage_root() -> Path:
    return Path(get_settings().storage_dir)


def image_files(prescription: Prescription) -> list[Path]:
    return [_storage_root() / path for path in prescription.image_paths]


def image_file(prescription: Prescription, page: int) -> Path:
    """One page of the photo, numbered from 1."""
    if not 1 <= page <= len(prescription.image_paths):
        raise NotFound("Prescription page")
    return _storage_root() / prescription.image_paths[page - 1]


def _normalize_image(data: bytes) -> bytes:
    """Validate the upload, apply the camera's rotation and re-encode as JPEG."""
    try:
        with Image.open(io.BytesIO(data)) as img:
            img = ImageOps.exif_transpose(img).convert("RGB")
            img.thumbnail((MAX_IMAGE_EDGE, MAX_IMAGE_EDGE))
            out = io.BytesIO()
            img.save(out, "JPEG", quality=88, optimize=True)
            return out.getvalue()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise BadRequest(
            "This file is not a supported photo. Use a JPEG or PNG image.", code="invalid_image"
        ) from exc


# --- Applying what was read --------------------------------------------------


def _text(value: Any, limit: int = 4000) -> str | None:
    if not isinstance(value, str):
        return None
    value = value.strip()
    return value[:limit] or None


def _date(value: Any) -> date | None:
    try:
        return date.fromisoformat(value) if isinstance(value, str) else None
    except ValueError:
        return None


def _strings(values: Any) -> list[str]:
    if not isinstance(values, list):
        return []
    return [s for s in (_text(v, 500) for v in values) if s][:50]


def _medications(values: Any) -> list[dict[str, Any]]:
    if not isinstance(values, list):
        return []
    meds = []
    for item in values[:50]:
        if not isinstance(item, dict) or not _text(item.get("name"), 200):
            continue
        meds.append(
            Medication(
                name=_text(item["name"], 200),  # type: ignore[arg-type]
                **{k: _text(item.get(k), 255) for k in ("dosage", "frequency", "duration", "instructions")},
            ).model_dump()
        )
    return meds


def _apply_extraction(prescription: Prescription, data: dict[str, Any]) -> None:
    prescription.extracted = data
    prescription.extraction_error = None
    # Filing at payment sets the visit date to that day; keep it if none was read.
    prescription.visit_date = _date(data.get("visit_date")) or prescription.visit_date
    prescription.chief_complaint = _text(data.get("chief_complaint"))
    prescription.diagnosis = _text(data.get("diagnosis"))
    prescription.procedures = _strings(data.get("procedures"))
    prescription.medications = _medications(data.get("medications"))
    prescription.advice = _strings(data.get("advice"))
    prescription.follow_up_date = _date(data.get("follow_up_date"))
    prescription.notes = _text(data.get("notes"))


def is_reading(prescription: Prescription, now: datetime | None = None) -> bool:
    started = prescription.reading_started_at
    return started is not None and (now or utcnow()) - started < READING_TIMEOUT


def _extraction_error(prescription: Prescription) -> str | None:
    if prescription.reading_started_at is not None and not is_reading(prescription):
        return INTERRUPTED_MESSAGE
    return prescription.extraction_error


def start_reading(db: Session, prescription: Prescription) -> bool:
    """Mark a prescription as being read. Returns False if a read is already running."""
    if prescription.verified_at is not None:
        raise BadRequest(
            "A dentist has already checked this prescription", code="already_verified"
        )
    if is_reading(prescription):
        return False
    prescription.reading_started_at = utcnow()
    prescription.extraction_error = None
    db.commit()
    return True


# Opens the session for background reads; tests swap it for their own.
new_session: Callable[[], Session] = lambda: db_module.SessionLocal()  # noqa: E731


def read_in_background(prescription_id: uuid.UUID) -> None:
    """Read a draft's photos and fill it in. Runs after the upload has been answered.

    A failure is recorded on the draft, not raised.
    """
    with new_session() as db:
        prescription = db.get(Prescription, prescription_id)
        if prescription is None:
            return
        images = [path.read_bytes() for path in image_files(prescription)]
        try:
            data: dict[str, Any] | None = extraction_service.extract(images, today=clinic_today())
            error = None
        except extraction_service.ExtractionError as exc:
            data, error = None, str(exc)

        # A dentist may have checked it meanwhile; their version wins. (Filing it
        # under a patient at payment does not touch what was read, so that is fine.)
        db.refresh(prescription)
        if prescription.verified_at is not None:
            return
        if data is None:
            prescription.extraction_error = error
        else:
            _apply_extraction(prescription, data)
        prescription.reading_started_at = None
        db.commit()


def check_page_count(count: int) -> None:
    if count == 0:
        raise BadRequest("Add at least one photo", code="no_pages")
    if count > MAX_PAGES:
        raise BadRequest(f"A prescription can have at most {MAX_PAGES} pages", code="too_many_pages")


def scan(db: Session, user: User, pages: list[bytes]) -> Prescription:
    """Store the photographed pages of one prescription as a draft.

    The caller then runs read_in_background, so staff are not kept waiting.
    """
    check_page_count(len(pages))
    limit_mb = get_settings().max_upload_mb
    if any(len(data) > limit_mb * 1024 * 1024 for data in pages):
        raise BadRequest(f"Each photo must be under {limit_mb} MB", code="file_too_large")
    # Validate every page before writing anything.
    images = [_normalize_image(data) for data in pages]

    prescription_id = uuid.uuid4()
    relative_paths = [f"prescriptions/{prescription_id}-{n}.jpg" for n in range(1, len(images) + 1)]
    for relative, image in zip(relative_paths, images, strict=True):
        path = _storage_root() / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(image)

    prescription = Prescription(
        id=prescription_id,
        status=PrescriptionStatus.DRAFT,
        created_by=user,
        image_paths=relative_paths,
        procedures=[],
        medications=[],
        advice=[],
        reading_started_at=utcnow(),
    )
    db.add(prescription)
    db.commit()
    return prescription


def read_header(db: Session, prescription: Prescription) -> None:
    """Quickly read the patient's details from the first page, while staff wait.

    Failure is fine: the assistant types the name and phone instead, and the full
    read in the background tries again.
    """
    first_page = image_files(prescription)[0].read_bytes()
    try:
        data = extraction_service.extract_header(first_page)
    except extraction_service.ExtractionError as exc:
        logger.info("Header read failed: %s", exc)
        return
    patient = data.get("patient")
    if isinstance(patient, dict):
        prescription.extracted = {
            "patient": patient,
            "uncertain_fields": _strings(data.get("uncertain_fields")),
        }
        db.commit()


# --- Queries -----------------------------------------------------------------


def get(db: Session, prescription_id: uuid.UUID) -> Prescription:
    prescription = db.get(Prescription, prescription_id)
    if prescription is None:
        raise NotFound("Prescription")
    return prescription


def list_prescriptions(
    db: Session,
    params: PageParams,
    *,
    status: PrescriptionStatus | None = None,
    patient_id: uuid.UUID | None = None,
    verified: bool | None = None,
) -> tuple[list[Prescription], int]:
    stmt = select(Prescription)
    if status is not None:
        stmt = stmt.where(Prescription.status == status)
    if verified is not None:
        stmt = stmt.where(
            Prescription.verified_at.is_not(None) if verified else Prescription.verified_at.is_(None)
        )
    if patient_id is not None:
        stmt = stmt.where(Prescription.patient_id == patient_id)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.options(joinedload(Prescription.patient))
        .order_by(Prescription.visit_date.desc().nulls_first(), Prescription.created_at.desc())
        .offset(params.offset)
        .limit(params.page_size)
    ).all()
    return list(rows), total


def _summary_fields(p: Prescription) -> dict[str, Any]:
    extracted_patient = (p.extracted or {}).get("patient") or {}
    return {
        "id": p.id,
        "status": p.status,
        "patient": PatientRef.model_validate(p.patient) if p.patient else None,
        "extracted_patient_name": _text(extracted_patient.get("full_name"), 120),
        "visit_date": p.visit_date,
        "chief_complaint": p.chief_complaint,
        "diagnosis": p.diagnosis,
        "procedures": p.procedures,
        "medications": [Medication.model_validate(m) for m in p.medications],
        "advice": p.advice,
        "follow_up_date": p.follow_up_date,
        "notes": p.notes,
        "billed_minor": p.billed_minor,
        "paid_minor": p.paid_minor,
        "due_minor": p.due_minor,
        "verified": p.verified_at is not None,
        "has_extraction_error": _extraction_error(p) is not None,
        "reading": is_reading(p),
        "created_at": p.created_at,
    }


def to_summary(p: Prescription) -> PrescriptionSummary:
    return PrescriptionSummary(**_summary_fields(p))


def to_detail(db: Session, p: Prescription) -> PrescriptionDetail:
    matches: list[PatientMatch] = []
    if p.status == PrescriptionStatus.DRAFT:
        matches = [
            PatientMatch(patient=PatientOut.model_validate(m.patient), reasons=m.reasons, strong=m.strong)
            for m in patient_service.find_matches(db, (p.extracted or {}).get("patient"))
        ]
    return PrescriptionDetail(
        **_summary_fields(p),
        image_urls=[
            f"/api/v1/prescriptions/{p.id}/pages/{n}" for n in range(1, len(p.image_paths) + 1)
        ],
        extracted=p.extracted,
        extraction_error=_extraction_error(p),
        created_by=StaffRef.model_validate(p.created_by),
        confirmed_by=StaffRef.model_validate(p.confirmed_by) if p.confirmed_by else None,
        confirmed_at=p.confirmed_at,
        verified_by=StaffRef.model_validate(p.verified_by) if p.verified_by else None,
        verified_at=p.verified_at,
        patient_matches=matches,
    )


# --- Filing and review --------------------------------------------------------


def _set_payment(prescription: Prescription, data: PaymentFields) -> None:
    prescription.billed_minor = data.billed_minor
    prescription.paid_minor = data.paid_minor


def register(
    db: Session, prescription: Prescription, data: PrescriptionRegister, user: User
) -> Prescription:
    """File the prescription under a patient, with the visit's bill (at payment).

    Works while the photo is still being read: the clinical details fill in when
    reading finishes. Also used to move a filed visit to the right patient.
    """
    if data.patient_id is not None:
        patient = patient_service.get(db, data.patient_id)
    else:
        assert data.new_patient is not None  # enforced by PrescriptionRegister
        patient = patient_service.create(db, data.new_patient)

    prescription.patient = patient
    _set_payment(prescription, data)
    if prescription.status == PrescriptionStatus.DRAFT:
        prescription.status = PrescriptionStatus.CONFIRMED
        prescription.confirmed_by = user
        prescription.confirmed_at = utcnow()
        # Scanned at payment, so the visit is today unless the photo says otherwise.
        prescription.visit_date = prescription.visit_date or clinic_today()
    db.commit()
    return prescription


def set_payment(db: Session, prescription: Prescription, data: PaymentFields) -> Prescription:
    if prescription.status != PrescriptionStatus.CONFIRMED:
        raise BadRequest("Choose the patient first", code="not_filed")
    _set_payment(prescription, data)
    db.commit()
    return prescription


def save(db: Session, prescription: Prescription, data: PrescriptionSave, user: User) -> Prescription:
    """Save the dentist's checked version of what was read, marking it as checked."""
    if prescription.status != PrescriptionStatus.CONFIRMED:
        raise BadRequest("Choose the patient first", code="not_filed")
    if is_reading(prescription):
        raise BadRequest("Wait until the prescription has been read", code="still_reading")

    prescription.visit_date = data.visit_date
    prescription.chief_complaint = data.chief_complaint or None
    prescription.diagnosis = data.diagnosis or None
    prescription.procedures = data.procedures
    prescription.medications = [m.model_dump() for m in data.medications]
    prescription.advice = data.advice
    prescription.follow_up_date = data.follow_up_date
    prescription.notes = data.notes or None
    prescription.verified_by = user
    prescription.verified_at = utcnow()
    db.commit()
    return prescription


def delete(db: Session, prescription: Prescription, user: User) -> None:
    if prescription.status == PrescriptionStatus.CONFIRMED and user.role != UserRole.ADMIN:
        raise Forbidden("Only an admin can delete a filed prescription")
    paths = image_files(prescription)
    db.delete(prescription)
    db.commit()
    for path in paths:
        path.unlink(missing_ok=True)
