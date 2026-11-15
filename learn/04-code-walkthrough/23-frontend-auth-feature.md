# 23 — Auth feature: `features/auth/hooks.ts`, `guards.tsx`, `ChangePasswordDialog.tsx`

## `hooks.ts` (65 lines)

| Lines | Export | Explanation |
|---|---|---|
| 7 | `ME_KEY = ['auth', 'me'] as const` | cache key for the current user |
| 9-17 | `resetSession(qc, user)` | remove every query whose key doesn't start with `'auth'`, then set `me`. Comment explains why not `qc.clear()` (would kill the in-flight `me` query → guard stuck loading) |
| 19-34 | `useCurrentUser()` | `useQuery<User \| null>`: 401 → `null`; other errors rethrown; `staleTime: Infinity`; `retry: false` |
| 36-41 | `useUser()` | non-null user or throw — for components inside the authenticated shell |
| 43-49 | `useLogin()` | mutation → `authApi.login`; `onSuccess: resetSession(qc, user)` |
| 51-57 | `useLogout()` | `onSettled` (success **or** error) → `resetSession(qc, null)` — local sign-out even if the server is unreachable |
| 59-65 | `useChangePassword()` | `onSuccess` → reset session to `null` (backend revoked all sessions) |

→ `05-tanstack-query.md` §3.3.

## `guards.tsx` (55 lines)

`RequireAuth` (13-33): loader while pending, network error state with Retry (`refetch`), redirect to
`/login` with `state.from`, else `<Outlet/>`.
`RequirePermission` (35-55): `can(user, permission)` or an "access denied" `EmptyState`; renders
`<>{children}</>`. → `04-react-router.md` §3.1-3.2.

## `ChangePasswordDialog.tsx` (117 lines)

| Lines | Code | Explanation |
|---|---|---|
| 23-32 | Zod schema with `.refine` on `confirm` | cross-field rule, error placed on `confirm` |
| 34 | `type FormValues = z.infer<typeof schema>` | form types from schema |
| 36-39 | `Props { open; onOpenChange }` | controlled dialog |
| 42-48 | `useNavigate`, `useChangePassword`, `useForm({ resolver, defaultValues })`, `errors` | |
| 50-62 | `onSubmit` | `mutateAsync` in try/catch; success → toast + `navigate('/login', { replace: true })`; `invalid_password` → `setError('current_password')`; else toast |
| 65-71 | `<Dialog onOpenChange>` | on close: `form.reset()` then forward to parent |
| 77 | `<form id="change-password" … noValidate>` | id lets the footer button submit it |
| 78-104 | three `FormField`s with password inputs | `autoComplete="current-password"` / `"new-password"` helps password managers; `aria-invalid` |
| 106-113 | footer: Cancel (outline) + `<Button type="submit" form="change-password">` | a submit button **outside** the `<form>` linked via the HTML `form` attribute; disabled while pending; label switches to "Saving…" |

## Q&A

**Q:** 🟢 Why does `useCurrentUser` return `null` instead of throwing on 401?

**A:** "Not signed in" is a normal state, not an error. Returning `null` lets `RequireAuth` redirect,
while real errors (network/5xx) still surface as `isError` with a Retry button.

**Q:** 🟡 Why `onSettled` in `useLogout` but `onSuccess` in `useLogin`?

**A:** Logout should clear local state even if the server call fails (offline); login must only set the
user when the server accepted the credentials.

**Q:** 🔴 Why not call `queryClient.clear()` on logout?

**A:** `clear()` removes all queries including the active `['auth','me']` observer's query; the mounted
guard would wait forever on a destroyed query. `removeQueries` with a predicate keeps `me` and then sets
it explicitly (`hooks.ts:9-17`).

**Q:** 🟡 How does the submit button outside the form work?

**A:** HTML's `form="change-password"` attribute associates the button with the form by id, so clicking
it submits that form (`ChangePasswordDialog.tsx:77, 110`). Useful because the dialog footer is outside
the form element.

**Q:** 🟢 Why reset the form when the dialog closes?

**A:** So passwords typed earlier don't reappear when the dialog is reopened.

**Q:** 🟡 What prevents `useUser()` from throwing in practice?

**A:** It's only used under `RequireAuth`, which renders children only when `me` is non-null; the throw
documents and enforces that contract.
