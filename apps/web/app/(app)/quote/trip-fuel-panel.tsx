'use client'

import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TripFuelReview, TripFuelSelection } from '@/lib/trip-fuel-contract'

/** A trip choice, not an editor for the cost base or the global fuel cache. */
export function TripFuelPanel({ review, busy, onConfirm }: {
  review: TripFuelReview; busy: boolean; onConfirm: (choice: TripFuelSelection) => void
}) {
  const id = useId()
  const [mode,setMode]=useState<'REFERENCE'|'MANUAL'>('REFERENCE')
  const [accepted,setAccepted]=useState(false), [price,setPrice]=useState('')
  const [observed,setObserved]=useState(''), [source,setSource]=useState(''), [error,setError]=useState('')
  function confirm() {
    setError('')
    if(mode==='REFERENCE'){
      if(!accepted || review.referencePriceUsdGal===null){setError('Acepta la limitación de la referencia o introduce tu precio propio.');return}
      onConfirm({contextHash:review.contextHash,mode,provisionalAccepted:true});return
    }
    const value=Number(price), date=new Date(`${observed}T00:00:00Z`)
    if(!price.trim()||!Number.isFinite(value)||value<=0){setError('Introduce un precio mayor que cero en USD por galón estadounidense.');return}
    if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==observed||observed>review.serviceDate||observed>new Date().toISOString().slice(0,10)){setError('La fecha observada debe ser válida, no futura ni posterior al servicio.');return}
    if(source.trim().length<4||source.trim().length>240){setError('Indica la fuente y premisa del precio propio (4–240 caracteres).');return}
    onConfirm({contextHash:review.contextHash,mode,priceUsdGal:value,observationDate:observed,sourceReference:source.trim()})
  }
  return <section className="min-w-0 rounded-md border border-primary/30 bg-card p-4" aria-labelledby={`${id}-title`}>
    <p className="text-xs font-semibold uppercase tracking-widest text-primary">Inputs de este viaje · no modifica la base</p>
    <h2 id={`${id}-title`} className="mt-1 text-xl font-semibold">Revisa el diésel de EE. UU.</h2>
    <p className="mt-2 break-words text-sm">{review.origin} → {review.destination} · Servicio {review.serviceDate}</p>
    <dl className="my-4 grid gap-3 rounded border bg-muted/20 p-3 sm:grid-cols-3">
      <div><dt className="text-xs text-muted-foreground">Estado / región del catálogo</dt><dd>{review.outState} / {review.region ?? 'No documentada'}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Referencia · USD/gal US</dt><dd className="text-xl font-semibold">{review.referencePriceUsdGal===null?'Sin precio':review.referencePriceUsdGal.toLocaleString('en-US',{maximumFractionDigits:6})}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Fecha de observación</dt><dd>Desconocida · provisional</dd></div>
    </dl>
    <p className="text-sm text-muted-foreground">{review.warning}</p>
    <fieldset disabled={busy} className="mt-4 grid gap-3">
      <legend className="mb-2 text-sm font-semibold">Elige el precio para este viaje</legend>
      <label className="flex items-center gap-2 text-sm"><input type="radio" name={`${id}-mode`} checked={mode==='REFERENCE'} onChange={()=>{setMode('REFERENCE');setError('')}}/> Usar referencia del catálogo</label>
      <label className="flex items-center gap-2 text-sm"><input type="radio" name={`${id}-mode`} checked={mode==='MANUAL'} onChange={()=>{setMode('MANUAL');setError('')}}/> Introducir precio propio</label>
      {mode==='REFERENCE'?<label className="flex items-start gap-2 rounded border p-3 text-sm"><input type="checkbox" className="mt-1" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> Acepto esta referencia provisional; no acredita las compras reales ni la semana del viaje.</label>:
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">Precio propio · USD/gal US<Input type="number" min="0" step="any" value={price} onChange={e=>setPrice(e.target.value)}/></label>
          <label className="grid gap-1 text-sm">Fecha de observación<Input type="date" value={observed} max={review.serviceDate < new Date().toISOString().slice(0,10)?review.serviceDate:new Date().toISOString().slice(0,10)} onChange={e=>setObserved(e.target.value)}/></label>
          <label className="grid gap-1 text-sm sm:col-span-2">Fuente y premisa de abastecimiento<Input maxLength={240} value={source} onChange={e=>setSource(e.target.value)} placeholder="Ej. contrato de compra para este tramo; precio neto efectivo"/></label>
        </div>}
    </fieldset>
    {error&&<p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    <p className="my-3 text-xs text-muted-foreground">Se congelará con la cotización. FSC: {review.fscUsdMile} USD/mi (sin recalcular). La mezcla fronteriza MX/US de la base no cambia.</p>
    <Button type="button" disabled={busy} onClick={confirm}>{busy?'Calculando…':'Confirmar y calcular'}</Button>
  </section>
}
