/**
 * Form models for a scanned prescription, and conversion to/from the API:
 * - the assistant's form at payment (patient + bill), and
 * - the dentist's form to check what was read (visit, medicines, advice).
 */
import { z } from 'zod'

import type {
  PatientSex,
  PaymentInput,
  PrescriptionDetail,
  PrescriptionRegisterInput,
  PrescriptionSaveInput,
} from '@/api/types'
import { t } from '@/i18n'
import { minorToTakaInput, parseTaka } from '@/lib/format'
import { isValidBDPhone } from '@/lib/phone'

export const NEW_PATIENT = 'new'

// --- Payment -------------------------------------------------------------------

const taka = z.string().refine((v) => !v.trim() || parseTaka(v) !== null, t.validation.amount)

export const paymentSchema = z
  .object({ billed: taka, paid: taka })
  .superRefine((v, ctx) => {
    const billed = parseTaka(v.billed)
    const paid = parseTaka(v.paid)
    if (paid !== null && billed === null) {
      ctx.addIssue({ code: 'custom', path: ['billed'], message: t.payment.billFirst })
    }
    if (paid !== null && billed !== null && paid > billed) {
      ctx.addIssue({ code: 'custom', path: ['paid'], message: t.payment.paidTooMuch })
    }
  })

export type PaymentValues = z.infer<typeof paymentSchema>

export function toPaymentValues(p: Pick<PrescriptionDetail, 'billed_minor' | 'paid_minor'>): PaymentValues {
  return { billed: minorToTakaInput(p.billed_minor), paid: minorToTakaInput(p.paid_minor) }
}

export function toPaymentInput(v: PaymentValues): PaymentInput {
  return { billed_minor: parseTaka(v.billed), paid_minor: parseTaka(v.paid) }
}

/** What is still owed, in minor units, or null while no bill is entered. */
export function amountDue(v: PaymentValues): number | null {
  const billed = parseTaka(v.billed)
  if (billed === null) return null
  return Math.max(billed - (parseTaka(v.paid) ?? 0), 0)
}

// --- Filing at payment (assistant) ---------------------------------------------

export const registerSchema = z
  .object({
    /** An existing patient's id, or NEW_PATIENT. */
    patientChoice: z.string().min(1, t.review.choosePatient),
    newPatient: z.object({
      full_name: z.string(),
      phone: z.string().refine((v) => !v.trim() || isValidBDPhone(v), t.validation.phone),
      age_years: z
        .string()
        .refine((v) => !v.trim() || /^\d{1,3}$/.test(v.trim()), t.validation.age),
      sex: z.enum(['', 'male', 'female', 'other']),
    }),
    payment: paymentSchema,
  })
  .superRefine((v, ctx) => {
    if (v.patientChoice === NEW_PATIENT && v.newPatient.full_name.trim().length < 2) {
      ctx.addIssue({ code: 'custom', path: ['newPatient', 'full_name'], message: t.validation.required })
    }
  })

export type RegisterValues = z.infer<typeof registerSchema>

/** Pre-select an almost-certain match (same ID, or same phone and similar name). */
function initialPatientChoice(p: PrescriptionDetail): string {
  if (p.patient) return p.patient.id
  return p.patient_matches.find((m) => m.strong)?.patient.id ?? NEW_PATIENT
}

export function toRegisterValues(p: PrescriptionDetail): RegisterValues {
  const read = p.extracted?.patient
  return {
    patientChoice: initialPatientChoice(p),
    newPatient: {
      full_name: read?.full_name ?? '',
      phone: read?.phone ?? '',
      age_years: read?.age_years != null ? String(read.age_years) : '',
      sex: read?.sex ?? '',
    },
    payment: toPaymentValues(p),
  }
}

export function toRegisterInput(v: RegisterValues): PrescriptionRegisterInput {
  const np = v.newPatient
  return {
    ...(v.patientChoice === NEW_PATIENT
      ? {
          new_patient: {
            full_name: np.full_name.trim(),
            phone: blank(np.phone),
            age_years: np.age_years.trim() ? Number(np.age_years) : null,
            sex: (np.sex || null) as PatientSex | null,
          },
        }
      : { patient_id: v.patientChoice }),
    ...toPaymentInput(v.payment),
  }
}

// --- Checking what was read (dentist) -------------------------------------------

const medicationSchema = z.object({
  name: z.string().trim().min(1, t.validation.required),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
  instructions: z.string(),
})

export const clinicalSchema = z
  .object({
    visit_date: z.string().min(1, t.validation.required),
    chief_complaint: z.string(),
    diagnosis: z.string(),
    procedures: z.string(),
    medications: z.array(medicationSchema),
    advice: z.string(),
    follow_up_date: z.string(),
    notes: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.follow_up_date && v.visit_date && v.follow_up_date < v.visit_date) {
      ctx.addIssue({ code: 'custom', path: ['follow_up_date'], message: t.review.followUpBeforeVisit })
    }
  })

export type ClinicalValues = z.infer<typeof clinicalSchema>

const lines = (items: string[]) => items.join('\n')
const unlines = (text: string) =>
  text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
const blank = (text: string) => text.trim() || null

export function toClinicalValues(p: PrescriptionDetail): ClinicalValues {
  return {
    visit_date: p.visit_date ?? '',
    chief_complaint: p.chief_complaint ?? '',
    diagnosis: p.diagnosis ?? '',
    procedures: lines(p.procedures),
    medications: p.medications.map((m) => ({
      name: m.name,
      dosage: m.dosage ?? '',
      frequency: m.frequency ?? '',
      duration: m.duration ?? '',
      instructions: m.instructions ?? '',
    })),
    advice: lines(p.advice),
    follow_up_date: p.follow_up_date ?? '',
    notes: p.notes ?? '',
  }
}

export function toSaveInput(v: ClinicalValues): PrescriptionSaveInput {
  return {
    visit_date: v.visit_date,
    chief_complaint: blank(v.chief_complaint),
    diagnosis: blank(v.diagnosis),
    procedures: unlines(v.procedures),
    medications: v.medications.map((m) => ({
      name: m.name.trim(),
      dosage: blank(m.dosage),
      frequency: blank(m.frequency),
      duration: blank(m.duration),
      instructions: blank(m.instructions),
    })),
    advice: unlines(v.advice),
    follow_up_date: blank(v.follow_up_date),
    notes: blank(v.notes),
  }
}

/**
 * Whether the model flagged a field as hard to read. Paths look like
 * "visit_date", "patient.full_name" or "medications.1.frequency".
 */
export function isUncertain(uncertain: readonly string[], path: string): boolean {
  return uncertain.some((u) => u === path || u.startsWith(`${path}.`))
}
