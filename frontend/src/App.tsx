import { Navigate, Route, Routes } from 'react-router'
import { useAuth, type Mode } from './auth/AuthContext'
import { AppLayout } from './layout/AppLayout'
import { NAV_ITEMS } from './layout/nav'
import { Placeholder } from './pages/Placeholder'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { UploadPage } from './pages/upload/UploadPage'
import { ReviewPage } from './pages/review/ReviewPage'
import { PublishingPage } from './pages/publishing/PublishingPage'
import { RevenuePage } from './pages/revenue/RevenuePage'

const PAGES: Record<string, { eyebrow: string; title: string; description: string; step: string }> = {
  '/analytics': { eyebrow: 'Insights', title: 'Analytics', description: 'Revenue, views and creator payouts over time.', step: 'step 7' },
  '/profile': { eyebrow: 'Creator portal', title: 'My profile', description: 'Your public identity, payout details, and current agreement.', step: 'step 7' },
  '/roles': { eyebrow: 'Workspace settings', title: 'Staff & permissions', description: 'Manage access with clear, role-based permissions.', step: 'step 7' },
}

const SCREENS: Record<string, React.ReactNode> = {
  '/dashboard': <DashboardPage />,
  '/upload': <UploadPage />,
  '/review': <ReviewPage />,
  '/publishing': <PublishingPage />,
  '/revenue': <RevenuePage />,
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
        {NAV_ITEMS.map(item => (
          <Route
            key={item.path}
            path={item.path}
            element={
              <Guard modes={item.modes}>
                {SCREENS[item.path] ?? <Placeholder {...PAGES[item.path]} />}
              </Guard>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
