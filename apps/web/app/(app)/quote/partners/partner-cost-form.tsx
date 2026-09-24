'use client'

import { createContext, useContext, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { fetcher, ClientApiError } from '@/lib/fetcher'

const control = 'min-h-11 w-full min-w-0 rounded border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring'
export type Report = {
  baseLineage?: { costBaseId: string; versionId: string; version: number; termsChecksum: string; model: string }
  reviewChecksum: string
  modelVersion: string
  input: Record<string, unknown>
  status: 'INCOMPLETE' | 'ESTIMATE'
  purchaseCostUsd: number | null
  issues: { field: string; message: string }[]
  lines: { id: string; label: string; provider: string; amount: number; currency: string; usd: number | null }[]
  inclusions: { label: string; includedIn: string }[]
  exclusions: string[]
}
const usd = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol' }).format(value)
export const InitialInput = createContext<Record<string, unknown>>({})
function useInitial(name: string) {
  const input = useContext(InitialInput)
  const value = name.split('.').reduce<unknown>((obj, key) => obj && typeof obj === 'object' ? (obj as Record<string, unknown>)[key] : undefined, input)
  return value === undefined ? '' : String(value)
}

function invalidFieldCopy(body: unknown) {
  const labels: Record<string, string> = { mex: 'tarifa y condiciones MX', usa: 'tarifa y condiciones US',
    crossing: 'cruce', interchange: 'intercambio', fx: 'tipo de cambio y fuente', segment: 'empresa principal',
    direction: 'dirección', serviceDate: 'fecha del viaje', origin: 'origen', destination: 'destino',
    equipment: 'equipo', mxInterchange: 'punto de intercambio MX', usInterchange: 'punto de intercambio US', assumptions: 'supuestos' }
  const issues = body && typeof body === 'object' && 'issues' in body ? body.issues : null
  const fields = Array.isArray(issues) ? [...new Set(issues.flatMap(issue => {
    const key = typeof issue?.field === 'string' ? issue.field.split('.')[0] : ''
    return Object.hasOwn(labels, key) ? [labels[key]] : []
  }))] : []
  return fields.length ? `Revisa: ${fields.join(', ')}. Usa importes positivos, fechas válidas y referencias completas.`
    : 'Revisa importes, fechas y referencias. Los importes admiten hasta dos decimales.'
}

export function Field({ name, label, type = 'text', required = true, minLength, maxLength = 240, step = '0.01' }: {
  name: string; label: string; type?: string; required?: boolean; minLength?: number; maxLength?: number; step?: string
}) {
  return <label className="grid min-w-0 gap-1 text-sm"><span>{label}</span>
    <input className={control} name={name} type={type} required={required} minLength={minLength} defaultValue={useInitial(name)}
      maxLength={maxLength} min={type === 'number' ? 0 : undefined} max={type === 'number' ? 100000000 : undefined}
      step={type === 'number' ? step : undefined} />
  </label>
}
export function Select({ name, label, children, onChange, value }: {
  name: string; label: string; children: ReactNode; onChange?: (value: string) => void; value?: string
}) {
  const initial = useInitial(name)
  return <label className="grid min-w-0 gap-1 text-sm"><span>{label}</span>
    <select className={control} name={name} required value={value} defaultValue={value === undefined ? initial : undefined}
      onChange={event => onChange?.(event.target.value)}>{children}</select>
  </label>
}
function Currency({ name }: { name: string }) {
  return <Select name={name} label="Moneda"><option value="" disabled>Elegir</option><option>MXN</option><option>USD</option></Select>
}
export function Notes({ name, label }: { name: string; label: string }) {
  return <label className="grid gap-1 text-sm"><span>{label}</span>
    <textarea className={control} name={name} required minLength={10} maxLength={1500} rows={3} defaultValue={useInitial(name)} />
  </label>
}
export function Term({ name, label, border = false }: { name: string; label: string; border?: boolean }) {
  const initial = useInitial(`${name}.mode`)
  const [mode, setMode] = useState(initial || 'UNKNOWN')
  return <div className="space-y-3 rounded border p-3">
    <Select name={`${name}.mode`} label={label} value={mode} onChange={setMode}>
      <option value="UNKNOWN">Por confirmar</option>
      {border ? <><option value="INCLUDED_MX">Incluido en tarifa MX</option><option value="INCLUDED_US">Incluido en tarifa US</option></>
        : <option value="INCLUDED">Incluido en la tarifa</option>}
      <option value="EXTRA">Cargo adicional</option>
    </Select>
    {mode === 'EXTRA' && <div className="grid gap-3 sm:grid-cols-2">
      <Field name={`${name}.amount`} label={border ? 'Importe adicional' : 'Importe en la moneda de la línea'} type="number" />
      {border && <>
        <Currency name={`${name}.currency`} />
        <Field name={`${name}.provider`} label="Proveedor que cobra" />
        <Field name={`${name}.reference`} label="Referencia de la tarifa" />
        <Field name={`${name}.validFrom`} label="Vigente desde" type="date" />
        <Field name={`${name}.validUntil`} label="Vigente hasta" type="date" />
      </>}
    </div>}
  </div>
}
export function Carrier({ name, label }: { name: string; label: string }) {
  return <fieldset className="min-w-0 space-y-4 rounded border bg-card p-5">
    <legend className="px-1 font-semibold">{label}</legend>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field name={`${name}.carrier`} label="Transportista" minLength={2} />
      <Field name={`${name}.reference`} label="Referencia de la tarifa" minLength={2} />
      <Field name={`${name}.validFrom`} label="Vigente desde" type="date" />
      <Field name={`${name}.validUntil`} label="Vigente hasta" type="date" />
      <Field name={`${name}.linehaul`} label="Tarifa por viaje" type="number" />
      <Currency name={`${name}.currency`} />
    </div>
    <Term name={`${name}.fuel`} label="Combustible" />
    <Term name={`${name}.tolls`} label="Peajes" />
    <Notes name={`${name}.conditions`} label="Condiciones y exclusiones de la línea" />
  </fieldset>
}

export function partnerCostPayload(data: FormData) {
  const string = (name: string) => String(data.get(name) ?? '').trim()
  const number = (name: string) => string(name) === '' ? null : Number(string(name))
  const term = (name: string, border = false) => {
    const mode = string(`${name}.mode`)
    if (mode !== 'EXTRA') return { mode }
    return { mode, amount: number(`${name}.amount`), ...(border ? {
      currency: string(`${name}.currency`), provider: string(`${name}.provider`), reference: string(`${name}.reference`),
      validFrom: string(`${name}.validFrom`), validUntil: string(`${name}.validUntil`),
    } : {}) }
  }
  const carrier = (name: string) => ({
    carrier: string(`${name}.carrier`), reference: string(`${name}.reference`),
    validFrom: string(`${name}.validFrom`), validUntil: string(`${name}.validUntil`),
    currency: string(`${name}.currency`), linehaul: number(`${name}.linehaul`),
    fuel: term(`${name}.fuel`), tolls: term(`${name}.tolls`), conditions: string(`${name}.conditions`),
  })
  return {
    segment: string('segment'), direction: string('direction'), service: 'ONE_WAY', serviceDate: string('serviceDate'),
    origin: string('origin'), destination: string('destination'), equipment: string('equipment'),
    mxInterchange: string('mxInterchange'), usInterchange: string('usInterchange'), assumptions: string('assumptions'),
    mex: carrier('mex'), usa: carrier('usa'), crossing: term('crossing', true), interchange: term('interchange', true),
    ...(string('fx.mxnPerUsd') || string('fx.source') || string('fx.asOf') ? {
      fx: { mxnPerUsd: number('fx.mxnPerUsd'), source: string('fx.source'), asOf: string('fx.asOf') },
    } : {}),
  }
}

export function PartnerCostForm({ initialInput = {}, previousId, readOnly = false, termsOnly = false }: { initialInput?: Record<string, unknown>; previousId?: string; readOnly?: boolean; termsOnly?: boolean }) {
  const formId = useId()
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const busy = useRef(false)
  const [saving, setSaving] = useState(false)
  const [saveLocked, setSaveLocked] = useState(false)
  const [saved, setSaved] = useState<{ id: string; version: number } | null>(null)
  const intent = useRef<{ key: string; body: unknown } | null>(null)
  async function save() {
    if (busy.current || !report || saved || readOnly) return
    busy.current = true
    setSaving(true); setSaveLocked(true); setError('')
    intent.current ??= { key: crypto.randomUUID(), body: { input: report.input, reviewChecksum: report.reviewChecksum, ...(previousId ? { previousId } : {}) } }
    try {
      setSaved(await fetcher<{ id: string; version: number }>('/api/v1/partner-cost-estimates', {
        method: 'POST', headers: { 'Idempotency-Key': intent.current.key }, json: intent.current.body, silent: true,
      }))
    } catch (caught) {
      // A timeout may hide a successful commit. Keep the exact key/body and lock
      // the capture until retry reconciles it; never issue a second save intent.
      if (caught instanceof ClientApiError && [400, 403, 409, 422].includes(caught.status)) {
        intent.current = null; setSaveLocked(false)
        if (caught.status === 409) setReport(null)
        setError(caught.status === 409 ? 'No se guardó esta solicitud: el cálculo cambió o ya existe otra versión. Abre el historial antes de recalcular.'
          : caught.status === 403 ? 'Tu rol no permite guardar estimaciones.' : 'Revisa los conceptos antes de guardar.')
      } else setError('No pudimos confirmar el guardado. Reintenta con el mismo botón para recuperar el resultado sin duplicarlo. También puedes consultar el historial.')
    } finally { busy.current = false; setSaving(false) }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current || saveLocked || readOnly) return
    const payload = partnerCostPayload(new FormData(event.currentTarget))
    busy.current = true
    setPending(true); setReport(null); setError('')
    try {
      setReport(await fetcher<Report>('/api/v1/engine/third-party-cost', { method: 'POST', json: payload, silent: true }))
    } catch (caught) {
      setError(caught instanceof ClientApiError && caught.status === 403 ? 'Tu rol no permite generar cálculos.'
        : caught instanceof ClientApiError && caught.status === 400 ? invalidFieldCopy(caught.body)
          : caught instanceof ClientApiError && caught.status === 401 ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
            : 'No se pudo calcular. Conservamos tu captura para que puedas reintentar.')
    } finally { busy.current = false; setPending(false) }
  }
  return <InitialInput.Provider value={initialInput}><div className="space-y-6">
    <form onSubmit={submit} onChange={() => { setReport(null); setError('') }}>
      <fieldset disabled={pending || saveLocked || readOnly} className={`min-w-0 space-y-6 ${readOnly ? '' : 'disabled:opacity-70'}`}>
        <legend className="sr-only">Datos del costo de socios</legend>
        <fieldset className="space-y-4 rounded border bg-card p-5">
          <legend className="px-1 font-semibold">1. Movimiento</legend>
          <div className="grid gap-4 md:grid-cols-3">
            <Select name="segment" label="Empresa principal"><option value="" disabled>Elegir</option>
              <option value="D2D_MX_US_PARTNER">Línea mexicana + socio US</option><option value="D2D_US_MX_PARTNER">Línea US + socio mexicano</option>
            </Select>
            <Select name="direction" label="Dirección"><option value="" disabled>Elegir</option><option value="MX_TO_US">México → EE. UU.</option><option value="US_TO_MX">EE. UU. → México</option></Select>
            {!termsOnly && <Field name="serviceDate" label="Fecha del viaje" type="date" />}
            <Field name="origin" label="Origen" minLength={2} /><Field name="destination" label="Destino" minLength={2} /><Field name="equipment" label="Equipo y configuración" minLength={2} />
            <Field name="mxInterchange" label="Punto de intercambio en MX" minLength={2} /><Field name="usInterchange" label="Punto de intercambio en US" minLength={2} />
          </div>
          <Notes name="assumptions" label="Supuestos: carga, tiempos y responsabilidades por tramo" />
        </fieldset>
        <section aria-labelledby={`${formId}-carriers`} className="space-y-3">
          <h2 id={`${formId}-carriers`} className="font-semibold">2. Tarifas de las líneas</h2>
          <div className="grid gap-5 md:grid-cols-2"><Carrier name="mex" label="Línea mexicana" /><Carrier name="usa" label="Línea estadounidense" /></div>
        </section>
        <fieldset className="space-y-4 rounded border bg-card p-5">
          <legend className="px-1 font-semibold">3. Cruce e intercambio</legend>
          <p className="text-sm text-muted-foreground">Asigna cada concepto una sola vez. Si ya está dentro de una tarifa, elige la línea que lo incluye.</p>
          <div className="grid gap-4 md:grid-cols-2"><Term name="crossing" label="Cruce fronterizo" border /><Term name="interchange" label="Intercambio de equipo" border /></div>
          {!termsOnly && <><p className="text-sm text-muted-foreground">Si hay importes en MXN, captura su conversión a USD.</p>
          <div className="grid gap-4 md:grid-cols-3">
            <Field name="fx.mxnPerUsd" label="MXN por 1 USD" type="number" step="0.000001" required={false} />
            <Field name="fx.source" label="Fuente del tipo de cambio" required={false} />
            <Field name="fx.asOf" label="Fecha del tipo de cambio" type="date" required={false} />
          </div></>}
        </fieldset>
        {!readOnly && <><p className="text-sm text-muted-foreground">Calcula y revisa antes de guardar. Sólo costo de compra: no genera una cotización de venta ni envía tarifas.</p>
        <button type="submit" className="min-h-11 w-full rounded bg-primary px-5 py-3 font-semibold text-primary-foreground hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-auto">{pending ? 'Calculando…' : 'Calcular costo de compra'}</button>
        </>}
      </fieldset>
    </form>
    {error && <p role="alert" className="rounded border border-destructive p-4 text-sm">{error}</p>}
    <div aria-live="polite" aria-busy={pending}>
      {report && <section className="space-y-4 rounded border bg-card p-5" aria-labelledby={`${formId}-result`}>
        <h2 id={`${formId}-result`} className="text-lg font-semibold">{report.status === 'INCOMPLETE' ? 'Completa los conceptos pendientes' : 'Costo conocido de compra'}</h2>
        {report.issues.length > 0 && <ul className="list-disc space-y-2 pl-5 text-sm">{report.issues.map(issue => <li key={issue.field}>{issue.message}</li>)}</ul>}
        <dl className="space-y-3">{report.lines.map(line => <div key={line.id} className="flex flex-wrap justify-between gap-2 border-b pb-2 text-sm">
          <dt className="min-w-0 break-words">{line.label}<span className="block text-xs text-muted-foreground">{line.provider} · {line.amount.toLocaleString('es-MX')} {line.currency}</span></dt>
          <dd className="font-mono">{line.usd === null ? 'FX pendiente' : `${usd(line.usd)} USD`}</dd>
        </div>)}</dl>
        {report.inclusions.length > 0 && <ul className="space-y-1 text-xs text-muted-foreground">{report.inclusions.map(item => <li key={item.label}>{item.label}: incluido en {item.includedIn.toLowerCase()}.</li>)}</ul>}
        {report.purchaseCostUsd !== null && <p className="border-t pt-4 font-mono text-2xl font-semibold">{usd(report.purchaseCostUsd)} USD</p>}
        <p className="text-xs text-muted-foreground">Fuentes declaradas por el usuario. Excluye: {report.exclusions.join('; ')}.</p>
      </section>}
    </div>
    {report?.status === 'ESTIMATE' && report.purchaseCostUsd !== null && !saved && <button type="button" onClick={save} disabled={saving}
      className="min-h-11 rounded bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-ring">
      {saving ? 'Guardando…' : saveLocked ? 'Reintentar guardado sin duplicar' : previousId ? 'Guardar nueva versión' : 'Guardar estimación'}
    </button>}
    {saved && <p role="status" className="rounded border bg-card p-4">Versión {saved.version} guardada. <a className="underline underline-offset-4" href={`/quote/partners/saved/${saved.id}`}>Abrir versión guardada</a></p>}
  </div></InitialInput.Provider>
}
