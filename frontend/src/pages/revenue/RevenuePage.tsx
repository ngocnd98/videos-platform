import { useEffect, useState } from 'react'
import { BadgeDollarSign, Building2, FileUp, Info, Plus, UsersRound } from 'lucide-react'
import { currentPeriod, parseDollars, useBalances, usePayouts, useRevenue, useUpdateGross } from '../../api/revenue'
import type { CreatorBalance, RevenueEntry } from '../../api/types'
import { StatementModal } from '../../components/StatementModal'
import { Badge, CardHeading, ErrorCard, MiniStat, PlatformBadge, TitleBlock, money } from '../../ui/common'
import { cents, formatDate, formatMonth } from '../../ui/format'
import { useToast } from '../../ui/Toast'
import { ImportModal, ManualEntryModal, PayModal } from './RevenueModals'

const ALL = 'ALL'

export function RevenuePage() {
  const [period, setPeriod] = useState(currentPeriod())
  const { data, isPending, error, refetch } = useRevenue(period === ALL ? '' : period)
  const balances = useBalances()
  const payouts = usePayouts()
  const [modal, setModal] = useState<'manual' | 'import' | 'statement' | null>(null)
  const [paying, setPaying] = useState<CreatorBalance | null>(null)

  const periods = data?.periods ?? []
  const avgSplit = data && data.totals.grossCents ? Math.round((data.totals.creatorCents / data.totals.grossCents) * 100) : 60
  const owed = (balances.data ?? []).filter(b => b.pendingCents > 0)

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
            subtitle="Edit gross revenue to recalculate creator and platform shares instantly."
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
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Video title</th>
                  <th className="px-4 py-3 font-semibold">Platform</th>
                  {period === ALL && <th className="px-4 py-3 font-semibold">Month</th>}
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
                    <td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-500">No revenue recorded for this month yet.</td>
                  </tr>
                )}
                {isPending && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-500">Loading…</td>
                  </tr>
                )}
                {data?.entries.map(row => <RevenueRow key={row.id} row={row} showPeriod={period === ALL} />)}
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

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <section className="card overflow-hidden">
          <CardHeading title="Unpaid balances" subtitle="Pay creators outside the platform, then record the transfer here." />
          <div className="divide-y divide-slate-100">
            {owed.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">Every creator is paid up.</div>}
            {owed.map(b => (
              <div key={b.creatorId} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-800">{b.creator}</div>
                  <div className="mt-1 truncate text-[10px] text-slate-500">
                    {b.creatorCode} · {b.payoutMethod ?? 'No payout account'} · {b.entries} entr{b.entries === 1 ? 'y' : 'ies'}
                  </div>
                </div>
                <strong className="text-sm font-semibold text-slate-900">{money(cents(b.pendingCents))}</strong>
                <button onClick={() => setPaying(b)} className="btn-primary rounded-lg px-3 py-2 text-[10px] font-semibold">Mark as paid</button>
              </div>
            ))}
          </div>
        </section>
        <section className="card overflow-hidden">
          <CardHeading title="Payout history" subtitle="Transfers recorded by the finance team." />
          <div className="table-wrap">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Creator</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Reference</th>
                  <th className="px-4 py-3 font-semibold">Paid</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(payouts.data ?? []).slice(0, 8).map(p => (
                  <tr key={p.id}>
                    <td className="px-5 py-3 font-semibold text-slate-800">{p.creator}</td>
                    <td className="px-4 py-3 text-slate-700">{money(cents(p.amountCents))}</td>
                    <td className="px-4 py-3 text-slate-500" title={p.remarks}>{p.externalRef}</td>
                    <td className="px-4 py-3 text-slate-500">{p.paidAt ? formatDate(p.paidAt) : '—'}</td>
                    <td className="px-5 py-3"><Badge text={p.status === 'PAID' ? 'Paid' : 'Pending'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Creator payout is calculated from gross revenue based on the contract active when the revenue was recorded. Platform share is the remaining balance.
      </p>

      {modal === 'manual' && <ManualEntryModal onClose={() => setModal(null)} />}
      {modal === 'import' && <ImportModal onClose={() => setModal(null)} />}
      {modal === 'statement' && (
        <StatementModal
          scope={{ creators: (balances.data ?? []).map(b => ({ creatorId: b.creatorId, creator: b.creator })) }}
          periods={periods.length ? periods : [currentPeriod()]}
          onClose={() => setModal(null)}
        />
      )}
      {paying && <PayModal balance={paying} onClose={() => setPaying(null)} />}
    </>
  )
}

/** Gross is edited in place for unpaid entries; shares update live and are saved on blur or Enter. */
function RevenueRow({ row, showPeriod }: { row: RevenueEntry; showPeriod: boolean }) {
  const toast = useToast()
  const update = useUpdateGross()
  const original = (row.grossCents / 100).toFixed(2)
  const [value, setValue] = useState(original)
  useEffect(() => setValue(original), [original])

  const parsed = parseDollars(value)
  const grossCents = parsed === null ? row.grossCents : Math.round(parsed * 100)
  const creatorCents = Math.round((grossCents * row.splitPct) / 100)
  const locked = row.status === 'PAID'

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
        <div className="mt-1 text-[10px] text-slate-500">{row.videoCode} · {row.creator}</div>
      </td>
      <td className="px-4 py-3.5"><PlatformBadge platform={row.platform} /></td>
      {showPeriod && <td className="px-4 py-3.5 text-slate-500">{formatMonth(row.period, 'long')}</td>}
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
      <td className="px-5 py-3.5"><Badge text={locked ? 'Paid' : 'Pending'} /></td>
    </tr>
  )
}
