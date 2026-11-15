# TanStack Query — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

## Concepts

**Q:** 🟢 What problem does TanStack Query solve?

**A:** Managing server state: fetching, caching, de-duplicating, refetching stale data, retries, loading/error states and mutations — without hand-written effects.

**Q:** 🟢 What is a query key?

**A:** A serialisable array identifying cached data, e.g. `['patients', 'list', params]` (`features/patients/hooks.ts:13`). Same key = same cache entry.

**Q:** 🟢 What is a query function?

**A:** The async function that fetches data for a key; it receives `{ signal, queryKey }` (`features/patients/hooks.ts:14`).

**Q:** 🟢 What does `useQuery` return?

**A:** `data`, `error`, `status` flags (`isPending`, `isError`, `isSuccess`), `isFetching`, `refetch`, and more.

**Q:** 🟢 What is `useMutation`?

**A:** A hook for create/update/delete operations: `mutate`/`mutateAsync`, `isPending`, `error`, callbacks `onSuccess/onError/onSettled` (`features/patients/hooks.ts:27-36`).

**Q:** 🟢 What does `QueryClientProvider` do?

**A:** Provides the `QueryClient` (the cache) to hooks via context (`App.tsx:98`).

**Q:** 🟢 `isPending` vs `isFetching`?

**A:** `isPending`: no data yet; `isFetching`: any request in flight, including background refetches.

**Q:** 🟢 What is `staleTime`?

**A:** How long data is considered fresh; fresh data isn't refetched on mount. App default 30 s (`App.tsx:25`); `me` uses `Infinity` (`features/auth/hooks.ts:31`).

**Q:** 🟢 What is `gcTime`?

**A:** How long unused (no observers) cache entries stay in memory before garbage collection (default 5 min).

**Q:** 🟢 What does `invalidateQueries` do?

**A:** Marks matching queries stale and refetches the active ones.

**Q:** 🟢 What does `setQueryData` do?

**A:** Writes data directly into the cache for a key — e.g. storing the saved patient returned by the server (`features/patients/hooks.ts:32`).

**Q:** 🟢 What does `enabled: false` do?

**A:** Prevents the query from running until it becomes true — patient search runs only with ≥ 2 characters (`PrescriptionReviewPage.tsx:506`).

**Q:** 🟡 What is `keepPreviousData` (placeholderData)?

**A:** Shows the previous key's data while the new key loads — smooth pagination/search (`features/patients/hooks.ts:15`).

**Q:** 🟡 How do hierarchical keys help invalidation?

**A:** `invalidateQueries({ queryKey: ['patients'] })` matches every key starting with `'patients'` (lists and details) (`features/prescriptions/hooks.ts:70`).

**Q:** 🟡 `mutate` vs `mutateAsync`?

**A:** `mutate` is fire-and-forget with callbacks; `mutateAsync` returns a promise to await in try/catch (`ChangePasswordDialog.tsx:52`).

**Q:** 🟡 Where can mutation callbacks be defined?

**A:** In `useMutation` options (run for every call) and per call in `mutate(vars, { onSuccess })` (run after the hook-level ones) — e.g. navigation after scan (`ScanPage.tsx:65-67`).

**Q:** 🟡 What does `mutation.reset()` do?

**A:** Clears the mutation's state (error/data) — used when the user adds new photos after a failed upload (`ScanPage.tsx:46`).

**Q:** 🟡 What is `refetchInterval`?

**A:** Polls on an interval; can be a function of the query to poll conditionally — 2 s while `reading` (`features/prescriptions/hooks.ts:17-18, 35`).

**Q:** 🟡 What is `refetchOnWindowFocus`?

**A:** Refetch stale queries when the tab regains focus (default true); disabled globally here (`App.tsx:26`).

**Q:** 🟡 How does the default `retry` work and how is it customised here?

**A:** Default retries failed queries 3 times with backoff. Here a function retries only network/5xx errors, at most twice (`App.tsx:28-29`).

**Q:** 🟡 How does Query cancel requests?

**A:** It passes an `AbortSignal` to the query function and aborts it when the query is cancelled/superseded; the fetch client forwards it (`client.ts:73`).

**Q:** 🟡 What is request de-duplication?

**A:** Multiple components using the same key while a fetch is in flight share one request.

**Q:** 🟡 How does this app store the current user?

**A:** As a query under `['auth','me']` with `staleTime: Infinity`; 401 maps to `null` (`features/auth/hooks.ts:20-34`).

**Q:** 🟡 What does `resetSession` do?

**A:** Removes all non-auth queries and sets `me` — preventing one user's cached data leaking to the next on a shared clinic device (`features/auth/hooks.ts:14-17`).

**Q:** 🟡 Why not `queryClient.clear()` there?

**A:** It destroys the active `me` query; `RequireAuth` would be stuck in a loading state (comment `hooks.ts:9-13`).

**Q:** 🟡 What does `removeQueries` do vs `invalidateQueries`?

**A:** Removes entries from the cache (no refetch); invalidate keeps and refetches. Deleted resources should be removed to avoid a refetch → 404 (`features/patients/hooks.ts:44`).

**Q:** 🟡 What's `getQueryData` used for in `usePrescription`?

**A:** Reading the previous cached detail inside the query function to detect `reading: true → false` and invalidate lists (`features/prescriptions/hooks.ts:27-32`).

**Q:** 🟡 Why do scan/re-read/save call a shared `useStoreDetail`?

**A:** All return a fresh `PrescriptionDetail`; seeding the detail cache and invalidating lists in one helper avoids duplication (`features/prescriptions/hooks.ts:39-45`).

**Q:** 🟡 Why does saving a prescription invalidate all patient queries?

**A:** Visit counts, last visit and next follow-up on patient lists change, and a new patient may have been created (`features/prescriptions/hooks.ts:70`).

**Q:** 🔴 What is structural sharing?

**A:** On refetch, Query reuses object references for unchanged parts of the data, so components depending on unchanged slices don't re-render.

**Q:** 🔴 What are optimistic updates and why aren't they used here?

**A:** Updating the cache before the server confirms, rolling back on error. For clinical records, showing unconfirmed data is risky, so the app waits for the server.

**Q:** 🔴 How do you implement an optimistic update?

**A:** `onMutate`: cancel queries, snapshot previous data, `setQueryData` with the optimistic value, return context; `onError`: restore snapshot; `onSettled`: invalidate.

**Q:** 🔴 What does Query do on unmount of the last observer?

**A:** The query becomes inactive; after `gcTime` it's garbage-collected. Polling stops when there are no observers.

**Q:** 🔴 How would you replace polling with server push?

**A:** Open an SSE/WebSocket channel; on "prescription_read" events call `setQueryData` or `invalidateQueries` for that id.

**Q:** 🔴 What's the risk of `refetchInterval` with many open tabs?

**A:** Each tab polls independently; with many drafts reading, load multiplies. Bounded here because polling only runs while reading (seconds).

## Predict / find the bug

**Q:** 🟡 Bug: `useQuery({ queryKey: ['patients'], queryFn: () => list({ q }) })` shows stale results when `q` changes.

**A:** `q` isn't in the key, so the cache entry is shared. Include all inputs: `['patients', 'list', { q }]`.

**Q:** 🟡 Bug: after deleting a patient, the detail page briefly refetches and shows an error.

**A:** Invalidating the detail triggers a refetch of a deleted resource; use `removeQueries` for that key.

**Q:** 🟡 Predict: `staleTime: Infinity` and another component mounts with the same key.

**A:** No new request; it reads the cache.

**Q:** 🟡 Bug: the list doesn't update after editing a patient.

**A:** The mutation didn't invalidate list keys; add `invalidateQueries({ queryKey: ['patients','list'] })`.

**Q:** 🟡 Bug: a 404 is retried three times before showing "not found".

**A:** Default retry; use a retry function excluding 4xx (`App.tsx:28-29`).

**Q:** 🔴 Bug: logging out and in as another user briefly shows the previous user's patients.

**A:** Cache not cleared between sessions; remove queries on login/logout (`resetSession`).

**Q:** 🟡 Predict: what does `refetchInterval: (q) => q.state.data?.reading ? 2000 : false` do after reading finishes?

**A:** Returns `false` → polling stops automatically.

## Scenarios & tasks

**Q:** 🟡 Write a hook for a patient detail query.

**A:** `export const usePatient = (id: string) => useQuery({ queryKey: ['patients','detail',id], queryFn: () => patientsApi.get(id) })` (`features/patients/hooks.ts:20-25`).

**Q:** 🟡 Write an update mutation that writes through and invalidates lists.

**A:** See `useUpdatePatient`: `onSuccess: (p) => { qc.setQueryData(['patients','detail',id], p); qc.invalidateQueries({ queryKey: ['patients','list'] }) }`.

**Q:** 🟡 Show a count badge without loading all drafts.

**A:** `usePrescriptions({ status: 'draft', page_size: 1 })` and read `data.total` (`PrescriptionsPage.tsx:26`).

**Q:** 🟡 How would you add infinite scrolling to prescriptions?

**A:** `useInfiniteQuery({ queryKey, queryFn: ({ pageParam }) => list({ page: pageParam }), initialPageParam: 1, getNextPageParam: (last) => last.page * last.page_size < last.total ? last.page + 1 : undefined })`.

**Q:** 🟡 How do you run two queries in parallel?

**A:** Call two `useQuery` hooks in the same component (`PrescriptionsPage.tsx:25-26`) or `useQueries`.

**Q:** 🟡 How do you make a dependent query?

**A:** `useQuery({ queryKey: ['x', id], queryFn, enabled: !!id })`.

**Q:** 🟡 How do you prefetch?

**A:** `queryClient.prefetchQuery({ queryKey, queryFn })` on hover or in a router loader.

**Q:** 🔴 How would you test hooks using TanStack Query?

**A:** Render with a fresh `QueryClient` (retry off) in a wrapper, mock the API module or use MSW, and assert on `result.current` with `renderHook` + `waitFor`.

**Q:** 🟡 How do you show a spinner only for the first load but keep old data during refetch?

**A:** Branch on `isPending` for skeletons and ignore `isFetching` (or show a subtle indicator) — `PatientsPage.tsx:50`.

## Comparisons & interview

**Q:** 🟡 TanStack Query vs Redux?

**A:** Query is a server-state cache with fetching built in; Redux is a general client-state store. Many apps don't need Redux once server state moves to Query.

**Q:** 🟡 TanStack Query vs SWR?

**A:** Same stale-while-revalidate idea; Query has richer mutations, devtools, infinite queries and cache control.

**Q:** 🟡 TanStack Query vs RTK Query?

**A:** RTKQ integrates with Redux and defines endpoints centrally with codegen; Query is library-agnostic and hook-first.

**Q:** 🟡 Why not fetch in `useEffect`?

**A:** You'd re-implement caching, dedupe, cancellation, race handling, retries and refetch logic — with bugs.

**Q:** 🟡 What's "stale-while-revalidate"?

**A:** Serve cached (possibly stale) data immediately and revalidate in the background, updating when fresh data arrives.

**Q:** 🟡 What are Query Devtools?

**A:** A panel showing cache entries, states and timings — invaluable for debugging keys and invalidation.

**Q:** 🟢 Where are all the app's query hooks?

**A:** `features/auth/hooks.ts`, `features/patients/hooks.ts`, `features/prescriptions/hooks.ts`.

**Q:** 🟡 Why does `useLogout` use `onSettled`?

**A:** To clear local session state even if the logout request fails.

**Q:** 🟡 How does the review page avoid a loading spinner right after scanning?

**A:** The scan mutation's `onSuccess` puts the returned detail in the cache, so `usePrescription(id)` finds data immediately (`features/prescriptions/hooks.ts:47-53`).

**Q:** 🔴 Why keep `PRESCRIPTIONS_KEY` duplicated in patients/hooks?

**A:** To avoid a circular import between the two hook modules (`features/patients/hooks.ts:6-7`).

**Q:** 🟡 What happens to polling when the review page unmounts?

**A:** No observers → interval stops.

**Q:** 🟡 How does `retry: false` on `me` help?

**A:** A 401 becomes `null` immediately; network errors show the retry screen without waiting through retries (`features/auth/hooks.ts:32`).
