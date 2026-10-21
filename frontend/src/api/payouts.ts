import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { Payout, PayoutPreview } from './types'

export const payoutKeys = {
  admin: ['payouts', 'admin'] as const,
  mine: ['payouts', 'mine'] as const,
  preview: (creatorId: number, period: string) => ['payouts', 'preview', creatorId, period] as const,
}

export const useAdminPayouts = () => useQuery({ queryKey: payoutKeys.admin, queryFn: () => api<Payout[]>('/admin/payouts') })

export const useMyPayouts = () => useQuery({ queryKey: payoutKeys.mine, queryFn: () => api<Payout[]>('/creator/payouts') })

export const usePayoutPreview = (creatorId: number | null, period: string) =>
  useQuery({
    queryKey: payoutKeys.preview(creatorId ?? 0, period),
    queryFn: () => api<PayoutPreview>(`/admin/payouts/preview?creatorId=${creatorId}&period=${period}`),
    enabled: creatorId !== null && /^\d{4}-(0[1-9]|1[0-2])$/.test(period),
    staleTime: 0,
  })

function useInvalidatePayouts() {
  const queryClient = useQueryClient()
  return () => {
    for (const key of [['payouts'], ['revenue'], ['dashboard'], ['audit'], ['admin', 'creators']]) {
      queryClient.invalidateQueries({ queryKey: key })
    }
  }
}

export function useCreatePayout() {
  const onSuccess = useInvalidatePayouts()
  return useMutation({
    mutationFn: (body: { creatorId: number; period: string }) => api<Payout>('/admin/payouts', { method: 'POST', json: body }),
    onSuccess,
  })
}

export function useMarkPaid() {
  const onSuccess = useInvalidatePayouts()
  return useMutation({
    mutationFn: ({ id, externalRef, remarks }: { id: number; externalRef: string; remarks?: string }) =>
      api<Payout>(`/admin/payouts/${id}/paid`, { method: 'POST', json: { externalRef, remarks } }),
    onSuccess,
  })
}

export function useCancelPayout() {
  const onSuccess = useInvalidatePayouts()
  return useMutation({ mutationFn: (id: number) => api<Payout>(`/admin/payouts/${id}/cancel`, { method: 'POST' }), onSuccess })
}
