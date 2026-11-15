# 06 — React Hook Form 7 + Zod 3

> **Where it lives:** `frontend/src/pages/LoginPage.tsx`,
> `features/auth/ChangePasswordDialog.tsx`, `features/patients/EditPatientDialog.tsx`,
> `features/prescriptions/form.ts` (schema + converters), `pages/PrescriptionReviewPage.tsx`.
> Packages: `react-hook-form ^7.88`, `zod ^3.25`, `@hookform/resolvers ^3.10` (`package.json`).

---

## 1. What & why

**React Hook Form (RHF)** — a form library that keeps input values in the DOM (uncontrolled
inputs) and tracks them via refs, so typing doesn't re-render the whole form. It handles
registration, validation timing, errors, dirty/touched state and submission.

**Zod** — a TypeScript-first **schema validation** library: you describe the data shape once,
call `schema.parse(data)` at runtime, and get a static type via `z.infer`.

**Resolver** — the adapter (`zodResolver`) that lets RHF validate with a Zod schema.

**Analogy:** RHF is the clipboard that collects answers; Zod is the checklist that says which
answers are acceptable.

**When NOT to use:** a single search box (plain `useState`), or forms handled entirely by a
framework's server actions.

---

## 2. Fundamentals

### 2.1 A minimal form — the login page

📍 `frontend/src/pages/LoginPage.tsx:17-43, 82-91`:

```tsx
const schema = z.object({
  email: z.string().trim().min(1, t.validation.required).email(t.validation.email),
  password: z.string().min(1, t.validation.required),
})
type FormValues = z.infer<typeof schema>           // { email: string; password: string }

const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { email: '', password: '' },
})
const { errors } = form.formState

const onSubmit = form.handleSubmit((values) => {   // only called if validation passes
  login.mutate(values, { onSuccess: () => navigate(from, { replace: true }) })
})

<form onSubmit={onSubmit} noValidate>                 // noValidate: skip browser bubbles
  <Input id="email" aria-invalid={!!errors.email} {...form.register('email')} />
```

- `register('email')` returns `{ name, ref, onChange, onBlur }` spread onto the input.
- `handleSubmit(fn)` prevents default submission, validates, then calls `fn(values)`.
- Errors appear under `formState.errors.<field>.message`.
- Default **mode** is `onSubmit` (validate on submit, then re-validate on change).
- `.trim()` in Zod *transforms* the value: the submitted email has no surrounding spaces.

### 2.2 Cross-field validation

📍 `frontend/src/features/auth/ChangePasswordDialog.tsx:23-32`:

```tsx
const schema = z
  .object({
    current_password: z.string().min(1, t.validation.required),
    new_password: z.string().min(8, t.validation.passwordMin).max(128),
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, {
    path: ['confirm'],                       // attach the error to the confirm field
    message: t.validation.passwordsMatch,
  })
```

The 8–128 length mirrors the backend's `Password` type (`backend/app/schemas/user.py:11`).

### 2.3 Server errors into fields

📍 `ChangePasswordDialog.tsx:50-62`:

```tsx
try {
  await mutation.mutateAsync({ current_password, new_password })
  …
} catch (err) {
  if (err instanceof ApiError && err.code === 'invalid_password') {
    form.setError('current_password', { message: err.message })   // show under the field
  } else {
    toast.error(errorMessage(err))
  }
}
```

Same pattern for duplicate patient IDs: `EditPatientDialog.tsx:70-71` and
`PrescriptionReviewPage.tsx:125-126` map `patient_code_taken` (409 from
`backend/app/services/patient_service.py:81-83`) to the patient-ID field.

### 2.4 Resetting

📍 `ChangePasswordDialog.tsx:65-70` resets the form when the dialog closes, so reopening it
doesn't show old passwords. 📍 `EditPatientDialog.tsx:55` uses `values: toValues(patient)` — the
form re-syncs when the `patient` prop changes (e.g., after a save updates the cache).

---

## 3. Intermediate

### 3.1 Form values ≠ API payload

A core design idea in `frontend/src/features/prescriptions/form.ts`: **HTML inputs produce
strings**, while the API wants numbers, `null`s and arrays. So the form schema is all strings, and
two pure functions convert:

📍 `form.ts:18-47` — the schema (abridged):

```tsx
export const reviewSchema = z
  .object({
    patientChoice: z.string().min(1, t.review.choosePatient),   // patient id or 'new'
    newPatient: z.object({
      patient_code: z.string(),
      full_name: z.string(),
      phone: z.string().refine((v) => !v.trim() || isValidBDPhone(v), t.validation.phone),
      age_years: z.string().refine((v) => !v.trim() || /^\d{1,3}$/.test(v.trim()), t.validation.age),
      sex: z.enum(['', 'male', 'female', 'other']),
    }),
    visit_date: z.string().min(1, t.validation.required),
    procedures: z.string(),            // one per line in a textarea
    medications: z.array(medicationSchema),
    advice: z.string(),
    follow_up_date: z.string(),
    /* … */
  })
  .superRefine((v, ctx) => {
    if (v.patientChoice === NEW_PATIENT && v.newPatient.full_name.trim().length < 2) {
      ctx.addIssue({ code: 'custom', path: ['newPatient', 'full_name'], message: t.validation.required })
    }
    if (v.follow_up_date && v.visit_date && v.follow_up_date < v.visit_date) {
      ctx.addIssue({ code: 'custom', path: ['follow_up_date'], message: t.review.followUpBeforeVisit })
    }
  })
```

- `refine` — a boolean check with one message. `superRefine` — full control, can add **several**
  issues at chosen paths and run **conditional** rules ("name required *only* for a new patient").
- Dates as `'YYYY-MM-DD'` strings compare correctly with `<` (lexicographic = chronological).
- The same two rules exist on the server (`backend/app/schemas/prescription.py:92-98`) — the
  client copy is for fast feedback; the server copy is the authority.

📍 Converters `form.ts:68-125`: `toFormValues(p)` (API → strings; arrays joined with `\n`;
`null → ''`) and `toSaveInput(v)` (strings → API; `blank()` turns `''` into `null`;
`unlines()` splits/trims/drops empty lines; age → `Number`). They are unit-tested in
`form.test.ts:66-89`.

### 3.2 Dynamic lists: `useFieldArray`

📍 `PrescriptionReviewPage.tsx:610-673`:

```tsx
const { fields, append, remove } = useFieldArray({ control: form.control, name: 'medications' })
…
append({ name: '', dosage: '', frequency: '', duration: '', instructions: '' })
{fields.map((field, i) => (
  <div key={field.id}>                                   // RHF-generated stable id
    <Input {...form.register(`medications.${i}.name`)} />
    <Button onClick={() => remove(i)} />
```

Use `field.id` (not `i`) as the key so removing medicine #1 doesn't shift inputs' DOM state.

### 3.3 `watch` and `setValue`

📍 `PrescriptionReviewPage.tsx:289` `const choice = form.watch('patientChoice')` — subscribe to a
value and re-render when it changes (used to show the new-patient fields).
📍 `:301-302` `form.setValue('patientChoice', id, { shouldDirty: true, shouldValidate: true })` —
programmatic change for a non-input control (the custom radio cards).

### 3.4 Disabling a whole form

📍 `PrescriptionReviewPage.tsx:235` wraps sections in `<fieldset disabled={!editable || reading}>`
— the native HTML way to disable every control inside (receptionists see the draft read-only;
nobody edits while Gemini is still reading).

### 3.5 Accessibility wiring

`aria-invalid={!!errors.x}` styles invalid inputs (`ui/input.tsx:14` uses the
`aria-invalid:` Tailwind variant) and tells screen readers. `FormField` renders errors with
`role="alert"` and id `${id}-error` (`components/common/FormField.tsx:24-27`).

---

## 4. Advanced

### 4.1 Zod API tour

| API | Purpose |
|---|---|
| `z.string().min().max().email().regex()` | string rules |
| `z.number().int().positive()` | numbers |
| `z.coerce.number()` | convert input strings to numbers |
| `z.enum([...])` | literal unions |
| `z.object({...}).strict()` / `.passthrough()` | unknown keys error / keep |
| `z.array(s).max(50)` | arrays |
| `.optional()`, `.nullable()`, `.default(v)` | optionality |
| `.transform(fn)` | change output |
| `.refine`, `.superRefine` | custom rules |
| `z.discriminatedUnion('type', [...])` | tagged unions |
| `schema.parse` / `safeParse` | throw vs `{ success, data | error }` |
| `z.infer` / `z.input` / `z.output` | static types (input/output differ with transforms) |

📍 `form.test.ts:91-96` uses `reviewSchema.safeParse(values)` and checks
`result.error?.issues[0]?.path` equals `['follow_up_date']`.

### 4.2 Why string-typed numbers?

`age_years` stays a string in the form (`form.ts:26-28`) so an empty input is `''` rather than
`NaN`. An alternative is `z.coerce.number()` or `register('age', { valueAsNumber: true })`, but
both make "empty" awkward. Converting once in `toSaveInput` (`form.ts:105`) is explicit.

### 4.3 RHF performance model

RHF subscribes per field: typing in one input re-renders only what watches it. `formState` is a
**Proxy** — only the properties you read (e.g. `errors`) trigger re-renders. Hence
`const { errors } = form.formState` (`LoginPage.tsx:36`).

### 4.4 Validation modes

`mode: 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched' | 'all'`, `reValidateMode`. Defaults are
used in this repo.

---

## 5. Comparisons

| X vs Y | Answer |
|---|---|
| RHF vs Formik | uncontrolled + subscriptions (fewer renders) vs controlled state; Formik is largely unmaintained |
| RHF vs TanStack Form | mature vs newer, fully type-safe field paths |
| Zod vs Yup | TS-first inference vs older JS-first; similar API |
| Zod vs Valibot | Valibot is modular/tiny; Zod has the bigger ecosystem (Zod 4 is faster/smaller) |
| `refine` vs `superRefine` | one issue vs many/conditional issues |
| client vs server validation | UX vs security; always do both |
| `defaultValues` vs `values` | initial only vs keeps syncing with props |

---

## 6. Patterns & anti-patterns

- ✅ Schema + `z.infer` = one source of truth for form types.
- ✅ Pure converters between form and API, unit tested.
- ✅ Map server error codes to fields.
- ❌ Duplicating validation rules without tests (⚠️ here rules are duplicated FE/BE by hand —
  acceptable, but phone regex exists three times: `lib/phone.ts:1`,
  `backend/app/core/validators.py:8`).
- ❌ Using array index as key in field arrays.

---

## 7. Security & performance

Client validation is bypassable — the backend re-validates everything with Pydantic. Keep
`noValidate` + your own messages for consistent, accessible errors.

---

## 8. Cheat sheet

```tsx
const schema = z.object({ email: z.string().email() }).refine(fn, { path: ['x'], message })
type V = z.infer<typeof schema>
const form = useForm<V>({ resolver: zodResolver(schema), defaultValues })
<form onSubmit={form.handleSubmit(onValid)} noValidate>
<input {...form.register('email')} />
form.formState.errors.email?.message
form.setError('field', { message }); form.reset(values); form.watch('x'); form.setValue('x', v)
const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })
```

---

## 9. Why chosen + alternatives

The review form is large (patient + visit + N medicines) — RHF keeps it fast; Zod gives typed
values and conditional rules. Alternatives: Formik + Yup (older), TanStack Form (newer), or
controlled `useState` (fine for 2 fields, painful for 30).
