import {z} from 'zod'

const money=z.number().finite().nonnegative().max(1e12),text=z.string().trim().min(1)
const tax=z.enum(['NET_VAT_CREDITABLE_PLANNING','GROSS_VAT_NOT_CREDITABLE_PLANNING'])
export const CargoTripSelectionSchema=z.discriminatedUnion('mode',[
  z.object({mode:z.literal('UNDECIDED'),declaredValueMxn:z.null(),cargoDescription:z.null(),taxTreatment:z.null()}).strict(),
  z.object({mode:z.literal('SEPARATE_SHIPPER_COST'),declaredValueMxn:z.null(),cargoDescription:z.null(),taxTreatment:z.null()}).strict(),
  z.object({mode:z.literal('INCLUDE_IN_MODELED_TRANSPORT_COST'),declaredValueMxn:money.positive(),cargoDescription:text,taxTreatment:tax}).strict(),
])
const policySchema=z.object({model:z.literal('FCM_CARGO_VALUE_TRIP_REFERENCE_V1'),reviewedAt:z.string().datetime(),referencePeriod:z.literal('2026-10'),
  pricingDate:z.literal('2026-09-20'),insuredInterest:z.literal('SUPPLEMENTAL_DECLARED_GOODS_VALUE_NOT_CARRIER_AUTO_OR_BOX_PD'),
  scope:z.literal('PUBLIC_PLANNING_REFERENCE_NOT_BOUND_INSURANCE'),premiumRate:z.literal(0.0045),minimumNetPremiumMxn:z.literal(250),vatRate:z.literal(0.16),
  feeMethod:z.literal('PUBLISHED_POINTS_ONLY_NO_INFERRED_INTERVALS'),
  publishedPoints:z.array(z.object({declaredValueMxn:money.positive(),netPremiumMxn:money,policyFeeMxn:money,netTotalMxn:money}).strict()).length(8),
  pilotSelection:CargoTripSelectionSchema,
  sources:z.array(z.object({id:text,url:z.string().url(),requestedUrl:z.string().url().optional(),locator:text,
    archive:z.object({file:z.string().startsWith('docs/research/sources/'),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict()}).strict()).length(3),
  assumptions:z.array(text).min(9),completeCarrierInsuranceUsd:z.null(),completeD2DCostUsd:z.null(),quoteReady:z.literal(false),adoptedValues:z.literal(0),
}).strict()
const fxSchema=z.object({model:z.literal('FCM_DATED_FIX_VALUATION_REFERENCE_V1'),observationDate:z.string().date(),column:z.literal('FIX_DETERMINATION'),
  mxnPerUsd:money.positive(),use:z.literal('DATED_RESEARCH_VALUATION_NOT_PAYMENT_OR_FORECAST')}).passthrough()
const cents=(v:number)=>Math.round((v+Number.EPSILON)*100)/100

/** Public price points, not invented pilot cargo, a complete fee tariff or coverage approval. */
export function calculateCargoTripInsuranceReference(rawPolicy:unknown,rawFx:unknown,rawSelection?:unknown){
  const policy=policySchema.parse(rawPolicy),fx=fxSchema.parse(rawFx),selection=CargoTripSelectionSchema.parse(rawSelection??policy.pilotSelection)
  if(new Set(policy.publishedPoints.map(p=>p.declaredValueMxn)).size!==8)throw new Error('CARGO_PRICE_POINT_DUPLICATE')
  const ids=['TIMI_CARGO_PRICE_20260920','TIMI_CROSS_BORDER_NO_LIST_PRICE','FMCSA_MX_REGISTRATION_INSURANCE']
  if(ids.some(id=>policy.sources.filter(s=>s.id===id).length!==1))throw new Error('CARGO_SOURCE_SET_MISMATCH')
  const examples=policy.publishedPoints.map(p=>{
    const calculatedNetPremiumMxn=cents(Math.max(p.declaredValueMxn*policy.premiumRate,policy.minimumNetPremiumMxn))
    if(calculatedNetPremiumMxn!==p.netPremiumMxn||cents(p.netPremiumMxn+p.policyFeeMxn)!==p.netTotalMxn)throw new Error('CARGO_PUBLISHED_ARITHMETIC_MISMATCH')
    const vatMxn=cents(p.netTotalMxn*policy.vatRate),grossMxn=cents(p.netTotalMxn+vatMxn)
    return {...p,vatMxn,grossMxn,netUsd:p.netTotalMxn/fx.mxnPerUsd,grossUsd:grossMxn/fx.mxnPerUsd,
      sourceExampleNotPilot:true,coverageAcceptanceObserved:false}
  })
  const selected=selection.mode==='INCLUDE_IN_MODELED_TRANSPORT_COST'?examples.find(p=>p.declaredValueMxn===selection.declaredValueMxn):undefined
  const delta=selection.mode==='SEPARATE_SHIPPER_COST'?0:selected?
    (selection.mode==='INCLUDE_IN_MODELED_TRANSPORT_COST'&&selection.taxTreatment==='NET_VAT_CREDITABLE_PLANNING'?selected.netUsd:selected.grossUsd):null
  return {...policy,sourceRef:'cargoTripInsurance',pilotSelection:selection,examples,
    fx:{observationDate:fx.observationDate,mxnPerUsd:fx.mxnPerUsd,column:fx.column},
    pilotComponent:{id:'SUPPLEMENTAL_CARGO_VALUE_INSURANCE',allocation:'ONCE_PER_OUTBOUND_SHIPMENT' as const,
      costClass:'CVU' as const,amountUsd:delta,
      status:selection.mode==='UNDECIDED'?'SCOPE_AND_CARGO_PENDING':selection.mode==='SEPARATE_SHIPPER_COST'?'EXCLUDED_BY_EXPLICIT_COST_SCOPE':
        selected?'CONDITIONAL_PUBLIC_PRICE_COMPONENT':'POLICY_FEE_FOR_VALUE_NOT_DOCUMENTED',
      selectedPublishedPoint:selected??null,quotedPolicy:false,coverageAcceptanceObserved:false},
    existingCarrierCargoPolicyRemoved:false,boxPremiumOrCarrierAutoReplaced:false,emptyReturnMultipliesPremium:false,
    borderAutoLiability:{status:'COMPATIBLE_PUBLIC_PREMIUM_UNRESOLVED',premiumUsd:null,
      tripOrContinuingCoverageDocumented:true,minimumTripCoverageHours:24,actualCarrierEligibilityObserved:false,
      personalAutoRateUsed:false,liabilityLimitUsedAsPremium:false},
    completeCarrierInsuranceUsd:null,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,originalInputsChanged:false}
}

const partialCostSchema=z.object({id:text,knownCfuComponentUsd:money,knownCvuComponentUsd:money,totalKnownComponentsUsd:money,
  completeD2DCostUsd:z.null(),quoteReady:z.literal(false)}).passthrough()

/** One optional shipment expense on a copy. The existing carrier policy remains charged.
 * Undecided/missing-fee inputs never yield a falsely completed known total. */
export function applyCargoTripInsuranceToPartialCost(rawCost:unknown,rawPolicy:unknown,rawFx:unknown,rawSelection?:unknown){
  return projectPartialCost(rawCost,calculateCargoTripInsuranceReference(rawPolicy,rawFx,rawSelection))
}

function projectPartialCost(rawCost:unknown,reference:ReturnType<typeof calculateCargoTripInsuranceReference>){
  if(typeof rawCost==='object'&&rawCost!==null&&'cargoTripComponentApplied' in rawCost&&rawCost.cargoTripComponentApplied===true)throw new Error('CARGO_TRIP_COMPONENT_ALREADY_APPLIED')
  const cost=partialCostSchema.parse(rawCost)
  if(cost.cargoTripComponentApplied===true||Array.isArray(cost.variableComponents)&&cost.variableComponents.some(c=>c?.id==='SUPPLEMENTAL_CARGO_VALUE_INSURANCE'))throw new Error('CARGO_TRIP_COMPONENT_ALREADY_APPLIED')
  if(Math.abs(cost.knownCfuComponentUsd+cost.knownCvuComponentUsd-cost.totalKnownComponentsUsd)>1e-7)throw new Error('CARGO_PRIOR_COST_SUM_MISMATCH')
  const delta=reference.pilotComponent.amountUsd
  return {baseCostId:cost.id,...cost,cargoTripComponentApplied:true,cargoTripComponent:reference.pilotComponent,
    priorKnownCvuComponentUsd:cost.knownCvuComponentUsd,priorTotalKnownComponentsUsd:cost.totalKnownComponentsUsd,
    knownCvuComponentUsd:delta===null?null:cost.knownCvuComponentUsd+delta,
    totalKnownComponentsUsd:delta===null?null:cost.totalKnownComponentsUsd+delta,
    existingCarrierCargoPolicyRemoved:false,completeD2DCostUsd:null,quoteReady:false,selected:false}
}

/** Price the same outbound shipment once, then project independent comparisons.
 * The batch is not a sum of shipments and cannot silently reuse duplicate IDs. */
export function applyCargoTripInsuranceToPartialCosts(rawCosts:unknown[],rawPolicy:unknown,rawFx:unknown,rawSelection?:unknown){
  if(!Array.isArray(rawCosts)||rawCosts.length===0)throw new Error('CARGO_COST_BATCH_EMPTY_OR_INVALID')
  const reference=calculateCargoTripInsuranceReference(rawPolicy,rawFx,rawSelection)
  const costs=rawCosts.map(cost=>projectPartialCost(cost,reference))
  if(new Set(costs.map(c=>c.id)).size!==costs.length)throw new Error('CARGO_COST_BATCH_ID_DUPLICATE')
  return {reference,costs}
}
