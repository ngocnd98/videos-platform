import { useEffect } from 'react'
import { Clock3, X } from 'lucide-react'
import { useAuditLog } from '../../api/review'
import { Badge } from '../../ui/common'

const DOT: Record<string, string> = { Rejected: 'bg-rose-500', Approved: 'bg-emerald-500' }
const BADGE_AS: Record<string, string> = { Rejected: 'Rejected', Approved: 'Approved', 'In Review': 'In Review' }

export function AuditDrawer({ onClose }: { onClose: () => void }) {
  const { data = [], isPending, error } = useAuditLog(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="drawer-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" aria-label="Audit log">
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Audit log</h2>
              <p className="mt-1 text-xs text-slate-500">Timestamped history of content and administrative decisions.</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close audit log">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="p-5">
          {isPending && <p className="text-xs text-slate-500">Loading…</p>}
          {error && <p className="text-xs text-rose-600">{error.message}</p>}
          {!isPending && !error && data.length === 0 && <p className="text-xs text-slate-500">No decisions recorded yet.</p>}
          <div className="relative space-y-0 before:absolute before:bottom-3 before:left-[7px] before:top-2 before:w-px before:bg-slate-200">
            {data.map(entry => (
              <div key={entry.id} className="relative pb-6 pl-7 last:pb-0">
                <span className={`absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-[3px] border-white ${DOT[entry.action] ?? 'bg-indigo-500'} shadow-[0_0_0_1px_#e2e8f0]`} />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800">{entry.title ?? entry.entityId}</span>
                  <Badge text={entry.action} className={BADGE_AS[entry.action] ? undefined : 'bg-sky-50 text-sky-700 border border-sky-200/60'} />
                </div>
                <div className="mt-1 text-[10px] text-slate-500">
                  {entry.entityId}
                  {entry.detail ? ` · ${entry.detail}` : ''}
                </div>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                  <Clock3 className="h-3 w-3" />
                  {new Date(entry.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  {entry.actor ? ` · ${entry.actor}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
