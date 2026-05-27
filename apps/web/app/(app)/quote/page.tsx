import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { QuoteForm, type LastQuoteHint } from './quote-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Quote by route' }

interface RecentQuote {
  id: string
  label: string | null
  operation: string
  service: string
  lane?: { origin?: string | null; destination?: string | null } | null
}

async function fetchLast(): Promise<LastQuoteHint | null> {
  try {
    const recent = await api<RecentQuote[]>('/quotes')
    const q = recent[0]
    if (!q) return null
    return {
      id: q.id,
      label: q.label,
      operation: q.operation,
      service: q.service,
      origin: q.lane?.origin ?? null,
      destination: q.lane?.destination ?? null,
    }
  } catch {
    return null
  }
}

export default async function QuotePage() {
  const lastQuote = await fetchLast()
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Quote by route</h1>
        <p className="text-sm text-muted-foreground">
          Price a lane against your active assumption set. ZIP → metro resolution, MX state homologation, and the
          prevailing service default (Import/Southbound → Backhaul) all happen server-side.
        </p>
      </header>
      <QuoteForm lastQuote={lastQuote} />
    </main>
  )
}
