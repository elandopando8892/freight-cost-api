import {z} from 'zod'
import {applyCargoTripInsuranceToPartialCosts} from './reference-cargo-trip-insurance.js'

const n=z.number().finite().nonnegative().max(1e12),text=z.string().min(1)
const cycle=z.enum(['NETWORK_EXPECTED_EMPTY_PROXY','DEDICATED_EMPTY_SAME_BOX_RETURN'])
const alternative=z.object({premiumAlternativeId:text,knownCfuComponentUsd:n,knownCvuComponentUsd:n,totalKnownComponentsUsd:n,
 completeCfuUsd:z.null(),completeCvuUsd:z.null(),completeD2DCostUsd:z.null(),quoteReady:z.literal(false)}).passthrough()
const liability=z.object({id:text,cohortId:text,annualPlanningPoolUsd:n.positive(),conditionalAnnualCfuAdditionUsd:n.nullable(),
 alternatives:z.array(alternative).length(2),taxSensitivity:z.array(z.object({id:text,alternatives:z.array(alternative).length(2)}).passthrough()).length(2)}).passthrough()
const row=z.object({baseCostId:text,cashComparisonId:text,cycleScenarioId:cycle,paymentMode:z.enum(['CASH','FINANCED']),
 knownCvuComponentUsd:n,crossborderLiabilityProjectionApplied:z.boolean(),liabilityAlternatives:z.array(liability).length(4)}).passthrough()
const schema=z.object({model:z.literal('FCM_MX_CROSSBORDER_PRIMARY_LIABILITY_TRANSFER_V1'),basis:z.enum(['UNPRICED','PUBLIC_US_PRIMARY_LIABILITY_PROXY']),
 cash:z.array(row).length(8),financed:z.array(row).length(128)}).passthrough()
const unique=(ids:string[],message:string)=>{if(new Set(ids).size!==ids.length)throw new Error(message)}
const key=(base:string,liabilityId:string,variant:string,premium:string)=>JSON.stringify([base,liabilityId,variant,premium])

/** Join the existing public price function to the final reference chain, without
 * replacing carrier cargo CFU or treating a source example as actual cargo. */
export function calculatePilotCargoInsuranceProjection(rawBase:unknown,rawPolicy:unknown,rawFx:unknown,rawSelection?:unknown){
 if(typeof rawBase==='object'&&rawBase!==null&&'cargoTripProjectionApplied' in rawBase)throw new Error('PILOT_CARGO_ALREADY_PROJECTED')
 const base=schema.parse(rawBase),rows=[...base.cash,...base.financed]
 unique(rows.map(c=>c.baseCostId),'PILOT_CARGO_COST_DUPLICATE')
 const flattened:unknown[]=[]
 for(const c of rows){
  if(c.cargoTripProjectionApplied!==undefined)throw new Error('PILOT_CARGO_ALREADY_PROJECTED')
  const cash=base.cash.find(p=>p.baseCostId===c.cashComparisonId)
  if(!cash||cash.paymentMode!=='CASH'||cash.cycleScenarioId!==c.cycleScenarioId||cash.knownCvuComponentUsd!==c.knownCvuComponentUsd||
   c.paymentMode!==(base.cash.includes(c)?'CASH':'FINANCED')||(c.paymentMode==='CASH'&&c.baseCostId!==c.cashComparisonId)||
   c.crossborderLiabilityProjectionApplied!==(base.basis==='PUBLIC_US_PRIMARY_LIABILITY_PROXY'))throw new Error('PILOT_CARGO_COST_JOIN_MISMATCH')
  unique(c.liabilityAlternatives.map(a=>a.id),'PILOT_CARGO_LIABILITY_DUPLICATE')
  for(const a of c.liabilityAlternatives){
   unique(a.taxSensitivity.map(t=>t.id),'PILOT_CARGO_TAX_DUPLICATE')
   const add=(variant:string,alternatives:z.infer<typeof alternative>[])=>{
    unique(alternatives.map(p=>p.premiumAlternativeId),'PILOT_CARGO_PREMIUM_DUPLICATE')
    for(const p of alternatives){
     if(p.knownCvuComponentUsd!==c.knownCvuComponentUsd||!a.alternatives.some(b=>b.premiumAlternativeId===p.premiumAlternativeId))throw new Error('PILOT_CARGO_VARIANT_JOIN_MISMATCH')
     flattened.push({...p,id:key(c.baseCostId,a.id,variant,p.premiumAlternativeId)})
    }
   }
   add('PRIMARY',a.alternatives)
   for(const t of a.taxSensitivity)add(`TAX:${t.id}`,t.alternatives)
  }
 }
 const batch=applyCargoTripInsuranceToPartialCosts(flattened,rawPolicy,rawFx,rawSelection),projected=new Map(batch.costs.map(c=>[c.id,c]))
 const project=(c:z.infer<typeof row>)=>{
  const delta=batch.reference.pilotComponent.amountUsd
  const lookup=(a:z.infer<typeof liability>,variant:string,p:z.infer<typeof alternative>)=>({...p,...projected.get(key(c.baseCostId,a.id,variant,p.premiumAlternativeId))!,baseCostId:c.baseCostId})
  return {...c,cargoTripProjectionApplied:true,cargoTripComponent:batch.reference.pilotComponent,priorKnownCvuComponentUsd:c.knownCvuComponentUsd,
   knownCvuComponentUsd:delta===null?null:c.knownCvuComponentUsd+delta,
   liabilityAlternatives:c.liabilityAlternatives.map(a=>({...a,
    alternatives:a.alternatives.map(p=>lookup(a,'PRIMARY',p)),
    taxSensitivity:a.taxSensitivity.map(t=>({...t,alternatives:t.alternatives.map(p=>lookup(a,`TAX:${t.id}`,p))}))})),
   completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,quoteReady:false}
 }
 return {model:'FCM_PILOT_CARGO_VALUE_COST_PROJECTION_V1' as const,reference:batch.reference,priorCrossborderLiabilityBasis:base.basis,
  cash:base.cash.map(project),financed:base.financed.map(project),cargoTripProjectionApplied:true,
  primaryComparisonCount:1088,taxComparisonCount:2176,sourcePriceCalculationCount:1,
  existingCarrierCargoPolicyRemoved:false,boxChargedAgain:false,adminChargedAgain:false,emptyReturnMultipliesPremium:false,
  actualCargoObserved:false,coverageAcceptanceObserved:false,externalWrites:false,
  completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,quoteReady:false,adoptedValues:0}
}
