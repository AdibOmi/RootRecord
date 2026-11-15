# React Router — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

## Concepts

**Q:** 🟢 What is client-side routing?

**A:** Changing the displayed component when the URL changes without a full page reload; the router listens to history changes and renders the matching route.

**Q:** 🟢 What does `createBrowserRouter` do?

**A:** Creates a data router from route objects using the browser History API; rendered with `<RouterProvider router={router} />` (`App.tsx:34, 99`).

**Q:** 🟢 What is a route object?

**A:** `{ path, element, children, index }` describing what to render for a URL segment.

**Q:** 🟢 What is `<Outlet />`?

**A:** The placeholder where a parent route renders its matched child route (`AppShell.tsx:60`).

**Q:** 🟢 What is an index route?

**A:** A child with `index: true` rendered at the parent's exact path — the dashboard at `/` (`App.tsx:42`).

**Q:** 🟢 What is a dynamic segment?

**A:** A `:param` in a path, e.g. `patients/:id`, read with `useParams()` (`PatientDetailPage.tsx:51`).

**Q:** 🟢 What does `path: '*'` do?

**A:** Matches any unmatched URL — the 404 page inside the shell (`App.tsx:81`).

**Q:** 🟢 What does `appointments/*` mean?

**A:** A splat: matches `/appointments` and anything below it, so future sub-pages reuse the placeholder (`App.tsx:55`).

**Q:** 🟢 `Link` vs `<a href>`?

**A:** `Link` navigates client-side (no reload, keeps state); `<a href>` reloads the page.

**Q:** 🟢 What is `NavLink`?

**A:** A `Link` that knows if it's active and can style itself via `className={({ isActive }) => …}` (`Sidebar.tsx:24-37`).

**Q:** 🟢 What does `useNavigate` return?

**A:** A function to navigate programmatically: `navigate('/login', { replace: true })` (`ChangePasswordDialog.tsx:54`).

**Q:** 🟢 What does `replace: true` do?

**A:** Replaces the current history entry instead of pushing a new one — Back won't return to the replaced page.

**Q:** 🟢 What is `<Navigate>`?

**A:** A component that navigates when rendered — used for redirects in guards (`guards.tsx:31`).

**Q:** 🟢 What does `useLocation` give you?

**A:** The current location `{ pathname, search, hash, state, key }`.

**Q:** 🟢 What is `useSearchParams`?

**A:** Read/write the query string: `const [params, setParams] = useSearchParams(); params.get('q')` (`PatientsPage.tsx:19-20`).

**Q:** 🟡 What is a layout route?

**A:** A parent route whose element renders shared UI and an `<Outlet/>` for children — `AppShell` (`App.tsx:40`).

**Q:** 🟡 What is a pathless route?

**A:** A route without `path` that wraps children — `RequireAuth` (`App.tsx:37`) guards all its children without adding a URL segment.

**Q:** 🟡 How are nested route paths resolved?

**A:** Child paths without a leading `/` are relative to the parent — `'scan'` under the root layout becomes `/scan`.

**Q:** 🟡 How does route ranking work in v6?

**A:** Routes are ranked by specificity (static segments > dynamic > splat), not order, so `prescriptions/:id` and `prescriptions` don't conflict.

**Q:** 🟡 What is `end` on `NavLink`?

**A:** Requires an exact match to be active; without it `/` would be active for every URL (`Sidebar.tsx:27`).

**Q:** 🟡 How do you pass state during navigation?

**A:** `navigate(to, { state })` or `<Navigate state={…}/>`; read with `useLocation().state`. Used for the return URL (`guards.tsx:31`, `LoginPage.tsx:29`).

**Q:** 🟡 Path params vs search params?

**A:** Path params identify a resource (`/patients/:id`); search params express options/filters (`?q=rahima&page=2`).

**Q:** 🟡 Why keep pagination in the URL?

**A:** Refresh-safe, shareable, Back/Forward-friendly; query keys derive from the URL (`PrescriptionsPage.tsx:22-24`).

**Q:** 🟡 How do you update one search param while keeping others?

**A:** Build the new object including existing values: `setParams({ ...(q && { q }), page: String(next) })` (`PatientsPage.tsx:116`) or `setParams(prev => { prev.set('page', '2'); return prev })`.

**Q:** 🟡 What are data router features (loaders/actions)?

**A:** `loader` fetches data before rendering a route, `action` handles form submissions, `errorElement` catches errors; available with `createBrowserRouter`. This app doesn't use them — TanStack Query handles data.

**Q:** 🟡 What is `errorElement`?

**A:** The element rendered when a route's render/loader/action throws — a route-level error boundary. Not configured here (⚠️).

**Q:** 🟡 What's `createHashRouter` for?

**A:** URLs like `/#/patients`, working on static hosts that can't rewrite all paths to `index.html`.

**Q:** 🟡 What's needed on the server for `createBrowserRouter` in production?

**A:** An SPA fallback: unknown paths return `index.html` so refreshing `/patients/123` works.

**Q:** 🟡 How is the "return to where you were" flow implemented?

**A:** The guard redirects with `state={{ from: location }}`; the login page reads `location.state.from.pathname` and navigates there after success (`guards.tsx:31`, `LoginPage.tsx:29, 42`).

**Q:** 🟡 What does `RequireAuth` render while auth is unknown?

**A:** `FullPageLoader` — avoiding a flash of the login page for signed-in users (`guards.tsx:18`).

**Q:** 🟡 Why does `RequireAuth` show a retry screen on errors instead of redirecting?

**A:** A network error doesn't mean the user is signed out; redirecting would wrongly log them out (`guards.tsx:19-30`).

**Q:** 🟡 What does `RequirePermission` do?

**A:** Renders children if `can(user, permission)`, else an "access denied" empty state (`guards.tsx:36-55`).

**Q:** 🟡 Are route guards security?

**A:** No — they're UX. The backend enforces auth and roles on every endpoint.

**Q:** 🔴 What's the route/permission bug in this app?

**A:** `/scan` uses `clinical:edit` (`App.tsx:46`) while the sidebar shows Scan for `prescriptions:scan` (`nav.ts:28`) and the backend allows receptionists (`deps.py:51-53`) — receptionists click a visible link and get "no access".

**Q:** 🔴 How would you lazy-load the review page?

**A:** `{ path: 'prescriptions/:id', lazy: async () => ({ Component: (await import('./pages/PrescriptionReviewPage')).PrescriptionReviewPage }) }` or `React.lazy` + `Suspense`.

**Q:** 🔴 How could loaders remove a fetch waterfall here?

**A:** A loader calling `queryClient.ensureQueryData(...)` would start fetching the patient and history before the component renders, instead of render → effect → fetch.

**Q:** 🔴 How does the router know about Back/Forward?

**A:** It listens to the `popstate` event and re-matches the URL; `Link` uses `history.pushState`.

**Q:** 🟡 How do you scroll to top on navigation?

**A:** `<ScrollRestoration />` (data routers) or an effect on `location.pathname`.

**Q:** 🟡 How do you block navigation with unsaved changes?

**A:** `useBlocker` (data routers) or `beforeunload` for full reloads. The review form doesn't warn today.

## Predict / find the bug

**Q:** 🟢 Bug: `<NavLink to="/">` is always highlighted.

**A:** Missing `end` — `/` prefixes every path.

**Q:** 🟡 Bug: after login the user lands on `/` instead of the page they wanted.

**A:** The guard didn't pass `state.from` or the login page ignores it; fix as in `guards.tsx:31` + `LoginPage.tsx:29`.

**Q:** 🟡 Bug: pressing Back after uploading returns to an empty scan form.

**A:** Navigate with `replace: true` after success (`ScanPage.tsx:66`).

**Q:** 🟡 Predict: `Number(new URLSearchParams('?page=abc').get('page')) || 1`

**A:** `1` (`NaN` is falsy).

**Q:** 🟡 Bug: every keystroke in a search box adds a history entry.

**A:** Use `setParams(…, { replace: true })` and debounce (`PatientsPage.tsx:27`).

**Q:** 🟡 Bug: `useParams().id.toUpperCase()` crashes in TS.

**A:** `id` is `string | undefined`; default it (`const { id = '' } = useParams()`).

**Q:** 🔴 Bug: refreshing `/patients/42` in production shows the web server's 404.

**A:** No SPA fallback on the server; configure `try_files $uri /index.html` (nginx).

## Scenarios & tasks

**Q:** 🟡 Add a `/patients/:id/edit` route that reuses the patient layout.

**A:** Nest it: `{ path: 'patients/:id', element: <PatientLayout/>, children: [{ index: true, element: <PatientDetail/> }, { path: 'edit', element: <EditPatient/> }] }` with `<Outlet/>` in the layout.

**Q:** 🟡 Write a guard that requires admin.

**A:** `function RequireAdmin() { const { data: u } = useCurrentUser(); return u?.role === 'admin' ? <Outlet/> : <Navigate to="/" replace/> }`

**Q:** 🟡 Read a tab from `?status=` safely.

**A:** `const status = params.get('status') === 'confirmed' ? 'confirmed' : 'draft'` (`PrescriptionsPage.tsx:23`).

**Q:** 🟡 How do you navigate after a mutation succeeds?

**A:** In the mutation's `onSuccess` callback: `navigate(`/patients/${saved.patient.id}`)` (`PrescriptionReviewPage.tsx:122`).

**Q:** 🟡 How do you render a "Back" link that depends on context?

**A:** Compute the target: `p.patient ? `/patients/${p.patient.id}` : '/prescriptions'` (`PrescriptionReviewPage.tsx:151`).

**Q:** 🟡 How do you close a mobile drawer when a link is clicked?

**A:** Pass an `onNavigate` callback to the nav and call it in each link's `onClick` (`Sidebar.tsx:28`, `AppShell.tsx:40`).

**Q:** 🟡 How would you make search params type-safe?

**A:** Parse with Zod (`z.object({ page: z.coerce.number().min(1).catch(1) })`) or use TanStack Router's typed search params.

## Comparisons & interview

**Q:** 🟡 `BrowserRouter` vs `createBrowserRouter`?

**A:** Component API with `<Routes>` vs data router with loaders/actions/errorElement and `RouterProvider`.

**Q:** 🟡 React Router v6 vs v7?

**A:** v7 merges Remix: optional framework mode (SSR, file-based routes, type generation); library mode is largely v6-compatible.

**Q:** 🟡 React Router vs TanStack Router?

**A:** React Router is mature and simple; TanStack Router offers end-to-end type safety for params and search, built-in caching integrations.

**Q:** 🟡 React Router vs Next.js routing?

**A:** Client-only SPA routing vs file-system routing with server rendering, layouts and server components.

**Q:** 🟡 How do you handle 404s for unknown resources (valid route, missing id)?

**A:** The route matches, so the page handles the API 404 itself — `PatientDetailPage.tsx:73-88` shows "not found" when the query fails with status 404.

**Q:** 🟡 Why is the 404 route inside the shell?

**A:** Signed-in users keep the sidebar and top bar when they hit a bad URL (`App.tsx:81`).

**Q:** 🟢 Why is `/login` outside `RequireAuth`?

**A:** It must be reachable without a session (`App.tsx:35`).

**Q:** 🟡 What happens if a signed-in user visits `/login`?

**A:** `LoginPage` redirects them to `from` or `/` (`LoginPage.tsx:39`).

**Q:** 🔴 How would you prefetch a patient's data when hovering a row?

**A:** On `onMouseEnter`, call `queryClient.prefetchQuery({ queryKey: ['patients','detail',id], queryFn: () => patientsApi.get(id) })`; navigation then renders instantly.

**Q:** 🟡 Why are placeholder pages implemented as routes now?

**A:** Navigation and permissions can be built and tested before features exist; URLs are stable (`App.tsx:55-80`).

**Q:** 🟡 What's the downside of local `useState` for pagination on the patient detail page?

**A:** Page resets on refresh and can't be shared; URL params would persist it (`PatientDetailPage.tsx:54`).
