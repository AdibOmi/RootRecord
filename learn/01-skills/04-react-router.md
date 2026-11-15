# 04 — React Router 6

> **Where it lives:** route table in `frontend/src/App.tsx:34-86`; guards in
> `frontend/src/features/auth/guards.tsx`; hooks used across `pages/` and `components/layout/`.
> Version `^6.30.6` (`frontend/package.json:29`).

---

## 1. What & why

**Client-side routing** — changing what is shown when the URL changes, *without* asking the
server for a new HTML page. **React Router** maps URL paths to components, keeps the browser's
back/forward buttons working, and exposes the URL (path params, query string) to components.

**Analogy:** a building directory. The URL is the room number; the router decides which
"room" (component) to show, and nested routes are rooms inside a wing (layout).

**When NOT to use it:** a single-screen widget, or a framework that already includes routing
(Next.js, Remix/React Router 7 framework mode, TanStack Router).

---

## 2. Fundamentals

### 2.1 The route table

📍 `frontend/src/App.tsx:34-86` (abridged):

```tsx
const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },          // public
  {
    element: <RequireAuth />,                           // pathless layout route: a guard
    children: [
      {
        element: <AppShell />,                          // pathless layout: sidebar + top bar
        children: [
          { index: true, element: <DashboardPage /> },  // "/"
          { path: 'scan', element: <RequirePermission permission="clinical:edit"><ScanPage /></RequirePermission> },
          { path: 'prescriptions', element: <PrescriptionsPage /> },
          { path: 'prescriptions/:id', element: <PrescriptionReviewPage /> }, // dynamic segment
          { path: 'patients', element: <PatientsPage /> },
          { path: 'patients/:id', element: <PatientDetailPage /> },
          { path: 'appointments/*', element: <PlaceholderPage title={t.nav.appointments} /> }, // splat
          // … billing, reports, settings with RequirePermission …
          { path: '*', element: <NotFoundPage /> },     // catch-all 404 inside the shell
        ],
      },
    ],
  },
])
```

Key vocabulary:

| Term | Meaning | Example |
|---|---|---|
| **Route object** | `{ path, element, children }` | above |
| **Layout route** | a parent whose `element` renders `<Outlet/>` | `AppShell` |
| **Pathless route** | no `path`; only wraps children | `RequireAuth` |
| **Index route** | renders at the parent's exact path | `index: true` → `/` |
| **Dynamic segment** | `:id` captured as a param | `patients/:id` |
| **Splat** | `*` matches the rest of the URL | `appointments/*` |
| **Relative paths** | child paths have no leading `/` | `'scan'` |

### 2.2 `<Outlet />`

📍 `frontend/src/components/layout/AppShell.tsx:59-61` renders `<Outlet />` inside `<main>`: the
matched child route appears there, so the sidebar/top bar stay mounted across navigations.
📍 `frontend/src/features/auth/guards.tsx:32` — `RequireAuth` returns `<Outlet />` only when signed
in.

### 2.3 Navigation

| API | Use | Example |
|---|---|---|
| `<Link to>` | an `<a>` that navigates client-side | `PrescriptionRow.tsx:13-16` |
| `<NavLink>` | Link that knows if it is active | `Sidebar.tsx:24-37` |
| `useNavigate()` | navigate from code | `ScanPage.tsx:66` after upload |
| `<Navigate to>` | navigate while rendering (redirect) | `guards.tsx:31` |

`navigate(path, { replace: true })` replaces the current history entry. 📍 `ScanPage.tsx:66` uses
`replace` so pressing Back from the review page doesn't return to an empty scan form;
`ChangePasswordDialog.tsx:54` replaces so Back doesn't return to a page that needs auth.

### 2.4 Reading the URL

| Hook | Returns | Example |
|---|---|---|
| `useParams()` | `{ id }` from `:id` | `PatientDetailPage.tsx:51` `const { id = '' } = useParams()` |
| `useSearchParams()` | `[URLSearchParams, setter]` | `PatientsPage.tsx:19-21` |
| `useLocation()` | `{ pathname, search, state }` | `guards.tsx:16`, `LoginPage.tsx:28-29` |

---

## 3. Intermediate

### 3.1 Route guards (auth)

📍 `frontend/src/features/auth/guards.tsx:14-33`:

```tsx
export function RequireAuth() {
  const { data: user, isPending, isError, refetch } = useCurrentUser()
  const location = useLocation()

  if (isPending) return <FullPageLoader />                 // still asking /auth/me
  if (isError) return /* "Cannot reach server" + Retry */  // network / 5xx
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
```

Line by line:
1. Ask the cached `me` query (no request if cached; `staleTime: Infinity`, `hooks.ts:31`).
2. While pending, show a loader — never flash the login page for a signed-in user.
3. A *network* error is different from "not signed in" (`hooks.ts:27` maps 401 → `null`), so the
   user gets a Retry button instead of being logged out by a flaky connection.
4. No user → redirect, remembering where they were in `state.from`.

📍 `frontend/src/pages/LoginPage.tsx:29` reads it back:
`const from = (location.state as { from?: Location } | null)?.from?.pathname ?? '/'`
and `:39-42` redirects there after login. This is the "return URL" pattern.

### 3.2 Permission guards

📍 `guards.tsx:36-55` — `RequirePermission` renders an "access denied" `EmptyState` instead of
children when `can(user, permission)` is false. It wraps elements in the route table
(`App.tsx:46-48`).

⚠️ **Review note (real bug):** `/scan` is guarded with `permission="clinical:edit"` (admin,
dentist) at `App.tsx:46`, and the top-bar camera button also checks `clinical:edit`
(`AppShell.tsx:48`). But the sidebar shows "Scan prescription" to anyone with
`prescriptions:scan` (`components/layout/nav.ts:28`), which includes receptionists
(`lib/permissions.ts:20`), and so do the Dashboard/Prescriptions buttons
(`DashboardPage.tsx:41`, `PrescriptionsPage.tsx:39`). The backend lets receptionists scan
(`backend/app/api/deps.py:50-53`) and the README says the assistant usually scans
(`README.md:9`). So a receptionist clicks "Scan prescription" and gets "no access". Fix: use
`prescriptions:scan` in `App.tsx:46` and `AppShell.tsx:48`.

Remember: frontend guards are **UX only**. Real enforcement is on the server
(`lib/permissions.ts:1-4` says so).

### 3.3 Active links

📍 `frontend/src/components/layout/Sidebar.tsx:24-37`:

```tsx
<NavLink
  to={to}
  end={to === '/'}                   // "/" must match exactly, or it'd be active everywhere
  onClick={onNavigate}               // close the mobile drawer
  className={({ isActive }) => cn('…', isActive && 'bg-sidebar-active …')}
>
```

`className` can be a function receiving `{ isActive, isPending }`.

### 3.4 URL as state (search params)

Storing filters/pagination in the URL makes them **shareable, bookmarkable and survive refresh**.

📍 `frontend/src/pages/PrescriptionsPage.tsx:22-24`:

```tsx
const [params, setParams] = useSearchParams()
const status: PrescriptionStatus = params.get('status') === 'confirmed' ? 'confirmed' : 'draft'
const page = Number(params.get('page')) || 1
```

- Unknown values fall back safely (only `'confirmed'` is accepted).
- Tabs call `setParams({ status: tab.value })` (`:57`), which also resets `page`.

📍 `PatientsPage.tsx:22-30` keeps a local `input` state for typing and syncs it to `?q=` after 300
ms with `{ replace: true }`, so each keystroke doesn't add a history entry.

### 3.5 Data routers vs declarative `<Routes>`

`createBrowserRouter` + `RouterProvider` (`App.tsx:3, 99`) is the **data router** API (v6.4+).
It unlocks `loader` (fetch before render), `action` (form posts), `errorElement`, `defer`. This
project uses the data router but **not** loaders/actions: data fetching is delegated to TanStack
Query hooks inside components. That is a valid choice; loaders + `queryClient.ensureQueryData`
would start fetches earlier (no render-then-fetch waterfall).

---

## 4. Advanced

### 4.1 History API under the hood

`createBrowserRouter` uses the browser **History API** (`history.pushState`, `popstate` event).
Links call `pushState` instead of letting the browser load the page; the router listens and
re-renders. Alternative: `createHashRouter` (`/#/patients`) when the server can't serve
`index.html` for every path.

⚠️ Deployment consequence: the production web server must return `index.html` for unknown paths
(SPA fallback), or a refresh on `/patients/123` gives a 404. The dev server does this
automatically; there is no production server config in the repo yet.

### 4.2 Route matching and ranking

v6 ranks routes by specificity (static > dynamic > splat) regardless of order, so
`prescriptions/:id` and `prescriptions` never conflict.

### 4.3 Error handling

Add `errorElement` on a route to catch render/loader errors in that subtree. Not configured here
(see React module ⚠️ about error boundaries).

### 4.4 Code splitting per route

`{ path: 'prescriptions/:id', lazy: () => import('./pages/PrescriptionReviewPage') }` loads the
page on demand (v6.9+). Not used.

---

## 5. Comparisons

| X vs Y | Answer |
|---|---|
| `BrowserRouter` vs `createBrowserRouter` | component API vs data router (loaders, actions, errorElement) |
| `Link` vs `<a href>` | client-side vs full page reload |
| `Link` vs `NavLink` | NavLink adds active state |
| `useNavigate` vs `<Navigate>` | imperative in handlers vs declarative during render |
| `push` vs `replace` | new history entry vs overwrite |
| path params vs search params | identity of a resource vs filters/options |
| React Router vs TanStack Router | mature, simple vs fully type-safe routes & search params |
| v6 vs v7 | v7 merges Remix: framework mode (SSR, file routes); library mode similar to v6 |

---

## 6. Patterns & anti-patterns

- ✅ Pathless layout routes for guards and shells.
- ✅ URL search params for list state.
- ✅ `replace` for redirects.
- ❌ Reading `window.location` directly instead of hooks.
- ❌ Doing auth checks only in the frontend.
- ❌ Inconsistent permission names between nav and routes (the ⚠️ above).

---

## 7. Security & performance

- Never put secrets or PII in the URL (logs, history, referrer headers). Patient **ids** (UUIDs)
  in URLs are fine; search text `?q=` may contain names — acceptable for an internal tool.
- Route-level lazy loading reduces initial JS.

---

## 8. Cheat sheet

```tsx
createBrowserRouter([{ path: '/', element: <Layout/>, children: [{ index: true, element: <Home/> }] }])
<RouterProvider router={router} />
<Outlet />                                  // where children render
<Link to="/patients/42">…</Link>
<NavLink to="/" end className={({isActive}) => …} />
const navigate = useNavigate(); navigate('/x', { replace: true, state: {…} })
<Navigate to="/login" replace state={{ from: location }} />
const { id } = useParams()
const [sp, setSp] = useSearchParams(); sp.get('q'); setSp({ q: 'x' })
const location = useLocation(); location.state
```

---

## 9. Why chosen + alternatives

React Router is the default for client-rendered React apps and already integrates with every UI
library used here. TanStack Router would add type-safe search params (nice for
`?status=draft&page=2`) at the cost of a newer API. Next.js would bring server rendering, which an
internal staff-only tool doesn't need.
