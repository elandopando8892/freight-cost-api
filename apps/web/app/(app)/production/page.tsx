import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { ProductionMatrix, type MexLane, type UsaLane } from './production-matrix'
import { ProductionRoutesBoard, type CostBaseOption, type ProductionRoute } from './production-routes-board'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Rutas de produccion' }

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try { return await promise } catch { return fallback }
}

export default async function ProductionPage() {
  const [routes, costBases, mex, usa] = await Promise.all([
    safe(api<ProductionRoute[]>('/production/routes'), []),
    safe(api<CostBaseOption[]>('/cost-bases'), []),
    safe(api<MexLane[]>('/production/mex-lanes'), []),
    safe(api<UsaLane[]>('/production/usa-lanes'), []),
  ])
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Rutas de produccion</h1>
        <p className="text-sm text-muted-foreground">Define rutas operativas por geografia, equipo y base de costos. Una ruta solo entra a produccion con una base activa y una version de supuestos publicada.</p>
      </header>
      <ProductionRoutesBoard initialRoutes={routes} costBases={costBases} />
      <section className="mt-10 border-t pt-8">
        <h2 className="text-lg font-semibold">Datos de tramos para el motor</h2>
        <p className="mb-4 text-sm text-muted-foreground">Estos tramos MX y US alimentan primero el resolver de cotizaciones. Son distintos del catalogo operativo de arriba.</p>
        <ProductionMatrix initialMex={mex} initialUsa={usa} />
      </section>
    </main>
  )
}
