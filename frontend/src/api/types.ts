export type Role = 'ADMIN' | 'CREATOR'
export type StaffRole = 'SUPERADMIN' | 'MODERATOR' | 'FINANCE'

export interface User {
  id: number
  email: string
  role: Role
  staffRole?: StaffRole
  displayName: string
  creatorId?: number
}

export interface LoginResponse {
  token: string
  user: User
}

export type VideoStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED'

export interface ReviewItem {
  code: string
  title: string
  creator: string
  category: string
  thumbColor: string
  durationSec?: number
  submittedAt: string
}

export interface MonthlyGross {
  month: string
  grossCents: number
}

export interface PublicationItem {
  code: string
  title: string
  creator: string
  platform: string
  url: string
  thumbColor: string
  publishedAt: string
}

export interface AdminDashboard {
  pendingReview: number
  submittedToday: number
  publishedLast7Days: number
  publishedPrev7Days: number
  platformCount: number
  grossThisMonthCents: number
  grossLastMonthCents: number
  activeCreators: number
  creatorsJoinedThisMonth: number
  reviewQueue: ReviewItem[]
  revenueByMonth: MonthlyGross[]
  recentPublications: PublicationItem[]
}

export interface CreatorVideo {
  code: string
  title: string
  category: string
  status: VideoStatus
  views: number
  thumbColor: string
  createdAt: string
}

export interface CreatorProfile {
  displayName: string
  creatorCode: string
  slug: string
  country: string
  payoutMethod?: string
  splitPct: number
  contractSignedAt?: string
}

export interface CreatorDashboard {
  totalViews: number
  publishedCount: number
  totalEarnedCents: number
  pendingPayoutCents: number
  nextPayoutDate: string
  videos: CreatorVideo[]
  profile: CreatorProfile
}

export interface Category {
  id: number
  name: string
}

export interface VideoMetadata {
  title: string
  description?: string
  categoryId: number
  tags?: string
  durationSec?: number
}

export interface Video {
  code: string
  title: string
  description?: string
  categoryId?: number
  category?: string
  tags?: string
  status: VideoStatus
  durationSec?: number
  views: number
  thumbColor: string
  thumbnailUrl?: string
  createdAt: string
  submittedAt?: string
  rejectionReason?: string
  original?: { fileName: string; sizeBytes: number; status: 'UPLOADING' | 'AVAILABLE' }
}

export interface UploadedPart {
  partNumber: number
  etag: string
  size: number
}

export interface UploadSession {
  uploadId: string
  fileName: string
  size: number
  partSize: number
  partCount: number
  parts: UploadedPart[]
}

export interface PartUrl {
  partNumber: number
  url: string
}

export interface ReviewQueueItem {
  code: string
  title: string
  creator: string
  categoryId?: number
  category?: string
  durationSec?: number
  thumbColor: string
  thumbnailUrl?: string
  submittedAt: string
}

export interface ReviewDetail {
  code: string
  title: string
  description?: string
  tags?: string
  status: VideoStatus
  creator: string
  category?: string
  durationSec?: number
  thumbColor: string
  thumbnailUrl?: string
  previewUrl?: string
  fileName?: string
  sizeBytes?: number
  submittedAt?: string
}

export interface AuditEntry {
  id: number
  entity: string
  entityId: string
  title?: string
  action: string
  detail?: string
  actor?: string
  createdAt: string
}

export type Platform = 'YouTube' | 'TikTok' | 'Instagram'

export interface PlatformLink {
  platform: Platform
  url: string
  note?: string
  publishedAt: string
}

export interface PublishingVideo {
  code: string
  title: string
  creator: string
  status: 'APPROVED' | 'PUBLISHED'
  thumbColor: string
  thumbnailUrl?: string
  hasOriginal: boolean
  approvedAt?: string
  firstPublishedAt?: string
  platforms: PlatformLink[]
}

export interface PlatformSummary {
  platform: Platform
  videos: number
  views: number
}

export interface RevenueEntry {
  id: number
  videoCode: string
  videoTitle: string
  creator: string
  creatorId: number
  platform: Platform
  period: string
  grossCents: number
  splitPct: number
  creatorShareCents: number
  status: 'PAID' | 'PENDING'
  payoutId?: number
}

export interface Totals {
  grossCents: number
  creatorCents: number
  platformCents: number
}

export interface RevenuePage {
  entries: RevenueEntry[]
  totals: Totals
  periods: string[]
}

export interface CreatorBalance {
  creatorId: number
  creator: string
  creatorCode: string
  payoutMethod?: string
  entries: number
  pendingCents: number
}

export interface Payout {
  id: number
  creatorId: number
  creator: string
  amountCents: number
  status: 'PAID' | 'PENDING'
  externalRef?: string
  remarks?: string
  paidAt?: string
  entries: number
}

export interface StatementLine {
  videoCode: string
  videoTitle: string
  platform: Platform
  grossCents: number
  splitPct: number
  creatorShareCents: number
  status: 'PAID' | 'PENDING'
}

export interface Statement {
  period: string
  creator: string
  creatorCode: string
  country?: string
  payoutMethod?: string
  lines: StatementLine[]
  totals: Totals
  paidCents: number
  pendingCents: number
  generatedAt: string
}
