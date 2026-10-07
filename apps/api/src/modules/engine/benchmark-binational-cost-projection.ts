import {z} from 'zod'
import {BINATIONAL_RESOURCES, BinationalFixedBudgetSchema, reconcileBinationalFixedBudget} from './benchmark-binational-budget.js'
import {allocateFixedCost} from './fixed-cost-allocation.js'

const text=z.string().trim().min(1).max(2000),money=z.number().finite().nonnegative().max(1e9)
const resource=z.enum(BINATIONAL_RESOURCES)
/** Required coverage is owned by the compositor, not a caller-supplied empty list.
 * Composite US maintenance can exclude a separate lubricant charge explicitly;
 * an exclusion never asserts that the lubricant or work has no economic cost. */
export const PILOT_VARIABLE_CONCEPTS=[
 'MX_ROAD_FUEL','US_ROAD_FUEL','MX_IDLE_FUEL','US_IDLE_FUEL','MX_DEF','US_DEF',
 'MX_DRIVER_TOTAL','US_DRIVER_TOTAL','MX_ATTACHED_MAINT_LUBE','MX_BOBTAIL_MAINT_LUBE',
 'US_ATTACHED_MAINT_LUBE','MX_ATTACHED_TIRES','MX_BOBTAIL_TIRES','US_ATTACHED_TIRES',
 'MX_ROAD_TOLLS','US_ROAD_TOLLS','BRIDGE_TOLLS','HANDOFF_INCREMENTAL_SERVICES',
 'MX_TRAVEL_EXPENSES','SUPPLEMENTAL_CARGO_VALUE_INSURANCE',
] as const
const concept=z.enum(PILOT_VARIABLE_CONCEPTS)
export const BinationalCostProjectionSchema=z.object({
 model:z.literal('FCM_BINATIONAL_BUDGET_COST_PROJECTION_V1'),
 caseReference:z.literal('MEXICO_DF_FORT_SMITH_72916_WTB_OWN_RELAY'),
 evidenceScope:z.enum(['SYNTHETIC_VALIDATION','DOCUMENTED_PUBLIC_PLANNING']),
 cycleScenarioId:z.enum(['NETWORK_EXPECTED_EMPTY_PROXY','DEDICATED_EMPTY_SAME_BOX_RETURN']),
 fundingMode:z.enum(['CASH','FINANCED']),taxScopeRationale:text,
 budget:BinationalFixedBudgetSchema,
 exposures:z.array(z.object({resourceId:resource,totalCycleKm:money.positive(),cycleDays:money.positive(),
  productiveKmPerMonth:money.positive(),productiveDaysPerMonth:money.positive().max(31),
  evidenceIds:z.array(text).min(1),derivation:text}).strict()).length(3),
 // Driver fixed employer quota is outside the administrative fixed worksheet.
 // Recompute its allocation from the separately documented paired capacity.
 fixedOperatingComponent:z.object({conceptId:z.literal('MX_DRIVER_FIXED_EMPLOYER_QUOTA'),resourceId:z.literal('MX_TRACTOR'),
  monthlyUsd:money.positive(),compatibleCyclesPerMonth:money.positive(),evidenceIds:z.array(text).min(1),derivation:text,
 }).strict().optional(),
 variableCosts:z.array(z.object({conceptId:concept,resourceId:resource,
  disposition:z.enum(['DOCUMENTED_COMPONENT','DOCUMENTED_PARTIAL','DOCUMENTED_EXCLUSION','MISSING']),
  amountUsd:money.nullable(),evidenceIds:z.array(text),derivation:text.nullable(),
  exclusionOrZeroRationale:text.nullable(),
  unresolvedRationale:text.nullable().optional(),
 }).strict()).max(40),
}).strict()

/** A closure bridge, not another rate engine or an adoption gate. Recompute the
 * original conserved monthly pool and the existing MAX allocation; never accept
 * a supplied CFU/CVU/total. Numeric results remain documented scenarios, not
 * observed carrier cost, source verification, a purchase tariff or selling price. */
export function calculateBinationalBudgetCostProjection(raw:unknown){
 const input=BinationalCostProjectionSchema.parse(raw),budget=reconcileBinationalFixedBudget(input.budget)
 const fixedIssues=budget.issues.map(i=>({...i,field:`budget.${i.field}`}))
 const variableIssues:{field:string;code:string}[]=[]
 const sources=new Map(input.budget.evidence.map(s=>[s.id,s]))
 const validateEvidence=(ids:string[],owner:typeof BINATIONAL_RESOURCES[number],field:string,issues:{field:string;code:string}[])=>{
  if(!ids.length)issues.push({field,code:'MISSING_EVIDENCE'})
  if(new Set(ids).size!==ids.length)issues.push({field,code:'DUPLICATE_EVIDENCE_REFERENCE'})
  for(const id of ids){
   const s=sources.get(id),profile=input.budget.resources.find(r=>r.resourceId===owner)?.profileReference
   if(!s){issues.push({field,code:'UNKNOWN_EVIDENCE'});continue}
   if(s.kind==='CONTEXT_ONLY'||s.referencePeriod!==input.budget.referencePeriod||s.groupReference!==input.budget.groupReference||
    !s.resourceIds.includes(owner)||s.profileReferences.filter(p=>p.resourceId===owner&&p.profileReference===profile).length!==1)
    issues.push({field,code:'INCOMPATIBLE_MODEL_EVIDENCE'})
  }
 }
 for(const id of BINATIONAL_RESOURCES){
  const rows=input.exposures.filter(e=>e.resourceId===id)
  if(rows.length!==1){fixedIssues.push({field:`exposures.${id}`,code:'REQUIRE_ONE_RESOURCE_EXPOSURE'});continue}
  validateEvidence(rows[0].evidenceIds,id,`exposures.${id}`,fixedIssues)
 }
 const operatingIssues:{field:string;code:string}[]=[]
 const operating=input.fixedOperatingComponent
 if(operating){
  validateEvidence(operating.evidenceIds,operating.resourceId,'fixedOperatingComponent',operatingIssues)
  if(input.budget.expenses.some(e=>e.economicExpenseId===operating.conceptId))
   operatingIssues.push({field:'fixedOperatingComponent',code:'FIXED_OPERATING_ALREADY_IN_BUDGET'})
 }
 fixedIssues.push(...operatingIssues)
 const fixedOperatingAllocationUsd=!operating||operatingIssues.length?null:operating.monthlyUsd/operating.compatibleCyclesPerMonth
 for(const id of PILOT_VARIABLE_CONCEPTS){
  const rows=input.variableCosts.filter(c=>c.conceptId===id),field=`variableCosts.${id}`
  if(rows.length!==1){variableIssues.push({field,code:rows.length?'DUPLICATE_VARIABLE_CONCEPT':'MISSING_VARIABLE_CONCEPT'});continue}
  const row=rows[0]
  const expectedResource=id.startsWith('US_')?'US_TRACTOR':id==='SUPPLEMENTAL_CARGO_VALUE_INSURANCE'?'SHARED_TRAILER':'MX_TRACTOR'
  if(row.resourceId!==expectedResource)variableIssues.push({field,code:'VARIABLE_RESOURCE_MISMATCH'})
  if(row.disposition==='MISSING'){
   variableIssues.push({field,code:'UNRESOLVED_VARIABLE_COMPONENT'})
   if(row.amountUsd!==null)variableIssues.push({field,code:'MISSING_COMPONENT_HAS_AMOUNT'})
   continue
  }
  validateEvidence(row.evidenceIds,row.resourceId,field,variableIssues)
  if(!row.derivation)variableIssues.push({field,code:'MISSING_DERIVATION'})
  if(row.disposition==='DOCUMENTED_PARTIAL'){
   variableIssues.push({field,code:'UNRESOLVED_VARIABLE_REMAINDER'})
   if(!row.unresolvedRationale)variableIssues.push({field,code:'MISSING_PARTIAL_SCOPE_RATIONALE'})
  }else if(row.unresolvedRationale)variableIssues.push({field,code:'UNRESOLVED_SCOPE_REQUIRES_PARTIAL_DISPOSITION'})
  if(row.disposition==='DOCUMENTED_EXCLUSION'){
   if(row.amountUsd!==null||!row.exclusionOrZeroRationale)variableIssues.push({field,code:'INVALID_SCOPE_EXCLUSION'})
  }else{
   if(row.amountUsd===null)variableIssues.push({field,code:'MISSING_COMPONENT_AMOUNT'})
   if(row.amountUsd===0&&!row.exclusionOrZeroRationale)variableIssues.push({field,code:'ZERO_REQUIRES_EXPLICIT_BASIS'})
  }
 }
 // Stable order ensures one whole-cycle box allocation and deterministic sums.
 const resources=BINATIONAL_RESOURCES.map(resourceId=>{
  const exposure=input.exposures.find(e=>e.resourceId===resourceId)
  const monthly=budget.monthlyFixedUsdByResource?.[resourceId]??null
  const byKm=fixedIssues.length||monthly===null||!exposure?null:monthly*exposure.totalCycleKm/exposure.productiveKmPerMonth
  const byDays=fixedIssues.length||monthly===null||!exposure?null:monthly*exposure.cycleDays/exposure.productiveDaysPerMonth
  const cfuUsd=byKm===null||byDays===null?null:allocateFixedCost(byKm,byDays)+(resourceId==='MX_TRACTOR'?(fixedOperatingAllocationUsd??0):0)
  const rows=PILOT_VARIABLE_CONCEPTS.map(id=>input.variableCosts.find(c=>c.conceptId===id)).filter(c=>c?.resourceId===resourceId)
  const cvuUsd=variableIssues.length?null:rows.reduce((sum,c)=>sum+(c!.disposition==='DOCUMENTED_COMPONENT'?c!.amountUsd!:0),0)
  return {resourceId,monthlyFixedUsd:monthly,byDistanceUsd:byKm,byTimeUsd:byDays,cfuUsd,cvuUsd,
   costUsd:cfuUsd===null||cvuUsd===null?null:cfuUsd+cvuUsd}
 })
 const cfuUsd=fixedIssues.length?null:resources.reduce((sum,r)=>sum+r.cfuUsd!,0)
 const cvuUsd=variableIssues.length?null:resources.reduce((sum,r)=>sum+r.cvuUsd!,0)
 const productiveCostUsd=cfuUsd===null||cvuUsd===null?null:cfuUsd+cvuUsd
 const knownVariableEvidenceValid=sources.size===input.budget.evidence.length&&variableIssues.every(i=>['UNRESOLVED_VARIABLE_COMPONENT','UNRESOLVED_VARIABLE_REMAINDER'].includes(i.code))
 const knownVariableComponentsUsdByResource=knownVariableEvidenceValid?Object.fromEntries(BINATIONAL_RESOURCES.map(id=>[
  id,input.variableCosts.filter(c=>c.resourceId===id&&['DOCUMENTED_COMPONENT','DOCUMENTED_PARTIAL'].includes(c.disposition))
   .reduce((sum,c)=>sum+c.amountUsd!,0),
 ])):null
 return {model:input.model,caseReference:input.caseReference,evidenceScope:input.evidenceScope,
  cycleScenarioId:input.cycleScenarioId,fundingMode:input.fundingMode,
  status:productiveCostUsd===null?'INCOMPLETE' as const:'CALCULATED_DOCUMENTED_SCENARIO_ONLY' as const,
  issues:[...fixedIssues,...variableIssues],resources,budget,
  outputs:{matchedMonthlySubtotalUsd:budget.monthlyGroupTotalUsd===null||operatingIssues.length?null:budget.monthlyGroupTotalUsd+(operating?.monthlyUsd??0),cfuUsd,cvuUsd,productiveCostUsd,purchaseUsd:null,sellUsd:null},
  knownVariableComponentsUsdByResource,
  knownVariableSubtotalUsd:knownVariableComponentsUsdByResource===null?null:Object.values(knownVariableComponentsUsdByResource).reduce((sum,n)=>sum+n,0),
  knownSubtotalsAreCompleteOrLowerBounds:false,
  fixedOperatingAllocationUsd,
  lineage:input,calibrated:false,quoteReady:false,adoptedValues:0,externalWrites:false,
  sourceStatus:'DOCUMENTED_UNVERIFIED',actualCarrierCostObserved:false,
  fundingModeDeclaredNotObserved:true,missingAmountsDefaultedToZero:false,
  sharedBoxAllocationCount:fixedIssues.length?null:1,
 }
}
