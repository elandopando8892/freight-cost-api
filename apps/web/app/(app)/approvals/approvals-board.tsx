'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { fetcher } from '@/lib/fetcher'

export type Approval = {
  id: string; action: 'RATEBOOK_PUBLISH' | 'RATEWARE_DELIVERY'; status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'; requestNote: string; decisionNote: string | null; createdAt: string; reviewedAt: string | null
  rateBook: { id: string; code: string; name: string; status: string; effectiveFrom: string; effectiveUntil: string | null }
  requestedBy: { id: string; email: string; role: string }
  reviewedBy: { id: string; email: string; role: string } | null
}

const label = (action: Approval['action']) => action === 'RATEBOOK_PUBLISH' ? 'Publicar RateBook' : 'Entregar a Rateware'
const statusClass: Record<Approval['status'], string> = { PENDING: 'bg-amber-500/10 text-amber-700', APPROVED: 'bg-emerald-500/10 text-emerald-700', REJECTED: 'bg-rose-500/10 text-rose-700', CANCELLED: 'bg-muted text-muted-foreground' }

export function ApprovalsBoard({
  initial,
  role,
  currentUserId,
  singleAdminMode,
}: {
  initial: Approval[]
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER'
  currentUserId: string
  singleAdminMode: boolean
}) {
  const [rows, setRows] = useState(initial)
  const [note, setNote] = useState<Record<string, string>>({})
  const [singleAdminConfirmed, setSingleAdminConfirmed] = useState<Record<string, boolean>>({})
  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approve' | 'reject' }) => {
      const row = rows.find((item) => item.id === id)
      const selfReview = singleAdminMode && row?.requestedBy.id === currentUserId
      return fetcher<Approval>(`/api/v1/approvals/${id}/${decision}`, {
        method: 'POST',
        json: {
          note: note[id],
          singleAdminConfirmation: selfReview && singleAdminConfirmed[id]
            ? `CONFIRM_SINGLE_ADMIN_APPROVAL:${id}`
            : undefined,
        },
      })
    },
    onSuccess: (approval) => {
      setRows((items) => items.map((item) => item.id === approval.id ? approval : item))
      setSingleAdminConfirmed((items) => ({ ...items, [approval.id]: false }))
    },
  })

  return (
    <div className="grid gap-3">
      <header className="border-b pb-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Gobierno operativo</p>
        <h1 className="mt-1 text-xl font-semibold">Aprobaciones</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {singleAdminMode
            ? 'Organización con administrador único: solicitar y decidir permanecen como dos pasos explícitos y auditados.'
            : 'Las solicitudes separan a quien propone de quien autoriza. Aprobar no ejecuta cambios automáticamente.'}
        </p>
      </header>
      <div className="grid gap-2 sm:grid-cols-3">
        <Metric label="Pendientes" value={rows.filter((row) => row.status === 'PENDING').length} />
        <Metric label="Aprobadas" value={rows.filter((row) => row.status === 'APPROVED').length} />
        <Metric label="Mi rol" value={role === 'ADMIN' ? 'Administrador' : role === 'OPERATOR' ? 'Operador' : 'Sólo lectura'} />
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="border-b bg-muted/30 uppercase tracking-wide text-muted-foreground">
              <tr><th className="p-3 text-left">Acción</th><th className="text-left">RateBook</th><th className="text-left">Solicita</th><th className="text-left">Evidencia</th><th className="text-left">Estado</th><th className="p-3 text-right">Revisión</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No hay solicitudes visibles.</td></tr> : rows.map((row) => {
                const selfReview = singleAdminMode && row.requestedBy.id === currentUserId
                const noteReady = (note[row.id] ?? '').trim().length >= 3
                const confirmationReady = !selfReview || Boolean(singleAdminConfirmed[row.id])
                const decisionNote = row.decisionNote?.replace(/\n\[CONFIRM_SINGLE_ADMIN_APPROVAL:[^\]]+\]$/, '') ?? ''
                return (
                  <tr key={row.id} className="border-b align-top">
                    <td className="p-3 font-medium">{label(row.action)}</td>
                    <td>{row.rateBook.code}<span className="block text-muted-foreground">{row.rateBook.name}</span></td>
                    <td>{row.requestedBy.email}<span className="block text-muted-foreground">{new Date(row.createdAt).toLocaleString('es-MX')}</span></td>
                    <td className="max-w-64 py-3">{row.requestNote}{decisionNote ? <span className="mt-1 block text-muted-foreground">{decisionNote}</span> : null}</td>
                    <td><span className={`rounded-full px-2 py-0.5 font-medium ${statusClass[row.status]}`}>{statusLabel(row.status)}</span>{row.reviewedBy ? <span className="mt-1 block text-muted-foreground">{row.reviewedBy.email}</span> : null}{row.decisionNote?.includes('[CONFIRM_SINGLE_ADMIN_APPROVAL:') ? <span className="mt-1 block text-muted-foreground">Control de administrador único</span> : null}</td>
                    <td className="p-3 text-right">
                      {role === 'ADMIN' && row.status === 'PENDING' ? (
                        <div className="ml-auto grid max-w-md gap-2">
                          <Input aria-label={`Nota de decisión para ${row.rateBook.code}`} placeholder="Nota de decisión" value={note[row.id] ?? ''} onChange={(event) => setNote((values) => ({ ...values, [row.id]: event.target.value }))} />
                          {selfReview ? (
                            <label className="flex items-start gap-2 rounded-md border bg-amber-500/5 p-2 text-left text-[11px] text-muted-foreground">
                              <input type="checkbox" className="mt-0.5" checked={Boolean(singleAdminConfirmed[row.id])} onChange={(event) => setSingleAdminConfirmed((values) => ({ ...values, [row.id]: event.target.checked }))} />
                              Confirmo que soy el único administrador y que esta segunda acción quedará auditada por separado.
                            </label>
                          ) : null}
                          <div className="flex justify-end gap-2">
                            <Button size="sm" disabled={!noteReady || !confirmationReady || decide.isPending} onClick={() => decide.mutate({ id: row.id, decision: 'approve' })}><CheckCircle2 className="mr-1 h-4 w-4" />Aprobar</Button>
                            <Button size="sm" variant="outline" disabled={!noteReady || !confirmationReady || decide.isPending} onClick={() => decide.mutate({ id: row.id, decision: 'reject' })}><XCircle className="mr-1 h-4 w-4" />Rechazar</Button>
                          </div>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function statusLabel(status: Approval['status']) {
  if (status === 'PENDING') return 'Pendiente'
  if (status === 'APPROVED') return 'Aprobada'
  if (status === 'REJECTED') return 'Rechazada'
  return 'Cancelada'
}

function Metric({ label, value }: { label: string; value: string | number }) { return <Card size="sm"><CardHeader><CardTitle>{value}</CardTitle></CardHeader><CardContent className="pt-0 text-xs text-muted-foreground">{label}</CardContent></Card> }
