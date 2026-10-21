/** Reads a local video in a detached <video> element. Resolves with nothing if the browser can't decode it. */
function withVideo<T>(file: File, run: (video: HTMLVideoElement) => Promise<T>, timeoutMs = 8000): Promise<T | undefined> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  video.src = url
  const timeout = new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), timeoutMs))
  return Promise.race([run(video).catch(() => undefined), timeout]).finally(() => {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  })
}

const once = (el: HTMLElement, event: string) =>
  new Promise<void>((resolve, reject) => {
    el.addEventListener(event, () => resolve(), { once: true })
    el.addEventListener('error', () => reject(new Error('decode error')), { once: true })
  })

export function readDuration(file: File): Promise<number | undefined> {
  return withVideo(file, async video => {
    await once(video, 'loadedmetadata')
    return Number.isFinite(video.duration) ? Math.round(video.duration) : undefined
  })
}

/** Grabs a frame about a third into the clip (at most 1s in) as a JPEG. */
export function captureThumbnail(file: File): Promise<Blob | undefined> {
  return withVideo(file, async video => {
    await once(video, 'loadeddata')
    video.currentTime = Math.min(1, (video.duration || 3) / 3)
    await once(video, 'seeked')
    const width = Math.min(640, video.videoWidth || 640)
    const height = Math.round((width * (video.videoHeight || 360)) / (video.videoWidth || 640))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')!.drawImage(video, 0, 0, width, height)
    return new Promise<Blob | undefined>(resolve => canvas.toBlob(b => resolve(b ?? undefined), 'image/jpeg', 0.82))
  })
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}
