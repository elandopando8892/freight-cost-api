import type { Metadata } from 'next'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { LaneHint } from './quote-form'
import { QuoteModes } from './quote-modes'
import type { CostBaseOption, ReopenQuote } from './quote-shared'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Cotizar ruta' }

interface RecentQuote {
  id: string
  label: string | null
  operation: string
  service: string
  lane?: { origin?: string | null; destination?: string | null } | null
}

interface ReopenQuoteResponse {
  id: string
  label: string | null
  operation: string
  service: string
  lane: { origin: string | null; destination: string | null } | null
  costBase: { id: string } | null
  explanation: { input: { equipment: { truckType: string; trailer: string; config: string; driver: string } } } | null
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

async function fetchQuoteToReopen(quoteId?: string): Promise<{ quote: ReopenQuoteResponse | null; error: string | null }> {
  if (!quoteId) return { quote: null, error: null }
  try {
    return { quote: await api<ReopenQuoteResponse>(`/quotes/${quoteId}`), error: null }
  } catch {
    return {
      quote: null,
      error: 'No pudimos cargar esa cotización. Puede que ya no exista o que no tengas acceso a ella.',
    }
  }
}

export default async function QuotePage({ searchParams }: { searchParams: Promise<{ quoteId?: string | string[] }> }) {
  const params = await searchParams
  const quoteId = Array.isArray(params.quoteId) ? params.quoteId[0] : params.quoteId
  const [recentLanes, costBases, user, reopened] = await Promise.all([
    fetchRecentLanes(),
    api<CostBaseOption[]>('/cost-bases').catch(() => []),
    api<{ role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }>('/auth/me'),
    fetchQuoteToReopen(quoteId),
  ])
  const initialQuote: ReopenQuote | undefined = reopened.quote ? {
    id: reopened.quote.id,
    label: reopened.quote.label,
    operation: reopened.quote.operation,
    service: reopened.quote.service,
    origin: reopened.quote.lane?.origin ?? null,
    destination: reopened.quote.lane?.destination ?? null,
    costBaseId: reopened.quote.costBase?.id ?? null,
    equipment: reopened.quote.explanation?.input.equipment ?? null,
  } : undefined
  return (
    <main className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-4">
      <header className="mb-4 flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Nueva cotización · 3 pasos</p>
          <h1 className="text-xl font-semibold tracking-tight">Cotiza una ruta</h1>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
            Captura origen, destino y equipo. Revisa costo, margen y linaje antes de guardar.
          </p>
        </div>
        <p className="border-l-2 border-primary px-3 py-1 text-[11px] text-muted-foreground">El cálculo propone · tú confirmas</p>
      </header>
      {user.role !== 'VIEWER' && <div className="mb-4 rounded border bg-card p-3 text-sm">
        ¿Trabajas con tarifas de líneas asociadas? <Link href="/quote/partners" className="font-semibold underline underline-offset-4">Calcular costos de socios →</Link>
      </div>}
      {user.role === 'VIEWER' ? (
        <section className="mx-auto max-w-2xl rounded-lg border bg-card p-5" aria-labelledby="quote-permission-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="quote-permission-title" className="text-base font-semibold">Consulta de cotizaciones</h2>
            <span className="rounded-full border border-sky-500/30 bg-sky-500/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-200">Solo lectura</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Tu rol puede revisar cotizaciones guardadas y su linaje, pero no generar, guardar ni confirmar nuevos cálculos.</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-md border bg-muted/20 p-3"><dt className="text-xs font-medium text-foreground">Disponible</dt><dd className="mt-1 text-muted-foreground">Historial, detalle, base y versión usadas.</dd></div>
            <div className="rounded-md border bg-muted/20 p-3"><dt className="text-xs font-medium text-foreground">Requiere operador</dt><dd className="mt-1 text-muted-foreground">Calcular, guardar, confirmar o compartir.</dd></div>
          </dl>
          <Link href="/quotes" className="mt-4 inline-flex text-sm font-medium text-primary underline underline-offset-2">Ir al historial →</Link>
        </section>
      ) : <QuoteModes recentLanes={recentLanes} costBases={costBases} initialQuote={initialQuote} reopenError={reopened.error} />}
    </main>
  )
}
