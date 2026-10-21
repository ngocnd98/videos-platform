import { useState, type FormEvent } from 'react'
import { useRejectionReasons } from '../../api/review'
import { Modal } from '../../ui/Modal'

interface Props {
  onClose: () => void
  onSubmit: (reason: string, note: string) => void
  busy: boolean
}

export function RejectModal({ onClose, onSubmit, busy }: Props) {
  const { data: reasons = [] } = useRejectionReasons()
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (reason) onSubmit(reason, note.trim())
  }

  return (
    <Modal title="Reject video" subtitle="Choose a reason so the creator knows what to address." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <div>
          <label htmlFor="rejectReason" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Rejection reason <span className="text-rose-500">*</span>
          </label>
          <select id="rejectReason" required className="input" value={reason} onChange={e => setReason(e.target.value)}>
            <option value="">Select a reason</option>
            {reasons.map(r => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rejectNote" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Additional feedback <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea id="rejectNote" rows={3} maxLength={300} className="input resize-y" placeholder="Add a helpful note for the creator" value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary rounded-lg px-4 py-2 text-xs font-semibold">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60">
            Reject video
          </button>
        </div>
      </form>
    </Modal>
  )
}
