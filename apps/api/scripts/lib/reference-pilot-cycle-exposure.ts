import {z} from 'zod'
import {allocateFixedCost} from '../../src/modules/engine/fixed-cost-allocation.js'
import {reviewTrailerAttachment} from '../../src/modules/engine/benchmark-trailer-attachment.js'
import {calculateMxDrivingStageReference} from './reference-mx-driving-stage.js'
import {readBorderLinkPlanning} from './reference-border-link-planning.js'

const n=z.number().finite().positive().max(1e7)
const policySchema=z.object({model:z.literal('FCM_PILOT_CYCLE_EXPOSURE_PUBLIC_SCENARIOS_V1'),reviewedAt:z.string().datetime(),referencePeriod:z.literal('2026-10'),
  physicalScope:z.literal('OWN_MX_US_RELAY_SAME_TRAILER'),fleetPairs:z.literal(1),productiveElapsedAssetDaysPerMonth:z.literal(24),
  productiveDaysBasis:z.literal('DECLARED_CALENDAR_CAPACITY_NOT_ANNUAL_OPERATING_DAYS_DIVIDED_BY12'),
  usCityRoadReference:z.object({publishedMiles:z.literal(708),internationalMileKm:z.literal(1.609344),publishedDrivingMinutes:z.literal(680),
    sourceCapture:z.literal('PRIMARY_PUBLISHER_SEARCH_READER_TIME_PAGE_OPEN_UNAVAILABLE'),truckValidated:z.literal(false),zip72916OrBridgeEndpointMatched:z.literal(false)}).strict(),
  movementPolicy:z.object({mxHoursPer24Block:z.literal(10),usHoursPer24Block:z.literal(10),usBreakAfterDrivingHours:z.literal(8),usBreakHours:z.literal(.5),blockHours:z.literal(24),
    freshDriverStartAssumed:z.literal(true),terminalHandlingHours:z.literal(2),handoffHours:z.literal(2),recoveryRestHours:z.literal(14)}).strict(),
  borderPolicy:z.object({northboundCrossingMinutes:z.literal(87),historicalMedianMinutes:z.literal(70),period:z.literal(2019),direction:z.literal('MX_TO_US'),lane:z.literal('STANDARD'),
    roadCrossingOverlapConfirmed:z.literal(false),additionalRoadOverlapHoursAssumed:z.literal(0),southboundSymmetricMinutesAssumption:z.literal(87),handoffIsSeparateFromCrossingAssumed:z.literal(true)}).strict(),
  capacityPolicy:z.object({mxSourceId:z.literal('IMT_PT260_CASE'),mxAnnualKm:z.literal(120000),monthsPerYear:z.literal(12),usObservationId:z.literal('H12026'),
    usAverageTruckProxyBasis:z.literal('COMBINED_COMPANY_AND_OWNER_OPERATOR_NOT_COMPANY_ONLY'),boxCapacityDriver:z.literal('MIN_BOTH_TRACTOR_KM_CYCLES_AND_SERIAL_BOX_AVAILABLE_TIME'),boxStockRatioImported:z.literal(false)}).strict(),
  scenarios:z.array(z.object({id:z.enum(['NETWORK_EXPECTED_EMPTY_PROXY','DEDICATED_EMPTY_SAME_BOX_RETURN']),kind:z.string(),emptyShareOfTotalKm:z.union([z.literal(.0761),z.literal(.5)]),mxAndBoxTransferExplicit:z.literal(true),boxRecoveryTimeBasis:z.string(),selected:z.literal(false)}).strict()).length(2),
  sources:z.array(z.object({id:z.string(),url:z.string().url(),locator:z.string(),archive:z.object({file:z.string(),sha256:z.string()}).strict().optional()}).strict()).length(6),
  modelAssumptions:z.array(z.string()).min(10),decision:z.literal('PROSPECTIVE_CYCLE_AND_PARTIAL_FIXED_ALLOCATION_NOT_COMPLETE_PILOT'),
}).strict()
const mxSchema=z.object({observations:z.object({detailTotals:z.object({distanceKm:n,idealMinutes:n}).passthrough()}).passthrough()}).passthrough()
const capacitySchema=z.object({observations:z.array(z.object({id:z.string(),months:n,reportedThousandTotalMiles:n,averageCompanyDriverTrucks:n,averageOwnerOperatorTrucks:n,reportedEmptyMilesPercent:n}).passthrough())}).passthrough()
const componentsSchema=z.array(z.object({id:z.string(),modeledFleetPairs:z.literal(1),oneSharedBox:z.literal(true),
  knownResourceMonthlyComponents:z.object({MX_TRACTOR:n,US_TRACTOR:n,SHARED_TRAILER:n}).strict(),completeFixedBudgetUsd:z.null(),completeD2DCostUsd:z.null()}).passthrough()).length(2)

// An explicit reference-model input, not a route approval supplied by a provider.
const postalRoadSchema=z.object({model:z.literal('FCM_US_POSTAL_ROAD_PLANNING_REFERENCE_V1'),observedOn:z.literal('2026-10-03'),recordedAt:z.string().datetime(),
  scope:z.literal('PUBLIC_REFERENCE_YARD_TO_POSTAL_POINT_NOT_ACTUAL_TERMINALS'),
  origin:z.literal('18702 Metropolitan Road, Laredo, TX 78045'),destination:z.literal('72916, Fort Smith, AR'),
  distanceMiles:z.literal(734.4),internationalMileKm:z.literal(1.609344),durationMinutes:z.literal(697),
  vehicleOption:z.literal('Commercial Truck'),action:z.literal('CALCULATE_ROUTE_NOT_OPTIMIZE'),captureKind:z.literal('DIRECT_PUBLIC_BROWSER_UI_NO_ACCOUNT'),
  sourceUrl:z.literal('https://freightsidekick.com/tools/route-planner'),evidenceArchive:z.object({file:z.string().min(1),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),
  destinationPostalPointMatched:z.literal(true),actualDeliveryAddressMatched:z.literal(false),bridgeCrossingIncluded:z.literal(false),truckRestrictionsValidated:z.literal(false),
  planningTransfer:z.literal('NOMINAL_DRIVING_CLOCK_AND_SYMMETRIC_EMPTY_DISTANCE_NOT_OBSERVED_TRUCK_PERFORMANCE'),providerWarning:z.string().min(1),
  assumptions:z.array(z.string()).min(6),selectedForPlanningComparisonOnly:z.literal(true),quoteReady:z.literal(false),adoptedOperationalValues:z.literal(0)}).strict()

/** Nominal US movement clock, not an ELD, routing, weekly-duty or labor approval. */
export function calculateUsNominalMovementClock(minutes:number) {
  if(!Number.isFinite(minutes)||minutes<=0||minutes>60000) throw new Error('US_MOVEMENT_RANGE')
  let remaining=minutes/60,elapsed=0,breakHours=0,offDutyHours=0
  const timeline:{kind:'DRIVING'|'BREAK'|'OFF_DUTY';startHour:number;endHour:number}[]=[]
  const add=(kind:typeof timeline[number]['kind'],hours:number)=>{timeline.push({kind,startHour:elapsed,endHour:elapsed+hours});elapsed+=hours}
  while(remaining>1e-10){
    const start=elapsed,drive=Math.min(remaining,10)
    add('DRIVING',Math.min(drive,8))
    if(drive>8){add('BREAK',.5);breakHours+=.5;add('DRIVING',drive-8)}
    remaining=Math.max(0,remaining-drive)
    if(remaining>1e-10){const rest=24-(elapsed-start);if(rest<10)throw new Error('US_RESET_BELOW_RULE');add('OFF_DUTY',rest);offDutyHours+=rest}
  }
  return {nominalDrivingHours:minutes/60,elapsedHours:elapsed,breakHours,offDutyHours,timeline,weeklyDutyComplianceProven:false}
}

/** Public quantities + declared prospective cycle hypotheses; existing MAX and attachment validator.
 * Known-component allocation remains partial: no complete CFU/CVU or unknown monetary zeros. */
export function calculatePilotCycleExposureScenarios(raw:unknown,rawMx:unknown,rawCapacity:unknown,rawComponents:unknown,rawUsPostalRoad?:unknown,rawBorderLink?:unknown) {
  const p=policySchema.parse(raw),mx=mxSchema.parse(rawMx),capacity=capacitySchema.parse(rawCapacity),components=componentsSchema.parse(rawComponents)
  const postalRoad=rawUsPostalRoad===undefined?null:postalRoadSchema.parse(rawUsPostalRoad)
  const borderLink=rawBorderLink===undefined?null:readBorderLinkPlanning(rawBorderLink)
  if(borderLink&&!postalRoad)throw new Error('BORDER_LINK_REQUIRES_MATCHED_POSTAL_YARD_REFERENCE')
  const linkKm=borderLink?.linkDistanceKmPerMovementHypothesis??0,approachHours=(borderLink?.nationalApproachMinutesPerMovementHypothesis??0)/60
  if(new Set(p.scenarios.map(s=>s.id)).size!==2||new Set(p.sources.map(s=>s.id)).size!==6||new Set(components.map(s=>s.id)).size!==2)throw new Error('PILOT_CYCLE_DUPLICATE_IDENTITY')
  if(['TRAVELMATH_US_DISTANCE','TRAVELMATH_US_TIME','FMCSA_PROPERTY_HOS','FMCSA_DETENTION_CONTEXT','TTI_WORLD_TRADE_VISUAL','TTI_STUDY_PERIOD'].some(id=>!p.sources.some(s=>s.id===id)))throw new Error('PILOT_CYCLE_SOURCE_IDENTITY_MISMATCH')
  const obs=capacity.observations.filter(o=>o.id==='H12026')
  if(obs.length!==1||obs[0].reportedEmptyMilesPercent!==7.61||obs[0].months!==6||obs[0].reportedThousandTotalMiles!==84270||obs[0].averageCompanyDriverTrucks!==1545||obs[0].averageOwnerOperatorTrucks!==454)throw new Error('PILOT_CAPACITY_COHORT_MISMATCH')
  const mxRoadKm=mx.observations.detailTotals.distanceKm,mxKm=mxRoadKm+linkKm,mxMinutes=mx.observations.detailTotals.idealMinutes
  const usKm=postalRoad?postalRoad.distanceMiles*postalRoad.internationalMileKm:p.usCityRoadReference.publishedMiles*p.usCityRoadReference.internationalMileKm
  const usMinutes=postalRoad?.durationMinutes??p.usCityRoadReference.publishedDrivingMinutes
  const mxClock=(minutes:number)=>calculateMxDrivingStageReference({scenarioId:'MX_PILOT_TEN_HOUR',country:'MX',nominalDrivingMinutes:minutes,
    drivingTimeBasis:'SAKBE_IDEAL_TIME_ASSUMED_AS_DRIVING_SENSITIVITY_NOT_TRUCK_OBSERVATION',drivingHoursPer24HourBlock:10,
    blockHours:24,breakAfterDrivingHours:5,breakHours:.5,freshDriverAtStartHypothesis:true,excludesHandlingBorderReturnAndOtherDuty:true}).conditionalMovementOnlyElapsedHours
  const mxForwardHours=mxClock(mxMinutes),usClock=calculateUsNominalMovementClock(usMinutes),usForwardHours=usClock.elapsedHours
  const h=p.movementPolicy.terminalHandlingHours,transfer=p.movementPolicy.handoffHours,reset=p.movementPolicy.recoveryRestHours
  const crossing=p.borderPolicy.northboundCrossingMinutes/60+approachHours,reverseCrossing=p.borderPolicy.southboundSymmetricMinutesAssumption/60+approachHours
  const mxCapacityKm=p.capacityPolicy.mxAnnualKm/12,usCapacityKm=obs[0].reportedThousandTotalMiles*1000*1.609344/6/1999
  const scenarios=p.scenarios.map(s=>{
    const dedicated=s.id==='DEDICATED_EMPTY_SAME_BOX_RETURN'
    if(s.emptyShareOfTotalKm!==(dedicated?.5:.0761))throw new Error('PILOT_EMPTY_SCENARIO_MISMATCH')
    const ratio=s.emptyShareOfTotalKm/(1-s.emptyShareOfTotalKm)
    const mandatoryBobtailLinkKm=linkKm*(dedicated?2:1)
    const mxEmptyKm=mxRoadKm*ratio+(dedicated?linkKm:0)+mandatoryBobtailLinkKm,usEmptyKm=usKm*ratio
    const boxEmptyKm=dedicated?mxRoadKm*ratio+linkKm+usEmptyKm:usEmptyKm
    const mxAttachedKm=mxKm+(dedicated?mxRoadKm*ratio+linkKm:0)
    const mxBobtailKm=(dedicated?0:mxRoadKm*ratio)+mandatoryBobtailLinkKm
    const mxRecoveryHours=mxClock(mxMinutes*ratio),usRecoveryHours=calculateUsNominalMovementClock(usMinutes*ratio).elapsedHours
    const usCycleHours=transfer+usForwardHours+h+reset+usRecoveryHours+(dedicated?transfer:0)
    const mxAttachedForwardHours=h+mxForwardHours+crossing
    const boxNetworkRecoveryHours=dedicated?0:calculateUsNominalMovementClock(usMinutes*boxEmptyKm/usKm).elapsedHours
    const mxCycleHours=dedicated?mxAttachedForwardHours+usCycleHours+reverseCrossing+mxRecoveryHours+h:
      mxAttachedForwardHours+transfer+reset+mxRecoveryHours
    const boxCycleHours=dedicated?mxCycleHours:mxAttachedForwardHours+transfer+usForwardHours+h+reset+boxNetworkRecoveryHours
    const mxAttachedHours=dedicated?mxAttachedForwardHours+reverseCrossing+mxRecoveryHours+h:mxAttachedForwardHours
    const boxDetachedHours=dedicated?2*transfer:transfer
    const usAttachedHours=boxCycleHours-mxAttachedHours-boxDetachedHours
    const attachment={model:'FCM_SERIAL_TRAILER_ATTACHMENT_V1',timeBasis:'COMPATIBLE_ELAPSED_DAYS_NOT_DRIVING_HOURS',scope:'SERIAL_PHASES_NO_OVERLAP_OR_DUPLICATED_BORDER_WAIT',
      mxTractorReference:'REFERENCE_MX_TRACTOR_DISTINCT',usTractorReference:'REFERENCE_US_TRACTOR_DISTINCT',
      mxAttachedDays:{value:mxAttachedHours/24,unit:'days',evidenceIds:['PROSPECTIVE_CYCLE_POLICY'],derivation:'Declared MX attached phases including crossing once'},
      borderDetachedDays:{value:boxDetachedHours/24,unit:'days',evidenceIds:['PROSPECTIVE_CYCLE_POLICY'],derivation:'Declared separate handoff phases, not crossing plus waiting twice'},
      usAttachedDays:{value:usAttachedHours/24,unit:'days',evidenceIds:['PROSPECTIVE_CYCLE_POLICY'],derivation:'Declared US phases and same-box recovery'},
      evidenceIds:['PROSPECTIVE_CYCLE_POLICY'],derivation:'Prospective aggregated attachment amounts; dedicated timeline has MX then US then MX, not proof of one contiguous phase per country'}
    const attachmentReview=reviewTrailerAttachment(attachment,'REFERENCE_ONE_SHARED_DRY_VAN_53',{mx:mxCycleHours/24,us:usCycleHours/24},['PROSPECTIVE_CYCLE_POLICY'])
    // The legacy attachment contract permits one phase per country. Dedicated return
    // has two MX phases; retain aggregated review, plus an explicit ordered timeline below.
    if(attachmentReview.issues.length)throw new Error('PILOT_CYCLE_ATTACHMENT_INCONSISTENT')
    const boxPhases=dedicated?[
      {id:'MX_OUTBOUND_ATTACHED',resource:'MX_TRACTOR',hours:mxAttachedForwardHours},
      {id:'FIRST_HANDOFF_DETACHED',resource:'DETACHED',hours:transfer},
      {id:'US_OUTBOUND_TURNAROUND_RETURN_ATTACHED',resource:'US_TRACTOR',hours:usCycleHours-2*transfer},
      {id:'SECOND_HANDOFF_DETACHED',resource:'DETACHED',hours:transfer},
      {id:'MX_RETURN_ATTACHED',resource:'MX_TRACTOR',hours:reverseCrossing+mxRecoveryHours+h}]:[
      {id:'MX_OUTBOUND_ATTACHED',resource:'MX_TRACTOR',hours:mxAttachedHours},
      {id:'HANDOFF_DETACHED',resource:'DETACHED',hours:transfer},
      {id:'US_OUTBOUND_NEXT_PICKUP_ATTACHED',resource:'US_TRACTOR',hours:usAttachedHours}]
    let clock=0
    const serialBoxTimeline=boxPhases.map(phase=>{const startHour=clock;clock+=phase.hours;return {...phase,startHour,endHour:clock}})
    if(Math.abs(clock-boxCycleHours)>1e-8)throw new Error('PILOT_SERIAL_CLOCK_MISMATCH')
    const resources=[{resourceId:'MX_TRACTOR' as const,loadedKm:mxKm,emptyKm:mxEmptyKm,cycleDays:mxCycleHours/24,monthlyKmCapacity:mxCapacityKm,
      attachedKm:mxAttachedKm,bobtailKm:mxBobtailKm},
      {resourceId:'US_TRACTOR' as const,loadedKm:usKm,emptyKm:usEmptyKm,cycleDays:usCycleHours/24,monthlyKmCapacity:usCapacityKm}]
    const cycleLimits=[...resources.flatMap(r=>[r.monthlyKmCapacity/(r.loadedKm+r.emptyKm),24/r.cycleDays]),24/(boxCycleHours/24)]
    const modeledEquivalentCyclesPerMonth=Math.min(...cycleLimits)
    const boxMonthlyKm=(mxKm+usKm+boxEmptyKm)*modeledEquivalentCyclesPerMonth
    const allocationResources=[...resources.map(r=>({...r,totalCycleKm:r.loadedKm+r.emptyKm,monthlyElapsedDaysCapacity:24})),
      {resourceId:'SHARED_TRAILER' as const,loadedKm:mxKm+usKm,emptyKm:boxEmptyKm,totalCycleKm:mxKm+usKm+boxEmptyKm,
        cycleDays:boxCycleHours/24,monthlyKmCapacity:boxMonthlyKm,monthlyElapsedDaysCapacity:24}]
    const fixedComponentAllocations=components.map(c=>{
      const rows=allocationResources.map(r=>{const monthly=c.knownResourceMonthlyComponents[r.resourceId],byDistanceUsd=monthly*r.totalCycleKm/r.monthlyKmCapacity,
        byTimeUsd=monthly*r.cycleDays/r.monthlyElapsedDaysCapacity
        return {...r,knownMonthlyComponentUsd:monthly,byDistanceUsd,byTimeUsd,allocatedKnownFixedComponentUsd:allocateFixedCost(byDistanceUsd,byTimeUsd)}})
      return {monthlyComponentScenarioId:c.id,resources:rows,knownFixedComponentAllocationUsd:rows.reduce((sum,r)=>sum+r.allocatedKnownFixedComponentUsd,0),
        completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,isLowerBound:false,missingAmountsDefaultedToZero:false}
    })
    return {...s,returnIsObserved:false,mxTractorWaitsForSameBox:dedicated,mxCommittedWaitingForUsHours:dedicated?usCycleHours:0,
      borderLinkForecastApplied:borderLink!==null,mandatoryBobtailLinkKm,attachedBorderLinkKm:linkKm*(dedicated?2:1),
      serialBoxTimeline,boxCycleDays:boxCycleHours/24,attachmentReview,allocationResources,modeledEquivalentCyclesPerMonth,
      modeledWholeDedicatedCyclesFittingCapacity:Math.floor(modeledEquivalentCyclesPerMonth),fixedComponentAllocations,
      capacitySourceMatchedToPilot:false,calendarCapacityObserved:false,weeklyDutyComplianceProven:false,truckRouteValidated:false,
      actualEmptyKm:null,actualCycleDays:null,selected:false,quoteReady:false,adoptedValues:0}
  })
  return {...p,usClock,mxForwardHours,usForwardHours,mxLoadedKm:mxKm,usLoadedCityProxyKm:usKm,
    usLoadedReferenceKm:usKm,usRoadBasis:postalRoad?'POSTAL_REFERENCE' as const:'LEGACY_CITY' as const,
    usPostalRoadReference:postalRoad,legacyCityReferenceUsed:postalRoad===null,
    borderLinkPlanning:borderLink,borderLinkBasis:borderLink?'PUBLIC_LINK_FORECAST' as const:'UNRESOLVED_LINK' as const,
    mxLongRoadReferenceKm:mxRoadKm,sourceEndpointMatched:false,
    // Keep the old output name for readers; its scope is explicit above.
    usLoadedCityProxyKmIsCompatibilityAlias:postalRoad!==null,
    usCapacityProxyKmPerMonth:usCapacityKm,scenarios,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,
    remaining:['TRUCK_ENDPOINT_AND_ROUTE_SCOPE','CROSSING_ROAD_OVERLAP_AND_REVERSE_DIRECTION','EMPTY_FACTOR_PHYSICAL_AND_COHORT_TRANSFER',
      'FIXED_MONETARY_COMPONENTS_STILL_MISSING','COMPATIBLE_VARIABLE_COSTS_AND_TOLLS_BORDER','ROSTER_WEEKLY_CLOCK_AND_TERMINAL_WINDOWS'],
    calibrated:false,quoteReady:false,adoptedValues:0}
}
