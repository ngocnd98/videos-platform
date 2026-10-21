import { useState, type FormEvent } from 'react'
import { FileText } from 'lucide-react'
import { useCmsPages, useSaveCmsPage, type CmsPage as CmsPageRecord } from '../../api/admin'
import { Badge, ErrorCard, LoadingCards, TitleBlock } from '../../ui/common'
import { Modal } from '../../ui/Modal'
import { formatDate } from '../../ui/format'
import { useToast } from '../../ui/Toast'

export function CmsPage() {
  const { data: pages = [], isPending, error, refetch } = useCmsPages()
  const [editing, setEditing] = useState<CmsPageRecord | null>(null)

  return (
    <>
      <TitleBlock eyebrow="Administration" title="CMS pages" description="Edit the public information pages displayed on the platform." />
      {error ? (
        <ErrorCard message={error.message} onRetry={() => refetch()} />
      ) : isPending ? (
        <LoadingCards count={3} />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {pages.map(page => (
            <article key={page.slug} className="card p-5">
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <FileText className="h-4 w-4" />
                </span>
                <Badge text="Published" />
              </div>
              <h2 className="mt-4 text-sm font-semibold text-slate-900">{page.title}</h2>
              <p className="mt-1 text-xs text-slate-500">/{page.slug} · Updated {formatDate(page.updatedAt)}</p>
              <p className="mt-3 line-clamp-3 text-[11px] leading-relaxed text-slate-500">{page.content}</p>
              <button onClick={() => setEditing(page)} className="btn-secondary mt-4 w-full rounded-lg px-3 py-2 text-xs font-semibold">Edit page</button>
            </article>
          ))}
        </div>
      )}
      {editing && <EditPageModal page={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function EditPageModal({ page, onClose }: { page: CmsPageRecord; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveCmsPage()
  const [title, setTitle] = useState(page.title)
  const [content, setContent] = useState(page.content)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate(
      { slug: page.slug, title: title.trim(), content },
      {
        onSuccess: () => {
          toast('Public page saved.')
          onClose()
        },
        onError: err => toast(err.message, 'error'),
      },
    )
  }

  return (
    <Modal title={`Edit ${page.title}`} subtitle={`Public page · /${page.slug}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <div>
          <label htmlFor="cmsTitle" className="mb-1.5 block text-xs font-semibold text-slate-700">Page title</label>
          <input id="cmsTitle" required maxLength={80} value={title} onChange={e => setTitle(e.target.value)} className="input" />
        </div>
        <div>
          <label htmlFor="cmsContent" className="mb-1.5 block text-xs font-semibold text-slate-700">Page content</label>
          <textarea id="cmsContent" required rows={8} value={content} onChange={e => setContent(e.target.value)} className="input resize-y" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary rounded-lg px-4 py-2 text-xs font-semibold">Cancel</button>
          <button disabled={save.isPending} className="btn-primary rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-60">Save page</button>
        </div>
      </form>
    </Modal>
  )
}
