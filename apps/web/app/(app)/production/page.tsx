import type { Metadata } from 'next'
import { api } from '@/lib/api'
import type { MexLane, UsaLane } from './production-matrix'
import type { CostBaseOption, ProductionRoute } from './production-routes-board'
import { ProductionWorkspace } from './production-workspace'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Rutas de producción' }

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try { return await promise } catch { return fallback }
}

export default async function ProductionPage() {
  const [routes, costBases, mex, usa, user] = await Promise.all([
    safe(api<ProductionRoute[]>('/production/routes'), []),
    safe(api<CostBaseOption[]>('/cost-bases'), []),
    safe(api<MexLane[]>('/production/mex-lanes'), []),
    safe(api<UsaLane[]>('/production/usa-lanes'), []),
    api<{ role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }>('/auth/me'),
  ])
  return (
    <main className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-4">
      <header className="mb-4 border-b pb-3">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Control de costos</p>
        <h1 className="text-xl font-semibold tracking-tight">Rutas de producción</h1>
        <p className="mt-1 max-w-4xl text-xs text-muted-foreground">Gobierna rutas operativas por geografía, equipo, base y versión. Los tramos técnicos permanecen separados para no confundir datos del motor con rutas listas para cotizar.</p>
      </header>
      <ProductionWorkspace routes={routes} costBases={costBases} mex={mex} usa={usa} canEdit={user.role !== 'VIEWER'} />
    </main>
  )
}
