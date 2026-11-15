# 12 — Pydantic v2 + pydantic-settings

> **Where it lives:** `backend/app/schemas/*.py` (request/response models),
> `backend/app/core/config.py` (`Settings`), `backend/app/core/validators.py` (`BDPhone`).
> Versions: `pydantic>=2.9,<3`, `pydantic-settings>=2.5`, `email-validator` (`requirements.txt:6-8`).

---

## 1. What & why

**Pydantic** — a library that turns **type hints into runtime validation and serialisation**.
You declare a class with typed fields; constructing it from untrusted data (JSON, env vars, ORM
objects) either produces a valid, typed object or raises a `ValidationError` listing every problem.

**pydantic-settings** — the same idea for configuration loaded from environment variables and
`.env` files.

**Analogy:** a customs officer with a checklist per form: wrong types are converted if obviously
safe ("15" → 15), otherwise rejected with a precise reason.

**When NOT to use:** hot inner loops on trusted data (plain dataclasses are cheaper), or when
another validation layer (e.g. Django forms/DRF serializers) is already in place.

---

## 2. Fundamentals

### 2.1 A model

📍 `backend/app/schemas/user.py:26-31`:

```python
class UserCreate(BaseModel):
    email: EmailStr                    # validated email (needs email-validator)
    full_name: Name                    # Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
    phone: BDPhone | None = None       # custom validated type, optional
    role: UserRole                     # must be one of the StrEnum values
    password: Password                 # Annotated[str, Field(min_length=8, max_length=128)]
```

- Required fields have no default; optional ones default to `None`.
- Invalid input → FastAPI returns 422 with each error (`core/errors.py:77-91`).

### 2.2 Reusable constrained types with `Annotated`

📍 `schemas/user.py:11-12` and `schemas/patient.py:11-13`:

```python
Password = Annotated[str, Field(min_length=8, max_length=128)]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
PatientCode = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
Age = Annotated[int, Field(ge=0, le=130)]
```

Define once, reuse everywhere — consistent limits that also match DB column sizes
(`String(120)` in `models/patient.py:36`).

### 2.3 Output models and `from_attributes`

📍 `schemas/common.py:9-10`:

```python
class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)   # read from object attributes, not only dicts
```

`UserOut.model_validate(user_row)` reads `user_row.email`, etc. (`api/v1/users.py:26`). (v1 name:
`orm_mode = True`.)

### 2.4 Serialising

| Method | Returns |
|---|---|
| `m.model_dump()` | dict |
| `m.model_dump(exclude_unset=True)` | only fields the client actually sent |
| `m.model_dump_json()` | JSON string |
| `Model.model_validate(obj)` | validate a dict/object |
| `Model.model_validate_json(s)` | parse + validate JSON |

📍 **PATCH semantics with `exclude_unset`**, `services/user_service.py:78-90`:

```python
changes = data.model_dump(exclude_unset=True)    # {"role": "dentist"} if only role was sent
…
for field, value in changes.items():
    if value is None and field != "phone":       # null means "clear" only for phone
        continue
    setattr(user, field, value)
```

`exclude_unset` distinguishes "not sent" (keep) from "sent as null" (clear). Same in
`patient_service.py:109-119`.

---

## 3. Intermediate

### 3.1 Custom validators

📍 **Functional validator in a type**, `core/validators.py:11-23`:

```python
def normalize_bd_phone(value: str) -> str:
    digits = re.sub(r"[\s\-()]", "", value)
    if digits.startswith("+"): digits = digits[1:]
    if digits.startswith("880"): digits = "0" + digits[3:]
    if not _BD_MOBILE.match(digits):
        raise ValueError("Enter a valid Bangladeshi mobile number (01XXXXXXXXX)")
    return "+88" + digits                       # canonical E.164-style form

BDPhone = Annotated[str, AfterValidator(normalize_bd_phone)]
```

**AfterValidator** runs after the base `str` validation; raising `ValueError` becomes a 422 field
error; *returning* a value **transforms** it. So `"01712-345678"` is stored as `"+8801712345678"`
(test: `tests/test_users.py:36`).

📍 **Model validator**, `schemas/prescription.py:92-98`:

```python
@model_validator(mode="after")
def _check(self) -> Self:
    if (self.patient_id is None) == (self.new_patient is None):     # XOR: exactly one
        raise ValueError("Choose an existing patient or enter a new one")
    if self.follow_up_date and self.follow_up_date < self.visit_date:
        raise ValueError("The follow-up date cannot be before the visit date")
    return self
```

`mode="after"` runs on the constructed model (typed fields); `mode="before"` receives raw input.

📍 **Field validator, before mode**, `core/config.py:44-49`:

```python
@field_validator("cors_origins", mode="before")
@classmethod
def _split_origins(cls, value: object) -> object:
    if isinstance(value, str):
        return [o.strip() for o in value.split(",") if o.strip()]
    return value
```

### 3.2 Nested models, lists and generics

📍 `schemas/prescription.py:77-90`:

```python
class PrescriptionSave(BaseModel):
    patient_id: uuid.UUID | None = None
    new_patient: PatientCreate | None = None            # nested model
    visit_date: date                                   # "2026-10-08" → date
    procedures: list[ListItem] = Field(default_factory=list, max_length=50)  # ≤ 50 items, each 1–500 chars
    medications: list[Medication] = Field(default_factory=list, max_length=50)
```

📍 Generic model, `schemas/common.py:13-17` `class Page(BaseModel, Generic[T])` →
`response_model=Page[PatientListItem]` (`api/v1/patients.py:14`) produces a distinct OpenAPI schema
per item type.

### 3.3 Inheritance for schema families

📍 `schemas/patient.py:16-32`: `PatientRef` (id, code, name) → `PatientOut` (+ phone, age, sex,
created_at) → `PatientListItem` (+ visit stats). Small payloads where enough
(`PrescriptionSummary.patient: PatientRef | None`, `schemas/prescription.py:34`).

### 3.4 Coercion (lax mode)

By default Pydantic converts compatible input: `"34"` → `34` for `int`, `"2026-10-08"` → `date`,
`"female"` → `PatientSex.FEMALE`. `strict=True` (per field or `ConfigDict(strict=True)`) disables
this.

### 3.5 Settings

📍 `core/config.py:10-60`:

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    environment: Literal["development", "test", "production"] = "development"
    database_url: str = "postgresql+psycopg://rootrecord:rootrecord@db:5432/rootrecord"
    jwt_secret: str = DEV_JWT_SECRET
    access_token_minutes: int = 15                       # "15" from env → 15
    cookie_secure: bool = False                          # "true"/"false" → bool
    cors_origins: Annotated[list[str], NoDecode] = []    # NoDecode: don't JSON-parse; our validator splits CSV
    gemini_api_key: str | None = None
    …
    @model_validator(mode="after")
    def _require_real_secret_in_production(self) -> "Settings":
        if self.environment == "production" and self.jwt_secret == DEV_JWT_SECRET:
            raise ValueError("JWT_SECRET must be set in production")
        return self

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

- Each field maps to an env var with the same name, case-insensitive (`JWT_SECRET` → `jwt_secret`).
- Precedence: init args > environment variables > `.env` file > defaults.
- `extra="ignore"` — unrelated env vars don't cause errors.
- `NoDecode` — pydantic-settings normally parses complex types (lists) from env as **JSON**;
  `NoDecode` hands the raw string to the `before` validator so `a,b,c` works.
- **Fail fast**: the app refuses to start in production with the dev secret.

---

## 4. Advanced

### 4.1 Under the hood

Pydantic v2's core (`pydantic-core`) is written in **Rust**; a model's schema is compiled once into
a validator, making validation ~5–50× faster than v1.

### 4.2 Validation errors structure

`exc.errors()` → list of `{"type", "loc", "msg", "input", "ctx"}`. 📍 `core/errors.py:79-87`
converts `loc` tuples to dotted field names.

### 4.3 Computed fields, aliases, serialisers

`@computed_field`, `Field(alias="patientId")`, `@field_serializer`. Not used here — the API
uses `snake_case` everywhere, and the frontend types use the same names (`frontend/src/api/types.ts`).

### 4.4 v1 → v2 migration names

| v1 | v2 |
|---|---|
| `.dict()` / `.json()` | `.model_dump()` / `.model_dump_json()` |
| `parse_obj` | `model_validate` |
| `orm_mode` | `from_attributes` |
| `@validator` / `@root_validator` | `@field_validator` / `@model_validator` |
| `Config` inner class | `model_config = ConfigDict(...)` |
| `BaseSettings` in pydantic | moved to `pydantic-settings` |

---

## 5. Comparisons

| X vs Y | Answer |
|---|---|
| Pydantic vs dataclasses | validation + coercion + JSON vs plain containers |
| Pydantic vs marshmallow | type-hint-driven, fast vs schema classes, separate from models |
| Pydantic vs Zod | same idea in Python vs TypeScript; this repo uses both |
| `field_validator` vs `model_validator` | one field vs whole object / cross-field |
| before vs after validator | raw input vs typed value |
| `exclude_unset` vs `exclude_none` | not provided vs value is None |
| lax vs strict | coerce vs exact types |

---

## 6. Patterns & anti-patterns

- ✅ Separate input (`*Create`, `*Update`, `*Save`) and output (`*Out`, `*Detail`) models — clients
  can't set `id`, `created_at`, `confirmed_by`.
- ✅ Constrained aliases shared across schemas.
- ✅ Validators that *normalise* (phone) so the DB holds one canonical format.
- ❌ One model for both input and DB row (mass-assignment bugs).
- ❌ Business rules that need the DB inside validators (keep them in services:
  `_ensure_email_free`, `services/user_service.py:45-50`).

---

## 7. Security & performance

- Length limits on every string prevent memory abuse and DB errors.
- `max_length=50` on lists prevents huge payloads (`schemas/prescription.py:86-88`).
- Response models prevent leaking `password_hash`.
- `LoginRequest.password` has `max_length=128` (`schemas/user.py:52`) — hashing a 10 MB password
  with Argon2 would be a cheap DoS.

---

## 8. Cheat sheet

```python
class M(BaseModel):
    model_config = ConfigDict(from_attributes=True, strict=False, extra="forbid")
    a: int = Field(ge=0, le=10)
    b: Annotated[str, StringConstraints(strip_whitespace=True, max_length=50)]
    c: list[str] = Field(default_factory=list, max_length=50)
    @field_validator("b", mode="before") @classmethod def v(cls, x): ...
    @model_validator(mode="after") def m(self) -> Self: ...; return self
M.model_validate(obj); m.model_dump(exclude_unset=True); m.model_dump_json()
class S(BaseSettings): model_config = SettingsConfigDict(env_file=".env")
```

---

## 9. Why chosen

FastAPI is built on Pydantic, so it's the natural choice; v2 brings speed and clearer APIs.
pydantic-settings gives typed, validated configuration with zero extra code.
