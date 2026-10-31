import { api } from './client'
import type {
  Page,
  PrescriptionDetail,
  PrescriptionSaveInput,
  PrescriptionStatus,
  PrescriptionSummary,
} from './types'

export interface PrescriptionListParams {
  status?: PrescriptionStatus
  patient_id?: string
  page?: number
  page_size?: number
}

export const prescriptionsApi = {
  /** Upload the pages of one prescription, in order. */
  scan: (pages: Blob[]) => {
    const form = new FormData()
    pages.forEach((page, i) => form.append('files', page, `page-${i + 1}.jpg`))
    return api.post<PrescriptionDetail>('/prescriptions/scan', form)
  },
  list: (params: PrescriptionListParams) =>
    api.get<Page<PrescriptionSummary>>('/prescriptions', { ...params }),
  get: (id: string) => api.get<PrescriptionDetail>(`/prescriptions/${id}`),
  extractAgain: (id: string) => api.post<PrescriptionDetail>(`/prescriptions/${id}/extract`),
  save: (id: string, body: PrescriptionSaveInput) =>
    api.put<PrescriptionDetail>(`/prescriptions/${id}`, body),
  delete: (id: string) => api.delete<undefined>(`/prescriptions/${id}`),
  /** A filed prescription as a PDF for the patient. */
  pdf: (id: string) => api.blob(`/prescriptions/${id}/pdf`),
}
