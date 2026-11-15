import { describe, expect, it } from 'vitest'

import type { PatientMatch, PrescriptionDetail } from '@/api/types'

import {
  amountDue,
  clinicalSchema,
  isUncertain,
  NEW_PATIENT,
  registerSchema,
  toClinicalValues,
  toRegisterInput,
  toRegisterValues,
  toSaveInput,
} from './form'

const draft: PrescriptionDetail = {
  id: 'rx-1',
  status: 'draft',
  patient: null,
  visit_date: '2026-10-08',
  chief_complaint: 'Pain in 36',
  diagnosis: null,
  procedures: ['RCT 36 - access opening', 'Dressing'],
  medications: [
    { name: 'Tab. Napa', dosage: '500 mg', frequency: '1+0+1', duration: null, instructions: null },
  ],
  advice: ['Warm saline gargle'],
  follow_up_date: '2026-10-15',
  notes: null,
  billed_minor: null,
  paid_minor: null,
  due_minor: null,
  verified: false,
  image_urls: ['/api/v1/prescriptions/rx-1/pages/1'],
  extracted: {
    patient: {
      patient_id: null,
      full_name: 'Rahima Begum',
      age_years: 34,
      sex: 'female',
      phone: '01712345678',
    },
    uncertain_fields: ['medications.0.frequency'],
  },
  extraction_error: null,
  reading: false,
  created_by: { id: 'u1', full_name: 'Dr. Rahim' },
  confirmed_by: null,
  confirmed_at: null,
  verified_by: null,
  verified_at: null,
  created_at: '2026-10-08T05:00:00Z',
  patient_matches: [],
}

const patient = {
  id: 'p1',
  patient_code: '48291736',
  full_name: 'Rahima Begum',
  phone: '+8801712345678',
  age_years: null,
  sex: null,
  created_at: '',
}

describe('filing at payment', () => {
  it('pre-fills a new patient from what was read when nothing matches', () => {
    const values = toRegisterValues(draft)
    expect(values.patientChoice).toBe(NEW_PATIENT)
    expect(values.newPatient).toEqual({
      full_name: 'Rahima Begum',
      phone: '01712345678',
      age_years: '34',
      sex: 'female',
    })
    expect(values.payment).toEqual({ billed: '', paid: '' })
  })

  it('pre-selects an existing patient only on a strong match', () => {
    const match = (m: Omit<PatientMatch, 'patient'>) => ({ ...draft, patient_matches: [{ patient, ...m }] })
    // Same phone but a different name: probably a family member.
    expect(toRegisterValues(match({ reasons: ['same_phone'], strong: false })).patientChoice).toBe(
      NEW_PATIENT,
    )
    expect(
      toRegisterValues(match({ reasons: ['same_phone', 'similar_name'], strong: true })).patientChoice,
    ).toBe('p1')
  })

  it('converts to the register payload with amounts in paisa', () => {
    const values = toRegisterValues(draft)
    values.payment = { billed: '1,500', paid: '1000.50' }
    expect(toRegisterInput(values)).toEqual({
      new_patient: { full_name: 'Rahima Begum', phone: '01712345678', age_years: 34, sex: 'female' },
      billed_minor: 150_000,
      paid_minor: 100_050,
    })

    values.patientChoice = 'p1'
    expect(toRegisterInput(values)).toMatchObject({ patient_id: 'p1' })
    expect(toRegisterInput(values).new_patient).toBeUndefined()
  })

  it('works out the due amount and rejects paying more than the bill', () => {
    expect(amountDue({ billed: '2000', paid: '500' })).toBe(150_000)
    expect(amountDue({ billed: '', paid: '' })).toBeNull()

    const values = { ...toRegisterValues(draft), payment: { billed: '500', paid: '800' } }
    const result = registerSchema.safeParse(values)
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['payment', 'paid'])
  })
})

describe("dentist's check", () => {
  it('converts the form back into the save payload', () => {
    const values = toClinicalValues(draft)
    expect(values.procedures).toBe('RCT 36 - access opening\nDressing')
    values.procedures = ' RCT 36 \n\n Dressing '
    const input = toSaveInput(values)

    expect(input.procedures).toEqual(['RCT 36', 'Dressing'])
    expect(input.medications[0]).toEqual({
      name: 'Tab. Napa',
      dosage: '500 mg',
      frequency: '1+0+1',
      duration: null,
      instructions: null,
    })
    expect(input.diagnosis).toBeNull()
  })

  it('rejects a follow-up before the visit', () => {
    const values = { ...toClinicalValues(draft), follow_up_date: '2026-10-01' }
    const result = clinicalSchema.safeParse(values)
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['follow_up_date'])
  })

  it('flags uncertain fields and their parents', () => {
    const uncertain = ['medications.0.frequency', 'visit_date']
    expect(isUncertain(uncertain, 'medications.0.frequency')).toBe(true)
    expect(isUncertain(uncertain, 'medications.0')).toBe(true)
    expect(isUncertain(uncertain, 'medications.1.frequency')).toBe(false)
    expect(isUncertain(uncertain, 'visit_date')).toBe(true)
  })
})
