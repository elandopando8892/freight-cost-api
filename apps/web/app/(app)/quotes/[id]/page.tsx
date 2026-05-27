import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { api, ApiError } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RelativeTime } from '@/components/relative-time'
import { DeleteQuoteButton } from './delete-button'
import { ShareButtons } from './share-buttons'

export const dynamic = 'force-dynamic'

interface MexLegOutput {
  loadedKm: number; emptyKm: number; totalKm: number
  loadedMiles: number; emptyMiles: number; totalMiles: number
  cycleDays: number
  blendedDieselUsdL: number
  fuelUsd: number; routeExpensesUsd: number; routeBufferUsd: number
  maintTiresUsd: number; driverUsd: number; borderUsd: number
  cvuUsd: number
  fixedCostPerKm: number; fixedCostPerDay: number
  cfuByDistanceUsd: number; cfuByTimeUsd: number; cfuUsd: number
  productionCostUsd: number
  utMargin: number; technicalUtilityUsd: number; technicalTariffUsd: number
  routeFactor: number; routeRiskUsd: number
  trailerFactor: number; trailerRiskUsd: number; flatbedComplexityUsd: number
  securityRiskUsd: number; tandemRiskUsd: number
  operationFactor: number; operationRiskUsd: number
  totalRiskAdjUsd: number
  requiredTariffUsd: number
  operatingProfitUsd: number; operatingMargin: number
  rpm: number; fsc: number
  referenceKey: string
}
interface UsaLegOutput {
  loadedMiles: number; totalOperationalMiles: number
  fuelCostUsd: number; driverCostUsd: number; maintTiresUsd: number
  cvuInclFuelUsd: number; cfuUsd: number
  utRate: number; technicalTariffInclFuelUsd: number
  totalRiskAdjUsd: number; requiredTariffUsd: number; requiredTariffExFuelUsd: number
  rpm: number; fsc: number; flatUsd: number
  marketRpm: number; marketRateUsd: number
  referenceKey: string
}
interface Commercial {
  costFloorUsd: number; minSellUsd: number; targetSellUsd: number; premiumSellUsd: number
  recommendedSellUsd: number; grossProfitUsd: number; grossMarginPct: number; gpPerLoadedMileUsd: number
  marketReferenceUsd: number; noGoFlag: boolean; reviewFlag: boolean; notes: string[]
}

interface QuoteDetail {
  id: string
  label: string | null
  operation: string
  service: string
  freightBaselineUsd: number
  requiredTariffUsd: number
  requiredTariffMxn: number
  fxRateUsed: number
  createdAt: string
  mexLeg: MexLegOutput | null
  usaLeg: UsaLegOutput | null
  commercial: Commercial | null
  lane: { id: string; origin: string | null; destination: string | null } | null
  set: { id: string; name: string; version: number } | null
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const mxn = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
const pct = (n: number) => `${(n * 100).toFixed(1)}%`

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  try {
    const { id } = await params
    const q = await api<QuoteDetail>(`/quotes/${id}`)
    return { title: q.label ?? `Quote ${id.slice(0, 8)}` }
  } catch {
    return { title: 'Quote' }
  }
}

export default async function QuoteDetailPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  let q: QuoteDetail
  try {
    q = await api<QuoteDetail>(`/quotes/${id}`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 text-xs text-muted-foreground">
            <Link href="/quotes" className="hover:text-foreground">Quote history</Link>
            <span className="mx-1">/</span>
            <span className="font-mono">{q.id.slice(0, 8)}</span>
          </div>
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {q.label ?? <span className="text-muted-foreground">Untitled quote</span>}
          </h1>
          <p className="text-sm text-muted-foreground">
            {q.operation} · {q.service} · saved <RelativeTime iso={q.createdAt} />
            {q.set && <> · <Link href={`/assumptions/${q.set.id}`} className="hover:text-foreground">{q.set.name} (v{q.set.version})</Link></>}
          </p>
          {q.lane && (q.lane.origin || q.lane.destination) && (
            <p className="text-sm text-muted-foreground">
              Lane: <span className="text-foreground">{q.lane.origin ?? '—'}</span> → <span className="text-foreground">{q.lane.destination ?? '—'}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ShareButtons
            quote={{
              id: q.id,
              label: q.label,
              operation: q.operation,
              service: q.service,
              createdAt: q.createdAt,
              freightBaselineUsd: q.freightBaselineUsd,
              requiredTariffUsd: q.requiredTariffUsd,
              requiredTariffMxn: q.requiredTariffMxn,
              fxRateUsed: q.fxRateUsed,
              lane: q.lane ? { origin: q.lane.origin, destination: q.lane.destination } : null,
              set: q.set ? { name: q.set.name, version: q.set.version } : null,
              mexLeg: q.mexLeg
                ? {
                    requiredTariffUsd: q.mexLeg.requiredTariffUsd,
                    totalKm: q.mexLeg.totalKm,
                    cycleDays: q.mexLeg.cycleDays,
                    rpm: q.mexLeg.rpm,
                  }
                : null,
              usaLeg: q.usaLeg
                ? { flatUsd: q.usaLeg.flatUsd, loadedMiles: q.usaLeg.loadedMiles, rpm: q.usaLeg.rpm }
                : null,
              commercial: q.commercial,
            }}
          />
          <Link
            href="/quote"
            className="rounded-md border bg-background px-3 py-1.5 text-sm shadow-sm hover:bg-accent"
          >
            Quote again
          </Link>
          <DeleteQuoteButton id={q.id} label={q.label ?? `Quote ${q.id.slice(0, 8)}`} />
        </div>
      </div>

      {/* Headline */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardDescription>Freight Baseline</CardDescription>
          <CardTitle className="text-4xl tracking-tight">{usd.format(q.freightBaselineUsd)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="MXN" value={mxn.format(q.requiredTariffMxn)} />
            <Stat label="FX" value={q.fxRateUsed.toFixed(2)} />
            <Stat label="Required (USD)" value={usd.format(q.requiredTariffUsd)} />
            <Stat label="Margin" value={q.commercial ? pct(q.commercial.grossMarginPct) : '—'} />
          </div>
        </CardContent>
      </Card>

      {/* Leg cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {q.mexLeg && <MexLegCard leg={q.mexLeg} />}
        {q.usaLeg && <UsaLegCard leg={q.usaLeg} />}
      </div>

      {/* Commercial */}
      {q.commercial && <CommercialCard c={q.commercial} />}
    </main>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────
function MexLegCard({ leg }: { leg: MexLegOutput }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between gap-2">
          <span>MEX leg</span>
          <span className="text-2xl">{usd.format(leg.requiredTariffUsd)}</span>
        </CardTitle>
        <CardDescription>
          {Math.round(leg.totalKm)} km · {Math.round(leg.totalMiles)} mi · {leg.cycleDays.toFixed(2)} days
        </CardDescription>
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
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Production" value={usd.format(leg.productionCostUsd)} />
          <Stat label="Technical" value={usd.format(leg.technicalTariffUsd)} />
          <Stat label="Risk adj" value={usd.format(leg.totalRiskAdjUsd)} />
          <Stat label="Op profit" value={usd.format(leg.operatingProfitUsd)} />
        </div>
        <div className="text-xs">
          <div className="text-muted-foreground">ReferenceKey</div>
          <code className="block break-all rounded bg-muted px-2 py-1 font-mono text-[11px]">{leg.referenceKey || '—'}</code>
        </div>
      </CardContent>
    </Card>
  )
}

function UsaLegCard({ leg }: { leg: UsaLegOutput }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between gap-2">
          <span>USA leg</span>
          <span className="text-2xl">{usd.format(leg.flatUsd)}</span>
        </CardTitle>
        <CardDescription>
          {Math.round(leg.loadedMiles)} mi · {Math.round(leg.totalOperationalMiles)} op mi
        </CardDescription>
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
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Technical" value={usd.format(leg.technicalTariffInclFuelUsd)} />
          <Stat label="Risk adj" value={usd.format(leg.totalRiskAdjUsd)} />
          <Stat label="Ex-fuel" value={usd.format(leg.requiredTariffExFuelUsd)} />
          <Stat label="Market $" value={leg.marketRateUsd > 0 ? usd.format(leg.marketRateUsd) : '—'} />
        </div>
        <div className="text-xs">
          <div className="text-muted-foreground">ReferenceKey</div>
          <code className="block break-all rounded bg-muted px-2 py-1 font-mono text-[11px]">{leg.referenceKey || '—'}</code>
        </div>
      </CardContent>
    </Card>
  )
}

function CommercialCard({ c }: { c: Commercial }) {
  return (
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
