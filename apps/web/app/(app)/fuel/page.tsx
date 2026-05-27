import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { FuelDashboard, type FuelStatus, type TrendPoint } from './fuel-dashboard'

export const metadata: Metadata = { title: 'Fuel & FSC' }

export default async function FuelPage() {
  // Server-side hydration of the current fuel state + a default U.S. trend.
  const [status, trend] = await Promise.all([
    api<FuelStatus>('/market/fuel'),
    api<TrendPoint[]>('/market/fuel/history?area=U.S.&months=24'),
  ])
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Fuel &amp; FSC</h1>
        <p className="text-sm text-muted-foreground">
          Current diesel by EIA region, derived US state FSC, and the historical trend that drives the FSC schedule.
        </p>
      </header>
      <FuelDashboard initialStatus={status} initialTrend={trend} />
    </main>
  )
}
