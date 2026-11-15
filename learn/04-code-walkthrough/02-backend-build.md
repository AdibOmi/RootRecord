# 02 — Backend build & tooling files

**Purpose:** define how the Python backend is installed, configured, started and linted.
**Called by:** Docker Compose (`docker-compose.yml:22`), developers.

## `backend/Dockerfile` (17 lines)

| Line | Code | Explanation |
|---|---|---|
| 1 | `FROM python:3.12-slim` | Debian-slim base with Python 3.12 (glibc → prebuilt wheels for Pillow/psycopg work) |
| 3 | `PYTHONDONTWRITEBYTECODE=1` | don't write `.pyc` files (they'd litter the bind-mounted source) |
| 4 | `PYTHONUNBUFFERED=1` | stdout unbuffered → logs appear immediately in `docker compose logs` |
| 5 | `PIP_NO_CACHE_DIR=1` | no pip cache in the image → smaller |
| 7 | `WORKDIR /app` | all following paths relative to `/app` |
| 9 | `COPY requirements.txt requirements-dev.txt ./` | copy only dependency manifests first |
| 10 | `RUN pip install -r requirements-dev.txt` | install runtime + dev deps; this layer is cached until manifests change |
| 12 | `COPY . .` | copy the source (overridden by the bind mount in Compose) |
| 13 | `RUN chmod +x /app/entrypoint.sh` | make the script executable |
| 15 | `EXPOSE 8000` | documents the port |
| 16 | `ENTRYPOINT ["/app/entrypoint.sh"]` | exec-form entrypoint: migrations + bootstrap first |
| 17 | `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]` | default command passed to the entrypoint; `0.0.0.0` listens on all interfaces (required in containers); `--reload` = dev only |

⚠️ Dev image: installs pytest/httpx, runs as root, uses `--reload`. → `17-docker-compose.md` §4.1.

## `backend/entrypoint.sh` (5 lines)

```sh
#!/bin/sh                              # POSIX shell (slim image has sh, not necessarily bash)
set -e                                 # stop if any command fails (don't start on a failed migration)
alembic upgrade head                   # apply migrations 0001…0004
python -m app.cli bootstrap-admin      # create first admin if none (app/cli.py)
exec "$@"                              # replace shell with CMD → uvicorn gets PID 1 and signals
```

## `backend/.dockerignore` (5 lines)

`__pycache__`, `.pytest_cache`, `.venv`, `.env`, `data` — not sent to the Docker build context; keeps
secrets (`.env`) out of the image.

## `backend/requirements.txt` (17 lines)

| Package | Range | Role |
|---|---|---|
| `fastapi` | `>=0.115,<1.0` | web framework |
| `uvicorn[standard]` | `>=0.30` | ASGI server; `[standard]` extra adds uvloop, httptools, watchfiles (`--reload`) |
| `sqlalchemy` | `>=2.0.35,<2.1` | ORM (pinned to 2.0.x API) |
| `alembic` | `>=1.13` | migrations |
| `psycopg[binary]` | `>=3.2` | Postgres driver v3 with bundled libpq |
| `pydantic` | `>=2.9,<3` | validation |
| `pydantic-settings` | `>=2.5` | env settings |
| `email-validator` | `>=2.2` | required by `EmailStr` |
| `pyjwt` | `>=2.9` | JWT |
| `argon2-cffi` | `>=23.1` | password hashing |
| `python-multipart` | `>=0.0.12` | parses multipart form uploads (`UploadFile`) |
| `tzdata` | `>=2024.1` | IANA time-zone database for `zoneinfo` (slim images may lack it) |
| `google-genai` | `>=2.33,<3` | Gemini SDK |
| `pillow` | `>=11.0` | images |
| `fpdf2` | `>=2.8,<3` | PDFs |
| `uharfbuzz` | `>=0.39` | text shaping for Bangla in PDFs (comment line 16) |

⚠️ Ranges, not pins; no lockfile → builds can drift. Use `uv lock` / `pip-compile`.

## `backend/requirements-dev.txt` (3 lines)

`-r requirements.txt` (include runtime deps), `pytest>=8.3`, `httpx>=0.27` (needed by FastAPI's
`TestClient`).

## `backend/pyproject.toml` (10 lines)

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]                         # where pytest looks
filterwarnings = [
    # Starlette nudges towards httpx2; FastAPI's TestClient still ships on httpx.
    "ignore:Using `httpx` with `starlette.testclient` is deprecated",
]
[tool.ruff]
line-length = 100                             # lint/format line length
target-version = "py312"                      # allow 3.12 syntax
```

No `[project]` table — the backend isn't packaged; dependencies live in requirements files.

## `backend/.env.example` (35 lines)

Groups: Database (`DATABASE_URL`, `TEST_DATABASE_URL`), Auth (`JWT_SECRET` with generation command
on line 7, token lifetimes, `COOKIE_SECURE`), App (`ENVIRONMENT`, `CORS_ORIGINS`, `STORAGE_DIR`,
`MAX_UPLOAD_MB`), Gemini (`GEMINI_API_KEY` empty, `GEMINI_MODEL`), clinic PDF header, bootstrap admin.
Each maps 1:1 to a `Settings` field (`app/core/config.py:13-42`). Values shown are dev defaults /
placeholders (secrets redacted by design: the key is empty and the JWT secret is a placeholder).

## `backend/alembic.ini` (40 lines)

| Lines | Meaning |
|---|---|
| 2 | `script_location = alembic` — migration environment folder |
| 3 | `file_template = %%(year)d%%(month).2d%%(day).2d_%%(rev)s_%%(slug)s` — date-prefixed file names (`%%` escapes `%` in INI) |
| 4 | `prepend_sys_path = .` — add `backend/` to `sys.path` so `import app` works in `env.py` |
| 5 | `path_separator = os` — newer Alembic setting for path lists |
| 6 | comment: DB URL comes from app settings, not the INI (no secrets in config files) |
| 8-40 | standard logging config: root WARNING, sqlalchemy.engine WARNING (no SQL echo), alembic INFO, console handler to stderr |

## Q&A

**Q:** 🟢 Why copy the requirements files before the rest of the source in the Dockerfile?

**A:** Docker caches each layer. Installing dependencies only depends on the requirements files, so
changing Python code doesn't invalidate the slow `pip install` layer (`backend/Dockerfile:9-12`).

**Q:** 🟢 What does `exec "$@"` do in `entrypoint.sh`?

**A:** It replaces the shell process with the command passed as arguments (the Dockerfile `CMD`,
i.e. uvicorn). Uvicorn becomes PID 1 and receives `SIGTERM` on `docker stop`, so it shuts down
gracefully instead of being killed after a timeout.

**Q:** 🟡 Why `set -e`?

**A:** If `alembic upgrade head` fails, the script exits immediately and the container stops, rather
than starting the API against a half-migrated schema.

**Q:** 🟡 Why is `tzdata` a dependency?

**A:** `zoneinfo.ZoneInfo("Asia/Dhaka")` (`app/core/time.py:6`) needs the IANA tz database. Minimal
images (and Windows) may not have system tz data; the `tzdata` package provides it.

**Q:** 🟡 What does `python-multipart` do, and what happens without it?

**A:** It parses `multipart/form-data` bodies. FastAPI raises an error at startup when a route
declares `File()`/`UploadFile` parameters and the package is missing.

**Q:** 🔴 What's risky about `>=` version ranges with no lockfile?

**A:** Two builds at different times can install different versions (e.g. a new `google-genai` major
within `<3` that changes behaviour, or any version of uvicorn ≥0.30). Bugs appear without code
changes. A lockfile (uv/pip-tools/Poetry) pins the full tree; ranges stay in the manifest.

**Q:** 🟢 Why does `alembic.ini` not contain the database URL?

**A:** To avoid duplicating configuration and committing credentials; `alembic/env.py:14-15` reads it
from the same `Settings` the app uses (or a URL supplied by tests).
