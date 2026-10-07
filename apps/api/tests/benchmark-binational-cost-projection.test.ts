import {describe,it,expect} from 'vitest'
import {readLocalDocument} from '../scripts/assemble-economic-reference-cards.js'
import {BINATIONAL_RESOURCES} from '../src/modules/engine/benchmark-binational-budget.js'
import {BinationalCostProjectionSchema,calculateBinationalBudgetCostProjection as calculate,PILOT_VARIABLE_CONCEPTS} from '../src/modules/engine/benchmark-binational-cost-projection.js'
import {consolidateBinationalReferenceBudget} from '../scripts/consolidate-binational-reference-budget.js'

/** Every amount and capacity is synthetic; never a completed public benchmark. */
function fixture(){
 const budget=JSON.parse(readLocalDocument('docs/research/B2_BINATIONAL_FIXED_BUDGET_WORKSHEET_2026-10-01.json')).budget
 budget.referencePeriod='2026-10'
 budget.resources.forEach((r:any)=>r.profileReference='SYNTHETIC')
 budget.evidence=[{id:'test',url:'https://example.org/synthetic',locator:'Synthetic arithmetic only',observedAt:'2026-10-01',
  referencePeriod:'2026-10',groupReference:budget.groupReference,resourceIds:[...BINATIONAL_RESOURCES],
  profileReferences:budget.resources.map((r:any)=>({...r})),kind:'DOCUMENTED_PUBLIC_MODEL',limitations:'Not a real source'}]
 budget.expenses.forEach((e:any)=>{
  e.amount={value:100,unit:'USD/month',referencePeriod:'2026-10',evidenceIds:['test'],derivation:'Synthetic only',kind:'DOCUMENTED_PUBLIC_MODEL'}
  if(e.scope==='GROUP_SHARED')e.allocations.forEach((a:any,i:number)=>a.share=[.6,.3,.1][i])
 })
 return BinationalCostProjectionSchema.parse({model:'FCM_BINATIONAL_BUDGET_COST_PROJECTION_V1',caseReference:'MEXICO_DF_FORT_SMITH_72916_WTB_OWN_RELAY',
  evidenceScope:'SYNTHETIC_VALIDATION',cycleScenarioId:'NETWORK_EXPECTED_EMPTY_PROXY',fundingMode:'CASH',taxScopeRationale:'Synthetic common tax basis',budget,
  exposures:BINATIONAL_RESOURCES.map((resourceId,i)=>({resourceId,totalCycleKm:[2000,5000,2500][i],cycleDays:[2,3,4][i],
   productiveKmPerMonth:10000,productiveDaysPerMonth:20,evidenceIds:['test'],derivation:'Synthetic cycle and capacity'})),
  variableCosts:PILOT_VARIABLE_CONCEPTS.map(conceptId=>({conceptId,resourceId:conceptId.startsWith('US_')?'US_TRACTOR':conceptId==='SUPPLEMENTAL_CARGO_VALUE_INSURANCE'?'SHARED_TRAILER':'MX_TRACTOR',
   disposition:'DOCUMENTED_COMPONENT',amountUsd:10,evidenceIds:['test'],derivation:'Synthetic full coverage only',exclusionOrZeroRationale:null}))})
}
describe('public budget -> MAX by resource -> covered CVU -> cost, no adoption',()=>{
 it.each([
  ['CASH','NETWORK_EXPECTED_EMPTY_PROXY',1],['FINANCED','NETWORK_EXPECTED_EMPTY_PROXY',1],
  ['CASH','DEDICATED_EMPTY_SAME_BOX_RETURN',2],['FINANCED','DEDICATED_EMPTY_SAME_BOX_RETURN',2],
 ] as const)('calculates positive synthetic %s/%s cost, not perpetual null',(fundingMode,cycleScenarioId,factor)=>{
  const input=fixture();input.fundingMode=fundingMode;input.cycleScenarioId=cycleScenarioId
  // Doubled fixture is only independent synthetic input, not a real return rule.
  input.exposures.forEach(e=>{e.totalCycleKm*=factor;e.cycleDays*=factor})
  input.variableCosts.forEach(c=>c.amountUsd!*=factor)
  const r=calculate(input)
  // Budget conserves1000:360/330/310. MAX allocates72/165/77.5.
  expect(r.issues).toEqual([])
  expect(r.resources.map(r=>r.cfuUsd)).toEqual([72,165,77.5].map(v=>v*factor))
  expect(r.outputs).toEqual({matchedMonthlySubtotalUsd:1000,cfuUsd:314.5*factor,cvuUsd:200*factor,productiveCostUsd:514.5*factor,purchaseUsd:null,sellUsd:null})
  expect(r).toMatchObject({status:'CALCULATED_DOCUMENTED_SCENARIO_ONLY',evidenceScope:'SYNTHETIC_VALIDATION',sharedBoxAllocationCount:1,
   calibrated:false,quoteReady:false,adoptedValues:0,actualCarrierCostObserved:false,externalWrites:false})
  expect(r.resources.reduce((s,r)=>s+r.costUsd!,0)).toBe(r.outputs.productiveCostUsd)
 })
 it('uses time when it binds, without adding distance and time or a second box',()=>{
  const raw=fixture();raw.exposures[2].cycleDays=10
  const r=calculate(raw)
  expect(r.resources[2]).toMatchObject({byDistanceUsd:77.5,byTimeUsd:155,cfuUsd:155})
  expect(r.outputs.cfuUsd).toBe(392)
 })
 it('is deterministic under reordered input',()=>{
  const raw=fixture(),before=calculate(raw)
  raw.exposures.reverse();raw.variableCosts.reverse();raw.budget.expenses.reverse()
  expect(calculate(raw).outputs).toEqual(before.outputs)
  expect(calculate(raw).resources).toEqual(before.resources)
 })
 it('does not hide a missing fee in zero while retaining supported CFU',()=>{
  const raw=fixture();const row=raw.variableCosts.find(c=>c.conceptId==='US_ROAD_TOLLS')!
  row.disposition='MISSING';row.amountUsd=null
  const r=calculate(raw)
  expect(r.issues).toContainEqual({field:'variableCosts.US_ROAD_TOLLS',code:'UNRESOLVED_VARIABLE_COMPONENT'})
  expect(r.outputs).toMatchObject({cfuUsd:314.5,cvuUsd:null,productiveCostUsd:null})
  expect(r.missingAmountsDefaultedToZero).toBe(false)
 })
 it('accepts a documented scope exclusion, not a false zero-price observation',()=>{
  const raw=fixture(),row=raw.variableCosts.at(-1)!
  row.disposition='DOCUMENTED_EXCLUSION';row.amountUsd=null;row.exclusionOrZeroRationale='Synthetic shipper-borne supplemental coverage; carrier policy retained'
  const r=calculate(raw)
  expect(r.issues).toEqual([]);expect(r.outputs.cvuUsd).toBe(190)
  expect(r.lineage.variableCosts.at(-1)!.amountUsd).toBeNull()
 })
 it.each([
  ['empty coverage','MISSING_VARIABLE_CONCEPT',(r:ReturnType<typeof fixture>)=>{r.variableCosts=[]}],
  ['duplicated charge','DUPLICATE_VARIABLE_CONCEPT',(r:ReturnType<typeof fixture>)=>{r.variableCosts.push({...r.variableCosts[0]})}],
  ['unknown source','UNKNOWN_EVIDENCE',(r:ReturnType<typeof fixture>)=>{r.variableCosts[0].evidenceIds=['no']}],
  ['zero without basis','ZERO_REQUIRES_EXPLICIT_BASIS',(r:ReturnType<typeof fixture>)=>{r.variableCosts[0].amountUsd=0}],
  ['false exclusion','INVALID_SCOPE_EXCLUSION',(r:ReturnType<typeof fixture>)=>{r.variableCosts[0].disposition='DOCUMENTED_EXCLUSION'}],
  ['wrong tractor','VARIABLE_RESOURCE_MISMATCH',(r:ReturnType<typeof fixture>)=>{r.variableCosts[0].resourceId='US_TRACTOR'}],
  ['missing with value','MISSING_COMPONENT_HAS_AMOUNT',(r:ReturnType<typeof fixture>)=>{r.variableCosts[0].disposition='MISSING'}],
  ['missing amount','MISSING_COMPONENT_AMOUNT',(r:ReturnType<typeof fixture>)=>{r.variableCosts[0].amountUsd=null}],
  ['context only','INCOMPATIBLE_MODEL_EVIDENCE',(r:ReturnType<typeof fixture>)=>{r.budget.evidence[0].kind='CONTEXT_ONLY'}],
  ['duplicate exposure','REQUIRE_ONE_RESOURCE_EXPOSURE',(r:ReturnType<typeof fixture>)=>{r.exposures[1].resourceId='MX_TRACTOR'}],
  ['missing monthly expense','MISSING_MONTHLY_AMOUNT',(r:ReturnType<typeof fixture>)=>{r.budget.expenses[0].amount=null}],
 ] as const)('does not complete with %s',(_name,code,mutate)=>{
  const raw=fixture();mutate(raw);const r=calculate(raw)
  expect(r.issues.map(i=>i.code)).toContain(code)
  expect(r.outputs.productiveCostUsd).toBeNull();expect(r.status).toBe('INCOMPLETE')
 })
 it('rejects supplied totals, invalid numeric values and wrong pilot',()=>{
  expect(()=>calculate({...fixture(),cfuUsd:1})).toThrow()
  const raw=fixture();raw.exposures[0].productiveKmPerMonth=0;expect(()=>calculate(raw)).toThrow()
  expect(()=>calculate({...fixture(),caseReference:'OTHER_ROUTE'})).toThrow()
 })
 it('connects the optional projection without overwriting the incomplete79-pin pilot',()=>{
  const raw=fixture(),r=consolidateBinationalReferenceBudget(undefined,undefined,undefined,undefined,undefined,undefined,undefined,raw)
  expect(r.publicCostProjection?.outputs.productiveCostUsd).toBe(514.5)
  expect(Object.values(r.outputs).every(v=>v===null)).toBe(true)
  expect(r.publicCostProjectionInputBasis).toBe('EXPLICIT_CALLER_SCENARIO_NOT_THE_PINNED_PILOT')
  expect(r.sourcePins).toHaveLength(79)
  expect(Object.values(r.externalChanges).every(v=>v===false)).toBe(true)
 })
})
