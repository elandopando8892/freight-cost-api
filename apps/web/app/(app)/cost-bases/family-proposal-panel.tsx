'use client'
import {useEffect,useRef,useState} from 'react'
import {Button} from '@/components/ui/button'
import {fetcher,ClientApiError,sessionExpiredEvent} from '@/lib/fetcher'
import {familyProposalPath,parseFamilyProposalView,type FamilyProposalView,type FamilyProposalCommand} from '@/lib/family-proposal'
import type {PlanningView} from '@/lib/version-planning'

export function FamilyProposalPanel({planning,onLockChange}:{planning:PlanningView;onLockChange:(locked:boolean)=>void}){
  const [view,setView]=useState<FamilyProposalView|null>(null),[busy,setBusy]=useState(false),[expired,setExpired]=useState(false)
  const [uncertain,setUncertain]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const pending=useRef<FamilyProposalCommand|null>(null),generation=useRef(0),controller=useRef<AbortController|null>(null)
  useEffect(()=>{
    function cancelRequests(){generation.current++;controller.current?.abort();pending.current=null}
    function wipe(){cancelRequests();setView(null);setBusy(false);setUncertain(false);setExpired(true);setNotice('');setError('')}
    window.addEventListener(sessionExpiredEvent,wipe);window.addEventListener('pagehide',wipe)
    return ()=>{cancelRequests();window.removeEventListener(sessionExpiredEvent,wipe);window.removeEventListener('pagehide',wipe)}
  },[])
  useEffect(()=>{onLockChange(busy||uncertain);return ()=>onLockChange(false)},[busy,uncertain,onLockChange])
  const b=planning.latest
  async function run(save:boolean){
    if(busy||expired||!b)return
    if(save&&!pending.current&&(!view||view.status==='CURRENT'||!planning.editable))return
    const current=++generation.current
    controller.current?.abort();controller.current=new AbortController();setBusy(true);setError('');setNotice('')
    if(save)pending.current??={context:planning.context,expectedRevision:view!.revision,expectedVersionFingerprint:planning.versionFingerprint,
      expectedPlanningRequestId:b.requestId,expectedPlanningRevision:planning.revision,expectedSnapshot:b.calculation.sha256,requestId:crypto.randomUUID()}
    try{
      const next=parseFamilyProposalView(await fetcher(`/api/v1${familyProposalPath(planning.context.baseId,planning.context.versionId)}`,
        {method:save?'PUT':'GET',...(save?{json:pending.current}:{}),cache:'no-store',silent:true,
          signal:AbortSignal.any([controller.current.signal,AbortSignal.timeout(30_000)])}),planning)
      if(current!==generation.current)return
      setView(next)
      if(save||next.status==='CURRENT'){pending.current=null;setUncertain(false)}
      setNotice(save?(next.replayed?(next.status==='CURRENT'?'Propuesta recuperada sin duplicar.':
        'Recibo recuperado sin duplicar. La propuesta es anterior; recupera el cálculo B3 para continuar.'):
        'Propuesta guardada. No se adoptaron inputs ni se publicó la base.'):
        pending.current?'Aún no se encontró una propuesta vigente. Puedes reintentar exactamente el mismo recibo.':'Estado de propuesta recuperado.')
    }catch(cause){
      if(current!==generation.current)return
      if(cause instanceof ClientApiError&&[401,403].includes(cause.status)||cause instanceof Error&&cause.message.startsWith('FAMILY_RESPONSE_')){
        window.dispatchEvent(new Event(sessionExpiredEvent));return
      }
      if(cause instanceof ClientApiError&&[400,409,422].includes(cause.status)){
        pending.current=null;setView(null);setUncertain(false)
        setError('La revisión o referencia cambió. Recupera el cálculo y consulta la propuesta antes de continuar.')
      }else{
        if(save)setUncertain(true)
        setError(save?'No se confirmó el guardado. Consulta su estado o reintenta la misma propuesta; no se genera otro recibo.':'No se pudo consultar. No se muestra una propuesta alternativa.')
      }
    }finally{if(current===generation.current)setBusy(false)}
  }
  return <section aria-label="Propuesta por familias" className="grid gap-3 rounded border p-4">
    <h3 className="text-lg font-semibold">Propuesta por familias</h3>
    <p>Conserva el cálculo guardado como presupuesto de referencia. No adopta inputs ni publica la base.</p>
    <p className="text-sm">Compartida con tu organización. Autoría y fuentes conservadas.</p>
    {!b?<p>Guarda primero el cálculo de esta versión para preparar su propuesta.</p>:<>
      <p className="text-sm">Se usa el cálculo guardado B3, revisión {planning.revision}; no una selección pendiente de guardar.</p>
      <p role="status" aria-busy={busy}>{expired?'Acceso invalidado. Recarga y comprueba la sesión.':busy?'Verificando propuesta…':
        !view?'Consulta primero el estado de esta propuesta.':view.status==='NONE'?'Aún sin propuesta guardada.':
          view.status==='CURRENT'?`Propuesta vigente · revisión ${view.revision}`:`Propuesta anterior · revisión ${view.revision}. No corresponde al cálculo actual.`}</p>
      {view?.latest&&!expired&&<>
        <p>32 partidas fijas · 0 inputs adoptados · sin calibración operativa · no cotizable.</p>
        <details><summary className="min-h-11 cursor-pointer py-2">Fuentes y huella de la propuesta</summary>
          <p>Periodo de referencia: {view.latest.referencePeriod}. Recibo B3: revisión {view.latest.receipt.revision}.</p>
          <p>Política: {view.latest.policyReference.file}</p><p>Huella: {view.latest.fingerprint}</p>
          <p>Snapshot B2: {view.latest.sourceSnapshotSha256}</p>
        </details>
      </>}
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" disabled={busy||expired} onClick={()=>run(false)}>Consultar propuesta</Button>
        <Button type="button" disabled={busy||expired||uncertain||!view||view.status==='CURRENT'||!planning.editable} onClick={()=>run(true)}>Guardar propuesta por familias</Button>
        {uncertain&&<Button type="button" variant="outline" disabled={busy||expired} onClick={()=>run(true)}>Reintentar misma propuesta</Button>}
      </div>
    </>}
    {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
  </section>
}
