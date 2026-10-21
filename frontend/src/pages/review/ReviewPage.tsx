import { useMemo, useState } from 'react'
import { Eye, History, MessageSquareText, ShieldCheck } from 'lucide-react'
import { useReviewQueue } from '../../api/review'
import type { ReviewQueueItem } from '../../api/types'
import { useCategories } from '../../api/videos'
import { AuditDrawer } from '../../components/review/AuditDrawer'
import { useReviewActions } from '../../components/review/useReviewActions'
import { Badge, ErrorCard, MiniNote, Thumb, TitleBlock } from '../../ui/common'
import { countryLabel, formatDuration, formatRelativeDay } from '../../ui/format'
import { EditInfoModal } from './EditInfoModal'

export function ReviewPage() {
  const { data = [], isPending, error, refetch } = useReviewQueue()
  const { data: categories = [] } = useCategories()
  const [categoryId, setCategoryId] = useState('')
  const [creator, setCreator] = useState('')
  const [country, setCountry] = useState('')
  const [auditOpen, setAuditOpen] = useState(false)
  const [editing, setEditing] = useState<ReviewQueueItem | null>(null)
  const actions = useReviewActions()

  const creators = useMemo(() => [...new Set(data.map(r => r.creator))].sort(), [data])
  const countries = useMemo(() => [...new Set(data.map(r => r.creatorCountry).filter((c): c is string => !!c))].sort(), [data])
  const rows = useMemo(
    () =>
      data.filter(
        r =>
          (!categoryId || String(r.categoryId) === categoryId) &&
          (!creator || r.creator === creator) &&
          (!country || r.creatorCountry === country),
      ),
    [data, categoryId, creator, country],
  )
  const filtered = !!(categoryId || creator || country)

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
              <p className="mt-1 text-xs text-slate-500">Review the original, correct metadata, then approve or reject. Decisions apply only while status is In Review.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Filter by creator" className="input !w-auto !py-2 text-xs" value={creator} onChange={e => setCreator(e.target.value)}>
                <option value="">All creators</option>
                {creators.map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select aria-label="Filter by country" className="input !w-auto !py-2 text-xs" value={country} onChange={e => setCountry(e.target.value)}>
                <option value="">All countries</option>
                {countries.map(c => (
                  <option key={c} value={c}>{countryLabel(c)}</option>
                ))}
              </select>
              <select aria-label="Filter by category" className="input !w-auto !py-2 text-xs" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                <option value="">All categories</option>
                {categories.filter(c => c.visible).map(c => (
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
                      {isPending ? 'Loading the review queue…' : filtered ? 'No videos match these filters.' : 'No videos are waiting for review.'}
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
                        <button onClick={() => setEditing(item)} className="btn-secondary rounded-lg px-3 py-2 text-[10px] font-semibold">Edit info</button>
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
      {editing && <EditInfoModal item={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
