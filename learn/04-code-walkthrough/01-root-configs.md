# 01 — Root configuration files

## `README.md` (121 lines)

**Purpose:** the product description, quick start, configuration reference and conventions.
**Read by:** humans. **Links:** every module.

| Lines | What it says | Why it matters |
|---|---|---|
| 1-5 | Root Record = patient records for one Bangladeshi dental clinic, built around the paper prescription; staff-only; status: auth/roles/shell done, scanning is the main feature; appointments/recalls/billing/reports are placeholders | explains why `App.tsx:55-80` has `PlaceholderPage` routes |
| 7-15 | The 5-step workflow: Scan → Read (Gemini in background) → Review (dentist only saves) → Record → Share (PDF/WhatsApp) | maps to Traces 2, 3, 5 in `02-architecture.md` |
| 15 | "Nothing reaches a patient record until a dentist has checked it" | the human-in-the-loop rule |
| 17-39 | `docker compose up --build`; URLs; default admin login | see ⚠️ default password |
| 41-72 | env var tables (backend + frontend) | mirrors `core/config.py` and `vite.config.ts` |
| 43 | free-tier Gemini may use data; use a paid key for real patients | privacy |
| 74-88 | dev commands: pytest, alembic autogenerate/upgrade, typecheck, eslint, vitest | |
| 90-111 | folder architecture | `02-architecture.md` §2 |
| 113-121 | conventions: auth cookies + rotation, roles enforced in backend, error envelope, pagination, money in minor units, UTC timestamps shown in Asia/Dhaka, phone format | each is implemented and cited in the skill modules |

## `.gitignore` (21 lines)

```gitignore
# Python
__pycache__/        # bytecode caches
*.py[cod]           # .pyc .pyo .pyd
.pytest_cache/
.venv/              # virtual environment
.mypy_cache/
.ruff_cache/
# Node
node_modules/       # installed packages (reproducible from the lockfile)
dist/               # build output
# Env / data
.env                # secrets/config — never commit
backend/data/       # local upload storage if run outside Docker
*.log
# Editors
.vscode/
.idea/
.DS_Store
```

Why: only source and lockfiles belong in Git; anything generated or secret stays out.
→ Skill: `20-git-config.md`.

## `.gitattributes` (2 lines)

```gitattributes
* text=auto          # Git normalises text files to LF in the repo
*.sh text eol=lf     # shell scripts always checked out with LF
```

Without line 2, a Windows checkout could give `entrypoint.sh` CRLF endings, and `/bin/sh` inside
the Linux container would fail (`/bin/sh^M: bad interpreter`). → `17-docker-compose.md` §2.2.

## `docker-compose.yml` (57 lines)

| Lines | Code | Explanation |
|---|---|---|
| 1 | `name: rootrecord` | project name → container/volume prefixes |
| 4-5 | `db: image: postgres:16-alpine` | official Postgres 16 on Alpine (small) |
| 6-10 | `POSTGRES_USER/PASSWORD/DB`, `TZ: UTC` | first-start initialisation; server time zone UTC (app stores UTC) |
| 11-12 | `ports: "5432:5432"` | expose DB to the host (for psql/GUI tools) — ⚠️ don't in production |
| 13-14 | `pgdata:/var/lib/postgresql/data` | named volume → data survives `docker compose down` |
| 15-19 | healthcheck `pg_isready` every 3 s, 20 retries | lets dependants wait for a *ready* DB |
| 21-22 | `backend: build: ./backend` | build from `backend/Dockerfile` |
| 23-25 | `env_file: path: ./backend/.env, required: false` | load `.env` if present (newer Compose syntax) |
| 26-28 | `WATCHFILES_FORCE_POLLING: "true"` | make `uvicorn --reload` notice edits across Windows/macOS bind mounts |
| 29-31 | `depends_on: db: condition: service_healthy` | start backend only after healthcheck passes (migrations need the DB) |
| 32-33 | `8000:8000` | API + Swagger on the host |
| 34-36 | `./backend:/app` (bind mount) and `uploads:/data/uploads` (named volume) | live code reload; persistent photos |
| 38-42 | `frontend: build: ./frontend`, optional `.env` | |
| 43-46 | `VITE_PROXY_TARGET: http://backend:8000`, `VITE_USE_POLLING: "true"` | proxy to the backend's Compose DNS name; polling for HMR |
| 47-48 | `depends_on: - backend` | start order only (no health condition) |
| 49-50 | `5173:5173` | the app URL |
| 51-53 | `./frontend:/app` + `/app/node_modules` | bind-mount source but keep the container's Linux `node_modules` in an anonymous volume |
| 55-57 | `volumes: pgdata, uploads` | declare named volumes |

→ Skill: `17-docker-compose.md` §3.

## `.vscode/settings.json` (ignored by Git, present locally)

`"python.terminal.useEnvFile": true` — VS Code's Python extension loads `.env` into new terminals.
Personal editor setting; not part of the app.

## Q&A

**Q:** 🟢 Why does the backend wait for `service_healthy` but the frontend only for `backend`?

**A:** The backend runs migrations at start (`backend/entrypoint.sh:3`) and would crash if Postgres
isn't accepting connections, so it waits for `pg_isready` (`docker-compose.yml:15-19, 29-31`). The
frontend only proxies requests; if the backend isn't up yet, the first API calls fail and are retried
by the user/app, so start order is enough.

**Q:** 🟢 What would happen if you ran `docker compose down -v`?

**A:** Containers stop and are removed **and** the named volumes `pgdata` and `uploads` are deleted —
the entire database and all prescription photos are gone. Plain `down` keeps volumes.

**Q:** 🟡 Why is there an anonymous volume `/app/node_modules` in the frontend service?

**A:** `./frontend:/app` mounts your host folder over the image's `/app`, which would hide the
`node_modules` installed by `npm ci` in the image (and Windows-built native packages wouldn't run on
Linux anyway). Mounting an anonymous volume at `/app/node_modules` keeps the container's own copy.

**Q:** 🟡 Why `TZ: UTC` on the database?

**A:** The app stores instants as `timestamptz` in UTC and converts to Asia/Dhaka only for display
(`README.md:120`). Keeping the server in UTC avoids confusing defaults in `now()` output and logs.

**Q:** 🔴 Two things in this Compose file are unsafe for production — name them.

**A:** Postgres is published on the host with a trivial password (`docker-compose.yml:7-12`), and both
app services run development servers with bind mounts and reload (`--reload`, `npm run dev`). A
production setup keeps the DB on an internal network with strong secrets and runs built images
without source mounts.

**Q:** 🟢 What does `.gitattributes:2` prevent?

**A:** CRLF line endings in shell scripts. The entrypoint runs in Linux; a `\r` at the end of
`#!/bin/sh` breaks it.

**Q:** 🟡 Why is `.env` ignored but `.env.example` committed?

**A:** `.env` holds real secrets and machine-specific values; `.env.example` documents every variable
with safe placeholders so new developers know what to set (`backend/.env.example`).
