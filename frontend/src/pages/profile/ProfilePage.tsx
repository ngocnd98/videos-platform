import { useState } from 'react'
import { Eye, EyeOff, FileCheck2, Landmark, Pencil, ReceiptText } from 'lucide-react'
import { useCreatorAccount, usePublicProfile } from '../../api/profile'
import type { CreatorAccount } from '../../api/types'
import { StatementModal } from '../../components/StatementModal'
import { Badge, CardHeading, ErrorCard, LoadingCards, TitleBlock } from '../../ui/common'
import { countryName, formatDate, formatMonth } from '../../ui/format'
import { EditProfileModal } from './EditProfileModal'
import { PublicProfileModal, PublicVideoCard } from './PublicProfileModal'

/** Current month first, as YYYY-MM. */
function recentMonths(count: number) {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7))
}

export function ProfilePage() {
  const { data, isPending, error, refetch } = useCreatorAccount()
  const publicProfile = usePublicProfile()
  const [modal, setModal] = useState<'edit' | 'public' | null>(null)
  const [statement, setStatement] = useState<string | null>(null)
  const [current, previous] = recentMonths(2)

  const header = (
    <TitleBlock
      eyebrow="Creator portal"
      title="My profile"
      description="Your public identity, payout details, and current agreement."
      action={
        <div className="flex gap-2 self-start sm:self-auto">
          <button onClick={() => setModal('edit')} disabled={!data} className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold">
            <Pencil className="h-4 w-4" />
            Edit profile
          </button>
          <button onClick={() => setModal('public')} className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold">
            <Eye className="h-4 w-4" />
            Preview public profile
          </button>
        </div>
      }
    />
  )

  if (isPending) return <>{header}<LoadingCards count={2} /></>
  if (error) return <>{header}<ErrorCard message={error.message} onRetry={() => refetch()} /></>

  const preview = publicProfile.data
  return (
    <>
      {header}
      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <AccountCard account={data} />
        <section className="card overflow-hidden">
          <CardHeading title="Payout statements" subtitle="Your latest payout and earnings summary." />
          <div className="divide-y divide-slate-100">
            <StatementRow
              title={`${formatMonth(current, 'long')} statement`}
              detail="In progress · paid after month end"
              highlight
              onOpen={() => setStatement(current)}
            />
            <StatementRow title={`${formatMonth(previous, 'long')} statement`} detail="Previous month" onOpen={() => setStatement(previous)} />
          </div>
        </section>
      </div>

      <section className="card mt-5 overflow-hidden">
        <CardHeading
          title="Public profile preview"
          subtitle="A clean, shareable showcase of your published videos."
          action={<button onClick={() => setModal('public')} className="text-xs font-semibold text-indigo-600">Open preview →</button>}
        />
        {preview?.hidden ? (
          <div className="flex items-center gap-3 p-5 text-xs text-amber-800">
            <EyeOff className="h-4 w-4" />
            Your public page is hidden. The account is suspended or an admin has hidden it.
          </div>
        ) : (
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            {preview?.videos.slice(0, 3).map(v => (
              <PublicVideoCard key={v.code} video={v} slug={preview.slug} />
            ))}
            {preview && preview.videos.length === 0 && (
              <div className="col-span-full rounded-lg bg-slate-50 p-8 text-center text-xs text-slate-500">No published videos yet.</div>
            )}
            {publicProfile.isPending && <div className="col-span-full p-8 text-center text-xs text-slate-500">Loading…</div>}
          </div>
        )}
      </section>

      {modal === 'edit' && <EditProfileModal account={data} onClose={() => setModal(null)} />}
      {modal === 'public' && <PublicProfileModal onClose={() => setModal(null)} />}
      {statement && <StatementModal scope="me" periods={[statement, ...recentMonths(6).filter(m => m !== statement)]} onClose={() => setStatement(null)} />}
    </>
  )
}

function StatementRow({ title, detail, highlight, onOpen }: { title: string; detail: string; highlight?: boolean; onOpen: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${highlight ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
          <ReceiptText className="h-4 w-4" />
        </span>
        <div>
          <div className="text-xs font-semibold text-slate-800">{title}</div>
          <div className="mt-1 text-[10px] text-slate-500">{detail}</div>
        </div>
      </div>
      <button onClick={onOpen} className="btn-secondary rounded-lg px-3 py-2 text-[10px] font-semibold">Download</button>
    </div>
  )
}

function AccountCard({ account }: { account: CreatorAccount }) {
  const initials = account.displayName.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()
  const status = account.status === 'SUSPENDED' ? 'Suspended' : 'Active'
  return (
    <section className="card overflow-hidden">
      <CardHeading title="Profile & contract" subtitle="Your creator account at a glance." />
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white">{initials}</div>
          <div>
            <div className="text-sm font-semibold text-slate-900">{account.displayName}</div>
            <div className="mt-1 text-[10px] text-slate-500">Creator ID · {account.creatorCode} · {account.email}</div>
          </div>
          <span className="ml-auto">
            <Badge text={status} />
          </span>
        </div>
        <div className="my-4 grid grid-cols-2 gap-3 border-y border-slate-100 py-4">
          <div>
            <div className="text-[10px] text-slate-400">Country</div>
            <div className="mt-1 text-xs font-medium text-slate-700">{countryName(account.country)}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Payout account</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-700">
              <Landmark className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              {account.payoutMethod ?? 'Not set'}
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-[10px] text-slate-400">Bio</div>
            <div className="mt-1 text-xs text-slate-700">{account.bio || '—'}</div>
            {account.socialLinks && <div className="mt-1 text-[10px] text-slate-500">{account.socialLinks}</div>}
          </div>
          <div className="col-span-2">
            <div className="text-[10px] text-slate-400">Public profile URL</div>
            <div className="mt-1 text-xs font-medium text-indigo-600">pulsemedia.co/{account.slug}</div>
          </div>
        </div>
        <div className="rounded-lg bg-indigo-50/70 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-800">Revenue split</span>
            <FileCheck2 className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <strong className="text-xl font-semibold text-indigo-900">{account.sharePct}%</strong>
              <span className="ml-1 text-[10px] text-indigo-800">Creator</span>
            </div>
            <span className="text-xs text-indigo-400">/</span>
            <div className="text-right">
              <strong className="text-xl font-semibold text-slate-700">{100 - account.sharePct}%</strong>
              <span className="ml-1 text-[10px] text-slate-500">Platform</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-indigo-700/70">
            {account.contractSignedAt && `Active contract · Signed ${formatDate(account.contractSignedAt)} · `}Share change applies to new revenue only.
          </div>
        </div>
      </div>
    </section>
  )
}
