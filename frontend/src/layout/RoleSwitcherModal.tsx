import { useState, type FormEvent } from 'react'
import { CircleCheck } from 'lucide-react'
import { useAuth, type Mode } from '../auth/AuthContext'
import { Modal } from '../ui/Modal'

const OPTIONS: { mode: Mode; role: string; description: string }[] = [
  { mode: 'admin', role: 'Admin', description: 'Manage users, review content, publishing, and revenue.' },
  { mode: 'creator', role: 'Creator', description: 'Upload videos and manage your creator profile and earnings.' },
]

interface Props {
  onSwitch: (mode: Mode) => void
  onSignIn: (email: string, password: string) => Promise<boolean>
  onClose: () => void
}

/** Header profile menu: switch between the seeded Admin / Creator accounts, or sign in as another demo account. */
export function RoleSwitcherModal({ onSwitch, onSignIn, onClose }: Props) {
  const { mode, user } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('demo1234')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const ok = await onSignIn(email.trim(), password)
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <Modal title="Switch workspace role" subtitle="Preview the workspace as Admin or Creator." onClose={onClose}>
      <div className="divide-y divide-slate-100">
        {OPTIONS.map(o => (
          <button
            key={o.mode}
            onClick={() => {
              onClose()
              onSwitch(o.mode)
            }}
            className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50"
          >
            <span>
              <span className="block text-xs font-semibold text-slate-800">{o.role}</span>
              <span className="mt-1 block text-[10px] text-slate-500">{o.description}</span>
            </span>
            {mode === o.mode && <CircleCheck className="h-4 w-4 text-indigo-600" />}
          </button>
        ))}
        <div className="p-4">
          <div className="mb-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            Signed in as <strong className="text-slate-900">{user?.displayName} · {mode === 'admin' ? 'Admin' : 'Creator'}</strong>
            <span className="mt-0.5 block text-[10px] text-slate-500">{user?.email}</span>
          </div>
          {showLogin ? (
            <form onSubmit={submit} className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Email address
                <input type="email" required autoFocus className="input mt-1.5" placeholder="maya@pulsemedia.demo" value={email} onChange={e => setEmail(e.target.value)} />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Password
                <input type="password" required className="input mt-1.5" value={password} onChange={e => setPassword(e.target.value)} />
              </label>
              <p className="text-[10px] text-slate-500">Demo accounts: maya@ / jordan@ (creators), ops@ (admin) · password demo1234.</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowLogin(false)} className="btn-secondary rounded-lg px-4 py-2 text-xs font-semibold">Back</button>
                <button type="submit" disabled={busy} className="btn-primary rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-60">Sign in</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowLogin(true)} className="btn-secondary w-full rounded-lg px-3 py-2.5 text-xs font-semibold">
              Sign in with another account
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
