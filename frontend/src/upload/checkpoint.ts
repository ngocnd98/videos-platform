/** What the browser remembers about an unfinished upload, so it can offer "Retry from X%" after a reload. */
export interface UploadCheckpoint {
  code: string
  fileKey: string
  fileName: string
  fileSize: number
  phase: 'storage' | 'submission'
  progress: number
  metadata: FormValues
}

export interface FormValues {
  title: string
  categoryId: string
  tags: string
  description: string
}

const KEY = 'pmh.uploadCheckpoint'

export const fileKeyOf = (file: File) => `${file.name}:${file.size}:${file.lastModified}`

export function loadCheckpoint(): UploadCheckpoint | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as UploadCheckpoint) : null
  } catch {
    return null
  }
}

/** Returns false when storage is unavailable (private mode), so the page can warn once. */
export function saveCheckpoint(checkpoint: UploadCheckpoint | null): boolean {
  try {
    if (checkpoint) localStorage.setItem(KEY, JSON.stringify(checkpoint))
    else localStorage.removeItem(KEY)
    return true
  } catch {
    return false
  }
}
