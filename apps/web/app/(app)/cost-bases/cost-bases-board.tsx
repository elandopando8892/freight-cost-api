'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
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
  CROSS_BORDER: 'Cross-border', DRAYAGE: 'Drayage', LOCAL: 'Local', INTRA_MEX: 'Intra-MEX', INTRA_US: 'Intra-US',
}
const SCOPE_ORDER: Scope[] = ['CROSS_BORDER', 'DRAYAGE', 'LOCAL', 'INTRA_MEX', 'INTRA_US']
const selectCls = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm'

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

  const create = useMutation({
    mutationFn: (body: { code: string; name: string; scope: Scope; defaultPolicy: string; isDefault: boolean }) =>
      fetcher<CostBase>('/api/v1/cost-bases', { method: 'POST', json: body }),
    onSuccess: (base) => {
      setBases((items) => [base, ...items.map((item) => base.isDefault && item.scope === base.scope ? { ...item, isDefault: false } : item)])
      setShowCreate(false)
      toast.success(`Base ${base.code} created`, { description: 'Version 1 contains the 210 canonical parameters.' })
    },
  })

  const newVersion = useMutation({
    mutationFn: (id: string) => fetcher<CostBaseVersion>(`/api/v1/cost-bases/${id}/versions`, { method: 'POST', json: {} }),
    onSuccess: (version, id) => {
      setBases((items) => items.map((base) => base.id === id ? { ...base, versions: [version, ...base.versions] } : base))
      toast.success(`Version ${version.version} created`, { description: 'It remains inactive until you activate it.' })
    },
  })

  const activate = useMutation({
    mutationFn: ({ baseId, versionId }: { baseId: string; versionId: string }) =>
      fetcher<CostBase>(`/api/v1/cost-bases/${baseId}/versions/${versionId}/activate`, { method: 'POST', json: {} }),
    onSuccess: (base) => {
      setBases((items) => items.map((item) => item.id === base.id ? base : item))
      toast.success(`${base.code} active version updated`)
    },
  })

  const transition = useMutation({
    mutationFn: ({ kind, baseId, versionId, note, impactAcknowledged }: { kind: 'publish' | 'archive'; baseId: string; versionId: string; note: string; impactAcknowledged?: boolean }) =>
      fetcher<CostBase>(`/api/v1/cost-bases/${baseId}/versions/${versionId}/${kind}`, { method: 'POST', json: { note, impactAcknowledged } }),
    onSuccess: (base) => {
      setBases((items) => items.map((item) => item.id === base.id ? base : item))
      setVersionAction(null)
      toast.success('Version lifecycle updated')
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cost bases</h1>
          <p className="text-sm text-muted-foreground">Separate operating economics and versions by route scope.</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate((value) => !value)}>{showCreate ? 'Cancel' : 'New base'}</Button>
      </div>

      <CoverageOverview coverage={coverage} onCreate={openCreate} />

      {showCreate && <CreateBaseForm key={createScope} initialScope={createScope} pending={create.isPending} onSubmit={(body) => create.mutate(body)} />}

      {bases.length === 0 && !showCreate && (
        <Card><CardHeader><CardTitle>No cost bases</CardTitle><CardDescription>Create the first base and choose which route scope it serves.</CardDescription></CardHeader></Card>
      )}

      <div id="base-list" className="grid scroll-mt-24 gap-4 lg:grid-cols-2">
        {bases.map((base) => {
          const active = base.versions.find((version) => version.isActive)
          return (
            <Card key={base.id} className={base.status === 'ARCHIVED' ? 'opacity-70' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">{SCOPE_LABEL[base.scope]}</span>
                      <span className="rounded-full border px-2 py-0.5 text-muted-foreground">{base.status.toLowerCase()}</span>
                      {base.isDefault && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-400">default</span>}
                    </div>
                    <CardTitle className="truncate">{base.name}</CardTitle>
                    <CardDescription>{base.code} · {base.currency} · {base.defaultPolicy === 'WORKBOOK_V3' ? 'Workbook exact' : 'Operational V3'}</CardDescription>
                  </div>
                  {base.status !== 'ARCHIVED' && <Button variant="outline" size="sm" onClick={() => newVersion.mutate(base.id)} disabled={newVersion.isPending}>New version</Button>}
                </div>
                {base.description && <p className="pt-1 text-sm text-muted-foreground">{base.description}</p>}
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/25 p-3 text-sm">
                  <Metric label="Active version" value={active ? `v${active.version}` : '—'} />
                  <Metric label="Routes" value={String(base._count.lanes)} />
                  <Metric label="Quotes" value={String(base._count.quotes)} />
                </div>
                <div className="flex justify-end">
                  <Link href={`/catalog?base=${base.id}`} className="text-xs font-medium underline underline-offset-2">Review parameter coverage →</Link>
                </div>
                <div className="grid gap-1">
                  {base.versions.map((version) => (
                    <div key={version.id} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 font-medium">Version {version.version} <VersionBadge status={version.status} /> {version.isActive && <span className="text-xs text-emerald-600">active</span>}</div>
                        <div className="truncate text-xs text-muted-foreground">{version._count.params} parameters · updated <RelativeTime iso={version.updatedAt} />{version.publishedBy ? ` · approved by ${version.publishedBy.email}` : ''}</div>
                        {(version.auditEvents?.length ?? 0) > 0 && <VersionHistory events={version.auditEvents ?? []} />}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => openImpact(base, version)} disabled={impact.isPending}>Impact</Button>
                      <Link href={`/assumptions/${version.id}`} className="text-xs underline underline-offset-2">{version.status === 'DRAFT' ? 'Edit' : 'View'}</Link>
                      {version.status === 'DRAFT' && base.status !== 'ARCHIVED' && (
                        <Button variant="ghost" size="sm" disabled={transition.isPending} onClick={() => setVersionAction({ kind: 'publish', baseId: base.id, version })}>Publish</Button>
                      )}
                      {!version.isActive && version.status === 'PUBLISHED' && base.status !== 'ARCHIVED' && (
                        <Button variant="ghost" size="sm" disabled={activate.isPending} onClick={() => activate.mutate({ baseId: base.id, versionId: version.id })}>Activate</Button>
                      )}
                      {!version.isActive && version.status === 'PUBLISHED' && base.status !== 'ARCHIVED' && (
                        <Button variant="ghost" size="sm" disabled={transition.isPending} onClick={() => setVersionAction({ kind: 'archive', baseId: base.id, version })}>Archive</Button>
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
            <DialogTitle>{versionAction?.kind === 'publish' ? 'Publish version' : 'Archive version'}</DialogTitle>
            <DialogDescription>
              {versionAction?.kind === 'publish'
                ? 'Publishing locks all 210 parameters. Future changes require a new draft version.'
                : 'Archived versions remain visible in history and cannot be used again.'}
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
  READY: 'Operational',
  IN_PROGRESS: 'In preparation',
  MISSING: 'No coverage',
}

function CoverageOverview({ coverage, onCreate }: { coverage: ScopeCoverage[]; onCreate: (scope: Scope) => void }) {
  const ready = coverage.filter((item) => item.status === 'READY').length
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Operational coverage</CardTitle>
            <CardDescription>Each scope needs an active base and an active published version with all 210 parameters.</CardDescription>
          </div>
          <div className="rounded-full border bg-muted/25 px-3 py-1 text-xs font-medium">{ready} of {coverage.length} scopes operational</div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {coverage.map((item) => (
          <div key={item.scope} className="flex min-h-48 flex-col rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">{SCOPE_LABEL[item.scope]}</div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${COVERAGE_STYLE[item.status]}`}>{COVERAGE_LABEL[item.status]}</span>
            </div>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">
              {item.status === 'READY'
                ? `${item.readyBaseCount} governed base${item.readyBaseCount === 1 ? '' : 's'} ready for future quotes and production routes.`
                : item.status === 'IN_PROGRESS'
                  ? `${item.baseCount} base${item.baseCount === 1 ? '' : 's'} exist${item.baseCount === 1 ? 's' : ''}${item.draftVersionCount > 0 ? ` with ${item.draftVersionCount} draft version${item.draftVersionCount === 1 ? '' : 's'}` : ''}, but none has an active published 210-parameter version.`
                  : 'No governed base. Manual quotes can calculate, but remain Legacy and require review.'}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-2 text-center text-xs">
              <CoverageMetric label="Bases" value={item.baseCount} />
              <CoverageMetric label="Lanes" value={item.laneCount} />
              <CoverageMetric label="Quotes" value={item.quoteCount} />
            </div>
            <div className="mt-3">
              {item.status === 'MISSING'
                ? <Button className="w-full" variant="outline" size="sm" onClick={() => onCreate(item.scope)}>Start {SCOPE_LABEL[item.scope]} base</Button>
                : <Link href="#base-list" className="block text-center text-xs font-medium underline underline-offset-2">Review bases</Link>}
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
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>{status.toLowerCase()}</span>
}

function VersionHistory({ events }: { events: VersionAudit[] }) {
  return (
    <details className="mt-1 text-xs text-muted-foreground">
      <summary className="cursor-pointer hover:text-foreground">History ({events.length})</summary>
      <div className="mt-1 grid gap-1 border-l pl-2">
        {events.map((event) => <div key={event.id}><span className="font-medium text-foreground">{event.action.replaceAll('_', ' ').toLowerCase()}</span> · <RelativeTime iso={event.createdAt} />{event.actor ? ` · ${event.actor.email}` : ''}{event.note ? ` · ${event.note}` : ''}</div>)}
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
      <div className="grid gap-1.5"><Label htmlFor="approval-note">Approval note</Label><textarea id="approval-note" required minLength={3} value={note} onChange={(event) => setNote(event.target.value)} className={`${selectCls} h-24 py-2`} placeholder={action === 'publish' ? `Why version ${version.version} is approved for use` : `Why version ${version.version} is being archived`} /></div>
      <DialogFooter><Button variant="outline" type="button" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={pending || note.trim().length < 3}>{pending ? 'Saving…' : action === 'publish' ? 'Publish and lock' : 'Archive version'}</Button></DialogFooter>
      {requiresImpactAcknowledgement && <label className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm"><input className="mt-1 accent-primary" type="checkbox" required checked={impactAcknowledged} onChange={(event) => setImpactAcknowledged(event.target.checked)} /><span>Confirmo que revisé el impacto. El sistema recalculará y dejará en auditoría los parámetros modificados, rutas y cotizaciones que permanecen congeladas.</span></label>}
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
      <CardHeader><CardTitle>New cost base</CardTitle><CardDescription>Creates version 1 with all 210 canonical parameters.</CardDescription></CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-5" onSubmit={(event) => { event.preventDefault(); onSubmit({ code, name, scope, defaultPolicy: policy, isDefault }) }}>
          <div className="grid gap-1.5"><Label>Code</Label><Input required minLength={2} value={code} onChange={(e) => setCode(e.target.value)} placeholder="XB-2026" /></div>
          <div className="grid gap-1.5 lg:col-span-2"><Label>Name</Label><Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Cross-border 2026" /></div>
          <div className="grid gap-1.5"><Label>Scope</Label><select className={selectCls} value={scope} onChange={(e) => setScope(e.target.value as Scope)}>{Object.entries(SCOPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div className="grid gap-1.5"><Label>Model</Label><select className={selectCls} value={policy} onChange={(e) => setPolicy(e.target.value)}><option value="OPERATIONAL_V3">Operational V3</option><option value="WORKBOOK_V3">Workbook exact</option></select></div>
          <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="accent-primary" />Default for this scope</label>
          <div className="flex justify-end md:col-span-2 lg:col-span-3"><Button type="submit" disabled={pending || !code.trim() || !name.trim()}>{pending ? 'Creating…' : 'Create base'}</Button></div>
        </form>
      </CardContent>
    </Card>
  )
}
