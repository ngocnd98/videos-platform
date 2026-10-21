import { Navigate, Route, Routes } from 'react-router'
import { useAuth, type Mode } from './auth/AuthContext'
import { AppLayout } from './layout/AppLayout'
import { PATH_MODES } from './layout/nav'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { UploadPage } from './pages/upload/UploadPage'
import { ReviewPage } from './pages/review/ReviewPage'
import { PublishingPage } from './pages/publishing/PublishingPage'
import { RevenuePage } from './pages/revenue/RevenuePage'
import { AnalyticsPage } from './pages/analytics/AnalyticsPage'
import { ProfilePage } from './pages/profile/ProfilePage'
import { PayoutsPage } from './pages/payouts/PayoutsPage'
import { RolesPage } from './pages/roles/RolesPage'
import { CreatorsPage } from './pages/creators/CreatorsPage'
import { CategoriesPage } from './pages/categories/CategoriesPage'
import { CmsPage } from './pages/cms/CmsPage'
import { SettingsPage } from './pages/settings/SettingsPage'

const SCREENS: Record<string, React.ReactNode> = {
  '/dashboard': <DashboardPage />,
  '/upload': <UploadPage />,
  '/review': <ReviewPage />,
  '/publishing': <PublishingPage />,
  '/revenue': <RevenuePage />,
  '/analytics': <AnalyticsPage />,
  '/profile': <ProfilePage />,
  '/payouts': <PayoutsPage />,
  '/roles': <RolesPage />,
  '/creators': <CreatorsPage />,
  '/categories': <CategoriesPage />,
  '/cms': <CmsPage />,
  '/settings': <SettingsPage />,
}

function Guard({ modes, children }: { modes: Mode[]; children: React.ReactNode }) {
  const { mode } = useAuth()
  return modes.includes(mode) ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  const { loading, user } = useAuth()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading workspace…</div>
  }
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-sm text-slate-500">
        Can’t reach the PulseMedia Hub server. If the demo was idle it may be waking up, so try again in a minute.
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        {Object.entries(PATH_MODES).map(([path, modes]) => (
          <Route key={path} path={path} element={<Guard modes={modes}>{SCREENS[path]}</Guard>} />
        ))}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
