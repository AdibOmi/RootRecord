import uuid
from datetime import date, datetime
from typing import Annotated, Any, Self

from pydantic import BaseModel, Field, StringConstraints, model_validator

from app.models.patient import PrescriptionStatus
from app.schemas.common import ORMModel
from app.schemas.patient import PatientCreate, PatientMatch, PatientRef

ShortText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=255)]
LongText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=4000)]
ListItem = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class Medication(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    # As written, e.g. "500 mg".
    dosage: ShortText | None = None
    # As written, e.g. "1+0+1" or "twice daily".
    frequency: ShortText | None = None
    duration: ShortText | None = None
    instructions: ShortText | None = None


class StaffRef(ORMModel):
    id: uuid.UUID
    full_name: str


Money = Annotated[int, Field(ge=0, le=100_000_000)]


class PrescriptionSummary(ORMModel):
    id: uuid.UUID
    status: PrescriptionStatus
    patient: PatientRef | None
    # Name as read from the photo; shown for drafts not yet linked to a patient.
    extracted_patient_name: str | None
    visit_date: date | None
    chief_complaint: str | None
    diagnosis: str | None
    procedures: list[str]
    medications: list[Medication]
    advice: list[str]
    follow_up_date: date | None
    notes: str | None
    # Minor units (1/100 BDT).
    billed_minor: int | None
    paid_minor: int | None
    due_minor: int | None
    # A dentist has checked what was read.
    verified: bool
    has_extraction_error: bool
    # The photo is still being read; fields fill in when it finishes.
    reading: bool
    created_at: datetime


class PrescriptionDetail(PrescriptionSummary):
    # One URL per page, in order.
    image_urls: list[str]
    extracted: dict[str, Any] | None
    extraction_error: str | None
    created_by: StaffRef
    confirmed_by: StaffRef | None
    confirmed_at: datetime | None
    verified_by: StaffRef | None
    verified_at: datetime | None
    # Likely existing patients, filled for drafts only.
    patient_matches: list[PatientMatch] = []


class PaymentFields(BaseModel):
    billed_minor: Money | None = None
    paid_minor: Money | None = None

    @model_validator(mode="after")
    def _check_payment(self) -> Self:
        if self.paid_minor is not None and self.billed_minor is None:
            raise ValueError("Enter the bill before the amount paid")
        if self.paid_minor is not None and self.billed_minor is not None and self.paid_minor > self.billed_minor:
            raise ValueError("The amount paid cannot be more than the bill")
        return self


class PrescriptionRegister(PaymentFields):
    """File a scanned prescription under a patient at payment (any staff member)."""

    patient_id: uuid.UUID | None = None
    new_patient: PatientCreate | None = None

    @model_validator(mode="after")
    def _check_patient(self) -> Self:
        if (self.patient_id is None) == (self.new_patient is None):
            raise ValueError("Choose an existing patient or enter a new one")
        return self


class PrescriptionPayment(PaymentFields):
    """Correct the bill or payment of a filed visit."""


class PrescriptionSave(BaseModel):
    """The dentist's checked version of what was read. Saving marks it as checked."""

    visit_date: date
    chief_complaint: LongText | None = None
    diagnosis: LongText | None = None
    procedures: list[ListItem] = Field(default_factory=list, max_length=50)
    medications: list[Medication] = Field(default_factory=list, max_length=50)
    advice: list[ListItem] = Field(default_factory=list, max_length=50)
    follow_up_date: date | None = None
    notes: LongText | None = None

    @model_validator(mode="after")
    def _check(self) -> Self:
        if self.follow_up_date and self.follow_up_date < self.visit_date:
            raise ValueError("The follow-up date cannot be before the visit date")
        return self
