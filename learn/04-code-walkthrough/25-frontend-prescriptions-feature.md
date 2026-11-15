# 25 — Prescriptions feature: `hooks.ts`, `form.ts`, `form.test.ts`, `PrescriptionRow.tsx`, `SharePrescription.tsx`

## `hooks.ts` (85 lines)

| Lines | Export | Notes |
|---|---|---|
| 7 | `PRESCRIPTIONS_KEY` | |
| 9-10 | `READING_POLL_MS = 2000` | |
| 12-20 | `usePrescriptions(params)` | `keepPreviousData`; `refetchInterval` 2 s while any row is reading |
| 22-37 | `usePrescription(id)` | queryFn detects `reading → done` to invalidate lists; polls while reading |
| 39-45 | `useStoreDetail()` | returns a callback: set detail cache + invalidate lists |
| 47-53 | `useScanPrescription()` | `mutationFn(pages)`, `onSuccess: store` |
| 55-61 | `useExtractAgain(id)` | same |
| 63-73 | `useSavePrescription(id)` | store + invalidate **all** patient queries (visit counts change) |
| 75-85 | `useDeletePrescription(id)` | remove detail, invalidate lists + patients |

→ `05-tanstack-query.md` §3.1-3.2.

## `form.ts` (133 lines)

| Lines | Export | Notes |
|---|---|---|
| 8 | `NEW_PATIENT = 'new'` | sentinel value in `patientChoice` |
| 10-16 | `medicationSchema` | name required (trimmed), other fields free strings |
| 18-47 | `reviewSchema` | string fields + `superRefine` (new-patient name rule, follow-up ≥ visit) |
| 49 | `ReviewValues` | `z.infer` |
| 51-57 | `lines`, `unlines`, `blank` | `['a','b'] ↔ "a\nb"`; split/trim/filter empties; `'' → null` |
| 59-66 | `initialPatientChoice(p)` | filed → its patient; draft → first match with reason "Same patient ID" or "Same phone number"; else `NEW_PATIENT` (a "Similar name" alone isn't strong enough) |
| 68-94 | `toFormValues(p)` | API → form; new-patient fields pre-filled from `extracted.patient` |
| 96-125 | `toSaveInput(v)` | form → API; conditional spread for `new_patient` **or** `patient_id` |
| 127-133 | `isUncertain(uncertain, path)` | exact match or a child path (`'medications.0'` is uncertain if `'medications.0.frequency'` is) |

Key snippet:
```ts
131 export function isUncertain(uncertain: readonly string[], path: string): boolean {
132   return uncertain.some((u) => u === path || u.startsWith(`${path}.`))
133 }
```
The trailing `.` prevents `'medications.1'` matching `'medications.10.name'`.

## `form.test.ts` (105 lines)

A full `PrescriptionDetail` fixture (`draft`, lines 7-39) and five tests: pre-fill new patient from what
was read; pre-select only on strong match; convert back to payload (trims, blank → null, splits lines);
reject follow-up before visit (`safeParse`, issue path); uncertain path matching incl. parents.

## `PrescriptionRow.tsx` (63 lines)

One list row as a `<Link>` to `/prescriptions/:id`:
- name = linked patient's name ?? name read from the photo; patient code if linked;
- badges: "Unmatched" (read a name but not linked), "Reading…" (spinner), "Unreadable" (error);
- summary line: diagnosis + procedures joined with ` · `, or `—`;
- meta: visit date or "No date", medicine count, follow-up date, and for drafts "Scanned <date time>".

## `SharePrescription.tsx` (83 lines)

| Lines | Code | Explanation |
|---|---|---|
| 10-16 | Props: `id`, `patientName`, `visitDate`, `size` | |
| 18-22 | `fileName()` | mirrors `pdf_service.filename` (⚠️ duplicated logic) |
| 24-31 | `download(file)` | temporary object URL + `<a download>` click + delayed revoke |
| 33-34 | `canShareFiles` | feature-detect at module load (`typeof navigator` guard for non-browser envs like tests) |
| 37-38 | `busy` state `'share' \| 'download' \| null` | one state for three UI states |
| 40-61 | `run(mode)` | fetch PDF blob → `File` → share via Web Share API if possible, else download; `AbortError` (user cancelled) is silent; any other share error falls back to download; errors toast; `finally` resets busy |
| 63-82 | buttons | Share only when supported; both disabled while busy; label "Preparing…" |

## Q&A

**Q:** 🟢 Why store `procedures` as a newline-separated string in the form?

**A:** A textarea is the fastest way for dentists to edit a list ("one per line" hint); `lines`/`unlines`
convert to and from the API's `string[]` (`form.ts:51-56`).

**Q:** 🟡 Why isn't a "Similar name" match pre-selected?

**A:** Names are ambiguous (many "Rahima Begum"s); auto-selecting could file a prescription to the
wrong patient. ID or phone matches are strong enough (`form.ts:59-66`; test `form.test.ts:49-64`).

**Q:** 🟡 What does `isUncertain(['medications.0.frequency'], 'medications.0')` return and why?

**A:** `true` — the parent path is flagged if any child is uncertain, so the medicine card can show a
"Check" badge.

**Q:** 🔴 Why does `usePrescription` read the previous cache value inside `queryFn`?

**A:** To detect the transition from `reading: true` to `false` and invalidate list queries, so badges
and fields in lists update the moment reading finishes (`hooks.ts:26-33`).

**Q:** 🟡 Why is sharing wrapped in try/catch with a download fallback?

**A:** `navigator.share` can reject: user cancel (`AbortError`, ignore) or browser refusal (e.g. the user
gesture expired while the PDF downloaded). Falling back to a download still gets the file to the user.

**Q:** 🟢 What does `toSaveInput` send when an existing patient is chosen?

**A:** `{ patient_id: v.patientChoice, …clinical fields }` without `new_patient` (`form.ts:99-109`),
satisfying the backend's XOR rule.
