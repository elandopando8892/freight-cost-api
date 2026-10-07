import {describe,it,expect} from 'vitest'
import {calculatePilotCargoInsuranceProjection as calculate} from '../scripts/lib/reference-pilot-cargo-insurance.js'
import {consolidateBinationalReferenceBudget as run} from '../scripts/consolidate-binational-reference-budget.js'
import {readLocalDocument} from '../scripts/assemble-economic-reference-cards.js'

const doc=(name:string)=>JSON.parse(readLocalDocument(`docs/research/${name}`))
const policy=doc('B2_CARGO_TRIP_INSURANCE_2026-10-02.json'),fx=doc('B2_FX_REFERENCE_2026-10-02.json')
const root=run(undefined,undefined,'POSTAL_REFERENCE','PUBLIC_LINK_FORECAST','IMT_C3_NON_ARTICULATED_PROXY','PUBLIC_US_PRIMARY_LIABILITY_PROXY')
const base=root.supportingCrossborderLiabilityForecast
const choice=(taxTreatment='GROSS_VAT_NOT_CREDITABLE_PLANNING',declaredValueMxn=500000)=>({mode:'INCLUDE_IN_MODELED_TRANSPORT_COST',
 declaredValueMxn,cargoDescription:'Synthetic public-price example, not actual pilot cargo',taxTreatment})
const excluded={mode:'SEPARATE_SHIPPER_COST',declaredValueMxn:null,cargoDescription:null,taxTreatment:null}
const compare=(selection:unknown)=>calculate(base,policy,fx,selection)

describe('cargo joins the final cash/finance reference chain once per outbound shipment',()=>{
 it.each(['NET_VAT_CREDITABLE_PLANNING','GROSS_VAT_NOT_CREDITABLE_PLANNING'])('adds exactly one %s component in all1088 plus2176 tax comparisons',(tax)=>{
  const before=JSON.stringify({base,policy,fx}),r=compare(choice(tax)),delta=(tax.startsWith('NET')?2400:2784)/18.3688
  let count=0,taxCount=0
  expect(r.cash).toHaveLength(8);expect(r.financed).toHaveLength(128)
  for(const c of [...r.cash,...r.financed]){
   const p=[...base.cash,...base.financed].find(p=>p.baseCostId===c.baseCostId)!
   expect(c.knownCvuComponentUsd).toBeCloseTo(p.knownCvuComponentUsd+delta,10)
   expect(c.cargoTripComponent).toBe(r.reference.pilotComponent)
   for(const a of c.liabilityAlternatives){
    const old=p.liabilityAlternatives.find(p=>p.id===a.id)!
    const check=(next:typeof a.alternatives[number],prior:typeof old.alternatives[number])=>{
     expect(next.knownCfuComponentUsd).toBe(prior.knownCfuComponentUsd)
     expect(next.knownCvuComponentUsd).toBeCloseTo(prior.knownCvuComponentUsd+delta,10)
     expect(next.totalKnownComponentsUsd).toBeCloseTo(prior.totalKnownComponentsUsd+delta,10)
     expect(next).toMatchObject({completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,quoteReady:false,selected:false,existingCarrierCargoPolicyRemoved:false})
    }
    for(const b of a.alternatives){count++;check(b,old.alternatives.find(p=>p.premiumAlternativeId===b.premiumAlternativeId)!)}
    for(const t of a.taxSensitivity)for(const b of t.alternatives){taxCount++;check(b,old.taxSensitivity.find(p=>p.id===t.id)!.alternatives.find(p=>p.premiumAlternativeId===b.premiumAlternativeId)!)}
   }
  }
  expect(count).toBe(1088);expect(taxCount).toBe(2176)
  expect(r).toMatchObject({primaryComparisonCount:1088,taxComparisonCount:2176,sourcePriceCalculationCount:1,
   emptyReturnMultipliesPremium:false,boxChargedAgain:false,adminChargedAgain:false,actualCargoObserved:false,coverageAcceptanceObserved:false})
  expect(JSON.stringify({base,policy,fx})).toBe(before)
 })
 it('leaves pending and undocumented fee totals null, never replacing missing cost with zero',()=>{
  for(const selection of [undefined,choice('GROSS_VAT_NOT_CREDITABLE_PLANNING',600000)]){
   const r=compare(selection),c=r.cash[0],a=c.liabilityAlternatives[0].alternatives[0],old=base.cash[0].liabilityAlternatives[0].alternatives[0]
   expect(c.knownCvuComponentUsd).toBeNull();expect(a.totalKnownComponentsUsd).toBeNull()
   expect(a.priorTotalKnownComponentsUsd).toBe(old.totalKnownComponentsUsd)
   expect(a.knownCfuComponentUsd).toBe(old.knownCfuComponentUsd)
  }
 })
 it('explicit separate shipper scope excludes only supplemental cargo, retaining carrier insurance and all prior costs',()=>{
  const r=compare(excluded)
  expect(r.reference.pilotComponent).toMatchObject({amountUsd:0,status:'EXCLUDED_BY_EXPLICIT_COST_SCOPE'})
  expect(r.existingCarrierCargoPolicyRemoved).toBe(false)
  expect(root.reviewedUsInsurancePublicModel.cargoAnnualProxyUsd).toBe(1553)
  for(const c of [...r.cash,...r.financed])for(const a of c.liabilityAlternatives)for(const p of a.alternatives){
   expect(p.totalKnownComponentsUsd).toBe(p.priorTotalKnownComponentsUsd)
   expect(p.knownCvuComponentUsd).toBe(p.priorKnownCvuComponentUsd)
  }
 })
 it('integrates an explicit seventh argument without rewriting prior budgets or complete outputs',()=>{
  const r=run(undefined,undefined,'POSTAL_REFERENCE','PUBLIC_LINK_FORECAST','IMT_C3_NON_ARTICULATED_PROXY','PUBLIC_US_PRIMARY_LIABILITY_PROXY',choice())
  expect(r.supportingPilotCargoInsurance).toEqual(compare(choice()))
  expect(r.supportingCargoTripInsurance).toEqual(r.supportingPilotCargoInsurance.reference)
  expect(r.supportingCrossborderLiabilityForecast).toEqual(base)
  expect(r.supportingMxBobtailWearReference).toEqual(root.supportingMxBobtailWearReference)
  expect(r.supportingPilotOrdinaryDuty).toEqual(root.supportingPilotOrdinaryDuty)
  expect(Object.values(r.outputs).every(v=>v===null)).toBe(true)
  expect(Object.values(r.externalChanges).every(v=>v===false)).toBe(true)
  expect(root.supportingPilotCargoInsurance.reference.pilotComponent.amountUsd).toBeNull()
 })
 it('is deterministic and refuses a second application',()=>{
  const r=compare(choice());expect(compare(choice())).toEqual(r)
  expect(()=>calculate(r,policy,fx,choice())).toThrow('ALREADY_PROJECTED')
  const bad=structuredClone(base);(bad.cash[0] as Record<string,unknown>).cargoTripProjectionApplied=true
  expect(()=>calculate(bad,policy,fx,choice())).toThrow('ALREADY_PROJECTED')
 })
 it.each(['base','join','liability','premium','tax','sum','cvu'])('rejects corrupt %s provenance or arithmetic',(kind)=>{
  const bad=structuredClone(base),a=bad.cash[0].liabilityAlternatives[0]
  if(kind==='base')bad.cash[1].baseCostId=bad.cash[0].baseCostId
  if(kind==='join')bad.financed[0].cashComparisonId='ABSENT'
  if(kind==='liability')bad.cash[0].liabilityAlternatives[1].id=a.id
  if(kind==='premium')a.alternatives[1].premiumAlternativeId=a.alternatives[0].premiumAlternativeId
  if(kind==='tax')a.taxSensitivity[1].id=a.taxSensitivity[0].id
  if(kind==='sum')a.taxSensitivity[0].alternatives[0].totalKnownComponentsUsd+=1
  if(kind==='cvu')a.alternatives[0].knownCvuComponentUsd+=1
  expect(()=>calculate(bad,policy,fx,choice())).toThrow()
 })
 it('rejects absent commodity/tax choice and a changed public premium',()=>{
  expect(()=>compare({...choice(),cargoDescription:''})).toThrow()
  expect(()=>compare({...choice(),taxTreatment:null})).toThrow()
  expect(()=>calculate(base,{...policy,premiumRate:0.005},fx,choice())).toThrow()
 })
})
