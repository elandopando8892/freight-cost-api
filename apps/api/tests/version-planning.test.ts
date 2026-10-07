import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { expect,it,vi } from 'vitest'
import catalog from '../src/modules/cost-bases/cost-base-wizard.catalog.json'
import type { WizardCatalog } from '../src/modules/cost-bases/cost-base-wizard-draft.js'
import { buildWizardReviewBinding } from '../src/modules/cost-bases/cost-base-wizard-review-context.js'
import { createVersionPlanning } from '../src/modules/cost-bases/version-planning.js'
import { readOwnRelayReview } from '../src/modules/engine/b2-own-relay-review.js'
import { PLANNING_KIND } from '../src/modules/cost-bases/version-planning-contract.js'
import type {PlanningTraceEvent} from '../src/modules/cost-bases/planning-transaction-trace.js'
const actor={orgId:'org-a',sub:'actor-a',role:'ADMIN' as const}
const selection={cycleId:'NETWORK_EXPECTED_EMPTY_PROXY',fundingMode:'CASH',fxDate:'2026-09-30',restInterpretation:'RATE_EXCLUDES_WEEKLY_REST'} as const
function fixture() {
  const row={id:'version-a',orgId:'org-a',costBaseId:'base-a',name:'QA',version:1,status:'DRAFT',isActive:false,
    updatedAt:new Date('2026-10-04T00:00:00Z'),applicabilityContext:null,params:[{section:'FUEL',field:'Diesel MX',value:28,unit:'MXN/L'}],
    costBase:{id:'base-a',name:'QA',status:'DRAFT',scope:'CROSS_BORDER',operationalSegment:null}}
  const context={orgId:'org-a',baseId:'base-a',versionId:'version-a'}
  const events:any[]=[{orgId:'org-a',costBaseId:'base-a',actorId:'actor-a',payload:buildWizardReviewBinding(context,row,catalog as WizardCatalog)}]
  const tx={$queryRaw:vi.fn(async()=>[]),assumptionSet:{findFirst:vi.fn(async({where}:any)=>
    where.id===row.id&&where.orgId===row.orgId&&where.costBaseId===row.costBaseId?structuredClone(row):null)},
    costBaseAuditEvent:{findMany:vi.fn(async({where,take}:any)=>events.filter(e=>e.orgId===where.orgId&&e.costBaseId===where.costBaseId
      &&(where.AND[0].OR?where.AND[0].OR.some((r:any)=>r.payload.equals===e.payload.kind):where.AND[0].payload.equals===e.payload.kind)
      &&where.AND[1].payload.equals===e.payload.versionId).slice(0,take).map(e=>structuredClone(e))),
      create:vi.fn(async({data}:any)=>{events.push(structuredClone(data));return data})}}
  let queue=Promise.resolve()
  const transaction=<T>(work:(tx:Prisma.TransactionClient)=>Promise<T>)=>{
    const result=queue.then(()=>work(tx as unknown as Prisma.TransactionClient));queue=result.then(()=>{},()=>{});return result
  }
  const module=createVersionPlanning(transaction,catalog as WizardCatalog)
  async function command(){const view=await module.read(actor,'base-a','version-a');return {context,selection,
    expectedRevision:view.revision,expectedVersionFingerprint:view.versionFingerprint,
    expectedSnapshot:readOwnRelayReview(selection,view.scope).sha256,requestId:randomUUID(),planningAccepted:true,note:'QA planeación'}}
  return {module,row,events,tx,command,transaction}
}
it('traces the real save path and distinguishes replay without another append',async()=>{
  const f=fixture(),command=await f.command(),events:PlanningTraceEvent[]=[]
  const traced=createVersionPlanning(f.transaction,catalog as WizardCatalog,e=>events.push(e))
  const saved=await traced.save(actor,'base-a','version-a',command)
  expect(events.filter(e=>e.status==='ok').map(e=>e.phase)).toEqual(['acquire','organization-lock','version-lock','read','validate','append','commit'])
  expect(saved.latest?.calculation.case.outputs.productiveCostUsd).toBeCloseTo(5442.31,2)
  expect(JSON.stringify(events)).not.toMatch(/org-a|actor-a|base-a|version-a|5442|QA planeación/)
  events.length=0
  expect((await traced.save(actor,'base-a','version-a',command)).replayed).toBe(true)
  expect(events.some(e=>e.phase==='append')).toBe(false)
  expect(f.tx.costBaseAuditEvent.create).toHaveBeenCalledTimes(1)
})
it('uses two scoped audit reads per save while preserving both ordered writer locks',async()=>{
  const f=fixture(),command=await f.command()
  f.tx.costBaseAuditEvent.findMany.mockClear()
  f.tx.assumptionSet.findFirst.mockClear()
  await f.module.save(actor,'base-a','version-a',command)
  expect(f.tx.costBaseAuditEvent.findMany).toHaveBeenCalledTimes(2)
  expect(f.tx.assumptionSet.findFirst).toHaveBeenCalledTimes(1)
  expect(f.tx.$queryRaw).toHaveBeenCalledTimes(2)
  const queries=f.tx.costBaseAuditEvent.findMany.mock.calls.map(([query])=>query)
  for(const query of queries)expect(query.where).toMatchObject({orgId:actor.orgId,costBaseId:'base-a',action:'METADATA_UPDATED'})
  expect(queries[0].take).toBe(130)
  expect(f.tx.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(f.tx.assumptionSet.findFirst.mock.invocationCallOrder[0])
  expect(f.tx.costBaseAuditEvent.findMany.mock.invocationCallOrder[1]).toBeLessThan(f.tx.costBaseAuditEvent.create.mock.invocationCallOrder[0])
})
it('saves server calculation and recovers it in a new module with JSONB key reordering, without economic writes',async()=>{
  const f=fixture(),before=structuredClone(f.row),saved=await f.module.save(actor,'base-a','version-a',await f.command())
  const reverse=(v:any):any=>Array.isArray(v)?v.map(reverse):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,v])=>[k,reverse(v)])):v
  f.events[1].payload=reverse(f.events[1].payload)
  const fresh=createVersionPlanning(f.transaction,catalog as WizardCatalog)
  expect((await fresh.read(actor,'base-a','version-a')).latest).toEqual(saved.latest)
  expect(saved.latest?.calculation.case.outputs.productiveCostUsd).toBeCloseTo(5442.31,2)
  expect(f.events).toHaveLength(2);expect(f.row).toEqual(before);expect(f.tx.$queryRaw).toHaveBeenCalledTimes(2)
})
it('recovers the nine observed persisted decimal differences and replays without another append',async()=>{
  const f=fixture(),c=await f.command(),saved=await f.module.save(actor,'base-a','version-a',c)
  const p=f.events[1].payload.calculation.case
  p.resources[1].cvuUsd=1922.089706245089
  p.outputs.cfuUsd=1115.609272121467
  for(const [index,value] of [[5,18.83365343519681],[6,388.9848774534386],[7,1020.305159357264],
    [9,14.98529785496181],[14,283.1592731532962],[16,22.21936222965046],[18,214.8950394040688]])
    p.variableCosts[index].amountUsd=value
  const payloadBefore=structuredClone(f.events[1].payload),rowBefore=structuredClone(f.row)
  const fresh=createVersionPlanning(f.transaction,catalog as WizardCatalog)
  expect((await fresh.read(actor,'base-a','version-a')).latest).toEqual(saved.latest)
  const replay=await fresh.save(actor,'base-a','version-a',c)
  expect(replay).toMatchObject({revision:1,replayed:true,appliedToParams:false})
  expect(replay.latest).toEqual(saved.latest)
  expect(f.events[1].payload).toEqual(payloadBefore);expect(f.row).toEqual(rowBefore)
  expect(f.tx.costBaseAuditEvent.create).toHaveBeenCalledTimes(1)
})
it('allows OPERATOR planning metadata, but not VIEWER reads or writes',async()=>{
  const f=fixture(),c=await f.command()
  await f.module.save({...actor,role:'OPERATOR'},'base-a','version-a',c)
  for(const operation of ['read','save'] as const)expect(()=>f.module[operation]({...actor,role:'VIEWER'},'base-a','version-a',c)).toThrow('Forbidden')
  expect(f.events).toHaveLength(2)
})
it.each([['org-b','base-a','version-a'],['org-a','base-b','version-a'],['org-a','base-a','version-b']])('denies another context %s/%s/%s',async(orgId,baseId,versionId)=>{
  const f=fixture();await expect(f.module.read({...actor,orgId},baseId,versionId)).rejects.toMatchObject({statusCode:404});expect(f.events).toHaveLength(1)
})
it('rejects missing binding, altered client economics and unaccepted planning',async()=>{
  const f=fixture(),c=await f.command()
  for(const raw of [{...c,outputs:{cost:1}},{...c,planningAccepted:false},{...c,selection:{...selection,fundingMode:'unknown'}}])
    expect(()=>f.module.save(actor,'base-a','version-a',raw)).toThrow()
  expect(f.events).toHaveLength(1)
})
it('cannot fallback when a binding is absent or version changed',async()=>{
  const f=fixture();await f.command();f.events.splice(0,1)
  await expect(f.module.read(actor,'base-a','version-a')).rejects.toThrow('WIZARD_PROFILE_NOT_SUPPORTED')
  expect(f.tx.costBaseAuditEvent.create).not.toHaveBeenCalled()
})
it('exact receipt replay does not insert; changed UUID payload or account fails',async()=>{
  const f=fixture(),c=await f.command();await f.module.save(actor,'base-a','version-a',c)
  expect((await f.module.save(actor,'base-a','version-a',c)).replayed).toBe(true)
  for(const [who,raw] of [[actor,{...c,note:'changed'}],[{...actor,sub:'other'},c]] as const)
    await expect(f.module.save(who,'base-a','version-a',raw)).rejects.toThrow('PLANNING_REQUEST_ID_REUSED')
  expect(f.events).toHaveLength(2)
})
it('serializes concurrent revision writers; stale reference or client ownership is refused',async()=>{
  const f=fixture(),a=await f.command(),b={...a,requestId:randomUUID()}
  const result=await Promise.allSettled([f.module.save(actor,'base-a','version-a',a),f.module.save(actor,'base-a','version-a',b)])
  expect(result.map(r=>r.status)).toEqual(['fulfilled','rejected']);expect(f.events).toHaveLength(2)
  expect(()=>f.module.save(actor,'base-a','version-a',{...a,context:{...a.context,orgId:'other'}})).toThrow('PLANNING_CONTEXT_MISMATCH')
  const g=fixture(),c=await g.command()
  await expect(g.module.save(actor,'base-a','version-a',{...c,expectedSnapshot:'0'.repeat(64)})).rejects.toThrow('RELAY_SNAPSHOT_CHANGED')
})
it.each(['note','cost','actor','duplicate','revision'])('fails closed after stored %s corruption without another write',async field=>{
  const f=fixture();await f.module.save(actor,'base-a','version-a',await f.command())
  const p=f.events[1].payload
  if(field==='note')p.note='tampered'
  if(field==='cost')p.calculation.case.outputs.productiveCostUsd=1
  if(field==='actor')f.events[1].actorId='other'
  if(field==='duplicate')f.events.push(structuredClone(f.events[1]))
  if(field==='revision')p.revision=7
  await expect(f.module.read(actor,'base-a','version-a')).rejects.toThrow();expect(f.tx.costBaseAuditEvent.create).toHaveBeenCalledTimes(1)
})
it.each(['PUBLISHED','ARCHIVED','ACTIVE'])('refuses changed %s state',async status=>{
  const f=fixture(),c=await f.command();if(status==='ACTIVE')f.row.isActive=true;else f.row.status=status
  await expect(f.module.save(actor,'base-a','version-a',c)).rejects.toThrow('WIZARD_REVIEW_TARGET_NOT_EDITABLE');expect(f.events).toHaveLength(1)
})
it('keeps the planning event separate from the wizard decision metadata',()=>{expect(PLANNING_KIND).toBe('FCM_VERSION_PLANNING_V1')})
