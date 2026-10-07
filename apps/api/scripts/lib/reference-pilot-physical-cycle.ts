import {z} from 'zod'
import {allocateFixedCost} from '../../src/modules/engine/fixed-cost-allocation.js'
import {BorderLinkPlanningSchema} from './reference-border-link-planning.js'

const id=z.enum(['NETWORK_EXPECTED_EMPTY_PROXY','DEDICATED_EMPTY_SAME_BOX_RETURN'])
const resource=z.enum(['MX_TRACTOR','US_TRACTOR','SHARED_TRAILER'])
const n=z.number().finite().nonnegative(),p=n.positive()
const policySchema=z.object({model:z.literal('FCM_OWN_RELAY_PARALLEL_PHYSICAL_CYCLE_V1'),reviewedAt:z.string().datetime(),scope:z.literal('OWN_MX_US_RELAY_SAME_TRAILER'),handoffSide:z.literal('US_SIDE_NOT_ACTUAL_SELECTED_YARD'),
  borderTiming:z.object({loadedNorthMinutes:z.literal(87),bobtailSouthMinutesHypothesis:z.literal(87),bobtailNorthMinutesHypothesis:z.literal(87),attachedEmptySouthMinutesHypothesis:z.literal(87),
    basis:z.literal('2019_NORTHBOUND_COMPLETE_CROSSING_MEAN_TRANSFERRED_TO_OTHER_MOVEMENTS_NOT_OBSERVED_BOBTAIL_OR_SOUTHBOUND'),additionalRoadClockOverlapHoursHypothesis:z.literal(0)}).strict(),
  dedicatedRecovery:z.literal('MX_BOBTAIL_SOUTH_WAIT_MX_BOBTAIL_NORTH_SYNCHRONIZED_WITH_US_RETURN_SAME_BOX'),networkRecovery:z.literal('MX_BOBTAIL_SOUTH_BEFORE_MX_NEXT_PICKUP_US_BOX_STAYS_US'),
  borderBobtailDistance:z.object({perCrossingKm:z.null(),basis:z.literal('PENDING_GATE_AND_YARD_ROAD_SCOPE_NOT_ZERO_NOT_PLANNED_EXPANSION_SPAN')}).strict(),
  restPolicy:z.object({mxRecoveryRestHours:z.literal(14),dedicatedRestOverlapsCommittedWaiting:z.literal(true)}).strict(),sourceRefs:z.array(z.string()).length(4),assumptions:z.array(z.string()).min(10)}).strict()
const oldSchema=z.object({productiveElapsedAssetDaysPerMonth:z.literal(24),
  borderLinkPlanning:BorderLinkPlanningSchema.nullable().optional(),
  movementPolicy:z.object({handoffHours:z.literal(2)}).passthrough(),
  scenarios:z.array(z.object({id,serialBoxTimeline:z.array(z.object({id:z.string(),resource:z.enum(['MX_TRACTOR','US_TRACTOR','DETACHED']),hours:p,startHour:n,endHour:p}).strict()),
    allocationResources:z.array(z.object({resourceId:resource,totalCycleKm:p,cycleDays:p,monthlyKmCapacity:p,loadedKm:p,emptyKm:p}).passthrough()).length(3),
    boxCycleDays:p,mxTractorWaitsForSameBox:z.boolean(),selected:z.literal(false)}).passthrough()).length(2)}).passthrough()
const roadSchema=z.object({scenarios:z.array(z.object({cycleScenarioId:id,crossings:z.array(z.object({id:z.string(),resourceId:z.literal('MX_TRACTOR'),physicalBoxOnTractor:z.boolean(),amountUsd:n}).passthrough())}).passthrough()).length(2)}).passthrough()
const fixedSchema=z.array(z.object({id:z.string(),modeledFleetPairs:z.literal(1),oneSharedBox:z.literal(true),
  knownResourceMonthlyComponents:z.object({MX_TRACTOR:n,US_TRACTOR:n,SHARED_TRAILER:n}).strict(),completeFixedBudgetUsd:z.null(),completeD2DCostUsd:z.null()}).passthrough()).length(2)
type Phase={id:string;hours:number;boxAttached:boolean;restOverlapsWaiting?:boolean}

/** A box's serial clock and MX's parallel mandatory bridge loop are different clocks.
 * Unknown gate-to-yard distance is deliberately not supplied by bridge geometry. */
export function calculatePilotPhysicalCycle(raw:unknown,rawOld:unknown,rawRoad:unknown,rawFixed:unknown){
  const policy=policySchema.parse(raw),old=oldSchema.parse(rawOld),road=roadSchema.parse(rawRoad),fixed=fixedSchema.parse(rawFixed)
  if(new Set(old.scenarios.map(s=>s.id)).size!==2||new Set(road.scenarios.map(s=>s.cycleScenarioId)).size!==2||new Set(fixed.map(s=>s.id)).size!==2)throw new Error('PHYSICAL_CYCLE_DUPLICATE_IDENTITY')
  const scenarios=old.scenarios.map(s=>{
    if(new Set(s.allocationResources.map(r=>r.resourceId)).size!==3)throw new Error('PHYSICAL_CYCLE_DUPLICATE_RESOURCE')
    const dedicated=s.id==='DEDICATED_EMPTY_SAME_BOX_RETURN',mx=s.allocationResources.find(r=>r.resourceId==='MX_TRACTOR')!,us=s.allocationResources.find(r=>r.resourceId==='US_TRACTOR')!,box=s.allocationResources.find(r=>r.resourceId==='SHARED_TRAILER')!
    if(s.allocationResources.some(r=>Math.abs(r.totalCycleKm-r.loadedKm-r.emptyKm)>1e-7)||Math.abs(box.loadedKm-mx.loadedKm-us.loadedKm)>1e-7||Math.abs(box.cycleDays-s.boxCycleDays)>1e-8)throw new Error('PHYSICAL_CYCLE_RESOURCE_QUANTITY_MISMATCH')
    const expectedBoxOrder=dedicated?['MX_TRACTOR','DETACHED','US_TRACTOR','DETACHED','MX_TRACTOR']:['MX_TRACTOR','DETACHED','US_TRACTOR']
    if(JSON.stringify(s.serialBoxTimeline.map(x=>x.resource))!==JSON.stringify(expectedBoxOrder)||s.mxTractorWaitsForSameBox!==dedicated)throw new Error('PHYSICAL_CYCLE_BOX_TOPOLOGY_MISMATCH')
    for(let i=0;i<s.serialBoxTimeline.length;i++){
      const phase=s.serialBoxTimeline[i]
      if(Math.abs(phase.endHour-phase.startHour-phase.hours)>1e-8||Math.abs(phase.startHour-(i?s.serialBoxTimeline[i-1].endHour:0))>1e-8)throw new Error('PHYSICAL_CYCLE_BOX_CLOCK_NOT_CONSERVED')
    }
    if(Math.abs(s.serialBoxTimeline.at(-1)!.endHour-s.boxCycleDays*24)>1e-8)throw new Error('PHYSICAL_CYCLE_BOX_CLOCK_NOT_CONSERVED')
    if(Math.abs(us.cycleDays*24-s.serialBoxTimeline[2].hours-(dedicated?4:2))>1e-8||dedicated&&Math.abs(mx.cycleDays-s.boxCycleDays)>1e-8)throw new Error('PHYSICAL_CYCLE_RESOURCE_CLOCK_MISMATCH')
    const expectedCrossings=dedicated?['MX_LOADED_NORTH','MX_BOBTAIL_SOUTH','MX_BOBTAIL_NORTH','MX_ATTACHED_EMPTY_SOUTH']:['MX_LOADED_NORTH','MX_BOBTAIL_SOUTH']
    const border=road.scenarios.find(x=>x.cycleScenarioId===s.id)!
    if(JSON.stringify(border.crossings.map(c=>c.id))!==JSON.stringify(expectedCrossings)||border.crossings.some(c=>c.physicalBoxOnTractor===c.id.includes('BOBTAIL')))throw new Error('PHYSICAL_CYCLE_BORDER_MOVEMENT_MISMATCH')
    const approachHours=(old.borderLinkPlanning?.nationalApproachMinutesPerMovementHypothesis??0)/60
    const first=s.serialBoxTimeline[0],handoff=old.movementPolicy.handoffHours,south=policy.borderTiming.bobtailSouthMinutesHypothesis/60+approachHours,north=policy.borderTiming.bobtailNorthMinutesHypothesis/60+approachHours
    const phases:Phase[]=[{id:'MX_LOADED_TO_US_YARD',hours:first.hours,boxAttached:true},{id:'FIRST_HANDOFF_US',hours:handoff,boxAttached:false},
      {id:'MX_BOBTAIL_SOUTH',hours:south,boxAttached:false}]
    if(dedicated){
      const usBoxPhase=s.serialBoxTimeline[2],waiting=usBoxPhase.hours-south-north
      if(waiting<policy.restPolicy.mxRecoveryRestHours)throw new Error('PHYSICAL_CYCLE_PARALLEL_RETURN_INFEASIBLE')
      phases.push({id:'MX_COMMITTED_WAIT_WHILE_US_BOX_ROUNDTRIP',hours:waiting,boxAttached:false,restOverlapsWaiting:true},
        {id:'MX_BOBTAIL_NORTH',hours:north,boxAttached:false},{id:'SECOND_HANDOFF_US',hours:handoff,boxAttached:false},
        {id:'MX_SAME_BOX_EMPTY_RETURN',hours:s.serialBoxTimeline[4].hours,boxAttached:true})
    }else{
      const emptyRoadClock=mx.cycleDays*24-first.hours-handoff-policy.restPolicy.mxRecoveryRestHours
      if(emptyRoadClock<=0)throw new Error('PHYSICAL_CYCLE_NETWORK_CLOCK_INFEASIBLE')
      phases.push({id:'MX_RECOVERY_REST',hours:policy.restPolicy.mxRecoveryRestHours,boxAttached:false},
        {id:'MX_NETWORK_NEXT_PICKUP_REFERENCE_MOVEMENT',hours:emptyRoadClock,boxAttached:false})
    }
    let clock=0
    const mxParallelTimeline=phases.map(phase=>{const startHour=clock;clock+=phase.hours;return {...phase,startHour,endHour:clock}})
    if(dedicated&&Math.abs(mxParallelTimeline.find(x=>x.id==='SECOND_HANDOFF_US')!.startHour-s.serialBoxTimeline[3].startHour)>1e-8)throw new Error('PHYSICAL_CYCLE_HANDOFF_NOT_SYNCHRONIZED')
    const mxKnownClockDays=clock/24,boxKnownClockDays=s.boxCycleDays
    const knownClockCapacityCyclesPerMonth=Math.min(24/mxKnownClockDays,24/us.cycleDays,24/boxKnownClockDays)
    const resourceKnownClockRows=[{...mx,cycleDays:mxKnownClockDays},{...us},{...box}]
    const conditionalFixedAllocations=fixed.map(f=>{
      const rows=resourceKnownClockRows.map(r=>{
        const monthly=f.knownResourceMonthlyComponents[r.resourceId],knownClockByTimeUsd=monthly*r.cycleDays/24
        const oldDistanceProxyByKmUsd=monthly*r.totalCycleKm/r.monthlyKmCapacity
        return {resourceId:r.resourceId,knownMonthlyComponentUsd:monthly,knownClockByTimeUsd,oldDistanceProxyByKmUsd,
          conditionalOldDistanceKnownClockMaxUsd:allocateFixedCost(oldDistanceProxyByKmUsd,knownClockByTimeUsd),
          compatibleFullDistanceAllocationUsd:r.resourceId==='MX_TRACTOR'?null:oldDistanceProxyByKmUsd}
      })
      return {monthlyComponentScenarioId:f.id,resources:rows,conditionalComponentAllocationUsd:rows.reduce((v,r)=>v+r.conditionalOldDistanceKnownClockMaxUsd,0),
        physicalDistanceComplete:false,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null}
    })
    return {id:s.id,serialBoxTimeline:s.serialBoxTimeline,mxParallelTimeline,knownMxElapsedClockDays:mxKnownClockDays,
      priorMxElapsedClockDays:mx.cycleDays,knownBoxClockDays:boxKnownClockDays,knownUsClockDays:us.cycleDays,
      mandatoryBobtailCrossings:dedicated?2:1,mandatoryCrossings:border.crossings,
      knownClockCapacityCyclesPerMonth,conditionalFixedAllocations,
      sameBoxChargedOnce:true,adminPoolChargedOnce:true,restAddedAgainDuringCommittedWait:false,
      additionalMxBobtailKm:null,compatibleMxTotalKm:null,compatibleMxFuelAndDriverUsd:null,
      prospectiveAdditionalMxBobtailLinkKm:old.borderLinkPlanning?(dedicated?2:1)*old.borderLinkPlanning.linkDistanceKmPerMovementHypothesis:null,
      prospectiveApproachHoursPerMovement:old.borderLinkPlanning?approachHours:null,
      publicLinkForecastApplied:!!old.borderLinkPlanning,
      gateYardApproachClockHours:null,completeMxElapsedCycleDays:null,completeMonthlyCycleCapacity:null,
      southboundBobtailTimeObserved:false,bobtailClockSymmetryAssumed:true,physicalDistanceComplete:false,selected:false,quoteReady:false}
  })
  return {...policy,scenarios,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,
    unknownDistanceDefaultedToZero:false,oldVariableTotalsCertifiedComplete:false,boxBobtailClockAdded:false,
    remaining:['GATE_YARD_DISTANCE_AND_APPROACH_CLOCK','ROAD_CROSSING_TIME_OVERLAP','BOBTAIL_DRIVER_FUEL_MAINTENANCE','COMPLETE_COMPANY_AND_INSURANCE_FINANCED_BOX','COMPLETE_VARIABLE_AND_ROAD_MONETARY_SCOPE'],
    calibrated:false,quoteReady:false,externalWrites:false}
}
