import {describe,it,expect} from 'vitest'
import {calculateBoxVisibility as calculate} from '../scripts/lib/reference-box-visibility.js'
import {consolidateBinationalReferenceBudget as consolidate} from '../scripts/consolidate-binational-reference-budget.js'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'
const read=(f:string)=>JSON.parse(readLocalDocument(`docs/research/${f}_2026-10-02.json`))
const policy=read('B2_BOX_VISIBILITY'),driver=read('B2_DRIVER_CONNECTIVITY'),fx=read('B2_FX_REFERENCE')
const root=consolidate(),company=root.supportingCompanyServicesCfu,base=root.supportingDriverConnectivity
const result=()=>calculate(policy,driver,company,fx)

describe('shared detached box visibility, not another tractor GPS or human watch desk',()=>{
 it('connects the reproducible result without modifying inputs or declaring complete cost',()=>{
  const before=JSON.stringify({policy,driver,company,fx}),r=result()
  expect(r).toEqual(root.supportingBoxVisibility);expect(JSON.stringify({policy,driver,company,fx})).toBe(before)
  expect(r).toMatchObject({quoteReady:false,adoptedValues:0,externalWrites:false,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null})
  expect(Object.values(root.outputs).every(v=>v===null)).toBe(true)
 })
 it('uses the installed bundle instead of adding generic installation, a purchased asset or Premium',()=>{
  const r=result()
  expect(r.installedGrossMxn).toBeCloseTo(4060,10);expect(r.recurringGrossMxn).toBe(290)
  expect(r.firstMonthCashMxn).toBeCloseTo(4350,10)
  expect(r.knownMonthlyComponentUsd).toBeCloseTo((4060/24+290)/18.3688,12)
  expect(r.monthlyLines).toHaveLength(2);expect(r.firstMonthCashAddedAgain).toBe(false)
  expect(r.deviceOwnership).toBe('COMODATO_NOT_PURCHASE')
 })
 it('allocates to exactly one box using prior physical exposure, not per-country tractors',()=>{
  const r=result()
  for(const c of r.cycleAllocations){
   const p=base.cycleAllocations.find(x=>x.cycleScenarioId===c.cycleScenarioId)!.resources.find(x=>x.resourceId==='SHARED_TRAILER')!
   expect(c.fixedTripComponentUsd).toBeCloseTo(r.knownMonthlyComponentUsd*Math.max(p.timeExposure,p.distanceExposure),12)
   expect(c.lines.every(l=>l.resourceId==='SHARED_TRAILER')).toBe(true)
  }
 })
 it('keeps all272 prior comparisons and CVU, adding only box fixed allocation once',()=>{
  const r=result(),old=[...base.cash,...base.financed]
  expect(r.cash).toHaveLength(8);expect(r.financed).toHaveLength(128)
  for(const c of [...r.cash,...r.financed]){const p=old.find(x=>x.baseCostId===c.baseCostId)!
   expect(c.priorAlternatives).toEqual(p.alternatives);expect(c.knownCvuComponentUsd).toBe(p.knownCvuComponentUsd)
   expect(c.driverConnectivityFixedTripComponentUsd).toBe(p.driverConnectivityFixedTripComponentUsd)
   for(const a of c.alternatives){const previous=p.alternatives.find(x=>x.premiumAlternativeId===a.premiumAlternativeId)!
    expect(a.knownCfuComponentUsd).toBeCloseTo(previous.knownCfuComponentUsd+c.boxVisibilityFixedTripComponentUsd,10)
    expect(a.totalKnownComponentsUsd).toBeCloseTo(a.knownCfuComponentUsd+c.knownCvuComponentUsd,10)
    expect(a.completeD2DCostUsd).toBeNull();expect(a.quoteReady).toBe(false)
   }
   expect(c.boxVisibilityFixedTripComponentUsd).toBe(r.cash.find(x=>x.baseCostId===c.cashComparisonId)!.boxVisibilityFixedTripComponentUsd)
  }
 })
 it('reproduces both legacy-city monetary deltas and partial pilot totals',()=>{
  const r=consolidate(readLocalDocument,readLocalDocumentBytes,'LEGACY_CITY').supportingBoxVisibility
  expect(r.cycleAllocations[0].fixedTripComponentUsd).toBeCloseTo(4.0163834461540135,10)
  expect(r.cycleAllocations[1].fixedTripComponentUsd).toBeCloseTo(8.5159979643832,10)
  const rows=r.cash.filter(c=>c.baseCostId.endsWith('RATE_EXCLUDES_WEEKLY_REST:ALL_CAPITAL_CASH_NET_PLUS_VAT_PUBLIC_ADMIN_SCALE'))
  expect(rows[0].alternatives[0].totalKnownComponentsUsd).toBeCloseTo(4111.808865227811,9)
  expect(rows[1].alternatives[0].totalKnownComponentsUsd).toBeCloseTo(8077.894713492071,9)
  expect(r.financed[0].alternatives[0].totalKnownComponentsUsd).toBeCloseTo(4221.556304263236,9)
 })
 it('does not turn included ELD device or passive connectivity into free aggregate/compliance/security',()=>{
  const r=result()
  expect(r.eldCorrection).toMatchObject({devicePriceWithSubscriptionUsd:0,monthlyShippingInstallationTaxUsd:null,currentRegistrationVerified:false})
  expect(r.fullContinuousHumanCoverageProven).toBe(false);expect(r.routeRadioCoverageTested).toBe(false)
  expect(base.usEld.hardwareInstallationAndTaxUsd).toBeNull()
 })
 it('rejects second box, generic installation, changed public amount/horizon, unknowns converted to zero',()=>{
  for(const p of [{...policy,units:2},{...policy,separateGenericInstallationAdded:true},
   {...policy,monthlyGoldenNetMxn:299},{...policy,installationAllocationMonths:0},
   {...policy,eldCorrection:{...policy.eldCorrection,monthlyShippingInstallationTaxUsd:0}},
   {...policy,deviceOwnership:'PURCHASE'}])expect(()=>calculate(p,driver,company,fx)).toThrow()
 })
 it('rejects duplicated lineage and upstream reapplication or corrupt exposure',()=>{
  const p=structuredClone(policy);p.sources[1]=p.sources[0]
  expect(()=>calculate(p,driver,company,fx)).toThrow('SOURCE_SET_MISMATCH')
  expect(()=>calculate(policy,driver,result(),fx)).toThrow()
  const c=structuredClone(company);c.cycleAllocations[0].resources[0].timeExposure+=1
  expect(()=>calculate(policy,driver,c,fx)).toThrow('EXPOSURE_MISMATCH')
  expect(()=>calculate(policy,driver,company,{...fx,mxnPerUsd:20})).toThrow('FX_MISMATCH')
 })
 it.each(policy.sources.map((s:any)=>s.archive.file) as string[])('rejects mutated archive %s',file=>{
  expect(()=>consolidate(readLocalDocument,p=>p===file?new Uint8Array([0]):readLocalDocumentBytes(p))).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH')
 })
})
