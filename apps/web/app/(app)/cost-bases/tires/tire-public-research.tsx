import { ExternalLink } from 'lucide-react'
import research from '../../../../../../docs/FCM_TIRE_LIFECYCLE_SOURCES_2026-09-27.json'

const formatMxn = (value: number) => new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN', maximumFractionDigits: 2,
}).format(value)

function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline" href={href} target="_blank" rel="noopener noreferrer">{children}<ExternalLink className="size-3.5" aria-hidden /></a>
}

export function TirePublicResearch() {
  const [steer, drive] = research.newTirePriceObservations
  const retread = research.retreadPriceObservations[0]
  const discrepancy = research.identityDiscrepancies

  return (
    <section id="tire-public-research" className="rounded-lg border bg-card p-5" aria-labelledby="tire-public-research-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-primary">Investigación · COST_TIRES</p>
          <h2 id="tire-public-research-title" className="mt-2 text-lg font-semibold">Benchmark público de llantas</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Observaciones capturadas el 27 de septiembre de 2026. Su precio actual y aplicación a la flota requieren comprobación antes de usarse como supuesto económico.</p>
        </div>
        <span className="rounded-full border border-amber-700/40 bg-amber-950/20 px-3 py-1.5 text-xs font-semibold text-amber-200">{research.governance.adoptedParameterCount} parámetros adoptados</span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <article className="rounded border bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Llanta nueva · posición por comprobar</p>
          <h3 className="mt-1 font-semibold">Roadmaster RM185 · 11R22.5</h3>
          <p className="mt-2 text-sm">Catálogo observado: {formatMxn(steer.listedPriceMxn)}</p>
          <p className="mt-2 text-xs text-amber-200">Precio histórico. La ficha del vendedor y la especificación del fabricante no coinciden en la descripción de servicio; falta costo instalado.</p>
          <div className="mt-2 flex flex-wrap gap-x-4"><SourceLink href={steer.sourceUrl}>Vendedor</SourceLink><SourceLink href={discrepancy[0].manufacturerSourceUrl}>Fabricante</SourceLink></div>
        </article>
        <article className="rounded border bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Llanta nueva · tracción</p>
          <h3 className="mt-1 font-semibold">Roadmaster RM275 · 11R22.5</h3>
          <p className="mt-2 text-sm">Catálogo observado: {formatMxn(drive.listedPriceMxn)}</p>
          <p className="mt-2 text-xs text-amber-200">Precio histórico. Hay discrepancia en la descripción de servicio; faltan instalación y vida observada en el segmento.</p>
          <div className="mt-2 flex flex-wrap gap-x-4"><SourceLink href={drive.sourceUrl}>Vendedor</SourceLink><SourceLink href={discrepancy[1].manufacturerSourceUrl}>Fabricante</SourceLink></div>
        </article>
        <article className="rounded border bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Renovado · aplicación por comprobar</p>
          <h3 className="mt-1 font-semibold">Routeway · 11R22.5</h3>
          <p className="mt-2 text-sm">Catálogo observado: {formatMxn(retread.listedPriceRangeMxn.min)}–{formatMxn(retread.listedPriceRangeMxn.max)}</p>
          <p className="mt-2 text-xs text-amber-200">No está claro si incluye carcasa, impuestos e instalación. No consta inspección ni vida por etapa.</p>
          <SourceLink href={retread.sourceUrl}>Renovadora</SourceLink>
        </article>
      </div>

      <div className="mt-5 rounded border border-dashed p-4">
        <h3 className="text-sm font-semibold">Qué falta para abrir un expediente de calibración</h3>
        <p className="mt-1 text-sm text-muted-foreground">La metodología exige ciclos completos y comparables. Hoy no hay un costo por kilómetro defendible ni una cohorte lista para revisión económica.</p>
        <details className="mt-3 text-sm">
          <summary className="min-h-11 cursor-pointer text-primary">Ver las {research.missingTargetEvidence.length} evidencias pendientes</summary>
          <ol className="mt-2 grid list-decimal gap-1 pl-5 text-muted-foreground sm:grid-cols-2 sm:gap-x-8">
            {research.missingTargetEvidence.map(item => <li key={item}>{item}</li>)}
          </ol>
        </details>
      </div>
    </section>
  )
}
