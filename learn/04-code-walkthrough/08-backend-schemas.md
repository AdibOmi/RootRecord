# 08 — Schemas: `schemas/common.py`, `user.py`, `patient.py`, `prescription.py`

**Purpose:** Pydantic models for request validation and response shaping.
**Called by:** routers (parameter and `response_model` types), services (construct outputs).
→ Skill: `12-pydantic.md`.

## `backend/app/schemas/common.py` (37 lines)

```python
6  T = TypeVar("T")                                   # generic type parameter

9  class ORMModel(BaseModel):
10     model_config = ConfigDict(from_attributes=True)   # validate from ORM objects

13 class Page(BaseModel, Generic[T]):                 # Page[UserOut], Page[PatientListItem]…
14     items: list[T]
15     total: int
16     page: int
17     page_size: int

20 class PageParams:
21     """Query-string pagination shared by every list endpoint."""
23     def __init__(self, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)) -> None:
28         self.page = page
29         self.page_size = page_size
31     @property
32     def offset(self) -> int:
33         return (self.page - 1) * self.page_size    # page 3, size 20 → offset 40

36 class Message(BaseModel):
37     message: str                                   # {"message": "Signed out"}
```
`PageParams` is a plain class (not Pydantic) used with `Depends()` — FastAPI reads its `__init__`
signature for query params.

## `backend/app/schemas/user.py` (52 lines)

```python
11 Password = Annotated[str, Field(min_length=8, max_length=128)]
12 Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]

15 class UserOut(ORMModel):          # response: never includes password_hash
16     id: uuid.UUID; email: str; full_name: str; phone: str | None; role: UserRole
21     is_active: bool; last_login_at: datetime | None; created_at: datetime

26 class UserCreate(BaseModel):      # admin creates staff
27     email: EmailStr; full_name: Name; phone: BDPhone | None = None; role: UserRole; password: Password

34 class UserUpdate(BaseModel):      # PATCH: every field optional
35     email: EmailStr | None = None; full_name: Name | None = None; phone: BDPhone | None = None; role: UserRole | None = None

41 class PasswordReset(BaseModel):   new_password: Password
45 class PasswordChange(BaseModel):  current_password: str; new_password: Password
50 class LoginRequest(BaseModel):
51     email: EmailStr
52     password: str = Field(min_length=1, max_length=128)    # no min 8 here: old passwords still log in
```
- `UserUpdate` has no `password` / `is_active` — those have dedicated endpoints with extra rules.
- `current_password: str` (line 46) without length limits — ⚠️ a huge value would be hashed by Argon2
  (`auth_service.py:107`); a `max_length=128` would be consistent with `LoginRequest`.

## `backend/app/schemas/patient.py` (56 lines)

```python
11 PatientName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
12 PatientCode = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
13 Age = Annotated[int, Field(ge=0, le=130)]

16 class PatientRef(ORMModel):       id, patient_code, full_name            # compact reference
22 class PatientOut(PatientRef):     + phone, age_years, sex, created_at
29 class PatientListItem(PatientOut): + visit_count, last_visit_date, next_follow_up_date

35 class PatientCreate(BaseModel):
36     # Left blank, a code is generated (P-00001).
37     patient_code: PatientCode | None = None
38     full_name: PatientName
39     phone: BDPhone | None = None
40     age_years: Age | None = None
41     sex: PatientSex | None = None

44 class PatientUpdate(BaseModel):   all optional (PATCH)

52 class PatientMatch(BaseModel):
53     """An existing patient who may be the one on a scanned prescription."""
55     patient: PatientOut
56     reasons: list[str]             # e.g. ["Same patient ID", "Similar name"]
```
Inheritance builds progressively richer views of the same entity; limits match DB columns
(`String(40)`, `String(120)`).

## `backend/app/schemas/prescription.py` (98 lines)

```python
11 ShortText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=255)]
12 LongText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=4000)]
13 ListItem = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]

16 class Medication(BaseModel):
17     name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
18     # As written, e.g. "500 mg".
19     dosage: ShortText | None = None
20     # As written, e.g. "1+0+1" or "twice daily".
21     frequency: ShortText | None = None
22     duration: ShortText | None = None
23     instructions: ShortText | None = None

26 class StaffRef(ORMModel):         id, full_name   (who scanned / filed)
```

```python
31 class PrescriptionSummary(ORMModel):          # list rows
32     id; status; patient: PatientRef | None
35     # Name as read from the photo; shown for drafts not yet linked to a patient.
36     extracted_patient_name: str | None
37     visit_date; chief_complaint; diagnosis; procedures: list[str]; medications: list[Medication]
42     advice: list[str]; follow_up_date; notes
45     has_extraction_error: bool                 # boolean only (list doesn't need the message)
46     # The photo is still being read; fields fill in when it finishes.
47     reading: bool
48     created_at: datetime

51 class PrescriptionDetail(ORMModel):           # review page
     … same clinical fields …
63     # One URL per page, in order.
64     image_urls: list[str]
65     extracted: dict[str, Any] | None           # raw AI output (patient block + uncertain_fields used by UI)
66     extraction_error: str | None
68     reading: bool
69     created_by: StaffRef; confirmed_by: StaffRef | None; confirmed_at: datetime | None; created_at: datetime
73     # Likely existing patients, filled for drafts only.
74     patient_matches: list[PatientMatch] = []
```
`reading`, `image_urls`, `has_extraction_error`, `extracted_patient_name` are **computed** in
`prescription_service.to_summary/to_detail` (`:252-304`), not columns.

```python
77 class PrescriptionSave(BaseModel):
78     """The reviewed prescription. Saving files it in the patient's record."""
80     patient_id: uuid.UUID | None = None
81     new_patient: PatientCreate | None = None
83     visit_date: date                            # required to file
84     chief_complaint: LongText | None = None
85     diagnosis: LongText | None = None
86     procedures: list[ListItem] = Field(default_factory=list, max_length=50)
87     medications: list[Medication] = Field(default_factory=list, max_length=50)
88     advice: list[ListItem] = Field(default_factory=list, max_length=50)
89     follow_up_date: date | None = None
90     notes: LongText | None = None

92     @model_validator(mode="after")
93     def _check(self) -> Self:
94         if (self.patient_id is None) == (self.new_patient is None):
95             raise ValueError("Choose an existing patient or enter a new one")
96         if self.follow_up_date and self.follow_up_date < self.visit_date:
97             raise ValueError("The follow-up date cannot be before the visit date")
98         return self
```
- Line 94 is an **XOR** check: both `None` → error; both set → error.
- `ListItem` has `min_length=1` *after* stripping, so `"  "` is rejected — but the frontend already
  drops blank lines (`form.ts:52-56`).
- `Self` (3.11+) types the return as the class itself.

## Q&A

**Q:** 🟢 Why separate `UserCreate` and `UserOut`?

**A:** Inputs and outputs differ: clients send a password but must never receive `password_hash`;
clients must not set `id`, `created_at`, `is_active` on create. Separate models prevent
mass-assignment and leaks.

**Q:** 🟡 How is `Page[PatientListItem]` different from `Page[UserOut]` in OpenAPI?

**A:** Pydantic generates a concrete schema per parameterisation (e.g. `Page_PatientListItem_`) with
`items` typed accordingly, so the docs and any generated client know the item shape.

**Q:** 🟡 What does `strip_whitespace=True` combined with `min_length=2` mean for `" A "`?

**A:** Whitespace is stripped first → `"A"` → length 1 < 2 → validation error. Stored names never have
leading/trailing spaces.

**Q:** 🔴 Why is `PrescriptionSave` a PUT body with all clinical fields rather than PATCH?

**A:** Saving is "replace the draft's content with the reviewed version" — the dentist reviews the whole
form; PUT semantics (full replacement, idempotent) fit, and the service assigns every field
(`prescription_service.py:318-326`).

**Q:** 🟢 Where do `patient_matches` come from?

**A:** `to_detail` fills them for non-reading drafts via `patient_service.find_matches`
(`prescription_service.py:276-280`); filed prescriptions return `[]` (the default on line 74).

**Q:** 🟡 Why is `extracted` typed as `dict[str, Any]` instead of a model?

**A:** It's raw, untrusted model output kept for audit; the UI only reads `patient` and
`uncertain_fields` (`frontend/src/api/types.ts:74-83`). A loose type avoids 500s if the model ever
returns unexpected shapes.

**Q:** 🔴 What's the purpose of `max_length=50` on lists?

**A:** Bound request size and DB row size (and PDF length); without it a client could send 100k
medicines and exhaust memory/CPU in validation and rendering.
