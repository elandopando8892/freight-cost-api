'use client'

import { useState } from 'react'
import { ProductionMatrix, type MexLane, type UsaLane } from './production-matrix'
import { ProductionRoutesBoard, type CostBaseOption, type ProductionRoute } from './production-routes-board'

type WorkspaceView = 'governed' | 'technical'

export function ProductionWorkspace({
  routes,
  costBases,
  mex,
  usa,
  canEdit,
}: {
  routes: ProductionRoute[]
  costBases: CostBaseOption[]
  mex: MexLane[]
  usa: UsaLane[]
  canEdit: boolean
}) {
  const [view, setView] = useState<WorkspaceView>('governed')
  const productionCount = routes.filter((route) => route.status === 'PRODUCTION').length
  const draftCount = routes.filter((route) => route.status === 'DRAFT').length
  const reviewCount = routes.filter((route) => route.quality !== 'READY').length
  const activeBases = costBases.filter((base) => base.status === 'ACTIVE').length

  return (
    <section className="grid gap-3">
      <div className="grid overflow-hidden rounded-md border bg-card sm:grid-cols-4">
        <Metric label="En producción" value={productionCount} />
        <Metric label="Borradores" value={draftCount} />
        <Metric label="Requieren revisión" value={reviewCount} tone={reviewCount > 0 ? 'warning' : 'default'} />
        <Metric label="Bases activas" value={activeBases} last />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b">
        <div role="tablist" aria-label="Vistas de producción" className="flex items-center gap-4 text-sm">
          <WorkspaceTab id="governed-routes-tab" active={view === 'governed'} controls="governed-routes" onClick={() => setView('governed')}>
            Rutas gobernadas <span className="text-xs text-muted-foreground">{routes.length}</span>
          </WorkspaceTab>
          <WorkspaceTab id="technical-segments-tab" active={view === 'technical'} controls="technical-segments" onClick={() => setView('technical')}>
            Tramos técnicos <span className="text-xs text-muted-foreground">{mex.length + usa.length}</span>
          </WorkspaceTab>
        </div>
        <p className="pb-2 text-[11px] text-muted-foreground">
          {view === 'governed'
            ? 'La base confirmada y su versión gobiernan cada ruta.'
            : 'Los tramos alimentan el motor; no son rutas publicables.'}
        </p>
      </div>

      {view === 'governed' ? (
        <div id="governed-routes" role="tabpanel" aria-labelledby="governed-routes-tab">
          <ProductionRoutesBoard initialRoutes={routes} costBases={costBases} canEdit={canEdit} />
        </div>
      ) : (
        <div id="technical-segments" role="tabpanel" aria-labelledby="technical-segments-tab">
          <ProductionMatrix initialMex={mex} initialUsa={usa} canEdit={canEdit} />
        </div>
      )}
    </section>
  )
}

function Metric({ label, value, tone = 'default', last = false }: { label: string; value: number; tone?: 'default' | 'warning'; last?: boolean }) {
  return (
    <div className={`px-3 py-2 ${last ? '' : 'border-b sm:border-r sm:border-b-0'}`}>
      <div className={`text-lg font-semibold tabular-nums ${tone === 'warning' ? 'text-amber-700 dark:text-amber-400' : ''}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  )
}

function WorkspaceTab({ id, active, controls, onClick, children }: { id: string; active: boolean; controls: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      id={id}
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={`border-b-2 px-1 py-2 font-medium ${active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
    >
      {children}
    </button>
  )
}
