import {z} from 'zod'
import {allocateFixedCost} from '../../src/modules/engine/fixed-cost-allocation.js'
import {calculateDriverConnectivity} from './reference-driver-connectivity.js'

const text=z.string().min(1)
const schema=z.object({model:z.literal('FCM_SHARED_BOX_VISIBILITY_V1'),reviewedAt:z.string().datetime(),
 resourceId:z.literal('SHARED_TRAILER'),units:z.literal(1),scope:z.literal('PASSIVE_DETACHED_BOX_LOCATION_NOT_HUMAN_SECURITY_OR_INSURANCE'),
 installedSolarBundleNetMxn:z.literal(3500),monthlyGoldenNetMxn:z.literal(250),vatRate:z.literal(0.16),
 installationAllocationMonths:z.literal(24),allocationBasis:z.literal('PLANNING_SERVICE_HORIZON_NOT_OWNED_ASSET_DEPRECIATION'),
 deviceOwnership:z.literal('COMODATO_NOT_PURCHASE'),separateGenericInstallationAdded:z.literal(false),
 valuation:z.object({observationDate:z.literal('2026-10-01'),mxnPerUsd:z.literal(18.3688),taxBasis:z.literal('GROSS_NO_INPUT_VAT_CREDIT_ASSUMED')}).strict(),
 eldCorrection:z.object({devicePriceWithSubscriptionUsd:z.literal(0),freeShippingRequiresAnnualPlan:z.literal(true),monthlyShippingInstallationTaxUsd:z.null(),currentRegistrationVerified:z.literal(false)}).strict(),
 sources:z.array(z.object({id:text,url:z.string().url(),archive:z.object({file:z.string().startsWith('docs/research/sources/'),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),locator:text}).strict()).length(2),
 assumptions:z.array(text).min(7),completeD2DCostUsd:z.null(),quoteReady:z.literal(false),adoptedValues:z.literal(0)}).strict()

/** Recompute the validated upstream component instead of trusting caller-supplied
 * totals or already augmented results. One installed service, one physical box. */
export function calculateBoxVisibility(rawPolicy:unknown,rawDriverPolicy:unknown,rawCompany:unknown,rawFx:unknown){
 const policy=schema.parse(rawPolicy),base=calculateDriverConnectivity(rawDriverPolicy,rawCompany,rawFx)
 if(['DUKETRACK_INSTALLED_BOX','MATRACK_DEVICE_SUBSCRIPTION'].some(id=>policy.sources.filter(s=>s.id===id).length!==1))throw new Error('BOX_VISIBILITY_SOURCE_SET_MISMATCH')
 if(base.valuation.mxnPerUsd!==policy.valuation.mxnPerUsd||base.valuation.observationDate!==policy.valuation.observationDate)throw new Error('BOX_VISIBILITY_FX_MISMATCH')
 const installedGrossMxn=policy.installedSolarBundleNetMxn*(1+policy.vatRate)
 const recurringGrossMxn=policy.monthlyGoldenNetMxn*(1+policy.vatRate)
 const monthlyLines=[
  {id:'BOX_GOLDEN_SERVICE',monthlyMxn:recurringGrossMxn,kind:'RECURRING_SERVICE'},
  {id:'BOX_INSTALLED_SERVICE_ALLOCATION',monthlyMxn:installedGrossMxn/policy.installationAllocationMonths,kind:'NONRECURRING_SERVICE_ALLOCATION'}
 ].map(l=>({...l,resourceId:policy.resourceId,monthlyUsd:l.monthlyMxn/policy.valuation.mxnPerUsd}))
 const knownMonthlyComponentUsd=monthlyLines.reduce((s,l)=>s+l.monthlyUsd,0)
 const cycleAllocations=base.cycleAllocations.map(c=>{
  const r=c.resources.find(r=>r.resourceId===policy.resourceId)!
  const lines=monthlyLines.map(l=>({...l,amountUsd:allocateFixedCost(l.monthlyUsd*r.distanceExposure,l.monthlyUsd*r.timeExposure)}))
  return {cycleScenarioId:c.cycleScenarioId,resourceId:policy.resourceId,timeExposure:r.timeExposure,distanceExposure:r.distanceExposure,
   lines,fixedTripComponentUsd:lines.reduce((s,l)=>s+l.amountUsd,0)}
 })
 const join=(c:typeof base.cash[number])=>{
  const allocation=cycleAllocations.find(a=>a.cycleScenarioId===c.cycleScenarioId)!
  return {...c,priorAlternatives:c.alternatives,boxVisibilityFixedTripComponentUsd:allocation.fixedTripComponentUsd,
   alternatives:c.alternatives.map(a=>({...a,priorKnownCfuComponentUsd:a.knownCfuComponentUsd,priorTotalKnownComponentsUsd:a.totalKnownComponentsUsd,
    knownCfuComponentUsd:a.knownCfuComponentUsd+allocation.fixedTripComponentUsd,totalKnownComponentsUsd:a.totalKnownComponentsUsd+allocation.fixedTripComponentUsd})),
   boxVisibilityAddedOnce:true,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null}
 }
 return {...policy,sourceRef:'boxVisibility',monthlyLines,knownMonthlyComponentUsd,cycleAllocations,
  installedGrossMxn,recurringGrossMxn,firstMonthCashMxn:installedGrossMxn+recurringGrossMxn,
  firstMonthCashAddedAgain:false,fullContinuousHumanCoverageProven:false,routeRadioCoverageTested:false,
  cash:base.cash.map(join),financed:base.financed.map(join),boxVisibilityAddedOnce:true,cvusChanged:false,
  completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,externalWrites:false}
}
