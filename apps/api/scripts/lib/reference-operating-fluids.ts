import {z} from 'zod'
const p=z.number().finite().positive().max(1e9),text=z.string().min(1),cycle=z.enum(['NETWORK_EXPECTED_EMPTY_PROXY','DEDICATED_EMPTY_SAME_BOX_RETURN'])
const policySchema=z.object({model:z.literal('FCM_OPERATING_FLUID_REFERENCE_V1'),reviewedAt:z.string().datetime(),dieselBoundary:z.literal('EXISTING_ROAD_ONLY_CONSTANT_CONSUMPTION_NOT_MIXED_IDLE_CYCLE'),
 def:z.object({volumeFraction:z.literal(.04),sourceLow:z.literal(.03),sourceHigh:z.literal(.05),basis:z.literal('CUMMINS_X15_RANGE_MIDPOINT_TRANSFER_TO_DD15_NOT_MEASURED'),scrEquipment:z.literal('DECLARED_SCR_REFERENCE_ON_BOTH_TRACTORS_NOT_LISTING_OR_VIN_VERIFIED'),
 mxPackageLiters:z.literal(20),mxPackageNetMxn:z.literal(472.2),mxShippingPerPackageNetMxn:z.literal(314.65),mxVatRate:z.literal(.16),mxProcurement:z.literal('ONE_20L_PARCEL_PUBLISHED_DELIVERY_REFERENCE_NO_FREE_SHIPPING_THRESHOLD_INFERRED'),usPackageGallons:z.literal(2.5),usPackageNetUsd:z.literal(9.88),usPurchaseTaxRate:z.literal(.0825),usProcurement:z.literal('PUBLIC_SACRAMENTO_CONTEXT_PRICE_TRANSFER_LAREDO_PICKUP_TAX_HYPOTHESIS_NOT_STORE_QUOTE'),inventory:z.literal('EXACT_CONSUMED_VOLUME_NO_FULL_CONTAINER_CASH_ADDED_AGAIN')}).strict(),
 idle:z.object({gallonsPerHour:z.literal(.8),annualReferenceHours:z.literal(1830),productiveElapsedDaysPerMonth:z.literal(24),quantityBasis:z.literal('ANNUAL_BENCHMARK_CAPACITY_NORMALIZED_TIME_RESERVE_NOT_EVENT_TRACE'),mxTransfer:z.literal('US_HEAVY_DUTY_IDLE_REFERENCE_TRANSFER_NOT_MX_MEASUREMENT'),applianceAlternativeAddedAgain:z.literal(false)}).strict(),
 sources:z.array(z.object({id:text,url:z.string().url(),capture:z.enum(['ORIGINAL_HTTP_HTML','PRIMARY_WEB_READER_HTTP_403_NOT_ARCHIVED']),archive:z.object({file:z.string().startsWith('docs/research/sources/'),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict().nullable(),locator:text}).strict()).length(4),reusedSourceRefs:z.array(text).length(3),assumptions:z.array(text).min(10),completeCfuUsd:z.null(),completeCvuUsd:z.null(),completeD2DCostUsd:z.null(),quoteReady:z.literal(false),adoptedValues:z.literal(0)}).strict()
const cost=z.object({baseCostId:text,cashComparisonId:text,cycleScenarioId:cycle,paymentMode:z.enum(['CASH','FINANCED']),knownCvuComponentUsd:p,tripSupplementsAddedOnce:z.literal(true),alternatives:z.array(z.object({premiumAlternativeId:text,knownCfuComponentUsd:p,totalKnownComponentsUsd:p,completeD2DCostUsd:z.null(),quoteReady:z.literal(false)}).passthrough()).length(2)}).passthrough()
const baseSchema=z.object({model:z.literal('FCM_PILOT_TRIP_SUPPLEMENTS_V1'),cash:z.array(cost).length(8),financed:z.array(cost).length(128)}).passthrough()
const variableSchema=z.object({model:z.literal('FCM_PILOT_VARIABLE_PUBLIC_SCENARIOS_V1'),scenarios:z.array(z.object({cycleScenarioId:cycle,conditionalRoadFuelQuantity:z.object({mxLiters:p,usGallons:p,idleFuelQuantity:z.null()}).passthrough(),rows:z.array(z.object({id:text,amountNative:p}).passthrough())}).passthrough()).length(2)}).passthrough()
const dutySchema=z.object({model:z.literal('FCM_MX_ORDINARY_DUTY_PILOT_CONTRAST_V1'),scenarios:z.array(z.object({id:cycle,knownMxElapsedClockDays:p,knownUsElapsedClockDays:p}).passthrough()).length(2)}).passthrough()
const fxSchema=z.object({model:z.literal('FCM_DATED_FIX_VALUATION_REFERENCE_V1'),mxnPerUsd:z.literal(18.3688),observationDate:z.literal('2026-10-01')}).passthrough()
const unique=(ids:string[],code:string)=>{if(new Set(ids).size!==ids.length)throw new Error(code)}
const close=(a:number,b:number)=>Math.abs(a-b)<1e-7
const US_GALLON_LITERS=3.785411784

/** Public idle reserve allocation is not an event trace. DEF follows consumed
 * road + reserve diesel volume once; no second box or capital/driver charge. */
export function calculateOperatingFluids(rawPolicy:unknown,rawBase:unknown,rawVariables:unknown,rawDuty:unknown,rawFx:unknown){
 if(typeof rawBase==='object'&&rawBase!==null&&'operatingFluidsAddedOnce' in rawBase&&rawBase.operatingFluidsAddedOnce===true)throw new Error('FLUIDS_ALREADY_APPLIED')
 const policy=policySchema.parse(rawPolicy),base=baseSchema.parse(rawBase),variables=variableSchema.parse(rawVariables),duty=dutySchema.parse(rawDuty),fx=fxSchema.parse(rawFx)
 unique(variables.scenarios.map(s=>s.cycleScenarioId),'FLUIDS_VARIABLE_DUPLICATE');unique(duty.scenarios.map(s=>s.id),'FLUIDS_DUTY_DUPLICATE')
 const expected=['CUMMINS_ONHIGHWAY_DEF','AMSA_FLEETRITE_DEF','WALMART_SUPERTECH_DEF','DOE_IDLE_METHOD']
 if(expected.some(id=>policy.sources.filter(s=>s.id===id).length!==1)||policy.sources.some(s=>(s.archive===null)!==(s.capture!=='ORIGINAL_HTTP_HTML')||(s.archive===null&&s.id!=='CUMMINS_ONHIGHWAY_DEF')))throw new Error('FLUIDS_SOURCE_SET_MISMATCH')
 const def=policy.def,idle=policy.idle,mxDefUnitMxn=(def.mxPackageNetMxn+def.mxShippingPerPackageNetMxn)*(1+def.mxVatRate)/def.mxPackageLiters,usDefUnitUsd=def.usPackageNetUsd*(1+def.usPurchaseTaxRate)/def.usPackageGallons
 const scenarios=variables.scenarios.map(v=>{
  unique(v.rows.map(r=>r.id),'FLUIDS_ROW_DUPLICATE')
  if(v.rows.some(r=>/DEF|IDLE/.test(r.id)))throw new Error('FLUIDS_BASE_ALREADY_INCLUDES')
  const mxFuel=v.rows.find(r=>r.id==='MX_FUEL'),usFuel=v.rows.find(r=>r.id==='US_FUEL'),d=duty.scenarios.find(s=>s.id===v.cycleScenarioId)!
  if(!mxFuel||!usFuel||!close(mxFuel.amountNative,v.conditionalRoadFuelQuantity.mxLiters*27)||!close(usFuel.amountNative,v.conditionalRoadFuelQuantity.usGallons*5.955))throw new Error('FLUIDS_DIESEL_SOURCE_QUANTITY_MISMATCH')
  const monthlyReferenceIdleHours=idle.annualReferenceHours/12,mxIdleHours=monthlyReferenceIdleHours*d.knownMxElapsedClockDays/idle.productiveElapsedDaysPerMonth,usIdleHours=monthlyReferenceIdleHours*d.knownUsElapsedClockDays/idle.productiveElapsedDaysPerMonth
  if(d.knownMxElapsedClockDays>24||d.knownUsElapsedClockDays>24)throw new Error('FLUIDS_EXPOSURE_RANGE')
  const mxIdleLiters=mxIdleHours*idle.gallonsPerHour*US_GALLON_LITERS,usIdleGallons=usIdleHours*idle.gallonsPerHour
  const mxTotalDieselLiters=v.conditionalRoadFuelQuantity.mxLiters+mxIdleLiters,usTotalDieselGallons=v.conditionalRoadFuelQuantity.usGallons+usIdleGallons
  const atFraction=(fraction:number)=>{
   const mxDefLiters=mxTotalDieselLiters*fraction,usDefGallons=usTotalDieselGallons*fraction
   const lines=[{id:'MX_IDLE_DIESEL_RESERVE',resourceId:'MX_TRACTOR',unit:'liter',quantity:mxIdleLiters,unitNative:27,currency:'MXN',amountUsd:mxIdleLiters*27/fx.mxnPerUsd},
    {id:'US_IDLE_DIESEL_RESERVE',resourceId:'US_TRACTOR',unit:'US-gallon',quantity:usIdleGallons,unitNative:5.955,currency:'USD',amountUsd:usIdleGallons*5.955},
    {id:'MX_DEF',resourceId:'MX_TRACTOR',unit:'liter',quantity:mxDefLiters,unitNative:mxDefUnitMxn,currency:'MXN',amountUsd:mxDefLiters*mxDefUnitMxn/fx.mxnPerUsd},
    {id:'US_DEF',resourceId:'US_TRACTOR',unit:'US-gallon',quantity:usDefGallons,unitNative:usDefUnitUsd,currency:'USD',amountUsd:usDefGallons*usDefUnitUsd}]
   return {fraction,lines,knownVariableAdditionUsd:lines.reduce((s,l)=>s+l.amountUsd,0),mxDefLiters,usDefGallons,mxPackageConsumptionEquivalent:mxDefLiters/20,usPackageConsumptionEquivalent:usDefGallons/2.5}
  }
  return {cycleScenarioId:v.cycleScenarioId,monthlyReferenceIdleHours,mxIdleHours,usIdleHours,roadDieselQuantity:v.conditionalRoadFuelQuantity,mxTotalDieselLiters,usTotalDieselGallons,reference:atFraction(def.volumeFraction),sensitivity:[atFraction(def.sourceLow),atFraction(def.sourceHigh)],actualIdleHoursObserved:false,actualScrVerified:false,completeD2DCostUsd:null}
 })
 unique([...base.cash,...base.financed].map(c=>c.baseCostId),'FLUIDS_COST_DUPLICATE')
 const join=(c:z.infer<typeof cost>,payment:'CASH'|'FINANCED')=>{
  const cash=base.cash.find(x=>x.baseCostId===c.cashComparisonId),s=scenarios.find(s=>s.cycleScenarioId===c.cycleScenarioId)!
  if(c.operatingFluidsAddedOnce===true)throw new Error('FLUIDS_ALREADY_APPLIED')
  if(c.paymentMode!==payment||!cash||cash.cycleScenarioId!==c.cycleScenarioId||!close(cash.knownCvuComponentUsd,c.knownCvuComponentUsd)||(payment==='CASH'&&c.cashComparisonId!==c.baseCostId))throw new Error('FLUIDS_COST_JOIN_MISMATCH')
  unique(c.alternatives.map(a=>a.premiumAlternativeId),'FLUIDS_ALTERNATIVE_DUPLICATE')
  const delta=s.reference.knownVariableAdditionUsd
  return {...c,priorKnownCvuComponentUsd:c.knownCvuComponentUsd,knownCvuComponentUsd:c.knownCvuComponentUsd+delta,operatingFluidsVariableAdditionUsd:delta,priorAlternatives:c.alternatives,
   alternatives:c.alternatives.map(a=>{if(!close(a.totalKnownComponentsUsd,a.knownCfuComponentUsd+c.knownCvuComponentUsd))throw new Error('FLUIDS_COST_SUM_MISMATCH');return {...a,priorTotalKnownComponentsUsd:a.totalKnownComponentsUsd,totalKnownComponentsUsd:a.totalKnownComponentsUsd+delta}}),operatingFluidsAddedOnce:true,cvusChanged:true,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null}
 }
 return {...policy,sourceRef:'operatingFluids',mxDefUnitMxn,usDefUnitUsd,scenarios,cash:base.cash.map(c=>join(c,'CASH')),financed:base.financed.map(c=>join(c,'FINANCED')),operatingFluidsAddedOnce:true,cfusChanged:false,actualConsumptionObserved:false,externalWrites:false,
  remaining:['COMPATIBLE_ENGINE_EMISSION_AND_EVENT_IDLE_BOUNDARIES','GATE_YARD_DISTANCE_AND_CLOCK_BOBTAIL_WEAR','MATCHED_TRUCK_ITINERARY_TOLLS','COMMERCIAL_BORDER_INSURANCE_CARGO_SCOPE','MX_YARD_MONITORING_ELD_ACCESSORIES_AND_OTHER_FIXED_COSTS']}
}
