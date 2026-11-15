# 07 — Models: `models/base.py`, `user.py`, `patient.py`, `__init__.py`

**Purpose:** SQLAlchemy ORM classes that map to tables. **Called by:** services, deps, tests,
Alembic (`alembic/env.py:7`). → Skill: `14-sqlalchemy-alembic.md` §2.

## `backend/app/models/base.py` (31 lines)

```python
1  import uuid
2  from datetime import datetime
4  from sqlalchemy import DateTime, MetaData, Uuid, func
5  from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

7  NAMING_CONVENTION = {
8      "ix": "ix_%(column_0_label)s",                                   # ix_prescriptions_status
9      "uq": "uq_%(table_name)s_%(column_0_name)s",                     # uq_users_email
10     "ck": "ck_%(table_name)s_%(constraint_name)s",
11     "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",  # fk_refresh_tokens_user_id_users
12     "pk": "pk_%(table_name)s",                                       # pk_users
13 }

16 class Base(DeclarativeBase):
17     metadata = MetaData(naming_convention=NAMING_CONVENTION)
18     type_annotation_map = {datetime: DateTime(timezone=True), uuid.UUID: Uuid}

21 class UUIDPk:
22     id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

25 class Timestamps:
26     created_at: Mapped[datetime] = mapped_column(server_default=func.now())
27     updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

30 class SoftDelete:
31     deleted_at: Mapped[datetime | None] = mapped_column(default=None, index=True)
```

- 7-13: deterministic constraint names → migrations can reference/drop them; they appear verbatim in
  the migrations (`0001:40-41`).
- 16-18: the declarative base all models inherit; every `datetime` annotation becomes `timestamptz`,
  every `uuid.UUID` a native `uuid`.
- 21-22: mixin: UUID primary key generated in Python (so the id is known before insert).
- 25-27: mixin: DB-side `now()` on insert; ORM sets `now()` on update.
- 30-31: ⚠️ defined but **unused** by any model — patients and prescriptions are hard-deleted.

## `backend/app/models/user.py` (45 lines)

```python
11 class UserRole(enum.StrEnum):
12     ADMIN = "admin"
13     DENTIST = "dentist"
14     RECEPTIONIST = "receptionist"

17 class User(UUIDPk, Timestamps, Base):
18     __tablename__ = "users"
20     email: Mapped[str] = mapped_column(String(255), unique=True)       # stored lower-cased by services
21     full_name: Mapped[str] = mapped_column(String(120))
22     phone: Mapped[str | None] = mapped_column(String(20))
23     role: Mapped[UserRole] = mapped_column(
24         Enum(UserRole, name="user_role", values_callable=lambda e: [m.value for m in e])
25     )
26     password_hash: Mapped[str] = mapped_column(String(255))
27     is_active: Mapped[bool] = mapped_column(default=True)
28     last_login_at: Mapped[datetime | None]
30     refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
31         back_populates="user", cascade="all, delete-orphan"
32     )

35 class RefreshToken(UUIDPk, Timestamps, Base):
36     """One row per issued refresh token. `id` is the JWT `jti`."""
38     __tablename__ = "refresh_tokens"
40     user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
41     expires_at: Mapped[datetime]
42     revoked_at: Mapped[datetime | None]
43     replaced_by_id: Mapped[uuid.UUID | None]
45     user: Mapped[User] = relationship(back_populates="refresh_tokens")
```

- Base classes order `(UUIDPk, Timestamps, Base)`: mixins first so their columns are collected;
  `Base` last.
- 23-25: Postgres enum named `user_role` storing values (`admin`), matching the migration
  (`0001:18`).
- 27: Python default `True` (the migration declares `is_active` NOT NULL with no server default —
  inserts must go through the ORM or specify it).
- 40: `ondelete="CASCADE"` at DB level + `cascade="all, delete-orphan"` at ORM level — both layers
  remove tokens with their user.
- 43: `replaced_by_id` — a self-reference by value (no FK) recording the rotation chain.

## `backend/app/models/patient.py` (80 lines)

```python
14 class PatientSex(enum.StrEnum):   MALE="male"; FEMALE="female"; OTHER="other"
20 class PrescriptionStatus(enum.StrEnum):
21     # Photo uploaded and read; waiting for the dentist to check it.
22     DRAFT = "draft"
23     # Checked by a dentist and filed in the patient's record.
24     CONFIRMED = "confirmed"

27 def _enum(cls: type[enum.Enum], name: str) -> Enum:
28     return Enum(cls, name=name, values_callable=lambda e: [m.value for m in e])
```
Small factory removing the repetition seen in `user.py:24`.

```python
31 class Patient(UUIDPk, Timestamps, Base):
32     __tablename__ = "patients"
34     # The ID written on the clinic's prescriptions; generated (P-00001) when absent.
35     patient_code: Mapped[str] = mapped_column(String(40), unique=True)
36     full_name: Mapped[str] = mapped_column(String(120))
37     phone: Mapped[str | None] = mapped_column(String(20), index=True)
38     age_years: Mapped[int | None]
39     sex: Mapped[PatientSex | None] = mapped_column(_enum(PatientSex, "patient_sex"))
41     prescriptions: Mapped[list["Prescription"]] = relationship(back_populates="patient")
```
- The trigram GIN index on `full_name` is **not** declared here; it exists only in the migration
  (`0002:53-55`), so `alembic revision --autogenerate` may propose dropping it — review generated
  scripts carefully (or declare it with `Index(..., postgresql_using="gin", postgresql_ops=…)`).
- `age_years` (not date of birth) — that's what's written on prescriptions; it goes stale over time.

```python
44 class Prescription(UUIDPk, Timestamps, Base):
45     """One handwritten prescription: the photo plus what was read from it."""
47     __tablename__ = "prescriptions"
49     status: Mapped[PrescriptionStatus] = mapped_column(
50         _enum(PrescriptionStatus, "prescription_status"), default=PrescriptionStatus.DRAFT, index=True)
52     # Empty while a draft has not been matched to a patient yet.
53     patient_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("patients.id", ondelete="RESTRICT"), index=True)
56     created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
57     confirmed_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
58     confirmed_at: Mapped[datetime | None]
60     visit_date: Mapped[date | None] = mapped_column(index=True)
61     chief_complaint: Mapped[str | None] = mapped_column(Text)
62     diagnosis: Mapped[str | None] = mapped_column(Text)
63     procedures: Mapped[list[str]] = mapped_column(JSONB, default=list)
64     # [{name, dosage, frequency, duration, instructions}]
65     medications: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
66     advice: Mapped[list[str]] = mapped_column(JSONB, default=list)
67     follow_up_date: Mapped[date | None] = mapped_column(index=True)
68     notes: Mapped[str | None] = mapped_column(Text)
70     # Pages of the prescription in order, relative to STORAGE_DIR.
71     image_paths: Mapped[list[str]] = mapped_column(JSONB, default=list)
72     # Raw model output, kept so a reviewed record can be compared with what was read.
73     extracted: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
74     extraction_error: Mapped[str | None] = mapped_column(Text)
75     # Set while the photo is being read in the background.
76     reading_started_at: Mapped[datetime | None]
78     patient: Mapped[Patient | None] = relationship(back_populates="prescriptions")
79     created_by: Mapped[User] = relationship(foreign_keys=[created_by_id])
80     confirmed_by: Mapped[User | None] = relationship(foreign_keys=[confirmed_by_id])
```
- `patient_id` nullable: drafts exist before a patient is chosen.
- `RESTRICT`: a patient can't be deleted while prescriptions reference them — the service deletes
  prescriptions first.
- `default=list` (callable) avoids the shared-mutable-default bug.
- Paths are **relative** to `STORAGE_DIR` so moving storage only changes config.
- `reading_started_at` is a nullable timestamp instead of a boolean — it doubles as a lease for
  timeout detection.
- `foreign_keys=[...]` disambiguates two FKs to `users`.

## `backend/app/models/__init__.py` (16 lines)

Imports all models and enums and lists them in `__all__` — see walkthrough 03.

## Q&A

**Q:** 🟢 How does SQLAlchemy know `phone` is nullable?

**A:** From the annotation: `Mapped[str | None]` → nullable; `Mapped[str]` → NOT NULL
(`models/patient.py:36-37`).

**Q:** 🟡 What's `values_callable` for in the enum columns?

**A:** SQLAlchemy's `Enum` stores member **names** by default (`ADMIN`). `values_callable` makes it use
the **values** (`admin`) so the DB enum and JSON API use the same lowercase strings
(`models/user.py:24`, `models/patient.py:27-28`).

**Q:** 🟡 Why both `ondelete="CASCADE"` and `cascade="all, delete-orphan"` for refresh tokens?

**A:** DB-level cascade handles deletes done in SQL; ORM cascade makes the Session delete child objects
it has loaded (and orphans removed from the collection). Together they keep both layers consistent.

**Q:** 🔴 Why store `reading_started_at` instead of a boolean `is_reading`?

**A:** A boolean can't tell a running read from one that died with a server restart. A timestamp
works as a lease: "reading" only if started less than 5 minutes ago (`prescription_service.py:123-125`);
older means interrupted (`:128-131`).

**Q:** 🟡 Why is `patient_id` nullable but `created_by_id` not?

**A:** Drafts are created before the dentist links them to a patient, but every prescription is
uploaded by some staff member.

**Q:** 🔴 What's a risk of declaring the trigram index only in the migration?

**A:** The model metadata doesn't know about it, so autogenerate compares models to the DB and may
emit `drop_index('ix_patients_full_name_trgm')`. A careless developer would delete the index that makes
name search fast.

**Q:** 🟢 What's in `extracted` and why keep it?

**A:** The raw JSON returned by Gemini, saved before sanitisation (`prescription_service.py:111`). It
lets you compare what the model read with what the dentist saved and drives the "Check" badges via
`uncertain_fields`.
