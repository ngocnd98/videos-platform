import { useState, type FormEvent } from 'react'
import { CircleUserRound, ShieldCheck, UserPlus } from 'lucide-react'
import { useInviteAdmin, useSetUserStatus, useUsers } from '../../api/admin'
import type { AccountStatus, WorkspaceUser } from '../../api/types'
import { Badge, CardHeading, ErrorCard, TitleBlock } from '../../ui/common'
import { Modal } from '../../ui/Modal'
import { useToast } from '../../ui/Toast'

const ROLE_CARDS = [
  {
    role: 'ADMIN',
    name: 'Admin',
    description: 'Full access to workspace settings, users, content review, publishing, revenue, and analytics.',
    color: 'bg-violet-100 text-violet-700',
    icon: ShieldCheck,
  },
  {
    role: 'CREATOR',
    name: 'Creator',
    description: 'Upload and manage videos, view earnings, download statements, and maintain a public profile.',
    color: 'bg-indigo-100 text-indigo-700',
    icon: CircleUserRound,
  },
] as const

const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = { ACTIVE: 'Active', SUSPENDED: 'Suspended', INVITED: 'Invited' }

const STATUS_BADGE: Record<AccountStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  SUSPENDED: 'bg-slate-100 text-slate-600 border border-slate-200',
  INVITED: 'bg-amber-50 text-amber-700 border border-amber-200/60',
}

export function RolesPage() {
  const toast = useToast()
  const { data: users = [], isPending, error, refetch } = useUsers()
  const setStatus = useSetUserStatus()
  const [inviting, setInviting] = useState(false)

  const activeAdmins = users.filter(u => u.role === 'ADMIN' && u.status === 'ACTIVE').length

  const toggle = (user: WorkspaceUser) => {
    const next = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    if (next === 'SUSPENDED' && activeAdmins <= 1) return toast('The last active admin cannot be deactivated.', 'error')
    setStatus.mutate(
      { id: user.id, status: next },
      {
        onSuccess: u => toast(`${u.name} is now ${ACCOUNT_STATUS_LABEL[u.status].toLowerCase()}.`),
        onError: err => toast(err.message, 'error'),
      },
    )
  }

  return (
    <>
      <TitleBlock
        eyebrow="Workspace settings"
        title="Users & roles"
        description="Invite and deactivate admin accounts. Creators register themselves and verify their email."
        action={
          <button onClick={() => setInviting(true)} className="btn-primary inline-flex items-center gap-2 self-start rounded-lg px-4 py-2.5 text-xs font-semibold sm:self-auto">
            <UserPlus className="h-4 w-4" />
            Invite admin
          </button>
        }
      />

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        {ROLE_CARDS.map(({ role, name, description, color, icon: Icon }) => (
          <article key={role} className="card flex gap-4 p-5">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900">{name}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {users.filter(u => u.role === role).length} users
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{description}</p>
            </div>
          </article>
        ))}
      </div>

      {error ? (
        <ErrorCard message={error.message} onRetry={() => refetch()} />
      ) : (
        <section className="card overflow-hidden">
          <CardHeading
            title="Workspace users"
            subtitle="Only Admin and Creator roles are available right now."
            action={<span className="text-[10px] text-slate-500">{users.length} total</span>}
          />
          <div className="table-wrap">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">User ID</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isPending && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">Loading…</td>
                  </tr>
                )}
                {users.map(user => {
                  const isLastAdmin = user.role === 'ADMIN' && user.status === 'ACTIVE' && activeAdmins <= 1
                  return (
                    <tr key={user.id}>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">{user.name}</div>
                        <div className="mt-1 text-[10px] text-slate-500">{user.email}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">{user.userCode}</td>
                      <td className="px-4 py-3.5">
                        <Badge
                          text={user.role === 'ADMIN' ? 'Admin' : 'Creator'}
                          className={user.role === 'ADMIN' ? 'bg-violet-50 text-violet-700 border border-violet-200/60' : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge text={ACCOUNT_STATUS_LABEL[user.status]} className={STATUS_BADGE[user.status]} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {user.role === 'ADMIN' ? (
                          <button
                            onClick={() => toggle(user)}
                            disabled={isLastAdmin || setStatus.isPending}
                            title={isLastAdmin ? 'The last active admin cannot be deactivated' : undefined}
                            className="btn-secondary rounded-lg px-3 py-2 text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {user.status === 'ACTIVE' ? 'Deactivate' : user.status === 'INVITED' ? 'Activate' : 'Reactivate'}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">Managed in Creator management</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="mt-5">
        <div className="card flex gap-3 p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <div className="text-xs font-semibold text-slate-800">Last admin protection</div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">The final active admin account cannot be deactivated.</p>
          </div>
        </div>
      </div>

      {inviting && <InviteAdminModal onClose={() => setInviting(false)} />}
    </>
  )
}

function InviteAdminModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const invite = useInviteAdmin()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    invite.mutate(
      { name: name.trim(), email: email.trim().toLowerCase() },
      {
        onSuccess: u => {
          toast(`Admin invitation sent to ${u.email}.`)
          onClose()
        },
        onError: err => toast(err.message, 'error'),
      },
    )
  }

  return (
    <Modal title="Invite admin" subtitle="Send an invitation to an agency administrator." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <div>
          <label htmlFor="newUserName" className="mb-1.5 block text-xs font-semibold text-slate-700">Full name</label>
          <input id="newUserName" required maxLength={80} value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Enter the user's name" />
        </div>
        <div>
          <label htmlFor="newUserEmail" className="mb-1.5 block text-xs font-semibold text-slate-700">Email address</label>
          <input id="newUserEmail" type="email" required maxLength={120} value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="name@example.com" />
        </div>
        <p className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500">
          Invited admins receive an email link to activate their account. Creator accounts are self-registered.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary rounded-lg px-4 py-2 text-xs font-semibold">Cancel</button>
          <button type="submit" disabled={invite.isPending} className="btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-60">
            <UserPlus className="h-4 w-4" />
            Send invitation
          </button>
        </div>
      </form>
    </Modal>
  )
}
