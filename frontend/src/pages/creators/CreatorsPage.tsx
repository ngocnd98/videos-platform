import { useMemo, useState } from 'react'
import { UserRoundX } from 'lucide-react'
import { useCreatorDetail, useCreators, useUpdateCreator } from '../../api/admin'
import type { AccountStatus, AdminCreator, PayoutStatus } from '../../api/types'
import { Badge, CardHeading, ErrorCard, TitleBlock, money } from '../../ui/common'
import { Modal } from '../../ui/Modal'
import { STATUS_LABEL, cents, countryName, formatMonth } from '../../ui/format'
import { useToast } from '../../ui/Toast'

const ACCOUNT_LABEL: Record<AccountStatus, string> = { ACTIVE: 'Active', SUSPENDED: 'Suspended', INVITED: 'Invited' }
const PAYOUT_LABEL: Record<PayoutStatus, string> = { PENDING: 'Pending', PAID: 'Paid', CANCELLED: 'Cancelled' }

export function CreatorsPage() {
  const { data: creators = [], isPending, error, refetch } = useCreators()
  const [query, setQuery] = useState('')
  const [detailId, setDetailId] = useState<number | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? creators.filter(c => `${c.name} ${c.email} ${c.creatorCode}`.toLowerCase().includes(q)) : creators
  }, [creators, query])

  return (
    <>
      <TitleBlock
        eyebrow="Administration"
        title="Creator management"
        description="Search creators, manage account access and set revenue shares for future revenue."
        action={<span className="self-start rounded-full bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 sm:self-auto">{creators.length} creators</span>}
      />
      {error ? (
        <ErrorCard message={error.message} onRetry={() => refetch()} />
      ) : (
        <section className="card overflow-hidden">
          <CardHeading
            title="Creator accounts"
            subtitle="Share changes apply to new revenue only; historical revenue keeps its recorded share."
            action={
              <label className="relative">
                <span className="sr-only">Search creators</span>
                <input value={query} onChange={e => setQuery(e.target.value)} className="input !w-56 !py-2 text-xs" placeholder="Search name or email" />
              </label>
            }
          />
          <div className="table-wrap">
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Creator</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Payout details</th>
                  <th className="px-4 py-3">Share</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isPending && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">Loading…</td>
                  </tr>
                )}
                {!isPending && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">No creators match your search.</td>
                  </tr>
                )}
                {/* Keyed on the share so a saved or rejected value resets the input. */}
                {rows.map(c => (
                  <CreatorRow key={`${c.creatorId}-${c.sharePct}`} creator={c} onDetails={() => setDetailId(c.creatorId)} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <div className="mt-4">
        <div className="card flex gap-3 p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <UserRoundX className="h-4 w-4" />
          </span>
          <div>
            <div className="text-xs font-semibold text-slate-800">Account status</div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Suspended creators cannot sign in and their public pages are hidden.</p>
          </div>
        </div>
      </div>
      {detailId !== null && <CreatorDetailModal creatorId={detailId} onClose={() => setDetailId(null)} />}
    </>
  )
}

function CreatorRow({ creator, onDetails }: { creator: AdminCreator; onDetails: () => void }) {
  const toast = useToast()
  const update = useUpdateCreator()
  const original = String(creator.sharePct)
  const [share, setShare] = useState(original)

  const saveShare = () => {
    if (share === original) return
    const value = Number(share)
    if (share.trim() === '' || !Number.isFinite(value) || value < 0 || value > 100) {
      setShare(original)
      return toast('Enter a creator share between 0 and 100%.', 'error')
    }
    update.mutate(
      { creatorId: creator.creatorId, sharePct: value },
      {
        onSuccess: c => toast(`New revenue share for ${c.name} is now ${c.sharePct}%.`),
        onError: err => {
          setShare(original)
          toast(err.message, 'error')
        },
      },
    )
  }

  const toggleStatus = () =>
    update.mutate(
      { creatorId: creator.creatorId, status: creator.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' },
      {
        onSuccess: c => toast(`${c.name} is now ${ACCOUNT_LABEL[c.status].toLowerCase()}.`),
        onError: err => toast(err.message, 'error'),
      },
    )

  const togglePage = () =>
    update.mutate(
      { creatorId: creator.creatorId, publicHidden: !creator.publicHidden },
      {
        onSuccess: c => toast(c.publicHidden ? 'Creator public page hidden.' : 'Creator public page restored.'),
        onError: err => toast(err.message, 'error'),
      },
    )

  return (
    <tr>
      <td className="px-5 py-3.5">
        <div className="font-semibold text-slate-800">{creator.name}</div>
        <div className="mt-1 text-[10px] text-slate-500">{creator.email} · {creator.creatorCode}</div>
      </td>
      <td className="px-4 py-3.5 text-slate-600">{countryName(creator.country)}</td>
      <td className="px-4 py-3.5 text-slate-600">{creator.payoutMethod ?? 'Not provided'}</td>
      <td className="px-4 py-3.5">
        <label className="sr-only" htmlFor={`share-${creator.creatorId}`}>Creator share for {creator.name}</label>
        <div className="flex items-center gap-1">
          <input
            id={`share-${creator.creatorId}`}
            type="number"
            min={0}
            max={100}
            value={share}
            onChange={e => setShare(e.target.value)}
            onBlur={saveShare}
            onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            disabled={update.isPending}
            className="input !w-20 !py-1.5 text-xs"
          />
          <span>%</span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <Badge
          text={ACCOUNT_LABEL[creator.status]}
          className={creator.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'}
        />
        {creator.publicHidden && <span className="ml-1.5 text-[10px] text-slate-400">Page hidden</span>}
      </td>
      <td className="whitespace-nowrap px-5 py-3.5 text-right">
        <button onClick={toggleStatus} disabled={update.isPending} className="btn-secondary rounded-lg px-3 py-2 text-[10px] font-semibold disabled:opacity-60">
          {creator.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
        </button>
        <button onClick={togglePage} disabled={update.isPending} className="ml-1 rounded-lg px-3 py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60">
          {creator.publicHidden ? 'Show page' : 'Hide page'}
        </button>
        <button onClick={onDetails} className="ml-1 rounded-lg px-3 py-2 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50">Details</button>
      </td>
    </tr>
  )
}

function CreatorDetailModal({ creatorId, onClose }: { creatorId: number; onClose: () => void }) {
  const { data, isPending, error } = useCreatorDetail(creatorId)
  const c = data?.creator

  return (
    <Modal title={c?.name ?? 'Creator'} subtitle="Creator account overview" onClose={onClose}>
      <div className="space-y-4 p-5">
        {isPending && <p className="text-xs text-slate-500">Loading…</p>}
        {error && <p className="text-xs text-rose-600">{error.message}</p>}
        {data && c && (
          <>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Fact label="Account status" value={`${ACCOUNT_LABEL[c.status]}${c.publicHidden ? ' · page hidden' : ''}`} />
              <Fact label="Revenue share" value={`${c.sharePct}% · new revenue`} />
              <Fact label="Country" value={countryName(c.country)} />
              <Fact label="Payout details" value={c.payoutMethod ?? 'Not provided'} />
              <Fact label="Videos" value={String(c.videos)} />
              <Fact label="Unpaid earnings" value={money(cents(c.unpaidCents))} />
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold text-slate-800">Recent videos</h3>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                {data.videos.length === 0 && <div className="p-3 text-xs text-slate-500">No video records.</div>}
                {data.videos.map(v => (
                  <div key={v.code} className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs">
                    <span className="truncate">{v.title} <span className="text-[10px] text-slate-400">· {v.code}</span></span>
                    <Badge text={STATUS_LABEL[v.status]} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold text-slate-800">Payout history</h3>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                {data.payouts.length === 0 && <div className="p-3 text-xs text-slate-500">No payout records.</div>}
                {data.payouts.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2.5 text-xs">
                    <span>{p.period ? formatMonth(p.period, 'long') : p.payoutCode}</span>
                    <span>{money(cents(p.amountCents))} · {PAYOUT_LABEL[p.status]}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-900">{value}</div>
    </div>
  )
}
