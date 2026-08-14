import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowUpRight, CircleDollarSign, Droplets, Layers3, Plus, Sparkles } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RelativeTime } from '@/components/relative-time'
import { dateKeyInTimeZone } from '@/lib/civil-date'
import { QuotesChart } from './quotes-chart'

export const metadata: Metadata = { title: 'Panel de control' }
export const dynamic = 'force-dynamic'

/** Bucket ISO timestamps into per-day counts for the last N days (clock read kept
 *  out of any component body — this is a module-level helper). */
function bucketByDay(isoList: string[], days = 14): { label: string; count: number }[] {
  const [year, month, day] = dateKeyInTimeZone(new Date()).split('-').map(Number)
  const today = new Date(Date.UTC(year, month - 1, day))
  const buckets: { key: string; label: string; count: number }[] = []
  const idx = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    idx.set(key, buckets.length)
    buckets.push({ key, label: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`, count: 0 })
  }
  for (const iso of isoList) {
    const i = idx.get(dateKeyInTimeZone(iso))
    if (i != null) buckets[i].count++
  }
  return buckets.map(({ label, count }) => ({ label, count }))
}

interface CostBaseSummary {
  id: string
  code: string
  name: string
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  isDefault: boolean
  updatedAt: string
  versions: {
    version: number
    isActive: boolean
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  }[]
}
interface FuelRegion { region: string; dieselUsdGal: number; updatedAt: string }
interface FuelStatus {
  regions: FuelRegion[]
  fscBrackets: number
  sampleState: { state: string; pricePerGallon: number; fsc: number } | null
  usBorderDieselUsdL: number | null
}
interface SavedQuote {
  id: string
  label: string | null
  operation: string
  service: string
  freightBaselineUsd: number
  requiredTariffMxn: number
  fxRateUsed: number
  createdAt: string
}
interface CarrierOnboarding { completed: number; total: number; ready: boolean }

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p } catch (err) {
    if (err instanceof ApiError) return fallback
    throw err
  }
}

export default async function DashboardPage() {
  // Fetch everything in parallel; tolerate per-endpoint 404/empty so a missing
  // section doesn't blow up the whole page.
  const [bases, fuel, quotes, onboarding] = await Promise.all([
    safe(api<CostBaseSummary[]>('/cost-bases'), [] as CostBaseSummary[]),
    safe(api<FuelStatus>('/market/fuel'), null as FuelStatus | null),
    safe(api<SavedQuote[]>('/quotes'), [] as SavedQuote[]),
    safe(api<CarrierOnboarding>('/onboarding/carrier'), { completed: 0, total: 5, ready: false }),
  ])
  const activeBases = bases.filter((base) =>
    base.status === 'ACTIVE' && base.versions.some((version) => version.status === 'PUBLISHED' && version.isActive),
  )
  const defaultBase = activeBases.find((base) => base.isDefault) ?? activeBases[0] ?? null
  const defaultVersion = defaultBase?.versions.find((version) => version.status === 'PUBLISHED' && version.isActive) ?? null
  const usRegion = fuel?.regions.find((r) => r.region === 'U.S.') ?? null
  const newestFuel = fuel?.regions.length
    ? fuel.regions.reduce((acc, r) => (r.updatedAt > acc ? r.updatedAt : acc), fuel.regions[0].updatedAt)
    : null
  const recent = quotes.slice(0, 5)
  const quotesByDay = bucketByDay(quotes.map((q) => q.createdAt))

  return (
    <main className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" /> Torre de control
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Operación de costos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Bases activas, mercado y actividad comercial en un solo lugar.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/quote-desk" className="inline-flex items-center gap-2 rounded-md border bg-background px-3.5 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent">
            Quote Desk <ArrowUpRight className="size-4" />
          </Link>
          <Link href="/quote" className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
            <Plus className="size-4" /> Nueva cotización
          </Link>
        </div>
      </header>

      {!onboarding.ready && <Card className="mb-6 overflow-hidden border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"><CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm"><Sparkles className="size-4" /></span><div><p className="text-sm font-semibold">Activación operativa pendiente</p><p className="mt-0.5 text-sm text-muted-foreground">{onboarding.completed} de {onboarding.total} pasos con evidencia operativa.</p></div></div><Link href="/onboarding" className="text-sm font-medium text-primary hover:underline">Continuar onboarding →</Link></CardContent></Card>}

      {/* First-run onboarding — only until the first quote is saved */}
      {quotes.length === 0 && (
        <Card className="mb-6 overflow-hidden border-primary/20">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <CardTitle className="text-base">De datos a tarifa en tres pasos</CardTitle>
            <CardDescription>Configura la base, cotiza una ruta y conserva la evidencia comercial.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 pt-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <ol className="grid gap-4 text-sm sm:grid-cols-3">
              <li className="flex gap-3 sm:block">
                <span className={`mb-2 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${activeBases.length ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>{activeBases.length ? '✓' : '1'}</span>
                <div className="font-medium">Selecciona una base</div>
                <p className="mt-1 text-muted-foreground">{activeBases.length ? <><strong className="text-foreground">{activeBases.length}</strong> {activeBases.length === 1 ? 'base activa' : 'bases activas'}; elige según la ruta.</> : 'Configura una base y publica sus supuestos.'}</p>
              </li>
              <li className="flex gap-3 sm:block">
                <span className="mb-2 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">2</span>
                <div className="font-medium">Cotiza la ruta</div>
                <p className="mt-1 text-muted-foreground">Origen, destino y servicio generan un desglose trazable.</p>
              </li>
              <li className="flex gap-3 sm:block">
                <span className="mb-2 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">3</span>
                <div className="font-medium">Prepara la propuesta</div>
                <p className="mt-1 text-muted-foreground">Guarda el cálculo y llévalo a Quote Desk para revisión.</p>
              </li>
            </ol>
            <Link href="/quote" className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">Cotizar primera ruta <ArrowUpRight className="size-4" /></Link>
          </CardContent>
        </Card>
      )}

      <section aria-label="Resumen operativo" className="mb-6 grid gap-4 xl:grid-cols-3">
        <Card className="relative overflow-hidden border-primary/20">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Bases operativas</p>
                <p className="mt-2 max-w-56 truncate text-lg font-semibold tracking-tight">{activeBases.length ? `${activeBases.length} ${activeBases.length === 1 ? 'activa' : 'activas'}` : 'Sin bases activas'}</p>
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Layers3 className="size-4" /></span>
            </div>
            <div className="mt-5 flex items-end justify-between gap-3">
              <p className="text-sm text-muted-foreground">{defaultBase ? <>{defaultBase.code}{defaultVersion ? ` · v${defaultVersion.version}` : ''} · <RelativeTime iso={defaultBase.updatedAt} /></> : bases.length === 0 ? 'Crea tu primera base para cotizar.' : `${bases.length} bases disponibles; falta activar una versión.`}</p>
              <Link href="/cost-bases" className="shrink-0 text-sm font-medium text-primary hover:underline">{bases.length ? 'Administrar' : 'Crear base'}</Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Diesel · EE. UU.</p>
                <p className="mt-2 text-lg font-semibold tracking-tight">{usRegion ? `${usd.format(usRegion.dieselUsdGal)} / gal` : 'Sin lectura'}</p>
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"><Droplets className="size-4" /></span>
            </div>
            <div className="mt-5 flex items-end justify-between gap-3">
              <p className="text-sm text-muted-foreground">{newestFuel ? <>Actualizado <RelativeTime iso={newestFuel} /> · {fuel?.fscBrackets ?? 0} brackets FSC</> : 'Aún no hay regiones cargadas.'}</p>
              <Link href="/fuel" className="shrink-0 text-sm font-medium text-primary hover:underline">Ver mercado</Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Cotizaciones</p>
                <p className="mt-2 text-lg font-semibold tracking-tight">{quotes.length} <span className="text-sm font-normal text-muted-foreground">guardadas</span></p>
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><CircleDollarSign className="size-4" /></span>
            </div>
            <div className="mt-5 flex items-end justify-between gap-3">
              <p className="text-sm text-muted-foreground">{recent[0] ? <>Última <RelativeTime iso={recent[0].createdAt} /> · {usd.format(recent[0].freightBaselineUsd)}</> : 'Empieza con una nueva cotización.'}</p>
              <Link href="/quotes" className="shrink-0 text-sm font-medium text-primary hover:underline">Historial</Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Quote volume */}
      {quotes.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-start justify-between gap-4 border-b pb-4">
            <div>
              <CardTitle className="text-base">Ritmo comercial</CardTitle>
              <CardDescription>Cotizaciones guardadas por día · últimos 14 días.</CardDescription>
            </div>
            <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">14 días</span>
          </CardHeader>
          <CardContent className="pt-5">
            <QuotesChart data={quotesByDay} />
          </CardContent>
        </Card>
      )}

      {/* Recent quotes */}
      <Card>
        <CardHeader className="flex flex-row items-baseline justify-between gap-3 border-b pb-4">
          <div>
            <CardTitle className="text-base">Actividad reciente</CardTitle>
            <CardDescription>Las últimas {recent.length} cotizaciones, de la más reciente a la anterior.</CardDescription>
          </div>
          {quotes.length > recent.length && (
            <Link href="/quotes" className="text-sm font-medium text-primary hover:underline">
              Ver historial
            </Link>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Aún no hay cotizaciones guardadas. <Link href="/quote" className="font-medium text-primary underline underline-offset-2">Crear la primera →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Fecha</th>
                    <th className="px-5 py-3 text-left font-medium">Cotización</th>
                    <th className="px-5 py-3 text-left font-medium">Operación</th>
                    <th className="px-5 py-3 text-right font-medium">Costo base</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((q) => (
                    <tr key={q.id} className="border-b last:border-b-0 transition-colors hover:bg-muted/40">
                      <td className="whitespace-nowrap px-5 py-3.5 text-muted-foreground">
                        <RelativeTime iso={q.createdAt} />
                      </td>
                      <td className="px-5 py-3.5 font-medium">
                        {q.label ?? <span className="font-normal text-muted-foreground">Sin título</span>}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <span>{q.operation}</span>
                        <span className="ml-1 text-xs text-muted-foreground">· {q.service}</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium tabular-nums">
                        {usd.format(q.freightBaselineUsd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
