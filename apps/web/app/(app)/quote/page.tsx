import type { Metadata } from 'next'
import { api } from '@/lib/api'
import type { LaneHint } from './quote-form'
import { QuoteModes } from './quote-modes'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Quote by route' }

interface RecentQuote {
  id: string
  label: string | null
  operation: string
  service: string
  lane?: { origin?: string | null; destination?: string | null } | null
}

/** Most recent distinct lanes (by origin+dest+operation), up to 5, for re-quoting. */
async function fetchRecentLanes(): Promise<LaneHint[]> {
  try {
    const quotes = await api<RecentQuote[]>('/quotes') // most-recent-first
    const seen = new Set<string>()
    const lanes: LaneHint[] = []
    for (const q of quotes) {
      const origin = q.lane?.origin ?? null
      const destination = q.lane?.destination ?? null
      const key = `${origin}|${destination}|${q.operation}`
      if (seen.has(key)) continue
      seen.add(key)
      lanes.push({ id: q.id, label: q.label, operation: q.operation, service: q.service, origin, destination })
      if (lanes.length >= 5) break
    }
    return lanes
  } catch {
    return []
  }
}

export default async function QuotePage() {
  const recentLanes = await fetchRecentLanes()
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Quote by route</h1>
        <p className="text-sm text-muted-foreground">
          Price a lane against your active assumption set. ZIP → metro resolution, MX state homologation, and the
          prevailing service default (Import/Southbound → Backhaul) all happen server-side.
        </p>
      </header>
      <QuoteModes recentLanes={recentLanes} />
    </main>
  )
}
