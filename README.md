# Root Record

Patient management for a single dental clinic in Bangladesh: patient records, appointments, billing and payments. Staff-only (Admin, Dentist, Receptionist).

> **Status:** Phase 1 (foundation) is complete: auth, roles, and the app shell. Patients, appointments, billing and the dashboard come in later phases.

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

Both apps run with sensible development defaults, so `.env` files are optional. To override the defaults, copy the examples:

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
| `STORAGE_DIR` | `/data/uploads` | Attachment storage (Docker volume) |
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
