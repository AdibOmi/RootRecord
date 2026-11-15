import re
import secrets
import uuid
from dataclasses import dataclass, field
from datetime import date
from typing import Any

from sqlalchemy import ColumnElement, Select, func, literal, or_, select
from sqlalchemy.orm import Session

from app.core.errors import NotFound
from app.core.time import clinic_today
from app.core.validators import normalize_bd_phone
from app.models.patient import Patient, Prescription, PrescriptionStatus
from app.schemas.common import PageParams
from app.schemas.patient import MatchReason, PatientCreate, PatientUpdate

# pg_trgm similarity above which a name counts as a possible match.
NAME_SIMILARITY = 0.35
MAX_MATCHES = 5


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
        # IDs are stored as 8 digits but often typed as 1234-5678.
        conditions.append(Patient.patient_code.like(f"%{digits}%"))
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


def normalize_code(value: str) -> str | None:
    """"1234-5678", "1234 5678" or "12345678" -> "12345678"; None if not an 8-digit ID."""
    digits = re.sub(r"[\s\-]", "", value)
    return digits if re.fullmatch(r"[1-9]\d{7}", digits) else None


def format_code(code: str) -> str:
    """"12345678" -> "1234-5678", the way it is written on prescriptions."""
    return f"{code[:4]}-{code[4:]}" if len(code) == 8 else code


def _generate_code(db: Session) -> str:
    """A random 8-digit ID. Random, not sequential: with the phone number it is the
    patient's sign-in, so it must not be guessable from someone else's ID."""
    while True:
        code = str(10_000_000 + secrets.randbelow(90_000_000))
        if db.scalar(select(Patient.id).where(Patient.patient_code == code)) is None:
            return code


def create(db: Session, data: PatientCreate) -> Patient:
    """Add a patient without committing (callers commit with related changes)."""
    patient = Patient(
        patient_code=_generate_code(db),
        full_name=data.full_name,
        phone=data.phone,
        age_years=data.age_years,
        sex=data.sex,
    )
    db.add(patient)
    db.flush()
    return patient


def update(db: Session, patient: Patient, data: PatientUpdate) -> Patient:
    for field_name, value in data.model_dump(exclude_unset=True).items():
        # The name is required; the other fields can be cleared.
        if value is None and field_name == "full_name":
            continue
        setattr(patient, field_name, value)
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


@dataclass
class Match:
    patient: Patient
    reasons: list[MatchReason] = field(default_factory=list)

    @property
    def strong(self) -> bool:
        """Same ID, or same phone and a similar name. Families often share one phone,
        so the same phone with a different name is a different person."""
        return "same_id" in self.reasons or {"same_phone", "similar_name"} <= set(self.reasons)


def find_matches(db: Session, info: dict[str, Any] | None) -> list[Match]:
    """Existing patients who may be the person on a scanned prescription, best first."""
    if not info:
        return []
    found: dict[uuid.UUID, Match] = {}
    name = (info.get("full_name") or "").strip()
    similarity: ColumnElement[float] = func.similarity(Patient.full_name, name) if name else literal(0.0)

    def add(stmt: Select[Any], reason: MatchReason) -> None:
        for patient, score in db.execute(stmt).all():
            match = found.setdefault(patient.id, Match(patient))
            for r in (reason, "similar_name" if score >= NAME_SIMILARITY else None):
                if r and r not in match.reasons:
                    match.reasons.append(r)

    code = normalize_code(str(info.get("patient_id") or ""))
    if code:
        add(select(Patient, similarity).where(Patient.patient_code == code), "same_id")

    phone = (info.get("phone") or "").strip()
    if phone:
        try:
            normalized = normalize_bd_phone(phone)
        except ValueError:
            normalized = None
        if normalized:
            add(select(Patient, similarity).where(Patient.phone == normalized), "same_phone")

    if name:
        add(
            select(Patient, similarity)
            .where(similarity >= NAME_SIMILARITY)
            .order_by(similarity.desc())
            .limit(MAX_MATCHES),
            "similar_name",
        )

    # Strong matches first, then those matching on more signals; dict order breaks ties.
    ranked = sorted(found.values(), key=lambda m: (not m.strong, -len(m.reasons)))
    return ranked[:MAX_MATCHES]
