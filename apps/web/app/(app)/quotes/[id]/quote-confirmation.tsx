'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { fetcher } from '@/lib/fetcher'

type QuoteStatus = 'DRAFT' | 'CONFIRMED' | 'ARCHIVED'

export function QuoteConfirmation({ quoteId, status, confirmedAt, confirmedBy, confirmationNote, canEdit }: { quoteId: string; status: QuoteStatus; confirmedAt: string | null; confirmedBy: { email: string } | null; confirmationNote: string | null; canEdit: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const confirm = useMutation({
    mutationFn: () => fetcher(`/api/v1/quotes/${quoteId}/confirm`, { method: 'POST', json: { note: note.trim() } }),
    onSuccess: () => { toast.success('Cotización confirmada'); setOpen(false); router.refresh() },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo confirmar la cotización'),
  })

  if (status === 'CONFIRMED') return <div className="text-right text-xs text-emerald-700"><div className="font-medium">Confirmada por una persona</div><div>{confirmedBy?.email ?? 'Usuario eliminado'}{confirmedAt ? ` · ${new Date(confirmedAt).toLocaleString()}` : ''}</div>{confirmationNote && <div className="mt-1 max-w-64 text-muted-foreground">{confirmationNote}</div>}</div>
  if (status === 'ARCHIVED') return <span className="text-xs text-muted-foreground">Cotización archivada</span>
  if (!canEdit) return <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">Modo consulta</span>
  return <>
    <Button size="sm" onClick={() => setOpen(true)}>Confirmar cotización</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Confirmar cotización</DialogTitle><DialogDescription>Confirma que revisaste esta tarifa. El servidor validará el snapshot, la versión publicada y las alertas comerciales antes de aceptarla.</DialogDescription></DialogHeader>
        <label className="grid gap-1 text-xs font-medium">
          Nota de confirmación
          <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Mínimo 3 caracteres" autoFocus />
        </label>
        <DialogFooter><DialogClose render={<Button variant="outline" type="button" />}>Cancelar</DialogClose><Button disabled={note.trim().length < 3 || confirm.isPending} onClick={() => confirm.mutate()}>{confirm.isPending ? 'Confirmando…' : 'Confirmar'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>
}

export function RatewareHandoffDownload({ quoteId }: { quoteId: string }) {
  const download = useMutation({
    mutationFn: () => fetcher<unknown>(`/api/v1/integration/rateware/quotes/${quoteId}`),
    onSuccess: (payload) => {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `fcm-rateware-handoff-${quoteId.slice(0, 8)}.json`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Paquete Rateware descargado')
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo generar el paquete'),
  })
  return <Button variant="outline" size="sm" onClick={() => download.mutate()} disabled={download.isPending}>{download.isPending ? 'Generando…' : 'Paquete Rateware'}</Button>
}
