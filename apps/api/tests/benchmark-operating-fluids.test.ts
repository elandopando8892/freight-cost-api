import {describe,it,expect} from 'vitest'
import {calculateOperatingFluids as calc} from '../scripts/lib/reference-operating-fluids.js'
import {consolidateBinationalReferenceBudget as run} from '../scripts/consolidate-binational-reference-budget.js'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'
const policy=JSON.parse(readLocalDocument('docs/research/B2_OPERATING_FLUIDS_2026-10-02.json')),fx=JSON.parse(readLocalDocument('docs/research/B2_FX_REFERENCE_2026-10-02.json'))
const root=run(),base=root.supportingPilotTripSupplements,variables=root.supportingPilotVariableEconomics,duty=root.supportingPilotOrdinaryDuty
const result=()=>calc(policy,base,variables,duty,fx)
describe('DEF and separately sourced annual idle reserve, not an observed event trace',()=>{
 it('joins into the root and preserves inputs and incomplete final costs',()=>{
  const before=JSON.stringify({policy,base,variables,duty,fx}),r=result()
  expect(r).toEqual(root.supportingOperatingFluids);expect(JSON.stringify({policy,base,variables,duty,fx})).toBe(before)
  expect(r).toMatchObject({completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,quoteReady:false,adoptedValues:0,externalWrites:false,cfusChanged:false,actualConsumptionObserved:false})
  expect(Object.values(root.outputs).every(v=>v===null)).toBe(true)
 })
 it('prices consumed units, one delivery cost, single VAT and US gallon rather than liter',()=>{
  const r=result()
  expect(r.mxDefUnitMxn).toBeCloseTo((472.2+314.65)*1.16/20,10)
  expect(r.usDefUnitUsd).toBeCloseTo(9.88*1.0825/2.5,10)
  for(const s of r.scenarios){
   const mx=s.reference.lines.find(l=>l.id==='MX_DEF')!,us=s.reference.lines.find(l=>l.id==='US_DEF')!
   expect(mx.quantity).toBeCloseTo(s.mxTotalDieselLiters*.04,10);expect(us.quantity).toBeCloseTo(s.usTotalDieselGallons*.04,10)
   expect(mx.amountUsd).toBeCloseTo(mx.quantity*r.mxDefUnitMxn/18.3688,10)
   expect(s.reference.mxPackageConsumptionEquivalent).toBe(mx.quantity/20)
   expect(s.reference.usPackageConsumptionEquivalent).toBe(us.quantity/2.5)
   expect(s.reference.lines.every(l=>l.resourceId!=='SHARED_TRAILER')).toBe(true)
  }
 })
 it('allocates1830annual hours by each tractor clock, not box MAX, rounded days or all border minutes',()=>{
  const r=result()
  for(const s of r.scenarios){const d=duty.scenarios.find(d=>d.id===s.cycleScenarioId)!
   expect(s.monthlyReferenceIdleHours).toBe(152.5)
   expect(s.mxIdleHours).toBeCloseTo(152.5*d.knownMxElapsedClockDays/24,10)
   expect(s.usIdleHours).toBeCloseTo(152.5*d.knownUsElapsedClockDays/24,10)
   expect(s.actualIdleHoursObserved).toBe(false);expect(s.actualScrVerified).toBe(false)
   expect(s.mxTotalDieselLiters).toBeCloseTo(s.roadDieselQuantity.mxLiters+s.mxIdleHours*.8*3.785411784,10)
   expect(s.usTotalDieselGallons).toBeCloseTo(s.roadDieselQuantity.usGallons+s.usIdleHours*.8,10)
  }
 })
 it('keeps3/5percent source sensitivities separate from the4percent selected reference',()=>{
  for(const s of result().scenarios){
   expect(s.sensitivity.map(x=>x.fraction)).toEqual([.03,.05]);expect(s.reference.fraction).toBe(.04)
   expect(s.sensitivity[0].knownVariableAdditionUsd).toBeLessThan(s.reference.knownVariableAdditionUsd)
   expect(s.sensitivity[1].knownVariableAdditionUsd).toBeGreaterThan(s.reference.knownVariableAdditionUsd)
   expect(s.sensitivity[0].lines.filter(l=>l.id.includes('IDLE'))).toEqual(s.reference.lines.filter(l=>l.id.includes('IDLE')))
  }
 })
 it('reproduces legacy-city monetary deltas and partial totals for the two cash cycles',()=>{
  const r=run(readLocalDocument,readLocalDocumentBytes,'LEGACY_CITY').supportingOperatingFluids,net=r.cash.filter(c=>c.baseCostId.includes('RATE_EXCLUDES_WEEKLY_REST:ALL_CAPITAL_CASH_NET_PLUS_VAT'))
  expect(r.scenarios.map(s=>Number(s.reference.knownVariableAdditionUsd.toFixed(6)))).toEqual([225.020248,483.269406])
  expect(net[0].alternatives.map(a=>Number(a.totalKnownComponentsUsd.toFixed(6)))).toEqual([4406.381272,4426.465522])
  expect(net[1].alternatives.map(a=>Number(a.totalKnownComponentsUsd.toFixed(6)))).toEqual([8717.765980,8760.350916])
  expect(net.every(c=>c.completeD2DCostUsd===null)).toBe(true)
 })
 it('conserves272 comparisons, CFU and prior alternative identities; CVU grows once',()=>{
  const r=result();expect(r.cash).toHaveLength(8);expect(r.financed).toHaveLength(128)
  for(const c of [...r.cash,...r.financed]){const p=[...base.cash,...base.financed].find(p=>p.baseCostId===c.baseCostId)!,s=r.scenarios.find(s=>s.cycleScenarioId===c.cycleScenarioId)!
   expect(c.priorAlternatives).toEqual(p.alternatives)
   expect(c.knownCvuComponentUsd).toBeCloseTo(p.knownCvuComponentUsd+s.reference.knownVariableAdditionUsd,10)
   for(const a of c.alternatives){const old=p.alternatives.find(o=>o.premiumAlternativeId===a.premiumAlternativeId)!
    expect(a.knownCfuComponentUsd).toBe(old.knownCfuComponentUsd)
    expect(a.totalKnownComponentsUsd).toBeCloseTo(a.knownCfuComponentUsd+c.knownCvuComponentUsd,10)
    expect(a.completeD2DCostUsd).toBeNull()
   }
   expect(c.operatingFluidsVariableAdditionUsd).toBe(r.cash.find(x=>x.baseCostId===c.cashComparisonId)!.operatingFluidsVariableAdditionUsd)
  }
 })
 it('rejects reapplication, changed source quantities/prices, mixed-cycle diesel and mismatched FX',()=>{
  expect(()=>calc(policy,result(),variables,duty,fx)).toThrow('ALREADY_APPLIED')
  for(const p of [{...policy,dieselBoundary:'FULL_CYCLE_INCLUDES_IDLE'}, {...policy,def:{...policy.def,usPackageNetUsd:8.88}}, {...policy,def:{...policy.def,volumeFraction:.09}}, {...policy,idle:{...policy.idle,annualReferenceHours:1800}}])expect(()=>calc(p,base,variables,duty,fx)).toThrow()
  expect(()=>calc(policy,base,variables,duty,{...fx,mxnPerUsd:20})).toThrow()
  const v=structuredClone(variables);v.scenarios[0].conditionalRoadFuelQuantity.usGallons+=1
  expect(()=>calc(policy,base,v,duty,fx)).toThrow('DIESEL_SOURCE_QUANTITY')
  const added=structuredClone(variables);added.scenarios[0].rows[0].id='MX_IDLE_ALREADY_INCLUDED'
  expect(()=>calc(policy,base,added,duty,fx)).toThrow('BASE_ALREADY_INCLUDES')
 })
 it('rejects duplicated costs/cycles/sources, overflow inputs and broken reference sums',()=>{
  const b=structuredClone(base);b.cash[1]=b.cash[0];expect(()=>calc(policy,b,variables,duty,fx)).toThrow('COST_DUPLICATE')
  const d=structuredClone(duty);d.scenarios[1]=d.scenarios[0];expect(()=>calc(policy,base,variables,d,fx)).toThrow('DUTY_DUPLICATE')
  const v=structuredClone(variables);v.scenarios[0].conditionalRoadFuelQuantity.mxLiters=1e300;expect(()=>calc(policy,base,v,duty,fx)).toThrow()
  const sum=structuredClone(base);sum.cash[0].alternatives[0].totalKnownComponentsUsd+=1;expect(()=>calc(policy,sum,variables,duty,fx)).toThrow('COST_SUM')
  const join=structuredClone(base);join.financed[0].cashComparisonId='none';expect(()=>calc(policy,join,variables,duty,fx)).toThrow('COST_JOIN')
  const q=structuredClone(policy);q.sources[1]=q.sources[0];expect(()=>calc(q,base,variables,duty,fx)).toThrow('SOURCE_SET')
  const fake=structuredClone(policy);fake.sources[0].capture='ORIGINAL_HTTP_HTML';expect(()=>calc(fake,base,variables,duty,fx)).toThrow('SOURCE_SET')
 })
 it.each(policy.sources.filter((s:any)=>s.archive).map((s:any)=>s.archive.file) as string[])('rejects altered original source %s',file=>{
  expect(()=>run(readLocalDocument,p=>p===file?new Uint8Array([0]):readLocalDocumentBytes(p))).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH')
 })
})
