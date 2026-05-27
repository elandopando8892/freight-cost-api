import Link from 'next/link'
import type { Metadata } from 'next'
import { api, ApiError } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RelativeTime } from '@/components/relative-time'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

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
  const [sets, fuel, quotes] = await Promise.all([
    safe(api<AssumptionSet[]>('/assumptions/sets'), [] as AssumptionSet[]),
    safe(api<FuelStatus>('/market/fuel'), null as FuelStatus | null),
    safe(api<SavedQuote[]>('/quotes'), [] as SavedQuote[]),
  ])
  const active = sets.find((s) => s.isActive) ?? null
  const usRegion = fuel?.regions.find((r) => r.region === 'U.S.') ?? null
  const newestFuel = fuel?.regions.length
    ? fuel.regions.reduce((acc, r) => (r.updatedAt > acc ? r.updatedAt : acc), fuel.regions[0].updatedAt)
    : null
  const recent = quotes.slice(0, 5)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">At a glance — active set, fuel, and recent quotes.</p>
        </div>
      </header>

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
