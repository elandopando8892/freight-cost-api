import type { Metadata } from 'next'
import Link from 'next/link'
import { api } from '@/lib/api'
import { PartnerCostForm } from './partner-cost-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Costos de socios' }

export default async function PartnerCostPage() {
  const user = await api<{ role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }>('/auth/me')
  return <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
    <header className="space-y-2">
      <Link href="/quote" className="text-sm underline underline-offset-4">← Cotizar</Link>
      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">D2D · viaje sencillo · intercambio</p>
      <h1 className="text-2xl font-semibold">Costos de socios</h1>
      <Link href="/cost-bases/partners" className="inline-block min-h-11 rounded border px-4 py-2 text-sm font-semibold">Calcular desde una base publicada →</Link>
      <Link href="/quote/partners/saved" className="inline-block min-h-11 py-2 text-sm underline underline-offset-4">Estimaciones guardadas →</Link>
      <p className="max-w-3xl text-sm text-muted-foreground">Suma las tarifas de tus líneas MX y US, combustible, peajes y cargos del intercambio. Captura los importes antes de impuestos.</p>
    </header>
    {user.role === 'VIEWER'
      ? <p className="rounded border bg-card p-5">Tu rol permite consultar cotizaciones guardadas. Para generar un cálculo se requiere operador o administrador.</p>
      : <PartnerCostForm />}
  </main>
}
