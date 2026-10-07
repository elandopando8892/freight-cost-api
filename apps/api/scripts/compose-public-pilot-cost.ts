import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { readLocalDocument, readLocalDocumentBytes } from './assemble-economic-reference-cards.js'
import { consolidateBinationalReferenceBudget, REFERENCE_BUDGET_PINS } from './consolidate-binational-reference-budget.js'
import { composePublicMonthlyBudget } from './compose-public-monthly-budget.js'
import { BinationalCostProjectionSchema, calculateBinationalBudgetCostProjection } from '../src/modules/engine/benchmark-binational-cost-projection.js'
import { BINATIONAL_RESOURCES } from '../src/modules/engine/benchmark-binational-budget.js'
import { auditPublicModelSectionClosure } from './lib/public-model-section-closure.js'
import { calculateUsDriverPlanning, readUsDriverPlanning } from './lib/reference-us-driver-planning.js'
import { calculateMxFoodEmployerPlanning } from './lib/reference-mx-food-employer-planning.js'
import { calculatePilotVariableScenarios } from './lib/reference-pilot-variable.js'
import { calculateOperatingFluids } from './lib/reference-operating-fluids.js'
import { PUBLIC_LIABILITY_ALTERNATIVE_IDS } from './lib/reference-crossborder-liability-forecast.js'

type Research = ReturnType<typeof consolidateBinationalReferenceBudget>
type Input = z.infer<typeof BinationalCostProjectionSchema>
type Concept = Input['variableCosts'][number]['conceptId']
type Resource = typeof BINATIONAL_RESOURCES[number]
export const PublicPilotCostOptionsSchema = z.object({
 monthlyBudget: z.object({ cashTaxScenario: z.enum(['NET_PLUS_VAT','GROSS_INCLUDES_VAT']),
  financeMonthlyScenarioId: z.string().min(1).nullable(), boxInsuranceAlternativeId: z.enum(['PUBLIC_GUIDE_LOW','PUBLIC_GUIDE_HIGH']),
  mxYardAlternativeId: z.enum(['NET_PLUS_VAT_RESERVE','PRICE_ALREADY_GROSS_SENSITIVITY']),
  foreignLiabilityAlternativeId: z.enum(PUBLIC_LIABILITY_ALTERNATIVE_IDS).nullable().optional(), }).strict(),
 restInterpretation: z.enum(['RATE_EXCLUDES_WEEKLY_REST','RATE_INCLUDES_WEEKLY_REST']),
 defFraction: z.union([z.literal(.03),z.literal(.04),z.literal(.05)]),
 borderLinkBasis: z.enum(['UNRESOLVED_LINK','PUBLIC_LINK_FORECAST']),
 bobtailWearBasis: z.enum(['UNPRICED','IMT_C3_NON_ARTICULATED_PROXY']),
 usMaintenanceBasis: z.enum(['TTI_UNRESOLVED_LUBE','ATRI2024_ALL_RM_PLANNING']).optional(),
 usDriverBasis: z.enum(['ATRI2024_MILEAGE_PARTIAL','BLS2025_ECEC2026_MIE_PLANNING']).optional(),
 mxFoodEmployerBasis: z.enum(['UNRESOLVED_FOOD_PAYROLL','REMUNERATIVE_FOOD_NL_EXEMPT_PLANNING']).optional(),
}).strict()
const sourceSchema = z.object({id:z.string().min(1),url:z.string().url(),locator:z.string().optional()}).passthrough()
const sourceDocumentSchema = z.object({sources:z.array(sourceSchema).min(1)}).passthrough()
export const US_MAINTENANCE_PLANNING_PIN = {
 id:'usMaintenancePlanning',file:'docs/research/B2_US_MAINTENANCE_PLANNING_2026-10-03.json',
 sha256:'0eab0a22dbf81f074080f305ae44afbe9a1c14f106b920e2544c9e4c637306a1',
} as const
export const US_DRIVER_PLANNING_PIN = {
 id:'usDriverHourlyPlanning',file:'docs/research/B2_US_DRIVER_HOURLY_PLANNING_2026-10-03.json',
 sha256:'d997a9837b3ea3859a2d13bbf5aa58b5dcc661cd05b8af29fa06e2d1512b7cd4',
} as const
export const MX_FOOD_EMPLOYER_PLANNING_PIN = {
 id:'mxFoodEmployerPlanning',file:'docs/research/B2_MX_FOOD_EMPLOYER_PLANNING_2026-10-03.json',
 sha256:'1276b3df491fac11166cfd38428a55aa09658726e2397da253762e0b29c4be2c',
} as const
const maintenancePlanningSchema=z.object({
 model:z.literal('FCM_US_ATRI2024_MAINTENANCE_PLANNING_V1'),operationsYear:z.literal(2024),publicationYear:z.literal(2025),
 maintenanceUsdPerInternationalMile:z.literal(.198),internationalMileKm:z.literal(1.609344),
 scope:z.literal('ATTACHED_TRACTOR_TRAILER_COMPOSITE'),
 sourceBoundary:z.literal('ALL_REPAIR_MAINTENANCE_INCLUDING_LABOR_ROADSIDE_EXCLUDING_TIRES'),
 routineLubricationTreatment:z.literal('DECLARED_ALL_MAINTENANCE_PLANNING_INFERENCE_NOT_EXPLICIT_SURVEY_MICRODATA'),
 replacesTtiAggregate:z.literal(true),extraLubricantsAdded:z.literal(false),tiresOrDefIncluded:z.literal(false),
 sources:z.tuple([sourceSchema.extend({id:z.literal('ATRI2025_MAINTENANCE_ORIGINAL'),archive:z.object({
  file:z.literal('docs/research/sources/ATRI_OPSCOST_2025_REVIEW_20261001.pdf'),
  sha256:z.literal('581b91b68a76f232102a63f543eff92bb59c9478556b164d84d2be85118902f8'),
 }).strict()})]),adoptedValues:z.literal(0),quoteReady:z.literal(false),
}).passthrough()
const close = (a:number,b:number) => Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-7
const one = <T>(rows:readonly T[],predicate:(row:T)=>boolean,code:string):T => {
 const found=rows.filter(predicate)
 if(found.length!==1) throw new Error(code)
 return found[0]
}

/** Connect pinned public components to the existing 20-concept compositor.
 * Partial wages, lubrication and travel inputs retain priced parts and missing
 * scope separately. No aggregate old operating total is added to the new one. */
export function composePublicPilotCost(r:Research,rawOptions:unknown,readSource=readLocalDocument,readBinarySource=readLocalDocumentBytes){
 const options=PublicPilotCostOptionsSchema.parse(rawOptions)
 if(options.borderLinkBasis!==r.borderLinkBasis||options.bobtailWearBasis!==r.bobtailWearBasis)
  throw new Error('PILOT_COST_RESEARCH_BASIS_MISMATCH')
 const documentBody=(id:string) => {
  const pin=one(REFERENCE_BUDGET_PINS,p=>p.id===id,'PILOT_COST_PIN_NOT_FOUND')
  const observed=one(r.sourcePins,p=>p.id===id,'PILOT_COST_RESEARCH_PIN_NOT_FOUND')
  if(pin.sha256!==observed.sha256||pin.file!==observed.file)throw new Error('PILOT_COST_PIN_IDENTITY')
  const body=readSource(pin.file)
  if(createHash('sha256').update(body).digest('hex')!==pin.sha256)throw new Error(`PILOT_COST_SOURCE_HASH:${id}`)
  return JSON.parse(body) as unknown
 }
 const document=(id:string)=>sourceDocumentSchema.parse(documentBody(id)).sources
 const fuelSources=document('fuelReference'),wearSources=document('maintenanceReference')
 // A balanced intermediate total is not proof of its public inputs. Rebuild
 // with pinned policies and the same declared physical cycle before allowing
 // incoming road/wear/idle/DEF amounts to enter the current CVU composition.
 const verifiedVariables=calculatePilotVariableScenarios(documentBody('pilotVariables'),r.supportingPilotCycleExposure,
  documentBody('variableComponents'),documentBody('fuelReference'),documentBody('maintenanceReference'),
  r.supportingDriverEconomics,documentBody('datedFx'))
 if(JSON.stringify(verifiedVariables)!==JSON.stringify(r.supportingPilotVariableEconomics))
  throw new Error('PILOT_COST_VARIABLE_RECONSTRUCTION')
 const verifiedFluids=calculateOperatingFluids(documentBody('operatingFluids'),r.supportingPilotTripSupplements,
  verifiedVariables,r.supportingPilotOrdinaryDuty,documentBody('datedFx'))
 // Old cash/finance alternatives are not reused by this compositor. Compare
 // only the policy, source lineage, quantities and rates actually consumed.
 const fluidInputs=(f:typeof verifiedFluids)=>({dieselBoundary:f.dieselBoundary,def:f.def,idle:f.idle,
  sources:f.sources,mxDefUnitMxn:f.mxDefUnitMxn,usDefUnitUsd:f.usDefUnitUsd,scenarios:f.scenarios})
 if(JSON.stringify(fluidInputs(verifiedFluids))!==JSON.stringify(fluidInputs(r.supportingOperatingFluids)))
  throw new Error('PILOT_COST_FLUID_RECONSTRUCTION')
 const driverSources=[document('mxEmployerRules'),document('nlPayrollTax'),document('mxWorkRisk')].flat()
 const capacitySources=document('pilotCycle')
 const maintenanceBasis=options.usMaintenanceBasis??'TTI_UNRESOLVED_LUBE'
 const maintenancePlanning=maintenanceBasis==='ATRI2024_ALL_RM_PLANNING'?(()=>{
  const body=readSource(US_MAINTENANCE_PLANNING_PIN.file)
  if(createHash('sha256').update(body).digest('hex')!==US_MAINTENANCE_PLANNING_PIN.sha256)throw new Error('PILOT_US_MAINTENANCE_POLICY_HASH')
  const policy=maintenancePlanningSchema.parse(JSON.parse(body)),archive=policy.sources[0].archive
  const prior=r.supportingDriverEconomics.usSource.archive
  if(prior?.file!==archive.file||prior.sha256!==archive.sha256)throw new Error('PILOT_US_MAINTENANCE_ARCHIVE_IDENTITY')
  if(createHash('sha256').update(readBinarySource(archive.file)).digest('hex')!==archive.sha256)throw new Error('PILOT_US_MAINTENANCE_ARCHIVE_HASH')
  return policy
 })():null
 const usDriverBasis=options.usDriverBasis??'ATRI2024_MILEAGE_PARTIAL'
 const driverPlanning=usDriverBasis==='BLS2025_ECEC2026_MIE_PLANNING'?(()=>{
  const body=readSource(US_DRIVER_PLANNING_PIN.file)
  if(createHash('sha256').update(body).digest('hex')!==US_DRIVER_PLANNING_PIN.sha256)throw new Error('PILOT_US_DRIVER_POLICY_HASH')
  return readUsDriverPlanning(JSON.parse(body))
 })():null
 const mxFoodEmployerBasis=options.mxFoodEmployerBasis??'UNRESOLVED_FOOD_PAYROLL'
 const mxFoodPlanning=mxFoodEmployerBasis==='REMUNERATIVE_FOOD_NL_EXEMPT_PLANNING'?(()=>{
  const body=readSource(MX_FOOD_EMPLOYER_PLANNING_PIN.file)
  if(createHash('sha256').update(body).digest('hex')!==MX_FOOD_EMPLOYER_PLANNING_PIN.sha256)throw new Error('PILOT_MX_FOOD_POLICY_HASH')
  return calculateMxFoodEmployerPlanning(JSON.parse(body),r,documentBody('mxDriverForecast'))
 })():null
 const monthly=composePublicMonthlyBudget(r,options.monthlyBudget,readSource)
 const fx=r.supportingPilotVariableEconomics.fx.mxnPerUsd
 const cases=monthly.knownCfuAllocations.map(allocation=>{
  const cycleId=allocation.cycleId,budget=structuredClone(monthly.budget)
  const variables=one(r.supportingPilotVariableEconomics.scenarios,s=>s.cycleScenarioId===cycleId,'PILOT_COST_VARIABLE_CYCLE')
  const payroll=one(r.supportingPilotOrdinaryDuty.driver.scenarios,s=>s.cycleScenarioId===cycleId&&s.restInterpretation===options.restInterpretation,'PILOT_COST_PAYROLL_CYCLE')
  const fluids=one(r.supportingOperatingFluids.scenarios,s=>s.cycleScenarioId===cycleId,'PILOT_COST_FLUID_CYCLE')
  const food=one(r.supportingPilotTripSupplements.cycleAllocations,s=>s.cycleScenarioId===cycleId,'PILOT_COST_FOOD_CYCLE').mxFood
  const road=one(r.supportingPilotRoadBorderEconomics.scenarios,s=>s.cycleScenarioId===cycleId,'PILOT_COST_ROAD_CYCLE')
  const bobtail=one(r.supportingMxBobtailWearReference.scenarios,s=>s.cycleScenarioId===cycleId,'PILOT_COST_BOBTAIL_CYCLE')
  if(variables.rows.length!==9||new Set(variables.rows.map(v=>v.id)).size!==9)throw new Error('PILOT_COST_VARIABLE_ROW_IDENTITY')
  if(!close(variables.rows.reduce((sum,v)=>sum+v.amountUsd,0),variables.knownVariableComponentSubtotalUsd))throw new Error('PILOT_COST_VARIABLE_SUM')
  for(const v of variables.rows){
   if(!close(v.km*v.nativePerKm,v.amountNative)||!close(v.amountNative/(v.nativeCurrency==='MXN'?fx:1),v.amountUsd))
    throw new Error('PILOT_COST_VARIABLE_ARITHMETIC')
  }
  if(!close(payroll.variableWageAndEmployerComponentUsd+payroll.fixedEmployerComponentUsd,payroll.wageAndKnownEmployerComponentUsd)||
   !close(payroll.fixedContributionMonthlyMxn/fx/payroll.compatibleKnownCyclesPerMonth,payroll.fixedEmployerComponentUsd))
   throw new Error('PILOT_COST_PAYROLL_PARTITION')
  const evidence=(tag:string,rawSources:unknown,owners:Resource[]= [...BINATIONAL_RESOURCES])=>{
   const sources=z.array(sourceSchema).min(1).parse(rawSources)
   if(new Set(sources.map(s=>s.id)).size!==sources.length)throw new Error('PILOT_COST_DUPLICATE_SOURCE')
   const ids=sources.map(s=>`PILOT:${tag}:${s.id}`)
   if(budget.evidence.some(e=>ids.includes(e.id)))throw new Error('PILOT_COST_EVIDENCE_OVERWRITE')
   budget.evidence.push(...sources.map((s,i)=>({id:ids[i],url:s.url,
    locator:s.locator??`${tag}: source dossier retained in the hash-pinned research; original period and applicability unchanged.`,
    observedAt:'2026-10-03',referencePeriod:budget.referencePeriod!,groupReference:budget.groupReference,resourceIds:owners,
    profileReferences:budget.resources.filter(p=>owners.includes(p.resourceId)).map(p=>({resourceId:p.resourceId,profileReference:p.profileReference!})),
    kind:'DOCUMENTED_PUBLIC_MODEL' as const,
    limitations:'Local assembly date, not source refresh. Forecast transfer under explicit selected hypotheses; differing historical periods and unmapped target asset/geography retained in pinned dossiers. Not an observed, calibrated or insured carrier operation.',
   })))
   return ids
  }
  const fuelRefs=evidence('FUEL',fuelSources),wearRefs=evidence('ATTACHED_WEAR',wearSources)
  const mxPayrollRefs=evidence('MX_PAYROLL',driverSources),usPayrollRefs=evidence('US_PAYROLL',
   driverPlanning?driverPlanning.sources:[r.supportingDriverEconomics.usSource],driverPlanning?['US_TRACTOR']:[...BINATIONAL_RESOURCES])
  const fluidRefs=evidence('FLUIDS',r.supportingOperatingFluids.sources),foodRefs=evidence('MX_FOOD',r.supportingPilotTripSupplements.sources)
  const mxFoodEmployerRefs=mxFoodPlanning?evidence('MX_FOOD_EMPLOYER',mxFoodPlanning.sources,['MX_TRACTOR']):[]
  const mxFoodEmployerPlanning=mxFoodPlanning?one(mxFoodPlanning.scenarios,s=>s.cycleScenarioId===cycleId&&s.restInterpretation===options.restInterpretation,'PILOT_MX_FOOD_PAYROLL_CYCLE'):null
  const roadRefs=evidence('KNOWN_ROAD_BORDER',r.supportingPilotRoadBorderEconomics.sources)
  const exposureRefs=evidence('CAPACITY',capacitySources)
  const costRows:Input['variableCosts']=[]
  const add=(id:Concept,value:number|null,refs:string[],derivation:string,remaining?:string)=>{
   const owner:Resource=id.startsWith('US_')?'US_TRACTOR':id==='SUPPLEMENTAL_CARGO_VALUE_INSURANCE'?'SHARED_TRAILER':'MX_TRACTOR'
   costRows.push({conceptId:id,resourceId:owner,disposition:value===null?'MISSING':remaining?'DOCUMENTED_PARTIAL':'DOCUMENTED_COMPONENT',
    amountUsd:value,evidenceIds:value===null?[]:refs,derivation:value===null?null:derivation,
    exclusionOrZeroRationale:null,unresolvedRationale:remaining??null})
  }
  const row=(id:string)=>one(variables.rows,v=>v.id===id,`PILOT_COST_VARIABLE_ROW:${id}`).amountUsd
  add('MX_ROAD_FUEL',row('MX_FUEL'),fuelRefs,'Road-only diesel: whole tractor cycle km × public 483.92 L/1000km × dated MX price / FIX. Not box fuel or mixed idle fuel.')
  add('US_ROAD_FUEL',row('US_FUEL'),fuelRefs,'Whole US tractor cycle km / international mile / public heavy-bin mpg × dated PADD3 price. Not route purchase or measured efficiency.')
  const fluid=options.defFraction===fluids.reference.fraction?fluids.reference:
   one(fluids.sensitivity,s=>s.fraction===options.defFraction,'PILOT_COST_DEF_FRACTION')
  for(const [id,sourceId] of [['MX_IDLE_FUEL','MX_IDLE_DIESEL_RESERVE'],['US_IDLE_FUEL','US_IDLE_DIESEL_RESERVE'],['MX_DEF','MX_DEF'],['US_DEF','US_DEF']] as const){
   const f=one(fluid.lines,l=>l.id===sourceId,'PILOT_COST_FLUID_ROW')
   if(!close(f.quantity*f.unitNative/(f.currency==='MXN'?fx:1),f.amountUsd))throw new Error('PILOT_COST_FLUID_ARITHMETIC')
   add(id,f.amountUsd,fluidRefs,`${sourceId}: consumed public-model volume × normalized unit price; DEF fraction ${options.defFraction}, including idle reserve once, no package cash added again.`)
  }
  add('MX_DRIVER_TOTAL',mxFoodEmployerPlanning?.driverVariableAmountUsd??payroll.variableWageAndEmployerComponentUsd,[...mxPayrollRefs,...mxFoodEmployerRefs],
   `${options.restInterpretation}: replaces original advertised MX pay once with forecast income-linked wage/benefit/contribution components. Fixed EM quota excluded here and allocated separately to CFU.${mxFoodEmployerPlanning?' Declared remunerative food updates benefits and per-person contribution bases; NL direct-food exemption separate from federal integration. Adds incremental employer cost only; direct300MXN/day remains once in travel row, not duplicated in driver wages.':''}`,
   'PTU/extra benefits, dated roster applicability, Sunday/holiday premiums and wait compensation unresolved. Known normative components do not certify complete driver cost.')
  const usDriverPlanning=driverPlanning?calculateUsDriverPlanning(driverPlanning,r.supportingPilotCycleExposure,
   one(r.supportingPilotOrdinaryDuty.scenarios,s=>s.id===cycleId,'PILOT_COST_US_ORDINARY_CYCLE')):null
  if(usDriverPlanning)add('US_DRIVER_TOTAL',usDriverPlanning.knownOrdinaryDriverAndMieUsd,usPayrollRefs,
   'Explicit ordinary hourly-employee planning alternative: BLS mean driver wage × broader ECEC total/wage ratio × declared paid duties, including synchronization wait; movement off-duty/recovery rest excluded from salary. Separate IRS transportation CONUS80USD allowance per started assigned24h block; sleeper-cab/no routine hotel hypothesis. Replaces ATRI mileage wages/benefits/per-diem wholly; no second statutory/bonus percentage, salary guarantee, rest wage or tax deduction. Not matched carrier calibration or all possible travel coverage.')
  else add('US_DRIVER_TOTAL',row('US_DRIVER_PAY'),usPayrollRefs,'Selected ATRI small-fleet wages/benefits per mile × whole US cycle mileage; reported per diem retained within aggregate, no extra ECEC percentage.',
   'Additional wait pay, incentives/bonuses and full statutory employer scope are not established by the selected published aggregate.')
  add('MX_ATTACHED_MAINT_LUBE',row('MX_MAINT')+row('MX_LUBE'),wearRefs,'Disjoint IMT maintenance labor/parts plus lubricants × attached MX distance, composite tractor+box once.')
  const usMaintenanceRow=one(variables.rows,v=>v.id==='US_MAINT','PILOT_COST_VARIABLE_ROW:US_MAINT')
  if(usMaintenanceRow.nativeCurrency!=='USD')throw new Error('PILOT_US_MAINTENANCE_CURRENCY')
  const usMaintenancePlanning=maintenancePlanning?{
   basis:maintenanceBasis,operationsYear:maintenancePlanning.operationsYear,attachedKm:usMaintenanceRow.km,
   usdPerMile:maintenancePlanning.maintenanceUsdPerInternationalMile,
   amountUsd:usMaintenanceRow.km/maintenancePlanning.internationalMileKm*maintenancePlanning.maintenanceUsdPerInternationalMile,
   routineLubricationIsPlanningInference:true,extraLubricantsAdded:false,
  }:null
  if(maintenancePlanning&&usMaintenancePlanning){
   const refs=evidence('US_ATRI_ALL_MAINT',maintenancePlanning.sources,['US_TRACTOR','SHARED_TRAILER'])
   add('US_ATTACHED_MAINT_LUBE',usMaintenancePlanning.amountUsd,refs,
    'Explicit ATRI2024 all-R&M planning alternative: US attached km /1.609344 ×0.198USD/mile, replacing TTI once. Routine oil/lube included as declared inference of all maintenance, not explicitly named/measured survey microdata. Tyres/DEF excluded, no second box wear or oil reserve. Historical broad-cohort transfer, not matched-asset calibration.')
  }else add('US_ATTACHED_MAINT_LUBE',row('US_MAINT'),wearRefs,'TTI public repair/maintenance rate × US attached distance, tractor+box composite once.',
    'Separate lubricant coverage is unresolved; neither add an invented lubricant price nor assert it is already included.')
  add('MX_ATTACHED_TIRES',row('MX_TIRES'),wearRefs,'IMT composite tire wear × MX attached km; no second trailer variable charge.')
  add('US_ATTACHED_TIRES',row('US_TIRES'),wearRefs,'TTI composite tire wear × US attached km; no second trailer variable charge.')
  if(options.bobtailWearBasis==='IMT_C3_NON_ARTICULATED_PROXY'){
   if(bobtail.mxBobtailKm<=0||options.borderLinkBasis!=='PUBLIC_LINK_FORECAST')throw new Error('PILOT_COST_BOBTAIL_QUANTITY_SCOPE')
   const refs=evidence('BOBTAIL_PROXY',[r.supportingMxBobtailWearReference.source],['MX_TRACTOR'])
   const part=(id:string)=>{
    const p=one(bobtail.rows,b=>b.id===id,'PILOT_COST_BOBTAIL_ROW')
    if(p.conditionalAmountUsd===null||!close(p.nativeMxnPerKm*p.km/fx,p.conditionalAmountUsd))throw new Error('PILOT_COST_BOBTAIL_ARITHMETIC')
    return p.conditionalAmountUsd
   }
   add('MX_BOBTAIL_MAINT_LUBE',part('maintenanceLabor')+part('maintenanceParts')+part('lubricants'),refs,
    'Explicit unmatched IMT C3 non-articulated sensitivity on disjoint forecast bobtail km; rates include rigid-body effects not separable or calibrated to Cascadia.')
   add('MX_BOBTAIL_TIRES',part('tires'),refs,'Explicit C3 ten-tire rate × forecast bobtail km, not measured Cascadia tire lifecycle or an attached box charge.')
  }else{
   add('MX_BOBTAIL_MAINT_LUBE',null,[],'No selected tractor-only wear hypothesis.')
   add('MX_BOBTAIL_TIRES',null,[],'No selected tractor-only wear hypothesis.')
  }
  add('MX_ROAD_TOLLS',road.knownRoadComponentsUsd,roadRefs,'Previously documented aggregate route components only; no new caseta lookup or claim of complete itinerary.',
   'Remaining itinerary/bobtail road coverage is unresolved; public component aggregate is not a whole-trip toll amount.')
  add('US_ROAD_TOLLS',null,[],'US inland toll input unresolved, not zero.')
  add('BRIDGE_TOLLS',road.knownBridgeComponentsUsd,roadRefs,'Previously calculated directional crossing components, no double bridge span or box fee.',
   'Direction/application of all selected crossing charges remains a planning transfer, not a verified complete crossing bill.')
  add('HANDOFF_INCREMENTAL_SERVICES',null,[],'Own relay does not automatically imply free handoff/border service; scope/cost input unresolved.')
  if(!close(food.occupiedCalendarDays*r.supportingPilotTripSupplements.mxFood.publishedMxnPerDay/fx,food.amountUsd))throw new Error('PILOT_COST_FOOD_ARITHMETIC')
  add('MX_TRAVEL_EXPENSES',food.amountUsd,foodRefs,'One occupied MX driver position × started away calendar days × separately published food allowance; not driver equipment or US per diem.',
   mxFoodEmployerPlanning?'Lodging/other applicable travel remains unresolved. Food employer treatment is a declared remunerative-cash/NL-food-exemption planning alternative, not a proven payroll or reimbursement exemption; allowance is not all travel costs.':'Lodging/other applicable travel and payroll/fiscal treatment remain unresolved; food allowance is not all travel costs.')
  add('SUPPLEMENTAL_CARGO_VALUE_INSURANCE',null,[],'Cargo value/responsibility selection pending; no illustrative cargo value selected automatically.')
  const input:Input={model:'FCM_BINATIONAL_BUDGET_COST_PROJECTION_V1',caseReference:'MEXICO_DF_FORT_SMITH_72916_WTB_OWN_RELAY',
   evidenceScope:'DOCUMENTED_PUBLIC_PLANNING',cycleScenarioId:cycleId,fundingMode:monthly.paymentMode as 'CASH'|'FINANCED',
   taxScopeRationale:'Mixed public native tax bases remain visible; no blanket VAT increment, FX only for MXN, no tax recoverability or homogeneous net invoice asserted.',budget,
   exposures:allocation.resources.map(s=>({resourceId:s.resourceId,totalCycleKm:s.cycleKm,cycleDays:s.cycleDays,
    productiveKmPerMonth:s.monthlyKm,productiveDaysPerMonth:s.monthlyProductiveDays,evidenceIds:exposureRefs,
    derivation:'Existing independently audited ordinary-duty cycle and paired box capacity; original dated trip/profile hypotheses retained, not observed truck itinerary.'})),
   fixedOperatingComponent:{conceptId:'MX_DRIVER_FIXED_EMPLOYER_QUOTA',resourceId:'MX_TRACTOR',
    monthlyUsd:payroll.fixedContributionMonthlyMxn/fx,compatibleCyclesPerMonth:payroll.compatibleKnownCyclesPerMonth,evidenceIds:mxPayrollRefs,
    derivation:'Existing fixed EM employer quota for primary/relief positions / FIX / compatible paired cycles; outside admin pool and income-linked CVU, not allocated a second time.'},
   variableCosts:costRows}
  const projection=calculateBinationalBudgetCostProjection(input)
  if(projection.issues.some(i=>!['MISSING_MONTHLY_AMOUNT','UNRESOLVED_VARIABLE_COMPONENT','UNRESOLVED_VARIABLE_REMAINDER'].includes(i.code)))
   throw new Error(`PILOT_COST_CONTRACT:${projection.issues.map(i=>i.code).join(',')}`)
  return {cycleId,projection,usMaintenancePlanning,usDriverPlanning,mxFoodEmployerPlanning,
   knownFixedAllocatedSubtotalUsd:allocation.knownAllocatedFixedSubtotalUsd+projection.fixedOperatingAllocationUsd!,
   knownCostComponentsUsd:allocation.knownAllocatedFixedSubtotalUsd+projection.fixedOperatingAllocationUsd!+projection.knownVariableSubtotalUsd!,
   completeCostUsd:null,knownAmountsAreCompleteOrLowerBounds:false}
 })
 const modelSectionClosure=auditPublicModelSectionClosure(monthly,cases)
 const fuelWearVerification={
  basis:'RECONSTRUCTED_FROM_PINNED_PUBLIC_INPUTS_AND_DECLARED_CYCLE_NOT_ONLY_INBOUND_SUMS',
  sourcePinIds:['pilotVariables','variableComponents','fuelReference','maintenanceReference','datedFx','operatingFluids'],
  checkedBoundaries:['ROAD_DIESEL_SEPARATE_FROM_IDLE','DEF_ON_ROAD_PLUS_IDLE_CONSUMPTION_ONCE',
   'CONSUMED_FLUID_NOT_FULL_CONTAINER_CASH','ATTACHED_WEAR_WITHOUT_SECOND_BOX_CHARGE',
   'MAINTENANCE_AND_TIRES_SEPARATE','US_MAINTENANCE_ALTERNATIVE_REPLACES_NOT_ADDS'],
  scenarios:verifiedFluids.scenarios.map(s=>({cycleId:s.cycleScenarioId,
   roadDiesel:s.roadDieselQuantity,roadPlusIdle:{mxLiters:s.mxTotalDieselLiters,usGallons:s.usTotalDieselGallons},
   selectedDefFraction:options.defFraction,sourceRefreshPerformed:false,actualConsumptionObserved:false})),
  canonicalMaintenanceMicroinputsCalibrated:false,legacyMaintenanceKernelChanged:false,
  calibrated:false,adoptedValues:0,
 }
 return {model:'FCM_B2_PUBLIC_PILOT_COST_INTEGRATION_V1',options,monthly,cases,modelSectionClosure,fuelWearVerification,usMaintenanceBasis:maintenanceBasis,usDriverBasis,mxFoodEmployerBasis,
  sourcePins:[...r.sourcePins,...(maintenancePlanning?[US_MAINTENANCE_PLANNING_PIN]:[]),...(driverPlanning?[US_DRIVER_PLANNING_PIN]:[]),...(mxFoodPlanning?[MX_FOOD_EMPLOYER_PLANNING_PIN]:[])],
  originalInputsChanged:false,calibrated:false,quoteReady:false,adoptedValues:0,externalWrites:false,
  completeCfuUsd:null,completeCvuUsd:null,completePilotCostUsd:null}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3)throw new Error('Usage: tsx compose-public-pilot-cost.ts JSON_OPTIONS (explicit dated research hypotheses)')
  const options=PublicPilotCostOptionsSchema.parse(JSON.parse(process.argv[2]))
  const research=consolidateBinationalReferenceBudget(undefined,undefined,'POSTAL_REFERENCE',options.borderLinkBasis,options.bobtailWearBasis)
  console.log(JSON.stringify(composePublicPilotCost(research,options),null,2));process.exitCode=2
 }catch(error){console.error(error instanceof Error?error.message:'Public pilot composition failed');process.exitCode=1}
}
