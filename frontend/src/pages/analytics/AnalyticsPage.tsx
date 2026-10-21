import { useState } from 'react'
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { DollarSign, Eye, FileDown, Percent, ShieldCheck, Sheet } from 'lucide-react'
import { useAnalytics } from '../../api/admin'
import type { Analytics, Platform } from '../../api/types'
import { CardHeading, ErrorCard, LoadingCards, MiniStat, TitleBlock, money } from '../../ui/common'
import { cents, compactNumber, formatMonth, formatPercent, percentChange } from '../../ui/format'
import { useToast } from '../../ui/Toast'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const PLATFORM_COLOR: Record<Platform, string> = { YouTube: '#ef4444', TikTok: '#334155', Instagram: '#d946ef' }
const AXIS_FONT = { family: 'Inter', size: 10 }

export function AnalyticsPage() {
  const toast = useToast()
  const [months, setMonths] = useState<6 | 12>(6)
  const { data, isPending, error, refetch } = useAnalytics(months)

  const change = data ? percentChange(data.grossThisMonthCents, data.grossLastMonthCents) : null

  const exportCsv = () => {
    if (!data) return
    downloadCsv(data, `pulsemedia-revenue-${data.months[0]}-to-${data.months[data.months.length - 1]}.csv`)
    toast('Excel report is ready to download.')
  }

  return (
    <>
      <TitleBlock
        eyebrow="Insights"
        title="Reports & analytics"
        description="Understand revenue trends and how earnings are shared across your network."
        action={
          <div className="flex gap-2 print:hidden">
            <button onClick={() => window.print()} className="btn-secondary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold">
              <FileDown className="h-4 w-4" />
              Export PDF
            </button>
            <button onClick={exportCsv} disabled={!data} className="btn-secondary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60">
              <Sheet className="h-4 w-4" />
              Export Excel
            </button>
          </div>
        }
      />
      {error ? (
        <ErrorCard message={error.message} onRetry={() => refetch()} />
      ) : isPending ? (
        <LoadingCards count={3} />
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <MiniStat
              label="Revenue this month"
              value={money(cents(data.grossThisMonthCents))}
              foot={change == null ? 'No revenue last month to compare' : `${formatPercent(change)} vs last month`}
              icon={DollarSign}
              color="indigo"
            />
            <MiniStat label="Total views" value={compactNumber(data.totalViews)} foot="Across published videos" icon={Eye} color="emerald" />
            <MiniStat label="Creator payout rate" value={`${data.avgSharePct}%`} foot="Across active contracts" icon={Percent} color="amber" />
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <section className="card overflow-hidden">
              <CardHeading
                title="Monthly revenue"
                subtitle="Gross earnings by distribution platform."
                action={
                  <select aria-label="Range" className="input !w-auto !py-1.5 text-[10px] print:hidden" value={months} onChange={e => setMonths(Number(e.target.value) as 6 | 12)}>
                    <option value={6}>Last 6 months</option>
                    <option value={12}>Last 12 months</option>
                  </select>
                }
              />
              <div className="p-4 sm:p-5">
                <div className="h-[310px]">
                  <RevenueBars data={data} />
                </div>
              </div>
            </section>
            <section className="card overflow-hidden">
              <CardHeading title="Revenue split" subtitle={`Creator payouts compared to platform share · last ${months} months.`} />
              <div className="p-5">
                <div className="mx-auto h-[230px] max-w-[290px]">
                  <SplitDoughnut data={data} />
                </div>
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                      Creator payouts
                    </span>
                    <strong className="font-semibold text-slate-900">{money(cents(data.totals.creatorCents))}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                      Platform share
                    </span>
                    <strong className="font-semibold text-slate-900">{money(cents(data.totals.platformCents))}</strong>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
      <div className="mt-5">
        <div className="card flex gap-3 p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <div className="text-xs font-semibold text-slate-800">Your data, your decisions</div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Reports reflect uploaded and manually recorded platform revenue. Export a copy any time.</p>
          </div>
        </div>
      </div>
    </>
  )
}

function RevenueBars({ data }: { data: Analytics }) {
  return (
    <Bar
      aria-label="Monthly platform revenue chart"
      role="img"
      data={{
        labels: data.months.map(m => formatMonth(m)),
        datasets: data.series.map(s => ({
          label: s.platform,
          data: s.grossCents.map(cents),
          backgroundColor: PLATFORM_COLOR[s.platform],
          borderRadius: 4,
          maxBarThickness: 16,
        })),
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, boxHeight: 7, padding: 18, color: '#64748b', font: AXIS_FONT } },
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${money(Number(ctx.raw))}` } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: AXIS_FONT }, border: { display: false } },
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: { color: '#94a3b8', font: { family: 'Inter', size: 9 }, callback: v => `$${Number(v) / 1000}k` },
            border: { display: false },
          },
        },
      }}
    />
  )
}

function SplitDoughnut({ data }: { data: Analytics }) {
  const empty = data.totals.grossCents === 0
  return (
    <Doughnut
      aria-label="Creator payout and platform profit chart"
      role="img"
      data={{
        labels: ['Creator payouts', 'Platform share'],
        datasets: [
          {
            data: empty ? [60, 40] : [cents(data.totals.creatorCents), cents(data.totals.platformCents)],
            backgroundColor: ['#6366f1', '#e2e8f0'],
            borderWidth: 0,
            hoverOffset: 5,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        cutout: '76%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: !empty, callbacks: { label: ctx => `${ctx.label}: ${money(Number(ctx.raw))}` } },
        },
      }}
    />
  )
}

function downloadCsv(data: Analytics, fileName: string) {
  const header = ['Month', ...data.series.map(s => s.platform), 'Total']
  const rows = data.months.map((m, i) => {
    const values = data.series.map(s => s.grossCents[i] ?? 0)
    const total = values.reduce((a, b) => a + b, 0)
    return [m, ...values.map(v => (v / 100).toFixed(2)), (total / 100).toFixed(2)]
  })
  rows.push([])
  rows.push(['Creator payouts', (data.totals.creatorCents / 100).toFixed(2)])
  rows.push(['Platform share', (data.totals.platformCents / 100).toFixed(2)])
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
