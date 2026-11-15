# 03 — `app/main.py`, `app/cli.py`, package `__init__` files

## `backend/app/main.py` (35 lines)

**Purpose:** build the FastAPI application. **Called by:** Uvicorn (`app.main:app`,
`Dockerfile:17`), tests (`tests/conftest.py:17`). **Calls:** `get_settings`, `CORSMiddleware`,
`register_error_handlers`, `api_router`.

```python
1  import logging
3  from fastapi import FastAPI
4  from fastapi.middleware.cors import CORSMiddleware
6  from app.api.v1.router import api_router
7  from app.core.config import get_settings
8  from app.core.errors import register_error_handlers
```
Imports: stdlib first, third-party, then local — the isort convention (Ruff enforces it).

```python
11 def create_app() -> FastAPI:
12     settings = get_settings()
13     logging.basicConfig(level=logging.INFO)
```
- 11: app factory function, typed return.
- 12: cached settings (`core/config.py:58-60`).
- 13: configure the root logger once so `logger.info/warning/exception` from `rootrecord` loggers
  appear in container logs.

```python
15     app = FastAPI(
16         title="Root Record API",
17         version="0.1.0",
18         description="Patient management for a dental clinic.",
19         docs_url="/docs",
20         openapi_url="/openapi.json",
21     )
```
Metadata shown in Swagger UI; docs/openapi URLs set explicitly (defaults would be the same). Note the
docs are at `/docs`, outside `/api` — so through the Vite proxy (`/api` only) they're reachable at
port 8000 directly (`README.md:28`).

```python
22     if settings.cors_origins:
23         app.add_middleware(
24             CORSMiddleware,
25             allow_origins=settings.cors_origins,
26             allow_credentials=True,
27             allow_methods=["*"],
28             allow_headers=["*"],
29         )
```
Conditional CORS: only if origins are configured (frontend not proxied). `allow_credentials=True`
lets cookies flow cross-origin — legal only with explicit origins (which `cors_origins` is).

```python
30     register_error_handlers(app)
31     app.include_router(api_router)
32     return app
35 app = create_app()
```
- 30: install the four exception handlers (`core/errors.py:70-107`).
- 31: mount every `/api/v1` route.
- 35: module-level instance for Uvicorn.

→ Skill: `11-fastapi.md` §2.1, §3.8.

## `backend/app/cli.py` (33 lines)

**Purpose:** tiny management CLI. **Called by:** `entrypoint.sh:4` (`python -m app.cli
bootstrap-admin`). **Calls:** `ensure_bootstrap_admin` (`services/user_service.py:110-122`).

```python
1  """Management commands: `python -m app.cli <command>`."""
3  import sys
5  from app.core.config import get_settings
6  from app.core.db import SessionLocal
7  from app.services.user_service import ensure_bootstrap_admin

10 def bootstrap_admin() -> None:
11     s = get_settings()
12     with SessionLocal() as db:                       # session closed automatically
13         user = ensure_bootstrap_admin(
14             db, s.bootstrap_admin_email, s.bootstrap_admin_password, s.bootstrap_admin_name
15         )
16     if user:
17         print(f"[bootstrap] Created admin account: {user.email}")
18     else:
19         print("[bootstrap] Admin account already exists, skipping.")

22 COMMANDS = {"bootstrap-admin": bootstrap_admin}      # name → function (functions are values)

25 def main() -> None:
26     if len(sys.argv) != 2 or sys.argv[1] not in COMMANDS:
27         print(f"Usage: python -m app.cli [{' | '.join(COMMANDS)}]")
28         sys.exit(1)                                  # non-zero exit = failure for set -e
29     COMMANDS[sys.argv[1]]()

32 if __name__ == "__main__":
33     main()
```

- Line 16-19 run *after* the `with` block — `user.email` still works because the session uses
  `expire_on_commit=False` (`core/db.py:9`).
- The command is **idempotent**: safe to run on every container start.
- Alternatives: Typer/Click for richer CLIs.

→ Skill: `10-python.md` §2.6.

## `__init__.py` files

`app/__init__.py`, `app/api/__init__.py`, `app/api/v1/__init__.py`, `app/core/__init__.py`,
`app/schemas/__init__.py`, `app/services/__init__.py`, `tests/__init__.py` are **empty** — they mark
directories as regular packages so `from app.services import auth_service` and
`from tests.conftest import login` (`tests/test_auth.py:6`) work.

`app/models/__init__.py` is **not** empty: it imports every model and lists them in `__all__`
(lines 3-16) because SQLAlchemy relationships refer to classes by name (`"Prescription"`) and Alembic's
`target_metadata` (`alembic/env.py:17`) only knows tables whose model modules were imported.

## Q&A

**Q:** 🟢 What is `app = create_app()` for if there is a factory?

**A:** Uvicorn needs an importable ASGI app object (`app.main:app`). The factory keeps construction in
one function; the module-level variable exposes one instance.

**Q:** 🟡 Why is CORS conditional?

**A:** In the standard setup the browser talks to the Vite server, which proxies `/api`, so requests
are same-origin and CORS headers are unnecessary. Adding CORS only when `CORS_ORIGINS` is set avoids
accidentally allowing other origins with credentials (`main.py:22-29`).

**Q:** 🟡 What's the order of middleware vs exception handlers vs routers here, and does it matter?

**A:** Middleware is added first, then handlers, then routes; FastAPI wraps the app so CORS runs on
every response, including error responses produced by the handlers. Registration order of handlers
vs routers doesn't matter; handlers are looked up by exception type.

**Q:** 🟢 Why is `bootstrap-admin` safe to run on every start?

**A:** `ensure_bootstrap_admin` first checks whether any admin exists and returns `None` if so
(`services/user_service.py:112-113`).

**Q:** 🔴 Two replicas start at the same time with an empty DB. What can happen in bootstrap?

**A:** Both check "no admin", both insert the same email; one succeeds and the other hits the unique
constraint on `users.email` → `IntegrityError`, `set -e` stops that container. Running bootstrap
(and migrations) as a one-off job avoids the race.

**Q:** 🟢 Why does `app/models/__init__.py` import all models?

**A:** So `Base.metadata` contains every table for Alembic autogenerate and so string references in
relationships resolve.
