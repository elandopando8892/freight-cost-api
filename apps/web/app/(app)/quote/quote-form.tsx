'use client'

import { useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { fetcher } from '@/lib/fetcher'
import { LocationInput } from './location-input'
import {
  type QuoteResult, type FormFields, type FormErrors, type LaneHint, type CostBaseOption,
  OPS, SVCS, TRUCKS, TRAILERS, CONFIGS, DRIVERS, ROUTES, selectCls,
  initialFormFor, compatibleBases, preferredGovernedBase, costBaseReadiness, costBaseReadinessDetail,
  validate, quoteBody, Field, CostBaseSelector, ResultSkeleton, Placeholder, Result,
} from './quote-shared'

export type { LaneHint }

type DisplayValue = Exclude<
  | (typeof OPS)[number]
  | (typeof SVCS)[number]
  | (typeof TRUCKS)[number]
  | (typeof TRAILERS)[number]
  | (typeof CONFIGS)[number]
  | (typeof DRIVERS)[number]
  | (typeof ROUTES)[number],
  ''
>

const DISPLAY_LABELS = {
  'D2D Export': 'D2D exportación',
  'D2D Import': 'D2D importación',
  Drayage: 'Arrastre portuario',
  'Intra-Mex': 'Intra-México',
  'MX Northbound': 'México hacia el norte',
  'MX Southbound': 'México hacia el sur',
  Local: 'Local',
  'One Way': 'Solo ida',
  Backhaul: 'Retorno',
  Roundtrip: 'Viaje redondo',
  Expedited: 'Expeditado',
  'Truck Trailer': 'Tractocamión',
  Thorton: 'Torton',
  Rabon: 'Rabón',
  '3.5 tons': '3.5 toneladas',
  '1.5 tons': '1.5 toneladas',
  'Dry Van': 'Caja seca',
  Flatbed: 'Plataforma',
  Reefer: 'Refrigerado',
  Hazmat: 'Materiales peligrosos',
  Chassis: 'Chasis',
  'Power Only': 'Solo tractocamión',
  Overdim: 'Sobredimensionado',
  Single: 'Sencillo',
  Tandem: 'Tándem',
  B1: 'B1',
  Interstate: 'Interestatal',
  Intrastate: 'Intraestatal',
  CDL: 'CDL',
  'Licencia E': 'Licencia E',
  'Mostly Straight': 'Mayormente recta',
  'Mixed Lane': 'Ruta mixta',
  'Mostly Curvy': 'Mayormente sinuosa',
  'Straight & Danger': 'Recta con riesgo',
  'Mixed & Danger': 'Mixta con riesgo',
  'Curvy & Danger': 'Sinuosa con riesgo',
} satisfies Record<DisplayValue, string>

const displayLabel = (value: string) => DISPLAY_LABELS[value as DisplayValue] ?? value

function validateInSpanish(form: FormFields): FormErrors {
  const errors = validate(form)
  if (errors.outboundLocation) errors.outboundLocation = 'Campo requerido: captura un código postal o una ciudad.'
  if (errors.inboundLocation) errors.inboundLocation = 'Campo requerido: captura un código postal o una ciudad.'
  if (errors.fxRate) errors.fxRate = 'El tipo de cambio debe ser un número mayor que cero.'
  return errors
}

export function QuoteForm({ recentLanes = [], costBases = [] }: { recentLanes?: LaneHint[]; costBases?: CostBaseOption[] }) {
  const [form, setForm] = useState<FormFields>(() => initialFormFor(costBases))
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [result, setResult] = useState<QuoteResult | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const recentRef = useRef<HTMLDetailsElement>(null)

  // Location suggestions for the autocomplete (progressive enhancement — a fetch
  // failure just means free-text only, so it's silent).
  const { data: locData } = useQuery({
    queryKey: ['catalog-locations'],
    queryFn: () => fetcher<{ locations: string[] }>('/api/v1/catalog/locations', { silent: true }),
    staleTime: Infinity,
  })
  const locations = locData?.locations ?? []

  const quote = useMutation({
    mutationFn: () => fetcher<QuoteResult>('/api/v1/engine/quote-by-route', { method: 'POST', json: quoteBody(form) }),
    onSuccess: (r) => {
      setResult(r)
      toast.success(`Base estimada ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(r.freightBaselineUsd)}`, {
        description: `${displayLabel(r.operation)} · ${r.mexLeg ? 'MEX' : ''}${r.mexLeg && r.usaLeg ? ' + ' : ''}${r.usaLeg ? 'EE. UU.' : ''}`,
      })
    },
    onError: () => { setResult(null) }, // fetcher already toasted the error
  })

  const set = <K extends keyof FormFields>(k: K, v: FormFields[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
    if (result) setResult(null)
  }
  const setOperation = (operation: (typeof OPS)[number]) => {
    const options = compatibleBases(costBases, operation)
    setForm((current) => {
      const currentStillValid = options.some((base) => base.id === current.costBaseId)
      const fallback = preferredGovernedBase(costBases, operation)
      return { ...current, operation, costBaseId: currentStillValid ? current.costBaseId : fallback?.id ?? '' }
    })
    if (result) setResult(null)
  }
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const err = validateInSpanish(form)
    setErrors(err)
    if (Object.keys(err).length > 0) return
    quote.mutate()
  }
  const clear = () => {
    setForm(initialFormFor(costBases))
    setResult(null)
    setErrors({})
    setShowAdvanced(false)
  }
  const applyLane = (lane: LaneHint) => {
    setForm((f) => ({
      ...f,
      outboundLocation: lane.origin ?? f.outboundLocation,
      inboundLocation: lane.destination ?? f.inboundLocation,
      ...(() => {
        const operation = (OPS as readonly string[]).includes(lane.operation) ? (lane.operation as (typeof OPS)[number]) : f.operation
        const options = compatibleBases(costBases, operation)
        const currentStillValid = options.some((base) => base.id === f.costBaseId)
        const fallback = preferredGovernedBase(costBases, operation)
        return { operation, costBaseId: currentStillValid ? f.costBaseId : fallback?.id ?? '' }
      })(),
      service: (SVCS as readonly string[]).includes(lane.service) ? (lane.service as (typeof SVCS)[number]) : f.service,
    }))
    setErrors({})
    if (result) setResult(null)
    if (recentRef.current) recentRef.current.open = false
  }
  const onFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // Cmd/Ctrl + Enter: submit from any field (incl. <select>, <button type=button>)
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      const err = validateInSpanish(form)
      setErrors(err)
      if (Object.keys(err).length === 0) quote.mutate()
    }
  }

  const selectedCostBase = costBases.find((base) => base.id === form.costBaseId)

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr] lg:items-start">
      <Card className="lg:sticky lg:top-4">
        <CardHeader>
          <div className="flex items-baseline justify-between gap-2">
            <CardTitle>Ruta</CardTitle>
            {recentLanes.length > 0 && (
              <details ref={recentRef} className="relative">
                <summary className="cursor-pointer list-none text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
                  Recientes ▾
                </summary>
                <div className="absolute right-0 z-30 mt-1 grid w-64 gap-0.5 rounded-md border bg-popover p-1 shadow-md">
                  {recentLanes.map((lane) => (
                    <button key={lane.id} type="button" onClick={() => applyLane(lane)} className="grid gap-0.5 rounded px-2 py-1.5 text-left hover:bg-accent">
                      <span className="truncate text-xs font-medium">{lane.origin ?? '—'} → {lane.destination ?? '—'}</span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {displayLabel(lane.operation)}{lane.service ? ` · ${displayLabel(lane.service)}` : ''}{lane.label ? ` · ${lane.label}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </details>
            )}
          </div>
          <CardDescription>Código postal, &ldquo;Ciudad, Estado&rdquo; o ciudad de una zona metropolitana.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit} onKeyDown={onFormKeyDown} noValidate>
            <Field label="Origen (remitente)" error={errors.outboundLocation} hint="Lugar donde se origina la carga. Escribe una ciudad o código postal para ver sugerencias.">
              <LocationInput value={form.outboundLocation} onChange={(v) => set('outboundLocation', v)} suggestions={locations} placeholder="Ej. 30901 o Augusta, GA" ariaInvalid={Boolean(errors.outboundLocation)} />
            </Field>
            <Field label="Destino (consignatario)" error={errors.inboundLocation} hint="Lugar donde se entrega la carga. Escribe una ciudad o código postal para ver sugerencias.">
              <LocationInput value={form.inboundLocation} onChange={(v) => set('inboundLocation', v)} suggestions={locations} placeholder="Ej. Querétaro, Qro. o 78040" ariaInvalid={Boolean(errors.inboundLocation)} />
            </Field>

            <Field label="Operación" hint="Tipo de movimiento: D2D de exportación o importación, arrastre portuario, Intra-México o local.">
              <select className={selectCls} value={form.operation} onChange={(e) => setOperation(e.target.value as (typeof OPS)[number])}>
                {OPS.map((o) => <option key={o} value={o}>{displayLabel(o)}</option>)}
              </select>
            </Field>

            <CostBaseSelector
              bases={costBases}
              operation={form.operation}
              value={form.costBaseId}
              onChange={(value) => set('costBaseId', value)}
            />

            <Field label={`Servicio ${form.service === '' ? '— automático por operación' : ''}`} hint="Automático usa el valor predeterminado de la operación. Puedes seleccionar viaje redondo o expeditado.">
              <select className={selectCls} value={form.service} onChange={(e) => set('service', e.target.value as (typeof SVCS)[number])}>
                <option value="">Automático (predeterminado de la operación)</option>
                {SVCS.filter((s) => s !== '').map((s) => <option key={s} value={s}>{displayLabel(s)}</option>)}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Camión">
                <select className={selectCls} value={form.truckType} onChange={(e) => set('truckType', e.target.value as (typeof TRUCKS)[number])}>
                  {TRUCKS.map((t) => <option key={t} value={t}>{displayLabel(t)}</option>)}
                </select>
              </Field>
              <Field label="Remolque">
                <select className={selectCls} value={form.trailer} onChange={(e) => set('trailer', e.target.value as (typeof TRAILERS)[number])}>
                  {TRAILERS.map((t) => <option key={t} value={t}>{displayLabel(t)}</option>)}
                </select>
              </Field>
              <Field label="Configuración">
                <select className={selectCls} value={form.config} onChange={(e) => set('config', e.target.value as (typeof CONFIGS)[number])}>
                  {CONFIGS.map((t) => <option key={t} value={t}>{displayLabel(t)}</option>)}
                </select>
              </Field>
              <Field label="Operador">
                <select className={selectCls} value={form.driver} onChange={(e) => set('driver', e.target.value as (typeof DRIVERS)[number])}>
                  {DRIVERS.map((t) => <option key={t} value={t}>{displayLabel(t)}</option>)}
                </select>
              </Field>
            </div>

            <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="text-xs text-muted-foreground hover:text-foreground">
              {showAdvanced ? '− Ocultar opciones avanzadas' : '+ Opciones avanzadas (fronteras, ruta y tipo de cambio)'}
            </button>
            {showAdvanced && (
              <div className="grid gap-3 rounded-md border bg-muted/30 p-3">
                <Field label="Frontera de México"><Input value={form.mexBorder} onChange={(e) => set('mexBorder', e.target.value)} /></Field>
                <Field label="Frontera de EE. UU."><Input value={form.usBorder} onChange={(e) => set('usBorder', e.target.value)} /></Field>
                <Field label="Tipo de ruta">
                  <select className={selectCls} value={form.route} onChange={(e) => set('route', e.target.value)}>
                    {ROUTES.map((r) => <option key={r} value={r}>{displayLabel(r)}</option>)}
                  </select>
                </Field>
                <Field label="Tipo de cambio personalizado (MXN/USD)" error={errors.fxRate}>
                  <Input type="number" step="any" value={form.fxRate} onChange={(e) => set('fxRate', e.target.value)} placeholder="Tipo de cambio de la versión activa" aria-invalid={Boolean(errors.fxRate)} />
                </Field>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={quote.isPending} className="flex-1">{quote.isPending ? 'Calculando…' : 'Generar tarifa'}</Button>
              <Button type="button" variant="outline" disabled={quote.isPending} onClick={clear} title="Reiniciar el formulario y limpiar el resultado">Limpiar</Button>
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">⌘</kbd>
              <span> + </span>
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">↵</kbd>
              <span> para calcular</span>
            </p>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {quote.isPending ? (
          <ResultSkeleton />
        ) : result ? (
          <Result
            r={result}
            snapshot={{
              service: form.service,
              fxRate: form.fxRate,
              origin: form.outboundLocation.trim(),
              destination: form.inboundLocation.trim(),
              equipment: { truckType: form.truckType, trailer: form.trailer, config: form.config, driver: form.driver },
              costBaseLabel: selectedCostBase?.code ?? 'Supuestos heredados',
              costBaseReadiness: costBaseReadiness(selectedCostBase),
              costBaseReadinessDetail: costBaseReadinessDetail(selectedCostBase, form.operation),
            }}
          />
        ) : (
          <Placeholder />
        )}
      </div>
    </div>
  )
}
