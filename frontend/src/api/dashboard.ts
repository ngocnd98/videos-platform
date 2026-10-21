import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { AdminDashboard, CreatorDashboard } from './types'

export const dashboardKeys = {
  admin: ['dashboard', 'admin'] as const,
  creator: ['dashboard', 'creator'] as const,
}

export const useAdminDashboard = () =>
  useQuery({ queryKey: dashboardKeys.admin, queryFn: () => api<AdminDashboard>('/admin/dashboard') })

export const useCreatorDashboard = () =>
  useQuery({ queryKey: dashboardKeys.creator, queryFn: () => api<CreatorDashboard>('/creator/dashboard') })
