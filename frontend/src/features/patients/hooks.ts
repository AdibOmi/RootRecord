import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { patientsApi, type PatientListParams } from '@/api/patients'
import type { PatientInput } from '@/api/types'

// Not imported from features/prescriptions/hooks, which imports this module.
const PRESCRIPTIONS_KEY = ['prescriptions'] as const

export const PATIENTS_KEY = ['patients'] as const

export function usePatients(params: PatientListParams, enabled = true) {
  return useQuery({
    queryKey: [...PATIENTS_KEY, 'list', params],
    queryFn: ({ signal }) => patientsApi.list(params, signal),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: [...PATIENTS_KEY, 'detail', id],
    queryFn: () => patientsApi.get(id),
  })
}

export function useUpdatePatient(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<PatientInput>) => patientsApi.update(id, body),
    onSuccess: (patient) => {
      qc.setQueryData([...PATIENTS_KEY, 'detail', id], patient)
      void qc.invalidateQueries({ queryKey: [...PATIENTS_KEY, 'list'] })
    },
  })
}

/** Delete a patient with all their prescriptions. */
export function useDeletePatient(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => patientsApi.delete(id),
    onSuccess: () => {
      qc.removeQueries({ queryKey: [...PATIENTS_KEY, 'detail', id] })
      void qc.invalidateQueries({ queryKey: [...PATIENTS_KEY, 'list'] })
      void qc.invalidateQueries({ queryKey: PRESCRIPTIONS_KEY })
    },
  })
}
