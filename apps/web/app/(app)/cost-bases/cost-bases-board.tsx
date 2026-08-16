'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Layers3, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RelativeTime } from '@/components/relative-time'
import { fetcher } from '@/lib/fetcher'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CostBaseWizard, type CostBaseCreateBody, type CostBaseScope } from './cost-base-wizard'
import type { CostBaseProfile } from './cost-base-profile'

type Scope = CostBaseScope
type Status = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'

export interface CostBaseVersion {
  id: string
  name: string
  version: number
  isActive: boolean
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  notes: string | null
  sourceVersionId: string | null
  applicabilityContext: CostBaseProfile | null
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
  action: 'DRAFT_CREATED' | 'PROFILE_UPDATED' | 'PUBLISHED' | 'ARCHIVED'
  note: string | null
  createdAt: string
  actor?: { email: string } | null
}

interface BaseAudit {
  id: string
  action: 'CREATED' | 'METADATA_UPDATED' | 'VERSION_ACTIVATED' | 'DEFAULT_REPLACED' | 'ARCHIVED'
  fromStatus: Status | null
  toStatus: Status | null
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
    applicabilityProfileChanged: boolean
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
  auditEvents?: BaseAudit[]
  _count: { lanes: number; quotes: number }
}

type CostBaseMetadataUpdate = {
  name?: string
  description?: string | null
  currency?: string
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
  DRAFT_CREATED: 'Borrador creado', PROFILE_UPDATED: 'Perfil operativo actualizado', PUBLISHED: 'Publicada', ARCHIVED: 'Archivada',
}

const BASE_AUDIT_ACTION_LABEL: Record<BaseAudit['action'], string> = {
  CREATED: 'Base creada',
  METADATA_UPDATED: 'Datos actualizados',
  VERSION_ACTIVATED: 'Versión activada',
  DEFAULT_REPLACED: 'Predeterminada sustituida',
  ARCHIVED: 'Base archivada',
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
      version.isActive
      && version.status === 'PUBLISHED'
      && version._count.params === 210
      && version.applicabilityContext != null
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

export function CostBasesBoard({ initial, canEdit }: { initial: CostBase[]; canEdit: boolean }) {
  const [bases, setBases] = useState(initial)
  const [selectedBaseId, setSelectedBaseId] = useState(() => (
    initial.find((base) => base.isDefault && base.status === 'ACTIVE')?.id ??
    initial.find((base) => base.status === 'ACTIVE')?.id ??
    initial[0]?.id ??
    ''
  ))
  const [showCreate, setShowCreate] = useState(canEdit && initial.length === 0)
  const [createScope, setCreateScope] = useState<Scope>('CROSS_BORDER')
  const [versionAction, setVersionAction] = useState<{ kind: 'publish' | 'archive'; baseId: string; version: CostBaseVersion } | null>(null)
  const [impactTarget, setImpactTarget] = useState<{ base: CostBase; version: CostBaseVersion } | null>(null)
  const [baseEditTarget, setBaseEditTarget] = useState<CostBase | null>(null)
  const [baseArchiveTarget, setBaseArchiveTarget] = useState<CostBase | null>(null)
  const coverage = buildScopeCoverage(bases)
  const readyScopeCount = coverage.filter((item) => item.status === 'READY').length
  const selectedBase = bases.find((base) => base.id === selectedBaseId) ?? bases[0] ?? null

  const create = useMutation({
    mutationFn: (body: CostBaseCreateBody) =>
      fetcher<CostBase>('/api/v1/cost-bases', { method: 'POST', json: body }),
    onSuccess: (base) => {
      // A new base is still a draft. Its default preference becomes effective
      // only when a published version is activated, so keep the live default visible.
      setBases((items) => [base, ...items])
      setSelectedBaseId(base.id)
      setShowCreate(false)
      toast.success(`Base ${base.code} creada`, { description: 'La versión 1 conserva el snapshot canónico y separa los parámetros no aplicables.' })
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
      setBases((items) => items.map((item) => {
        if (item.id === base.id) return base
        if (base.isDefault && base.status === 'ACTIVE' && item.scope === base.scope) return { ...item, isDefault: false }
        return item
      }))
      // The same transaction can replace another default base and append its
      // audit event. Refresh the collection so that both timelines are visible
      // without requiring a page reload.
      void fetcher<CostBase[]>('/api/v1/cost-bases').then(setBases).catch(() => undefined)
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

  const archiveBase = useMutation({
    mutationFn: (baseId: string) => fetcher<CostBase>(`/api/v1/cost-bases/${baseId}/archive`, { method: 'POST', json: {} }),
    onSuccess: (base) => {
      setBases((items) => items.map((item) => item.id === base.id ? base : item))
      setBaseArchiveTarget(null)
      toast.success(`Base ${base.code} archivada`, { description: 'Permanece visible como historial y ya no puede gobernar trabajo nuevo.' })
    },
  })

  const updateBase = useMutation({
    mutationFn: ({ baseId, body }: { baseId: string; body: CostBaseMetadataUpdate }) =>
      fetcher<CostBase>(`/api/v1/cost-bases/${baseId}`, { method: 'PATCH', json: body }),
    onSuccess: (base) => {
      setBases((items) => items.map((item) => item.id === base.id ? base : item))
      setBaseEditTarget(null)
      toast.success(`Datos de ${base.code} actualizados`, { description: 'El cambio quedó registrado en la bitácora de la base.' })
    },
  })

  const openImpact = (base: CostBase, version: CostBaseVersion) => {
    setImpactTarget({ base, version })
    impact.mutate({ baseId: base.id, versionId: version.id })
  }

  const openCreate = (scope: Scope) => {
    if (!canEdit) return
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
          {canEdit
            ? <Button size="sm" onClick={() => setShowCreate((value) => !value)}>{showCreate ? 'Cancelar' : <><Plus className="mr-1 size-4" /> Nueva base</>}</Button>
            : <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">Modo consulta</span>}
        </div>
      </div>

      <CoverageOverview coverage={coverage} onCreate={openCreate} canEdit={canEdit} />

      {showCreate && <CostBaseWizard key={createScope} initialScope={createScope} existingCodes={bases.map((base) => base.code)} pending={create.isPending} onSubmit={(body) => create.mutate(body)} />}

      {bases.length === 0 && !showCreate && (
        <Card><CardHeader><CardTitle>No hay bases de costo</CardTitle><CardDescription>{canEdit ? 'Crea la primera base y selecciona el alcance de rutas que atenderá.' : 'No hay bases disponibles para consulta. Un administrador debe crear la primera.'}</CardDescription></CardHeader></Card>
      )}

      {selectedBase && (
        <CostBaseWorkspace
          bases={bases}
          base={selectedBase}
          selectedBaseId={selectedBase.id}
          onSelect={setSelectedBaseId}
          onNewVersion={(baseId) => newVersion.mutate(baseId)}
          onOpenImpact={openImpact}
          onVersionAction={(kind, baseId, version) => setVersionAction({ kind, baseId, version })}
          onActivate={(baseId, versionId) => activate.mutate({ baseId, versionId })}
          onEditBase={setBaseEditTarget}
          onArchiveBase={setBaseArchiveTarget}
          canEdit={canEdit}
          pending={{
            newVersion: newVersion.isPending,
            impact: impact.isPending,
            transition: transition.isPending,
            activate: activate.isPending,
            updateBase: updateBase.isPending,
            archiveBase: archiveBase.isPending,
          }}
        />
      )}
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
      <Dialog open={baseEditTarget !== null} onOpenChange={(open) => { if (!open && !updateBase.isPending) setBaseEditTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar datos de la base</DialogTitle>
            <DialogDescription>Corrige la identificación administrativa sin alterar el alcance, la política ni las versiones de supuestos.</DialogDescription>
          </DialogHeader>
          {baseEditTarget ? (
            <BaseMetadataForm
              key={`${baseEditTarget.id}:${baseEditTarget.updatedAt}`}
              base={baseEditTarget}
              pending={updateBase.isPending}
              onCancel={() => setBaseEditTarget(null)}
              onSubmit={(body) => updateBase.mutate({ baseId: baseEditTarget.id, body })}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={baseArchiveTarget !== null} onOpenChange={(open) => { if (!open && !archiveBase.isPending) setBaseArchiveTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archivar base de costo</DialogTitle>
            <DialogDescription>La base dejará de gobernar trabajo nuevo y sus versiones activas perderán vigencia. Las cotizaciones históricas conservarán su snapshot. No se permite si todavía gobierna rutas en producción.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={archiveBase.isPending} onClick={() => setBaseArchiveTarget(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={archiveBase.isPending || !baseArchiveTarget} onClick={() => { if (baseArchiveTarget) archiveBase.mutate(baseArchiveTarget.id) }}>{archiveBase.isPending ? 'Archivando…' : 'Archivar base'}</Button>
          </DialogFooter>
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

function CoverageOverview({ coverage, onCreate, canEdit }: { coverage: ScopeCoverage[]; onCreate: (scope: Scope) => void; canEdit: boolean }) {
  const ready = coverage.filter((item) => item.status === 'READY').length
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/25 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Mapa de cobertura</CardTitle>
            <CardDescription>Cada alcance necesita una base activa, perfil operativo explícito y una versión publicada con los 210 parámetros canónicos.</CardDescription>
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
                  ? `${item.baseCount} base${item.baseCount === 1 ? '' : 's'} existente${item.baseCount === 1 ? '' : 's'}${item.draftVersionCount > 0 ? ` con ${item.draftVersionCount} versión${item.draftVersionCount === 1 ? '' : 'es'} en borrador` : ''}, pero ninguna tiene perfil explícito y versión publicada activa con 210 parámetros.`
                  : 'No hay una base gobernada. Las cotizaciones manuales pueden calcularse, pero quedan como Legacy y requieren revisión.'}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-2 text-center text-xs">
              <CoverageMetric label="Bases" value={item.baseCount} />
              <CoverageMetric label="Rutas" value={item.laneCount} />
              <CoverageMetric label="Cotizaciones" value={item.quoteCount} />
            </div>
            <div className="mt-3">
              {item.status === 'MISSING' && canEdit
                ? <Button className="w-full" variant="outline" size="sm" onClick={() => onCreate(item.scope)}>Crear base {SCOPE_LABEL[item.scope]}</Button>
                : item.baseCount > 0
                  ? <Link href="#base-list" className="block text-center text-xs font-medium text-primary underline underline-offset-2">Revisar bases</Link>
                  : <span className="block text-center text-xs text-muted-foreground">Sin base disponible</span>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function CostBaseWorkspace({
  bases,
  base,
  selectedBaseId,
  onSelect,
  onNewVersion,
  onOpenImpact,
  onVersionAction,
  onActivate,
  onEditBase,
  onArchiveBase,
  canEdit,
  pending,
}: {
  bases: CostBase[]
  base: CostBase
  selectedBaseId: string
  onSelect: (baseId: string) => void
  onNewVersion: (baseId: string) => void
  onOpenImpact: (base: CostBase, version: CostBaseVersion) => void
  onVersionAction: (kind: 'publish' | 'archive', baseId: string, version: CostBaseVersion) => void
  onActivate: (baseId: string, versionId: string) => void
  onEditBase: (base: CostBase) => void
  onArchiveBase: (base: CostBase) => void
  canEdit: boolean
  pending: { newVersion: boolean; impact: boolean; transition: boolean; activate: boolean; updateBase: boolean; archiveBase: boolean }
}) {
  const active = base.versions.find((version) => version.isActive) ?? null
  const nextDraft = base.versions.find((version) => version.status === 'DRAFT') ?? null

  return (
    <section
      id="base-list"
      aria-label="Administración de bases de costo"
      className="grid scroll-mt-16 gap-2 lg:grid-cols-[13rem_minmax(0,1fr)]"
    >
      <Card className="self-start lg:sticky lg:top-16">
        <CardHeader className="border-b bg-muted/25">
          <CardTitle>Bases</CardTitle>
          <CardDescription>Selecciona una base para revisar versiones y gobierno.</CardDescription>
        </CardHeader>
        <CardContent className="grid p-0">
          {bases.map((item) => {
            const itemActive = item.versions.find((version) => version.isActive)
            const selected = item.id === selectedBaseId
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(item.id)}
                className={[
                  'relative grid gap-0.5 border-b px-3 py-2.5 text-left text-xs transition-colors last:border-b-0',
                  selected
                    ? 'bg-accent text-accent-foreground shadow-[inset_3px_0_0_var(--primary)]'
                    : 'hover:bg-muted/70',
                  item.status === 'ARCHIVED' ? 'opacity-65' : '',
                ].join(' ')}
              >
                <span className="flex items-center justify-between gap-2">
                  <strong className="truncate font-medium">{item.name}</strong>
                  {item.isDefault ? (
                    <span
                      className={`size-1.5 rounded-full ${item.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      title={item.status === 'ACTIVE' ? 'Predeterminada vigente' : 'Será predeterminada al activarse'}
                    />
                  ) : null}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {SCOPE_LABEL[item.scope]} · {itemActive ? `v${itemActive.version}` : 'sin versión activa'} · {item._count.lanes} rutas
                </span>
              </button>
            )
          })}
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-2">
        <Card className={base.status === 'ARCHIVED' ? 'opacity-75' : ''}>
          <CardHeader className="border-b bg-muted/20">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">{SCOPE_LABEL[base.scope]}</span>
                  <span className="rounded-full border px-2 py-0.5 text-muted-foreground">{BASE_STATUS_LABEL[base.status]}</span>
                  {base.isDefault ? (
                    <span className={base.status === 'ACTIVE'
                      ? 'rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-400'
                      : 'rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-400'}>
                      {base.status === 'ACTIVE' ? 'predeterminada vigente' : 'predeterminada al activar'}
                    </span>
                  ) : null}
                </div>
                <CardTitle className="truncate text-base">{base.name}</CardTitle>
                <CardDescription>{base.code} · {base.currency} · {base.defaultPolicy === 'WORKBOOK_V3' ? 'Fidelidad de workbook' : 'Modelo operacional V3'}</CardDescription>
              </div>
              {canEdit && base.status !== 'ARCHIVED' ? (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEditBase(base)} disabled={pending.updateBase}>
                    <Pencil className="mr-1 size-3.5" /> Editar datos
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onNewVersion(base.id)} disabled={pending.newVersion}>Nueva versión</Button>
                  <Button variant="outline" size="sm" onClick={() => onArchiveBase(base)} disabled={pending.archiveBase}>Archivar base</Button>
                </div>
              ) : null}
            </div>
            {base.description ? <p className="pt-1 text-xs text-muted-foreground">{base.description}</p> : null}
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 pt-3 sm:grid-cols-4">
            <Metric label="Versión vigente" value={active ? `v${active.version}` : '—'} />
            <Metric label="Siguiente versión" value={nextDraft ? `v${nextDraft.version}` : '—'} />
            <Metric label="Rutas vinculadas" value={String(base._count.lanes)} />
            <Metric label="Cotizaciones" value={String(base._count.quotes)} />
          </CardContent>
        </Card>

        <div className="grid min-w-0 gap-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(15rem,0.8fr)]">
          <Card>
            <CardHeader className="border-b bg-muted/20">
              <CardTitle>Versiones de {base.name}</CardTitle>
              <CardDescription>Cada versión conserva sus parámetros, aprobación y vigencia.</CardDescription>
            </CardHeader>
            <CardContent className="grid p-0">
              {base.versions.length === 0 ? (
                <p className="px-3 py-8 text-center text-xs text-muted-foreground">Esta base todavía no tiene versiones.</p>
              ) : base.versions.map((version) => (
                <div key={version.id} className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5 text-xs last:border-b-0">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted font-medium tabular-nums">v{version.version}</span>
                  <div className="min-w-44 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 font-medium">
                      {version.name} <VersionBadge status={version.status} />
                      {version.isActive ? <span className="text-[10px] text-emerald-600">vigente</span> : null}
                      {version.applicabilityContext == null
                        ? <span className="text-[10px] font-medium text-amber-600">perfil legado</span>
                        : <span className="text-[10px] text-muted-foreground">perfil explícito</span>}
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {version._count.params} parámetros · actualizada <RelativeTime iso={version.updatedAt} />
                      {version.publishedBy ? ` · aprobada por ${version.publishedBy.email}` : ''}
                    </div>
                    {version.applicabilityContext ? <ProfileSummary profile={version.applicabilityContext} /> : null}
                    {(version.auditEvents?.length ?? 0) > 0 ? <VersionHistory events={version.auditEvents ?? []} /> : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <Button variant="ghost" size="xs" onClick={() => onOpenImpact(base, version)} disabled={pending.impact}>Impacto</Button>
                    <Button variant="ghost" size="xs" render={<Link href={`/assumptions/${version.id}`} />}>{canEdit && version.status === 'DRAFT' ? 'Editar' : 'Ver'}</Button>
                    {canEdit && version.status === 'DRAFT' && base.status !== 'ARCHIVED' ? (
                      <Button variant="ghost" size="xs" disabled={pending.transition} onClick={() => onVersionAction('publish', base.id, version)}>Publicar</Button>
                    ) : null}
                    {canEdit && (!version.isActive || base.status !== 'ACTIVE') && version.status === 'PUBLISHED' && base.status !== 'ARCHIVED' ? (
                      <Button variant="ghost" size="xs" disabled={pending.activate} onClick={() => onActivate(base.id, version.id)}>Activar</Button>
                    ) : null}
                    {canEdit && !version.isActive && version.status === 'PUBLISHED' && base.status !== 'ARCHIVED' ? (
                      <Button variant="ghost" size="xs" disabled={pending.transition} onClick={() => onVersionAction('archive', base.id, version)}>Archivar</Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="self-start">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle>Gobierno de la base</CardTitle>
              <CardDescription>Reglas que delimitan dónde puede utilizarse.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-0 pt-1 text-xs">
              <GovernanceLine label="Ámbito" value={SCOPE_LABEL[base.scope]} />
              <GovernanceLine label="Moneda" value={base.currency} />
              <GovernanceLine label="Modelo" value={base.defaultPolicy === 'WORKBOOK_V3' ? 'Workbook exacto' : 'Operacional V3'} />
              <GovernanceLine label="Versión de supuestos" value={active ? `v${active.version}` : 'Sin versión vigente'} />
              <GovernanceLine label="Perfil operativo" value={active?.applicabilityContext ? 'Explícito y versionado' : active ? 'Legado · sólo histórico' : 'Sin versión vigente'} />
              <GovernanceLine label="Rutas vinculadas" value={String(base._count.lanes)} />
              <GovernanceLine label="Estado" value={BASE_STATUS_LABEL[base.status]} />
              <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                <Button variant="outline" size="sm" render={<Link href={`/catalog?base=${base.id}`} />}>Cobertura</Button>
                {active ? <Button variant="outline" size="sm" render={<Link href={`/assumptions/${active.id}`} />}>Supuestos</Button> : null}
              </div>
              {(base.auditEvents?.length ?? 0) > 0 ? <BaseHistory events={base.auditEvents ?? []} /> : (
                <p className="mt-3 border-t pt-3 text-muted-foreground">La bitácora inicia con el siguiente cambio gobernado.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

function BaseMetadataForm({ base, pending, onCancel, onSubmit }: {
  base: CostBase
  pending: boolean
  onCancel: () => void
  onSubmit: (body: CostBaseMetadataUpdate) => void
}) {
  const [name, setName] = useState(base.name)
  const [description, setDescription] = useState(base.description ?? '')
  const [currency, setCurrency] = useState(base.currency)
  const normalizedName = name.trim()
  const normalizedDescription = description.trim() || null
  const normalizedCurrency = currency.trim().toUpperCase()
  const currencyEditable = base.status === 'DRAFT' && !base.versions.some((version) => version.status === 'PUBLISHED')
  const body: CostBaseMetadataUpdate = {}
  if (normalizedName !== base.name) body.name = normalizedName
  if (normalizedDescription !== base.description) body.description = normalizedDescription
  if (currencyEditable && normalizedCurrency !== base.currency) body.currency = normalizedCurrency
  const currencyValid = /^[A-Z]{3}$/.test(normalizedCurrency)
  const canSubmit = !pending
    && normalizedName.length >= 2
    && description.length <= 500
    && currencyValid
    && Object.keys(body).length > 0

  return (
    <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); if (canSubmit) onSubmit(body) }}>
      <div className="grid gap-1.5">
        <Label htmlFor="edit-cost-base-name">Nombre</Label>
        <Input id="edit-cost-base-name" value={name} minLength={2} maxLength={120} required onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="edit-cost-base-description">Descripción</Label>
        <textarea
          id="edit-cost-base-description"
          className="min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={description}
          maxLength={500}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Propósito y límites administrativos de esta base"
        />
        <div className="text-right text-[10px] text-muted-foreground">{description.length}/500</div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="edit-cost-base-currency">Moneda de gobierno</Label>
        <Input
          id="edit-cost-base-currency"
          value={currency}
          minLength={3}
          maxLength={3}
          disabled={!currencyEditable}
          aria-describedby="edit-cost-base-currency-help"
          onChange={(event) => setCurrency(event.target.value.toUpperCase())}
        />
        <p id="edit-cost-base-currency-help" className="text-xs text-muted-foreground">
          {currencyEditable
            ? 'Usa el código ISO de tres letras. La moneda quedará congelada al publicar la primera versión.'
            : 'La moneda está congelada porque ya existe una versión publicada o la base salió de borrador. Para cambiarla, crea otra base gobernada.'}
        </p>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={!canSubmit}>{pending ? 'Guardando…' : 'Guardar cambios'}</Button>
      </DialogFooter>
    </form>
  )
}

function ProfileSummary({ profile }: { profile: CostBaseProfile }) {
  const chips = [
    `País: ${profile.countries.join(' + ')}`,
    `Operación: ${profile.operations.join(', ')}`,
    `Equipo: ${profile.trailerTypes.join(', ')}`,
    `Servicio: ${profile.services.join(', ')}`,
    `Operador: ${profile.driverTypes.join(', ')}`,
    `Factores: ${profile.factorScheduleVersion}`,
  ]
  return (
    <div className="mt-1 flex flex-wrap gap-1" aria-label="Resumen del perfil operativo versionado">
      {chips.map((chip) => <span key={chip} className="max-w-full truncate rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground" title={chip}>{chip}</span>)}
    </div>
  )
}

function GovernanceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
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

function BaseHistory({ events }: { events: BaseAudit[] }) {
  return (
    <details className="mt-3 border-t pt-3 text-xs text-muted-foreground">
      <summary className="cursor-pointer font-medium hover:text-foreground">Bitácora de la base ({events.length})</summary>
      <ol className="mt-2 grid gap-2 border-l pl-3">
        {events.map((event) => (
          <li key={event.id}>
            <div className="font-medium text-foreground">{BASE_AUDIT_ACTION_LABEL[event.action]}</div>
            <div>
              <RelativeTime iso={event.createdAt} />
              {event.actor ? ` · ${event.actor.email}` : ''}
              {event.fromStatus && event.toStatus && event.fromStatus !== event.toStatus
                ? ` · ${BASE_STATUS_LABEL[event.fromStatus]} → ${BASE_STATUS_LABEL[event.toStatus]}`
                : ''}
            </div>
            {event.note ? <p className="mt-0.5 leading-relaxed">{event.note}</p> : null}
          </li>
        ))}
      </ol>
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
        <Metric label="Perfil operativo" value={!comparison.referenceAvailable ? 'Sin referencia' : comparison.applicabilityProfileChanged ? 'Modificado' : 'Sin cambios'} />
        <Metric label="Puede activarse" value={activation.canActivate ? (activation.isAlreadyActive ? 'Ya está activa' : 'Sí, con decisión humana') : 'No, primero publicar'} />
      </div>
      {comparison.referenceAvailable && comparison.applicabilityProfileChanged ? (
        <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-muted-foreground">
          La candidata cambia cobertura de operación, equipo o servicios. Las rutas existentes no se reasignan; las nuevas cotizaciones deberán cumplir el perfil nuevo.
        </div>
      ) : null}
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
