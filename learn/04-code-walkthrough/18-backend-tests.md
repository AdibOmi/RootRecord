# 18 — Backend tests: `conftest.py`, `test_auth.py`, `test_users.py`, `test_prescriptions.py`

→ Skill: `16-testing-pytest-vitest.md`.

## `backend/tests/conftest.py` (110 lines)

| Lines | Code | Explanation |
|---|---|---|
| 1-2 | docstring | "a dedicated Postgres database, migrated once, with each test wrapped in a transaction that is rolled back afterwards" |
| 20 | `TEST_PASSWORD = "Secret@123"` | shared password for fixture users |
| 23-32 | `_ensure_database(url)` | connect to the `postgres` maintenance DB with `AUTOCOMMIT` (CREATE DATABASE can't run in a transaction), check `pg_database`, create if missing; `dispose()` closes the pool |
| 35-47 | `engine` fixture (session) | ensure DB; `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` (clean slate); run Alembic to head with the test URL; yield engine; dispose |
| 50-60 | `db` fixture | connection + outer transaction + Session with `join_transaction_mode="create_savepoint"`; rollback after test |
| 63-68 | `client` fixture | override `get_db`; `with TestClient(app)` (runs lifespan); clear overrides |
| 71 | `MakeUser = Callable[..., User]` | type alias for the factory |
| 74-91 | `make_user` | counter dict → unique emails `dentist1@test.clinic`; pops `email`/`full_name` from kwargs, passes the rest (`is_active=False`) to `User(...)`; commits (savepoint) |
| 94-96 | `login(client, user, password)` | helper asserting 200 |
| 99-110 | `as_role` | factory fixture: create a user with the role and log the shared client in |

Why `make_url(...).set(database="postgres")` (`:24-25`)? To connect to a database that always exists
while creating the test database.

## `backend/tests/test_auth.py` (115 lines)

| Test | Proves |
|---|---|
| `test_login_sets_httponly_cookies_and_returns_user` (9-18) | 200, role in body, no `password_hash`, `rr_access` HttpOnly, `rr_refresh` path `/api/v1/auth` |
| `test_login_is_case_insensitive_on_email` (21-26) | upper-case email still logs in |
| `test_wrong_password_gives_consistent_error` (29-36) | same 401 + message for wrong password and unknown email |
| `test_inactive_user_cannot_log_in` (39-42) | 401 |
| `test_me_requires_authentication` (45-50) | exact error envelope `{"error": {"code": "unauthorized", "message": "Not authenticated", "details": None}}` |
| `test_me_returns_current_user` (53-58) | cookie session works |
| `test_refresh_rotates_token` (61-72) | new cookie value; 2 rows in `refresh_tokens`, exactly 1 unrevoked |
| `test_refresh_without_cookie_is_rejected` (75-76) | 401 |
| `test_logout_revokes_refresh_token` (79-86) | after logout, re-setting the old refresh cookie still fails |
| `test_deactivated_user_loses_access_immediately` (89-98) | flipping `is_active` in DB → next `/me` is 401 |
| `test_change_password` (101-115) | wrong current → 400; correct → 200; can log in with new password |

## `backend/tests/test_users.py` (108 lines)

`NEW_STAFF` (11-17) uses mixed-case email and local phone to test normalisation. Tests: non-admins get
403 (parametrised over dentist/receptionist), admin creates staff (email lower-cased, phone `+880…`),
duplicate email → 409 `email_taken`, invalid phone + short password → 422 with fields `{phone,
password}`, pagination (`total` 3, `page_size` 2, 2 items), deactivate + reset password + activate →
login with new password, admin can't deactivate self (`self_deactivate`), last admin can't be demoted
(`last_admin`), unknown user → 404.

## `backend/tests/test_prescriptions.py` (376 lines)

### Fixtures and helpers (1-113)
- `EXTRACTED` (17-43): realistic model output including a **blank procedure** `"  "` and a **nameless
  medicine** to test sanitising; `uncertain_fields: ["medications.0.duration"]`.
- `_photo()` (46-49): an 800×1100 white PNG generated in memory with Pillow.
- `storage` (52-55, autouse): `_storage_root` → `tmp_path`.
- `background_session` (58-61, autouse): `new_session` → `contextlib.nullcontext(db)` so the background
  task shares the test transaction.
- `extraction` (64-78): stub `extract` with call counting and a JPEG-magic-bytes assertion.
- `_scan` (81-85): multipart upload of N pages; `_scanned` (88-93): scan, assert `reading` true, GET the
  finished draft; `_save_body(**overrides)` (96-113): a valid PUT body.

### Tests (116-376)

| Test | Behaviour verified |
|---|---|
| `test_assistant_scans_but_only_a_dentist_files` | receptionist: scan 201, save 403, re-read 200; dentist: save → confirmed |
| `test_assistant_can_discard_drafts_only` | receptionist deletes a draft (204) but not a filed one (403) |
| `test_pages_are_read_together` | 3 pages → 1 extract call with 3 images, 3 files, page 3 served, page 4 → 404, delete removes files |
| `test_too_many_pages_are_rejected` | 7 pages → 400 `too_many_pages`, no extract call |
| `test_scan_creates_a_cleaned_up_draft` | fields applied, blanks dropped, raw `uncertain_fields` kept, image served as JPEG |
| `test_failed_read_still_keeps_the_photo` | error stored; re-read succeeds and clears it |
| `test_non_image_upload_is_rejected` | fake PDF → 400 `invalid_image` |
| `test_saving_files_the_prescription_under_a_new_patient` | confirmed, code kept, confirmed_by = dentist; patient searchable, phone normalised, visit stats; history list |
| `test_next_scan_suggests_the_existing_patient` | all three match reasons; filing to existing patient → visit_count 2 |
| `test_duplicate_patient_code_is_rejected` | 409 `patient_code_taken` |
| `test_patient_code_is_generated_when_missing` | code starts with `P-` |
| `test_save_validation` (parametrised) | follow-up before visit; no patient choice → 422 messages |
| `test_only_admin_deletes_filed_prescriptions` | dentist 403 on filed, 204 on draft, files cleaned |
| `test_interrupted_read_can_be_retried` | backdated `reading_started_at` → interrupted message; re-read starts |
| `test_draft_cannot_be_filed_while_reading` | 400 `still_reading` |
| `test_filed_prescription_downloads_as_pdf` | draft → 400; filed with Bangla advice → PDF bytes, filename header |
| `test_admin_deletes_a_patient_with_their_prescriptions` | dentist 403; admin 204; patient + prescription 404; files gone |

## Q&A

**Q:** 🟢 Why do tests use a real Postgres instead of SQLite?

**A:** The code relies on Postgres features (`similarity()`, JSONB, enums, sequences, `FILTER`); SQLite
can't run them, and mocks wouldn't catch SQL mistakes.

**Q:** 🟡 How can services call `db.commit()` without the test data persisting?

**A:** The test Session is bound to a connection with an open outer transaction and uses
`join_transaction_mode="create_savepoint"`; `commit()` only releases a savepoint, and the outer
transaction is rolled back after the test (`conftest.py:50-60`).

**Q:** 🟡 How is the Gemini call avoided in tests?

**A:** The `extraction` fixture monkeypatches `extraction_service.extract` with a fake returning
`EXTRACTED` or raising `ExtractionError` (`test_prescriptions.py:64-78`).

**Q:** 🔴 Background tasks run "after the response" — how does `_scanned` see the result?

**A:** Starlette's `TestClient` runs background tasks synchronously before returning the response to
the test, and `new_session` is patched to reuse the test session, so the next GET sees the applied
fields.

**Q:** 🟡 How does `test_interrupted_read_can_be_retried` avoid sleeping 5 minutes?

**A:** It sets `reading_started_at` to `created_at - READING_TIMEOUT` directly in the DB
(`test_prescriptions.py:326-328`) — manipulate state instead of waiting.

**Q:** 🔴 What's dangerous about the `engine` fixture?

**A:** `DROP SCHEMA public CASCADE` on whatever `TEST_DATABASE_URL` points to. A misconfigured env var
could wipe a real DB. Add a guard (e.g. require the DB name to end in `_test`).

**Q:** 🟢 What does `@pytest.mark.parametrize` do in `test_save_validation`?

**A:** Runs the same test twice with different `(overrides, message)` pairs, each reported separately.

**Q:** 🟡 What important behaviours are *not* tested?

**A:** Refresh-token reuse detection after the grace window, CORS, the real Gemini integration, patient
PATCH/search edge cases, concurrent saves, and the frontend permission/UI flows.
