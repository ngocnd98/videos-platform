import { videoApi } from '../api/videos'
import type { UploadSession, Video } from '../api/types'

/**
 * Uploads a file straight to R2 with presigned multipart URLs.
 * Parts R2 already holds (from an earlier, interrupted attempt) are skipped, so resuming
 * relies on the server's ListParts rather than on what the browser remembers.
 */

const CONCURRENCY = 3
const URL_BATCH = 20
const MAX_ATTEMPTS = 3

export class UploadAbortedError extends Error {
  constructor() {
    super('Upload paused')
  }
}

export interface UploadProgress {
  uploadedBytes: number
  totalBytes: number
}

interface Options {
  code: string
  file: File
  /** Continue the existing session instead of starting a new one. */
  resume: boolean
  signal: AbortSignal
  onProgress: (p: UploadProgress) => void
}

export async function uploadOriginal({ code, file, resume, signal, onProgress }: Options): Promise<Video> {
  const session: UploadSession = resume ? await videoApi.uploadStatus(code) : await videoApi.startUpload(code, file)
  if (session.size !== file.size) {
    throw new Error('The selected file does not match the interrupted upload. Choose the same file or restart from 0%.')
  }
  const { partSize, partCount } = session
  const partBytes = (n: number) => Math.min(partSize, file.size - (n - 1) * partSize)

  const etags = new Map<number, string>()
  for (const p of session.parts) {
    // A part of the wrong size was cut short; upload it again.
    if (p.size === partBytes(p.partNumber)) etags.set(p.partNumber, p.etag)
  }

  const inFlight = new Map<number, number>()
  const report = () => {
    let uploaded = 0
    etags.forEach((_, n) => (uploaded += partBytes(n)))
    inFlight.forEach(loaded => (uploaded += loaded))
    onProgress({ uploadedBytes: Math.min(uploaded, file.size), totalBytes: file.size })
  }
  report()

  const queue = Array.from({ length: partCount }, (_, i) => i + 1).filter(n => !etags.has(n))
  const urls = new Map<number, string>()
  let urlRequest: Promise<void> | null = null

  const urlFor = async (n: number): Promise<string> => {
    while (!urls.has(n)) {
      if (!urlRequest) {
        const wanted = [n, ...queue.filter(q => !urls.has(q) && q !== n)].slice(0, URL_BATCH)
        urlRequest = videoApi
          .partUrls(code, wanted)
          .then(list => list.forEach(u => urls.set(u.partNumber, u.url)))
          .finally(() => (urlRequest = null))
      }
      await urlRequest
    }
    return urls.get(n)!
  }

  const uploadPart = async (n: number) => {
    const blob = file.slice((n - 1) * partSize, (n - 1) * partSize + partBytes(n))
    for (let attempt = 1; ; attempt++) {
      if (signal.aborted) throw new UploadAbortedError()
      try {
        const etag = await putBlob(await urlFor(n), blob, signal, loaded => {
          inFlight.set(n, loaded)
          report()
        })
        etags.set(n, etag)
        return
      } catch (e) {
        if (e instanceof UploadAbortedError || attempt >= MAX_ATTEMPTS) throw e
        // An expired presigned URL comes back as 403; fetch a fresh one.
        if (e instanceof PartHttpError && e.status === 403) urls.delete(n)
        await new Promise(r => setTimeout(r, 500 * attempt))
      } finally {
        inFlight.delete(n)
        report()
      }
    }
  }

  const worker = async () => {
    while (queue.length) {
      await uploadPart(queue.shift()!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))

  if (signal.aborted) throw new UploadAbortedError()
  const parts = [...etags.entries()].sort(([a], [b]) => a - b).map(([partNumber, etag]) => ({ partNumber, etag }))
  return videoApi.completeUpload(code, parts)
}

class PartHttpError extends Error {
  readonly status: number

  constructor(status: number) {
    super(status === 403 ? 'Storage rejected the upload (link expired or CORS).' : `Storage returned HTTP ${status}.`)
    this.status = status
  }
}

/** PUT with upload progress (fetch can't report it) and the ETag needed to complete the upload. */
function putBlob(url: string, blob: Blob, signal: AbortSignal, onProgress: (loaded: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const onAbort = () => xhr.abort()
    xhr.open('PUT', url)
    xhr.upload.onprogress = e => onProgress(e.loaded)
    xhr.onload = () => {
      signal.removeEventListener('abort', onAbort)
      if (xhr.status < 200 || xhr.status >= 300) return reject(new PartHttpError(xhr.status))
      const etag = xhr.getResponseHeader('ETag')
      if (!etag) return reject(new Error('Storage did not expose the ETag header. Add "ETag" to the bucket CORS ExposeHeaders.'))
      resolve(etag)
    }
    xhr.onerror = () => {
      signal.removeEventListener('abort', onAbort)
      reject(new Error('Network error while uploading.'))
    }
    xhr.onabort = () => reject(new UploadAbortedError())
    signal.addEventListener('abort', onAbort, { once: true })
    xhr.send(blob)
  })
}
