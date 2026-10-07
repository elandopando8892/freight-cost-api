import {describe,it,expect} from 'vitest'
import {calculateCrossborderInsuranceExposure as calculate} from '../scripts/lib/reference-crossborder-insurance.js'
import {consolidateBinationalReferenceBudget as consolidate} from '../scripts/consolidate-binational-reference-budget.js'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'
const s=consolidate(),r=s.supportingCrossborderInsuranceExposure
const policy=JSON.parse(readLocalDocument('docs/research/B2_CROSSBORDER_INSURANCE_EXPOSURE_2026-10-03.json'))
const duty=s.supportingPilotOrdinaryDuty,cycles=s.supportingPilotCycleExposure
describe('MX tractor commercial crossborder coverage exposure, not a priced policy',()=>{
 it('pairs four bridge movements into two incursions, not four certificates',()=>{
  const [network,dedicated]=r.scenarios
  expect(network.windows).toHaveLength(1);expect(dedicated.windows).toHaveLength(2)
  expect(network.conditional24hPremiumMultiplier).toBe(1);expect(dedicated.conditional24hPremiumMultiplier).toBe(2)
  expect(network.windows[0].elapsedHours).toBeCloseTo(20.9,9)
  expect(dedicated.windows[1].elapsedHours).toBeCloseTo(5.4,9)
 })
 it('includes overnight pauses between split crossings, not merely87min tasks',()=>{
  const w=r.scenarios[0].windows[0]
  expect(w.startHour).toBeCloseTo(30.831383208206255,9)
  expect(w.endHour).toBeCloseTo(51.73138320820626,9)
  expect(w.elapsedHours).toBeGreaterThan(2*87/60+2)
  const copy=structuredClone(duty),n=copy.scenarios[0]
  // Simulated extra5h in a released interval: shift all later endpoints, preserving every duration.
  const idx=n.timeline.findIndex(t=>t.kind==='RELEASED_INTERVAL'&&t.startHour===32)
  expect(idx).toBeGreaterThan(0)
  n.timeline[idx].hours+=5;n.timeline[idx].endHour+=5
  for(const t of n.timeline.slice(idx+1)){t.startHour+=5;t.endHour+=5}
  n.knownMxElapsedClockDays+=5/24
  expect(calculate(policy,copy,cycles).scenarios[0].conditional24hPremiumMultiplier).toBe(2)
 })
 it('allocates annual liability once by existing MX resourceMAX, never both alternatives',()=>{
  for(const row of r.scenarios){
   const mx=cycles.scenarios.find(c=>c.id===row.cycleScenarioId)!.allocationResources.find(a=>a.resourceId==='MX_TRACTOR')!
   const days=duty.scenarios.find(c=>c.id===row.cycleScenarioId)!.knownMxElapsedClockDays
   expect(row.conditionalAnnualPremiumShare).toBeCloseTo(Math.max(mx.totalCycleKm/mx.monthlyKmCapacity,days/24)/12,12)
   expect(row.conditionalEqualCost24hPriceAsFractionOfAnnual).toBe(row.conditionalAnnualPremiumShare/row.conditional24hPremiumMultiplier)
   expect(row).toMatchObject({resourceId:'MX_TRACTOR',mutuallyExclusiveAlternatives:true,sameBoxChargedAgain:false,usTractorChargedAgain:false})
   expect(row.annualAlternative).toEqual({classification:'CFU',formula:'annualPremiumUsd * conditionalAnnualPremiumShare',costUsd:null})
   expect(row.temporaryAlternative.classification).toBe('CVU')
  }
 })
 it('never turns750000insuredlimit or926combinedpackage into a premium',()=>{
  expect(r.generalNonhazardousLiabilityLimitUsd).toBe(750000)
  expect(r.temporaryPremiumPer24hUsd).toBeNull();expect(r.annualPremiumUsd).toBeNull()
  expect(r.missingPremiumDefaultedToZero).toBe(false)
  expect(r.existingKnownTotalsChanged).toBe(false)
  expect(r.externalWrites||r.quoteReady||r.actualEligibilityVerified).toBe(false)
  for(const row of r.scenarios){expect(row.annualAlternative.costUsd).toBeNull();expect(row.temporaryAlternative.costUsd).toBeNull();expect(row.completeD2DCostUsd).toBeNull()}
  expect(Object.values(s.outputs).every(v=>v===null)).toBe(true)
 })
 it.each(['actualEligibilityVerified','quoteReady'])('rejects an unsupported approval %s',key=>{
  expect(()=>calculate({...policy,[key]:true},duty,cycles)).toThrow()
 })
 it.each(['annualPremiumUsd','temporaryPremiumPer24hUsd'])('rejects price invention at%s',key=>{
  expect(()=>calculate({...policy,[key]:750000},duty,cycles)).toThrow()
 })
 it('rejects missing movement and duplicated scenarios/resources',()=>{
  let bad=structuredClone(duty);bad.scenarios[1].id=bad.scenarios[0].id
  expect(()=>calculate(policy,bad,cycles)).toThrow('CROSSBORDER_INSURANCE_DUPLICATE_SCENARIO')
  bad=structuredClone(duty);const task=bad.scenarios[0].timeline.find(t=>t.id==='MX_BOBTAIL_SOUTH')!;task.id='UNKNOWN'
  expect(()=>calculate(policy,bad,cycles)).toThrow('CROSSBORDER_INSURANCE_MOVEMENT_TOPOLOGY')
  const c=structuredClone(cycles);c.scenarios[0].allocationResources[1].resourceId='MX_TRACTOR'
  expect(()=>calculate(policy,duty,c)).toThrow('CROSSBORDER_INSURANCE_DUPLICATE_RESOURCE')
 })
 it('rejects inconsistent clocks,sourceURL or sourcehash',()=>{
  const bad=structuredClone(duty);bad.scenarios[0].timeline[0].endHour+=1
  expect(()=>calculate(policy,bad,cycles)).toThrow('CROSSBORDER_INSURANCE_TIMELINE')
  const p=structuredClone(policy);p.sources[0].url='https://example.com/tourist'
  expect(()=>calculate(p,duty,cycles)).toThrow('CROSSBORDER_INSURANCE_SOURCE_SCOPE')
  expect(()=>consolidate(f=>f.endsWith('B2_CROSSBORDER_INSURANCE_EXPOSURE_2026-10-03.json')?'{}':readLocalDocument(f),readLocalDocumentBytes)).toThrow('SOURCE_HASH_MISMATCH:crossborderInsuranceExposure')
 })
 it('is deterministic and does not mutate previous clocks or change known economic sums',()=>{
  const before=JSON.stringify({policy,duty,cycles})
  expect(calculate(policy,duty,cycles)).toEqual(calculate(policy,duty,cycles))
  expect(JSON.stringify({policy,duty,cycles})).toBe(before)
  const known=s.supportingMxReservedYard.cash.find(v=>v.cycleScenarioId==='NETWORK_EXPECTED_EMPTY_PROXY'&&v.baseCostId.includes('NET_PLUS_VAT')&&v.baseCostId.includes('RATE_EXCLUDES_WEEKLY_REST'))!
  expect(known.knownCvuComponentUsd).toBeCloseTo(3552.087567884155,8)
  expect(known.alternatives[0].totalKnownComponentsUsd).toBeCloseTo(4536.363225732125,8)
  expect(r.scenarios.every(v=>v.completeCfuUsd===null&&v.completeCvuUsd===null)).toBe(true)
 })
})
