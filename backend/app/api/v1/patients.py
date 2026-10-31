import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import DB, AdminUser, CurrentUser
from app.schemas.common import Page, PageParams
from app.schemas.patient import PatientListItem, PatientOut, PatientUpdate
from app.services import patient_service

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=Page[PatientListItem])
def list_patients(
    db: DB,
    _: CurrentUser,
    params: Annotated[PageParams, Depends()],
    q: str | None = Query(None, max_length=100),
) -> Page[PatientListItem]:
    rows, total = patient_service.list_patients(db, params, q=q)
    return Page(
        items=[
            PatientListItem(
                **PatientOut.model_validate(patient).model_dump(),
                visit_count=visit_count,
                last_visit_date=last_visit,
                next_follow_up_date=next_follow_up,
            )
            for patient, visit_count, last_visit, next_follow_up in rows
        ],
        total=total,
        page=params.page,
        page_size=params.page_size,
    )


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: uuid.UUID, db: DB, _: CurrentUser) -> object:
    return patient_service.get(db, patient_id)


@router.patch("/{patient_id}", response_model=PatientOut)
def update_patient(patient_id: uuid.UUID, body: PatientUpdate, db: DB, _: CurrentUser) -> object:
    return patient_service.update(db, patient_service.get(db, patient_id), body)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(patient_id: uuid.UUID, db: DB, _: AdminUser) -> None:
    """Delete a patient with all their prescriptions and photos (admins only)."""
    patient_service.delete(db, patient_service.get(db, patient_id))
