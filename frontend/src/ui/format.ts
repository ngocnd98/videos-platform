import type { VideoStatus } from '../api/types'

export const STATUS_LABEL: Record<VideoStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PUBLISHED: 'Published',
}

export const cents = (value: number) => value / 100

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "Today, 10:42 AM", "Yesterday, 4:06 PM", otherwise "Oct 12, 2026". */
export function formatRelativeDay(iso: string) {
  const date = new Date(iso)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const dayDiff = Math.floor((startOfToday.getTime() - date.getTime()) / 86_400_000) + 1
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (date >= startOfToday) return `Today, ${time}`
  if (dayDiff === 1) return `Yesterday, ${time}`
  return formatDate(iso)
}

export function formatMonth(yearMonth: string, style: 'short' | 'long' = 'short') {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', style === 'short' ? { month: 'short' } : { month: 'long', year: 'numeric' })
}

export const compactNumber = (value: number) =>
  value === 0 ? '—' : new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value)

/** Percent change, or null when there is no baseline to compare against. */
export function percentChange(current: number, previous: number) {
  if (!previous) return null
  return ((current - previous) / previous) * 100
}

export const formatPercent = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}%`

export function formatDuration(sec?: number) {
  if (sec == null) return ''
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

const COUNTRIES: Record<string, string> = {
  US: 'United States 🇺🇸',
  SG: 'Singapore 🇸🇬',
  VN: 'Vietnam 🇻🇳',
}
export const countryName = (code?: string) => (code ? COUNTRIES[code] ?? code : '—')

export function greeting(date = new Date()) {
  const h = date.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}
