import re
import uuid
from datetime import date
from typing import Any

from sqlalchemy import Select, func, or_, select, text
from sqlalchemy.orm import Session

from app.core.errors import Conflict, NotFound
from app.core.time import clinic_today
from app.core.validators import normalize_bd_phone
from app.models.patient import Patient, Prescription, PrescriptionStatus
from app.schemas.common import PageParams
from app.schemas.patient import PatientCreate, PatientUpdate

# pg_trgm similarity above which a name counts as a possible match.
NAME_SIMILARITY = 0.35
MAX_MATCHES = 5
_NEXT_CODE = text("SELECT nextval('patient_code_seq')")


def get(db: Session, patient_id: uuid.UUID) -> Patient:
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise NotFound("Patient")
    return patient


def _search(stmt: Select[Any], q: str) -> Select[Any]:
    q = q.strip()
    like = f"%{q}%"
    conditions = [Patient.full_name.ilike(like), Patient.patient_code.ilike(like)]
    digits = re.sub(r"\D", "", q)
    if len(digits) >= 4:
        # Stored as +8801XXXXXXXXX; match typed 01XXX… or 8801XXX… by their tail.
        conditions.append(Patient.phone.like(f"%{digits.removeprefix('88').lstrip('0')}%"))
    return stmt.where(or_(*conditions))


def list_patients(
    db: Session, params: PageParams, *, q: str | None = None
) -> tuple[list[tuple[Patient, int, date | None, date | None]], int]:
    """Patients with their visit count, last visit and next upcoming follow-up."""
    confirmed = Prescription.status == PrescriptionStatus.CONFIRMED
    stats = (
        select(
            Prescription.patient_id.label("patient_id"),
            func.count().label("visit_count"),
            func.max(Prescription.visit_date).label("last_visit_date"),
            func.min(Prescription.follow_up_date)
            .filter(Prescription.follow_up_date >= clinic_today())
            .label("next_follow_up_date"),
        )
        .where(confirmed)
        .group_by(Prescription.patient_id)
        .subquery()
    )
    stmt = select(
        Patient,
        func.coalesce(stats.c.visit_count, 0),
        stats.c.last_visit_date,
        stats.c.next_follow_up_date,
    ).outerjoin(stats, stats.c.patient_id == Patient.id)
    if q:
        stmt = _search(stmt, q)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.execute(
        stmt.order_by(stats.c.last_visit_date.desc().nulls_last(), Patient.full_name)
        .offset(params.offset)
        .limit(params.page_size)
    ).all()
    return [tuple(r) for r in rows], total  # type: ignore[misc]


def _ensure_code_free(db: Session, code: str, exclude_id: uuid.UUID | None = None) -> None:
    stmt = select(Patient.id).where(func.lower(Patient.patient_code) == code.lower())
    if exclude_id is not None:
        stmt = stmt.where(Patient.id != exclude_id)
    if db.scalar(stmt) is not None:
        raise Conflict(
            f"Another patient already has the ID {code}", code="patient_code_taken"
        )


def _generate_code(db: Session) -> str:
    while True:
        code = f"P-{db.scalar(_NEXT_CODE):05d}"
        if db.scalar(select(Patient.id).where(Patient.patient_code == code)) is None:
            return code


def create(db: Session, data: PatientCreate) -> Patient:
    """Add a patient without committing (callers commit with related changes)."""
    if data.patient_code:
        _ensure_code_free(db, data.patient_code)
    patient = Patient(
        patient_code=data.patient_code or _generate_code(db),
        full_name=data.full_name,
        phone=data.phone,
        age_years=data.age_years,
        sex=data.sex,
    )
    db.add(patient)
    db.flush()
    return patient


def update(db: Session, patient: Patient, data: PatientUpdate) -> Patient:
    changes = data.model_dump(exclude_unset=True)
    if changes.get("patient_code"):
        _ensure_code_free(db, changes["patient_code"], exclude_id=patient.id)
    for field, value in changes.items():
        # Name and ID are required; the other fields can be cleared.
        if value is None and field in ("patient_code", "full_name"):
            continue
        setattr(patient, field, value)
    db.commit()
    return patient


def delete(db: Session, patient: Patient) -> None:
    """Delete a patient with all their prescriptions and photos."""
    # Imported here: prescription_service imports this module.
    from app.services import prescription_service

    prescriptions = list(db.scalars(select(Prescription).where(Prescription.patient_id == patient.id)))
    paths = [path for p in prescriptions for path in prescription_service.image_files(p)]
    for prescription in prescriptions:
        db.delete(prescription)
    db.delete(patient)
    db.commit()
    for path in paths:
        path.unlink(missing_ok=True)


def find_matches(db: Session, info: dict[str, Any] | None) -> list[tuple[Patient, list[str]]]:
    """Existing patients who may be the person on a scanned prescription."""
    if not info:
        return []
    found: dict[uuid.UUID, tuple[Patient, list[str]]] = {}

    def add(patients: list[Patient], reason: str) -> None:
        for p in patients:
            found.setdefault(p.id, (p, []))[1].append(reason)

    code = (info.get("patient_id") or "").strip()
    if code:
        add(
            list(db.scalars(select(Patient).where(func.lower(Patient.patient_code) == code.lower()))),
            "Same patient ID",
        )

    phone = (info.get("phone") or "").strip()
    if phone:
        try:
            normalized = normalize_bd_phone(phone)
        except ValueError:
            normalized = None
        if normalized:
            add(list(db.scalars(select(Patient).where(Patient.phone == normalized))), "Same phone number")

    name = (info.get("full_name") or "").strip()
    if name:
        similarity = func.similarity(Patient.full_name, name)
        add(
            list(
                db.scalars(
                    select(Patient)
                    .where(similarity >= NAME_SIMILARITY)
                    .order_by(similarity.desc())
                    .limit(MAX_MATCHES)
                )
            ),
            "Similar name",
        )

    # Patients matching on more signals first; dict order breaks ties.
    ranked = sorted(found.values(), key=lambda m: -len(m[1]))
    return ranked[:MAX_MATCHES]
