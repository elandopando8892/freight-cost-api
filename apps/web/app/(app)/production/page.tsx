import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { ProductionMatrix, type MexLane, type UsaLane } from './production-matrix'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Rutas de producción' }

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p } catch { return fallback }
}

export default async function ProductionPage() {
  const [mex, usa] = await Promise.all([
    safe(api<MexLane[]>('/production/mex-lanes'), []),
    safe(api<UsaLane[]>('/production/usa-lanes'), []),
  ])
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Rutas de producción</h1>
        <p className="text-sm text-muted-foreground">
          Tu propia matriz de rutas MX y US. Cuando cotizas, el motor usa <strong>estas primero</strong> y sólo
          recurre a la referencia global si la ruta no está aquí — así puedes cotizar cualquier lane de tu red.
        </p>
      </header>
      <ProductionMatrix initialMex={mex} initialUsa={usa} />
    </main>
  )
}
