# 07 — Cheatsheets (one page per technology)

<!-- cheat:javascript -->
## JavaScript cheatsheet

| Topic | Syntax / rule |
|---|---|
| Variables | `const` default, `let` when reassigning, avoid `var` |
| Equality | `===`; idiom `x != null` = not null/undefined |
| Falsy | `false 0 -0 0n '' null undefined NaN` |
| Fallbacks | `a ?? b` (null/undefined), `a \|\| b` (any falsy), `a ??= b` |
| Safe access | `a?.b`, `a?.[i]`, `fn?.()` |
| Destructure | `const { id = '' } = obj`, `const [a, b] = arr`, `{ icon: Icon }` |
| Spread / rest | `[...a, x]`, `{ ...o, k: v }`, `(...args) =>` |
| Arrays | `map filter reduce find findIndex some every includes slice Array.from` (non-mutating); `sort push splice` mutate |
| Async | `async function f() { try { return await p } catch (e) {} finally {} }` |
| Promises | `Promise.all / allSettled / race / any` |
| Event loop | sync → all microtasks (promises) → render → one macrotask (timers) |
| Classes | `class E extends Error { constructor(m) { super(m); this.name = 'E' } get x() {} }` |
| `this` | call-site; arrows inherit; `bind/call/apply` |
| Modules | `export const x`, `import { x } from './m'`, `import type { T }` |
| Timers | `const t = setTimeout(fn, ms); clearTimeout(t)` |
| Money | integers in minor units; `Math.round(x * 100)` |
| Dates | ISO date-only strings parse as UTC — split instead |
| Project anchors | single-flight refresh `client.ts:101-111`; debounce `PatientsPage.tsx:25-30`; `Promise.all` `ScanPage.tsx:64` |

<!-- cheat:typescript -->
## TypeScript cheatsheet

| Topic | Syntax |
|---|---|
| Object type | `interface User { id: string; phone: string \| null; nick?: string }` |
| Union / literal | `type Role = 'admin' \| 'dentist'` |
| Intersection | `A & B` |
| Generic | `function f<T>(x: T): T`, `interface Page<T> { items: T[] }` |
| Constraint | `<T extends { id: string }>` |
| Utilities | `Partial Required Readonly Pick Omit Record ReturnType Parameters NonNullable` |
| keyof/typeof | `type K = keyof typeof obj` |
| as const | `['a','b'] as const` → readonly tuple of literals |
| satisfies | `const m = {...} as const satisfies Record<string, Role[]>` |
| Narrowing | `typeof`, `instanceof`, `in`, `Array.isArray`, tag checks |
| Guards | `(x: unknown): x is T => …` |
| Mapped / conditional | `{ [K in keyof T]: … }`, `T extends U ? X : Y`, `infer` |
| Unsafe escapes | `as T`, `x!`, `any` (banned here) |
| React | `({ a }: Props)`, `useState<T \| null>(null)`, `useRef<HTMLInputElement>(null)`, `ReactNode` |
| Zod | `type V = z.infer<typeof schema>` |
| tsconfig flags | `strict`, `noUncheckedIndexedAccess`, `isolatedModules`, `moduleResolution: bundler`, `noEmit`, `paths` |
| Project anchors | `permissions.ts:7-28`, `en.ts:272-273` (Widen), `api/types.ts` |

<!-- cheat:react -->
## React cheatsheet

| Need | Code |
|---|---|
| Component | `export function X({ a }: Props) { return <div>{a}</div> }` |
| State | `const [v, setV] = useState(init); setV(p => p + 1)` |
| Effect | `useEffect(() => { sub(); return () => unsub() }, [deps])` |
| Ref | `const r = useRef<HTMLInputElement>(null); r.current?.click()` |
| List | `items.map(i => <Row key={i.id} … />)` |
| Conditional | `{cond && <A/>}`, ternary, early return, `null` |
| Reset state | change `key` on the component |
| Children/slots | `children: ReactNode`, `action?: ReactNode` |
| Forward ref | `forwardRef<HTMLButtonElement, Props>((p, ref) => …)` |
| Memo | `memo(C)`, `useMemo(fn, deps)`, `useCallback(fn, deps)` — only when profiling says so |
| React 18 | `createRoot`, auto batching, `useTransition`, `useDeferredValue`, `useId` |
| Rules | hooks at top level; pure render; immutable updates |
| Re-render triggers | own state, parent render, context change |
| Pitfalls | calling handler in render, index keys on editable lists, effects for derived data, missing cleanup |
| Project anchors | remount key `PrescriptionReviewPage.tsx:94`; listener cleanup `GlobalSearch.tsx:24-33`; latest-ref `ScanPage.tsx:40-42` |

<!-- cheat:react-router -->
## React Router cheatsheet

```tsx
createBrowserRouter([{ path: '/login', element: <Login/> },
  { element: <RequireAuth/>, children: [{ element: <Shell/>, children: [
    { index: true, element: <Home/> }, { path: 'patients/:id', element: <Detail/> }, { path: '*', element: <NotFound/> }]}]}])
<RouterProvider router={router}/>    <Outlet/>
<Link to="/x"/>   <NavLink to="/" end className={({isActive}) => …}/>
const navigate = useNavigate(); navigate('/x', { replace: true, state })
<Navigate to="/login" replace state={{ from: location }}/>
const { id = '' } = useParams()
const [sp, setSp] = useSearchParams(); sp.get('q'); setSp({ q }, { replace: true })
const location = useLocation()
```
Rules: guards are UX only; keep filters/pages in the URL; production needs SPA fallback.
⚠️ Project bug: `/scan` uses `clinical:edit` (`App.tsx:46`) vs `prescriptions:scan` in nav.

<!-- cheat:tanstack-query -->
## TanStack Query cheatsheet

```tsx
new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: fn } } })
useQuery({ queryKey: ['patients','list',params], queryFn: ({ signal }) => api(params, signal),
           placeholderData: keepPreviousData, enabled, refetchInterval: (q) => q.state.data?.reading ? 2000 : false })
useMutation({ mutationFn, onSuccess, onError, onSettled }); m.mutate(v, { onSuccess }); await m.mutateAsync(v)
qc.setQueryData(key, data); qc.invalidateQueries({ queryKey: ['patients'] }); qc.removeQueries({ predicate })
qc.getQueryData(key); qc.prefetchQuery({ queryKey, queryFn })
```
| Flag | Meaning |
|---|---|
| `isPending` | no data yet |
| `isFetching` | any request in flight |
| `staleTime` / `gcTime` | freshness / memory lifetime |
Project: auth `me` query `features/auth/hooks.ts`; polling `features/prescriptions/hooks.ts:17-18, 35`.

<!-- cheat:react-hook-form-zod -->
## React Hook Form + Zod cheatsheet

```tsx
const schema = z.object({ email: z.string().trim().email(), pw: z.string().min(8), confirm: z.string() })
  .refine(v => v.pw === v.confirm, { path: ['confirm'], message: 'No match' })
  .superRefine((v, ctx) => { if (…) ctx.addIssue({ code: 'custom', path: ['x'], message }) })
type V = z.infer<typeof schema>
const form = useForm<V>({ resolver: zodResolver(schema), defaultValues })   // or values: …
<form onSubmit={form.handleSubmit(onValid)} noValidate>
<input {...form.register('email')} aria-invalid={!!form.formState.errors.email}/>
form.setError('email', { message }); form.reset(); form.watch('x'); form.setValue('x', v, { shouldValidate: true })
const { fields, append, remove } = useFieldArray({ control: form.control, name: 'meds' })  // key={field.id}
schema.safeParse(data)  // { success, data | error }
```
Pattern: string form values + pure converters (`toFormValues`/`toSaveInput`, `form.ts:68-125`).

<!-- cheat:tailwind-shadcn-radix -->
## Tailwind / shadcn / Radix cheatsheet

| Category | Classes |
|---|---|
| Layout | `flex grid gap-4 items-center justify-between min-w-0 flex-1` |
| Spacing | `p-4 px-3 py-2 mt-6 space-y-3` (1 = 0.25rem) |
| Size | `w-full h-10 size-9 max-w-md` |
| Text | `text-sm font-medium truncate tracking-tight` |
| Color tokens | `bg-primary text-muted-foreground border-input bg-primary/5` |
| States | `hover: focus-visible: disabled: aria-invalid: data-[state=open]:` |
| Responsive | `hidden md:flex lg:w-64 sm:grid-cols-2` (mobile-first) |
| Arbitrary | `size-[18px] max-h-[75vh] [&_svg]:size-4` |
| A11y | `sr-only` |
| v4 config | `@import 'tailwindcss'; @theme inline { --color-primary: var(--primary) }` |
| Helpers | `cn(...)` = `twMerge(clsx(...))`; `cva(base, { variants, defaultVariants })` |
| Radix | Dialog (focus trap, Esc, Title required), DropdownMenu (`onSelect`), Tooltip (Provider), Slot (`asChild`) |
| shadcn | components live in `src/components/ui/*`, configured by `components.json` |

<!-- cheat:browser-apis -->
## Browser APIs cheatsheet

```ts
const res = await fetch(url, { method, headers, body, credentials: 'include', signal }); if (!res.ok) …
const u = new URL(path, location.origin); u.searchParams.set('q', v)
const fd = new FormData(); fd.append('files', blob, 'page-1.jpg')   // don't set Content-Type
const ac = new AbortController(); fetch(url, { signal: ac.signal }); ac.abort()
const url = URL.createObjectURL(blob); URL.revokeObjectURL(url)
const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); bmp.close()
canvas.toBlob(cb, 'image/jpeg', 0.9)
navigator.canShare?.({ files }) && await navigator.share({ files, title })   // HTTPS + user gesture
new Intl.NumberFormat('en-IN').format(n); new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka' }).formatToParts(d)
<input type="file" accept="image/*" capture="environment">
```

<!-- cheat:node-npm-vite -->
## Node / npm / Vite cheatsheet

```bash
npm ci | npm install | npm run dev | npm run build (tsc -b && vite build) | npm run typecheck | npm test | npx eslint src
npm outdated | npm audit
```
| Concept | Note |
|---|---|
| `^1.2.3` / `~1.2.3` | minor+patch / patch only |
| deps vs devDeps | runtime vs tooling |
| lockfile | commit; `npm ci` in CI/Docker |
| Vite dev | native ESM, esbuild transforms, HMR, no type-check |
| Vite build | Rollup, tree shaking, hashed files, `manualChunks` |
| Proxy | `server.proxy['/api'] = { target, changeOrigin: false }` |
| Env | `process.env` in config; only `VITE_*` reach browser |
| Node loop | timers → poll → check; `nextTick`/microtasks between phases |
| ESLint | flat config, typescript-eslint strict, react-hooks rules |

<!-- cheat:python -->
## Python cheatsheet

```python
x: int | None = None
def f(a: int, *args, key: str = "", **kw) -> list[str]: ...
def g(db, params, *, q=None): ...            # keyword-only after *
[y for x in xs if x for y in x]; {k: v for k, v in d.items()}; (x for x in xs)
with open(p) as fh: ...; @contextlib.contextmanager
try: ... except (A, B) as e: raise C("msg") from e
@dataclass class P: a: int
class Role(enum.StrEnum): ADMIN = "admin"
@lru_cache def get_settings(): ...
sorted(xs, key=lambda m: -len(m[1])); zip(a, b, strict=True); d.setdefault(k, []).append(v)
Path(root) / "x.jpg"; p.read_bytes(); p.unlink(missing_ok=True)
datetime.now(UTC); ZoneInfo("Asia/Dhaka")
if __name__ == "__main__": main()
```
Pitfalls: mutable defaults, late-binding lambdas, `in ("x")` string, `assert` for validation, bare `except`.
Concurrency: GIL → threads for I/O, processes for CPU, asyncio for many waits.

<!-- cheat:fastapi -->
## FastAPI cheatsheet

```python
app = FastAPI(); app.add_middleware(CORSMiddleware, allow_origins=[...], allow_credentials=True)
router = APIRouter(prefix="/patients", tags=["patients"]); app.include_router(router)
@router.get("/{id}", response_model=Out)
def get(id: uuid.UUID, db: DB, _: CurrentUser, q: str | None = Query(None, max_length=100)): ...
@router.post("", response_model=Out, status_code=201) def create(body: In, db: DB, _: AdminUser): ...
rr_access: Annotated[str | None, Cookie()] = None
files: Annotated[list[UploadFile], File()]
response.set_cookie(name, value, httponly=True, secure=True, samesite="lax", path="/")
background.add_task(fn, id)
DB = Annotated[Session, Depends(get_db)]       # generator dep with teardown
def require_roles(*roles): def checker(user: CurrentUser): ...; return checker
@app.exception_handler(AppError) async def h(req, exc): return JSONResponse(...)
FileResponse(path, media_type="image/jpeg"); Response(bytes, media_type="application/pdf")
app.dependency_overrides[get_db] = lambda: test_db
```
`def` endpoints → thread pool; `async def` → event loop (no blocking calls!).

<!-- cheat:pydantic -->
## Pydantic cheatsheet

```python
class M(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
    age: Annotated[int, Field(ge=0, le=130)] | None = None
    items: list[str] = Field(default_factory=list, max_length=50)
    phone: Annotated[str, AfterValidator(normalize)] | None = None
    @field_validator("x", mode="before") @classmethod def v(cls, x): ...
    @model_validator(mode="after") def check(self) -> Self: ...; return self
M.model_validate(obj); m.model_dump(exclude_unset=True); m.model_dump_json(); M.model_json_schema()
class Page(BaseModel, Generic[T]): items: list[T]; total: int
class Settings(BaseSettings): model_config = SettingsConfigDict(env_file=".env", extra="ignore")
```
v1→v2: `.dict→model_dump`, `parse_obj→model_validate`, `orm_mode→from_attributes`, `validator→field_validator`.

<!-- cheat:sql-postgresql -->
## SQL / PostgreSQL cheatsheet

```sql
SELECT a, count(*) FROM t WHERE x = $1 GROUP BY a HAVING count(*) > 1 ORDER BY a DESC NULLS LAST LIMIT 20 OFFSET 40;
SELECT * FROM a LEFT JOIN b ON b.a_id = a.id;
min(col) FILTER (WHERE col >= current_date); COALESCE(x, 0)
WITH s AS (SELECT …) SELECT … FROM s;   row_number() OVER (PARTITION BY p ORDER BY d DESC)
INSERT … ON CONFLICT (k) DO UPDATE SET …;  UPDATE … RETURNING id;
CREATE INDEX CONCURRENTLY ix ON t (a, b) WHERE status = 'draft';
CREATE INDEX ON patients USING gin (full_name gin_trgm_ops);  similarity(a, b); a % b; a <-> b
SELECT … FOR UPDATE [SKIP LOCKED];  BEGIN; SAVEPOINT s; ROLLBACK TO s; COMMIT;
EXPLAIN (ANALYZE, BUFFERS) …;  jsonb_build_array(x); col->>'k'; jsonb_array_elements(col)
```
| Concept | Remember |
|---|---|
| Isolation | Read Committed default; RR snapshot; Serializable SSI |
| Indexes | B-tree (=, range, sort), GIN (trgm/JSONB), GiST (ranges), partial, expression |
| ON DELETE | CASCADE tokens; RESTRICT prescriptions→patients |
| Types | uuid, timestamptz, date, jsonb, enum, sequence |
| Pitfalls | check-then-insert races, functions on indexed columns, OFFSET depth, N+1 |

<!-- cheat:sqlalchemy-alembic -->
## SQLAlchemy & Alembic cheatsheet

```python
engine = create_engine(url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
class Base(DeclarativeBase): metadata = MetaData(naming_convention=…)
class M(UUIDPk, Timestamps, Base):
    __tablename__ = "m"
    name: Mapped[str] = mapped_column(String(120), unique=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("p.id", ondelete="RESTRICT"), index=True)
    parent: Mapped["P | None"] = relationship(back_populates="children")
db.get(M, pk); db.scalar(select(M).where(...)); db.scalars(stmt).all(); db.execute(stmt).all()
stmt.options(joinedload(M.parent)); select(P).options(selectinload(P.children))
db.add(o); db.flush(); db.commit(); db.refresh(o); db.delete(o)
db.execute(update(M).where(...).values(...)); func.count(); col.ilike(); col.is_(None); or_(a, b)
select(func.count()).select_from(stmt.subquery())
```
```bash
alembic revision --autogenerate -m "msg"   # then REVIEW
alembic upgrade head | alembic downgrade -1 | alembic current | alembic history
```
Remember: reassign JSON columns; one Session per request/task; don't hold sessions across slow calls.

<!-- cheat:http-rest-auth-security -->
## HTTP / REST / Auth / Security cheatsheet

| Item | Value |
|---|---|
| Methods | GET (safe, idempotent), POST, PUT (replace, idempotent), PATCH (partial), DELETE (idempotent) |
| Status | 200 201 204 · 400 401 403 404 409 422 429 · 500 502 503 |
| Error envelope | `{"error": {"code", "message", "details"}}` |
| Tokens | access 15 min (`rr_access`, path `/`), refresh 7 d (`rr_refresh`, path `/api/v1/auth`) |
| Cookie flags | `HttpOnly; Secure; SameSite=Lax; Path; Expires` |
| JWT | `header.payload.signature`; payload readable; `algorithms=[…]`; `type` claim |
| Rotation | refresh → new pair, old revoked; replay > 30 s → revoke all |
| Passwords | Argon2id; dummy hash for unknown emails; same error message |
| RBAC | `AdminUser` / `ScanUser` / `ClinicalUser`; backend enforces, UI hides |
| CSRF | SameSite + no state-changing GETs (+ Origin check/token for depth) |
| CORS | only cross-origin; explicit origins with credentials |
| Uploads | limits, re-encode, server names, authenticated serving |
| To add | rate limiting, MFA, audit log, CSP, HSTS, secure cookies in prod |

<!-- cheat:testing -->
## Testing cheatsheet

```python
@pytest.fixture(scope="session") def engine(): …; yield eng
@pytest.fixture def db(engine): conn = engine.connect(); t = conn.begin(); s = Session(bind=conn, join_transaction_mode="create_savepoint"); yield s; t.rollback()
@pytest.fixture(autouse=True) def stub(monkeypatch, tmp_path): monkeypatch.setattr(mod, "fn", fake)
@pytest.mark.parametrize(("a", "b"), [(1, 2)])
app.dependency_overrides[get_db] = lambda: db; with TestClient(app) as c: c.post(url, json=…, files=[…])
pytest -k name -x -vv
```
```ts
describe('x', () => { it('y', () => expect(f()).toBe(1)) }); it.each([..])('%s', v => …)
toBe | toEqual | toMatchObject | toBeNull | toThrow;   npx vitest run
```
Pyramid: unit (pure logic) → integration (API + real DB) → E2E (Playwright).

<!-- cheat:docker -->
## Docker & Compose cheatsheet

```dockerfile
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install -r requirements.txt
COPY . .
USER app
ENTRYPOINT ["/app/entrypoint.sh"]      # ends with: exec "$@"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```
```yaml
services:
  db: { image: postgres:16-alpine, volumes: [pgdata:/var/lib/postgresql/data],
        healthcheck: { test: ["CMD-SHELL", "pg_isready -U u -d d"] } }
  backend: { build: ./backend, depends_on: { db: { condition: service_healthy } }, ports: ["8000:8000"] }
volumes: { pgdata: {} }
```
```bash
docker compose up --build | up -d | logs -f backend | exec backend pytest | down | down -v (wipes data!)
```

<!-- cheat:llm-gemini -->
## LLM / Gemini cheatsheet

```python
client = genai.Client(api_key=KEY, http_options=types.HttpOptions(timeout=90_000,
    retry_options=types.HttpRetryOptions(attempts=3)))
resp = client.models.generate_content(model="gemini-…-flash",
    contents=[types.Part.from_bytes(data=img, mime_type="image/jpeg"), "Today's date is …"],
    config=types.GenerateContentConfig(system_instruction=PROMPT, response_mime_type="application/json",
                                       response_json_schema=SCHEMA, max_output_tokens=16000))
resp.text; resp.candidates[0].finish_reason; resp.prompt_feedback.block_reason
```
| Principle | In Root Record |
|---|---|
| Schema: all keys required, nullable, no extras | `EXTRACTION_SCHEMA` |
| "Null rather than guess" + `uncertain_fields` | prompt + Check badges |
| Sanitise output | `_text/_date/_strings/_medications` |
| Background + polling | BackgroundTasks + `refetchInterval` |
| Human approval | dentist-only save |
| Errors → staff-safe messages | `ExtractionError` mapping |
| Privacy | paid tier, no PHI in logs |

<!-- cheat:pillow-fpdf2 -->
## Pillow & fpdf2 cheatsheet

```python
with Image.open(io.BytesIO(data)) as im:
    im = ImageOps.exif_transpose(im).convert("RGB"); im.thumbnail((2400, 2400))
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=88, optimize=True)
# errors: UnidentifiedImageError, OSError, Image.DecompressionBombError

class Pdf(FPDF):
    def __init__(self): super().__init__(format="A4"); self.add_font("N", "", "NotoSans.ttf")
        ; self.add_font("B", "", "NotoSansBengali.ttf"); self.set_fallback_fonts(["B"]); self.set_text_shaping(True)
    def footer(self): self.set_y(-12); self.cell(0, 5, f"Page {self.page_no()}/{{nb}}", align="R")
pdf.add_page(); pdf.set_font("N", "", 11); pdf.multi_cell(0, 6, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
with pdf.table(col_widths=(38, 14, 16)) as t: r = t.row(); r.cell("x")
bytes(pdf.output())
```

<!-- cheat:git-config -->
## Git & config cheatsheet

```bash
git status | diff | add -p | commit -m "feat(scope): …" | switch -c feat/x | push -u origin feat/x
git fetch && git rebase origin/master | git merge | git revert <sha> | git reset --soft HEAD~1
git stash | cherry-pick <sha> | bisect | log --oneline --graph | blame file
cp backend/.env.example backend/.env
python -c "import secrets; print(secrets.token_urlsafe(48))"   # JWT_SECRET
```
| Rule | Why |
|---|---|
| Never commit `.env` | secrets in history forever |
| `.env.example` documents vars | onboarding |
| Config in env (12-factor) | same build everywhere |
| Fail fast on unsafe prod config | `config.py:51-55` |
| `*.sh eol=lf` | scripts run in Linux containers |
