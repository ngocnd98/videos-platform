import { useMemo, useState } from 'react'
import { EyeOff } from 'lucide-react'
import { usePublicProfile } from '../../api/profile'
import type { PublicVideo } from '../../api/types'
import { Thumb } from '../../ui/common'
import { Modal } from '../../ui/Modal'
import { compactNumber, countryLabel } from '../../ui/format'

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** What visitors see at pulsemedia.co/<slug>: published videos only, or a notice when the page is hidden. */
export function PublicProfileModal({ onClose }: { onClose: () => void }) {
  const { data, isPending, error } = usePublicProfile()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [sort, setSort] = useState<'recent' | 'popular'>('recent')

  const categories = useMemo(() => [...new Set((data?.videos ?? []).map(v => v.category).filter((c): c is string => !!c))], [data])
  const videos = useMemo(() => {
    const q = normalize(query.trim())
    return (data?.videos ?? [])
      .filter(v => (category === 'All' || v.category === category) && normalize(`${v.title} ${v.description ?? ''} ${v.tags ?? ''}`).includes(q))
      .sort((a, b) => (sort === 'popular' ? b.views - a.views : b.publishedAt.localeCompare(a.publishedAt)))
  }, [data, query, category, sort])

  const initials = (data?.displayName ?? '').split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Modal title="Public profile preview" subtitle="Only published videos appear on this public page." wide onClose={onClose}>
      <div className="p-5">
        {isPending && <div className="py-10 text-center text-sm text-slate-500">Loading…</div>}
        {error && <div className="py-10 text-center text-sm text-rose-600">{error.message}</div>}
        {data?.hidden && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <EyeOff className="h-4 w-4" />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-amber-900">This public page is hidden</h3>
            <p className="mt-1 text-xs text-amber-800">The creator account is suspended or an admin has hidden this page.</p>
          </div>
        )}
        {data && !data.hidden && (
          <>
            <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 px-5 py-6 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 text-lg font-semibold">{initials}</div>
                <div>
                  <h3 className="text-base font-semibold">{data.displayName}</h3>
                  <p className="mt-1 text-[11px] text-indigo-100">Creator · {countryLabel(data.country)}</p>
                </div>
              </div>
              {data.bio && <p className="mt-4 max-w-md text-xs leading-relaxed text-indigo-50">{data.bio}</p>}
              {data.socialLinks && <p className="mt-3 text-[10px] text-indigo-100">{data.socialLinks}</p>}
              <div className="mt-4 flex gap-5 text-[10px] text-indigo-100">
                <span><strong className="text-white">{data.videos.length}</strong> published videos</span>
                <span><strong className="text-white">{compactNumber(data.totalViews)}</strong> total views</span>
              </div>
            </div>
            <div className="my-4 flex flex-col gap-2 sm:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">Search published videos</span>
                <input className="input !py-2 text-xs" placeholder="Search titles, descriptions or tags" value={query} onChange={e => setQuery(e.target.value)} />
              </label>
              <select aria-label="Category" className="input !w-auto !py-2 text-xs" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="All">All categories</option>
                {categories.map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select aria-label="Sort" className="input !w-auto !py-2 text-xs" value={sort} onChange={e => setSort(e.target.value as 'recent' | 'popular')}>
                <option value="recent">Recent</option>
                <option value="popular">Popular</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {videos.map(v => (
                <PublicVideoCard key={v.code} video={v} slug={data.slug} />
              ))}
              {videos.length === 0 && (
                <div className="col-span-full rounded-lg bg-slate-50 p-8 text-center text-xs text-slate-500">
                  {data.videos.length ? 'No videos match your search.' : 'No published videos yet.'}
                </div>
              )}
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-[10px] text-slate-500">
              Profile URL <span className="ml-1 font-medium text-indigo-600">pulsemedia.co/{data.slug}</span> · SEO-friendly public link
            </div>
          </>
        )}
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="btn-secondary rounded-lg px-4 py-2 text-xs font-semibold">Close preview</button>
        </div>
      </div>
    </Modal>
  )
}

const slugify = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function PublicVideoCard({ video, slug }: { video: PublicVideo; slug: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <article className="overflow-hidden rounded-lg border border-slate-100">
      {loaded ? (
        <div className="flex aspect-video w-full items-center justify-center bg-slate-900/80">
          <span className="rounded-lg bg-slate-900/70 px-3 py-2 text-[10px] font-semibold text-white">Embedded player loads on click · demo</span>
        </div>
      ) : (
        <button type="button" onClick={() => setLoaded(true)} className="block w-full" aria-label={`Load ${video.platform} video player`}>
          <Thumb gradient={video.thumbColor} src={video.thumbnailUrl} size="aspect-video w-full" />
        </button>
      )}
      <div className="p-3">
        <div className="truncate text-xs font-semibold text-slate-800">{video.title}</div>
        <div className="mt-1 text-[10px] text-slate-500">
          {video.category ?? '—'} · {video.platform} · {compactNumber(video.views)} views
        </div>
        <a href={video.url} target="_blank" rel="noopener noreferrer" className="mt-2 block truncate text-[10px] text-indigo-600">
          pulsemedia.co/{slug}/{slugify(video.title)}
        </a>
      </div>
    </article>
  )
}
