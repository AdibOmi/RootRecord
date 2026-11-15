# 22 — `src/lib/*` and `src/i18n/*`

Pure, framework-free helpers — the easiest code to unit-test.

## `lib/format.ts` (78 lines)

| Lines | Export | Behaviour |
|---|---|---|
| 3 | `CLINIC_TIME_ZONE = 'Asia/Dhaka'` | single source for display zone |
| 5-10 | `wholeFormatter`, `fractionFormatter` | `Intl.NumberFormat('en-IN')` → lakh grouping `1,23,456`; created once |
| 12-18 | `formatBDT(minor)` | sign handled separately (`-৳ 50`), whole amounts without decimals, otherwise 2 decimals |
| 20-23 | `takaToMinor(taka)` | `Math.round(taka * 100)` avoids float drift |
| 25-33 | `parts(value, options)` | `Intl.DateTimeFormat('en-GB', { timeZone, ...options }).formatToParts` → `{day, month, year, hour…}` |
| 35-39 | `formatDate` | `DD/MM/YYYY` in clinic time |
| 41-50 | `formatTime` | `en-US` 12-hour `3:30 PM` |
| 52-55 | `formatDateTime` | `"25/09/2026, 3:30 PM"` |
| 57-67 | `formatLongDate` | `"Friday, 25 September 2026"` (dashboard) |
| 69-72 | `clinicHour(now)` | hour 0–23 in Dhaka (`hourCycle: 'h23'`) → greeting |
| 74-78 | `formatDay(isoDate)` | `'2026-10-08'` → `'08/10/2026'` by **splitting the string** (no Date → no time-zone shift) |

Money helpers are ready for billing (not yet used outside tests).

## `lib/format.test.ts` (45 lines)

Tests BDT formatting (lakh grouping, paisa, negatives, float drift), Dhaka time shifting (20:30 UTC →
next day 02:30), 12-hour formatting, and phone accept/reject/format cases with `it.each`.

## `lib/phone.ts` (25 lines)

`toLocal` (private) strips separators/`+`, converts `880…` → `0…`, validates `/^01[3-9]\d{8}$/`;
`isValidBDPhone`, `normalizeBDPhone` (→ `+8801…`, matches backend), `formatBDPhone` (`+8801712345678` →
`01712-345678`, falls back to the raw value if not valid).

## `lib/image.ts` (25 lines)

`preparePhoto(file)` — shrink to ≤ 2400 px, EXIF-orient, JPEG 0.9; falls back to the original on any
error. Explained in `08-browser-apis.md` §3.3.

## `lib/permissions.ts` (33 lines)

Permission → roles map (`as const satisfies Record<string, readonly UserRole[]>`), `Permission` type
(`keyof typeof`), `can(user, permission)`. Comment lines 1-4: UI-only; backend enforces. Several
permissions are for future modules (`billing:*`, `appointments:manage`, `audit:view`).
→ `02-typescript.md` §3.5.

## `lib/utils.ts` (16 lines)

```ts
4  export function cn(...inputs: ClassValue[]): string { return twMerge(clsx(inputs)) }

8  export function initials(name: string): string {
9    const parts = name
10     .replace(/^(dr|mr|mrs|ms)\.?\s+/i, '')     // drop a title prefix: "Dr. Rahim Uddin" → "Rahim Uddin"
11     .trim()
12     .split(/\s+/)                              // split on any whitespace run
13   const first = parts[0]?.[0] ?? ''
14   const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
15   return (first + last).toUpperCase()          // "RU" avatar
16 }
```

## `i18n/en.ts` (273 lines) and `i18n/index.ts` (4 lines)

`en` is a nested `as const` object of UI strings grouped by area: `app`, `nav`, `roles`, `auth`,
`search`, `userMenu`, dashboard, patients, prescriptions, scan, review, share, sex, placeholder,
notFound, forbidden, `common`, `validation`. The file ends with:

```ts
272 type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }
273 export type Messages = Widen<typeof en>
```
`index.ts`: `export const t: Messages = en` — components import `t` and read `t.nav.patients`. A future
`bn.ts` typed as `Messages` must provide every key. Lookups are plain property access (typo = compile
error). No pluralisation/interpolation library — strings are concatenated in JSX
(`${t.common.page} ${page} ${t.common.of} ${pages}`), which works for English but not for languages
with different word order. ⚠️ i18next/FormatJS would handle that.

## Q&A

**Q:** 🟢 Why does `formatDay` split the string instead of using `new Date()`?

**A:** `new Date('2026-10-08')` is UTC midnight; formatting in a zone west of UTC shows 7 October. A
calendar date has no time zone, so string manipulation is correct.

**Q:** 🟡 Why `en-IN` for Bangladeshi taka?

**A:** It produces South Asian lakh/crore grouping (`1,23,456`), the convention in Bangladesh, with
Latin digits.

**Q:** 🟡 What's the benefit of `as const satisfies …` in permissions?

**A:** Checks every value is an array of valid roles while keeping literal keys, so `Permission` is an
exact union and `can(user, 'typo')` is a compile error.

**Q:** 🟢 What does `cn('p-6', 'p-0')` return?

**A:** `'p-0'` — `clsx` joins, `twMerge` removes the earlier conflicting padding class.

**Q:** 🔴 What's a limitation of the i18n approach?

**A:** It only swaps whole strings at build time; there's no runtime language switch, plural rules, or
interpolation placeholders, so sentences built by concatenation may be ungrammatical in Bangla.

**Q:** 🟡 Why are `Intl` formatters created at module level?

**A:** Constructing them is relatively expensive; reusing one instance per format is faster for lists.
