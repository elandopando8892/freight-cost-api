import {describe,it,expect} from 'vitest'
import {calculateMxBobtailWearReference as calc} from '../scripts/lib/reference-mx-bobtail-wear.js'
import {consolidateBinationalReferenceBudget as run} from '../scripts/consolidate-binational-reference-budget.js'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'

const file='docs/research/B2_MX_BOBTAIL_WEAR_REFERENCE_2026-10-03.json'
const policy=JSON.parse(readLocalDocument(file)),fx=JSON.parse(readLocalDocument('docs/research/B2_FX_REFERENCE_2026-10-02.json'))
const legacy=run(),forecast=run(undefined,undefined,'POSTAL_REFERENCE','PUBLIC_LINK_FORECAST')
const base=forecast.supportingMxReservedYard,variables=forecast.supportingPilotVariableEconomics
const result=()=>calc(policy,base,variables,fx,'IMT_C3_NON_ARTICULATED_PROXY')

describe('explicit unmatched IMT C3 bobtail wear sensitivity, not tractor-only calibration',()=>{
 it('retains the whole primary reference identity and four printed expenses, not rounded products',()=>{
  const r=result()
  expect(r.source).toMatchObject({id:'IMT_PT881_C3',period:'2025',outputLocator:'Table 4.4, printed page 53, physical PDF page 63'})
  expect(r.sourceVehicle).toMatchObject({horsepower:250,tires:10,rigidBodyFeet:23,hasSemitrailer:false,hasRigidBody:true,rigidBodyWearSeparable:false})
  expect(r.printedCostsMxnPer1000VehicleKm).toEqual({maintenanceLabor:820.06,maintenanceParts:1696.51,lubricants:172.97,tires:690.69})
  expect(r.nativeMxnPerKm).toBeCloseTo(3.38023,10)
  expect(r.rates[0].nativeMxnPerKm).not.toBeCloseTo(12.43*65.95/1000,7)
  expect(r.rates[2].nativeMxnPerKm).not.toBeCloseTo(3.37*51.3/1000,7)
  expect(r.rates[3].nativeMxnPerKm).not.toBeCloseTo(.24*2926.73/1000,7)
  expect(r.target).toMatchObject({matchedVehicle:false,matchedPayload:false,matchedTireLifecycle:false,observedBobtailRate:false,biasDirectionKnown:false})
 })
 it('prices four wear lines only over bobtail km for both complete forecast topologies',()=>{
  const r=result()
  expect(r.scenarios.map(s=>s.mxBobtailKm)).toEqual([100.67607992477375,16.09344])
  for(const s of r.scenarios){
   expect(s.rows).toHaveLength(4)
   expect(s.conditionalWearUsd).toBeCloseTo(s.mxBobtailKm*3.38023/18.3688,10)
   expect(s.rows.reduce((sum,line)=>sum+line.conditionalAmountUsd!,0)).toBeCloseTo(s.conditionalWearUsd!,10)
   expect(s).toMatchObject({actualTractorOnlyCostUsd:null,sourceVehicleMatched:false,rigidBodyEffectSeparable:false,isLowerBound:false,quoteReady:false})
  }
 })
 it('joins all272 cash/finance comparisons once and conserves CFU, including yard tax variants',()=>{
  const r=result()
  expect(r.cash).toHaveLength(8);expect(r.financed).toHaveLength(128)
  for(const c of [...r.cash,...r.financed]){
   const prior=[...base.cash,...base.financed].find(p=>p.baseCostId===c.baseCostId)!,s=r.scenarios.find(s=>s.cycleScenarioId===c.cycleScenarioId)!
   expect(c.conditionalBobtailWearAdditionUsd).toBe(s.conditionalWearUsd)
   expect(c.knownCvuComponentUsd).toBeCloseTo(prior.knownCvuComponentUsd+s.conditionalWearUsd!,10)
   expect(c.conditionalBobtailWearAdditionUsd).toBe(r.cash.find(p=>p.baseCostId===c.cashComparisonId)!.conditionalBobtailWearAdditionUsd)
   for(const a of c.alternatives){const p=prior.alternatives.find(p=>p.premiumAlternativeId===a.premiumAlternativeId)!
    expect(a.knownCfuComponentUsd).toBe(p.knownCfuComponentUsd)
    expect(a.totalKnownComponentsUsd).toBeCloseTo(p.totalKnownComponentsUsd+s.conditionalWearUsd!,10)
    expect(a.totalKnownComponentsUsd).toBeCloseTo(a.knownCfuComponentUsd+c.knownCvuComponentUsd,10)
   }
   for(const t of c.taxSensitivity)for(const a of t.alternatives){
    const p=prior.taxSensitivity.find(p=>p.id===t.id)!.alternatives.find(p=>p.premiumAlternativeId===a.premiumAlternativeId)!
    expect(a.knownCfuComponentUsd).toBe(p.knownCfuComponentUsd)
    expect(a.totalKnownComponentsUsd).toBeCloseTo(p.totalKnownComponentsUsd+s.conditionalWearUsd!,10)
    expect(a.totalKnownComponentsUsd).toBeCloseTo(a.knownCfuComponentUsd+a.knownCvuComponentUsd,10)
   }
  }
  expect(r).toMatchObject({cfusChanged:false,cvusChanged:true,attachedWearChanged:false,boxChargedAgain:false,adminChargedAgain:false})
 })
 it('integrates optional root mode while preserving all previous stages and null complete outputs',()=>{
  const r=run(undefined,undefined,'POSTAL_REFERENCE','PUBLIC_LINK_FORECAST','IMT_C3_NON_ARTICULATED_PROXY')
  expect(r.supportingMxBobtailWearReference).toEqual(result())
  expect(r.supportingMxReservedYard).toEqual(base)
  expect(r.supportingPilotVariableEconomics).toEqual(variables)
  expect(r.supportingCompanyServicesCfu).toEqual(forecast.supportingCompanyServicesCfu)
  expect(r.supportingPilotOrdinaryDuty).toEqual(forecast.supportingPilotOrdinaryDuty)
  expect(Object.values(r.outputs).every(v=>v===null)).toBe(true)
  expect(Object.values(r.externalChanges).every(v=>v===false)).toBe(true)
  expect(r.supportingMxBobtailWearReference).toMatchObject({actualTractorOnlyCostUsd:null,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,adoptedValues:0,quoteReady:false})
 })
 it('retains unpriced defaults, not zero costs; absent legacy loop quantity is not zero wear evidence',()=>{
  for(const root of [legacy,forecast]){
   const r=root.supportingMxBobtailWearReference
   expect(r.basis).toBe('UNPRICED');expect(r.bobtailWearProjectionApplied).toBe(false)
   for(const c of [...r.cash,...r.financed]){
    const p=[...root.supportingMxReservedYard.cash,...root.supportingMxReservedYard.financed].find(p=>p.baseCostId===c.baseCostId)!
    expect(c.conditionalBobtailWearAdditionUsd).toBeNull()
    expect(c.knownCvuComponentUsd).toBe(p.knownCvuComponentUsd)
    expect(c.alternatives.map(a=>a.totalKnownComponentsUsd)).toEqual(p.alternatives.map(a=>a.totalKnownComponentsUsd))
   }
  }
  expect(legacy.supportingMxBobtailWearReference.scenarios[1]).toMatchObject({conditionalWearUsd:null,quantityBasis:'UNRESOLVED_LINK_NOT_ZERO_WEAR'})
 })
 it('requires explicit road/link compatibility and rejects unexpected model selections',()=>{
  expect(()=>run(undefined,undefined,'POSTAL_REFERENCE','UNRESOLVED_LINK','IMT_C3_NON_ARTICULATED_PROXY')).toThrow('MX_BOBTAIL_REQUIRES_EXPLICIT_LINK_FORECAST')
  expect(()=>run(undefined,undefined,'LEGACY_CITY','PUBLIC_LINK_FORECAST','IMT_C3_NON_ARTICULATED_PROXY')).toThrow('BORDER_LINK_REQUIRES_MATCHED_POSTAL_YARD_REFERENCE')
  expect(()=>calc(policy,base,variables,fx,'CALIBRATED' as never)).toThrow('MX_BOBTAIL_BASIS_INVALID')
  expect(()=>calc(policy,legacy.supportingMxReservedYard,legacy.supportingPilotVariableEconomics,fx,'IMT_C3_NON_ARTICULATED_PROXY')).toThrow('MX_BOBTAIL_REQUIRES_EXPLICIT_LINK_FORECAST')
 })
 it('is deterministic and leaves every input unchanged',()=>{
  const before=JSON.stringify({policy,base,variables,fx})
  expect(result()).toEqual(result());expect(JSON.stringify({policy,base,variables,fx})).toBe(before)
 })
 it('rejects double application and duplicate cost, cycle, alternative or tax identities',()=>{
  expect(()=>calc(policy,result(),variables,fx)).toThrow('MX_BOBTAIL_ALREADY_PROJECTED')
  const row=structuredClone(base);row.cash[0]={...row.cash[0],bobtailWearProjectionApplied:true} as typeof row.cash[number];expect(()=>calc(policy,row,variables,fx)).toThrow('MX_BOBTAIL_ALREADY_PROJECTED')
  const dup=structuredClone(base);dup.cash[1]=dup.cash[0];expect(()=>calc(policy,dup,variables,fx)).toThrow('MX_BOBTAIL_COST_DUPLICATE')
  const cycles=structuredClone(variables);cycles.scenarios[1]=cycles.scenarios[0];expect(()=>calc(policy,base,cycles,fx)).toThrow('MX_BOBTAIL_CYCLE_DUPLICATE')
  const alt=structuredClone(base);alt.cash[0].alternatives[1]=alt.cash[0].alternatives[0];expect(()=>calc(policy,alt,variables,fx)).toThrow('MX_BOBTAIL_ALTERNATIVE_DUPLICATE')
  const tax=structuredClone(base);tax.cash[0].taxSensitivity[1]=tax.cash[0].taxSensitivity[0];expect(()=>calc(policy,tax,variables,fx)).toThrow('MX_BOBTAIL_TAX_DUPLICATE')
 })
 it('rejects attached/bobtail overlap and mismatched whole-tractor distance',()=>{
  const overlap=structuredClone(variables);overlap.scenarios[0].rows.find(r=>r.id==='MX_MAINT')!.km+=overlap.scenarios[0].mxBobtailKm
  expect(()=>calc(policy,base,overlap,fx)).toThrow('MX_BOBTAIL_ATTACHED_WEAR_SCOPE_MISMATCH')
  const whole=structuredClone(variables);whole.scenarios[0].mxBobtailKm+=1;expect(()=>calc(policy,base,whole,fx)).toThrow('MX_BOBTAIL_TRACTOR_DISTANCE_MISMATCH')
  const rows=structuredClone(variables);rows.scenarios[0].rows[1]=rows.scenarios[0].rows[0];expect(()=>calc(policy,base,rows,fx)).toThrow('MX_BOBTAIL_VARIABLE_ROW_DUPLICATE')
 })
 it('rejects corrupt previous sums, cash-finance joins and yard-tax totals',()=>{
  const sum=structuredClone(base);sum.cash[0].alternatives[0].totalKnownComponentsUsd+=1;expect(()=>calc(policy,sum,variables,fx)).toThrow('MX_BOBTAIL_COST_SUM_MISMATCH')
  const join=structuredClone(base);join.financed[0].knownCvuComponentUsd+=1;expect(()=>calc(policy,join,variables,fx)).toThrow('MX_BOBTAIL_COST_JOIN_MISMATCH')
  const tax=structuredClone(base);tax.cash[0].taxSensitivity[1].alternatives[0].totalKnownComponentsUsd+=1;expect(()=>calc(policy,tax,variables,fx)).toThrow('MX_BOBTAIL_TAX_SUM_OR_JOIN_MISMATCH')
 })
 it('rejects fabricated source values, matched-vehicle claims, shifted dates and invalid quantities',()=>{
  for(const change of [{...policy,printedCostsMxnPer1000VehicleKm:{...policy.printedCostsMxnPer1000VehicleKm,tires:0}},
   {...policy,target:{...policy.target,matchedVehicle:true}},{...policy,sourceVehicle:{...policy.sourceVehicle,hasRigidBody:false}},
   {...policy,source:{...policy.source,period:'2026'}},{...policy,source:{...policy.source,archive:{...policy.source.archive,sha256:'0'.repeat(64)}}}])expect(()=>calc(change,base,variables,fx)).toThrow()
  expect(()=>calc(policy,base,variables,{...fx,mxnPerUsd:20})).toThrow()
  for(const km of [-1,NaN,Infinity,1e300]){const v=structuredClone(variables);v.scenarios[0].mxBobtailKm=km;expect(()=>calc(policy,base,v,fx)).toThrow()}
 })
 it('fails closed if either source card or original PDF archive is changed',()=>{
  expect(()=>run(p=>p===file?readLocalDocument(p)+' ':readLocalDocument(p))).toThrow('SOURCE_HASH_MISMATCH:mxBobtailWear')
  // The existing maintenance verifier rejects this shared archive before the new stage.
  expect(()=>run(readLocalDocument,p=>p===policy.source.archive.file?new Uint8Array([0]):readLocalDocumentBytes(p))).toThrow('SOURCE_HASH_MISMATCH:docs/research/sources/IMT_PT881_2025.pdf')
 })
})
