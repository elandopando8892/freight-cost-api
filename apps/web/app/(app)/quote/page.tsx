import type { Metadata } from 'next'
import { api } from '@/lib/api'
import type { LaneHint } from './quote-form'
import { QuoteModes } from './quote-modes'
import type { CostBaseOption } from './quote-shared'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Cotizar ruta' }

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
  const [recentLanes, costBases] = await Promise.all([
    fetchRecentLanes(),
    api<CostBaseOption[]>('/cost-bases').catch(() => []),
  ])
  return (
    <main className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">Motor de cotización</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Construye una tarifa explicable</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Selecciona la base que gobierna la ruta. La resolución de ubicación, homologación MX y la regla de servicio se aplican en el motor.
          </p>
        </div>
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">El cálculo propone · el transportista confirma</p>
      </header>
      <QuoteModes recentLanes={recentLanes} costBases={costBases} />
    </main>
  )
}
