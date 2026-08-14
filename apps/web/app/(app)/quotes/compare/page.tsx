import Link from 'next/link'
import type { Metadata } from 'next'
import { api, ApiError } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Comparar cotizaciones' }

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
  set: { name: string; version: number } | null
  costBase: { code: string; name: string } | null
  calculationPolicy: 'LEGACY_UNSPECIFIED' | 'OPERATIONAL_V3' | 'WORKBOOK_V3'
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
      <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4">
        <Breadcrumb />
        <Card><CardContent className="px-6 py-10 text-center text-sm text-muted-foreground">
          Selecciona exactamente dos cotizaciones desde el <Link href="/quotes" className="underline underline-offset-2">historial</Link> para compararlas.
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
      <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4">
        <Breadcrumb />
        <Card><CardContent className="px-6 py-10 text-center text-sm text-muted-foreground">
          {notFound ? 'Una de las cotizaciones ya no existe.' : 'No fue posible cargar las cotizaciones.'}{' '}
          <Link href="/quotes" className="underline underline-offset-2">Volver al historial</Link>
        </CardContent></Card>
      </main>
    )
  }

  const [a, b] = quotes
  const anyMex = a.mexLeg || b.mexLeg
  const anyUsa = a.usaLeg || b.usaLeg

  return (
    <main className="mx-auto w-full max-w-[1200px] px-3 py-4 sm:px-4">
      <Breadcrumb />
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Comparar cotizaciones</h1>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs">
              <thead className="border-b bg-muted/20">
                <tr className="align-bottom">
                  <th className="w-40 px-3 py-3 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Métrica</th>
                  {quotes.map((q) => (
                    <th key={q.id} className="px-4 py-3 text-right">
                      <Link href={`/quotes/${q.id}`} className="block font-semibold hover:underline">
                        {q.label ?? `Cotización ${q.id.slice(0, 8)}`}
                      </Link>
                      <div className="text-xs font-normal text-muted-foreground">{q.operation}{q.service ? ` · ${q.service}` : ''}</div>
                      <div className="truncate text-xs font-normal text-muted-foreground">
                        {q.lane && (q.lane.origin || q.lane.destination) ? `${q.lane.origin ?? '—'} → ${q.lane.destination ?? '—'}` : '—'}
                      </div>
                      <div className="mt-1 text-[10px] font-normal text-muted-foreground">
                        {q.costBase?.code ?? 'Sin base'} · {q.set ? `v${q.set.version}` : 'sin versión'} · {q.calculationPolicy === 'WORKBOOK_V3' ? 'Libro exacto' : q.calculationPolicy === 'OPERATIONAL_V3' ? 'Operativa V3' : 'sin especificar'}
                      </div>
                    </th>
                  ))}
                  <th className="w-24 px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Δ (B−A)</th>
                </tr>
              </thead>
              <tbody>
                <Section title="Resumen" />
                <Row label="Tarifa base" a={a.freightBaselineUsd} b={b.freightBaselineUsd} fmt={usd.format} />
                <Row label="Requerida (USD)" a={a.requiredTariffUsd} b={b.requiredTariffUsd} fmt={usd.format} />
                <Row label="Requerida (MXN)" a={a.requiredTariffMxn} b={b.requiredTariffMxn} fmt={mxn.format} />
                <Row label="Tipo de cambio" a={a.fxRateUsed} b={b.fxRateUsed} fmt={num} />
                <Row label="Margen bruto" a={a.commercial?.grossMarginPct} b={b.commercial?.grossMarginPct} fmt={pct} />

                {anyMex && (
                  <>
                    <Section title="Tramo MEX" />
                    <Row label="Tarifa requerida" a={a.mexLeg?.requiredTariffUsd} b={b.mexLeg?.requiredTariffUsd} fmt={usd.format} />
                    <Row label="Kilómetros totales" a={a.mexLeg?.totalKm} b={b.mexLeg?.totalKm} fmt={(n) => Math.round(n).toString()} />
                    <Row label="Días de ciclo" a={a.mexLeg?.cycleDays} b={b.mexLeg?.cycleDays} fmt={num} />
                    <Row label="RPM" a={a.mexLeg?.rpm} b={b.mexLeg?.rpm} fmt={num} />
                  </>
                )}

                {anyUsa && (
                  <>
                    <Section title="Tramo EE. UU." />
                    <Row label="Tarifa plana" a={a.usaLeg?.flatUsd} b={b.usaLeg?.flatUsd} fmt={usd.format} />
                    <Row label="Millas cargadas" a={a.usaLeg?.loadedMiles} b={b.usaLeg?.loadedMiles} fmt={(n) => Math.round(n).toString()} />
                    <Row label="RPM" a={a.usaLeg?.rpm} b={b.usaLeg?.rpm} fmt={num} />
                    <Row label="RPM mercado DAT" a={a.usaLeg?.marketRpm} b={b.usaLeg?.marketRpm} fmt={num} />
                  </>
                )}

                <Section title="Comercial" />
                <Row label="Piso de costo" a={a.commercial?.costFloorUsd} b={b.commercial?.costFloorUsd} fmt={usd.format} />
                <Row label="Venta recomendada" a={a.commercial?.recommendedSellUsd} b={b.commercial?.recommendedSellUsd} fmt={usd.format} />
                <Row label="Utilidad bruta" a={a.commercial?.grossProfitUsd} b={b.commercial?.grossProfitUsd} fmt={usd.format} />
                <Row label="UB / milla cargada" a={a.commercial?.gpPerLoadedMileUsd} b={b.commercial?.gpPerLoadedMileUsd} fmt={usd.format} />
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
      <Link href="/quotes" className="hover:text-foreground">Historial</Link>
      <span className="mx-1">/</span>
      <span>Comparar</span>
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
