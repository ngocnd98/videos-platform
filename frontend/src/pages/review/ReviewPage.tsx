import { useMemo, useState } from 'react'
import { Eye, History, MessageSquareText, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useReviewQueue } from '../../api/review'
import { useCategories } from '../../api/videos'
import { AuditDrawer } from '../../components/review/AuditDrawer'
import { useReviewActions } from '../../components/review/useReviewActions'
import { Badge, ErrorCard, Thumb, TitleBlock } from '../../ui/common'
import { formatDuration, formatRelativeDay } from '../../ui/format'

export function ReviewPage() {
  const { data = [], isPending, error, refetch } = useReviewQueue()
  const { data: categories = [] } = useCategories()
  const [categoryId, setCategoryId] = useState('')
  const [auditOpen, setAuditOpen] = useState(false)
  const actions = useReviewActions()

  const rows = useMemo(() => (categoryId ? data.filter(r => String(r.categoryId) === categoryId) : data), [data, categoryId])

  return (
    <>
      <TitleBlock
        eyebrow="Moderation"
        title="Content review"
        description="Review incoming videos and keep quality high across every channel."
        action={<span className="self-start rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 sm:self-auto">{data.length} waiting</span>}
      />
      {error ? (
        <ErrorCard message={error.message} onRetry={() => refetch()} />
      ) : (
        <section className="card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Review queue</h2>
              <p className="mt-1 text-xs text-slate-500">Approve, reject, or inspect a video before it goes live.</p>
            </div>
            <div className="flex items-center gap-2">
              <select aria-label="Filter by category" className="input !w-auto !py-2 text-xs" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                <option value="">All categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button onClick={() => setAuditOpen(true)} className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold">
                <History className="h-4 w-4" />
                Audit log
              </button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Video</th>
                  <th className="px-4 py-3 font-semibold">Creator</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
                      {isPending ? 'Loading the review queue…' : categoryId ? 'No videos in this category are waiting for review.' : 'No videos are waiting for review.'}
                    </td>
                  </tr>
                )}
                {rows.map(item => (
                  <tr key={item.code}>
                    <td className="px-5 py-3.5">
                      <button onClick={() => actions.preview(item.code)} className="flex items-center gap-3 text-left">
                        <Thumb gradient={item.thumbColor} src={item.thumbnailUrl} />
                        <div>
                          <div className="font-semibold text-slate-800 hover:text-indigo-600">{item.title}</div>
                          <div className="mt-1 text-[10px] text-slate-500">
                            {item.code}
                            {item.durationSec != null && ` · ${formatDuration(item.durationSec)}`}
                          </div>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{item.creator}</td>
                    <td className="px-4 py-3.5 text-slate-600">{item.category}</td>
                    <td className="px-4 py-3.5 text-slate-500">{formatRelativeDay(item.submittedAt)}</td>
                    <td className="px-4 py-3.5"><Badge text="In Review" /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => actions.preview(item.code)} className="btn-secondary rounded-lg px-3 py-2 text-[10px] font-semibold">Preview</button>
                        <button onClick={() => actions.reject(item.code, item.title)} className="btn-secondary rounded-lg px-3 py-2 text-[10px] font-semibold text-rose-600 hover:bg-rose-50">Reject</button>
                        <button
                          onClick={() => actions.approve(item.code, item.title)}
                          disabled={actions.pendingCode === item.code}
                          className="btn-primary rounded-lg px-3 py-2 text-[10px] font-semibold disabled:opacity-60"
                        >
                          Approve
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[10px] text-slate-500">
            <span>Showing {rows.length} submission{rows.length === 1 ? '' : 's'}</span>
            <span>
              Review SLA <strong className="font-semibold text-slate-700">under 24 hours</strong>
            </span>
          </div>
        </section>
      )}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <MiniNote icon={Eye} title="Review with confidence" text="Preview every submission before making a decision." />
        <MiniNote icon={MessageSquareText} title="Clear feedback" text="Rejection reasons are shared with the creator." />
        <MiniNote icon={ShieldCheck} title="Full accountability" text="Every action is recorded in the audit log." />
      </div>
      {actions.dialogs}
      {auditOpen && <AuditDrawer onClose={() => setAuditOpen(false)} />}
    </>
  )
}

function MiniNote({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="card flex gap-3 p-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="text-xs font-semibold text-slate-800">{title}</div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{text}</p>
      </div>
    </div>
  )
}
