# JavaScript — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

## Definitions & concepts

**Q:** 🟢 What are JavaScript's primitive types?

**A:** `string`, `number`, `bigint`, `boolean`, `undefined`, `null`, `symbol`. Everything else (objects, arrays, functions, dates) is an object. Primitives are immutable and compared by value.

**Q:** 🟢 What's the difference between `null` and `undefined`?

**A:** `undefined` means "not assigned / missing"; `null` means "intentionally empty". APIs usually send `null` (JSON has no `undefined`) — e.g. `phone: string | null` in `frontend/src/api/types.ts:9`.

**Q:** 🟢 Why does `typeof null` return `"object"`?

**A:** A bug from the first JS implementation (type tags) kept for backward compatibility. Check for null with `x === null`.

**Q:** 🟢 `let` vs `const` vs `var`?

**A:** `var` is function-scoped and hoisted as `undefined`; `let`/`const` are block-scoped and in the temporal dead zone until declared. `const` prevents reassignment (not mutation). Default to `const`, use `let` when reassigning (`client.ts:43`).

**Q:** 🟢 What is hoisting?

**A:** Declarations are processed before execution: function declarations are fully hoisted (callable before their line), `var` is hoisted as `undefined`, `let/const/class` are hoisted but inaccessible (TDZ). `PatientDetailPage.tsx` uses `VisitCard` before its declaration at line 245 — works because it's a function declaration.

**Q:** 🟢 What is the temporal dead zone?

**A:** The time between entering a scope and the `let`/`const` declaration line; accessing the variable there throws `ReferenceError`.

**Q:** 🟢 `==` vs `===`?

**A:** `===` compares without type conversion; `==` coerces (`'1' == 1` is true, `0 == ''` is true). Use `===` except the idiom `x != null`, which checks for both null and undefined (`form.ts:76`).

**Q:** 🟢 List the falsy values.

**A:** `false, 0, -0, 0n, '', null, undefined, NaN`. Everything else is truthy, including `'0'`, `[]` and `{}`.

**Q:** 🟢 What does `??` do and how is it different from `||`?

**A:** `a ?? b` returns `b` only if `a` is `null` or `undefined`; `a || b` returns `b` for any falsy `a`. `0 ?? 5` is `0`, `0 || 5` is `5` — important for counts and empty strings.

**Q:** 🟢 What is optional chaining?

**A:** `a?.b` returns `undefined` instead of throwing when `a` is null/undefined; works for calls `fn?.()` and indexes `arr?.[0]`. Used in `lib/utils.ts:13` `parts[0]?.[0]`.

**Q:** 🟢 What is a template literal?

**A:** A backtick string allowing `${expression}` interpolation and multiple lines, e.g. `` `/prescriptions/${draft.id}` `` (`ScanPage.tsx:66`).

**Q:** 🟢 What's the difference between arrow functions and regular functions?

**A:** Arrows have no own `this`, `arguments`, `super` or `prototype` and can't be called with `new`; they inherit `this` lexically. They're concise for callbacks.

**Q:** 🟢 What is destructuring?

**A:** Unpacking values from arrays or properties from objects into variables: `const [a, b] = arr`, `const { id = '' } = useParams()` (`PatientDetailPage.tsx:51`), with defaults and renaming (`{ icon: Icon }`).

**Q:** 🟢 Spread vs rest?

**A:** Same `...` syntax: spread expands (`[...prev, ...added]`, `{...obj}`); rest collects (`function f(...args)`, `const { a, ...others } = obj`).

**Q:** 🟢 What does `Array.prototype.map` return?

**A:** A new array of the same length with each element transformed; it doesn't mutate the original.

**Q:** 🟢 `map` vs `forEach`?

**A:** `map` returns a new array; `forEach` returns `undefined` and is for side effects. Don't use `map` just to loop.

**Q:** 🟢 What does `filter(Boolean)` do?

**A:** Keeps truthy items, removing `null`, `undefined`, `''`, `0`, `false`. Used to build "a · b · c" strings while skipping missing parts (`PatientsPage.tsx:70-76`).

**Q:** 🟢 What is JSON and how do you convert to/from it?

**A:** A text data format; `JSON.stringify(obj)` serialises and `JSON.parse(text)` parses. `res.json()` parses a fetch response body; `client.ts:72` stringifies request bodies.

**Q:** 🟡 What is a closure?

**A:** A function together with the variables of the scope it was created in; those variables stay alive as long as the function does. `refreshSession` in `client.ts:103-111` closes over the module-level `refreshing` promise.

**Q:** 🟡 Give a practical use of closures.

**A:** Data privacy and factories (counters, memoisation), event handlers remembering values, debouncing, module-level registries like `setSessionExpiredHandler` (`client.ts:43-48`).

**Q:** 🟡 How is `this` determined?

**A:** By the call site: method call → the object; plain call in strict mode → `undefined`; `new` → new instance; `call/apply/bind` → given value; arrow functions inherit from the enclosing scope.

**Q:** 🟡 What do `call`, `apply` and `bind` do?

**A:** `call(thisArg, ...args)` and `apply(thisArg, argsArray)` invoke immediately with a chosen `this`; `bind(thisArg)` returns a new function permanently bound to it.

**Q:** 🟡 What is the prototype chain?

**A:** Each object has an internal link (`[[Prototype]]`) to another object; property lookups walk up the chain until found or `null`. Classes are syntax over this mechanism; `ApiError extends Error` puts `Error.prototype` in the chain (`client.ts:15`).

**Q:** 🟡 What does `class X extends Y` require in the constructor?

**A:** Calling `super(...)` before using `this`, because the parent constructor creates the object (`client.ts:21`).

**Q:** 🟡 What is a Promise?

**A:** An object representing a future value, in state pending, fulfilled or rejected; consumers attach `.then/.catch/.finally` or `await` it. Once settled it never changes.

**Q:** 🟡 What does `async` do to a function?

**A:** It always returns a Promise; returned values become fulfilment values and thrown errors become rejections. Inside, `await` pauses the function until a promise settles.

**Q:** 🟡 Does `await` block the thread?

**A:** No. It suspends only the async function; the event loop keeps running other tasks, and the function resumes as a microtask when the promise settles.

**Q:** 🟡 What is the event loop?

**A:** The host mechanism that runs the call stack to completion, then drains all microtasks (promise callbacks), possibly renders, then takes the next macrotask (timer, I/O, UI event), repeating forever.

**Q:** 🟡 Microtask vs macrotask?

**A:** Microtasks: promise reactions, `queueMicrotask`, `MutationObserver` — run right after the current task, all of them. Macrotasks: `setTimeout`, `setInterval`, I/O, events — one per loop iteration.

**Q:** 🟡 `Promise.all` vs `Promise.allSettled` vs `Promise.race` vs `Promise.any`?

**A:** `all`: all fulfil or first rejection; `allSettled`: waits for all, never rejects; `race`: first to settle; `any`: first to fulfil, rejects only if all reject. `ScanPage.tsx:64` uses `Promise.all` for parallel photo prep.

**Q:** 🟡 Why does `fetch` not reject on 404 or 500?

**A:** HTTP errors are valid responses; `fetch` rejects only on network failure, CORS block or abort. You check `res.ok` (`client.ts:128`).

**Q:** 🟡 What are ES modules?

**A:** The standard module system: `import`/`export`, static structure (enables tree shaking), strict mode, file-level scope, executed once, live bindings. `"type": "module"` in `package.json:5`.

**Q:** 🟡 Named vs default exports?

**A:** Named exports (`export function App`) must be imported by name; default exports can be imported under any name. Named exports are easier to refactor and auto-import — this repo uses only named exports.

**Q:** 🟡 What is `import type`?

**A:** TypeScript syntax importing only types; erased at compile time, so it never creates a runtime dependency (`api/auth.ts:2`).

**Q:** 🟡 What is a shallow copy and how do you deep copy?

**A:** Spread/`Object.assign` copy one level; nested objects are shared. `structuredClone(obj)` deep-copies (also Maps, Dates); `JSON.parse(JSON.stringify(x))` loses functions/dates.

**Q:** 🟡 Why is immutability important in React code?

**A:** React detects changes by reference; mutating an array in place keeps the same reference, so React may not re-render. Create new arrays (`[...prev, x]`, `prev.filter(...)`) as in `ScanPage.tsx:50, 57`.

**Q:** 🟡 What does the `void` operator do in `void qc.invalidateQueries(...)`?

**A:** Evaluates the expression and returns `undefined`; used to explicitly ignore a promise (satisfying "no floating promises" lint rules and signalling intent) (`features/patients/hooks.ts:33`).

**Q:** 🟡 How do you cancel a fetch?

**A:** Pass `signal` from an `AbortController` and call `controller.abort()`; the promise rejects with a `DOMException` named `AbortError` (`client.ts:73, 76`).

**Q:** 🟡 What does `Object.entries` return?

**A:** An array of `[key, value]` pairs for an object's own enumerable string keys — used to iterate query params (`client.ts:52`).

**Q:** 🟡 What does `??=` do?

**A:** Logical nullish assignment: assigns only if the left side is null/undefined. `refreshing ??= fetch(...)` starts a refresh only if none is in flight (`client.ts:104`).

**Q:** 🔴 What is a stale closure and how do you avoid it?

**A:** A callback that captured an old value of a variable and keeps using it. Avoid with functional state updates (`setOpen((o) => !o)`), refs holding the latest value (`ScanPage.tsx:40-42`), or correct effect dependencies.

**Q:** 🔴 Why are floats like `0.1 + 0.2` not equal to `0.3`?

**A:** Numbers are IEEE-754 binary doubles; 0.1 and 0.2 can't be represented exactly. For money use integer minor units (`takaToMinor`, `format.ts:21-23`) or decimal libraries.

**Q:** 🔴 What's `Number.EPSILON` and `Number.MAX_SAFE_INTEGER`?

**A:** `EPSILON` is the gap between 1 and the next double (≈2.2e-16), useful for tolerant float comparison; `MAX_SAFE_INTEGER` (2^53−1) is the largest integer representable exactly — beyond it use `BigInt`.

**Q:** 🔴 What is event delegation?

**A:** Attaching one listener to a parent and handling events from children via bubbling and `event.target`. React attaches its listeners at the root and dispatches synthetic events this way.

**Q:** 🔴 Bubbling vs capturing?

**A:** Events travel capture phase (window → target) then bubble (target → window). `addEventListener(type, fn, { capture: true })` listens in capture; `stopPropagation` halts further travel.

**Q:** 🔴 What is `queueMicrotask` and when is it useful?

**A:** Schedules a function as a microtask — after current code, before rendering/timers. Useful to batch work after synchronous updates without the delay of `setTimeout`.

**Q:** 🔴 How does garbage collection work and how do leaks happen?

**A:** Mark-and-sweep frees objects unreachable from roots. Leaks come from lingering references: global caches, forgotten listeners/timers, closures holding big objects, detached DOM nodes, unrevoked object URLs (`ScanPage.tsx` revokes them).

**Q:** 🔴 What is a WeakMap?

**A:** A Map whose keys are objects held weakly — entries disappear when the key is garbage-collected. Good for metadata about objects without preventing GC.

**Q:** 🔴 Generators and iterators?

**A:** An iterator has `next()` returning `{ value, done }`; generators (`function*` + `yield`) create iterators lazily. `for...of` and spread work on any iterable.

**Q:** 🔴 What are getters/setters?

**A:** Accessor properties computed on access: `get fieldErrors()` in `ApiError` (`client.ts:29-31`) looks like a property but runs code.

**Q:** 🔴 How does `instanceof` work and when does it fail?

**A:** It checks whether `Constructor.prototype` is in the object's prototype chain. It fails across realms (iframes) and for TS interfaces (no runtime existence).

**Q:** 🔴 What is "single-flight" and where is it used?

**A:** Ensuring concurrent callers share one in-flight operation instead of duplicating it. `refreshSession` stores the pending promise and returns it to every caller until it settles (`client.ts:101-111`).

**Q:** 🔴 What is debouncing vs throttling?

**A:** Debounce: run after input stops for N ms (search box, `PatientsPage.tsx:25-30`). Throttle: run at most once per N ms (scroll handlers).

## Predict the output / find the bug

**Q:** 🟡 Predict: `console.log('A'); setTimeout(() => console.log('B')); Promise.resolve().then(() => console.log('C')); console.log('D')`

**A:** `A D C B` — synchronous code first, then microtasks (C), then the timer macrotask (B).

**Q:** 🟡 Predict: `for (var i = 0; i < 3; i++) setTimeout(() => console.log(i))`

**A:** `3 3 3` — one shared function-scoped `i`. With `let`, each iteration gets its own binding → `0 1 2`.

**Q:** 🟢 Predict: `[] == false`, `[] === false`, `!![]`

**A:** `true` (coercion: `[]` → `''` → `0`, `false` → `0`), `false`, `true` (objects are truthy).

**Q:** 🟢 Predict: `0 ?? 'x'`, `0 || 'x'`, `null ?? 'x'`

**A:** `0`, `'x'`, `'x'`.

**Q:** 🟡 Predict: `const a = { n: 1 }; const b = a; b.n = 2; console.log(a.n)`

**A:** `2` — both names reference the same object.

**Q:** 🟡 Predict: `[1, 2, 3].map(parseInt)`

**A:** `[1, NaN, NaN]` — `map` passes `(value, index)`, so `parseInt('2', 1)` and `parseInt('3', 2)` are invalid radixes.

**Q:** 🟡 Find the bug: `async function load() { try { return fetch(url) } catch { return null } }`

**A:** Without `await`, a rejected fetch promise is returned and escapes the `try`. Use `return await fetch(url)` (as in `client.ts:63`).

**Q:** 🟡 Find the bug: `items.forEach(async (x) => { await save(x) }); console.log('done')`

**A:** `forEach` doesn't wait for async callbacks, so "done" logs before saves finish and errors are unhandled. Use `for (const x of items) await save(x)` or `await Promise.all(items.map(save))`.

**Q:** 🟡 Predict: `typeof NaN`, `NaN === NaN`, `Number.isNaN(NaN)`

**A:** `"number"`, `false`, `true`.

**Q:** 🟡 Predict: `console.log(x); var x = 5; console.log(y); let y = 5`

**A:** `undefined`, then `ReferenceError` (TDZ for `y`).

**Q:** 🟡 Predict: `const o = { name: 'A', hi() { return this.name }, hi2: () => this?.name }; o.hi(); o.hi2()`

**A:** `'A'` and `undefined` — the arrow function doesn't bind `this` to `o` (module scope `this` is undefined).

**Q:** 🟢 Predict: `Number(null)`, `Number(undefined)`, `Number('')`

**A:** `0`, `NaN`, `0` — why `Number(params.get('page')) || 1` falls back to 1 when the param is missing (`PatientsPage.tsx:21`).

**Q:** 🟡 Find the bug: `const sorted = state.items.sort((a, b) => a - b); setItems(sorted)`

**A:** `sort` mutates in place, so the state array is mutated and the reference doesn't change — React may not re-render. Use `[...state.items].sort(...)` or `toSorted`.

**Q:** 🔴 Predict: `new Date('2026-10-08').toLocaleDateString('en-US', { timeZone: 'America/New_York' })`

**A:** `10/7/2026` — a date-only ISO string is parsed as UTC midnight, which is the previous evening in New York. This is why `formatDay` splits the string (`format.ts:75-78`).

**Q:** 🟡 Predict: `0.1 + 0.2 === 0.3` and `Math.round(19.99 * 100)`

**A:** `false`; `1999` (the raw product is `1998.9999999999998`).

**Q:** 🟡 Find the bug: `if (count) return <Badge>{count}</Badge>` used as `{count && <Badge/>}` in JSX

**A:** When `count` is `0`, JSX renders `0`. Use `!!count &&` or `count > 0 &&` (`PrescriptionsPage.tsx:64`).

**Q:** 🔴 Predict the order: `async function f() { console.log(1); await null; console.log(2) } f(); console.log(3)`

**A:** `1 3 2` — code before the first `await` runs synchronously; the rest resumes as a microtask.

## Scenarios

**Q:** 🟡 Five requests fail with 401 at the same moment. How do you refresh the token only once?

**A:** Keep a module-level promise for the in-flight refresh; every caller awaits it; clear it in `finally`. That's exactly `refreshSession` with `??=` (`client.ts:101-111`).

**Q:** 🟡 A search input fires a request per keystroke. Fix it.

**A:** Debounce (setTimeout + clearTimeout in an effect, `PatientsPage.tsx:25-30`) and cancel outdated requests with `AbortSignal` (TanStack Query passes one, `features/patients/hooks.ts:14`).

**Q:** 🟡 Users report the app's memory grows each time they add photos. What do you check?

**A:** Object URLs from `URL.createObjectURL` must be revoked; listeners/timers cleaned up; large blobs not kept in state longer than needed. `ScanPage.tsx` revokes on remove and unmount.

**Q:** 🟡 How would you display money stored as paisa?

**A:** Keep integers, divide by 100 only at display with `Intl.NumberFormat` and a locale with correct grouping (`formatBDT`, `format.ts:13-18`).

**Q:** 🔴 A date shows one day earlier for some users. Likely cause?

**A:** Parsing a date-only string (`'YYYY-MM-DD'`) with `new Date` → UTC midnight, then formatting in a negative-offset time zone. Treat calendar dates as strings or construct with local parts.

**Q:** 🟡 An error from the API sometimes is HTML (proxy 502). How do you handle it?

**A:** Try `res.json()` inside try/catch and fall back to a generic error object (`toError`, `client.ts:81-98`).

**Q:** 🔴 How do you guarantee cleanup code runs after an async operation even on error?

**A:** `try { await op() } finally { cleanup() }` — as `ScanPage.tsx:61-71` resets `preparing`.

**Q:** 🟡 You need to wait for several independent API calls. Sequential or parallel?

**A:** Parallel with `Promise.all` if they don't depend on each other — total time ≈ slowest call instead of the sum. Use `allSettled` if partial failure is acceptable.

## Write-it-quickly tasks

**Q:** 🟡 Write a `debounce(fn, ms)`.

**A:**
```js
function debounce(fn, ms) {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}
```

**Q:** 🟡 Write `once(fn)` that runs a function only once.

**A:**
```js
function once(fn) { let done = false, r; return (...a) => (done ? r : ((done = true), (r = fn(...a)))) }
```

**Q:** 🟡 De-duplicate an array of objects by `id`, keeping the first.

**A:** `arr.filter((o, i, all) => all.findIndex((x) => x.id === o.id) === i)` (O(n²), used in `PrescriptionReviewPage.tsx:298`) or with a `Set` for O(n): `const seen = new Set(); arr.filter(o => !seen.has(o.id) && seen.add(o.id))`.

**Q:** 🟡 Group items by a key.

**A:** `items.reduce((acc, x) => ((acc[x.k] ??= []).push(x), acc), {})` or `Object.groupBy(items, (x) => x.k)` (ES2024).

**Q:** 🟡 Convert an object to a query string skipping empty values.

**A:**
```js
const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])).toString()
```
(`client.ts:50-58` does the same with `URL.searchParams`.)

**Q:** 🟡 Promisify a callback API like `canvas.toBlob`.

**A:** `const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))` (`lib/image.ts:18-20`).

**Q:** 🔴 Implement `promiseAllSettled` using `Promise.all`.

**A:**
```js
const settle = (ps) => Promise.all(ps.map((p) => Promise.resolve(p).then(
  (value) => ({ status: 'fulfilled', value }), (reason) => ({ status: 'rejected', reason }))))
```

**Q:** 🔴 Write a retry helper with exponential backoff.

**A:**
```js
async function retry(fn, tries = 3, base = 200) {
  for (let i = 0; ; i++) {
    try { return await fn() } catch (e) { if (i >= tries - 1) throw e; await new Promise(r => setTimeout(r, base * 2 ** i)) }
  }
}
```

**Q:** 🟡 Get initials from "Dr. Rahim Uddin".

**A:** Strip titles, split on whitespace, take first and last letters: see `initials` in `lib/utils.ts:8-16` → `"RU"`.

**Q:** 🟡 Format `'2026-10-08'` as `'08/10/2026'` without Date.

**A:** `const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`` (`format.ts:75-78`).

**Q:** 🟡 Validate a Bangladeshi mobile number.

**A:** Normalise (strip spaces/dashes/+, `880` → `0`) then test `/^01[3-9]\d{8}$/` (`lib/phone.ts:1-9`).

## Real interview questions

**Q:** 🟡 Explain how `async/await` relates to promises.

**A:** It's syntax over promises: `await p` is like `p.then(continuation)`; errors become exceptions catchable with try/catch; the function returns a promise.

**Q:** 🟡 What happens when you type a URL in the browser and press Enter (JS-relevant parts)?

**A:** DNS, TCP/TLS, HTTP request, HTML parsed into DOM, CSS into CSSOM, scripts fetched (module scripts deferred), executed, render tree → layout → paint; then the event loop handles interactions. In this app, `index.html` loads `/src/main.tsx` which mounts React.

**Q:** 🟡 What is the difference between `for...in` and `for...of`?

**A:** `for...in` iterates enumerable keys (including inherited) of an object; `for...of` iterates values of an iterable (arrays, strings, Maps).

**Q:** 🟡 What is `Object.freeze`?

**A:** Makes an object's own properties non-writable and non-configurable (shallow). `as const` in TS is a compile-time analogue.

**Q:** 🟡 How do you check if a value is an array?

**A:** `Array.isArray(x)` (`client.ts:30`); `typeof` returns `"object"` for arrays.

**Q:** 🔴 Explain `Symbol` and a use case.

**A:** A unique, non-enumerable-by-default primitive used as property keys to avoid collisions and for protocols (`Symbol.iterator`, `Symbol.asyncIterator`).

**Q:** 🔴 What is a Proxy?

**A:** An object wrapping another with traps for get/set/has etc. Used for reactivity (Vue), validation, and in React Hook Form's `formState` to track which properties a component reads.

**Q:** 🟡 What does "JavaScript is single-threaded" really mean?

**A:** Your JS runs on one thread per realm; the host (browser/Node) does I/O and timers in parallel and queues callbacks. Web Workers give additional JS threads without shared DOM.

**Q:** 🟡 What is CORS from the JS side?

**A:** The browser blocks reading cross-origin responses unless the server allows it; `fetch` rejects with a TypeError. This app avoids it with a same-origin proxy (`vite.config.ts:17-22`).

**Q:** 🟡 What's the difference between `localStorage`, `sessionStorage` and cookies?

**A:** Storage APIs hold strings readable by JS (per origin; session = per tab); cookies are sent with requests, can be `HttpOnly` (unreadable by JS). Auth tokens here are httpOnly cookies, never in storage.

**Q:** 🔴 What is tree shaking and what breaks it?

**A:** Removing unused exports at bundle time, relying on static ESM imports. Side-effectful modules, CommonJS, and dynamic property access on namespaces limit it.

**Q:** 🟡 What is `structuredClone`?

**A:** A built-in deep clone supporting Dates, Maps, Sets, typed arrays, cycles; it can't clone functions or DOM nodes.

**Q:** 🔴 How do you avoid blocking the main thread with heavy work?

**A:** Move it to a Web Worker, chunk it with `requestIdleCallback`/`setTimeout`, or use APIs that run off-thread (`createImageBitmap` decodes images off the main thread — used in `lib/image.ts:11`).

**Q:** 🟡 Explain `export const api = { get: <T>(...) => request<T>(...) }` from this project.

**A:** An object of arrow functions, each generic over the response type, delegating to one `request` function with different methods — a tiny typed HTTP client (`client.ts:138-147`).

**Q:** 🟡 Why does this project throw `ApiError` objects rather than strings?

**A:** Errors carry `status`, `code`, `details` and a stack; callers branch on `instanceof ApiError` and `code` (`ChangePasswordDialog.tsx:56`).

**Q:** 🔴 What's the risk of `setTimeout(() => URL.revokeObjectURL(url), 1000)` in the download helper?

**A:** On a very slow device the download might not have started in 1 s; most browsers start immediately on `click()`, so it's a pragmatic compromise between leaking and breaking (`SharePrescription.tsx:30`).

**Q:** 🟢 What does `Array.from({ length: 4 }, (_, i) => i)` produce?

**A:** `[0, 1, 2, 3]` — creating N items for skeleton rows (`DashboardPage.tsx:74`).

**Q:** 🟢 What does `str.trim()` do?

**A:** Removes leading/trailing whitespace; used before validation and saving (`form.ts:57`).

**Q:** 🟢 What does `split('\n').map(s => s.trim()).filter(Boolean)` do?

**A:** Turns a multi-line textarea into a list of non-empty trimmed lines (`form.ts:52-56`).

**Q:** 🟡 Explain the regex `/^(dr|mr|mrs|ms)\.?\s+/i`.

**A:** At the start, one of the titles, optional dot, one or more spaces, case-insensitive — strips "Dr. " from names (`lib/utils.ts:10`).

**Q:** 🟡 What's a `DOMException` and why check its `name`?

**A:** The error type thrown by Web APIs; `name` distinguishes kinds (`AbortError`, `NotAllowedError`). Abort means "cancelled on purpose" and should be ignored (`SharePrescription.tsx:49`).

**Q:** 🟡 What is `globalThis`?

**A:** A standard reference to the global object in any environment (`window` in browsers, `global` in Node).

**Q:** 🔴 Why check `typeof navigator !== 'undefined'` at module scope?

**A:** Module code runs on import; in non-browser environments (Vitest node, SSR) `navigator` doesn't exist and accessing it would throw (`SharePrescription.tsx:34`).
