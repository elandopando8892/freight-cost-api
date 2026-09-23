import Link from 'next/link'
import { api } from '@/lib/api'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Estimaciones de socios guardadas' }

export default async function SavedPartnerCosts({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const { cursor } = await searchParams
  const data = await api<{ items: { id: string; version: number; origin: string; destination: string; serviceDate: string; purchaseCostUsd: number }[]; nextCursor: string | null }>(`/partner-cost-estimates${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`)
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
    <Link href="/quote/partners" className="inline-block min-h-11 py-2 underline">← Costos de socios / nueva estimación</Link>
    <h1 className="text-2xl font-semibold">Estimaciones guardadas</h1>
    <p className="text-sm text-muted-foreground">Versiones históricas de compra de tu organización. No son cotizaciones de venta ni tarifas verificadas.</p>
    {!data.items.length && <p className="rounded border bg-card p-5">Todavía no hay estimaciones guardadas.</p>}
    <ul className="space-y-3">{data.items.map(item => <li key={item.id} className="rounded border bg-card p-5">
      <Link href={`/quote/partners/saved/${item.id}`} className="block min-h-11 space-y-2 break-words underline underline-offset-4">
        <span className="block font-semibold">{item.origin} → {item.destination}</span>
        <span className="block text-sm">Viaje {item.serviceDate} · Versión {item.version} · {item.purchaseCostUsd.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
      </Link>
    </li>)}</ul>
    {data.nextCursor && <Link className="inline-block min-h-11 py-2 underline" href={`/quote/partners/saved?cursor=${encodeURIComponent(data.nextCursor)}`}>Siguientes 20 →</Link>}
  </main>
}
