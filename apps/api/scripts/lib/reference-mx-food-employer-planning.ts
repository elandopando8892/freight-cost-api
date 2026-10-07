import {z} from 'zod'
import {calculateMxDriverPublicForecast} from './reference-mx-driver-forecast.js'
import {countStartedCalendarDays} from './reference-pilot-trip-supplements.js'

type Research=ReturnType<typeof import('../consolidate-binational-reference-budget.js').consolidateBinationalReferenceBudget>
const policySchema=z.object({model:z.literal('FCM_MX_FOOD_EMPLOYER_PLANNING_V1'),referencePeriod:z.literal('2026-10'),
 foodMxnPerStartedDay:z.literal(300),foodIncomeTreatment:z.literal('DECLARED_REMUNERATIVE_CASH_WITH_WEEKLY_REST_INCLUDED'),
 sbcTreatment:z.literal('ANNUAL_MEAN_CASH_PROXY_WITH_EXISTING_PER_PERSON_CAPS_NOT_ACTUAL_BIMESTER'),
 nlDirectFoodTreatment:z.literal('DECLARED_ART160_I_G_FOOD_EXEMPT_NOT_REAL_TAX_DETERMINATION'),
 extraAccrualTreatment:z.literal('EXISTING_FIRST_ANNIVERSARY_HOLIDAY_VACATION_AGUINALDO_REFERENCE'),
 cashFoodChargedAgain:z.literal(false),workerWithholdingAdded:z.literal(false),
 sources:z.array(z.object({id:z.string().min(1),url:z.string().url(),locator:z.string().min(1)}).strict()).length(4),
 calibrated:z.literal(false),quoteReady:z.literal(false),adoptedValues:z.literal(0)}).passthrough()
const close=(a:number,b:number,code:string)=>{if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-b)>1e-7)throw new Error(`MX_FOOD_EMPLOYER_${code}`)}
export function readMxFoodEmployerPlanning(raw:unknown){
 const p=policySchema.parse(raw)
 const ids=['TIVUS_MX_FOOD_RECHECK','LFT_CASH_SALARY_2026','LSS_CASH_FOOD_2026','NL_PAYROLL_FOOD_2026']
 if(ids.some(id=>p.sources.filter(s=>s.id===id).length!==1))throw new Error('MX_FOOD_EMPLOYER_SOURCE_IDENTITY')
 return p
}

/** Reuse the same forecast twice to isolate only food-linked employer cost.
 * Direct food already sits in MX_TRAVEL_EXPENSES. No new wage/tax engine. */
export function calculateMxFoodEmployerPlanning(rawPolicy:unknown,r:Research,rawForecastPolicy:unknown){
 const policy=readMxFoodEmployerPlanning(rawPolicy),ordinary=r.supportingPilotOrdinaryDuty
 const physical=structuredClone(r.supportingPilotPhysicalCycle)
 const cycles=['NETWORK_EXPECTED_EMPTY_PROXY','DEDICATED_EMPTY_SAME_BOX_RETURN']
 for(const ids of [ordinary.scenarios.map(s=>s.id),physical.scenarios.map(s=>s.id),r.supportingPilotTripSupplements.cycleAllocations.map(s=>s.cycleScenarioId)]){
  if(ids.length!==2||cycles.some(id=>ids.filter(x=>x===id).length!==1))throw new Error('MX_FOOD_EMPLOYER_CYCLE_IDENTITY')
 }
 const foodScenarios=ordinary.scenarios.map(o=>{
  const clock=physical.scenarios.find(s=>s.id===o.id)!,food=r.supportingPilotTripSupplements.cycleAllocations.find(s=>s.cycleScenarioId===o.id)!.mxFood
  close(food.elapsedMxCycleDays,o.knownMxElapsedClockDays,'FOOD_CLOCK')
  const days=countStartedCalendarDays(o.knownMxElapsedClockDays,ordinary.shiftStartLocalHour)
  close(food.occupiedCalendarDays,days,'FOOD_DAYS')
  close(food.amountMxn,days*policy.foodMxnPerStartedDay,'FOOD_AMOUNT')
  close(food.amountUsd,food.amountMxn/r.supportingPilotVariableEconomics.fx.mxnPerUsd,'FOOD_FX')
  clock.knownMxElapsedClockDays=o.knownMxElapsedClockDays
  clock.knownUsClockDays=o.knownUsElapsedClockDays
  clock.knownBoxClockDays=o.knownBoxClockDays
  return {cycleScenarioId:o.id,amountMxn:food.amountMxn}
 })
 const calculate=(food?:unknown)=>calculateMxDriverPublicForecast(rawForecastPolicy,r.supportingPilotCycleExposure,physical,
  r.supportingMxVariableDriver,r.supportingPilotVariableEconomics,r.supportingPilotVariableEconomics.fx,food)
 const baseline=calculate(),withFood=calculate({scope:'DECLARED_REMUNERATIVE_FOOD_WITH_REST_INCLUDED_NL_DIRECT_FOOD_EXEMPT',scenarios:foodScenarios})
 if(ordinary.driver.scenarios.length!==4||new Set(ordinary.driver.scenarios.map(s=>`${s.cycleScenarioId}:${s.restInterpretation}`)).size!==4)throw new Error('MX_FOOD_EMPLOYER_PAYROLL_IDENTITY')
 const scenarios=withFood.scenarios.map(now=>{
  const before=baseline.scenarios.find(s=>s.cycleScenarioId===now.cycleScenarioId&&s.restInterpretation===now.restInterpretation)!
  const original=ordinary.driver.scenarios.find(s=>s.cycleScenarioId===now.cycleScenarioId&&s.restInterpretation===now.restInterpretation)!
  for(const key of ['compatibleKnownCyclesPerMonth','annualRoadWagesMxn','fixedContributionMonthlyMxn','variableWageAndEmployerComponentUsd','wageAndKnownEmployerComponentUsd'] as const)
   close(before[key],original[key],'BASELINE_IDENTITY')
  close(now.compatibleKnownCyclesPerMonth,before.compatibleKnownCyclesPerMonth,'CAPACITY')
  close(now.fixedContributionMonthlyMxn,before.fixedContributionMonthlyMxn,'FIXED_QUOTA')
  close(now.annualRoadWagesMxn,before.annualRoadWagesMxn,'ROAD_WAGES')
  const monthlyBenefitDeltaMxn=(now.additionalKnownMonthlyComponentsMxn-before.additionalKnownMonthlyComponentsMxn)-
   (now.monthlyContributionReferenceMxn-before.monthlyContributionReferenceMxn)-(now.monthlyStateTaxAccrualMxn-before.monthlyStateTaxAccrualMxn)
  const monthlyContributionDeltaMxn=now.monthlyContributionReferenceMxn-before.monthlyContributionReferenceMxn
  const monthlyStateTaxDeltaMxn=now.monthlyStateTaxAccrualMxn-before.monthlyStateTaxAccrualMxn
  const incrementalEmployerCostUsd=(monthlyBenefitDeltaMxn+monthlyContributionDeltaMxn+monthlyStateTaxDeltaMxn)/
   r.supportingPilotVariableEconomics.fx.mxnPerUsd/now.compatibleKnownCyclesPerMonth
  if([monthlyBenefitDeltaMxn,monthlyContributionDeltaMxn,monthlyStateTaxDeltaMxn,incrementalEmployerCostUsd].some(n=>!Number.isFinite(n)||n<0))throw new Error('MX_FOOD_EMPLOYER_DELTA_RANGE')
  close(now.variableWageAndEmployerComponentUsd-before.variableWageAndEmployerComponentUsd,incrementalEmployerCostUsd,'PARTITION')
  return {cycleScenarioId:now.cycleScenarioId,restInterpretation:now.restInterpretation,
   directFoodCycleMxn:now.foodRemunerationPlanning!.foodPerCycleMxn,foodIncome:now.foodRemunerationPlanning!,
   monthlyBenefitDeltaMxn,monthlyContributionDeltaMxn,monthlyStateTaxDeltaMxn,incrementalEmployerCostUsd,
   driverVariableAmountUsd:now.variableWageAndEmployerComponentUsd,baselineDriverVariableAmountUsd:before.variableWageAndEmployerComponentUsd,
   fixedQuotaChanged:false,directFoodChargedAgain:false,capacityChanged:false,
   primary:now.primary,relief:now.relief,annualTaxableWagesMxn:now.annualTaxableWagesMxn,
   actualPayrollOrExemptionProven:false,completeDriverCostUsd:null,completeTravelCostUsd:null}
 })
 return {...policy,scenarios,calibrated:false,quoteReady:false,adoptedValues:0,externalWrites:false}
}
