import {
  BadgeDollarSign,
  ChartNoAxesCombined,
  CircleUserRound,
  CloudUpload,
  LayoutDashboard,
  ListChecks,
  PanelsTopLeft,
  ReceiptText,
  Send,
  Settings2,
  ShieldCheck,
  Tags,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { Mode } from '../auth/AuthContext'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  mode: Mode
}

// Order and labels follow the prototype's sidebar; a path can appear once per mode with its own label.
export const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, mode: 'admin' },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, mode: 'creator' },
  { path: '/review', label: 'Content review', icon: ListChecks, mode: 'admin' },
  { path: '/publishing', label: 'Publishing', icon: Send, mode: 'admin' },
  { path: '/publishing', label: 'My publications', icon: Send, mode: 'creator' },
  { path: '/revenue', label: 'Revenue', icon: Wallet, mode: 'admin' },
  { path: '/analytics', label: 'Analytics', icon: ChartNoAxesCombined, mode: 'admin' },
  { path: '/upload', label: 'Upload videos', icon: CloudUpload, mode: 'creator' },
  { path: '/profile', label: 'My profile', icon: CircleUserRound, mode: 'creator' },
  { path: '/payouts', label: 'My earnings & payouts', icon: ReceiptText, mode: 'creator' },
  { path: '/roles', label: 'Users & roles', icon: ShieldCheck, mode: 'admin' },
  { path: '/creators', label: 'Creator management', icon: UsersRound, mode: 'admin' },
  { path: '/payouts', label: 'Payouts', icon: BadgeDollarSign, mode: 'admin' },
  { path: '/categories', label: 'Categories', icon: Tags, mode: 'admin' },
  { path: '/cms', label: 'CMS pages', icon: PanelsTopLeft, mode: 'admin' },
  { path: '/settings', label: 'Settings & audit', icon: Settings2, mode: 'admin' },
]

/** Modes allowed to open each path. */
export const PATH_MODES: Record<string, Mode[]> = NAV_ITEMS.reduce<Record<string, Mode[]>>((acc, item) => {
  acc[item.path] = [...(acc[item.path] ?? []), item.mode]
  return acc
}, {})
