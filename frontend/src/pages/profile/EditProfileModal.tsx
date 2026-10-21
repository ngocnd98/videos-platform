import { useState, type FormEvent } from 'react'
import { useSaveCreatorAccount } from '../../api/profile'
import type { CreatorAccount } from '../../api/types'
import { COUNTRY_OPTIONS } from '../../ui/format'
import { Modal } from '../../ui/Modal'
import { useToast } from '../../ui/Toast'

const METHODS = ['PayPal', 'Bank transfer', 'Wise']

/** "PayPal · alex•••@mail.com" ↔ method + account. */
function splitPayout(value?: string) {
  if (!value) return { method: METHODS[0], account: '' }
  const [head, ...rest] = value.split(' · ')
  return METHODS.includes(head) ? { method: head, account: rest.join(' · ') } : { method: METHODS[0], account: value }
}

export function EditProfileModal({ account, onClose }: { account: CreatorAccount; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveCreatorAccount()
  const payout = splitPayout(account.payoutMethod)
  const [form, setForm] = useState({
    displayName: account.displayName,
    slug: account.slug,
    country: account.country ?? '',
    bio: account.bio ?? '',
    socialLinks: account.socialLinks ?? '',
    method: payout.method,
    payoutAccount: payout.account,
    newPassword: '',
  })
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [key]: e.target.value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate(
      {
        displayName: form.displayName.trim(),
        slug: form.slug.trim().toLowerCase(),
        country: form.country || undefined,
        bio: form.bio.trim() || undefined,
        socialLinks: form.socialLinks.trim() || undefined,
        payoutMethod: form.payoutAccount.trim() ? `${form.method} · ${form.payoutAccount.trim()}` : undefined,
        newPassword: form.newPassword || undefined,
      },
      {
        onSuccess: () => {
          toast(form.newPassword ? 'Creator profile and password saved.' : 'Creator profile saved.')
          onClose()
        },
        onError: err => toast(err.message, 'error'),
      },
    )
  }

  return (
    <Modal title="Edit creator profile" subtitle="Update your public details, payout method and account information." onClose={onClose}>
      <form onSubmit={submit} className="space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">
            Display name
            <input required maxLength={80} className="input mt-1.5" value={form.displayName} onChange={set('displayName')} />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Email address
            <input type="email" readOnly disabled className="input mt-1.5 opacity-70" value={account.email} />
            <span className="mt-1 block text-[10px] font-normal text-slate-400">Email changes are disabled in this demo (used for sign-in).</span>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">
            Public URL slug
            <input required pattern="[a-z0-9-]{3,60}" title="3–60 lowercase letters, numbers or hyphens" className="input mt-1.5" value={form.slug} onChange={set('slug')} />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Country
            <select className="input mt-1.5" value={form.country} onChange={set('country')}>
              <option value="">Select country</option>
              {COUNTRY_OPTIONS.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs font-semibold text-slate-700">
          Bio
          <textarea rows={2} maxLength={280} className="input mt-1.5" value={form.bio} onChange={set('bio')} />
        </label>
        <label className="block text-xs font-semibold text-slate-700">
          Social links
          <input maxLength={200} className="input mt-1.5" placeholder="Instagram, TikTok, YouTube" value={form.socialLinks} onChange={set('socialLinks')} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">
            Payout method
            <select className="input mt-1.5" value={form.method} onChange={set('method')}>
              {METHODS.map(m => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Payout account
            <input required maxLength={100} className="input mt-1.5" placeholder="Account identifier" value={form.payoutAccount} onChange={set('payoutAccount')} />
          </label>
        </div>
        <label className="block text-xs font-semibold text-slate-700">
          Change password
          <input type="password" minLength={8} autoComplete="new-password" className="input mt-1.5" placeholder="Leave blank to keep current password" value={form.newPassword} onChange={set('newPassword')} />
          {form.newPassword && (
            <span className="mt-1 block text-[10px] font-normal text-amber-700">The header’s Creator switch signs in with the demo password, so it stops working until the server restarts.</span>
          )}
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary rounded-lg px-4 py-2 text-xs font-semibold">Cancel</button>
          <button type="submit" disabled={save.isPending} className="btn-primary rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-60">Save profile</button>
        </div>
      </form>
    </Modal>
  )
}
