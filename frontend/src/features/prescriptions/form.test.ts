import { describe, expect, it } from 'vitest'

import type { PrescriptionDetail } from '@/api/types'

import { isUncertain, NEW_PATIENT, reviewSchema, toFormValues, toSaveInput } from './form'

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
  image_urls: ['/api/v1/prescriptions/rx-1/pages/1'],
  extracted: {
    patient: {
      patient_id: 'RR-1042',
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
  created_at: '2026-10-08T05:00:00Z',
  patient_matches: [],
}

describe('review form', () => {
  it('pre-fills a new patient from what was read when nothing matches', () => {
    const values = toFormValues(draft)
    expect(values.patientChoice).toBe(NEW_PATIENT)
    expect(values.newPatient).toMatchObject({ patient_code: 'RR-1042', age_years: '34', sex: 'female' })
    expect(values.procedures).toBe('RCT 36 - access opening\nDressing')
  })

  it('pre-selects an existing patient only on a strong match', () => {
    const patient = {
      id: 'p1',
      patient_code: 'RR-1042',
      full_name: 'Rahima Begum',
      phone: null,
      age_years: null,
      sex: null,
      created_at: '',
    }
    const byName = { ...draft, patient_matches: [{ patient, reasons: ['Similar name'] }] }
    expect(toFormValues(byName).patientChoice).toBe(NEW_PATIENT)

    const byId = { ...draft, patient_matches: [{ patient, reasons: ['Same patient ID'] }] }
    expect(toFormValues(byId).patientChoice).toBe('p1')
  })

  it('converts the form back into the save payload', () => {
    const values = toFormValues(draft)
    values.procedures = ' RCT 36 \n\n Dressing '
    values.newPatient.patient_code = '  '
    const input = toSaveInput(values)

    expect(input.patient_id).toBeUndefined()
    expect(input.new_patient).toEqual({
      patient_code: null,
      full_name: 'Rahima Begum',
      phone: '01712345678',
      age_years: 34,
      sex: 'female',
    })
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
    const values = { ...toFormValues(draft), follow_up_date: '2026-10-01' }
    const result = reviewSchema.safeParse(values)
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
