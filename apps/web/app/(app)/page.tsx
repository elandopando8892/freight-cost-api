import Link from 'next/link'
import type { Metadata } from 'next'
import { api, ApiError } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RelativeTime } from '@/components/relative-time'
import { QuotesChart } from './quotes-chart'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

/** Bucket ISO timestamps into per-day counts for the last N days (clock read kept
 *  out of any component body — this is a module-level helper). */
function bucketByDay(isoList: string[], days = 14): { label: string; count: number }[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const buckets: { key: string; label: string; count: number }[] = []
  const idx = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    idx.set(key, buckets.length)
    buckets.push({ key, label: `${d.getMonth() + 1}/${d.getDate()}`, count: 0 })
  }
  for (const iso of isoList) {
    const i = idx.get(new Date(iso).toISOString().slice(0, 10))
    if (i != null) buckets[i].count++
  }
  return buckets.map(({ label, count }) => ({ label, count }))
}

interface AssumptionSet {
  id: string
  name: string
  version: number
  isActive: boolean
  createdAt: string
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
  const [sets, fuel, quotes, onboarding] = await Promise.all([
    safe(api<AssumptionSet[]>('/assumptions/sets'), [] as AssumptionSet[]),
    safe(api<FuelStatus>('/market/fuel'), null as FuelStatus | null),
    safe(api<SavedQuote[]>('/quotes'), [] as SavedQuote[]),
    safe(api<CarrierOnboarding>('/onboarding/carrier'), { completed: 0, total: 5, ready: false }),
  ])
  const active = sets.find((s) => s.isActive) ?? null
  const usRegion = fuel?.regions.find((r) => r.region === 'U.S.') ?? null
  const newestFuel = fuel?.regions.length
    ? fuel.regions.reduce((acc, r) => (r.updatedAt > acc ? r.updatedAt : acc), fuel.regions[0].updatedAt)
    : null
  const recent = quotes.slice(0, 5)
  const quotesByDay = bucketByDay(quotes.map((q) => q.createdAt))

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">At a glance — active set, fuel, and recent quotes.</p>
        </div>
      </header>

      {!onboarding.ready && <Card className="mb-6 border-primary/30 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="text-base">Activación del carrier</CardTitle><CardDescription>{onboarding.completed} de {onboarding.total} pasos con evidencia operativa.</CardDescription></CardHeader><CardContent><Link href="/onboarding" className="text-sm font-medium underline underline-offset-2">Continuar onboarding →</Link></CardContent></Card>}

      {/* First-run onboarding — only until the first quote is saved */}
      {quotes.length === 0 && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>Welcome to Freight Cost Model</CardTitle>
            <CardDescription>
              Price cross-border MX–US lanes against your assumptions in seconds. Three steps to your first quote:
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ol className="grid gap-3 text-sm">
              <li className="flex gap-3">
                <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${active ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                  {active ? '✓' : '1'}
                </span>
                <div>
                  <div className="font-medium">Assumptions {active ? 'ready' : 'set up'}</div>
                  <div className="text-muted-foreground">
                    {active ? (
                      <>Your active set <strong className="text-foreground">{active.name}</strong> drives every cost. <Link href={`/assumptions/${active.id}`} className="underline underline-offset-2 hover:text-foreground">Review or tweak →</Link></>
                    ) : (
                      <>Create a set to drive your costs. <Link href="/assumptions" className="underline underline-offset-2 hover:text-foreground">Go to Assumptions →</Link></>
                    )}
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">2</span>
                <div>
                  <div className="font-medium">Quote a lane</div>
                  <div className="text-muted-foreground">Enter origin + destination and get the MEX/USA breakdown plus commercial sell tiers.</div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">3</span>
                <div>
                  <div className="font-medium">Save &amp; revisit</div>
                  <div className="text-muted-foreground">Saved quotes land in History — copy a summary to share with a customer.</div>
                </div>
              </li>
            </ol>
            <div>
              <Link href="/quote" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
                Run your first quote →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI row */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {/* Active assumption set */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active assumption set</CardDescription>
            <CardTitle className="text-xl truncate">{active ? active.name : 'None'}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="text-sm text-muted-foreground">
              {active
                ? <>v{active.version} · created <RelativeTime iso={active.createdAt} /></>
                : sets.length === 0
                  ? 'Create your first set to start pricing lanes.'
                  : `${sets.length} set${sets.length === 1 ? '' : 's'} — none active.`}
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {active ? (
                <Link href={`/assumptions/${active.id}`} className="rounded-md border bg-background px-3 py-1.5 shadow-sm hover:bg-accent">
                  Edit set
                </Link>
              ) : null}
              <Link href="/assumptions" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground">
                {active ? 'All sets' : 'Go to Assumptions'}
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Fuel */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Diesel — U.S. average</CardDescription>
            <CardTitle className="text-xl">
              {usRegion ? `${usd.format(usRegion.dieselUsdGal)} / gal` : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="text-sm text-muted-foreground">
              {newestFuel
                ? <>Updated <RelativeTime iso={newestFuel} /> · {fuel?.fscBrackets ?? 0} FSC brackets</>
                : 'No regions seeded yet.'}
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link href="/fuel" className="rounded-md border bg-background px-3 py-1.5 shadow-sm hover:bg-accent">
                Open Fuel
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quotes saved */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saved quotes</CardDescription>
            <CardTitle className="text-xl">{quotes.length}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="text-sm text-muted-foreground">
              {recent[0]
                ? <>Last <RelativeTime iso={recent[0].createdAt} /> · {usd.format(recent[0].freightBaselineUsd)}</>
                : 'No quotes saved yet.'}
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link href="/quote" className="rounded-md border bg-background px-3 py-1.5 shadow-sm hover:bg-accent">
                New quote
              </Link>
              {quotes.length > 0 && (
                <Link href="/quotes" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground">
                  History
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quote volume */}
      {quotes.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quote volume</CardTitle>
            <CardDescription>Saved quotes per day — last 14 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <QuotesChart data={quotesByDay} />
          </CardContent>
        </Card>
      )}

      {/* Recent quotes */}
      <Card>
        <CardHeader className="flex flex-row items-baseline justify-between gap-3">
          <div>
            <CardTitle>Recent quotes</CardTitle>
            <CardDescription>Last {recent.length} saved — most recent first.</CardDescription>
          </div>
          {quotes.length > recent.length && (
            <Link href="/quotes" className="text-sm text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              No saved quotes yet. <Link href="/quote" className="underline underline-offset-2 hover:text-foreground">Run your first quote →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">When</th>
                    <th className="px-4 py-2 text-left font-medium">Label</th>
                    <th className="px-4 py-2 text-left font-medium">Operation</th>
                    <th className="px-4 py-2 text-right font-medium">Baseline</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((q) => (
                    <tr key={q.id} className="border-b last:border-b-0 hover:bg-muted/40">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        <RelativeTime iso={q.createdAt} />
                      </td>
                      <td className="px-4 py-3">
                        {q.label ?? <span className="text-muted-foreground">— untitled</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span>{q.operation}</span>
                        <span className="ml-1 text-xs text-muted-foreground">· {q.service}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
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
