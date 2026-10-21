import type { ReactNode } from 'react'
import { Play, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'

// Shared building blocks ported from the prototype's template helpers.

export const money = (value: number) =>
  '$' + Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const STATUS_CLASS: Record<string, string> = {
  Approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  'In Review': 'bg-amber-50 text-amber-700 border border-amber-200/60',
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200/60',
  Rejected: 'bg-rose-50 text-rose-700 border border-rose-200/60',
  Published: 'bg-sky-50 text-sky-700 border border-sky-200/60',
  Paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  Draft: 'bg-slate-100 text-slate-600 border border-slate-200',
}

const PLATFORM_CLASS: Record<string, string> = {
  YouTube: 'bg-red-50 text-red-600 border border-red-200',
  TikTok: 'bg-slate-900 text-white',
  Instagram: 'bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-200',
}

export function Badge({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${className ?? STATUS_CLASS[text] ?? 'bg-slate-100 text-slate-600'}`}>
      {text}
    </span>
  )
}

export const PlatformBadge = ({ platform }: { platform: string }) => (
  <Badge text={platform} className={PLATFORM_CLASS[platform] ?? 'bg-slate-100 text-slate-600'} />
)

export function TitleBlock({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.12em] text-indigo-600">{eyebrow}</div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">{title}</h1>
        <p className="mt-1.5 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function CardHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

const STAT_COLORS = {
  amber: 'bg-amber-50 text-amber-700',
  sky: 'bg-sky-50 text-sky-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  violet: 'bg-violet-50 text-violet-700',
  indigo: 'bg-indigo-50 text-indigo-600',
}
type StatColor = keyof typeof STAT_COLORS

/** Trend badge is shown only when `trend` is given (there is a baseline to compare against). */
export function StatCard(props: { label: string; value: ReactNode; foot: string; icon: LucideIcon; color: StatColor; trend?: string; direction?: 'up' | 'down' }) {
  const { label, value, foot, icon: Icon, color, trend, direction = 'up' } = props
  const Trend = direction === 'down' ? TrendingDown : TrendingUp
  return (
    <article className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <div className="mt-2 text-[26px] font-semibold tracking-tight text-slate-900">{value}</div>
        </div>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${STAT_COLORS[color]}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500">
        {trend && (
          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-1 font-semibold ${direction === 'down' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
            <Trend className="h-3 w-3" />
            {trend}
          </span>
        )}
        {foot}
      </div>
    </article>
  )
}

export function MiniStat({ label, value, foot, icon: Icon, color }: { label: string; value: ReactNode; foot: string; icon: LucideIcon; color: StatColor }) {
  return (
    <article className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${STAT_COLORS[color]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{foot}</p>
    </article>
  )
}

/** Video thumbnail: the real frame when there is one, otherwise the prototype's gradient placeholder. */
export function Thumb({ gradient = 'from-violet-200 to-indigo-300', size = 'h-11 w-[68px]', src }: { gradient?: string; size?: string; src?: string }) {
  return (
    <div className={`thumb flex ${size} shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradient}`}>
      {src && <img src={src} alt="" loading="lazy" className="!absolute inset-0 h-full w-full object-cover" />}
      <Play className="h-4 w-4 fill-white text-white drop-shadow" />
    </div>
  )
}

export function TrendPill({ change }: { change: number | null }) {
  if (change == null) return null
  const down = change < 0
  const Trend = down ? TrendingDown : TrendingUp
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${down ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
      <Trend className="h-3 w-3" />
      {Math.abs(change).toFixed(1)}%
    </span>
  )
}

export function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card h-[118px] animate-pulse bg-slate-100" />
      ))}
    </div>
  )
}

export function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <section className="card px-5 py-10 text-center">
      <p className="text-sm font-semibold text-slate-800">Couldn’t load this page</p>
      <p className="mt-1 text-xs text-slate-500">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-4 rounded-lg px-3 py-2 text-xs font-semibold">
          Try again
        </button>
      )}
    </section>
  )
}
