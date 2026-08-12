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

export function QuoteConfirmation({ quoteId, status, confirmedAt, confirmedBy, confirmationNote }: { quoteId: string; status: QuoteStatus; confirmedAt: string | null; confirmedBy: { email: string } | null; confirmationNote: string | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const confirm = useMutation({
    mutationFn: () => fetcher(`/api/v1/quotes/${quoteId}/confirm`, { method: 'POST', json: { note: note.trim() } }),
    onSuccess: () => { toast.success('Cotizacion confirmada'); setOpen(false); router.refresh() },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo confirmar la cotizacion'),
  })

  if (status === 'CONFIRMED') return <div className="text-right text-xs text-emerald-700"><div className="font-medium">Confirmada por una persona</div><div>{confirmedBy?.email ?? 'Usuario eliminado'}{confirmedAt ? ` · ${new Date(confirmedAt).toLocaleString()}` : ''}</div>{confirmationNote && <div className="mt-1 max-w-64 text-muted-foreground">{confirmationNote}</div>}</div>
  if (status === 'ARCHIVED') return <span className="text-xs text-muted-foreground">Cotizacion archivada</span>
  return <>
    <Button size="sm" onClick={() => setOpen(true)}>Confirmar cotizacion</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Confirmar cotizacion</DialogTitle><DialogDescription>Confirma que revisaste esta tarifa. El servidor validara el snapshot, la version publicada y las alertas comerciales antes de aceptarla.</DialogDescription></DialogHeader>
        <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nota de confirmacion (minimo 3 caracteres)" autoFocus />
        <DialogFooter><DialogClose render={<Button variant="outline" type="button" />}>Cancelar</DialogClose><Button disabled={note.trim().length < 3 || confirm.isPending} onClick={() => confirm.mutate()}>{confirm.isPending ? 'Confirmando...' : 'Confirmar'}</Button></DialogFooter>
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
  return <Button variant="outline" size="sm" onClick={() => download.mutate()} disabled={download.isPending}>{download.isPending ? 'Generando...' : 'Paquete Rateware'}</Button>
}
