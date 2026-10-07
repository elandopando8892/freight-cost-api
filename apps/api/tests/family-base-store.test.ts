import {expect,it,vi} from 'vitest'
import {randomUUID,createHash} from 'node:crypto'
import type {Prisma} from '@prisma/client'
import * as bridgeModule from '../src/modules/cost-bases/family-base-store.js'
import {composeB2PlanningScenario} from '../scripts/compose-b2-planning-scenario.js'
import {createVersionPlanning} from '../src/modules/cost-bases/version-planning.js'
import {buildWizardReviewBinding} from '../src/modules/cost-bases/cost-base-wizard-review-context.js'
import catalog from '../src/modules/cost-bases/cost-base-wizard.catalog.json'
import type {WizardCatalog} from '../src/modules/cost-bases/cost-base-wizard-draft.js'
import {readOwnRelayReview} from '../src/modules/engine/b2-own-relay-review.js'
const actor={orgId:'store-org',sub:'store-actor',role:'ADMIN' as const},scope={orgId:actor.orgId,sub:actor.sub}
const context={orgId:actor.orgId,baseId:'store-base',versionId:'store-version'}
const selection={cycleId:'NETWORK_EXPECTED_EMPTY_PROXY',fundingMode:'CASH',fxDate:'2026-09-30',restInterpretation:'RATE_EXCLUDES_WEEKLY_REST'} as const
let source:ReturnType<typeof composeB2PlanningScenario>
async function fixture(){
  source??=composeB2PlanningScenario()
  const row={id:context.versionId,orgId:actor.orgId,costBaseId:context.baseId,name:'local',version:1,status:'DRAFT',isActive:false,
    updatedAt:new Date('2026-10-05T00:00:00Z'),applicabilityContext:null,params:[{section:'FUEL',field:'Diesel MX',value:28,unit:'MXN/L'}],
    costBase:{id:context.baseId,name:'local',status:'DRAFT',scope:'CROSS_BORDER',operationalSegment:null}}
  const events:any[]=[{orgId:actor.orgId,costBaseId:context.baseId,actorId:actor.sub,payload:buildWizardReviewBinding(context,row,catalog as WizardCatalog)}]
  const tx={$queryRaw:vi.fn(async()=>[]),assumptionSet:{findFirst:vi.fn(async({where}:any)=>
    where.id===row.id&&where.orgId===row.orgId&&where.costBaseId===row.costBaseId?structuredClone(row):null)},
    costBaseAuditEvent:{findMany:vi.fn(async({where,take}:any)=>events.filter(e=>e.orgId===where.orgId&&e.costBaseId===where.costBaseId
      &&(where.AND[0].OR?where.AND[0].OR.some((r:any)=>r.payload.equals===e.payload.kind):where.AND[0].payload.equals===e.payload.kind)
      &&where.AND[1].payload.equals===e.payload.versionId).slice(0,take).map(e=>structuredClone(e))),
      create:vi.fn(async({data}:any)=>{events.push(structuredClone(data));return data})}}
  let queue=Promise.resolve()
  const transaction=<T>(work:(t:Prisma.TransactionClient)=>Promise<T>)=>{const r=queue.then(()=>work(tx as unknown as Prisma.TransactionClient));queue=r.then(()=>{},()=>{});return r}
  const planning=createVersionPlanning(transaction,catalog as WizardCatalog),initial=await planning.read(actor,context.baseId,context.versionId)
  await planning.save(actor,context.baseId,context.versionId,{context,selection,expectedRevision:0,expectedVersionFingerprint:initial.versionFingerprint,
    expectedSnapshot:readOwnRelayReview(selection,scope).sha256,requestId:randomUUID(),planningAccepted:true,note:'local'})
  const view=await planning.read(actor,context.baseId,context.versionId)
  const api=bridgeModule as unknown as {createFamilyBaseStore:Function}
  expect(typeof api.createFamilyBaseStore).toBe('function')
  const store=api.createFamilyBaseStore(transaction,source,catalog)
  const command={context,expectedRevision:0,expectedVersionFingerprint:view.versionFingerprint,
    expectedPlanningRequestId:view.latest!.requestId,expectedPlanningRevision:1,expectedSnapshot:view.latest!.calculation.sha256,requestId:randomUUID()}
  return {store,command,events,row,transaction,tx,planning}
}
it('uses the actual B3 reader and persists a lossless draft proposal with replay and new-factory readback',async()=>{
  const f=await fixture(),before=structuredClone(f.row),saved=await f.store.save(actor,context.baseId,context.versionId,f.command)
  expect(saved).toMatchObject({revision:1,status:'CURRENT',replayed:false,appliedToParams:false})
  const event=f.events.find(e=>e.payload.kind==='FCM_FAMILY_BASE_PROPOSAL_V1')
  expect(typeof event.payload.proposalJson).toBe('string')
  expect(saved.latest.familyInput.variableCosts[0].amountUsd).toBe(JSON.parse(event.payload.proposalJson).familyInput.variableCosts[0].amountUsd)
  const fresh=(bridgeModule as unknown as {createFamilyBaseStore:Function}).createFamilyBaseStore(f.transaction,source,catalog)
  expect((await fresh.read(actor,context.baseId,context.versionId)).latest).toEqual(saved.latest)
  expect((await fresh.save(actor,context.baseId,context.versionId,f.command)).replayed).toBe(true)
  expect(f.events).toHaveLength(3);expect(f.row).toEqual(before)
})
it('refuses raw economics, cross-context commands and changed UUID reuse without append',async()=>{
  const f=await fixture()
  await expect(f.store.save(actor,context.baseId,context.versionId,{...f.command,price:1})).rejects.toThrow()
  await expect(f.store.save(actor,context.baseId,context.versionId,{...f.command,context:{...context,orgId:'other'}})).rejects.toThrow()
  await f.store.save(actor,context.baseId,context.versionId,f.command)
  await expect(f.store.save(actor,context.baseId,context.versionId,{...f.command,expectedPlanningRevision:2})).rejects.toThrow()
  expect(f.events).toHaveLength(3)
})
it('preserves history and refuses source drift without a fallback',async()=>{
  const f=await fixture();await f.store.save(actor,context.baseId,context.versionId,f.command)
  const stored=structuredClone(f.events[2])
  f.row.updatedAt=new Date('2026-10-05T01:00:00Z')
  await expect(f.store.read(actor,context.baseId,context.versionId)).rejects.toThrow('WIZARD_REVIEW_SOURCE_CHANGED')
  await expect(f.store.save(actor,context.baseId,context.versionId,{...f.command,requestId:randomUUID(),expectedRevision:1})).rejects.toThrow()
  expect(f.events).toHaveLength(3);expect(f.events[2]).toEqual(stored)
})
it('reports the prior proposal stale after a new B3 receipt, then appends a distinct current revision',async()=>{
  const f=await fixture();await f.store.save(actor,context.baseId,context.versionId,f.command)
  const plan=await f.planning.read(actor,context.baseId,context.versionId)
  await f.planning.save(actor,context.baseId,context.versionId,{context,selection:{...selection,fundingMode:'FINANCED'},expectedRevision:1,
    expectedVersionFingerprint:plan.versionFingerprint,expectedSnapshot:plan.latest!.calculation.sha256,requestId:randomUUID(),planningAccepted:true,note:'local revision2'})
  const current=await f.planning.read(actor,context.baseId,context.versionId)
  expect((await f.store.read(actor,context.baseId,context.versionId)).status).toBe('STALE')
  const next=await f.store.save(actor,context.baseId,context.versionId,{...f.command,expectedRevision:1,expectedPlanningRevision:2,
    expectedPlanningRequestId:current.latest!.requestId,requestId:randomUUID()})
  expect(next).toMatchObject({revision:2,status:'CURRENT'})
  expect(next.latest.selection.fundingMode).toBe('FINANCED');expect(f.events).toHaveLength(5)
})
it.each(['json','sha','actor','revision','rehashed-economics'])('fails closed on stored %s corruption',async field=>{
  const f=await fixture();await f.store.save(actor,context.baseId,context.versionId,f.command)
  const e=f.events[2]
  if(field==='json')e.payload.proposalJson='{}'
  if(field==='sha')e.payload.proposalSha256='0'.repeat(64)
  if(field==='actor')e.actorId='other'
  if(field==='revision')e.payload.revision=2
  if(field==='rehashed-economics'){
    const p=JSON.parse(e.payload.proposalJson);p.familyInput.variableCosts[0].amountUsd+=1
    const {fingerprint,...body}=p
    p.fingerprint=createHash('sha256').update(JSON.stringify(body)).digest('hex')
    e.payload.proposalJson=JSON.stringify(p);e.payload.proposalSha256=createHash('sha256').update(e.payload.proposalJson).digest('hex')
  }
  await expect(f.store.read(actor,context.baseId,context.versionId)).rejects.toThrow()
})
const operator={...actor,sub:'store-operator',role:'OPERATOR' as const}
it.each([actor,operator])('projects the real middleware actor into the strict family binding for $role',async who=>{
  const f=await fixture(),supabaseId='fae725d6-4341-4b13-aa6f-f40ce4b78ea1'
  const authenticatedActor={...who,supabaseId}
  const saved=await f.store.save(authenticatedActor,context.baseId,context.versionId,f.command)
  expect(saved).toMatchObject({revision:1,status:'CURRENT',replayed:false,appliedToParams:false})
  expect(saved.latest.scope).toEqual({orgId:actor.orgId,sub:who.sub})
  expect(f.events[2].actorId).toBe(who.sub)
  expect(f.events[2].payload.proposalJson).not.toContain(supabaseId)
  const reopened=await f.store.read(authenticatedActor,context.baseId,context.versionId)
  expect(reopened.latest).toEqual(saved.latest)
  expect((await f.store.save(authenticatedActor,context.baseId,context.versionId,f.command)).replayed).toBe(true)
  expect(f.events).toHaveLength(3)
})
it('shares a proposal with another same-org operator while preserving the original audited author and body',async()=>{
  const f=await fixture(),saved=await f.store.save(actor,context.baseId,context.versionId,f.command)
  const before=structuredClone(f.events)
  const reopened=await f.store.read(operator,context.baseId,context.versionId)
  expect(reopened).toMatchObject({revision:1,status:'CURRENT',scope:{orgId:actor.orgId,sub:operator.sub}})
  expect(reopened.latest).toEqual(saved.latest);expect(reopened.latest.scope.sub).toBe(actor.sub)
  expect(f.events).toEqual(before)
})
it('allows an operator to originate a family proposal from the admin B3 receipt and keeps replay actor-bound',async()=>{
  const f=await fixture(),saved=await f.store.save(operator,context.baseId,context.versionId,f.command)
  expect(saved.latest.scope.sub).toBe(operator.sub);expect(f.events[2].actorId).toBe(operator.sub)
  expect((await f.store.read(actor,context.baseId,context.versionId)).latest).toEqual(saved.latest)
  await expect(f.store.save(actor,context.baseId,context.versionId,f.command)).rejects.toThrow('FAMILY_PROPOSAL_REQUEST_ID_REUSED')
  expect((await f.store.save(operator,context.baseId,context.versionId,f.command)).replayed).toBe(true)
  expect(f.events).toHaveLength(3)
})
it('does not create a second current proposal simply because another actor supplies a new UUID',async()=>{
  const f=await fixture();await f.store.save(actor,context.baseId,context.versionId,f.command)
  await expect(f.store.save(operator,context.baseId,context.versionId,{...f.command,expectedRevision:1,requestId:randomUUID()}))
    .rejects.toThrow('FAMILY_PROPOSAL_UNCHANGED')
  expect(f.events).toHaveLength(3)
})
it('allows mixed-author revisions after new B3 and still rejects other org, VIEWER or forged historical authorship',async()=>{
  const f=await fixture();await f.store.save(actor,context.baseId,context.versionId,f.command)
  const p=await f.planning.read(operator,context.baseId,context.versionId)
  await f.planning.save(operator,context.baseId,context.versionId,{context,selection:{...selection,fundingMode:'FINANCED'},expectedRevision:1,
    expectedVersionFingerprint:p.versionFingerprint,expectedSnapshot:p.latest!.calculation.sha256,requestId:randomUUID(),planningAccepted:true,note:'operator revision'})
  const current=await f.planning.read(operator,context.baseId,context.versionId)
  expect((await f.store.read(operator,context.baseId,context.versionId)).status).toBe('STALE')
  await f.store.save(operator,context.baseId,context.versionId,{...f.command,expectedRevision:1,expectedPlanningRevision:2,
    expectedPlanningRequestId:current.latest!.requestId,requestId:randomUUID()})
  expect((await f.store.read(actor,context.baseId,context.versionId)).latest.scope.sub).toBe(operator.sub)
  for(const denied of [{...operator,orgId:'other'},{...operator,role:'VIEWER' as const}])
    await expect(f.store.read(denied,context.baseId,context.versionId)).rejects.toThrow()
  expect(f.events).toHaveLength(5)
  f.events[2].actorId=operator.sub
  await expect(f.store.read(operator,context.baseId,context.versionId)).rejects.toThrow('FAMILY_PROPOSAL_HISTORY_INVALID')
})
