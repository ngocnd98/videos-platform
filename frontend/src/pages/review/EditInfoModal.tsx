import { useState, type FormEvent } from 'react'
import { useUpdateReviewInfo } from '../../api/review'
import type { ReviewQueueItem } from '../../api/types'
import { useCategories } from '../../api/videos'
import { Modal } from '../../ui/Modal'
import { useToast } from '../../ui/Toast'

/** Lets a reviewer fix the title, category or tags before deciding. */
export function EditInfoModal({ item, onClose }: { item: ReviewQueueItem; onClose: () => void }) {
  const toast = useToast()
  const update = useUpdateReviewInfo()
  const { data: categories = [] } = useCategories()
  const [title, setTitle] = useState(item.title)
  const [categoryId, setCategoryId] = useState(String(item.categoryId ?? ''))
  const [tags, setTags] = useState(item.tags ?? '')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (tags.split(',').filter(t => t.trim()).length > 10) return toast('A video can have up to 10 tags.', 'error')
    update.mutate(
      { code: item.code, title: title.trim(), categoryId: Number(categoryId), tags: tags.trim() || undefined },
      {
        onSuccess: () => {
          toast('Video information updated.')
          onClose()
        },
        onError: err => toast(err.message, 'error'),
      },
    )
  }

  return (
    <Modal title="Correct video information" subtitle={`${item.creator} · ${item.code}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <div>
          <label htmlFor="reviewEditTitle" className="mb-1.5 block text-xs font-semibold text-slate-700">Title</label>
          <input id="reviewEditTitle" required maxLength={100} className="input" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <label htmlFor="reviewEditCategory" className="mb-1.5 block text-xs font-semibold text-slate-700">Category</label>
          <select id="reviewEditCategory" required className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            {categories
              .filter(c => c.visible || String(c.id) === String(item.categoryId))
              .map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor="reviewEditTags" className="mb-1.5 block text-xs font-semibold text-slate-700">Tags</label>
          <input id="reviewEditTags" maxLength={240} className="input" placeholder="Comma-separated tags" value={tags} onChange={e => setTags(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary rounded-lg px-4 py-2 text-xs font-semibold">Cancel</button>
          <button type="submit" disabled={update.isPending} className="btn-primary rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-60">Save corrections</button>
        </div>
      </form>
    </Modal>
  )
}
