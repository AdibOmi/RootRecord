# 02 — TypeScript

> **Where it lives:** all of `frontend/src/**/*.ts(x)`, configured by
> `frontend/tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`.

---

## 1. What & why

**TypeScript (TS)** — JavaScript with a **static type system**: you annotate (or let TS infer)
the shape of values, and the compiler (`tsc`) reports mistakes *before* the code runs. Types are
**erased** at build time; the browser still runs plain JS.

**Analogy:** TS is a spell-checker for data shapes. It does not change what you wrote; it
underlines what will probably break.

**Problems it solves:** typos in property names, calling functions with the wrong arguments,
forgetting `null` cases, refactoring safely across 100 files, autocomplete.

**When NOT to use it:** tiny throwaway scripts, or when the team refuses to maintain types (then
you get `any` everywhere and pay the cost without the benefit).

---

## 2. Fundamentals

### 2.1 Basic annotations

```ts
let name: string = 'Rahima'
let age: number | null = null          // union: number OR null
const tags: string[] = ['RCT', 'Scaling']
function add(a: number, b: number): number { return a + b }
```

**Type inference** — TS works out types you don't write: `const x = 1` is `1` (a literal type),
`let y = 1` is `number`.

### 2.2 Object types: `interface` vs `type`

📍 `frontend/src/api/types.ts:5-14`:

```ts
export interface User {
  id: string
  email: string
  full_name: string
  phone: string | null      // the backend sends null, never omits it
  role: UserRole
  is_active: boolean
  last_login_at: string | null
  created_at: string        // ISO date-time string (JSON has no Date type)
}
```

📍 Union type alias, `types.ts:3`: `export type UserRole = 'admin' | 'dentist' | 'receptionist'`.

| | `interface` | `type` |
|---|---|---|
| Objects | ✅ | ✅ |
| Unions / primitives / tuples | ❌ | ✅ |
| `extends` | `interface A extends B` | `type A = B & {…}` |
| Declaration merging (re-open) | ✅ | ❌ |
| Error messages | often clearer | can be verbose |

This repo uses `interface` for object shapes and `type` for unions — the common convention.

### 2.3 Optional vs nullable

- `phone?: string` → the property may be **missing** (`undefined`).
- `phone: string | null` → the property is present but may be `null`.

📍 `types.ts:50-56` (`PatientInput`) uses `?:` because it is something *we send* (fields can be
omitted), while `Patient` uses `| null` because the backend always sends every key. The comment at
`frontend/src/pages/PrescriptionReviewPage.tsx:303` relies on exactly this difference:
"`phone` is undefined when unknown (a bare PatientRef), null when the patient has none."

### 2.4 Functions

```ts
type Handler = () => void
function can(user: Pick<User, 'role'> | null | undefined, permission: Permission): boolean
```

📍 `frontend/src/lib/permissions.ts:30` — the parameter type `Pick<User, 'role'>` means "any
object that has at least a `role` of the right type", so tests can pass `{ role: 'admin' }`.

### 2.5 Literal types and `as const`

📍 `frontend/src/features/auth/hooks.ts:7`: `export const ME_KEY = ['auth', 'me'] as const` makes
the type `readonly ['auth', 'me']` instead of `string[]`, so `ME_KEY[0]` is the literal `'auth'`.

📍 `frontend/src/pages/PrescriptionReviewPage.tsx:662`:
`(['dosage', 'frequency', 'duration', 'instructions'] as const).map((key) => …)` — `key` is typed
`'dosage' | 'frequency' | …`, so ``form.register(`medications.${i}.${key}`)`` type-checks against
the form schema.

---

## 3. Intermediate

### 3.1 Narrowing

**Narrowing** — TS refines a broad type to a narrower one inside a branch after a check.

| Check | Narrows by | Project example |
|---|---|---|
| `typeof x === 'string'` | primitive type | `lib/format.ts:26` |
| `x instanceof C` | class | `api/client.ts:61`, `App.tsx:29` |
| `Array.isArray(x)` | array | `api/client.ts:30` |
| `x === null` / truthiness | null/undefined | `features/auth/guards.tsx:31` |
| `'key' in x` | property presence | — |
| discriminant field | tagged unions | `busy` state below |

📍 `frontend/src/App.tsx:28-29`:

```ts
retry: (count, err) =>
  count < 2 && err instanceof ApiError && (err.status === 0 || err.status >= 500),
```

`err` starts as `Error`; after `instanceof ApiError`, TS knows `err.status` exists.

### 3.2 `any` vs `unknown` vs `never`

| Type | Meaning | Safe? |
|---|---|---|
| `any` | turn type checking off | ❌ — banned here (`frontend/eslint.config.js:16`) |
| `unknown` | "could be anything; prove it before use" | ✅ |
| `never` | a value that cannot exist (exhaustive checks, functions that throw) | ✅ |

📍 `frontend/src/api/client.ts:18` `readonly details: unknown` — the server's `details` may be a
list of field errors or something else, so `fieldErrors` narrows with `Array.isArray` first
(`:29-31`).

### 3.3 Generics

**Generic** — a type parameter (`<T>`) that lets one function/type work for many types while
keeping them connected.

📍 `frontend/src/api/client.ts:132-136`:

```ts
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const res = await sendAuthed(path, opts)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
```

`api.get<User>('/auth/me')` (`api/auth.ts:17`) returns `Promise<User>`.
⚠️ **Review note:** `as T` is a *promise to the compiler*, not a runtime check. If the backend
changes shape, TS won't notice. Options: generate types from the OpenAPI schema
(`openapi-typescript`) or validate responses with Zod at the boundary.

📍 Generic interface, `types.ts:16-21`: `interface Page<T> { items: T[]; total: number; … }`
mirrors the backend's `Page(BaseModel, Generic[T])` (`backend/app/schemas/common.py:13-17`).

**Constraints:** `function longest<T extends { length: number }>(a: T, b: T): T`.

### 3.4 Utility types

| Utility | Does | Project use |
|---|---|---|
| `Partial<T>` | all props optional | `api/patients.ts:14` `update(id, body: Partial<PatientInput>)` |
| `Required<T>` | all props required | — |
| `Pick<T, K>` | keep some props | `lib/permissions.ts:30` |
| `Omit<T, K>` | drop some props | `api/types.ts:111` `PrescriptionDetail extends Omit<PrescriptionSummary, 'extracted_patient_name' \| 'has_extraction_error'>` |
| `Record<K, V>` | object with keys K | `api/client.ts:39`, `lib/permissions.ts:26` |
| `ReturnType<F>`, `Parameters<F>` | infer from functions | — |
| `Readonly<T>` | read-only props | `readonly` fields in `ApiError` |
| `NonNullable<T>` | remove null/undefined | — |

### 3.5 `keyof`, `typeof`, indexed access

📍 `frontend/src/lib/permissions.ts:7-28`:

```ts
const PERMISSIONS = {
  'staff:manage': ['admin'],
  /* … */
  'clinical:edit': ['admin', 'dentist'],
} as const satisfies Record<string, readonly UserRole[]>

export type Permission = keyof typeof PERMISSIONS
```

- `typeof PERMISSIONS` — the *type* of that value.
- `keyof` — union of its keys: `'staff:manage' | 'settings:manage' | …`.
- `as const` — keeps keys and role arrays as literal, read-only types.
- `satisfies` (TS 4.9+) — *checks* that the object fits `Record<string, readonly UserRole[]>`
  (a typo like `'dentst'` errors) **without widening** the type, so `keyof` still gives exact keys.

Result: `can(user, 'clinical:edt')` is a compile error. That is a great interview example.

### 3.6 Mapped and conditional types

📍 `frontend/src/i18n/en.ts:272-273` (end of file):

```ts
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }
export type Messages = Widen<typeof en>
```

- **Mapped type** `{ [K in keyof T]: … }` — builds a new type by iterating keys.
- **Conditional type** `A extends B ? X : Y` — type-level if/else.
- Recursion handles nested sections.

Why: `en` is `as const`, so its type has literal strings like `'Sign in'`. A future `bn.ts` must
have the **same keys** but different strings — `Widen` turns every literal into `string`, giving a
contract for translations (`frontend/src/i18n/index.ts:4` `export const t: Messages = en`).

### 3.7 Type assertions and the non-null `!`

- `x as T` — "treat x as T". No runtime effect; can hide bugs.
- `x!` — "x is not null/undefined".

📍 `frontend/src/main.tsx:7` `document.getElementById('root')!` — reasonable: `index.html:17`
always has `#root`. ESLint's `no-non-null-assertion` is turned **off** (`eslint.config.js:17`) to
allow this.

### 3.8 Enums vs union literals

TS `enum` generates runtime objects and has quirks (numeric enums accept any number). Modern
codebases prefer **string-literal unions** + `as const` objects. 📍 This repo has **no TS enums**;
roles/status are unions (`types.ts:3, 63`). The backend's Python `StrEnum`s
(`backend/app/models/user.py:11-14`) serialize to the same strings.

---

## 4. Advanced

### 4.1 Typing React components

```ts
interface Props { open: boolean; onOpenChange: (open: boolean) => void }
export function ChangePasswordDialog({ open, onOpenChange }: Props) { … }
```

📍 `frontend/src/features/auth/ChangePasswordDialog.tsx:36-41`.

📍 `forwardRef` generics, `frontend/src/components/ui/button.tsx:31-42`:

```ts
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,   // all native <button> props
    VariantProps<typeof buttonVariants> {                   // variant/size from cva
  asChild?: boolean
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(…)
```

📍 Wrapping third-party components while keeping their prop types,
`frontend/src/components/ui/dialog.tsx:12-15`:
`React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>`.

### 4.2 Inferring types from runtime schemas

📍 `frontend/src/features/prescriptions/form.ts:49`:
`export type ReviewValues = z.infer<typeof reviewSchema>` — one source of truth: the Zod schema
validates at runtime and produces the static type.

### 4.3 Strictness flags in this repo (`frontend/tsconfig.app.json`)

| Flag | Line | Effect |
|---|---|---|
| `strict` | 15 | enables `strictNullChecks`, `noImplicitAny`, etc. |
| `noUnusedLocals` / `noUnusedParameters` | 16-17 | dead code is an error |
| `noFallthroughCasesInSwitch` | 18 | forgetting `break` is an error |
| `noUncheckedIndexedAccess` | 19 | `arr[i]` is `T \| undefined` |
| `isolatedModules` | 11 | each file compilable alone (needed by Vite/esbuild) |
| `moduleResolution: "bundler"` | 9 | resolve like Vite does |
| `noEmit` | 13 | `tsc` only type-checks; Vite does the transpiling |
| `jsx: "react-jsx"` | 14 | new JSX transform (no `import React` needed) |
| `paths: {"@/*": ["./src/*"]}` | 21 | `@/api/client` imports |

📍 `noUncheckedIndexedAccess` is why `frontend/src/lib/utils.ts:13-14` writes
`parts[0]?.[0] ?? ''`, and why `frontend/src/pages/PrescriptionReviewPage.tsx:690`
(`srcs[Math.min(index, srcs.length - 1)]`) yields `string | undefined`.

### 4.4 Project references

📍 `frontend/tsconfig.json:3` references `tsconfig.app.json` (browser code, DOM libs) and
`tsconfig.node.json` (config files, Node types). `tsc -b` (build mode) checks both
(`package.json:8-9`).

### 4.5 Structural typing

TS is **structural**: a value fits a type if it has the right shape, regardless of its declared
name. That is why a `PatientListItem` can be passed where `PatientRef` is expected
(`PrescriptionReviewPage.tsx:539` `onPick(patient)`).

### 4.6 Declaration files and `/// <reference>`

`.d.ts` files describe types for JS libraries. 📍 `frontend/vite.config.ts:1`
`/// <reference types="vitest/config" />` adds the `test` key to Vite's config type.
`"types": ["vite/client"]` (`tsconfig.app.json:22`) adds `import.meta.env` types.

---

## 5. Under the hood

- `tsc` parses → binds symbols → **type checks** → (optionally) emits JS. Here `noEmit` is on:
  Vite uses **esbuild** to strip types per file (no type checking!), which is why
  `npm run build` runs `tsc -b` first (`package.json:8`).
- Types are erased: `if (x instanceof User)` fails for an `interface` because interfaces do not
  exist at runtime. Use classes, discriminants or Zod for runtime checks.

---

## 6. Comparisons interviewers ask

| X vs Y | Answer |
|---|---|
| interface vs type | §2.2 |
| any vs unknown | §3.2 |
| enum vs union | §3.8 |
| `as` vs `satisfies` | assert (can lie) vs check-without-widening |
| TS vs JSDoc types | same checker; JSDoc avoids a build step but is clunkier |
| TS vs Flow | Flow (Meta) lost the ecosystem war |
| `type` checking in Vite vs `tsc` | esbuild strips only; `tsc` checks |
| `Record<string, T>` vs `Map<string, T>` | plain object type vs runtime Map with any key types/ordering guarantees |

---

## 7. Patterns & anti-patterns

**Good here:** `any` banned; union literals over enums; one type source per schema
(`z.infer`); `satisfies` for config maps; `import type` to keep runtime imports lean
(`frontend/src/api/auth.ts:2`).

**Anti-patterns:** `as any`; over-using `!`; huge `interface` duplication of backend models
(⚠️ `frontend/src/api/types.ts:1` says "Types mirroring backend Pydantic schemas" — written by
hand, so they can drift; FastAPI already publishes `/openapi.json` (`backend/app/main.py:20`) that
could generate them).

---

## 8. Security & performance

TS has no runtime security effect: **never trust types for untrusted input**; validate on the
server (Pydantic does) and optionally the client (Zod). Compile time grows with complex
conditional types; `skipLibCheck: true` (`tsconfig.app.json:8`) skips checking `node_modules`
`.d.ts` files for speed.

---

## 9. Syntax cheat sheet

```ts
type A = { a: string }            // object type
interface B extends A { b?: number } // optional prop
type U = 'x' | 'y'                // union of literals
type I = A & { c: boolean }       // intersection
function f<T>(x: T): T            // generic
const k = ['a'] as const          // readonly literal tuple
type K = keyof typeof obj         // keys of a value
type V = (typeof obj)[K]          // value types
x satisfies T                     // check without widening
x as T / x!                       // assertion / non-null
import type { T } from './m'      // type-only import
```

---

## 10. Why chosen + alternatives

Chosen because the app passes many structured objects (prescriptions with nested medications)
between API, forms and UI; strict TS catches shape mismatches early. Alternatives: plain JS +
JSDoc (less tooling), Flow (dead ecosystem), ReScript/Elm (stronger guarantees, tiny ecosystem).
Trade-off: a build step and type maintenance, worth it for any app beyond a prototype.
