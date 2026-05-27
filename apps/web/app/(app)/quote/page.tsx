import type { Metadata } from 'next'
import { QuoteForm } from './quote-form'

export const metadata: Metadata = { title: 'Quote by route' }

export default function QuotePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Quote by route</h1>
        <p className="text-sm text-muted-foreground">
          Price a lane against your active assumption set. ZIP → metro resolution, MX state homologation, and the
          prevailing service default (Import/Southbound → Backhaul) all happen server-side.
        </p>
      </header>
      <QuoteForm />
    </main>
  )
}
