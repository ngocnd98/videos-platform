import { useAuth } from '../../auth/AuthContext'
import { AdminDashboardPage } from './AdminDashboardPage'
import { CreatorDashboardPage } from './CreatorDashboardPage'

export function DashboardPage() {
  const { mode } = useAuth()
  return mode === 'creator' ? <CreatorDashboardPage /> : <AdminDashboardPage />
}
