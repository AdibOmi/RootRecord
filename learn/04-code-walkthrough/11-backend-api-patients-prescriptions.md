# 11 — `api/v1/patients.py` and `api/v1/prescriptions.py`

## `backend/app/api/v1/patients.py` (51 lines)

**Purpose:** list/search, get, update, delete patients. **Called by:** frontend `api/patients.ts`.
**Calls:** `patient_service`.

```python
14 @router.get("", response_model=Page[PatientListItem])
15 def list_patients(db: DB, _: CurrentUser, params: Annotated[PageParams, Depends()],
19                   q: str | None = Query(None, max_length=100)) -> Page[PatientListItem]:
21     rows, total = patient_service.list_patients(db, params, q=q)
22     return Page(
23         items=[
24             PatientListItem(
25                 **PatientOut.model_validate(patient).model_dump(),   # ORM → dict of base fields
26                 visit_count=visit_count,
27                 last_visit_date=last_visit,
28                 next_follow_up_date=next_follow_up,
29             )
30             for patient, visit_count, last_visit, next_follow_up in rows   # tuple unpacking per row
31         ],
32         total=total, page=params.page, page_size=params.page_size)
```
The service returns `(Patient, int, date|None, date|None)` tuples (patient + aggregates); the router
merges them into one schema. `model_dump()` then `**` is a simple way to extend an output model.

```python
38 @router.get("/{patient_id}", response_model=PatientOut)
39 def get_patient(patient_id: uuid.UUID, db: DB, _: CurrentUser) -> object:
40     return patient_service.get(db, patient_id)

43 @router.patch("/{patient_id}", response_model=PatientOut)
44 def update_patient(patient_id: uuid.UUID, body: PatientUpdate, db: DB, _: CurrentUser) -> object:
45     return patient_service.update(db, patient_service.get(db, patient_id), body)

48 @router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
49 def delete_patient(patient_id: uuid.UUID, db: DB, _: AdminUser) -> None:
50     """Delete a patient with all their prescriptions and photos (admins only)."""
51     patient_service.delete(db, patient_service.get(db, patient_id))
```
`patient_id: uuid.UUID` — an invalid UUID in the URL gets a 422 before any DB query.

## `backend/app/api/v1/prescriptions.py` (110 lines)

**Purpose:** scan, list, detail, photo pages, re-read, PDF, save, delete.
**Called by:** frontend `api/prescriptions.ts`, `<img src>` for pages. **Calls:** `prescription_service`,
`pdf_service`.

### Scan (lines 18-33)
```python
18 @router.post("/scan", response_model=PrescriptionDetail, status_code=status.HTTP_201_CREATED)
19 def scan_prescription(db: DB, user: ScanUser, files: Annotated[list[UploadFile], File()],
20                       background: BackgroundTasks) -> PrescriptionDetail:
27     prescription_service.check_page_count(len(files))             # fail fast before reading bytes
28     # Read one byte past the limit so oversized files are rejected without loading them whole.
29     limit = get_settings().max_upload_mb * 1024 * 1024 + 1
30     pages = [file.file.read(limit) for file in files]
31     prescription = prescription_service.scan(db, user, pages)
32     background.add_task(prescription_service.read_in_background, prescription.id)
33     return prescription_service.to_detail(db, prescription)
```
Docstring (22-26) tells API users to poll until `reading` is false.

### List and detail (36-57)
```python
36 @router.get("", response_model=Page[PrescriptionSummary])
37 def list_prescriptions(db: DB, _: CurrentUser, params: Annotated[PageParams, Depends()],
41                        status: PrescriptionStatus | None = None, patient_id: uuid.UUID | None = None):
44     rows, total = prescription_service.list_prescriptions(db, params, status=status, patient_id=patient_id)
47     return Page(items=[prescription_service.to_summary(r) for r in rows], total=total, …)

55 @router.get("/{prescription_id}", response_model=PrescriptionDetail)
56 def get_prescription(prescription_id: uuid.UUID, db: DB, _: CurrentUser) -> PrescriptionDetail:
57     return prescription_service.to_detail(db, prescription_service.get(db, prescription_id))
```
⚠️ The query parameter named `status` shadows the imported `status` module (`fastapi.status`) inside
this function. Harmless here (the function doesn't use `status.HTTP_…`), but a classic Python gotcha.

### Photo pages (60-68)
```python
60 @router.get("/{prescription_id}/pages/{page}", response_class=FileResponse)
61 def get_prescription_page(prescription_id: uuid.UUID, page: int, db: DB, _: CurrentUser) -> FileResponse:
64     """One page of the photo, numbered from 1."""
65     path = prescription_service.image_file(prescription_service.get(db, prescription_id), page)   # 404 if out of range
66     if not path.is_file():
67         raise NotFound("Prescription photo")
68     return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=86400"})
```
Photos are behind authentication (the `<img>` request carries the `rr_access` cookie automatically,
same origin). `private` = only the user's browser may cache.

### Re-read (71-79)
```python
72 def extract_again(prescription_id, db, _: ScanUser, background: BackgroundTasks) -> PrescriptionDetail:
76     prescription = prescription_service.get(db, prescription_id)
77     if prescription_service.start_reading(db, prescription):      # False if a read is already running
78         background.add_task(prescription_service.read_in_background, prescription.id)
79     return prescription_service.to_detail(db, prescription)
```
Idempotent-ish: pressing "Read again" twice doesn't start two reads (within the 5-minute lease).

### PDF (82-95)
```python
83 def prescription_pdf(prescription_id: uuid.UUID, db: DB, _: CurrentUser) -> Response:
84     """A filed prescription as a PDF to give or send to the patient."""
85     prescription = prescription_service.get(db, prescription_id)
86     if prescription.status != PrescriptionStatus.CONFIRMED or prescription.patient is None:
87         raise BadRequest("Only filed prescriptions can be shared", code="not_filed")
88     return Response(pdf_service.render(prescription), media_type="application/pdf",
90                     headers={"Content-Disposition": f'attachment; filename="{pdf_service.filename(prescription)}"',
93                              "Cache-Control": "private, no-store"})
```
Drafts can't be shared — only dentist-checked content leaves the clinic.

### Save and delete (98-110)
```python
98  @router.put("/{prescription_id}", response_model=PrescriptionDetail)
99  def save_prescription(prescription_id, body: PrescriptionSave, db: DB, user: ClinicalUser):
103     prescription = prescription_service.get(db, prescription_id)
104     return prescription_service.to_detail(db, prescription_service.save(db, prescription, body, user))

107 @router.delete("/{prescription_id}", status_code=status.HTTP_204_NO_CONTENT)
108 def delete_prescription(prescription_id, db: DB, user: ScanUser) -> None:
109     """Discard a draft (any staff), or delete a filed prescription (admins only)."""
110     prescription_service.delete(db, prescription_service.get(db, prescription_id), user)
```
Delete authorisation is two-level: `ScanUser` at the route, then a status-dependent rule in the service
(`prescription_service.py:338-339`).

## Q&A

**Q:** 🟢 Why does scanning return 201 with `reading: true` instead of waiting for Gemini?

**A:** Reading takes 15–40 s; the API stores the photos, answers immediately, and reads in a background
task, so staff can continue (`prescriptions.py:22-26, 32`).

**Q:** 🟡 Why read `limit = max + 1` bytes?

**A:** If a file is larger than the limit, reading exactly `max` bytes would look like a valid file of
exactly max size. Reading one extra byte lets `scan()` detect "longer than allowed" (`len > max`) while
never loading more than max+1 bytes into memory.

**Q:** 🟡 How are photos protected from unauthenticated access?

**A:** They're served only by `GET /prescriptions/{id}/pages/{n}` which requires `CurrentUser`; files
aren't in a public static directory, and names include a random UUID.

**Q:** 🔴 What happens if two dentists PUT the same draft at the same time?

**A:** Both requests load the draft, both set fields and `CONFIRMED`; the last commit wins (lost update),
and if both chose "new patient" two patients could be created. A version column (optimistic locking)
or `SELECT … FOR UPDATE` would prevent this.

**Q:** 🟢 Which roles can delete what?

**A:** Any staff can discard a draft; only admins can delete a filed prescription
(`prescription_service.py:338-339`, tested in `test_prescriptions.py:133-142, 308-318`).

**Q:** 🟡 Why `Cache-Control: private, no-store` for the PDF but `max-age=86400` for photos?

**A:** Photos are viewed repeatedly during review, so caching in the user's browser speeds things up;
the PDF is a download that shouldn't linger in caches on shared/clinic devices.

**Q:** 🔴 The query param is called `status` in `list_prescriptions`. What's the gotcha?

**A:** It shadows `fastapi.status` (imported at line 4) inside that function. Using
`status.HTTP_200_OK` there would fail with `AttributeError` on the enum value. Renaming the Python
parameter and using `Query(alias="status")` avoids it.
