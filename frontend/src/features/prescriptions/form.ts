/** Form model for reviewing a scanned prescription, and conversion to/from the API. */
import { z } from 'zod'

import type { PatientSex, PrescriptionDetail, PrescriptionSaveInput } from '@/api/types'
import { t } from '@/i18n'
import { isValidBDPhone } from '@/lib/phone'

export const NEW_PATIENT = 'new'

const medicationSchema = z.object({
  name: z.string().trim().min(1, t.validation.required),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
  instructions: z.string(),
})

export const reviewSchema = z
  .object({
    /** An existing patient's id, or NEW_PATIENT. */
    patientChoice: z.string().min(1, t.review.choosePatient),
    newPatient: z.object({
      patient_code: z.string(),
      full_name: z.string(),
      phone: z.string().refine((v) => !v.trim() || isValidBDPhone(v), t.validation.phone),
      age_years: z
        .string()
        .refine((v) => !v.trim() || /^\d{1,3}$/.test(v.trim()), t.validation.age),
      sex: z.enum(['', 'male', 'female', 'other']),
    }),
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
    if (v.patientChoice === NEW_PATIENT && v.newPatient.full_name.trim().length < 2) {
      ctx.addIssue({ code: 'custom', path: ['newPatient', 'full_name'], message: t.validation.required })
    }
    if (v.follow_up_date && v.visit_date && v.follow_up_date < v.visit_date) {
      ctx.addIssue({ code: 'custom', path: ['follow_up_date'], message: t.review.followUpBeforeVisit })
    }
  })

export type ReviewValues = z.infer<typeof reviewSchema>

const lines = (items: string[]) => items.join('\n')
const unlines = (text: string) =>
  text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
const blank = (text: string) => text.trim() || null

/** Pick the patient to pre-select: the filed one, or a draft's strong match. */
function initialPatientChoice(p: PrescriptionDetail): string {
  if (p.patient) return p.patient.id
  const strong = p.patient_matches.find((m) =>
    m.reasons.some((r) => r === 'Same patient ID' || r === 'Same phone number'),
  )
  return strong?.patient.id ?? NEW_PATIENT
}

export function toFormValues(p: PrescriptionDetail): ReviewValues {
  const read = p.extracted?.patient
  return {
    patientChoice: initialPatientChoice(p),
    newPatient: {
      patient_code: read?.patient_id ?? '',
      full_name: read?.full_name ?? '',
      phone: read?.phone ?? '',
      age_years: read?.age_years != null ? String(read.age_years) : '',
      sex: read?.sex ?? '',
    },
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

export function toSaveInput(v: ReviewValues): PrescriptionSaveInput {
  const np = v.newPatient
  return {
    ...(v.patientChoice === NEW_PATIENT
      ? {
          new_patient: {
            patient_code: blank(np.patient_code),
            full_name: np.full_name.trim(),
            phone: blank(np.phone),
            age_years: np.age_years.trim() ? Number(np.age_years) : null,
            sex: (np.sex || null) as PatientSex | null,
          },
        }
      : { patient_id: v.patientChoice }),
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
