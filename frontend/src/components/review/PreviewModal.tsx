import { FileVideo, Tag } from 'lucide-react'
import { useReviewDetail } from '../../api/review'
import { Badge } from '../../ui/common'
import { Modal } from '../../ui/Modal'
import { STATUS_LABEL, formatDuration, formatRelativeDay } from '../../ui/format'
import { formatBytes } from '../../upload/videoFile'

interface Props {
  code: string
  onClose: () => void
  onApprove: (code: string, title: string) => void
  onReject: (code: string, title: string) => void
  busy: boolean
}

export function PreviewModal({ code, onClose, onApprove, onReject, busy }: Props) {
  const { data: v, isPending, error } = useReviewDetail(code)
  const subtitle = v ? [v.creator, v.category, formatDuration(v.durationSec)].filter(Boolean).join(' · ') : code

  return (
    <Modal title="Video preview" subtitle={subtitle} wide onClose={onClose}>
      <div className="p-5">
        {isPending && <div className="aspect-video animate-pulse rounded-xl bg-slate-100" />}
        {error && <div className="rounded-xl bg-rose-50 p-6 text-center text-xs text-rose-700">{error.message}</div>}
        {v && (
          <>
            {v.previewUrl ? (
              // Vertical shorts are letterboxed inside a 16:9 frame.
              <video
                key={v.previewUrl}
                src={v.previewUrl}
                poster={v.thumbnailUrl}
                controls
                autoPlay
                muted
                playsInline
                className="aspect-video w-full rounded-xl bg-slate-900 object-contain"
              />
            ) : (
              <div className={`flex aspect-video items-center justify-center rounded-xl bg-gradient-to-br ${v.thumbColor} text-xs font-semibold text-slate-700`}>
                No playable file for this video.
              </div>
            )}
            <div className="mt-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900">{v.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {v.submittedAt ? `Submitted ${formatRelativeDay(v.submittedAt)} · ` : ''}
                  {v.code}
                </p>
              </div>
              <Badge text={STATUS_LABEL[v.status]} />
            </div>
            {v.description && <p className="mt-3 text-xs leading-relaxed text-slate-600">{v.description}</p>}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
              {v.fileName && (
                <span className="inline-flex items-center gap-1.5">
                  <FileVideo className="h-3.5 w-3.5" />
                  {v.fileName}
                  {v.sizeBytes ? ` · ${formatBytes(v.sizeBytes)}` : ''}
                </span>
              )}
              {v.tags && (
                <span className="inline-flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  {v.tags.split(',').join(', ')}
                </span>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="btn-secondary rounded-lg px-4 py-2 text-xs font-semibold">Close</button>
              {v.status === 'IN_REVIEW' && (
                <>
                  <button onClick={() => onReject(v.code, v.title)} className="btn-secondary rounded-lg px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                    Reject
                  </button>
                  <button onClick={() => onApprove(v.code, v.title)} disabled={busy} className="btn-primary rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-60">
                    Approve video
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
