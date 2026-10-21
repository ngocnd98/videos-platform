import { useState } from 'react'
import { Link } from 'react-router'
import { CircleDollarSign, Eye, FileCheck2, FileText, Landmark, Plus, Wallet } from 'lucide-react'
import { useCreatorDashboard } from '../../api/dashboard'
import { StatementModal } from '../../components/StatementModal'
import type { CreatorProfile } from '../../api/types'
import { Badge, CardHeading, ErrorCard, LoadingCards, MiniStat, Thumb, TitleBlock, money } from '../../ui/common'
import { STATUS_LABEL, cents, compactNumber, countryName, formatDate } from '../../ui/format'

export function CreatorDashboardPage() {
  const { data, isPending, error, refetch } = useCreatorDashboard()
  const firstName = data?.profile.displayName.split(' ')[0]
  const [statementOpen, setStatementOpen] = useState(false)

  const header = (
    <TitleBlock
      eyebrow="Creator portal"
      title={firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
      description="Your content, earnings, and creator profile — all in one place."
      action={
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <button onClick={() => setStatementOpen(true)} className="btn-secondary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold">
            <FileText className="h-4 w-4" />
            Payout statement
          </button>
          <Link to="/upload" className="btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold">
            <Plus className="h-4 w-4" />
            Upload a video
          </Link>
        </div>
      }
    />
  )

  if (isPending) return <>{header}<LoadingCards count={3} /></>
  if (error) return <>{header}<ErrorCard message={error.message} onRetry={() => refetch()} /></>

  return (
    <>
      {header}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <MiniStat label="Total views" value={compactNumber(data.totalViews)} foot={`Across ${data.publishedCount} published videos`} icon={Eye} color="indigo" />
        <MiniStat label="Total earned" value={money(cents(data.totalEarnedCents))} foot="Lifetime creator earnings" icon={CircleDollarSign} color="emerald" />
        <MiniStat label="Pending payout" value={money(cents(data.pendingPayoutCents))} foot={`Next payout · ${formatDate(data.nextPayoutDate + 'T00:00:00')}`} icon={Wallet} color="amber" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <section className="card overflow-hidden">
          <CardHeading
            title="Your latest videos"
            subtitle="Track review status and publishing performance."
            action={<Link to="/upload" className="text-xs font-semibold text-indigo-600">Manage videos →</Link>}
          />
          <div className="table-wrap">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Video</th>
                  <th className="px-4 py-3 font-semibold">Uploaded</th>
                  <th className="px-4 py-3 font-semibold">Views</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.videos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-500">No videos yet — upload your first one.</td>
                  </tr>
                )}
                {data.videos.map(v => (
                  <tr key={v.code}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Thumb gradient={v.thumbColor} />
                        <div>
                          <div className="font-semibold text-slate-800">{v.title}</div>
                          <div className="mt-1 text-[10px] text-slate-500">{v.code} · {v.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{formatDate(v.createdAt)}</td>
                    <td className="px-4 py-3.5 text-slate-600">{compactNumber(v.views)}</td>
                    <td className="px-5 py-3.5"><Badge text={STATUS_LABEL[v.status]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <ProfileCard profile={data.profile} />
      </div>
      {statementOpen && <StatementModal scope="me" periods={recentMonths(6)} onClose={() => setStatementOpen(false)} />}
    </>
  )
}

function ProfileCard({ profile }: { profile: CreatorProfile }) {
  const initials = profile.displayName.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()
  const platformPct = 100 - profile.splitPct
  return (
    <section className="card overflow-hidden">
      <CardHeading title="Profile & contract" subtitle="Your creator account at a glance." action={<Link to="/profile" className="text-xs font-semibold text-indigo-600">View details →</Link>} />
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white">{initials}</div>
          <div>
            <div className="text-sm font-semibold text-slate-900">{profile.displayName}</div>
            <div className="mt-1 text-[10px] text-slate-500">Creator ID · {profile.creatorCode}</div>
          </div>
          <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">Active</span>
        </div>
        <div className="my-4 grid grid-cols-2 gap-3 border-y border-slate-100 py-4">
          <div>
            <div className="text-[10px] text-slate-400">Country</div>
            <div className="mt-1 text-xs font-medium text-slate-700">{countryName(profile.country)}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Payout account</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-700">
              <Landmark className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              {profile.payoutMethod ?? 'Not set'}
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-indigo-50/70 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-800">Revenue split</span>
            <FileCheck2 className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <strong className="text-xl font-semibold text-indigo-900">{profile.splitPct}%</strong>
              <span className="ml-1 text-[10px] text-indigo-800">Creator</span>
            </div>
            <span className="text-xs text-indigo-400">/</span>
            <div className="text-right">
              <strong className="text-xl font-semibold text-slate-700">{platformPct}%</strong>
              <span className="ml-1 text-[10px] text-slate-500">Platform</span>
            </div>
          </div>
          {profile.contractSignedAt && (
            <div className="mt-2 text-[10px] text-indigo-700/70">Active contract · Signed {formatDate(profile.contractSignedAt)}</div>
          )}
        </div>
      </div>
    </section>
  )
}

/** Current month first, as YYYY-MM. */
function recentMonths(count: number) {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7))
}
