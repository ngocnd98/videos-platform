import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { AuditEntry, ReviewDetail, ReviewQueueItem } from './types'

export const reviewKeys = {
  queue: ['reviews', 'queue'] as const,
  detail: (code: string) => ['reviews', 'detail', code] as const,
  reasons: ['reviews', 'reasons'] as const,
  audit: ['audit'] as const,
}

export const useReviewQueue = (enabled = true) =>
  useQuery({ queryKey: reviewKeys.queue, queryFn: () => api<ReviewQueueItem[]>('/admin/reviews'), enabled })

// Presigned URLs expire after 15 minutes, so the detail is refetched every time the preview opens.
export const useReviewDetail = (code: string | null) =>
  useQuery({
    queryKey: reviewKeys.detail(code ?? ''),
    queryFn: () => api<ReviewDetail>(`/admin/reviews/${encodeURIComponent(code!)}`),
    enabled: !!code,
    staleTime: 0,
    gcTime: 0,
  })

export const useRejectionReasons = () =>
  useQuery({ queryKey: reviewKeys.reasons, queryFn: () => api<string[]>('/admin/reviews/reasons'), staleTime: Infinity })

export const useAuditLog = (enabled: boolean) =>
  useQuery({ queryKey: reviewKeys.audit, queryFn: () => api<AuditEntry[]>('/admin/audit?limit=50'), enabled })

function useInvalidateAfterDecision() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['reviews'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: reviewKeys.audit })
  }
}

export function useApprove() {
  const invalidate = useInvalidateAfterDecision()
  return useMutation({
    mutationFn: (code: string) => api<void>(`/admin/videos/${encodeURIComponent(code)}/approve`, { method: 'POST' }),
    onSettled: invalidate,
  })
}

export function useReject() {
  const invalidate = useInvalidateAfterDecision()
  return useMutation({
    mutationFn: ({ code, reason, note }: { code: string; reason: string; note?: string }) =>
      api<void>(`/admin/videos/${encodeURIComponent(code)}/reject`, { method: 'POST', json: { reason, note } }),
    onSettled: invalidate,
  })
}

/** Corrects title / category / tags while the video is still in review. */
export function useUpdateReviewInfo() {
  const invalidate = useInvalidateAfterDecision()
  return useMutation({
    mutationFn: ({ code, ...body }: { code: string; title: string; categoryId: number; tags?: string }) =>
      api<ReviewDetail>(`/admin/reviews/${encodeURIComponent(code)}`, { method: 'PATCH', json: body }),
    onSuccess: invalidate,
  })
}
