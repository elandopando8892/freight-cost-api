import { createRoot } from 'react-dom/client'
import { VersionWizard } from '../../app/(app)/cost-bases/version-wizard'
import { wizardReviewFixture } from '../fixtures/version-wizard'
import type { VersionWizardSave } from '../../lib/cost-base-wizard-contract'
import '../../app/globals.css'
import relaySnapshot from '../../../api/src/modules/engine/b2-own-relay.snapshot.json'
import { RelayQuery } from '../../../api/src/modules/engine/b2-own-relay-contract'

const view=wizardReviewFixture()
const flags=new URLSearchParams(window.location.search)
const syntheticScale=flags.get('scale')==='synthetic'
if(syntheticScale){
  Object.assign(view.catalog.cards[0].statistics,{minimum:10,central:20,maximum:40})
  view.catalog.cards[0].standard.value=30
}
// Only an in-memory UI transport. No Auth, database, adoption or real BFF fallback.
window.fetch=async(path,init)=>{
  const url=new URL(String(path),window.location.origin)
  if(url.pathname==='/api/v1/engine/benchmark-owned-d2d/own-relay-review'){
    if(init?.method && init.method!=='GET')return new Response('',{status:405})
    if(flags.get('role')==='viewer')return new Response(JSON.stringify({error:'Forbidden'}),{status:403})
    if(flags.get('error')==='expired')return new Response('',{status:401})
    const query=RelayQuery.parse(Object.fromEntries(url.searchParams))
    if(query.expectedSnapshot && query.expectedSnapshot!==relaySnapshot.sha256)return new Response('',{status:409})
    const selected=relaySnapshot.payload.cases.find(c=>c.cycleId===query.cycleId&&c.fundingMode===query.fundingMode&&c.fxDate===query.fxDate&&c.restInterpretation===query.restInterpretation)!
    const ids=new Set([...selected.fixedEvidenceIds,...selected.variableCosts.flatMap(v=>v.evidenceIds)])
    const {cases:_cases,sourcePins,evidence,...metadata}=relaySnapshot.payload
    return new Response(JSON.stringify({...metadata,sha256:relaySnapshot.sha256,sourcePinCount:sourcePins.length,
      scope:{sub:'SYNTHETIC-QA-USER',orgId:view.draft.context.orgId},case:selected,evidence:evidence.filter(e=>ids.has(e.id))}),{status:200,headers:{'content-type':'application/json'}})
  }
  if(String(path)!=='/api/v1/cost-bases/qa-base-A/versions/qa-version-A/wizard')throw new Error('QA: solicitud externa bloqueada')
  if(init?.method==='PUT'){
    if(syntheticScale)return new Response(JSON.stringify({error:'Escala sintética: no se permite guardar'}),{status:422})
    if(flags.get('error')==='expired')return new Response('',{status:401})
    if(flags.get('error')==='conflict')return new Response(JSON.stringify({error:'DRAFT_REVISION_CONFLICT'}),{status:409})
    const command=JSON.parse(String(init.body)) as VersionWizardSave
    if(command.expectedRevision!==view.draft.revision)return new Response(JSON.stringify({error:'DRAFT_REVISION_CONFLICT'}),{status:409})
    for(const d of command.decisions){
      view.draft.decisions=view.draft.decisions.filter(old=>old.conceptId!==d.conceptId)
      view.draft.decisions.push({...d,evidenceQuality:'PROVISIONAL_PROFILE_REFERENCE'})
      view.reviewFingerprints[d.conceptId]=view.versionFingerprint
    }
    view.draft.nativeValues=view.draft.decisions.flatMap(d=>{
      const native=view.catalog.cards.find(card=>card.id===d.conceptId)?.native
      return native?[{...native,value:d.value,conceptId:d.conceptId}]:[]
    })
    view.draft.revision++
  }
  return new Response(JSON.stringify(view),{status:200,headers:{'content-type':'application/json'}})
}
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-[1440px] px-4 py-6">
  <p className="mb-5 rounded border p-3 text-sm font-bold">QA SINTÉTICA DE IDENTIDAD/TRANSPORTE · SIN AUTH/DB · GUARDADO SÓLO EN MEMORIA · RECARGAR BORRA QA · {syntheticScale?'EXTREMOS SINTÉTICOS, NO BENCHMARK':'PLANEACIÓN B2 PÚBLICA FIJADA, NO COSTOS OBSERVADOS'}</p>
  <VersionWizard initial={view} canEdit={flags.get('role')!=='viewer'}/>
</main>)
