import { Link } from 'react-router'
import { CircleCheck, Clock3, HardDrive, ListChecks, Wallet } from 'lucide-react'
import { useAdminDashboard } from '../../api/dashboard'
import { useAuth } from '../../auth/AuthContext'
import { RevenueLineChart } from '../../components/RevenueLineChart'
import { useReviewActions } from '../../components/review/useReviewActions'
import { Badge, CardHeading, ErrorCard, LoadingCards, PUBLICATION_STATUS_LABEL, PlatformBadge, StatCard, Thumb, TitleBlock, TrendPill, money } from '../../ui/common'
import { cents, formatDate, formatDuration, formatMonth, greeting, percentChange } from '../../ui/format'

export function AdminDashboardPage() {
  const { user } = useAuth()
  const { data, isPending, error, refetch } = useAdminDashboard()
  const actions = useReviewActions()
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const firstName = user?.displayName.split(' ')[0] ?? ''

  const header = (
    <TitleBlock
      eyebrow={today}
      title={`${greeting()}, ${firstName}`}
      description="Here’s what’s happening across your creator network today."
      action={
        <Link to="/review" className="btn-primary inline-flex items-center gap-2 self-start rounded-lg px-4 py-2.5 text-xs font-semibold sm:self-auto">
          <ListChecks className="h-4 w-4" />
          Review content
        </Link>
      }
    />
  )

  if (isPending) return <>{header}<LoadingCards /></>
  if (error) return <>{header}<ErrorCard message={error.message} onRetry={() => refetch()} /></>

  const grossChange = percentChange(data.grossThisMonthCents, data.grossLastMonthCents)
  const currentMonth = data.revenueByMonth[data.revenueByMonth.length - 1]?.month
  const usedGb = data.storageUsedBytes / 1024 ** 3
  const storagePct = data.storageQuotaGb ? Math.round((usedGb / data.storageQuotaGb) * 100) : 0

  return (
    <>
      {header}
      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending review" value={data.pendingReview} foot={`${data.submittedToday} submitted today`} icon={Clock3} color="amber" />
        <Link to="/publishing" className="block">
          <StatCard label="Approved · not published" value={data.approvedUnpublished} foot="Ready for manual publishing" icon={CircleCheck} color="sky" trend="Queue" />
        </Link>
        <Link to="/payouts" className="block">
          <StatCard
            label="Unpaid payouts"
            value={data.pendingPayouts}
            foot={`${money(cents(data.pendingPayoutCents))} pending settlement`}
            icon={Wallet}
            color="emerald"
            trend="View"
          />
        </Link>
        <StatCard
          label="Storage used"
          value={`${usedGb < 10 ? usedGb.toFixed(1) : Math.round(usedGb)} GB`}
          foot={`of ${data.storageQuotaGb} GB creator quota`}
          icon={HardDrive}
          color="violet"
          trend={`${storagePct}%`}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="card overflow-hidden">
          <CardHeading
            title="Content review queue"
            subtitle={data.pendingReview ? `${data.pendingReview} video${data.pendingReview === 1 ? ' is' : 's are'} waiting for your review.` : 'Nothing is waiting for review.'}
            action={<Link to="/review" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">View all →</Link>}
          />
          <div className="divide-y divide-slate-100">
            {data.reviewQueue.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">All caught up — nothing to review.</div>}
            {data.reviewQueue.map(item => (
              <div key={item.code} className="flex items-center gap-3 px-5 py-3.5">
                <Thumb gradient={item.thumbColor} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-slate-800">{item.title}</div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    {item.creator} <span className="px-1 text-slate-300">·</span>
                    {item.category}
                    {item.durationSec != null && (
                      <>
                        <span className="px-1 text-slate-300">·</span>
                        {formatDuration(item.durationSec)}
                      </>
                    )}
                  </div>
                </div>
                <button onClick={() => actions.preview(item.code)} className="btn-secondary rounded-lg px-3 py-2 text-[10px] font-semibold">
                  Preview
                </button>
                <button
                  onClick={() => actions.approve(item.code, item.title)}
                  disabled={actions.pendingCode === item.code}
                  className="btn-primary rounded-lg px-3 py-2 text-[10px] font-semibold disabled:opacity-60"
                >
                  Approve
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="card overflow-hidden">
          <CardHeading
            title="Revenue snapshot"
            subtitle={currentMonth ? `Platform earnings · ${formatMonth(currentMonth, 'long')}` : 'Platform earnings'}
            action={<Link to="/analytics" className="text-xs font-semibold text-indigo-600">Details</Link>}
          />
          <div className="p-5">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <div className="text-2xl font-semibold tracking-tight text-slate-900">{money(cents(data.grossThisMonthCents))}</div>
                <div className="mt-1 text-xs text-slate-500">Gross revenue this month</div>
              </div>
              <TrendPill change={grossChange} />
            </div>
            <div className="h-[190px]">
              <RevenueLineChart data={data.revenueByMonth} />
            </div>
          </div>
        </section>

        <section className="card overflow-hidden xl:col-span-2">
          <CardHeading
            title="Recent publishing activity"
            subtitle="Latest updates from your creator network."
            action={<Link to="/publishing" className="text-xs font-semibold text-indigo-600">Publishing tracker →</Link>}
          />
          <div className="table-wrap">
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Video</th>
                  <th className="px-4 py-3 font-semibold">Creator</th>
                  <th className="px-4 py-3 font-semibold">Platform</th>
                  <th className="px-4 py-3 font-semibold">Channel</th>
                  <th className="px-4 py-3 font-semibold">Published</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentPublications.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">No videos published yet.</td>
                  </tr>
                )}
                {data.recentPublications.map(row => (
                  <tr key={`${row.code}-${row.platform}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Thumb gradient={row.thumbColor} />
                        <a href={row.url} target="_blank" rel="noreferrer" className="font-semibold text-slate-800 hover:text-indigo-600">
                          {row.title}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.creator}</td>
                    <td className="px-4 py-3"><PlatformBadge platform={row.platform} /></td>
                    <td className="px-4 py-3 text-slate-600">{row.channel ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(row.publishedAt)}</td>
                    <td className="px-5 py-3"><Badge text={PUBLICATION_STATUS_LABEL[row.status] ?? 'Published'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {actions.dialogs}
    </>
  )
}
