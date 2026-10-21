import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { CreatorAccount, CreatorAccountUpdate, PublicProfile } from './types'

export const profileKeys = {
  account: ['profile', 'account'] as const,
  public: ['profile', 'public'] as const,
}

export const useCreatorAccount = () =>
  useQuery({ queryKey: profileKeys.account, queryFn: () => api<CreatorAccount>('/creator/profile') })

export const usePublicProfile = (enabled = true) =>
  useQuery({ queryKey: profileKeys.public, queryFn: () => api<PublicProfile>('/creator/public-profile'), enabled })

export function useSaveCreatorAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatorAccountUpdate) => api<CreatorAccount>('/creator/profile', { method: 'PUT', json: body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
