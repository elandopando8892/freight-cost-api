'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { fetcher } from '@/lib/fetcher'
import { LocationInput } from './location-input'
import {
  type QuoteResult, type FormFields, type FormErrors, type CostBaseOption,
  OPS, SVCS, TRUCKS, TRAILERS, CONFIGS, DRIVERS, ROUTES, selectCls,
  initialFormFor, compatibleBases, preferredGovernedBase, activeVersionFor,
  costBaseReadiness, costBaseReadinessDetail, quoteBody, Field, CostBaseSelector,
  CostBaseLineageNotice, ResultSkeleton, Result,
} from './quote-shared'

// Progressive-disclosure steps: one decision at a time, with microcopy.
const STEPS = [
  { key: 'lane', title: 'Ruta', blurb: 'Origen, destino, operación y base de costo que gobierna el cálculo.' },
  { key: 'equipment', title: 'Equipo', blurb: 'La configuración modifica combustible, mantenimiento y factores de riesgo.' },
  { key: 'review', title: 'Revisar', blurb: 'Confirma el contexto antes de generar una tarifa explicable.' },
] as const

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

export function QuoteWizard({ costBases = [] }: { costBases?: CostBaseOption[] }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormFields>(() => initialFormFor(costBases))
  const [errors, setErrors] = useState<FormErrors>({})
  const [result, setResult] = useState<QuoteResult | null>(null)

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
      toast.success(`Base estimada ${usdFmt(r.freightBaselineUsd)}`, {
        description: `${displayLabel(r.operation)} · ${r.mexLeg ? 'MEX' : ''}${r.mexLeg && r.usaLeg ? ' + ' : ''}${r.usaLeg ? 'EE. UU.' : ''}`,
      })
    },
    onError: () => setResult(null),
  })

  const set = <K extends keyof FormFields>(k: K, v: FormFields[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
    if (result) setResult(null) // changing inputs invalidates the shown price
  }

  // Only the lane step has required fields.
  const validateStep = (s: number): boolean => {
    if (s !== 0) return true
    const e: FormErrors = {}
    if (!form.outboundLocation.trim()) e.outboundLocation = 'Campo requerido: captura un código postal o una ciudad.'
    if (!form.inboundLocation.trim()) e.inboundLocation = 'Campo requerido: captura un código postal o una ciudad.'
    if (form.fxRate) {
      const n = Number(form.fxRate)
      if (!Number.isFinite(n) || n <= 0) e.fxRate = 'El tipo de cambio debe ser un número mayor que cero.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => { if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1)) }
  const back = () => setStep((s) => Math.max(s - 1, 0))
  const restart = () => { setForm(initialFormFor(costBases)); setErrors({}); setResult(null); setStep(0) }
  const selectedCostBase = costBases.find((base) => base.id === form.costBaseId)

  return (
    <div className="mx-auto grid max-w-4xl gap-5">
      <Stepper step={step} onJump={(s) => { if (s < step || validateStep(step)) setStep(s) }} />

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/25 pb-4">
          <CardTitle>{STEPS[step].title}</CardTitle>
          <CardDescription>{STEPS[step].blurb}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {step === 0 && <LaneStep form={form} errors={errors} set={set} locations={locations} costBases={costBases} />}
          {step === 1 && <EquipmentStep form={form} set={set} />}
          {step === 2 && <ReviewStep form={form} onEdit={setStep} costBases={costBases} />}
        </CardContent>
      </Card>

      {/* Nav */}
      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <Button variant="ghost" onClick={back} disabled={step === 0}>← Anterior</Button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={restart} className="text-xs text-muted-foreground hover:text-foreground">Reiniciar</button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Continuar →</Button>
          ) : (
            <Button onClick={() => quote.mutate()} disabled={quote.isPending}>
              {quote.isPending ? 'Calculando…' : result ? 'Recalcular' : 'Generar tarifa'}
            </Button>
          )}
        </div>
      </div>

      {/* Result (only on the review step) */}
      {step === STEPS.length - 1 && (
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
          ) : null}
        </div>
      )}
    </div>
  )
}

const usdFmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function Stepper({ step, onJump }: { step: number; onJump: (s: number) => void }) {
  return (
    <ol className="flex items-center gap-2 rounded-xl border bg-muted/25 p-3">
      {STEPS.map((s, i) => {
        const state = i < step ? 'done' : i === step ? 'active' : 'todo'
        return (
          <li key={s.key} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => onJump(i)}
              className="flex items-center gap-2"
              aria-current={state === 'active' ? 'step' : undefined}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                state === 'active' ? 'bg-primary text-primary-foreground'
                  : state === 'done' ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {state === 'done' ? '✓' : i + 1}
              </span>
              <span className={`text-sm ${state === 'active' ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{s.title}</span>
            </button>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        )
      })}
    </ol>
  )
}

type StepProps = {
  form: FormFields
  set: <K extends keyof FormFields>(k: K, v: FormFields[K]) => void
}

function LaneStep({ form, errors, set, locations, costBases }: StepProps & { errors: FormErrors; locations: string[]; costBases: CostBaseOption[] }) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Origen (remitente)" error={errors.outboundLocation} hint="Lugar donde se origina la carga.">
          <LocationInput value={form.outboundLocation} onChange={(v) => set('outboundLocation', v)} suggestions={locations} placeholder="Ej. 30901 o Augusta, GA" ariaInvalid={Boolean(errors.outboundLocation)} />
        </Field>
        <Field label="Destino (consignatario)" error={errors.inboundLocation} hint="Lugar donde se entrega la carga.">
          <LocationInput value={form.inboundLocation} onChange={(v) => set('inboundLocation', v)} suggestions={locations} placeholder="Ej. Querétaro, Qro. o 78040" ariaInvalid={Boolean(errors.inboundLocation)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Operación" hint="Tipo de movimiento: D2D de exportación o importación, arrastre portuario, Intra-México o local.">
          <select className={selectCls} value={form.operation} onChange={(e) => {
            const operation = e.target.value as (typeof OPS)[number]
            const options = compatibleBases(costBases, operation)
            const currentStillValid = options.some((base) => base.id === form.costBaseId)
            const fallback = preferredGovernedBase(costBases, operation)
            set('operation', operation)
            set('costBaseId', currentStillValid ? form.costBaseId : fallback?.id ?? '')
          }}>
            {OPS.map((o) => <option key={o} value={o}>{displayLabel(o)}</option>)}
          </select>
        </Field>
        <Field label="Servicio" hint="Automático usa el valor predeterminado de la operación: retorno para importación o ruta sur; solo ida en los demás casos.">
          <select className={selectCls} value={form.service} onChange={(e) => set('service', e.target.value as (typeof SVCS)[number])}>
            <option value="">Automático (predeterminado de la operación)</option>
            {SVCS.filter((s) => s !== '').map((s) => <option key={s} value={s}>{displayLabel(s)}</option>)}
          </select>
        </Field>
      </div>
      <CostBaseSelector
        bases={costBases}
        operation={form.operation}
        value={form.costBaseId}
        onChange={(value) => set('costBaseId', value)}
      />
      <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="justify-self-start text-xs text-muted-foreground hover:text-foreground">
        {showAdvanced ? '− Ocultar opciones avanzadas' : '+ Opciones avanzadas (fronteras, ruta y tipo de cambio)'}
      </button>
      {showAdvanced && (
        <div className="grid gap-4 rounded-md border bg-muted/30 p-3 sm:grid-cols-2">
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
    </>
  )
}

function EquipmentStep({ form, set }: StepProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Camión" hint="La clase del camión determina la eficiencia de combustible y los factores de costo fijo.">
        <select className={selectCls} value={form.truckType} onChange={(e) => set('truckType', e.target.value as (typeof TRUCKS)[number])}>
          {TRUCKS.map((t) => <option key={t} value={t}>{displayLabel(t)}</option>)}
        </select>
      </Field>
      <Field label="Remolque" hint="La plataforma agrega complejidad; el chasis dirige el cálculo al ciclo de arrastre portuario.">
        <select className={selectCls} value={form.trailer} onChange={(e) => set('trailer', e.target.value as (typeof TRAILERS)[number])}>
          {TRAILERS.map((t) => <option key={t} value={t}>{displayLabel(t)}</option>)}
        </select>
      </Field>
      <Field label="Configuración" hint="Tándem agrega un segundo remolque y dolly, con mayor costo fijo y tiempo de maniobra.">
        <select className={selectCls} value={form.config} onChange={(e) => set('config', e.target.value as (typeof CONFIGS)[number])}>
          {CONFIGS.map((t) => <option key={t} value={t}>{displayLabel(t)}</option>)}
        </select>
      </Field>
      <Field label="Operador" hint="La clase de licencia del operador define el factor de mano de obra.">
        <select className={selectCls} value={form.driver} onChange={(e) => set('driver', e.target.value as (typeof DRIVERS)[number])}>
          {DRIVERS.map((t) => <option key={t} value={t}>{displayLabel(t)}</option>)}
        </select>
      </Field>
    </div>
  )
}

function ReviewStep({ form, onEdit, costBases }: { form: FormFields; onEdit: (s: number) => void; costBases: CostBaseOption[] }) {
  const selectedBase = costBases.find((base) => base.id === form.costBaseId)
  const activeVersion = activeVersionFor(selectedBase)
  const rows: { label: string; value: string; step: number }[] = [
    { label: 'Ruta', value: `${form.outboundLocation || '—'} → ${form.inboundLocation || '—'}`, step: 0 },
    { label: 'Operación', value: `${displayLabel(form.operation)}${form.service ? ` · ${displayLabel(form.service)}` : ' · Servicio automático'}`, step: 0 },
    { label: 'Base de costo', value: selectedBase ? `${selectedBase.code} · ${selectedBase.name}${activeVersion ? ` · v${activeVersion.version}` : ''}` : 'Supuestos activos heredados', step: 0 },
    { label: 'Equipo', value: `${displayLabel(form.truckType)} · ${displayLabel(form.trailer)} · ${displayLabel(form.config)} · ${displayLabel(form.driver)}`, step: 1 },
  ]
  return (
    <div className="grid gap-3">
      <dl className="grid gap-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">{r.label}</dt>
              <dd className="truncate font-medium">{r.value}</dd>
            </div>
            <button type="button" onClick={() => onEdit(r.step)} className="shrink-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">Editar</button>
          </div>
        ))}
      </dl>
      <CostBaseLineageNotice base={selectedBase} operation={form.operation} />
      <p className="text-xs text-muted-foreground">Selecciona <span className="font-medium text-foreground">Generar tarifa</span> para calcular esta ruta con el conjunto activo de supuestos.</p>
    </div>
  )
}
