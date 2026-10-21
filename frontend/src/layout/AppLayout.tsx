import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { Bell, ChevronDown, CircleHelp, Clapperboard, Menu, Moon, Sparkles, Sun } from 'lucide-react'
import { useReviewQueue } from '../api/review'
import { DEMO_ACCOUNTS, useAuth, type Mode } from '../auth/AuthContext'
import { useToast } from '../ui/Toast'
import { NAV_ITEMS } from './nav'
import { RoleSwitcherModal } from './RoleSwitcherModal'
import { useTheme } from './useTheme'

const STAFF_ROLE_LABEL: Record<string, string> = { SUPERADMIN: 'Superadmin', MODERATOR: 'Moderator', FINANCE: 'Finance' }

const initials = (name: string) =>
  name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()

export function AppLayout() {
  const { user, mode, switchMode, signIn } = useAuth()
  const { theme, toggle } = useTheme()
  const toast = useToast()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const { data: reviewQueue } = useReviewQueue(mode === 'admin')

  const changeMode = async (next: Mode) => {
    if (next === mode && user?.email === DEMO_ACCOUNTS[next]) return
    try {
      await switchMode(next)
      navigate('/dashboard')
      toast(next === 'admin' ? 'Switched to Admin workspace.' : 'Switched to Creator workspace.')
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : 'Could not switch workspace. Is the server running?', 'error')
    }
  }

  const signInAs = async (email: string, password: string) => {
    try {
      await signIn(email, password)
      navigate('/dashboard')
      toast('Signed in successfully.')
      return true
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Sign-in failed.', 'error')
      return false
    }
  }

  const modeButton = (value: Mode, label: string) => (
    <button
      onClick={() => changeMode(value)}
      className={`mode-button rounded-md px-3 py-1.5 text-xs font-semibold transition ${mode === value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
    >
      {label}
    </button>
  )

  const name = user?.displayName ?? ''
  const profileName = mode === 'admin' ? 'Admin workspace' : name
  const profileRole = mode === 'admin' ? `Admin · ${STAFF_ROLE_LABEL[user?.staffRole ?? ''] ?? 'Staff'}` : 'Creator'

  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setMenuOpen(o => !o)} className="mr-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden" aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
            <NavLink to="/dashboard" className="flex items-center gap-2.5" aria-label="PulseMedia Hub home">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
                <Clapperboard className="h-5 w-5" />
              </span>
              <span className="hidden text-[15px] font-semibold tracking-tight text-slate-900 sm:inline">
                PulseMedia <span className="text-indigo-600">Hub</span>
              </span>
            </NavLink>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center rounded-lg border border-slate-200 bg-slate-50 p-1 sm:flex" aria-label="Choose workspace mode">
              {modeButton('admin', 'Admin')}
              {modeButton('creator', 'Creator')}
            </div>
            <button onClick={() => setRoleMenuOpen(true)} className="hidden items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-left hover:bg-slate-50 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">{initials(name)}</span>
              <span>
                <span className="block text-xs font-semibold text-slate-800">{profileName}</span>
                <span className="block text-[10px] text-slate-500">{profileRole}</span>
              </span>
              <ChevronDown className="ml-1 h-3.5 w-3.5 text-slate-400" />
            </button>
            <button onClick={() => changeMode(mode === 'admin' ? 'creator' : 'admin')} className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 sm:hidden">
              {mode === 'admin' ? 'Admin' : 'Creator'}
            </button>
            <button
              onClick={toggle}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications" onClick={() => toast('You’re all caught up.')}>
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-indigo-500" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">{initials(name)}</div>
          </div>
        </div>
      </header>

      {menuOpen && <div className="mobile-shade md:hidden" onClick={() => setMenuOpen(false)} />}
      <aside id="sidebar" className={`sidebar fixed bottom-0 left-0 top-16 z-30 flex w-[248px] flex-col border-r border-slate-200/80 bg-white px-3 py-5 md:translate-x-0 ${menuOpen ? 'open' : ''}`}>
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.12em] text-slate-400">Workspace</div>
        <nav className="space-y-1">
          {NAV_ITEMS.filter(item => item.mode === mode).map(({ path, label, icon: Icon }) => (
            <NavLink
              key={`${mode}${path}`}
              to={path}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `nav-link flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-slate-600 ${isActive ? 'active' : ''}`}
            >
              <Icon className="h-[17px] w-[17px]" />
              {label}
              {path === '/review' && !!reviewQueue?.length && (
                <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{reviewQueue.length}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-indigo-900">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Creator growth
            </div>
            <p className="text-[11px] leading-relaxed text-indigo-800/75">Your content is reaching more viewers this month.</p>
            <NavLink to={mode === 'admin' ? '/analytics' : '/payouts'} className="mt-3 inline-block text-[11px] font-semibold text-indigo-700 hover:text-indigo-900">
              {mode === 'admin' ? 'View analytics' : 'View earnings'} <span aria-hidden="true">→</span>
            </NavLink>
          </div>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-slate-500 hover:bg-slate-100">
            <CircleHelp className="h-[17px] w-[17px]" />
            Help &amp; support
          </button>
          <div className="mt-3 border-t border-slate-100 px-3 pt-4 text-[10px] text-slate-400">
            PulseMedia Hub <span className="float-right">v1.0.0</span>
          </div>
        </div>
      </aside>

      <main className="min-h-screen pt-16 md:pl-[248px]">
        <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      {roleMenuOpen && <RoleSwitcherModal onSwitch={changeMode} onSignIn={signInAs} onClose={() => setRoleMenuOpen(false)} />}
    </div>
  )
}
