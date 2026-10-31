import uuid
from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from app.core.validators import BDPhone
from app.models.patient import PatientSex
from app.schemas.common import ORMModel

PatientName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
PatientCode = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
Age = Annotated[int, Field(ge=0, le=130)]


class PatientRef(ORMModel):
    id: uuid.UUID
    patient_code: str
    full_name: str


class PatientOut(PatientRef):
    phone: str | None
    age_years: int | None
    sex: PatientSex | None
    created_at: datetime


class PatientListItem(PatientOut):
    visit_count: int
    last_visit_date: date | None
    next_follow_up_date: date | None


class PatientCreate(BaseModel):
    # Left blank, a code is generated (P-00001).
    patient_code: PatientCode | None = None
    full_name: PatientName
    phone: BDPhone | None = None
    age_years: Age | None = None
    sex: PatientSex | None = None


class PatientUpdate(BaseModel):
    patient_code: PatientCode | None = None
    full_name: PatientName | None = None
    phone: BDPhone | None = None
    age_years: Age | None = None
    sex: PatientSex | None = None


class PatientMatch(BaseModel):
    """An existing patient who may be the one on a scanned prescription."""

    patient: PatientOut
    reasons: list[str]
