'use client'

// Shared quote types, field constants, validation, and the Result renderer — used
// by both the Rápido form (quote-form) and the Guiado wizard (quote-wizard).

import { useState } from 'react'
import Link from 'next/link'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetcher } from '@/lib/fetcher'

// ── Types (mirror the API engine output we consume) ─────────────────────────
export interface MexLeg {
  loadedKm: number; totalKm: number; loadedMiles: number; totalMiles: number; cycleDays: number
  fuelUsd: number; maintTiresUsd: number; driverUsd: number; borderUsd: number; cvuUsd: number; cfuUsd: number
  productionCostUsd: number; utMargin: number; technicalTariffUsd: number; totalRiskAdjUsd: number
  requiredTariffUsd: number; rpm: number; fsc: number; referenceKey: string
}
export interface UsaLeg {
  loadedMiles: number; totalOperationalMiles: number; fuelCostUsd: number; driverCostUsd: number; maintTiresUsd: number
  cvuInclFuelUsd: number; cfuUsd: number; utRate: number; technicalTariffInclFuelUsd: number
  totalRiskAdjUsd: number; requiredTariffUsd: number; requiredTariffExFuelUsd: number
  rpm: number; fsc: number; flatUsd: number; marketRpm: number; marketRateUsd: number; referenceKey: string
}
export interface Commercial {
  costFloorUsd: number; minSellUsd: number; targetSellUsd: number; premiumSellUsd: number
  recommendedSellUsd: number; grossProfitUsd: number; grossMarginPct: number; gpPerLoadedMileUsd: number
  marketReferenceUsd: number; noGoFlag: boolean; reviewFlag: boolean; notes: string[]
}
export interface ResolvedMexLeg {
  baseKm: number; routeExpensesMxn?: number; baseHours?: number
  operation: string; service: string; route: string
  equipment: { truckType: string; trailer: string; config: string; driver: string }
  origin?: string; dest?: string
}
export interface ResolvedUsaLeg {
  loadedMiles: number; transitDaysRaw?: number; driverExpenses?: number
  outState: string; dieselUsdGal: number; fscUsdMile: number
  originCondition: string; destCondition: string; marketRpm?: number
  operation: string; service: string
  equipment: { truckType: string; trailer: string; config: string; driver: string }
  origin?: string; dest?: string
}
export interface QuoteResult {
  policy: 'OPERATIONAL_V3' | 'WORKBOOK_V3'
  operation: string
  mexLeg: MexLeg | null
  usaLeg: UsaLeg | null
  freightBaselineUsd: number
  commercial: Commercial
  fxRateUsed: number
  warnings: string[]
  costBaseId: string | null
  assumptionSetId: string | null
  resolved: { mexLeg: ResolvedMexLeg | null; usaLeg: ResolvedUsaLeg | null }
}

export interface FormSnapshot {
  service: string
  fxRate: string
  origin: string
  destination: string
  costBaseLabel: string
  costBaseReadiness: CostBaseReadiness
  costBaseReadinessDetail: string
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

export type CostBaseScope = 'CROSS_BORDER' | 'DRAYAGE' | 'LOCAL' | 'INTRA_MEX' | 'INTRA_US'
export type CostBaseReadiness = 'GOVERNED' | 'IN_PREPARATION' | 'LEGACY'
export interface CostBaseOption {
  id: string
  code: string
  name: string
  scope: CostBaseScope
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  defaultPolicy: 'OPERATIONAL_V3' | 'WORKBOOK_V3'
  isDefault: boolean
  versions: {
    id: string
    version: number
    isActive: boolean
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
    _count: { params: number }
  }[]
}

const SCOPE_LABEL: Record<CostBaseScope, string> = {
  CROSS_BORDER: 'Cross-border',
  DRAYAGE: 'Drayage',
  LOCAL: 'Local',
  INTRA_MEX: 'Intra-MEX',
  INTRA_US: 'Intra-US',
}

// ── Field constants ─────────────────────────────────────────────────────────
export const OPS = ['D2D Export', 'D2D Import', 'Drayage', 'Intra-Mex', 'MX Northbound', 'MX Southbound', 'Local'] as const
export const SVCS = ['', 'One Way', 'Backhaul', 'Roundtrip', 'Expedited'] as const
export const TRUCKS = ['Truck Trailer', 'Thorton', 'Rabon', '3.5 tons', '1.5 tons'] as const
export const TRAILERS = ['Dry Van', 'Flatbed', 'Reefer', 'Hazmat', 'Chassis', 'Power Only', 'Overdim'] as const
export const CONFIGS = ['Single', 'Tandem'] as const
export const DRIVERS = ['B1', 'Interstate', 'Intrastate', 'CDL', 'Licencia E'] as const
export const ROUTES = ['Mostly Straight', 'Mixed Lane', 'Mostly Curvy', 'Straight & Danger', 'Mixed & Danger', 'Curvy & Danger'] as const

export const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
export const mxn = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
export const pct = (n: number) => `${(n * 100).toFixed(1)}%`

export const selectCls =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export const INITIAL_FORM = {
  outboundLocation: '',
  inboundLocation: '',
  mexBorder: 'Nuevo Laredo, Tamaulipas',
  usBorder: 'Laredo, TX',
  operation: 'D2D Import' as (typeof OPS)[number],
  costBaseId: '',
  service: '' as (typeof SVCS)[number],
  route: 'Straight & Danger',
  fxRate: '',
  truckType: 'Truck Trailer' as (typeof TRUCKS)[number],
  trailer: 'Dry Van' as (typeof TRAILERS)[number],
  config: 'Single' as (typeof CONFIGS)[number],
  driver: 'B1' as (typeof DRIVERS)[number],
}
export type FormFields = typeof INITIAL_FORM
export type FormErrors = Partial<Record<keyof FormFields, string>>

export function scopeForOperation(operation: string): CostBaseScope | null {
  if (operation === 'D2D Export' || operation === 'D2D Import') return 'CROSS_BORDER'
  if (operation === 'Drayage') return 'DRAYAGE'
  if (operation === 'Local') return 'LOCAL'
  if (operation === 'Intra-Mex' || operation === 'MX Northbound' || operation === 'MX Southbound') return 'INTRA_MEX'
  if (operation === 'Intra-US' || operation === 'US Northbound' || operation === 'US Southbound') return 'INTRA_US'
  return null
}

export function compatibleBases(bases: CostBaseOption[], operation: string) {
  const scope = scopeForOperation(operation)
  return bases.filter((base) => base.status !== 'ARCHIVED' && (!scope || base.scope === scope))
}

export function activeVersionFor(base: CostBaseOption | undefined) {
  return base?.versions.find((version) => version.isActive)
}

export function costBaseReadiness(base: CostBaseOption | undefined): CostBaseReadiness {
  if (!base) return 'LEGACY'
  const version = activeVersionFor(base)
  return base.status === 'ACTIVE' && version?.status === 'PUBLISHED' && version._count.params === 210
    ? 'GOVERNED'
    : 'IN_PREPARATION'
}

export function costBaseReadinessDetail(base: CostBaseOption | undefined, operation: string) {
  const scope = scopeForOperation(operation)
  if (!base) return `No governed ${scope ? SCOPE_LABEL[scope] : 'operation'} base is selected. The calculation remains a proposal and any saved quote requires review.`
  const version = activeVersionFor(base)
  if (costBaseReadiness(base) === 'GOVERNED') return `${base.code} v${version?.version} is active, published, and complete with 210 parameters.`
  const reasons = [
    base.status !== 'ACTIVE' ? `base is ${base.status.toLowerCase()}` : null,
    !version ? 'no active version' : null,
    version && version.status !== 'PUBLISHED' ? `v${version.version} is ${version.status.toLowerCase()}` : null,
    version && version._count.params !== 210 ? `${version._count.params}/210 parameters` : null,
  ].filter(Boolean)
  return `${base.code} is still in preparation (${reasons.join(', ')}). The calculation may proceed as a proposal, but any saved quote requires review.`
}

export function preferredGovernedBase(bases: CostBaseOption[], operation: string) {
  const ready = compatibleBases(bases, operation).filter((base) => costBaseReadiness(base) === 'GOVERNED')
  return ready.find((base) => base.isDefault) ?? (ready.length === 1 ? ready[0] : undefined)
}

export function initialFormFor(bases: CostBaseOption[]): FormFields {
  const selected = preferredGovernedBase(bases, INITIAL_FORM.operation)
  return { ...INITIAL_FORM, costBaseId: selected?.id ?? '' }
}

export function validate(f: FormFields): FormErrors {
  const e: FormErrors = {}
  if (!f.outboundLocation.trim()) e.outboundLocation = 'Required — ZIP, "City, ST", or a metro city'
  if (!f.inboundLocation.trim()) e.inboundLocation = 'Required — ZIP, "City, ST", or a metro city'
  if (f.fxRate) {
    const n = Number(f.fxRate)
    if (!Number.isFinite(n) || n <= 0) e.fxRate = 'Must be a positive number'
  }
  return e
}

/** Build the /engine/quote-by-route request body from form fields. */
export function quoteBody(form: FormFields): Record<string, unknown> {
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
  if (form.costBaseId) body.costBaseId = form.costBaseId
  if (form.fxRate) body.fxRate = Number(form.fxRate)
  return body
}

// ── Shared UI ────────────────────────────────────────────────────────────────
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
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

export function CostBaseSelector({ bases, operation, value, onChange }: {
  bases: CostBaseOption[]
  operation: string
  value: string
  onChange: (value: string) => void
}) {
  const options = compatibleBases(bases, operation)
  const selected = options.find((base) => base.id === value)
  return (
    <Field label="Cost base" hint="Only an active base with an active published 210-parameter version is production-governed.">
      <select className={selectCls} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Legacy active assumptions · review required</option>
        {options.map((base) => {
          const active = activeVersionFor(base)
          const readiness = costBaseReadiness(base)
          return <option key={base.id} value={base.id}>{base.code} · {base.name}{active ? ` · v${active.version}` : ''} · {readiness === 'GOVERNED' ? 'ready' : 'review required'}{base.isDefault ? ' · default' : ''}</option>
        })}
      </select>
      <CostBaseLineageNotice base={selected} operation={operation} />
    </Field>
  )
}

export function CostBaseLineageNotice({ base, operation }: { base: CostBaseOption | undefined; operation: string }) {
  const readiness = costBaseReadiness(base)
  const governed = readiness === 'GOVERNED'
  return (
    <div className={`rounded-md border px-3 py-2 text-xs ${governed ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300' : 'border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-300'}`} role="status">
      <div className="font-medium">{governed ? 'Governed lineage' : 'Review required'}</div>
      <div className="mt-0.5 opacity-90">{costBaseReadinessDetail(base, operation)}</div>
      {!governed && <Link href="/cost-bases" className="mt-1 inline-block font-medium underline underline-offset-2">Review cost base coverage →</Link>}
    </div>
  )
}

export function ResultSkeleton() {
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

export function Placeholder() {
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

export function Result({ r, snapshot }: { r: QuoteResult; snapshot: FormSnapshot }) {
  const c = r.commercial
  const requiresLineageReview = snapshot.costBaseReadiness !== 'GOVERNED'
  const requiresReview = c.reviewFlag || requiresLineageReview
  const decision = c.noGoFlag ? 'NO-GO' : requiresReview ? 'REVISAR' : 'LISTA PARA DECISION'
  const decisionClass = c.noGoFlag ? 'border-rose-200 bg-rose-50 text-rose-800' : requiresReview ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
  const [label, setLabel] = useState('')
  const [savedId, setSavedId] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = { operation: r.operation, equipment: snapshot.equipment }
      if (label.trim()) body.label = label.trim()
      if (snapshot.service) body.service = snapshot.service
      if (snapshot.fxRate) body.fxRate = Number(snapshot.fxRate)
      if (snapshot.origin) body.origin = snapshot.origin
      if (snapshot.destination) body.destination = snapshot.destination
      if (r.costBaseId) body.costBaseId = r.costBaseId
      if (r.assumptionSetId) body.assumptionSetId = r.assumptionSetId
      body.policy = r.policy
      if (r.resolved.mexLeg) {
        const m = r.resolved.mexLeg
        body.mex = { baseKm: m.baseKm, routeExpensesMxn: m.routeExpensesMxn ?? 0, baseHours: m.baseHours ?? 0, route: m.route }
      }
      if (r.resolved.usaLeg) {
        const u = r.resolved.usaLeg
        body.usa = {
          loadedMiles: u.loadedMiles, transitDaysRaw: u.transitDaysRaw ?? 0, driverExpenses: u.driverExpenses ?? 0,
          outState: u.outState, dieselUsdGal: u.dieselUsdGal, fscUsdMile: u.fscUsdMile,
          originCondition: u.originCondition, destCondition: u.destCondition,
        }
      }
      return fetcher<{ id: string; createdAt: string; label: string | null }>('/api/v1/quotes', { method: 'POST', json: body })
    },
    onSuccess: (q) => {
      setSavedId(q.id)
      toast.success(requiresLineageReview ? 'Quote saved for review' : 'Quote saved', { description: q.label ?? q.id.slice(0, 8) })
    },
  })

  return (
    <>
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
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Cost base: {r.costBaseId ? snapshot.costBaseLabel : 'legacy assumptions'}</span>
            <span>Version: {r.assumptionSetId ? r.assumptionSetId.slice(0, 8) : 'none'}</span>
            <span>Policy: {r.policy === 'WORKBOOK_V3' ? 'Workbook exact' : 'Operational V3'}</span>
          </div>
          <div className={`rounded border px-3 py-2 text-sm ${decisionClass}`}>
            <span className="font-medium">Decision: {decision}</span>
            {requiresLineageReview && <span className="ml-2 text-xs">{snapshot.costBaseReadinessDetail}</span>}
            {c.notes.length > 0 && <span className="ml-2 text-xs">{c.notes.join(' · ')}</span>}
          </div>
          <form className="flex flex-wrap items-center gap-2 border-t pt-3" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional) — e.g. Acme Q3" className="h-9 flex-1 min-w-[200px]" disabled={save.isPending} />
            <Button type="submit" size="sm" variant="outline" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : savedId ? 'Save again' : requiresLineageReview ? 'Save for review' : 'Save quote'}
            </Button>
            {savedId && (
              <Link href="/quotes" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">view history →</Link>
            )}
          </form>
        </CardContent>
      </Card>

      {r.warnings.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-800 dark:text-amber-300">
              {r.warnings.length} resolver note{r.warnings.length === 1 ? '' : 's'}
            </CardTitle>
            <CardDescription>Origin/destination lookups, fallbacks, or assumptions that landed outside the recommended range.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1 text-xs text-muted-foreground">
            {r.warnings.map((w, i) => <div key={i}>· {w}</div>)}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {r.mexLeg && <MexCard leg={r.mexLeg} />}
        {r.usaLeg && <UsaCard leg={r.usaLeg} />}
      </div>

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

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
