'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetcher } from '@/lib/fetcher'
import { LocationInput } from './location-input'

// ── Types (mirror the API engine output we consume) ─────────────────────────
interface MexLeg {
  loadedKm: number; totalKm: number; loadedMiles: number; totalMiles: number; cycleDays: number
  fuelUsd: number; maintTiresUsd: number; driverUsd: number; borderUsd: number; cvuUsd: number; cfuUsd: number
  productionCostUsd: number; utMargin: number; technicalTariffUsd: number; totalRiskAdjUsd: number
  requiredTariffUsd: number; rpm: number; fsc: number; referenceKey: string
}
interface UsaLeg {
  loadedMiles: number; totalOperationalMiles: number; fuelCostUsd: number; driverCostUsd: number; maintTiresUsd: number
  cvuInclFuelUsd: number; cfuUsd: number; utRate: number; technicalTariffInclFuelUsd: number
  totalRiskAdjUsd: number; requiredTariffUsd: number; requiredTariffExFuelUsd: number
  rpm: number; fsc: number; flatUsd: number; marketRpm: number; marketRateUsd: number; referenceKey: string
}
interface Commercial {
  costFloorUsd: number; minSellUsd: number; targetSellUsd: number; premiumSellUsd: number
  recommendedSellUsd: number; grossProfitUsd: number; grossMarginPct: number; gpPerLoadedMileUsd: number
  marketReferenceUsd: number; noGoFlag: boolean; reviewFlag: boolean; notes: string[]
}
interface ResolvedMexLeg {
  baseKm: number
  routeExpensesMxn?: number
  baseHours?: number
  operation: string
  service: string
  route: string
  equipment: { truckType: string; trailer: string; config: string; driver: string }
  origin?: string
  dest?: string
}
interface ResolvedUsaLeg {
  loadedMiles: number
  transitDaysRaw?: number
  driverExpenses?: number
  outState: string
  dieselUsdGal: number
  fscUsdMile: number
  originCondition: string
  destCondition: string
  marketRpm?: number
  operation: string
  service: string
  equipment: { truckType: string; trailer: string; config: string; driver: string }
  origin?: string
  dest?: string
}
interface QuoteResult {
  operation: string
  mexLeg: MexLeg | null
  usaLeg: UsaLeg | null
  freightBaselineUsd: number
  commercial: Commercial
  fxRateUsed: number
  warnings: string[]
  assumptionSetId: string | null
  resolved: { mexLeg: ResolvedMexLeg | null; usaLeg: ResolvedUsaLeg | null }
}

interface FormSnapshot {
  service: string
  fxRate: string
  origin: string
  destination: string
  equipment: { truckType: string; trailer: string; config: string; driver: string }
}

export interface LaneHint {
  id: string
  label: string | null
  operation: string
  service: string
  origin: string | null
  destination: string | null
}

const OPS = ['D2D Export', 'D2D Import', 'Drayage', 'Intra-Mex', 'MX Northbound', 'MX Southbound', 'Local'] as const
const SVCS = ['', 'One Way', 'Backhaul', 'Roundtrip', 'Expedited'] as const
const TRUCKS = ['Truck Trailer', 'Thorton', 'Rabon', '3.5 tons', '1.5 tons'] as const
const TRAILERS = ['Dry Van', 'Flatbed', 'Reefer', 'Hazmat', 'Chassis', 'Power Only', 'Overdim'] as const
const CONFIGS = ['Single', 'Tandem'] as const
const DRIVERS = ['B1', 'Interstate', 'Intrastate', 'CDL', 'Licencia E'] as const

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const mxn = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
const pct = (n: number) => `${(n * 100).toFixed(1)}%`

const selectCls =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

const INITIAL_FORM = {
  outboundLocation: '',
  inboundLocation: '',
  mexBorder: 'Nuevo Laredo, Tamaulipas',
  usBorder: 'Laredo, TX',
  operation: 'D2D Import' as (typeof OPS)[number],
  service: '' as (typeof SVCS)[number],
  route: 'Straight & Danger',
  fxRate: '',
  truckType: 'Truck Trailer' as (typeof TRUCKS)[number],
  trailer: 'Dry Van' as (typeof TRAILERS)[number],
  config: 'Single' as (typeof CONFIGS)[number],
  driver: 'B1' as (typeof DRIVERS)[number],
}
type FormFields = typeof INITIAL_FORM
type FormErrors = Partial<Record<keyof FormFields, string>>

function validate(f: FormFields): FormErrors {
  const e: FormErrors = {}
  if (!f.outboundLocation.trim()) e.outboundLocation = 'Required — ZIP, "City, ST", or a metro city'
  if (!f.inboundLocation.trim()) e.inboundLocation = 'Required — ZIP, "City, ST", or a metro city'
  if (f.fxRate) {
    const n = Number(f.fxRate)
    if (!Number.isFinite(n) || n <= 0) e.fxRate = 'Must be a positive number'
  }
  return e
}

export function QuoteForm({ recentLanes = [] }: { recentLanes?: LaneHint[] }) {
  const [form, setForm] = useState<FormFields>(INITIAL_FORM)
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
    mutationFn: () => {
      const body: Record<string, unknown> = {
        outboundLocation: form.outboundLocation.trim(),
        inboundLocation: form.inboundLocation.trim(),
        mexBorder: form.mexBorder,
        usBorder: form.usBorder,
        operation: form.operation,
        route: form.route,
        equipment: { truckType: form.truckType, trailer: form.trailer, config: form.config, driver: form.driver },
      }
      if (form.service) body.service = form.service
      if (form.fxRate) body.fxRate = Number(form.fxRate)
      return fetcher<QuoteResult>('/api/v1/engine/quote-by-route', { method: 'POST', json: body })
    },
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
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate(form)
    setErrors(err)
    if (Object.keys(err).length > 0) return
    quote.mutate()
  }
  const clear = () => {
    setForm(INITIAL_FORM)
    setResult(null)
    setErrors({})
    setShowAdvanced(false)
  }
  const applyLane = (lane: LaneHint) => {
    setForm((f) => ({
      ...f,
      outboundLocation: lane.origin ?? f.outboundLocation,
      inboundLocation: lane.destination ?? f.inboundLocation,
      operation: (OPS as readonly string[]).includes(lane.operation)
        ? (lane.operation as (typeof OPS)[number])
        : f.operation,
      service: (SVCS as readonly string[]).includes(lane.service)
        ? (lane.service as (typeof SVCS)[number])
        : f.service,
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
                    <button
                      key={lane.id}
                      type="button"
                      onClick={() => applyLane(lane)}
                      className="grid gap-0.5 rounded px-2 py-1.5 text-left hover:bg-accent"
                    >
                      <span className="truncate text-xs font-medium">
                        {lane.origin ?? '—'} → {lane.destination ?? '—'}
                      </span>
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
              <LocationInput
                value={form.outboundLocation}
                onChange={(v) => set('outboundLocation', v)}
                suggestions={locations}
                placeholder="e.g. 30901 or Augusta, GA"
                ariaInvalid={Boolean(errors.outboundLocation)}
              />
            </Field>
            <Field label="Inbound (consignee)" error={errors.inboundLocation} hint="Where the load delivers. Start typing a city or ZIP for suggestions.">
              <LocationInput
                value={form.inboundLocation}
                onChange={(v) => set('inboundLocation', v)}
                suggestions={locations}
                placeholder="e.g. Queretaro, Qro or 78040"
                ariaInvalid={Boolean(errors.inboundLocation)}
              />
            </Field>

            <Field label="Operation" hint="Movement type: D2D Export/Import (cross-border door-to-door), Drayage (port/terminal), Intra-Mex (domestic MX), or Local.">
              <select className={selectCls} value={form.operation} onChange={(e) => set('operation', e.target.value as (typeof OPS)[number])}>
                {OPS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>

            <Field
              label={`Service ${form.service === '' ? '— auto (per operation)' : ''}`}
              hint="Auto uses the operation default (Import/Southbound -> Backhaul, else One Way). Override for Roundtrip or Expedited."
            >
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
                <Field label="MX border">
                  <Input value={form.mexBorder} onChange={(e) => set('mexBorder', e.target.value)} />
                </Field>
                <Field label="US border">
                  <Input value={form.usBorder} onChange={(e) => set('usBorder', e.target.value)} />
                </Field>
                <Field label="Route">
                  <select className={selectCls} value={form.route} onChange={(e) => set('route', e.target.value)}>
                    {['Mostly Straight', 'Mixed Lane', 'Mostly Curvy', 'Straight & Danger', 'Mixed & Danger', 'Curvy & Danger'].map((r) =>
                      <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="FX rate override (MXN/USD)" error={errors.fxRate}>
                  <Input
                    type="number" step="any" value={form.fxRate}
                    onChange={(e) => set('fxRate', e.target.value)}
                    placeholder="active set FX"
                    aria-invalid={Boolean(errors.fxRate)}
                  />
                </Field>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={quote.isPending} className="flex-1">
                {quote.isPending ? 'Pricing…' : 'Get quote'}
              </Button>
              <Button
                type="button" variant="outline"
                disabled={quote.isPending}
                onClick={clear}
                title="Reset form and clear the result"
              >
                Clear
              </Button>
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
            }}
          />
        ) : (
          <Placeholder />
        )}
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────
function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>{label}</span>
        {hint && (
          <span className="cursor-help select-none text-muted-foreground/70" title={hint} aria-label={hint}>ⓘ</span>
        )}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  )
}

function ResultSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Pricing…">
      <Card>
        <CardHeader className="pb-2">
          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-9 w-40 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid gap-1.5">
                <div className="h-2.5 w-10 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader><div className="h-4 w-24 animate-pulse rounded bg-muted" /></CardHeader>
            <CardContent className="grid gap-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="grid grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, k) => (
                    <div key={k} className="h-8 animate-pulse rounded bg-muted/60" />
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function Placeholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Result</CardTitle>
        <CardDescription>
          Submit a lane to see the freight baseline, MEX/USA leg breakdowns, and the commercial sell tiers
          (cost floor → min/target/premium, with margin and GP / loaded mile).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-1.5 text-sm text-muted-foreground">
          <li>· Origin/destination resolved via ZIP → metro and MX state homologation</li>
          <li>· Active assumption set drives all per-leg costs (you can override FX inline)</li>
          <li>· Service defaults: Import / Southbound → Backhaul; everything else → One Way</li>
          <li>· Out-of-range warnings surface in the result if any param trips its band</li>
        </ul>
      </CardContent>
    </Card>
  )
}

function Result({ r, snapshot }: { r: QuoteResult; snapshot: FormSnapshot }) {
  const c = r.commercial
  const [label, setLabel] = useState('')
  const [savedId, setSavedId] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        operation: r.operation,
        equipment: snapshot.equipment,
      }
      if (label.trim()) body.label = label.trim()
      if (snapshot.service) body.service = snapshot.service
      if (snapshot.fxRate) body.fxRate = Number(snapshot.fxRate)
      if (snapshot.origin) body.origin = snapshot.origin
      if (snapshot.destination) body.destination = snapshot.destination
      if (r.resolved.mexLeg) {
        const m = r.resolved.mexLeg
        body.mex = {
          baseKm: m.baseKm,
          routeExpensesMxn: m.routeExpensesMxn ?? 0,
          baseHours: m.baseHours ?? 0,
          route: m.route,
        }
      }
      if (r.resolved.usaLeg) {
        const u = r.resolved.usaLeg
        body.usa = {
          loadedMiles: u.loadedMiles,
          transitDaysRaw: u.transitDaysRaw ?? 0,
          driverExpenses: u.driverExpenses ?? 0,
          outState: u.outState,
          dieselUsdGal: u.dieselUsdGal,
          fscUsdMile: u.fscUsdMile,
          originCondition: u.originCondition,
          destCondition: u.destCondition,
        }
      }
      return fetcher<{ id: string; createdAt: string; label: string | null }>('/api/v1/quotes', {
        method: 'POST', json: body,
      })
    },
    onSuccess: (q) => {
      setSavedId(q.id)
      toast.success('Quote saved', { description: q.label ?? q.id.slice(0, 8) })
    },
  })

  return (
    <>
      {/* Headline */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Freight Baseline</CardDescription>
          <CardTitle className="text-4xl tracking-tight">{usd.format(r.freightBaselineUsd)}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="MXN" value={mxn.format(r.freightBaselineUsd * r.fxRateUsed)} />
            <Stat label="FX" value={r.fxRateUsed.toFixed(2)} />
            <Stat label="Operation" value={r.operation} />
            <Stat label="Margin" value={pct(c.grossMarginPct)} />
          </div>
          <form
            className="flex flex-wrap items-center gap-2 border-t pt-3"
            onSubmit={(e) => { e.preventDefault(); save.mutate() }}
          >
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (optional) — e.g. Acme Q3"
              className="h-9 flex-1 min-w-[200px]"
              disabled={save.isPending}
            />
            <Button type="submit" size="sm" variant="outline" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : savedId ? 'Save again' : 'Save quote'}
            </Button>
            {savedId && (
              <Link href="/quotes" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                view history →
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Resolver warnings — prominent right under the headline */}
      {r.warnings.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-800 dark:text-amber-300">
              {r.warnings.length} resolver note{r.warnings.length === 1 ? '' : 's'}
            </CardTitle>
            <CardDescription>
              Origin/destination lookups, fallbacks, or assumptions that landed outside the recommended range.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1 text-xs text-muted-foreground">
            {r.warnings.map((w, i) => <div key={i}>· {w}</div>)}
          </CardContent>
        </Card>
      )}

      {/* Legs */}
      <div className="grid gap-4 md:grid-cols-2">
        {r.mexLeg && <MexCard leg={r.mexLeg} />}
        {r.usaLeg && <UsaCard leg={r.usaLeg} />}
      </div>

      {/* Commercial / sell tiers */}
      <Card>
        <CardHeader>
          <CardTitle>Commercial</CardTitle>
          <CardDescription>Cost floor → sell tiers (over the carrier&apos;s risk-adjusted COGS).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Cost floor" value={usd.format(c.costFloorUsd)} />
            <Stat label="Min (12%)" value={usd.format(c.minSellUsd)} />
            <Stat label="Target (18%)" value={usd.format(c.targetSellUsd)} />
            <Stat label="Premium (25%)" value={usd.format(c.premiumSellUsd)} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Recommended sell" value={usd.format(c.recommendedSellUsd)} />
            <Stat label="Gross profit" value={usd.format(c.grossProfitUsd)} />
            <Stat label="GP / loaded mile" value={usd.format(c.gpPerLoadedMileUsd)} />
            <Stat label="Market ref" value={c.marketReferenceUsd > 0 ? usd.format(c.marketReferenceUsd) : '—'} />
          </div>
          {(c.noGoFlag || c.reviewFlag || c.notes.length > 0) && (
            <div className="grid gap-1.5 rounded-md border bg-muted/30 p-3 text-sm">
              {c.noGoFlag && <span className="font-medium text-destructive">NO-GO: sell below cost floor</span>}
              {c.reviewFlag && <span className="font-medium text-amber-700 dark:text-amber-400">REVIEW</span>}
              {c.notes.map((n, i) => <span key={i} className="text-muted-foreground">· {n}</span>)}
            </div>
          )}
        </CardContent>
      </Card>

    </>
  )
}

function MexCard({ leg }: { leg: MexLeg }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between">
          <span>MEX leg</span>
          <span className="text-2xl">{usd.format(leg.requiredTariffUsd)}</span>
        </CardTitle>
        <CardDescription>{Math.round(leg.totalKm)} km · {Math.round(leg.totalMiles)} mi · {leg.cycleDays.toFixed(2)} days</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="RPM" value={leg.rpm.toFixed(2)} />
          <Stat label="FSC" value={leg.fsc.toFixed(2)} />
          <Stat label="UT margin" value={pct(leg.utMargin)} />
          <Stat label="CFU" value={usd.format(leg.cfuUsd)} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Fuel" value={usd.format(leg.fuelUsd)} />
          <Stat label="Maint+Tires" value={usd.format(leg.maintTiresUsd)} />
          <Stat label="Driver" value={usd.format(leg.driverUsd)} />
          <Stat label="Border" value={usd.format(leg.borderUsd)} />
        </div>
        <div className="text-xs">
          <div className="text-muted-foreground">ReferenceKey</div>
          <code className="block break-all rounded bg-muted px-2 py-1 font-mono text-[11px]">{leg.referenceKey || '—'}</code>
        </div>
      </CardContent>
    </Card>
  )
}

function UsaCard({ leg }: { leg: UsaLeg }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between">
          <span>USA leg</span>
          <span className="text-2xl">{usd.format(leg.flatUsd)}</span>
        </CardTitle>
        <CardDescription>{Math.round(leg.loadedMiles)} mi · {Math.round(leg.totalOperationalMiles)} op mi</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="RPM" value={leg.rpm.toFixed(2)} />
          <Stat label="FSC" value={leg.fsc.toFixed(2)} />
          <Stat label="UT rate" value={pct(leg.utRate)} />
          <Stat label="CFU" value={usd.format(leg.cfuUsd)} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Fuel" value={usd.format(leg.fuelCostUsd)} />
          <Stat label="Maint+Tires" value={usd.format(leg.maintTiresUsd)} />
          <Stat label="Driver" value={usd.format(leg.driverCostUsd)} />
          <Stat label="DAT mkt" value={leg.marketRpm > 0 ? `${leg.marketRpm.toFixed(2)} RPM` : '—'} />
        </div>
        <div className="text-xs">
          <div className="text-muted-foreground">ReferenceKey</div>
          <code className="block break-all rounded bg-muted px-2 py-1 font-mono text-[11px]">{leg.referenceKey || '—'}</code>
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
