# 24 — Patients feature: `features/patients/hooks.ts`, `EditPatientDialog.tsx`

## `hooks.ts` (49 lines)

```ts
6  // Not imported from features/prescriptions/hooks, which imports this module.
7  const PRESCRIPTIONS_KEY = ['prescriptions'] as const      // duplicated to avoid a circular import
9  export const PATIENTS_KEY = ['patients'] as const

11 export function usePatients(params: PatientListParams, enabled = true) {
12   return useQuery({
13     queryKey: [...PATIENTS_KEY, 'list', params],
14     queryFn: ({ signal }) => patientsApi.list(params, signal),   // cancellable
15     placeholderData: keepPreviousData,
16     enabled,
17   })
18 }

20 export function usePatient(id: string) { … queryKey: [...PATIENTS_KEY, 'detail', id] … }

27 export function useUpdatePatient(id: string) {
31     onSuccess: (patient) => {
32       qc.setQueryData([...PATIENTS_KEY, 'detail', id], patient)            // update detail immediately
33       void qc.invalidateQueries({ queryKey: [...PATIENTS_KEY, 'list'] })   // lists refetch
34     },
35 }

38 /** Delete a patient with all their prescriptions. */
39 export function useDeletePatient(id: string) {
43     onSuccess: () => {
44       qc.removeQueries({ queryKey: [...PATIENTS_KEY, 'detail', id] })      // don't refetch a deleted patient
45       void qc.invalidateQueries({ queryKey: [...PATIENTS_KEY, 'list'] })
46       void qc.invalidateQueries({ queryKey: PRESCRIPTIONS_KEY })            // their prescriptions are gone too
47     },
48 }
```
`removeQueries` (not invalidate) for the deleted detail — invalidating would trigger a refetch → 404.

## `EditPatientDialog.tsx` (137 lines)

| Lines | Code | Explanation |
|---|---|---|
| 24-30 | Zod schema: name ≥ 2 (trimmed), code ≥ 1, phone optional-but-valid (`refine`), age optional 1–3 digits, sex enum incl. `''` | strings for every input |
| 34-35 | `selectClass` | Tailwind classes for a native `<select>` styled like `Input` (⚠️ duplicated in the review page) |
| 37-45 | `toValues(p)` | API patient → form strings (`null → ''`, age → string) |
| 53-56 | `useUpdatePatient(patient.id)`, `useForm({ resolver, values: toValues(patient) })` | `values` keeps the form in sync when the cached patient changes |
| 58-76 | `onSubmit` | convert back (trim; `''` → `null`; age → `Number`; sex `''` → `null`), `mutateAsync`, toast + close; `patient_code_taken` → field error |
| 79-85 | `onOpenChange` | on close: `form.reset(toValues(patient))` |
| 91-125 | form grid: name, ID, phone (`type="tel" inputMode="tel"` → phone keypad), age (`inputMode="numeric"`), sex `<select>` | |
| 126-133 | footer buttons (submit via `form="edit-patient"`) | |

## Q&A

**Q:** 🟢 Why `keepPreviousData` on the patient list?

**A:** While the next page or search loads, the old list stays visible instead of flashing skeletons.

**Q:** 🟡 Why does `useDeletePatient` invalidate prescriptions?

**A:** Deleting a patient deletes their prescriptions on the server (`patient_service.py:122-134`);
cached prescription lists would otherwise still show them.

**Q:** 🟡 Why is `PRESCRIPTIONS_KEY` duplicated here?

**A:** `features/prescriptions/hooks.ts` imports `PATIENTS_KEY` from this module; importing back would
create a circular import (ESM handles cycles but values can be `undefined` at init time). Duplicating a
tiny constant avoids it (comment line 6).

**Q:** 🟡 What's the difference between `defaultValues` and `values` in `useForm`?

**A:** `defaultValues` are read once on mount; `values` re-syncs the form whenever the prop changes — here
when the patient in the cache updates after a save.

**Q:** 🟢 What do `inputMode="tel"` and `inputMode="numeric"` do?

**A:** On phones, they show the phone/numeric keypad without changing validation semantics.

**Q:** 🔴 If two staff edit the same patient, what happens?

**A:** Last write wins (PATCH applies sent fields). With `exclude_unset`, only changed fields that were
sent are overwritten — but this form sends all fields, so the second save overwrites the first entirely.
Optimistic locking (`updated_at` check / ETag `If-Match`) would detect conflicts.
