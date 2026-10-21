import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { CreatorBalance, Payout, Platform, RevenueEntry, RevenuePage, Statement } from './types'

export const revenueKeys = {
  page: (period: string) => ['revenue', 'page', period] as const,
  balances: ['revenue', 'balances'] as const,
  payouts: ['revenue', 'payouts'] as const,
  statement: (scope: string, period: string) => ['revenue', 'statement', scope, period] as const,
}

export const useRevenue = (period: string) =>
  useQuery({ queryKey: revenueKeys.page(period), queryFn: () => api<RevenuePage>(`/admin/revenue${period ? `?period=${period}` : ''}`) })

export const useBalances = () => useQuery({ queryKey: revenueKeys.balances, queryFn: () => api<CreatorBalance[]>('/admin/payouts/balances') })

export const usePayouts = () => useQuery({ queryKey: revenueKeys.payouts, queryFn: () => api<Payout[]>('/admin/payouts') })

/** Admins pass a creator id; creators read their own statement. */
export const useStatement = (creatorId: number | 'me' | null, period: string) =>
  useQuery({
    queryKey: revenueKeys.statement(String(creatorId), period),
    queryFn: () =>
      api<Statement>(creatorId === 'me' ? `/creator/statement?period=${period}` : `/admin/creators/${creatorId}/statement?period=${period}`),
    enabled: creatorId !== null && !!period,
  })

function useInvalidateMoney() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['revenue'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['audit'] })
  }
}

export function useAddRevenue() {
  const onSuccess = useInvalidateMoney()
  return useMutation({
    mutationFn: (body: { videoCode: string; platform: Platform; period: string; gross: number }) =>
      api<RevenueEntry>('/admin/revenue', { method: 'POST', json: body }),
    onSuccess,
  })
}

export function useUpdateGross() {
  const onSuccess = useInvalidateMoney()
  return useMutation({
    mutationFn: ({ id, gross }: { id: number; gross: number }) => api<RevenueEntry>(`/admin/revenue/${id}`, { method: 'PATCH', json: { gross } }),
    onSuccess,
  })
}

export function useImportRevenue() {
  const onSuccess = useInvalidateMoney()
  return useMutation({
    mutationFn: ({ file, period }: { file: File; period: string }) => {
      const form = new FormData()
      form.append('file', file)
      return api<{ imported: number }>(`/admin/revenue/import?period=${period}`, { method: 'POST', body: form })
    },
    onSuccess,
  })
}

export function usePay() {
  const onSuccess = useInvalidateMoney()
  return useMutation({
    mutationFn: (body: { creatorId: number; externalRef: string; remarks?: string }) => api<Payout>('/admin/payouts', { method: 'POST', json: body }),
    onSuccess,
  })
}

export const currentPeriod = () => new Date().toISOString().slice(0, 7)

/** Dollar input → cents-safe number with at most 2 decimals, or null. */
export function parseDollars(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return Number(cleaned)
}
