# Testing (pytest & Vitest) — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

## Concepts

**Q:** 🟢 Why write automated tests?

**A:** To catch regressions, document behaviour, and refactor safely without manual checking.

**Q:** 🟢 Unit vs integration vs E2E tests?

**A:** Unit: one function in isolation; integration: several parts together (API + DB); E2E: the whole system through a real browser.

**Q:** 🟢 What is the test pyramid?

**A:** Many fast unit tests, fewer integration tests, few slow E2E tests.

**Q:** 🟢 How does pytest discover tests?

**A:** Files `test_*.py`/`*_test.py`, functions `test_*`, classes `Test*`, under `testpaths` (`pyproject.toml:2`).

**Q:** 🟢 Why plain `assert` in pytest?

**A:** pytest rewrites asserts to show detailed diffs on failure — no `assertEqual` needed.

**Q:** 🟢 What is a fixture?

**A:** A function providing setup (and teardown via `yield`) that tests request by parameter name (`conftest.py`).

**Q:** 🟢 What is `conftest.py`?

**A:** A file whose fixtures are automatically available to tests in its directory (`backend/tests/conftest.py`).

**Q:** 🟢 What is `@pytest.mark.parametrize`?

**A:** Runs a test for each set of arguments (`test_users.py:20-26`).

**Q:** 🟢 What is `tmp_path`?

**A:** A built-in fixture giving a unique temporary directory per test (`test_prescriptions.py:53`).

**Q:** 🟢 What is Vitest?

**A:** A Vite-native, Jest-compatible test runner for JS/TS (`package.json:10`).

**Q:** 🟢 `describe`, `it`, `expect`?

**A:** Group tests, define a test, and assert with matchers (`format.test.ts:6-17`).

**Q:** 🟢 `toBe` vs `toEqual`?

**A:** `toBe` uses `Object.is` (same primitive/reference); `toEqual` checks deep equality.

**Q:** 🟢 What is `toMatchObject`?

**A:** Asserts an object contains a subset of properties (`form.test.ts:45`).

**Q:** 🟢 What is `it.each`?

**A:** Parametrised tests in Vitest/Jest (`format.test.ts:33-41`).

**Q:** 🟡 What are fixture scopes?

**A:** `function` (default), `class`, `module`, `package`, `session` — how long a fixture instance lives. `engine` is session-scoped (`conftest.py:35`).

**Q:** 🟡 What is an autouse fixture?

**A:** Applied to every test in scope without being requested — storage and background-session patches (`test_prescriptions.py:52, 58`).

**Q:** 🟡 What is a factory fixture?

**A:** A fixture returning a function to create objects with custom args — `make_user`, `as_role` (`conftest.py:74-110`).

**Q:** 🟡 What is monkeypatching?

**A:** Temporarily replacing attributes during a test (`monkeypatch.setattr(module, "fn", fake)`), automatically undone afterwards.

**Q:** 🟡 Mock vs stub vs fake vs spy?

**A:** Stub returns canned data; fake is a working simplified implementation; mock verifies interactions; spy records calls on a real object. `fake_extract` stubs data and counts calls.

**Q:** 🟡 Why patch `extraction_service.extract` and not import it into the test target?

**A:** The service calls it via the module attribute (`extraction_service.extract`), so patching the module attribute replaces what it calls.

**Q:** 🟡 How are DB tests isolated here?

**A:** Each test runs in an outer transaction rolled back afterwards, with app commits turned into savepoints (`conftest.py:50-60`).

**Q:** 🟡 Why test against real Postgres?

**A:** The code relies on Postgres-specific SQL (pg_trgm, JSONB, enums, FILTER, sequences).

**Q:** 🟡 How does the test client authenticate?

**A:** It logs in via `/auth/login`; `TestClient` keeps cookies like a browser (`conftest.py:94-96`).

**Q:** 🟡 What does `app.dependency_overrides` provide in tests?

**A:** A way to swap FastAPI dependencies (the DB session) with test versions (`conftest.py:65`).

**Q:** 🟡 How are migrations exercised in tests?

**A:** The session fixture recreates the schema and runs `alembic upgrade head` (`conftest.py:40-45`).

**Q:** 🟡 How do background tasks behave in TestClient?

**A:** They run synchronously after the response, before the client returns — so the next request sees their effects.

**Q:** 🟡 How do you test time-dependent logic without sleeping?

**A:** Manipulate stored timestamps (backdating `reading_started_at`, `test_prescriptions.py:326-328`) or inject a clock.

**Q:** 🟡 Why assert error *codes* instead of messages?

**A:** Codes are stable contracts; messages may be reworded (`res.json()["error"]["code"] == "too_many_pages"`).

**Q:** 🟡 What does `assert res.status_code == 201, res.text` add?

**A:** The response body in the failure message for debugging (`test_prescriptions.py:91`).

**Q:** 🟡 What is test coverage?

**A:** The percentage of code executed by tests (`pytest-cov`, `vitest --coverage`); useful to find gaps, not a quality guarantee.

**Q:** 🟡 How would you test React components?

**A:** React Testing Library + jsdom: render, find by role/label, simulate events with `userEvent`, assert visible output; mock the API with MSW.

**Q:** 🟡 Why test pure functions like `toSaveInput`?

**A:** Fast, deterministic, no rendering needed; they hold the risky conversion logic (`form.test.ts:66-89`).

**Q:** 🔴 What's the risk in the `engine` fixture?

**A:** `DROP SCHEMA public CASCADE` on `TEST_DATABASE_URL`; a misconfiguration could wipe a real DB. Add a guard on the DB name.

**Q:** 🔴 What is property-based testing?

**A:** Generating many random inputs satisfying properties (Hypothesis / fast-check) — e.g. "normalising a phone twice equals once".

**Q:** 🔴 What are contract tests?

**A:** Tests ensuring a client and server agree on an API schema — e.g. comparing `api/types.ts` with `/openapi.json`.

**Q:** 🔴 What makes tests flaky and how do you fix it?

**A:** Time, randomness, order dependence, shared state, network. Fix with isolation (rollback), controlled clocks, seeded randomness, stubbing external calls.

**Q:** 🔴 How would you test the real Gemini integration?

**A:** A separate, opt-in eval suite with labelled sample images, run manually or nightly with a real key; measure field accuracy rather than exact equality.

## Project-specific

**Q:** 🟢 How do you run backend tests?

**A:** `docker compose exec backend pytest` (`README.md:78`).

**Q:** 🟢 How do you run frontend tests?

**A:** `docker compose exec frontend npm test` → `vitest run` (`README.md:87`).

**Q:** 🟡 What does `test_refresh_rotates_token` verify?

**A:** A new refresh cookie, two token rows for the user, exactly one unrevoked (`test_auth.py:61-72`).

**Q:** 🟡 What does `test_deactivated_user_loses_access_immediately` verify?

**A:** Flipping `is_active` makes the next `/auth/me` return 401 without re-login (`test_auth.py:89-98`).

**Q:** 🟡 What does `test_pages_are_read_together` verify?

**A:** Three pages → one extract call with three images, three stored files, page 4 is 404, deletion removes files (`test_prescriptions.py:145-160`).

**Q:** 🟡 What does `test_next_scan_suggests_the_existing_patient` verify?

**A:** Matching by ID, phone and similar name together, and filing to the existing patient increments visit count (`test_prescriptions.py:245-264`).

**Q:** 🟡 What does `form.test.ts` verify about pre-selection?

**A:** A "Similar name" match doesn't pre-select; "Same patient ID" does (`form.test.ts:49-64`).

**Q:** 🟡 What does the fake extractor assert about images?

**A:** Every page starts with JPEG magic bytes `FF D8` — proving re-encoding happened (`test_prescriptions.py:72`).

**Q:** 🟡 What does `format.test.ts` prove about time zones?

**A:** Formatting uses Asia/Dhaka regardless of machine zone: 20:30 UTC → next day 02:30 (`format.test.ts:20-30`).

**Q:** 🟡 How are users created in tests?

**A:** `make_user(role, **kwargs)` with unique emails and a shared password (`conftest.py:74-91`).

**Q:** 🔴 Which important behaviours lack tests?

**A:** Reuse detection beyond the grace window, concurrency races, PATCH patient, CORS, frontend components/routes (the scan permission bug), E2E flows.

**Q:** 🔴 How would you test the refresh-reuse logic?

**A:** Login, refresh (old token revoked), set `revoked_at` back by > 30 s in the DB, replay the old cookie → assert 401 and that all tokens are revoked.

## Predict / find the bug

**Q:** 🟡 Bug: tests pass alone but fail together.

**A:** Shared state leaks between tests (DB rows, monkeypatches, module caches); ensure rollback and isolation.

**Q:** 🟡 Bug: a test calls the real Gemini API.

**A:** Slow, costly, non-deterministic; stub `extraction_service.extract`.

**Q:** 🟡 Predict: `expect({ a: 1 }).toBe({ a: 1 })`

**A:** Fails — different object references; use `toEqual`.

**Q:** 🟡 Bug: `time.sleep(300)` to test a timeout.

**A:** Slow and flaky; manipulate timestamps or inject a clock.

**Q:** 🔴 Bug: a fixture monkeypatches `from app.services.extraction_service import extract` usage in another module.

**A:** If the consumer imported the function by name, patching the original module attribute doesn't affect the consumer's reference.

## Write-it-quickly

**Q:** 🟡 Write a pytest fixture yielding a temporary DB session rolled back after.

**A:**
```python
@pytest.fixture
def db(engine):
    conn = engine.connect(); trans = conn.begin()
    s = Session(bind=conn, join_transaction_mode="create_savepoint")
    try: yield s
    finally: s.close(); trans.rollback(); conn.close()
```

**Q:** 🟡 Write a parametrised test for invalid phones.

**A:** `@pytest.mark.parametrize("p", ["0121", "+1415"]) def test_bad(p): with pytest.raises(ValueError): normalize_bd_phone(p)`

**Q:** 🟡 Write a Vitest test for `formatDay`.

**A:** `it('formats', () => expect(formatDay('2026-10-08')).toBe('08/10/2026'))`

**Q:** 🟡 Stub a function with monkeypatch and count calls.

**A:** `calls = []; monkeypatch.setattr(mod, "fn", lambda *a: calls.append(a) or RESULT)`

**Q:** 🟡 Upload a file with TestClient.

**A:** `client.post("/api/v1/prescriptions/scan", files=[("files", ("rx.png", png_bytes, "image/png"))])` (`test_prescriptions.py:81-85`).

## Interview

**Q:** 🟡 pytest vs unittest?

**A:** pytest: fixtures, plain asserts, parametrisation, plugins; unittest: xUnit classes and assert methods.

**Q:** 🟡 Vitest vs Jest?

**A:** Vitest reuses Vite config, native ESM/TS, faster; Jest is older and widely used. Same API style.

**Q:** 🟡 What's TDD?

**A:** Test-Driven Development — write a failing test, make it pass, refactor.

**Q:** 🟡 What would a CI pipeline run for this repo?

**A:** Start Postgres service, `pytest`, `npm ci`, `npm run typecheck`, `npx eslint src`, `npm test`, build images.

**Q:** 🟡 What's the value of testing migrations?

**A:** Ensures the schema builds from scratch and matches what code expects; the fixture does this every run.

**Q:** 🟢 What is `pytest -k refresh -x -vv`?

**A:** Run tests matching "refresh", stop at first failure, very verbose output.
