import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { BadgeDollarSign, Building2, FileUp, Info, Plus, UsersRound } from 'lucide-react'
import { useCreators } from '../../api/admin'
import { currentPeriod, parseDollars, useRevenue, useUpdateGross } from '../../api/revenue'
import type { RevenueEntry } from '../../api/types'
import { StatementModal } from '../../components/StatementModal'
import { Badge, CardHeading, ErrorCard, MiniStat, PlatformBadge, TitleBlock, money } from '../../ui/common'
import { cents, formatMonth } from '../../ui/format'
import { useToast } from '../../ui/Toast'
import { ImportModal, ManualEntryModal } from './RevenueModals'

const ALL = 'ALL'

export function RevenuePage() {
  const [period, setPeriod] = useState(currentPeriod())
  const { data, isPending, error, refetch } = useRevenue(period === ALL ? '' : period)
  const creators = useCreators()
  const [modal, setModal] = useState<'manual' | 'import' | 'statement' | null>(null)

  const periods = data?.periods ?? []
  const avgSplit = data && data.totals.grossCents ? Math.round((data.totals.creatorCents / data.totals.grossCents) * 100) : 60

  return (
    <>
      <TitleBlock
        eyebrow="Finance"
        title="Revenue management"
        description="Import platform earnings, manage creator splits, and prepare payouts."
        action={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setModal('manual')} className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold">
              <Plus className="h-4 w-4" />
              Manual entry
            </button>
            <button onClick={() => setModal('import')} className="btn-primary inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold">
              <FileUp className="h-4 w-4" />
              CSV import
            </button>
          </div>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <MiniStat label="Gross revenue" value={money(cents(data?.totals.grossCents ?? 0))} foot={period === ALL ? 'All imported platform revenue' : `Platform revenue · ${formatMonth(period, 'long')}`} icon={BadgeDollarSign} color="indigo" />
        <MiniStat label="Creator payouts" value={money(cents(data?.totals.creatorCents ?? 0))} foot={`${avgSplit}% average creator share`} icon={UsersRound} color="emerald" />
        <MiniStat label="Platform share" value={money(cents(data?.totals.platformCents ?? 0))} foot={`${100 - avgSplit}% platform share`} icon={Building2} color="amber" />
      </div>

      {error ? (
        <ErrorCard message={error.message} onRetry={() => refetch()} />
      ) : (
        <section className="card overflow-hidden">
          <CardHeading
            title="Revenue entries"
            subtitle="Each line stores the creator share in effect at entry. Paid lines are locked."
            action={
              <select aria-label="Month" className="input !w-auto !py-2 text-xs" value={period} onChange={e => setPeriod(e.target.value)}>
                {!periods.includes(currentPeriod()) && <option value={currentPeriod()}>{formatMonth(currentPeriod(), 'long')}</option>}
                {periods.map(p => (
                  <option key={p} value={p}>{formatMonth(p, 'long')}</option>
                ))}
                <option value={ALL}>All months</option>
              </select>
            }
          />
          <div className="table-wrap">
            <table className="w-full min-w-[1120px] text-left text-xs">
              <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Video title</th>
                  <th className="px-4 py-3 font-semibold">Creator</th>
                  <th className="px-4 py-3 font-semibold">Period</th>
                  <th className="px-4 py-3 font-semibold">Platform</th>
                  <th className="px-4 py-3 font-semibold">Gross revenue</th>
                  <th className="px-4 py-3 font-semibold">Split ratio</th>
                  <th className="px-4 py-3 font-semibold">Creator payout</th>
                  <th className="px-4 py-3 font-semibold">Platform share</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.entries.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-sm text-slate-500">No revenue recorded for this month yet.</td>
                  </tr>
                )}
                {isPending && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-sm text-slate-500">Loading…</td>
                  </tr>
                )}
                {data?.entries.map(row => <RevenueRow key={row.id} row={row} />)}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-500 sm:flex-row sm:justify-between">
            <span>Showing {data?.entries.length ?? 0} revenue entries</span>
            <span>
              All amounts shown in USD <span className="px-1">·</span>
              <button onClick={() => setModal('statement')} className="font-semibold text-indigo-600 hover:text-indigo-800">Download payout statement</button>
            </span>
          </div>
        </section>
      )}

      <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Creator payout is calculated from gross revenue based on the contract active when the revenue was recorded. Platform share is the remaining balance.{' '}
          <Link to="/payouts" className="font-semibold text-indigo-600 hover:text-indigo-800">Manage payouts →</Link>
        </span>
      </p>

      {modal === 'manual' && <ManualEntryModal onClose={() => setModal(null)} />}
      {modal === 'import' && <ImportModal onClose={() => setModal(null)} />}
      {modal === 'statement' && (
        <StatementModal
          scope={{ creators: (creators.data ?? []).map(c => ({ creatorId: c.creatorId, creator: c.name })) }}
          periods={periods.length ? periods : [currentPeriod()]}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}

/** Gross is edited in place for unpaid entries; shares update live and are saved on blur or Enter. */
function RevenueRow({ row }: { row: RevenueEntry }) {
  const toast = useToast()
  const update = useUpdateGross()
  const original = (row.grossCents / 100).toFixed(2)
  const [value, setValue] = useState(original)
  useEffect(() => setValue(original), [original])

  const parsed = parseDollars(value)
  const grossCents = parsed === null ? row.grossCents : Math.round(parsed * 100)
  const creatorCents = Math.round((grossCents * row.splitPct) / 100)
  // Lines inside a payout (pending or paid) are frozen so the payout amount stays correct.
  const locked = row.payoutId != null

  const save = () => {
    if (value === original) return
    if (parsed === null) {
      setValue(original)
      return toast('Enter an amount like 1240.50.', 'error')
    }
    update.mutate(
      { id: row.id, gross: parsed },
      {
        onSuccess: () => toast(`Gross for “${row.videoTitle}” updated.`),
        onError: err => {
          setValue(original)
          toast(err.message, 'error')
        },
      },
    )
  }

  return (
    <tr>
      <td className="px-5 py-3.5">
        <div className="font-semibold text-slate-800">{row.videoTitle}</div>
        <div className="mt-1 text-[10px] text-slate-500">{row.videoCode}</div>
      </td>
      <td className="px-4 py-3.5 text-slate-600">{row.creator}</td>
      <td className="px-4 py-3.5 text-slate-500">{formatMonth(row.period, 'long')}</td>
      <td className="px-4 py-3.5"><PlatformBadge platform={row.platform} /></td>
      <td className="px-4 py-3.5">
        {locked ? (
          <span className="font-medium text-slate-700">{money(cents(row.grossCents))}</span>
        ) : (
          <div className="flex items-center gap-1">
            <label className="sr-only" htmlFor={`gross-${row.id}`}>Gross revenue for {row.videoTitle}</label>
            <span className="text-slate-400">$</span>
            <input
              id={`gross-${row.id}`}
              inputMode="decimal"
              value={value}
              onChange={e => setValue(e.target.value)}
              onBlur={save}
              onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              disabled={update.isPending}
              className="input !w-28 !px-2 !py-1.5 text-xs"
            />
          </div>
        )}
      </td>
      <td className="px-4 py-3.5 text-slate-600">{row.splitPct}% / {100 - row.splitPct}%</td>
      <td className="px-4 py-3.5 font-medium text-slate-700">{money(cents(creatorCents))}</td>
      <td className="px-4 py-3.5 text-slate-600">{money(cents(grossCents - creatorCents))}</td>
      <td className="px-5 py-3.5" title={locked && row.status !== 'PAID' ? 'Included in a pending payout' : undefined}>
        <Badge text={row.status === 'PAID' ? 'Paid' : 'Pending'} />
      </td>
    </tr>
  )
}
