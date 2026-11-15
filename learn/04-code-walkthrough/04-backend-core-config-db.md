# 04 — `app/core/config.py` and `app/core/db.py`

## `backend/app/core/config.py` (60 lines)

**Purpose:** typed, validated application settings from environment variables / `.env`.
**Called by:** almost everything via `get_settings()` (`main.py:12`, `db.py:8`, `security.py:29`,
`auth.py:19`, `prescription_service.py:42`, `extraction_service.py:141`, `pdf_service.py:76`,
`alembic/env.py:14`, `tests/conftest.py:37`, `cli.py:11`).

```python
1  from functools import lru_cache
2  from typing import Annotated, Literal
4  from pydantic import field_validator, model_validator
5  from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict
7  DEV_JWT_SECRET = "dev-only-insecure-secret-change-me"
```
Line 7: a named constant for the dev secret so the production check (line 53) can compare to it.

```python
10 class Settings(BaseSettings):
11     model_config = SettingsConfigDict(env_file=".env", extra="ignore")
13     environment: Literal["development", "test", "production"] = "development"
```
- 10: `BaseSettings` reads env vars matching field names (case-insensitive).
- 11: also read `.env` from the **current working directory** (`/app` in Docker); ignore unrelated
  variables.
- 13: only three legal values — a typo like `prod` fails at startup.

```python
15     database_url: str = "postgresql+psycopg://rootrecord:rootrecord@db:5432/rootrecord"
16     test_database_url: str = (
17         "postgresql+psycopg://rootrecord:rootrecord@db:5432/rootrecord_test"
18     )
```
SQLAlchemy URL format `dialect+driver://user:password@host:port/database`; `db` is the Compose
service name.

```python
20     jwt_secret: str = DEV_JWT_SECRET
21     jwt_algorithm: str = "HS256"
22     access_token_minutes: int = 15
23     refresh_token_days: int = 7
24     cookie_secure: bool = False
```
Auth settings. Pydantic converts `"15"` → `15`, `"true"` → `True`.

```python
26     cors_origins: Annotated[list[str], NoDecode] = []
27     storage_dir: str = "/data/uploads"
28     max_upload_mb: int = 15
```
- 26: `NoDecode` stops pydantic-settings from JSON-decoding the env string; the `before` validator
  (lines 44-49) splits commas instead. `= []` default is safe in Pydantic (defaults are copied).
- 27-28: upload storage path (Docker volume) and per-photo size limit.

```python
32     gemini_api_key: str | None = None
33     gemini_model: str = "gemini-3.6-flash"
36     clinic_name: str = "Dental Clinic"
37     clinic_address: str | None = None
38     clinic_phone: str | None = None
40     bootstrap_admin_email: str = "admin@rootrecord.app"
41     bootstrap_admin_password: str = "Admin@12345"
42     bootstrap_admin_name: str = "Clinic Admin"
```
Comments on 30-31 and 35 explain intent: without a key, scans are still saved; clinic fields head the
PDF.

```python
44     @field_validator("cors_origins", mode="before")
45     @classmethod
46     def _split_origins(cls, value: object) -> object:
47         if isinstance(value, str):
48             return [o.strip() for o in value.split(",") if o.strip()]
49         return value
```
`mode="before"` receives the raw value; a string `"http://a, http://b"` becomes a clean list; other
inputs (an actual list) pass through.

```python
51     @model_validator(mode="after")
52     def _require_real_secret_in_production(self) -> "Settings":
53         if self.environment == "production" and self.jwt_secret == DEV_JWT_SECRET:
54             raise ValueError("JWT_SECRET must be set in production")
55         return self
```
Fail-fast guard: anyone could forge tokens with the public dev secret, so production refuses to start.

```python
58 @lru_cache
59 def get_settings() -> Settings:
60     return Settings()
```
Parse env once per process and reuse (also makes `get_settings` usable as a FastAPI dependency and
easy to override with `get_settings.cache_clear()` in tests).

→ Skill: `12-pydantic.md` §3.5, `20-git-config.md` §3.

## `backend/app/core/db.py` (14 lines)

**Purpose:** create the SQLAlchemy engine and session factory; provide `get_db` dependency.
**Called by:** `api/deps.py:10,18`, `cli.py:6`, `prescription_service.py:14,147` (`db_module.SessionLocal`),
tests override `get_db`.

```python
1  from collections.abc import Iterator
3  from sqlalchemy import create_engine
4  from sqlalchemy.orm import Session, sessionmaker
6  from app.core.config import get_settings

8  engine = create_engine(get_settings().database_url, pool_pre_ping=True)
9  SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

12 def get_db() -> Iterator[Session]:
13     with SessionLocal() as session:
14         yield session
```

- 8: one engine per process = one connection pool. Created at **import time** — importing `app.core.db`
  needs a DB URL (not a connection; engines connect lazily). `pool_pre_ping` survives DB restarts.
- 9: `autoflush=False` — queries don't implicitly flush pending objects (more predictable; services
  call `flush()` explicitly where needed, e.g. `patient_service.py:105`). `expire_on_commit=False` —
  objects keep their loaded values after commit so routers can serialise them.
- 12-14: generator dependency; the `with` closes the session (returning the connection to the pool
  and rolling back any uncommitted transaction) after the response.

→ Skill: `14-sqlalchemy-alembic.md` §2.1.

## Q&A

**Q:** 🟢 How does `JWT_SECRET=abc` in the environment reach `settings.jwt_secret`?

**A:** `BaseSettings` maps env var names to field names case-insensitively, so `JWT_SECRET` fills
`jwt_secret`; env vars beat `.env` values, which beat defaults.

**Q:** 🟡 Why is `get_settings` wrapped in `lru_cache`?

**A:** Constructing `Settings` reads the environment and the `.env` file and validates everything.
Caching makes it a cheap singleton, so it can be called anywhere (`security.py:29` calls it per token).

**Q:** 🟡 Why does `cors_origins` need `NoDecode`?

**A:** For complex types like `list[str]`, pydantic-settings expects JSON (`["a","b"]`) in the env var.
`NoDecode` passes the raw string to the `before` validator, which splits a friendlier comma-separated
value (`config.py:26, 44-49`).

**Q:** 🔴 What happens if `ENVIRONMENT=production` and `JWT_SECRET` isn't set?

**A:** The model validator raises `ValueError` during `Settings()` construction → the import of
`app.core.db` fails → the app (and even `alembic upgrade`) won't start. Fail-fast instead of running
with a forgeable secret.

**Q:** 🟡 What does `expire_on_commit=False` change, and what's the risk?

**A:** After `commit()`, attributes aren't expired, so accessing them doesn't trigger a reload query and
works after the session closes. The risk is reading stale data if another transaction changed the row
— acceptable for request-scoped sessions; the background task explicitly `refresh`es when it matters
(`prescription_service.py:167`).

**Q:** 🟢 Why is `get_db` a generator instead of returning a session?

**A:** So FastAPI can run cleanup after the response: code after `yield` (here, the `with` exit) closes
the session even if the endpoint raised.

**Q:** 🔴 Is creating the engine at import time a problem?

**A:** It couples import to configuration (tests can't change the URL after import), which is why tests
override `get_db` rather than the engine and pass their URL to Alembic separately. A lazily created
engine (in a function or lifespan) would be more flexible.
