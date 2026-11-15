# 03 — Decision Log

How to read: each row is a decision visible in the code, the most likely reason, what else could
have been done, the trade-off, and whether a senior engineer would keep it.

## Architecture & infrastructure

| # | Decision | Where | Likely reason | Alternatives | Trade-offs | Would a senior keep it? |
|---|---|---|---|---|---|---|
| 1 | SPA (React) + separate JSON API (FastAPI) | `frontend/`, `backend/` | camera capture, polling, rich forms; Python for AI/PDF libs | Django templates + HTMX; Next.js full-stack; React Native app | two languages, duplicated validation/types vs best tool per side | **Yes** — fits the UX; add OpenAPI codegen to cut duplication |
| 2 | Docker Compose for the whole dev stack | `docker-compose.yml` | one-command setup on Windows/macOS | local installs; devcontainers | Docker Desktop needed; polling for file watching | **Yes** for dev; add a separate prod setup |
| 3 | Dev-mode images (`--reload`, Vite dev server, dev deps) | `backend/Dockerfile:10,17`, `frontend/Dockerfile:11` | simplicity while building | multi-stage prod images + nginx | not production-safe | **No** for prod — add prod Dockerfiles/compose override |
| 4 | Migrations + admin bootstrap in container entrypoint | `backend/entrypoint.sh:3-4` | "it just works" first start | separate migrate job; init container | races with multiple replicas | **Yes** for single instance; **No** at scale |
| 5 | Vite proxy for `/api` (same origin) | `vite.config.ts:17-22` | avoid CORS + keep SameSite cookies first-party | CORS with credentials | must replicate proxy in production (nginx) | **Yes** |
| 6 | API versioned under `/api/v1` | `api/v1/router.py:5` | future breaking changes | header versioning; none | slightly longer URLs | **Yes** |
| 7 | Layered backend: routers → services → models | `README.md:95-98` | testable business logic, thin HTTP layer | fat routers; repository pattern | more files | **Yes** |
| 8 | Photos on local disk volume, paths in DB | `prescription_service.py:41-53, 197-202` | simplest storage for one clinic | S3/MinIO object storage; DB `bytea` | no replication/CDN; must back up volume separately; orphan files possible | **Yes for now**; move to object storage when multi-instance |

## Data

| # | Decision | Where | Likely reason | Alternatives | Trade-offs | Keep? |
|---|---|---|---|---|---|---|
| 9 | PostgreSQL with pg_trgm, JSONB, enums, sequence | migrations 0001–0002 | fuzzy name matching, flexible AI output, integrity | MySQL; SQLite; MongoDB | Postgres-specific (tests need real PG) | **Yes** |
| 10 | UUID primary keys | `models/base.py:21-22` | ids generated before insert (file names), not guessable | serial/identity ints; UUIDv7 | bigger, random index inserts | **Yes** (consider UUIDv7) |
| 11 | Medications/procedures/advice as JSONB lists | `models/patient.py:63-66` | mirrors the paper/AI output; one row per prescription | child tables (`prescription_medications`) | weak constraints, harder analytics | **Yes** for transcription; revisit for drug analytics |
| 12 | Keep raw AI output in `extracted` | `models/patient.py:72-73` | compare what was read vs what dentist saved; debugging | discard | storage; possible PHI duplication | **Yes** — enables accuracy evals |
| 13 | `timestamptz` UTC storage, display Asia/Dhaka | `models/base.py:18`, `core/time.py`, `lib/format.ts:3` | correctness across zones | naive local times | must convert on display | **Yes** |
| 14 | Money in integer minor units | `README.md:119`, `lib/format.ts:12-23` | avoid float errors | `NUMERIC`/Decimal | conversion code | **Yes** (billing not built yet) |
| 15 | Phones normalised to `+8801…` | `core/validators.py:11-23` | one format for matching/reminders | store as typed | BD-only validation | **Yes** (single-country clinic) |
| 16 | Patient code from sequence `P-00001` when missing | `patient_service.py:19, 86-90` | prescriptions may lack an ID | UUID-only; per-year codes | gaps in numbering | **Yes** |
| 17 | Hard delete of patients/prescriptions (+ files) | `patient_service.py:122-134`, `prescription_service.py:337-344` | simplicity, admin-only | soft delete (`SoftDelete` mixin exists unused), archival + audit | irreversible; medical-record retention | **No** — use soft delete + audit log for clinical data |
| 18 | Naming convention for constraints | `models/base.py:7-13` | deterministic constraint names in migrations | DB-generated names | none | **Yes** |
| 19 | Unique patient code checked case-insensitively in code only | `patient_service.py:76-83` | user-friendly | unique index on `lower(patient_code)` | race → 500 | **Improve** — add functional unique index + catch `IntegrityError` |

## Auth & security

| # | Decision | Where | Likely reason | Alternatives | Trade-offs | Keep? |
|---|---|---|---|---|---|---|
| 20 | JWTs in httpOnly SameSite=Lax cookies | `api/v1/auth.py:18-37` | XSS can't steal tokens; CSRF mitigated | Bearer tokens in memory/localStorage; server sessions | CSRF must be considered; cookie config per env | **Yes** |
| 21 | Short access (15 min) + rotating refresh (7 d) with reuse detection | `auth_service.py:66-93` | revocable sessions, theft detection | long-lived single token; server sessions | complexity; concurrent refresh handling | **Yes** — well implemented |
| 22 | Refresh cookie path-scoped to `/api/v1/auth` | `auth.py:15, 36` | minimise exposure of the long-lived token | path `/` | must keep path in sync | **Yes** |
| 23 | Re-load user and check `is_active` on every request | `deps.py:28-31` | deactivation takes effect immediately | trust JWT claims | one PK lookup per request | **Yes** |
| 24 | Argon2id + dummy hash for unknown emails | `core/security.py:12-25`, `auth_service.py:19-21` | strong hashing, no user enumeration via timing | bcrypt | CPU/memory per login | **Yes** |
| 25 | RBAC via dependency factory `require_roles` | `deps.py:38-55` | declarative, testable | decorators; policy engine | roles hard-coded | **Yes** |
| 26 | Frontend permission map mirrors backend | `lib/permissions.ts` | hide unusable controls | fetch permissions from API | can drift (it already does for `/scan`) | **Yes, but** fix the mismatch and consider serving permissions from `/auth/me` |
| 27 | No login rate limiting | — | not yet built | slowapi, proxy limits, lockout | brute-force exposure | **No** — add |
| 28 | Known bootstrap admin password | `.env.example:34`, `README.md:37` | easy first run | random password printed once; forced change | weak default if forgotten | **No** for production |
| 29 | Re-encode uploads with Pillow, cap pages/size | `prescription_service.py:56-68, 178-196` | security, uniform storage, AI cost | store originals | lose original quality/metadata | **Yes** |

## AI reading

| # | Decision | Where | Likely reason | Alternatives | Trade-offs | Keep? |
|---|---|---|---|---|---|---|
| 30 | Gemini Flash vision + JSON schema output | `extraction_service.py` | free tier, multimodal, structured output | OCR + rules; GPT-4o/Claude; self-hosted | vendor dependency; privacy terms | **Yes** (with paid tier for real data) |
| 31 | All pages in one request | `extraction_service.py:159-162` | one prescription = one context | per-page then merge | bigger request | **Yes** |
| 32 | "Null rather than guess" + `uncertain_fields` | `extraction_service.py:90-91, 131-132` | reduce hallucinations, guide review | confidence scores | model self-assessment imperfect | **Yes** |
| 33 | Human-in-the-loop: drafts only become records after a dentist saves | `prescription_service.py:310-334`, `deps.py:54-55` | clinical safety, liability | auto-file | slower | **Yes** — essential |
| 34 | Background task + polling instead of synchronous call | `api/v1/prescriptions.py:32`, `features/prescriptions/hooks.ts:17-18,35` | 15–40 s reads; staff keep scanning | sync request; task queue + WebSocket | not durable; polling traffic | **Yes for now**; task queue when volume grows |
| 35 | Stale-read detection via `reading_started_at` + 5 min timeout | `prescription_service.py:37-38, 123-131` | survive server restarts without a queue | heartbeat; queue retries | a hung call shows "interrupted" after 5 min | **Yes** — clever, cheap |
| 36 | Session held open during Gemini call | `prescription_service.py:155-175` | simpler code | close session before the call | holds a pool connection idle-in-transaction | **No** — split into two sessions |
| 37 | Sanitise model output (`_text`, `_date`, `_medications`) | `prescription_service.py:74-120` | never trust LLM output | Pydantic model of extraction | — | **Yes** |
| 38 | Patient match suggestions (ID / phone / trigram name), pre-select only strong matches | `patient_service.py:137-180`, `form.ts:59-66` | avoid wrong-patient filing | auto-link; exact only | UI complexity | **Yes**; return reason *codes* not English strings |

## Frontend

| # | Decision | Where | Likely reason | Alternatives | Trade-offs | Keep? |
|---|---|---|---|---|---|---|
| 39 | TanStack Query for all server state (incl. current user) | `features/*/hooks.ts` | caching, polling, invalidation | Redux/RTKQ; SWR; Context | another library | **Yes** |
| 40 | React Hook Form + Zod with string form values + converters | `features/prescriptions/form.ts` | fast large forms; typed; testable conversion | Formik; controlled state | two representations | **Yes** |
| 41 | shadcn/ui + Radix + Tailwind v4 tokens | `components/ui/*`, `index.css` | accessible components you own | MUI, Chakra | maintain copied components | **Yes** |
| 42 | URL search params for list filters/pages | `PatientsPage.tsx:19-30`, `PrescriptionsPage.tsx:22-24` | shareable, survives refresh | component state | parsing/validation | **Yes** |
| 43 | Client-side photo downscale before upload | `lib/image.ts` | slow mobile data | upload originals | client CPU; fallback needed | **Yes** |
| 44 | All strings in `i18n/en.ts` with a widened `Messages` type | `i18n/en.ts:272-273` | ready for Bangla | i18next | no runtime switching yet | **Yes** |
| 45 | Hand-written API types | `api/types.ts:1` | quick | `openapi-typescript` codegen | drift risk | **Improve** |
| 46 | No error boundary / lazy routes | `App.tsx:34-86` | small app | `errorElement`, `lazy` | crash shows default error | **Improve** (cheap wins) |
| 47 | Remount form via `key` when reading finishes | `PrescriptionReviewPage.tsx:93-94` | reset RHF defaults cleanly | `form.reset()` in an effect | discards any edits made meanwhile (form is disabled while reading, so none) | **Yes** |

## Testing & tooling

| # | Decision | Where | Likely reason | Alternatives | Trade-offs | Keep? |
|---|---|---|---|---|---|---|
| 48 | Backend tests against real Postgres with per-test rollback | `tests/conftest.py` | Postgres-specific SQL; speed | SQLite; mocks; testcontainers | needs a running DB | **Yes** (add a safety check on DB name) |
| 49 | Gemini stubbed via monkeypatch | `tests/test_prescriptions.py:64-78` | deterministic, free | VCR cassettes | doesn't test real prompt | **Yes** + separate eval suite |
| 50 | Strict TS, `any` banned, strict ESLint | `tsconfig.app.json:15-19`, `eslint.config.js:16` | catch bugs early | looser config | more upfront typing | **Yes** |
| 51 | No CI pipeline, no lockfile for Python | — | early stage | GitHub Actions; uv/pip-tools | regressions and drift | **No** — add both |
