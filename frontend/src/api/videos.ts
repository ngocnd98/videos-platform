import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { Category, PartUrl, UploadSession, Video, VideoMetadata, VideoStatus } from './types'

export const videoKeys = {
  mine: (status?: VideoStatus) => ['videos', 'mine', status ?? 'ALL'] as const,
  categories: ['categories'] as const,
}

export const useCategories = () =>
  useQuery({ queryKey: videoKeys.categories, queryFn: () => api<Category[]>('/categories'), staleTime: Infinity })

export const useMyVideos = (status?: VideoStatus) =>
  useQuery({
    queryKey: videoKeys.mine(status),
    queryFn: () => api<Video[]>(`/creator/videos${status ? `?status=${status}` : ''}`),
  })

const base = (code: string) => `/creator/videos/${encodeURIComponent(code)}`

export const videoApi = {
  create: (metadata: VideoMetadata) => api<Video>('/creator/videos', { method: 'POST', json: metadata }),
  update: (code: string, metadata: VideoMetadata) => api<Video>(base(code), { method: 'PUT', json: metadata }),
  remove: (code: string) => api<void>(base(code), { method: 'DELETE' }),
  startUpload: (code: string, file: File) =>
    api<UploadSession>(`${base(code)}/upload`, {
      method: 'POST',
      json: { fileName: file.name, size: file.size, contentType: file.type || 'video/mp4' },
    }),
  uploadStatus: (code: string) => api<UploadSession>(`${base(code)}/upload`),
  partUrls: (code: string, partNumbers: number[]) =>
    api<PartUrl[]>(`${base(code)}/upload/parts`, { method: 'POST', json: { partNumbers } }),
  completeUpload: (code: string, parts: { partNumber: number; etag: string }[]) =>
    api<Video>(`${base(code)}/upload/complete`, { method: 'POST', json: { parts } }),
  abortUpload: (code: string) => api<void>(`${base(code)}/upload`, { method: 'DELETE' }),
  uploadThumbnail: (code: string, image: Blob) => {
    const form = new FormData()
    form.append('file', image, 'thumbnail.jpg')
    return api<Video>(`${base(code)}/thumbnail`, { method: 'POST', body: form })
  },
  submit: (code: string) => api<Video>(`${base(code)}/submit`, { method: 'POST' }),
}
