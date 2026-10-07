import {z} from 'zod'
import {allocateFixedCost} from '../../src/modules/engine/fixed-cost-allocation.js'

const text=z.string().min(1),n=z.number().finite().nonnegative().max(1e12),p=n.positive()
const resource=z.enum(['MX_TRACTOR','US_TRACTOR','SHARED_TRAILER'])
const cycle=z.enum(['NETWORK_EXPECTED_EMPTY_PROXY','DEDICATED_EMPTY_SAME_BOX_RETURN'])
const policySchema=z.object({model:z.literal('FCM_DRIVER_CONNECTIVITY_COMPONENT_V1'),reviewedAt:z.string().datetime(),referencePeriod:z.literal('2026-10'),
 quantityBasis:z.literal('ONE_MX_DRIVER_LINE_ONE_US_DRIVER_LINE_ONE_SERVICE_PER_NATIONAL_TRACTOR'),
 mxPhone:z.object({sourceId:z.literal('TELCEL_SL300_CATALOG'),packageMxn:z.literal(300),validityDays:z.literal(30),annualReferenceDays:z.literal(365),monthsPerYear:z.literal(12),lines:z.literal(1),dataGb:z.literal(5.5),pricingBasis:z.literal('PUBLISHED_RECHARGE_NO_TAX_CREDIT_DEDUCTED')}).strict(),
 usPhone:z.object({sourceId:z.literal('CRICKET_SMART_BROADBAND_FACTS'),monthlyUsd:z.literal(50),lines:z.literal(1),autopayDiscountApplied:z.literal(false),providerMonthlyFeesAndGovernmentTaxIncluded:z.literal(true)}).strict(),
 mxAlertService:z.object({sourceId:z.literal('SPRING_STANDARD_PRICE'),monthlyNetMxn:z.literal(199),monthlyGrossMxn:z.literal(230.84),vatRate:z.literal(0.16),units:z.literal(1),scope:z.literal('STANDARD_MX_LOCATION_ALERTS_PANIC_AND_INCIDENT_FOLLOWUP_NOT_CONTINUOUS_FREIGHT_ESCORT'),hardwareInstallationMxn:z.null()}).strict(),
 usEld:z.object({sourceId:z.literal('MATRACK_PREMIUM_MONTHLY'),monthlyUsd:z.literal(24.95),units:z.literal(1),scope:z.literal('HOS_IFTA_GPS_AND_TECHNICAL_SUPPORT_NOT_HUMAN_SECURITY_MONITORING'),separateGpsAdded:z.literal(false),hardwareInstallationAndTaxUsd:z.null()}).strict(),
 valuation:z.object({fxRef:z.literal('datedFx'),observationDate:z.literal('2026-10-01'),mxnPerUsd:z.literal(18.3688),mxPricingBasis:z.literal('PUBLISHED_RECHARGE_AND_GROSS_ALERT_SERVICE_NO_INPUT_VAT_CREDIT_ASSUMED'),sameServiceTaxPolicyAcrossAssetTaxAlternatives:z.literal(true)}).strict(),
 sources:z.array(z.object({id:text,url:z.string().url(),locator:text,capture:z.enum(['ORIGINAL_HTTP_HTML','PRIMARY_WEB_READER_HTTP_403_NOT_ARCHIVED']),
  archive:z.object({file:z.string().startsWith('docs/research/sources/'),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict().nullable()}).strict()).length(7),
 assumptions:z.array(text).min(9),completeConnectivityMonthlyUsd:z.null(),completeD2DCostUsd:z.null(),quoteReady:z.literal(false),adoptedValues:z.literal(0)}).strict()
const costSchema=z.object({baseCostId:text,cashComparisonId:text,cycleScenarioId:cycle,paymentMode:z.enum(['CASH','FINANCED']),knownCvuComponentUsd:p,
 companyFixedTripComponentUsd:p,companyServicesAddedOnce:z.literal(true),
 alternatives:z.array(z.object({premiumAlternativeId:text,knownCfuComponentUsd:p,totalKnownComponentsUsd:p,completeD2DCostUsd:z.null(),quoteReady:z.literal(false)}).passthrough()).length(2)}).passthrough()
const companySchema=z.object({model:z.literal('FCM_COMPANY_SERVICES_CFU_V1'),companyServicesAddedOnce:z.literal(true),cvusChanged:z.literal(false),
 monthlyLines:z.array(z.object({id:text,resourceId:resource,monthlyUsd:n}).strict()).length(6),
 cycleAllocations:z.array(z.object({cycleScenarioId:cycle,fixedTripComponentUsd:p,resources:z.array(z.object({resourceId:resource,monthlyUsd:p,timeExposure:p,distanceExposure:p,amountUsd:p}).strict()).length(3)}).strict()).length(2),
 cash:z.array(costSchema).length(8),financed:z.array(costSchema).length(128)}).passthrough()
const fxSchema=z.object({model:z.literal('FCM_DATED_FIX_VALUATION_REFERENCE_V1'),observationDate:text,column:z.literal('FIX_DETERMINATION'),mxnPerUsd:p,use:z.literal('DATED_RESEARCH_VALUATION_NOT_PAYMENT_OR_FORECAST')}).passthrough()
const close=(a:number,b:number)=>Math.abs(a-b)<1e-7
const unique=(ids:string[],code:string)=>{if(new Set(ids).size!==ids.length)throw new Error(code)}

/** Four recurring service components. Device ownership, alert staffing and a
 * compatible freight-security SLA are deliberately separate unknown costs. */
export function calculateDriverConnectivity(rawPolicy:unknown,rawCompany:unknown,rawFx:unknown){
 const policy=policySchema.parse(rawPolicy),company=companySchema.parse(rawCompany),fx=fxSchema.parse(rawFx)
 if(company.driverConnectivityAddedOnce===true)throw new Error('DRIVER_CONNECTIVITY_ALREADY_APPLIED')
 if(fx.observationDate!==policy.valuation.observationDate||fx.mxnPerUsd!==policy.valuation.mxnPerUsd)throw new Error('DRIVER_CONNECTIVITY_FX_MISMATCH')
 const expected=['TELCEL_SL300_CATALOG','TELCEL_PREPAID_SCOPE','CRICKET_SMART_BROADBAND_FACTS','SPRING_STANDARD_PRICE','SPRING_STANDARD_SCOPE','MATRACK_PREMIUM_MONTHLY','MATRACK_PRODUCT_LIMITS']
 if(expected.some(id=>policy.sources.filter(s=>s.id===id).length!==1)||policy.sources.some(s=>(s.archive===null)!==(s.capture==='PRIMARY_WEB_READER_HTTP_403_NOT_ARCHIVED')||(s.archive===null&&s.id!=='TELCEL_PREPAID_SCOPE')))throw new Error('DRIVER_CONNECTIVITY_SOURCE_SET_MISMATCH')
 unique(company.monthlyLines.map(l=>l.id),'DRIVER_CONNECTIVITY_BASE_DUPLICATE')
 if(company.monthlyLines.some(l=>/DRIVER_PHONE|STANDARD_ALERT|ELD_PREMIUM/.test(l.id)))throw new Error('DRIVER_CONNECTIVITY_ALREADY_IN_BASE')
 const phoneMxn=policy.mxPhone.packageMxn*policy.mxPhone.annualReferenceDays/policy.mxPhone.validityDays/policy.mxPhone.monthsPerYear
 if(!close(policy.mxAlertService.monthlyNetMxn*(1+policy.mxAlertService.vatRate),policy.mxAlertService.monthlyGrossMxn))throw new Error('DRIVER_CONNECTIVITY_TAX_MISMATCH')
 const monthlyLines=[
  {id:'MX_DRIVER_PHONE',resourceId:'MX_TRACTOR' as const,currency:'MXN' as const,monthlyLocal:phoneMxn,sourceId:policy.mxPhone.sourceId},
  {id:'US_DRIVER_PHONE',resourceId:'US_TRACTOR' as const,currency:'USD' as const,monthlyLocal:policy.usPhone.monthlyUsd,sourceId:policy.usPhone.sourceId},
  {id:'MX_STANDARD_ALERT_SERVICE',resourceId:'MX_TRACTOR' as const,currency:'MXN' as const,monthlyLocal:policy.mxAlertService.monthlyGrossMxn,sourceId:policy.mxAlertService.sourceId},
  {id:'US_ELD_PREMIUM',resourceId:'US_TRACTOR' as const,currency:'USD' as const,monthlyLocal:policy.usEld.monthlyUsd,sourceId:policy.usEld.sourceId}
 ].map(l=>({...l,monthlyUsd:l.currency==='MXN'?l.monthlyLocal/fx.mxnPerUsd:l.monthlyLocal,kind:'FIXED_SUBSCRIPTION_COMPONENT' as const}))
 const monthlyByResource=Object.fromEntries(resource.options.map(id=>[id,monthlyLines.filter(l=>l.resourceId===id).reduce((s,l)=>s+l.monthlyUsd,0)])) as Record<z.infer<typeof resource>,number>
 unique(company.cycleAllocations.map(c=>c.cycleScenarioId),'DRIVER_CONNECTIVITY_CYCLE_DUPLICATE')
 const cycleAllocations=company.cycleAllocations.map(c=>{
  unique(c.resources.map(r=>r.resourceId),'DRIVER_CONNECTIVITY_RESOURCE_DUPLICATE')
  if(!close(c.fixedTripComponentUsd,c.resources.reduce((s,r)=>s+r.amountUsd,0)))throw new Error('DRIVER_CONNECTIVITY_COMPANY_SUM_MISMATCH')
  const resources=c.resources.map(r=>{
   if(!close(r.monthlyUsd,company.monthlyLines.filter(l=>l.resourceId===r.resourceId).reduce((s,l)=>s+l.monthlyUsd,0))||!close(r.amountUsd,allocateFixedCost(r.monthlyUsd*r.distanceExposure,r.monthlyUsd*r.timeExposure)))throw new Error('DRIVER_CONNECTIVITY_EXPOSURE_MISMATCH')
   const lines=monthlyLines.filter(l=>l.resourceId===r.resourceId).map(l=>({...l,amountUsd:allocateFixedCost(l.monthlyUsd*r.distanceExposure,l.monthlyUsd*r.timeExposure)}))
   return {resourceId:r.resourceId,timeExposure:r.timeExposure,distanceExposure:r.distanceExposure,monthlyUsd:monthlyByResource[r.resourceId],lines,amountUsd:lines.reduce((s,l)=>s+l.amountUsd,0)}
  })
  return {cycleScenarioId:c.cycleScenarioId,resources,fixedTripComponentUsd:resources.reduce((s,r)=>s+r.amountUsd,0)}
 })
 unique([...company.cash,...company.financed].map(c=>c.baseCostId),'DRIVER_CONNECTIVITY_COST_DUPLICATE')
 const join=(c:z.infer<typeof costSchema>,payment:'CASH'|'FINANCED')=>{
  if(c.driverConnectivityAddedOnce===true)throw new Error('DRIVER_CONNECTIVITY_ALREADY_APPLIED')
  const cash=company.cash.find(s=>s.baseCostId===c.cashComparisonId),old=company.cycleAllocations.find(s=>s.cycleScenarioId===c.cycleScenarioId)!,a=cycleAllocations.find(s=>s.cycleScenarioId===c.cycleScenarioId)!
  if(c.paymentMode!==payment||!cash||cash.cycleScenarioId!==c.cycleScenarioId||!close(cash.knownCvuComponentUsd,c.knownCvuComponentUsd)||!close(c.companyFixedTripComponentUsd,old.fixedTripComponentUsd)||(payment==='CASH'&&c.cashComparisonId!==c.baseCostId))throw new Error('DRIVER_CONNECTIVITY_COST_JOIN_MISMATCH')
  unique(c.alternatives.map(a=>a.premiumAlternativeId),'DRIVER_CONNECTIVITY_ALTERNATIVE_DUPLICATE')
  return {...c,priorAlternatives:c.alternatives,driverConnectivityFixedComponents:a.resources,driverConnectivityFixedTripComponentUsd:a.fixedTripComponentUsd,
   alternatives:c.alternatives.map(prior=>{
    if(!close(prior.totalKnownComponentsUsd,prior.knownCfuComponentUsd+c.knownCvuComponentUsd))throw new Error('DRIVER_CONNECTIVITY_COST_SUM_MISMATCH')
    return {...prior,priorKnownCfuComponentUsd:prior.knownCfuComponentUsd,priorTotalKnownComponentsUsd:prior.totalKnownComponentsUsd,
     knownCfuComponentUsd:prior.knownCfuComponentUsd+a.fixedTripComponentUsd,totalKnownComponentsUsd:prior.totalKnownComponentsUsd+a.fixedTripComponentUsd}
   }),driverConnectivityAddedOnce:true,cvusChanged:false,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null}
 }
 return {...policy,sourceRef:'driverConnectivity',monthlyLines,monthlyByResource,knownMonthlyComponentUsd:monthlyLines.reduce((s,l)=>s+l.monthlyUsd,0),
  prepaidNormalization:{monthlyAverageMxn:phoneMxn,annualConsumedExpenseMxn:phoneMxn*12,wholePackagesForFirstYearFromZero:Math.ceil(365/30),firstYearCashMxn:Math.ceil(365/30)*300,residualEntitlementDays:Math.ceil(365/30)*30-365,firstYearCashAddedToExpense:false},
  cycleAllocations,cash:company.cash.map(c=>join(c,'CASH')),financed:company.financed.map(c=>join(c,'FINANCED')),
  driverConnectivityAddedOnce:true,adminOrPayrollOrTmsAddedAgain:false,separateUsGpsAdded:false,boxServiceCoverageProven:false,
  fullContinuousHumanCoverageProven:false,currentEldRegistrationVerified:false,hardwareOrInstallationAssumedFree:false,
  completeConnectivityMonthlyUsd:null,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,cvusChanged:false,externalWrites:false,
  remaining:['PHONE_SIM_HARDWARE_AND_SETUP','MX_GPS_HARDWARE_INSTALLATION_AND_FREIGHT_SCOPE','US_ELD_HARDWARE_INSTALLATION_AND_TAX',
   'DETACHED_BOX_SECURITY_AND_BINATIONAL_CONTINUOUS_COVERAGE','OTHER_COMPANY_AND_PILOT_COMPONENTS']}
}
