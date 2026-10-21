import { useState, type FormEvent } from 'react'
import { useSaveSettings, useSettings, useStorage } from '../../api/admin'
import { useAuditLog } from '../../api/review'
import type { Platform, Settings } from '../../api/types'
import { AuditDrawer } from '../../components/review/AuditDrawer'
import { CardHeading, ErrorCard, TitleBlock } from '../../ui/common'
import { useToast } from '../../ui/Toast'

const PLATFORMS: Platform[] = ['YouTube', 'TikTok', 'Instagram']

interface FormState {
  uploadLimitGb: string
  storageQuotaGb: string
  defaultSharePct: string
  retentionDays: string
  platforms: Platform[]
}

const toForm = (s: Settings): FormState => ({
  uploadLimitGb: String(s.uploadLimitGb),
  storageQuotaGb: String(s.storageQuotaGb),
  defaultSharePct: String(s.defaultSharePct),
  retentionDays: String(s.retentionDays),
  platforms: s.platforms.filter(p => p.enabled).map(p => p.name),
})

const formatGb = (bytes: number) => `${(bytes / 1024 ** 3).toFixed(bytes >= 10 * 1024 ** 3 ? 0 : 1)} GB`

export function SettingsPage() {
  const toast = useToast()
  const settings = useSettings()
  const storage = useStorage()
  const audit = useAuditLog(true)
  const save = useSaveSettings()
  // Unsaved edits; null shows the saved settings.
  const [draft, setForm] = useState<FormState | null>(null)
  const [auditOpen, setAuditOpen] = useState(false)
  const form = draft ?? (settings.data ? toForm(settings.data) : null)

  const set = (key: Exclude<keyof FormState, 'platforms'>) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form!, [key]: e.target.value })

  const togglePlatform = (p: Platform) =>
    setForm({ ...form!, platforms: form!.platforms.includes(p) ? form!.platforms.filter(x => x !== p) : [...form!.platforms, p] })

  const retained = storage.data
    ? `${storage.data.originalFiles} file${storage.data.originalFiles === 1 ? '' : 's'} · ${formatGb(storage.data.usedBytes)}`
    : '…'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form || !settings.data) return
    const body = {
      uploadLimitGb: Number(form.uploadLimitGb),
      storageQuotaGb: Number(form.storageQuotaGb),
      defaultSharePct: Number(form.defaultSharePct),
      retentionDays: Number(form.retentionDays),
      enabledPlatforms: PLATFORMS.filter(p => form.platforms.includes(p)),
    }
    const valid =
      Number.isInteger(body.uploadLimitGb) && body.uploadLimitGb >= 1 && body.uploadLimitGb <= 20 &&
      Number.isInteger(body.storageQuotaGb) && body.storageQuotaGb >= 1 &&
      body.defaultSharePct >= 0 && body.defaultSharePct <= 100 && form.defaultSharePct.trim() !== '' &&
      Number.isInteger(body.retentionDays) && body.retentionDays >= 1 &&
      body.enabledPlatforms.length > 0
    if (!valid) return toast('Check the settings values and select at least one platform.', 'error')
    if (body.retentionDays < settings.data.retentionDays && !window.confirm(`Reducing retention may delete originals older than ${body.retentionDays} days (currently retained: ${retained}). Continue?`)) return
    const defaultChanged = body.defaultSharePct !== settings.data.defaultSharePct
    save.mutate(body, {
      onSuccess: () => {
        setForm(null)
        toast(defaultChanged ? 'Default share updated for new creators; existing creator shares are unchanged.' : 'Platform settings saved.')
      },
      onError: err => toast(err.message, 'error'),
    })
  }

  const entries = (audit.data ?? []).slice(0, 8)

  return (
    <>
      <TitleBlock eyebrow="Administration" title="Settings & audit log" description="Configure upload limits, storage, revenue defaults, platforms and original-file retention." />
      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className="card overflow-hidden">
          <CardHeading title="Platform settings" subtitle="Retention changes show the projected impact before saving." />
          {settings.error ? (
            <ErrorCard message={settings.error.message} onRetry={() => settings.refetch()} />
          ) : !form ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading…</div>
          ) : (
            <form onSubmit={submit} className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">
                  Maximum upload size (GB)
                  <input type="number" min={1} max={20} value={form.uploadLimitGb} onChange={set('uploadLimitGb')} className="input mt-1.5" />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Creator storage quota (GB)
                  <input type="number" min={1} value={form.storageQuotaGb} onChange={set('storageQuotaGb')} className="input mt-1.5" />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Default creator share (%)
                  <input type="number" min={0} max={100} value={form.defaultSharePct} onChange={set('defaultSharePct')} className="input mt-1.5" />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Original retention (days)
                  <input type="number" min={1} value={form.retentionDays} onChange={set('retentionDays')} className="input mt-1.5" />
                </label>
              </div>
              <fieldset>
                <legend className="mb-2 text-xs font-semibold text-slate-700">Publishing platforms</legend>
                <div className="flex flex-wrap gap-3">
                  {PLATFORMS.map(p => (
                    <label key={p} className="flex items-center gap-2 text-xs text-slate-600">
                      <input type="checkbox" checked={form.platforms.includes(p)} onChange={() => togglePlatform(p)} className="check" />
                      {p}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                Reducing retention will delete originals after the selected period. Current retained originals: {retained}.
              </div>
              <button type="submit" disabled={save.isPending} className="btn-primary rounded-lg px-4 py-2.5 text-xs font-semibold disabled:opacity-60">Save settings</button>
            </form>
          )}
        </section>
        <section className="card overflow-hidden">
          <CardHeading
            title="Audit log"
            subtitle="Recorded changes to revenue shares, accounts, payouts and settings."
            action={<button onClick={() => setAuditOpen(true)} className="text-xs font-semibold text-indigo-600">View all</button>}
          />
          <div className="divide-y divide-slate-100">
            {audit.isPending && <div className="p-8 text-center text-xs text-slate-500">Loading…</div>}
            {audit.error && <div className="p-8 text-center text-xs text-rose-600">{audit.error.message}</div>}
            {audit.data && entries.length === 0 && <div className="p-8 text-center text-xs text-slate-500">No administrative changes recorded yet.</div>}
            {entries.map(entry => (
              <div key={entry.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800">{entry.action} · {entry.title ?? entry.entityId}</span>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {new Date(entry.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  {entry.detail ?? entry.entityId}
                  {entry.actor ? ` · ${entry.actor}` : ''}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
      {auditOpen && <AuditDrawer onClose={() => setAuditOpen(false)} />}
    </>
  )
}
