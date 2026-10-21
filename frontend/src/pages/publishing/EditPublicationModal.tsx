import { useState, type FormEvent } from 'react'
import { useUpdatePublication, validPlatformUrl } from '../../api/publishing'
import type { Publication, PublicationStatus } from '../../api/types'
import { PUBLICATION_STATUS_LABEL } from '../../ui/common'
import { Modal } from '../../ui/Modal'
import { useToast } from '../../ui/Toast'
import { PLATFORMS, UrlField } from './PublishModal'

const STATUSES: PublicationStatus[] = ['PUBLISHED', 'REMOVED', 'NEEDS_ATTENTION']

export function EditPublicationModal({ publication, onClose }: { publication: Publication; onClose: () => void }) {
  const toast = useToast()
  const update = useUpdatePublication()
  const [channel, setChannel] = useState(publication.channel ?? '')
  const [url, setUrl] = useState(publication.url)
  const [status, setStatus] = useState<PublicationStatus>(publication.status)
  const [note, setNote] = useState(publication.note ?? '')
  const placeholder = PLATFORMS.find(p => p.name === publication.platform)?.placeholder ?? ''

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!validPlatformUrl(publication.platform, url)) return toast(`Enter a valid ${publication.platform} URL.`, 'error')
    update.mutate(
      { id: publication.id, channel: channel.trim(), url: url.trim(), status, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast('Publication record updated.')
          onClose()
        },
        onError: err => toast(err.message, 'error'),
      },
    )
  }

  return (
    <Modal title="Edit publication" subtitle={`${publication.title} · ${publication.platform}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <label className="block text-xs font-semibold text-slate-700">
          Channel
          <input required maxLength={80} className="input mt-1.5" value={channel} onChange={e => setChannel(e.target.value)} />
        </label>
        <UrlField platform={publication.platform} placeholder={placeholder} value={url} onChange={setUrl} />
        <label className="block text-xs font-semibold text-slate-700">
          Status
          <select className="input mt-1.5" value={status} onChange={e => setStatus(e.target.value as PublicationStatus)}>
            {STATUSES.map(s => (
              <option key={s} value={s}>{PUBLICATION_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-slate-700">
          Notes
          <textarea rows={2} maxLength={500} className="input mt-1.5" value={note} onChange={e => setNote(e.target.value)} />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary rounded-lg px-4 py-2 text-xs font-semibold">Cancel</button>
          <button type="submit" disabled={update.isPending} className="btn-primary rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-60">Save record</button>
        </div>
      </form>
    </Modal>
  )
}
