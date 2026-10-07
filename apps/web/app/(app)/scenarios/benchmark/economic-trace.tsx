import type { EconomicTrace } from './economic-trace-contract'

const format = (n: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 6 }).format(n)
const usd = (n: number) => `${new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} USD`
const names = { mx: 'Tractor MX', us: 'Tractor US', trailer: 'Caja compartida' }
const labels: Record<string, string> = {
  monthlyFixedUsd: 'Costo fijo mensual', productiveKmPerMonth: 'Kilómetros productivos mensuales',
  productiveVehicleDaysPerMonth: 'Vehículo-días productivos mensuales', productiveDaysPerMonth: 'Días productivos mensuales',
  maintenanceUsdPerKm: 'Mantenimiento por km', tiresUsdPerKm: 'Llantas por km', driverUsdPerKm: 'Operador por km',
  dieselUsdPerLiter: 'Diésel por litro', loadedKmPerLiter: 'Rendimiento cargado', emptyKmPerLiter: 'Rendimiento vacío',
  loadedKm: 'Distancia cargada', emptyKm: 'Distancia vacía', totalKm: 'Distancia total', cycleDays: 'Días de ciclo', tollsUsd: 'Peajes',
  INSURANCE: 'Seguro', PERMITS: 'Permisos', OVERHEAD: 'Gastos generales',
}
type Input = EconomicTrace['resources'][number]['inputs'][number]
function InputRows({ rows }: { rows: Input[] }) {
  return <ul className="mt-2 grid gap-3">{rows.map(p => <li key={p.key} className="min-w-0 rounded border p-3 text-sm">
    <p className="break-words font-medium">{p.section} · {labels[p.label] ?? p.label}</p>
    <p className="break-all font-mono text-xs text-muted-foreground">{p.key}</p>
    <p className="mt-1 break-words font-mono">{format(p.value)} {p.unit}</p>
    <p className="mt-1 break-words">{p.derivation}</p>
    <p className="mt-1 break-all text-xs text-muted-foreground">Fuentes: {p.evidenceIds.join(', ')}</p>
  </li>)}</ul>
}

export function EconomicTraceView({ trace }: { trace: EconomicTrace }) {
  return <details className="mt-4 border-t pt-3">
    <summary className="cursor-pointer py-2 font-medium focus-visible:outline-2">Traza económica · 3 recursos</summary>
    <p className="my-2 text-sm text-muted-foreground">Documentado, no verificado. Dependencias del motor existente; la coherencia de los importes no prueba autenticidad ni calibración. Frontera se suma por separado.</p>
    <div className="grid gap-3">{trace.resources.map(r => <details key={r.id} className="min-w-0 rounded border p-3">
      <summary className="cursor-pointer break-words py-2 focus-visible:outline-2">{names[r.id]} · CFU {usd(r.costs.cfuUsd)} / CVU {usd(r.costs.cvuUsd)}</summary>
      <p className="my-2 break-words text-sm text-muted-foreground">{r.id === 'trailer' ? 'Caja contabilizada una sola vez' : 'Sólo tractor; excluye caja'} · {r.serviceDate} · {r.revision}</p>
      <dl className="grid gap-2 text-sm">{([
        ['CFU por distancia', r.costs.cfuByDistanceUsd], ['CFU por tiempo', r.costs.cfuByTimeUsd], ['CFU asignado (máximo)', r.costs.cfuUsd],
        ['Combustible', r.costs.fuelUsd], ['Mantenimiento', r.costs.maintenanceUsd], ['Llantas', r.costs.tiresUsd], ['Operador', r.costs.driverUsd], ['Peajes', r.costs.tollsUsd],
      ] as const).filter(([, n]) => n !== undefined).map(([label, n]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt>{label}</dt><dd className="font-mono">{usd(n!)}</dd></div>)}</dl>
      <details className="mt-3"><summary className="cursor-pointer py-2 focus-visible:outline-2">Tasas y dependencias ({r.rates.length})</summary>
        {r.rates.map(rate => <details key={rate.key} className="min-w-0 border-t py-2">
          <summary className="cursor-pointer break-words py-2 text-sm focus-visible:outline-2">{labels[rate.key] ?? rate.key} · {format(rate.value)} {rate.unit} · {rate.inputKeys.length} inputs</summary>
          <p className="break-words text-xs text-muted-foreground">{rate.derivation}</p>
          <InputRows rows={rate.inputKeys.map(key => r.inputs.find(p => p.key === key)!)} />
        </details>)}
      </details>
      <details className="mt-2"><summary className="cursor-pointer py-2 focus-visible:outline-2">Datos del viaje ({r.trip.length})</summary><InputRows rows={r.trip} /></details>
      <details className="mt-2"><summary className="cursor-pointer py-2 focus-visible:outline-2">Fuentes ({r.evidence.length})</summary>
        <ul className="grid gap-3">{r.evidence.map(e => <li key={e.id} className="min-w-0 rounded border p-3 text-sm">
          <a className="break-all text-primary underline" href={e.url} target="_blank" rel="noopener noreferrer">{e.id} ↗</a>
          <p className="break-words">{e.locator}</p><p className="break-words text-xs text-muted-foreground">{e.country} · Observado {e.observedAt} · Vigencia {e.validFrom} → {e.validUntil}</p>
          <p className="mt-1 break-words">Límites: {e.limitations}</p>
        </li>)}</ul>
      </details>
    </details>)}</div>
    <details className="mt-3"><summary className="cursor-pointer py-2 focus-visible:outline-2">Frontera separada ({trace.borderCharges.length})</summary>
      <ul className="grid gap-3">{trace.borderCharges.map(b => <li key={b.id} className="min-w-0 rounded border p-3 text-sm">
        <p className="break-words">{b.provider} · {b.covers.join(' / ')} · {usd(b.amountUsd)}</p>
        <p className="break-words">{b.derivation}</p><a className="break-all text-primary underline" href={b.sourceUrl} target="_blank" rel="noopener noreferrer">{b.id} ↗</a>
        <p className="break-words">{b.locator}</p><p className="text-xs text-muted-foreground">Observado {b.observedAt} · Vigencia {b.validFrom} → {b.validUntil}</p>
      </li>)}</ul>
    </details>
  </details>
}
