# React Hook Form + Zod — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

## Concepts

**Q:** 🟢 What is React Hook Form?

**A:** A form library using uncontrolled inputs registered via refs, giving validation, errors and submission with minimal re-renders.

**Q:** 🟢 What is Zod?

**A:** A TypeScript-first schema validation library: define schemas, `parse`/`safeParse` data at runtime, and infer static types with `z.infer`.

**Q:** 🟢 What does `register('email')` return?

**A:** `{ name, ref, onChange, onBlur }` to spread on an input, connecting it to the form (`LoginPage.tsx:90`).

**Q:** 🟢 What does `handleSubmit(fn)` do?

**A:** Prevents default submit, validates, and calls `fn(values)` only if valid (otherwise populates errors).

**Q:** 🟢 Where are errors stored?

**A:** `form.formState.errors.<field>.message` (`LoginPage.tsx:36, 82`).

**Q:** 🟢 What is a resolver?

**A:** An adapter that validates form values with an external schema library: `zodResolver(schema)` (`LoginPage.tsx:33`).

**Q:** 🟢 What does `defaultValues` do?

**A:** Initial values (read once on mount); also used by `reset()` with no arguments.

**Q:** 🟢 Why `noValidate` on the `<form>`?

**A:** Disables native browser validation bubbles so the app shows its own consistent, accessible messages.

**Q:** 🟢 What does `z.string().trim().min(1)` do?

**A:** Trims whitespace (transform) then requires at least one character — `"  "` fails.

**Q:** 🟢 What does `z.infer<typeof schema>` produce?

**A:** The TypeScript type of the validated output (`FormValues`, `LoginPage.tsx:22`).

**Q:** 🟢 What is `z.enum`?

**A:** A schema for one of several string literals: `z.enum(['', 'male', 'female', 'other'])` (`form.ts:29`).

**Q:** 🟡 What's the difference between `refine` and `superRefine`?

**A:** `refine` returns a boolean with one message/path; `superRefine` receives a context to add any number of issues with custom paths and conditions (`form.ts:40-47`).

**Q:** 🟡 How do you put a cross-field error on a specific field?

**A:** Pass `path` to `refine` (`{ path: ['confirm'] }`, `ChangePasswordDialog.tsx:29-32`) or `ctx.addIssue({ path: [...] })`.

**Q:** 🟡 How do you show a server error under a field?

**A:** `form.setError('current_password', { message })` after mapping an error code (`ChangePasswordDialog.tsx:56-57`).

**Q:** 🟡 `parse` vs `safeParse`?

**A:** `parse` throws a `ZodError`; `safeParse` returns `{ success, data }` or `{ success: false, error }` (`form.test.ts:93`).

**Q:** 🟡 What is `useFieldArray`?

**A:** Manages dynamic lists of fields (`fields`, `append`, `remove`, `move`…) with stable `field.id` keys (`PrescriptionReviewPage.tsx:611`).

**Q:** 🟡 Why use `field.id` as the key, not the index?

**A:** Removing an item shifts indexes; index keys would attach DOM state to the wrong row.

**Q:** 🟡 What does `watch` do?

**A:** Subscribes to field values and re-renders on change — e.g. showing new-patient inputs when `patientChoice === 'new'` (`PrescriptionReviewPage.tsx:289`).

**Q:** 🟡 What does `setValue(name, value, { shouldValidate, shouldDirty })` do?

**A:** Programmatically sets a field and optionally validates/marks it dirty — used by custom radio cards (`PrescriptionReviewPage.tsx:301-302`).

**Q:** 🟡 What does `reset()` do?

**A:** Restores default (or given) values and clears errors/dirty state (`ChangePasswordDialog.tsx:68`, `EditPatientDialog.tsx:82`).

**Q:** 🟡 `defaultValues` vs `values` option?

**A:** `defaultValues` once at mount; `values` keeps the form synced to external data (`EditPatientDialog.tsx:55`).

**Q:** 🟡 What validation modes exist?

**A:** `onSubmit` (default), `onBlur`, `onChange`, `onTouched`, `all`, plus `reValidateMode` after the first submit.

**Q:** 🟡 Why are numbers kept as strings in the review form?

**A:** Inputs produce strings; empty means "not set". Converting once in `toSaveInput` (`form.ts:105`) avoids `NaN` and makes empty explicit.

**Q:** 🟡 Why separate form values from API payload types?

**A:** UI-friendly shapes (newline-separated text, string ages, `'new'` sentinel) differ from the API's; pure converters keep both clean and testable (`form.ts:68-125`).

**Q:** 🟡 What does `z.coerce.number()` do?

**A:** Converts input with `Number(x)` before validating — handy for inputs, but `''` becomes `0`, which is why this app keeps strings.

**Q:** 🟡 What does `.optional()` vs `.nullable()` mean?

**A:** `optional` allows `undefined`; `nullable` allows `null`.

**Q:** 🟡 How do you disable all inputs of a form?

**A:** Wrap them in `<fieldset disabled>` (`PrescriptionReviewPage.tsx:235`).

**Q:** 🟡 How do you submit a form from a button outside it?

**A:** Give the form an `id` and the button `form="<id>" type="submit"` (`ChangePasswordDialog.tsx:77, 110`).

**Q:** 🔴 How does RHF minimise re-renders?

**A:** Values live in refs/DOM; `formState` is a Proxy that tracks which properties a component reads and only re-renders when those change.

**Q:** 🔴 Zod input vs output types?

**A:** With transforms (`.trim()`, `.transform()`), `z.input<typeof s>` is what goes in and `z.output`/`z.infer` what comes out; resolvers can be typed with both.

**Q:** 🔴 What is a discriminated union in Zod?

**A:** `z.discriminatedUnion('kind', [z.object({ kind: z.literal('existing'), id }), z.object({ kind: z.literal('new'), patient })])` — efficient parsing and precise errors.

**Q:** 🔴 Why duplicate validation rules on client and server?

**A:** Client for instant UX; server for security and correctness. Here the follow-up rule exists in `form.ts:44-46` and `schemas/prescription.py:96-97`.

**Q:** 🔴 How could you avoid duplicating validation between Zod and Pydantic?

**A:** Generate Zod schemas from OpenAPI/JSON Schema (e.g. `openapi-zod-client`), or rely on server validation and map 422 field errors into the form.

## Predict / find the bug

**Q:** 🟢 Bug: `<input {...register('age')} />` but the API needs a number.

**A:** The value is a string; convert (`Number(v)`) in a submit mapper or use `valueAsNumber` / `z.coerce.number()`.

**Q:** 🟡 Bug: after closing and reopening a dialog, old passwords are still there.

**A:** Reset on close (`ChangePasswordDialog.tsx:65-70`).

**Q:** 🟡 Bug: `useForm({ defaultValues: data })` where `data` loads later — fields stay empty.

**A:** Defaults are read once. Render the form after data loads, call `reset(data)`, use `values`, or change the component `key`.

**Q:** 🟡 Predict: `reviewSchema.safeParse({ ...values, follow_up_date: '2026-10-01', visit_date: '2026-10-08' }).success`

**A:** `false`, with an issue at path `['follow_up_date']` (`form.test.ts:91-96`).

**Q:** 🟡 Bug: clicking the "show password" button submits the form.

**A:** Buttons default to `type="submit"` inside forms; set `type="button"` (`LoginPage.tsx:105`).

**Q:** 🟡 Predict: `z.string().refine(v => !v.trim() || isValidBDPhone(v))` with `''`.

**A:** Valid — empty is allowed; non-empty must be a valid phone (`form.ts:25`).

**Q:** 🔴 Bug: `fields.map((f, i) => <Row key={i} {...register(`items.${i}.name`)} />)` — removing row 1 shows row 2's text in row 1's input incorrectly in some cases.

**A:** Index keys; use `key={f.id}`.

## Scenarios & tasks

**Q:** 🟡 Write a password-confirm schema.

**A:**
```ts
z.object({ password: z.string().min(8), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })
```

**Q:** 🟡 Write a schema where `name` is required only when `choice === 'new'`.

**A:** Use `superRefine`: `if (v.choice === 'new' && v.name.trim().length < 2) ctx.addIssue({ code: 'custom', path: ['name'], message: 'Required' })` (`form.ts:41-43`).

**Q:** 🟡 Convert a textarea into a list for the API.

**A:** `text.split('\n').map((s) => s.trim()).filter(Boolean)` (`form.ts:52-56`).

**Q:** 🟡 Map a 409 "code taken" error to a field.

**A:** `if (err instanceof ApiError && err.code === 'patient_code_taken') form.setError('patient_code', { message: err.message })` (`EditPatientDialog.tsx:70-71`).

**Q:** 🟡 Add an empty medicine row.

**A:** `append({ name: '', dosage: '', frequency: '', duration: '', instructions: '' })` (`PrescriptionReviewPage.tsx:622-624`).

**Q:** 🟡 Mark an input invalid for screen readers and styling.

**A:** `aria-invalid={!!errors.x}` plus `aria-describedby` pointing to the error id (`LoginPage.tsx:88-89`).

**Q:** 🟡 How would you warn about unsaved changes?

**A:** Check `formState.isDirty`; block navigation with `useBlocker` and add a `beforeunload` listener.

**Q:** 🔴 How would you validate server-side 422 details into fields generically?

**A:** For each `{field, message}` in `err.fieldErrors`, call `form.setError(field as Path<V>, { message })` when the field exists; otherwise toast. Requires backend and form paths to match.

**Q:** 🟡 How do you test form logic without rendering?

**A:** Test pure converters and schemas directly (`form.test.ts`) — `toFormValues`, `toSaveInput`, `reviewSchema.safeParse`.

**Q:** 🟡 How would you pre-select a patient only on strong matches?

**A:** Find a match whose reasons include ID or phone; else default to "new" (`form.ts:59-66`).

## Comparisons & interview

**Q:** 🟡 RHF vs Formik?

**A:** RHF: uncontrolled, fewer renders, smaller; Formik: controlled state, more renders, less active maintenance.

**Q:** 🟡 RHF vs TanStack Form?

**A:** TanStack Form is newer with strong type-safe field APIs and framework-agnostic core; RHF is mature with a huge ecosystem.

**Q:** 🟡 Zod vs Yup?

**A:** Zod is TS-first with excellent inference; Yup is older, JS-first. APIs are similar.

**Q:** 🟡 Zod vs Valibot?

**A:** Valibot is modular and tree-shakable (tiny bundles); Zod has broader ecosystem support (Zod 4 improved size/speed).

**Q:** 🟡 Controlled vs uncontrolled forms?

**A:** Controlled: React state per input (simple, re-render per keystroke); uncontrolled: DOM holds values (fast, needs refs/library).

**Q:** 🟢 Which forms in this app use RHF?

**A:** Login, change password, edit patient, and prescription review.

**Q:** 🟡 Why does `LoginPage` define `onSubmit` after the early returns?

**A:** `onSubmit` isn't a hook, so it may be defined after returns; all hooks (`useForm`, etc.) are called before them (`LoginPage.tsx:32-43`).

**Q:** 🟡 What does `formState.errors.newPatient?.full_name?.message` show about nesting?

**A:** Errors mirror the value shape; nested objects and arrays have nested error objects (`PrescriptionReviewPage.tsx:364`).

**Q:** 🔴 Why might `superRefine` issues not appear until submit?

**A:** Object-level refinements run when the whole object is validated (on submit, then on change after the first submit in default mode).

**Q:** 🟡 What does `t.validation.required` as the message argument show?

**A:** Messages come from the i18n strings file, so validation text can be translated (`form.ts:11`).

**Q:** 🟡 How does `type="date"` interact with the schema?

**A:** Date inputs produce `YYYY-MM-DD` strings, which the schema compares lexicographically and the API accepts as dates (`PrescriptionReviewPage.tsx:572`, `form.ts:44`).

**Q:** 🟢 What is `zodResolver` imported from?

**A:** `@hookform/resolvers/zod` (`LoginPage.tsx:1`).

**Q:** 🟡 How is the medicine name validated?

**A:** `z.string().trim().min(1, t.validation.required)` per row (`form.ts:11`), errors at `errors.medications?.[i]?.name`.
