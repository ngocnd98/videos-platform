import { useState } from 'react'
import { useMyVideos } from '../../api/videos'
import type { VideoStatus } from '../../api/types'
import { Badge, CardHeading, Thumb } from '../../ui/common'
import { STATUS_LABEL, compactNumber, formatDate } from '../../ui/format'

const FILTERS: (VideoStatus | 'ALL')[] = ['ALL', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED']

export function UploadsTable() {
  const [filter, setFilter] = useState<VideoStatus | 'ALL'>('ALL')
  const { data = [], isPending, error } = useMyVideos(filter === 'ALL' ? undefined : filter)

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
        subtitle="Manage drafts and see the status of every submission."
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
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Video</th>
              <th className="px-4 py-3 font-semibold">Uploaded</th>
              <th className="px-4 py-3 font-semibold">Views</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-500">{empty}</td>
              </tr>
            )}
            {data.map(v => (
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
