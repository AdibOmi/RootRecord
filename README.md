# Root Record

Patient records for a single dental clinic in Bangladesh, built around the paper prescription. The dentist writes the prescription by hand as usual; the assistant photographs it at payment, and Root Record files the visit under the patient (what was done, medicines, advice, follow-up date, bill and dues). Staff-only for now (Admin, Dentist, Receptionist). Works on phones and can be installed to the home screen.

> **Status:** Auth, roles, scanning, filing at payment and the dentist's check are done. Follow-up tracking, the patient portal, appointments and reports are next.

## How prescription scanning works

1. **Scan** (`/scan`, any staff member, usually the assistant at payment): take a photo or pick one from the gallery. For a prescription with several pages or a back side, add each page (up to 6). The browser shrinks each photo to about 1 MB and uploads them together.
2. **Quick read of the patient** (a few seconds, while the assistant waits): the backend stores the pages and sends a smaller copy of the first page to Google Gemini (`gemini-3.6-flash`, free tier, minimal "thinking") for just the name, phone, age, sex and patient ID. If that fails or is slow, the assistant types the name and phone instead.
3. **File at payment** (`/prescriptions/:id`, any staff member): Root Record suggests existing patients. **Same ID**, or **same phone and a similar name**, is pre-selected as a returning patient. The same phone with a different name is only suggested, because families often share one number. Otherwise a new patient is created with a random **8-digit ID** (shown as `4829-1736`), which the assistant writes on the prescription. The ID never changes; with the phone number it will be the patient's sign-in. The assistant also enters the bill and the amount paid, and the due is worked out.
4. **Full read** (background, usually 15–30 seconds): all pages go to Gemini in one request for the visit date, complaint, diagnosis, treatment done, medicines (dose patterns such as `1+0+1` kept as written), advice, follow-up date and notes. Teeth in Palmer notation are converted to FDI numbers, and hard-to-read fields are listed. The visit fills in by itself, even if it has already been filed.
5. **Dentist's check**: filed visits are visible straight away but marked **Not checked by a doctor yet** (also on the PDF). Dentists find them under **Prescriptions → To check**, compare them with the photo (hard-to-read fields are marked **Check**), correct anything, and save, which marks the visit as checked. A late background read never overwrites a dentist's check.
6. **Record** (`/patients/:id`): every visit with what was done, medicines, advice, follow-up, bill and due.
7. **Share**: a filed visit can be downloaded as a typed PDF (Bangla included) or, on a phone over HTTPS, shared to WhatsApp, Messenger or email. Internal notes are left out of the PDF.

If reading fails (no API key, no internet), the photo is kept: file it with the typed name and phone, then fill the rest in by hand or press *Read again*. Scans not yet filed under a patient wait under **Prescriptions → To file**.

**Privacy:** on Gemini's free tier, Google may use what is sent to improve its products. Use a paid key (or a self-hosted model) before scanning real patients' prescriptions.

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
| `GEMINI_HEADER_MODEL` | – (same as `GEMINI_MODEL`) | Model for the quick name/phone read; a `-lite` model is faster |
| `GEMINI_THINKING_LEVEL` / `GEMINI_HEADER_THINKING_LEVEL` | `low` / `minimal` | Less thinking is faster. Gemini 3 only: leave empty for 2.x models |
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
