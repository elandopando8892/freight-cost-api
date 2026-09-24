import Link from 'next/link'
import { notFound } from 'next/navigation'
import { api, ApiError } from '@/lib/api'
import { PartnerCostForm, type Report } from '../../partner-cost-form'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Versión de costo de socios' }
type Saved = { id: string; previousId: string | null; nextId: string | null; version: number; actorId: string; createdAt: string; snapshot: Report }

export default async function SavedPartnerCost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let saved: Saved
  try { saved = await api<Saved>(`/partner-cost-estimates/${encodeURIComponent(id)}`) }
  catch (error) { if (error instanceof ApiError && [400, 404].includes(error.status)) notFound(); throw error }
  const user = await api<{ role: string }>('/auth/me')
  const report = saved.snapshot
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
    <Link href="/quote/partners/saved" className="inline-block min-h-11 py-2 underline">← Estimaciones guardadas</Link>
    <h1 className="text-2xl font-semibold">Costo de socios · versión {saved.version}</h1>
    <p className="break-words font-semibold">{String(report.input.origin)} → {String(report.input.destination)} · Viaje {String(report.input.serviceDate)}</p>
    <p className="text-sm text-muted-foreground">Evidencia histórica congelada; no confirma vigencia actual ni verifica las fuentes. Guardada {saved.createdAt.slice(0, 10)} · modelo {report.modelVersion}.</p>
    {report.baseLineage && <section className="space-y-2 rounded border bg-card p-4" aria-label="Procedencia de la base">
      <h2 className="font-semibold">Calculada desde una base publicada · v{report.baseLineage.version}</h2>
      <p className="break-all text-xs">Base: {report.baseLineage.costBaseId} · Versión: {report.baseLineage.versionId}</p>
      <p className="break-all font-mono text-xs">Huella de términos: {report.baseLineage.termsChecksum}</p>
      <Link className="inline-block min-h-11 py-2 underline" href={`/cost-bases/partners?base=${encodeURIComponent(report.baseLineage.costBaseId)}`}>Consultar base actual y preparar otro cálculo</Link>
      <p className="text-sm text-muted-foreground">La base actual puede tener otra versión. Este resultado conserva las tarifas y supuestos utilizados originalmente.</p>
    </section>}
    <section className="space-y-4 rounded border bg-card p-5" aria-label="Economía guardada">
      <h2 className="font-semibold">Costo conocido de compra</h2>
      <p className="font-mono text-2xl">{report.purchaseCostUsd?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</p>
      <dl className="space-y-3">{report.lines.map(line => <div key={line.id} className="flex flex-wrap justify-between gap-2 border-b pb-2 text-sm">
        <dt className="break-words">{line.label} · {line.provider}<span className="block">{line.amount} {line.currency}</span></dt><dd className="font-mono">{line.usd} USD</dd>
      </div>)}</dl>
      <ul className="text-sm">{report.inclusions.map(item => <li key={item.label}>{item.label}: {item.includedIn}</li>)}</ul>
      <p className="text-sm">Excluye: {report.exclusions.join('; ')}.</p>
    </section>
    <details className="space-y-4 rounded border bg-card p-5">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">Ver tarifas, referencias, vigencias y supuestos</summary>
      <p className="text-sm text-muted-foreground">Estos campos son de consulta. {report.baseLineage ? 'Para otro cálculo utiliza la versión activa de la base.' : 'Para cambiar datos crea una nueva versión debajo.'}</p>
      <PartnerCostForm initialInput={report.input} readOnly />
      <p className="break-all font-mono text-xs">Huella: {report.reviewChecksum} · Autor: {saved.actorId}</p>
    </details>
    <nav className="flex flex-wrap gap-4" aria-label="Versiones de la estimación">
      {saved.previousId && <Link className="min-h-11 py-2 underline" href={`/quote/partners/saved/${saved.previousId}`}>← Versión anterior</Link>}
      {saved.nextId && <Link className="min-h-11 py-2 underline" href={`/quote/partners/saved/${saved.nextId}`}>Versión siguiente →</Link>}
    </nav>
    {user.role !== 'VIEWER' && !saved.nextId && !report.baseLineage && <details className="rounded border bg-card p-5">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">Preparar nueva versión</summary>
      <p className="mb-4 text-sm text-muted-foreground">Actualiza las tarifas y sus fuentes, vuelve a calcular y revisa antes de guardar. La versión anterior se conserva.</p>
      <PartnerCostForm key={saved.id} initialInput={report.input} previousId={saved.id} />
    </details>}
  </main>
}
