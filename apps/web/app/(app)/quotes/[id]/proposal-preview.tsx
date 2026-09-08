'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, FileText, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ClientApiError, fetcher } from '@/lib/fetcher'
import { dateKeyInTimeZone, formatCivilDate } from '@/lib/civil-date'
import { proposalPreviewError, proposalPreviewSchema, type ProposalPreview } from '@/lib/customer-proposal-preview'

type Props = {
  quoteId: string
  status: 'DRAFT' | 'CONFIRMED' | 'ARCHIVED'
  canEdit: boolean
}

export function ProposalPreviewAction({ quoteId, status, canEdit }: Props) {
  const [open, setOpen] = useState(false)
  const reasonId = useId()
  const reason = !canEdit ? 'Requiere un rol operativo.'
    : status === 'ARCHIVED' ? 'Esta cotización está archivada.'
      : status !== 'CONFIRMED' ? 'Confirma la cotización para revisar una propuesta.' : null

  if (reason) return <span className="grid max-w-64 gap-1">
    <Button variant="outline" disabled aria-describedby={reasonId}>Revisar propuesta</Button>
    <span id={reasonId} className="text-xs text-muted-foreground">{reason}</span>
  </span>

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger render={<Button variant="outline" className="min-h-10" />}>
      <FileText aria-hidden="true" /> Revisar propuesta
    </DialogTrigger>
    <DialogContent showCloseButton={false} className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
      {open && <ProposalPreviewForm key={quoteId} quoteId={quoteId} />}
    </DialogContent>
  </Dialog>
}

function ProposalPreviewForm({ quoteId }: { quoteId: string }) {
  const formId = useId()
  const clientInput = useRef<HTMLInputElement>(null)
  const reviewTitle = useRef<HTMLHeadingElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const controller = useRef<AbortController | null>(null)
  const attempt = useRef<{ body: string; key: string } | null>(null)
  const [fields, setFields] = useState({ clientName: '', contactName: '', contactEmail: '', validUntil: '', notes: '' })
  const [preview, setPreview] = useState<ProposalPreview | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [minimumDate] = useState(() => {
    const tomorrow = new Date(`${dateKeyInTimeZone(new Date())}T00:00:00Z`)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    return tomorrow.toISOString().slice(0, 10)
  })

  useEffect(() => () => { controller.current?.abort() }, [])
  useEffect(() => {
    if (preview) reviewTitle.current?.focus()
    else clientInput.current?.focus()
  }, [preview])
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])

  function update(name: keyof typeof fields, value: string) {
    setFields((previous) => ({ ...previous, [name]: value }))
    setError(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (controller.current) return
    const body = {
      clientName: fields.clientName.trim(),
      contactName: fields.contactName.trim() || null,
      contactEmail: fields.contactEmail.trim() || null,
      validUntil: fields.validUntil,
      notes: fields.notes.trim() || null,
      quoteType: 'Spot',
    }
    const serialized = JSON.stringify(body)
    if (attempt.current?.body !== serialized) attempt.current = { body: serialized, key: crypto.randomUUID() }
    const request = new AbortController()
    controller.current = request
    setPending(true)
    setError(null)
    try {
      const response = await fetcher<unknown>(`/api/v1/quotes/${encodeURIComponent(quoteId)}/customer-proposal-draft/preview`, {
        method: 'POST', json: body, headers: { 'idempotency-key': attempt.current.key },
        signal: request.signal, silent: true,
      })
      if (request.signal.aborted) return
      const parsed = proposalPreviewSchema.safeParse(response)
      if (!parsed.success || parsed.data.source.quoteId !== quoteId) throw new Error('Incompatible preview')
      setPreview(parsed.data)
    } catch (failure) {
      if (!request.signal.aborted) setError(proposalPreviewError(failure instanceof ClientApiError ? failure.status : undefined))
    } finally {
      if (!request.signal.aborted) {
        controller.current = null
        setPending(false)
      }
    }
  }

  return <>
    <DialogHeader className="shrink-0 border-b p-5">
      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Cotización · {quoteId.slice(0, 8)}</p>
      <DialogTitle className="text-xl">Revisar propuesta</DialogTitle>
      <DialogDescription>Prepara una vista comercial con los datos del cliente y la tarifa confirmada.</DialogDescription>
      <ol aria-label="Pasos de revisión" className="flex gap-4 pt-2 text-sm">
        <li aria-current={!preview ? 'step' : undefined} className={!preview ? 'font-semibold' : 'text-muted-foreground'}>1 · Datos del cliente</li>
        <li aria-current={preview ? 'step' : undefined} className={preview ? 'font-semibold' : 'text-muted-foreground'}>2 · Revisar</li>
      </ol>
    </DialogHeader>

    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      {preview ? <section aria-labelledby={`${formId}-review`} className="space-y-5 break-words">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Vista previa · sin guardar</p>
          <h2 ref={reviewTitle} tabIndex={-1} id={`${formId}-review`} className="mt-1 text-lg font-semibold outline-none">{preview.draft.clientName}</h2>
          {preview.draft.contactName && <p>{preview.draft.contactName}</p>}
          {preview.draft.contactEmail && <p className="break-all text-muted-foreground">{preview.draft.contactEmail}</p>}
          <p className="mt-2 text-sm text-muted-foreground">Vigente hasta {formatCivilDate(preview.draft.validUntil)} · {preview.draft.quoteType}</p>
        </div>
        {preview.draft.lines.map((line, index) => <div key={index} className="space-y-3 border-y py-4">
          <p className="flex flex-wrap items-center gap-2 font-semibold"><span>{line.origin}</span><ArrowRight aria-hidden="true" className="size-4 shrink-0" /><span>{line.destination}</span></p>
          <p className="text-muted-foreground">{line.equipment} · {line.config}<br />{line.operation} · {line.service}</p>
          {line.distance && <p className="text-muted-foreground">Distancia: {line.distance}</p>}
          <div><p className="text-sm text-muted-foreground">Tarifa propuesta</p><p className="text-3xl font-semibold tabular-nums">{new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(line.tariff)} <span className="text-base">USD</span></p></div>
        </div>)}
        {preview.draft.notes && <div><h3 className="font-semibold">Condiciones comerciales</h3><p className="mt-1 whitespace-pre-wrap">{preview.draft.notes}</p></div>}
      </section> : <form id={formId} onSubmit={submit}>
        <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 font-medium">Cliente <Input ref={clientInput} required minLength={2} maxLength={200} autoComplete="organization" value={fields.clientName} onChange={(e) => update('clientName', e.target.value)} className="min-h-11" /></label>
          <div className="grid gap-1.5"><label htmlFor={`${formId}-validity`} className="font-medium">Vigente hasta</label><Input id={`${formId}-validity`} required type="date" min={minimumDate} aria-describedby={`${formId}-date`} value={fields.validUntil} onChange={(e) => update('validUntil', e.target.value)} className="min-h-11" /><span id={`${formId}-date`} className="text-xs text-muted-foreground">A partir de mañana.</span></div>
          <label className="grid gap-1.5 font-medium">Contacto (opcional) <Input maxLength={160} autoComplete="name" value={fields.contactName} onChange={(e) => update('contactName', e.target.value)} className="min-h-11" /></label>
          <label className="grid gap-1.5 font-medium">Correo (opcional) <Input type="email" autoComplete="email" maxLength={254} value={fields.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} className="min-h-11" /></label>
          <div className="grid gap-1.5 sm:col-span-2"><label htmlFor={`${formId}-notes`} className="font-medium">Condiciones comerciales (opcional)</label><textarea id={`${formId}-notes`} aria-describedby={`${formId}-notes-hint`} maxLength={4000} rows={3} value={fields.notes} onChange={(e) => update('notes', e.target.value)} className="w-full rounded-md border border-input bg-transparent px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring" /><span id={`${formId}-notes-hint`} className="text-xs text-muted-foreground">Escribe sólo información para el cliente.</span></div>
        </fieldset>
      </form>}
      <p className="mt-5 border-l-2 border-primary pl-3 text-sm text-muted-foreground">La vista comercial excluye costos, márgenes y supuestos internos. Esta revisión no guarda una propuesta ni envía correos.</p>
      {pending && <p role="status" className="mt-4 flex items-center gap-2"><LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />Preparando vista previa…</p>}
      {error && <p ref={errorRef} role="alert" tabIndex={-1} className="mt-4 rounded-md border border-destructive/40 p-3 text-sm outline-none">{error}</p>}
    </div>

    <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
      <DialogClose render={<Button variant="outline" className="min-h-11" />}>{preview ? 'Cerrar revisión' : 'Cancelar'}</DialogClose>
      {preview ? <Button key="edit" type="button" className="min-h-11" onClick={() => { setPreview(null); setError(null) }}>Editar datos</Button>
        : <Button key="submit" type="submit" form={formId} disabled={pending} className="min-h-11">{pending ? 'Preparando…' : error ? 'Reintentar revisión' : 'Ver propuesta'}</Button>}
    </div>
  </>
}
