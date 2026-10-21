import { ChartNoAxesCombined, CircleUserRound, CloudUpload, LayoutDashboard, ListChecks, Send, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react'
import type { Mode } from '../auth/AuthContext'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  modes: Mode[]
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, modes: ['admin', 'creator'] },
  { path: '/review', label: 'Content review', icon: ListChecks, modes: ['admin'] },
  { path: '/publishing', label: 'Publishing', icon: Send, modes: ['admin'] },
  { path: '/revenue', label: 'Revenue', icon: Wallet, modes: ['admin'] },
  { path: '/analytics', label: 'Analytics', icon: ChartNoAxesCombined, modes: ['admin', 'creator'] },
  { path: '/upload', label: 'Upload videos', icon: CloudUpload, modes: ['creator'] },
  { path: '/profile', label: 'My profile', icon: CircleUserRound, modes: ['creator'] },
  { path: '/roles', label: 'Staff & roles', icon: ShieldCheck, modes: ['admin'] },
]
