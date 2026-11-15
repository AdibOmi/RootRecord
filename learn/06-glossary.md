# 06 — Glossary (A–Z)

One-sentence definitions of every term introduced in the course. 📍 points to where it appears in Root Record.

## A
- **AbortController / AbortSignal** — browser API to cancel a fetch; the promise rejects with `AbortError`. 📍 `api/client.ts:73-76`
- **ACID** — Atomicity, Consistency, Isolation, Durability: guarantees of database transactions.
- **Active Record** — ORM pattern where objects save themselves (contrast: Data Mapper).
- **AfterValidator** — Pydantic validator run after type validation that may transform the value. 📍 `core/validators.py:23`
- **Alembic** — SQLAlchemy's migration tool for versioned schema changes. 📍 `backend/alembic/`
- **Annotated** — typing construct attaching metadata (validators, `Depends`) to a type. 📍 `api/deps.py:18`
- **any / unknown / never** — TS types: unchecked; must-narrow; impossible.
- **API (REST)** — HTTP interface of resources and methods the frontend calls. 📍 `/api/v1/*`
- **App factory** — building the app in a function (`create_app`). 📍 `main.py:11`
- **Argon2id** — memory-hard password hashing algorithm. 📍 `core/security.py:12`
- **ARIA** — attributes (`aria-invalid`, `role`, `aria-live`) that describe UI to assistive technology.
- **as const** — TS assertion making literals read-only and narrow. 📍 `features/auth/hooks.ts:7`
- **ASGI** — async Python server/app interface (Uvicorn ↔ FastAPI).
- **asChild / Slot** — Radix composition rendering a child element with merged props. 📍 `ui/button.tsx:39`
- **async/await** — syntax for writing promise/coroutine-based code sequentially.
- **Audit log** — append-only record of who did what and when (not yet implemented).
- **Authentication (AuthN)** — verifying identity. **Authorization (AuthZ)** — deciding permissions.
- **Automatic batching** — React 18 grouping multiple state updates into one render.

## B
- **Backpressure** — slowing a producer when a consumer can't keep up (streams).
- **BackgroundTasks** — FastAPI/Starlette tasks run after the response. 📍 `prescriptions.py:32`
- **BaseModel** — Pydantic's base class for schemas.
- **BaseSettings** — pydantic-settings model loaded from env vars. 📍 `core/config.py:10`
- **Bind mount** — mounting a host folder into a container. 📍 `docker-compose.yml:35`
- **Blob / File** — browser binary data / Blob with name. 📍 `SharePrescription.tsx:44`
- **B-tree index** — default balanced-tree index for equality, ranges and sorting.
- **btree_gist** — extension letting GiST indexes include scalar columns (for exclusion constraints). 📍 `0001:24`

## C
- **Cache-Control** — HTTP header governing caching. 📍 `prescriptions.py:68, 93`
- **Cascade** — automatic propagation of deletes (DB `ON DELETE CASCADE` or ORM cascade). 📍 `models/user.py:30-32, 40`
- **CHECK constraint** — per-row boolean rule enforced by the DB.
- **Closure** — function plus captured variables of its creation scope. 📍 `api/deps.py:38-46`, `client.ts:43-48`
- **cn()** — helper merging class names (clsx + tailwind-merge). 📍 `lib/utils.ts:4-6`
- **Coercion (Pydantic lax mode)** — converting compatible inputs (`"34"` → 34).
- **Commit (DB)** — make a transaction permanent. **Commit (Git)** — snapshot in history.
- **Composite index** — index over several columns (leftmost-prefix rule).
- **Conditional type** — TS type-level `A extends B ? X : Y`.
- **Connection pool** — reusable DB connections. 📍 `core/db.py:8`
- **Container / Image** — isolated running process / its read-only template.
- **Context (React)** — passing values through the tree without props.
- **Context manager** — Python object used with `with` for guaranteed cleanup.
- **Controlled / uncontrolled input** — value from React state / from the DOM.
- **CORS** — browser mechanism allowing cross-origin reads via response headers. 📍 `main.py:22-29`
- **CSRF** — forged cross-site requests using the victim's cookies.
- **CSP (Content Security Policy)** — header restricting script/style sources.
- **CSS custom properties** — CSS variables (`--primary`). 📍 `index.css:8-40`
- **CTE** — `WITH` named subquery.
- **cva** — class-variance-authority, variant-based class builder. 📍 `ui/button.tsx:7`

## D
- **Data Mapper** — ORM pattern where a session persists plain objects (SQLAlchemy).
- **Dataclass** — `@dataclass` auto-generated record class. 📍 `auth_service.py:26`
- **Debounce** — run after input stops for N ms. 📍 `PatientsPage.tsx:25-30`
- **Decompression bomb** — tiny image expanding to huge pixel counts. 📍 `prescription_service.py:65`
- **Decorator** — function wrapping another function/class (`@lru_cache`).
- **Declarative base** — SQLAlchemy base for mapped classes. 📍 `models/base.py:16`
- **Dependency injection (Depends)** — framework supplies a function's dependencies. 📍 `api/deps.py`
- **Dependency factory** — function returning a configured dependency (`require_roles`).
- **Derived state** — values computed from props/state during render.
- **Discriminated union** — union with a shared literal tag property.
- **Docker Compose** — multi-container definitions in YAML. 📍 `docker-compose.yml`
- **Draft / Confirmed** — prescription statuses: AI-read awaiting review / dentist-filed. 📍 `models/patient.py:20-24`

## E
- **Eager loading** — loading relationships upfront (`joinedload`, `selectinload`).
- **Effect (useEffect)** — post-render synchronisation with external systems.
- **Engine (SQLAlchemy)** — DB URL + pool entry point.
- **Entrypoint** — script run when a container starts. 📍 `backend/entrypoint.sh`
- **Enum (Postgres)** — custom type with fixed labels. 📍 `0001:18`
- **Error boundary** — React component catching render errors below it.
- **ES modules (ESM)** — standard `import`/`export` module system.
- **Event loop** — runtime loop running tasks and microtasks (JS) or coroutines (asyncio).
- **EXIF** — photo metadata incl. orientation. 📍 `lib/image.ts:11`, `prescription_service.py:60`
- **exclude_unset** — Pydantic dump of only client-provided fields (PATCH). 📍 `user_service.py:79`
- **Exclusion constraint** — Postgres constraint forbidding conflicting rows (e.g. overlapping ranges).
- **expire_on_commit** — SQLAlchemy option to expire attributes after commit (disabled here). 📍 `core/db.py:9`
- **Extraction** — turning a prescription photo into structured JSON with Gemini. 📍 `extraction_service.py`

## F
- **Fallback font** — font used for glyphs missing in the main font (Bangla). 📍 `pdf_service.py:41`
- **FDI notation** — two-digit international tooth numbering (11–48, 51–85).
- **Feature detection** — checking an API exists before using it. 📍 `SharePrescription.tsx:34`
- **Fiber** — React's internal unit of work enabling concurrent rendering.
- **Fixture (pytest)** — injected test setup/teardown. 📍 `tests/conftest.py`
- **Flat config** — ESLint 9's array-based `eslint.config.js`.
- **Flush** — send pending ORM SQL without committing. 📍 `patient_service.py:105`
- **Foreign key** — column referencing another table's key.
- **FormData** — multipart request body with files. 📍 `api/prescriptions.ts:20-21`
- **Fragment** — `<>…</>` grouping without a DOM node.

## G
- **Generator** — function with `yield` producing values lazily. 📍 `core/db.py:12-14`
- **Generics** — type parameters (`Page<T>`, `request<T>`, `Generic[T]`).
- **GIL** — CPython lock allowing one thread to run bytecode at a time.
- **GIN index** — inverted index for JSONB, arrays, trigrams, full text. 📍 `0002:53-55`
- **Graceful degradation** — features fail into a usable fallback (manual entry).

## H
- **Hallucination** — confident but false model output.
- **HarfBuzz** — text shaping engine for complex scripts. 📍 `pdf_service.py:42`
- **Healthcheck** — command judging container health. 📍 `docker-compose.yml:15-19`
- **HMR / Fast Refresh** — swapping changed modules/components without reload.
- **Hoisting** — declarations processed before execution.
- **HS256** — HMAC-SHA256 JWT signature with a shared secret.
- **httpOnly cookie** — cookie unreadable by JavaScript. 📍 `auth.py:24`
- **Human-in-the-loop** — a person approves AI output before it takes effect.

## I
- **Idempotent** — repeating has the same effect as once (GET/PUT/DELETE).
- **Identity map** — one object per row per Session.
- **IDOR** — accessing others' resources by changing ids.
- **ILIKE** — case-insensitive LIKE in Postgres.
- **Immutability** — creating new values instead of mutating (React state).
- **Index route** — route rendered at its parent's exact path. 📍 `App.tsx:42`
- **Intl** — browser/Node internationalisation APIs (number/date formatting). 📍 `lib/format.ts`
- **Isolation level** — how concurrent transactions see each other (Read Committed default).

## J
- **JSONB** — binary, indexable JSON column type. 📍 `models/patient.py:63-73`
- **JSON Schema** — standard describing JSON shapes; used for Gemini output. 📍 `extraction_service.py:27-84`
- **jti** — JWT id claim; here the refresh token row id. 📍 `models/user.py:36`
- **JSX** — HTML-like syntax compiling to React element calls.
- **JWT** — signed token `header.payload.signature` with claims. 📍 `core/security.py`

## K
- **Key (React)** — stable identity for list items; changing it remounts. 📍 `PrescriptionReviewPage.tsx:94`
- **keepPreviousData** — TanStack option to show old data while new loads. 📍 `features/patients/hooks.ts:15`
- **Keyset pagination** — paging via `WHERE key < last` instead of OFFSET.
- **keyof / typeof (TS types)** — union of keys / type of a value.

## L
- **Layer caching** — Docker reuse of unchanged build layers.
- **Layout route** — parent route rendering shared UI and `<Outlet/>`. 📍 `AppShell.tsx`
- **Lazy loading (ORM)** — load relationships on first access.
- **Lease** — time-limited claim (`reading_started_at`) used to detect stale work. 📍 `prescription_service.py:123-125`
- **libuv** — Node's async I/O library and thread pool.
- **Lifespan** — FastAPI startup/shutdown context.
- **Lifting state** — moving state to a common parent.
- **Literal type** — exact-value type (`'admin'`, `Literal["access"]`).
- **LLM** — large language model.
- **Lockfile** — exact dependency versions (`package-lock.json`).
- **lru_cache** — memoisation decorator. 📍 `config.py:58`

## M
- **manualChunks** — Rollup option splitting vendor code into chunks. 📍 `vite.config.ts:28-38`
- **Mapped / mapped_column** — SQLAlchemy 2.0 typed column declarations.
- **Mapped type** — TS `{ [K in keyof T]: … }`.
- **Microtask / macrotask** — promise callbacks / timers & events in the event loop.
- **Middleware** — code wrapping every request/response.
- **Migration** — versioned DB schema change.
- **Mixin** — class adding columns/behaviour via inheritance. 📍 `models/base.py:21-31`
- **Monkeypatch** — replacing attributes during tests. 📍 `test_prescriptions.py:54, 61, 77`
- **Multi-stage build** — Dockerfile with build and runtime stages.
- **Multimodal** — model accepting images and text.
- **MVCC** — multi-version concurrency control in Postgres.

## N
- **N+1 problem** — one query per parent row for related data.
- **Naming convention** — templates for constraint names. 📍 `models/base.py:7-13`
- **Narrowing** — refining a union type via checks.
- **noUncheckedIndexedAccess** — TS flag making indexing return `T | undefined`. 📍 `tsconfig.app.json:19`
- **Normalization** — structuring tables to avoid redundancy (1NF–3NF).
- **npm ci** — exact, clean install from the lockfile.
- **Nullish coalescing (`??`)** — fallback only for null/undefined.

## O
- **Object URL** — temporary `blob:` URL for in-memory data. 📍 `ScanPage.tsx:49`
- **OFFSET pagination** — skipping rows with OFFSET/LIMIT.
- **OKLCH** — perceptually uniform color space. 📍 `index.css`
- **OpenAPI** — machine-readable API description (`/openapi.json`).
- **Optimistic update** — updating UI before server confirmation.
- **Optional chaining (`?.`)** — safe property access on null/undefined.
- **ORM** — object-relational mapper.
- **Outlet** — where child routes render.
- **OWASP Top 10** — list of common web security risks.

## P
- **Palmer notation** — dental quadrant shorthand for tooth numbers. 📍 `extraction_service.py:99-105`
- **Partial index** — index over a subset of rows.
- **Path params / search params** — URL segments vs query string.
- **pg_trgm** — trigram similarity extension. 📍 `0001:23`
- **Polling** — repeatedly requesting state on an interval. 📍 `features/prescriptions/hooks.ts:17-18, 35`
- **Portal** — rendering React children into another DOM node.
- **Preflight** — browser `OPTIONS` check before non-simple CORS requests.
- **Primary key** — unique row identifier.
- **Prompt injection** — input text attempting to override model instructions.
- **Promise** — object representing a future value.
- **Props** — inputs passed to React components.
- **Prototype chain** — JS inheritance via linked objects.

## Q
- **Query key** — cache identifier in TanStack Query. 📍 `features/patients/hooks.ts:13`
- **QueuePool** — SQLAlchemy's default connection pool.

## R
- **Race condition** — outcome depends on timing of concurrent operations (check-then-insert).
- **Radix UI** — headless accessible React primitives.
- **Rate limiting** — capping requests per client/time.
- **RBAC** — role-based access control. 📍 `api/deps.py:49-55`
- **Reconciliation** — React diffing old vs new element trees.
- **Refresh token rotation / reuse detection** — new refresh token per use; replay of old ones revokes all. 📍 `auth_service.py:66-93`
- **refetchInterval** — TanStack polling option.
- **Resolver** — RHF adapter for schema validation (`zodResolver`).
- **response_model** — FastAPI output schema filter.
- **REST** — resource-oriented HTTP API style.
- **Rules of Hooks** — call hooks at top level, in components/hooks only.

## S
- **SameSite** — cookie attribute limiting cross-site sending (Lax/Strict/None).
- **Sanitisation** — cleaning untrusted values (trim, cap, validate). 📍 `prescription_service.py:74-107`
- **Sargable** — predicate that can use an index.
- **satisfies** — TS operator checking a type without widening. 📍 `lib/permissions.ts:26`
- **Savepoint** — nested transaction checkpoint. 📍 `conftest.py:54`
- **Secure context** — HTTPS/localhost page enabling powerful APIs.
- **SemVer** — MAJOR.MINOR.PATCH versioning.
- **Sequence** — DB counter object (`nextval`). 📍 `0002:36`
- **Session (SQLAlchemy)** — unit of work and transaction scope.
- **shadcn/ui** — copy-in components built on Radix + Tailwind.
- **Single-flight** — concurrent callers share one in-flight operation. 📍 `client.ts:101-111`
- **SPA** — single-page application.
- **SPA fallback** — server returns `index.html` for client routes.
- **SQL injection** — executing attacker SQL; prevented by bound parameters.
- **Stale closure** — callback using outdated captured values.
- **staleTime / gcTime** — freshness duration / unused-cache lifetime.
- **Starlette** — ASGI toolkit beneath FastAPI.
- **StrEnum** — Python enum whose members are strings. 📍 `models/user.py:11`
- **StrictMode** — React dev mode double-invoking renders/effects.
- **Structural typing** — TS compatibility by shape.
- **Structured output** — LLM response constrained to a JSON schema.
- **superRefine** — Zod custom validation adding multiple issues. 📍 `form.ts:40-47`
- **Synthetic events** — React's wrapped DOM events.

## T
- **Tailwind CSS** — utility-first CSS framework. 📍 `index.css`
- **TDZ** — temporal dead zone for `let`/`const`.
- **Template literal** — backtick string with `${}` interpolation.
- **TestClient** — in-process FastAPI test client.
- **Text shaping** — positioning glyphs for complex scripts.
- **thumbnail (Pillow)** — in-place downscale keeping aspect ratio.
- **timestamptz** — Postgres timestamp with time zone (UTC instant).
- **Token (LLM)** — unit of model input/output for limits and billing.
- **Transaction** — atomic group of DB operations.
- **Tree shaking** — removing unused exports from bundles.
- **Trigram** — 3-character substring used for fuzzy matching.
- **Twelve-Factor App** — methodology incl. config in environment.
- **Type assertion (`as`) / non-null assertion (`!`)** — telling TS to trust you.
- **Type hints** — Python annotations used by tools and frameworks.

## U
- **Union type** — value of one of several types.
- **Unit of work** — Session batching changes until flush/commit.
- **UploadFile** — FastAPI uploaded file wrapper. 📍 `prescriptions.py:20`
- **useFieldArray** — RHF hook for dynamic lists. 📍 `PrescriptionReviewPage.tsx:611`
- **User enumeration** — discovering accounts via different responses/timing.
- **UUID** — 128-bit unique id used as primary keys.
- **Uvicorn** — ASGI server.

## V
- **values_callable** — SQLAlchemy Enum option to store enum values. 📍 `models/patient.py:28`
- **VariantProps** — cva type for variant props.
- **Virtual DOM** — in-memory element tree React diffs.
- **Virtual environment** — isolated Python install per project.
- **Vite** — dev server + Rollup bundler.
- **Volume (Docker)** — persistent Docker-managed storage. 📍 `pgdata`, `uploads`

## W
- **WAL** — Postgres write-ahead log for durability.
- **Web Share API** — `navigator.share` OS share sheet. 📍 `SharePrescription.tsx:47`
- **Window function** — aggregate over related rows without grouping (`OVER`).

## X–Z
- **XSS** — injected script in a page; mitigated by escaping and httpOnly cookies.
- **Zod** — TS-first schema validation library. 📍 `features/prescriptions/form.ts`
- **z.infer** — derive TS type from a Zod schema. 📍 `form.ts:49`
