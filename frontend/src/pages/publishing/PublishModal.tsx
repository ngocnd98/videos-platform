import { useState, type FormEvent } from 'react'
import { Camera, CircleCheck, CircleHelp, CircleX, Music2, Play, type LucideIcon } from 'lucide-react'
import { usePublish, validPlatformUrl } from '../../api/publishing'
import type { Platform, PublishingVideo } from '../../api/types'
import { Modal } from '../../ui/Modal'
import { useToast } from '../../ui/Toast'

const PLATFORMS: { name: Platform; icon: LucideIcon; placeholder: string }[] = [
  { name: 'YouTube', icon: Play, placeholder: 'https://youtube.com/watch?v=…' },
  { name: 'TikTok', icon: Music2, placeholder: 'https://www.tiktok.com/@creator/video/…' },
  { name: 'Instagram', icon: Camera, placeholder: 'https://www.instagram.com/reel/…' },
]

interface Props {
  videos: PublishingVideo[]
  initialCode?: string
  onClose: () => void
}

export function PublishModal({ videos, initialCode, onClose }: Props) {
  const toast = useToast()
  const publish = usePublish()
  const [code, setCode] = useState(initialCode ?? videos[0]?.code ?? '')
  const video = videos.find(v => v.code === code)
  const existing = (p: Platform) => video?.platforms.find(l => l.platform === p)?.url ?? ''

  const [selected, setSelected] = useState<Platform[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')

  const pickVideo = (next: string) => {
    setCode(next)
    setSelected([])
    setUrls({})
  }

  const toggle = (p: Platform) => {
    setSelected(list => (list.includes(p) ? list.filter(x => x !== p) : [...list, p]))
    // Editing an existing link starts from the current value.
    setUrls(u => (u[p] === undefined ? { ...u, [p]: existing(p) } : u))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!video) return
    if (!selected.length) return toast('Select at least one platform.', 'error')
    const invalid = selected.find(p => !validPlatformUrl(p, urls[p] ?? ''))
    if (invalid) {
      document.getElementById(`url-${invalid}`)?.focus()
      return toast(`Enter a valid ${invalid} URL.`, 'error')
    }
    publish.mutate(
      { code, publications: selected.map(p => ({ platform: p, url: urls[p].trim() })), note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast(`Publishing record saved for ${selected.length} platform${selected.length > 1 ? 's' : ''}.`)
          onClose()
        },
        onError: err => toast(err.message, 'error'),
      },
    )
  }

  return (
    <Modal title="Record manual publishing" subtitle="Add the live links for a video published outside PulseMedia Hub." onClose={onClose}>
      {videos.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">No approved videos yet. Approve a submission in Content review first.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4 p-5">
          <div>
            <label htmlFor="publishVideo" className="mb-1.5 block text-xs font-semibold text-slate-700">Video</label>
            <select id="publishVideo" className="input" value={code} onChange={e => pickVideo(e.target.value)}>
              {videos.map(v => (
                <option key={v.code} value={v.code}>
                  {v.title} · {v.creator}
                  {v.status === 'PUBLISHED' ? ' (published)' : ''}
                </option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-slate-700">Platforms</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {PLATFORMS.map(({ name, icon: Icon }) => (
                <label key={name} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <input type="checkbox" className="check h-4 w-4 rounded" checked={selected.includes(name)} onChange={() => toggle(name)} />
                  <span className="flex items-center gap-1.5">
                    <Icon className="h-4 w-4" />
                    {name}
                    {existing(name) && <span className="text-[10px] font-normal text-emerald-600">· live</span>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {selected.length > 0 && (
            <div className="space-y-3">
              {PLATFORMS.filter(p => selected.includes(p.name)).map(({ name, placeholder }) => (
                <UrlField key={name} platform={name} placeholder={placeholder} value={urls[name] ?? ''} onChange={v => setUrls(u => ({ ...u, [name]: v }))} />
              ))}
            </div>
          )}
          <div>
            <label htmlFor="publishNotes" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Notes <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea id="publishNotes" rows={2} maxLength={500} className="input resize-y" placeholder="Add any context for your team" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary rounded-lg px-4 py-2 text-xs font-semibold">Cancel</button>
            <button type="submit" disabled={publish.isPending} className="btn-primary rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-60">
              Confirm published
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

function UrlField({ platform, placeholder, value, onChange }: { platform: Platform; placeholder: string; value: string; onChange: (v: string) => void }) {
  const ok = validPlatformUrl(platform, value)
  const state = !value ? 'empty' : ok ? 'ok' : 'bad'
  return (
    <div>
      <label htmlFor={`url-${platform}`} className="mb-1.5 block text-xs font-semibold text-slate-700">
        {platform} URL <span className="text-rose-500">*</span>
      </label>
      <div className="relative">
        <input
          id={`url-${platform}`}
          type="url"
          required
          className={`input !pr-10 ${state === 'ok' ? '!border-emerald-400 !ring-2 !ring-emerald-100' : state === 'bad' ? '!border-rose-400 !ring-2 !ring-rose-100' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {state === 'ok' ? <CircleCheck className="h-4 w-4 text-emerald-600" /> : state === 'bad' ? <CircleX className="h-4 w-4 text-rose-500" /> : <CircleHelp className="h-4 w-4 text-slate-300" />}
        </span>
      </div>
      <p className={`mt-1 text-[10px] ${state === 'ok' ? 'text-emerald-600' : state === 'bad' ? 'text-rose-500' : 'text-slate-400'}`}>
        {state === 'ok' ? 'Valid platform URL.' : state === 'bad' ? `Enter a valid ${platform} URL.` : `Paste the public ${platform} link. URL is checked as you type.`}
      </p>
    </div>
  )
}
