import Link from 'next/link'
import type { Metadata } from 'next'
import { api, ApiError } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Compare quotes' }

interface MexLeg { requiredTariffUsd: number; totalKm: number; cycleDays: number; rpm: number; fuelUsd: number; driverUsd: number }
interface UsaLeg { flatUsd: number; loadedMiles: number; rpm: number; fuelCostUsd: number; driverCostUsd: number; marketRpm: number }
interface Commercial {
  costFloorUsd: number; minSellUsd: number; targetSellUsd: number; premiumSellUsd: number
  recommendedSellUsd: number; grossProfitUsd: number; grossMarginPct: number; gpPerLoadedMileUsd: number
}
interface QuoteDetail {
  id: string; label: string | null; operation: string; service: string; createdAt: string
  freightBaselineUsd: number; requiredTariffUsd: number; requiredTariffMxn: number; fxRateUsed: number
  mexLeg: MexLeg | null; usaLeg: UsaLeg | null; commercial: Commercial | null
  lane: { origin: string | null; destination: string | null } | null
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const mxn = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
const num = (n: number) => n.toFixed(2)
const pct = (n: number) => `${(n * 100).toFixed(1)}%`

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams
  const list = (ids ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 2)

  if (list.length !== 2) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Breadcrumb />
        <Card><CardContent className="px-6 py-10 text-center text-sm text-muted-foreground">
          Select exactly two quotes from <Link href="/quotes" className="underline underline-offset-2">Quote history</Link> to compare.
        </CardContent></Card>
      </main>
    )
  }

  let quotes: QuoteDetail[]
  try {
    quotes = await Promise.all(list.map((id) => api<QuoteDetail>(`/quotes/${id}`)))
  } catch (err) {
    const notFound = err instanceof ApiError && err.status === 404
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Breadcrumb />
        <Card><CardContent className="px-6 py-10 text-center text-sm text-muted-foreground">
          {notFound ? 'One of the quotes no longer exists.' : 'Could not load the quotes.'}{' '}
          <Link href="/quotes" className="underline underline-offset-2">Back to history</Link>
        </CardContent></Card>
      </main>
    )
  }

  const [a, b] = quotes
  const anyMex = a.mexLeg || b.mexLeg
  const anyUsa = a.usaLeg || b.usaLeg

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <Breadcrumb />
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Compare quotes</h1>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="align-bottom">
                  <th className="w-40 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Metric</th>
                  {quotes.map((q) => (
                    <th key={q.id} className="px-4 py-3 text-right">
                      <Link href={`/quotes/${q.id}`} className="block font-semibold hover:underline">
                        {q.label ?? `Quote ${q.id.slice(0, 8)}`}
                      </Link>
                      <div className="text-xs font-normal text-muted-foreground">{q.operation}{q.service ? ` · ${q.service}` : ''}</div>
                      <div className="truncate text-xs font-normal text-muted-foreground">
                        {q.lane && (q.lane.origin || q.lane.destination) ? `${q.lane.origin ?? '—'} → ${q.lane.destination ?? '—'}` : '—'}
                      </div>
                    </th>
                  ))}
                  <th className="w-24 px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Δ (B−A)</th>
                </tr>
              </thead>
              <tbody>
                <Section title="Headline" />
                <Row label="Freight baseline" a={a.freightBaselineUsd} b={b.freightBaselineUsd} fmt={usd.format} />
                <Row label="Required (USD)" a={a.requiredTariffUsd} b={b.requiredTariffUsd} fmt={usd.format} />
                <Row label="Required (MXN)" a={a.requiredTariffMxn} b={b.requiredTariffMxn} fmt={mxn.format} />
                <Row label="FX" a={a.fxRateUsed} b={b.fxRateUsed} fmt={num} />
                <Row label="Gross margin" a={a.commercial?.grossMarginPct} b={b.commercial?.grossMarginPct} fmt={pct} />

                {anyMex && (
                  <>
                    <Section title="MEX leg" />
                    <Row label="Required tariff" a={a.mexLeg?.requiredTariffUsd} b={b.mexLeg?.requiredTariffUsd} fmt={usd.format} />
                    <Row label="Total km" a={a.mexLeg?.totalKm} b={b.mexLeg?.totalKm} fmt={(n) => Math.round(n).toString()} />
                    <Row label="Cycle days" a={a.mexLeg?.cycleDays} b={b.mexLeg?.cycleDays} fmt={num} />
                    <Row label="RPM" a={a.mexLeg?.rpm} b={b.mexLeg?.rpm} fmt={num} />
                  </>
                )}

                {anyUsa && (
                  <>
                    <Section title="USA leg" />
                    <Row label="Flat" a={a.usaLeg?.flatUsd} b={b.usaLeg?.flatUsd} fmt={usd.format} />
                    <Row label="Loaded miles" a={a.usaLeg?.loadedMiles} b={b.usaLeg?.loadedMiles} fmt={(n) => Math.round(n).toString()} />
                    <Row label="RPM" a={a.usaLeg?.rpm} b={b.usaLeg?.rpm} fmt={num} />
                    <Row label="DAT market RPM" a={a.usaLeg?.marketRpm} b={b.usaLeg?.marketRpm} fmt={num} />
                  </>
                )}

                <Section title="Commercial" />
                <Row label="Cost floor" a={a.commercial?.costFloorUsd} b={b.commercial?.costFloorUsd} fmt={usd.format} />
                <Row label="Recommended sell" a={a.commercial?.recommendedSellUsd} b={b.commercial?.recommendedSellUsd} fmt={usd.format} />
                <Row label="Gross profit" a={a.commercial?.grossProfitUsd} b={b.commercial?.grossProfitUsd} fmt={usd.format} />
                <Row label="GP / loaded mile" a={a.commercial?.gpPerLoadedMileUsd} b={b.commercial?.gpPerLoadedMileUsd} fmt={usd.format} />
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

function Breadcrumb() {
  return (
    <div className="mb-3 text-xs text-muted-foreground">
      <Link href="/quotes" className="hover:text-foreground">Quote history</Link>
      <span className="mx-1">/</span>
      <span>Compare</span>
    </div>
  )
}

function Section({ title }: { title: string }) {
  return (
    <tr className="border-b bg-muted/30">
      <td colSpan={4} className="px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</td>
    </tr>
  )
}

function Row({ label, a, b, fmt }: { label: string; a?: number | null; b?: number | null; fmt: (n: number) => string }) {
  const has = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
  const d = has(a) && has(b) ? b - a : null
  return (
    <tr className="border-b last:border-b-0">
      <td className="px-4 py-2 text-muted-foreground">{label}</td>
      <td className="px-4 py-2 text-right tabular-nums">{has(a) ? fmt(a) : '—'}</td>
      <td className="px-4 py-2 text-right tabular-nums">{has(b) ? fmt(b) : '—'}</td>
      <td className="px-4 py-2 text-right text-xs tabular-nums text-muted-foreground">
        {d == null || d === 0 ? '' : `${d > 0 ? '+' : ''}${fmt(d)}`}
      </td>
    </tr>
  )
}
