import {describe,it,expect} from 'vitest'
import {calculateDriverConnectivity as calculate} from '../scripts/lib/reference-driver-connectivity.js'
import {consolidateBinationalReferenceBudget as consolidate} from '../scripts/consolidate-binational-reference-budget.js'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'
import {allocateFixedCost} from '../src/modules/engine/fixed-cost-allocation.js'
const policy=JSON.parse(readLocalDocument('docs/research/B2_DRIVER_CONNECTIVITY_2026-10-02.json'))
const fx=JSON.parse(readLocalDocument('docs/research/B2_FX_REFERENCE_2026-10-02.json')),root=consolidate(),company=root.supportingCompanyServicesCfu
const result=()=>calculate(policy,company,fx)

describe('driver connectivity reference connects to existing resource CFU, not another admin pool',()=>{
 it('matches the connected output without changing inputs or claiming a complete cost',()=>{
  const before=JSON.stringify({policy,company,fx}),r=result()
  expect(r).toEqual(root.supportingDriverConnectivity);expect(JSON.stringify({policy,company,fx})).toBe(before)
  expect(r).toMatchObject({completeConnectivityMonthlyUsd:null,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,
   quoteReady:false,adoptedValues:0,externalWrites:false,cvusChanged:false})
  expect(Object.values(root.outputs).every(v=>v===null)).toBe(true)
 })
 it('normalizes30-day prepaid consumption and distinguishes whole cash purchases and residual entitlement',()=>{
  const r=result()
  expect(r.prepaidNormalization.monthlyAverageMxn).toBeCloseTo(304.1666666666667,10)
  expect(r.prepaidNormalization).toMatchObject({annualConsumedExpenseMxn:3650,wholePackagesForFirstYearFromZero:13,
   firstYearCashMxn:3900,residualEntitlementDays:25,firstYearCashAddedToExpense:false})
  expect(r.monthlyLines.find(l=>l.id==='MX_DRIVER_PHONE')!.monthlyLocal).not.toBe(300)
 })
 it('keeps two driver subscriptions separate from the two unchanged administrative subscriptions',()=>{
  const r=result()
  expect(r.monthlyLines.map(l=>l.id)).toEqual(['MX_DRIVER_PHONE','US_DRIVER_PHONE','MX_STANDARD_ALERT_SERVICE','US_ELD_PREMIUM'])
  expect(r.monthlyByResource.MX_TRACTOR).toBeCloseTo((300*365/30/12+230.84)/18.3688,12)
  expect(r.monthlyByResource.US_TRACTOR).toBe(74.95);expect(r.monthlyByResource.SHARED_TRAILER).toBe(0)
  expect(r.knownMonthlyComponentUsd).toBeCloseTo((300*365/30/12+230.84)/18.3688+74.95,12)
  expect(company.knownMonthlyComponentUsd).toBe(633.98)
  expect(r.adminOrPayrollOrTmsAddedAgain).toBe(false)
 })
 it('uses gross alert cost once and the premium ELD bundle once, no basic plan plus separate GPS',()=>{
  const r=result()
  expect(r.monthlyLines.find(l=>l.id==='MX_STANDARD_ALERT_SERVICE')!.monthlyLocal).toBeCloseTo(199*1.16,10)
  expect(r.monthlyLines.find(l=>l.id==='US_ELD_PREMIUM')!.monthlyUsd).toBe(24.95)
  expect(r.separateUsGpsAdded).toBe(false);expect(r.valuation.sameServiceTaxPolicyAcrossAssetTaxAlternatives).toBe(true)
 })
 it('allocates recurring subscriptions to physical resources by the same MAX, not by a second trip/box clock',()=>{
  const r=result()
  for(const c of r.cycleAllocations){
   const old=company.cycleAllocations.find(s=>s.cycleScenarioId===c.cycleScenarioId)!
   expect(c.fixedTripComponentUsd).toBeCloseTo(c.resources.reduce((s,l)=>s+l.amountUsd,0),12)
   for(const l of c.resources){const p=old.resources.find(s=>s.resourceId===l.resourceId)!
    expect(l.amountUsd).toBeCloseTo(allocateFixedCost(l.monthlyUsd*p.distanceExposure,l.monthlyUsd*p.timeExposure),10)
    expect(l.amountUsd).toBeCloseTo(l.lines.reduce((s,x)=>s+x.amountUsd,0),12)
   }
   expect(c.resources.find(s=>s.resourceId==='SHARED_TRAILER')!.lines).toEqual([])
  }
 })
 it('preserves all272 cash/financed premium comparisons and prior CVU/insurance/company components',()=>{
  const r=result(),old=[...company.cash,...company.financed]
  expect(r.cash).toHaveLength(8);expect(r.financed).toHaveLength(128)
  for(const c of [...r.cash,...r.financed]){const p=old.find(s=>s.baseCostId===c.baseCostId)!
   expect(c.priorAlternatives).toEqual(p.alternatives);expect(c.companyFixedTripComponentUsd).toBe(p.companyFixedTripComponentUsd)
   expect(c.knownCvuComponentUsd).toBe(p.knownCvuComponentUsd)
   for(const a of c.alternatives){const previous=p.alternatives.find(x=>x.premiumAlternativeId===a.premiumAlternativeId)!
    expect(a.knownCfuComponentUsd).toBeCloseTo(previous.knownCfuComponentUsd+c.driverConnectivityFixedTripComponentUsd,10)
    expect(a.totalKnownComponentsUsd).toBeCloseTo(a.knownCfuComponentUsd+c.knownCvuComponentUsd,10)
    expect(a.completeD2DCostUsd).toBeNull();expect(a.quoteReady).toBe(false)
   }
   expect(c.driverConnectivityFixedTripComponentUsd).toBe(r.cash.find(s=>s.baseCostId===c.cashComparisonId)!.driverConnectivityFixedTripComponentUsd)
  }
 })
 it('reproduces legacy-city monetary deltas and partial totals independently',()=>{
  const r=consolidate(readLocalDocument,readLocalDocumentBytes,'LEGACY_CITY').supportingDriverConnectivity
  expect(r.cycleAllocations[0].fixedTripComponentUsd).toBeCloseTo(11.889974284111346,10)
  expect(r.cycleAllocations[1].fixedTripComponentUsd).toBeCloseTo(25.027756253189096,10)
  const network=r.cash.find(c=>c.baseCostId==='NETWORK_EXPECTED_EMPTY_PROXY:RATE_EXCLUDES_WEEKLY_REST:ALL_CAPITAL_CASH_NET_PLUS_VAT_PUBLIC_ADMIN_SCALE')!
  const dedicated=r.cash.find(c=>c.baseCostId==='DEDICATED_EMPTY_SAME_BOX_RETURN:RATE_EXCLUDES_WEEKLY_REST:ALL_CAPITAL_CASH_NET_PLUS_VAT_PUBLIC_ADMIN_SCALE')!
  expect(network.alternatives[0].totalKnownComponentsUsd).toBeCloseTo(4107.792481781657,9)
  expect(dedicated.alternatives[0].totalKnownComponentsUsd).toBeCloseTo(8069.378715527688,9)
  expect(r.financed[0].alternatives[0].totalKnownComponentsUsd).toBeCloseTo(4217.539920817082,9)
 })
 it('does not relabel technical assistance, standard alerts or tracker location as full human/box coverage',()=>{
  expect(result()).toMatchObject({fullContinuousHumanCoverageProven:false,boxServiceCoverageProven:false,
   currentEldRegistrationVerified:false,hardwareOrInstallationAssumedFree:false})
  expect(result().mxAlertService.hardwareInstallationMxn).toBeNull()
  expect(result().usEld.hardwareInstallationAndTaxUsd).toBeNull()
 })
 it('keeps denied Telcel terms retrieval distinct from an archived original response',()=>{
  const sources=result().sources
  expect(sources.filter(s=>s.archive===null).map(s=>s.id)).toEqual(['TELCEL_PREPAID_SCOPE'])
  expect(sources.find(s=>s.id==='TELCEL_PREPAID_SCOPE')!.capture).toBe('PRIMARY_WEB_READER_HTTP_403_NOT_ARCHIVED')
 })
 it('rejects extra lines, wrong price/period, hardware-free claims and a duplicated GPS bundle',()=>{
  for(const p of [
   {...policy,mxPhone:{...policy.mxPhone,lines:2}},
   {...policy,mxPhone:{...policy.mxPhone,validityDays:31}},
   {...policy,usPhone:{...policy.usPhone,monthlyUsd:45}},
   {...policy,usEld:{...policy.usEld,separateGpsAdded:true}},
   {...policy,mxAlertService:{...policy.mxAlertService,hardwareInstallationMxn:0}}
  ])expect(()=>calculate(p,company,fx)).toThrow()
 })
 it('rejects mismatched valuation date, FX or valuation purpose',()=>{
  expect(()=>calculate(policy,company,{...fx,mxnPerUsd:20})).toThrow('FX_MISMATCH')
  expect(()=>calculate(policy,company,{...fx,observationDate:'2026-09-30'})).toThrow('FX_MISMATCH')
  expect(()=>calculate(policy,company,{...fx,use:'PAYMENT_RATE'})).toThrow()
 })
 it('rejects duplicate subscriptions already in base or reapplied to a cost',()=>{
  expect(()=>calculate(policy,result(),fx)).toThrow()
  const c=structuredClone(company);c.monthlyLines[0].id='MX_DRIVER_PHONE'
  expect(()=>calculate(policy,c,fx)).toThrow('ALREADY_IN_BASE')
  const d=structuredClone(company) as any;d.cash[0].driverConnectivityAddedOnce=true
  expect(()=>calculate(policy,d,fx)).toThrow('ALREADY_APPLIED')
 })
 it('rejects corrupt exposure and resource conservation',()=>{
  const c=structuredClone(company);c.cycleAllocations[0].resources[0].timeExposure+=1
  expect(()=>calculate(policy,c,fx)).toThrow('EXPOSURE_MISMATCH')
  const d=structuredClone(company);d.cycleAllocations[0].fixedTripComponentUsd+=1
  expect(()=>calculate(policy,d,fx)).toThrow('COMPANY_SUM_MISMATCH')
  const e=structuredClone(company);e.monthlyLines[0].monthlyUsd+=1
  expect(()=>calculate(policy,e,fx)).toThrow('EXPOSURE_MISMATCH')
 })
 it('rejects broken cost sums, cash pairing and payment identity',()=>{
  const c=structuredClone(company);c.cash[0].alternatives[0].totalKnownComponentsUsd+=1
  expect(()=>calculate(policy,c,fx)).toThrow('COST_SUM_MISMATCH')
  const d=structuredClone(company);d.financed[0].cashComparisonId='missing'
  expect(()=>calculate(policy,d,fx)).toThrow('COST_JOIN_MISMATCH')
  const e=structuredClone(company);e.financed[0].paymentMode='CASH'
  expect(()=>calculate(policy,e,fx)).toThrow('COST_JOIN_MISMATCH')
 })
 it('rejects duplicate cycle, resource, cost and premium identities',()=>{
  const c=structuredClone(company);c.cycleAllocations[1]=c.cycleAllocations[0]
  expect(()=>calculate(policy,c,fx)).toThrow('CYCLE_DUPLICATE')
  const d=structuredClone(company);d.cycleAllocations[0].resources[1]=d.cycleAllocations[0].resources[0]
  expect(()=>calculate(policy,d,fx)).toThrow('RESOURCE_DUPLICATE')
  const e=structuredClone(company);e.cash[1]=e.cash[0]
  expect(()=>calculate(policy,e,fx)).toThrow('COST_DUPLICATE')
  const f=structuredClone(company);f.cash[0].alternatives[1]=f.cash[0].alternatives[0]
  expect(()=>calculate(policy,f,fx)).toThrow('ALTERNATIVE_DUPLICATE')
 })
 it('rejects missing/duplicated source lineage or fake archive evidence',()=>{
  const p=structuredClone(policy);p.sources[1]=p.sources[0]
  expect(()=>calculate(p,company,fx)).toThrow('SOURCE_SET_MISMATCH')
  const q=structuredClone(policy);q.sources[0].archive=null
  expect(()=>calculate(q,company,fx)).toThrow('SOURCE_SET_MISMATCH')
 })
 it.each(policy.sources.filter((s:any)=>s.archive).map((s:any)=>s.archive.file) as string[])('hash-checks archived source%s',file=>{
  expect(()=>consolidate(readLocalDocument,path=>path===file?new Uint8Array([0,1]):readLocalDocumentBytes(path))).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH')
 })
})
