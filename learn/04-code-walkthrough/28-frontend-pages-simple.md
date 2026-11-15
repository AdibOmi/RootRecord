# 28 — Pages: Dashboard, Login, NotFound, Placeholder, Patients, Prescriptions

## `DashboardPage.tsx` (96 lines)

- `greeting()` (13-18): morning/afternoon/evening from `clinicHour()` (Dhaka time, not device time).
- 24-26: `useUser()`; first name with a leading "Dr." stripped (`/^dr\.?\s+/i`).
- 28-33: stat cards list; "Today's collection" only for `collections:view` (admin) via conditional
  spread `...(cond ? [item] : [])`.
- 37-50: `PageHeader` with greeting, long date, and a big "Scan prescription" button for
  `prescriptions:scan`.
- 52-93: cards with `Skeleton` placeholders — the comment (20-23) says real figures arrive in a later
  phase. `Array.from({ length: 4 }, (_, i) => …)` creates N placeholder rows.

## `LoginPage.tsx` (129 lines)

| Lines | Code | Explanation |
|---|---|---|
| 17-22 | Zod schema (email required + valid, password required) and `FormValues` | |
| 25-30 | `useCurrentUser`, `useLogin`, `useNavigate`, `useLocation`, `from` (return URL), `showPassword` | all hooks before early returns |
| 32-36 | `useForm` with resolver + defaults; `errors` | |
| 38-39 | pending → loader; already signed in → `<Navigate to={from} replace />` | visiting /login while logged in bounces back |
| 41-43 | `onSubmit` → `login.mutate(values, { onSuccess: navigate(from, { replace: true }) })` | |
| 46-60 | gradient brand panel (desktop only, `lg:flex`), headline/tagline, oversized faint tooth icon | |
| 71-80 | server error banner `role="alert"` with `errorMessage(login.error)` | |
| 82-91 | email field: `type="email" autoComplete="username" autoFocus`, `aria-describedby` → `email-error` | |
| 94-113 | password field with show/hide toggle button (`type="button"` so it doesn't submit; `aria-label` toggles) | |
| 116-118 | submit button disabled while pending, label "Signing in…" | |
| 121-124 | "Staff access only… ask the admin to reset it" | there's no self-service password reset |

## `NotFoundPage.tsx` (22 lines) and `PlaceholderPage.tsx` (29 lines)

Both are `EmptyState`s with a "Back to dashboard" button (`Button asChild` + `Link`). Placeholder takes
a `title` prop and wraps itself in `PageHeader` + `Card`; used for appointments, recalls, billing,
reports, settings (`App.tsx:55-80`).

## `PatientsPage.tsx` (121 lines)

| Lines | Code | Explanation |
|---|---|---|
| 16 | `PAGE_SIZE = 20` | |
| 19-22 | URL state: `q`, `page`; local `input` initialised from `q` | |
| 24-30 | debounced effect: 300 ms after typing, write `?q=` (replace history); changing `q` drops `page` | |
| 32 | `usePatients({ q: q \|\| undefined, page, page_size })` | `''` → `undefined` so it's omitted from the URL |
| 38-47 | search input with icon, controlled (`value`/`onChange`), `aria-label` | |
| 49-109 | `Card`: skeletons while pending → list of `Link` rows (name, code, phone/age/sex joined, visits/last visit/next follow-up on `sm+`) → empty state ("No patients match" vs "No patients yet") | |
| 111-118 | `Pagination` writes `?page=` keeping `q` | `{ ...(q && { q }), page: String(next) }` |

## `PrescriptionsPage.tsx` (111 lines)

| Lines | Code | Explanation |
|---|---|---|
| 22-24 | `status` from URL (anything but `'confirmed'` → `'draft'`), `page` | safe parsing |
| 25 | main list query | |
| 26 | `usePrescriptions({ status: 'draft', page_size: 1 })` | a cheap second query just for the "To review" **count** (`total`) |
| 28-31 | tabs config with optional count | |
| 35-48 | header + Scan button (`prescriptions:scan`) | |
| 50-71 | `role="tablist"` buttons with `role="tab"` and `aria-selected`; count pill only if non-zero (`!!tab.count`) | ⚠️ ARIA tabs normally also need `aria-controls`/`tabpanel` and arrow-key navigation |
| 73-99 | skeleton / `PrescriptionRow` list / empty states per tab | |
| 101-108 | pagination keeps `status` | |

Because `usePrescriptions` polls while any row is reading, the list updates itself when Gemini
finishes.

## Q&A

**Q:** 🟢 Why does the Patients search debounce for 300 ms?

**A:** To avoid one request (and one history entry) per keystroke; the effect's cleanup cancels the
previous timer on each change (`PatientsPage.tsx:24-30`).

**Q:** 🟡 Why are search and page stored in the URL?

**A:** Refresh, Back/Forward and shared links keep the same view; it also makes the query key
deterministic from the URL.

**Q:** 🟡 How does the "To review" tab get its count?

**A:** A second query for drafts with `page_size: 1` reads only `total` (`PrescriptionsPage.tsx:26, 29`)
— a cheap count without loading all drafts.

**Q:** 🟢 What happens if you open `/login` while signed in?

**A:** `user` is non-null, so it renders `<Navigate to={from} replace />` (`LoginPage.tsx:39`).

**Q:** 🔴 What's a subtle bug risk with `Number(params.get('page')) || 1`?

**A:** `page=abc` → `NaN` → falsy → 1 (fine), `page=-3` → `-3` (truthy) → API returns 422 (`ge=1`) and
the page shows an error. Clamping (`Math.max(1, …)`) would be more robust.

**Q:** 🟡 Why is the show-password toggle `type="button"`?

**A:** Buttons inside a form default to `type="submit"`; without it, clicking the eye icon would submit
the login form.
