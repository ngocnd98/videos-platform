import { useMemo, useState, type FormEvent } from 'react'
import { BadgeCheck, Hourglass, Landmark, Plus } from 'lucide-react'
import { useCreators } from '../../api/admin'
import { useAdminPayouts, useCancelPayout, useCreatePayout, useMarkPaid, useMyPayouts, usePayoutPreview } from '../../api/payouts'
import { currentPeriod, useStatement } from '../../api/revenue'
import type { Payout, PayoutStatus } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { StatementModal } from '../../components/StatementModal'
import { Badge, CardHeading, ErrorCard, MiniStat, PlatformBadge, TitleBlock, money } from '../../ui/common'
import { Modal } from '../../ui/Modal'
import { cents, formatDate, formatMonth } from '../../ui/format'
import { useToast } from '../../ui/Toast'

const STATUS_TEXT: Record<PayoutStatus, string> = { PENDING: 'Pending', PAID: 'Paid', CANCELLED: 'Cancelled' }
const CANCELLED_BADGE = 'bg-slate-100 text-slate-500 border border-slate-200'

/** "PayPal · alex•••@mail.com" → "PayPal" */
const methodKind = (method?: string) => method?.split(' · ')[0]?.trim() || undefined

function recentMonths(count: number) {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7))
}

export function PayoutsPage() {
  const { mode } = useAuth()
  return mode === 'creator' ? <CreatorPayouts /> : <AdminPayouts />
}

// --- Admin -------------------------------------------------------------------------------

function AdminPayouts() {
  const toast = useToast()
  const { data: payouts = [], isPending, error, refetch } = useAdminPayouts()
  const { data: creators = [] } = useCreators()
  const cancel = useCancelPayout()
  const [creating, setCreating] = useState(false)
  const [settling, setSettling] = useState<Payout | null>(null)

  const pending = payouts.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amountCents, 0)
  const paid = payouts.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amountCents, 0)
  const methods = [...new Set(creators.map(c => methodKind(c.payoutMethod)).filter((m): m is string => !!m))]

  const onCancel = (p: Payout) => {
    if (!window.confirm(`Cancel payout ${p.payoutCode}?`)) return
    cancel.mutate(p.id, {
      onSuccess: () => toast('Payout cancelled; its amount is available for a future payout.'),
      onError: err => toast(err.message, 'error'),
    })
  }

  return (
    <>
      <TitleBlock
        eyebrow="Finance"
        title="Payout management"
        description="Prepare creator payouts and record transfers made outside the platform."
        action={
          <button onClick={() => setCreating(true)} className="btn-primary inline-flex items-center gap-2 self-start rounded-lg px-4 py-2.5 text-xs font-semibold sm:self-auto">
            <Plus className="h-4 w-4" />
            Create payout
          </button>
        }
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <MiniStat label="Pending payouts" value={money(cents(pending))} foot="Requires payout details on file" icon={Hourglass} color="amber" />
        <MiniStat label="Paid" value={money(cents(paid))} foot="Recorded settlements" icon={BadgeCheck} color="emerald" />
        <MiniStat
          label="Payout method"
          value={`${methods.length} method${methods.length === 1 ? '' : 's'}`}
          foot={methods.join(' · ') || 'No payout details yet'}
          icon={Landmark}
          color="indigo"
        />
      </div>
      {error ? (
        <ErrorCard message={error.message} onRetry={() => refetch()} />
      ) : (
        <PayoutTable
          title="Creator payouts"
          payouts={payouts}
          loading={isPending}
          renderAction={p =>
            p.status === 'PENDING' ? (
              <>
                <button onClick={() => setSettling(p)} className="btn-primary rounded-lg px-3 py-2 text-[10px] font-semibold">Mark paid</button>
                <button onClick={() => onCancel(p)} disabled={cancel.isPending} className="ml-1 rounded-lg px-3 py-2 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60">Cancel</button>
              </>
            ) : p.status === 'PAID' ? (
              <span className="text-[10px] text-slate-500" title={p.remarks}>{p.externalRef ?? 'Statement available'}</span>
            ) : (
              <span className="text-[10px] text-slate-400">—</span>
            )
          }
        />
      )}
      <p className="mt-4 text-[11px] text-slate-500">Transfers are completed outside PulseMedia Hub; this page records the payment reference and receipt.</p>
      {creating && <CreatePayoutModal onClose={() => setCreating(false)} />}
      {settling && <SettlementModal payout={settling} onClose={() => setSettling(null)} />}
    </>
  )
}

function CreatePayoutModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const { data: creators = [] } = useCreators()
  const active = useMemo(() => creators.filter(c => c.status === 'ACTIVE'), [creators])
  const create = useCreatePayout()
  const [creatorId, setCreatorId] = useState<number | null>(null)
  const [period, setPeriod] = useState(currentPeriod())
  const selectedId = creatorId ?? active[0]?.creatorId ?? null
  const selected = active.find(c => c.creatorId === selectedId)
  const preview = usePayoutPreview(selectedId, period)

  const eligibility = preview.isFetching
    ? 'Checking unpaid revenue…'
    : preview.error
      ? preview.error.message
      : preview.data && preview.data.entries > 0
        ? `${preview.data.entries} pending revenue line${preview.data.entries === 1 ? '' : 's'} will be included. No transfer is made by PulseMedia Hub.`
        : 'No unpaid revenue lines are available for this creator and period.'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (selectedId === null) return
    if (!selected?.payoutMethod) return toast('Add payout details to the creator profile before creating a payout.', 'error')
    create.mutate(
      { creatorId: selectedId, period },
      {
        onSuccess: () => {
          toast('Payout created. Record the transfer after it is sent.')
          onClose()
        },
        onError: err => toast(err.message, 'error'),
      },
    )
  }

  return (
    <Modal title="Create payout" subtitle="Record an external transfer. A payout method must be on file." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <div>
          <label htmlFor="payoutCreator" className="mb-1.5 block text-xs font-semibold text-slate-700">Creator</label>
          <select id="payoutCreator" required className="input" value={selectedId ?? ''} onChange={e => setCreatorId(Number(e.target.value))}>
            {active.map(c => (
              <option key={c.creatorId} value={c.creatorId}>{c.name} · {c.payoutMethod ?? 'No payout details'}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">
            Period
            <input type="month" required value={period} onChange={e => setPeriod(e.target.value)} className="input mt-1.5" />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Eligible creator earnings
            <input readOnly className="input mt-1.5" value={money(cents(preview.data?.amountCents ?? 0))} />
          </label>
        </div>
        <p className="text-[11px] text-slate-500">{eligibility}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary rounded-lg px-4 py-2 text-xs font-semibold">Cancel</button>
          <button disabled={create.isPending || !preview.data?.entries} className="btn-primary rounded-lg px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60">
            Create payout
          </button>
        </div>
      </form>
    </Modal>
  )
}

function SettlementModal({ payout, onClose }: { payout: Payout; onClose: () => void }) {
  const toast = useToast()
  const markPaid = useMarkPaid()
  const [reference, setReference] = useState('')
  const [remarks, setRemarks] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!reference.trim()) return
    markPaid.mutate(
      { id: payout.id, externalRef: reference.trim(), remarks: remarks.trim() || undefined },
      {
        onSuccess: () => {
          toast('Settlement recorded. Paid payout lines are now locked.')
          onClose()
        },
        onError: err => toast(err.message, 'error'),
      },
    )
  }

  return (
    <Modal title="Record settlement" subtitle={`Mark ${payout.payoutCode} as paid to ${payout.creator} · ${money(cents(payout.amountCents))}.`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <div>
          <label htmlFor="settlementReference" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Transfer reference <span className="text-rose-500">*</span>
          </label>
          <input id="settlementReference" required maxLength={100} value={reference} onChange={e => setReference(e.target.value)} className="input" placeholder="Bank or payment provider reference" />
        </div>
        <div>
          <label htmlFor="settlementRemarks" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Remarks <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input id="settlementRemarks" maxLength={300} value={remarks} onChange={e => setRemarks(e.target.value)} className="input" placeholder="e.g. Monthly payout" />
        </div>
        <div>
          <label htmlFor="settlementReceipt" className="mb-1.5 block text-xs font-semibold text-slate-700">Receipt (optional)</label>
          <input id="settlementReceipt" type="file" accept="image/*,.pdf" className="input" />
          <p className="mt-1 text-[10px] text-slate-400">Demo: the receipt is not stored; keep it with your finance records.</p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary rounded-lg px-4 py-2 text-xs font-semibold">Cancel</button>
          <button disabled={markPaid.isPending} className="btn-primary rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-60">Mark paid</button>
        </div>
      </form>
    </Modal>
  )
}

// --- Creator -----------------------------------------------------------------------------

function CreatorPayouts() {
  const months = useMemo(() => recentMonths(6), [])
  const [period, setPeriod] = useState(months[0])
  const [statementOpen, setStatementOpen] = useState(false)
  const { data: payouts = [], isPending, error, refetch } = useMyPayouts()
  const statement = useStatement('me', period)

  const pending = payouts.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amountCents, 0)
  const paid = payouts.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amountCents, 0)
  const method = statement.data?.payoutMethod ?? payouts[0]?.payoutMethod

  return (
    <>
      <TitleBlock
        eyebrow="Creator portal"
        title="My earnings & payouts"
        description="Review your earnings and payout history. Only your account data is shown."
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <MiniStat label="Pending payout" value={money(cents(pending))} foot="Requires payout details on file" icon={Hourglass} color="amber" />
        <MiniStat label="Paid" value={money(cents(paid))} foot="Recorded settlements" icon={BadgeCheck} color="emerald" />
        <MiniStat label="Payout method" value={methodKind(method) ?? 'Not set'} foot={method?.split(' · ').slice(1).join(' · ') || 'Add it in My profile'} icon={Landmark} color="indigo" />
      </div>

      <section className="card mb-5 overflow-hidden">
        <CardHeading
          title="Earnings summary"
          subtitle={`Your earnings by platform and video · ${formatMonth(period, 'long')}`}
          action={
            <div className="flex items-center gap-3">
              <select aria-label="Month" className="input !w-auto !py-1.5 text-[10px]" value={period} onChange={e => setPeriod(e.target.value)}>
                {months.map(m => (
                  <option key={m} value={m}>{formatMonth(m, 'long')}</option>
                ))}
              </select>
              <button onClick={() => setStatementOpen(true)} className="whitespace-nowrap text-xs font-semibold text-indigo-600">Download statement</button>
            </div>
          }
        />
        <div className="table-wrap">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Video</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-5 py-3">Your share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {statement.isPending && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">Loading…</td>
                </tr>
              )}
              {statement.error && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-rose-600">{statement.error.message}</td>
                </tr>
              )}
              {statement.data?.lines.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">No earnings recorded for this month.</td>
                </tr>
              )}
              {statement.data?.lines.map(line => (
                <tr key={`${line.videoCode}-${line.platform}`}>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-800">{line.videoTitle}</div>
                    <div className="mt-1 text-[10px] text-slate-500">{line.videoCode} · {line.splitPct}% share</div>
                  </td>
                  <td className="px-4 py-3.5"><PlatformBadge platform={line.platform} /></td>
                  <td className="px-4 py-3.5 text-slate-500">{formatMonth(period, 'long')}</td>
                  <td className="px-4 py-3.5">{money(cents(line.grossCents))}</td>
                  <td className="px-5 py-3.5 font-semibold">{money(cents(line.creatorShareCents))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {error ? (
        <ErrorCard message={error.message} onRetry={() => refetch()} />
      ) : (
        <PayoutTable
          title="Payout history"
          payouts={payouts}
          loading={isPending}
          renderAction={p =>
            p.status === 'PAID' ? (
              <span className="text-[10px] text-slate-500">{p.externalRef ?? 'Statement available'}</span>
            ) : p.status === 'PENDING' && p.period ? (
              <button
                onClick={() => {
                  setPeriod(p.period!)
                  setStatementOpen(true)
                }}
                className="text-[10px] font-semibold text-indigo-600"
              >
                Statement
              </button>
            ) : (
              <span className="text-[10px] text-slate-400">—</span>
            )
          }
        />
      )}
      <p className="mt-4 text-[11px] text-slate-500">Transfers are completed outside PulseMedia Hub; this page records the payment reference and receipt.</p>
      {statementOpen && <StatementModal scope="me" periods={[period, ...months.filter(m => m !== period)]} onClose={() => setStatementOpen(false)} />}
    </>
  )
}

// --- Shared ------------------------------------------------------------------------------

function PayoutTable({ title, payouts, loading, renderAction }: { title: string; payouts: Payout[]; loading: boolean; renderAction: (p: Payout) => React.ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <CardHeading title={title} subtitle="Paid lines are locked; corrections are recorded as adjustments in a future period." />
      <div className="table-wrap">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Payout</th>
              <th className="px-4 py-3">Creator</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500">Loading…</td>
              </tr>
            )}
            {!loading && payouts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500">No payouts recorded yet.</td>
              </tr>
            )}
            {payouts.map(p => (
              <tr key={p.id}>
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-slate-800">{p.payoutCode}</div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    {p.entries} line{p.entries === 1 ? '' : 's'} · {p.paidAt ? `Paid ${formatDate(p.paidAt)}` : `Created ${formatDate(p.createdAt)}`}
                  </div>
                </td>
                <td className="px-4 py-3.5">{p.creator}</td>
                <td className="px-4 py-3.5 text-slate-600">{p.period ? formatMonth(p.period, 'long') : '—'}</td>
                <td className="px-4 py-3.5 text-slate-600">{p.payoutMethod ?? '—'}</td>
                <td className="px-4 py-3.5 font-semibold">{money(cents(p.amountCents))}</td>
                <td className="px-4 py-3.5">
                  <Badge text={STATUS_TEXT[p.status]} className={p.status === 'CANCELLED' ? CANCELLED_BADGE : undefined} />
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-right">{renderAction(p)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
