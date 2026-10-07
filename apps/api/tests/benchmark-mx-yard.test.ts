import {describe,it,expect} from 'vitest'
import {calculateMxReservedYard as calc} from '../scripts/lib/reference-mx-yard.js'
import {consolidateBinationalReferenceBudget as run} from '../scripts/consolidate-binational-reference-budget.js'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'
const policy=JSON.parse(readLocalDocument('docs/research/B2_MX_YARD_2026-10-02.json')),fx=JSON.parse(readLocalDocument('docs/research/B2_FX_REFERENCE_2026-10-02.json'))
const root=run(),base=root.supportingOperatingFluids,company=root.supportingCompanyServicesCfu,duty=root.supportingPilotOrdinaryDuty
const result=()=>calc(policy,base,company,duty,fx)
describe('one MX reserved tractor yard, explicit daily-capacity and tax hypotheses',()=>{
 it('joins root without mutating inputs or claiming complete cost or selected provider',()=>{
  const before=JSON.stringify({policy,base,company,duty,fx}),r=result()
  expect(r).toEqual(root.supportingMxReservedYard);expect(JSON.stringify({policy,base,company,duty,fx})).toBe(before)
  expect(r).toMatchObject({cvusChanged:false,cfusChanged:true,actualSiteSelected:false,monthlyContractObserved:false,taxesVerified:false,externalWrites:false,quoteReady:false,adoptedValues:0,completeD2DCostUsd:null})
  expect(Object.values(root.outputs).every(v=>v===null)).toBe(true)
 })
 it('keeps daily period and special conflict, with calendar reservation not24productive days',()=>{
  const r=result();expect(r.taxScenarios.map(s=>s.grossMonthlyMxn)).toEqual([250*365/12*1.16,250*365/12])
  expect(r.taxScenarios[0].monthlyUsd).toBeCloseTo(250*365/12*1.16/18.3688,10)
  expect(r.pricing).toMatchObject({conflictingSpecialDailyMxn:150,sourceEffectiveDate:null,sourceTaxes:'UNSPECIFIED',contractedMonthlyPriceMxn:null})
  expect(r.quantity.reservedMxTrailerSpaces).toBe(0)
 })
 it('uses only MX resource MAX exposure rather than box time or rounded dwell',()=>{
  for(const a of result().cycleAllocations){const c=company.cycleAllocations.find(c=>c.cycleScenarioId===a.cycleScenarioId)!,mx=c.resources.find(r=>r.resourceId==='MX_TRACTOR')!
   expect(a.resourceId).toBe('MX_TRACTOR');expect(a.timeExposure).toBe(mx.timeExposure);expect(a.distanceExposure).toBe(mx.distanceExposure)
   for(const t of a.taxScenarios)expect(t.fixedAdditionUsd).toBeCloseTo(t.monthlyUsd*Math.max(mx.timeExposure,mx.distanceExposure),10)
  }
 })
 it('conserves272 comparisons, all CVU and cash-finance addition with one tax scenario selected',()=>{
  const r=result();expect(r.cash).toHaveLength(8);expect(r.financed).toHaveLength(128)
  for(const c of [...r.cash,...r.financed]){const prior=[...base.cash,...base.financed].find(p=>p.baseCostId===c.baseCostId)!
   expect(c.knownCvuComponentUsd).toBe(prior.knownCvuComponentUsd);expect(c.priorAlternatives).toEqual(prior.alternatives)
   expect(c.mxYardFixedAdditionUsd).toBe(r.cash.find(x=>x.baseCostId===c.cashComparisonId)!.mxYardFixedAdditionUsd)
   expect(c.taxSensitivity).toHaveLength(2)
   for(const a of c.alternatives){const p=prior.alternatives.find(p=>p.premiumAlternativeId===a.premiumAlternativeId)!
    expect(a.knownCfuComponentUsd).toBeCloseTo(p.knownCfuComponentUsd+c.mxYardFixedAdditionUsd,10)
    expect(a.totalKnownComponentsUsd).toBeCloseTo(a.knownCfuComponentUsd+c.knownCvuComponentUsd,10)
    expect(a.completeD2DCostUsd).toBeNull()
   }
   expect(c.taxSensitivity[0].alternatives.map(a=>a.totalKnownComponentsUsd)).toEqual(c.alternatives.map(a=>a.totalKnownComponentsUsd))
  }
 })
 it('allocates by distance when a synthetic supported exposure exceeds time, not time unconditionally',()=>{
  const c=structuredClone(company),d=structuredClone(duty)
  c.cycleAllocations[0].resources.find(r=>r.resourceId==='MX_TRACTOR')!.distanceExposure=.9
  for(const a of d.scenarios[0].conditionalFixedAllocations){const mx=a.resources.find(r=>r.resourceId==='MX_TRACTOR')!;mx.oldDistanceProxyByKmUsd=mx.knownMonthlyComponentUsd*.9}
  const r=calc(policy,base,c,d,fx)
  expect(r.cycleAllocations[0].taxScenarios[0].fixedAdditionUsd).toBeCloseTo(r.taxScenarios[0].monthlyUsd*.9,10)
 })
 it('reproduces monetary additions and legacy-city cash totals without declaring completion',()=>{
  const r=run(readLocalDocument,readLocalDocumentBytes,'LEGACY_CITY').supportingMxReservedYard;expect(r.cycleAllocations.map(c=>c.taxScenarios[0].fixedAdditionUsd)).toEqual([61.25522845809828,163.5968029999931])
  const selected=r.cash.filter(c=>c.baseCostId.includes('NET_PLUS_VAT')&&c.baseCostId.includes('RATE_EXCLUDES_WEEKLY_REST'))
  expect(selected[0].alternatives.map(a=>a.totalKnownComponentsUsd)).toEqual([4467.636500746187,4487.720750540846])
  expect(selected[1].alternatives.map(a=>a.totalKnownComponentsUsd)).toEqual([8881.362783399098,8923.947718991156])
  expect(r.cash.every(c=>c.completeD2DCostUsd===null)).toBe(true)
 })
 it('rejects repeated application, source alterations, FX and invented published monthly/tax facts',()=>{
  expect(()=>calc(policy,result(),company,duty,fx)).toThrow('ALREADY_APPLIED')
  for(const p of [{...policy,quantity:{...policy.quantity,reservedTractorSpaces:2}}, {...policy,pricing:{...policy.pricing,publishedPatioDailyMxn:150}}, {...policy,pricing:{...policy.pricing,sourceTaxes:'IVA_INCLUDED'}}, {...policy,pricing:{...policy.pricing,contractedMonthlyPriceMxn:250}}, {...policy,source:{...policy.source,archive:{...policy.source.archive,sha256:'0'.repeat(64)}}}])expect(()=>calc(p,base,company,duty,fx)).toThrow()
  expect(()=>calc(policy,base,company,duty,{...fx,mxnPerUsd:20})).toThrow()
 })
 it('rejects duplicate costs, joins, alternative identities and incorrect previous sums',()=>{
  const dup=structuredClone(base);dup.cash[1]=dup.cash[0];expect(()=>calc(policy,dup,company,duty,fx)).toThrow('COST_DUPLICATE')
  const join=structuredClone(base);join.financed[0].cashComparisonId='none';expect(()=>calc(policy,join,company,duty,fx)).toThrow('COST_JOIN')
  const sum=structuredClone(base);sum.cash[0].alternatives[0].totalKnownComponentsUsd+=1;expect(()=>calc(policy,sum,company,duty,fx)).toThrow('COST_SUM')
  const alt=structuredClone(base);alt.cash[0].alternatives[1]=alt.cash[0].alternatives[0];expect(()=>calc(policy,alt,company,duty,fx)).toThrow('ALTERNATIVE_DUPLICATE')
 })
 it('rejects preexisting MX parking, duplicate resource/cycle and altered time/distance exposures',()=>{
  const prior=structuredClone(company);prior.monthlyLines[0].id='MX_YARD_ALREADY';prior.monthlyLines[0].resourceId='MX_TRACTOR';expect(()=>calc(policy,base,prior,duty,fx)).toThrow('ALREADY_IN_BASE')
  const dup=structuredClone(company);dup.cycleAllocations[1]=dup.cycleAllocations[0];expect(()=>calc(policy,base,dup,duty,fx)).toThrow('CYCLE_DUPLICATE')
  const res=structuredClone(company);res.cycleAllocations[0].resources[1]=res.cycleAllocations[0].resources[0];expect(()=>calc(policy,base,res,duty,fx)).toThrow('RESOURCE_DUPLICATE')
  const time=structuredClone(company);time.cycleAllocations[0].resources.find(r=>r.resourceId==='MX_TRACTOR')!.timeExposure=.9;expect(()=>calc(policy,base,time,duty,fx)).toThrow('EXPOSURE_MISMATCH')
  const dist=structuredClone(company);dist.cycleAllocations[0].resources.find(r=>r.resourceId==='MX_TRACTOR')!.distanceExposure=.9;expect(()=>calc(policy,base,dist,duty,fx)).toThrow('DISTANCE_EXPOSURE')
  const overflow=structuredClone(duty);overflow.scenarios[0].knownMxElapsedClockDays=1e300;expect(()=>calc(policy,base,company,overflow,fx)).toThrow()
 })
 it('rejects changed original archive independently of valid policy JSON',()=>{
  expect(()=>run(readLocalDocument,p=>p===policy.source.archive.file?new Uint8Array([0]):readLocalDocumentBytes(p))).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH:SIMACO_PRIMARY_PATIO')
 })
})
