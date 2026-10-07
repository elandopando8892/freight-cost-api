import {describe,it,expect} from 'vitest'
import {createOrdinaryDutyPlanner,calculatePilotOrdinaryDuty} from '../scripts/lib/reference-pilot-ordinary-duty.js'
import {consolidateBinationalReferenceBudget} from '../scripts/consolidate-binational-reference-budget.js'
import {readLocalDocument} from '../scripts/assemble-economic-reference-cards.js'
const s=consolidateBinationalReferenceBudget(),r=s.supportingPilotOrdinaryDuty
const doc=(file:string)=>JSON.parse(readLocalDocument(`docs/research/${file}`))
const inputs={cycles:s.supportingPilotCycleExposure,physical:s.supportingPilotPhysicalCycle,base:s.supportingAdminScaleReference.scenarios,
 driverPolicy:doc('B2_MX_DRIVER_FORECAST_2026-10-02.json'),wages:s.supportingMxVariableDriver,variables:s.supportingPilotVariableEconomics,fx:{mxnPerUsd:18.3688},
 road:s.supportingPilotRoadBorderEconomics,financePolicy:doc('B2_PILOT_FINANCED_CFU_2026-10-02.json'),usCapital:s.reviewedProspectiveUsCapital,
 mxCapital:s.reviewedMxCapitalSensitivity.scenarios.map(x=>x.scenario),boxFinance:s.supportingSharedBoxFinancePlanning,
 mxDrivingMinutes:doc('B2_SAKBE_MX_LIVE_DETAIL_2026-09-30.json').observations.detailTotals.idealMinutes}
const policy=doc('B2_PILOT_ORDINARY_DUTY_2026-10-02.json')
describe('ordinary duty connected to known D2D cost, not actual dispatch or full price',()=>{
 it('conserves ordered tasks and limits duty including exactly one counted pause per worked shift',()=>{
  for(const c of r.scenarios){
   expect(c.timeline[0].startHour).toBe(0)
   for(let i=0;i<c.timeline.length;i++)expect(c.timeline[i].startHour).toBeCloseTo(i?c.timeline[i-1].endHour:0,9)
   const days=new Set(c.timeline.filter(x=>x.kind==='TASK').map(x=>x.day))
   for(const day of days){
    expect(day%7).not.toBe(6)
    const duty=c.timeline.filter(x=>x.day===day&&x.kind!=='RELEASED_INTERVAL')
    expect(duty.reduce((sum,x)=>sum+x.hours,0)).toBeLessThanOrEqual(8+1e-8)
    expect(duty.filter(x=>x.kind==='COUNTED_BREAK').reduce((sum,x)=>sum+x.hours,0)).toBe(.5)
    expect(Math.max(...duty.map(x=>x.endHour))-day*24).toBeLessThanOrEqual(8+1e-8)
   }
   const driving=c.timeline.filter(x=>x.id==='MX_LOADED_DRIVING').reduce((sum,x)=>sum+x.hours,0)
   expect(driving).toBeCloseTo(inputs.mxDrivingMinutes/60,9)
   expect(c.timeline.at(-1)!.endHour/24).toBeCloseTo(c.knownMxElapsedClockDays,9)
  }
 })
 it('preserves a weekly rest day and30min counted rest for short and long shifts',()=>{
  const p=createOrdinaryDutyPlanner();p.schedule([{id:'TEST',hours:60}]);p.finish()
  expect(p.timeline.filter(x=>x.kind==='TASK').some(x=>x.day===6)).toBe(false)
  expect(p.timeline.filter(x=>x.kind==='TASK').some(x=>x.day===7)).toBe(true)
  const q=createOrdinaryDutyPlanner();q.schedule([{id:'SHORT',hours:1}]);q.finish();expect(q.clock).toBe(1.5)
 })
 it('never drives over5h continuously even when loading preceded driving',()=>{
  for(const c of r.scenarios){let driving=0;for(const x of c.timeline){
   if(x.kind!=='TASK')driving=0
   else if(x.id.includes('DRIVING'))driving+=x.hours
   expect(driving).toBeLessThanOrEqual(5+1e-8)
  }}
 })
 it('serial same-box return waits for MX, not simultaneous or duplicate trailer exposure',()=>{
  const c=r.scenarios.find(x=>x.id==='DEDICATED_EMPTY_SAME_BOX_RETURN')!
  const old=s.supportingPilotCycleExposure.scenarios.find(x=>x.id===c.id)!
  expect(c.returnHandoffStartHour!).toBeGreaterThanOrEqual(c.firstHandoffEndHour+old.serialBoxTimeline[2].hours-1e-8)
  expect(c.boxWaitingForMxHours).toBeGreaterThanOrEqual(0)
  expect(c.knownBoxClockDays).toBe(c.knownMxElapsedClockDays)
  expect(c.serialBoxTimeline.map(x=>x.resource)).toEqual(['MX_TRACTOR','DETACHED','US_TRACTOR','DETACHED','MX_TRACTOR'])
  expect(c.serialBoxTimeline.reduce((sum,x)=>sum+x.hours,0)).toBeCloseTo(c.knownBoxClockDays*24,9)
  const physical=s.supportingPilotPhysicalCycle.scenarios.find(x=>x.id===c.id)!
  expect(c.knownUsElapsedClockDays-physical.knownUsClockDays).toBeCloseTo(c.usAssetWaitAndHandoffDeltaHours/24,9)
  expect(c.usAssetWaitAndHandoffDeltaHours).toBeGreaterThanOrEqual(c.boxWaitingForMxHours)
 })
 it('recalculates capacity, payroll and cash/financed fixed components on the new scope',()=>{
  expect(r.cash.scenarios).toHaveLength(8);expect(r.financed.scenarios).toHaveLength(128)
  for(const c of r.scenarios){
   expect(c.knownMxElapsedClockDays).toBeGreaterThan(c.priorMxElapsedClockDays)
   const wages=r.driver.scenarios.filter(x=>x.cycleScenarioId===c.id)
   for(const w of wages){expect(w.compatibleKnownCyclesPerMonth).toBeCloseTo(c.compatibleKnownCyclesPerMonth,9);expect(w.replacesOriginalMxPayOnce).toBe(true)}
  }
  for(const c of r.cash.scenarios){expect(c.sameBoxChargedOnce&&c.adminPoolChargedOnce).toBe(true);expect(c.originalMxPayAddedAgain).toBe(false);expect(c.totalKnownComponentsUsd).toBeCloseTo(c.knownCfuComponentUsd+c.knownCvuComponentUsd,9)}
  for(const c of r.financed.scenarios){expect(c.samePhysicalExposure).toBe(true);expect(c.knownCvuComponentUsd).toBe(c.cashKnownCvuComponentUsd)}
 })
 it('uses the new box denominator and conserves resource MAX sums',()=>{
  for(const c of r.scenarios)for(const f of c.conditionalFixedAllocations){
   const box=f.resources.find(x=>x.resourceId==='SHARED_TRAILER')!
   expect(box.oldDistanceProxyByKmUsd).toBeCloseTo(box.knownMonthlyComponentUsd/c.compatibleKnownCyclesPerMonth,9)
   for(const x of f.resources)expect(x.conditionalOldDistanceKnownClockMaxUsd).toBe(Math.max(x.oldDistanceProxyByKmUsd,x.knownClockByTimeUsd))
   expect(f.conditionalComponentAllocationUsd).toBeCloseTo(f.resources.reduce((sum,x)=>sum+x.conditionalOldDistanceKnownClockMaxUsd,0),9)
  }
 })
 it('keeps complete price, actual waiting and compliance unknown',()=>{
  expect(r.actualWaitingCompensationMxn).toBeNull();expect(r.actualOvertimeMxn).toBeNull();expect(r.actualDutyCompliance).toBe(false)
  expect(r.completeD2DCostUsd).toBeNull();expect(r.quoteReady).toBe(false);expect(r.externalWrites).toBe(false)
  expect(Object.values(s.outputs).every(x=>x===null)).toBe(true)
 })
 it('does not mutate prior scenarios or inputs',()=>{
  const before=JSON.stringify(inputs);calculatePilotOrdinaryDuty(policy,inputs);expect(JSON.stringify(inputs)).toBe(before)
 })
 it.each([0,-1,NaN,Infinity,10001])('rejects invalid task hours %s',(hours)=>{
  expect(()=>createOrdinaryDutyPlanner().schedule([{id:'BAD',hours}])).toThrow('ORDINARY_DUTY_TASK_RANGE')
 })
 it('rejects unknown waiting policy and duplicated scenario identity',()=>{
  expect(()=>calculatePilotOrdinaryDuty({...policy,waitingPolicy:'UNPAID_WAIT'},inputs)).toThrow()
  const bad=structuredClone(inputs);bad.cycles.scenarios[1].id=bad.cycles.scenarios[0].id
  expect(()=>calculatePilotOrdinaryDuty(policy,bad)).toThrow('ORDINARY_DUTY_DUPLICATE_SCOPE')
 })
})
