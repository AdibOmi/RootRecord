# React — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

## Definitions & concepts

**Q:** 🟢 What is React?

**A:** A JavaScript library for building UIs from components — functions returning a description of the UI. When state changes, React re-renders and updates the DOM minimally.

**Q:** 🟢 What is a component?

**A:** A reusable function that takes props and returns JSX, e.g. `EmptyState` (`components/common/EmptyState.tsx:14`). Names must start with a capital letter.

**Q:** 🟢 What is JSX?

**A:** HTML-like syntax in JS compiled to `jsx()` calls creating React elements. It allows `{expressions}`, uses `className`, `htmlFor`, and camelCase event props.

**Q:** 🟢 Props vs state?

**A:** Props are inputs from the parent (read-only); state is data a component owns and changes with a setter, triggering re-renders.

**Q:** 🟢 What does `useState` return?

**A:** A pair `[value, setValue]`; calling `setValue` schedules a re-render with the new value (`AppShell.tsx:18`).

**Q:** 🟢 Why use the updater form `setX(prev => …)`?

**A:** When the new value depends on the previous one; it avoids stale values when multiple updates are batched (`ScanPage.tsx:50`, `GlobalSearch.tsx:28`).

**Q:** 🟢 What is a Fragment?

**A:** `<>…</>` groups children without adding a DOM element (`PatientsPage.tsx:35`).

**Q:** 🟢 How do you render a list?

**A:** `items.map(item => <Row key={item.id} … />)`; each child needs a stable unique `key` (`PatientsPage.tsx:58-59`).

**Q:** 🟢 Why are keys needed?

**A:** React matches old and new children by key during reconciliation; stable keys preserve component state and DOM nodes correctly when items are added/removed/reordered.

**Q:** 🟢 When is using the index as a key OK?

**A:** For static lists that never reorder or have items inserted/removed in the middle — e.g. read-only medicine lists in `PatientDetailPage.tsx:255`. Not for editable lists (`useFieldArray` uses `field.id`, `PrescriptionReviewPage.tsx:635`).

**Q:** 🟢 How do you conditionally render?

**A:** `cond && <X/>`, ternaries, early returns, or returning `null` (`Pagination.tsx:15`).

**Q:** 🟢 How do you handle events?

**A:** Pass a function: `onClick={() => setOpen(true)}`; don't call it during render.

**Q:** 🟢 What is `children`?

**A:** The content between a component's tags, received as `props.children` — e.g. `RequirePermission` renders `{children}` when allowed (`guards.tsx:54`).

**Q:** 🟢 What is a controlled input?

**A:** An input whose value comes from React state with `value` + `onChange` (search box `PatientsPage.tsx:40-46`).

**Q:** 🟢 What is an uncontrolled input?

**A:** The DOM holds the value; React reads it via refs or a form library. RHF's `register` and file inputs are uncontrolled (`ScanPage.tsx:200-223`).

**Q:** 🟢 What does `useEffect` do?

**A:** Runs code after render to synchronise with external systems (listeners, timers, subscriptions); optional cleanup runs before the next run and on unmount.

**Q:** 🟢 What does the dependency array control?

**A:** When the effect re-runs: `[]` once after mount, `[a, b]` when those change, omitted after every render.

**Q:** 🟢 What is `useRef` for?

**A:** Holding a mutable value across renders without causing re-renders, or referencing DOM nodes (`ScanPage.tsx:33-35`).

**Q:** 🟢 What is StrictMode?

**A:** A development wrapper that double-invokes renders and effects (mount → unmount → mount) to reveal impure code and missing cleanups (`main.tsx:8`).

**Q:** 🟢 What is a custom hook?

**A:** A function starting with `use` that composes hooks to share logic — `useCurrentUser`, `usePatients`, `useScanPrescription` (`features/*/hooks.ts`).

**Q:** 🟢 What are the Rules of Hooks?

**A:** Call hooks at the top level (not in conditions/loops/after early returns) and only from components or custom hooks — React tracks hooks by call order.

**Q:** 🟡 What causes a component to re-render?

**A:** Its own state change, its parent re-rendering, or a context value it consumes changing. Props changing happens because the parent re-rendered.

**Q:** 🟡 What is reconciliation?

**A:** React diffing the new element tree against the previous one to compute minimal DOM updates, using element type and keys as heuristics.

**Q:** 🟡 What is the virtual DOM?

**A:** The in-memory tree of React elements; React compares trees and commits only differences to the real DOM. (Internally implemented with Fiber nodes.)

**Q:** 🟡 What is Fiber?

**A:** React's internal data structure/unit of work enabling incremental, interruptible rendering and priorities (concurrent features).

**Q:** 🟡 Render phase vs commit phase?

**A:** Render calls components to compute the tree (pure, can be interrupted); commit applies DOM changes and runs layout effects (synchronous), then passive effects run after paint.

**Q:** 🟡 What is automatic batching (React 18)?

**A:** Multiple state updates in the same tick — even in promises, timeouts and native handlers — are batched into one render.

**Q:** 🟡 What does changing a component's `key` do?

**A:** Unmounts the old instance and mounts a new one, resetting all its state. Used to reset the review form when reading finishes (`PrescriptionReviewPage.tsx:94`).

**Q:** 🟡 `useEffect` vs `useLayoutEffect`?

**A:** `useEffect` runs after paint (non-blocking); `useLayoutEffect` runs after DOM mutations but before paint (blocking) — for measuring layout or preventing flicker.

**Q:** 🟡 What is `useMemo`?

**A:** Memoises a computed value until dependencies change — for expensive calculations or stable object identities.

**Q:** 🟡 What is `useCallback`?

**A:** Memoises a function identity until dependencies change — useful when passing callbacks to memoised children or as effect dependencies.

**Q:** 🟡 What is `React.memo`?

**A:** Wraps a component to skip re-rendering when props are shallowly equal.

**Q:** 🟡 Why doesn't this project use `useMemo`/`useCallback`?

**A:** Lists are small and paginated; re-renders are cheap. Memoisation adds complexity and its own overhead; use it when profiling shows a problem.

**Q:** 🟡 What is Context?

**A:** A way to provide a value to a subtree without prop drilling (`Provider` + `useContext`). Consumers re-render when the value changes. This app uses library providers (`QueryClientProvider`, `RouterProvider`, `TooltipProvider`).

**Q:** 🟡 What is prop drilling and how do you avoid it?

**A:** Passing props through many layers that don't use them. Avoid via composition (`children`), context, or state libraries — here, auth state lives in the query cache accessed via `useUser()`.

**Q:** 🟡 What is lifting state up?

**A:** Moving shared state to the nearest common parent; children receive it via props. `PatientDetailPage` owns `editOpen` and passes it to the dialog (`:55, 161`).

**Q:** 🟡 What is a controlled component (beyond inputs)?

**A:** Any component whose state is driven by props (`open`, `onOpenChange`) — like the dialogs here — making the parent the source of truth.

**Q:** 🟡 What is `forwardRef`?

**A:** Lets a component pass a `ref` through to a child DOM element, needed by libraries (Radix triggers, forms) (`ui/button.tsx:37`). React 19 allows `ref` as a normal prop.

**Q:** 🟡 What is a portal?

**A:** Rendering children into a different DOM node (`createPortal`) while keeping React tree semantics (context, events). Dialogs/menus use it to escape overflow/stacking (`ui/dialog.tsx:35`).

**Q:** 🟡 What are synthetic events?

**A:** React's cross-browser event wrappers, dispatched through delegation at the root. Since React 17 they're attached to the root container, not `document`.

**Q:** 🟡 How do you share stateful logic between components?

**A:** Custom hooks (preferred), render props or HOCs (older patterns).

**Q:** 🟡 What is derived state and how should you handle it?

**A:** Values computable from props/state; compute them during render (`const busy = preparing || scan.isPending`, `ScanPage.tsx:73`) instead of syncing extra state with effects.

**Q:** 🟡 What is an error boundary?

**A:** A class component implementing `getDerivedStateFromError`/`componentDidCatch` that catches render errors below it and shows a fallback. None exists in this app (⚠️).

**Q:** 🟡 What is `React.lazy` + `Suspense`?

**A:** Code-splitting: `lazy(() => import('./Page'))` loads a component on demand; `Suspense` shows a fallback while loading.

**Q:** 🟡 What does `createRoot` enable?

**A:** React 18's concurrent renderer: automatic batching, transitions, Suspense improvements (`main.tsx:7`).

**Q:** 🟡 What is `useTransition`?

**A:** Marks state updates as non-urgent so urgent ones (typing) stay responsive; returns `[isPending, startTransition]`.

**Q:** 🟡 What is `useDeferredValue`?

**A:** Returns a lagging version of a value that React updates at lower priority — alternative to debouncing for expensive renders.

**Q:** 🟡 What is `useId`?

**A:** Generates stable unique ids for accessibility attributes, consistent between server and client. The app uses hand-written ids (`FormField` id props) instead.

**Q:** 🟡 What is `useReducer` and when do you prefer it?

**A:** State managed by a reducer `(state, action) => newState`; better for complex, related state transitions than many `useState`s.

**Q:** 🔴 How does React decide whether to reuse a DOM node?

**A:** Same position + same element type + same key → update in place; different type → unmount subtree and mount new; keys match children across reorders.

**Q:** 🔴 Why must render be pure?

**A:** React may call it multiple times, interrupt, or discard results (concurrent rendering, StrictMode). Side effects in render (fetching, mutating globals) cause bugs.

**Q:** 🔴 What is a stale closure in hooks?

**A:** A callback/effect capturing old state or props because of missing dependencies; fix with correct deps, functional updates, or refs holding latest values (`ScanPage.tsx:40-42`).

**Q:** 🔴 Why do effects run twice in development?

**A:** StrictMode simulates unmount/remount to ensure effects clean up properly (future features like Offscreen/Activity will preserve state across hides).

**Q:** 🔴 What is hydration?

**A:** Attaching React to server-rendered HTML on the client. Not relevant here — this is a client-rendered SPA.

**Q:** 🔴 How does React 18 handle state updates in a `setTimeout`?

**A:** They're batched like event-handler updates (pre-18 they triggered separate renders).

**Q:** 🔴 What's the "you might not need an effect" guidance?

**A:** Don't use effects to compute derived data, reset state on prop change (use `key`), or handle user events (use handlers). Use effects only to sync with external systems.

**Q:** 🔴 What are React Server Components?

**A:** Components rendered on the server that send serialized UI (no client JS); used by frameworks like Next.js. Not used here (`components.json:4` `rsc: false`).

## Predict / find the bug

**Q:** 🟢 Bug: `<button onClick={setOpen(true)}>`

**A:** It calls `setOpen` during render → infinite re-render loop. Use `onClick={() => setOpen(true)}`.

**Q:** 🟢 Bug: `{items.length && <List/>}` when empty

**A:** Renders `0`. Use `items.length > 0 &&`.

**Q:** 🟡 Predict: `setCount(count + 1); setCount(count + 1)` in one click starting at 0

**A:** `1` — both read the same `count`. With `setCount(c => c + 1)` twice → `2`.

**Q:** 🟡 Bug: `useEffect(() => { window.addEventListener('keydown', h) }, [])`

**A:** No cleanup → listener stays after unmount and duplicates in StrictMode. Return `() => window.removeEventListener('keydown', h)` (`GlobalSearch.tsx:32`).

**Q:** 🟡 Bug: `if (loading) return <Spinner/>; const [x, setX] = useState(0)`

**A:** Hook after an early return breaks the Rules of Hooks — hook order changes between renders. Move all hooks above returns (`LoginPage.tsx:25-39`).

**Q:** 🟡 Bug: `const [name, setName] = useState(props.name)` and later the prop changes

**A:** State initialised once; it won't follow the prop. Derive from props or reset with a `key`.

**Q:** 🟡 Bug: `items.push(x); setItems(items)`

**A:** Mutates and passes the same reference → React may bail out. Use `setItems([...items, x])`.

**Q:** 🟡 Predict: what happens when `useForm({ defaultValues })` receives new defaults on re-render?

**A:** Nothing — defaults are read only on mount. Use `values`, `reset()`, or remount with a new key (`PrescriptionReviewPage.tsx:94`).

**Q:** 🟡 Bug: `useEffect(() => { fetchData().then(setData) }, [id])` — fast id changes show wrong data

**A:** Race condition: an older request can resolve last. Cancel with AbortController/ignore flag in cleanup, or use TanStack Query (keys + cancellation).

**Q:** 🔴 Bug: a component is defined inside another component's body

**A:** A new component type each render → React unmounts/remounts it every time, losing state and focus. Define components at module level (as the sub-components in `PrescriptionReviewPage.tsx` are).

**Q:** 🔴 Predict: changing `key` from `'rx1:true'` to `'rx1:false'`

**A:** `PrescriptionReview` unmounts and remounts; `useForm` re-reads `defaultValues` from the now-extracted data.

**Q:** 🟡 Bug: `useEffect(() => setFull(pages.length >= 6), [pages])`

**A:** Unnecessary extra render and state; compute `const full = pages.length >= 6` in render (`ScanPage.tsx:74`).

**Q:** 🟡 Bug: an effect depends on an object literal created each render

**A:** The dependency changes every render, re-running the effect forever. Memoise the object or depend on primitive fields.

## Scenarios

**Q:** 🟡 A list of 5,000 rows renders slowly. What do you check?

**A:** Paginate or virtualise (react-window), stable keys, avoid re-rendering all rows on each keystroke (`React.memo` rows, move state down), profile with React DevTools. This app paginates at 20 (`PatientsPage.tsx:16`).

**Q:** 🟡 Typing in a big form lags. What do you do?

**A:** Use uncontrolled inputs with React Hook Form (subscription-based), avoid `watch` on the whole form, split components so only affected parts re-render.

**Q:** 🟡 A form should show values loaded asynchronously. Options?

**A:** Render the form only after data loads with `defaultValues` (as the review page does), call `reset(data)` when data arrives, or pass `values` (EditPatientDialog `values: toValues(patient)`).

**Q:** 🟡 You need a keyboard shortcut available everywhere. How?

**A:** A `keydown` listener on `window` in an effect with cleanup, mounted in the shell (`GlobalSearch.tsx:24-33`).

**Q:** 🟡 How do you protect routes for signed-in users?

**A:** A guard component that checks auth state, shows a loader while unknown, redirects to login otherwise, and renders `<Outlet/>` (`guards.tsx:14-33`).

**Q:** 🟡 How would you show a "reading…" state that updates automatically?

**A:** Poll with TanStack Query's `refetchInterval` while `reading` is true (`features/prescriptions/hooks.ts:35`) and render a status banner; disable the form meanwhile.

**Q:** 🔴 After AI extraction finishes, the form must show extracted values, but RHF already initialised. How was it solved?

**A:** By remounting the form component with a `key` that includes `reading`, so `useForm` is created fresh with new `defaultValues` (`PrescriptionReviewPage.tsx:93-94`).

**Q:** 🟡 How do you open a hidden file input from a styled button?

**A:** Keep a ref to the input and call `ref.current?.click()` from the button's handler (`ScanPage.tsx:114`).

**Q:** 🟡 How do you avoid memory leaks with image previews?

**A:** Create object URLs when adding, revoke when removing and on unmount (`ScanPage.tsx:39-59`).

**Q:** 🟡 How do you make a dialog accessible?

**A:** Use a primitive (Radix) that traps focus, closes on Esc, returns focus, and labels the dialog with a title/description (`ui/dialog.tsx`).

**Q:** 🔴 Where would you add an error boundary in this app?

**A:** As `errorElement` on the root route and around the `AppShell` outlet, so a crash in one page shows a friendly fallback with a reload button instead of a blank screen.

**Q:** 🟡 How do you show something only to certain roles?

**A:** `can(user, permission) && <Button/>` (`AppShell.tsx:48`) — remembering the backend still enforces it.

**Q:** 🟡 A modal's form keeps old values after closing. Fix?

**A:** Reset on close: `onOpenChange={(next) => { if (!next) form.reset(); onOpenChange(next) }}` (`ChangePasswordDialog.tsx:65-70`).

## Write-it-quickly tasks

**Q:** 🟡 Write a `useDebouncedValue(value, ms)` hook.

**A:**
```tsx
function useDebouncedValue<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}
```

**Q:** 🟡 Write a `useToggle` hook.

**A:** `function useToggle(init = false) { const [on, set] = useState(init); return [on, () => set(o => !o)] as const }`

**Q:** 🟡 Write a `useEventListener(type, handler)` hook.

**A:**
```tsx
function useEventListener<K extends keyof WindowEventMap>(type: K, handler: (e: WindowEventMap[K]) => void) {
  const ref = useRef(handler); ref.current = handler
  useEffect(() => { const h = (e: WindowEventMap[K]) => ref.current(e); window.addEventListener(type, h); return () => window.removeEventListener(type, h) }, [type])
}
```

**Q:** 🟡 Write an `EmptyState` component with optional action.

**A:** See `components/common/EmptyState.tsx:14-30`: destructure props, render icon, title, `{description && <p/>}`, `{action && <div>{action}</div>}`.

**Q:** 🟡 Write a minimal error boundary.

**A:**
```tsx
class Boundary extends React.Component<{ children: ReactNode }, { error?: Error }> {
  state = {} as { error?: Error }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() { return this.state.error ? <p>Something went wrong</p> : this.props.children }
}
```

**Q:** 🟡 Write a controlled text input with a clear button.

**A:** `const [q, setQ] = useState(''); <input value={q} onChange={e => setQ(e.target.value)} /><button onClick={() => setQ('')}>×</button>`

**Q:** 🔴 Write a `usePrevious(value)` hook.

**A:** `function usePrevious<T>(v: T) { const r = useRef<T>(); useEffect(() => { r.current = v }); return r.current }`

## Real interview questions

**Q:** 🟡 Class components vs function components?

**A:** Classes use lifecycle methods and `this`; functions use hooks, compose better, have less boilerplate. New code uses functions; error boundaries still need classes.

**Q:** 🟡 Map lifecycle methods to hooks.

**A:** `componentDidMount` → `useEffect(…, [])`; `componentDidUpdate` → effect with deps; `componentWillUnmount` → effect cleanup; `shouldComponentUpdate` → `React.memo`.

**Q:** 🟡 What is "lifting state" vs "colocating state"?

**A:** Lift when siblings share it; colocate (keep it as low as possible) to minimise re-renders and complexity (e.g. `PhotoViewer` owns zoom/index state, `PrescriptionReviewPage.tsx:688-689`).

**Q:** 🟡 What's the difference between server state and client state?

**A:** Server state is owned remotely, shared, can be stale (use TanStack Query); client state is local UI (open dialogs, inputs — `useState`).

**Q:** 🟡 Redux vs Context vs Zustand vs TanStack Query?

**A:** Context = DI without selectors; Redux = predictable global store with devtools/middleware; Zustand = tiny store with selectors; TanStack Query = server cache. This app needs only Query + local state.

**Q:** 🟡 How does React handle forms with many fields efficiently?

**A:** Libraries like React Hook Form keep values in refs/DOM and subscribe fields individually so typing doesn't re-render the whole form.

**Q:** 🟡 What is `dangerouslySetInnerHTML` and its risk?

**A:** Injects raw HTML; untrusted content enables XSS. React escapes text by default — the app never uses it.

**Q:** 🟡 How do you optimise bundle size in a React app?

**A:** Route-level code splitting (`lazy`), tree-shakable imports (lucide icons per import), vendor chunk splitting (`vite.config.ts:28-38`), removing unused deps.

**Q:** 🟡 What are higher-order components?

**A:** Functions taking a component and returning an enhanced one (`withAuth(Component)`); mostly replaced by hooks.

**Q:** 🟡 What is the "children as function"/render-props pattern?

**A:** Passing a function as a child/prop that returns UI, giving the parent control over rendering with internal state — e.g. `NavLink`'s `className={({ isActive }) => …}` (`Sidebar.tsx:29`).

**Q:** 🟡 How does `asChild`/Slot composition work?

**A:** The component renders its child element instead of its own, merging props/handlers/refs — e.g. `<Button asChild><Link/></Button>` (`AppShell.tsx:49-54`).

**Q:** 🟡 What's the difference between `useRef` and `createRef`?

**A:** `useRef` returns the same object every render (persistent); `createRef` creates a new ref each call (used in classes).

**Q:** 🔴 How does React prioritise updates in concurrent mode?

**A:** Updates get lanes (priorities): discrete input is urgent; transitions are interruptible; React can pause a low-priority render to handle urgent work and resume or restart later.

**Q:** 🔴 What's tearing and how does `useSyncExternalStore` prevent it?

**A:** Tearing is different parts of the UI showing different values of an external store during a concurrent render; `useSyncExternalStore` forces synchronous, consistent reads. Libraries like TanStack Query use it.

**Q:** 🟡 How do you test React components?

**A:** React Testing Library with jsdom: render, query by role/label, simulate user events, assert visible output. This repo tests pure logic only; component tests would be the next step.

**Q:** 🟡 What are accessibility basics in React?

**A:** Semantic elements, labels (`htmlFor`), `aria-*` attributes, focus management, keyboard support, `role="alert"` for errors (`FormField.tsx:25`), screen-reader text (`sr-only`).

**Q:** 🟢 Why does `PatientDetailPage` call all hooks before `if (patient.isPending) return …`?

**A:** Rules of Hooks — the same hooks must run in the same order every render (`PatientDetailPage.tsx:51-64`).

**Q:** 🟢 What does `<Outlet />` render in `AppShell`?

**A:** The matched child route's element inside `<main>` (`AppShell.tsx:60`).

**Q:** 🟡 How does `PrescriptionsPage` show a count badge without fetching all drafts?

**A:** A second query with `page_size: 1` reads `total` (`PrescriptionsPage.tsx:26`).

**Q:** 🟡 Why is `useUser()` safe in `AppShell`?

**A:** `AppShell` renders only inside `RequireAuth`, which guarantees a user; `useUser` throws otherwise to catch misuse (`hooks.ts:37-41`).

**Q:** 🟡 What would happen if `queryClient` were created inside `App()`?

**A:** A new cache on every render/remount — losing cached data and potentially causing refetch loops.

**Q:** 🟡 How does the review page avoid editing during AI reading?

**A:** `<fieldset disabled={!editable || reading}>` and a disabled submit button (`PrescriptionReviewPage.tsx:235, 257`).

**Q:** 🔴 Why might `form.watch('patientChoice')` cause more renders than `useWatch`?

**A:** `watch` subscribes the whole component using the form (here `PatientSection`), re-rendering it on change; `useWatch` can isolate the subscription to a smaller child. Acceptable here since the section is the consumer.

**Q:** 🟡 How do you pass a component as a prop and render it?

**A:** Type it (`icon: LucideIcon`), rename to capitalised (`icon: Icon`), render `<Icon />` (`EmptyState.tsx:14, 23`).

**Q:** 🟡 Why do dialogs in this app take `open` and `onOpenChange` props?

**A:** They're controlled by the parent, which decides when they open (e.g. from a dropdown item) and can react to closing (reset forms).

**Q:** 🟢 What is `sr-only`?

**A:** A Tailwind class hiding content visually while keeping it for screen readers — e.g. the app name in `Logo.tsx:51`.

**Q:** 🟡 What does `role="status" aria-live="polite"` do?

**A:** Screen readers announce content changes in that region without interrupting — used for loaders and the reading banner (`FullPageLoader.tsx:6`, `PrescriptionReviewPage.tsx:180-181`).
