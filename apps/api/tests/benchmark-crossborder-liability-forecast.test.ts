import {describe,it,expect} from 'vitest'
import {calculateCrossborderLiabilityForecast as calc} from '../scripts/lib/reference-crossborder-liability-forecast.js'
import {consolidateBinationalReferenceBudget as run} from '../scripts/consolidate-binational-reference-budget.js'
import {readLocalDocument} from '../scripts/assemble-economic-reference-cards.js'

const file='docs/research/B2_CROSSBORDER_LIABILITY_FORECAST_2026-10-03.json',policy=JSON.parse(readLocalDocument(file))
const legacy=run(),withWear=run(undefined,undefined,'POSTAL_REFERENCE','PUBLIC_LINK_FORECAST','IMT_C3_NON_ARTICULATED_PROXY')
const base=withWear.supportingMxBobtailWearReference,exposure=withWear.supportingCrossborderInsuranceExposure
const result=()=>calc(policy,base,exposure,'PUBLIC_US_PRIMARY_LIABILITY_PROXY')

describe('one MX annual primary liability planning pool, unmatched domestic US reference',()=>{
 it('keeps broker cohorts, periods and unknown denominator separate from foreign premium',()=>{
  const r=result()
  expect(r.source).toMatchObject({publicationDate:'2026-03-20',capture:'PRIMARY_WEB_READER_NOT_ARCHIVED',sourceUnitCount:null,sampleSize:null,
   premiumDenominator:'OWNER_OPERATOR_ANNUAL_PRIMARY_LIABILITY_NOT_EXPLICIT_PER_TRUCK',taxesFeesSeparatelyPublished:false})
  expect(r.premiums.map(p=>p.annualPlanningPoolUsd)).toEqual([7500,12000,5000,9000])
  expect(r.cohorts[0].sourcePeriod).toBe('2025');expect(r.cohorts[1].sourcePeriod).toBeNull()
  expect(r.target).toMatchObject({planningAnnualLiabilityPools:1,sourceForeignDomicileMatched:false,sourceCommercialZoneMatched:false,
   sourceUnitDenominatorMatched:false,insuredLimitMatched:false,operatorHistorySelected:false,actualEligibilityVerified:false,actualAnnualPremiumUsd:null})
 })
 it('uses only annual MX MAX resource share, not incursions, box or financing count',()=>{
  const r=result()
  for(const s of r.scenarios){const e=exposure.scenarios.find(e=>e.cycleScenarioId===s.cycleScenarioId)!
   expect(s.conditionalAnnualPremiumShare).toBe(e.conditionalAnnualPremiumShare)
   for(const a of s.alternatives){
    expect(a.conditionalAnnualCfuAdditionUsd).toBeCloseTo(a.annualPlanningPoolUsd*e.conditionalMonthlyResourceShare/12,10)
    expect(a).toMatchObject({classification:'CFU',temporaryPremiumUsd:null,temporaryCvuAdditionUsd:null,actualForeignPremiumUsd:null,sourceIsForeignQuote:false,isMarketBound:false})
   }
  }
  expect(r).toMatchObject({cfusChanged:true,cvusChanged:false,temporaryPremiumAdded:false,physicalDamageAdded:false,boxChargedAgain:false,usTractorChargedAgain:false,adminChargedAgain:false})
 })
 it('joins1088 comparisons and every yard tax variant with one unchanged CVU and conserved sums',()=>{
  const r=result()
  expect(r.cash).toHaveLength(8);expect(r.financed).toHaveLength(128)
  let count=0
  for(const c of [...r.cash,...r.financed]){
   const prior=[...base.cash,...base.financed].find(p=>p.baseCostId===c.baseCostId)!,s=r.scenarios.find(s=>s.cycleScenarioId===c.cycleScenarioId)!
   expect(c.knownCvuComponentUsd).toBe(prior.knownCvuComponentUsd)
   expect(c.liabilityAlternatives).toHaveLength(4)
   for(const a of c.liabilityAlternatives){const addition=s.alternatives.find(s=>s.id===a.id)!.conditionalAnnualCfuAdditionUsd
    expect(a.conditionalAnnualCfuAdditionUsd).toBe(addition)
    expect(a.conditionalAnnualCfuAdditionUsd).toBe(r.cash.find(p=>p.baseCostId===c.cashComparisonId)!.liabilityAlternatives.find(p=>p.id===a.id)!.conditionalAnnualCfuAdditionUsd)
    for(const b of a.alternatives){const p=prior.alternatives.find(p=>p.premiumAlternativeId===b.premiumAlternativeId)!
     count++;expect(b.knownCfuComponentUsd).toBeCloseTo(p.knownCfuComponentUsd+addition,10)
     expect(b.knownCvuComponentUsd).toBe(c.knownCvuComponentUsd)
     expect(b.totalKnownComponentsUsd).toBeCloseTo(b.knownCfuComponentUsd+b.knownCvuComponentUsd,10)
    }
    for(const t of a.taxSensitivity)for(const b of t.alternatives){const p=prior.taxSensitivity.find(p=>p.id===t.id)!.alternatives.find(p=>p.premiumAlternativeId===b.premiumAlternativeId)!
     expect(b.knownCfuComponentUsd).toBeCloseTo(p.knownCfuComponentUsd+addition,10)
     expect(b.totalKnownComponentsUsd).toBeCloseTo(p.totalKnownComponentsUsd+addition,10)
    }
   }
  }
  expect(count).toBe(1088)
 })
 it('integrates selected root forecast without changing prior budgets, cargo, clock, or outputs',()=>{
  const r=run(undefined,undefined,'POSTAL_REFERENCE','PUBLIC_LINK_FORECAST','IMT_C3_NON_ARTICULATED_PROXY','PUBLIC_US_PRIMARY_LIABILITY_PROXY')
  expect(r.supportingCrossborderLiabilityForecast).toEqual(result())
  expect(r.supportingMxBobtailWearReference).toEqual(base)
  expect(r.supportingCargoTripInsurance).toEqual(withWear.supportingCargoTripInsurance)
  expect(r.supportingCrossborderInsuranceExposure).toEqual(exposure)
  expect(r.supportingPilotOrdinaryDuty).toEqual(withWear.supportingPilotOrdinaryDuty)
  expect(Object.values(r.outputs).every(v=>v===null)).toBe(true)
  expect(Object.values(r.externalChanges).every(v=>v===false)).toBe(true)
  expect(r.supportingCrossborderLiabilityForecast).toMatchObject({completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,adoptedValues:0,quoteReady:false})
 })
 it('preserves unpriced defaults without turning actual premium into zero',()=>{
  for(const root of [legacy,withWear]){const r=root.supportingCrossborderLiabilityForecast
   expect(r.basis).toBe('UNPRICED');expect(r.crossborderLiabilityProjectionApplied).toBe(false)
   for(const c of [...r.cash,...r.financed]){
    const prev=[...root.supportingMxBobtailWearReference.cash,...root.supportingMxBobtailWearReference.financed].find(p=>p.baseCostId===c.baseCostId)!
    for(const a of c.liabilityAlternatives){
     expect(a.conditionalAnnualCfuAdditionUsd).toBeNull();expect(a.actualForeignPremiumUsd).toBeNull()
     expect(a.alternatives.map(b=>b.knownCfuComponentUsd)).toEqual(prev.alternatives.map(b=>b.knownCfuComponentUsd))
     expect(a.alternatives.map(b=>b.totalKnownComponentsUsd)).toEqual(prev.alternatives.map(b=>b.totalKnownComponentsUsd))
    }
   }
  }
 })
 it('requires explicit forecast link and rejects unknown mode',()=>{
  expect(()=>run(undefined,undefined,'POSTAL_REFERENCE','UNRESOLVED_LINK','UNPRICED','PUBLIC_US_PRIMARY_LIABILITY_PROXY')).toThrow('CROSSBORDER_LIABILITY_REQUIRES_EXPLICIT_LINK_FORECAST')
  expect(()=>calc(policy,base,exposure,'ACTUAL_QUOTE' as never)).toThrow('CROSSBORDER_LIABILITY_BASIS_INVALID')
 })
 it('is deterministic and does not mutate prior cash, finance or evidence',()=>{
  const before=JSON.stringify({policy,base,exposure});expect(result()).toEqual(result());expect(JSON.stringify({policy,base,exposure})).toBe(before)
 })
 it('rejects doubled insurance, duplicated cycles/costs/alternatives and annual-share corruption',()=>{
  expect(()=>calc(policy,result(),exposure)).toThrow('CROSSBORDER_LIABILITY_ALREADY_PROJECTED')
  const rows=structuredClone(base);rows.cash[0]={...rows.cash[0],crossborderLiabilityProjectionApplied:true} as typeof rows.cash[number];expect(()=>calc(policy,rows,exposure)).toThrow('CROSSBORDER_LIABILITY_ALREADY_PROJECTED')
  const dup=structuredClone(base);dup.cash[1]=dup.cash[0];expect(()=>calc(policy,dup,exposure)).toThrow('CROSSBORDER_LIABILITY_COST_DUPLICATE')
  const cycles=structuredClone(exposure);cycles.scenarios[1]=cycles.scenarios[0];expect(()=>calc(policy,base,cycles)).toThrow('CROSSBORDER_LIABILITY_CYCLE_DUPLICATE')
  const share=structuredClone(exposure);share.scenarios[0].conditionalAnnualPremiumShare*=12;expect(()=>calc(policy,base,share)).toThrow('CROSSBORDER_LIABILITY_ANNUAL_EXPOSURE_MISMATCH')
  const alt=structuredClone(base);alt.cash[0].alternatives[1]=alt.cash[0].alternatives[0];expect(()=>calc(policy,alt,exposure)).toThrow('CROSSBORDER_LIABILITY_ALTERNATIVE_DUPLICATE')
 })
 it('rejects cost sum/join mismatches and stale pre-bobtail tax totals',()=>{
  const sum=structuredClone(base);sum.cash[0].alternatives[0].totalKnownComponentsUsd+=1;expect(()=>calc(policy,sum,exposure)).toThrow('CROSSBORDER_LIABILITY_COST_SUM_MISMATCH')
  const join=structuredClone(base);join.financed[0].cashComparisonId='MISSING';expect(()=>calc(policy,join,exposure)).toThrow('CROSSBORDER_LIABILITY_COST_JOIN_MISMATCH')
  const tax=structuredClone(base);tax.cash[0].taxSensitivity[0].alternatives[0].knownCvuComponentUsd-=1;expect(()=>calc(policy,tax,exposure)).toThrow('CROSSBORDER_LIABILITY_TAX_SUM_OR_JOIN_MISMATCH')
 })
 it('rejects fabricated premiums, dates, unit counts, foreign acceptance or added temporary price',()=>{
  for(const change of [{...policy,target:{...policy.target,actualEligibilityVerified:true}},
   {...policy,target:{...policy.target,planningAnnualLiabilityPools:2}},
   {...policy,source:{...policy.source,sourceUnitCount:1}},
   {...policy,cohorts:[{...policy.cohorts[0],annualPremiumUsdEndpoints:[7500,18000]},policy.cohorts[1]]},
   {...policy,cohorts:[policy.cohorts[0],{...policy.cohorts[1],sourcePeriod:'2025'}]}])expect(()=>calc(change,base,exposure)).toThrow()
  expect(()=>calc(policy,base,{...exposure,temporaryPremiumPer24hUsd:50})).toThrow()
  for(const amount of [-1,NaN,Infinity,1e300]){const e=structuredClone(exposure);e.scenarios[0].conditionalAnnualPremiumShare=amount;expect(()=>calc(policy,base,e)).toThrow()}
 })
 it('fails closed on altered pinned source card',()=>{
  expect(()=>run(p=>p===file?readLocalDocument(p)+' ':readLocalDocument(p))).toThrow('SOURCE_HASH_MISMATCH:crossborderLiabilityForecast')
 })
})
