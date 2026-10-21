import { useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { usePublishingVideos } from '../../api/publishing'
import { useSettings } from '../../api/admin'
import { currentPeriod, parseDollars, useAddRevenue, useImportRevenue } from '../../api/revenue'
import type { Platform } from '../../api/types'
import { Modal } from '../../ui/Modal'
import { useToast } from '../../ui/Toast'

export function ManualEntryModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const add = useAddRevenue()
  const { data: videos = [] } = usePublishingVideos('PUBLISHED')
  const { data: settings } = useSettings()
  const enabled = (p: Platform) => settings?.platforms.find(s => s.name === p)?.enabled ?? true
  const [code, setCode] = useState('')
  const [platform, setPlatform] = useState<Platform | ''>('')
  const [period, setPeriod] = useState(currentPeriod())
  const [gross, setGross] = useState('')

  const video = videos.find(v => v.code === code)
  const platforms = (video?.platforms.map(p => p.platform) ?? []).filter(enabled)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const amount = parseDollars(gross)
    if (!video || !platform) return
    if (amount === null) return toast('Enter an amount like 1240.50.', 'error')
    add.mutate(
      { videoCode: code, platform, period, gross: amount },
      {
        onSuccess: () => {
          toast('Revenue entry added and split calculated.')
          onClose()
        },
        onError: err => toast(err.message, 'error'),
      },
    )
  }

  return (
    <Modal title="Add revenue entry" subtitle="Record gross platform revenue. Creator payout updates automatically." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <div>
          <label htmlFor="revVideo" className="mb-1.5 block text-xs font-semibold text-slate-700">Video</label>
          <select
            id="revVideo"
            required
            className="input"
            value={code}
            onChange={e => {
              setCode(e.target.value)
              const v = videos.find(x => x.code === e.target.value)
              setPlatform(v?.platforms.map(p => p.platform).find(enabled) ?? '')
            }}
          >
            <option value="">Select a published video</option>
            {videos.map(v => (
              <option key={v.code} value={v.code}>{v.title} · {v.creator}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="revPlatform" className="mb-1.5 block text-xs font-semibold text-slate-700">Platform</label>
            <select id="revPlatform" required className="input" value={platform} onChange={e => setPlatform(e.target.value as Platform)} disabled={!video}>
              {!video && <option value="">—</option>}
              {platforms.map(p => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="revPeriod" className="mb-1.5 block text-xs font-semibold text-slate-700">Month</label>
            <input id="revPeriod" type="month" required className="input" value={period} onChange={e => setPeriod(e.target.value)} />
          </div>
          <div>
            <label htmlFor="revGross" className="mb-1.5 block text-xs font-semibold text-slate-700">Gross (USD)</label>
            <input id="revGross" inputMode="decimal" required className="input" placeholder="0.00" value={gross} onChange={e => setGross(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary rounded-lg px-4 py-2 text-xs font-semibold">Cancel</button>
          <button type="submit" disabled={add.isPending} className="btn-primary rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-60">Add revenue</button>
        </div>
      </form>
    </Modal>
  )
}

const SAMPLE_CSV = 'Video ID,Video title,Platform,Gross revenue\nV-2406,Weekend reset routine,Instagram,310.00\n,Tokyo in 60 seconds,YouTube,"1,250.75"\n'

export function ImportModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const importer = useImportRevenue()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [period, setPeriod] = useState(currentPeriod())
  const [dragging, setDragging] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const pick = (f: File | undefined) => {
    if (!f) return
    setProblem(null)
    if (f.size > 10 * 1024 * 1024) return toast('The file exceeds the 10 MB limit.', 'error')
    if (!/\.csv$/i.test(f.name)) return toast('Upload a .csv file. Excel workbooks can be saved as CSV first.', 'error')
    setFile(f)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    pick(e.dataTransfer.files[0])
  }

  const sampleUrl = useMemo(() => URL.createObjectURL(new Blob([SAMPLE_CSV], { type: 'text/csv' })), [])

  const submit = () => {
    if (!file) return toast('Choose a CSV file to import.', 'error')
    importer.mutate(
      { file, period },
      {
        onSuccess: r => {
          toast(`${r.imported} revenue row${r.imported === 1 ? '' : 's'} imported.`)
          onClose()
        },
        onError: err => setProblem(err.message),
      },
    )
  }

  return (
    <Modal title="Import revenue data" subtitle="Upload a CSV export from your platform." onClose={onClose}>
      <div className="p-5">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          onDragOver={e => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center hover:border-indigo-300 hover:bg-indigo-50/40 ${dragging ? 'drop-active' : ''}`}
        >
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => pick(e.target.files?.[0])} />
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <FileSpreadsheet className="h-5 w-5" />
          </span>
          <div className="mt-3 text-xs font-semibold text-slate-800">
            {file ? file.name : <>Drop your report here, or <span className="text-indigo-600">browse files</span></>}
          </div>
          <div className="mt-1 text-[10px] text-slate-500">CSV · Max 10 MB</div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="rounded-lg bg-slate-50 p-3 text-[10px] leading-relaxed text-slate-500">
            <strong className="text-slate-700">Expected columns:</strong> Video ID or Video title, Platform, Gross revenue, and optionally Period
            (YYYY-MM). Creator payout is calculated using each contract’s split.{' '}
            <a href={sampleUrl} download="revenue-sample.csv" className="font-semibold text-indigo-600">Download a sample</a>
          </div>
          <div>
            <label htmlFor="importPeriod" className="mb-1.5 block text-[10px] font-semibold text-slate-700">Month (if no Period column)</label>
            <input id="importPeriod" type="month" className="input !py-2 text-xs" value={period} onChange={e => setPeriod(e.target.value)} />
          </div>
        </div>
        {problem && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-[11px] leading-relaxed text-rose-700">{problem}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary rounded-lg px-4 py-2 text-xs font-semibold">Cancel</button>
          <button onClick={submit} disabled={importer.isPending} className="btn-primary rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-60">Import data</button>
        </div>
      </div>
    </Modal>
  )
}
