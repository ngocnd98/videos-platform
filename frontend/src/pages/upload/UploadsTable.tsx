import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMyVideos, videoApi } from '../../api/videos'
import type { Video, VideoStatus } from '../../api/types'
import { Badge, CardHeading, Thumb } from '../../ui/common'
import { STATUS_LABEL, compactNumber, formatDate } from '../../ui/format'
import { useToast } from '../../ui/Toast'
import { EditVideoModal } from './EditVideoModal'

const FILTERS: (VideoStatus | 'ALL')[] = ['ALL', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED']

const hasFile = (v: Video) => v.original?.status === 'AVAILABLE'

/** `onContinue` reopens a draft without a stored file in the upload form above. */
export function UploadsTable({ onContinue }: { onContinue: (video: Video) => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<VideoStatus | 'ALL'>('ALL')
  const [editing, setEditing] = useState<Video | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const { data = [], isPending, error } = useMyVideos(filter === 'ALL' ? undefined : filter)

  const act = async (video: Video, action: 'submit' | 'withdraw' | 'delete') => {
    if (action === 'delete' && !window.confirm(`Delete “${video.title}”? This cannot be undone.`)) return
    setBusy(video.code)
    try {
      if (action === 'submit') await videoApi.submit(video.code)
      else if (action === 'withdraw') await videoApi.withdraw(video.code)
      else await videoApi.remove(video.code)
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast(
        action === 'submit' ? 'Video submitted for review.' : action === 'withdraw' ? 'Submission withdrawn and saved as a draft.' : 'Video deleted.',
      )
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Something went wrong.', 'error')
    } finally {
      setBusy(null)
    }
  }

  const empty = isPending
    ? 'Loading your videos…'
    : error
      ? `Couldn’t load your videos: ${error.message}`
      : filter === 'ALL'
        ? 'No videos yet — upload your first one above.'
        : `No ${STATUS_LABEL[filter].toLowerCase()} videos to show.`

  return (
    <section className="card mt-5 overflow-hidden">
      <CardHeading
        title="Your uploads"
        subtitle="Edit or delete drafts and rejected videos; withdraw a submission until review begins."
        action={
          <div className="flex flex-wrap justify-end gap-1">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold ${filter === f ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                {f === 'ALL' ? 'All' : STATUS_LABEL[f]}
              </button>
            ))}
          </div>
        }
      />
      <div className="table-wrap">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Video</th>
              <th className="px-4 py-3 font-semibold">Uploaded</th>
              <th className="px-4 py-3 font-semibold">Views</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">{empty}</td>
              </tr>
            )}
            {data.map(v => {
              const editable = v.status === 'DRAFT' || v.status === 'REJECTED'
              const disabled = busy === v.code
              return (
                <tr key={v.code}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Thumb gradient={v.thumbColor} src={v.thumbnailUrl} />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800">{v.title}</div>
                        <div className="mt-1 text-[10px] text-slate-500">
                          {v.code} · {v.category}
                          {v.status === 'DRAFT' && !v.original && ' · No file yet'}
                          {v.status === 'DRAFT' && v.original?.status === 'UPLOADING' && ' · Upload unfinished'}
                        </div>
                        {v.rejectionReason && <div className="mt-1 text-[10px] text-rose-600">{v.rejectionReason}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">{formatDate(v.createdAt)}</td>
                  <td className="px-4 py-3.5 text-slate-600">{compactNumber(v.views)}</td>
                  <td className="px-5 py-3.5"><Badge text={STATUS_LABEL[v.status]} /></td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right">
                    {editable ? (
                      <>
                        <button onClick={() => setEditing(v)} disabled={disabled} className="btn-secondary rounded-lg px-2.5 py-1.5 text-[10px] font-semibold">Edit</button>
                        {hasFile(v) ? (
                          <button onClick={() => act(v, 'submit')} disabled={disabled} className="ml-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-700">Submit</button>
                        ) : (
                          <button onClick={() => onContinue(v)} disabled={disabled} className="ml-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-700">Add file</button>
                        )}
                        <button onClick={() => act(v, 'delete')} disabled={disabled} className="ml-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-rose-600">Delete</button>
                      </>
                    ) : v.status === 'IN_REVIEW' ? (
                      <button onClick={() => act(v, 'withdraw')} disabled={disabled} className="btn-secondary rounded-lg px-2.5 py-1.5 text-[10px] font-semibold">Withdraw</button>
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {editing && <EditVideoModal video={editing} onClose={() => setEditing(null)} />}
    </section>
  )
}
