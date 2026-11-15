# 13 — `services/user_service.py` and `services/patient_service.py`

## `backend/app/services/user_service.py` (122 lines)

**Purpose:** staff CRUD and admin rules. **Called by:** `api/v1/users.py`, `app/cli.py`.

| Lines | Function | What it does |
|---|---|---|
| 14-18 | `get` | `db.get(User, id)` or `NotFound("User")` |
| 21-42 | `list_users` | filter by `q` (name/email ILIKE), `role`, `is_active`; count via subquery; order by name; offset/limit |
| 45-50 | `_ensure_email_free` | SELECT id by email (optionally excluding self) → `Conflict(code="email_taken")` |
| 53-65 | `create` | lower-case email, ensure free, hash password, insert, commit |
| 68-75 | `_ensure_not_last_admin` | if user is admin, count active admins; ≤ 1 → `BadRequest("last_admin")` |
| 78-90 | `update` | PATCH with `exclude_unset`; email uniqueness; role change guarded by last-admin rule; `None` ignored except `phone` |
| 93-101 | `set_active` | deactivation: not self, not last admin, revoke all tokens |
| 104-107 | `reset_password` | new hash + revoke all tokens |
| 110-122 | `ensure_bootstrap_admin` | create first admin if none exists |

Key lines:

```python
32         stmt = stmt.where(or_(User.full_name.ilike(like), User.email.ilike(like)))
38     total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
```
`or 0` guards against `None` (typing-wise `scalar` can return None).

```python
71     active_admins = db.scalar(
72         select(func.count()).where(User.role == UserRole.ADMIN, User.is_active.is_(True)))
74     if (active_admins or 0) <= 1:
75         raise BadRequest("The clinic must keep at least one active admin", code="last_admin")
```
⚠️ `select(func.count()).where(...)` without `select_from` — SQLAlchemy infers `FROM users` from the
WHERE columns. Works, but `select(func.count()).select_from(User).where(...)` is clearer.

```python
83     if changes.get("role") not in (None, user.role):     # role actually changing
84         _ensure_not_last_admin(db, user)
85     for field, value in changes.items():
86         if value is None and field != "phone":           # name/email/role can't be cleared
87             continue
88         setattr(user, field, value)                      # dynamic attribute assignment
```

## `backend/app/services/patient_service.py` (180 lines)

**Purpose:** patient queries, creation with code generation, update, deletion with photos, and
**fuzzy matching** of scanned prescriptions to existing patients.
**Called by:** `api/v1/patients.py`, `prescription_service.py` (create/get/find_matches).

### Constants (16-19)
```python
16 # pg_trgm similarity above which a name counts as a possible match.
17 NAME_SIMILARITY = 0.35
18 MAX_MATCHES = 5
19 _NEXT_CODE = text("SELECT nextval('patient_code_seq')")
```

### `_search` (29-37)
```python
29 def _search(stmt: Select[Any], q: str) -> Select[Any]:
30     q = q.strip()
31     like = f"%{q}%"
32     conditions = [Patient.full_name.ilike(like), Patient.patient_code.ilike(like)]
33     digits = re.sub(r"\D", "", q)                        # keep only digits
34     if len(digits) >= 4:
35         # Stored as +8801XXXXXXXXX; match typed 01XXX… or 8801XXX… by their tail.
36         conditions.append(Patient.phone.like(f"%{digits.removeprefix('88').lstrip('0')}%"))
37     return stmt.where(or_(*conditions))
```
Typing `01712` → digits `01712` → strip `88` prefix (none) → strip leading `0` → `%1712%` matches
`+8801712…`. Requiring ≥ 4 digits avoids matching every phone for "1".
⚠️ `%`/`_` typed by the user act as wildcards in LIKE (not escaped) — harmless here, but worth knowing.

### `list_patients` (40-73)
Explained as SQL in `13-sql-postgresql.md` §3.1. Notable: `func.min(...).filter(...)` → aggregate
FILTER; `.outerjoin(stats, …)`; ordering by last visit `desc().nulls_last()` then name;
`[tuple(r) for r in rows]` converts SQLAlchemy `Row`s to plain tuples (`type: ignore` because the
precise tuple type can't be inferred).

### Uniqueness and code generation (76-90)
```python
77     stmt = select(Patient.id).where(func.lower(Patient.patient_code) == code.lower())   # case-insensitive
86 def _generate_code(db: Session) -> str:
87     while True:
88         code = f"P-{db.scalar(_NEXT_CODE):05d}"
89         if db.scalar(select(Patient.id).where(Patient.patient_code == code)) is None:
90             return code
```

### `create` / `update` / `delete` (93-134)
```python
93  def create(db: Session, data: PatientCreate) -> Patient:
94      """Add a patient without committing (callers commit with related changes)."""
95      if data.patient_code:
96          _ensure_code_free(db, data.patient_code)
97      patient = Patient(patient_code=data.patient_code or _generate_code(db), …)
104     db.add(patient)
105     db.flush()                                            # INSERT now → constraint errors surface here; id assigned
106     return patient

109 def update(db, patient, data):
110     changes = data.model_dump(exclude_unset=True)
111     if changes.get("patient_code"):
112         _ensure_code_free(db, changes["patient_code"], exclude_id=patient.id)
113     for field, value in changes.items():
114         # Name and ID are required; the other fields can be cleared.
115         if value is None and field in ("patient_code", "full_name"):
116             continue
117         setattr(patient, field, value)
118     db.commit()

122 def delete(db, patient):
123     """Delete a patient with all their prescriptions and photos."""
124     # Imported here: prescription_service imports this module.
125     from app.services import prescription_service
127     prescriptions = list(db.scalars(select(Prescription).where(Prescription.patient_id == patient.id)))
128     paths = [path for p in prescriptions for path in prescription_service.image_files(p)]
129     for prescription in prescriptions:
130         db.delete(prescription)
131     db.delete(patient)
132     db.commit()                                           # DB first …
133     for path in paths:
134         path.unlink(missing_ok=True)                      # … then files (only after a successful commit)
```
Deleting files after the commit means a failed commit never leaves DB rows pointing at missing files.
`missing_ok=True` tolerates already-missing files.

### `find_matches` (137-180)
```python
137 def find_matches(db, info: dict[str, Any] | None) -> list[tuple[Patient, list[str]]]:
139     if not info:
140         return []
141     found: dict[uuid.UUID, tuple[Patient, list[str]]] = {}
143     def add(patients: list[Patient], reason: str) -> None:        # closure over `found`
144         for p in patients:
145             found.setdefault(p.id, (p, []))[1].append(reason)    # create entry once, append reason

147     code = (info.get("patient_id") or "").strip()                 # None-safe
148     if code:
149         add(list(db.scalars(select(Patient).where(func.lower(Patient.patient_code) == code.lower()))), "Same patient ID")

154     phone = (info.get("phone") or "").strip()
155     if phone:
156         try:
157             normalized = normalize_bd_phone(phone)
158         except ValueError:
159             normalized = None                                     # unreadable phone: skip signal
160         if normalized:
161             add(list(db.scalars(select(Patient).where(Patient.phone == normalized))), "Same phone number")

163     name = (info.get("full_name") or "").strip()
164     if name:
165         similarity = func.similarity(Patient.full_name, name)    # pg_trgm, 0..1
166         add(list(db.scalars(select(Patient).where(similarity >= NAME_SIMILARITY)
170                                 .order_by(similarity.desc()).limit(MAX_MATCHES))), "Similar name")

178     # Patients matching on more signals first; dict order breaks ties.
179     ranked = sorted(found.values(), key=lambda m: -len(m[1]))     # stable sort
180     return ranked[:MAX_MATCHES]
```
Three independent signals; a patient matching all three ranks first (tested:
`test_next_scan_suggests_the_existing_patient`, `tests/test_prescriptions.py:245-264`). Python's sort
is **stable**, so ties keep insertion order (ID matches first, then phone, then name).

→ Skills: `13-sql-postgresql.md` §3.4, §3.7; `14-sqlalchemy-alembic.md` §3.1.

## Q&A

**Q:** 🟢 Why are emails lower-cased before saving and searching?

**A:** So `Rahim@Clinic.com` and `rahim@clinic.com` are the same account and login is
case-insensitive (`user_service.py:54`, `auth_service.py:44`; test `test_auth.py:21-26`).

**Q:** 🟡 What stops an admin from removing the last admin?

**A:** `_ensure_not_last_admin` runs before demoting (role change) or deactivating an admin, counting
active admins (`user_service.py:68-75, 83-84, 97`).

**Q:** 🟡 Why does `patient_service.create` flush but not commit?

**A:** It's called from `prescription_service.save`, which must save the new patient and the
prescription atomically; `flush` sends the INSERT (so the id exists and constraint errors surface)
inside the same transaction (`patient_service.py:93-106`).

**Q:** 🔴 Why is `prescription_service` imported inside `delete()`?

**A:** Circular import: `prescription_service` imports `patient_service` at module level
(`prescription_service.py:29`). Importing inside the function defers it until call time, when both
modules are fully loaded.

**Q:** 🟡 How does the phone search match `+8801712345678` when the user types `01712`?

**A:** Digits are extracted, a leading `88` and leading zeros are stripped, and a `LIKE '%1712%'` is
added (`patient_service.py:33-36`).

**Q:** 🔴 What are the performance characteristics of `find_matches` on 200k patients?

**A:** The code and phone lookups are indexed (unique index on code — but `lower(code)` isn't indexed,
so that one scans; btree on phone). The `similarity(...) >= 0.35` predicate can't use the GIN trigram
index, so it computes similarity for every row. Switch to the `%` operator (indexable) with
`set_limit(0.35)` and a functional index on `lower(patient_code)`.

**Q:** 🟢 What happens to photos when a patient is deleted?

**A:** All the patient's prescriptions are deleted, then the patient, commit, then each image file is
unlinked (`patient_service.py:127-134`; test `test_admin_deletes_a_patient_with_their_prescriptions`).
