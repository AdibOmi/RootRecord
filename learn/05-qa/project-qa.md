# Root Record — Project Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

## Product & overview

**Q:** 🟢 What does Root Record do, in one sentence?

**A:** It turns photos of handwritten dental prescriptions into structured patient records using Gemini vision, with a dentist reviewing every record before it's filed (`README.md:3, 15`).

**Q:** 🟢 Who are the users and roles?

**A:** Clinic staff only: Admin, Dentist, Receptionist (assistant) (`models/user.py:11-14`).

**Q:** 🟢 What is the main user workflow?

**A:** Scan (photo pages) → Read (AI in background) → Review (dentist edits/links patient) → Record (visit history) → Share (PDF/WhatsApp) (`README.md:7-13`).

**Q:** 🟢 What's the tech stack?

**A:** React 18 + TypeScript + Vite + TanStack Query + React Hook Form/Zod + Tailwind/shadcn on the frontend; FastAPI + Pydantic + SQLAlchemy/Alembic + PostgreSQL on the backend; Gemini for reading; fpdf2 for PDFs; Docker Compose to run it.

**Q:** 🟢 What features are placeholders?

**A:** Appointments, recalls, billing, reports, settings and dashboard figures (`README.md:5`, `App.tsx:55-80`, `DashboardPage.tsx:20-23`).

**Q:** 🟢 How do you run it?

**A:** `docker compose up --build`, then open `http://localhost:5173`; API docs at `:8000/docs` (`README.md:21-29`).

**Q:** 🟡 Why build around the paper prescription instead of making dentists type?

**A:** Dentists keep their habit (handwriting is fast); the system digitises after the fact, lowering adoption friction (`README.md:3`).

**Q:** 🟡 Why is it staff-only?

**A:** It's an internal clinic tool; patients receive PDFs via share/download rather than logging in.

## Architecture

**Q:** 🟢 Describe the architecture.

**A:** Browser SPA → Vite dev server (proxies `/api`) → FastAPI (routers → deps → services → models) → Postgres; photos on a volume; a background task calls Gemini (`02-architecture.md` §1).

**Q:** 🟡 Why separate routers, services and models?

**A:** Routers handle HTTP, services hold business rules and transactions, models map tables — testable, readable, and routers never touch the ORM directly (`README.md:95-98`).

**Q:** 🟡 How does the frontend talk to the backend?

**A:** Through `api/client.ts` (fetch with cookies, error parsing, silent refresh), typed endpoint modules, and TanStack Query hooks per feature.

**Q:** 🟡 Why is the API same-origin?

**A:** The Vite proxy forwards `/api` to the backend, so cookies are first-party and CORS isn't needed (`vite.config.ts:17-22`).

**Q:** 🟡 Where does business logic live on the frontend?

**A:** In `features/*` (hooks, form schemas/converters) and `lib/*` helpers; pages compose them.

**Q:** 🟡 What's the data model?

**A:** `users`, `refresh_tokens`, `patients`, `prescriptions` (JSONB for lists, nullable `patient_id` for drafts, raw `extracted` output, `reading_started_at`) (`13-sql-postgresql.md` §2.1).

**Q:** 🟡 What happens on container start?

**A:** Migrations run, the first admin is created if missing, then Uvicorn starts (`entrypoint.sh`).

**Q:** 🔴 What are the main architectural risks?

**A:** In-process background tasks (not durable), local-disk photo storage, dev-only containers, single instance assumptions (migrations at startup), and third-party AI with health data.

## Scanning & AI reading

**Q:** 🟢 How many pages can a prescription have?

**A:** Up to 6 (`MAX_PAGES`, `prescription_service.py:34`; frontend `ScanPage.tsx:22`).

**Q:** 🟡 Why shrink photos in the browser?

**A:** Phones on slow mobile data upload ~1 MB instead of ~5 MB per page (`lib/image.ts:4-8`).

**Q:** 🟡 Why also process images on the server?

**A:** The server must validate untrusted uploads, apply EXIF rotation, normalise format/size and strip metadata (`prescription_service.py:56-68`).

**Q:** 🟡 Why does the scan endpoint return immediately?

**A:** Gemini takes 15–40 s; returning a draft with `reading: true` lets staff continue while reading happens in a background task (`prescriptions.py:18-33`).

**Q:** 🟡 How does the review page know when reading is done?

**A:** It polls every 2 s while `reading` is true and remounts the form when it flips (`hooks.ts:35`, `PrescriptionReviewPage.tsx:94`).

**Q:** 🟡 What does the AI return?

**A:** JSON matching a strict schema: patient block, visit date, complaint, diagnosis, procedures, medications, advice, follow-up date, notes, and `uncertain_fields` (`extraction_service.py:27-84`).

**Q:** 🟡 How is AI output kept safe?

**A:** Schema-constrained, sanitised field by field, stored raw for audit, never filed without a dentist (`prescription_service.py:74-120`).

**Q:** 🟡 What are "Check" badges?

**A:** UI warnings next to fields the model listed in `uncertain_fields` (`PrescriptionReviewPage.tsx:135-141`).

**Q:** 🟡 What happens if there's no API key or internet?

**A:** The photo is still stored as a draft with an error message; staff fill it by hand or press "Read again" (`README.md:15`).

**Q:** 🟡 What is Palmer notation and why does it matter?

**A:** A dental shorthand drawing tooth numbers in quadrant brackets; the prompt teaches the model to convert it to FDI two-digit numbers (`extraction_service.py:99-105, 123-126`).

**Q:** 🔴 What happens if the server restarts during a read?

**A:** `reading_started_at` stays set; after 5 minutes the draft shows "Reading was interrupted" and can be re-read (`prescription_service.py:37-38, 123-131`).

**Q:** 🔴 What if a dentist files the draft while it's still being read?

**A:** Saving is refused with `still_reading` (`prescription_service.py:328-329`); and if status changed anyway, the background task won't overwrite it (`:166-169`).

**Q:** 🔴 What if staff discard a draft mid-read?

**A:** Files and row are deleted; the background task's `db.refresh` will fail on the missing row (logged error, no data harm) — a small robustness gap.

**Q:** 🔴 Why not call Gemini synchronously?

**A:** It would block a worker thread and the user for up to 40 s (or minutes with retries), risking proxy timeouts and poor UX.

## Patient matching & filing

**Q:** 🟢 What does "filing" a prescription mean?

**A:** A dentist saves the reviewed draft, linking it to a patient and setting status `confirmed` (`prescription_service.py:310-334`).

**Q:** 🟡 How are existing patients suggested?

**A:** Same patient code (case-insensitive), same normalised phone, or trigram name similarity ≥ 0.35; ranked by number of signals (`patient_service.py:137-180`).

**Q:** 🟡 When is a match pre-selected?

**A:** Only for strong signals (same ID or phone); similar names alone aren't (`form.ts:59-66`).

**Q:** 🟡 What if the prescription has no patient ID?

**A:** A code like `P-00042` is generated from a sequence (`patient_service.py:86-90`).

**Q:** 🟡 How is a duplicate patient code handled?

**A:** 409 `patient_code_taken`, shown under the patient ID field (`patient_service.py:76-83`, `PrescriptionReviewPage.tsx:125-126`).

**Q:** 🟡 Why is a missing phone highlighted?

**A:** Follow-up reminders (future feature) need a phone (`README.md:11`, `PrescriptionReviewPage.tsx:357, 399-401`).

**Q:** 🟡 How is the patient + prescription save atomic?

**A:** `patient_service.create` only flushes; `save` commits once (`patient_service.py:105`, `prescription_service.py:333`).

**Q:** 🔴 How could two dentists create duplicate patients?

**A:** Saving two drafts for the same new patient simultaneously: both pass the code check before either commits; the unique constraint rejects one with a 500. Catch `IntegrityError` → 409 and/or lock.

## Auth & security

**Q:** 🟢 How do users log in?

**A:** Email + password → Argon2 verification → JWT access/refresh cookies (`auth_service.py:43-55`, `auth.py:45-49`).

**Q:** 🟡 Why cookies instead of localStorage tokens?

**A:** httpOnly cookies can't be read by injected scripts; SameSite=Lax limits CSRF (`auth.py:18-37`).

**Q:** 🟡 How long are sessions?

**A:** Access token 15 min, refresh token 7 days, both configurable (`config.py:22-23`).

**Q:** 🟡 What happens when the access token expires?

**A:** The next request gets 401; the client refreshes once (single-flight) and retries (`client.ts:116-130`).

**Q:** 🟡 What is refresh token reuse detection?

**A:** Replaying an already-rotated refresh token (after a 30 s grace) revokes all the user's sessions (`auth_service.py:76-83`).

**Q:** 🟡 How is deactivation immediate?

**A:** The user is reloaded and `is_active` checked on every request; tokens are revoked (`deps.py:28-31`, `user_service.py:98`).

**Q:** 🟡 How are roles enforced?

**A:** FastAPI dependencies (`AdminUser`, `ScanUser`, `ClinicalUser`) on routes plus service rules; the frontend only hides controls (`deps.py:49-55`, `lib/permissions.ts:1-4`).

**Q:** 🟡 What are the admin safety rules?

**A:** Can't deactivate yourself; the clinic must keep at least one active admin (`user_service.py:68-75, 93-101`).

**Q:** 🟡 How does login avoid revealing which emails exist?

**A:** Same error message and a dummy hash verification for unknown emails (`auth_service.py:19-21, 45-49`).

**Q:** 🔴 What security improvements would you prioritise?

**A:** Login rate limiting, forced change of the bootstrap password, `COOKIE_SECURE=true` + HTTPS, audit log, paid Gemini tier/data agreement, no PHI in logs, CSP headers, MFA for admins.

**Q:** 🔴 Is the app vulnerable to CSRF?

**A:** Largely mitigated by SameSite=Lax cookies and no state-changing GETs; adding an Origin check or CSRF token would harden it.

**Q:** 🔴 How are uploads protected?

**A:** Page/size limits, Pillow decode/re-encode (rejects non-images and decompression bombs), server-generated filenames, authenticated serving.

## Data & database

**Q:** 🟡 Why PostgreSQL?

**A:** Relational integrity, JSONB for AI output, pg_trgm for fuzzy names, enums, sequences, timestamptz, future exclusion constraints.

**Q:** 🟡 Why JSONB for medications?

**A:** Mirrors the prescription's free-form list and AI output; one read/write per prescription; trade-off: weaker analytics/constraints.

**Q:** 🟡 Why UUID primary keys?

**A:** Generated before insert (used for photo filenames), non-guessable, merge-friendly (`prescription_service.py:197-198`).

**Q:** 🟡 How is time handled?

**A:** UTC `timestamptz` storage; clinic-local "today" for logic; Asia/Dhaka display (`core/time.py`, `lib/format.ts`).

**Q:** 🟡 How are phone numbers stored?

**A:** Normalised to `+8801XXXXXXXXX` (`core/validators.py:11-20`).

**Q:** 🟡 How are patient lists sorted?

**A:** By last visit (most recent first, never-visited last), then name (`patient_service.py:69`).

**Q:** 🟡 How is "next follow-up" computed?

**A:** Minimum follow-up date on or after clinic today among confirmed prescriptions (aggregate FILTER) (`patient_service.py:50-52`).

**Q:** 🔴 Which queries won't scale and why?

**A:** `similarity() >= 0.35` (no index use), `ILIKE '%…%'` on code/phone (unindexed), OFFSET pagination deep pages. Fix with `%` operator, expression/trigram indexes, keyset pagination.

**Q:** 🔴 Why is deleting medical records a concern?

**A:** Hard deletes are irreversible and may violate record-retention expectations; a soft delete + audit trail would be safer (`models/base.py:30-31` mixin unused).

## Frontend

**Q:** 🟡 How is server state managed?

**A:** TanStack Query hooks per feature with hierarchical keys, invalidation and adaptive polling (`features/*/hooks.ts`).

**Q:** 🟡 How is the current user stored?

**A:** As the `['auth','me']` query (`staleTime: Infinity`), reset on login/logout (`features/auth/hooks.ts`).

**Q:** 🟡 How is the large review form built?

**A:** React Hook Form + Zod schema with string fields, `useFieldArray` for medicines, converters to/from API shapes (`form.ts`, `PrescriptionReviewPage.tsx`).

**Q:** 🟡 How are routes protected?

**A:** `RequireAuth` (pathless route) and `RequirePermission` wrappers (`guards.tsx`, `App.tsx`).

**Q:** 🟡 How is the UI made accessible?

**A:** Radix primitives (focus, ARIA), labelled fields with `role="alert"` errors, `aria-live` status regions, `sr-only` labels, custom radio semantics.

**Q:** 🟡 How is sharing to WhatsApp done?

**A:** Fetch the PDF as a blob, wrap it in a `File`, call `navigator.share({ files })` on HTTPS phones; otherwise download (`SharePrescription.tsx`).

**Q:** 🟡 How is the app prepared for Bangla UI?

**A:** All strings in `i18n/en.ts` with a widened `Messages` type for a future `bn.ts` (`en.ts:272-273`).

**Q:** 🔴 What's the frontend bug you found?

**A:** `/scan` and the top-bar scan button require `clinical:edit`, but the sidebar/dashboard show Scan for `prescriptions:scan` and the backend allows receptionists — receptionists get "no access" (`App.tsx:46`, `AppShell.tsx:48`, `nav.ts:28`).

**Q:** 🔴 What frontend robustness gaps exist?

**A:** No error boundary/`errorElement`, no lazy routes, hand-written API types, duplicated constants (MAX_PAGES, filename logic, match-reason strings).

## Testing & quality

**Q:** 🟢 How is the backend tested?

**A:** pytest against a real Postgres test DB, migrated once, each test in a rolled-back transaction, Gemini stubbed (`tests/conftest.py`).

**Q:** 🟢 How is the frontend tested?

**A:** Vitest unit tests for formatting/phone and the review form logic (`format.test.ts`, `form.test.ts`).

**Q:** 🟡 What do the prescription tests cover?

**A:** Role rules, multi-page reading, limits, sanitisation, failed/interrupted reads, filing new/existing patients, matching, duplicates, generated codes, validation, PDF, deletions (`test_prescriptions.py`).

**Q:** 🟡 What quality tooling exists?

**A:** Strict TypeScript, ESLint (strict TS + hooks), Ruff config, typed Python.

**Q:** 🔴 What testing would you add?

**A:** Component tests (permissions, review flows), E2E with Playwright, refresh reuse test, concurrency tests, CI pipeline, an LLM eval suite.

## Decisions & trade-offs ("why not X?")

**Q:** 🟡 Why FastAPI and not Django?

**A:** API-only backend for an SPA; FastAPI's DI and Pydantic integration fit; Django would add an admin and auth but more framework weight.

**Q:** 🟡 Why not Next.js?

**A:** An internal staff tool doesn't need SSR/SEO; a Vite SPA is simpler, and Python is preferred for the AI/PDF backend.

**Q:** 🟡 Why not a native mobile app?

**A:** The web app already uses camera capture, client resizing and the share sheet; no app-store distribution needed.

**Q:** 🟡 Why TanStack Query instead of Redux?

**A:** Almost all state is server state; Query handles caching/polling/invalidation with far less code.

**Q:** 🟡 Why polling instead of WebSockets?

**A:** Simpler; reads finish in seconds and polling stops automatically. WebSockets/SSE would help at larger scale.

**Q:** 🟡 Why BackgroundTasks instead of Celery?

**A:** Zero infrastructure for one clinic; the lease/timeout makes losses recoverable. Celery/RQ when volume or reliability needs grow.

**Q:** 🟡 Why Gemini?

**A:** Free tier with vision + JSON schema output; fast "flash" models; isolated behind one function for easy swapping.

**Q:** 🟡 Why fpdf2 instead of HTML-to-PDF?

**A:** Lightweight, no headless browser in the image, supports Bangla shaping with HarfBuzz.

**Q:** 🟡 Why shadcn/ui?

**A:** Accessible Radix behaviour with owned, customisable components and Tailwind tokens.

**Q:** 🟡 Why store raw AI output?

**A:** Audit and accuracy measurement — compare model output to dentist corrections.

**Q:** 🔴 Would you keep JWTs or switch to server sessions?

**A:** Either works; the current hybrid (short JWT + DB-tracked rotating refresh) is solid. Server sessions would simplify instant revocation; I'd keep the current design and add a token-version check.

## "What happens if…"

**Q:** 🟡 …a receptionist tries to save a draft via the API?

**A:** 403 Forbidden (`ClinicalUser`, test `test_prescriptions.py:124`).

**Q:** 🟡 …someone uploads a PDF as a "photo"?

**A:** 400 `invalid_image`, nothing stored, no Gemini call (`test_prescriptions.py:210-218`).

**Q:** 🟡 …7 pages are uploaded?

**A:** 400 `too_many_pages` (`prescription_service.py:181-182`).

**Q:** 🟡 …the follow-up date is before the visit date?

**A:** Client Zod error and, if bypassed, a 422 from Pydantic (`form.ts:44-46`, `schemas/prescription.py:96-97`).

**Q:** 🟡 …a user is deactivated while logged in?

**A:** Their next request returns 401; the client clears the session and redirects to login.

**Q:** 🟡 …the last admin tries to demote themselves?

**A:** 400 `last_admin` (`test_users.py:98-102`).

**Q:** 🟡 …an admin deletes a patient?

**A:** All their prescriptions and photos are deleted too, after confirmation showing the count (`patient_service.py:122-134`, `PatientDetailPage.tsx:211-219`).

**Q:** 🟡 …the Gemini free quota is exhausted?

**A:** 429 → "The free reading limit has been reached…" stored on the draft (`extraction_service.py:175-178`).

**Q:** 🟡 …a draft PDF is requested?

**A:** 400 `not_filed` (`prescriptions.py:86-87`).

**Q:** 🔴 …the database restarts?

**A:** `pool_pre_ping` discards dead connections; in-flight requests may fail once; background reads in progress may fail and show "interrupted" later.

**Q:** 🔴 …two browser tabs refresh tokens at the same moment?

**A:** One rotation wins; the other sees a just-revoked token within the 30 s grace → 401 without mass revocation; that tab then retries/refreshes via the other's new cookie on the next request.

**Q:** 🔴 …the uploads volume is lost?

**A:** Records remain but photos 404 (`prescriptions.py:66-67`); backups of the volume are needed.

## Scaling & improvements

**Q:** 🟡 How would you scale to many clinics?

**A:** Multi-tenancy (`clinic_id` scoping/RLS), object storage, task queue workers, horizontal API replicas, managed Postgres with PgBouncer, CDN for the SPA.

**Q:** 🟡 What would you build next?

**A:** Appointments and SMS/WhatsApp follow-up reminders (data already has follow-up dates and phones), patient search in the command palette, dashboard metrics.

**Q:** 🟡 What's the first refactor you'd do?

**A:** Fix the scan permission mismatch, split `PrescriptionReviewPage.tsx` into feature components, generate API types from OpenAPI.

**Q:** 🔴 How would you make AI reads durable?

**A:** Queue jobs (Celery/RQ/Arq + Redis), idempotent workers with retries/backoff, dead-letter handling, status updates via SSE.

**Q:** 🔴 How would you measure AI accuracy in production?

**A:** Compare `extracted` with saved values per field (edit distance/exact match), track by model/prompt version, monitor `uncertain_fields` calibration.

**Q:** 🔴 How would you productionise deployment?

**A:** Multi-stage images, nginx for SPA + proxy, TLS, secrets manager, migrations job, health/readiness probes, logging/monitoring (Sentry, metrics), backups for DB and photos, CI/CD.

**Q:** 🟡 How would you add an audit log?

**A:** An append-only table recording user, action, entity, before/after JSON, timestamp — written in services for save/delete/update and patient views.

**Q:** 🟡 How would you add offline scanning?

**A:** A PWA with service worker + IndexedDB queue for photos, uploading when online.

**Q:** 🟢 What would you say is the most impressive part?

**A:** The end-to-end AI workflow with safety: background reading, uncertainty flags, patient matching, human approval, graceful failure — plus solid auth with token rotation and reuse detection.
