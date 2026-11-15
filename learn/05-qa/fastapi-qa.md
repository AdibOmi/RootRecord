# FastAPI — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

## Definitions & concepts

**Q:** 🟢 What is FastAPI?

**A:** A Python web framework for APIs built on Starlette and Pydantic; it uses type hints for request parsing, validation, dependency injection, serialisation and automatic OpenAPI docs.

**Q:** 🟢 What is ASGI?

**A:** Asynchronous Server Gateway Interface — the async successor to WSGI defining how servers (Uvicorn) talk to apps (FastAPI), supporting HTTP, WebSockets and lifespan events.

**Q:** 🟢 What is Uvicorn?

**A:** A fast ASGI server; `uvicorn app.main:app --host 0.0.0.0 --port 8000` runs the API (`backend/Dockerfile:17`).

**Q:** 🟢 What is Starlette?

**A:** The lightweight ASGI toolkit FastAPI extends (routing, requests/responses, middleware, background tasks, TestClient).

**Q:** 🟢 What is a path operation?

**A:** A function decorated with an HTTP method and path, e.g. `@router.get("/{patient_id}")` (`patients.py:38`).

**Q:** 🟢 What is `APIRouter`?

**A:** A group of routes with a shared prefix/tags, included into the app or another router (`router.py:5-9`).

**Q:** 🟢 How are path parameters declared?

**A:** `{name}` in the path plus a typed function parameter: `def get_patient(patient_id: uuid.UUID)` — invalid UUIDs get 422 (`patients.py:39`).

**Q:** 🟢 How are query parameters declared?

**A:** Function parameters not in the path with simple types, optionally `Query(...)` for constraints: `q: str | None = Query(None, max_length=100)` (`patients.py:19`).

**Q:** 🟢 How is a JSON body declared?

**A:** A parameter typed as a Pydantic model: `body: PatientUpdate` (`patients.py:44`).

**Q:** 🟢 What is `response_model`?

**A:** The schema used to validate and filter the response — fields not in it (like `password_hash`) are dropped (`auth.py:45`).

**Q:** 🟢 How do you set a status code?

**A:** `status_code=status.HTTP_201_CREATED` in the decorator (`users.py:33`) or return a `Response` with a status.

**Q:** 🟢 Where are the docs?

**A:** Swagger UI at `/docs` and the schema at `/openapi.json` (`main.py:19-20`).

**Q:** 🟢 What does a 422 mean in FastAPI?

**A:** Request validation failed (path/query/body/cookie); here returned as `{"error": {"code": "validation_error", … details}}` (`errors.py:77-91`).

**Q:** 🟢 How do you read a cookie?

**A:** `rr_access: Annotated[str | None, Cookie()] = None` — parameter name matches the cookie name (`deps.py:23`).

**Q:** 🟢 How do you set a cookie?

**A:** Inject `response: Response` and call `response.set_cookie(...)` (`auth.py:18-37`).

**Q:** 🟢 How do you accept file uploads?

**A:** `files: Annotated[list[UploadFile], File()]` (requires `python-multipart`) (`prescriptions.py:20`).

**Q:** 🟢 What does `include_router` do?

**A:** Mounts a router's routes (with its prefix) into the app/router (`main.py:31`).

**Q:** 🟡 What is dependency injection in FastAPI?

**A:** Declaring `Depends(fn)` parameters; FastAPI calls `fn` (resolving its own dependencies), caches the result per request, injects it, and runs teardown for generator dependencies.

**Q:** 🟡 How are dependencies cached?

**A:** Within one request, the same dependency function is called once and its result reused for every parameter needing it (disable with `use_cache=False`).

**Q:** 🟡 What does `Annotated[Session, Depends(get_db)]` buy you?

**A:** A reusable alias `DB` so endpoints write `db: DB` — less repetition and type-checker-friendly (`deps.py:18`).

**Q:** 🟡 How do generator dependencies work?

**A:** Code before `yield` runs before the endpoint; code after (or the `with` exit) runs after the response — used for sessions (`core/db.py:12-14`).

**Q:** 🟡 What is a dependency factory?

**A:** A function returning a dependency configured by arguments: `require_roles(UserRole.ADMIN)` (`deps.py:38-46`).

**Q:** 🟡 How do you protect a route?

**A:** Add an auth dependency parameter: `_: AdminUser` or `user: ClinicalUser`; it raises 401/403 before the body runs (`users.py:18`).

**Q:** 🟡 How do you make a dependency apply to all routes of a router?

**A:** `APIRouter(dependencies=[Depends(auth)])` or `app.include_router(r, dependencies=[...])`.

**Q:** 🟡 What does `Depends()` with no argument do on a class?

**A:** Uses the class itself as the dependency — FastAPI inspects `__init__` params (`params: Annotated[PageParams, Depends()]`, `patients.py:18`).

**Q:** 🟡 Sync `def` vs `async def` endpoints?

**A:** `def` runs in a thread pool (safe for blocking I/O); `async def` runs on the event loop (must only await non-blocking I/O). This app uses `def` for all endpoints because SQLAlchemy is sync.

**Q:** 🟡 What happens if you call a blocking function in `async def`?

**A:** It blocks the event loop, stalling every concurrent request until it returns.

**Q:** 🟡 How big is the thread pool?

**A:** AnyIO's default capacity limiter is 40 threads — the max concurrent sync endpoints/background tasks.

**Q:** 🟡 What are BackgroundTasks?

**A:** Functions scheduled to run after the response is sent, in the same process: `background.add_task(fn, arg)` (`prescriptions.py:32`).

**Q:** 🟡 Why pass the prescription id instead of the ORM object to the background task?

**A:** The request's session closes after the response; the task opens its own session and reloads the row (`prescription_service.py:150-156`).

**Q:** 🟡 What are BackgroundTasks' limitations?

**A:** Not durable (lost on restart/crash), no retries, no scheduling, run in-process competing with requests, no visibility. Use Celery/RQ/Arq for important jobs.

**Q:** 🟡 How does this app survive lost background tasks?

**A:** A `reading_started_at` lease: after 5 minutes without completion, the draft shows "interrupted" and staff can re-read (`prescription_service.py:37-38, 123-131`).

**Q:** 🟡 How do custom exception handlers work?

**A:** `@app.exception_handler(ExcType)` registers a function returning a response for that exception (and subclasses) (`errors.py:71-107`).

**Q:** 🟡 Why have a domain `AppError` instead of raising `HTTPException` in services?

**A:** Services stay framework-agnostic and carry stable error codes; one handler formats all errors consistently.

**Q:** 🟡 How is validation error formatting customised?

**A:** A `RequestValidationError` handler converts `exc.errors()` to `{field, message}` pairs with dotted paths (`errors.py:77-91`).

**Q:** 🟡 What is middleware?

**A:** Code wrapping every request/response (`@app.middleware("http")` or `add_middleware(Class)`), e.g. CORS, GZip, logging, timing.

**Q:** 🟡 How is CORS configured?

**A:** `app.add_middleware(CORSMiddleware, allow_origins=[...], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])` — only when `CORS_ORIGINS` is set (`main.py:22-29`).

**Q:** 🟡 Why can't you use `allow_origins=["*"]` with credentials?

**A:** Browsers reject `Access-Control-Allow-Origin: *` when credentials are included; origins must be explicit.

**Q:** 🟡 How do you return a file?

**A:** `FileResponse(path, media_type=..., headers=...)` streams it (`prescriptions.py:68`).

**Q:** 🟡 How do you return raw bytes like a PDF?

**A:** `Response(content=bytes, media_type="application/pdf", headers={...})` (`prescriptions.py:88-95`).

**Q:** 🟡 What does `response_class=FileResponse` in the decorator do?

**A:** Documents the response type in OpenAPI and sets the default response class (`prescriptions.py:60`).

**Q:** 🟡 How are enums handled in query params?

**A:** A parameter typed as an Enum (`status: PrescriptionStatus | None`) only accepts its values; invalid → 422 (`prescriptions.py:41`).

**Q:** 🟡 How do you validate numeric query ranges?

**A:** `Query(20, ge=1, le=100)` (`schemas/common.py:26`).

**Q:** 🟡 How does FastAPI turn ORM objects into JSON?

**A:** Through `response_model` with `from_attributes=True` — Pydantic reads attributes, validates and serialises (`schemas/common.py:9-10`).

**Q:** 🟡 Why do some endpoints annotate `-> object`?

**A:** They return ORM objects that FastAPI converts via `response_model`; annotating the Pydantic type would make type checkers complain (`users.py:34`).

**Q:** 🟡 What is `dependency_overrides`?

**A:** A dict mapping dependencies to replacements, used in tests: `app.dependency_overrides[get_db] = lambda: db` (`conftest.py:65`).

**Q:** 🟡 What is `TestClient`?

**A:** An httpx-based client calling the ASGI app in-process, with cookie persistence — no running server needed (`conftest.py:66`).

**Q:** 🟡 What is the lifespan event?

**A:** An async context manager passed as `FastAPI(lifespan=...)` for startup/shutdown resources (DB pools, ML models, HTTP clients). Not used here.

**Q:** 🟡 What replaced `@app.on_event("startup")`?

**A:** The lifespan context manager (on_event is deprecated).

**Q:** 🟡 What is the app factory pattern?

**A:** Building the app in `create_app()` so tests/configs can create instances; `app = create_app()` exposes one (`main.py:11-35`).

**Q:** 🟡 How do you version an API?

**A:** URL prefix (`/api/v1`, `router.py:5`), headers, or media types; URL prefixes are simplest.

**Q:** 🟡 How does `UploadFile` store data?

**A:** In a `SpooledTemporaryFile`: memory up to a threshold, then disk; read via `file.file.read()` or `await file.read()`.

**Q:** 🔴 How do you limit upload size?

**A:** At the reverse proxy (body size limit), plus app checks: here each file is read up to `max+1` bytes and rejected if larger (`prescriptions.py:28-30`, `prescription_service.py:191-193`).

**Q:** 🔴 How does the request lifecycle flow?

**A:** Uvicorn → middleware stack → router matching → dependency resolution and validation → endpoint (thread pool if sync) → response model serialisation → middleware → client; then background tasks and generator teardowns.

**Q:** 🔴 How would you scale this API?

**A:** Multiple Uvicorn workers/replicas behind a load balancer, external task queue for Gemini reads, object storage for photos, a connection pooler (PgBouncer), and caching where useful.

**Q:** 🔴 What's the relationship between `Annotated` deps and OpenAPI security?

**A:** Plain `Cookie()` deps don't add security schemes to OpenAPI; using `fastapi.security.APIKeyCookie` would document cookie auth and enable Swagger's Authorize button.

**Q:** 🔴 How do you stream a large response?

**A:** `StreamingResponse(generator, media_type=...)` yields chunks without building the whole body in memory.

**Q:** 🔴 How do you add WebSockets?

**A:** `@app.websocket("/ws")` with `await ws.accept()`, `receive_*`/`send_*` — could push "reading finished" events instead of polling.

**Q:** 🔴 What does `exc.errors()` contain?

**A:** A list of dicts with `type`, `loc` (tuple path), `msg`, `input`, `ctx` — used to build field errors (`errors.py:79-87`).

**Q:** 🔴 How does FastAPI generate OpenAPI for `Page[T]`?

**A:** Pydantic creates a concrete schema per type parameter (`Page_PatientListItem_`), referenced by the endpoint's response schema.

## Predict / find the bug

**Q:** 🟢 What does `GET /api/v1/patients/not-a-uuid` return?

**A:** 422 validation error — `patient_id: uuid.UUID` can't parse it.

**Q:** 🟡 Bug: `async def get(db: DB): return db.query(...)` with sync SQLAlchemy.

**A:** Blocking DB calls on the event loop freeze the server; make it `def` or use async SQLAlchemy.

**Q:** 🟡 Bug: an endpoint returns the ORM `User` without `response_model`.

**A:** Might leak `password_hash` or fail to serialise; always declare a response model.

**Q:** 🟡 Predict: `GET /api/v1/users?page_size=500`

**A:** 422 — `page_size` has `le=100` (`schemas/common.py:26`).

**Q:** 🟡 Bug: `delete_cookie("rr_refresh")` doesn't log the user out.

**A:** The cookie was set with `path="/api/v1/auth"`; deletion must use the same path (`auth.py:42`).

**Q:** 🟡 Predict: calling `/auth/me` with an expired access cookie.

**A:** `decode_token` returns `None` → `Unauthorized()` → 401 `{"error": {"code": "unauthorized", …}}`.

**Q:** 🟡 Bug: a background task receives the request-scoped `db` session.

**A:** The session is closed after the response; the task must open its own (`prescription_service.py:155`).

**Q:** 🟡 Bug: query parameter named `status` while also using `fastapi.status` in the function.

**A:** The parameter shadows the module; rename and use `Query(alias="status")` (`prescriptions.py:41`).

**Q:** 🔴 Bug: CORS configured with `allow_origins=["*"], allow_credentials=True`.

**A:** Browsers won't accept it (and it would be unsafe); list explicit origins.

**Q:** 🔴 Predict: two dependencies both depend on `get_db`. How many sessions?

**A:** One per request (dependency caching).

## Scenarios

**Q:** 🟡 Add an endpoint only dentists and admins can call.

**A:** `@router.put("/{id}") def save(id: uuid.UUID, body: PrescriptionSave, db: DB, user: ClinicalUser): …` (`prescriptions.py:98-104`).

**Q:** 🟡 Add pagination to a new list endpoint.

**A:** `params: Annotated[PageParams, Depends()]`, count via subquery, `offset/limit`, return `Page[...]` (`users.py:15-30`).

**Q:** 🟡 A slow external API call makes requests take 40 s. Fix?

**A:** Return immediately, run the call in a background task/queue, store progress on the record, and let the client poll or subscribe (`prescriptions.py:18-33`).

**Q:** 🟡 How would you add request logging with timing?

**A:** An `@app.middleware("http")` that records `time.perf_counter()` around `await call_next(request)` and logs method, path, status, duration (without PHI).

**Q:** 🟡 How do you return consistent errors for 404 routes that don't exist?

**A:** Handle `StarletteHTTPException` and map status codes to codes (`errors.py:93-99`).

**Q:** 🔴 How would you add rate limiting to login?

**A:** `slowapi` (limits per IP/email), or a reverse-proxy limit; also exponential backoff/lockout after repeated failures, keyed in Redis.

**Q:** 🔴 How would you move Gemini reads to Celery?

**A:** Replace `background.add_task` with `read_prescription.delay(id)`; the worker calls the same service function with its own session; add retries with backoff; keep the `reading_started_at` lease for UI.

**Q:** 🟡 How do you test an endpoint that calls an external API?

**A:** Monkeypatch the service function or override a dependency providing the client; assert behaviour for success and failure (`test_prescriptions.py:64-78`).

**Q:** 🟡 How do you add a health/readiness check?

**A:** `/health` for liveness (exists, `router.py:12-14`), `/ready` running `SELECT 1` and checking storage.

**Q:** 🟡 How do you document an endpoint?

**A:** Docstrings, `summary`, `description`, `tags`, `response_model`, `responses={404: …}` — all appear in `/docs` (`prescriptions.py:22-26`).

## Write-it-quickly tasks

**Q:** 🟡 Write a dependency that returns the current user from a cookie.

**A:**
```python
def get_current_user(db: DB, rr_access: Annotated[str | None, Cookie()] = None) -> User:
    payload = decode_token(rr_access, "access") if rr_access else None
    if payload is None: raise Unauthorized()
    user = db.get(User, uuid.UUID(payload["sub"]))
    if user is None or not user.is_active: raise Unauthorized()
    return user
```

**Q:** 🟡 Write a role-check dependency factory.

**A:**
```python
def require_roles(*roles):
    def checker(user: CurrentUser) -> User:
        if user.role not in roles: raise Forbidden()
        return user
    return checker
```

**Q:** 🟡 Write an exception handler for a custom error.

**A:**
```python
@app.exception_handler(AppError)
async def h(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}})
```

**Q:** 🟡 Write an upload endpoint for multiple images.

**A:** `@router.post("/scan", status_code=201) def scan(files: Annotated[list[UploadFile], File()], user: ScanUser, db: DB): pages = [f.file.read(LIMIT + 1) for f in files]; …`

**Q:** 🟡 Write a lifespan that creates and closes an httpx client.

**A:**
```python
@asynccontextmanager
async def lifespan(app):
    app.state.http = httpx.AsyncClient(); yield; await app.state.http.aclose()
app = FastAPI(lifespan=lifespan)
```

**Q:** 🟡 Write a test overriding the DB dependency.

**A:** `app.dependency_overrides[get_db] = lambda: test_session; with TestClient(app) as c: assert c.get("/api/v1/health").json() == {"status": "ok"}`

## Real interview questions

**Q:** 🟡 FastAPI vs Flask?

**A:** FastAPI: type-hint validation, DI, async, OpenAPI out of the box; Flask: minimal sync core, extensions for everything.

**Q:** 🟡 FastAPI vs Django REST Framework?

**A:** FastAPI is lightweight and fast to write typed APIs; DRF sits on Django's ORM, admin, auth and ecosystem — more batteries, more weight.

**Q:** 🟡 Why is FastAPI "fast"?

**A:** Runs on Starlette/Uvicorn (uvloop, httptools) with Pydantic v2's Rust core — and fast to develop thanks to type-driven features.

**Q:** 🟡 How does FastAPI know where a parameter comes from?

**A:** Path template names → path; Pydantic models → body; `Cookie()/Header()/Query()/File()/Form()` markers → explicit; other simple types → query.

**Q:** 🟡 What's the difference between `Body`, `Form` and `File`?

**A:** JSON body field vs URL-encoded/multipart form field vs uploaded file part.

**Q:** 🟡 How do you handle authentication in FastAPI?

**A:** Dependencies: OAuth2PasswordBearer/HTTPBearer for headers or Cookie for cookies; verify JWT/session, load user, raise 401; authorization via role dependencies.

**Q:** 🟡 What is `HTTPException`?

**A:** FastAPI's exception carrying `status_code`, `detail`, `headers`; returns `{"detail": ...}` by default (customised here via the Starlette handler).

**Q:** 🟡 How does FastAPI support async DB access?

**A:** With async drivers/ORMs (SQLAlchemy `AsyncSession` + asyncpg/psycopg async, SQLModel async, Tortoise) used in `async def` endpoints.

**Q:** 🔴 When would you choose async endpoints for this project?

**A:** If most work were awaiting I/O with async libraries (async SQLAlchemy, async Gemini client), to handle many concurrent waits without threads. Current sync design is simpler and adequate at clinic scale.

**Q:** 🔴 How do you avoid N+1 queries when returning nested response models?

**A:** Eager-load relationships in the service query (`joinedload(Prescription.patient)`, `prescription_service.py:244`) before serialisation reads them.

**Q:** 🟢 What does `tags=["auth"]` do?

**A:** Groups endpoints in the docs (`auth.py:12`).

**Q:** 🟢 What does `prefix="/patients"` do?

**A:** Prepends the path to all routes of that router (`patients.py:11`).

**Q:** 🟡 Why is `/logout` unauthenticated?

**A:** Users with expired access tokens must still be able to log out; it only affects the caller's own refresh token (`auth.py:63-71`).

**Q:** 🟡 Why does `scan_prescription` call `check_page_count` before reading files?

**A:** Fail fast on bad requests (0 or > 6 files) without reading any bytes (`prescriptions.py:27`).

**Q:** 🟡 Why does the PDF endpoint check status?

**A:** Only dentist-confirmed prescriptions may be shared; drafts return 400 `not_filed` (`prescriptions.py:86-87`).

**Q:** 🟡 How does `extract_again` avoid double reads?

**A:** `start_reading` returns `False` if a read is already within its lease, so no second task is scheduled (`prescriptions.py:77-78`).

**Q:** 🟡 Where do business rules live in this API?

**A:** In services (`app/services/*`), keeping routers thin (`README.md:97`).

**Q:** 🔴 What would you change before production?

**A:** Remove `--reload`, multiple workers, durable task queue, rate limiting, secure cookies + HTTPS, readiness checks, structured logs without PHI, error monitoring (Sentry), proper CORS/hosts config.

**Q:** 🟡 What does `status.HTTP_204_NO_CONTENT` with `-> None` produce?

**A:** An empty response body with 204 (`patients.py:48-51`).

**Q:** 🟡 How do you get the client IP in FastAPI?

**A:** `request.client.host` (behind proxies use `X-Forwarded-For` with trusted proxy config, e.g. Uvicorn `--proxy-headers`).

**Q:** 🟡 How do you serve the OpenAPI JSON to generate a TS client?

**A:** Fetch `/openapi.json` and run a generator like `openapi-typescript` or `orval`.

**Q:** 🟡 How do you make a field optional in a PATCH body?

**A:** Default every field to `None` and use `model_dump(exclude_unset=True)` to apply only sent fields (`user_service.py:79`).

**Q:** 🟢 What HTTP method does saving a reviewed prescription use and why?

**A:** PUT — it replaces the prescription's reviewed content as a whole (`prescriptions.py:98`).

**Q:** 🟡 What runs in `entrypoint.sh` before the server starts?

**A:** `alembic upgrade head` and `python -m app.cli bootstrap-admin` (`entrypoint.sh:3-4`).
