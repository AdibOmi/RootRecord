# TypeScript — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

## Definitions & concepts

**Q:** 🟢 What is TypeScript?

**A:** A superset of JavaScript that adds static types checked at compile time; types are erased and the output is plain JS. It catches shape errors before running code.

**Q:** 🟢 Does TypeScript run in the browser?

**A:** No. It's compiled (or type-stripped by esbuild/Vite) to JavaScript first. In this repo Vite strips types and `tsc -b` checks them (`package.json:8`).

**Q:** 🟢 What is type inference?

**A:** TS deduces types you don't write: `const page = 1` is `1`, `let page = 1` is `number`, return types of functions are inferred from `return` statements.

**Q:** 🟢 `interface` vs `type`?

**A:** Both describe object shapes. Interfaces can be extended and merged (re-opened); type aliases can also express unions, tuples, primitives and mapped/conditional types. Convention here: interfaces for objects (`api/types.ts:5`), types for unions (`api/types.ts:3`).

**Q:** 🟢 What is a union type?

**A:** A value that may be one of several types: `string | null`, `'draft' | 'confirmed'` (`api/types.ts:63`). You narrow before using type-specific operations.

**Q:** 🟢 What is an intersection type?

**A:** `A & B` has all properties of both — e.g. `SectionProps & { prescription: PrescriptionDetail }` (`PrescriptionReviewPage.tsx:288`).

**Q:** 🟢 What is a literal type?

**A:** A type that is exactly one value: `'admin'`, `42`, `true`. Unions of literals model enums.

**Q:** 🟢 Optional property vs `| undefined` vs `| null`?

**A:** `x?: T` may be missing; `x: T | undefined` must be present but can be undefined; `x: T | null` is present and may be null. The API uses `| null` for fields always sent (`api/types.ts:9`), inputs use `?` (`api/types.ts:51`).

**Q:** 🟢 What is `any`?

**A:** A type that disables checking — anything goes in and out. It's banned here by ESLint (`eslint.config.js:16`).

**Q:** 🟢 What is `unknown`?

**A:** The type-safe top type: you can assign anything to it but must narrow before using it. `ApiError.details: unknown` (`client.ts:18`).

**Q:** 🟢 What is `never`?

**A:** The type with no values — for functions that never return (throw/loop) and for exhaustiveness checks in switch statements.

**Q:** 🟢 What is `void`?

**A:** The return type of functions that don't return a meaningful value, e.g. `onOpenChange: (open: boolean) => void`.

**Q:** 🟢 How do you type an array?

**A:** `string[]` or `Array<string>`; read-only: `readonly string[]` (`form.ts:131`).

**Q:** 🟢 What is a tuple?

**A:** A fixed-length array with per-position types: `[string, ReactNode]` rows in `PatientDetailPage.tsx:246`.

**Q:** 🟢 What is a type assertion?

**A:** `x as T` tells the compiler to treat a value as `T`; no runtime effect. Use sparingly — `(await res.json()) as T` trusts the server (`client.ts:135`).

**Q:** 🟢 What does the `!` postfix operator do?

**A:** Non-null assertion: removes `null | undefined` from a type (`document.getElementById('root')!`, `main.tsx:7`). It lies if the value can actually be null.

**Q:** 🟡 What is narrowing?

**A:** Refining a union to a specific member inside a branch via `typeof`, `instanceof`, `in`, equality, truthiness, `Array.isArray`, or discriminant properties. `err instanceof ApiError` then `err.status` (`App.tsx:29`).

**Q:** 🟡 What is a discriminated union?

**A:** A union whose members share a literal "tag" property (`{ type: 'a', … } | { type: 'b', … }`); checking the tag narrows to one member. Great for state machines and API results.

**Q:** 🟡 What is a type guard function?

**A:** A function returning `value is T`, e.g. `function isApiError(e: unknown): e is ApiError { return e instanceof ApiError }`; callers get narrowing.

**Q:** 🟡 What are generics?

**A:** Type parameters that make functions/types reusable while preserving relationships: `request<T>(path): Promise<T>` (`client.ts:132`), `Page<T>` (`api/types.ts:16`).

**Q:** 🟡 What is a generic constraint?

**A:** `T extends Something` limits allowed types so you can use their properties: `function len<T extends { length: number }>(x: T)`.

**Q:** 🟡 What do `Partial`, `Required`, `Readonly` do?

**A:** Make all properties optional, required, or read-only. `Partial<PatientInput>` for PATCH bodies (`api/patients.ts:14`).

**Q:** 🟡 What do `Pick` and `Omit` do?

**A:** Build a type from a subset (`Pick<User, 'role'>`, `permissions.ts:30`) or by removing keys (`Omit<PrescriptionSummary, 'extracted_patient_name' | 'has_extraction_error'>`, `api/types.ts:111`).

**Q:** 🟡 What is `Record<K, V>`?

**A:** An object type with keys `K` and values `V`: `Record<string, QueryValue>` (`client.ts:39`).

**Q:** 🟡 What do `ReturnType` and `Parameters` do?

**A:** Extract a function type's return type or parameter tuple: `type R = ReturnType<typeof usePatients>`.

**Q:** 🟡 What does `keyof` do?

**A:** Produces the union of a type's keys: `keyof typeof PERMISSIONS` → `'staff:manage' | …` (`permissions.ts:28`).

**Q:** 🟡 What does `typeof` mean in a type position?

**A:** "The type of this value": `typeof en` gives the inferred type of the strings object (`en.ts:273`).

**Q:** 🟡 What is an indexed access type?

**A:** `T[K]` gets the type of property `K`: `(typeof PERMISSIONS)['clinical:edit']` → `readonly ['admin', 'dentist']`.

**Q:** 🟡 What does `as const` do?

**A:** Makes literals as narrow as possible and read-only: `['auth', 'me'] as const` → `readonly ['auth', 'me']` (`features/auth/hooks.ts:7`).

**Q:** 🟡 What does `satisfies` do?

**A:** Checks that an expression matches a type without changing the expression's inferred type. `PERMISSIONS … as const satisfies Record<string, readonly UserRole[]>` validates roles yet keeps exact keys (`permissions.ts:26`).

**Q:** 🟡 `as` vs `satisfies`?

**A:** `as` overrides the type (can hide errors); `satisfies` validates and keeps inference. Prefer `satisfies` for config objects.

**Q:** 🟡 What is structural typing?

**A:** Compatibility is based on shape, not names: any object with the required properties fits. A `PatientListItem` can be passed where `PatientRef` is expected (`PrescriptionReviewPage.tsx:539`).

**Q:** 🟡 What are excess property checks?

**A:** Object *literals* assigned directly to a typed variable can't have unknown properties (catches typos); non-literal objects aren't checked this way.

**Q:** 🟡 TS enum vs union of string literals?

**A:** Enums emit runtime objects and numeric enums are loosely typed; string unions are erased and simpler. This project uses unions only (`api/types.ts:3, 27, 63`).

**Q:** 🟡 What is `import type` and why use it?

**A:** Imports only types, erased at build; avoids accidental runtime imports and circular dependency issues, and is required for some isolated-module setups (`api/auth.ts:2`).

**Q:** 🟡 What does `isolatedModules` require?

**A:** Each file must be transpilable alone (no cross-file type info) — e.g. re-exporting types needs `export type`. Needed because esbuild/Vite transpile file by file (`tsconfig.app.json:11`).

**Q:** 🟡 What does `strict: true` enable?

**A:** `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict`, `useUnknownInCatchVariables`.

**Q:** 🟡 What does `noUncheckedIndexedAccess` do?

**A:** Indexing arrays/records yields `T | undefined`, forcing checks. That's why `parts[0]?.[0] ?? ''` appears in `lib/utils.ts:13` (`tsconfig.app.json:19`).

**Q:** 🟡 What's `moduleResolution: "bundler"`?

**A:** Resolves imports like modern bundlers (package `exports`, no extension needed), matching Vite (`tsconfig.app.json:9`).

**Q:** 🟡 Why `noEmit: true`?

**A:** `tsc` only type-checks; Vite produces the JS. Avoids duplicate outputs (`tsconfig.app.json:13`).

**Q:** 🟡 What are project references?

**A:** `tsconfig.json` `references` split a codebase into projects (`app`, `node`) built with `tsc -b`, each with its own settings and incremental build info (`tsconfig.json:3`).

**Q:** 🟡 What are path aliases?

**A:** `paths: { "@/*": ["./src/*"] }` maps `@/api/client` to `src/api/client`; the bundler must be configured too (`vite.config.ts:10`).

**Q:** 🟡 How do you type React component props?

**A:** Declare an interface and destructure: `function EmptyState({ icon: Icon, title }: EmptyStateProps)` (`EmptyState.tsx:14`).

**Q:** 🟡 How do you type `useState` with a union?

**A:** `useState<'share' | 'download' | null>(null)` (`SharePrescription.tsx:38`) — explicit generic because inference from `null` alone would give `null`.

**Q:** 🟡 How do you type a ref to a DOM element?

**A:** `useRef<HTMLInputElement>(null)` → `ref.current` is `HTMLInputElement | null` (`ScanPage.tsx:33`).

**Q:** 🟡 How do you type event handlers?

**A:** `(e: KeyboardEvent) => void` for native listeners (`GlobalSearch.tsx:25`) or React types like `React.ChangeEvent<HTMLInputElement>`.

**Q:** 🟡 What is `ReactNode` vs `ReactElement` vs `JSX.Element`?

**A:** `ReactNode` is anything renderable (strings, null, arrays, elements); `ReactElement`/`JSX.Element` is a single element object. Use `ReactNode` for `children`/slots (`EmptyState.tsx:10`).

**Q:** 🟡 What does `z.infer<typeof schema>` give?

**A:** The TypeScript type of data that passes the Zod schema — one source of truth for validation and types (`form.ts:49`).

**Q:** 🔴 What is a mapped type?

**A:** A type built by iterating keys: `{ [K in keyof T]: … }`. Modifiers `readonly`/`?` can be added or removed (`-?`, `-readonly`). `Widen<T>` in `en.ts:272` is one.

**Q:** 🔴 What is a conditional type?

**A:** `T extends U ? X : Y` — type-level branching. Distributive over unions when `T` is a naked type parameter.

**Q:** 🔴 Explain `type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }`.

**A:** Recursively maps an object type, turning every string literal leaf into `string` and recursing into nested objects. Applied to `typeof en` it creates a `Messages` contract with the same keys but any string values — so a translation file must match the shape (`en.ts:272-273`).

**Q:** 🔴 What does `infer` do?

**A:** Captures a type inside a conditional type: `type Elem<T> = T extends (infer U)[] ? U : never`.

**Q:** 🔴 What are template literal types?

**A:** String types built from other types: `` type Path = `medications.${number}.${'name' | 'dosage'}` ``. React Hook Form uses them to type `register('medications.0.name')`.

**Q:** 🔴 How does `form.register(`medications.${i}.${key}`)` type-check?

**A:** RHF derives a union of valid dotted paths from the form type (`Path<ReviewValues>`); with `key` typed from an `as const` tuple, the template string matches a valid path (`PrescriptionReviewPage.tsx:662-669`).

**Q:** 🔴 What is declaration merging?

**A:** Multiple `interface` declarations with the same name merge into one; used to augment library types (e.g. adding fields to `Window` or a router's types).

**Q:** 🔴 What is a `.d.ts` file?

**A:** A declaration file containing only types for JS code; `/// <reference types="vitest/config" />` pulls in Vitest's declarations (`vite.config.ts:1`).

**Q:** 🔴 Covariance/contravariance in TS?

**A:** Return types are covariant; parameter types are checked contravariantly for function types under `strictFunctionTypes` (but bivariantly for method syntax). It decides when one function type is assignable to another.

**Q:** 🔴 What are branded (nominal) types?

**A:** A trick to make structurally identical types incompatible: `type PatientId = string & { __brand: 'PatientId' }`. Prevents passing a user id where a patient id is expected.

**Q:** 🔴 How would you make API types safer than `as T`?

**A:** Generate types from OpenAPI (`openapi-typescript`) and/or validate responses at runtime with Zod schemas, returning `z.infer` types (`api/types.ts` is hand-written today).

**Q:** 🔴 What's `useUnknownInCatchVariables`?

**A:** Part of `strict`: `catch (err)` variables are `unknown`, forcing narrowing (`if (err instanceof ApiError)`) as done in `ChangePasswordDialog.tsx:55-56`.

**Q:** 🔴 What's the cost of very complex types?

**A:** Slower compile/editor performance and unreadable errors; keep types simple at boundaries and use `skipLibCheck` to avoid checking dependencies (`tsconfig.app.json:8`).

## Predict / find the bug

**Q:** 🟢 What type is `x` in `const x = ['a', 'b']`?

**A:** `string[]`. With `as const` it becomes `readonly ['a', 'b']`.

**Q:** 🟡 Does this compile? `const arr: number[] = []; const first: number = arr[0]` with `noUncheckedIndexedAccess`

**A:** No — `arr[0]` is `number | undefined`. Handle `undefined` (`arr[0] ?? 0`).

**Q:** 🟡 Find the bug: `function f(x: string | number) { return x.toUpperCase() }`

**A:** `toUpperCase` doesn't exist on `number`; narrow with `typeof x === 'string'` first.

**Q:** 🟡 What's wrong: `const data = (await res.json()) as User` when the API sometimes returns `{ error: … }`?

**A:** The assertion lies; TS believes it's a `User`. Check `res.ok` first (as `sendAuthed` does) or validate the shape.

**Q:** 🟡 Predict: `type A = keyof { a: 1; b: 2 }`

**A:** `'a' | 'b'`.

**Q:** 🟡 Does `interface I { a: string }` exist at runtime?

**A:** No — `x instanceof I` is a compile error. Use a class, a tag property, or a schema check.

**Q:** 🟡 Predict the type of `p.patient?.full_name ?? p.extracted_patient_name` (`PrescriptionRow.tsx:11`).

**A:** `string | null` — `full_name` is `string` when a patient exists; otherwise falls back to `extracted_patient_name: string | null`.

**Q:** 🟡 Find the bug: `const [busy, setBusy] = useState(null); setBusy('share')`

**A:** `busy` is inferred as `null`, so `'share'` isn't assignable. Provide the generic: `useState<'share' | 'download' | null>(null)`.

**Q:** 🔴 Why does `can(user, 'clinical:edt')` fail to compile?

**A:** `Permission` is `keyof typeof PERMISSIONS`, a union of exact keys thanks to `as const satisfies` (`permissions.ts:7-28`); the typo isn't a member.

**Q:** 🔴 Predict: `type T = string extends 'a' ? 1 : 2`

**A:** `2` — `string` is not assignable to the literal `'a'`.

**Q:** 🟡 What's wrong with `catch (err) { toast.error(err.message) }` under strict?

**A:** `err` is `unknown`; access requires narrowing (`err instanceof Error`). The project uses `errorMessage(err)` (`client.ts:150-153`).

**Q:** 🟡 Is `{ id: 'p1', patient_code: 'X', full_name: 'Y', phone: null }` assignable to `PatientRef`?

**A:** As a variable, yes (structural, extra props allowed); as a direct object literal assignment, the extra `phone` triggers an excess-property error.

## Scenarios

**Q:** 🟡 The backend adds a required field. How would TypeScript help (or not)?

**A:** It won't notice by itself because `api/types.ts` is hand-written. With OpenAPI codegen, regenerating types would surface every place that constructs or reads the type.

**Q:** 🟡 You need a type for "all keys of the English strings, any values" for a Bangla file. How?

**A:** Derive it: `type Messages = Widen<typeof en>` and type `bn: Messages` (`en.ts:272-273`, `i18n/index.ts:4`).

**Q:** 🟡 How do you share types between form state and API payloads that differ (strings vs numbers)?

**A:** Keep two types — `ReviewValues` (form, all strings) and `PrescriptionSaveInput` (API) — and write typed converters `toFormValues`/`toSaveInput` (`form.ts:68-125`).

**Q:** 🟡 A third-party component's props must be extended. How?

**A:** `interface Props extends React.ComponentPropsWithoutRef<typeof Primitive> { extra?: boolean }` and forward refs with `React.ElementRef<typeof Primitive>` (`ui/dialog.tsx:27-34`).

**Q:** 🔴 How would you model the prescription draft lifecycle in types?

**A:** A discriminated union on `status` (`{ status: 'draft'; patient: PatientRef | null } | { status: 'confirmed'; patient: PatientRef; confirmed_by: StaffRef }`) so filed prescriptions always have a patient at the type level.

**Q:** 🟡 How do you make an object's keys checked but values literal?

**A:** `const X = { … } as const satisfies Record<string, T>`.

**Q:** 🟡 How do you type a function that accepts either an id or "new"?

**A:** `string` with a sentinel constant (`NEW_PATIENT = 'new'`, `form.ts:8`) works but is weak; a union `{ kind: 'existing'; id: string } | { kind: 'new' }` is stronger.

## Write-it-quickly tasks

**Q:** 🟡 Write a generic `Page<T>` type.

**A:** `interface Page<T> { items: T[]; total: number; page: number; page_size: number }` (`api/types.ts:16-21`).

**Q:** 🟡 Write a type-safe `pluck<T, K extends keyof T>(arr: T[], key: K)`.

**A:** `function pluck<T, K extends keyof T>(arr: T[], key: K): T[K][] { return arr.map((x) => x[key]) }`

**Q:** 🟡 Write an exhaustive switch helper.

**A:** `function assertNever(x: never): never { throw new Error('Unexpected ' + x) }` and call it in `default:`.

**Q:** 🟡 Write `DeepPartial<T>`.

**A:** `type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }`

**Q:** 🟡 Write a type guard for `ApiError`.

**A:** `const isApiError = (e: unknown): e is ApiError => e instanceof ApiError`

**Q:** 🔴 Write `PathsOf<T>` producing dotted paths of a nested object (simplified).

**A:**
```ts
type PathsOf<T> = { [K in keyof T & string]: T[K] extends object ? K | `${K}.${PathsOf<T[K]>}` : K }[keyof T & string]
```

**Q:** 🟡 Type a `useLocalState<T>(initial: T)` hook signature.

**A:** `function useLocalState<T>(initial: T): [T, (v: T | ((p: T) => T)) => void]`

## Real interview questions

**Q:** 🟡 What problems does TypeScript not solve?

**A:** Runtime validation of external data, logic bugs, performance, and anything typed as `any`. Types vanish at runtime.

**Q:** 🟡 How do you migrate a JS project to TS?

**A:** Add `tsconfig` with `allowJs`, rename files gradually, start non-strict and tighten flags, type boundaries (API, props) first, ban `any` over time.

**Q:** 🟡 What is the difference between `unknown[]` and `any[]`?

**A:** `unknown[]` elements must be narrowed before use; `any[]` elements can be used as anything (unsafe).

**Q:** 🟡 Why might you prefer `readonly` arrays in function parameters?

**A:** Signals the function won't mutate the input and lets callers pass `as const` tuples (`isUncertain(uncertain: readonly string[], …)`, `form.ts:131`).

**Q:** 🟡 What is `strictNullChecks`?

**A:** `null`/`undefined` aren't assignable to other types unless included in a union — the main source of TS's safety.

**Q:** 🟡 What is the difference between `Object`, `object` and `{}`?

**A:** `object` = any non-primitive; `{}` = any non-nullish value (including primitives); `Object` ≈ `{}` with Object methods. Prefer `object` or specific shapes / `Record<string, unknown>`.

**Q:** 🔴 What's the "excessive depth" error and how do you avoid it?

**A:** Recursive conditional types that expand too deep hit TS's instantiation limit. Simplify, add base cases, or cap recursion depth.

**Q:** 🟡 How does TS type `fetch` responses?

**A:** `fetch` returns `Promise<Response>`; `res.json()` is `Promise<any>` — which is why the code casts to `T` (`client.ts:135`).

**Q:** 🟡 What's the type of `Object.entries(obj)`?

**A:** `[string, V][]` — keys are always `string`, not `keyof T`, because objects may have extra keys at runtime.

**Q:** 🔴 Why is `Object.keys` typed as `string[]` and not `(keyof T)[]`?

**A:** Structural typing allows objects with more properties than their type says, so claiming only `keyof T` keys would be unsound.

**Q:** 🟡 What does `export type Permission = keyof typeof PERMISSIONS` buy you over a hand-written union?

**A:** Single source of truth — adding a permission to the map updates the type automatically (`permissions.ts:28`).

**Q:** 🟡 Explain `VariantProps<typeof buttonVariants>`.

**A:** A cva helper type extracting the variant prop types (`variant?: 'default' | 'outline' | …; size?: …`) from the config, so Button props stay in sync with the class map (`ui/button.tsx:33`).

**Q:** 🟡 What does `React.forwardRef<HTMLButtonElement, ButtonProps>` type?

**A:** The ref target (`HTMLButtonElement`) and props (`ButtonProps`) of a component that forwards its ref (`ui/button.tsx:37`).

**Q:** 🟡 What's the difference between `tsc` and `tsc -b`?

**A:** `tsc` compiles one project; `-b` (build mode) builds referenced projects in order with incremental caching.

**Q:** 🟡 What is `skipLibCheck`?

**A:** Skips type-checking `.d.ts` files from dependencies — faster builds, avoids errors in third-party types.

**Q:** 🟢 Why is `any` banned in this codebase?

**A:** It silently disables checking and spreads; `unknown` + narrowing gives safety (`eslint.config.js:16`).

**Q:** 🟢 What does `string | null` on `phone` force you to do in the UI?

**A:** Handle the missing case before formatting: `patient.phone && formatBDPhone(patient.phone)` (`PatientsPage.tsx:71`).

**Q:** 🟡 How are props with default values typed?

**A:** Optional in the interface and defaulted in destructuring: `compact?: boolean` + `{ compact = false }` (`Logo.tsx:27, 32`).

**Q:** 🟡 How do you type a component that receives another component as a prop?

**A:** Use its type: `icon: LucideIcon` (`EmptyState.tsx:7`) or `React.ComponentType<Props>`.

**Q:** 🔴 How do generics flow through `api.get<Page<PatientListItem>>('/patients', …)`?

**A:** `api.get<T>` calls `request<T>` returning `Promise<T>`; `patientsApi.list` returns `Promise<Page<PatientListItem>>`; `useQuery` infers `data: Page<PatientListItem> | undefined` from the queryFn.

**Q:** 🟡 What is the purpose of `"types": ["vite/client"]`?

**A:** Adds Vite's ambient types (`import.meta.env`, asset imports like `*.svg`) to the app project (`tsconfig.app.json:22`).

**Q:** 🟡 What's `allowImportingTsExtensions`?

**A:** Lets imports include `.ts` extensions (only allowed with `noEmit`/bundlers), matching how bundlers resolve files.

**Q:** 🟡 What is `moduleDetection: "force"`?

**A:** Treats every file as a module (own scope) even without imports/exports, preventing accidental globals.

**Q:** 🔴 How would you type the `retry` option `(count, err) => boolean` in the QueryClient?

**A:** TanStack types it as `(failureCount: number, error: TError) => boolean`; with the default `Error` type, the code narrows `err instanceof ApiError` before reading `status` (`App.tsx:28-29`).

**Q:** 🟡 Why do the TS types use `string` for dates?

**A:** JSON has no date type; the API sends ISO strings. Converting to `Date` only where needed avoids time-zone bugs for calendar dates.

**Q:** 🟡 What is `Messages` used for?

**A:** It's the type of `t`; any language file must satisfy it, ensuring every key exists (`i18n/index.ts:4`).

**Q:** 🔴 When is a type assertion justified?

**A:** When you know more than the compiler and have checked it at runtime or by construction — e.g. `(opts.body as FormData)` right after `instanceof FormData` (`client.ts:61, 71`) — though narrowing via a variable would avoid it.
