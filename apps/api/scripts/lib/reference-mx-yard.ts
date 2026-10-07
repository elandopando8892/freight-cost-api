import {z} from 'zod'
import {allocateFixedCost} from '../../src/modules/engine/fixed-cost-allocation.js'
const p=z.number().finite().positive().max(1e9),text=z.string().min(1),cycle=z.enum(['NETWORK_EXPECTED_EMPTY_PROXY','DEDICATED_EMPTY_SAME_BOX_RETURN'])
const policySchema=z.object({model:z.literal('FCM_MX_RESERVED_YARD_REFERENCE_V1'),reviewedAt:z.string().datetime(),scope:z.literal('ONE_RESERVED_MX_TRACTOR_SPACE_NOT_BOX_HANDOFF_OR_THIRD_DRAYAGE'),
 pricing:z.object({publishedPatioDailyMxn:z.literal(250),conflictingSpecialDailyMxn:z.literal(150),periodHours:z.literal(24),fractionChargedAsFullPeriod:z.literal(true),sourceTaxes:z.literal('UNSPECIFIED'),selectedTaxScenario:z.literal('NET_PLUS_16_PERCENT_RESERVE_NOT_VERIFIED_INVOICE'),vatRateHypothesis:z.literal(.16),sourceEffectiveDate:z.null(),contractedMonthlyPriceMxn:z.null()}).strict(),
 quantity:z.object({reservedTractorSpaces:z.literal(1),reservedMxTrailerSpaces:z.literal(0),annualReservedDaysHypothesis:z.literal(365),monthsPerYear:z.literal(12),monthlyProductiveDays:z.literal(24),basis:z.literal('CONTINUOUS_CAPACITY_RESERVATION_AT_DAILY_PUBLIC_PRICE_NOT_ACTUAL_DWELL_OR_MONTHLY_DISCOUNT')}).strict(),
 source:z.object({id:z.literal('SIMACO_PRIMARY_PATIO'),url:z.literal('https://pensionsimaco.com/'),locator:text,archive:z.object({file:z.literal('docs/research/sources/SIMACO_YARD_20261002.html'),sha256:z.literal('e40e013a5e03d577266986845183ae7ae305abd0abce3883d49e7f4729e8b009')}).strict()}).strict(),reusedSourceRefs:z.array(text).length(4),assumptions:z.array(text).min(9),completeCfuUsd:z.null(),completeCvuUsd:z.null(),completeD2DCostUsd:z.null(),quoteReady:z.literal(false),adoptedValues:z.literal(0)}).strict()
const cost=z.object({baseCostId:text,cashComparisonId:text,cycleScenarioId:cycle,paymentMode:z.enum(['CASH','FINANCED']),knownCvuComponentUsd:p,operatingFluidsAddedOnce:z.literal(true),alternatives:z.array(z.object({premiumAlternativeId:text,knownCfuComponentUsd:p,totalKnownComponentsUsd:p,completeD2DCostUsd:z.null(),quoteReady:z.literal(false)}).passthrough()).length(2)}).passthrough()
const baseSchema=z.object({model:z.literal('FCM_OPERATING_FLUID_REFERENCE_V1'),cash:z.array(cost).length(8),financed:z.array(cost).length(128)}).passthrough()
const companySchema=z.object({model:z.literal('FCM_COMPANY_SERVICES_CFU_V1'),monthlyLines:z.array(z.object({id:text,resourceId:z.enum(['MX_TRACTOR','US_TRACTOR','SHARED_TRAILER']),monthlyUsd:p}).passthrough()),cycleAllocations:z.array(z.object({cycleScenarioId:cycle,resources:z.array(z.object({resourceId:z.enum(['MX_TRACTOR','US_TRACTOR','SHARED_TRAILER']),timeExposure:p,distanceExposure:p}).passthrough()).length(3)}).passthrough()).length(2)}).passthrough()
const dutySchema=z.object({model:z.literal('FCM_MX_ORDINARY_DUTY_PILOT_CONTRAST_V1'),scenarios:z.array(z.object({id:cycle,knownMxElapsedClockDays:p,conditionalFixedAllocations:z.array(z.object({monthlyComponentScenarioId:text,resources:z.array(z.object({resourceId:z.enum(['MX_TRACTOR','US_TRACTOR','SHARED_TRAILER']),knownMonthlyComponentUsd:p,oldDistanceProxyByKmUsd:p}).passthrough()).length(3)}).passthrough()).length(2)}).passthrough()).length(2)}).passthrough()
const fxSchema=z.object({model:z.literal('FCM_DATED_FIX_VALUATION_REFERENCE_V1'),mxnPerUsd:z.literal(18.3688),observationDate:z.literal('2026-10-01')}).passthrough()
const unique=(ids:string[],error:string)=>{if(new Set(ids).size!==ids.length)throw new Error(error)}
const close=(a:number,b:number)=>Math.abs(a-b)<1e-7

/** Daily public tariff times continuous reserved capacity is a design hypothesis,
 * not a monthly quote or actual trip dwell. A single MX tractor, no second box. */
export function calculateMxReservedYard(rawPolicy:unknown,rawBase:unknown,rawCompany:unknown,rawDuty:unknown,rawFx:unknown){
 if(typeof rawBase==='object'&&rawBase!==null&&'mxReservedYardAddedOnce' in rawBase&&rawBase.mxReservedYardAddedOnce===true)throw new Error('MX_YARD_ALREADY_APPLIED')
 const policy=policySchema.parse(rawPolicy),base=baseSchema.parse(rawBase),company=companySchema.parse(rawCompany),duty=dutySchema.parse(rawDuty),fx=fxSchema.parse(rawFx)
 unique(company.monthlyLines.map(l=>l.id),'MX_YARD_BASE_LINE_DUPLICATE')
 if(company.monthlyLines.some(l=>l.resourceId==='MX_TRACTOR'&&/YARD|PARKING|PENSION/.test(l.id)))throw new Error('MX_YARD_ALREADY_IN_BASE')
 unique(company.cycleAllocations.map(c=>c.cycleScenarioId),'MX_YARD_CYCLE_DUPLICATE');unique(duty.scenarios.map(c=>c.id),'MX_YARD_DUTY_DUPLICATE')
 const grossMonthlyMxn=policy.pricing.publishedPatioDailyMxn*policy.quantity.annualReservedDaysHypothesis/policy.quantity.monthsPerYear
 const taxScenarios=[{id:'NET_PLUS_VAT_RESERVE' as const,grossMonthlyMxn:grossMonthlyMxn*(1+policy.pricing.vatRateHypothesis)},{id:'PRICE_ALREADY_GROSS_SENSITIVITY' as const,grossMonthlyMxn}].map(t=>({...t,monthlyUsd:t.grossMonthlyMxn/fx.mxnPerUsd}))
 const cycleAllocations=company.cycleAllocations.map(c=>{
  unique(c.resources.map(r=>r.resourceId),'MX_YARD_RESOURCE_DUPLICATE')
  const mx=c.resources.find(r=>r.resourceId==='MX_TRACTOR')!,d=duty.scenarios.find(d=>d.id===c.cycleScenarioId)!
  if(d.knownMxElapsedClockDays>24||mx.timeExposure>1||mx.distanceExposure>1||!close(mx.timeExposure,d.knownMxElapsedClockDays/24))throw new Error('MX_YARD_EXPOSURE_MISMATCH')
  unique(d.conditionalFixedAllocations.map(a=>a.monthlyComponentScenarioId),'MX_YARD_DUTY_ALLOCATION_DUPLICATE')
  for(const allocation of d.conditionalFixedAllocations){
   unique(allocation.resources.map(r=>r.resourceId),'MX_YARD_DUTY_RESOURCE_DUPLICATE')
   const source=allocation.resources.find(r=>r.resourceId==='MX_TRACTOR')!
   if(!close(mx.distanceExposure,source.oldDistanceProxyByKmUsd/source.knownMonthlyComponentUsd))throw new Error('MX_YARD_DISTANCE_EXPOSURE_MISMATCH')
  }
  return {cycleScenarioId:c.cycleScenarioId,resourceId:'MX_TRACTOR' as const,timeExposure:mx.timeExposure,distanceExposure:mx.distanceExposure,
   taxScenarios:taxScenarios.map(t=>({...t,fixedAdditionUsd:allocateFixedCost(t.monthlyUsd*mx.distanceExposure,t.monthlyUsd*mx.timeExposure)}))}
 })
 unique([...base.cash,...base.financed].map(c=>c.baseCostId),'MX_YARD_COST_DUPLICATE')
 const join=(c:z.infer<typeof cost>,payment:'CASH'|'FINANCED')=>{
  if(c.mxReservedYardAddedOnce===true)throw new Error('MX_YARD_ALREADY_APPLIED')
  const cash=base.cash.find(b=>b.baseCostId===c.cashComparisonId),a=cycleAllocations.find(a=>a.cycleScenarioId===c.cycleScenarioId)!
  if(c.paymentMode!==payment||!cash||cash.cycleScenarioId!==c.cycleScenarioId||!close(cash.knownCvuComponentUsd,c.knownCvuComponentUsd)||(payment==='CASH'&&c.cashComparisonId!==c.baseCostId))throw new Error('MX_YARD_COST_JOIN_MISMATCH')
  unique(c.alternatives.map(a=>a.premiumAlternativeId),'MX_YARD_ALTERNATIVE_DUPLICATE')
  for(const prev of c.alternatives)if(!close(prev.totalKnownComponentsUsd,prev.knownCfuComponentUsd+c.knownCvuComponentUsd))throw new Error('MX_YARD_COST_SUM_MISMATCH')
  const taxSensitivity=a.taxScenarios.map(t=>({...t,alternatives:c.alternatives.map(prev=>({premiumAlternativeId:prev.premiumAlternativeId,knownCfuComponentUsd:prev.knownCfuComponentUsd+t.fixedAdditionUsd,totalKnownComponentsUsd:prev.totalKnownComponentsUsd+t.fixedAdditionUsd}))}))
  const addition=a.taxScenarios[0].fixedAdditionUsd
  return {...c,priorAlternatives:c.alternatives,mxYardFixedAdditionUsd:addition,taxSensitivity,
   alternatives:c.alternatives.map(prev=>({...prev,priorKnownCfuComponentUsd:prev.knownCfuComponentUsd,priorTotalKnownComponentsUsd:prev.totalKnownComponentsUsd,knownCfuComponentUsd:prev.knownCfuComponentUsd+addition,totalKnownComponentsUsd:prev.totalKnownComponentsUsd+addition})),
   mxReservedYardAddedOnce:true,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null}
 }
 return {...policy,sourceRef:'mxReservedYard',taxScenarios,cycleAllocations,cash:base.cash.map(c=>join(c,'CASH')),financed:base.financed.map(c=>join(c,'FINANCED')),mxReservedYardAddedOnce:true,
  cvusChanged:false,cfusChanged:true,actualSiteSelected:false,monthlyContractObserved:false,taxesVerified:false,externalWrites:false,
  remaining:['GATE_YARD_BOBTAIL_DISTANCE_WEAR_AND_CLOCK','MATCHED_TRUCK_ITINERARY_TOLLS','COMMERCIAL_BORDER_INSURANCE_CARGO_SCOPE','ACTUAL_TAX_FEES_ELD_ACCESSORIES_AND_OTHER_FIXED_COSTS']}
}
