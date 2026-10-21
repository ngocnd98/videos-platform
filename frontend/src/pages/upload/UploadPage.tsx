import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Check, CircleCheck, Clock3, CloudUpload, Copyright, HardDrive, LoaderCircle, RefreshCw, RotateCw, Save, Send, Smartphone, TextSearch, Trash2, Upload, WifiOff,
  type LucideIcon,
} from 'lucide-react'
import { useSettings } from '../../api/admin'
import { ApiError } from '../../api/client'
import type { Video } from '../../api/types'
import { useCategories, videoApi } from '../../api/videos'
import { CardHeading, TitleBlock } from '../../ui/common'
import { useToast } from '../../ui/Toast'
import { fileKeyOf, loadCheckpoint, saveCheckpoint, type FormValues, type UploadCheckpoint } from '../../upload/checkpoint'
import { UploadAbortedError, uploadOriginal } from '../../upload/multipartUpload'
import { captureThumbnail, formatBytes, readDuration } from '../../upload/videoFile'
import { UploadsTable } from './UploadsTable'

const EMPTY_FORM: FormValues = { title: '', categoryId: '', tags: '', description: '', language: 'English' }
const LANGUAGES = ['English', 'Spanish', 'French', 'Portuguese', 'Other']
const MAX_TAGS = 10

const tagCount = (tags: string) => tags.split(',').filter(t => t.trim()).length

type Status = 'idle' | 'ready' | 'uploading' | 'interrupted' | 'complete'
type Phase = 'storage' | 'submission'

export function UploadPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { data: categories = [] } = useCategories()
  const { data: settings } = useSettings()
  const limitGb = settings?.uploadLimitGb ?? 2
  const maxBytes = limitGb * 1024 ** 3
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // A checkpoint from an earlier visit puts the page straight into the "interrupted" state.
  const [restored] = useState(loadCheckpoint)
  const [status, setStatus] = useState<Status>(restored ? 'interrupted' : 'idle')
  const [phase, setPhase] = useState<Phase>(restored?.phase ?? 'storage')
  const [storagePct, setStoragePct] = useState(restored?.progress ?? 0)
  const [uploadedBytes, setUploadedBytes] = useState(0)
  const [submissionPct, setSubmissionPct] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [fileLabel, setFileLabel] = useState(restored ? { name: restored.fileName, size: restored.fileSize } : null)
  const [code, setCode] = useState<string | null>(restored?.code ?? null)
  const [values, setValues] = useState<FormValues>({ ...EMPTY_FORM, ...restored?.metadata })
  const [savingDraft, setSavingDraft] = useState(false)
  // Drafts created by this form (not ones reopened from "Your uploads") are discarded with "Remove file".
  const [createdHere, setCreatedHere] = useState(!!restored)
  const [autoThumbnail, setAutoThumbnail] = useState(true)
  const [dragging, setDragging] = useState(false)
  // Whether the current draft has an upload session on the server that can be resumed.
  const [hasSession, setHasSession] = useState(!!restored && restored.phase === 'storage')

  // Updated synchronously from upload callbacks, so the checkpoint written on interruption is current.
  const progressRef = useRef(storagePct)

  useEffect(() => {
    const onOffline = () => abortRef.current?.abort()
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('offline', onOffline)
      abortRef.current?.abort()
    }
  }, [])

  const persist = (patch: Partial<UploadCheckpoint> & { code: string }, f: File) => {
    const ok = saveCheckpoint({
      fileKey: fileKeyOf(f),
      fileName: f.name,
      fileSize: f.size,
      phase,
      progress: progressRef.current,
      metadata: values,
      ...patch,
    })
    if (!ok) toast('Upload progress could not be saved in this browser.', 'error')
  }

  const chooseFile = (picked: File | undefined) => {
    if (!picked) return
    if (!picked.type.startsWith('video/')) return toast('Choose a video file to upload.', 'error')
    if (picked.size > maxBytes) return toast(`This video is larger than the ${limitGb} GB upload limit.`, 'error')

    if (status === 'interrupted' && restored && fileKeyOf(picked) === restored.fileKey && code === restored.code) {
      setFile(picked)
      setFileLabel({ name: picked.name, size: picked.size })
      return toast(`Saved checkpoint found at ${storagePct}%. Retry to continue.`)
    }
    if (status === 'uploading') return
    if (status === 'complete') {
      // Starting a new video after the last one was saved.
      setCode(null)
      setValues(EMPTY_FORM)
    }
    setFile(picked)
    setFileLabel({ name: picked.name, size: picked.size })
    setStatus('ready')
    setPhase('storage')
    progressRef.current = 0
    setStoragePct(0)
    setUploadedBytes(0)
    setSubmissionPct(0)
    setHasSession(false)
    toast('File selected. You can remove it or replace it with another video.')
  }

  const reset = () => {
    abortRef.current?.abort()
    setFile(null)
    setFileLabel(null)
    setCode(null)
    setValues(EMPTY_FORM)
    setStatus('idle')
    setPhase('storage')
    progressRef.current = 0
    setStoragePct(0)
    setUploadedBytes(0)
    setSubmissionPct(0)
    setHasSession(false)
    setCreatedHere(false)
    saveCheckpoint(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const removeFile = async () => {
    // An unfinished draft has no value without its file; drop it so it doesn't clutter "Your uploads".
    if (code && createdHere && status !== 'complete') {
      await videoApi.remove(code).catch(() => undefined)
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    }
    reset()
  }

  const metadataFrom = async (f?: File) => ({
    title: values.title.trim(),
    categoryId: Number(values.categoryId),
    tags: values.tags || undefined,
    description: values.description || undefined,
    language: values.language || 'English',
    durationSec: f ? await readDuration(f) : undefined,
  })

  const run = async (restart: boolean) => {
    if (!file) {
      toast('Select the same video file to resume this upload.', 'error')
      inputRef.current?.click()
      return
    }
    if (!formRef.current?.reportValidity()) return
    if (tagCount(values.tags) > MAX_TAGS) return toast('A video can have up to 10 tags.', 'error')

    const controller = new AbortController()
    abortRef.current = controller
    setStatus('uploading')
    const f = file
    let videoCode = code
    let currentPhase: Phase = restart ? 'storage' : phase

    try {
      const metadata = await metadataFrom(f)
      if (!videoCode) {
        videoCode = (await videoApi.create(metadata)).code
        setCode(videoCode)
        setCreatedHere(true)
        queryClient.invalidateQueries({ queryKey: ['videos'] })
      }

      if (currentPhase === 'storage') {
        setPhase('storage')
        persist({ code: videoCode, phase: 'storage' }, f)
        const onProgress = ({ uploadedBytes: done, totalBytes }: { uploadedBytes: number; totalBytes: number }) => {
          progressRef.current = Math.floor((done / totalBytes) * 100)
          setUploadedBytes(done)
          setStoragePct(progressRef.current)
        }
        try {
          await uploadOriginal({ code: videoCode, file: f, resume: hasSession && !restart, signal: controller.signal, onProgress })
        } catch (e) {
          // The server forgot the session (it restarts with fresh data) or the draft is gone: start over.
          if (e instanceof ApiError && (e.status === 410 || e.status === 404)) {
            toast('The previous upload session expired, so the upload starts again from 0%.', 'error')
            if (e.status === 404) {
              videoCode = (await videoApi.create(metadata)).code
              setCode(videoCode)
            }
            progressRef.current = 0
            setStoragePct(0)
            await uploadOriginal({ code: videoCode, file: f, resume: false, signal: controller.signal, onProgress })
          } else {
            throw e
          }
        } finally {
          setHasSession(true)
        }
        progressRef.current = 100
        setStoragePct(100)
        currentPhase = 'submission'
        setPhase('submission')
        persist({ code: videoCode, phase: 'submission', progress: 100 }, f)
      }

      // Save the draft: sync the latest form values and attach a thumbnail. Submitting is a separate step.
      setSubmissionPct(15)
      await videoApi.update(videoCode, metadata)
      if (controller.signal.aborted) throw new UploadAbortedError()
      setSubmissionPct(45)
      if (autoThumbnail) {
        const frame = await captureThumbnail(f)
        if (frame) await videoApi.uploadThumbnail(videoCode, frame).catch(() => undefined)
      }
      if (controller.signal.aborted) throw new UploadAbortedError()
      setSubmissionPct(100)
      setStatus('complete')
      saveCheckpoint(null)
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast('Upload complete. Your video is saved as a draft.')
    } catch (e) {
      setStatus('interrupted')
      if (videoCode) persist({ code: videoCode, phase: currentPhase, progress: progressRef.current }, f)
      if (e instanceof UploadAbortedError) {
        toast(`Connection lost. Your upload is saved at ${progressRef.current}%.`)
      } else {
        toast(e instanceof Error ? e.message : 'Upload failed.', 'error')
      }
    } finally {
      abortRef.current = null
    }
  }

  const submitForReview = async () => {
    if (!code) return
    try {
      await videoApi.submit(code)
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast('Video submitted for review.')
      reset()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not submit the video.', 'error')
    }
  }

  /** Metadata-only draft; the file can be added later from "Your uploads". */
  const saveDraft = async () => {
    if (status === 'uploading' || status === 'complete') {
      return toast('Wait for the current upload to finish before saving another draft.', 'error')
    }
    if (!values.title.trim() || !values.categoryId) {
      document.getElementById(!values.title.trim() ? 'videoTitle' : 'videoCategory')?.focus()
      return toast('Add a title and category before saving the draft.', 'error')
    }
    if (tagCount(values.tags) > MAX_TAGS) return toast('A video can have up to 10 tags.', 'error')
    setSavingDraft(true)
    try {
      const metadata = await metadataFrom()
      if (code) await videoApi.update(code, metadata)
      else await videoApi.create(metadata)
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      abortRef.current?.abort()
      reset()
      toast('Draft saved. You can edit it or submit it for review later.')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save the draft.', 'error')
    } finally {
      setSavingDraft(false)
    }
  }

  /** Loads a draft without a stored file into the form so its file can be uploaded. */
  const continueDraft = (video: Video) => {
    if (status === 'uploading') return toast('Wait for the current upload to finish first.', 'error')
    abortRef.current?.abort()
    reset()
    setCode(video.code)
    setValues({
      title: video.title,
      categoryId: video.categoryId ? String(video.categoryId) : '',
      tags: video.tags ?? '',
      description: video.description ?? '',
      language: video.language ?? 'English',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
    toast(`Select the video file for “${video.title}”.`)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!file) return toast('Select a video file before uploading.', 'error')
    run(false)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    chooseFile(e.dataTransfer.files[0])
  }

  const locked = status === 'uploading' || status === 'complete'
  const set = (key: keyof FormValues) => (e: { target: { value: string } }) => setValues(v => ({ ...v, [key]: e.target.value }))

  return (
    <>
      <TitleBlock
        eyebrow="Creator portal"
        title="Upload your content"
        description="Share your next video with the PulseMedia creator network."
        action={
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-50 px-3 py-2 text-[10px] font-semibold text-emerald-700 sm:self-auto">
            <HardDrive className="h-3.5 w-3.5" />
            Up to {limitGb} GB per video
          </span>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <section className="card p-5 sm:p-6">
          <div
            role="button"
            tabIndex={0}
            onClick={() => !locked && inputRef.current?.click()}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && !locked && inputRef.current?.click()}
            onDragOver={e => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-5 py-9 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40 ${dragging ? 'drop-active' : ''}`}
          >
            <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={e => chooseFile(e.target.files?.[0])} />
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <CloudUpload className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-sm font-semibold text-slate-800">
              Drop your video here, or <span className="text-indigo-600">browse files</span>
            </h2>
            <p className="mt-1.5 text-xs text-slate-500">MP4, MOV or WebM · Up to {limitGb} GB</p>
            {fileLabel && (
              <div className="mt-3 flex items-center justify-center gap-3 text-xs font-medium text-indigo-700">
                <span className="max-w-[min(65vw,340px)] truncate">
                  {fileLabel.name} · {formatBytes(fileLabel.size)}
                </span>
                {status !== 'uploading' && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      removeFile()
                    }}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-50"
                    aria-label="Remove selected video"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {status === 'complete' ? 'Clear' : 'Remove file'}
                  </button>
                )}
              </div>
            )}
          </div>

          {status !== 'idle' && (
            <ProgressPanel
              status={status}
              phase={phase}
              storagePct={storagePct}
              submissionPct={submissionPct}
              uploadedBytes={uploadedBytes}
              totalBytes={fileLabel?.size ?? 0}
              hasFile={!!file}
              onResume={() => run(false)}
              onRestart={() => run(true)}
              onDisconnect={() => abortRef.current?.abort()}
              onNew={reset}
              onSubmitForReview={submitForReview}
            />
          )}

          <form ref={formRef} onSubmit={onSubmit} className="mt-5 space-y-4">
            <fieldset disabled={locked} className="space-y-4">
              <div>
                <label htmlFor="videoTitle" className="mb-1.5 block text-xs font-semibold text-slate-700">Video title</label>
                <input id="videoTitle" className="input" required maxLength={100} placeholder="Give your video a clear, catchy title" value={values.title} onChange={set('title')} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="videoCategory" className="mb-1.5 block text-xs font-semibold text-slate-700">Category</label>
                  <select id="videoCategory" className="input" required value={values.categoryId} onChange={set('categoryId')}>
                    <option value="">Select a category</option>
                    {categories
                      .filter(c => c.visible || String(c.id) === values.categoryId)
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="videoLanguage" className="mb-1.5 block text-xs font-semibold text-slate-700">Video language</label>
                  <select id="videoLanguage" className="input" value={values.language ?? 'English'} onChange={set('language')}>
                    {LANGUAGES.map(l => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="videoTags" className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Tags <span className="font-normal text-slate-400">(optional · max 10)</span>
                </label>
                <input id="videoTags" className="input" maxLength={200} placeholder="Add up to 10 tags, separated by commas" value={values.tags} onChange={set('tags')} />
              </div>
              <div>
                <label htmlFor="videoDescription" className="mb-1.5 block text-xs font-semibold text-slate-700">Description</label>
                <textarea id="videoDescription" rows={3} maxLength={500} className="input resize-y" placeholder="What should viewers know about this video?" value={values.description} onChange={set('description')} />
              </div>
              <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3 sm:flex-row sm:items-center">
                <div>
                  <div className="text-xs font-semibold text-slate-700">Auto-generated thumbnail</div>
                  <div className="mt-1 text-[10px] text-slate-500">Choose a frame from your video automatically</div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" checked={autoThumbnail} onChange={e => setAutoThumbnail(e.target.checked)} className="peer sr-only" />
                  <span className="h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600" />
                  <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-4" />
                  <span className="sr-only">Enable auto-generated thumbnail</span>
                </label>
              </div>
            </fieldset>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={saveDraft}
                disabled={locked || savingDraft}
                className="btn-secondary inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                Save as draft
              </button>
              <SubmitButton status={status} phase={phase} storagePct={storagePct} submissionPct={submissionPct} />
            </div>
          </form>
        </section>

        <section className="card h-fit overflow-hidden">
          <CardHeading title="Upload checklist" subtitle="A few tips for a smooth review." />
          <div className="space-y-4 p-5">
            <ChecklistItem icon={Copyright} title="Keep it original" text="Only upload content you created or have permission to share." />
            <ChecklistItem icon={Smartphone} title="Make it mobile-ready" text="Vertical video performs best as a short-form post." />
            <ChecklistItem icon={TextSearch} title="Add useful context" text="Clear titles and descriptions help viewers discover your content." />
            <ChecklistItem icon={Clock3} title="Review takes 24 hours" text="We’ll notify you as soon as your video is approved." />
          </div>
        </section>
      </div>

      <UploadsTable onContinue={continueDraft} />
    </>
  )
}

function ChecklistItem({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="text-xs font-semibold text-slate-800">{title}</div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{text}</p>
      </div>
    </div>
  )
}

function SubmitButton({ status, phase, storagePct, submissionPct }: { status: Status; phase: Phase; storagePct: number; submissionPct: number }) {
  const [Icon, label] =
    status === 'interrupted'
      ? [WifiOff, 'Upload interrupted']
      : status === 'complete'
        ? [Check, 'Upload complete · draft saved']
        : status === 'uploading'
          ? [LoaderCircle, phase === 'storage' ? `Uploading · ${storagePct}%` : `Saving · ${submissionPct}%`]
          : [Upload, 'Upload video']
  return (
    <button
      type="submit"
      disabled={status === 'uploading' || status === 'complete' || status === 'interrupted'}
      className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Icon className={`h-4 w-4 ${status === 'uploading' ? 'animate-spin' : ''}`} />
      {label}
    </button>
  )
}

interface ProgressPanelProps {
  status: Status
  phase: Phase
  storagePct: number
  submissionPct: number
  uploadedBytes: number
  totalBytes: number
  hasFile: boolean
  onResume: () => void
  onRestart: () => void
  onDisconnect: () => void
  onNew: () => void
  onSubmitForReview: () => void
}

function ProgressPanel(p: ProgressPanelProps) {
  const { status, phase, storagePct, submissionPct } = p
  const uploading = status === 'uploading'
  const complete = status === 'complete'
  const interrupted = status === 'interrupted'
  const storageDone = storagePct === 100 || phase === 'submission' || complete

  const statusText = uploading
    ? phase === 'storage'
      ? `Uploading to cloud storage · ${storagePct}%`
      : `Saving draft · ${submissionPct}%`
    : complete
      ? 'Upload complete — draft saved'
      : interrupted
        ? phase === 'storage'
          ? `Connection interrupted · ${storagePct}% saved`
          : 'Storage complete · final submission paused'
        : 'File ready · Submit to start the upload'

  return (
    <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3.5">
      <div className="mb-4 flex items-center justify-between gap-3 text-[11px]">
        <span className={`font-semibold ${interrupted ? 'text-amber-800' : 'text-indigo-900'}`}>{statusText}</span>
        <span className="font-semibold text-indigo-700">{complete ? 100 : storagePct}%</span>
      </div>
      <div className="space-y-3">
        <ProgressBar
          icon={storageDone ? CircleCheck : CloudUpload}
          label="Upload video to cloud storage"
          detail={phase === 'storage' && p.uploadedBytes > 0 ? `${formatBytes(p.uploadedBytes)} of ${formatBytes(p.totalBytes)}` : undefined}
          pct={complete ? 100 : storagePct}
          barClass={interrupted && phase === 'storage' ? 'bg-amber-500' : 'bg-indigo-600'}
          trackClass="bg-indigo-100"
        />
        {storageDone && (
          <ProgressBar
            icon={complete ? CircleCheck : Send}
            label={complete ? 'Draft saved · ready to submit' : 'Saving submission details'}
            pct={complete ? 100 : submissionPct}
            barClass={complete ? 'bg-emerald-500' : 'bg-indigo-600'}
            trackClass="bg-slate-200"
          />
        )}
      </div>

      {interrupted && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={p.onResume} disabled={!p.hasFile} className="btn-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-60">
              <RotateCw className="h-3.5 w-3.5" />
              {phase === 'submission' ? 'Retry submission' : `Retry from ${storagePct}%`}
            </button>
            <button type="button" onClick={p.onRestart} disabled={!p.hasFile} className="btn-secondary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-60">
              <RefreshCw className="h-3.5 w-3.5" />
              Restart from 0%
            </button>
          </div>
          {!p.hasFile && <div className="mt-2 text-[10px] text-amber-700">Select the same file to resume this saved checkpoint.</div>}
        </>
      )}
      {uploading && (
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={p.onDisconnect} className="btn-secondary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold">
            <WifiOff className="h-3.5 w-3.5" />
            Simulate connection loss
          </button>
        </div>
      )}
      {complete && (
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={p.onNew} className="btn-secondary rounded-lg px-3 py-2 text-[10px] font-semibold">
            Upload another video
          </button>
          <button type="button" onClick={p.onSubmitForReview} className="btn-primary rounded-lg px-3 py-2 text-[10px] font-semibold">
            Submit for review
          </button>
        </div>
      )}
    </div>
  )
}

function ProgressBar({ icon: Icon, label, detail, pct, barClass, trackClass }: { icon: LucideIcon; label: string; detail?: string; pct: number; barClass: string; trackClass: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px]">
        <span className="font-semibold text-slate-700">
          <Icon className="mr-1 inline h-3.5 w-3.5" />
          {label}
        </span>
        <span className="font-semibold text-indigo-700">
          {detail && <span className="mr-2 font-medium text-slate-500">{detail}</span>}
          {pct}%
        </span>
      </div>
      <div className={`h-2 overflow-hidden rounded-full ${trackClass}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className={`h-full rounded-full ${barClass} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
