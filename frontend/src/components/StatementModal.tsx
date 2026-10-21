import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { useStatement } from '../api/revenue'
import type { Statement } from '../api/types'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/Toast'
import { money } from '../ui/common'
import { cents, countryName, formatMonth } from '../ui/format'

interface Props {
  /** 'me' for the signed-in creator; otherwise the admin picks from `creators`. */
  scope: 'me' | { creators: { creatorId: number; creator: string }[] }
  periods: string[]
  onClose: () => void
}

export function StatementModal({ scope, periods, onClose }: Props) {
  const toast = useToast()
  const [period, setPeriod] = useState(periods[0] ?? '')
  const creators = scope === 'me' ? [] : [...scope.creators].sort((a, b) => a.creator.localeCompare(b.creator))
  const [creatorId, setCreatorId] = useState<number | null>(creators[0]?.creatorId ?? null)
  const { data, isPending, error } = useStatement(scope === 'me' ? 'me' : creatorId, period)

  useEffect(() => {
    if (!period && periods[0]) setPeriod(periods[0])
  }, [periods, period])

  const print = () => {
    if (!data) return
    const win = window.open('', '_blank')
    if (!win) return toast('Allow pop-ups to print your statement.', 'error')
    win.document.write(printable(data))
    win.document.close()
  }

  return (
    <Modal title="Payout statement" subtitle={`Creator earnings summary · ${period ? formatMonth(period, 'long') : ''}`} onClose={onClose}>
      <div className="p-5 sm:p-6">
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {scope !== 'me' && (
            <select aria-label="Creator" className="input !py-2 text-xs" value={creatorId ?? ''} onChange={e => setCreatorId(Number(e.target.value))}>
              {creators.map(c => (
                <option key={c.creatorId} value={c.creatorId}>{c.creator}</option>
              ))}
            </select>
          )}
          <select aria-label="Month" className="input !py-2 text-xs" value={period} onChange={e => setPeriod(e.target.value)}>
            {periods.map(p => (
              <option key={p} value={p}>{formatMonth(p, 'long')}</option>
            ))}
          </select>
        </div>
        {isPending && <div className="h-48 animate-pulse rounded-lg bg-slate-100" />}
        {error && <p className="text-xs text-rose-600">{error.message}</p>}
        {data && (
          <>
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="text-xs font-semibold text-indigo-600">PULSEMEDIA HUB</div>
                <div className="mt-1 text-[10px] text-slate-500">Creator statement · {data.creatorCode}</div>
              </div>
              <div className="text-right text-[10px] text-slate-500">
                Statement date
                <br />
                <strong className="mt-1 inline-block text-slate-800">
                  {new Date(data.generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </strong>
              </div>
            </div>
            <div className="py-4">
              <div className="text-xs font-semibold text-slate-900">{data.creator}</div>
              <div className="mt-1 text-[10px] text-slate-500">Creator account · {countryName(data.country).replace(/\s\S+$/u, '')}</div>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-100">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Description</th>
                    <th className="px-3 py-2 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.lines.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-3 py-4 text-center text-slate-500">No revenue recorded for this month.</td>
                    </tr>
                  )}
                  {data.lines.map(l => (
                    <tr key={`${l.videoCode}-${l.platform}`}>
                      <td className="px-3 py-2.5 text-slate-700">
                        {l.videoTitle} <span className="text-slate-400">· {l.platform} · gross {money(cents(l.grossCents))}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-800">{money(cents(l.creatorShareCents))}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50/70">
                    <td className="px-3 py-2.5 text-slate-700">Gross platform revenue</td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-800">{money(cents(data.totals.grossCents))}</td>
                  </tr>
                  <tr className="bg-slate-50/70">
                    <td className="px-3 py-2.5 text-slate-700">Platform share</td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-800">{money(cents(data.totals.platformCents))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-indigo-50 p-3.5">
              <span className="text-xs font-semibold text-indigo-900">Creator earnings</span>
              <strong className="text-lg font-semibold text-indigo-700">{money(cents(data.totals.creatorCents))}</strong>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-[10px] text-slate-500">Payout account · {data.payoutMethod ?? 'Not set'}</div>
              <span className={`text-[10px] font-semibold ${data.pendingCents > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {data.lines.length === 0 ? '' : data.pendingCents > 0 ? `Payout pending · ${money(cents(data.pendingCents))}` : 'Paid'}
              </span>
            </div>
          </>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary rounded-lg px-4 py-2 text-xs font-semibold">Close</button>
          <button onClick={print} disabled={!data} className="btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-60">
            <Download className="h-4 w-4" />
            Download statement
          </button>
        </div>
      </div>
    </Modal>
  )
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]!)

function printable(s: Statement) {
  const m = (c: number) => money(cents(c))
  const lines = s.lines.map(l => `<tr><td>${esc(l.videoTitle)} · ${l.platform} · gross ${m(l.grossCents)}</td><td>${m(l.creatorShareCents)}</td></tr>`).join('')
  return `<!DOCTYPE html><html><head><title>PulseMedia Payout Statement</title><style>body{font:14px Arial,sans-serif;color:#0f172a;padding:40px;max-width:680px;margin:auto}.brand{color:#4f46e5;font-weight:bold}h1{font-size:20px;margin:24px 0 4px}p{color:#64748b;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:28px}td,th{padding:12px;border-bottom:1px solid #e2e8f0;text-align:left}th{background:#f8fafc}td:last-child,th:last-child{text-align:right}.total{margin-top:22px;padding:16px;background:#eef2ff;font-size:18px;font-weight:bold;display:flex;justify-content:space-between}</style></head><body><div class="brand">PULSEMEDIA HUB</div><h1>Payout statement</h1><p>${esc(s.creator)} · ${s.creatorCode} · ${formatMonth(s.period, 'long')}</p><table><tr><th>Description</th><th>Amount</th></tr>${lines}<tr><td>Gross platform revenue</td><td>${m(s.totals.grossCents)}</td></tr><tr><td>Platform share</td><td>${m(s.totals.platformCents)}</td></tr></table><div class="total"><span>Creator earnings</span><span>${m(s.totals.creatorCents)}</span></div><p>Payout account: ${esc(s.payoutMethod ?? 'Not set')} · ${s.pendingCents > 0 ? 'Payout pending' : 'Paid'}</p><script>window.onload=()=>window.print()<\/script></body></html>`
}
