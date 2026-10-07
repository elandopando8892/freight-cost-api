import { createHash, randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { expect, it, vi } from 'vitest'
import snapshot from '../src/modules/cost-bases/cost-base-wizard.catalog.json'
import { type WizardCatalog } from '../src/modules/cost-bases/cost-base-wizard-draft.js'
import { createVersionWizard, WIZARD_VERSION_METADATA_KIND } from '../src/modules/cost-bases/cost-base-wizard-version.js'
import { buildWizardReviewBinding, resolveWizardReviewBinding, WIZARD_REVIEW_BINDING_KIND, WIZARD_REVIEW_METADATA_KIND } from '../src/modules/cost-bases/cost-base-wizard-review-context.js'
import { defaultCostBaseProfile, parseCostBaseProfile } from '../src/modules/cost-bases/cost-base-profile.js'

const catalog = snapshot as unknown as WizardCatalog
const actor = { orgId:'org-A', sub:'admin-A', role:'ADMIN' as const }
const context = { orgId:'org-A', baseId:'base-A', versionId:'version-A' }
function fixture() {
  const row = { id:'version-A', name:'Historical economics, unclassified', version:2, status:'DRAFT', isActive:false,
    updatedAt:new Date('2026-10-04T00:00:00Z'), applicabilityContext:null as unknown,
    params:[{section:'FUEL', field:'Diesel MX', value:28, unit:'MXN/L'}],
    costBase:{id:'base-A', name:'Review source', status:'DRAFT', scope:'CROSS_BORDER', operationalSegment:null as string|null} }
  const binding = buildWizardReviewBinding(context, row, catalog)
  const events:any[] = [{orgId:actor.orgId, costBaseId:context.baseId, action:'METADATA_UPDATED', payload:binding}]
  const tx = { $queryRaw:vi.fn(async()=>[]), assumptionSet:{findFirst:vi.fn(async({where}:any)=>
    where.orgId===actor.orgId && where.id===row.id && where.costBaseId===row.costBase.id ? structuredClone(row) : null)},
    costBaseAuditEvent:{findMany:vi.fn(async({where,take}:any)=>events.filter(e=>e.orgId===where.orgId&&e.costBaseId===where.costBaseId
      &&e.action===where.action&&e.payload.versionId===where.AND[1].payload.equals
      &&(where.AND[0].OR ? where.AND[0].OR.some((r:any)=>r.payload.equals===e.payload.kind) : where.AND[0].payload.equals===e.payload.kind))
      .slice(0,take).map(e=>({payload:structuredClone(e.payload)}))),
      create:vi.fn(async({data}:any)=>{events.push(structuredClone(data));return data})} }
  let queue=Promise.resolve()
  const transaction=<T>(work:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>=>{
    const result=queue.then(()=>work(tx as unknown as Prisma.TransactionClient));queue=result.then(()=>{},()=>{});return result
  }
  const restart=()=>createVersionWizard(transaction,catalog)
  const command=(view:Awaited<ReturnType<ReturnType<typeof restart>['read']>>)=>({context,
    expectedRevision:view.draft.revision, expectedVersionFingerprint:view.versionFingerprint, requestId:randomUUID(),
    decisions:[{conceptId:'diesel-mx',referenceRevision:catalog.revision,mode:'MARKSMAN',value:27,
      identification:'PARTIAL',justification:'Public planning only, not observed carrier cost.',provisionalAccepted:true}]})
  return {row,binding,events,tx,module:restart(),restart,command}
}

it('uses explicit server audit binding, not a manufactured THROUGH_TRACTOR profile',async()=>{
  const f=fixture(), before=structuredClone(f.row), view=await f.module.read(actor,'base-A','version-A')
  expect(view.reviewContext).toMatchObject({kind:'NONCOMMERCIAL_B2_REVIEW',commercial:false,quoteReady:false,economicProfileChanged:false})
  expect(view.reviewContext!.profile.tractorPolicy).toBe('OWN_MX_US_RELAY_SAME_TRAILER')
  expect(f.row).toEqual(before);expect(f.row.applicabilityContext).toBeNull();expect(f.row.costBase.operationalSegment).toBeNull()
  expect(f.tx.costBaseAuditEvent.create).not.toHaveBeenCalled()
})
it('saves proposals under distinct metadata, restores after module restart and replays once',async()=>{
  const f=fixture(), before=structuredClone(f.row), view=await f.module.read(actor,'base-A','version-A'), command=f.command(view)
  const saved=await f.module.save(actor,'base-A','version-A',command)
  expect(f.events).toHaveLength(2);expect(f.events[1]).toMatchObject({actorId:actor.sub,action:'METADATA_UPDATED',
    payload:{kind:WIZARD_REVIEW_METADATA_KIND,reviewBindingSha256:view.reviewContext!.bindingSha256}})
  const resumed=f.restart(), restored=await resumed.read(actor,'base-A','version-A')
  expect(restored.draft).toEqual(saved.draft);expect(restored.reviewContext).toEqual(view.reviewContext)
  expect((await resumed.save(actor,'base-A','version-A',command)).replayed).toBe(true)
  expect(f.events).toHaveLength(2);expect(f.row).toEqual(before);expect(saved.appliedToParams).toBe(false)
  expect(saved.draft.quoteReady).toBe(false);expect(saved.draft.productiveAdoptions).toBe(0)
})
it('missing binding does not fall back to a relay source profile',async()=>{
  const f=fixture();f.events.length=0
  await expect(f.module.read(actor,'base-A','version-A')).rejects.toThrow('WIZARD_PROFILE_NOT_SUPPORTED')
  expect(f.tx.costBaseAuditEvent.create).not.toHaveBeenCalled()
})
it('retains exact historical THROUGH_TRACTOR fingerprint without making it a relay binding',async()=>{
  const f=fixture();f.events.length=0;f.row.applicabilityContext=defaultCostBaseProfile('CROSS_BORDER')
  f.row.costBase.operationalSegment='D2D_BINATIONAL_OWN'
  const expected=createHash('sha256').update(JSON.stringify({base:f.row.costBase,id:f.row.id,status:f.row.status,
    isActive:f.row.isActive,updatedAt:f.row.updatedAt,profile:parseCostBaseProfile('CROSS_BORDER',f.row.applicabilityContext),params:f.row.params})).digest('hex')
  const view=await f.module.read(actor,'base-A','version-A')
  expect(view.versionFingerprint).toBe(expected);expect(view.reviewContext).toBeNull()
})
it('does not reinterpret an unsupported economic profile while reading non-commercial proposals',async()=>{
  const f=fixture();f.row.applicabilityContext={...defaultCostBaseProfile('CROSS_BORDER'),borderProcess:'YARD_TRANSFER'}
  f.events[0].payload=buildWizardReviewBinding(context,f.row,catalog)
  const before=structuredClone(f.row), view=await f.module.read(actor,'base-A','version-A')
  expect(view.reviewContext!.quoteReady).toBe(false);expect(f.row).toEqual(before)
  expect(f.row.applicabilityContext).toMatchObject({borderProcess:'YARD_TRANSFER'})
})
it.each(['orgId','baseId','versionId'] as const)('rejects forged binding %s',async key=>{
  const f=fixture();f.events[0].payload.context[key]='other'
  await expect(f.module.read(actor,'base-A','version-A')).rejects.toMatchObject({statusCode:403})
  expect(f.events).toHaveLength(1)
})
it.each(['orgId','baseId','versionId'] as const)('does not fetch another server scope: %s',async key=>{
  const f=fixture(), other={...context,[key]:'other'}
  await expect(f.module.read({...actor,orgId:other.orgId},other.baseId,other.versionId)).rejects.toMatchObject({statusCode:404})
  expect(f.tx.costBaseAuditEvent.create).not.toHaveBeenCalled()
})
it.each(['commercial','appliedToParams','economicProfileChanged'] as const)('rejects forged positive capability %s',async key=>{
  const f=fixture();f.events[0].payload[key]=true
  await expect(f.module.read(actor,'base-A','version-A')).rejects.toThrow('WIZARD_REVIEW_BINDING_INVALID')
})
it('rejects duplicate bindings without picking most recent',async()=>{
  const f=fixture();f.events.push(structuredClone(f.events[0]))
  await expect(f.module.read(actor,'base-A','version-A')).rejects.toThrow('WIZARD_REVIEW_BINDING_AMBIGUOUS')
})
it.each(['PUBLISHED','ARCHIVED'])('rejects %s review version',async status=>{
  const f=fixture();f.row.status=status
  await expect(f.module.read(actor,'base-A','version-A')).rejects.toThrow('WIZARD_REVIEW_TARGET_NOT_EDITABLE')
})
it.each(['ACTIVE','ARCHIVED'])('rejects %s review base',async status=>{
  const f=fixture();f.row.costBase.status=status
  await expect(f.module.read(actor,'base-A','version-A')).rejects.toThrow('WIZARD_REVIEW_TARGET_NOT_EDITABLE')
})
it('rejects active draft before saving anything',async()=>{
  const f=fixture(), command=f.command(await f.module.read(actor,'base-A','version-A'));f.row.isActive=true
  await expect(f.module.save(actor,'base-A','version-A',command)).rejects.toThrow('WIZARD_REVIEW_TARGET_NOT_EDITABLE')
  expect(f.events).toHaveLength(1)
})
it.each(['params','profile','segment','time'] as const)('source %s change invalidates binding instead of normalizing/rebinding',async change=>{
  const f=fixture(), command=f.command(await f.module.read(actor,'base-A','version-A'))
  if(change==='params')f.row.params[0].value=31
  if(change==='profile')f.row.applicabilityContext=defaultCostBaseProfile('CROSS_BORDER')
  if(change==='segment')f.row.costBase.operationalSegment='D2D_BINATIONAL_OWN'
  if(change==='time')f.row.updatedAt=new Date('2026-10-05T00:00:00Z')
  await expect(f.module.save(actor,'base-A','version-A',command)).rejects.toThrow('WIZARD_REVIEW_SOURCE_CHANGED')
  expect(f.events).toHaveLength(1)
})
it.each(['catalog','profile'] as const)('changed %s reference is rejected',async changed=>{
  const f=fixture()
  if(changed==='catalog')f.events[0].payload.referenceRevision='0'.repeat(64)
  else f.events[0].payload.profile.period='2026-10'
  await expect(f.module.read(actor,'base-A','version-A')).rejects.toThrow(/WIZARD_REVIEW_(REFERENCE_CHANGED|BINDING_INVALID)/)
})
it('cannot inject binding or mutate economic profile through save command',async()=>{
  const f=fixture(), command=f.command(await f.module.read(actor,'base-A','version-A'))
  for(const extra of [{reviewBinding:f.binding},{reviewContext:{commercial:true}},{applicabilityContext:{borderProcess:'YARD_TRANSFER'}}])
    await expect(f.module.save(actor,'base-A','version-A',{...command,...extra})).rejects.toThrow()
  expect(f.events).toHaveLength(1)
})
it('binding changes after a decision cannot reset UUID/history',async()=>{
  const f=fixture(), command=f.command(await f.module.read(actor,'base-A','version-A'))
  await f.module.save(actor,'base-A','version-A',command)
  f.events[1].payload.reviewBindingSha256='0'.repeat(64)
  await expect(f.module.read(actor,'base-A','version-A')).rejects.toThrow('WIZARD_REVIEW_HISTORY_CONFLICT')
  expect(f.events).toHaveLength(2)
})
it('does not mix historical metadata into bound review or silently start a new ledger',async()=>{
  const f=fixture(), command=f.command(await f.module.read(actor,'base-A','version-A'))
  await f.module.save(actor,'base-A','version-A',command)
  f.events[1].payload.kind=WIZARD_VERSION_METADATA_KIND;delete f.events[1].payload.reviewBindingSha256
  await expect(f.module.read(actor,'base-A','version-A')).rejects.toThrow('WIZARD_REVIEW_HISTORY_CONFLICT')
  expect(f.events).toHaveLength(2)
})
it('orphan review history cannot fall back to a historical profile',async()=>{
  const f=fixture();f.row.applicabilityContext=defaultCostBaseProfile('CROSS_BORDER');f.row.costBase.operationalSegment='D2D_BINATIONAL_OWN'
  f.events[0].payload=buildWizardReviewBinding(context,f.row,catalog)
  await f.module.save(actor,'base-A','version-A',f.command(await f.module.read(actor,'base-A','version-A')))
  f.events.shift()
  await expect(f.module.read(actor,'base-A','version-A')).rejects.toThrow('WIZARD_REVIEW_HISTORY_CONFLICT')
})
it.each(['OPERATOR','VIEWER'] as const)('retains %s read-only role',async role=>{
  const f=fixture(), view=await f.module.read({...actor,role},'base-A','version-A')
  await expect(f.module.save({...actor,role},'base-A','version-A',f.command(view))).rejects.toMatchObject({statusCode:403})
  expect(f.events).toHaveLength(1);expect(f.tx.$queryRaw).not.toHaveBeenCalled()
})
it('keeps concurrent revision conflict and UUID content reuse under bound review',async()=>{
  const f=fixture(), view=await f.module.read(actor,'base-A','version-A'), command=f.command(view)
  const results=await Promise.allSettled([f.module.save(actor,'base-A','version-A',command),f.module.save(actor,'base-A','version-A',f.command(view))])
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(f.events).toHaveLength(2)
  command.decisions[0].justification='Different request content'
  await expect(f.module.save(actor,'base-A','version-A',command)).rejects.toThrow('REQUEST_ID_REUSED')
})
it('pure binding preparation validates scope and has no persistence surface',()=>{
  const f=fixture()
  expect(()=>buildWizardReviewBinding({...context,baseId:'other'},f.row,catalog)).toThrow('WIZARD_REVIEW_CONTEXT_MISMATCH')
  const other={...f.binding,unapproved:true}
  expect(()=>resolveWizardReviewBinding(other,context,f.row,catalog)).toThrow('WIZARD_REVIEW_BINDING_INVALID')
  expect(f.binding.kind).toBe(WIZARD_REVIEW_BINDING_KIND);expect(f.events).toHaveLength(1)
})
it('binding preparation from a full DB-shaped record matches the exact wizard projection',()=>{
  const f=fixture(), full={...f.row,createdAt:new Date('2026-01-01T00:00:00Z'),
    costBase:{...f.row.costBase,isDefault:false,createdAt:new Date('2026-01-01T00:00:00Z')},
    params:f.row.params.map(p=>({...p,id:'parameter-A',setId:f.row.id,createdAt:new Date('2026-01-01T00:00:00Z')}))}
  expect(buildWizardReviewBinding(context,full,catalog)).toEqual(f.binding)
  expect(resolveWizardReviewBinding(buildWizardReviewBinding(context,full,catalog),context,f.row,catalog).commercial).toBe(false)
})
