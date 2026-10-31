import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile, status
from fastapi.responses import FileResponse, Response

from app.api.deps import DB, ClinicalUser, CurrentUser, ScanUser
from app.core.config import get_settings
from app.core.errors import BadRequest, NotFound
from app.models.patient import PrescriptionStatus
from app.schemas.common import Page, PageParams
from app.schemas.prescription import PrescriptionDetail, PrescriptionSave, PrescriptionSummary
from app.services import pdf_service, prescription_service

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


@router.post("/scan", response_model=PrescriptionDetail, status_code=status.HTTP_201_CREATED)
def scan_prescription(
    db: DB, user: ScanUser, files: Annotated[list[UploadFile], File()], background: BackgroundTasks
) -> PrescriptionDetail:
    """Upload photos of a handwritten prescription, one per page in order.

    Returns a draft straight away (`reading` is true); the photos are read in the
    background, so poll the draft until `reading` is false.
    """
    prescription_service.check_page_count(len(files))
    # Read one byte past the limit so oversized files are rejected without loading them whole.
    limit = get_settings().max_upload_mb * 1024 * 1024 + 1
    pages = [file.file.read(limit) for file in files]
    prescription = prescription_service.scan(db, user, pages)
    background.add_task(prescription_service.read_in_background, prescription.id)
    return prescription_service.to_detail(db, prescription)


@router.get("", response_model=Page[PrescriptionSummary])
def list_prescriptions(
    db: DB,
    _: CurrentUser,
    params: Annotated[PageParams, Depends()],
    status: PrescriptionStatus | None = None,
    patient_id: uuid.UUID | None = None,
) -> Page[PrescriptionSummary]:
    rows, total = prescription_service.list_prescriptions(
        db, params, status=status, patient_id=patient_id
    )
    return Page(
        items=[prescription_service.to_summary(r) for r in rows],
        total=total,
        page=params.page,
        page_size=params.page_size,
    )


@router.get("/{prescription_id}", response_model=PrescriptionDetail)
def get_prescription(prescription_id: uuid.UUID, db: DB, _: CurrentUser) -> PrescriptionDetail:
    return prescription_service.to_detail(db, prescription_service.get(db, prescription_id))


@router.get("/{prescription_id}/pages/{page}", response_class=FileResponse)
def get_prescription_page(
    prescription_id: uuid.UUID, page: int, db: DB, _: CurrentUser
) -> FileResponse:
    """One page of the photo, numbered from 1."""
    path = prescription_service.image_file(prescription_service.get(db, prescription_id), page)
    if not path.is_file():
        raise NotFound("Prescription photo")
    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=86400"})


@router.post("/{prescription_id}/extract", response_model=PrescriptionDetail)
def extract_again(
    prescription_id: uuid.UUID, db: DB, _: ScanUser, background: BackgroundTasks
) -> PrescriptionDetail:
    """Read the photo again in the background, replacing the draft's fields."""
    prescription = prescription_service.get(db, prescription_id)
    if prescription_service.start_reading(db, prescription):
        background.add_task(prescription_service.read_in_background, prescription.id)
    return prescription_service.to_detail(db, prescription)


@router.get("/{prescription_id}/pdf", response_class=Response)
def prescription_pdf(prescription_id: uuid.UUID, db: DB, _: CurrentUser) -> Response:
    """A filed prescription as a PDF to give or send to the patient."""
    prescription = prescription_service.get(db, prescription_id)
    if prescription.status != PrescriptionStatus.CONFIRMED or prescription.patient is None:
        raise BadRequest("Only filed prescriptions can be shared", code="not_filed")
    return Response(
        pdf_service.render(prescription),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{pdf_service.filename(prescription)}"',
            "Cache-Control": "private, no-store",
        },
    )


@router.put("/{prescription_id}", response_model=PrescriptionDetail)
def save_prescription(
    prescription_id: uuid.UUID, body: PrescriptionSave, db: DB, user: ClinicalUser
) -> PrescriptionDetail:
    """Save the reviewed prescription to the patient's record."""
    prescription = prescription_service.get(db, prescription_id)
    return prescription_service.to_detail(db, prescription_service.save(db, prescription, body, user))


@router.delete("/{prescription_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prescription(prescription_id: uuid.UUID, db: DB, user: ScanUser) -> None:
    """Discard a draft (any staff), or delete a filed prescription (admins only)."""
    prescription_service.delete(db, prescription_service.get(db, prescription_id), user)
