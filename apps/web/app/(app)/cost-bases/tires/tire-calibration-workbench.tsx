'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  CircleDashed,
  FileCheck2,
  Fingerprint,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { ClientApiError, fetcher } from '@/lib/fetcher'
import { TireReviewActions, type TireReviewer } from './tire-review-actions'

type CalibrationStatus =
  | 'DRAFT'
  | 'PENDING_ECONOMIC'
  | 'PENDING_INDEPENDENT'
  | 'RETURNED'
  | 'REJECTED'
  | 'REVIEWED'
  | 'ECONOMIC_REVIEWED'

type ApprovalPackage = {
  id: string
  packageFingerprint: string
  quoteEligible: boolean
  createdAt: string
}

export type TireCalibrationSummary = {
  id: string
  proposalId: string
  version: number
  status: CalibrationStatus
  reviewMode?: 'DUAL_REVIEW' | 'ECONOMIC_ONLY'
  revision: number
  proposalFingerprint: string
  sourceAggregationFingerprint: string
  sourceSnapshotId: string
  authorId: string
  economicOwnerId: string | null
  independentReviewerId: string | null
  createdAt: string
  updatedAt: string
  approvalPackage: ApprovalPackage | null
}

type CalibrationEvent = {
  id: string
  sequence: number
  action: string
  actorId: string
  fromStatus: CalibrationStatus | null
  toStatus: CalibrationStatus
  eventHash: string
  createdAt: string
}

type TireCalibrationDetail = TireCalibrationSummary & {
  events: CalibrationEvent[]
}

type CurrentSource = {
  headId: string
  headRevision: number
  snapshotId: string
  snapshotVersion: number
  aggregationFingerprint: string
}

const statusLabels: Record<CalibrationStatus, string> = {
  DRAFT: 'Borrador',
  PENDING_ECONOMIC: 'Pendiente económico',
  PENDING_INDEPENDENT: 'Pendiente independiente',
  RETURNED: 'Devuelto',
  REJECTED: 'Rechazado',
  REVIEWED: 'Revisado',
  ECONOMIC_REVIEWED: 'Revisión económica completa',
}

const actionLabels: Record<string, string> = {
  DRAFT_OPENED: 'Borrador abierto',
  REVIEWERS_ASSIGNED: 'Revisores asignados',
  ECONOMIC_APPROVED: 'Revisión económica aprobada',
  ECONOMIC_RETURNED: 'Devuelto por revisión económica',
  INDEPENDENT_APPROVED: 'Revisión independiente aprobada',
  INDEPENDENT_REJECTED: 'Rechazado por revisión independiente',
}

const shortHash = (value: string) => value.length <= 20 ? value : `${value.slice(0, 10)}…${value.slice(-6)}`
const formatDate = (value: string) => new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

function statusTone(status: CalibrationStatus): string {
  if (status === 'REVIEWED' || status === 'ECONOMIC_REVIEWED') return 'border-emerald-700/40 bg-emerald-950/30 text-emerald-300'
  if (status === 'REJECTED' || status === 'RETURNED') return 'border-rose-700/40 bg-rose-950/30 text-rose-300'
  return 'border-amber-700/40 bg-amber-950/30 text-amber-300'
}

function TraceValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-all font-mono text-xs" title={value}>{shortHash(value)}</dd>
    </div>
  )
}

function ReviewStep({ complete, label, detail }: { complete: boolean; label: string; detail: string }) {
  const Icon = complete ? CheckCircle2 : CircleDashed
  return (
    <li className="flex gap-3 rounded border bg-background/60 p-3">
      <Icon className={`mt-0.5 size-5 shrink-0 ${complete ? 'text-emerald-400' : 'text-muted-foreground'}`} aria-hidden />
      <div><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>
    </li>
  )
}

export function TireCalibrationWorkbench({
  initialDossiers,
  role,
  currentUserId,
  reviewers = [],
  researchPanel,
}: {
  initialDossiers: TireCalibrationSummary[]
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER'
  currentUserId?: string
  reviewers?: TireReviewer[]
  researchPanel?: ReactNode
}) {
  const [dossiers, setDossiers] = useState(initialDossiers)
  const [filter, setFilter] = useState('')
  const [selectedId, setSelectedId] = useState(initialDossiers[0]?.id ?? '')
  const [detail, setDetail] = useState<TireCalibrationDetail | null>(null)
  const [detailState, setDetailState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [cohortKey, setCohortKey] = useState('')
  const [source, setSource] = useState<CurrentSource | null>(null)
  const [sourceState, setSourceState] = useState<'idle' | 'loading' | 'missing' | 'error'>('idle')

  const filtered = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase('es-MX')
    if (!query) return dossiers
    return dossiers.filter(item =>
      item.proposalId.toLocaleLowerCase('es-MX').includes(query)
      || statusLabels[item.status].toLocaleLowerCase('es-MX').includes(query))
  }, [filter, dossiers])

  const selectedSummary = dossiers.find(item => item.id === selectedId) ?? null
  const selected = detail?.id === selectedId ? detail : selectedSummary
  const reviewedCount = dossiers.filter(item => item.status === 'REVIEWED' || item.status === 'ECONOMIC_REVIEWED').length

  async function selectDossier(id: string) {
    setSelectedId(id)
    setDetail(null)
    setDetailState('loading')
    try {
      const result = await fetcher<TireCalibrationDetail>(
        `/api/v1/cost-bases/tire-calibrations/${encodeURIComponent(id)}`,
        { silent: true },
      )
      setDetail(result)
      setDossiers(current => current.map(item => item.id === result.id ? result : item))
      setDetailState('idle')
    } catch {
      setDetailState('error')
    }
  }

  async function verifySource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const key = cohortKey.trim()
    if (!key) return
    setSource(null)
    setSourceState('loading')
    try {
      const result = await fetcher<CurrentSource>(
        `/api/v1/cost-bases/tire-cohort-sources/current?cohortKey=${encodeURIComponent(key)}`,
        { silent: true },
      )
      setSource(result)
      setSourceState('idle')
    } catch (error) {
      setSourceState(error instanceof ClientApiError && error.status === 409 ? 'missing' : 'error')
    }
  }

  const economicComplete = selected ? ['PENDING_INDEPENDENT', 'REVIEWED', 'ECONOMIC_REVIEWED'].includes(selected.status) : false
  const independentComplete = selected?.status === 'REVIEWED'

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-bold tracking-[0.15em] text-primary uppercase">Gobierno de costos · COST_TIRES</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Calibración de llantas</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Consulta la evidencia, la fuente vigente y la cadena de revisión antes de incorporar parámetros al motor de costos.
          </p>
        </div>
        <span className="rounded-full border px-3 py-1.5 text-xs font-semibold">Rol {role} · {role === 'VIEWER' || !currentUserId ? 'sólo consulta' : 'revisión económica'}</span>
      </header>

      <section className="grid gap-4 rounded-lg border border-primary/35 bg-primary/5 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
        <ShieldAlert className="size-6 text-primary" aria-hidden />
        <div>
          <h2 className="font-semibold">Publicación bloqueada por diseño</h2>
          <p className="mt-1 text-sm text-muted-foreground">Este workbench no escribe parámetros, no activa bases y no vuelve elegible una cotización.</p>
        </div>
        <div className="rounded border bg-background px-3 py-2 text-right">
          <p className="text-lg font-semibold">0</p>
          <p className="text-[11px] text-muted-foreground">listos para publicar</p>
        </div>
      </section>

      {researchPanel}

      <div className="grid items-start gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="rounded-lg border bg-card" aria-label="Expedientes de calibración">
          <div className="border-b p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold">Expedientes</h2>
              <span className="text-xs text-muted-foreground">{initialDossiers.length} total</span>
            </div>
            <label className="mt-3 flex min-h-11 items-center gap-2 rounded border bg-background px-3">
              <Search className="size-4 text-muted-foreground" aria-hidden />
              <span className="sr-only">Buscar expediente</span>
              <input
                className="w-full bg-transparent text-sm outline-none"
                value={filter}
                onChange={event => setFilter(event.target.value)}
                placeholder="Buscar propuesta o estado"
              />
            </label>
          </div>
          <div className="grid max-h-[34rem] gap-2 overflow-y-auto p-3">
            {!filtered.length && (
              <div className="rounded border border-dashed p-5 text-sm text-muted-foreground">
                {initialDossiers.length ? 'Ningún expediente coincide con la búsqueda.' : 'Aún no existen expedientes. No se crearán valores ni importes predeterminados.'}
              </div>
            )}
            {filtered.map(item => (
              <button
                key={item.id}
                type="button"
                aria-pressed={selectedId === item.id}
                onClick={() => void selectDossier(item.id)}
                className={`min-h-20 rounded border p-3 text-left transition-colors ${selectedId === item.id ? 'border-primary bg-primary/10' : 'hover:bg-accent'}`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="break-all text-sm font-semibold">{item.proposalId}</span>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone(item.status)}`}>{statusLabels[item.status]}</span>
                </span>
                <span className="mt-2 block text-xs text-muted-foreground">Versión {item.version} · revisión {item.revision}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 rounded-lg border bg-card" aria-live="polite">
          {!selected && (
            <div className="p-8 text-center">
              <FileCheck2 className="mx-auto size-8 text-muted-foreground" aria-hidden />
              <h2 className="mt-3 font-semibold">Selecciona un expediente</h2>
              <p className="mt-2 text-sm text-muted-foreground">Aquí aparecerán su linaje, revisiones y paquete de evidencia.</p>
            </div>
          )}
          {selected && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b p-5">
                <div>
                  <p className="text-xs text-muted-foreground">Expediente</p>
                  <h2 className="mt-1 break-all text-xl font-semibold">{selected.proposalId} · v{selected.version}</h2>
                  <p className="mt-2 text-xs text-muted-foreground">Revisión {selected.revision} · actualizado {formatDate(selected.updatedAt)}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(selected.status)}`}>{statusLabels[selected.status]}</span>
              </div>

              {detailState === 'loading' && <p className="border-b p-4 text-sm text-muted-foreground">Cargando bitácora del expediente…</p>}
              {detailState === 'error' && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-700/40 bg-rose-950/20 p-4">
                  <p className="text-sm text-rose-200">No fue posible cargar la bitácora autenticada.</p>
                  <button className="min-h-11 rounded border px-3 text-sm" type="button" onClick={() => void selectDossier(selected.id)}>Reintentar</button>
                </div>
              )}

              <div className="grid gap-5 p-5 lg:grid-cols-2">
                <div>
                  <h3 className="flex items-center gap-2 font-semibold"><Fingerprint className="size-4 text-primary" aria-hidden />Trazabilidad</h3>
                  <dl className="mt-3 rounded border px-3">
                    <TraceValue label="Propuesta" value={selected.proposalFingerprint} />
                    <TraceValue label="Fuente" value={selected.sourceAggregationFingerprint} />
                    <TraceValue label="Snapshot" value={selected.sourceSnapshotId} />
                    {selected.approvalPackage && <TraceValue label="Paquete" value={selected.approvalPackage.packageFingerprint} />}
                  </dl>
                </div>
                <div>
                  <h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-primary" aria-hidden />Cadena de revisión</h3>
                  <ol className="mt-3 grid gap-2">
                    <ReviewStep complete label="Borrador reproducible" detail="La propuesta y su fuente quedaron fijadas por huella." />
                    <ReviewStep complete={economicComplete} label="Revisión económica" detail={selected.economicOwnerId ? 'Responsable asignado.' : 'Pendiente de responsable económico.'} />
                    {selected.reviewMode === 'ECONOMIC_ONLY'
                      ? <li className="rounded border border-dashed p-3 text-sm text-muted-foreground">Revisión individual · no incluye dictamen independiente. No se requiere un segundo revisor.</li>
                      : <ReviewStep complete={independentComplete} label="Revisión independiente" detail={selected.independentReviewerId ? 'Revisor independiente asignado.' : 'Pendiente de revisor independiente.'} />}
                    <ReviewStep complete={false} label="Autorización de publicación" detail="Requiere una autorización separada; no forma parte de este workbench." />
                  </ol>
                </div>
              </div>

              {currentUserId && <TireReviewActions key={`${selected.id}:${selected.revision}`} dossier={selected} currentUserId={currentUserId} role={role} reviewers={reviewers} onUpdated={() => selectDossier(selected.id)} />}

              <div className="border-t p-5">
                <h3 className="font-semibold">Bitácora inmutable</h3>
                {!detail && <p className="mt-2 text-sm text-muted-foreground">Abre el expediente desde la lista para consultar sus eventos.</p>}
                {detail && !detail.events.length && <p className="mt-2 text-sm text-muted-foreground">El expediente no contiene eventos.</p>}
                {detail && detail.events.length > 0 && (
                  <ol className="mt-3 grid gap-2">
                    {detail.events.map(item => (
                      <li key={item.id} className="grid gap-1 rounded border p-3 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center">
                        <span className="font-mono text-xs text-muted-foreground">#{item.sequence}</span>
                        <span className="text-sm font-medium">{actionLabels[item.action] ?? item.action}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                        <span className="sm:col-start-2 sm:col-end-4 font-mono text-[11px] text-muted-foreground">actor {item.actorId}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-semibold">Verificar fuente vigente</h2><p className="mt-1 text-sm text-muted-foreground">Confirma que la cohorte conserva un snapshot íntegro antes de revisar una propuesta.</p></div>
          {reviewedCount > 0 && <span className="rounded border px-2 py-1 text-xs">{reviewedCount} revisado{reviewedCount === 1 ? '' : 's'} · publicación aún bloqueada</span>}
        </div>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={verifySource}>
          <label className="flex-1">
            <span className="sr-only">Clave de cohorte</span>
            <input
              className="min-h-11 w-full rounded border bg-background px-3 text-sm outline-none focus:border-primary"
              value={cohortKey}
              onChange={event => setCohortKey(event.target.value)}
              placeholder="Ej. XBF-LH-DRIVE-295-75R22.5"
            />
          </label>
          <button className="min-h-11 rounded bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50" disabled={!cohortKey.trim() || sourceState === 'loading'}>
            {sourceState === 'loading' ? 'Verificando…' : 'Verificar fuente'}
          </button>
        </form>
        {source && sourceState === 'idle' && (
          <div className="mt-4 grid gap-2 rounded border border-emerald-700/40 bg-emerald-950/20 p-4 text-sm sm:grid-cols-3">
            <p><span className="block text-xs text-muted-foreground">Snapshot</span>v{source.snapshotVersion}</p>
            <p><span className="block text-xs text-muted-foreground">Revisión de cabeza</span>{source.headRevision}</p>
            <p className="min-w-0"><span className="block text-xs text-muted-foreground">Huella de agregación</span><span className="font-mono text-xs" title={source.aggregationFingerprint}>{shortHash(source.aggregationFingerprint)}</span></p>
          </div>
        )}
        {sourceState === 'missing' && <p className="mt-4 rounded border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">No existe una fuente vigente para esa cohorte. No se puede sustentar una propuesta con ese identificador.</p>}
        {sourceState === 'error' && <p className="mt-4 rounded border border-rose-700/40 bg-rose-950/20 p-4 text-sm text-rose-200">No fue posible comprobar la fuente. Conservamos el valor capturado para que puedas reintentar.</p>}
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold">Siguiente puerta del modelo</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ['1', 'Fuente vigente', 'Cohorte y política estadística verificables.'],
            ['2', 'Propuesta reproducible', 'Huella de inputs, benchmark y resultados.'],
            ['3', 'Revisión económica', 'Un responsable distinto del autor; modalidad documentada.'],
            ['4', 'Publicación separada', 'Fuera de alcance; requiere autorización explícita.'],
          ].map(([number, label, description]) => (
            <div key={number} className="rounded border p-3"><span className="font-mono text-xs font-bold text-primary">{number}</span><p className="mt-2 text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
          ))}
        </div>
      </section>
    </div>
  )
}
