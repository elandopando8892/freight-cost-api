import {z} from 'zod'
import {MxTollReconciliationSchema} from '../../src/modules/routing/mx-toll-reconciliation.js'
import {D2DBorderEvidenceSchema} from '../review-d2d-border-evidence.js'
const n=z.number().finite().nonnegative().max(1e9)
const crossing=z.enum(['MX_LOADED_NORTH','MX_BOBTAIL_SOUTH','MX_BOBTAIL_NORTH','MX_ATTACHED_EMPTY_SOUTH'])
const schema=z.object({model:z.literal('FCM_PILOT_ROAD_BORDER_PUBLIC_SCENARIOS_V1'),reviewedAt:z.string().datetime(),referenceDate:z.literal('2026-10-02'),scope:z.literal('OWN_MX_US_RELAY_SAME_TRAILER'),
  handoffSideHypothesis:z.literal('US_SIDE_NOT_ACTUAL_SELECTED_YARD'),mxTractorAxlesHypothesis:z.literal(3),attachedCombinationAxles:z.literal(5),mxNorthboundBobtailTariffMxn:z.literal(65),
  mxNorthboundBobtailSource:z.object({url:z.string().url(),locator:z.string(),capture:z.literal('PRIMARY_WEB_READER_NOT_ARCHIVED')}).strict(),
  mxForwardSelections:z.array(z.object({segmentIndex:z.number().int().nonnegative(),sourceId:z.string(),alternativeIndex:z.number().int().nonnegative()}).strict()).length(13),
  unpricedMxTollSegments:z.array(z.literal(43)).length(1),dedicatedReturnRoadPolicy:z.literal('SAME_SELECTED_C5_MOVEMENTS_REVERSED_AS_HYPOTHESIS_NOT_REVERSE_ROUTE_OBSERVATION'),networkBobtailRoadPolicy:z.literal('NO_DISTANCE_PRORATING_OF_C5_TOLLS'),
  borderTimeline:z.object({NETWORK_EXPECTED_EMPTY_PROXY:z.array(crossing).length(2),DEDICATED_EMPTY_SAME_BOX_RETURN:z.array(crossing).length(4)}).strict(),
  assumptions:z.array(z.string()).min(12),selected:z.literal(false),adoptedValues:z.literal(0),quoteReady:z.literal(false)}).strict()
const variablesSchema=z.object({scenarios:z.array(z.object({cycleScenarioId:z.enum(['NETWORK_EXPECTED_EMPTY_PROXY','DEDICATED_EMPTY_SAME_BOX_RETURN']),selected:z.literal(false),quoteReady:z.literal(false),
  partialOperatingAlternatives:z.array(z.object({monthlyComponentScenarioId:z.string(),knownOperatingComponentsUsd:n,completeD2DCostUsd:z.null(),isLowerBound:z.literal(false)}).passthrough()).length(2)}).passthrough()).length(2)}).passthrough()
const detailSchema=z.object({request:z.object({axles:z.literal(5),additionalAxles:z.literal(0),direction:z.literal('MX_TO_US')}).passthrough(),
  observations:z.object({segments:z.array(z.object({index:z.number(),instruction:z.string(),observedTollMxn:n,tollPoint:z.unknown()}).passthrough()),detailTotals:z.object({observedTollsMxn:z.literal(4770)}).passthrough()}).passthrough()}).passthrough()
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b)
/** Additive component projection. Explicit US-yard hypothesis reveals missing
 * bobtail movements; it must not certify the prior cycle as physically complete. */
export function calculatePilotRoadBorderScenarios(raw:unknown,rawTolls:unknown,rawBorder:unknown,rawDetail:unknown,rawVariables:unknown,rawFx:unknown){
  const p=schema.parse(raw),tolls=MxTollReconciliationSchema.parse(rawTolls),border=D2DBorderEvidenceSchema.parse(rawBorder),detail=detailSchema.parse(rawDetail),variables=variablesSchema.parse(rawVariables)
  const fx=z.object({mxnPerUsd:z.literal(18.3688),observationDate:z.literal('2026-10-01'),column:z.literal('FIX_DETERMINATION')}).passthrough().parse(rawFx)
  if(!same(p.borderTimeline.NETWORK_EXPECTED_EMPTY_PROXY,['MX_LOADED_NORTH','MX_BOBTAIL_SOUTH'])||!same(p.borderTimeline.DEDICATED_EMPTY_SAME_BOX_RETURN,['MX_LOADED_NORTH','MX_BOBTAIL_SOUTH','MX_BOBTAIL_NORTH','MX_ATTACHED_EMPTY_SOUTH']))throw new Error('PILOT_BORDER_TIMELINE_MISMATCH')
  if(border.mexicanBridgeObservation.amountMxn!==144||border.excludedUsBridgeObservation.publishedUsdPerAxle!==4.75||border.excludedUsBridgeObservation.nextAdjustmentFrom!=='2027-01-01'||border.excludedUsBridgeObservation.direction!=='US_TO_MX')throw new Error('PILOT_BORDER_TARIFF_PERIOD_MISMATCH')
  const points=detail.observations.segments.filter(s=>s.tollPoint!==null||s.observedTollMxn>0)
  if(detail.observations.segments.reduce((sum,s)=>sum+s.observedTollMxn,0)!==4770)throw new Error('PILOT_ROAD_PROVIDER_TOTAL_MISMATCH')
  if(new Set(tolls.sources.map(s=>s.id)).size!==tolls.sources.length||new Set(border.sources.map(s=>s.id)).size!==border.sources.length)throw new Error('PILOT_ROAD_SOURCE_DUPLICATE')
  if(p.mxNorthboundBobtailSource.url!==border.sources.find(s=>s.id==='SICT_BRIDGE_III')?.url)throw new Error('PILOT_BORDER_BOBTAIL_SOURCE_MISMATCH')
  if(points.length!==14||tolls.rows.length!==14||new Set(tolls.rows.map(r=>r.segmentIndex)).size!==14||tolls.rows.some((r,i)=>r.segmentIndex!==points[i].index||r.instruction!==points[i].instruction||r.observedMxn!==points[i].observedTollMxn))throw new Error('PILOT_ROAD_SOURCE_COVERAGE_MISMATCH')
  if(new Set(p.mxForwardSelections.map(r=>r.segmentIndex)).size!==13||new Set(variables.scenarios.map(s=>s.cycleScenarioId)).size!==2)throw new Error('PILOT_ROAD_SELECTION_DUPLICATE')
  if(!same(p.mxForwardSelections.map(r=>r.segmentIndex),points.filter(s=>s.index!==43).map(s=>s.index)))throw new Error('PILOT_ROAD_SELECTION_COVERAGE_MISMATCH')
  const selections=p.mxForwardSelections.map(s=>{
    const row=tolls.rows.find(r=>r.segmentIndex===s.segmentIndex)!,alt=row.alternatives[s.alternativeIndex]
    if(!alt||alt.sourceId!==s.sourceId||!tolls.sources.some(source=>source.id===alt.sourceId)||alt.effectiveFrom&&alt.effectiveFrom>p.referenceDate)throw new Error('PILOT_ROAD_ALTERNATIVE_MISMATCH')
    return {...s,...alt,coverageGroup:row.coverageGroup,providerObservedMxn:row.observedMxn,operatorMovementConfirmed:false,prospectiveTransfer:true}
  })
  if(new Set(selections.map(r=>r.coverageGroup)).size!==13)throw new Error('PILOT_ROAD_OVERLAPPING_COVERAGE')
  const knownForwardRoadComponentsMxn=selections.reduce((sum,r)=>sum+r.amountMxn,0)
  const scenarios=variables.scenarios.map(v=>{
    const dedicated=v.cycleScenarioId==='DEDICATED_EMPTY_SAME_BOX_RETURN',roadMultiplicity=dedicated?2:1
    if(new Set(v.partialOperatingAlternatives.map(a=>a.monthlyComponentScenarioId)).size!==2)throw new Error('PILOT_ROAD_FIXED_DUPLICATE')
    const crossings=p.borderTimeline[v.cycleScenarioId].map(id=>{
      const north=id.endsWith('NORTH'),bobtail=id.includes('BOBTAIL'),axles=bobtail?3:5,currency=north?'MXN' as const:'USD' as const,
        amountNative=north?(bobtail?p.mxNorthboundBobtailTariffMxn:border.mexicanBridgeObservation.amountMxn):axles*border.excludedUsBridgeObservation.publishedUsdPerAxle
      return {id,resourceId:'MX_TRACTOR',physicalBoxOnTractor:!bobtail,axles,currency,amountNative,amountUsd:north?amountNative/fx.mxnPerUsd:amountNative,
        direction:north?'MX_TO_US':'US_TO_MX',sourceId:north?'SICT_BRIDGE_III':'LAREDO_2026_O_114',directionTariffVerified:!north,actualCrossingObserved:false}
    })
    const knownRoadComponentsMxn=knownForwardRoadComponentsMxn*roadMultiplicity,knownRoadComponentsUsd=knownRoadComponentsMxn/fx.mxnPerUsd,
      knownBridgeComponentsUsd=crossings.reduce((sum,r)=>sum+r.amountUsd,0),knownRoadBridgeComponentsUsd=knownRoadComponentsUsd+knownBridgeComponentsUsd
    return {cycleScenarioId:v.cycleScenarioId,attachedMxRoadMultiplicity:roadMultiplicity,knownRoadComponentsMxn,knownRoadComponentsUsd,crossings,knownBridgeComponentsUsd,knownRoadBridgeComponentsUsd,
      partialAlternatives:v.partialOperatingAlternatives.map(a=>({...a,knownRoadBridgeComponentsUsd,knownComponentsWithRoadBridgeUsd:a.knownOperatingComponentsUsd+knownRoadBridgeComponentsUsd,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,isLowerBound:false})),
      unpricedComponents:{carboneraMxn:null,additionalJorobasCoverageMxn:null,networkBobtailRoadMxn:null,usInlandTollsUsd:null,handoffServicesUsd:null,additionalBorderBobtailKm:null,additionalBorderBobtailDutyHours:null,additionalBorderMovementFuelAndDriverUsd:null},
      existingCycleAndVariableAmountsPhysicallyComplete:false,priorCycleRecalculationRequired:true,fullRoadTollsUsd:null,fullCrossingServicesUsd:null,selected:false,quoteReady:false,missingAmountsDefaultedToZero:false}
  })
  return {...p,sourceRef:'pilotRoadBorder',fx,selections,knownForwardRoadComponentsMxn,providerOriginalTotalMxn:detail.observations.detailTotals.observedTollsMxn,
    omittedUnpricedPoints:tolls.rows.filter(r=>p.unpricedMxTollSegments.includes(r.segmentIndex as 43)),sources:[...tolls.sources,...border.sources],scenarios,
    completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,actualTripDate:null,truckRouteValidated:false,externalWrites:false}
}
