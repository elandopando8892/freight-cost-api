import {describe,it,expect} from 'vitest'
import {calculatePilotTripSupplements as calculate,countStartedCalendarDays} from '../scripts/lib/reference-pilot-trip-supplements.js'
import {consolidateBinationalReferenceBudget as consolidate} from '../scripts/consolidate-binational-reference-budget.js'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'
const read=(file:string)=>JSON.parse(readLocalDocument(`docs/research/${file}.json`))
const policy=read('B2_PILOT_TRIP_SUPPLEMENTS_2026-10-02'),fx=read('B2_FX_REFERENCE_2026-10-02'),driver=read('B2_DRIVER_DISTANCE_COMPONENTS_2026-10-01')
const root=consolidate(),base=root.supportingBoxVisibility,company=root.supportingCompanyServicesCfu,duty=root.supportingPilotOrdinaryDuty
const result=()=>calculate(policy,base,company,duty,driver,fx)

describe('four reserved phones and one MX driver food allowance per occupied day',()=>{
 it('returns the connected output with unchanged inputs and complete outputs still unresolved',()=>{
  const before=JSON.stringify({policy,base,company,duty,driver,fx}),r=result()
  expect(r).toEqual(root.supportingPilotTripSupplements);expect(JSON.stringify({policy,base,company,duty,driver,fx})).toBe(before)
  expect(r).toMatchObject({completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,quoteReady:false,adoptedValues:0,externalWrites:false})
  expect(Object.values(root.outputs).every(v=>v===null)).toBe(true)
 })
 it('prices one MX and three US devices with chargers and local tax once, one admin pool',()=>{
  const r=result(),mx=3499/18.3688,us=(179.99+25.98)*1.0825
  expect(r.equipmentInitialCashUsd).toBeCloseTo(mx+3*us,10)
  expect(r.equipmentKnownMonthlyUsd).toBeCloseTo((mx+3*us)/24,10)
  expect(r.monthlyLines).toHaveLength(4)
  expect(r.monthlyLines.find(l=>l.id==='MX_DRIVER_HANDSET')!.monthlyUsd).toBeCloseTo(mx/24,10)
  const admin=r.monthlyLines.filter(l=>l.id.startsWith('ADMIN'))
  expect(admin[0].monthlyUsd).toBe(admin[1].monthlyUsd);expect(admin.reduce((s,l)=>s+l.monthlyUsd,0)).toBeCloseTo(2*us/24,10)
  expect(r.initialCashAddedAgain).toBe(false);expect(r.boxOrAdminPayrollAddedAgain).toBe(false)
 })
 it('uses occupied calendar days, including released intervals, not duty shifts or MAX exposure',()=>{
  const r=result()
  expect(r.cycleAllocations.map(c=>c.mxFood.occupiedCalendarDays)).toEqual([4,9])
  expect(r.cycleAllocations.map(c=>c.mxFood.amountMxn)).toEqual([1200,2700])
  expect(r.cycleAllocations[0].mxFood.amountUsd).toBeCloseTo(1200/18.3688,10)
  expect(r.cycleAllocations[1].mxFood.amountUsd).toBeCloseTo(2700/18.3688,10)
  expect(r.cycleAllocations.every(c=>c.mxFood.onePositionAtATime)).toBe(true)
 })
 it('handles midnight, partial days and invalid calendar quantities',()=>{
  expect(countStartedCalendarDays(.75,6)).toBe(1);expect(countStartedCalendarDays(.7501,6)).toBe(2)
  expect(countStartedCalendarDays(1.75,6)).toBe(2);expect(countStartedCalendarDays(1,0)).toBe(1)
  expect(countStartedCalendarDays(.01,0)).toBe(1)
  for(const [days,hour] of [[0,6],[-1,6],[Infinity,6],[1,24],[366,6]])expect(()=>countStartedCalendarDays(days,hour)).toThrow('CALENDAR_RANGE')
 })
 it('conserves all cash/finance comparisons and adds equipment CFU and food CVU exactly once',()=>{
  const r=result(),old=[...base.cash,...base.financed]
  expect(r.cash).toHaveLength(8);expect(r.financed).toHaveLength(128)
  for(const c of [...r.cash,...r.financed]){const p=old.find(x=>x.baseCostId===c.baseCostId)!
   expect(c.priorAlternatives).toEqual(p.alternatives)
   expect(c.cvusChanged).toBe(true)
   expect(c.knownCvuComponentUsd).toBeCloseTo(p.knownCvuComponentUsd+c.mxFoodTripComponentUsd,10)
   for(const a of c.alternatives){const previous=p.alternatives.find(x=>x.premiumAlternativeId===a.premiumAlternativeId)!
    expect(a.knownCfuComponentUsd).toBeCloseTo(previous.knownCfuComponentUsd+c.equipmentFixedTripComponentUsd,10)
    expect(a.totalKnownComponentsUsd).toBeCloseTo(a.knownCfuComponentUsd+c.knownCvuComponentUsd,10)
    expect(a.completeD2DCostUsd).toBeNull();expect(a.quoteReady).toBe(false)
   }
   const cash=r.cash.find(x=>x.baseCostId===c.cashComparisonId)!
   expect(c.equipmentFixedTripComponentUsd).toBe(cash.equipmentFixedTripComponentUsd)
   expect(c.mxFoodTripComponentUsd).toBe(cash.mxFoodTripComponentUsd)
  }
 })
 it('reproduces the two legacy-city cash cycles without presenting partial sums as complete cost',()=>{
  const r=consolidate(readLocalDocument,readLocalDocumentBytes,'LEGACY_CITY').supportingPilotTripSupplements,net=r.cash.filter(c=>c.baseCostId.includes('RATE_EXCLUDES_WEEKLY_REST:ALL_CAPITAL_CASH_NET_PLUS_VAT'))
  expect(net).toHaveLength(2)
  expect(net[0].alternatives.map(a=>Number(a.totalKnownComponentsUsd.toFixed(6)))).toEqual([4181.361024,4201.445274])
  expect(net[1].alternatives.map(a=>Number(a.totalKnownComponentsUsd.toFixed(6)))).toEqual([8234.496574,8277.081510])
  expect(r.financed[0].alternatives.map(a=>Number(a.totalKnownComponentsUsd.toFixed(6)))).toEqual([4291.108463,4311.192713])
  expect(net.every(c=>c.completeD2DCostUsd===null)).toBe(true)
 })
 it('preserves included US per diem and source distinction; zero online fee is sourced',()=>{
  const r=result()
  expect(r.usPerDiemAddedAgain).toBe(false);expect(r.equipment.usDriverActivation.publishedActivationUsd).toBe(0)
  expect(r.cycleAllocations.every(c=>c.mxFood.usExtraPerDiemUsd===null)).toBe(true)
  expect(r.sources.filter(s=>s.archive===null).map(s=>s.id)).toEqual(['MOTOROLA_US_GPLAY_MSRP','TIVUS_MX_DRYVAN_FOOD'])
  const wrong=structuredClone(driver);wrong.usSource.travelExpenseReview.benefitsDefinition='PER_DIEM_EXCLUDED'
  expect(()=>calculate(policy,base,company,duty,wrong,fx)).toThrow()
 })
 it('rejects double application, changed quantity/channel/period, unsupported promotion and US daily charge',()=>{
  expect(()=>calculate(policy,result(),company,duty,driver,fx)).toThrow('ALREADY_APPLIED')
  for(const p of [{...policy,equipment:{...policy.equipment,adminHandsets:7}},
   {...policy,equipment:{...policy.equipment,planningHoldingMonths:0}},
   {...policy,equipment:{...policy.equipment,usChargerCableBundleListUsd:21.98}},
   {...policy,equipment:{...policy.equipment,usDriverActivation:{...policy.equipment.usDriverActivation,channel:'IN_STORE'}}},
   {...policy,mxFood:{...policy.mxFood,usPerDiemAddedAgain:true}},
   {...policy,mxFood:{...policy.mxFood,weeklyAllowanceAddedAgain:true}}
  ])expect(()=>calculate(p,base,company,duty,driver,fx)).toThrow()
 })
 it('rejects mismatched FX, duplicate physical/cost identities and broken cost joins/sums',()=>{
  expect(()=>calculate(policy,base,company,duty,driver,{...fx,mxnPerUsd:20})).toThrow('FX_MISMATCH')
  const d=structuredClone(duty);d.scenarios[1]=d.scenarios[0]
  expect(()=>calculate(policy,base,company,d,driver,fx)).toThrow('DUTY_DUPLICATE')
  const c=structuredClone(company);c.cycleAllocations[0].resources[1]=c.cycleAllocations[0].resources[0]
  expect(()=>calculate(policy,base,c,duty,driver,fx)).toThrow('RESOURCE_DUPLICATE')
  const b=structuredClone(base);b.cash[0].alternatives[0].totalKnownComponentsUsd+=1
  expect(()=>calculate(policy,b,company,duty,driver,fx)).toThrow('COST_SUM_MISMATCH')
  const f=structuredClone(base);f.financed[0].cashComparisonId='missing'
  expect(()=>calculate(policy,f,company,duty,driver,fx)).toThrow('COST_JOIN_MISMATCH')
  const dup=structuredClone(base);dup.cash[1]=dup.cash[0]
  expect(()=>calculate(policy,dup,company,duty,driver,fx)).toThrow('COST_DUPLICATE')
 })
 it('rejects source duplication and unknown original body relabelled as archived',()=>{
  const p=structuredClone(policy);p.sources[1]=p.sources[0]
  expect(()=>calculate(p,base,company,duty,driver,fx)).toThrow('SOURCE_SET_MISMATCH')
  const q=structuredClone(policy);q.sources[0].archive=null
  expect(()=>calculate(q,base,company,duty,driver,fx)).toThrow('SOURCE_SET_MISMATCH')
 })
 it.each(policy.sources.filter((s:any)=>s.archive).map((s:any)=>s.archive.file) as string[])('rejects edited original source %s',file=>{
  expect(()=>consolidate(readLocalDocument,p=>p===file?new Uint8Array([0]):readLocalDocumentBytes(p))).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH')
 })
})
