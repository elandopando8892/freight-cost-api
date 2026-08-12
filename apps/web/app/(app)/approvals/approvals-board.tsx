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

export function ApprovalsBoard({ initial, role }: { initial: Approval[]; role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }) {
  const [rows, setRows] = useState(initial); const [note, setNote] = useState<Record<string, string>>({})
  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approve' | 'reject' }) => fetcher<Approval>(`/api/v1/approvals/${id}/${decision}`, { method: 'POST', json: { note: note[id] } }),
    onSuccess: (approval) => setRows(items => items.map(item => item.id === approval.id ? approval : item)),
  })
  return <div className="grid gap-5"><header><h1 className="text-2xl font-semibold">Aprobaciones</h1><p className="mt-1 text-sm text-muted-foreground">Las solicitudes separan a quien propone de quien autoriza. Aprobar no ejecuta cambios automáticamente.</p></header>
    <div className="grid gap-3 sm:grid-cols-3"><Metric label="Pendientes" value={rows.filter(row => row.status === 'PENDING').length} /><Metric label="Aprobadas" value={rows.filter(row => row.status === 'APPROVED').length} /><Metric label="Mi rol" value={role === 'ADMIN' ? 'Administrador' : role === 'OPERATOR' ? 'Operador' : 'Solo lectura'} /></div>
    <Card><CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[780px] text-sm"><thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-3 text-left">Acción</th><th className="text-left">RateBook</th><th className="text-left">Solicita</th><th className="text-left">Evidencia</th><th className="text-left">Estado</th><th className="p-3 text-right">Revisión</th></tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No hay solicitudes visibles.</td></tr> : rows.map(row => <tr key={row.id} className="border-b align-top"><td className="p-3 font-medium">{label(row.action)}</td><td>{row.rateBook.code}<span className="block text-xs text-muted-foreground">{row.rateBook.name}</span></td><td>{row.requestedBy.email}<span className="block text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</span></td><td className="max-w-64 py-3">{row.requestNote}<span className="mt-1 block text-xs text-muted-foreground">{row.decisionNote ?? ''}</span></td><td><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[row.status]}`}>{row.status.toLowerCase()}</span>{row.reviewedBy && <span className="mt-1 block text-xs text-muted-foreground">{row.reviewedBy.email}</span>}</td><td className="p-3 text-right">{role === 'ADMIN' && row.status === 'PENDING' ? <div className="flex items-center justify-end gap-2"><Input className="w-48" placeholder="Nota de decisión" value={note[row.id] ?? ''} onChange={event => setNote(values => ({ ...values, [row.id]: event.target.value }))} /><Button size="sm" disabled={(note[row.id] ?? '').trim().length < 3 || decide.isPending} onClick={() => decide.mutate({ id: row.id, decision: 'approve' })}><CheckCircle2 className="mr-1 h-4 w-4" />Aprobar</Button><Button size="sm" variant="outline" disabled={(note[row.id] ?? '').trim().length < 3 || decide.isPending} onClick={() => decide.mutate({ id: row.id, decision: 'reject' })}><XCircle className="mr-1 h-4 w-4" />Rechazar</Button></div> : null}</td></tr>)}</tbody></table></CardContent></Card>
  </div>
}

function Metric({ label, value }: { label: string; value: string | number }) { return <Card size="sm"><CardHeader><CardTitle>{value}</CardTitle></CardHeader><CardContent className="pt-0 text-xs text-muted-foreground">{label}</CardContent></Card> }
