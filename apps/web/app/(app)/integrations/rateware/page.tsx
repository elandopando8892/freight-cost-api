import Link from 'next/link'
import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Rateware handoff queue' }

interface QueueItem {
  id: string; label: string | null; operation: string; service: string; requiredTariffUsd: number
  confirmedAt: string | null; confirmedBy: { id: string; email: string } | null
  lane: { origin: string; destination: string } | null
  productionRoute: { id: string; code: string | null; status: string } | null
  ready: boolean; blockers: string[]; snapshotChecksum: string | null
  ratewareCandidate: { structurallyReady: boolean; blockers: string[]; humanEnrichmentRequired: string[] } | null
  enrichment: { carrier: string; effectiveDate: string; rateOwner: string; capacityPerWeek?: number; notes?: string } | null
}
interface Queue { contractVersion: string; total: number; ready: number; data: QueueItem[] }

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function hasCompleteEnrichment(enrichment: QueueItem['enrichment']) {
  return Boolean(
    enrichment?.carrier.trim()
    && enrichment.effectiveDate.trim()
    && enrichment.rateOwner.trim(),
  )
}

function isQueueItemReady(item: QueueItem) {
  return item.ready
    && item.blockers.length === 0
    && item.ratewareCandidate?.structurallyReady === true
    && hasCompleteEnrichment(item.enrichment)
}

export default async function RatewareQueuePage() {
  const queue = await api<Queue>('/integration/rateware/quotes')
  const readyCount = queue.data.filter(isQueueItemReady).length

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cola para Rateware</h1>
          <p className="text-sm text-muted-foreground">Paquetes locales de sólo lectura. Nada se envía automáticamente.</p>
        </div>
        <Link href="/quotes" className="text-sm font-medium underline underline-offset-2">Historial de cotizaciones</Link>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Confirmadas" value={String(queue.total)} />
        <Metric label="Completas para paquete" value={String(readyCount)} />
        <Metric label="Incompletas" value={String(queue.total - readyCount)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Revisión previa a exportar</CardTitle>
          <CardDescription>Una cotización sólo queda lista cuando tiene evidencia elegible, estructura completa y enriquecimiento Rateware validado.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-y bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Ruta</th>
                  <th className="px-4 py-2 text-left">Operación</th>
                  <th className="px-4 py-2 text-right">Tarifa</th>
                  <th className="px-4 py-2 text-left">Evidencia</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {queue.data.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No hay cotizaciones confirmadas.</td></tr>
                ) : queue.data.map((item) => {
                  const ready = isQueueItemReady(item)
                  const incompleteReason = item.blockers.length > 0
                    ? item.blockers.join(' ')
                    : 'Falta completar la evidencia requerida para Rateware.'
                  return (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.label ?? (item.lane ? `${item.lane.origin} → ${item.lane.destination}` : 'Cotización confirmada')}</div>
                        <div className="text-xs text-muted-foreground">{item.productionRoute?.code ?? 'Sin ruta de producción'}</div>
                      </td>
                      <td className="px-4 py-3">{item.operation}<div className="text-xs text-muted-foreground">{item.service}</div></td>
                      <td className="px-4 py-3 text-right tabular-nums">{usd.format(item.requiredTariffUsd)}</td>
                      <td className="px-4 py-3">
                        <span className={ready ? 'text-emerald-700' : 'text-amber-700'}>{ready ? 'Lista' : 'Incompleta'}</span>
                        <div className="max-w-64 text-xs text-muted-foreground">{ready ? `Snapshot ${item.snapshotChecksum?.slice(0, 12)}…` : incompleteReason}</div>
                        {item.enrichment ? (
                          <div className="mt-1 text-xs text-emerald-700">{item.enrichment.carrier} · vigente {item.enrichment.effectiveDate}</div>
                        ) : item.ratewareCandidate && (
                          <div className="mt-1 text-xs text-muted-foreground">Completar: {item.ratewareCandidate.humanEnrichmentRequired.join(', ')}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right"><Link className="text-xs font-medium underline underline-offset-2" href={`/quotes/${item.id}`}>Abrir</Link></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-semibold">{value}</div></CardContent></Card> }
