import enum
import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, Timestamps, UUIDPk
from app.models.user import User


class PatientSex(enum.StrEnum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class PrescriptionStatus(enum.StrEnum):
    # Photo uploaded and read; waiting for the dentist to check it.
    DRAFT = "draft"
    # Checked by a dentist and filed in the patient's record.
    CONFIRMED = "confirmed"


def _enum(cls: type[enum.Enum], name: str) -> Enum:
    return Enum(cls, name=name, values_callable=lambda e: [m.value for m in e])


class Patient(UUIDPk, Timestamps, Base):
    __tablename__ = "patients"

    # The ID written on the clinic's prescriptions; generated (P-00001) when absent.
    patient_code: Mapped[str] = mapped_column(String(40), unique=True)
    full_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(20), index=True)
    age_years: Mapped[int | None]
    sex: Mapped[PatientSex | None] = mapped_column(_enum(PatientSex, "patient_sex"))

    prescriptions: Mapped[list["Prescription"]] = relationship(back_populates="patient")


class Prescription(UUIDPk, Timestamps, Base):
    """One handwritten prescription: the photo plus what was read from it."""

    __tablename__ = "prescriptions"

    status: Mapped[PrescriptionStatus] = mapped_column(
        _enum(PrescriptionStatus, "prescription_status"), default=PrescriptionStatus.DRAFT, index=True
    )
    # Empty while a draft has not been matched to a patient yet.
    patient_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("patients.id", ondelete="RESTRICT"), index=True
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    confirmed_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    confirmed_at: Mapped[datetime | None]

    visit_date: Mapped[date | None] = mapped_column(index=True)
    chief_complaint: Mapped[str | None] = mapped_column(Text)
    diagnosis: Mapped[str | None] = mapped_column(Text)
    procedures: Mapped[list[str]] = mapped_column(JSONB, default=list)
    # [{name, dosage, frequency, duration, instructions}]
    medications: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    advice: Mapped[list[str]] = mapped_column(JSONB, default=list)
    follow_up_date: Mapped[date | None] = mapped_column(index=True)
    notes: Mapped[str | None] = mapped_column(Text)

    # Pages of the prescription in order, relative to STORAGE_DIR.
    image_paths: Mapped[list[str]] = mapped_column(JSONB, default=list)
    # Raw model output, kept so a reviewed record can be compared with what was read.
    extracted: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    extraction_error: Mapped[str | None] = mapped_column(Text)
    # Set while the photo is being read in the background.
    reading_started_at: Mapped[datetime | None]

    patient: Mapped[Patient | None] = relationship(back_populates="prescriptions")
    created_by: Mapped[User] = relationship(foreign_keys=[created_by_id])
    confirmed_by: Mapped[User | None] = relationship(foreign_keys=[confirmed_by_id])
