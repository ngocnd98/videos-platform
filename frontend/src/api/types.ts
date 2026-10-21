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
  channel?: string
  status: PublicationStatus
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
  approvedUnpublished: number
  pendingPayouts: number
  pendingPayoutCents: number
  storageUsedBytes: number
  storageQuotaGb: number
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
  visible: boolean
}

export interface VideoMetadata {
  title: string
  description?: string
  categoryId: number
  tags?: string
  language?: string
  durationSec?: number
}

export interface Video {
  code: string
  title: string
  description?: string
  categoryId?: number
  category?: string
  tags?: string
  language?: string
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
  creatorCountry?: string
  tags?: string
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

export type PublicationStatus = 'PUBLISHED' | 'REMOVED' | 'NEEDS_ATTENTION'

export interface PlatformLink {
  id: number
  platform: Platform
  url: string
  channel?: string
  status: PublicationStatus
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

export type PayoutStatus = 'PENDING' | 'PAID' | 'CANCELLED'

export interface Payout {
  id: number
  /** "PAY-0016" */
  payoutCode: string
  creatorId: number
  creator: string
  /** YYYY-MM; missing only for legacy rows */
  period?: string
  amountCents: number
  status: PayoutStatus
  /** Creator's payout method at read time, e.g. "PayPal · alex•••@mail.com" */
  payoutMethod?: string
  externalRef?: string
  remarks?: string
  createdAt: string
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

// ---------------------------------------------------------------------------------------------
// v1.06 additions (see CONTRACT: settings, categories, users, creators, payouts, publications,
// creator profile, analytics).

export interface PlatformSetting {
  name: Platform
  enabled: boolean
}

export interface Settings {
  uploadLimitGb: number
  storageQuotaGb: number
  defaultSharePct: number
  retentionDays: number
  platforms: PlatformSetting[]
}

export interface SettingsUpdate {
  uploadLimitGb: number
  storageQuotaGb: number
  defaultSharePct: number
  retentionDays: number
  enabledPlatforms: Platform[]
}

export interface StorageUsage {
  originalFiles: number
  usedBytes: number
}

export interface AdminCategory extends Category {
  videos: number
}

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'INVITED'

export interface WorkspaceUser {
  id: number
  /** "USR-001" */
  userCode: string
  name: string
  email: string
  role: Role
  staffRole?: StaffRole
  status: AccountStatus
}

export interface AdminCreator {
  creatorId: number
  userId: number
  /** "PM-CR-0001" */
  creatorCode: string
  name: string
  email: string
  /** ISO country code, e.g. "US" */
  country?: string
  payoutMethod?: string
  sharePct: number
  status: AccountStatus
  publicHidden: boolean
  videos: number
  /** Creator share of entries not yet in any payout */
  unpaidCents: number
}

export interface CreatorDetail {
  creator: AdminCreator
  videos: { code: string; title: string; status: VideoStatus; createdAt: string }[]
  payouts: Payout[]
}

export interface PayoutPreview {
  creatorId: number
  period: string
  entries: number
  amountCents: number
  payoutMethod?: string
}

export interface Publication {
  id: number
  code: string
  title: string
  creator: string
  platform: Platform
  channel?: string
  url: string
  note?: string
  status: PublicationStatus
  publishedAt: string
  thumbColor: string
  thumbnailUrl?: string
}

export interface CreatorAccount {
  displayName: string
  email: string
  creatorCode: string
  slug: string
  country?: string
  bio?: string
  socialLinks?: string
  payoutMethod?: string
  sharePct: number
  contractSignedAt?: string
  status: AccountStatus
  publicHidden: boolean
}

export interface CreatorAccountUpdate {
  displayName: string
  slug: string
  country?: string
  bio?: string
  socialLinks?: string
  payoutMethod?: string
  newPassword?: string
}

export interface PublicVideo {
  code: string
  title: string
  category?: string
  description?: string
  tags?: string
  views: number
  platform: Platform
  url: string
  publishedAt: string
  thumbColor: string
  thumbnailUrl?: string
}

export interface PublicProfile {
  hidden: boolean
  displayName: string
  slug: string
  country?: string
  bio?: string
  socialLinks?: string
  totalViews: number
  videos: PublicVideo[]
}

export interface PlatformSeries {
  platform: Platform
  /** One value per entry of Analytics.months */
  grossCents: number[]
}

export interface Analytics {
  /** YYYY-MM, oldest first */
  months: string[]
  series: PlatformSeries[]
  /** Totals over the selected range */
  totals: Totals
  grossThisMonthCents: number
  grossLastMonthCents: number
  totalViews: number
  /** creatorCents / grossCents over the range, rounded; 60 when there is no revenue */
  avgSharePct: number
}
