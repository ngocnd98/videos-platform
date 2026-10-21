import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { useAdminCategories, useCreateCategory, useUpdateCategory } from '../../api/admin'
import type { AdminCategory } from '../../api/types'
import { Badge, CardHeading, ErrorCard, TitleBlock } from '../../ui/common'
import { Modal } from '../../ui/Modal'
import { useToast } from '../../ui/Toast'

const VISIBLE_BADGE = 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
const HIDDEN_BADGE = 'bg-slate-100 text-slate-600 border border-slate-200'

export function CategoriesPage() {
  const toast = useToast()
  const { data: categories = [], isPending, error, refetch } = useAdminCategories()
  const update = useUpdateCategory()
  // null = closed, 'new' = add, otherwise the category being renamed.
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null)

  const toggle = (c: AdminCategory) =>
    update.mutate(
      { id: c.id, visible: !c.visible },
      {
        onSuccess: next => toast(next.visible ? `“${next.name}” is available for new uploads.` : `“${next.name}” is hidden from new uploads.`),
        onError: err => toast(err.message, 'error'),
      },
    )

  return (
    <>
      <TitleBlock
        eyebrow="Administration"
        title="Categories"
        description="Manage video categories. Hidden categories remain assigned to existing videos."
        action={
          <button onClick={() => setEditing('new')} className="btn-primary inline-flex items-center gap-2 self-start rounded-lg px-4 py-2.5 text-xs font-semibold sm:self-auto">
            <Plus className="h-4 w-4" />
            Add category
          </button>
        }
      />
      {error ? (
        <ErrorCard message={error.message} onRetry={() => refetch()} />
      ) : (
        <section className="card overflow-hidden">
          <CardHeading title="Video categories" subtitle="Hidden categories are unavailable for new uploads but remain on existing content." />
          <div className="table-wrap">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-4 py-3">Videos</th>
                  <th className="px-4 py-3">Visibility</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isPending && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-500">Loading…</td>
                  </tr>
                )}
                {categories.map(c => (
                  <tr key={c.id}>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{c.name}</td>
                    <td className="px-4 py-3.5 text-slate-600">{c.videos}</td>
                    <td className="px-4 py-3.5">
                      <Badge text={c.visible ? 'Visible' : 'Hidden'} className={c.visible ? VISIBLE_BADGE : HIDDEN_BADGE} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      <button onClick={() => setEditing(c)} className="btn-secondary rounded-lg px-3 py-2 text-[10px] font-semibold">Rename</button>
                      <button
                        onClick={() => toggle(c)}
                        disabled={update.isPending}
                        className="ml-2 rounded-lg px-3 py-2 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-60"
                      >
                        {c.visible ? 'Hide' : 'Show'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {editing && <CategoryModal category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function CategoryModal({ category, onClose }: { category: AdminCategory | null; onClose: () => void }) {
  const toast = useToast()
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const [name, setName] = useState(category?.name ?? '')
  const pending = create.isPending || update.isPending

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const done = {
      onSuccess: () => {
        toast(category ? 'Category renamed.' : 'Category added.')
        onClose()
      },
      onError: (err: Error) => toast(err.message, 'error'),
    }
    if (category) {
      if (trimmed === category.name) return onClose()
      update.mutate({ id: category.id, name: trimmed }, done)
    } else {
      create.mutate(trimmed, done)
    }
  }

  return (
    <Modal
      title={category ? 'Rename category' : 'Add category'}
      subtitle={category ? 'Existing videos retain their assigned category.' : 'New categories are available for uploads right away.'}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4 p-5">
        <div>
          <label htmlFor="categoryName" className="mb-1.5 block text-xs font-semibold text-slate-700">Category name</label>
          <input id="categoryName" required autoFocus maxLength={40} value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. Travel" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary rounded-lg px-4 py-2 text-xs font-semibold">Cancel</button>
          <button disabled={pending} className="btn-primary rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-60">{category ? 'Save name' : 'Add category'}</button>
        </div>
      </form>
    </Modal>
  )
}
