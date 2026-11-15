# Pydantic — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

## Concepts

**Q:** 🟢 What is Pydantic?

**A:** A library that validates and serialises data based on Python type hints; invalid input raises a `ValidationError` listing all problems.

**Q:** 🟢 What is a `BaseModel`?

**A:** The base class for schemas: annotated fields become validated attributes (`schemas/user.py:26-31`).

**Q:** 🟢 How do you make a field optional?

**A:** Give it a default, usually `None`, and allow `None` in the type: `phone: BDPhone | None = None`.

**Q:** 🟢 What does `Field(min_length=8, max_length=128)` do?

**A:** Adds constraints to a field (`schemas/user.py:11`).

**Q:** 🟢 What is `EmailStr`?

**A:** A string type validated as an email address (needs `email-validator`, `requirements.txt:8`).

**Q:** 🟢 What does `model_dump()` return?

**A:** A dict of the model's data (`model_dump_json()` returns JSON).

**Q:** 🟢 What does `Model.model_validate(obj)` do?

**A:** Validates a dict or (with `from_attributes`) an object into a model instance.

**Q:** 🟢 What is `from_attributes=True`?

**A:** Lets models read data from object attributes (ORM rows) — `ORMModel` (`schemas/common.py:9-10`).

**Q:** 🟢 What does `StringConstraints(strip_whitespace=True, min_length=2)` do?

**A:** Strips whitespace, then enforces length (`schemas/user.py:12`).

**Q:** 🟢 What is coercion?

**A:** Lax-mode conversion of compatible inputs: `"34"` → `34`, `"2026-10-08"` → `date`, `"true"` → `True`.

**Q:** 🟡 What is `Annotated` used for in Pydantic?

**A:** Attaching constraints/validators to a type to create reusable aliases: `Age = Annotated[int, Field(ge=0, le=130)]` (`schemas/patient.py:13`).

**Q:** 🟡 What is a field validator?

**A:** `@field_validator("name", mode="before"|"after")` classmethod transforming or checking one field (`config.py:44-49`).

**Q:** 🟡 What is a model validator?

**A:** `@model_validator(mode="after")` checks the whole model (cross-field rules) and returns `self` (`schemas/prescription.py:92-98`).

**Q:** 🟡 `mode="before"` vs `mode="after"`?

**A:** Before receives raw input (pre-coercion); after receives the typed value.

**Q:** 🟡 What is `AfterValidator`?

**A:** A functional validator applied after type validation via `Annotated`; can transform the value (`BDPhone`, `validators.py:23`).

**Q:** 🟡 How do validators report errors?

**A:** Raise `ValueError` (or `PydanticCustomError`); Pydantic converts them into validation errors with messages prefixed "Value error, ".

**Q:** 🟡 What does `exclude_unset=True` do?

**A:** Dumps only fields the client provided — essential for PATCH semantics (`user_service.py:79`).

**Q:** 🟡 `exclude_unset` vs `exclude_none` vs `exclude_defaults`?

**A:** Not provided vs value `None` vs equal to default.

**Q:** 🟡 What does `Field(default_factory=list)` do?

**A:** Creates a new list per instance (`schemas/prescription.py:86`).

**Q:** 🟡 Is `x: list[int] = []` safe in Pydantic?

**A:** Yes — Pydantic copies mutable defaults per instance (unlike plain functions/classes) (`schemas/prescription.py:74`).

**Q:** 🟡 How do nested models validate?

**A:** A field typed as another model validates recursively: `new_patient: PatientCreate | None` (`schemas/prescription.py:81`).

**Q:** 🟡 How do generic models work?

**A:** `class Page(BaseModel, Generic[T])`; `Page[UserOut]` is a concrete model (`schemas/common.py:13-17`).

**Q:** 🟡 What does `ConfigDict` configure?

**A:** Model behaviour: `from_attributes`, `extra` (`ignore/forbid/allow`), `strict`, `frozen`, `populate_by_name`, etc.

**Q:** 🟡 What does `extra="forbid"` do?

**A:** Rejects unknown fields (default for BaseModel is `ignore`). Useful to catch client typos.

**Q:** 🟡 What is `BaseSettings`?

**A:** From pydantic-settings: a model populated from environment variables and `.env` files (`config.py:10-11`).

**Q:** 🟡 What is the precedence in BaseSettings?

**A:** Init arguments > environment variables > dotenv file > defaults (secrets dir also supported).

**Q:** 🟡 What does `NoDecode` do?

**A:** Prevents pydantic-settings from JSON-decoding a complex env value so a custom `before` validator can parse it (comma-separated origins, `config.py:26`).

**Q:** 🟡 How is the production secret check implemented?

**A:** A model validator raising if `environment == "production"` and `jwt_secret` equals the dev constant (`config.py:51-55`).

**Q:** 🟡 What does `Literal["development", "test", "production"]` enforce?

**A:** Only those exact strings are valid (`config.py:13`).

**Q:** 🟡 Why have separate Create/Update/Out models?

**A:** Different allowed fields and requiredness for input vs output; prevents mass assignment and data leaks.

**Q:** 🔴 What changed from Pydantic v1 to v2?

**A:** Rust core (`pydantic-core`) for speed; renamed APIs (`model_dump`, `model_validate`, `field_validator`, `model_config`); stricter defaults in places; `BaseSettings` moved to pydantic-settings.

**Q:** 🔴 What is strict mode?

**A:** Disables coercion — `"34"` is not accepted for `int`. Set per field (`Field(strict=True)`) or model (`ConfigDict(strict=True)`).

**Q:** 🔴 What is `TypeAdapter`?

**A:** Validates/serialises non-model types (`TypeAdapter(list[int]).validate_python(data)`).

**Q:** 🔴 What are computed fields?

**A:** `@computed_field` properties included in serialisation — could replace manual `reading`/`image_urls` construction.

**Q:** 🔴 What is a discriminated union in Pydantic?

**A:** `Annotated[A | B, Field(discriminator="kind")]` chooses the model by a literal tag — faster and clearer errors.

**Q:** 🔴 How could `PrescriptionSave`'s XOR rule be modelled differently?

**A:** A discriminated union: `patient: ExistingPatient | NewPatient` with `kind` literals, making the invalid states unrepresentable.

## Predict / find the bug

**Q:** 🟢 Predict: `UserCreate(email="A@B.com", full_name=" Al ", role="dentist", password="12345678").full_name`

**A:** `"Al"` — whitespace stripped (length 2 passes).

**Q:** 🟡 Predict: `PatientCreate(full_name="X")`

**A:** Validation error — `min_length=2` (`schemas/patient.py:11`).

**Q:** 🟡 Predict: `PrescriptionSave(visit_date="2026-10-08")` (no patient fields)

**A:** Error "Choose an existing patient or enter a new one" from the model validator.

**Q:** 🟡 Predict: `BDPhone` input `"01712-345678"`

**A:** Stored as `"+8801712345678"`.

**Q:** 🟡 Bug: PATCH handler uses `data.model_dump()` and overwrites fields with `None`.

**A:** Use `exclude_unset=True` so only sent fields apply.

**Q:** 🟡 Predict: `Age` with `"34"`

**A:** `34` (coerced in lax mode).

**Q:** 🟡 Predict: `procedures=["  "]` in `PrescriptionSave`

**A:** Error — `ListItem` strips then requires `min_length=1`.

**Q:** 🔴 Bug: a `model_validator` error shows `field: ""` in the API.

**A:** Model-level errors have `loc=("body",)`; the error formatter strips `body`, leaving an empty field (`errors.py:81-83`).

**Q:** 🟡 Predict: `Settings(cors_origins="http://a, http://b").cors_origins`

**A:** `["http://a", "http://b"]`.

## Scenarios & tasks

**Q:** 🟡 Write a reusable constrained name type.

**A:** `Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]` (`schemas/user.py:12`).

**Q:** 🟡 Write a cross-field validator: end date ≥ start date.

**A:**
```python
@model_validator(mode="after")
def _check(self) -> Self:
    if self.end and self.end < self.start: raise ValueError("End before start")
    return self
```

**Q:** 🟡 Write a validator normalising phone numbers.

**A:** `def norm(v: str) -> str: …; Phone = Annotated[str, AfterValidator(norm)]` (`validators.py:11-23`).

**Q:** 🟡 Build a list response with total count.

**A:** `class Page(BaseModel, Generic[T]): items: list[T]; total: int; page: int; page_size: int` (`schemas/common.py:13-17`).

**Q:** 🟡 How do you turn an ORM object into a response model with extra fields?

**A:** `PatientListItem(**PatientOut.model_validate(p).model_dump(), visit_count=n, …)` (`patients.py:24-29`).

**Q:** 🟡 How do you cap list length?

**A:** `Field(default_factory=list, max_length=50)` (`schemas/prescription.py:86`).

**Q:** 🔴 How would you validate the Gemini JSON with Pydantic instead of hand-written sanitisers?

**A:** Define an `Extraction` model with lax types and `BeforeValidator`s that coerce/trim/drop invalid values; validate with `Extraction.model_validate(data)` and catch errors per field. Sanitisers were chosen to be forgiving field-by-field.

## Comparisons & interview

**Q:** 🟡 Pydantic vs dataclasses?

**A:** Dataclasses store data without validation; Pydantic validates, coerces, serialises and generates JSON Schema.

**Q:** 🟡 Pydantic vs marshmallow?

**A:** Pydantic is type-hint driven and fast (Rust); marshmallow uses separate schema classes and is slower.

**Q:** 🟡 Pydantic vs attrs?

**A:** attrs is a powerful dataclass alternative with optional validators; Pydantic focuses on parsing untrusted data.

**Q:** 🟡 Why use Pydantic in FastAPI?

**A:** FastAPI builds on it for request parsing, validation, serialisation and OpenAPI schemas.

**Q:** 🟡 Where are business rules that need the DB checked?

**A:** In services, not validators — e.g. unique email (`user_service.py:45-50`).

**Q:** 🟢 What does `UserOut` exclude?

**A:** `password_hash` — the response never includes it (`schemas/user.py:15-23`).

**Q:** 🟡 Why does `LoginRequest.password` have `max_length=128`?

**A:** Prevents hashing huge inputs (DoS via Argon2 cost) (`schemas/user.py:52`).

**Q:** 🟡 How does Pydantic handle enums?

**A:** Accepts enum values (strings) and returns enum members; serialises back to values.

**Q:** 🟡 How do you generate JSON Schema from a model?

**A:** `Model.model_json_schema()` — FastAPI uses it for OpenAPI.

**Q:** 🔴 What's the cost of Pydantic validation in hot paths?

**A:** Small with v2 but non-zero; for trusted internal data use `model_construct` (skips validation) or plain dataclasses.

**Q:** 🟡 What does `model_config = SettingsConfigDict(env_file=".env", extra="ignore")` mean?

**A:** Read `.env` and ignore unknown variables (`config.py:11`).

**Q:** 🟡 Why are settings cached?

**A:** Parsing env + validation once per process; `get_settings()` returns the same instance (`config.py:58-60`).

**Q:** 🟢 What's `Message` used for?

**A:** Simple `{ "message": "…" }` responses like "Signed out" (`schemas/common.py:36-37`).

**Q:** 🟡 How does `PrescriptionDetail.patient_matches` default work?

**A:** `= []` — Pydantic copies it per instance; filled only for non-reading drafts (`schemas/prescription.py:74`).

**Q:** 🟡 Why is `extracted` typed loosely?

**A:** It's raw model output kept for audit; strict typing could cause 500s if the model changes shape.
