import { ExternalLink } from 'lucide-react'
import research from '../../../../../../docs/FCM_TIRE_LIFECYCLE_SOURCES_2026-09-27.json'
import imtReference from '../../../../../../docs/FCM_TIRE_IMT_PT881_2025.json'
import segmentMapping from '../../../../../../docs/FCM_TIRE_IMT_SEGMENT_MAPPING_2026-09-28.json'

const formatMxn = (value: number) => new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN', maximumFractionDigits: 2,
}).format(value)
const formatMxnPerKm = (value: number) => new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN', minimumFractionDigits: 5, maximumFractionDigits: 5,
}).format(value)

function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline" href={href} target="_blank" rel="noopener noreferrer">{children}<ExternalLink className="size-3.5" aria-hidden /></a>
}

export function TirePublicResearch() {
  const [steer, drive] = research.newTirePriceObservations
  const retread = research.retreadPriceObservations[0]
  const discrepancy = research.identityDiscrepancies
  const conditionalSegments = segmentMapping.segments.filter(item => item.mode === 'CONDITIONAL_MX_INTERURBAN')
  const excludedSegments = segmentMapping.segments.filter(item => item.mode === 'NO_DIRECT_COMPARISON')

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

      <div className="mt-5 rounded border border-sky-800/50 bg-sky-950/10 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">Referencia oficial · México interurbano</p>
            <h3 className="mt-1 font-semibold">IMT · costos base 2025</h3>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Resultados del modelo VOC para vehículos cargados a capacidad límite. Son costos de llantas del vehículo completo; sirven para contrastar magnitudes en un tramo mexicano interurbano comparable.</p>
          </div>
          <SourceLink href={`${imtReference.source.url}#page=60`}>Publicación Técnica 881</SourceLink>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {imtReference.vehicleReferences.map(item => (
            <article key={item.configuration} className="rounded border bg-background/70 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-1">
                <h4 className="font-semibold">{item.configuration}</h4>
                <span className="text-xs text-muted-foreground">{item.tireCountModel} llantas del modelo</span>
              </div>
              <p className="mt-2 text-lg font-semibold tabular-nums">{formatMxn(item.tireCostMxnPer1000VehicleKm)}</p>
              <p className="text-xs text-muted-foreground">por 1,000 veh-km · tabla {item.table}</p>
              <p className="mt-2 text-xs tabular-nums">Equivale a {formatMxnPerKm(item.tireCostMxnPer1000VehicleKm / 1000)} por veh-km.</p>
            </article>
          ))}
        </div>
        <p className="mt-3 text-xs text-amber-200">Modelo con llanta 1100-20 y precios 2025. No mide vida por posición, costo instalado XBF, drayage, reparto local ni el tramo estadounidense. Ninguna cifra se adopta en el motor.</p>
        <p className="mt-2 text-xs text-muted-foreground">{imtReference.governance.possibleComparison}</p>
        <details className="mt-2 text-sm">
          <summary className="min-h-11 cursor-pointer text-primary">Ver supuestos y trazabilidad IMT</summary>
          <div className="grid gap-2 rounded border p-3 text-xs text-muted-foreground sm:grid-cols-2">
            <p>Entrada: llanta nueva {formatMxn(imtReference.scope.newTirePriceMxn2025)} y razón renovado/nueva {imtReference.scope.retreadToNewPriceRatioModel} en la tabla {imtReference.scope.inputTable}, página PDF {imtReference.scope.inputPagePdf}.</p>
            <p>El coeficiente {imtReference.scope.maximumRetreadsModelCoefficient} de renovados pertenece a VOC; no cuenta renovados físicos observados. Salidas: páginas PDF {imtReference.vehicleReferences.map(item => item.pdfPage).join(', ')}.</p>
            <p className="break-all sm:col-span-2">SHA-256 del PDF verificado: {imtReference.source.pdfSha256}</p>
          </div>
        </details>
      </div>

      <div className="mt-5 rounded border p-4" aria-labelledby="tire-imt-segment-title">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Mapa de comparabilidad · COST_TIRES</p>
            <h3 id="tire-imt-segment-title" className="mt-1 font-semibold">¿Dónde sirve el contraste IMT?</h3>
          </div>
          <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">{segmentMapping.adoptedParameterCount} parámetros adoptados</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">La referencia es por vehículo-km interurbano mexicano, no por llanta individual ni por tarifa contratada. Estos son alcances posibles, no bases calibradas.</p>
        <h4 className="mt-4 text-sm font-semibold">Contraste condicionado · sólo tramo MX comparable</h4>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {conditionalSegments.map(item => (
            <article key={item.id} data-segment-id={item.id} className="rounded border border-sky-800/40 bg-sky-950/10 p-3">
              <h5 className="text-sm font-semibold">{item.label}</h5>
              <p className="mt-1 text-sm">{item.sliceEs}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.limitEs}</p>
            </article>
          ))}
        </div>
        <h4 className="mt-4 text-sm font-semibold">Sin comparación directa</h4>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {excludedSegments.map(item => (
            <p key={item.id} data-segment-id={item.id} className="rounded border p-2 text-xs"><span className="font-semibold">{item.label}:</span> {item.limitEs}</p>
          ))}
        </div>
        <details className="mt-3 text-sm">
          <summary className="min-h-11 cursor-pointer text-primary">Ver 6 verificaciones antes de contrastar CVU</summary>
          <ol className="grid list-decimal gap-1 rounded border p-3 pl-7 text-xs text-muted-foreground md:grid-cols-2 md:gap-x-8">
            {segmentMapping.requiredChecksEs.map(item => <li key={item}>{item}</li>)}
          </ol>
        </details>
        <p className="mt-2 text-xs text-amber-200">Sin conversión automática de segmentos históricos de cohortes. Ningún costo del IMT entra a CVU, CFU o cotización.</p>
      </div>

      <div className="mt-5 rounded border border-dashed p-4">
        <h3 className="text-sm font-semibold">Qué falta para abrir un expediente de calibración</h3>
        <p className="mt-1 text-sm text-muted-foreground">La metodología exige ciclos completos y comparables. Hoy no hay un costo por kilómetro defendible ni una cohorte lista para revisión económica.</p>
        <details className="mt-3 text-sm">
          <summary className="min-h-11 cursor-pointer text-primary">Ver las {research.missingTargetEvidenceEs.length} evidencias pendientes</summary>
          <ol className="mt-2 grid list-decimal gap-1 pl-5 text-muted-foreground sm:grid-cols-2 sm:gap-x-8">
            {research.missingTargetEvidenceEs.map(item => <li key={item}>{item}</li>)}
          </ol>
        </details>
      </div>
    </section>
  )
}
