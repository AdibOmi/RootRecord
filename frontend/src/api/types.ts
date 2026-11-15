/** Types mirroring backend Pydantic schemas. */

export type UserRole = 'admin' | 'dentist' | 'receptionist'

export interface User {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: UserRole
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface Message {
  message: string
}

export type PatientSex = 'male' | 'female' | 'other'

export interface PatientRef {
  id: string
  /** 8 digits, shown as 1234-5678 (see formatPatientCode). */
  patient_code: string
  full_name: string
}

export interface Patient extends PatientRef {
  phone: string | null
  age_years: number | null
  sex: PatientSex | null
  created_at: string
}

export interface PatientListItem extends Patient {
  visit_count: number
  /** YYYY-MM-DD */
  last_visit_date: string | null
  /** YYYY-MM-DD */
  next_follow_up_date: string | null
}

/** A new patient; their ID is always generated. */
export interface PatientInput {
  full_name: string
  phone?: string | null
  age_years?: number | null
  sex?: PatientSex | null
}

export type MatchReason = 'same_id' | 'same_phone' | 'similar_name'

export interface PatientMatch {
  patient: Patient
  reasons: MatchReason[]
  /** Same ID, or same phone and a similar name (families often share a phone). */
  strong: boolean
}

export type PrescriptionStatus = 'draft' | 'confirmed'

export interface Medication {
  name: string
  dosage: string | null
  frequency: string | null
  duration: string | null
  instructions: string | null
}

/** Raw fields read from the photo (see backend extraction_service.EXTRACTION_SCHEMA). */
export interface ExtractedPrescription {
  patient: {
    patient_id: string | null
    full_name: string | null
    age_years: number | null
    sex: PatientSex | null
    phone: string | null
  }
  uncertain_fields: string[]
}

export interface PrescriptionSummary {
  id: string
  status: PrescriptionStatus
  patient: PatientRef | null
  extracted_patient_name: string | null
  /** YYYY-MM-DD */
  visit_date: string | null
  chief_complaint: string | null
  diagnosis: string | null
  procedures: string[]
  medications: Medication[]
  advice: string[]
  /** YYYY-MM-DD */
  follow_up_date: string | null
  notes: string | null
  /** Minor units (1/100 BDT). */
  billed_minor: number | null
  paid_minor: number | null
  due_minor: number | null
  /** A dentist has checked what was read. */
  verified: boolean
  has_extraction_error: boolean
  /** The photo is still being read; fields fill in when it finishes. */
  reading: boolean
  created_at: string
}

export interface StaffRef {
  id: string
  full_name: string
}

export interface PrescriptionDetail extends Omit<PrescriptionSummary, 'extracted_patient_name' | 'has_extraction_error'> {
  /** One URL per page, in order. */
  image_urls: string[]
  extracted: ExtractedPrescription | null
  extraction_error: string | null
  created_by: StaffRef
  /** Who filed it under the patient (usually the assistant at payment). */
  confirmed_by: StaffRef | null
  confirmed_at: string | null
  /** The dentist who checked what was read. */
  verified_by: StaffRef | null
  verified_at: string | null
  patient_matches: PatientMatch[]
}

export interface PaymentInput {
  billed_minor: number | null
  paid_minor: number | null
}

/** File a scan under an existing or new patient, with the visit's bill. */
export interface PrescriptionRegisterInput extends PaymentInput {
  patient_id?: string
  new_patient?: PatientInput
}

/** The dentist's checked version of what was read. */
export interface PrescriptionSaveInput {
  visit_date: string
  chief_complaint: string | null
  diagnosis: string | null
  procedures: string[]
  medications: Medication[]
  advice: string[]
  follow_up_date: string | null
  notes: string | null
}
