# 00 — Root Record: Course Overview

> This folder is a self-study course that uses **your own codebase** as the textbook.
> Everything here is read-only commentary: no source file was changed.

---

## 1. What the app does (for a non-technical person)

Root Record is a website for a single dental clinic in Bangladesh. The dentist keeps writing
prescriptions on paper as usual. An assistant takes a photo of each paper prescription with a
phone. The app sends the photo to Google's Gemini AI, which "reads" the handwriting and fills in
a digital form: patient name, ID, phone, visit date, diagnosis, treatment, medicines, advice and
the next visit date. A dentist then checks the form against the photo, fixes any mistakes, links
it to the right patient and saves it. Over time each patient gets a searchable visit history, and
any saved prescription can be downloaded or shared (e.g. to WhatsApp) as a clean typed PDF,
including Bangla text. Only clinic staff can log in, and what they can do depends on their role
(Admin, Dentist, Receptionist).

📍 Source: `README.md:1-15`.

---

## 2. Tech Stack Inventory

| Tool | Category | What it does in general | What it does here | Files where used | Interview importance |
|---|---|---|---|---|---|
| **JavaScript (ES2022)** | Language | The language browsers run | All frontend logic (compiled from TS) | `frontend/src/**` | High |
| **TypeScript 5.8** | Language | JavaScript + static types | Every frontend file; strict mode | `frontend/tsconfig*.json`, `frontend/src/**/*.ts(x)` | High |
| **React 18** | UI library | Builds UIs from components that re-render when state changes | All screens, forms, layout | `frontend/src/main.tsx`, `pages/`, `features/`, `components/` | High |
| **React Router 6** | Routing | Maps URLs to components in a single-page app | Routes, guards, URL search params | `frontend/src/App.tsx:34-86`, pages | Medium |
| **TanStack Query 5** | Server-state cache | Fetching, caching, refetching, mutations | Every API call, polling while reading | `frontend/src/features/*/hooks.ts` | Medium |
| **React Hook Form 7 + Zod 3** | Forms + validation | Performant forms; schema validation with type inference | Login, change password, edit patient, prescription review | `features/prescriptions/form.ts`, `pages/LoginPage.tsx` | Medium |
| **Tailwind CSS 4** | Styling | Utility-first CSS classes | All styling, theme tokens | `frontend/src/index.css`, every `.tsx` | Medium |
| **shadcn/ui + Radix UI** | Component kit | Copy-in accessible components built on headless Radix primitives | Button, Dialog, Dropdown, Tooltip, Sheet… | `frontend/src/components/ui/*` | Medium |
| **class-variance-authority, clsx, tailwind-merge** | Styling helpers | Variant-based class names; conditional & de-duplicated classes | `cn()` helper, button/badge variants | `lib/utils.ts`, `ui/button.tsx`, `ui/badge.tsx` | Low |
| **cmdk, sonner, lucide-react** | UI libs | Command palette; toasts; icons | Ctrl+K palette, notifications, icons | `ui/command.tsx`, `ui/sonner.tsx` | Low |
| **Browser APIs** (fetch, FormData, Canvas, Web Share, Intl, URL) | Platform | Built-in browser features | HTTP calls, photo shrinking, sharing PDFs, date/money formatting | `api/client.ts`, `lib/image.ts`, `SharePrescription.tsx`, `lib/format.ts` | Low |
| **Node.js 22 / npm** | Runtime + package manager | Runs JS outside the browser; installs packages | Runs Vite dev server, build, tests | `frontend/package.json`, `frontend/Dockerfile` | Medium |
| **Vite 6** | Build tool / dev server | Fast dev server with HMR; production bundler (Rollup) | Dev server + `/api` proxy, build chunks | `frontend/vite.config.ts` | Medium |
| **ESLint 9 + typescript-eslint** | Linter | Finds bugs/style issues statically | Strict TS rules, hooks rules | `frontend/eslint.config.js` | Low |
| **Vitest 3** | Test runner (JS) | Jest-compatible tests powered by Vite | Formatting & form-conversion tests | `lib/format.test.ts`, `features/prescriptions/form.test.ts` | Medium |
| **Python 3.12** | Language | General-purpose language | Entire backend | `backend/app/**` | High |
| **FastAPI** | Web framework | Async-capable Python API framework with DI + OpenAPI | REST API, auth cookies, uploads, background tasks | `backend/app/main.py`, `backend/app/api/**` | High |
| **Uvicorn** | ASGI server | Runs ASGI apps (FastAPI) | Serves the API (`--reload` in dev) | `backend/Dockerfile:17` | Medium |
| **Pydantic v2 + pydantic-settings** | Validation | Data validation/serialization from type hints; env-based settings | Request/response schemas, `Settings` | `backend/app/schemas/*`, `core/config.py` | Medium |
| **PostgreSQL 16** | Database | Relational database (ACID, SQL) | All data; `pg_trgm` fuzzy search; JSONB; sequence | `docker-compose.yml:4-19`, migrations | High |
| **SQLAlchemy 2.0** | ORM | Maps Python classes to tables; query builder | Models, sessions, queries | `backend/app/models/*`, `services/*` | High |
| **Alembic** | Migrations | Versioned schema changes | 4 migrations | `backend/alembic/**` | High (with ORM) |
| **psycopg 3** | DB driver | Talks PostgreSQL wire protocol | Used by SQLAlchemy (`postgresql+psycopg://`) | `requirements.txt:5`, `core/config.py:15` | Low |
| **PyJWT** | Auth | Encode/verify JSON Web Tokens | Access + refresh tokens | `core/security.py` | High (auth topic) |
| **argon2-cffi** | Security | Memory-hard password hashing | Password hashes | `core/security.py:12-25` | High (auth topic) |
| **google-genai (Gemini)** | AI / LLM API | Calls Google's Gemini models | Reads prescription photos into JSON | `services/extraction_service.py` | Medium |
| **httpx** | HTTP client | Sync/async HTTP | Used by google-genai (errors caught) + TestClient | `extraction_service.py:11`, tests | Low |
| **Pillow** | Imaging | Image decoding/processing | Validate, rotate, shrink, re-encode uploads | `services/prescription_service.py:56-68` | Low |
| **fpdf2 + uharfbuzz** | PDF generation | Programmatic PDF creation; text shaping | Typed prescription PDF with Bangla | `services/pdf_service.py` | Low |
| **pytest + FastAPI TestClient** | Testing | Python test framework | API tests against a real Postgres, rolled back per test | `backend/tests/*` | Medium |
| **Ruff** (configured) | Linter | Fast Python linter/formatter | Config only (`line-length=100`) | `backend/pyproject.toml:8-10` | Low |
| **Docker + Docker Compose** | Containers | Package apps + dependencies; orchestrate multi-container apps | db + backend + frontend dev stack | `docker-compose.yml`, `*/Dockerfile` | Medium |
| **Git** | Version control | Tracks history | 2 commits on `master` | `.gitignore`, `.gitattributes` | Low (but always asked) |
| **REST / HTTP / Cookies / CORS / JWT** | Web concepts | How browser and server talk securely | Whole API contract, auth design | `api/v1/*`, `api/client.ts` | High |

---

## 3. Folder tree (one line each)

```
RootRecord/
├── README.md                     Product description, quick start, conventions
├── docker-compose.yml            3 services: Postgres db, FastAPI backend, Vite frontend
├── .gitignore / .gitattributes   What Git ignores; LF line endings for .sh files
├── backend/                      Python API
│   ├── Dockerfile                python:3.12-slim image, runs entrypoint then uvicorn --reload
│   ├── entrypoint.sh             Runs migrations + bootstraps admin, then starts server
│   ├── requirements*.txt         Runtime and dev (pytest, httpx) dependencies
│   ├── pyproject.toml            pytest + ruff config
│   ├── alembic.ini               Alembic config (DB URL comes from app settings)
│   ├── .env.example              All backend env vars with safe defaults
│   ├── alembic/                  Migration environment + 4 versioned migrations
│   │   ├── env.py                Connects Alembic to SQLAlchemy metadata + settings URL
│   │   └── versions/0001…0004    users/tokens → patients/prescriptions → multi-page → background reading
│   ├── app/
│   │   ├── main.py               create_app(): FastAPI app, CORS, error handlers, router
│   │   ├── cli.py                `python -m app.cli bootstrap-admin`
│   │   ├── core/                 config, db engine/session, errors, security (JWT/argon2), time, validators
│   │   ├── models/               SQLAlchemy models: User, RefreshToken, Patient, Prescription
│   │   ├── schemas/              Pydantic request/response models, Page[T]
│   │   ├── api/deps.py           Dependencies: DB session, current user, role checks
│   │   ├── api/v1/               Routers: auth, users, patients, prescriptions (+ /health)
│   │   ├── services/             Business logic: auth, user, patient, prescription, extraction (Gemini), pdf
│   │   └── assets/fonts/         Noto Sans + Noto Sans Bengali (PDF fonts, OFL licence)
│   └── tests/                    conftest (DB per test-session, rollback per test) + 3 test modules
└── frontend/                     React single-page app
    ├── Dockerfile                node:22-alpine, runs `npm run dev`
    ├── package.json              Scripts + dependencies
    ├── vite.config.ts            Plugins, `@` alias, /api proxy, chunking, vitest config
    ├── tsconfig*.json            TypeScript project references (app + node)
    ├── eslint.config.js          Flat ESLint config
    ├── components.json           shadcn/ui generator config
    ├── index.html                HTML shell that loads /src/main.tsx
    └── src/
        ├── main.tsx              Mounts <App/> in StrictMode
        ├── App.tsx               QueryClient, router tree, session-expired handler
        ├── index.css             Tailwind v4 import + design tokens
        ├── api/                  fetch client (cookies, silent refresh) + typed endpoint modules
        ├── features/             auth, patients, prescriptions: hooks, forms, feature components
        ├── components/           ui/ (shadcn), layout/ (shell, sidebar, search, user menu), common/
        ├── pages/                Route screens: Login, Dashboard, Scan, Prescriptions, Review, Patients, PatientDetail…
        ├── lib/                  format (৳, dates in Asia/Dhaka), phone, image, permissions, utils
        └── i18n/                 All UI strings (en.ts) + `t` export
```

---

## 4. Course outline and reading order

Read **foundations first**, then the frameworks built on them, then the project.

| Step | Read | Why this order |
|---|---|---|
| 1 | `01-skills/01-javascript.md` | Everything on the frontend is JS underneath |
| 2 | `01-skills/02-typescript.md` | Types on top of JS |
| 3 | `01-skills/08-browser-apis.md` | fetch, FormData, Canvas, Intl used directly |
| 4 | `01-skills/09-node-npm-vite.md` | How the frontend is installed, run and built |
| 5 | `01-skills/03-react.md` | Components, hooks, rendering |
| 6 | `01-skills/04-react-router.md` | URLs → screens |
| 7 | `01-skills/05-tanstack-query.md` | Talking to the API from React |
| 8 | `01-skills/06-react-hook-form-zod.md` | Forms and validation |
| 9 | `01-skills/07-tailwind-shadcn-radix.md` | Styling & accessible components |
| 10 | `01-skills/10-python.md` | Backend language |
| 11 | `01-skills/15-http-rest-auth-security.md` | HTTP, REST, cookies, JWT, CORS — needed before FastAPI |
| 12 | `01-skills/12-pydantic.md` | Validation layer FastAPI relies on |
| 13 | `01-skills/11-fastapi.md` | The API framework |
| 14 | `01-skills/13-sql-postgresql.md` | The database |
| 15 | `01-skills/14-sqlalchemy-alembic.md` | ORM + migrations |
| 16 | `01-skills/18-llm-gemini.md` | The AI reading step |
| 17 | `01-skills/19-pillow-fpdf2.md` | Images in, PDFs out |
| 18 | `01-skills/16-testing-pytest-vitest.md` | How the code is tested |
| 19 | `01-skills/17-docker-compose.md` | How it all runs together |
| 20 | `01-skills/20-git-config.md` | Git workflow and configuration |
| 21 | `02-architecture.md` → `03-decision-log.md` | The big picture and the "why" |
| 22 | `04-code-walkthrough/` (in numeric order) | Every file, line by line |
| 23 | `05-qa/*` | Drill for interviews (do these repeatedly) |
| 24 | `05-qa/project-interview-kit.md` | Scripts for talking about the project |
| — | `06-glossary.md`, `07-cheatsheets.md` | Reference while reading anything |

PDF versions of everything are in `learn/pdf/`.

---

## 5. Assumptions I made

1. **"One walkthrough file per source module"** — I grouped files by module (e.g. all of
   `components/ui/*` in one file, all four migrations in one file), giving 31 walkthrough files that
   together cover all 135 tracked files. Tiny files (`__init__.py`, fonts) are described, not
   dissected.
2. **Electron, Tauri, Vue, Django etc.** are *not* used in this repo. They appear only in
   comparison tables, never as modules.
3. **Technology grouping**: Alembic is taught with SQLAlchemy; Uvicorn/ASGI with FastAPI;
   argon2/PyJWT/CORS/cookies in the HTTP-REST-Auth-Security module; shadcn/Radix/cva/clsx with
   Tailwind; Vite/ESLint/npm with Node; pytest and Vitest together.
4. **Importance levels** (drive the Q&A minimums): High = JavaScript, TypeScript, React, Python,
   FastAPI, SQL/PostgreSQL, SQLAlchemy/Alembic, HTTP/REST/Auth/Security. Medium = React Router,
   TanStack Query, React Hook Form + Zod, Tailwind/shadcn/Radix, Node/npm/Vite, Pydantic, Testing,
   Docker, LLM/Gemini. Low = Browser APIs, Pillow/fpdf2, Git/config.
5. **Secrets**: `.env.example` only holds placeholders/dev defaults; there is no real `.env` in
   Git. The README's default admin password is a documented dev default, quoted as such.
6. **Model name** `gemini-3.6-flash` (`backend/app/core/config.py:33`) is taken as configured; I
   did not verify it against Google's current model list.
7. **Line numbers** refer to the files as committed at `e337cc4` (2026-10-31). If you edit code,
   citations may drift.
8. I did not run the app or the tests; behaviour descriptions come from reading the code and the
   tests that assert it.
9. `frontend/src/i18n/en.ts` is ~270 lines of UI strings; it is explained structurally (shape and
   typing trick), not string by string.
