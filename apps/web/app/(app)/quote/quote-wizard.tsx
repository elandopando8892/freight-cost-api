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
  { key: 'lane', title: 'Ruta', blurb: 'Where the load moves. This resolves distances, borders, and market on the server.' },
  { key: 'equipment', title: 'Equipo', blurb: 'What hauls it. Equipment changes fuel, maintenance, and risk factors.' },
  { key: 'review', title: 'Revisar', blurb: 'Confirm and price. You can tweak anything before saving.' },
] as const

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
      toast.success(`Baseline ${usdFmt(r.freightBaselineUsd)}`, {
        description: `${r.operation} · ${r.mexLeg ? 'MEX' : ''}${r.mexLeg && r.usaLeg ? ' + ' : ''}${r.usaLeg ? 'USA' : ''}`,
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
    if (!form.outboundLocation.trim()) e.outboundLocation = 'Required — ZIP, "City, ST", or a metro city'
    if (!form.inboundLocation.trim()) e.inboundLocation = 'Required — ZIP, "City, ST", or a metro city'
    if (form.fxRate) {
      const n = Number(form.fxRate)
      if (!Number.isFinite(n) || n <= 0) e.fxRate = 'Must be a positive number'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => { if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1)) }
  const back = () => setStep((s) => Math.max(s - 1, 0))
  const restart = () => { setForm(initialFormFor(costBases)); setErrors({}); setResult(null); setStep(0) }
  const selectedCostBase = costBases.find((base) => base.id === form.costBaseId)

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <Stepper step={step} onJump={(s) => { if (s < step || validateStep(step)) setStep(s) }} />

      <Card>
        <CardHeader>
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
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={back} disabled={step === 0}>← Back</Button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={restart} className="text-xs text-muted-foreground hover:text-foreground">Start over</button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Next →</Button>
          ) : (
            <Button onClick={() => quote.mutate()} disabled={quote.isPending}>
              {quote.isPending ? 'Pricing…' : result ? 'Re-price' : 'Get quote'}
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
                costBaseLabel: selectedCostBase?.code ?? 'Legacy',
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
    <ol className="flex items-center gap-2">
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
        <Field label="Outbound (shipper)" error={errors.outboundLocation} hint="Where the load originates.">
          <LocationInput value={form.outboundLocation} onChange={(v) => set('outboundLocation', v)} suggestions={locations} placeholder="e.g. 30901 or Augusta, GA" ariaInvalid={Boolean(errors.outboundLocation)} />
        </Field>
        <Field label="Inbound (consignee)" error={errors.inboundLocation} hint="Where the load delivers.">
          <LocationInput value={form.inboundLocation} onChange={(v) => set('inboundLocation', v)} suggestions={locations} placeholder="e.g. Queretaro, Qro or 78040" ariaInvalid={Boolean(errors.inboundLocation)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Operation" hint="Movement type: D2D Export/Import (cross-border), Drayage (port), Intra-Mex, or Local.">
          <select className={selectCls} value={form.operation} onChange={(e) => {
            const operation = e.target.value as (typeof OPS)[number]
            const options = compatibleBases(costBases, operation)
            const currentStillValid = options.some((base) => base.id === form.costBaseId)
            const fallback = preferredGovernedBase(costBases, operation)
            set('operation', operation)
            set('costBaseId', currentStillValid ? form.costBaseId : fallback?.id ?? '')
          }}>
            {OPS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Service" hint="Auto uses the operation default (Import/Southbound → Backhaul, else One Way).">
          <select className={selectCls} value={form.service} onChange={(e) => set('service', e.target.value as (typeof SVCS)[number])}>
            <option value="">auto (operation default)</option>
            {SVCS.filter((s) => s !== '').map((s) => <option key={s} value={s}>{s}</option>)}
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
        {showAdvanced ? '− advanced' : '+ advanced (borders, route, FX)'}
      </button>
      {showAdvanced && (
        <div className="grid gap-4 rounded-md border bg-muted/30 p-3 sm:grid-cols-2">
          <Field label="MX border"><Input value={form.mexBorder} onChange={(e) => set('mexBorder', e.target.value)} /></Field>
          <Field label="US border"><Input value={form.usBorder} onChange={(e) => set('usBorder', e.target.value)} /></Field>
          <Field label="Route">
            <select className={selectCls} value={form.route} onChange={(e) => set('route', e.target.value)}>
              {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="FX rate override (MXN/USD)" error={errors.fxRate}>
            <Input type="number" step="any" value={form.fxRate} onChange={(e) => set('fxRate', e.target.value)} placeholder="active set FX" aria-invalid={Boolean(errors.fxRate)} />
          </Field>
        </div>
      )}
    </>
  )
}

function EquipmentStep({ form, set }: StepProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Truck" hint="Tractor class — drives fuel efficiency + fixed-cost factors.">
        <select className={selectCls} value={form.truckType} onChange={(e) => set('truckType', e.target.value as (typeof TRUCKS)[number])}>
          {TRUCKS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Trailer" hint="Flatbed adds a complexity premium; Chassis routes to the drayage cycle.">
        <select className={selectCls} value={form.trailer} onChange={(e) => set('trailer', e.target.value as (typeof TRAILERS)[number])}>
          {TRAILERS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Config" hint="Tandem commits a 2nd trailer + dolly — higher fixed cost + maneuver time.">
        <select className={selectCls} value={form.config} onChange={(e) => set('config', e.target.value as (typeof CONFIGS)[number])}>
          {CONFIGS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Driver" hint="Driver class (B1, Interstate, CDL…) sets the labor rate factor.">
        <select className={selectCls} value={form.driver} onChange={(e) => set('driver', e.target.value as (typeof DRIVERS)[number])}>
          {DRIVERS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
    </div>
  )
}

function ReviewStep({ form, onEdit, costBases }: { form: FormFields; onEdit: (s: number) => void; costBases: CostBaseOption[] }) {
  const selectedBase = costBases.find((base) => base.id === form.costBaseId)
  const activeVersion = activeVersionFor(selectedBase)
  const rows: { label: string; value: string; step: number }[] = [
    { label: 'Lane', value: `${form.outboundLocation || '—'} → ${form.inboundLocation || '—'}`, step: 0 },
    { label: 'Operation', value: `${form.operation}${form.service ? ` · ${form.service}` : ' · auto service'}`, step: 0 },
    { label: 'Cost base', value: selectedBase ? `${selectedBase.code} · ${selectedBase.name}${activeVersion ? ` · v${activeVersion.version}` : ''}` : 'Legacy active assumptions', step: 0 },
    { label: 'Equipment', value: `${form.truckType} · ${form.trailer} · ${form.config} · ${form.driver}`, step: 1 },
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
            <button type="button" onClick={() => onEdit(r.step)} className="shrink-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">edit</button>
          </div>
        ))}
      </dl>
      <CostBaseLineageNotice base={selectedBase} operation={form.operation} />
      <p className="text-xs text-muted-foreground">Press <span className="font-medium text-foreground">Get quote</span> to price this lane against your active assumption set.</p>
    </div>
  )
}
