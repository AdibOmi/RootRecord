# 26 — Layout: `AppShell.tsx`, `Sidebar.tsx`, `nav.ts`, `GlobalSearch.tsx`, `UserMenu.tsx`, `Logo.tsx`

## `AppShell.tsx` (66 lines)

**Purpose:** the authenticated frame: sidebar, sticky top bar (menu, search, scan button, user menu),
and `<main>` with `<Outlet/>`.

| Lines | Code | Explanation |
|---|---|---|
| 18-19 | `drawerOpen` state; `useUser()` | |
| 22 | `<TooltipProvider delayDuration={200}>` | shared tooltip timing for the compact sidebar |
| 24 | `<Sidebar />` | hidden on phones |
| 27 | sticky header `h-16`, translucent card background + `backdrop-blur` (with `supports-[backdrop-filter]` fallback) | |
| 28-43 | `<Sheet>` drawer for phones: trigger is an icon button visible below `md`; `SheetContent` has a hidden `SheetTitle` (a11y) and the nav with `onNavigate` closing the drawer | |
| 45-47 | `<GlobalSearch />` | |
| 48-55 | camera "Scan prescription" button if `can(user, 'clinical:edit')` — icon-only on phones, label from `sm` | ⚠️ should be `prescriptions:scan` (receptionists can scan per backend) |
| 56 | `<UserMenu />` | |
| 59-61 | `<main className="mx-auto w-full max-w-7xl …"><Outlet /></main>` | page content |

## `nav.ts` (40 lines)

`NavItem { to, label, icon: LucideIcon, permission? }`; `NAV_ITEMS` (26-36) — dashboard, scan
(`prescriptions:scan`), prescriptions, patients, appointments, recalls, billing (`billing:view`),
reports, settings; `visibleNavItems(user)` filters by permission. One source for sidebar and command
palette.

## `Sidebar.tsx` (73 lines)

- `SidebarNav({ compact, onNavigate })` (17-53): maps visible items to `NavLink`s; `end={to === '/'}`;
  active styles via `className` function; compact mode shows icon + `sr-only` label wrapped in a
  `Tooltip` (side right).
- `Sidebar()` (56-73): `<aside>` sticky full-height, `hidden md:flex md:w-[72px] lg:w-64`; two `Logo`
  variants and two `SidebarNav` variants toggled with responsive classes (CSS decides which is visible —
  both are rendered).

## `GlobalSearch.tsx` (81 lines)

- Trigger button styled like a search input with a `Ctrl K` hint (42-52).
- Global `keydown` listener toggles the palette on Ctrl/⌘+K, cleaned up on unmount (24-33).
- `CommandDialog` (cmdk inside a Radix Dialog) with a disabled "patients coming soon" item and "Go to"
  items from `visibleNavItems(user)`; selecting navigates and closes (35-38, 69-76).
- ⚠️ Patient search via the API already exists (`/patients?q=`), so the "coming soon" placeholder
  (`t.search.patientsComingSoon`) is stale; wiring `usePatients({ q })` with `shouldFilter={false}` would
  finish it.

## `UserMenu.tsx` (66 lines)

Radix `DropdownMenu`: trigger shows initials avatar, name and role label (`t.roles[user.role]`); content
shows name/email, "Change password" (opens `ChangePasswordDialog` via state) and "Sign out"
(`logout.mutate(undefined, { onSettled: toast + navigate('/login', { replace: true }) })`).
`onSelect` (not `onClick`) is Radix's item activation event (keyboard + pointer).

## `Logo.tsx` (56 lines)

`ToothRootIcon(props: SVGProps<SVGSVGElement>)` — an inline SVG using `currentColor` and spreading
props (size/class overrides); `aria-hidden`. `Logo({ compact, className, inverted })` — icon tile +
"Root**Record**" wordmark, `sr-only` app name for screen readers; `inverted` styles for the gradient
login panel.

## Q&A

**Q:** 🟢 Why does the sidebar render both compact and full navs?

**A:** Responsiveness is handled in CSS (`lg:hidden` / `hidden lg:block`), avoiding JS window-size
listeners and layout flashes; only one is visible at each breakpoint.

**Q:** 🟡 Why is the Ctrl+K listener on `window` with cleanup?

**A:** The shortcut must work anywhere in the app; the cleanup removes the listener on unmount (and
avoids duplicates under StrictMode's double-mount in development).

**Q:** 🟡 What does `end={to === '/'}` do?

**A:** `NavLink` marks a link active when the URL *starts with* its path; `/` would match everything.
`end` requires an exact match for the dashboard only.

**Q:** 🔴 Find the permission inconsistency in this folder.

**A:** `nav.ts:28` shows Scan to `prescriptions:scan` (includes receptionists), but `AppShell.tsx:48`
shows the top-bar scan button only for `clinical:edit`, and the `/scan` route is guarded by
`clinical:edit` (`App.tsx:46`). Receptionists see the sidebar link but get "no access".

**Q:** 🟢 Why `onSelect` instead of `onClick` on dropdown items?

**A:** Radix fires `onSelect` for both pointer and keyboard activation (Enter/Space) and closes the menu
consistently.

**Q:** 🟡 How is the mobile drawer closed after navigation?

**A:** `SidebarNav` receives `onNavigate={() => setDrawerOpen(false)}` and calls it from each `NavLink`'s
`onClick` (`AppShell.tsx:40`, `Sidebar.tsx:28`).
