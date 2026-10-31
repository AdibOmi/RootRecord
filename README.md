# Root Record

Patient records for a single dental clinic in Bangladesh, built around the paper prescription. The dentist writes the prescription by hand as usual, takes a photo of it, and Root Record reads it (patient ID, name, date, what was done, medicines, advice, follow-up date) into the patient's record. Staff-only (Admin, Dentist, Receptionist).

> **Status:** Auth, roles and the app shell are done, and prescription scanning is the main feature. Appointments, recalls, billing and reports are still placeholders.

## How prescription scanning works

1. **Scan** (`/scan`, any staff member, usually the assistant): take a photo or pick one from the gallery. For a prescription with several pages or a back side, add each page (up to 6) before reading. The browser shrinks each photo to about 1 MB and uploads them together.
2. **Read**: the backend stores the pages, answers straight away, and then (in the background) sends them to Google Gemini in one request (`gemini-3.6-flash` on the free tier, vision + structured output) to get the patient details, visit date, complaint, diagnosis, treatment done, medicines (dose patterns such as `1+0+1` kept as written), advice, follow-up date and notes. Teeth written in Palmer notation (a number in the corner of a cross) are converted to FDI numbers. The model also lists fields it found hard to read. The review page opens immediately and fills in by itself when reading finishes (usually 15–40 seconds), so the assistant can scan the next prescription meanwhile.
3. **Review** (`/prescriptions/:id`, dentists and admins): the pages are shown next to an editable form. Assistants can see the draft, read it again or discard it, but only a dentist can save it. A missing phone number is flagged, because follow-up reminders need one. Hard-to-read fields are marked **Check**. Root Record suggests existing patients with the same ID or phone number, or a similar name. The dentist picks one or creates a new patient, then saves.
4. **Record** (`/patients/:id`): saved prescriptions build the patient's visit history.
5. **Share**: a filed prescription can be downloaded as a typed PDF (Bangla included) or, on a phone over HTTPS, shared straight to WhatsApp, Messenger or email. Internal notes are left out of the PDF.

Nothing reaches a patient record until a dentist has checked it. If reading fails (no API key, no internet), the photo is still kept as a draft: fill it in by hand, or press *Read again*. Drafts wait under **Prescriptions → To review**.

## Quick start

Requirements: Docker Desktop.

```bash
docker compose up --build
```

| Service  | URL                          |
|----------|------------------------------|
| App      | http://localhost:5173        |
| API docs | http://localhost:8000/docs   |
| Postgres | localhost:5432 (`rootrecord` / `rootrecord`) |

On first start the backend runs migrations and creates the admin account below if no admin exists yet.

### Default login

| Role  | Email                  | Password      |
|-------|------------------------|---------------|
| Admin | `admin@rootrecord.app` | `Admin@12345` |

Change this password after the first sign-in (user menu → *Change password*). To use different first-run credentials, set the `BOOTSTRAP_ADMIN_*` variables before the first start.

## Configuration

Both apps run with sensible development defaults, so `.env` files are optional. The exception is reading prescriptions, which needs a free Gemini API key (from https://aistudio.google.com/apikey) in `GEMINI_API_KEY`. On the free tier Google may use what is sent to improve its products, so use a paid key before scanning real patients' prescriptions. To set it or override other defaults, copy the examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**Backend (`backend/.env`)**

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg://rootrecord:rootrecord@db:5432/rootrecord` | Main database |
| `TEST_DATABASE_URL` | `…/rootrecord_test` | Used by pytest (created automatically) |
| `JWT_SECRET` | dev-only value | **Must** be set when `ENVIRONMENT=production` |
| `ACCESS_TOKEN_MINUTES` / `REFRESH_TOKEN_DAYS` | `15` / `7` | Token lifetimes |
| `COOKIE_SECURE` | `false` | Set `true` behind HTTPS |
| `CORS_ORIGINS` | – | Only needed if the frontend is not served via the proxy |
| `STORAGE_DIR` | `/data/uploads` | Prescription photos (Docker volume) |
| `MAX_UPLOAD_MB` | `15` | Largest photo accepted |
| `GEMINI_API_KEY` | – | Needed to read prescriptions automatically |
| `GEMINI_MODEL` | `gemini-3.6-flash` | Model used to read photos |
| `CLINIC_NAME` / `CLINIC_ADDRESS` / `CLINIC_PHONE` | `Dental Clinic` / – / – | Header of prescription PDFs |
| `BOOTSTRAP_ADMIN_EMAIL` / `_PASSWORD` / `_NAME` | see above | First-run admin |

**Frontend (`frontend/.env`)**

| Variable | Purpose |
|---|---|
| `VITE_PROXY_TARGET` | Where the dev server proxies `/api` (Compose sets `http://backend:8000`) |
| `VITE_USE_POLLING` | Poll for file changes (Compose sets `true` for bind mounts) |

## Development

```bash
# Backend tests (runs against a separate rootrecord_test database)
docker compose exec backend pytest

# Create a migration after changing models
docker compose exec backend alembic revision --autogenerate -m "describe change"
docker compose exec backend alembic upgrade head

# Frontend checks
docker compose exec frontend npm run typecheck
docker compose exec frontend npx eslint src
docker compose exec frontend npm test
```

## Architecture

```
backend/
  app/
    api/v1/      Thin FastAPI routers, one per domain
    api/deps.py  DB session, current user, role checks (require_roles)
    services/    Business logic (routers call services, never the ORM directly)
    models/      SQLAlchemy 2.0 typed models (UUID PKs, created_at/updated_at)
    schemas/     Pydantic v2 request/response models, Page[T] pagination
    core/        Settings, security (argon2, JWT), errors, time zone, validators
  alembic/       Migrations
  tests/         pytest + httpx; each test runs in a rolled-back transaction
frontend/
  src/
    api/         fetch client (cookies, silent refresh, typed errors) + endpoint modules
    features/    Domain logic: hooks (TanStack Query), forms (react-hook-form + zod)
    components/  ui/ (shadcn/ui), layout/ (sidebar, top bar, search), common/
    pages/       Route-level screens
    lib/         Formatting (৳, DD/MM/YYYY, 12-hour, Asia/Dhaka), phone, permissions
    i18n/        All UI strings (en.ts). Add bn.ts later for Bangla
```

**Key conventions**

- **Auth:** access token (15 min) and refresh token (7 days) are JWTs in httpOnly, SameSite=Lax cookies. Refresh tokens rotate on every use, are stored server-side for revocation, and replaying an old one revokes all of that user's sessions. Deactivating a user takes effect on their next request.
- **Roles** are enforced on the backend with FastAPI dependencies. `frontend/src/lib/permissions.ts` only hides UI controls.
- **Errors** always come back as `{"error": {"code", "message", "details"}}`. Validation errors list `{field, message}` pairs. Unhandled errors are logged server-side and returned as a generic message.
- **Pagination:** `?page=&page_size=` → `{items, total, page, page_size}`.
- **Money** is stored as integer minor units (1/100 BDT) in `BIGINT` columns named `*_minor`.
- **Time:** stored as UTC `timestamptz` and displayed in Asia/Dhaka.
- **Phones** are validated as `01[3-9]XXXXXXXX` and stored as `+8801XXXXXXXXX`.
