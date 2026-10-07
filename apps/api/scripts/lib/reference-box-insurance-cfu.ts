import {z} from 'zod'
import {allocateFixedCost} from '../../src/modules/engine/fixed-cost-allocation.js'
import {calculateOwnedTrailerInsurancePlanningReference} from './reference-insurance-employer.js'

const n=z.number().finite().nonnegative().max(1e12),p=n.positive(),text=z.string().min(1)
const resource=z.enum(['MX_TRACTOR','US_TRACTOR','SHARED_TRAILER'])
const cycle=z.enum(['NETWORK_EXPECTED_EMPTY_PROXY','DEDICATED_EMPTY_SAME_BOX_RETURN'])
const policySchema=z.object({model:z.literal('FCM_ONE_BOX_INSURANCE_CFU_COMPONENT_V1'),reviewedAt:z.string().datetime(),referencePeriod:z.literal('2026-10'),
  scope:z.literal('OWNED_SHARED_BOX_PD_PARTIAL_NOT_COMPLETE_BINATIONAL_INSURANCE'),physicalBoxCount:z.literal(1),guideId:z.literal('LOGROCK_OWNED_TRAILER_PD_2026'),
  premiumBasis:z.literal('PUBLISHED_MONTHLY_ENDPOINTS_NOT_VALUE_FORMULA_OR_MIDPOINT'),allocationBasis:z.literal('SAME_SHARED_BOX_MAX_DISTANCE_TIME_ONCE'),monthlyAvailableDays:z.literal(24),
  pricingTransfer:z.literal('US_PUBLIC_GUIDE_ONE_SHARED_ASSET_PROSPECTIVE_ONLY'),
  coverageEvidence:z.object({namedAssetAndCoverageScheduleRequired:z.literal(true),qualitasPhysicalDamageTheftExtensionToUsCanadaDocumented:z.literal(true),
    qualitasUsAutoLiabilityInferred:z.literal(false),detachedTheftRequiresSecuredContractualYard:z.literal(true),commonInsuredLegalOwnerObserved:z.literal(false),
    matchedBinationalPremiumObserved:z.literal(false),fullInsuranceFamilyComplete:z.literal(false)}).strict(),
  sources:z.array(z.object({id:text,url:z.string().url(),locator:text,archive:z.object({file:text,sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict().nullable()}).strict()).length(2),
  assumptions:z.array(text).min(9),quoteReady:z.literal(false),adoptedValues:z.literal(0)}).strict()
const baseSchema=z.array(z.object({id:text,modeledFleetPairs:z.literal(1),oneSharedBox:z.literal(true),
  lines:z.array(z.object({id:text,resourceId:resource,monthlyUsd:n}).passthrough()),knownResourceMonthlyComponents:z.object({MX_TRACTOR:p,US_TRACTOR:p,SHARED_TRAILER:p}).strict(),
  knownMonthlyComponentUsd:p,completeFixedBudgetUsd:z.null(),completeD2DCostUsd:z.null()}).passthrough()).length(2)
const costsSchema=z.object({id:text,cycleScenarioId:cycle,restInterpretation:z.enum(['RATE_EXCLUDES_WEEKLY_REST','RATE_INCLUDES_WEEKLY_REST']),
  fixedComponents:z.array(z.object({id:text,resourceId:resource,amountUsd:n}).passthrough()).length(4),
  variableComponents:z.array(z.object({id:text,amountUsd:n}).passthrough()).length(2),knownCfuComponentUsd:p,knownCvuComponentUsd:p,totalKnownComponentsUsd:p,
  completeCfuUsd:z.null(),completeCvuUsd:z.null(),completeD2DCostUsd:z.null(),quoteReady:z.literal(false),selected:z.literal(false)}).passthrough()
const dutySchema=z.object({model:z.literal('FCM_MX_ORDINARY_DUTY_PILOT_CONTRAST_V1'),
  scenarios:z.array(z.object({id:cycle,knownBoxClockDays:p,compatibleKnownCyclesPerMonth:p,
    conditionalFixedAllocations:z.array(z.object({monthlyComponentScenarioId:text,resources:z.array(z.object({resourceId:resource,knownMonthlyComponentUsd:p,
      knownClockByTimeUsd:p,oldDistanceProxyByKmUsd:p,conditionalOldDistanceKnownClockMaxUsd:p}).passthrough()).length(3)}).passthrough()).length(2)}).passthrough()).length(2),
  cash:z.object({scenarios:z.array(costsSchema.extend({monthlyComponentScenarioId:text,sameBoxChargedOnce:z.literal(true),adminPoolChargedOnce:z.literal(true)})).length(8)}).passthrough(),
  financed:z.object({scenarios:z.array(costsSchema.extend({cashComparisonId:text,samePhysicalExposure:z.literal(true),boxChargedOnce:z.literal(true),adminPoolChargedOnce:z.literal(true)})).length(128)}).passthrough(),
  completeD2DCostUsd:z.null()}).passthrough()
const close=(a:number,b:number)=>Math.abs(a-b)<1e-7
const unique=(items:string[],code:string)=>{if(new Set(items).size!==items.length)throw new Error(code)}

/** One partial owned-box premium, not one policy per tractor/country. Public
 * coverage capability and borrowed planning price are distinct evidence. */
export function calculateBoxInsuranceCfu(rawPolicy:unknown,rawGuide:unknown,rawDuty:unknown,rawBase:unknown){
  const policy=policySchema.parse(rawPolicy),guide=calculateOwnedTrailerInsurancePlanningReference(rawGuide),duty=dutySchema.parse(rawDuty),base=baseSchema.parse(rawBase)
  if(guide.source.id!==policy.guideId||guide.publishedMonthlyRangeUsd.low!==25||guide.publishedMonthlyRangeUsd.high!==150||guide.statedValueUsd!==null)throw new Error('BOX_INSURANCE_GUIDE_SCOPE_MISMATCH')
  if(policy.sources.filter(s=>s.id==='QUALITAS_RESIDENT_CARGO_202606'&&s.archive!==null).length!==1||
    policy.sources.filter(s=>s.id==='PROGRESSIVE_INTERCHANGE_SCOPE').length!==1)throw new Error('BOX_INSURANCE_SOURCE_SET_MISMATCH')
  unique(base.map(b=>b.id),'BOX_INSURANCE_BASE_DUPLICATE')
  unique(duty.scenarios.map(s=>s.id),'BOX_INSURANCE_CYCLE_DUPLICATE')
  for(const b of base){
    unique(b.lines.map(l=>l.id),'BOX_INSURANCE_BASE_LINE_DUPLICATE')
    if(b.lines.some(l=>l.resourceId==='SHARED_TRAILER'&&/INSURANCE|PREMIUM/.test(l.id)))throw new Error('BOX_INSURANCE_ALREADY_IN_BASE')
    for(const id of resource.options)if(!close(b.lines.filter(l=>l.resourceId===id).reduce((sum,l)=>sum+l.monthlyUsd,0),b.knownResourceMonthlyComponents[id]))throw new Error('BOX_INSURANCE_BASE_SUM_MISMATCH')
    if(!close(b.lines.reduce((sum,l)=>sum+l.monthlyUsd,0),b.knownMonthlyComponentUsd))throw new Error('BOX_INSURANCE_BASE_SUM_MISMATCH')
  }
  const monthlyAlternatives=[{id:'PUBLIC_GUIDE_LOW',monthlyUsd:guide.publishedMonthlyRangeUsd.low},{id:'PUBLIC_GUIDE_HIGH',monthlyUsd:guide.publishedMonthlyRangeUsd.high}]
  const cycleAllocations=duty.scenarios.flatMap(s=>{
    unique(s.conditionalFixedAllocations.map(a=>a.monthlyComponentScenarioId),'BOX_INSURANCE_EXPOSURE_DUPLICATE')
    return s.conditionalFixedAllocations.map(a=>{
      unique(a.resources.map(r=>r.resourceId),'BOX_INSURANCE_RESOURCE_DUPLICATE')
      const b=base.find(b=>b.id===a.monthlyComponentScenarioId),box=a.resources.find(r=>r.resourceId==='SHARED_TRAILER')!
      if(!b||!close(box.knownMonthlyComponentUsd,b.knownResourceMonthlyComponents.SHARED_TRAILER))throw new Error('BOX_INSURANCE_BASE_EXPOSURE_MISMATCH')
      const timeExposure=box.knownClockByTimeUsd/box.knownMonthlyComponentUsd,distanceExposure=box.oldDistanceProxyByKmUsd/box.knownMonthlyComponentUsd
      if(!close(timeExposure,s.knownBoxClockDays/policy.monthlyAvailableDays)||!close(distanceExposure,1/s.compatibleKnownCyclesPerMonth)||
        !close(box.conditionalOldDistanceKnownClockMaxUsd,allocateFixedCost(box.oldDistanceProxyByKmUsd,box.knownClockByTimeUsd)))throw new Error('BOX_INSURANCE_SHARED_CYCLE_MISMATCH')
      return {cycleScenarioId:s.id,baseId:b.id,timeExposure,distanceExposure,priorBoxFixedUsd:box.conditionalOldDistanceKnownClockMaxUsd,
        alternatives:monthlyAlternatives.map(m=>({...m,fixedTripComponentUsd:allocateFixedCost(m.monthlyUsd*distanceExposure,m.monthlyUsd*timeExposure)}))}
    })
  })
  const costs=[...duty.cash.scenarios,...duty.financed.scenarios]
  unique(costs.map(c=>c.id),'BOX_INSURANCE_COST_DUPLICATE')
  for(const c of costs){
    unique(c.fixedComponents.map(l=>l.id),'BOX_INSURANCE_FIXED_DUPLICATE');unique(c.variableComponents.map(l=>l.id),'BOX_INSURANCE_VARIABLE_DUPLICATE')
    if(c.fixedComponents.some(l=>/INSURANCE|PREMIUM/.test(l.id))||c.boxInsuranceAddedOnce===true)throw new Error('BOX_INSURANCE_ALREADY_APPLIED')
    if(!close(c.fixedComponents.reduce((sum,l)=>sum+l.amountUsd,0),c.knownCfuComponentUsd)||!close(c.variableComponents.reduce((sum,l)=>sum+l.amountUsd,0),c.knownCvuComponentUsd)||
      !close(c.knownCfuComponentUsd+c.knownCvuComponentUsd,c.totalKnownComponentsUsd))throw new Error('BOX_INSURANCE_COST_SUM_MISMATCH')
  }
  const join=(c:z.infer<typeof costsSchema>,cash:typeof duty.cash.scenarios[number],paymentMode:'CASH'|'FINANCED')=>{
    const a=cycleAllocations.find(a=>a.cycleScenarioId===c.cycleScenarioId&&a.baseId===cash.monthlyComponentScenarioId)
    if(!a||c.cycleScenarioId!==cash.cycleScenarioId||c.restInterpretation!==cash.restInterpretation||!close(c.knownCvuComponentUsd,cash.knownCvuComponentUsd))throw new Error('BOX_INSURANCE_CASH_FINANCE_JOIN_MISMATCH')
    const oldBox=cash.fixedComponents.filter(r=>r.id==='BASE_FIXED:SHARED_TRAILER'&&r.resourceId==='SHARED_TRAILER')
    if(oldBox.length!==1||!close(oldBox[0].amountUsd,a.priorBoxFixedUsd))throw new Error('BOX_INSURANCE_CASH_BOX_MISMATCH')
    return {baseCostId:c.id,cashComparisonId:cash.id,cycleScenarioId:c.cycleScenarioId,paymentMode,
      priorKnownCfuComponentUsd:c.knownCfuComponentUsd,knownCvuComponentUsd:c.knownCvuComponentUsd,
      alternatives:a.alternatives.map(m=>({premiumAlternativeId:m.id,component:{id:'SHARED_BOX_PD_PUBLIC_PREMIUM',resourceId:'SHARED_TRAILER' as const,
        monthlyUsd:m.monthlyUsd,amountUsd:m.fixedTripComponentUsd},knownCfuComponentUsd:c.knownCfuComponentUsd+m.fixedTripComponentUsd,
        totalKnownComponentsUsd:c.totalKnownComponentsUsd+m.fixedTripComponentUsd,completeD2DCostUsd:null,quoteReady:false,selected:false})),
      boxInsuranceAddedOnce:true,adminOrVariableCostAddedAgain:false,actualCoverageProven:false,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null}
  }
  const cash=duty.cash.scenarios.map(c=>join(c,c,'CASH')),financed=duty.financed.scenarios.map(c=>{
    const paired=duty.cash.scenarios.find(p=>p.id===c.cashComparisonId)
    if(!paired)throw new Error('BOX_INSURANCE_CASH_FINANCE_JOIN_MISMATCH')
    return join(c,paired,'FINANCED')
  })
  return {...policy,sourceRef:'boxInsuranceCfu',sourceGuide:guide,monthlyAlternatives,cycleAllocations,cash,financed,
    coverageAndPriceAreDifferentEvidence:true,duplicateCountryPremiumsAdded:false,sourceGeographyTransferredAsHypothesis:true,
    quotedPolicy:false,premiumFinanceExpenseUsd:null,completeBinationalInsuranceUsd:null,unknownAmountsDefaultedToZero:false,
    completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,originalInputsChanged:false,externalWrites:false,
    remaining:['MATCHED_MX_US_BOX_PD_PRICE_AND_POLICY_SCHEDULE','INSURED_ENTITIES_CUSTODY_AND_DETACHED_YARD_TERMS','BORDER_AUTO_LIABILITY_AND_MX_CARGO',
      'DEDUCTIBLES_RETAINED_LOSS_AND_UNQUOTED_FEES_NOT_ZERO','OTHER_PILOT_FIXED_VARIABLE_AND_PHYSICAL_GAPS']}
}
