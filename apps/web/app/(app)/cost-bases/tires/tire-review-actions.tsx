'use client'

import { useRef, useState } from 'react'
import { ClientApiError, fetcher } from '@/lib/fetcher'
import type { TireCalibrationSummary } from './tire-calibration-workbench'

export type TireReviewer = { id: string; email: string }

export function TireReviewActions({ dossier, currentUserId, role, reviewers, onUpdated }: {
  dossier: TireCalibrationSummary
  currentUserId: string
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER'
  reviewers: TireReviewer[]
  onUpdated: () => Promise<void>
}) {
  const eligible = reviewers.filter(user => user.id !== dossier.authorId)
  const [ownerId, setOwnerId] = useState(eligible.length === 1 ? eligible[0].id : '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  const retry = useRef<{ signature: string; requestId: string } | null>(null)
  const canAssign = role !== 'VIEWER' && dossier.authorId === currentUserId && dossier.status === 'DRAFT'
  const canDecide = role === 'ADMIN' && dossier.economicOwnerId === currentUserId && dossier.status === 'PENDING_ECONOMIC'
  if (!canAssign && !canDecide) return null

  async function submit(decision?: 'ENDORSED' | 'RETURNED') {
    if (inFlight.current || !note.trim() || (canAssign && !ownerId)) return
    inFlight.current = true
    setBusy(true)
    setError('')
    const command = {
      note: note.trim(), expectedRevision: dossier.revision,
      expectedProposalFingerprint: dossier.proposalFingerprint,
      ...(canAssign ? { economicOwnerId: ownerId, independentReviewerId: null, reviewMode: 'ECONOMIC_ONLY' } : { decision }),
    }
    const signature = JSON.stringify(command)
    if (retry.current?.signature !== signature) retry.current = { signature, requestId: crypto.randomUUID() }
    try {
      await fetcher(`/api/v1/cost-bases/tire-calibrations/${encodeURIComponent(dossier.id)}/${canAssign ? 'assign-reviewers' : 'economic-decision'}`, {
        method: 'POST', json: { ...command, requestId: retry.current.requestId }, silent: true,
      })
      await onUpdated()
    } catch (cause) {
      setError(cause instanceof ClientApiError && cause.status === 409
        ? 'La propuesta o su fuente cambió. Actualiza el expediente antes de decidir.'
        : 'No se pudo confirmar la operación. Puedes reintentar sin duplicar la decisión.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return (
    <section className="border-t bg-primary/5 p-5" aria-label="Acciones de revisión">
      <h3 className="font-semibold">{canAssign ? 'Asignar revisión económica' : 'Registrar revisión económica'}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {canAssign || dossier.reviewMode === 'ECONOMIC_ONLY'
          ? 'Un revisor distinto del autor. Al aprobar, la revisión económica queda completa; no se requiere un segundo revisor.'
          : 'Este expediente conserva la modalidad de doble revisión con la que fue asignado.'}
      </p>
      <form className="mt-4 grid gap-3" onSubmit={event => { event.preventDefault(); void submit(canAssign ? undefined : 'ENDORSED') }}>
        {canAssign && (
          <label className="grid gap-1 text-sm">Responsable económico
            <select className="min-h-11 rounded border bg-background px-3" value={ownerId} onChange={event => setOwnerId(event.target.value)} required disabled={busy}>
              <option value="">Selecciona un responsable</option>
              {eligible.map(user => <option key={user.id} value={user.id}>{user.email}</option>)}
            </select>
            {!eligible.length && <span className="text-muted-foreground">No hay un ADMIN distinto del autor en esta organización.</span>}
          </label>
        )}
        <label className="grid gap-1 text-sm">Fundamento de la decisión
          <textarea className="min-h-24 rounded border bg-background p-3" value={note} onChange={event => setNote(event.target.value)} maxLength={4000} required disabled={busy} />
        </label>
        <p className="text-xs text-muted-foreground">La decisión queda en la bitácora. No publica parámetros ni activa cotizaciones.</p>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button className="min-h-11 rounded bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50" disabled={busy || !note.trim() || (canAssign && !ownerId)}>
            {busy ? 'Guardando…' : canAssign ? 'Enviar a revisión económica' : 'Aprobar revisión económica'}
          </button>
          {canDecide && <button type="button" className="min-h-11 rounded border px-4 text-sm disabled:opacity-50" disabled={busy || !note.trim()} onClick={() => void submit('RETURNED')}>Devolver con observaciones</button>}
          {error && <button type="button" className="min-h-11 rounded border px-4 text-sm" onClick={() => void onUpdated()} disabled={busy}>Actualizar expediente</button>}
        </div>
      </form>
    </section>
  )
}
