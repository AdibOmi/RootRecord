# 10 — Python 3.12

> **Where it lives:** all of `backend/` — `app/`, `alembic/`, `tests/`. Runtime image
> `python:3.12-slim` (`backend/Dockerfile:1`); Ruff targets `py312` (`backend/pyproject.toml:10`).

---

## 1. What & why

**Python** — a high-level, dynamically typed, interpreted language known for readability and a
huge ecosystem (web, data, AI, scripting).

**Mental model:** *everything is an object*; names are labels attached to objects; indentation is
syntax.

**Analogy:** Python is a well-organised kitchen with labelled drawers (the standard library):
almost any utensil you need is already there.

**When NOT to use Python:** hard real-time or very CPU-bound parallel work in pure Python (the GIL,
§5), mobile apps, or browser code.

---

## 2. Fundamentals

### 2.1 Core types

| Type | Mutable? | Example | In project |
|---|---|---|---|
| `int`, `float`, `bool` | no | `15`, `0.35`, `True` | `NAME_SIMILARITY = 0.35` (`services/patient_service.py:17`) |
| `str` | no | `"P-00001"` | everywhere |
| `bytes` | no | `b"\xff\xd8"` | uploaded photos (`api/v1/prescriptions.py:30`) |
| `list` | yes | `[1, 2]` | `image_paths` |
| `tuple` | no | `(user, tokens)` | return pairs (`services/auth_service.py:43`) |
| `dict` | yes | `{"code": "x"}` | JSON-like data (`core/errors.py:54-55`) |
| `set` | yes | `{"a", "b"}` | test assertion (`tests/test_prescriptions.py:256`) |
| `None` | — | absence | `str \| None` everywhere |

**Mutable vs immutable** — whether an object can be changed in place. Mutable objects shared by two
names change for both.

### 2.2 Truthiness, comparisons, identity

Falsy: `None, False, 0, 0.0, '', [], {}, set()`. `==` compares values; `is` compares identity
(use `is None`). 📍 SQLAlchemy needs `.is_(None)` for SQL `IS NULL`
(`services/auth_service.py:61`) because Python's `is` cannot be overloaded.

### 2.3 Strings and f-strings

📍 `services/patient_service.py:88` `f"P-{db.scalar(_NEXT_CODE):05d}"` → `P-00042`
(`05d` = zero-padded 5-digit integer). 📍 `str.removeprefix` (3.9+):
`core/errors.py:84` strips Pydantic's `"Value error, "` prefix from messages.

### 2.4 Functions, arguments

```python
def list_users(db, params, *, q=None, role=None, is_active=None): ...
```

📍 `services/user_service.py:21-28`: the bare `*` makes `q`, `role`, `is_active`
**keyword-only** — callers must write `q=...` (`api/v1/users.py:24`), preventing argument-order bugs.

| Syntax | Meaning | 📍 |
|---|---|---|
| `*args` | extra positional args as a tuple | `def require_roles(*roles: UserRole)` (`api/deps.py:38`) |
| `**kwargs` | extra keyword args as a dict | `def _make(role=..., **kwargs)` (`tests/conftest.py:78`) |
| `f(**d)` | unpack dict into keyword args | `PatientListItem(**PatientOut.model_validate(p).model_dump(), …)` (`api/v1/patients.py:25`) |
| default values | evaluated **once** at definition | see pitfall below |

**Mutable default pitfall:** `def f(x=[])` shares one list across calls. 📍 The code avoids it:
`Field(default_factory=list)` (`schemas/prescription.py:86-88`) and SQLAlchemy `default=list`
(a callable, `models/patient.py:63`). Pydantic *copies* defaults, so
`patient_matches: list[PatientMatch] = []` (`schemas/prescription.py:74`) is also safe — but only
because it's Pydantic.

### 2.5 Control flow and comprehensions

**Comprehension** — compact syntax that builds a list/dict/set from an iterable.

📍 `core/config.py:48` `[o.strip() for o in value.split(",") if o.strip()]` — split CSV, trim,
drop blanks.
📍 Nested comprehension, `services/patient_service.py:128`:
`paths = [path for p in prescriptions for path in prescription_service.image_files(p)]` —
read left to right like nested `for` loops (flatten).
📍 Generator inside a comprehension, `services/prescription_service.py:91`:
`[s for s in (_text(v, 500) for v in values) if s][:50]` — clean each value once, keep non-empty,
cap at 50.
📍 Dict comprehension, `prescription_service.py:104`:
`**{k: _text(item.get(k), 255) for k in ("dosage", "frequency", "duration", "instructions")}`.

### 2.6 Modules and packages

A **module** is a `.py` file; a **package** is a folder of modules (with `__init__.py`).
`python -m app.cli` runs a module as a script (`backend/entrypoint.sh:4`). 📍 `app/cli.py:32-33`
`if __name__ == "__main__": main()` — run only when executed directly, not when imported.
📍 `app/models/__init__.py:1-16` imports every model so Alembic/relationships can see them and
declares `__all__` (the public names for `from x import *`).

---

## 3. Intermediate

### 3.1 Type hints

**Type hints** — annotations checked by tools (mypy, Pyright, IDEs) and *used at runtime* by
Pydantic/FastAPI/SQLAlchemy; plain Python ignores them.

| Hint | Meaning | 📍 |
|---|---|---|
| `str \| None` | optional (3.10+ union syntax) | `models/user.py:22` |
| `list[str]`, `dict[str, Any]` | built-in generics (3.9+) | `models/patient.py:63-65` |
| `Literal["access", "refresh"]` | exact values | `core/security.py:14` |
| `Annotated[str, AfterValidator(...)]` | type + metadata | `core/validators.py:23` |
| `Callable[[User], User]` | function type | `api/deps.py:38` |
| `Iterator[Session]` | generator yielding Sessions | `core/db.py:12` |
| `TypeVar("T")`, `Generic[T]` | generics | `schemas/common.py:6, 13` |
| `Self` | "this class" (3.11+) | `schemas/prescription.py:93` |
| `Mapped[int \| None]` | SQLAlchemy column type | `models/patient.py:38` |

### 3.2 Decorators

**Decorator** — a function that takes a function (or class) and returns a replacement; `@dec`
above a `def` means `f = dec(f)`.

```python
def logged(fn):
    def wrapper(*args, **kwargs):
        print("calling", fn.__name__)
        return fn(*args, **kwargs)
    return wrapper
```

In this project:

| Decorator | 📍 | Does |
|---|---|---|
| `@lru_cache` | `core/config.py:58` | memoise `get_settings()` → one `Settings` object |
| `@field_validator(...)` + `@classmethod` | `core/config.py:44-46` | Pydantic validator |
| `@model_validator(mode="after")` | `core/config.py:51`, `schemas/prescription.py:92` | whole-object validation |
| `@property` | `schemas/common.py:31` | `params.offset` computed attribute |
| `@dataclass` | `services/auth_service.py:26` | generates `__init__`, `__repr__`, `__eq__` |
| `@router.get(...)` | `api/v1/*.py` | registers a route (decorator **with arguments** = factory returning a decorator) |
| `@app.exception_handler(X)` | `core/errors.py:71` | registers a handler |
| `@pytest.fixture`, `@pytest.mark.parametrize` | `tests/*` | test machinery |

### 3.3 Closures and factories

📍 `api/deps.py:38-46`:

```python
def require_roles(*roles: UserRole) -> Callable[[User], User]:
    """Dependency factory: allow only the given roles."""
    def checker(user: CurrentUser) -> User:
        if user.role not in roles:      # `roles` captured from the enclosing call
            raise Forbidden()
        return user
    return checker
```

Each call (`require_roles(UserRole.ADMIN)`) returns a *new* `checker` remembering its `roles`.

📍 `tests/conftest.py:76-89` keeps a counter in a dict (`counter = {"n": 0}`) so the inner
function can mutate it; the alternative is `nonlocal n`.

### 3.4 Generators

**Generator** — a function using `yield`; calling it returns an iterator that runs lazily and
pauses at each `yield`.

📍 `core/db.py:12-14`:

```python
def get_db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session          # FastAPI injects this; code after yield runs after the response
```

FastAPI treats a generator dependency as **setup / teardown**: everything before `yield` runs before
the endpoint, the `with` block closes the session afterwards. pytest fixtures use the same shape
(`tests/conftest.py:36-47`).

### 3.5 Context managers

**Context manager** — an object with `__enter__`/`__exit__` used in `with`, guaranteeing cleanup even
on exceptions.

| 📍 | Resource |
|---|---|
| `with SessionLocal() as db:` (`app/cli.py:12`) | DB session closed |
| `with Image.open(io.BytesIO(data)) as img:` (`services/prescription_service.py:59`) | image file handle |
| `with pdf.table(...) as table:` (`services/pdf_service.py:125`) | table rendered on exit |
| `with eng.begin() as conn:` (`tests/conftest.py:40`) | transaction committed/rolled back |
| `contextlib.nullcontext(db)` (`tests/test_prescriptions.py:61`) | a do-nothing CM wrapping an existing session |

Write your own with `@contextlib.contextmanager` + `yield`.

### 3.6 Exceptions

📍 Custom hierarchy, `core/errors.py:14-51`:

```python
class AppError(Exception):
    def __init__(self, status_code, code, message, details=None):
        super().__init__(message)
        self.status_code = status_code; self.code = code; self.message = message; self.details = details

class NotFound(AppError):
    def __init__(self, what: str = "Resource") -> None:
        super().__init__(status.HTTP_404_NOT_FOUND, "not_found", f"{what} not found")
```

Services `raise NotFound("Patient")` without knowing about HTTP responses; one handler converts
all `AppError`s to JSON (`core/errors.py:71-75`).

📍 **Exception chaining**, `services/prescription_service.py:65-68`:
`raise BadRequest(...) from exc` — keeps the original error as `__cause__` for logs/tracebacks.
📍 Catching several types: `except (UnidentifiedImageError, OSError, Image.DecompressionBombError)`.

### 3.7 Dataclasses and enums

📍 `services/auth_service.py:26-32` `@dataclass class TokenPair:` — a typed record without
boilerplate. Constructed positionally at `:40`.
📍 `models/user.py:11-14` `class UserRole(enum.StrEnum)` (3.11+) — members are also `str`, so
`UserRole.ADMIN == "admin"` and they serialise to JSON naturally.

### 3.8 Useful built-ins seen in the code

| Built-in | 📍 |
|---|---|
| `zip(a, b, strict=True)` (3.10+) — error if lengths differ | `prescription_service.py:199` |
| `sorted(iterable, key=...)` | `patient_service.py:179` `key=lambda m: -len(m[1])` (most reasons first) |
| `dict.setdefault(k, default)` | `patient_service.py:145` |
| `filter(None, iterable)` | `pdf_service.py:85` drops empty parts |
| `any(...)` | `prescription_service.py:192` |
| slicing `s[:n]`, `lst[:50]` | `prescription_service.py:78, 91` |
| `pathlib.Path` `/` operator | `prescription_service.py:47` |
| `assert` | `prescription_service.py:315` (internal invariant) |

⚠️ `assert` statements are removed when Python runs with `-O`; don't use them for validation of user
input. Here `assert data.new_patient is not None` documents an invariant already enforced by
`PrescriptionSave._check` (`schemas/prescription.py:94-95`), which is acceptable.

---

## 4. Advanced

### 4.1 Iteration protocol

`for x in obj` calls `iter(obj)` then `next()` until `StopIteration`. Generators implement this
automatically.

### 4.2 Lambdas and module-level indirection for tests

📍 `services/prescription_service.py:146-147`:

```python
# Opens the session for background reads; tests swap it for their own.
new_session: Callable[[], Session] = lambda: db_module.SessionLocal()  # noqa: E731
```

A module attribute that tests can **monkeypatch** (`tests/test_prescriptions.py:61`). `noqa: E731`
silences the lint rule "don't assign lambdas" deliberately. Note `db_module.SessionLocal` is looked
up at call time (attribute access), not import time.

### 4.3 Circular imports

📍 `services/patient_service.py:124-125` imports `prescription_service` *inside* `delete()` because
`prescription_service` imports `patient_service` at module top (`prescription_service.py:29`).
Alternatives: move shared code to a third module, or import the module (not names) at top.

### 4.4 Async in Python

`async def` creates a **coroutine**; `await` yields control to the **event loop** (`asyncio`)
while waiting on I/O. One thread, many concurrent waits — great for I/O-bound servers.

```python
async def fetch_all(urls):
    async with httpx.AsyncClient() as c:
        return await asyncio.gather(*(c.get(u) for u in urls))
```

📍 This backend is **synchronous** (`def` endpoints, sync SQLAlchemy, sync Gemini client).
FastAPI runs sync endpoints in a thread pool, so blocking calls don't freeze the server. Only the
exception handlers are `async def` (`core/errors.py:72-107`) because they do no blocking I/O.

### 4.5 Virtual environments and dependencies

**Virtual environment** — an isolated Python install (`python -m venv .venv`) so projects don't share
packages. 📍 `.gitignore:5` ignores `.venv/`. In Docker the container *is* the isolation, so
`pip install` goes straight into the image (`backend/Dockerfile:9-10`).

📍 `requirements.txt` uses ranges (`fastapi>=0.115,<1.0`), `requirements-dev.txt:1` includes it
with `-r requirements.txt`. ⚠️ There is no lock file (e.g. `pip-tools`/`uv` lock), so two builds
months apart can get different versions.

---

## 5. Under the hood

| Topic | Detail |
|---|---|
| **CPython** | the reference interpreter: compiles to bytecode (`.pyc`, disabled here by `PYTHONDONTWRITEBYTECODE=1`, `Dockerfile:3`), executes in a VM loop |
| **Reference counting + cyclic GC** | objects freed when refcount hits 0; a cycle collector handles reference cycles |
| **GIL (Global Interpreter Lock)** | only one thread executes Python bytecode at a time; threads still help for I/O (the GIL is released while waiting). CPU-bound parallelism → `multiprocessing`. Python 3.13 adds an optional free-threaded build |
| **Name resolution (LEGB)** | Local → Enclosing → Global → Built-in |
| **Everything is an object** | functions are first-class (`COMMANDS = {"bootstrap-admin": bootstrap_admin}` in `app/cli.py:22`) |
| **`PYTHONUNBUFFERED=1`** | print/log output goes straight to Docker logs (`Dockerfile:4`) |

---

## 6. Comparisons

| X vs Y | Answer |
|---|---|
| list vs tuple | mutable vs immutable (hashable → dict keys) |
| list vs generator | all in memory vs lazy, one-pass |
| `==` vs `is` | equality vs identity |
| `@staticmethod` vs `@classmethod` | no implicit arg vs receives the class (`cls`) |
| dataclass vs Pydantic model | plain container vs validation/serialisation |
| threading vs multiprocessing vs asyncio | I/O concurrency with GIL vs true parallel CPU vs single-thread cooperative I/O |
| `deepcopy` vs `copy` | recursive vs one level |
| Python vs JavaScript | both dynamic; Python has `int` bigints, real threads (GIL), indentation syntax; JS has the event loop built into hosts |
| `requirements.txt` vs `pyproject.toml` + lock | loose list vs standard metadata + reproducible lock (Poetry/uv) |

---

## 7. Patterns & anti-patterns

- ✅ Small pure helpers (`_text`, `_date`, `_strings`, `prescription_service.py:74-107`) that make
  untrusted model output safe.
- ✅ Keyword-only arguments; custom exceptions; type hints everywhere.
- ❌ Bare `except:` (catches `KeyboardInterrupt`), mutable defaults, `from x import *`.
- ❌ Using `assert` for validation.

---

## 8. Security & performance

- Validate untrusted data at boundaries (Pydantic, Pillow decode).
- Never `eval`/`pickle` untrusted input.
- `re` patterns are anchored (`^…$`, `core/validators.py:8`) to avoid partial matches.
- Use generators for big data; avoid quadratic loops on large inputs.

---

## 9. Syntax cheat sheet

```python
x: int | None = None
def f(a: int, *args, key: str = "", **kw) -> list[str]: ...
[y for x in xs if x for y in x]      # nested comprehension
{k: v for k, v in d.items()}
with open(p) as fh: ...
try: ... except (A, B) as e: raise C() from e
@dataclass class P: a: int
class R(enum.StrEnum): A = "a"
lambda m: -len(m[1])
if __name__ == "__main__": main()
```

---

## 10. Why Python here + alternatives

Python has first-class libraries for every backend need here: FastAPI, SQLAlchemy, Pillow, fpdf2,
and Google's Gemini SDK. Alternatives: Node/TypeScript (one language across stack), Go (speed,
single binary), Java/Kotlin + Spring (enterprise). For an AI-adjacent CRUD app, Python is the
pragmatic choice.
