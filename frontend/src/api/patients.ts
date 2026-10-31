import { api } from './client'
import type { Page, Patient, PatientInput, PatientListItem } from './types'

export interface PatientListParams {
  q?: string
  page?: number
  page_size?: number
}

export const patientsApi = {
  list: (params: PatientListParams, signal?: AbortSignal) =>
    api.get<Page<PatientListItem>>('/patients', { ...params }, signal),
  get: (id: string) => api.get<Patient>(`/patients/${id}`),
  update: (id: string, body: Partial<PatientInput>) => api.patch<Patient>(`/patients/${id}`, body),
  delete: (id: string) => api.delete<undefined>(`/patients/${id}`),
}
