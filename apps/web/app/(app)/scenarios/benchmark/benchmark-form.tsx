'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { fetcher } from '@/lib/fetcher'

export type FormNode = { kind: 'object' | 'array' | 'text' | 'number' | 'choice' | 'fixed'; fields?: Record<string, FormNode>; item?: FormNode; choices?: string[]; value?: string; max?: number; rows?: Record<string, unknown>[] }
export type FormValue = string | number | FormValue[] | { [key: string]: FormValue }
export function emptyForm(node: FormNode): FormValue {
  if (node.kind === 'fixed') return node.value!
  if (node.kind === 'object') return Object.fromEntries(Object.entries(node.fields!).map(([key, field]) => [key, emptyForm(field)]))
  if (node.kind === 'array') return (node.rows ?? []).map(row => ({ ...(emptyForm(node.item!) as Record<string, FormValue>), ...row } as FormValue))
  return ''
}
const labels: Record<string, string> = {
  route: 'Ruta', fixed: 'Capital y costos fijos', trailer: 'Utilización del remolque', direction: 'Sentido', serviceDate: 'Fecha del servicio',
  mx: 'Tramo México', us: 'Tramo Estados Unidos', mxEndpoint: 'Punto en México', mxGateway: 'Cruce en México', usGateway: 'Cruce en Estados Unidos', usEndpoint: 'Punto en Estados Unidos',
  parameters: 'Parámetros económicos', trip: 'Datos del viaje', evidence: 'Fuentes documentales', evidenceIds: 'Referencias de fuentes (ID)', allocationEvidenceIds: 'Fuentes de asignación (ID)',
  capital: 'Capital del remolque', assetReference: 'Referencia del activo', condition: 'Condición', country: 'País', acquisitionCost: 'Costo de adquisición',
  scenarios: 'Escenarios de capital', horizon: 'Horizonte', horizonBasis: 'Base del horizonte', residual: 'Valor residual', applicabilityRationale: 'Justificación de aplicabilidad',
  financing: 'Intereses por escenario', scenarioId: 'ID del escenario de capital', interest: 'Interés mensual promedio', expenses: 'Gastos fijos', concept: 'Concepto', amount: 'Importe',
  value: 'Valor', unit: 'Unidad', derivation: 'Método o supuesto documentado', id: 'Identificador', key: 'Clave canónica', baseRevision: 'Revisión de la base',
  url: 'URL de la fuente (HTTPS)', sourceUrl: 'URL de la fuente (HTTPS)', locator: 'Página o ubicación del dato', observedAt: 'Fecha de consulta / observación', validFrom: 'Vigente desde', validUntil: 'Vigente hasta', limitations: 'Limitaciones',
  borderCharges: 'Servicios fronterizos', covers: 'Conceptos cubiertos', amountUsd: 'Importe USD', provider: 'Proveedor',
  loadedKm: 'Distancia cargado', emptyKm: 'Distancia vacío', cycleDays: 'Días del ciclo', tollsUsd: 'Peajes USD', totalKm: 'Distancia total del remolque',
  productiveKmPerMonth: 'Kilómetros productivos mensuales', productiveDaysPerMonth: 'Días productivos mensuales', maintenanceUsdPerKm: 'Mantenimiento por km', tiresUsdPerKm: 'Llantas por km',
  allocationRationale: 'Justificación de asignación', allocationEvidence: 'Soporte de asignación', assetAllocation: 'Asignación de activos', assetCostScope: 'Alcance de costos', allocation: 'Alcance de costos fijos', scopeDeclaration: 'Declaración de alcance', model: 'Modelo', equipment: 'Equipo', basis: 'Base financiera',
}
const choices: Record<string, string> = { MX_TO_US: 'México → Estados Unidos', US_TO_MX: 'Estados Unidos → México', MX: 'México', US: 'Estados Unidos', NEW: 'Nuevo', USED: 'Usado', FROM_NEW: 'Desde nuevo', REMAINING_FROM_ACQUISITION: 'Vida remanente desde adquisición', INSURANCE: 'Seguro', PERMITS: 'Permisos', OVERHEAD: 'Administración', CROSSING: 'Cruce', INTERCHANGE: 'Intercambio', TRACTOR_ONLY: 'Solo tractocamión', TRACTOR_AND_TRAILER: 'Tractocamión y remolque' }
const label = (key: string) => labels[key] ?? key
const control = 'min-w-0 w-full rounded border bg-background p-2 text-sm focus-visible:outline-2 focus-visible:outline-primary'
export function FormField({ node, value, path, name, onChange }: { node: FormNode; value: FormValue; path: string; name: string; onChange: (value: FormValue) => void }) {
  const [open, setOpen] = useState(false)
  if (node.kind === 'object') return <details onToggle={e => setOpen(e.currentTarget.open)} className="min-w-0 rounded-lg border p-3"><summary className="cursor-pointer break-words font-medium">{label(name)}</summary><div className="mt-3 grid gap-3">{open && Object.entries(node.fields!).map(([key, field]) => <FormField key={key} node={field} value={(value as Record<string, FormValue>)[key]} path={`${path}.${key}`} name={key} onChange={next => onChange({ ...(value as Record<string, FormValue>), [key]: next })} />)}</div></details>
  if (node.kind === 'array') {
    const rows = value as FormValue[]
    return <details onToggle={e => setOpen(e.currentTarget.open)} className="min-w-0 rounded-lg border p-3"><summary className="cursor-pointer">{label(name)} ({rows.length})</summary><div className="mt-3 grid gap-3">{open && rows.map((row, index) => <div className="grid min-w-0 gap-2 border-l pl-3" key={index}><FormField node={node.item!} value={row} path={`${path}.${index}`} name={`${label(name)} ${index + 1}`} onChange={next => onChange(rows.map((r, i) => i === index ? next : r))} /><Button variant="outline" aria-label={`Quitar ${path}.${index}`} onClick={() => onChange(rows.filter((_, i) => i !== index))}>Quitar fila {index + 1}</Button></div>)}<Button variant="outline" disabled={rows.length >= (node.max ?? 300)} onClick={() => onChange([...rows, emptyForm(node.item!)])}>Agregar {label(name).toLowerCase()}</Button></div></details>
  }
  if (node.kind === 'fixed') return <p className="break-words text-xs text-muted-foreground">{label(name)}: {node.value}</p>
  const accessible = `${label(name)} · ${path}`
  return <label className="grid min-w-0 gap-2 text-sm">{label(name)}{node.kind === 'choice' ? <select className={control} aria-label={accessible} value={String(value)} onChange={e => onChange(e.target.value)}><option value="">Selecciona…</option>{node.choices!.map(v => <option key={v} value={v}>{choices[v] ?? v}</option>)}</select> : <input className={control} aria-label={accessible} type={node.kind === 'number' ? 'number' : /^(serviceDate|observedAt|validFrom|validUntil)$/.test(name) ? 'date' : 'text'} step="any" maxLength={2000} value={value as string | number} onChange={e => onChange(node.kind === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)} />}</label>
}
export function GuidedFields({ schema, onChange }: { schema: FormNode; onChange: (text: string) => void }) {
  const [value, setValue] = useState(() => emptyForm(schema) as Record<string, FormValue>)
  const [section, setSection] = useState('route')
  const titles = { route: '1. Ruta y tramos', fixed: '2. Capital y costos fijos', trailer: '3. Utilización' }
  return <section className="grid gap-4" aria-label="Captura guiada">
    <nav className="flex flex-wrap gap-2" aria-label="Bloques del expediente">{Object.entries(titles).map(([key, title]) => <Button key={key} variant={section === key ? 'default' : 'outline'} aria-pressed={section === key} onClick={() => setSection(key)}>{title}</Button>)}</nav>
    <p className="text-sm text-muted-foreground">Los importes vacíos están pendientes, no equivalen a cero. Vincula cada valor a su fuente; las claves y unidades no son valores de benchmark.</p>
    <div className="grid gap-3" key={section}>{Object.entries(schema.fields![section].fields!).map(([key, node]) => <FormField key={key} node={node} name={key} path={`${section}.${key}`} value={(value[section] as Record<string, FormValue>)[key]} onChange={next => {
      const updated = { ...value, [section]: { ...(value[section] as Record<string, FormValue>), [key]: next } }
      setValue(updated); onChange(JSON.stringify(updated))
    }} />)}</div>
  </section>
}
export function BenchmarkForm({ onChange }: { onChange: (text: string) => void }) {
  const [schema, setSchema] = useState<FormNode | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setFailed(false)
    fetcher<FormNode>('/api/v1/engine/benchmark-owned-d2d/form', { silent: true }).then(s => { if (active) setSchema(s) }).catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [attempt])
  if (failed) return <div role="alert">No se pudo cargar el formulario. Verifica tu sesión y permisos.<Button variant="outline" onClick={() => setAttempt(a => a + 1)}>Reintentar</Button></div>
  if (!schema) return <p role="status">Cargando campos del motor…</p>
  return <GuidedFields schema={schema} onChange={onChange} />
}
