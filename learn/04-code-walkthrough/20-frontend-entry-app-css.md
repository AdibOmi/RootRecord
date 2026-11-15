# 20 — `src/main.tsx`, `src/App.tsx`, `src/index.css`

## `frontend/src/main.tsx` (11 lines)

```tsx
1  import { StrictMode } from 'react'
2  import { createRoot } from 'react-dom/client'
4  import { App } from './App'
5  import './index.css'                                  // side-effect import: Tailwind + tokens
7  createRoot(document.getElementById('root')!).render(  // ! = #root always exists (index.html:17)
8    <StrictMode>
9      <App />
10   </StrictMode>,
11 )
```
→ `03-react.md` §2.1.

## `frontend/src/App.tsx` (103 lines)

**Purpose:** global providers, route table, session-expiry wiring.
**Calls:** `QueryClient`, `createBrowserRouter`, guards, pages, `setSessionExpiredHandler`, `resetSession`.

### QueryClient (22-32)
```tsx
22 const queryClient = new QueryClient({
23   defaultOptions: {
24     queries: {
25       staleTime: 30_000,
26       refetchOnWindowFocus: false,
27       // Retry only transient failures (network / 5xx), never 4xx.
28       retry: (count, err) =>
29         count < 2 && err instanceof ApiError && (err.status === 0 || err.status >= 500),
30     },
31   },
32 })
```
Created at **module level** — one cache for the app's lifetime (creating it inside the component would
reset the cache on every render). → `05-tanstack-query.md` §2.1.

### Router (34-86)
Route tree explained in `04-react-router.md` §2.1. Structure: `/login` public; everything else inside
`RequireAuth` → `AppShell`; `index` → Dashboard; `scan` wrapped in `RequirePermission
permission="clinical:edit"` (⚠️ should be `prescriptions:scan`); prescriptions list/detail; patients
list/detail; placeholder sections with splats; billing/reports/settings permission-wrapped; `*` 404.
Module-level `router` — created once.

### App component (88-103)
```tsx
88  export function App() {
89    useEffect(() => {
90      setSessionExpiredHandler(() => {
91        const wasSignedIn = queryClient.getQueryData(ME_KEY) != null   // null or undefined → false
92        resetSession(queryClient, null)                               // drop cached data; me = null → guard redirects
93        if (wasSignedIn) toast.error(t.auth.sessionExpired, { id: 'session-expired' })   // id dedupes toasts
94      })
95    }, [])
97    return (
98      <QueryClientProvider client={queryClient}>
99        <RouterProvider router={router} />
100       <Toaster />                                                    // sonner toasts, outside router
101     </QueryClientProvider>
102   )
103 }
```
- The handler bridges the plain fetch layer (`api/client.ts`) and React state without the client
  importing React code.
- `wasSignedIn` avoids an "expired" toast on the first visit (when `/me` naturally 401s).
- `{ id: 'session-expired' }` — if ten requests fail at once, only one toast appears.
- With StrictMode the effect runs twice in dev; registering the same handler twice is harmless
  (idempotent), so no cleanup is needed.

## `frontend/src/index.css` (90 lines)

| Lines | Content |
|---|---|
| 1-2 | `@import 'tailwindcss'`, `@import 'tw-animate-css'` |
| 4-7 | comment: palette description; tokens follow shadcn naming |
| 8-40 | `:root` CSS variables in OKLCH: radius, background/foreground, card, popover, primary (teal), secondary, muted, accent (soft blue), destructive, success, warning, border, input, ring (primary at 45% alpha), sidebar colours |
| 42-75 | `@theme inline`: font family (Inter + system fallbacks), radius scale derived from `--radius`, `--color-*` tokens mapping to the variables → utilities like `bg-primary`, `text-muted-foreground`, `bg-sidebar-active` |
| 77-90 | `@layer base`: all elements get `border-border` and `outline-ring/50`; `html, body, #root` full height; body background/foreground, antialiasing, Inter stylistic sets `cv11`, `ss01` |

→ `07-tailwind-shadcn-radix.md` §3.1.

## Q&A

**Q:** 🟢 Why is `queryClient` created outside the `App` component?

**A:** So there is exactly one cache for the app's lifetime; creating it inside the component would make
a new cache on every render (or remount), losing all cached data.

**Q:** 🟡 How does an expired session get from `api/client.ts` to the UI?

**A:** `client.ts` calls the registered `onSessionExpired` after a failed refresh (`client.ts:123-125`);
`App.tsx:90-94` registered a handler that clears caches and sets `me` to `null`, so `RequireAuth`
re-renders and redirects to `/login`, with a toast if the user had been signed in.

**Q:** 🟡 Why doesn't the default `retry` retry 4xx errors?

**A:** 400/401/403/404/409/422 are deterministic — retrying wastes time and, for 401, the client already
handles refresh; network (status 0) and 5xx are often transient.

**Q:** 🔴 StrictMode runs effects twice in development. Is `App`'s effect safe?

**A:** Yes — it only assigns a module variable; running it twice sets the same handler. Effects that
subscribe/add listeners must return cleanups to be StrictMode-safe (e.g. `GlobalSearch.tsx:32`).

**Q:** 🟢 What do the OKLCH variables give you?

**A:** A themeable palette: changing a variable (e.g. `--primary`) recolours every component that uses
`bg-primary`, and OKLCH keeps perceived lightness consistent across hues.

**Q:** 🟡 Why is `<Toaster />` outside `<RouterProvider>`?

**A:** Toasts must survive route changes (e.g. "Signed out" shown after navigating to `/login`); placing
it at the root keeps it mounted.
