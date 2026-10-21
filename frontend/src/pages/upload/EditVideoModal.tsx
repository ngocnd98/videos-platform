import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Video } from '../../api/types'
import { useCategories, videoApi } from '../../api/videos'
import { Modal } from '../../ui/Modal'
import { useToast } from '../../ui/Toast'

const LANGUAGES = ['English', 'Spanish', 'French', 'Portuguese', 'Other']

/** Edits a draft or rejected video's details; rejected videos show the reviewer's feedback. */
export function EditVideoModal({ video, onClose }: { video: Video; onClose: () => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { data: categories = [] } = useCategories()
  const [title, setTitle] = useState(video.title)
  const [categoryId, setCategoryId] = useState(video.categoryId ? String(video.categoryId) : '')
  const [tags, setTags] = useState(video.tags ?? '')
  const [description, setDescription] = useState(video.description ?? '')
  const [language, setLanguage] = useState(video.language ?? 'English')
  const [saving, setSaving] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (tags.split(',').filter(t => t.trim()).length > 10) return toast('A video can have up to 10 tags.', 'error')
    setSaving(true)
    try {
      await videoApi.update(video.code, {
        title: title.trim(),
        categoryId: Number(categoryId),
        tags: tags.trim() || undefined,
        description: description.trim() || undefined,
        language,
      })
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      toast('Video details saved.')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save the video.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Edit video"
      subtitle={video.status === 'REJECTED' ? 'Update the video using the review feedback, then resubmit.' : 'Update your draft before submitting.'}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4 p-5">
        <label className="block text-xs font-semibold text-slate-700">
          Title
          <input required maxLength={100} className="input mt-1.5" value={title} onChange={e => setTitle(e.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-700">
            Category
            <select required className="input mt-1.5" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">Select a category</option>
              {categories
                .filter(c => c.visible || String(c.id) === String(video.categoryId))
                .map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Video language
            <select className="input mt-1.5" value={language} onChange={e => setLanguage(e.target.value)}>
              {LANGUAGES.map(l => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs font-semibold text-slate-700">
          Tags
          <input maxLength={200} className="input mt-1.5" placeholder="Up to 10 tags, separated by commas" value={tags} onChange={e => setTags(e.target.value)} />
        </label>
        <label className="block text-xs font-semibold text-slate-700">
          Description
          <textarea rows={3} maxLength={500} className="input mt-1.5" value={description} onChange={e => setDescription(e.target.value)} />
        </label>
        {video.status === 'REJECTED' && (
          <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
            Review feedback: {video.rejectionReason ?? 'Please review the rejection reason and update your video.'}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary rounded-lg px-4 py-2 text-xs font-semibold">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-60">Save changes</button>
        </div>
      </form>
    </Modal>
  )
}
