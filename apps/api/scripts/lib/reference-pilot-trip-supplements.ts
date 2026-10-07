import {z} from 'zod'
import {allocateFixedCost} from '../../src/modules/engine/fixed-cost-allocation.js'

const text=z.string().min(1),p=z.number().finite().positive().max(1e12)
const cycle=z.enum(['NETWORK_EXPECTED_EMPTY_PROXY','DEDICATED_EMPTY_SAME_BOX_RETURN'])
const resource=z.enum(['MX_TRACTOR','US_TRACTOR','SHARED_TRAILER'])
const policySchema=z.object({model:z.literal('FCM_PILOT_TRIP_SUPPLEMENTS_V1'),reviewedAt:z.string().datetime(),referencePeriod:z.literal('2026-10'),
 equipment:z.object({mxDriverHandsets:z.literal(1),usDriverHandsets:z.literal(1),adminHandsets:z.literal(2),mxPublishedHandsetMxn:z.literal(3499),
  mxPriceBasis:z.literal('PUBLISHED_CHECKOUT_PRICE_NO_VAT_ADDED_AGAIN'),usPublishedHandsetUsd:z.literal(179.99),usPriceBasis:z.literal('MANUFACTURER_UNLOCKED_LAUNCH_MSRP_NOT_CURRENT_CHECKOUT'),
  usChargerCableBundleListUsd:z.literal(25.98),usSalesTaxRate:z.literal(.0825),usPurchaseJurisdiction:z.literal('LAREDO_CITY_REFERENCE_NOT_ACTUAL_DELIVERY_ADDRESS'),planningHoldingMonths:z.literal(24),
  residualValueUsd:z.literal(0),financing:z.literal('CASH_EQUIPMENT_IN_ALL_TRACTOR_FINANCE_ALTERNATIVES'),adminAllocation:z.literal('ONE_SHARED_POOL_EQUAL_TRACTORS'),
  usDriverActivation:z.object({channel:z.literal('ONLINE_REFERENCE'),publishedActivationUsd:z.literal(0),storeAlternativeUsd:z.literal(25)}).strict(),mxAccessoriesIncluded:z.literal(true),extraSubscriptionAdded:z.literal(false)}).strict(),
 mxFood:z.object({publishedMxnPerDay:z.literal(300),sourceWeeklyMxn:z.literal(2100),rateBasis:z.literal('PUBLIC_RECRUITER_POSTED_DRYVAN_LONG_DISTANCE_ALLOWANCE_TRANSFER'),
  quantityBasis:z.literal('ONE_OCCUPIED_MX_DRIVER_POSITION_EACH_STARTED_CALENDAR_DAY_OF_CYCLE'),startLocalHour:z.literal(6),releasedAwayIntervalsIncluded:z.literal(true),
  weeklyAllowanceAddedAgain:z.literal(false),usPerDiemAddedAgain:z.literal(false),taxCreditAssumed:z.literal(false),payrollTaxClassificationResolved:z.literal(false)}).strict(),
 valuation:z.object({observationDate:z.literal('2026-10-01'),mxnPerUsd:z.literal(18.3688)}).strict(),
 sources:z.array(z.object({id:text,url:z.string().url(),capture:z.enum(['ORIGINAL_HTTP_HTML','PRIMARY_WEB_READER_HTTP_403_NOT_ARCHIVED','PRIMARY_WEB_READER_HTTP_401_NOT_ARCHIVED']),
  archive:z.object({file:z.string().startsWith('docs/research/sources/'),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict().nullable(),locator:text}).strict()).length(6),
 assumptions:z.array(text).min(8),completeCfuUsd:z.null(),completeCvuUsd:z.null(),completeD2DCostUsd:z.null(),quoteReady:z.literal(false),adoptedValues:z.literal(0)}).strict()
const costSchema=z.object({baseCostId:text,cashComparisonId:text,cycleScenarioId:cycle,paymentMode:z.enum(['CASH','FINANCED']),knownCvuComponentUsd:p,boxVisibilityAddedOnce:z.literal(true),
 alternatives:z.array(z.object({premiumAlternativeId:text,knownCfuComponentUsd:p,totalKnownComponentsUsd:p,completeD2DCostUsd:z.null(),quoteReady:z.literal(false)}).passthrough()).length(2)}).passthrough()
const baseSchema=z.object({model:z.literal('FCM_SHARED_BOX_VISIBILITY_V1'),boxVisibilityAddedOnce:z.literal(true),cash:z.array(costSchema).length(8),financed:z.array(costSchema).length(128)}).passthrough()
const companySchema=z.object({model:z.literal('FCM_COMPANY_SERVICES_CFU_V1'),namedControls:z.literal(2),
 cycleAllocations:z.array(z.object({cycleScenarioId:cycle,resources:z.array(z.object({resourceId:resource,timeExposure:p,distanceExposure:p}).passthrough()).length(3)}).passthrough()).length(2)}).passthrough()
const dutySchema=z.object({model:z.literal('FCM_MX_ORDINARY_DUTY_PILOT_CONTRAST_V1'),shiftStartLocalHour:z.literal(6),
 scenarios:z.array(z.object({id:cycle,knownMxElapsedClockDays:p}).passthrough()).length(2)}).passthrough()
const driverSchema=z.object({usSource:z.object({travelExpenseReview:z.object({benefitsDefinition:z.literal('INCLUDES_REPORTED_PER_DIEM_WHEN_PROVIDED_UNSPLIT'),perDiemRateSeparatelyIdentified:z.literal(false)}).passthrough()}).passthrough()}).passthrough()
const fxSchema=z.object({model:z.literal('FCM_DATED_FIX_VALUATION_REFERENCE_V1'),observationDate:text,mxnPerUsd:p,use:z.literal('DATED_RESEARCH_VALUATION_NOT_PAYMENT_OR_FORECAST')}).passthrough()
const unique=(ids:string[],code:string)=>{if(new Set(ids).size!==ids.length)throw new Error(code)}
const close=(a:number,b:number)=>Math.abs(a-b)<1e-7

export function countStartedCalendarDays(elapsedDays:number,startLocalHour:number){
 if(!Number.isFinite(elapsedDays)||elapsedDays<=0||elapsedDays>365||!Number.isFinite(startLocalHour)||startLocalHour<0||startLocalHour>=24)throw new Error('TRIP_SUPPLEMENT_CALENDAR_RANGE')
 // End at midnight does not occupy the next calendar day. Epsilon protects
 // floating reconstruction of a known exact boundary, not whole-hour rounding.
 return Math.ceil(elapsedDays+startLocalHour/24-1e-10)
}

/** Reserved equipment joins CFU through physical resource exposure. Food joins
 * CVU through driver-away calendar days, never the capital MAX denominator. */
export function calculatePilotTripSupplements(rawPolicy:unknown,rawBase:unknown,rawCompany:unknown,rawDuty:unknown,rawDriver:unknown,rawFx:unknown){
 if(typeof rawBase==='object'&&rawBase!==null&&'tripSupplementsAddedOnce' in rawBase&&rawBase.tripSupplementsAddedOnce===true)throw new Error('TRIP_SUPPLEMENTS_ALREADY_APPLIED')
 const policy=policySchema.parse(rawPolicy),base=baseSchema.parse(rawBase),company=companySchema.parse(rawCompany),duty=dutySchema.parse(rawDuty),fx=fxSchema.parse(rawFx)
 driverSchema.parse(rawDriver)
 if(fx.observationDate!==policy.valuation.observationDate||fx.mxnPerUsd!==policy.valuation.mxnPerUsd)throw new Error('TRIP_SUPPLEMENT_FX_MISMATCH')
 const sourceIds=['MOTOROLA_MX_G06_PRICE','MOTOROLA_US_GPLAY_MSRP','ANKER_US_CHARGER_CABLE','TEXAS_LAREDO_DEVICE_TAX','CRICKET_ONLINE_ACTIVATION','TIVUS_MX_DRYVAN_FOOD']
 if(sourceIds.some(id=>policy.sources.filter(s=>s.id===id).length!==1)||policy.sources.some(s=>(s.archive===null)!==(s.capture!=='ORIGINAL_HTTP_HTML')||(s.archive===null&&!['MOTOROLA_US_GPLAY_MSRP','TIVUS_MX_DRYVAN_FOOD'].includes(s.id))))throw new Error('TRIP_SUPPLEMENT_SOURCE_SET_MISMATCH')
 unique(company.cycleAllocations.map(c=>c.cycleScenarioId),'TRIP_SUPPLEMENT_CYCLE_DUPLICATE');unique(duty.scenarios.map(c=>c.id),'TRIP_SUPPLEMENT_DUTY_DUPLICATE')
 const e=policy.equipment,usUnitCashUsd=(e.usPublishedHandsetUsd+e.usChargerCableBundleListUsd)*(1+e.usSalesTaxRate)
 const mxUnitCashUsd=e.mxPublishedHandsetMxn/fx.mxnPerUsd,sharedAdminMonthlyUsd=e.adminHandsets*usUnitCashUsd/e.planningHoldingMonths
 const monthlyLines=[{id:'MX_DRIVER_HANDSET',resourceId:'MX_TRACTOR' as const,monthlyUsd:mxUnitCashUsd/e.planningHoldingMonths},
  {id:'US_DRIVER_HANDSET_AND_CHARGER',resourceId:'US_TRACTOR' as const,monthlyUsd:usUnitCashUsd/e.planningHoldingMonths},
  {id:'ADMIN_HANDSETS_MX_ALLOCATED_SHARE',resourceId:'MX_TRACTOR' as const,monthlyUsd:sharedAdminMonthlyUsd/2},
  {id:'ADMIN_HANDSETS_US_ALLOCATED_SHARE',resourceId:'US_TRACTOR' as const,monthlyUsd:sharedAdminMonthlyUsd/2}]
 const cycleAllocations=company.cycleAllocations.map(c=>{
  unique(c.resources.map(r=>r.resourceId),'TRIP_SUPPLEMENT_RESOURCE_DUPLICATE')
  if(c.resources.some(r=>r.timeExposure>1||r.distanceExposure>1))throw new Error('TRIP_SUPPLEMENT_EXPOSURE_RANGE')
  const lines=monthlyLines.map(l=>{const r=c.resources.find(r=>r.resourceId===l.resourceId)!;return {...l,amountUsd:allocateFixedCost(l.monthlyUsd*r.distanceExposure,l.monthlyUsd*r.timeExposure)}})
  const mxDays=duty.scenarios.find(s=>s.id===c.cycleScenarioId)!.knownMxElapsedClockDays
  const occupiedCalendarDays=countStartedCalendarDays(mxDays,policy.mxFood.startLocalHour)
  const foodMxn=occupiedCalendarDays*policy.mxFood.publishedMxnPerDay
  return {cycleScenarioId:c.cycleScenarioId,lines,fixedTripComponentUsd:lines.reduce((s,l)=>s+l.amountUsd,0),
   mxFood:{elapsedMxCycleDays:mxDays,occupiedCalendarDays,onePositionAtATime:true,amountMxn:foodMxn,amountUsd:foodMxn/fx.mxnPerUsd,usExtraPerDiemUsd:null,usExtraPerDiemTreatment:'ALREADY_INCLUDED_UNSPLIT_NOT_ZERO_COST'}}
 })
 unique([...base.cash,...base.financed].map(c=>c.baseCostId),'TRIP_SUPPLEMENT_COST_DUPLICATE')
 const join=(c:z.infer<typeof costSchema>,payment:'CASH'|'FINANCED')=>{
  if(c.tripSupplementsAddedOnce===true)throw new Error('TRIP_SUPPLEMENTS_ALREADY_APPLIED')
  const cash=base.cash.find(x=>x.baseCostId===c.cashComparisonId),a=cycleAllocations.find(x=>x.cycleScenarioId===c.cycleScenarioId)!
  if(c.paymentMode!==payment||!cash||cash.cycleScenarioId!==c.cycleScenarioId||!close(cash.knownCvuComponentUsd,c.knownCvuComponentUsd)||(payment==='CASH'&&c.cashComparisonId!==c.baseCostId))throw new Error('TRIP_SUPPLEMENT_COST_JOIN_MISMATCH')
  unique(c.alternatives.map(a=>a.premiumAlternativeId),'TRIP_SUPPLEMENT_ALTERNATIVE_DUPLICATE')
  return {...c,priorKnownCvuComponentUsd:c.knownCvuComponentUsd,knownCvuComponentUsd:c.knownCvuComponentUsd+a.mxFood.amountUsd,
   priorAlternatives:c.alternatives,equipmentFixedTripComponentUsd:a.fixedTripComponentUsd,mxFoodTripComponentUsd:a.mxFood.amountUsd,
   alternatives:c.alternatives.map(prior=>{
    if(!close(prior.totalKnownComponentsUsd,prior.knownCfuComponentUsd+c.knownCvuComponentUsd))throw new Error('TRIP_SUPPLEMENT_COST_SUM_MISMATCH')
    return {...prior,priorKnownCfuComponentUsd:prior.knownCfuComponentUsd,priorTotalKnownComponentsUsd:prior.totalKnownComponentsUsd,
     knownCfuComponentUsd:prior.knownCfuComponentUsd+a.fixedTripComponentUsd,totalKnownComponentsUsd:prior.totalKnownComponentsUsd+a.fixedTripComponentUsd+a.mxFood.amountUsd}
   }),tripSupplementsAddedOnce:true,cvusChanged:true,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null}
 }
 return {...policy,sourceRef:'tripSupplements',monthlyLines,equipmentKnownMonthlyUsd:monthlyLines.reduce((s,l)=>s+l.monthlyUsd,0),
  equipmentInitialCashUsd:mxUnitCashUsd+3*usUnitCashUsd,initialCashAddedAgain:false,cycleAllocations,
  cash:base.cash.map(c=>join(c,'CASH')),financed:base.financed.map(c=>join(c,'FINANCED')),tripSupplementsAddedOnce:true,
  usPerDiemAddedAgain:false,boxOrAdminPayrollAddedAgain:false,actualOperatorCompensationObserved:false,externalWrites:false,
  remaining:['MX_GPS_INSTALLATION_AND_MATCHED_MONITORING_PACKAGE','US_ELD_SHIPPING_INSTALL_AND_DEVICE_COMPATIBILITY','OTHER_DEVICE_SIM_VEHICLE_ACCESSORIES',
   'MX_YARD_AND_BORDER_APPROACH_KM_TIME','UNMATCHED_TOLL_AND_US_TRUCK_ITINERARY','IDLE_FUEL_DEF_MX_BOBTAIL_MAINTENANCE',
   'WAIT_PAY_AND_FOOD_PAYROLL_TREATMENT','COMMERCIAL_BORDER_RC_AND_CARGO_SCOPE','OTHER_FIXED_COMPANY_COMPLIANCE_AND_TAX_ITEMS']}
}
