'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetcher } from '@/lib/fetcher'
import { RelativeTime } from '@/components/relative-time'

export interface Region { region: string; dieselUsdGal: number; updatedAt: string }
export type UsaFuelSample = { state: string; pricePerGallon: number; fsc: number } | null
export interface FuelStatus {
  regions: Region[]
  fscBrackets: number
  sampleState: UsaFuelSample
  usBorderDieselUsdL: number | null
}
export interface TrendPoint { period: string; areaName: string; diesel: number; fsc: number }

const usd = (n: number) => `$${n.toFixed(2)}`
const selectCls =
  'h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export function FuelDashboard({
  initialStatus, initialTrend,
}: { initialStatus: FuelStatus; initialTrend: TrendPoint[] }) {
  const [area, setArea] = useState('U.S.')

  // Current fuel — refetched after a successful refresh
  const status = useQuery({
    queryKey: ['fuel-status'],
    queryFn: () => fetcher<FuelStatus>('/api/v1/market/fuel'),
    initialData: initialStatus,
    staleTime: 60_000,
  })

  // Trend for the selected area
  const trend = useQuery({
    queryKey: ['fuel-trend', area],
    queryFn: () => fetcher<TrendPoint[]>(`/api/v1/market/fuel/history?area=${encodeURIComponent(area)}&months=24`),
    initialData: area === 'U.S.' ? initialTrend : undefined,
    staleTime: 60_000,
  })

  // One-click refresh — full EIA pipeline (current diesel → FSC → MX leg sync)
  const refresh = useMutation({
    mutationFn: () =>
      fetcher<{ eia: { updated: number }; updated: number; syncedOrgs?: number }>('/api/v1/market/fuel/fetch-eia', { method: 'POST' }),
    onSuccess: async (out) => {
      toast.success(`Updated ${out.eia.updated} EIA regions`, { description: `Recomputed ${out.updated} state FSC rows` })
      await Promise.all([status.refetch(), trend.refetch()])
    },
  })

  const regions = status.data?.regions ?? []
  const newestAt = useMemo(() => {
    if (regions.length === 0) return null
    return regions.reduce((acc, r) => (r.updatedAt > acc ? r.updatedAt : acc), regions[0].updatedAt)
  }, [regions])

  return (
    <div className="grid gap-6">
      {/* Top: status + refresh */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Current fuel</CardTitle>
            <CardDescription>
              {newestAt ? (
                <>Last update <RelativeTime iso={newestAt} /></>
              ) : (
                'No regions seeded yet.'
              )}
              {' · '}
              {status.data?.fscBrackets ?? 0} FSC brackets
              {status.data?.usBorderDieselUsdL != null && (
                <> · Diesel @ US border <strong>{usd(status.data.usBorderDieselUsdL)} / L</strong></>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => refresh.mutate()} disabled={refresh.isPending}>
              {refresh.isPending ? 'Refreshing…' : 'Refresh from EIA'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {regions.map((r) => (
              <div key={r.region} className="flex items-baseline justify-between rounded-md border bg-card/50 px-3 py-2">
                <span className="text-sm">{r.region}</span>
                <span className="font-mono font-medium">{usd(r.dieselUsdGal)} <span className="text-xs text-muted-foreground">/gal</span></span>
              </div>
            ))}
          </div>
          {status.data?.sampleState && (
            <p className="mt-4 text-xs text-muted-foreground">
              Sample derived state ({status.data.sampleState.state}): diesel {usd(status.data.sampleState.pricePerGallon)}/gal · FSC <strong>{usd(status.data.sampleState.fsc)}</strong>/mi
            </p>
          )}
        </CardContent>
      </Card>

      {/* Trend chart */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>FSC trend</CardTitle>
            <CardDescription>Monthly diesel ($/gal) and derived FSC ($/mi) — last 24 months from EIA EPD2D.</CardDescription>
          </div>
          <select className={selectCls} value={area} onChange={(e) => setArea(e.target.value)}>
            {['U.S.', 'East Coast', 'New England', 'Central Atlantic', 'Lower Atlantic', 'Midwest',
              'Gulf Coast', 'Rocky Mountain', 'West Coast', 'West Coast less California', 'California']
              .map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <Chart data={(trend.data ?? []).slice().reverse()} loading={trend.isFetching && !trend.data} />
          </div>
          {!trend.isFetching && (trend.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              No history for "{area}". Trigger the historical pull from the API:{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">POST /market/fuel/fetch-eia-history</code> (needs EIA_API_KEY).
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Chart({ data, loading }: { data: TrendPoint[]; loading: boolean }) {
  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading trend…</div>
  }
  if (data.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data</div>
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} minTickGap={20} />
        <YAxis yAxisId="d" orientation="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
        <YAxis yAxisId="f" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
        <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
        <Legend />
        <Line yAxisId="d" type="monotone" dataKey="diesel" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Diesel $/gal" />
        <Line yAxisId="f" type="monotone" dataKey="fsc" stroke="#f59e0b" strokeWidth={2} dot={false} name="FSC $/mi" />
      </LineChart>
    </ResponsiveContainer>
  )
}
