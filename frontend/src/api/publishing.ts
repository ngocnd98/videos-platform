import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { Platform, PlatformSummary, Publication, PublicationStatus, PublishingVideo } from './types'

export const publishingKeys = {
  videos: (status: 'APPROVED' | 'PUBLISHED') => ['publishing', 'videos', status] as const,
  summary: ['publishing', 'summary'] as const,
  publications: ['publishing', 'publications'] as const,
  mine: ['publishing', 'mine'] as const,
}

/** Agency channels the team posts to; free text on the server. */
export const CHANNELS = ['PulseMedia Main', 'PulseMedia Clips', 'PulseMedia Food', 'PulseMedia Reels']

export const usePublishingVideos = (status: 'APPROVED' | 'PUBLISHED') =>
  useQuery({ queryKey: publishingKeys.videos(status), queryFn: () => api<PublishingVideo[]>(`/admin/publishing/videos?status=${status}`) })

export const usePlatformSummary = () =>
  useQuery({ queryKey: publishingKeys.summary, queryFn: () => api<PlatformSummary[]>('/admin/publishing/summary') })

export const fetchDownloadUrl = (code: string) =>
  api<{ url: string; fileName: string }>(`/admin/videos/${encodeURIComponent(code)}/download-url`)

export function usePublish() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ code, ...body }: { code: string; publications: { platform: Platform; url: string }[]; channel?: string; note?: string }) =>
      api<PublishingVideo>(`/admin/videos/${encodeURIComponent(code)}/publications`, { method: 'POST', json: body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publishing'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['audit'] })
    },
  })
}

/** Mirrors the server's PlatformUrls so links are checked as you type. */
export function validPlatformUrl(platform: Platform, value: string) {
  try {
    const url = new URL(value.trim())
    if (!/^https?:$/.test(url.protocol)) return false
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    if (platform === 'YouTube') {
      return host === 'youtu.be'
        ? url.pathname.length > 1
        : ['youtube.com', 'm.youtube.com'].includes(host) && ((url.pathname.startsWith('/watch') && url.searchParams.has('v')) || url.pathname.startsWith('/shorts/'))
    }
    if (platform === 'TikTok') return host === 'tiktok.com' && /^\/@[^/]+\/video\/\d+/.test(url.pathname)
    if (platform === 'Instagram') return host === 'instagram.com' && /^\/reel\/[^/]+/.test(url.pathname)
    return false
  } catch {
    return false
  }
}

export const usePublications = () =>
  useQuery({ queryKey: publishingKeys.publications, queryFn: () => api<Publication[]>('/admin/publications') })

export const useMyPublications = () =>
  useQuery({ queryKey: publishingKeys.mine, queryFn: () => api<Publication[]>('/creator/publications') })

export function useUpdatePublication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; channel: string; url: string; status: PublicationStatus; note?: string }) =>
      api<Publication>(`/admin/publications/${id}`, { method: 'PATCH', json: body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publishing'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['audit'] })
    },
  })
}
