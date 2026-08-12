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
  initialFormFor, compatibleBases, validate, quoteBody, Field, ResultSkeleton, Placeholder, Result,
} from './quote-shared'

export type { LaneHint }

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
      toast.success(`Baseline ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(r.freightBaselineUsd)}`, {
        description: `${r.operation} · ${r.mexLeg ? 'MEX' : ''}${r.mexLeg && r.usaLeg ? ' + ' : ''}${r.usaLeg ? 'USA' : ''}`,
      })
    },
    onError: () => { setResult(null) }, // fetcher already toasted the error
  })

  const set = <K extends keyof FormFields>(k: K, v: FormFields[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }
  const setOperation = (operation: (typeof OPS)[number]) => {
    const options = compatibleBases(costBases, operation)
    setForm((current) => {
      const currentStillValid = options.some((base) => base.id === current.costBaseId)
      const fallback = options.find((base) => base.isDefault) ?? (options.length === 1 ? options[0] : undefined)
      return { ...current, operation, costBaseId: currentStillValid ? current.costBaseId : fallback?.id ?? '' }
    })
  }
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate(form)
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
        const fallback = options.find((base) => base.isDefault) ?? (options.length === 1 ? options[0] : undefined)
        return { operation, costBaseId: currentStillValid ? f.costBaseId : fallback?.id ?? '' }
      })(),
      service: (SVCS as readonly string[]).includes(lane.service) ? (lane.service as (typeof SVCS)[number]) : f.service,
    }))
    setErrors({})
    if (recentRef.current) recentRef.current.open = false
  }
  const onFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // Cmd/Ctrl + Enter: submit from any field (incl. <select>, <button type=button>)
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      const err = validate(form)
      setErrors(err)
      if (Object.keys(err).length === 0) quote.mutate()
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr] lg:items-start">
      <Card className="lg:sticky lg:top-4">
        <CardHeader>
          <div className="flex items-baseline justify-between gap-2">
            <CardTitle>Lane</CardTitle>
            {recentLanes.length > 0 && (
              <details ref={recentRef} className="relative">
                <summary className="cursor-pointer list-none text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
                  recent ▾
                </summary>
                <div className="absolute right-0 z-30 mt-1 grid w-64 gap-0.5 rounded-md border bg-popover p-1 shadow-md">
                  {recentLanes.map((lane) => (
                    <button key={lane.id} type="button" onClick={() => applyLane(lane)} className="grid gap-0.5 rounded px-2 py-1.5 text-left hover:bg-accent">
                      <span className="truncate text-xs font-medium">{lane.origin ?? '—'} → {lane.destination ?? '—'}</span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {lane.operation}{lane.service ? ` · ${lane.service}` : ''}{lane.label ? ` · ${lane.label}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </details>
            )}
          </div>
          <CardDescription>ZIP, &ldquo;City, ST&rdquo;, or a metro city.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit} onKeyDown={onFormKeyDown} noValidate>
            <Field label="Outbound (shipper)" error={errors.outboundLocation} hint="Where the load originates. ZIP, 'City, ST', or a metro city — start typing for suggestions.">
              <LocationInput value={form.outboundLocation} onChange={(v) => set('outboundLocation', v)} suggestions={locations} placeholder="e.g. 30901 or Augusta, GA" ariaInvalid={Boolean(errors.outboundLocation)} />
            </Field>
            <Field label="Inbound (consignee)" error={errors.inboundLocation} hint="Where the load delivers. Start typing a city or ZIP for suggestions.">
              <LocationInput value={form.inboundLocation} onChange={(v) => set('inboundLocation', v)} suggestions={locations} placeholder="e.g. Queretaro, Qro or 78040" ariaInvalid={Boolean(errors.inboundLocation)} />
            </Field>

            <Field label="Operation" hint="Movement type: D2D Export/Import (cross-border door-to-door), Drayage (port/terminal), Intra-Mex (domestic MX), or Local.">
              <select className={selectCls} value={form.operation} onChange={(e) => setOperation(e.target.value as (typeof OPS)[number])}>
                {OPS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>

            <Field label="Cost base" hint="The selected base and its active version become permanent lineage on the route and saved quote.">
              <select className={selectCls} value={form.costBaseId} onChange={(e) => set('costBaseId', e.target.value)}>
                <option value="">Legacy active assumptions</option>
                {compatibleBases(costBases, form.operation).map((base) => {
                  const active = base.versions.find((version) => version.isActive)
                  return <option key={base.id} value={base.id}>{base.code} Â· {base.name}{active ? ` Â· v${active.version}` : ''}{base.isDefault ? ' Â· default' : ''}</option>
                })}
              </select>
            </Field>

            <Field label={`Service ${form.service === '' ? '— auto (per operation)' : ''}`} hint="Auto uses the operation default (Import/Southbound -> Backhaul, else One Way). Override for Roundtrip or Expedited.">
              <select className={selectCls} value={form.service} onChange={(e) => set('service', e.target.value as (typeof SVCS)[number])}>
                <option value="">auto (operation default)</option>
                {SVCS.filter((s) => s !== '').map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Truck">
                <select className={selectCls} value={form.truckType} onChange={(e) => set('truckType', e.target.value as (typeof TRUCKS)[number])}>
                  {TRUCKS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Trailer">
                <select className={selectCls} value={form.trailer} onChange={(e) => set('trailer', e.target.value as (typeof TRAILERS)[number])}>
                  {TRAILERS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Config">
                <select className={selectCls} value={form.config} onChange={(e) => set('config', e.target.value as (typeof CONFIGS)[number])}>
                  {CONFIGS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Driver">
                <select className={selectCls} value={form.driver} onChange={(e) => set('driver', e.target.value as (typeof DRIVERS)[number])}>
                  {DRIVERS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>

            <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="text-xs text-muted-foreground hover:text-foreground">
              {showAdvanced ? '− advanced' : '+ advanced (borders, route, FX)'}
            </button>
            {showAdvanced && (
              <div className="grid gap-3 rounded-md border bg-muted/30 p-3">
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

            <div className="flex gap-2">
              <Button type="submit" disabled={quote.isPending} className="flex-1">{quote.isPending ? 'Pricing…' : 'Get quote'}</Button>
              <Button type="button" variant="outline" disabled={quote.isPending} onClick={clear} title="Reset form and clear the result">Clear</Button>
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">⌘</kbd>
              <span> + </span>
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">↵</kbd>
              <span> to submit</span>
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
              costBaseLabel: costBases.find((base) => base.id === form.costBaseId)?.code ?? 'Legacy',
            }}
          />
        ) : (
          <Placeholder />
        )}
      </div>
    </div>
  )
}
