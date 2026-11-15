# 21 — API layer: `api/client.ts`, `auth.ts`, `patients.ts`, `prescriptions.ts`, `types.ts`

**Purpose:** the only place that talks HTTP. Hooks call these functions; components never call `fetch`.
→ Skills: `08-browser-apis.md` §2, `01-javascript.md` §3.4, `15-http-rest-auth-security.md` §3.3.

## `frontend/src/api/client.ts` (153 lines)

### Header + types (1-41)
```ts
1  /**
2   * Thin fetch wrapper. Auth lives in httpOnly cookies, so every request sends
3   * credentials. On 401 we try one silent refresh, then retry the request once.
4   */
8  export const API_BASE = '/api/v1'                    // relative → same origin (Vite proxy)

10 export interface ApiErrorDetail { field: string; message: string }   // mirrors core/errors.py:80-85

15 export class ApiError extends Error { … }           // status, code, details; fieldErrors getter (15-32)

34 type QueryValue = string | number | boolean | null | undefined
36 export interface RequestOptions {
37   method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'   // union of literals, not any string
38   body?: unknown
39   query?: Record<string, QueryValue>
40   signal?: AbortSignal
41 }
```

### Session-expired hook (43-48)
`let onSessionExpired = () => {}` + `setSessionExpiredHandler(handler)` — dependency inversion: the
low-level client exposes a hook; `App.tsx` plugs in behaviour.

### `buildUrl` (50-58) and `send` (60-79)
Explained in `08-browser-apis.md` §2.1-2.2. `send` converts network failures into
`ApiError(0, 'network_error', …)` and rethrows aborts.

### `toError` (81-98)
```ts
82   try {
83     const body = (await res.json()) as { error?: { code?: string; message?: string; details?: unknown } }
86     if (body.error) {
87       return new ApiError(res.status, body.error.code ?? 'error', body.error.message ?? t.common.somethingWrong, body.error.details)
93     }
94   } catch {
95     // Non-JSON error body (e.g. proxy error page); fall through.
96   }
97   return new ApiError(res.status, 'error', t.common.somethingWrong)
```
Defensive: a 502 HTML page from a proxy still becomes a typed `ApiError`.

### Single-flight refresh (100-111) and `sendAuthed` (113-130)
```ts
113 const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout']
116 async function sendAuthed(path: string, opts: RequestOptions): Promise<Response> {
117   let res = await send(path, opts)
119   if (res.status === 401 && !NO_REFRESH_PATHS.includes(path)) {   // wrong password on login must not trigger refresh
120     if (await refreshSession()) {
121       res = await send(path, opts)                                  // retry once
122     }
123     if (res.status === 401) {
124       onSessionExpired()
125     }
126   }
128   if (!res.ok) throw await toError(res)
129   return res
130 }
```
⚠️ Retrying re-sends the same body; for `FormData` uploads that's fine (FormData can be re-sent), but
streamed bodies couldn't be.

### `request`, `api`, `errorMessage` (132-153)
```ts
132 export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
133   const res = await sendAuthed(path, opts)
134   if (res.status === 204) return undefined as T                     // DELETE responses
135   return (await res.json()) as T
136 }
138 export const api = {
139   get: <T>(path, query?, signal?) => request<T>(path, { query, signal }),
141   post: <T>(path, body?) => request<T>(path, { method: 'POST', body }),
142   put: …, patch: …, delete: …,
146   blob: async (path: string) => (await sendAuthed(path, {})).blob(),  // PDFs
147 }
150 export function errorMessage(err: unknown): string {
151   if (err instanceof ApiError) return err.message
152   return t.common.somethingWrong                                    // never show raw JS errors
153 }
```

## `api/auth.ts` (19 lines)
`LoginInput`, `ChangePasswordInput` interfaces; `authApi = { login, logout, me, changePassword }` —
each a one-line typed call (`api.post<User>('/auth/login', body)`).

## `api/patients.ts` (16 lines)
`PatientListParams { q?, page?, page_size? }`; `patientsApi.list(params, signal)` passes
`{ ...params }` as query (spread copies to a `Record`), `get`, `update(id, Partial<PatientInput>)`,
`delete`.

## `api/prescriptions.ts` (33 lines)
`scan(pages: Blob[])` builds `FormData` with repeated `files` keys named `page-1.jpg…`; `list`, `get`,
`extractAgain`, `save(id, PrescriptionSaveInput)` (PUT), `delete`, `pdf(id)` → Blob.

## `api/types.ts` (133 lines)
TypeScript mirrors of backend schemas: `UserRole`, `User`, `Page<T>`, `Message`, `PatientSex`,
`PatientRef` → `Patient` → `PatientListItem` (`extends`), `PatientInput`, `PatientMatch`,
`PrescriptionStatus`, `Medication`, `ExtractedPrescription` (only the parts the UI reads),
`PrescriptionSummary`, `StaffRef`, `PrescriptionDetail extends Omit<PrescriptionSummary,
'extracted_patient_name' | 'has_extraction_error'>` (+ detail fields), `PrescriptionSaveInput`. Dates are
`string` with JSDoc `/** YYYY-MM-DD */` comments. ⚠️ Hand-maintained; generate from `/openapi.json`.

## Q&A

**Q:** 🟢 Why not call `fetch` directly in components?

**A:** One place handles base URL, credentials, JSON, error parsing, refresh-and-retry and network
errors; components and hooks just call `patientsApi.list(...)`.

**Q:** 🟡 Why exclude `/auth/login` from refresh-on-401?

**A:** A wrong password returns 401; trying to refresh (and then calling `onSessionExpired`) would be
wrong and confusing (`client.ts:113, 119`).

**Q:** 🟡 What does `refreshing ??= …` prevent?

**A:** Multiple simultaneous refresh requests. All concurrent 401s await the same promise; since the
backend rotates refresh tokens, parallel refreshes would otherwise race and might trip reuse detection.

**Q:** 🟡 Why does `send` turn network errors into `ApiError(0, …)`?

**A:** So every failure has the same type; `status === 0` is used by the retry policy
(`App.tsx:29`) and the auth guard's "Cannot reach the server" state.

**Q:** 🔴 What happens if the refresh succeeds but the retried request returns 401 again?

**A:** `res.status === 401` after the retry → `onSessionExpired()` is called and `toError` throws a 401
`ApiError` — e.g. the user was deactivated between refresh and retry.

**Q:** 🟢 Why `undefined as T` for 204?

**A:** A 204 has no body, so `res.json()` would throw; callers of delete use `api.delete<undefined>`.

**Q:** 🟡 What's the drawback of `as T` casts?

**A:** No runtime validation — if the backend's shape changes, TypeScript can't detect it. Codegen from
OpenAPI or Zod parsing at the boundary would.
