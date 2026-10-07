import {z} from 'zod'

const n=z.number().finite().nonnegative().max(1e9),p=n.positive(),text=z.string().min(1)
const cycle=z.enum(['NETWORK_EXPECTED_EMPTY_PROXY','DEDICATED_EMPTY_SAME_BOX_RETURN'])
export type MxBobtailWearBasis='UNPRICED'|'IMT_C3_NON_ARTICULATED_PROXY'
const policySchema=z.object({
 model:z.literal('FCM_MX_BOBTAIL_C3_WEAR_SENSITIVITY_V1'),reviewedAt:z.string().datetime(),
 scope:z.literal('UNMATCHED_NON_ARTICULATED_PUBLIC_MODEL_TRANSFER_TO_MX_BOBTAIL_ONLY'),
 source:z.object({id:z.literal('IMT_PT881_C3'),url:z.literal('https://imt.mx/archivos/Publicaciones/PublicacionTecnica/pt881.pdf'),
  archive:z.object({file:z.literal('docs/research/sources/IMT_PT881_2025.pdf'),sha256:z.literal('816728964103158f0a99f44c41bbe5d2bb7240c33e35651fcbd90c0b391412f4')}).strict(),
  inputLocator:z.literal('Table 3.25, printed pages 37-38, physical PDF pages 47-48'),outputLocator:z.literal('Table 4.4, printed page 53, physical PDF page 63'),
  period:z.literal('2025'),taxBasis:z.literal('NET_NATIONAL_ECONOMIC_MODEL_EXCLUDING_IVA_ISAN_NOT_VERIFIED_TARGET_INVOICE')}).strict(),
 sourceVehicle:z.object({configuration:z.literal('C3_NON_ARTICULATED'),makeModel:z.literal('International 4400 2025 / Navistar DT466'),
  horsepower:z.literal(250),axles:z.literal(3),tires:z.literal(10),tireSpecification:z.literal('1100-20'),rigidBodyFeet:z.literal(23),
  emptyVehicleKg:z.literal(6939.7),payloadKg:z.literal(17554.3),annualKm:z.literal(150000),ageKm:z.literal(500000),
  hasSemitrailer:z.literal(false),hasRigidBody:z.literal(true),rigidBodyWearSeparable:z.literal(false),baseRoad:z.literal('FLAT_STRAIGHT_GOOD_IRI_2_M_PER_KM')}).strict(),
 target:z.object({resourceId:z.literal('MX_TRACTOR'),vehicle:z.literal('Cascadia 2021 / DD15 450 HP'),movement:z.literal('BOBTAIL_WITHOUT_SHARED_TRAILER'),
  matchedVehicle:z.literal(false),matchedPayload:z.literal(false),matchedTireLifecycle:z.literal(false),observedBobtailRate:z.literal(false),biasDirectionKnown:z.literal(false)}).strict(),
 printedCostsMxnPer1000VehicleKm:z.object({maintenanceLabor:z.literal(820.06),maintenanceParts:z.literal(1696.51),lubricants:z.literal(172.97),tires:z.literal(690.69)}).strict(),
 calculationPolicy:z.literal('USE_PRINTED_EXPENSES_NOT_ROUNDED_PHYSICAL_OUTPUTS_NO_COMPOSITE_SPLIT'),
 included:z.tuple([z.literal('MAINTENANCE_LABOR'),z.literal('MAINTENANCE_PARTS'),z.literal('LUBRICANTS'),z.literal('TIRES')]),
 excluded:z.tuple([z.literal('FUEL'),z.literal('DRIVER'),z.literal('CAPITAL_DEPRECIATION'),z.literal('CAPITAL_INTEREST'),z.literal('OVERHEAD'),z.literal('SHARED_TRAILER')]),
 transfer:z.literal('APPLY_UNCHANGED_2025_NET_C3_COST_PER_KM_TO_FORECAST_BOBTAIL_KM_WITHOUT_INFLATION_OR_VAT_ADJUSTMENT'),
 assumptions:z.array(z.string().min(30)).min(12),actualTractorOnlyCostUsd:z.null(),completeCfuUsd:z.null(),completeCvuUsd:z.null(),completeD2DCostUsd:z.null(),quoteReady:z.literal(false),adoptedValues:z.literal(0)
}).strict()
const alternative=z.object({premiumAlternativeId:text,knownCfuComponentUsd:p,totalKnownComponentsUsd:p,completeD2DCostUsd:z.null(),quoteReady:z.literal(false)}).passthrough()
const cost=z.object({baseCostId:text,cashComparisonId:text,cycleScenarioId:cycle,paymentMode:z.enum(['CASH','FINANCED']),knownCvuComponentUsd:p,
 mxReservedYardAddedOnce:z.literal(true),alternatives:z.array(alternative).length(2),
 taxSensitivity:z.array(z.object({id:text,alternatives:z.array(z.object({premiumAlternativeId:text,knownCfuComponentUsd:p,totalKnownComponentsUsd:p}).passthrough()).length(2)}).passthrough()).length(2)
}).passthrough()
const baseSchema=z.object({model:z.literal('FCM_MX_RESERVED_YARD_REFERENCE_V1'),cash:z.array(cost).length(8),financed:z.array(cost).length(128)}).passthrough()
const variablesSchema=z.object({model:z.literal('FCM_PILOT_VARIABLE_PUBLIC_SCENARIOS_V1'),scenarios:z.array(z.object({
 cycleScenarioId:cycle,mxAttachedKm:p,mxBobtailKm:n,
 unresolvedMxBobtailMaintenanceUsd:z.object({status:z.enum(['NO_BOBTAIL_MOVEMENT','UNPRICED_TRACTOR_ONLY_COMPONENT']),amountUsd:z.null()}).strict(),
 rows:z.array(z.object({id:text,country:z.enum(['MX','US']),covers:text,km:p,nativeCurrency:z.enum(['MXN','USD']),nativePerKm:p,amountNative:p,amountUsd:p}).passthrough()).length(9)
}).passthrough()).length(2)}).passthrough()
const fxSchema=z.object({model:z.literal('FCM_DATED_FIX_VALUATION_REFERENCE_V1'),mxnPerUsd:z.literal(18.3688),observationDate:z.literal('2026-10-01')}).passthrough()
const close=(a:number,b:number)=>Math.abs(a-b)<1e-7
const unique=(ids:string[],message:string)=>{if(new Set(ids).size!==ids.length)throw new Error(message)}

/** Optional unmatched-model sensitivity, never a calibrated tractor-only price.
 * Adds four wear expenses on disjoint bobtail kilometres; no attached/box split. */
export function calculateMxBobtailWearReference(rawPolicy:unknown,rawBase:unknown,rawVariables:unknown,rawFx:unknown,basis:MxBobtailWearBasis='UNPRICED'){
 if(basis!=='UNPRICED'&&basis!=='IMT_C3_NON_ARTICULATED_PROXY')throw new Error('MX_BOBTAIL_BASIS_INVALID')
 if(typeof rawBase==='object'&&rawBase!==null&&'bobtailWearProjectionApplied' in rawBase)throw new Error('MX_BOBTAIL_ALREADY_PROJECTED')
 const policy=policySchema.parse(rawPolicy),base=baseSchema.parse(rawBase),variables=variablesSchema.parse(rawVariables),fx=fxSchema.parse(rawFx)
 const applied=basis==='IMT_C3_NON_ARTICULATED_PROXY'
 unique(variables.scenarios.map(s=>s.cycleScenarioId),'MX_BOBTAIL_CYCLE_DUPLICATE')
 const rates=Object.entries(policy.printedCostsMxnPer1000VehicleKm).map(([id,value])=>({id,nativeMxnPerKm:value/1000}))
 const nativeMxnPerKm=rates.reduce((sum,r)=>sum+r.nativeMxnPerKm,0)
 const scenarios=variables.scenarios.map(s=>{
  unique(s.rows.map(r=>r.id),'MX_BOBTAIL_VARIABLE_ROW_DUPLICATE')
  if(applied&&s.mxBobtailKm<=0)throw new Error('MX_BOBTAIL_REQUIRES_EXPLICIT_LINK_FORECAST')
  if(s.unresolvedMxBobtailMaintenanceUsd.status!==(s.mxBobtailKm>0?'UNPRICED_TRACTOR_ONLY_COMPONENT':'NO_BOBTAIL_MOVEMENT'))throw new Error('MX_BOBTAIL_UNPRICED_STATE_MISMATCH')
  for(const [id,rate] of [['MX_MAINT',5.61754],['MX_LUBE',.27967],['MX_TIRES',.96996]] as const){
   const r=s.rows.find(r=>r.id===id)
   if(!r||r.country!=='MX'||r.nativeCurrency!=='MXN'||r.covers!=='ATTACHED_TRACTOR_BOX_UNSPLIT'||!close(r.km,s.mxAttachedKm)||!close(r.nativePerKm,rate)||
     !close(r.amountNative,r.km*rate)||!close(r.amountUsd,r.amountNative/fx.mxnPerUsd))throw new Error('MX_BOBTAIL_ATTACHED_WEAR_SCOPE_MISMATCH')
  }
  for(const id of ['MX_FUEL','MX_DRIVER_PAY']){
   const r=s.rows.find(r=>r.id===id)
   if(!r||r.country!=='MX'||!close(r.km,s.mxAttachedKm+s.mxBobtailKm))throw new Error('MX_BOBTAIL_TRACTOR_DISTANCE_MISMATCH')
  }
  // Zero under the old unresolved link is not evidence of absent gate-yard loops.
  const quantitiesEstablished=s.mxBobtailKm>0
  const rows=rates.map(r=>({...r,km:s.mxBobtailKm,conditionalAmountMxn:quantitiesEstablished?r.nativeMxnPerKm*s.mxBobtailKm:null,
   conditionalAmountUsd:quantitiesEstablished?r.nativeMxnPerKm*s.mxBobtailKm/fx.mxnPerUsd:null,resourceId:'MX_TRACTOR' as const}))
  return {cycleScenarioId:s.cycleScenarioId,mxAttachedKm:s.mxAttachedKm,mxBobtailKm:s.mxBobtailKm,rows,
   conditionalWearMxn:quantitiesEstablished?s.mxBobtailKm*nativeMxnPerKm:null,conditionalWearUsd:quantitiesEstablished?s.mxBobtailKm*nativeMxnPerKm/fx.mxnPerUsd:null,
   actualTractorOnlyCostUsd:null,sourceVehicleMatched:false,rigidBodyEffectSeparable:false,isLowerBound:false,
   quantityBasis:quantitiesEstablished?'FORECAST_KM_NOT_OBSERVED':'UNRESOLVED_LINK_NOT_ZERO_WEAR',quoteReady:false}
 })
 unique([...base.cash,...base.financed].map(c=>c.baseCostId),'MX_BOBTAIL_COST_DUPLICATE')
 const join=(c:z.infer<typeof cost>,payment:'CASH'|'FINANCED')=>{
  if(c.bobtailWearProjectionApplied!==undefined)throw new Error('MX_BOBTAIL_ALREADY_PROJECTED')
  const cash=base.cash.find(b=>b.baseCostId===c.cashComparisonId),s=scenarios.find(s=>s.cycleScenarioId===c.cycleScenarioId)!
  if(c.paymentMode!==payment||!cash||cash.cycleScenarioId!==c.cycleScenarioId||!close(cash.knownCvuComponentUsd,c.knownCvuComponentUsd)||(payment==='CASH'&&c.baseCostId!==c.cashComparisonId))throw new Error('MX_BOBTAIL_COST_JOIN_MISMATCH')
  unique(c.alternatives.map(a=>a.premiumAlternativeId),'MX_BOBTAIL_ALTERNATIVE_DUPLICATE')
  for(const a of c.alternatives)if(!close(a.totalKnownComponentsUsd,a.knownCfuComponentUsd+c.knownCvuComponentUsd))throw new Error('MX_BOBTAIL_COST_SUM_MISMATCH')
  unique(c.taxSensitivity.map(t=>t.id),'MX_BOBTAIL_TAX_DUPLICATE')
  const addition=applied?s.conditionalWearUsd!:null,delta=addition??0,knownCvuComponentUsd=c.knownCvuComponentUsd+delta
  const taxSensitivity=c.taxSensitivity.map(t=>{
   unique(t.alternatives.map(a=>a.premiumAlternativeId),'MX_BOBTAIL_TAX_ALTERNATIVE_DUPLICATE')
   return {id:t.id,alternatives:t.alternatives.map(a=>{
    if(!c.alternatives.some(prior=>prior.premiumAlternativeId===a.premiumAlternativeId)||!close(a.totalKnownComponentsUsd,a.knownCfuComponentUsd+c.knownCvuComponentUsd))throw new Error('MX_BOBTAIL_TAX_SUM_OR_JOIN_MISMATCH')
    return {premiumAlternativeId:a.premiumAlternativeId,knownCfuComponentUsd:a.knownCfuComponentUsd,knownCvuComponentUsd,totalKnownComponentsUsd:a.totalKnownComponentsUsd+delta,completeD2DCostUsd:null,quoteReady:false}
   })}
  })
  return {baseCostId:c.baseCostId,cashComparisonId:c.cashComparisonId,cycleScenarioId:c.cycleScenarioId,paymentMode:c.paymentMode,
   previousKnownCvuComponentUsd:c.knownCvuComponentUsd,conditionalBobtailWearAdditionUsd:addition,knownCvuComponentUsd,
   interpretation:applied?'KNOWN_COMPONENTS_PLUS_UNMATCHED_C3_WEAR_SENSITIVITY':'KNOWN_COMPONENTS_WITH_ACTUAL_BOBTAIL_WEAR_UNPRICED',
   bobtailWearProjectionApplied:applied,taxSensitivity,alternatives:c.alternatives.map(a=>({premiumAlternativeId:a.premiumAlternativeId,
    knownCfuComponentUsd:a.knownCfuComponentUsd,totalKnownComponentsUsd:a.totalKnownComponentsUsd+delta,completeD2DCostUsd:null,quoteReady:false})),
   completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,actualTractorOnlyCostUsd:null,quoteReady:false}
 }
 return {...policy,sourceRef:'mxBobtailWear',basis,fx,rates,nativeMxnPerKm,scenarios,cash:base.cash.map(c=>join(c,'CASH')),financed:base.financed.map(c=>join(c,'FINANCED')),
  bobtailWearProjectionApplied:applied,cfusChanged:false,cvusChanged:applied,attachedWearChanged:false,boxChargedAgain:false,adminChargedAgain:false,
  sourceVehicleMatched:false,homogeneousTaxBasis:false,jointObservedCohort:false,actualCarrierCostObserved:false,externalWrites:false,
  remaining:['MATCHED_CASCADIA_TRACTOR_ONLY_WEAR','MATCHED_TRUCK_ROUTE_TOLLS','CROSSBORDER_LIABILITY_PREMIUM_AND_CARGO_SCOPE','OTHER_UNMATCHED_REFERENCE_MODEL_ASSUMPTIONS']}
}
