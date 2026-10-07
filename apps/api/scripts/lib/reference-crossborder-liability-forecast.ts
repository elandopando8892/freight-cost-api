import {z} from 'zod'

const n=z.number().finite().nonnegative().max(1e9),p=n.positive(),text=z.string().min(1)
const cycle=z.enum(['NETWORK_EXPECTED_EMPTY_PROXY','DEDICATED_EMPTY_SAME_BOX_RETURN'])
export type CrossborderLiabilityBasis='UNPRICED'|'PUBLIC_US_PRIMARY_LIABILITY_PROXY'
const cohort=(id:string,period:z.ZodTypeAny,lo:number,hi:number,history:string,location:string,claim:string)=>z.object({
 id:z.literal(id),sourcePeriod:period,annualPremiumUsdEndpoints:z.tuple([z.literal(lo),z.literal(hi)]),operatorHistory:z.literal(history),location:z.literal(location),observationalClaim:z.literal(claim)
}).strict()
const policySchema=z.object({model:z.literal('FCM_MX_CROSSBORDER_PRIMARY_LIABILITY_TRANSFER_V1'),reviewedAt:z.string().datetime(),
 scope:z.literal('UNMATCHED_US_PRIMARY_LIABILITY_ANNUAL_POOL_TRANSFER_TO_ONE_MX_TRACTOR'),
 source:z.object({id:z.literal('FULL_COVERAGE_PRIMARY_LIABILITY_20260320'),url:z.literal('https://myfullcoverage.com/blog/primary-liability-insurance-for-truckers'),
  publicationDate:z.literal('2026-03-20'),locator:z.string().min(40),capture:z.literal('PRIMARY_WEB_READER_NOT_ARCHIVED'),
  premiumDenominator:z.literal('OWNER_OPERATOR_ANNUAL_PRIMARY_LIABILITY_NOT_EXPLICIT_PER_TRUCK'),sourceUnitCount:z.null(),sampleSize:z.null(),taxesFeesSeparatelyPublished:z.literal(false)}).strict(),
 cohorts:z.tuple([
  cohort('NEW_AUTHORITY_INDIANA_2025',z.literal('2025'),7500,12000,'NEW_AUTHORITY','INDIANA','BROKER_BOOK_OF_BUSINESS_RANGE_NO_SAMPLE_OR_JOINT_ASSET_MATCH'),
  cohort('EXPERIENCED_CLEAN_2PLUS_YEARS',z.null(),5000,9000,'CLEAN_RECORD_AND_2PLUS_YEARS','NOT_SEPARATELY_STATED','BROKER_TYPICAL_PRICE_STATEMENT_NOT_DATED_MATCHED_COHORT')]),
 target:z.object({resourceId:z.literal('MX_TRACTOR'),planningAnnualLiabilityPools:z.literal(1),coverage:z.literal('COMMERCIAL_PRIMARY_AUTO_LIABILITY_ONLY'),
  sourceForeignDomicileMatched:z.literal(false),sourceCommercialZoneMatched:z.literal(false),sourceUnitDenominatorMatched:z.literal(false),insuredLimitMatched:z.literal(false),
  operatorHistorySelected:z.literal(false),actualEligibilityVerified:z.literal(false),actualAnnualPremiumUsd:z.null()}).strict(),
 application:z.literal('ANNUAL_PREMIUM_TIMES_EXISTING_MX_MAX_RESOURCE_EXPOSURE_OVER12'),
 excluded:z.tuple([z.literal('PHYSICAL_DAMAGE'),z.literal('CARGO'),z.literal('SHARED_BOX'),z.literal('US_TRACTOR'),z.literal('TEMPORARY_PREMIUM'),z.literal('NON_TRUCKING_LIABILITY')]),
 otherReviewedSources:z.tuple([
  z.object({id:z.literal('QPI_FOREIGN_PROGRAM_SCOPE_NO_PRICE'),url:z.literal('https://www.qualitaspremier.com/Home/Products?lang=en'),capture:z.literal('PRIMARY_WEB_READER_NOT_ARCHIVED'),decision:z.literal('SCOPE_ONLY_NOT_A_PREMIUM')}).strict(),
  z.object({id:z.literal('PROGRESSIVE_PRIMARY_PAGE_COMBINED_PRICE'),url:z.literal('https://www.progressivecommercial.com/commercial-auto-insurance/primary-liability-insurance/'),capture:z.literal('PRIMARY_WEB_READER_NOT_ARCHIVED'),decision:z.literal('REJECT926MONTHLY_COMBINED_LIABILITY_PHYSICAL_DAMAGE_NOT_STANDALONE_LIABILITY')}).strict(),
  z.object({id:z.literal('STRONGTIE_INTERNAL_PRICE_CONFLICT'),url:z.literal('https://www.strongtieinsurance.com/company-driver-vs-owner-operator-who-is-responsible-for-what-coverage/'),capture:z.literal('PRIMARY_WEB_READER_NOT_ARCHIVED'),decision:z.literal('REJECT_UNRESOLVED_SCOPE_CONFLICT_8000TO16000_VS5000TO12000_ON_SAME_PAGE')}).strict()]),
 assumptions:z.array(z.string().min(30)).min(13),completeCfuUsd:z.null(),completeCvuUsd:z.null(),completeD2DCostUsd:z.null(),quoteReady:z.literal(false),adoptedValues:z.literal(0)
}).strict()
const alt=z.object({premiumAlternativeId:text,knownCfuComponentUsd:p,totalKnownComponentsUsd:p,completeD2DCostUsd:z.null(),quoteReady:z.literal(false)}).passthrough()
const cost=z.object({baseCostId:text,cashComparisonId:text,cycleScenarioId:cycle,paymentMode:z.enum(['CASH','FINANCED']),knownCvuComponentUsd:p,
 bobtailWearProjectionApplied:z.boolean(),alternatives:z.array(alt).length(2),
 taxSensitivity:z.array(z.object({id:text,alternatives:z.array(z.object({premiumAlternativeId:text,knownCfuComponentUsd:p,knownCvuComponentUsd:p,totalKnownComponentsUsd:p}).passthrough()).length(2)}).passthrough()).length(2)
}).passthrough()
const baseSchema=z.object({model:z.literal('FCM_MX_BOBTAIL_C3_WEAR_SENSITIVITY_V1'),basis:z.enum(['UNPRICED','IMT_C3_NON_ARTICULATED_PROXY']),
 cash:z.array(cost).length(8),financed:z.array(cost).length(128)}).passthrough()
const exposureSchema=z.object({model:z.literal('FCM_MX_CROSSBORDER_INSURANCE_EXPOSURE_V1'),resourceId:z.literal('MX_TRACTOR'),temporaryPremiumPer24hUsd:z.null(),annualPremiumUsd:z.null(),
 scenarios:z.array(z.object({cycleScenarioId:cycle,resourceId:z.literal('MX_TRACTOR'),conditionalMonthlyResourceShare:p,conditionalAnnualPremiumShare:p,conditional24hPremiumMultiplier:z.number().int().positive(),
  temporaryAlternative:z.object({classification:z.literal('CVU'),costUsd:z.null()}).passthrough(),annualAlternative:z.object({classification:z.literal('CFU'),costUsd:z.null()}).passthrough(),
  mutuallyExclusiveAlternatives:z.literal(true),sameBoxChargedAgain:z.literal(false),usTractorChargedAgain:z.literal(false),actualEligibilityVerified:z.literal(false)
 }).passthrough()).length(2)}).passthrough()
const unique=(ids:string[],message:string)=>{if(new Set(ids).size!==ids.length)throw new Error(message)}
const close=(a:number,b:number)=>Math.abs(a-b)<1e-7

export const PUBLIC_LIABILITY_ALTERNATIVE_IDS=[
 'NEW_AUTHORITY_INDIANA_2025:PUBLISHED_LOWER_ENDPOINT',
 'NEW_AUTHORITY_INDIANA_2025:PUBLISHED_UPPER_ENDPOINT',
 'EXPERIENCED_CLEAN_2PLUS_YEARS:PUBLISHED_LOWER_ENDPOINT',
 'EXPERIENCED_CLEAN_2PLUS_YEARS:PUBLISHED_UPPER_ENDPOINT',
] as const

/** Canonical published endpoints, without applying older cost projections. */
export function readCrossborderLiabilityPlanning(rawPolicy:unknown){
 const policy=policySchema.parse(rawPolicy)
 const premiums=policy.cohorts.flatMap(c=>c.annualPremiumUsdEndpoints.map((annualPremiumUsd,i)=>({id:`${c.id}:${i===0?'PUBLISHED_LOWER_ENDPOINT':'PUBLISHED_UPPER_ENDPOINT'}`,
  cohortId:c.id,sourcePeriod:c.sourcePeriod,annualPlanningPoolUsd:annualPremiumUsd,sourceId:policy.source.id,sourceUnitCount:null,operatorHistorySelected:false,foreignDomicileMatched:false})))
 return {policy,premiums}
}

/** Monetary annual reserve sensitivities. Source US domestic cohorts are not
 * foreign-insurer quotes; no temporary price is derived or coverage activated. */
export function calculateCrossborderLiabilityForecast(rawPolicy:unknown,rawBase:unknown,rawExposure:unknown,basis:CrossborderLiabilityBasis='UNPRICED'){
 if(basis!=='UNPRICED'&&basis!=='PUBLIC_US_PRIMARY_LIABILITY_PROXY')throw new Error('CROSSBORDER_LIABILITY_BASIS_INVALID')
 if(typeof rawBase==='object'&&rawBase!==null&&'crossborderLiabilityProjectionApplied' in rawBase)throw new Error('CROSSBORDER_LIABILITY_ALREADY_PROJECTED')
 const {policy,premiums}=readCrossborderLiabilityPlanning(rawPolicy),base=baseSchema.parse(rawBase),exposure=exposureSchema.parse(rawExposure),applied=basis==='PUBLIC_US_PRIMARY_LIABILITY_PROXY'
 unique(exposure.scenarios.map(s=>s.cycleScenarioId),'CROSSBORDER_LIABILITY_CYCLE_DUPLICATE')
 const scenarios=exposure.scenarios.map(s=>{
  if(s.conditionalMonthlyResourceShare>1||!close(s.conditionalAnnualPremiumShare,s.conditionalMonthlyResourceShare/12))throw new Error('CROSSBORDER_LIABILITY_ANNUAL_EXPOSURE_MISMATCH')
  if(s.conditional24hPremiumMultiplier!==(s.cycleScenarioId==='NETWORK_EXPECTED_EMPTY_PROXY'?1:2))throw new Error('CROSSBORDER_LIABILITY_REFERENCE_INCURSIONS_MISMATCH')
  return {cycleScenarioId:s.cycleScenarioId,resourceId:s.resourceId,conditionalAnnualPremiumShare:s.conditionalAnnualPremiumShare,
   alternatives:premiums.map(price=>({...price,conditionalAnnualCfuAdditionUsd:price.annualPlanningPoolUsd*s.conditionalAnnualPremiumShare,
    temporaryPremiumUsd:null,temporaryCvuAdditionUsd:null,actualForeignPremiumUsd:null,classification:'CFU' as const,sourceIsForeignQuote:false,isMarketBound:false,quoteReady:false}))}
 })
 unique([...base.cash,...base.financed].map(c=>c.baseCostId),'CROSSBORDER_LIABILITY_COST_DUPLICATE')
 const join=(c:z.infer<typeof cost>,payment:'CASH'|'FINANCED')=>{
  if(c.crossborderLiabilityProjectionApplied!==undefined)throw new Error('CROSSBORDER_LIABILITY_ALREADY_PROJECTED')
  const cash=base.cash.find(b=>b.baseCostId===c.cashComparisonId),s=scenarios.find(s=>s.cycleScenarioId===c.cycleScenarioId)!
  if(c.paymentMode!==payment||!cash||cash.cycleScenarioId!==c.cycleScenarioId||!close(cash.knownCvuComponentUsd,c.knownCvuComponentUsd)||(payment==='CASH'&&c.baseCostId!==c.cashComparisonId)||c.bobtailWearProjectionApplied!==(base.basis!=='UNPRICED'))throw new Error('CROSSBORDER_LIABILITY_COST_JOIN_MISMATCH')
  unique(c.alternatives.map(a=>a.premiumAlternativeId),'CROSSBORDER_LIABILITY_ALTERNATIVE_DUPLICATE')
  for(const a of c.alternatives)if(!close(a.totalKnownComponentsUsd,a.knownCfuComponentUsd+c.knownCvuComponentUsd))throw new Error('CROSSBORDER_LIABILITY_COST_SUM_MISMATCH')
  unique(c.taxSensitivity.map(t=>t.id),'CROSSBORDER_LIABILITY_TAX_DUPLICATE')
  for(const t of c.taxSensitivity){
   unique(t.alternatives.map(a=>a.premiumAlternativeId),'CROSSBORDER_LIABILITY_TAX_ALTERNATIVE_DUPLICATE')
   for(const a of t.alternatives)if(!c.alternatives.some(p=>p.premiumAlternativeId===a.premiumAlternativeId)||!close(a.knownCvuComponentUsd,c.knownCvuComponentUsd)||!close(a.totalKnownComponentsUsd,a.knownCfuComponentUsd+a.knownCvuComponentUsd))throw new Error('CROSSBORDER_LIABILITY_TAX_SUM_OR_JOIN_MISMATCH')
  }
  return {baseCostId:c.baseCostId,cashComparisonId:c.cashComparisonId,cycleScenarioId:c.cycleScenarioId,paymentMode:c.paymentMode,
   priorBobtailWearBasis:base.basis,knownCvuComponentUsd:c.knownCvuComponentUsd,crossborderLiabilityProjectionApplied:applied,
   liabilityAlternatives:s.alternatives.map(price=>{
    const addition=applied?price.conditionalAnnualCfuAdditionUsd:null,delta=addition??0
    const project=(a:{premiumAlternativeId:string;knownCfuComponentUsd:number;totalKnownComponentsUsd:number})=>({premiumAlternativeId:a.premiumAlternativeId,
     priorKnownCfuComponentUsd:a.knownCfuComponentUsd,knownCfuComponentUsd:a.knownCfuComponentUsd+delta,knownCvuComponentUsd:c.knownCvuComponentUsd,totalKnownComponentsUsd:a.totalKnownComponentsUsd+delta,
     completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,quoteReady:false})
    return {id:price.id,cohortId:price.cohortId,annualPlanningPoolUsd:price.annualPlanningPoolUsd,conditionalAnnualCfuAdditionUsd:addition,
     alternatives:c.alternatives.map(project),taxSensitivity:c.taxSensitivity.map(t=>({id:t.id,alternatives:t.alternatives.map(project)})),
     actualForeignPremiumUsd:null,selected:false,sourceIsForeignQuote:false,isMarketBound:false}
   }),actualForeignPremiumUsd:null,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,quoteReady:false}
 }
 return {...policy,sourceRef:'crossborderLiabilityForecast',basis,premiums,scenarios,cash:base.cash.map(c=>join(c,'CASH')),financed:base.financed.map(c=>join(c,'FINANCED')),
  crossborderLiabilityProjectionApplied:applied,cfusChanged:applied,cvusChanged:false,sourceIsForeignQuote:false,temporaryPremiumAdded:false,physicalDamageAdded:false,
  boxChargedAgain:false,usTractorChargedAgain:false,adminChargedAgain:false,actualCarrierCostObserved:false,externalWrites:false,
  remaining:['COMPATIBLE_MX_FOREIGN_LIABILITY_QUOTE_OR_BETTER_PUBLIC_COHORT','CARGO_COST_SCOPE','MATCHED_TRUCK_ROUTE_TOLLS','OTHER_UNMATCHED_REFERENCE_MODEL_ASSUMPTIONS']}
}
