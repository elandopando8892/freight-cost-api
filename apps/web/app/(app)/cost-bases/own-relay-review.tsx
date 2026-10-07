'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { fetcher, ClientApiError, sessionExpiredEvent } from '@/lib/fetcher'
import { ownRelayPath, parseOwnRelayReview, relayDates, type RelayContext, type RelayReview } from '@/lib/own-relay-review'
import styles from './own-relay-review.module.css'
import { versionPlanningPath,parsePlanningView,type PlanningView,type PlanningCommand } from '@/lib/version-planning'
import {FamilyProposalPanel} from './family-proposal-panel'

const usd = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(n)
const scopeKey=(scope:{orgId:string;sub:string})=>JSON.stringify([scope.orgId,scope.sub])
const resources = { MX_TRACTOR: 'Tractor México', US_TRACTOR: 'Tractor EE. UU.', SHARED_TRAILER: 'Caja compartida (1)' }
const concepts: Record<string, string> = {
  MX_ROAD_FUEL: 'Diésel en carretera MX', US_ROAD_FUEL: 'Diésel en carretera US',
  MX_IDLE_FUEL: 'Diésel en ralentí MX', US_IDLE_FUEL: 'Diésel en ralentí US', MX_DEF: 'DEF MX', US_DEF: 'DEF US',
  MX_DRIVER_TOTAL: 'Operadores MX', US_DRIVER_TOTAL: 'Operadores y viáticos US',
  MX_ATTACHED_MAINT_LUBE: 'Mantenimiento y lubricantes MX con caja', MX_BOBTAIL_MAINT_LUBE: 'Mantenimiento y lubricantes MX sin caja',
  US_ATTACHED_MAINT_LUBE: 'Mantenimiento US con caja', MX_ATTACHED_TIRES: 'Llantas MX con caja',
  MX_BOBTAIL_TIRES: 'Llantas MX sin caja', US_ATTACHED_TIRES: 'Llantas US con caja',
  MX_ROAD_TOLLS: 'Peajes MX', US_ROAD_TOLLS: 'Peajes US', BRIDGE_TOLLS: 'Cruces de puente',
  HANDOFF_INCREMENTAL_SERVICES: 'Servicios adicionales de relevo', MX_TRAVEL_EXPENSES: 'Viáticos MX',
  SUPPLEMENTAL_CARGO_VALUE_INSURANCE: 'Seguro suplementario por valor de mercancía',
}

export function OwnRelayReview({ expectedOrgId,initialPlanning }: { expectedOrgId: string;initialPlanning?:PlanningView }) {
  const [context, setContext] = useState<RelayContext>(initialPlanning?.latest?.selection??{ cycleId: 'NETWORK_EXPECTED_EMPTY_PROXY', fundingMode: 'CASH',
    fxDate: '2026-09-30', restInterpretation: 'RATE_EXCLUDES_WEEKLY_REST' })
  const [planning,setPlanning]=useState(initialPlanning),[note,setNote]=useState(initialPlanning?.latest?.note??'')
  const [accepted,setAccepted]=useState(false),[notice,setNotice]=useState(initialPlanning?.latest?'Cálculo guardado recuperado de esta versión.':'')
  const pending=useRef<PlanningCommand|null>(null)
  const [uncertain,setUncertain]=useState(false)
  const [persisting,setPersisting]=useState(false)
  const [familyLocked,setFamilyLocked]=useState(false)
  const [data, setData] = useState<RelayReview | null>(initialPlanning?.latest?{...initialPlanning.latest.calculation,scope:initialPlanning.scope}:null), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [expired, setExpired] = useState(false)
  const generation = useRef(0), controller = useRef<AbortController | null>(null)
  const identity = useRef<string | null>(initialPlanning?scopeKey(initialPlanning.scope):null), fingerprint = useRef<string | undefined>(initialPlanning?.latest?.calculation.sha256)
  useEffect(() => {
    function wipe() {
      generation.current++; controller.current?.abort(); identity.current = null; fingerprint.current = undefined
      setData(null); setBusy(false); setExpired(true)
      pending.current=null;setPlanning(undefined);setNote('');setAccepted(false);setNotice('')
    }
    window.addEventListener(sessionExpiredEvent, wipe); window.addEventListener('pagehide', wipe)
    return () => { generation.current++; controller.current?.abort(); window.removeEventListener(sessionExpiredEvent, wipe); window.removeEventListener('pagehide', wipe) }
  }, [expectedOrgId])
  function change(next: RelayContext) {
    if(uncertain||persisting||familyLocked)return
    generation.current++; controller.current?.abort(); setData(null); setBusy(false); setError(''); setContext(next)
    setAccepted(false);setNotice('');pending.current=null
  }
  function restore(next:PlanningView) {
    setPlanning(next);pending.current=null;setUncertain(false);setAccepted(false);setNote(next.latest?.note??'')
    if(next.latest){setContext(next.latest.selection);setData({...next.latest.calculation,scope:next.scope});fingerprint.current=next.latest.calculation.sha256}
    else setData(null)
  }
  async function persistence(save:boolean) {
    if(!initialPlanning||!planning||busy||expired||familyLocked)return
    if(save&&(!data||!accepted||!planning.editable)&&!pending.current)return
    const current=++generation.current
    controller.current?.abort();controller.current=new AbortController();setBusy(true);setPersisting(true);setError('');setNotice('')
    if(save)pending.current??={context:planning.context,selection:context,expectedRevision:planning.revision,
      expectedVersionFingerprint:planning.versionFingerprint,expectedSnapshot:data!.sha256,requestId:crypto.randomUUID(),planningAccepted:true,note}
    try {
      const path=`/api/v1${versionPlanningPath(planning.context.baseId,planning.context.versionId)}`
      const next=parsePlanningView(await fetcher(path,{method:save?'PUT':'GET',...(save?{json:pending.current}:{}),
        silent:true,cache:'no-store',signal:controller.current.signal}),initialPlanning)
      if(current!==generation.current)return
      restore(next);setNotice(save?(next.replayed?'Guardado recuperado sin duplicar.':'Cálculo guardado con su escenario, fuentes y supuestos.'):'Cálculo guardado recuperado de esta versión.')
    }catch(cause){
      if(current!==generation.current)return
      if(cause instanceof ClientApiError&&[401,403].includes(cause.status)||cause instanceof Error&&cause.message.startsWith('PLANNING_RESPONSE_')){setExpired(true);setData(null);setPlanning(undefined);setNote('');pending.current=null}
      else if(save)setUncertain(true)
      setError(cause instanceof ClientApiError&&cause.status===409?'La versión o revisión cambió. Recupera el cálculo guardado antes de continuar.'
        :cause instanceof ClientApiError&&[401,403].includes(cause.status)?'Recupera el acceso para continuar; se retiraron los importes.'
          :save?'No se confirmó el guardado. Recupera para comprobarlo o reintenta el mismo recibo sin cambiar los datos.':'No se pudo recuperar el cálculo. No se sustituyó por otra versión.')
    }finally{if(current===generation.current){setBusy(false);setPersisting(false)}}
  }
  async function load() {
    if (busy || expired || uncertain || familyLocked) return
    const current = ++generation.current
    controller.current?.abort(); controller.current = new AbortController(); setBusy(true); setError(''); setData(null)
    try {
      const next = parseOwnRelayReview(await fetcher(ownRelayPath(context, fingerprint.current),
        { silent: true, cache: 'no-store', signal: controller.current.signal }), context, expectedOrgId)
      if (current !== generation.current) return
      const scope = scopeKey(next.scope)
      if (identity.current && identity.current !== scope) {
        setExpired(true); identity.current = null; fingerprint.current = undefined
        setError('Cambió la cuenta u organización. Recarga para comprobar el acceso.'); return
      }
      identity.current = scope; fingerprint.current = next.sha256; setData(next)
    } catch (cause) {
      if (current !== generation.current) return
      if (cause instanceof ClientApiError && [401, 403, 409].includes(cause.status)) setExpired(true)
      setError(cause instanceof ClientApiError && cause.status === 401 ? 'Sesión vencida. Inicia sesión de nuevo.'
        : cause instanceof ClientApiError && cause.status === 403 ? 'La revisión requiere ADMIN u OPERATOR y una organización válida.'
          : cause instanceof ClientApiError && cause.status === 409 ? 'La referencia cambió. Recarga antes de continuar.'
            : 'No se pudo verificar la revisión o su contexto. Recarga y vuelve a consultar; no se muestra un resultado alternativo.')
    } finally { if (current === generation.current) setBusy(false) }
  }
  return <section className={styles.root} aria-label="Planeación de relevo propio">
    <header><h2 className="text-xl font-bold">Relevo propio MX/US, misma caja 53′</h2>
      <p>México, DF → Fort Smith, AR 72916 · Puente III / World Trade Bridge.</p>
      <p className={styles.notice}>{initialPlanning?'Planeación con fuentes públicas y supuestos explícitos. Puedes guardar y recuperar este escenario; su aplicación al motor requiere calibración y revisión.':'Revisión no comercial. Es una referencia pública, no el costo de esta empresa ni un cambio al perfil V3 de la base. Sin guardar, adoptar, cotizar o publicar.'}</p>
      {planning&&<p>Revisión guardada {planning.revision} · {planning.latest?`Guardado ${new Date(planning.latest.savedAt).toLocaleString('es-MX')}`:'Aún sin cálculo guardado en esta versión.'}</p>}</header>
    <div className={styles.controls}>
      <label>Ciclo de comparación<select aria-label="Ciclo de comparación" value={context.cycleId} disabled={expired||persisting||uncertain||familyLocked} onChange={e => change({ ...context, cycleId: e.target.value as RelayContext['cycleId'] })}>
        <option value="NETWORK_EXPECTED_EMPTY_PROXY">Red · vacío esperado</option><option value="DEDICATED_EMPTY_SAME_BOX_RETURN">Dedicado · misma caja de retorno</option></select></label>
      <label>Financiación de referencia<select aria-label="Financiación de referencia" value={context.fundingMode} disabled={expired||persisting||uncertain||familyLocked} onChange={e => change({ ...context, fundingMode: e.target.value as RelayContext['fundingMode'] })}>
        <option value="CASH">Contado</option><option value="FINANCED">Financiado</option></select></label>
      <label>Fecha FIX de comparación<select aria-label="Fecha FIX de comparación" value={context.fxDate} disabled={expired||persisting||uncertain||familyLocked} onChange={e => change({ ...context, fxDate: e.target.value as RelayContext['fxDate'] })}>
        {relayDates.map(date => <option key={date}>{date}</option>)}</select></label>
      <label>Pago MX de descanso<select aria-label="Pago MX de descanso" value={context.restInterpretation} disabled={expired||persisting||uncertain||familyLocked} onChange={e => change({ ...context, restInterpretation: e.target.value as RelayContext['restInterpretation'] })}>
        <option value="RATE_EXCLUDES_WEEKLY_REST">Tarifa excluye descanso</option><option value="RATE_INCLUDES_WEEKLY_REST">Tarifa incluye descanso</option></select></label>
    </div>
    <p className="text-sm">Las selecciones sólo comparan hipótesis existentes; no confirman fecha del viaje, financiación o contrato salarial.</p>
    <div className="flex flex-wrap gap-3"><Button type="button" onClick={load} disabled={busy || expired||uncertain||familyLocked}>{busy ? 'Verificando planeación…' : initialPlanning?'Calcular escenario':'Consultar planeación'}</Button>
    {initialPlanning&&<Button variant="outline" type="button" disabled={busy||expired||familyLocked} onClick={()=>persistence(false)}>Recuperar cálculo guardado</Button>}</div>
    {notice&&<p role="status">{notice}</p>}
    {error && <p role="alert">{error}</p>}
    {expired && <p role="alert">Acceso o referencia invalidada. Recarga e inicia sesión si corresponde; se retiraron los importes.</p>}
    <p role="status" aria-busy={busy}>{!data ? 'Sin revisión cargada. No hay cifras de demostración como fallback.' : `${data.sourcePinCount} fuentes fijadas · caja única · 0 inputs adoptados · sin calibración operativa.`}</p>
    {data && <>
      <div className={styles.scroll} role="region" aria-label="Desglose de recursos" tabIndex={0}>
        <table><caption>USD por ciclo · CFU fijo / CVU variable · planeación</caption>
          <thead><tr><th scope="col">Recurso</th><th scope="col">CFU</th><th scope="col">CVU</th><th scope="col">Costo</th></tr></thead>
          <tbody>{data.case.resources.map(r => <tr key={r.resourceId}><th scope="row">{resources[r.resourceId]}</th><td>{usd(r.cfuUsd)}</td><td>{usd(r.cvuUsd)}</td><td>{usd(r.costUsd)}</td></tr>)}</tbody>
          <tfoot><tr><th scope="row">Costo de planeación</th><td>{usd(data.case.outputs.cfuUsd)}</td><td>{usd(data.case.outputs.cvuUsd)}</td><td>{usd(data.case.outputs.productiveCostUsd)}</td></tr></tfoot>
        </table>
      </div>
      <p className="text-sm">Cifras redondeadas; las sumas usan precisión completa. El desgaste variable de la caja ya está en los componentes con caja de MX/US: su CVU separado en cero evita sumarlo otra vez, no significa desgaste gratuito.</p>
      <p>Compra y venta: no calculadas. Este resultado no habilita cotización. FIX de referencia: {data.case.mxnPerUsd} MXN/USD.</p>
      {planning&&<fieldset disabled={busy||expired||!planning.editable||uncertain||familyLocked} className="grid gap-3 rounded border p-4">
        <legend className="px-2 font-semibold">Conservar este escenario en la versión</legend>
        <label className="flex items-start gap-2"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>Comprendo que es un escenario de planeación con supuestos provisionales; guardarlo no calibra ni adopta inputs.</label>
        <label className="grid gap-2">Nota de revisión (opcional)<textarea className="min-h-24 rounded border bg-background p-3" maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></label>
        <Button type="button" disabled={!accepted||busy||expired||!planning.editable||familyLocked} onClick={()=>persistence(true)}>Guardar cálculo</Button>
      </fieldset>}
      {uncertain&&<Button type="button" disabled={busy||expired} onClick={()=>persistence(true)}>Reintentar mismo guardado</Button>}
      {planning&&!expired&&!busy&&!uncertain&&<FamilyProposalPanel
        key={JSON.stringify([planning.scope,planning.context,planning.bindingSha256,planning.versionFingerprint,planning.latest?.requestId])}
        planning={planning} onLockChange={setFamilyLocked}/>}
      <details><summary>Componentes variables y exclusiones documentadas</summary>
        <ul>{data.case.variableCosts.map(v => <li key={v.conceptId}><strong>{concepts[v.conceptId] ?? v.conceptId}</strong> · {resources[v.resourceId]} · {v.amountUsd === null ? 'Exclusión de alcance, no tarifa cero' : usd(v.amountUsd)}
          <p>{v.exclusionOrZeroRationale ?? v.derivation}</p><small>Referencias: {v.evidenceIds.join(', ')}</small></li>)}</ul>
      </details>
      <details><summary>Reservas fijas y límites de aplicación</summary><p>Partidas presupuestadas, no primas ni tarifas observadas:</p><ul>{data.case.reserves.map(id => <li key={id}>{id}</li>)}</ul>
        <ul>{data.limitations.map(l => <li key={l}>{l}</li>)}</ul></details>
      <details><summary>Fuentes y procedencia de la revisión</summary><p>Las fuentes conservan observaciones originales; no acreditan por sí solas septiembre, este carrier o este itinerario.</p>
        {data.evidence.map(e => <details key={e.id}><summary>{e.id}</summary><a href={e.url} target="_blank" rel="noopener noreferrer">Consultar fuente pública</a><p>Observación: {e.observedAt}</p><p>{e.locator}</p><p>{e.limitations}</p></details>)}
        <p>Huella de revisión: {data.sha256}</p><p>Compositor B2: {data.sourceScenarioSha256}</p>
      </details>
    </>}
  </section>
}
