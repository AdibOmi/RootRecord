import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { prescriptionsApi, type PrescriptionListParams } from '@/api/prescriptions'
import type { PrescriptionDetail, PrescriptionSaveInput } from '@/api/types'
import { PATIENTS_KEY } from '@/features/patients/hooks'

export const PRESCRIPTIONS_KEY = ['prescriptions'] as const

/** Reading takes a while, so poll until it is done. */
const READING_POLL_MS = 2000

export function usePrescriptions(params: PrescriptionListParams) {
  return useQuery({
    queryKey: [...PRESCRIPTIONS_KEY, 'list', params],
    queryFn: () => prescriptionsApi.list(params),
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      query.state.data?.items.some((p) => p.reading) ? READING_POLL_MS : false,
  })
}

export function usePrescription(id: string) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: [...PRESCRIPTIONS_KEY, 'detail', id],
    queryFn: async () => {
      const previous = qc.getQueryData<PrescriptionDetail>([...PRESCRIPTIONS_KEY, 'detail', id])
      const detail = await prescriptionsApi.get(id)
      // Reading just finished: the list's badges and fields are out of date.
      if (previous?.reading && !detail.reading) {
        void qc.invalidateQueries({ queryKey: [...PRESCRIPTIONS_KEY, 'list'] })
      }
      return detail
    },
    refetchInterval: (query) => (query.state.data?.reading ? READING_POLL_MS : false),
  })
}

function useStoreDetail() {
  const qc = useQueryClient()
  return (detail: PrescriptionDetail) => {
    qc.setQueryData([...PRESCRIPTIONS_KEY, 'detail', detail.id], detail)
    void qc.invalidateQueries({ queryKey: [...PRESCRIPTIONS_KEY, 'list'] })
  }
}

export function useScanPrescription() {
  const store = useStoreDetail()
  return useMutation({
    mutationFn: (pages: Blob[]) => prescriptionsApi.scan(pages),
    onSuccess: store,
  })
}

export function useExtractAgain(id: string) {
  const store = useStoreDetail()
  return useMutation({
    mutationFn: () => prescriptionsApi.extractAgain(id),
    onSuccess: store,
  })
}

export function useSavePrescription(id: string) {
  const store = useStoreDetail()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PrescriptionSaveInput) => prescriptionsApi.save(id, body),
    onSuccess: (detail) => {
      store(detail)
      void qc.invalidateQueries({ queryKey: PATIENTS_KEY })
    },
  })
}

export function useDeletePrescription(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => prescriptionsApi.delete(id),
    onSuccess: () => {
      qc.removeQueries({ queryKey: [...PRESCRIPTIONS_KEY, 'detail', id] })
      void qc.invalidateQueries({ queryKey: [...PRESCRIPTIONS_KEY, 'list'] })
      void qc.invalidateQueries({ queryKey: PATIENTS_KEY })
    },
  })
}
