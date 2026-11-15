# Root Record — Project Interview Kit

## 1. Explanation scripts

### 30-second version

"Root Record is a patient-records web app for a dental clinic in Bangladesh. Dentists keep writing
prescriptions on paper; an assistant photographs them, and the app uses Google Gemini's vision model
to read the handwriting into structured fields — patient, diagnosis, treatment, medicines, follow-up.
A dentist reviews the draft next to the photo before it's filed, so the AI never writes to a medical
record on its own. It's React and TypeScript on the front, FastAPI and PostgreSQL on the back, all in
Docker."

### 2-minute version

"The problem: small clinics keep paper prescriptions, so there's no searchable history and no way to
send follow-up reminders. Typing everything in is too slow for dentists.

The workflow is: scan, read, review, record, share. On the scan page, staff take up to six photos;
the browser shrinks them to about a megabyte and uploads them together. The FastAPI backend validates
and re-encodes the images with Pillow, stores them, creates a draft and returns immediately. A
background task sends all pages to Gemini with a strict JSON schema and a domain-specific prompt —
things like converting Palmer tooth notation to FDI numbers and keeping dose patterns like 1+0+1 as
written. The model also lists fields it wasn't sure about.

The review page polls until reading finishes, then shows the photo beside a pre-filled form with
'Check' badges on uncertain fields and suggested existing patients matched by ID, phone or fuzzy name
using Postgres trigram similarity. Only dentists and admins can save, which links the prescription to a
patient. Filed prescriptions can be shared as a typed PDF — including Bangla — straight to WhatsApp
from a phone.

Under the hood: cookie-based JWT auth with refresh-token rotation and reuse detection, role checks as
FastAPI dependencies, TanStack Query for server state, React Hook Form with Zod for the big form, and
pytest integration tests against a real Postgres where each test runs in a rolled-back transaction."

### 5-minute version (structure)

1. **Problem & users (30 s)** — paper prescriptions, three staff roles, need for history and reminders.
2. **Workflow demo narrative (1 min)** — scan → background read → review with Check badges and patient
   matches → file → share PDF.
3. **Architecture (1 min)** — SPA → Vite proxy (same origin) → FastAPI routers → services → SQLAlchemy
   → Postgres; photos on a volume; Gemini in a background task; layered design (routers thin, services
   own transactions).
4. **Two deep dives (1.5 min)** —
   - *AI safety & UX:* schema-constrained output, sanitisation, raw output stored for audit,
     `reading_started_at` lease to recover from crashes, human-in-the-loop, graceful degradation when
     there's no key or network.
   - *Auth:* httpOnly SameSite cookies, 15-min access, 7-day rotating refresh tokens stored server-side,
     reuse detection with a grace window, single-flight refresh in the client, `is_active` checked
     every request.
5. **Quality (30 s)** — strict TypeScript, real-Postgres tests with savepoint rollback, stubbed Gemini,
   unit tests for form conversion and time-zone formatting.
6. **What I'd improve (30 s)** — durable task queue, rate limiting, audit log and soft deletes,
   production Docker setup, OpenAPI-generated types, fixing a permission mismatch I found on the scan
   route.

## 2. Top 30 follow-up questions

**Q:** Why did you use a background task instead of waiting for Gemini?

**A:** Reads take 15–40 seconds, longer with retries. Returning a draft immediately keeps the assistant
moving and avoids request timeouts. The UI polls every two seconds while `reading` is true
(`features/prescriptions/hooks.ts:35`), and the task runs after the response (`api/v1/prescriptions.py:32`).

**Q:** What happens if the server crashes during a read?

**A:** The draft keeps `reading_started_at`. After five minutes it's considered interrupted, the UI shows
"Reading was interrupted" with a Read again button (`prescription_service.py:37-38, 123-131`). Nothing is
lost because the photos were saved before reading started.

**Q:** How do you stop the AI from corrupting records?

**A:** The output is only ever a draft. It's schema-constrained, sanitised field by field, and a dentist
must save it (`ClinicalUser`). The raw output is stored separately for comparison.

**Q:** How do you handle uncertain readings?

**A:** The prompt tells the model to leave unreadable fields null and list them in `uncertain_fields`
using dotted paths; the UI turns those into Check badges (`form.ts:131-133`).

**Q:** How does patient matching work?

**A:** Three signals: same patient code, same normalised phone, trigram name similarity ≥ 0.35. Results
rank by number of signals; only ID/phone matches are pre-selected because names are ambiguous
(`patient_service.py:137-180`, `form.ts:59-66`).

**Q:** Why Postgres trigram search?

**A:** Handwritten names get misspelled ("Rahema" vs "Rahima"). `pg_trgm` measures similarity and a GIN
index speeds up `ILIKE` searches. I'd switch the `similarity()` predicate to the indexable `%` operator
at larger scale.

**Q:** Explain your authentication.

**A:** Argon2id password hashes; on login, a 15-minute access JWT and a 7-day refresh JWT in httpOnly,
SameSite=Lax cookies; the refresh cookie is path-scoped to `/api/v1/auth`. Refresh tokens are rows in the
DB, rotated on every use, and replaying an old one after a 30-second grace revokes all sessions.

**Q:** Why cookies and not localStorage?

**A:** JavaScript can't read httpOnly cookies, so XSS can't steal tokens. SameSite=Lax plus no
state-changing GETs handles CSRF; the API is same-origin through the proxy.

**Q:** How does the frontend handle expired tokens?

**A:** `sendAuthed` retries once after a single-flight refresh; concurrent 401s share one refresh
promise. If refresh fails it calls a registered handler that clears the cache and redirects to login
(`api/client.ts:100-130`, `App.tsx:89-95`).

**Q:** How are roles enforced?

**A:** FastAPI dependency aliases: `AdminUser`, `ScanUser`, `ClinicalUser` from a `require_roles` factory
(`deps.py:38-55`), plus service rules like "only admins delete filed prescriptions". The frontend
permission map only hides UI.

**Q:** How do you test this?

**A:** pytest integration tests against a real Postgres test DB. Migrations run once per session; each
test runs inside a transaction with savepoints so app commits work and everything rolls back. Gemini and
storage are monkeypatched. On the frontend, Vitest covers pure logic.

**Q:** Why real Postgres in tests?

**A:** The queries use Postgres features — trigram similarity, JSONB, enums, aggregate FILTER, sequences —
which SQLite can't run.

**Q:** How is the review form structured?

**A:** React Hook Form with a Zod schema of string fields; `toFormValues`/`toSaveInput` convert to and from
API shapes; `useFieldArray` for medicines; cross-field rules in `superRefine` (`form.ts`).

**Q:** Why remount the form with a `key`?

**A:** `useForm` reads `defaultValues` once. When reading finishes, the key `${id}:${reading}` changes, so
the form is recreated with the extracted values (`PrescriptionReviewPage.tsx:93-94`).

**Q:** How do you keep the patient list fast?

**A:** One query with an aggregated subquery joined to patients, paginated server-side to 20 rows, with
`keepPreviousData` on the client to avoid flicker.

**Q:** How do you avoid N+1 queries?

**A:** `joinedload(Prescription.patient)` in the list query, since summaries read the patient for each row
(`prescription_service.py:244`).

**Q:** How do you handle time zones?

**A:** Store UTC `timestamptz`; compute "today" in Asia/Dhaka on the server; format with `Intl` in Dhaka
time on the client; treat calendar dates as plain strings to avoid off-by-one-day bugs.

**Q:** What happens if two people edit the same thing?

**A:** Last write wins today. I'd add optimistic locking with a version column or `SELECT … FOR UPDATE`
when filing drafts.

**Q:** How are uploads secured?

**A:** Page and size limits, Pillow decode and re-encode (rejects non-images and decompression bombs,
strips metadata), server-generated file names, and photos served only through an authenticated endpoint.

**Q:** How is the PDF generated with Bangla?

**A:** fpdf2 with Noto Sans plus a Noto Sans Bengali fallback font and HarfBuzz text shaping so conjuncts
render correctly (`pdf_service.py:31-43`).

**Q:** Why FastAPI?

**A:** A JSON API for an SPA with uploads, cookies, role checks and an external AI call; FastAPI's
dependency injection and Pydantic validation make those concise and typed, and I get OpenAPI docs free.

**Q:** Why TanStack Query?

**A:** Almost everything is server state. Query gives caching, invalidation, cancellation and adaptive
polling — the "poll until read" UX is one option.

**Q:** What's the weakest part of the system?

**A:** Background tasks are in-process and not durable, and the read holds a DB transaction open during
the Gemini call. In production I'd use a task queue and split the session around the external call.

**Q:** What would you change for production?

**A:** Production Docker images (no reload, non-root, nginx serving the built SPA), TLS with secure
cookies, rate limiting on login, a forced first-login password change, audit logs, soft deletes, backups
for DB and photos, a paid Gemini tier with proper data terms.

**Q:** How would it scale to 100 clinics?

**A:** Multi-tenancy with `clinic_id` scoping or row-level security, object storage for photos, a queue
with workers for reads, multiple API replicas behind a load balancer, PgBouncer, monitoring and per-tenant
rate limits.

**Q:** What was the hardest bug?

**A:** See the STAR answer below — the session-reset loader hang and the refresh-race issues.

**Q:** Did you find any bugs while studying the code?

**A:** Yes: the scan route requires `clinical:edit` while the sidebar and backend allow receptionists to
scan, so receptionists see the link but get "no access" (`App.tsx:46` vs `nav.ts:28`,
`deps.py:50-53`). The fix is a one-word permission change in two places.

**Q:** How do you handle errors consistently?

**A:** Services raise domain errors with stable codes; one handler formats every error as
`{"error": {code, message, details}}`, including validation and unknown routes; the client parses it into
an `ApiError` and maps codes to fields (`core/errors.py`, `api/client.ts`).

**Q:** How did you make it work on phones?

**A:** Camera capture via `<input capture>`, in-browser resizing, responsive layout (drawer sidebar),
large touch targets, and native sharing with the Web Share API.

**Q:** What did you learn?

**A:** Designing AI features around human review and failure modes matters more than the model call; and
small details — single-flight refresh, time-zone-safe date formatting, path-scoped cookies — are what make
a system robust.

## 3. STAR answers

### Biggest technical challenge — making slow AI reading feel instant and safe

- **Situation:** Gemini takes 15–40 s per prescription, sometimes fails on the free tier, and its output
  can be wrong; assistants scan many prescriptions in a row.
- **Task:** Keep scanning fast, never lose photos, and never let unchecked AI output reach records.
- **Action:** Stored and validated photos first, returned a draft immediately, moved reading to a
  background task, added a `reading_started_at` lease with a 5-minute timeout for crash recovery,
  schema-constrained output with `uncertain_fields`, sanitisers, polling in the UI with an automatic
  form remount when reading completes, and dentist-only filing.
- **Result:** Assistants can scan the next prescription immediately; every failure mode degrades to a
  draft that can be re-read or typed by hand; tests cover failed, interrupted and in-progress reads.

### A bug fixed — the stuck loading screen after logout

- **Situation:** Clearing the query cache on logout (`queryClient.clear()`) left the auth guard spinning
  forever.
- **Task:** Reset the session without breaking the guard.
- **Action:** Diagnosed that `clear()` destroyed the active `['auth','me']` query the guard observed;
  replaced it with `resetSession`, which removes every other query and explicitly sets `me`
  (`features/auth/hooks.ts:9-17`), documented in a comment.
- **Result:** Login/logout/password change reliably redirect, and no previous user's data survives in the
  cache on shared clinic devices.

*(Framing tip: if this specific bug wasn't one you personally hit, say "a subtle issue the code guards
against is…" — be truthful about what you experienced.)*

### A trade-off made — in-process background tasks vs a task queue

- **Situation:** Reads needed to run asynchronously.
- **Task:** Choose between FastAPI BackgroundTasks and Celery/Redis.
- **Action:** Chose BackgroundTasks for zero extra infrastructure at single-clinic scale, and compensated
  for non-durability with a timestamp lease and a "Read again" action.
- **Result:** Simple deployment (three containers) with recoverable failures; clear upgrade path to a
  queue documented as the next step.

### What I learned

- Human-in-the-loop design and explicit failure states are the core of a trustworthy AI feature.
- Auth details (rotation, reuse detection, httpOnly path-scoped cookies, single-flight refresh) prevent
  real attacks and real bugs.
- Testing against the real database catches what mocks hide.

### What I'd do differently

- Start with OpenAPI-generated frontend types and a shared permission source to avoid drift (the scan
  permission mismatch).
- Use a task queue and object storage from the start if multi-clinic was on the roadmap.
- Add an audit log and soft deletes before handling real patient data, and component/E2E tests in CI.

## 4. Honest framing: building it with AI assistance

**How to say it (adapt to the truth):**

"I built Root Record with heavy AI assistance for writing code. What I want to show you is that I
understand it end to end: I've gone through every file, I can explain why each decision was made, where
it's weak, and how I'd change it. For example, I can walk you through the refresh-token rotation and why
the 30-second grace window exists, or why the review form remounts with a key — and I found a permission
bug on the scan route while reviewing it."

**Principles:**
- Don't hide it; interviewers increasingly expect AI-assisted development. Hiding it and then failing a
  deep question is far worse.
- Shift the focus to *judgement*: requirements, design trade-offs, reviewing generated code, testing,
  and debugging.
- Prove understanding with specifics (file names, line-level reasoning, failure modes, improvements).
- Show you can work without the assistant: be ready to whiteboard the auth flow, write the SQL for the
  patient list, or implement `debounce`/`require_roles` from scratch.
- Mention how you verified generated code: reading it, running tests, checking edge cases, fixing issues.

**Answers to "So did you really write this?"**

"I directed the design and used an AI assistant to produce much of the code, then reviewed, tested and
iterated on it. I'm comfortable defending every part — pick any file and I'll explain it."
