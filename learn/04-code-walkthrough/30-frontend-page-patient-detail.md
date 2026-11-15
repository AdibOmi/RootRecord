# 30 — `pages/PatientDetailPage.tsx` (316 lines)

**Purpose:** a patient's facts, edit/delete actions and paginated history of filed visits with share
buttons. **Route:** `/patients/:id`. **Calls:** `usePatient`, `usePrescriptions`, `useDeletePatient`,
`EditPatientDialog`, `SharePrescription`, permissions.

## Main component (50-191)

| Lines | Code | Explanation |
|---|---|---|
| 48 | `PAGE_SIZE = 10` | history page size |
| 51 | `const { id = '' } = useParams()` | default avoids `undefined` (type `string`) |
| 52-62 | user, patient query, `page` state, `editOpen`, `deleteOpen`, history query (`patient_id`, `status: 'confirmed'`) | all hooks before early returns; history fetches in parallel with the patient |
| 64-72 | skeleton while pending | |
| 73-88 | error: 404 → "not found" copy; else error message; Back button | `error instanceof ApiError && status === 404` |
| 90-96 | `facts` tuple list `[label, value]` `as const` | phone formatted; `null` shown as `—` (`:154`) |
| 100-146 | `PageHeader` actions: Back (icon-only on phones), Edit (`patients:edit`), Scan (`prescriptions:scan`, hidden on phones because the top bar has one), ⋮ menu with Delete (`patients:delete`) | |
| 148-159 | facts card: `dl` grid with `dt`/`dd` | semantic definition list |
| 161-167 | dialogs mounted always, controlled by state; delete dialog gets the visit count | |
| 169-188 | history: skeleton / `VisitCard` list + `Pagination` / empty card | page state is local (not URL) here |

## `DeletePatientDialog` (193-243)

Controlled dialog; message differs if the patient has visits and shows how many prescriptions will be
deleted; destructive button calls `del.mutate(undefined, { onSuccess: toast + navigate('/patients',
{ replace: true }), onError: toast })`.

## `VisitCard` (245-306)

```tsx
246   const rows: [string, ReactNode][] = [
247     [t.patients.complaint, rx.chief_complaint],
248     [t.patients.diagnosis, rx.diagnosis],
249     [t.patients.treatment, rx.procedures.length > 0 && <List items={rx.procedures} />],
250     [t.patients.medicines, rx.medications.length > 0 && (<ul>…name — dosage, frequency, duration, instructions…</ul>)],
268     [t.patients.advice, rx.advice.length > 0 && <List items={rx.advice} />],
269     [t.patients.notes, rx.notes],
270   ]
…
285           {rows.filter(([, value]) => value).map(([label, value]) => (     // skip empty rows
288             <div key={label} className="sm:contents">                        // grid layout on sm+, stacked on phones
289               <dt …>{label}</dt>
290               <dd className="min-w-0 whitespace-pre-line">{value}</dd>      // keep line breaks
```
- `filter(([, value]) => value)` — array destructuring skipping the first element.
- `sm:contents` makes the wrapper `display: contents` so `dt`/`dd` become direct grid children on wider
  screens.
- Footer: `SharePrescription` (sm) + "Open prescription" link.

`List` (308-316): bullet list with index keys (static content).

## Q&A

**Q:** 🟢 Why are the edit/delete dialogs always rendered?

**A:** They're controlled by `open` state; Radix renders nothing visible when closed, and keeping them
mounted preserves form state wiring and allows exit animations.

**Q:** 🟡 Why does the delete dialog show the number of prescriptions?

**A:** Deleting a patient also deletes their filed prescriptions and photos
(`patient_service.py:122-134`); showing the count makes the destructive consequence explicit.

**Q:** 🟡 What does `rows.filter(([, value]) => value)` do with `procedures.length > 0 && <List/>`?

**A:** If there are no procedures the expression is `false`, which is filtered out, so the row isn't
rendered.

**Q:** 🔴 History pagination uses `useState` while the Patients list uses URL params. Trade-off?

**A:** Local state is simpler but resets on refresh and isn't shareable; URL params preserve position.
For a short visit history, local state is acceptable; consistency would argue for `?page=`.

**Q:** 🟢 Why is the Scan button hidden on phones here?

**A:** The sticky top bar already shows a camera button on phones (`AppShell.tsx:48-55`); hiding the
duplicate keeps the header actions on one line (comment at line 118).
