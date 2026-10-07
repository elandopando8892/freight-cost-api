import {createRoot} from 'react-dom/client'
import {OwnRelayReview} from '../../app/(app)/cost-bases/own-relay-review'
import type {PlanningView} from '../../lib/version-planning'
import {FamilyProposalViewSchema,type FamilyProposalView} from '../../../api/src/modules/cost-bases/family-base-contract'
import snapshot from '../../../api/src/modules/engine/b2-own-relay.snapshot.json'
import {RelaySnapshot} from '../../../api/src/modules/engine/b2-own-relay-contract'
import '../../app/globals.css'

const context={orgId:'synthetic-org',baseId:'synthetic-base',versionId:'synthetic-version'},scope={orgId:context.orgId,sub:'synthetic-operator'}
const {cases,sourcePins,evidence,...metadata}=RelaySnapshot.parse(snapshot).payload
const selected=cases.find(c=>c.cycleId==='NETWORK_EXPECTED_EMPTY_PROXY'&&c.fundingMode==='CASH'&&c.fxDate==='2026-09-30'&&c.restInterpretation==='RATE_EXCLUDES_WEEKLY_REST')!
const ids=new Set([...selected.fixedEvidenceIds,...selected.variableCosts.flatMap(v=>v.evidenceIds)])
const calculation={...metadata,sha256:snapshot.sha256,sourcePinCount:sourcePins.length,scope,case:selected,evidence:evidence.filter(e=>ids.has(e.id))} as NonNullable<PlanningView['latest']>['calculation']
const planning:PlanningView={context,scope,revision:1,versionFingerprint:'a'.repeat(64),bindingSha256:'b'.repeat(64),editable:true,appliedToParams:false,
  latest:{kind:'FCM_VERSION_PLANNING_V1',versionId:context.versionId,context,revision:1,requestId:'2d26f150-2bb4-4e7e-95f0-d098d2d4f274',
    commandSha256:'c'.repeat(64),savedAt:'2026-10-06T06:40:00.000Z',savedBy:scope.sub,versionFingerprint:'a'.repeat(64),bindingSha256:'b'.repeat(64),
    selection:{cycleId:selected.cycleId,fundingMode:selected.fundingMode,fxDate:selected.fxDate,restInterpretation:selected.restInterpretation},note:'Fixture visual',planningAccepted:true,calculation}}
let state:FamilyProposalView={context,scope,revision:0,status:'NONE',latest:null,appliedToParams:false,quoteReady:false}
const flags=new URLSearchParams(location.search)
window.fetch=async(path,init)=>{
  const url=new URL(String(path),location.origin)
  if(url.pathname===`/api/v1/cost-bases/${context.baseId}/versions/${context.versionId}/family-proposal`){
    if(flags.get('error')==='denied')return Response.json({error:'Forbidden'},{status:403})
    if(init?.method==='PUT'){
      if(flags.get('error')==='conflict')return Response.json({error:'conflict'},{status:409})
      state=FamilyProposalViewSchema.parse({...state,revision:1,status:'CURRENT',latest:{fingerprint:'d'.repeat(64),versionFingerprint:planning.versionFingerprint,
        bindingSha256:planning.bindingSha256,sourceSnapshotSha256:snapshot.sha256,sourceScenarioSha256:metadata.sourceScenarioSha256,
        receipt:{revision:1,requestId:planning.latest!.requestId,commandSha256:planning.latest!.commandSha256},selection:planning.latest!.selection,
        referencePeriod:'2026-09',fixedEntryCount:32,policyReference:{file:'fixture-policy.md',sha256:'e'.repeat(64),
          scope:'PUBLIC_PLANNING_VALIDATION_ONLY_NOT_OPERATIONAL_CALIBRATION_OR_ADOPTION'},calibrated:false,published:false,adoptedValues:0}})
    }
    return Response.json(state)
  }
  if(url.pathname===`/api/v1/cost-bases/${context.baseId}/versions/${context.versionId}/planning`&&init?.method==='GET')return Response.json(planning)
  throw new Error('Fixture: other requests blocked; no real API/Auth/DB')
}
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-[1200px] px-4 py-6 space-y-4">
  <p className="rounded border p-3 text-sm">QA visual · identidad/transporte sintéticos · persistencia sólo en memoria, recarga la borra · economía pública B2, no costo observado.</p>
  <h1 className="text-2xl font-bold">Planeación del viaje</h1><OwnRelayReview expectedOrgId={context.orgId} initialPlanning={planning}/>
</main>)
