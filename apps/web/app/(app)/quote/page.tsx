import type { Metadata } from 'next'
import Link from 'next/link'
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
  const [recentLanes, costBases, user] = await Promise.all([
    fetchRecentLanes(),
    api<CostBaseOption[]>('/cost-bases').catch(() => []),
    api<{ role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }>('/auth/me'),
  ])
  return (
    <main className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-4">
      <header className="mb-4 flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Motor de cotización</p>
          <h1 className="text-xl font-semibold tracking-tight">Construye una tarifa explicable</h1>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
            Selecciona la base que gobierna la ruta. La resolución de ubicación, homologación MX y la regla de servicio se aplican en el motor.
          </p>
        </div>
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">El cálculo propone · el transportista confirma</p>
      </header>
      {user.role === 'VIEWER' ? (
        <section className="rounded-lg border bg-card p-5 text-center" aria-labelledby="quote-permission-title">
          <h2 id="quote-permission-title" className="text-base font-semibold">Modo consulta</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tu rol puede revisar cotizaciones guardadas, pero no generar nuevos cálculos.</p>
          <Link href="/quotes" className="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-2">Ir al historial</Link>
        </section>
      ) : <QuoteModes recentLanes={recentLanes} costBases={costBases} />}
    </main>
  )
}
