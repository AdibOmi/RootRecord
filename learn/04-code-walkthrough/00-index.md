# 04 — Code Walkthrough: Index

Read in numeric order. Each file explains its source files chunk by chunk, links to the relevant
skill module, and ends with Q&As.

| # | Walkthrough | Source files covered |
|---|---|---|
| 01 | Root configs | `README.md`, `.gitignore`, `.gitattributes`, `docker-compose.yml`, `.vscode/settings.json` |
| 02 | Backend build | `backend/Dockerfile`, `entrypoint.sh`, `.dockerignore`, `requirements.txt`, `requirements-dev.txt`, `pyproject.toml`, `.env.example`, `alembic.ini` |
| 03 | Backend entry | `app/main.py`, `app/cli.py`, all `__init__.py` files |
| 04 | Config & DB | `app/core/config.py`, `app/core/db.py` |
| 05 | Errors | `app/core/errors.py` |
| 06 | Security, time, validators | `app/core/security.py`, `app/core/time.py`, `app/core/validators.py` |
| 07 | Models | `app/models/base.py`, `user.py`, `patient.py`, `__init__.py` |
| 08 | Schemas | `app/schemas/common.py`, `user.py`, `patient.py`, `prescription.py` |
| 09 | Deps & router | `app/api/deps.py`, `app/api/v1/router.py` |
| 10 | Auth & users API | `app/api/v1/auth.py`, `app/api/v1/users.py` |
| 11 | Patients & prescriptions API | `app/api/v1/patients.py`, `app/api/v1/prescriptions.py` |
| 12 | Auth service | `app/services/auth_service.py` |
| 13 | User & patient services | `app/services/user_service.py`, `app/services/patient_service.py` |
| 14 | Prescription service | `app/services/prescription_service.py` |
| 15 | Extraction service (Gemini) | `app/services/extraction_service.py` |
| 16 | PDF service | `app/services/pdf_service.py`, `app/assets/fonts/*` |
| 17 | Alembic | `alembic/env.py`, `script.py.mako`, `versions/0001…0004` |
| 18 | Backend tests | `tests/conftest.py`, `test_auth.py`, `test_users.py`, `test_prescriptions.py` |
| 19 | Frontend build | `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `components.json`, `index.html`, `Dockerfile`, `.dockerignore`, `.env.example`, `public/favicon.svg` |
| 20 | Entry, App, CSS | `src/main.tsx`, `src/App.tsx`, `src/index.css` |
| 21 | API layer | `src/api/client.ts`, `auth.ts`, `patients.ts`, `prescriptions.ts`, `types.ts` |
| 22 | lib & i18n | `src/lib/*.ts` (incl. `format.test.ts`), `src/i18n/*` |
| 23 | Auth feature | `src/features/auth/hooks.ts`, `guards.tsx`, `ChangePasswordDialog.tsx` |
| 24 | Patients feature | `src/features/patients/hooks.ts`, `EditPatientDialog.tsx` |
| 25 | Prescriptions feature | `src/features/prescriptions/hooks.ts`, `form.ts`, `form.test.ts`, `PrescriptionRow.tsx`, `SharePrescription.tsx` |
| 26 | Layout | `src/components/layout/*` |
| 27 | Common & UI components | `src/components/common/*`, `src/components/ui/*` |
| 28 | Simple pages | `DashboardPage`, `LoginPage`, `NotFoundPage`, `PlaceholderPage`, `PatientsPage`, `PrescriptionsPage` |
| 29 | Scan page | `src/pages/ScanPage.tsx` |
| 30 | Patient detail page | `src/pages/PatientDetailPage.tsx` |
| 31 | Prescription review page | `src/pages/PrescriptionReviewPage.tsx` |

Coverage: all 135 tracked files (`git ls-files`) are covered. Binary assets (fonts, favicon) and the
generated `package-lock.json` are described rather than dissected.
