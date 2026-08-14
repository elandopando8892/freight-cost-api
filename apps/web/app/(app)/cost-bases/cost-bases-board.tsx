'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Layers3, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RelativeTime } from '@/components/relative-time'
import { fetcher } from '@/lib/fetcher'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Scope = 'CROSS_BORDER' | 'DRAYAGE' | 'LOCAL' | 'INTRA_MEX' | 'INTRA_US'
type Status = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'

export interface CostBaseVersion {
  id: string
  name: string
  version: number
  isActive: boolean
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  notes: string | null
  sourceVersionId: string | null
  publishedAt: string | null
  scenarioReviewSource?: { id: string; status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED'; sourceChecksum: string; quoteId: string } | null
  publishedBy?: { email: string } | null
  auditEvents?: VersionAudit[]
  createdAt: string
  updatedAt: string
  _count: { params: number }
}

interface VersionAudit {
  id: string
  action: 'DRAFT_CREATED' | 'PUBLISHED' | 'ARCHIVED'
  note: string | null
  createdAt: string
  actor?: { email: string } | null
}

interface VersionImpact {
  base: { id: string; code: string; name: string; scope: Scope }
  candidate: { id: string; version: number; status: CostBaseVersion['status']; isActive: boolean }
  active: { id: string; version: number; status: CostBaseVersion['status']; isActive: boolean } | null
  comparison: {
    referenceAvailable: boolean
    changedParameterCount: number
    changes: { section: string; field: string; unit: string; fromValue: number | null; toValue: number | null; delta: number | null }[]
  }
  records: {
    productionRoutes: { frozenOnActive: number; alreadyOnCandidate: number; other: number }
    quotes: { savedOnActive: number; savedOnCandidate: number; other: number }
  }
  activation: {
    canActivate: boolean
    isAlreadyActive: boolean
    existingProductionRoutesRemainFrozen: boolean
    existingQuotesRemainFrozen: boolean
    requiresHumanRouteReview: boolean
  }
}

export interface CostBase {
  id: string
  code: string
  name: string
  description: string | null
  scope: Scope
  status: Status
  defaultPolicy: 'OPERATIONAL_V3' | 'WORKBOOK_V3'
  currency: string
  isDefault: boolean
  updatedAt: string
  versions: CostBaseVersion[]
  _count: { lanes: number; quotes: number }
}

const SCOPE_LABEL: Record<Scope, string> = {
  CROSS_BORDER: 'Cruce fronterizo', DRAYAGE: 'Drayage', LOCAL: 'Local', INTRA_MEX: 'Intra-México', INTRA_US: 'Intra-EE. UU.',
}
const SCOPE_ORDER: Scope[] = ['CROSS_BORDER', 'DRAYAGE', 'LOCAL', 'INTRA_MEX', 'INTRA_US']
const selectCls = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm'

const BASE_STATUS_LABEL: Record<Status, string> = {
  DRAFT: 'Borrador', ACTIVE: 'Activa', ARCHIVED: 'Archivada',
}

const VERSION_STATUS_LABEL: Record<CostBaseVersion['status'], string> = {
  DRAFT: 'Borrador', PUBLISHED: 'Publicada', ARCHIVED: 'Archivada',
}

const AUDIT_ACTION_LABEL: Record<VersionAudit['action'], string> = {
  DRAFT_CREATED: 'Borrador creado', PUBLISHED: 'Publicada', ARCHIVED: 'Archivada',
}

type CoverageStatus = 'READY' | 'IN_PROGRESS' | 'MISSING'

interface ScopeCoverage {
  scope: Scope
  status: CoverageStatus
  baseCount: number
  readyBaseCount: number
  draftVersionCount: number
  laneCount: number
  quoteCount: number
}

function buildScopeCoverage(bases: CostBase[]): ScopeCoverage[] {
  return SCOPE_ORDER.map((scope) => {
    const scopedBases = bases.filter((base) => base.scope === scope && base.status !== 'ARCHIVED')
    const readyBases = scopedBases.filter((base) => base.status === 'ACTIVE' && base.versions.some((version) => (
      version.isActive && version.status === 'PUBLISHED' && version._count.params === 210
    )))
    return {
      scope,
      status: readyBases.length > 0 ? 'READY' : scopedBases.length > 0 ? 'IN_PROGRESS' : 'MISSING',
      baseCount: scopedBases.length,
      readyBaseCount: readyBases.length,
      draftVersionCount: scopedBases.flatMap((base) => base.versions).filter((version) => version.status === 'DRAFT').length,
      laneCount: scopedBases.reduce((sum, base) => sum + base._count.lanes, 0),
      quoteCount: scopedBases.reduce((sum, base) => sum + base._count.quotes, 0),
    }
  })
}

export function CostBasesBoard({ initial }: { initial: CostBase[] }) {
  const [bases, setBases] = useState(initial)
  const [showCreate, setShowCreate] = useState(initial.length === 0)
  const [createScope, setCreateScope] = useState<Scope>('CROSS_BORDER')
  const [versionAction, setVersionAction] = useState<{ kind: 'publish' | 'archive'; baseId: string; version: CostBaseVersion } | null>(null)
  const [impactTarget, setImpactTarget] = useState<{ base: CostBase; version: CostBaseVersion } | null>(null)
  const coverage = buildScopeCoverage(bases)
  const readyScopeCount = coverage.filter((item) => item.status === 'READY').length

  const create = useMutation({
    mutationFn: (body: { code: string; name: string; scope: Scope; defaultPolicy: string; isDefault: boolean }) =>
      fetcher<CostBase>('/api/v1/cost-bases', { method: 'POST', json: body }),
    onSuccess: (base) => {
      setBases((items) => [base, ...items.map((item) => base.isDefault && item.scope === base.scope ? { ...item, isDefault: false } : item)])
      setShowCreate(false)
      toast.success(`Base ${base.code} creada`, { description: 'La versión 1 contiene los 210 parámetros canónicos.' })
    },
  })

  const newVersion = useMutation({
    mutationFn: (id: string) => fetcher<CostBaseVersion>(`/api/v1/cost-bases/${id}/versions`, { method: 'POST', json: {} }),
    onSuccess: (version, id) => {
      setBases((items) => items.map((base) => base.id === id ? { ...base, versions: [version, ...base.versions] } : base))
      toast.success(`Versión ${version.version} creada`, { description: 'Permanecerá inactiva hasta que la actives.' })
    },
  })

  const activate = useMutation({
    mutationFn: ({ baseId, versionId }: { baseId: string; versionId: string }) =>
      fetcher<CostBase>(`/api/v1/cost-bases/${baseId}/versions/${versionId}/activate`, { method: 'POST', json: {} }),
    onSuccess: (base) => {
      setBases((items) => items.map((item) => item.id === base.id ? base : item))
      toast.success(`Versión activa de ${base.code} actualizada`)
    },
  })

  const transition = useMutation({
    mutationFn: ({ kind, baseId, versionId, note, impactAcknowledged }: { kind: 'publish' | 'archive'; baseId: string; versionId: string; note: string; impactAcknowledged?: boolean }) =>
      fetcher<CostBase>(`/api/v1/cost-bases/${baseId}/versions/${versionId}/${kind}`, { method: 'POST', json: { note, impactAcknowledged } }),
    onSuccess: (base) => {
      setBases((items) => items.map((item) => item.id === base.id ? base : item))
      setVersionAction(null)
      toast.success('Ciclo de vida de la versión actualizado')
    },
  })

  const impact = useMutation({
    mutationFn: ({ baseId, versionId }: { baseId: string; versionId: string }) =>
      fetcher<VersionImpact>(`/api/v1/cost-bases/${baseId}/versions/${versionId}/impact`),
    onError: () => setImpactTarget(null),
  })

  const openImpact = (base: CostBase, version: CostBaseVersion) => {
    setImpactTarget({ base, version })
    impact.mutate({ baseId: base.id, versionId: version.id })
  }

  const openCreate = (scope: Scope) => {
    setCreateScope(scope)
    setShowCreate(true)
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">Gobierno de costos</p>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><Layers3 className="size-5" /></span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Bases de costo</h1>
              <p className="text-sm text-muted-foreground">Separa economía, cobertura y versiones por tipo de operación.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground">{readyScopeCount} de {coverage.length} alcances listos</span>
          <Button size="sm" onClick={() => setShowCreate((value) => !value)}>{showCreate ? 'Cancelar' : <><Plus className="mr-1 size-4" /> Nueva base</>}</Button>
        </div>
      </div>

      <CoverageOverview coverage={coverage} onCreate={openCreate} />

      {showCreate && <CreateBaseForm key={createScope} initialScope={createScope} pending={create.isPending} onSubmit={(body) => create.mutate(body)} />}

      {bases.length === 0 && !showCreate && (
        <Card><CardHeader><CardTitle>No hay bases de costo</CardTitle><CardDescription>Crea la primera base y selecciona el alcance de rutas que atenderá.</CardDescription></CardHeader></Card>
      )}

      <div id="base-list" className="grid scroll-mt-24 gap-4 lg:grid-cols-2">
        {bases.map((base) => {
          const active = base.versions.find((version) => version.isActive)
          return (
            <Card key={base.id} className={base.status === 'ARCHIVED' ? 'opacity-70' : ''}>
              <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">{SCOPE_LABEL[base.scope]}</span>
                      <span className="rounded-full border px-2 py-0.5 text-muted-foreground">{BASE_STATUS_LABEL[base.status]}</span>
                      {base.isDefault && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-400">predeterminada</span>}
                    </div>
                    <CardTitle className="truncate">{base.name}</CardTitle>
                    <CardDescription>{base.code} · {base.currency} · {base.defaultPolicy === 'WORKBOOK_V3' ? 'Fidelidad de workbook' : 'Modelo operacional V3'}</CardDescription>
                  </div>
                  {base.status !== 'ARCHIVED' && <Button variant="outline" size="sm" onClick={() => newVersion.mutate(base.id)} disabled={newVersion.isPending}>Nueva versión</Button>}
                </div>
                {base.description && <p className="pt-1 text-sm text-muted-foreground">{base.description}</p>}
              </CardHeader>
              <CardContent className="grid gap-3 pt-4">
                <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/25 p-3 text-sm">
                  <Metric label="Versión activa" value={active ? `v${active.version}` : '—'} />
                  <Metric label="Rutas" value={String(base._count.lanes)} />
                  <Metric label="Cotizaciones" value={String(base._count.quotes)} />
                </div>
                <div className="flex justify-end">
                  <Link href={`/catalog?base=${base.id}`} className="text-xs font-medium text-primary underline underline-offset-2">Revisar cobertura de parámetros →</Link>
                </div>
                <div className="grid gap-1">
                  {base.versions.map((version) => (
                    <div key={version.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 font-medium">Versión {version.version} <VersionBadge status={version.status} /> {version.isActive && <span className="text-xs text-emerald-600">activa</span>}</div>
                        <div className="truncate text-xs text-muted-foreground">{version._count.params} parámetros · actualizada <RelativeTime iso={version.updatedAt} />{version.publishedBy ? ` · aprobada por ${version.publishedBy.email}` : ''}</div>
                        {(version.auditEvents?.length ?? 0) > 0 && <VersionHistory events={version.auditEvents ?? []} />}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => openImpact(base, version)} disabled={impact.isPending}>Impacto</Button>
                      <Link href={`/assumptions/${version.id}`} className="text-xs underline underline-offset-2">{version.status === 'DRAFT' ? 'Editar' : 'Ver'}</Link>
                      {version.status === 'DRAFT' && base.status !== 'ARCHIVED' && (
                        <Button variant="ghost" size="sm" disabled={transition.isPending} onClick={() => setVersionAction({ kind: 'publish', baseId: base.id, version })}>Publicar</Button>
                      )}
                      {!version.isActive && version.status === 'PUBLISHED' && base.status !== 'ARCHIVED' && (
                        <Button variant="ghost" size="sm" disabled={activate.isPending} onClick={() => activate.mutate({ baseId: base.id, versionId: version.id })}>Activar</Button>
                      )}
                      {!version.isActive && version.status === 'PUBLISHED' && base.status !== 'ARCHIVED' && (
                        <Button variant="ghost" size="sm" disabled={transition.isPending} onClick={() => setVersionAction({ kind: 'archive', baseId: base.id, version })}>Archivar</Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <Dialog open={versionAction !== null} onOpenChange={(open) => { if (!open) setVersionAction(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{versionAction?.kind === 'publish' ? 'Publicar versión' : 'Archivar versión'}</DialogTitle>
            <DialogDescription>
              {versionAction?.kind === 'publish'
                ? 'Al publicar se bloquean los 210 parámetros. Los cambios posteriores requieren una nueva versión en borrador.'
                : 'Las versiones archivadas permanecen visibles en el historial y no pueden volver a utilizarse.'}
            </DialogDescription>
          </DialogHeader>
          {versionAction && <VersionTransitionForm action={versionAction.kind} version={versionAction.version} pending={transition.isPending} onCancel={() => setVersionAction(null)} onSubmit={(note, impactAcknowledged) => transition.mutate({ kind: versionAction.kind, baseId: versionAction.baseId, versionId: versionAction.version.id, note, impactAcknowledged })} />}
        </DialogContent>
      </Dialog>
      <Dialog open={impactTarget !== null} onOpenChange={(open) => { if (!open) setImpactTarget(null) }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Impacto antes de activar</DialogTitle>
            <DialogDescription>
              Comparativo de la versión candidata contra la versión activa. Esta revisión no cambia rutas, cotizaciones ni precios.
            </DialogDescription>
          </DialogHeader>
          {impactTarget && (impact.isPending || impact.data?.candidate.id !== impactTarget.version.id) ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Calculando impacto…</p>
          ) : impact.data ? <VersionImpactPreview impact={impact.data} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

const COVERAGE_STYLE: Record<CoverageStatus, string> = {
  READY: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
  IN_PROGRESS: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400',
  MISSING: 'border-border bg-muted/25 text-muted-foreground',
}

const COVERAGE_LABEL: Record<CoverageStatus, string> = {
  READY: 'Listo',
  IN_PROGRESS: 'En preparación',
  MISSING: 'Sin cobertura',
}

function CoverageOverview({ coverage, onCreate }: { coverage: ScopeCoverage[]; onCreate: (scope: Scope) => void }) {
  const ready = coverage.filter((item) => item.status === 'READY').length
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/25 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Mapa de cobertura</CardTitle>
            <CardDescription>Cada alcance necesita una base activa y una versión publicada con los 210 parámetros canónicos.</CardDescription>
          </div>
          <div className="rounded-md bg-background px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ring-border">{ready} de {coverage.length} alcances listos</div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 xl:grid-cols-5">
        {coverage.map((item) => (
          <div key={item.scope} className="flex min-h-48 flex-col rounded-lg border bg-card p-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">{SCOPE_LABEL[item.scope]}</div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${COVERAGE_STYLE[item.status]}`}>{COVERAGE_LABEL[item.status]}</span>
            </div>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">
              {item.status === 'READY'
                ? `${item.readyBaseCount} base${item.readyBaseCount === 1 ? '' : 's'} gobernada${item.readyBaseCount === 1 ? '' : 's'} lista para cotizaciones y rutas futuras.`
                : item.status === 'IN_PROGRESS'
                  ? `${item.baseCount} base${item.baseCount === 1 ? '' : 's'} existente${item.baseCount === 1 ? '' : 's'}${item.draftVersionCount > 0 ? ` con ${item.draftVersionCount} versión${item.draftVersionCount === 1 ? '' : 'es'} en borrador` : ''}, pero ninguna tiene una versión publicada activa con 210 parámetros.`
                  : 'No hay una base gobernada. Las cotizaciones manuales pueden calcularse, pero quedan como Legacy y requieren revisión.'}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-2 text-center text-xs">
              <CoverageMetric label="Bases" value={item.baseCount} />
              <CoverageMetric label="Rutas" value={item.laneCount} />
              <CoverageMetric label="Cotizaciones" value={item.quoteCount} />
            </div>
            <div className="mt-3">
              {item.status === 'MISSING'
                ? <Button className="w-full" variant="outline" size="sm" onClick={() => onCreate(item.scope)}>Crear base {SCOPE_LABEL[item.scope]}</Button>
                : <Link href="#base-list" className="block text-center text-xs font-medium text-primary underline underline-offset-2">Revisar bases</Link>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function CoverageMetric({ label, value }: { label: string; value: number }) {
  return <div><div className="font-semibold tabular-nums">{value}</div><div className="text-[10px] text-muted-foreground">{label}</div></div>
}

function VersionBadge({ status }: { status: CostBaseVersion['status'] }) {
  const cls = status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : status === 'ARCHIVED' ? 'bg-muted text-muted-foreground' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>{VERSION_STATUS_LABEL[status]}</span>
}

function VersionHistory({ events }: { events: VersionAudit[] }) {
  return (
    <details className="mt-1 text-xs text-muted-foreground">
      <summary className="cursor-pointer hover:text-foreground">Historial ({events.length})</summary>
      <div className="mt-1 grid gap-1 border-l pl-2">
        {events.map((event) => <div key={event.id}><span className="font-medium text-foreground">{AUDIT_ACTION_LABEL[event.action]}</span> · <RelativeTime iso={event.createdAt} />{event.actor ? ` · ${event.actor.email}` : ''}{event.note ? ` · ${event.note}` : ''}</div>)}
      </div>
    </details>
  )
}

const displayNumber = (value: number | null) => value == null ? '—' : Number.isInteger(value) ? String(value) : String(+value.toFixed(6))

function VersionImpactPreview({ impact }: { impact: VersionImpact }) {
  const { comparison, records, activation } = impact
  const activeLabel = impact.active ? `v${impact.active.version}` : 'sin versión activa'
  return (
    <div className="grid gap-4 text-sm">
      <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/25 p-3">
        <Metric label="Versión candidata" value={`v${impact.candidate.version}`} />
        <Metric label="Referencia activa" value={activeLabel} />
        <Metric label="Parámetros modificados" value={comparison.referenceAvailable ? String(comparison.changedParameterCount) : 'Sin referencia'} />
        <Metric label="Puede activarse" value={activation.canActivate ? (activation.isAlreadyActive ? 'Ya está activa' : 'Sí, con decisión humana') : 'No, primero publicar'} />
      </div>
      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
        Las rutas de producción y las cotizaciones guardadas conservan su versión y snapshot. Activar esta versión no las recalcula ni las reasigna.
        {activation.requiresHumanRouteReview && ' Hay rutas de producción que requieren revisión humana para sustituirse por una nueva ruta gobernada.'}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric label={`Rutas congeladas en ${activeLabel}`} value={String(records.productionRoutes.frozenOnActive)} />
        <Metric label="Rutas ya en candidata" value={String(records.productionRoutes.alreadyOnCandidate)} />
        <Metric label={`Cotizaciones guardadas en ${activeLabel}`} value={String(records.quotes.savedOnActive)} />
        <Metric label="Cotizaciones ya en candidata" value={String(records.quotes.savedOnCandidate)} />
      </div>
      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Cambios de parámetros</div>
        {!comparison.referenceAvailable ? <p className="text-sm text-muted-foreground">No existe una versión activa contra la cual comparar todavía.</p>
          : comparison.changes.length === 0 ? <p className="text-sm text-muted-foreground">No hay diferencias en los parámetros.</p>
            : <div className="max-h-64 overflow-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 border-b bg-background text-muted-foreground"><tr><th className="px-3 py-2 text-left font-medium">Parámetro</th><th className="px-3 py-2 text-right font-medium">Activa</th><th className="px-3 py-2 text-right font-medium">Candidata</th><th className="px-3 py-2 text-right font-medium">Δ</th></tr></thead>
                <tbody>{comparison.changes.map((change) => <tr key={`${change.section}:${change.field}`} className="border-b last:border-0"><td className="px-3 py-2"><div>{change.field}</div><div className="text-muted-foreground">{change.section}{change.unit ? ` · ${change.unit}` : ''}</div></td><td className="px-3 py-2 text-right tabular-nums">{displayNumber(change.fromValue)}</td><td className="px-3 py-2 text-right font-medium tabular-nums">{displayNumber(change.toValue)}</td><td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{change.delta == null ? '—' : `${change.delta > 0 ? '+' : ''}${displayNumber(change.delta)}`}</td></tr>)}</tbody>
              </table>
            </div>}
      </div>
    </div>
  )
}

function VersionTransitionForm({ action, version, pending, onCancel, onSubmit }: { action: 'publish' | 'archive'; version: CostBaseVersion; pending: boolean; onCancel: () => void; onSubmit: (note: string, impactAcknowledged?: boolean) => void }) {
  const [note, setNote] = useState('')
  const [impactAcknowledged, setImpactAcknowledged] = useState(false)
  const requiresImpactAcknowledgement = action === 'publish' && Boolean(version.scenarioReviewSource)
  return (
    <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); onSubmit(note.trim(), impactAcknowledged) }}>
      <div className="grid gap-1.5"><Label htmlFor="approval-note">Nota de aprobación</Label><textarea id="approval-note" required minLength={3} value={note} onChange={(event) => setNote(event.target.value)} className={`${selectCls} h-24 py-2`} placeholder={action === 'publish' ? `Motivo para aprobar la versión ${version.version}` : `Motivo para archivar la versión ${version.version}`} /></div>
      <DialogFooter><Button variant="outline" type="button" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={pending || note.trim().length < 3}>{pending ? 'Guardando…' : action === 'publish' ? 'Publicar y bloquear' : 'Archivar versión'}</Button></DialogFooter>
      {requiresImpactAcknowledgement && <label htmlFor="impact-acknowledged" className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm"><input id="impact-acknowledged" className="mt-1 accent-primary" type="checkbox" required checked={impactAcknowledged} onChange={(event) => setImpactAcknowledged(event.target.checked)} /><span>Confirmo que revisé el impacto. El sistema recalculará y dejará en auditoría los parámetros modificados, rutas y cotizaciones que permanecen congeladas.</span></label>}
    </form>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-semibold">{value}</div></div>
}

function CreateBaseForm({ initialScope, pending, onSubmit }: {
  initialScope: Scope
  pending: boolean
  onSubmit: (body: { code: string; name: string; scope: Scope; defaultPolicy: string; isDefault: boolean }) => void
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [scope, setScope] = useState<Scope>(initialScope)
  const [policy, setPolicy] = useState('OPERATIONAL_V3')
  const [isDefault, setIsDefault] = useState(true)
  return (
    <Card className="border-primary/30">
      <CardHeader><CardTitle>Nueva base de costo</CardTitle><CardDescription>Crea la versión 1 con los 210 parámetros canónicos.</CardDescription></CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-5" onSubmit={(event) => { event.preventDefault(); onSubmit({ code, name, scope, defaultPolicy: policy, isDefault }) }}>
          <div className="grid gap-1.5"><Label htmlFor="cost-base-code">Código</Label><Input id="cost-base-code" required minLength={2} value={code} onChange={(e) => setCode(e.target.value)} placeholder="XB-2026" /></div>
          <div className="grid gap-1.5 lg:col-span-2"><Label htmlFor="cost-base-name">Nombre</Label><Input id="cost-base-name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Cruce fronterizo 2026" /></div>
          <div className="grid gap-1.5"><Label htmlFor="cost-base-scope">Alcance</Label><select id="cost-base-scope" className={selectCls} value={scope} onChange={(e) => setScope(e.target.value as Scope)}>{Object.entries(SCOPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div className="grid gap-1.5"><Label htmlFor="cost-base-model">Modelo</Label><select id="cost-base-model" className={selectCls} value={policy} onChange={(e) => setPolicy(e.target.value)}><option value="OPERATIONAL_V3">Operacional V3</option><option value="WORKBOOK_V3">Workbook exacto</option></select></div>
          <label htmlFor="cost-base-default" className="flex items-center gap-2 text-sm md:col-span-2"><input id="cost-base-default" type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="accent-primary" />Predeterminada para este alcance</label>
          <div className="flex justify-end md:col-span-2 lg:col-span-3"><Button type="submit" disabled={pending || !code.trim() || !name.trim()}>{pending ? 'Creando…' : 'Crear base'}</Button></div>
        </form>
      </CardContent>
    </Card>
  )
}
