import {z} from 'zod'
const source=z.object({id:z.string(),url:z.string().url(),locator:z.string().min(10),archive:z.object({file:z.string(),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict()}).strict()
const policy=z.object({model:z.literal('FCM_MX_TOLL_COVERAGE_REVIEW_V1'),reviewedAt:z.string().datetime(),referenceDate:z.literal('2026-10-02'),
  jorobas:z.object({segmentIndex:z.literal(16),selectedC5Mxn:z.literal(642),capufePublishedC5Mxn:z.literal(278),additionalAutomaticChargeMxn:z.literal(0),sharedTariffEvidence:z.literal('OPERATOR_T0_STRUCTURE_NOT_C5_SPLIT_CERTIFICATION'),discountApplied:z.literal(false),movementConfirmed:z.literal(false)}).strict(),
  carbonera:z.object({segmentIndex:z.literal(43),alias:z.literal('La Carbonera (Ojo Caliente)'),officialCoordinates:z.tuple([z.literal(-100.868249),z.literal(25.510948)]),officialPlazaNumber:z.literal(159),officialLocator:z.string().min(20),historicalC5Mxn:z.literal(0),historicalEffectiveFrom:z.literal('2023-11-15'),currentC5Cell:z.literal('BLANK_NOT_ZERO'),currentEffectiveFrom:z.literal('2026-04-13'),currentC5Mxn:z.null(),exemptionVerified:z.literal(false)}).strict(),
  sources:z.array(source).length(5),limitations:z.array(z.string()).min(4),quoteReady:z.literal(false),adoptedValues:z.literal(0)}).strict()
const detail=z.object({request:z.object({axles:z.literal(5)}).passthrough(),observations:z.object({segments:z.array(z.object({index:z.number().int(),instruction:z.string(),observedTollMxn:z.number().finite().nonnegative(),tollPoint:z.object({type:z.literal('Point'),coordinates:z.tuple([z.number().finite().min(-180).max(180),z.number().finite().min(-90).max(90)])}).nullable()}).passthrough())}).passthrough()}).passthrough()
const road=z.object({knownForwardRoadComponentsMxn:z.literal(4751),providerOriginalTotalMxn:z.literal(4770),selections:z.array(z.object({segmentIndex:z.number(),amountMxn:z.number(),sourceId:z.string()}).passthrough()),omittedUnpricedPoints:z.array(z.object({segmentIndex:z.number()}).passthrough()),quoteReady:z.literal(false)}).passthrough()
/** Coverage review, not another cost component or proof of a tariff exemption. */
export function reviewMxTollCoverage(raw:unknown,rawDetail:unknown,rawRoad:unknown){
  const p=policy.parse(raw),d=detail.parse(rawDetail),r=road.parse(rawRoad)
  const expected=['CEM_SHARED_T0','SICT_PLAZAS_2025','CAPUFE_2024_HISTORY','CAPUFE_2026_REUSED','CEM_TARIFFS_REUSED']
  if(p.sources.some((s,i)=>s.id!==expected[i]))throw new Error('MX_TOLL_COVERAGE_SOURCE_BINDING')
  if(r.selections.length!==13||new Set(r.selections.map(s=>s.segmentIndex)).size!==13||r.selections.reduce((sum,s)=>sum+s.amountMxn,0)!==4751)throw new Error('MX_TOLL_COVERAGE_SUBTOTAL_BINDING')
  if(new Set(d.observations.segments.map(s=>s.index)).size!==d.observations.segments.length)throw new Error('MX_TOLL_COVERAGE_DUPLICATE_POINT')
  const c=d.observations.segments.find(s=>s.index===43),j=d.observations.segments.find(s=>s.index===16),l=d.observations.segments.find(s=>s.index===40)
  if(!c?.tollPoint||!j?.tollPoint||!l?.tollPoint||c.instruction!=='Cruce la caseta La Carbonera'||c.observedTollMxn!==0||j.observedTollMxn!==642||l.observedTollMxn!==306)throw new Error('MX_TOLL_COVERAGE_POINT_BINDING')
  const [lon,lat]=c.tollPoint.coordinates,[officialLon,officialLat]=p.carbonera.officialCoordinates,toRad=(n:number)=>n*Math.PI/180
  const a=Math.sin(toRad(lat-officialLat)/2)**2+Math.cos(toRad(lat))*Math.cos(toRad(officialLat))*Math.sin(toRad(lon-officialLon)/2)**2
  const geographicSeparationMeters=6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
  if(geographicSeparationMeters>25)throw new Error('MX_TOLL_COVERAGE_GEOGRAPHIC_MISMATCH')
  if(r.selections.filter(s=>s.segmentIndex===16&&s.amountMxn===642&&s.sourceId==='CEM').length!==1||r.selections.filter(s=>s.segmentIndex===40&&s.amountMxn===306).length!==1||r.selections.some(s=>s.segmentIndex===43)||r.omittedUnpricedPoints.length!==1||r.omittedUnpricedPoints[0].segmentIndex!==43)throw new Error('MX_TOLL_COVERAGE_ECONOMIC_BINDING')
  return {...p,sourceRef:'mxTollCoverage',jorobas:{...p.jorobas,status:'BUNDLED_REFERENCE_NO_AUTOMATIC_SECOND_CHARGE' as const,c5RevenueSplitMxn:null},
    carbonera:{...p.carbonera,geographicSeparationMeters,identityConfirmed:true,distinctFromLosChorros:true,status:'CURRENT_C5_TARIFF_PENDING' as const},
    knownForwardRoadComponentsMxn:r.knownForwardRoadComponentsMxn,providerOriginalTotalMxn:r.providerOriginalTotalMxn,addedCostMxn:0,
    completeRoadTollsMxn:null,completeD2DCostUsd:null,truckRouteValidated:false,externalWrites:false}
}
