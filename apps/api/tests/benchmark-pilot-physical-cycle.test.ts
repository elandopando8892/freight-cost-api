import {describe,it,expect} from 'vitest'
import {readLocalDocument} from '../scripts/assemble-economic-reference-cards.js'
import {consolidateBinationalReferenceBudget} from '../scripts/consolidate-binational-reference-budget.js'
import {calculatePilotPhysicalCycle as calculate} from '../scripts/lib/reference-pilot-physical-cycle.js'
const file='docs/research/B2_PILOT_PHYSICAL_CYCLE_2026-10-02.json',policy=JSON.parse(readLocalDocument(file))
const root=consolidateBinationalReferenceBudget()
const result=()=>calculate(policy,root.supportingPilotCycleExposure,root.supportingPilotRoadBorderEconomics,root.supportingAdminScaleReference.scenarios)
describe('parallel MX tractor bridge loop and serial single-box exposure',()=>{
  it('network returns MX bobtail before reset/next pickup without sending US box back',()=>{
    const r=result().scenarios[0]
    expect(r.mxParallelTimeline.map(x=>x.id)).toEqual(['MX_LOADED_TO_US_YARD','FIRST_HANDOFF_US','MX_BOBTAIL_SOUTH','MX_RECOVERY_REST','MX_NETWORK_NEXT_PICKUP_REFERENCE_MOVEMENT'])
    expect((r.knownMxElapsedClockDays-r.priorMxElapsedClockDays)*24).toBeCloseTo(87/60,10)
    expect(r.mandatoryBobtailCrossings).toBe(1)
    expect(r.serialBoxTimeline).toEqual(root.supportingPilotCycleExposure.scenarios[0].serialBoxTimeline)
    expect(r.serialBoxTimeline.at(-1)!.resource).toBe('US_TRACTOR')
  })
  it('dedicated moves south/waits/north in parallel with US roundtrip, not on box clock',()=>{
    const r=result().scenarios[1]
    expect(r.mxParallelTimeline.map(x=>x.id)).toEqual(['MX_LOADED_TO_US_YARD','FIRST_HANDOFF_US','MX_BOBTAIL_SOUTH','MX_COMMITTED_WAIT_WHILE_US_BOX_ROUNDTRIP','MX_BOBTAIL_NORTH','SECOND_HANDOFF_US','MX_SAME_BOX_EMPTY_RETURN'])
    expect(r.mandatoryBobtailCrossings).toBe(2)
    const mxPickup=r.mxParallelTimeline.find(x=>x.id==='SECOND_HANDOFF_US')!
    expect(mxPickup.startHour).toBeCloseTo(r.serialBoxTimeline[3].startHour,10)
    expect(r.knownMxElapsedClockDays).toBeCloseTo(r.knownBoxClockDays,10)
    expect(r.knownMxElapsedClockDays).toBeCloseTo(r.priorMxElapsedClockDays,10)
    expect(r.restAddedAgainDuringCommittedWait).toBe(false)
    const wait=r.mxParallelTimeline.find(x=>x.id==='MX_COMMITTED_WAIT_WHILE_US_BOX_ROUNDTRIP')!
    expect(wait.hours).toBeGreaterThanOrEqual(14)
    expect(wait.restOverlapsWaiting).toBe(true)
  })
  it('preserves contiguous per-resource times and one charge per actual bridge movement',()=>{
    for(const r of result().scenarios){
      const phases=r.mxParallelTimeline
      expect(phases[0].startHour).toBe(0)
      for(let i=1;i<phases.length;i++)expect(phases[i].startHour).toBe(phases[i-1].endHour)
      expect(phases.reduce((s,x)=>s+x.hours,0)).toBeCloseTo(r.knownMxElapsedClockDays*24,10)
      expect(r.mandatoryCrossings.filter(x=>!x.physicalBoxOnTractor).length).toBe(r.mandatoryBobtailCrossings)
      expect(new Set(r.mandatoryCrossings.map(x=>x.id)).size).toBe(r.mandatoryCrossings.length)
      expect(r.knownClockCapacityCyclesPerMonth*r.knownMxElapsedClockDays).toBeLessThanOrEqual(24+1e-10)
      expect(r.knownClockCapacityCyclesPerMonth*r.knownBoxClockDays).toBeLessThanOrEqual(24+1e-10)
    }
  })
  it('reallocates one normalized admin pool and one box with MAX per resource, not sum of clocks',()=>{
    for(const r of result().scenarios)for(const a of r.conditionalFixedAllocations){
      expect(a.resources).toHaveLength(3)
      for(const row of a.resources)expect(row.conditionalOldDistanceKnownClockMaxUsd).toBe(Math.max(row.knownClockByTimeUsd,row.oldDistanceProxyByKmUsd))
      expect(a.conditionalComponentAllocationUsd).toBeCloseTo(a.resources.reduce((s,x)=>s+x.conditionalOldDistanceKnownClockMaxUsd,0),10)
      expect(a.resources.find(x=>x.resourceId==='MX_TRACTOR')!.compatibleFullDistanceAllocationUsd).toBeNull()
      expect(a.completeCfuUsd).toBeNull()
      expect(a.completeD2DCostUsd).toBeNull()
    }
  })
  it('keeps mandatory bobtail distance and corrected fuel unresolved, not zero or old complete',()=>{
    const r=result()
    expect(r).toMatchObject({unknownDistanceDefaultedToZero:false,oldVariableTotalsCertifiedComplete:false,boxBobtailClockAdded:false,completeD2DCostUsd:null,quoteReady:false})
    for(const s of r.scenarios)expect(s).toMatchObject({additionalMxBobtailKm:null,compatibleMxTotalKm:null,compatibleMxFuelAndDriverUsd:null,gateYardApproachClockHours:null,completeMxElapsedCycleDays:null,completeMonthlyCycleCapacity:null,physicalDistanceComplete:false,southboundBobtailTimeObserved:false})
  })
  it('rejects reordered or mismatched same-box topology and crossing ownership',()=>{
    const old=structuredClone(root.supportingPilotCycleExposure);old.scenarios[1].serialBoxTimeline[2].resource='MX_TRACTOR'
    expect(()=>calculate(policy,old,root.supportingPilotRoadBorderEconomics,root.supportingAdminScaleReference.scenarios)).toThrow('PHYSICAL_CYCLE_BOX_TOPOLOGY_MISMATCH')
    const road=structuredClone(root.supportingPilotRoadBorderEconomics);road.scenarios[0].crossings[1].physicalBoxOnTractor=true
    expect(()=>calculate(policy,root.supportingPilotCycleExposure,road,root.supportingAdminScaleReference.scenarios)).toThrow('PHYSICAL_CYCLE_BORDER_MOVEMENT_MISMATCH')
  })
  it('rejects broken time, resource distance, duplicate resources, and unsubstantiated distance substitution',()=>{
    const old=structuredClone(root.supportingPilotCycleExposure);old.scenarios[0].serialBoxTimeline[1].startHour+=1
    expect(()=>calculate(policy,old,root.supportingPilotRoadBorderEconomics,root.supportingAdminScaleReference.scenarios)).toThrow('PHYSICAL_CYCLE_BOX_CLOCK_NOT_CONSERVED')
    const distance=structuredClone(root.supportingPilotCycleExposure);distance.scenarios[0].allocationResources[0].totalCycleKm+=1
    expect(()=>calculate(policy,distance,root.supportingPilotRoadBorderEconomics,root.supportingAdminScaleReference.scenarios)).toThrow('PHYSICAL_CYCLE_RESOURCE_QUANTITY_MISMATCH')
    const duplicate=structuredClone(root.supportingPilotCycleExposure);duplicate.scenarios[0].allocationResources[1]=duplicate.scenarios[0].allocationResources[0]
    expect(()=>calculate(policy,duplicate,root.supportingPilotRoadBorderEconomics,root.supportingAdminScaleReference.scenarios)).toThrow('PHYSICAL_CYCLE_DUPLICATE_RESOURCE')
    expect(()=>calculate({...policy,borderBobtailDistance:{...policy.borderBobtailDistance,perCrossingKm:1.479*.3048}},root.supportingPilotCycleExposure,root.supportingPilotRoadBorderEconomics,root.supportingAdminScaleReference.scenarios)).toThrow()
  })
  it('uses normalized monthly components without inheriting company seven-seat counts or old totals',()=>{
    const before=JSON.stringify([policy,root.supportingPilotCycleExposure,root.supportingPilotRoadBorderEconomics,root.supportingAdminScaleReference.scenarios])
    expect(result()).toEqual(result())
    expect(JSON.stringify([policy,root.supportingPilotCycleExposure,root.supportingPilotRoadBorderEconomics,root.supportingAdminScaleReference.scenarios])).toBe(before)
    expect(root.partialFixedWithCompanyScenarios.map(x=>x.displayUsd)).toEqual([32174.88,32343.83])
  })
  it('verifies source policy in consolidated readback and leaves full outputs incomplete',()=>{
    expect(()=>consolidateBinationalReferenceBudget(path=>readLocalDocument(path)+(path===file?' ':''))).toThrow('SOURCE_HASH_MISMATCH:pilotPhysicalCycle')
    expect(root.supportingPilotPhysicalCycle.scenarios).toEqual(result().scenarios)
    expect(Object.values(root.outputs).every(x=>x===null)).toBe(true)
  })
})
