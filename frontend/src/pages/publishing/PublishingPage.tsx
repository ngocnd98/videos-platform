import { useState } from 'react'
import { ArrowUpRight, Camera, Download, Music2, Play, Plus, type LucideIcon } from 'lucide-react'
import { downloadFile } from '../../api/client'
import { fetchDownloadUrl, usePlatformSummary, usePublishingVideos } from '../../api/publishing'
import type { Platform, PublishingVideo } from '../../api/types'
import { Badge, CardHeading, ErrorCard, PlatformBadge, Thumb, TitleBlock } from '../../ui/common'
import { compactNumber, formatDate } from '../../ui/format'
import { useToast } from '../../ui/Toast'
import { PublishModal } from './PublishModal'

const PLATFORM_STYLE: Record<Platform, { icon: LucideIcon; className: string; label: string }> = {
  YouTube: { icon: Play, className: 'bg-red-50 text-red-600', label: 'YouTube' },
  TikTok: { icon: Music2, className: 'bg-slate-900 text-white', label: 'TikTok' },
  Instagram: { icon: Camera, className: 'bg-fuchsia-50 text-fuchsia-600', label: 'Instagram Reels' },
}

export function PublishingPage() {
  const toast = useToast()
  const approved = usePublishingVideos('APPROVED')
  const published = usePublishingVideos('PUBLISHED')
  const summary = usePlatformSummary()
  const [modal, setModal] = useState<{ code?: string } | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  const publishable = [...(approved.data ?? []), ...(published.data ?? [])]

  const download = async (v: PublishingVideo) => {
    setDownloading(v.code)
    try {
      const { url } = await fetchDownloadUrl(v.code)
      // The presigned URL answers with Content-Disposition: attachment, so this downloads.
      window.location.assign(url)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Download failed.', 'error')
    } finally {
      setDownloading(null)
    }
  }

  const exportCsv = () =>
    downloadFile('/admin/publishing/export.csv', 'publishing-report.csv')
      .then(() => toast('Publishing report exported.'))
      .catch(() => toast('Export failed.', 'error'))

  return (
    <>
      <TitleBlock
        eyebrow="Distribution"
        title="Publishing tracker"
        description="Keep every platform link and publishing status in one place."
        action={
          <button onClick={() => setModal({})} className="btn-primary inline-flex items-center gap-2 self-start rounded-lg px-4 py-2.5 text-xs font-semibold sm:self-auto">
            <Plus className="h-4 w-4" />
            Record publishing
          </button>
        }
      />

      <section className="card mb-5 overflow-hidden">
        <CardHeading title="Platform performance" subtitle="Published content across your connected channels." />
        <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {(summary.data ?? []).map(s => {
            const style = PLATFORM_STYLE[s.platform]
            const Icon = style.icon
            return (
              <div key={s.platform} className="flex items-center gap-3 px-5 py-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.className}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-800">{style.label}</div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    {s.videos} video{s.videos === 1 ? '' : 's'} · {compactNumber(s.views)} views
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300" />
              </div>
            )
          })}
        </div>
      </section>

      <section className="card mb-5 overflow-hidden">
        <CardHeading title="Ready to publish" subtitle="Approved videos: download the original, post it, then record the live links." />
        {approved.error ? (
          <ErrorCard message={approved.error.message} onRetry={() => approved.refetch()} />
        ) : (
          <div className="divide-y divide-slate-100">
            {approved.data?.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">Nothing waiting — approved videos show up here.</div>}
            {approved.isPending && <div className="px-5 py-10 text-center text-sm text-slate-500">Loading…</div>}
            {approved.data?.map(v => (
              <div key={v.code} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Thumb gradient={v.thumbColor} src={v.thumbnailUrl} />
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-800">{v.title}</div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      {v.code} · {v.creator}
                      {v.approvedAt && ` · Approved ${formatDate(v.approvedAt)}`}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => download(v)}
                    disabled={!v.hasOriginal || downloading === v.code}
                    title={v.hasOriginal ? 'Download the original file' : 'The original file is no longer stored'}
                    className="btn-secondary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download original
                  </button>
                  <button onClick={() => setModal({ code: v.code })} className="btn-primary rounded-lg px-3 py-2 text-[10px] font-semibold">
                    Record publishing
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <CardHeading
          title="Recent publications"
          subtitle="Review live links and update publishing records."
          action={
            <div className="flex items-center gap-2">
              <button onClick={exportCsv} className="btn-secondary rounded-lg px-3 py-2 text-[10px] font-semibold">Export</button>
              <button onClick={() => setModal({})} className="btn-secondary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold">
                <Plus className="h-3.5 w-3.5" />
                Add record
              </button>
            </div>
          }
        />
        <div className="table-wrap">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Video</th>
                <th className="px-4 py-3 font-semibold">Creator</th>
                <th className="px-4 py-3 font-semibold">Platforms</th>
                <th className="px-4 py-3 font-semibold">Live since</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {published.data?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">No videos published yet.</td>
                </tr>
              )}
              {published.data?.map(v => (
                <tr key={v.code}>
                  <td className="px-5 py-3">
                    <button onClick={() => setModal({ code: v.code })} className="flex items-center gap-3 text-left" title="Update publishing record">
                      <Thumb gradient={v.thumbColor} src={v.thumbnailUrl} />
                      <div>
                        <div className="font-semibold text-slate-800 hover:text-indigo-600">{v.title}</div>
                        <div className="mt-1 text-[10px] text-slate-500">{v.code}</div>
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.creator}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {v.platforms.map(l => (
                        <a key={l.platform} href={l.url} target="_blank" rel="noreferrer" title={l.url}>
                          <PlatformBadge platform={l.platform} />
                        </a>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{v.firstPublishedAt ? formatDate(v.firstPublishedAt) : '—'}</td>
                  <td className="px-5 py-3"><Badge text="Published" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modal && <PublishModal videos={publishable} initialCode={modal.code} onClose={() => setModal(null)} />}
    </>
  )
}
