import {z} from 'zod'
import {allocateFixedCost} from '../../src/modules/engine/fixed-cost-allocation.js'
import {calculateMxDriverPublicForecast,joinPilotDriverForecastComponents} from './reference-mx-driver-forecast.js'
import {calculatePilotFinancedCfu} from './reference-pilot-financed-cfu.js'

const p=z.number().finite().positive().max(1e6)
const policySchema=z.object({model:z.literal('FCM_MX_ORDINARY_DUTY_PILOT_CONTRAST_V1'),reviewedAt:z.string().datetime(),ordinaryDutyHours:z.literal(8),
 countedBreakHours:z.literal(.5),shiftStartLocalHour:z.literal(6),weeklyWorkedDays:z.literal(6),weekPhase:z.literal('PROSPECTIVE_MONDAY_START_NOT_ACTUAL_SERVICE_DATE'),
 waitingPolicy:z.literal('DECLARED_RELEASE_FROM_DUTY_NOT_OBSERVED_DRIVER_AVAILABILITY'),sourceRefs:z.array(z.string()).min(4),assumptions:z.array(z.string()).min(8),quoteReady:z.literal(false),adoptedValues:z.literal(0)}).strict()
type Task={id:string;hours:number;earliestHour?:number}
type Interval={kind:'TASK'|'COUNTED_BREAK'|'RELEASED_INTERVAL';id:string;startHour:number;endHour:number;hours:number;day:number}

/** Ordered divisible planning tasks, not routing/ELD or an actual dated roster.
 * Retains the current shift across calls; released gaps do not reset the week. */
export function createOrdinaryDutyPlanner(){
 let clock=0,day=-1,shiftStart=0,shiftTaskLeft=0,untilBreak=0,breakPending=false
 const timeline:Interval[]=[]
 const add=(kind:Interval['kind'],id:string,hours:number)=>{if(hours<=1e-9)return;timeline.push({kind,id,startHour:clock,endHour:clock+hours,hours,day});clock+=hours}
 const releaseUntil=(hour:number)=>{if(hour>clock)add('RELEASED_INTERVAL','DECLARED_RELEASE_NOT_OBSERVED',hour-clock)}
 const closeShift=()=>{if(breakPending){add('COUNTED_BREAK','MX_COUNTED_REST',.5);breakPending=false}}
 const nextShift=()=>{
  closeShift()
  day=Math.max(day+1,Math.ceil((clock-1e-9)/24));if(day%7===6)day++
  shiftStart=day*24;releaseUntil(shiftStart);shiftTaskLeft=7.5;untilBreak=3.75;breakPending=true
 }
 const schedule=(tasks:Task[])=>tasks.map(task=>{
  if(!task.id||!Number.isFinite(task.hours)||task.hours<=0||task.hours>1e4||task.earliestHour!==undefined&&(!Number.isFinite(task.earliestHour)||task.earliestHour<0))throw new Error('ORDINARY_DUTY_TASK_RANGE')
  if(task.earliestHour!==undefined){if(day>=0&&task.earliestHour>shiftStart+8)closeShift();releaseUntil(task.earliestHour);if(day>=0&&clock>shiftStart+8-1e-9)shiftTaskLeft=0}
  let remaining=task.hours,startHour:number|undefined
  while(remaining>1e-9){
   if(shiftTaskLeft<=1e-9||day<0)nextShift()
   // A released gap can consume the current shift window; never resurrect it.
   if(clock>=shiftStart+8-1e-9){shiftTaskLeft=0;continue}
   if(breakPending&&(untilBreak<=1e-9||clock+Math.min(remaining,shiftTaskLeft)+.5>shiftStart+8)){
    if(clock+.5>shiftStart+8+1e-9){shiftTaskLeft=0;continue}
    add('COUNTED_BREAK','MX_COUNTED_REST',.5);breakPending=false
   }
   const window=shiftStart+8-clock-(breakPending?.5:0)
   const slice=Math.min(remaining,shiftTaskLeft,window,breakPending?untilBreak:Infinity)
   if(slice<=1e-9){shiftTaskLeft=0;continue}
   startHour??=clock;add('TASK',task.id,slice);remaining-=slice;shiftTaskLeft-=slice;untilBreak-=slice
  }
  return {id:task.id,hours:task.hours,startHour:startHour!,endHour:clock}
 })
 return {schedule,finish:closeShift,get clock(){return clock},timeline}
}

/** Recompose the known physical exposure before payroll/finance, not after them.
 * Public assumptions remain separate from observations and unknown waiting pay. */
export function calculatePilotOrdinaryDuty(rawPolicy:unknown,inputs:{cycles:ReturnType<typeof import('./reference-pilot-cycle-exposure.js').calculatePilotCycleExposureScenarios>;
 physical:ReturnType<typeof import('./reference-pilot-physical-cycle.js').calculatePilotPhysicalCycle>;
 base:Parameters<typeof calculatePilotFinancedCfu>[1];driverPolicy:unknown;wages:unknown;variables:unknown;fx:unknown;road:unknown;
 financePolicy:unknown;usCapital:unknown;mxCapital:unknown;boxFinance:unknown;mxDrivingMinutes:unknown}){
 const policy=policySchema.parse(rawPolicy),minutes=p.parse(inputs.mxDrivingMinutes),cycles=structuredClone(inputs.cycles),physical=structuredClone(inputs.physical)
 const base=z.array(z.object({id:z.string(),knownResourceMonthlyComponents:z.object({MX_TRACTOR:p,US_TRACTOR:p,SHARED_TRAILER:p}).strict()}).passthrough()).length(2).parse(inputs.base)
 if(new Set(cycles.scenarios.map(s=>s.id)).size!==2||new Set(physical.scenarios.map(s=>s.id)).size!==2||new Set(base.map(s=>s.id)).size!==2)throw new Error('ORDINARY_DUTY_DUPLICATE_SCOPE')
 const scenarios=cycles.scenarios.map(c=>{
  const prior=inputs.physical.scenarios.find(s=>s.id===c.id)!,now=physical.scenarios.find(s=>s.id===c.id)!,planner=createOrdinaryDutyPlanner()
  const dedicated=c.id==='DEDICATED_EMPTY_SAME_BOX_RETURN',ratio=c.emptyShareOfTotalKm/(1-c.emptyShareOfTotalKm)
  // Link approach is inside each task envelope, outside the crossing87minute
  // hypothesis. Keep movement identity so split tasks retain insurance topology.
  const h=cycles.movementPolicy.terminalHandlingHours,transfer=cycles.movementPolicy.handoffHours
  const approachHours=(cycles.borderLinkPlanning?.nationalApproachMinutesPerMovementHypothesis??0)/60,cross=87/60+approachHours
  const outbound=planner.schedule([{id:'LOAD_MX',hours:h},{id:'MX_LOADED_DRIVING',hours:minutes/60},{id:'MX_LOADED_NORTH',hours:cross}])
  const boxMxEnd=outbound.at(-1)!.endHour
  const handoff=planner.schedule([{id:'FIRST_HANDOFF',hours:transfer}])[0]
  planner.schedule([{id:'MX_BOBTAIL_SOUTH',hours:cross}])
  let boxEnd:number,boxWaitingForMxHours=0,returnHandoffStart:number|null=null,secondHandoffEnd:number|null=null
  let usAssetWaitAndHandoffDeltaHours=handoff.endHour-handoff.startHour-transfer
  if(dedicated){
   const usBoxReady=handoff.endHour+c.serialBoxTimeline[2].hours
   const north=planner.schedule([{id:'MX_BOBTAIL_NORTH',hours:cross,earliestHour:Math.max(planner.clock,usBoxReady-cross)}])[0]
   const second=planner.schedule([{id:'SECOND_HANDOFF',hours:transfer,earliestHour:Math.max(north.endHour,usBoxReady)}])[0]
   returnHandoffStart=second.startHour;boxWaitingForMxHours=second.startHour-usBoxReady
   secondHandoffEnd=second.endHour
   usAssetWaitAndHandoffDeltaHours+=boxWaitingForMxHours+second.endHour-second.startHour-transfer
   planner.schedule([{id:'MX_ATTACHED_EMPTY_SOUTH',hours:cross},{id:'MX_EMPTY_DRIVING',hours:minutes/60},{id:'UNLOAD_MX',hours:h}])
   planner.finish();boxEnd=planner.clock
  }else{
   boxEnd=handoff.endHour+c.serialBoxTimeline[2].hours
   planner.schedule([{id:'MX_NEXT_PICKUP_DRIVING',hours:minutes/60*ratio,earliestHour:planner.clock+14}])
   planner.finish()
  }
  now.knownMxElapsedClockDays=planner.clock/24;now.knownBoxClockDays=boxEnd/24
  now.knownUsClockDays=prior.knownUsClockDays+usAssetWaitAndHandoffDeltaHours/24
  const phases=[{id:'MX_OUTBOUND_ATTACHED',resource:'MX_TRACTOR',endHour:handoff.startHour},
   {id:'FIRST_HANDOFF_DETACHED',resource:'DETACHED',endHour:handoff.endHour},
   {id:'US_ATTACHED_INCLUDING_RETURN_WAIT',resource:'US_TRACTOR',endHour:dedicated?returnHandoffStart!:boxEnd},
   ...(dedicated?[{id:'SECOND_HANDOFF_DETACHED',resource:'DETACHED',endHour:secondHandoffEnd!},
    {id:'MX_EMPTY_RETURN_ATTACHED',resource:'MX_TRACTOR',endHour:boxEnd}]:[])]
  const serialBoxTimeline=phases.map((phase,i)=>({...phase,startHour:i?phases[i-1].endHour:0,hours:phase.endHour-(i?phases[i-1].endHour:0)}))
  const mx=c.allocationResources.find(r=>r.resourceId==='MX_TRACTOR')!,us=c.allocationResources.find(r=>r.resourceId==='US_TRACTOR')!,box=c.allocationResources.find(r=>r.resourceId==='SHARED_TRAILER')!
  const capacity=Math.min(mx.monthlyKmCapacity/mx.totalCycleKm,us.monthlyKmCapacity/us.totalCycleKm,24/now.knownMxElapsedClockDays,24/now.knownUsClockDays,24/now.knownBoxClockDays)
  box.monthlyKmCapacity=box.totalCycleKm*capacity
  const clockDays={MX_TRACTOR:now.knownMxElapsedClockDays,US_TRACTOR:now.knownUsClockDays,SHARED_TRAILER:now.knownBoxClockDays}
  now.conditionalFixedAllocations=base.map(b=>{
   const resources=c.allocationResources.map(r=>{
    const monthly=b.knownResourceMonthlyComponents[r.resourceId],time=monthly*clockDays[r.resourceId]/24,distance=monthly*r.totalCycleKm/r.monthlyKmCapacity
    return {resourceId:r.resourceId,knownMonthlyComponentUsd:monthly,knownClockByTimeUsd:time,oldDistanceProxyByKmUsd:distance,
     conditionalOldDistanceKnownClockMaxUsd:allocateFixedCost(distance,time),compatibleFullDistanceAllocationUsd:r.resourceId==='MX_TRACTOR'?null:distance}
   })
   return {monthlyComponentScenarioId:b.id,resources,conditionalComponentAllocationUsd:resources.reduce((sum,r)=>sum+r.conditionalOldDistanceKnownClockMaxUsd,0),physicalDistanceComplete:false as const,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null}
  })
  return {id:c.id,timeline:planner.timeline,boxMxOutboundEndHour:boxMxEnd,firstHandoffStartHour:handoff.startHour,firstHandoffEndHour:handoff.endHour,
   prospectiveApproachHoursPerMovement:cycles.borderLinkPlanning?approachHours:null,publicLinkForecastApplied:cycles.borderLinkPlanning!==null,
   returnHandoffStartHour:returnHandoffStart,boxWaitingForMxHours,knownMxElapsedClockDays:now.knownMxElapsedClockDays,knownBoxClockDays:now.knownBoxClockDays,
   knownUsElapsedClockDays:now.knownUsClockDays,usAssetWaitAndHandoffDeltaHours,serialBoxTimeline,conditionalFixedAllocations:now.conditionalFixedAllocations,
   priorMxElapsedClockDays:prior.knownMxElapsedClockDays,priorBoxClockDays:prior.knownBoxClockDays,compatibleKnownCyclesPerMonth:capacity,
   totalKnownTaskHours:planner.timeline.filter(t=>t.kind==='TASK').reduce((sum,t)=>sum+t.hours,0),
   countedBreakHours:planner.timeline.filter(t=>t.kind==='COUNTED_BREAK').reduce((sum,t)=>sum+t.hours,0),
   actualWaitingCompensationMxn:null,actualReleaseVerified:false,ordinaryShiftContrastOnly:true,actualRosterCompliance:false,completeD2DCostUsd:null}
 })
 const driver=calculateMxDriverPublicForecast(inputs.driverPolicy,cycles,physical,inputs.wages,inputs.variables,inputs.fx)
 const cash=joinPilotDriverForecastComponents(driver,physical,inputs.road)
 const financed=calculatePilotFinancedCfu(inputs.financePolicy,inputs.base,physical,cash,inputs.usCapital,inputs.mxCapital,inputs.boxFinance,inputs.fx)
 return {...policy,scenarios,driver,cash,financed,originalInputsChanged:false,oldSerialTimelinesAreNotNewSchedule:true,
  actualServiceDate:null,actualWaitingCompensationMxn:null,actualOvertimeMxn:null,actualDutyCompliance:false,
  completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,externalWrites:false}
}
