import { Hammer } from 'lucide-react'
import { TitleBlock } from '../ui/common'

/** Temporary page body until the feature for this route is built. */
export function Placeholder({ eyebrow, title, description, step }: { eyebrow: string; title: string; description: string; step: string }) {
  return (
    <>
      <TitleBlock eyebrow={eyebrow} title={title} description={description} />
      <section className="card flex flex-col items-center gap-3 px-5 py-16 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Hammer className="h-5 w-5" />
        </span>
        <p className="text-sm font-semibold text-slate-800">Coming in {step}</p>
        <p className="max-w-sm text-xs text-slate-500">This screen will be ported from the prototype and wired to the API.</p>
      </section>
    </>
  )
}
