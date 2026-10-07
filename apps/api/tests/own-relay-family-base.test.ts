import {expect,it,vi} from 'vitest'
import {createHash} from 'node:crypto'
// Missing implementation is an assertion failure in RED, not a broken test collection.
const bridgeModule=await import('../src/modules/cost-bases/own-relay-family-base.js').catch(error=>{
  if(/Failed to load url/.test(String(error)))return {}
  throw error
})
import {composeB2PlanningScenario} from '../scripts/compose-b2-planning-scenario.js'
import {readOwnRelayReview} from '../src/modules/engine/b2-own-relay-review.js'
import type {PlanningView} from '../src/modules/cost-bases/version-planning-contract.js'
vi.mock('../src/config/prisma.js',()=>{throw new Error('DB initialization forbidden')})
const actor={orgId:'synthetic-org',sub:'synthetic-actor',role:'ADMIN' as const}
const scope={orgId:actor.orgId,sub:actor.sub}
const context={orgId:actor.orgId,baseId:'synthetic-base',versionId:'synthetic-version'}
const binding={...actor,baseId:context.baseId,versionId:context.versionId,versionFingerprint:'a'.repeat(64)}
const selection={cycleId:'NETWORK_EXPECTED_EMPTY_PROXY',fundingMode:'CASH',fxDate:'2026-09-30',restInterpretation:'RATE_EXCLUDES_WEEKLY_REST'} as const
const view=():PlanningView=>({context:structuredClone(context),scope:{...scope},versionFingerprint:binding.versionFingerprint,bindingSha256:'b'.repeat(64),
  revision:1,editable:true,appliedToParams:false,latest:{kind:'FCM_VERSION_PLANNING_V1',versionId:context.versionId,context:structuredClone(context),
    revision:1,requestId:'4acfc9f3-532e-4b4e-9273-d61797b8273c',commandSha256:'c'.repeat(64),savedAt:'2026-10-05T19:13:46Z',savedBy:actor.sub,
    versionFingerprint:binding.versionFingerprint,bindingSha256:'b'.repeat(64),selection,note:'synthetic',planningAccepted:true,
    calculation:readOwnRelayReview(selection,scope)}})
let source:ReturnType<typeof composeB2PlanningScenario>
function fixture(){
  source??=composeB2PlanningScenario()
  const api=bridgeModule as typeof import('../src/modules/cost-bases/own-relay-family-base.js')
  expect(typeof api.createOwnRelayFamilyBridge).toBe('function')
  let current=view()
  return {module:api.createOwnRelayFamilyBridge(source,async()=>structuredClone(current)),current}
}
it('turns a version-bound planning receipt into a draft family base and recalculates with B2 unchanged',async()=>{
  const f=fixture(),before=structuredClone(f.current),p=await f.module.prepare(binding)
  expect(p).toMatchObject({method:'FCM_OWN_RELAY_FAMILY_BASE_V1',status:'LOCAL_DRAFT_PROPOSAL',borderProcess:'OWN_RELAY_SAME_TRAILER',
    context,calibrated:false,quoteReady:false,adoptedValues:0})
  expect(p.familyInput.budget.expenses).toHaveLength(32);expect(p.familyInput.variableCosts).toHaveLength(20)
  const result=await f.module.calculate(p,binding)
  expect(result.outputs.cfuUsd).toBeCloseTo(1115.6092721214666,10)
  expect(result.outputs.cvuUsd).toBeCloseTo(4326.70521951104,8)
  expect(result.outputs.productiveCostUsd).toBeCloseTo(5442.314491632507,10)
  expect(result.outputs.purchaseUsd).toBeNull();expect(result.outputs.sellUsd).toBeNull()
  expect(result.sharedBoxAllocationCount).toBe(1);expect(f.current).toEqual(before)
})
it.each(['actor','org','version','fingerprint','no-receipt','not-editable'])('denies changed %s before creating a proposal',async field=>{
  const f=fixture()
  if(field==='actor')f.current.scope.sub='other'
  if(field==='org')f.current.context.orgId='other'
  if(field==='version')f.current.context.versionId='other'
  if(field==='fingerprint')f.current.versionFingerprint='d'.repeat(64)
  if(field==='no-receipt'){f.current.latest=null;f.current.revision=0}
  if(field==='not-editable')f.current.editable=false
  await expect(f.module.prepare(binding)).rejects.toThrow()
})
it.each(['amount','method','owner','period','quote-ready','receipt'])('rejects proposal %s tampering before calculation',async field=>{
  const f=fixture(),proposal=await f.module.prepare(binding)
  const p=structuredClone(proposal) as Record<string,unknown>&{familyInput:typeof proposal.familyInput;receipt:typeof proposal.receipt}
  if(field==='amount')p.familyInput.variableCosts[0].amountUsd!+=1
  if(field==='method')p.method='OPERATIONAL_V3'
  if(field==='owner')p.familyInput.variableCosts[0].resourceId='US_TRACTOR'
  if(field==='period')p.familyInput.budget.referencePeriod='2026-10'
  if(field==='quote-ready')p.quoteReady=true
  if(field==='receipt')p.receipt.requestId='640c96dc-c98d-4d08-bf44-c4a407f5ea99'
  const rejected=await f.module.calculate(p,binding).then(()=>false,()=>true)
  expect(rejected).toBe(true)
})
it('rechecks the version when calculating instead of accepting a stale proposal',async()=>{
  const f=fixture(),p=await f.module.prepare(binding);f.current.versionFingerprint='d'.repeat(64)
  await expect(f.module.calculate(p,binding)).rejects.toThrow()
})
it('does not leak mutable source-ledger references even when a client recomputes the checksum',async()=>{
  const f=fixture(),p=await f.module.prepare(binding)
  ;(p.fixedLedger[0] as {monthlyUsd:number}).monthlyUsd+=1
  const {fingerprint:_fingerprint,...body}=p
  p.fingerprint=createHash('sha256').update(JSON.stringify(body)).digest('hex')
  expect(await f.module.calculate(p,binding).then(()=>false,()=>true)).toBe(true)
})
it('preserves both cycles, financing alternatives, dated FIX and rest interpretation for all24 selections',async()=>{
  const f=fixture()
  for(const c of source.cases){
    f.current.latest!.selection={cycleId:c.cycleId,fxDate:c.fx.date,fundingMode:c.fundingMode,restInterpretation:c.restInterpretation} as typeof selection
    f.current.latest!.calculation=readOwnRelayReview(f.current.latest!.selection,scope)
    const p=await f.module.prepare(binding),result=await f.module.calculate(JSON.parse(JSON.stringify(p)),binding)
    expect(result.outputs).toEqual(c.planningOutputs)
    expect(p.fixedLedger.filter(row=>(row as {disposition?:string}).disposition==='EXPLICIT_PLANNING_REMAINDER')).toHaveLength(6)
    expect(result.quoteReady).toBe(false);expect(result.sharedBoxAllocationCount).toBe(1)
  }
})
it('rejects a changed saved calculation and VIEWER identity',async()=>{
  const f=fixture(),c=f.current.latest!.calculation.case
  // Keep algebra internally consistent: the bridge must still compare the pinned result.
  c.outputs.productiveCostUsd+=1;c.outputs.cvuUsd+=1
  c.resources[0].costUsd+=1;c.resources[0].cvuUsd+=1;c.variableCosts[0].amountUsd!+=1
  await expect(f.module.prepare(binding)).rejects.toThrow('FAMILY_BASE_PLANNING_RESULT_CHANGED')
  await expect(f.module.prepare({...binding,role:'VIEWER'} as unknown as typeof binding)).rejects.toThrow()
})
it('rejects source drift before a planning read',()=>{
  fixture()
  const changed=structuredClone(source);changed.cases[0].lineage.variableCosts[0].amountUsd!+=1
  const create=(bridgeModule as typeof import('../src/modules/cost-bases/own-relay-family-base.js')).createOwnRelayFamilyBridge
  expect(()=>create(changed,()=>{throw new Error('reader must not be reached')})).toThrow('FAMILY_BASE_SOURCE_DRIFT')
})
it('prepares from another authorized author B3 receipt without rewriting its calculation identity',async()=>{
  const f=fixture(),other={...binding,sub:'synthetic-operator',role:'OPERATOR' as const}
  f.current.scope.sub=other.sub
  const original=structuredClone(f.current.latest)
  const p=await f.module.prepare(other)
  expect(p.scope.sub).toBe(other.sub);expect(p.receipt.requestId).toBe(original!.requestId)
  expect(f.current.latest).toEqual(original)
  expect(p.calibrated).toBe(false)
})
it('refuses a receipt with mismatched saved author and calculation identity',async()=>{
  const f=fixture();f.current.latest!.savedBy='other'
  await expect(f.module.prepare(binding)).rejects.toThrow('FAMILY_BASE_RECEIPT_MISMATCH')
})
