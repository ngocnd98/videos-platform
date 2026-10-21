import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { api } from './client'
import type {
  AccountStatus,
  AdminCategory,
  AdminCreator,
  Analytics,
  CreatorDetail,
  Settings,
  SettingsUpdate,
  StorageUsage,
  WorkspaceUser,
} from './types'

export const adminKeys = {
  settings: ['settings'] as const,
  storage: ['admin', 'storage'] as const,
  categories: ['categories', 'admin'] as const,
  users: ['admin', 'users'] as const,
  creators: ['admin', 'creators'] as const,
  creator: (id: number) => ['admin', 'creators', id] as const,
  analytics: (months: number) => ['admin', 'analytics', months] as const,
  cms: ['admin', 'cms'] as const,
}

/** Invalidates the given keys plus the audit log, which every admin change writes to. */
function useInvalidate(...keys: QueryKey[]) {
  const queryClient = useQueryClient()
  return () => {
    for (const key of [...keys, ['audit']]) queryClient.invalidateQueries({ queryKey: key })
  }
}

// --- Settings ----------------------------------------------------------------------------

/** Shared by both workspaces: upload limit and enabled platforms drive creator and admin forms. */
export const useSettings = () => useQuery({ queryKey: adminKeys.settings, queryFn: () => api<Settings>('/settings') })

export const useStorage = () => useQuery({ queryKey: adminKeys.storage, queryFn: () => api<StorageUsage>('/admin/storage') })

export function useSaveSettings() {
  const onSuccess = useInvalidate(adminKeys.settings, ['dashboard'])
  return useMutation({ mutationFn: (body: SettingsUpdate) => api<Settings>('/admin/settings', { method: 'PUT', json: body }), onSuccess })
}

// --- Categories --------------------------------------------------------------------------

export const useAdminCategories = () =>
  useQuery({ queryKey: adminKeys.categories, queryFn: () => api<AdminCategory[]>('/admin/categories') })

// ['categories'] also covers useCategories() in api/videos.ts.
export function useCreateCategory() {
  const onSuccess = useInvalidate(['categories'])
  return useMutation({ mutationFn: (name: string) => api<AdminCategory>('/admin/categories', { method: 'POST', json: { name } }), onSuccess })
}

export function useUpdateCategory() {
  const onSuccess = useInvalidate(['categories'])
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; name?: string; visible?: boolean }) =>
      api<AdminCategory>(`/admin/categories/${id}`, { method: 'PATCH', json: body }),
    onSuccess,
  })
}

// --- Users & roles -----------------------------------------------------------------------

export const useUsers = () => useQuery({ queryKey: adminKeys.users, queryFn: () => api<WorkspaceUser[]>('/admin/users') })

export function useInviteAdmin() {
  const onSuccess = useInvalidate(adminKeys.users)
  return useMutation({
    mutationFn: (body: { name: string; email: string }) => api<WorkspaceUser>('/admin/users', { method: 'POST', json: body }),
    onSuccess,
  })
}

export function useSetUserStatus() {
  const onSuccess = useInvalidate(adminKeys.users)
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: Exclude<AccountStatus, 'INVITED'> }) =>
      api<WorkspaceUser>(`/admin/users/${id}/status`, { method: 'PATCH', json: { status } }),
    onSuccess,
  })
}

// --- Creators ----------------------------------------------------------------------------

export const useCreators = () => useQuery({ queryKey: adminKeys.creators, queryFn: () => api<AdminCreator[]>('/admin/creators') })

export const useCreatorDetail = (creatorId: number | null) =>
  useQuery({
    queryKey: adminKeys.creator(creatorId ?? 0),
    queryFn: () => api<CreatorDetail>(`/admin/creators/${creatorId}`),
    enabled: creatorId !== null,
  })

export function useUpdateCreator() {
  const onSuccess = useInvalidate(adminKeys.creators, adminKeys.users, ['dashboard'])
  return useMutation({
    mutationFn: ({ creatorId, ...body }: { creatorId: number; sharePct?: number; status?: 'ACTIVE' | 'SUSPENDED'; publicHidden?: boolean }) =>
      api<AdminCreator>(`/admin/creators/${creatorId}`, { method: 'PATCH', json: body }),
    onSuccess,
  })
}

// --- CMS ---------------------------------------------------------------------------------

export interface CmsPage {
  slug: string
  title: string
  content: string
  updatedAt: string
}

export const useCmsPages = () => useQuery({ queryKey: adminKeys.cms, queryFn: () => api<CmsPage[]>('/admin/cms') })

export function useSaveCmsPage() {
  const onSuccess = useInvalidate(adminKeys.cms)
  return useMutation({
    mutationFn: ({ slug, title, content }: { slug: string; title: string; content: string }) =>
      api<CmsPage>(`/admin/cms/${encodeURIComponent(slug)}`, { method: 'PUT', json: { title, content } }),
    onSuccess,
  })
}

// --- Analytics ---------------------------------------------------------------------------

export const useAnalytics = (months: 6 | 12) =>
  useQuery({ queryKey: adminKeys.analytics(months), queryFn: () => api<Analytics>(`/admin/analytics?months=${months}`) })
