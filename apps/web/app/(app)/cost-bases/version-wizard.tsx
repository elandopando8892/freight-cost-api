'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { versionPlanningHref } from '@/lib/version-planning'
import { Input } from '@/components/ui/input'
import { ClientApiError, fetcher, sessionExpiredEvent } from '@/lib/fetcher'
import { sameWizardContext, versionWizardPath, type VersionWizardSave, type VersionWizardView, type WizardDecision } from '@/lib/cost-base-wizard-contract'
import { hasContinuousScale, positionOf, selectPosition, optionalManual } from '../../../../../docs/prototypes/cost-base-wizard-w1/scale.mjs'
import styles from './version-wizard.module.css'
import { OwnRelayReview } from './own-relay-review'

type Choice = Pick<WizardDecision,'mode'|'value'|'justification'|'provisionalAccepted'> & { identification: WizardDecision['identification'] | '' }
type Anchor = Pick<Choice,'mode'|'value'|'provisionalAccepted'>
const number = (value: number | null) => value === null ? 'No disponible' : new Intl.NumberFormat('es-MX',{maximumFractionDigits:6}).format(value)
const modeName = (mode: Choice['mode']) => ({ LOW:'Mínimo observado',CENTRAL:'Promedio publicado',HIGH:'Máximo observado',MARKSMAN:'Referencia MARKSMAN provisional',MANUAL:'Estimación propia' }[mode])
const messages: Record<string,string> = {
  WIZARD_VERSION_CHANGED:'El perfil o los parámetros cambiaron. Recupera la versión y revisa tus decisiones.',
  DRAFT_REVISION_CONFLICT:'Otra sesión guardó una decisión. Recupera lo guardado antes de continuar.',
  PROVISIONAL_ACCEPTANCE_REQUIRED:'Confirma que aceptas la referencia provisional o introduce tu dato propio.',
  JUSTIFICATION_REQUIRED:'Explica las condiciones que justifican esta elección.',
  LOCAL_CUT_REQUEST_LIMIT:'Se alcanzó el límite de 128 guardados de esta versión.',
  STALE_REFERENCE:'La referencia cambió. Revisa el expediente antes de continuar.',
  VERSION_NOT_EDITABLE:'Esta versión ya no es editable. Recupera su estado actual.',
  WIZARD_REVIEW_SOURCE_CHANGED:'La versión fuente cambió. Hace falta revisar el vínculo B2 antes de recuperar las propuestas.',
  WIZARD_REVIEW_REFERENCE_CHANGED:'La referencia B2 cambió. Hace falta revisar el vínculo antes de continuar.',
  WIZARD_REVIEW_HISTORY_CONFLICT:'El historial no corresponde al vínculo de revisión. No se reiniciaron tus recibos.',
  WIZARD_REVIEW_BINDING_AMBIGUOUS:'La versión tiene más de un vínculo de revisión. No se seleccionó uno automáticamente.',
  WIZARD_REVIEW_BINDING_INVALID:'No se pudo verificar el vínculo de revisión de esta versión.',
  WIZARD_REVIEW_TARGET_NOT_EDITABLE:'El contexto de revisión necesita una base y versión borrador no activa.',
}
function initialChoice(view: VersionWizardView, index: number): Choice {
  const saved = view.draft.decisions.find(d=>d.conceptId===view.catalog.cards[index].id)
  return saved ? { ...saved } : {mode:'MARKSMAN',value:view.catalog.cards[index].standard.value,identification:'',justification:'',provisionalAccepted:false}
}
const anchorOf = (choice: Choice): Anchor => ({mode:choice.mode,value:choice.value,provisionalAccepted:choice.provisionalAccepted})

export function VersionWizard({ initial, canEdit }: { initial: VersionWizardView; canEdit: boolean }) {
  const [view,setView]=useState<VersionWizardView|null>(initial),[index,setIndex]=useState(0)
  const [choice,setChoice]=useState(()=>initialChoice(initial,0)),[manual,setManual]=useState(()=>choice.mode==='MANUAL'?String(choice.value):'')
  const [dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const pending=useRef<VersionWizardSave|null>(null), controller=useRef<AbortController|null>(null), alive=useRef(true)
  const sessionEpoch=useRef(0)
  const anchor=useRef<Anchor>(choice.mode==='MANUAL'?{mode:'MARKSMAN',value:initial.catalog.cards[0].standard.value,provisionalAccepted:false}:anchorOf(choice))
  const scope=initial.draft.context
  const path=`/api/v1${versionWizardPath(scope.baseId,scope.versionId)}`
  useEffect(()=>{
    alive.current=true
    const expire=()=>{sessionEpoch.current++;controller.current?.abort();pending.current=null;setView(null);setError('Tu sesión venció. Inicia sesión de nuevo para recuperar tus decisiones.');setBusy(false)}
    window.addEventListener(sessionExpiredEvent,expire)
    return ()=>{alive.current=false;controller.current?.abort();window.removeEventListener(sessionExpiredEvent,expire)}
  },[])
  function reset(next: VersionWizardView, nextIndex=index){
    const nextChoice=initialChoice(next,nextIndex)
    setView(next);setIndex(nextIndex);setChoice(nextChoice);setManual(nextChoice.mode==='MANUAL'?String(nextChoice.value):'');setDirty(false)
    anchor.current=nextChoice.mode==='MANUAL'?{mode:'MARKSMAN',value:next.catalog.cards[nextIndex].standard.value,provisionalAccepted:false}:anchorOf(nextChoice)
    pending.current=null
  }
  function update(patch: Partial<Choice>){setChoice(current=>({...current,...patch}));pending.current=null;setDirty(true);setError('')}
  function failure(cause: unknown){
    if(cause instanceof ClientApiError && ([401,403,404].includes(cause.status) || cause.message.startsWith('WIZARD_REVIEW_'))){setView(null);pending.current=null}
    setError(cause instanceof ClientApiError && cause.status===401?'Tu sesión venció. Inicia sesión de nuevo.':cause instanceof Error?(messages[cause.message]??cause.message):'No se pudo guardar. Conservamos tu elección para reintentar.')
  }
  async function recover(){
    if(busy)return;setBusy(true);setError('');controller.current=new AbortController();const epoch=sessionEpoch.current
    try{const next=await fetcher<VersionWizardView>(path,{silent:true,signal:controller.current.signal})
      if(!alive.current||epoch!==sessionEpoch.current)return
      if(!sameWizardContext(initial,next))throw new ClientApiError(403,null,'La respuesta corresponde a otra empresa o versión.')
      reset(next);setNotice('Decisiones recuperadas de esta versión.')
    }catch(cause){if(alive.current&&epoch===sessionEpoch.current)failure(cause)}finally{if(alive.current&&epoch===sessionEpoch.current)setBusy(false)}
  }
  async function save(){
    if(!view||busy||!canEdit||view.version.status!=='DRAFT'||view.version.isActive||view.version.base.status==='ARCHIVED')return
    if(!Number.isFinite(choice.value)||choice.value<0){setError('Introduce un importe finito y no negativo, o conserva MARKSMAN.');return}
    if(!choice.identification){setError('Indica si las premisas describen tu operación.');return}
    if(choice.mode!=='MANUAL'&&!choice.provisionalAccepted){setError(messages.PROVISIONAL_ACCEPTANCE_REQUIRED);return}
    setBusy(true);setError('');controller.current=new AbortController();const epoch=sessionEpoch.current
    pending.current??={context:view.draft.context,expectedRevision:view.draft.revision,expectedVersionFingerprint:view.versionFingerprint,
      requestId:crypto.randomUUID(),decisions:[{mode:choice.mode,value:choice.value,identification:choice.identification,
        justification:choice.justification,provisionalAccepted:choice.provisionalAccepted,
        conceptId:view.catalog.cards[index].id,referenceRevision:view.catalog.revision}]}
    // Choice may carry stored read-only fields; send only the strict decision contract.
    const d=pending.current.decisions[0]
    pending.current.decisions=[{conceptId:d.conceptId,referenceRevision:d.referenceRevision,mode:d.mode,value:d.value,
      identification:d.identification,justification:d.justification,provisionalAccepted:d.provisionalAccepted}]
    try{const next=await fetcher<VersionWizardView>(path,{method:'PUT',json:pending.current,silent:true,signal:controller.current.signal})
      if(!alive.current||epoch!==sessionEpoch.current)return
      if(!sameWizardContext(initial,next))throw new ClientApiError(403,null,'La respuesta corresponde a otra empresa o versión.')
      reset(next);setNotice('Decisión guardada en esta versión. Los inputs del motor no se modificaron.')
    }catch(cause){if(alive.current&&epoch===sessionEpoch.current)failure(cause)}finally{if(alive.current&&epoch===sessionEpoch.current)setBusy(false)}
  }
  if(!view)return <section role="alert" className="rounded border p-6"><h2 className="font-bold">Recupera el acceso antes de continuar</h2><p>{error}</p><a href="/login" className="underline">Iniciar sesión</a></section>
  const card=view.catalog.cards[index],continuous=hasContinuousScale(card.statistics)
  const standardPosition=positionOf(card.standard.value,card.statistics),position=positionOf(choice.value,card.statistics)
  const editable=canEdit&&view.version.status==='DRAFT'&&!view.version.isActive&&view.version.base.status!=='ARCHIVED'
  function preset(mode:'LOW'|'CENTRAL'|'HIGH'|'MARKSMAN'){
    const value=mode==='MARKSMAN'?card.standard.value:card.statistics[{LOW:'minimum',CENTRAL:'central',HIGH:'maximum'}[mode] as 'minimum'|'central'|'maximum']
    if(value===null)return
    const next={mode,value,provisionalAccepted:false};anchor.current=next;setManual('');update(next)
  }
  return <section className="space-y-5">
    <header><h1 className="text-2xl font-bold">Armar supuestos de {view.version.base.name}</h1><p className="text-sm text-muted-foreground">Versión {view.version.number} · {view.version.status} · revisión del wizard {view.draft.revision}</p></header>
    <p className="rounded border border-primary p-3 text-sm">Referencias de septiembre 2026 para planeación binacional con caja seca. Guardar aquí conserva propuestas y evidencia; no aplica inputs, calibra ni activa la base.</p>
    <p className="rounded border p-3 text-sm" role="note">{view.reviewContext
      ? 'Contexto de revisión: relevo propio MX/US, misma caja. Perfil económico de la versión: no modificado. Sólo propuestas no comerciales; no acredita soporte V3 para cotizar.'
      : 'Contexto histórico V3. Las referencias B2 son comparadores, no un vínculo de relevo propio de esta versión.'}</p>
    {view.reviewContext&&<a className="inline-block min-h-11 rounded border border-primary px-4 py-3 font-semibold" href={versionPlanningHref(scope.baseId,scope.versionId)}>Calcular y guardar escenario de planeación</a>}
    <details className="min-w-0 rounded border bg-card p-4"><summary className="min-h-11 cursor-pointer py-2 font-semibold">Revisar escenario de relevo propio · no comercial</summary>
      <OwnRelayReview key={scope.orgId} expectedOrgId={scope.orgId} />
    </details>
    {!editable&&<p className="rounded border p-3 text-sm">Sólo consulta: necesitas ADMIN y una versión borrador no activa para guardar.</p>}
    {view.staleForVersion&&<p role="alert" className="rounded border border-primary p-3">La versión cambió desde la revisión de algunas decisiones. Revisa y confirma cada card afectada.</p>}
    {error&&<p role="alert" className="rounded border border-primary p-3">{error}</p>}<p role="status">{notice}</p>
    <Button variant="outline" disabled={busy} onClick={recover}>{dirty?'Descartar cambios y recuperar':'Recuperar decisiones guardadas'}</Button>
    <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
      <nav aria-label="Conceptos del wizard" className="flex flex-wrap content-start gap-2 lg:flex-col">{view.catalog.cards.map((c,i)=><Button key={c.id} variant={i===index?'default':'outline'} aria-current={i===index?'step':undefined} disabled={busy} className="h-auto whitespace-normal text-left" onClick={()=>{
        if(dirty){setError('Guarda la decisión o descarta los cambios antes de cambiar de concepto.');return}
        reset(view,i);setError('')
      }}>{c.label}</Button>)}</nav>
      <article className="min-w-0 rounded border bg-card p-4 sm:p-6" aria-label="Concepto seleccionado">
        <h2 className="text-xl font-bold">{card.label}</h2><p className="text-sm text-muted-foreground">{card.unit} · observación {card.evidence.observationDate} · aplicabilidad provisional</p>
        <fieldset disabled={!editable||busy} className="mt-6 min-w-0 space-y-4">
          <label htmlFor="estimate-scale" className="block text-sm font-semibold">Ubica tu estimación</label>
          <div className={`${styles.track} ${continuous?'':styles.incomplete}`}>
            <div className={styles.rail} aria-hidden="true" />
            {standardPosition!==null&&<span className={styles.marker} style={{left:`${standardPosition}%`,transform:standardPosition<20?'none':standardPosition>80?'translateX(-100%)':undefined}}>Estándar MARKSMAN<br/><small>Referencia provisional</small></span>}
            <input id="estimate-scale" type="range" min={0} max={100} step={1} disabled={!continuous} className={styles.slider} data-unlocated={position===null} value={position??50}
              aria-valuetext={`${number(choice.value)} ${card.unit}; ${modeName(choice.mode)}`} aria-describedby="scale-explanation"
              onChange={event=>{const next=selectPosition(Number(event.target.value),card) as Anchor|null;if(next){anchor.current=next;setManual('');update(next)}}} />
          </div>
          <div className="grid grid-cols-3 gap-2">{([['LOW','Mínimo',card.statistics.minimum],['CENTRAL','Promedio',card.statistics.central],['HIGH','Máximo',card.statistics.maximum]] as const).map(([mode,label,value],i)=><button key={mode} type="button" disabled={value===null} onClick={()=>preset(mode)} className={`min-h-11 min-w-0 text-sm disabled:opacity-50 ${i===0?'text-left':i===2?'text-right':'text-center'}`}><span className="block">{label}</span><strong className="block">{number(value)}</strong><small className="block">{value===null?'Falta evidencia':card.unit}</small></button>)}</div>
          <p>Tu elección: <output className="font-bold">{number(choice.value)} {card.unit}</output><span className="block text-sm">{modeName(choice.mode)}</span></p>
          <p id="scale-explanation" className="text-sm text-muted-foreground">{position===null?'Tu valor no tiene posición demostrable en el rango disponible.':continuous?'Escala interpolada, no percentiles de mercado.':'Faltan extremos documentados; puedes usar MARKSMAN sin capturar un dato propio.'}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="flex-1 text-sm" htmlFor="manual-value">Dato propio (opcional) · {card.unit}<Input id="manual-value" type="number" step="any" value={manual} onChange={event=>{
            setManual(event.target.value);update(event.target.validity.badInput?{mode:'MANUAL',value:NaN,provisionalAccepted:false}:optionalManual(event.target.value,anchor.current) as Anchor)
          }}/></label><Button type="button" variant="outline" onClick={()=>preset('MARKSMAN')}>Usar Estándar MARKSMAN</Button></div>
          <p className="text-sm text-muted-foreground">Si no tienes un dato, conserva la selección. Vaciar el campo recupera la referencia anterior.</p>
          {standardPosition===null&&<p className="text-sm">El estándar no tiene posición demostrable; puedes usar su valor con el botón.</p>}
          {choice.mode!=='MANUAL'&&<label className="flex gap-2 text-sm"><input type="checkbox" checked={choice.provisionalAccepted} onChange={event=>{
            const patch={provisionalAccepted:event.target.checked};anchor.current={...anchor.current,...patch};update(patch)
          }}/>Acepto esta referencia provisional para estimar, no como costo real o calibración demostrada.</label>}
          <h3 className="font-semibold">¿Estas premisas describen tu operación?</h3><ul className="list-disc space-y-2 border-l-2 border-primary pl-6 text-sm">{card.premises.map(p=><li key={p}>{p}</li>)}</ul>
          <div className="flex flex-wrap gap-2">{([['YES','Me identifico'],['PARTIAL','En parte'],['NO','No me identifico']] as const).map(([id,label])=><Button key={id} type="button" variant={choice.identification===id?'default':'outline'} aria-pressed={choice.identification===id} onClick={()=>update({identification:id})}>{label}</Button>)}</div>
          <label htmlFor="decision-note" className="block text-sm">Mis condiciones y justificación<textarea id="decision-note" maxLength={1000} className="mt-1 block min-h-20 w-full rounded border bg-background p-3" value={choice.justification} onChange={e=>update({justification:e.target.value})}/></label>
          {editable&&<Button type="button" onClick={save}>{busy?'Guardando…':'Guardar decisión en esta versión'}</Button>}
        </fieldset>
        <details className="mt-5 break-words border-t pt-4 text-sm"><summary className="cursor-pointer font-semibold">Fuente, unidad y límites</summary><a href={card.evidence.url} target="_blank" rel="noopener noreferrer" className="my-3 block underline">{card.evidence.id}</a><p>{card.evidence.locator}</p><p>{card.evidence.normalization}</p><ul className="list-disc pl-6">{card.limitations.map(l=><li key={l}>{l}</li>)}</ul><p className="mt-3 break-all">SHA256 {card.evidence.sha256}</p></details>
      </article>
    </div>
    <div className="rounded border p-4"><h2 className="font-bold">Decisiones de esta versión</h2><p className="text-sm">{view.draft.decisions.length} decisiones · {view.draft.nativeValues.length} inputs preparados · 0 inputs aplicados · 0 adopciones.</p>
      <ul className="mt-3 space-y-2 text-sm">{view.draft.decisions.map(d=><li key={d.conceptId}>{view.catalog.cards.find(c=>c.id===d.conceptId)!.label}: {number(d.value)} {view.catalog.cards.find(c=>c.id===d.conceptId)!.unit} · {modeName(d.mode)}{view.reviewFingerprints[d.conceptId]!==view.versionFingerprint?' · revisión de contexto pendiente':''}</li>)}</ul>
      <p className="mt-3 text-sm text-muted-foreground">Mantenimiento permanece como referencia compuesta, sin reparto artificial entre servicios PM. La aplicación al motor y revisión integral siguen pendientes.</p>
    </div>
  </section>
}
