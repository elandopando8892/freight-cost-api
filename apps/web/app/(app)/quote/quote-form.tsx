'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
interface QuoteResult {
  operation: string
  mexLeg: MexLeg | null
  usaLeg: UsaLeg | null
  freightBaselineUsd: number
  commercial: Commercial
  fxRateUsed: number
  warnings: string[]
  assumptionSetId: string | null
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

export function QuoteForm() {
  const [form, setForm] = useState({
    outboundLocation: '',
    inboundLocation: '',
    mexBorder: 'Nuevo Laredo, Tamaulipas',
    usBorder: 'Laredo, TX',
    operation: 'D2D Import' as (typeof OPS)[number],
    service: '' as (typeof SVCS)[number], // '' = use operation default
    route: 'Straight & Danger',
    fxRate: '',
    truckType: 'Truck Trailer' as (typeof TRUCKS)[number],
    trailer: 'Dry Van' as (typeof TRAILERS)[number],
    config: 'Single' as (typeof CONFIGS)[number],
    driver: 'B1' as (typeof DRIVERS)[number],
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [result, setResult] = useState<QuoteResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const quote = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        outboundLocation: form.outboundLocation.trim(),
        inboundLocation: form.inboundLocation.trim(),
        mexBorder: form.mexBorder,
        usBorder: form.usBorder,
        operation: form.operation,
        route: form.route,
        equipment: {
          truckType: form.truckType, trailer: form.trailer, config: form.config, driver: form.driver,
        },
      }
      if (form.service) body.service = form.service
      if (form.fxRate) body.fxRate = Number(form.fxRate)
      const res = await fetch('/api/v1/engine/quote-by-route', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string; warnings?: string[] }
        throw new Error(b.error ? `${b.error}${b.warnings ? '\n· ' + b.warnings.join('\n· ') : ''}` : `Failed (${res.status})`)
      }
      return (await res.json()) as QuoteResult
    },
    onSuccess: (r) => { setResult(r); setError(null) },
    onError: (e) => { setResult(null); setError(e instanceof Error ? e.message : 'Quote failed') },
  })

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Lane</CardTitle>
          <CardDescription>ZIP, "City, ST", or a metro city.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={(e) => { e.preventDefault(); quote.mutate() }}
          >
            <Field label="Outbound (shipper)">
              <Input
                value={form.outboundLocation}
                onChange={(e) => set('outboundLocation', e.target.value)}
                placeholder="e.g. 30901 or Augusta, GA 30901"
                required
              />
            </Field>
            <Field label="Inbound (consignee)">
              <Input
                value={form.inboundLocation}
                onChange={(e) => set('inboundLocation', e.target.value)}
                placeholder="e.g. Queretaro, Queretaro or 78040"
                required
              />
            </Field>

            <Field label="Operation">
              <select className={selectCls} value={form.operation} onChange={(e) => set('operation', e.target.value as (typeof OPS)[number])}>
                {OPS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>

            <Field label={`Service ${form.service === '' ? '— auto (per operation)' : ''}`}>
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
                <Field label="FX rate override (MXN/USD)">
                  <Input type="number" step="any" value={form.fxRate} onChange={(e) => set('fxRate', e.target.value)} placeholder="active set FX" />
                </Field>
              </div>
            )}

            <Button type="submit" disabled={quote.isPending} className="w-full">
              {quote.isPending ? 'Pricing…' : 'Get quote'}
            </Button>
            {error && (
              <pre className="whitespace-pre-wrap rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">{error}</pre>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {result ? <Result r={result} /> : <Placeholder />}
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function Placeholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Result</CardTitle>
        <CardDescription>Fill in the lane and submit to see the breakdown.</CardDescription>
      </CardHeader>
    </Card>
  )
}

function Result({ r }: { r: QuoteResult }) {
  const c = r.commercial
  return (
    <>
      {/* Headline */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Freight Baseline</CardDescription>
          <CardTitle className="text-4xl tracking-tight">{usd.format(r.freightBaselineUsd)}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="MXN" value={mxn.format(r.freightBaselineUsd * r.fxRateUsed)} />
          <Stat label="FX" value={r.fxRateUsed.toFixed(2)} />
          <Stat label="Operation" value={r.operation} />
          <Stat label="Margin" value={pct(c.grossMarginPct)} />
        </CardContent>
      </Card>

      {/* Legs */}
      <div className="grid gap-4 md:grid-cols-2">
        {r.mexLeg && <MexCard leg={r.mexLeg} />}
        {r.usaLeg && <UsaCard leg={r.usaLeg} />}
      </div>

      {/* Commercial / sell tiers */}
      <Card>
        <CardHeader>
          <CardTitle>Commercial</CardTitle>
          <CardDescription>Cost floor → sell tiers (over the carrier's risk-adjusted COGS).</CardDescription>
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

      {/* Resolver warnings */}
      {r.warnings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resolver notes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 text-xs text-muted-foreground">
            {r.warnings.map((w, i) => <div key={i}>· {w}</div>)}
          </CardContent>
        </Card>
      )}
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
