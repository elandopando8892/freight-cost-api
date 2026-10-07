import { beforeAll, describe, expect, it } from 'vitest'
import { consolidateBinationalReferenceBudget } from '../scripts/consolidate-binational-reference-budget.js'
import { composePublicPilotCost, US_MAINTENANCE_PLANNING_PIN, US_DRIVER_PLANNING_PIN, MX_FOOD_EMPLOYER_PLANNING_PIN } from '../scripts/compose-public-pilot-cost.js'
import { readLocalDocument, readLocalDocumentBytes } from '../scripts/assemble-economic-reference-cards.js'
import { calculateBinationalBudgetCostProjection, PILOT_VARIABLE_CONCEPTS } from '../src/modules/engine/benchmark-binational-cost-projection.js'
import { auditPublicModelSectionClosure } from '../scripts/lib/public-model-section-closure.js'
import { PARAMETER_DEFINITIONS } from '../src/data/parameter-catalog.js'
import { calculateUsDriverPlanning, readUsDriverPlanning } from '../scripts/lib/reference-us-driver-planning.js'
import { calculateMxFoodEmployerPlanning, readMxFoodEmployerPlanning } from '../scripts/lib/reference-mx-food-employer-planning.js'
import { calculateMx2026ContributionReference } from '../scripts/lib/reference-mx-variable-driver.js'
import { PUBLIC_LIABILITY_ALTERNATIVE_IDS } from '../scripts/lib/reference-crossborder-liability-forecast.js'

const options={monthlyBudget:{cashTaxScenario:'NET_PLUS_VAT',financeMonthlyScenarioId:null,
 boxInsuranceAlternativeId:'PUBLIC_GUIDE_LOW',mxYardAlternativeId:'NET_PLUS_VAT_RESERVE'},
 restInterpretation:'RATE_EXCLUDES_WEEKLY_REST',defFraction:.04,
 borderLinkBasis:'PUBLIC_LINK_FORECAST',bobtailWearBasis:'IMT_C3_NON_ARTICULATED_PROXY'}
let research:ReturnType<typeof consolidateBinationalReferenceBudget>
let result:ReturnType<typeof composePublicPilotCost>
beforeAll(()=>{
 research=consolidateBinationalReferenceBudget(undefined,undefined,'POSTAL_REFERENCE','PUBLIC_LINK_FORECAST','IMT_C3_NON_ARTICULATED_PROXY')
 result=composePublicPilotCost(research,options)
})
const amount=(cycle:number,id:string)=>result.cases[cycle].projection.lineage.variableCosts.find(c=>c.conceptId===id)!.amountUsd!
describe('public inventory -> monthly fixed and variable pilot composition',()=>{
 it.each(PUBLIC_LIABILITY_ALTERNATIVE_IDS)('integrates %s as one MX fixed pool, not CVU or a complete cost',id=>{
  const before=JSON.stringify(research)
  const selected=composePublicPilotCost(research,{...options,monthlyBudget:{...options.monthlyBudget,foreignLiabilityAlternativeId:id}})
  const monthly=selected.monthly.liabilityPlanning!.monthlyPlanningUsd
  selected.cases.forEach((c,i)=>{
   const base=result.cases[i],allocation=selected.monthly.knownCfuAllocations[i]
   const mx=allocation.resources.find(r=>r.resourceId==='MX_TRACTOR')!
   const delta=monthly*Math.max(mx.cycleKm/mx.monthlyKm,mx.cycleDays/mx.monthlyProductiveDays)
   expect(c.knownFixedAllocatedSubtotalUsd-base.knownFixedAllocatedSubtotalUsd).toBeCloseTo(delta,9)
   expect(c.knownCostComponentsUsd-base.knownCostComponentsUsd).toBeCloseTo(delta,9)
   expect(c.projection.lineage.variableCosts).toEqual(base.projection.lineage.variableCosts)
   expect(c.projection.fixedOperatingAllocationUsd).toBe(base.projection.fixedOperatingAllocationUsd)
   expect(c.projection.lineage.budget.expenses.filter(e=>e.economicExpenseId==='MX_TRACTOR_FOREIGN_LIABILITY_PUBLIC_PROXY')).toHaveLength(1)
   expect(c.projection.issues.map(x=>x.code)).toEqual(base.projection.issues.map(x=>x.code))
   expect(c.completeCostUsd).toBeNull()
   expect(c.projection.outputs.productiveCostUsd).toBeNull()
  })
  expect(selected.fuelWearVerification).toEqual(result.fuelWearVerification)
  expect(selected).toMatchObject({calibrated:false,quoteReady:false,adoptedValues:0,externalWrites:false,
   completeCfuUsd:null,completeCvuUsd:null,completePilotCostUsd:null})
  expect(JSON.stringify(research)).toBe(before)
 })
 it('rejects a changed foreign policy through the complete compositor source reader',()=>{
  expect(()=>composePublicPilotCost(research,{...options,monthlyBudget:{...options.monthlyBudget,
   foreignLiabilityAlternativeId:PUBLIC_LIABILITY_ALTERNATIVE_IDS[0]}},file=>
   readLocalDocument(file)+(file.includes('B2_CROSSBORDER_LIABILITY_FORECAST_2026-10-03.json')?' ':'')))
   .toThrow('MONTHLY_LIABILITY_POLICY_HASH')
 })
 it('rebuilds pinned road/wear and fluid inputs without adopting canonical microvalues',()=>{
  const verification=result.fuelWearVerification
  expect(verification.sourcePinIds).toEqual(['pilotVariables','variableComponents','fuelReference','maintenanceReference','datedFx','operatingFluids'])
  expect(verification.canonicalMaintenanceMicroinputsCalibrated).toBe(false)
  expect(verification.legacyMaintenanceKernelChanged).toBe(false)
  expect(verification.adoptedValues).toBe(0)
  for(const s of verification.scenarios){
   const fluids=research.supportingOperatingFluids.scenarios.find(f=>f.cycleScenarioId===s.cycleId)!
   expect(s.roadPlusIdle.mxLiters).toBeCloseTo(s.roadDiesel.mxLiters+fluids.mxIdleHours*.8*3.785411784,10)
   expect(s.roadPlusIdle.usGallons).toBeCloseTo(s.roadDiesel.usGallons+fluids.usIdleHours*.8,10)
   expect(s.sourceRefreshPerformed).toBe(false)
   expect(s.actualConsumptionObserved).toBe(false)
  }
 })
 it.each(['MX_FUEL','US_FUEL','MX_MAINT','MX_LUBE','MX_TIRES','US_MAINT','US_TIRES'])('rejects a self-consistent but ungrounded %s intermediate rate',id=>{
  const changed=structuredClone(research),v=changed.supportingPilotVariableEconomics.scenarios[0]
  const line=v.rows.find(r=>r.id===id)!
  line.nativePerKm+=.01
  line.amountNative=line.km*line.nativePerKm
  line.amountUsd=line.amountNative/(line.nativeCurrency==='MXN'?18.3688:1)
  v.knownVariableComponentSubtotalUsd=v.rows.reduce((sum,r)=>sum+r.amountUsd,0)
  if(id==='MX_FUEL')v.conditionalRoadFuelQuantity.mxLiters=line.amountNative/27
  if(id==='US_FUEL')v.conditionalRoadFuelQuantity.usGallons=line.amountNative/5.955
  // The old unit multiplication, currency conversion and sum checks all pass;
  // source-derived quantities/rates must still match the declared benchmark.
  expect(()=>composePublicPilotCost(changed,options)).toThrow('PILOT_COST_VARIABLE_RECONSTRUCTION')
 })
 it('rejects a maintenance/lubricant redistribution even when the combined cost and every old arithmetic check agree',()=>{
  const changed=structuredClone(research),v=changed.supportingPilotVariableEconomics.scenarios[0]
  const maintenance=v.rows.find(r=>r.id==='MX_MAINT')!,lube=v.rows.find(r=>r.id==='MX_LUBE')!
  for(const [line,delta] of [[maintenance,1],[lube,-1]] as const){
   line.amountNative+=delta
   line.nativePerKm=line.amountNative/line.km
   line.amountUsd=line.amountNative/18.3688
  }
  expect(v.rows.reduce((sum,r)=>sum+r.amountUsd,0)).toBeCloseTo(v.knownVariableComponentSubtotalUsd,10)
  expect(()=>composePublicPilotCost(changed,options)).toThrow('PILOT_COST_VARIABLE_RECONSTRUCTION')
 })
 it.each(['MX_IDLE_DIESEL_RESERVE','US_IDLE_DIESEL_RESERVE','MX_DEF','US_DEF'])('rejects coherently repriced %s instead of trusting a balanced fluid subtotal',id=>{
  const changed=structuredClone(research),s=changed.supportingOperatingFluids.scenarios[0]
  const line=s.reference.lines.find(l=>l.id===id)!
  line.unitNative+=1
  line.amountUsd=line.quantity*line.unitNative/(line.currency==='MXN'?18.3688:1)
  s.reference.knownVariableAdditionUsd=s.reference.lines.reduce((sum,l)=>sum+l.amountUsd,0)
  expect(()=>composePublicPilotCost(changed,options)).toThrow('PILOT_COST_FLUID_RECONSTRUCTION')
 })
 it('rejects a mixed road/idle boundary or falsified source even with unchanged monetary amounts',()=>{
  const changed=structuredClone(research)
  Object.assign(changed.supportingOperatingFluids,{dieselBoundary:'ALREADY_INCLUDES_IDLE'})
  expect(()=>composePublicPilotCost(changed,options)).toThrow('PILOT_COST_FLUID_RECONSTRUCTION')
  const source=structuredClone(research)
  source.supportingOperatingFluids.sources[0].url='https://example.org/synthetic-replacement'
  expect(()=>composePublicPilotCost(source,options)).toThrow('PILOT_COST_FLUID_RECONSTRUCTION')
 })
 it.each(['B2_PILOT_VARIABLE_SCENARIOS_2026-10-02.json','B2_VARIABLE_COMPONENTS_REFERENCE_2026-10-01.json','B2_OPERATING_FLUIDS_2026-10-02.json'])('verifies the reused policy hash for %s before rebuilding rates',file=>{
  expect(()=>composePublicPilotCost(research,options,path=>readLocalDocument(path)+(path.endsWith(file)?' ':''))).toThrow('PILOT_COST_SOURCE_HASH')
 })
 it.each([.03,.04,.05] as const)('preserves a single diesel/DEF charge for the declared %s DEF fraction',fraction=>{
  const variant=composePublicPilotCost(research,{...options,defFraction:fraction})
  for(const c of variant.cases){
   const s=research.supportingOperatingFluids.scenarios.find(s=>s.cycleScenarioId===c.cycleId)!
   const rows=c.projection.lineage.variableCosts
   expect(rows.find(r=>r.conceptId==='MX_DEF')!.amountUsd).toBeCloseTo(s.mxTotalDieselLiters*fraction*((472.2+314.65)*1.16/20)/18.3688,10)
   expect(rows.find(r=>r.conceptId==='US_DEF')!.amountUsd).toBeCloseTo(s.usTotalDieselGallons*fraction*(9.88*1.0825/2.5),10)
   for(const id of ['MX_ROAD_FUEL','US_ROAD_FUEL','MX_IDLE_FUEL','US_IDLE_FUEL'] as const){
    expect(rows.filter(r=>r.conceptId===id)).toHaveLength(1)
    expect(rows.find(r=>r.conceptId===id)!.amountUsd).toBe(result.cases.find(x=>x.cycleId===c.cycleId)!.projection.lineage.variableCosts.find(r=>r.conceptId===id)!.amountUsd)
   }
   expect(rows.find(r=>r.conceptId==='MX_DEF')!.resourceId).toBe('MX_TRACTOR')
   expect(rows.find(r=>r.conceptId==='US_DEF')!.resourceId).toBe('US_TRACTOR')
   expect(c.knownFixedAllocatedSubtotalUsd).toBe(result.cases.find(x=>x.cycleId===c.cycleId)!.knownFixedAllocatedSubtotalUsd)
   expect(c.completeCostUsd).toBeNull()
  }
 })
 it('recomputes MX food-linked benefits and per-person contributions, not a generic uplift',()=>{
  for(const restInterpretation of ['RATE_EXCLUDES_WEEKLY_REST','RATE_INCLUDES_WEEKLY_REST']){
   const alternative=composePublicPilotCost(research,{...options,restInterpretation,mxFoodEmployerBasis:'REMUNERATIVE_FOOD_NL_EXEMPT_PLANNING'})
   alternative.cases.forEach(c=>{
    const d=c.mxFoodEmployerPlanning!,old=research.supportingPilotOrdinaryDuty.driver.scenarios.find(s=>s.cycleScenarioId===c.cycleId&&s.restInterpretation===restInterpretation)!
    const direct=d.directFoodCycleMxn,annual=direct*old.compatibleKnownCyclesPerMonth*12,dailyDelta=annual/306
    expect(d.foodIncome.annualFoodRemunerationMxn).toBeCloseTo(annual,8)
    expect(d.foodIncome.primaryFoodRemunerationMxn+d.foodIncome.reliefFoodRemunerationMxn).toBeCloseTo(annual,8)
    expect(d.foodIncome.primaryFoodRemunerationMxn).toBeCloseTo(annual*294/306,8)
    const extraPrimary=dailyDelta*(7+12+3+15),extraRelief=dailyDelta*30*14/365
    expect(d.monthlyBenefitDeltaMxn).toBeCloseTo((extraPrimary+extraRelief)/12,8)
    const primary=calculateMx2026ContributionReference({dailySbcMxn:(old.primary.annualCashMxn+annual*294/306+extraPrimary)/365,coveredDays:31,umaDailyMxn:117.31,riskRegistration:'NEW_CARGO_CLASS_V'})
    const relief=calculateMx2026ContributionReference({dailySbcMxn:(old.relief.annualCashMxn+annual*12/306+extraRelief)/14,coveredDays:14,umaDailyMxn:117.31,riskRegistration:'NEW_CARGO_CLASS_V'})
    const contributions=primary.knownContributionsMxn+primary.workRiskContributionMxn!+(relief.knownContributionsMxn+relief.workRiskContributionMxn!)/12
    expect(d.monthlyContributionDeltaMxn).toBeCloseTo(contributions-old.monthlyContributionReferenceMxn,8)
    expect(d.primary.contributions.cappedDailySbcMxn).toBeCloseTo(primary.cappedDailySbcMxn,10)
    expect(d.relief.contributions.cappedDailySbcMxn).toBeCloseTo(relief.cappedDailySbcMxn,10)
    // NL direct-food exemption is independent of federal cash/SBC integration.
    expect(d.monthlyStateTaxDeltaMxn).toBeCloseTo(d.monthlyBenefitDeltaMxn*.03,8)
    expect(d.annualTaxableWagesMxn).toBeCloseTo(d.foodIncome.annualTotalEmployeeCashMxn-annual,8)
    expect(d.incrementalEmployerCostUsd).toBeCloseTo((d.monthlyBenefitDeltaMxn+d.monthlyContributionDeltaMxn+d.monthlyStateTaxDeltaMxn)/18.3688/old.compatibleKnownCyclesPerMonth,8)
   })
  }
 })
 it('charges direct MX food once and changes only incremental employer cost, not fixed quota or other rows',()=>{
  const input={...options,usMaintenanceBasis:'ATRI2024_ALL_RM_PLANNING',usDriverBasis:'BLS2025_ECEC2026_MIE_PLANNING'}
  const old=composePublicPilotCost(research,input)
  const now=composePublicPilotCost(research,{...input,mxFoodEmployerBasis:'REMUNERATIVE_FOOD_NL_EXEMPT_PLANNING'})
  now.cases.forEach((c,i)=>{
   const d=c.mxFoodEmployerPlanning!,rows=c.projection.lineage.variableCosts,prior=old.cases[i].projection.lineage.variableCosts
   expect(rows).toHaveLength(20)
   expect(rows.filter(r=>r.conceptId!=='MX_DRIVER_TOTAL').map(r=>[r.conceptId,r.amountUsd,r.disposition])).toEqual(prior.filter(r=>r.conceptId!=='MX_DRIVER_TOTAL').map(r=>[r.conceptId,r.amountUsd,r.disposition]))
   expect(c.projection.lineage.fixedOperatingComponent).toEqual(old.cases[i].projection.lineage.fixedOperatingComponent)
   expect(c.knownFixedAllocatedSubtotalUsd).toBe(old.cases[i].knownFixedAllocatedSubtotalUsd)
   expect(c.projection.lineage.budget.expenses).toEqual(old.cases[i].projection.lineage.budget.expenses)
   expect(c.knownCostComponentsUsd-old.cases[i].knownCostComponentsUsd).toBeCloseTo(d.incrementalEmployerCostUsd,8)
   expect(d.directFoodCycleMxn).toBe([1200,2700][i])
   expect(d).toMatchObject({fixedQuotaChanged:false,directFoodChargedAgain:false,capacityChanged:false})
  })
  expect(now.cases[0].knownCostComponentsUsd).toBeCloseTo(4816.210709853235,8)
  expect(now.cases[1].knownCostComponentsUsd).toBeCloseTo(9645.151413785585,8)
  expect(now.sourcePins).toHaveLength(82)
  expect(now.sourcePins).toContainEqual(MX_FOOD_EMPLOYER_PLANNING_PIN)
 })
 it('retains MX labor/travel partial status, PTU and complete cost gaps under a food hypothesis',()=>{
  const r=composePublicPilotCost(research,{...options,usMaintenanceBasis:'ATRI2024_ALL_RM_PLANNING',usDriverBasis:'BLS2025_ECEC2026_MIE_PLANNING',mxFoodEmployerBasis:'REMUNERATIVE_FOOD_NL_EXEMPT_PLANNING'})
  for(const c of r.cases){
   for(const id of ['MX_DRIVER_TOTAL','MX_TRAVEL_EXPENSES'])expect(c.projection.lineage.variableCosts.find(v=>v.conceptId===id)!.disposition).toBe('DOCUMENTED_PARTIAL')
   expect(c.mxFoodEmployerPlanning!).toMatchObject({actualPayrollOrExemptionProven:false,completeDriverCostUsd:null,completeTravelCostUsd:null})
   expect(c.projection.outputs.productiveCostUsd).toBeNull()
   expect(r.modelSectionClosure.scenarios.find(s=>s.cycleId===c.cycleId)!.gapCounts).toEqual({operatingBase:8,tripInputs:4,serviceScope:1})
  }
  expect(r.completePilotCostUsd).toBeNull();expect(r.adoptedValues).toBe(0);expect(r.externalWrites).toBe(false)
 })
 it('preserves legacy MX treatment and source research when the alternative is absent/unselected',()=>{
  const original=JSON.stringify([research.supportingPilotOrdinaryDuty, research.supportingPilotPhysicalCycle, research.supportingPilotTripSupplements.cycleAllocations])
  const explicit=composePublicPilotCost(research,{...options,mxFoodEmployerBasis:'UNRESOLVED_FOOD_PAYROLL'})
  expect(explicit.cases).toEqual(result.cases)
  expect(result.mxFoodEmployerBasis).toBe('UNRESOLVED_FOOD_PAYROLL')
  expect(result.sourcePins).not.toContainEqual(MX_FOOD_EMPLOYER_PLANNING_PIN)
  composePublicPilotCost(research,{...options,mxFoodEmployerBasis:'REMUNERATIVE_FOOD_NL_EXEMPT_PLANNING'})
  expect(JSON.stringify([research.supportingPilotOrdinaryDuty, research.supportingPilotPhysicalCycle, research.supportingPilotTripSupplements.cycleAllocations])).toBe(original)
 })
 it('rejects altered MX food policy, unsupported exemption, source identities and wage assumptions',()=>{
  const option={...options,mxFoodEmployerBasis:'REMUNERATIVE_FOOD_NL_EXEMPT_PLANNING'}
  expect(()=>composePublicPilotCost(research,option,path=>readLocalDocument(path)+(path===MX_FOOD_EMPLOYER_PLANNING_PIN.file?' ':''))).toThrow('PILOT_MX_FOOD_POLICY_HASH')
  const policy=JSON.parse(readLocalDocument(MX_FOOD_EMPLOYER_PLANNING_PIN.file))
  expect(()=>readMxFoodEmployerPlanning({...policy,foodMxnPerStartedDay:350})).toThrow()
  expect(()=>readMxFoodEmployerPlanning({...policy,nlDirectFoodTreatment:'AUTOMATIC_3_PERCENT_ON_ALL_FOOD'})).toThrow()
  expect(()=>readMxFoodEmployerPlanning({...policy,sources:[policy.sources[0],policy.sources[0],...policy.sources.slice(2)]})).toThrow('MX_FOOD_EMPLOYER_SOURCE_IDENTITY')
  expect(()=>composePublicPilotCost(research,{...options,mxFoodEmployerBasis:'ASSUME_ALL_TRAVEL_TAX_FREE'})).toThrow()
 })
 it('rejects inconsistent MX food clock, day count, FX, duplicate cycles and prior payroll',()=>{
  const policy=JSON.parse(readLocalDocument(MX_FOOD_EMPLOYER_PLANNING_PIN.file)),forecast=JSON.parse(readLocalDocument('docs/research/B2_MX_DRIVER_FORECAST_2026-10-02.json'))
  const foodPatch=(patch:Record<string,unknown>)=>({...research,supportingPilotTripSupplements:{...research.supportingPilotTripSupplements,cycleAllocations:research.supportingPilotTripSupplements.cycleAllocations.map((s,i)=>i===0?{...s,mxFood:{...s.mxFood,...patch}}:s)}})
  for(const [patch,code] of [[{elapsedMxCycleDays:99},'FOOD_CLOCK'],[{occupiedCalendarDays:99},'FOOD_DAYS'],[{amountMxn:0},'FOOD_AMOUNT'],[{amountUsd:0},'FOOD_FX']] as const)
   expect(()=>calculateMxFoodEmployerPlanning(policy,foodPatch(patch),forecast)).toThrow(`MX_FOOD_EMPLOYER_${code}`)
  const altered={...research,supportingPilotOrdinaryDuty:{...research.supportingPilotOrdinaryDuty,driver:{...research.supportingPilotOrdinaryDuty.driver,scenarios:research.supportingPilotOrdinaryDuty.driver.scenarios.map((s,i)=>i===0?{...s,variableWageAndEmployerComponentUsd:s.variableWageAndEmployerComponentUsd+1}:s)}}}
  expect(()=>calculateMxFoodEmployerPlanning(policy,altered,forecast)).toThrow('MX_FOOD_EMPLOYER_BASELINE_IDENTITY')
  const duplicate={...research,supportingPilotTripSupplements:{...research.supportingPilotTripSupplements,cycleAllocations:[research.supportingPilotTripSupplements.cycleAllocations[0],research.supportingPilotTripSupplements.cycleAllocations[0]]}}
  expect(()=>calculateMxFoodEmployerPlanning(policy,duplicate,forecast)).toThrow('MX_FOOD_EMPLOYER_CYCLE_IDENTITY')
 })
 it('prices the explicit US hourly/MIE alternative from public means and paid duty, not asset elapsed salary',()=>{
  const alternative=composePublicPilotCost(research,{...options,usMaintenanceBasis:'ATRI2024_ALL_RM_PLANNING',usDriverBasis:'BLS2025_ECEC2026_MIE_PLANNING'})
  const hourly=28.71*36.38/24.97
  const paidHours=[697/60/(1-.0761)+.5+2+2,697/60*2+1+2+4+3.935283458460418]
  alternative.cases.forEach((c,i)=>{
   const d=c.usDriverPlanning!
   expect(d.totalEmployerHourlyUsd).toBeCloseTo(hourly,12)
   expect(d.paidWorkerHours).toBeCloseTo(paidHours[i],10)
   expect(d.employerCompensationUsd).toBeCloseTo(hourly*paidHours[i],8)
   expect(d.mealAndIncidentalsUsd).toBe([160,320][i])
   expect(d.knownOrdinaryDriverAndMieUsd).toBeCloseTo(hourly*paidHours[i]+[160,320][i],8)
   expect(d.paidWorkerHours+d.unpaidMovementRestHours+d.unpaidRecoveryRestHours).toBeCloseTo(d.assignedElapsedHours,10)
   expect(d.unpaidMovementRestHours).toBe([13.5,27][i])
   expect(d.unpaidRecoveryRestHours).toBe(14)
   expect(d.employerCompensationUsd).toBeLessThan(hourly*d.assignedElapsedHours)
   expect(d.sourcePeriods).toEqual({wage:'2025-05',employerFactor:'2026-06',mieEffectiveFrom:'2026-10-01'})
  })
 })
 it('replaces US mileage benefits/per diem once and leaves every other fixed/variable amount unchanged',()=>{
  const before=composePublicPilotCost(research,{...options,usMaintenanceBasis:'ATRI2024_ALL_RM_PLANNING'})
  const after=composePublicPilotCost(research,{...options,usMaintenanceBasis:'ATRI2024_ALL_RM_PLANNING',usDriverBasis:'BLS2025_ECEC2026_MIE_PLANNING'})
  after.cases.forEach((c,i)=>{
   const rows=c.projection.lineage.variableCosts,old=before.cases[i].projection.lineage.variableCosts
   expect(rows.filter(r=>r.conceptId==='US_DRIVER_TOTAL')).toHaveLength(1)
   expect(rows.find(r=>r.conceptId==='US_DRIVER_TOTAL')!.amountUsd).toBe(c.usDriverPlanning!.knownOrdinaryDriverAndMieUsd)
   expect(rows.filter(r=>r.conceptId!=='US_DRIVER_TOTAL')).toEqual(old.filter(r=>r.conceptId!=='US_DRIVER_TOTAL'))
   expect(c.projection.lineage.budget.expenses).toEqual(before.cases[i].projection.lineage.budget.expenses)
   expect(c.knownFixedAllocatedSubtotalUsd).toBe(before.cases[i].knownFixedAllocatedSubtotalUsd)
   const delta=c.usDriverPlanning!.knownOrdinaryDriverAndMieUsd-old.find(r=>r.conceptId==='US_DRIVER_TOTAL')!.amountUsd!
   expect(c.knownCostComponentsUsd-before.cases[i].knownCostComponentsUsd).toBeCloseTo(delta,8)
   expect(c.usDriverPlanning!.extraStatutoryOrBonusPercentAdded).toBe(false)
  })
 })
 it('closes only declared ordinary US labor scope while other gaps and calibration remain pending',()=>{
  const alternative=composePublicPilotCost(research,{...options,usMaintenanceBasis:'ATRI2024_ALL_RM_PLANNING',usDriverBasis:'BLS2025_ECEC2026_MIE_PLANNING'})
  expect(alternative.sourcePins).toHaveLength(81)
  expect(alternative.sourcePins).toContainEqual(US_DRIVER_PLANNING_PIN)
  for(const c of alternative.cases){
   const row=c.projection.lineage.variableCosts.find(r=>r.conceptId==='US_DRIVER_TOTAL')!
   expect(row.disposition).toBe('DOCUMENTED_COMPONENT')
   expect(row.unresolvedRationale).toBeNull()
   expect(c.usDriverPlanning!.actualCarrierCompensationOrReimbursementObserved).toBe(false)
   expect(c.usDriverPlanning!.allCarrierTravelCovered).toBe(false)
   expect(c.usDriverPlanning!.taxSubstantiationOrDeductionComputed).toBe(false)
   expect(c.usDriverPlanning!.calibrated).toBe(false)
   expect(c.projection.outputs.productiveCostUsd).toBeNull()
   expect(alternative.modelSectionClosure.scenarios.find(s=>s.cycleId===c.cycleId)!.gapCounts).toEqual({operatingBase:8,tripInputs:4,serviceScope:1})
  }
  expect(alternative.cases[0].knownCostComponentsUsd).toBeCloseTo(4787.092823737429,8)
  expect(alternative.cases[1].knownCostComponentsUsd).toBeCloseTo(9579.636170025024,8)
  expect(alternative.adoptedValues).toBe(0);expect(alternative.externalWrites).toBe(false)
 })
 it('keeps the legacy choice and amounts when the hourly alternative is absent or explicitly unselected',()=>{
  const explicit=composePublicPilotCost(research,{...options,usDriverBasis:'ATRI2024_MILEAGE_PARTIAL'})
  expect(explicit.cases).toEqual(result.cases)
  expect(result.usDriverBasis).toBe('ATRI2024_MILEAGE_PARTIAL')
  expect(result.sourcePins).not.toContainEqual(US_DRIVER_PLANNING_PIN)
  expect(result.cases.every(c=>c.usDriverPlanning===null)).toBe(true)
 })
 it('fails closed on altered hourly source policy, population period, identity and mixed selected options',()=>{
  const input={...options,usDriverBasis:'BLS2025_ECEC2026_MIE_PLANNING'}
  expect(()=>composePublicPilotCost(research,input,path=>readLocalDocument(path)+(path===US_DRIVER_PLANNING_PIN.file?' ':''))).toThrow('PILOT_US_DRIVER_POLICY_HASH')
  const policy=JSON.parse(readLocalDocument(US_DRIVER_PLANNING_PIN.file))
  expect(()=>readUsDriverPlanning({...policy,wage:{...policy.wage,meanHourlyUsd:28.19}})).toThrow()
  expect(()=>readUsDriverPlanning({...policy,employerCostFactor:{...policy.employerCostFactor,period:'2026-12'}})).toThrow()
  expect(()=>readUsDriverPlanning({...policy,sources:[policy.sources[0],policy.sources[0],...policy.sources.slice(2)]})).toThrow('US_DRIVER_PLANNING_SOURCE_IDENTITY')
  expect(()=>composePublicPilotCost(research,{...options,usDriverBasis:'UNVERIFIED_GENERIC_SALARY'})).toThrow()
 })
 it('rejects inconsistent US duty/distance and does not silently waive waiting hours',()=>{
  const policy=JSON.parse(readLocalDocument(US_DRIVER_PLANNING_PIN.file))
  const ordinary=research.supportingPilotOrdinaryDuty.scenarios[1]
  const negative={...ordinary,usAssetWaitAndHandoffDeltaHours:-1}
  expect(()=>calculateUsDriverPlanning(policy,research.supportingPilotCycleExposure,negative)).toThrow('US_DRIVER_PLANNING_WAIT_RANGE')
  expect(()=>calculateUsDriverPlanning(policy,research.supportingPilotCycleExposure,{...ordinary,usAssetWaitAndHandoffDeltaHours:0})).toThrow('US_DRIVER_PLANNING_ORDINARY_CLOCK')
  const bad=structuredClone(research.supportingPilotCycleExposure)
  bad.scenarios[1].allocationResources.find(r=>r.resourceId==='US_TRACTOR')!.emptyKm+=1
  expect(()=>calculateUsDriverPlanning(policy,bad,ordinary)).toThrow('US_DRIVER_PLANNING_EMPTY_DISTANCE')
  const wrong=structuredClone(research.supportingPilotCycleExposure)
  wrong.usRoadBasis='LEGACY_CITY'
  expect(()=>calculateUsDriverPlanning(policy,wrong,ordinary)).toThrow('US_DRIVER_PLANNING_REQUIRES_POSTAL_REFERENCE')
 })
 it('reconciles all16 sections without treating210 fields as calibrated inputs',()=>{
  const closure=result.modelSectionClosure
  expect(closure.sections.map(s=>s.section).sort()).toEqual([...new Set(PARAMETER_DEFINITIONS.map(p=>p.section))].sort())
  expect(closure.sections.reduce((n,s)=>n+s.catalogKeys,0)).toBe(210)
  expect(closure.sections.reduce((n,s)=>n+s.benchmarkKeys,0)).toBe(135)
  expect(closure.scope).toBe('PUBLIC_FAMILY_PILOT_NOT_CANONICAL_MICROINPUT_CALIBRATION')
  expect(closure.sections.every(s=>s.canonicalValuesAdopted===0&&!s.allIndividualFormulasValidated&&!s.matchedAssetCalibration)).toBe(true)
  expect(closure.sections.find(s=>s.section==='TECHNICAL_MARGIN')!.state).toBe('OUTSIDE_PRODUCTIVE_COST')
  expect(closure.sections.find(s=>s.section==='RISK')!.state).toBe('SEPARATE_RISK_POLICY_NOT_ZERO')
  expect(closure.sections.find(s=>s.section==='UTILIZATION')!.fixedComponents).toEqual([])
  expect(closure.sections.find(s=>s.section==='FINANCE')!.fixedComponents).toEqual([])
  expect(closure.sections.find(s=>s.section==='LABOR')!.cycleCoverage.every(s=>s.gaps.length===3)).toBe(true)
  expect(closure.tireFormulaVerification.mismatchedPriceBindings).toBe(3)
  expect(closure.tireFormulaVerification.methodsEquivalent).toBe(false)
  expect(closure.tireFormulaVerification.canonicalLifecycleBridgeComplete).toBe(false)
  expect(closure.tireFormulaVerification.benchmarkMethod.legacyWorkbookFormulaChanged).toBe(false)
 })
 it('separates base economics, aggregated trip inputs and cargo scope in both scenarios',()=>{
  for(const s of result.modelSectionClosure.scenarios){
   expect(s.gapCounts).toEqual({operatingBase:10,tripInputs:4,serviceScope:1})
   expect(s.gaps).toHaveLength(15)
   expect(s.gaps.filter(g=>g.layer==='TRIP_INPUT').map(g=>g.id).sort()).toEqual(
    ['MX_ROAD_TOLLS','US_ROAD_TOLLS','BRIDGE_TOLLS','HANDOFF_INCREMENTAL_SERVICES'].sort())
   expect(s.gaps.find(g=>g.id==='SUPPLEMENTAL_CARGO_VALUE_INSURANCE')!.layer).toBe('SERVICE_SCOPE')
   expect(s.completeCostReady).toBe(false)
   expect(s.completeOutputs.productiveCostUsd).toBeNull()
   expect(s.allocations.map(a=>a.resourceId)).toEqual(['MX_TRACTOR','US_TRACTOR','SHARED_TRAILER'])
  }
  expect(result.modelSectionClosure.exactTollCoverageRequiredForModelValidation).toBe(false)
  expect(result.modelSectionClosure.tripCostsRequiredForCompleteEstimate).toBe(true)
 })
 it('updates section coverage from the selected maintenance alternative, not a copied fixed gap count',()=>{
  const alternative=composePublicPilotCost(research,{...options,usMaintenanceBasis:'ATRI2024_ALL_RM_PLANNING'})
  for(const s of alternative.modelSectionClosure.scenarios){
   expect(s.gapCounts).toEqual({operatingBase:9,tripInputs:4,serviceScope:1})
   expect(s.gaps.some(g=>g.id==='US_ATTACHED_MAINT_LUBE')).toBe(false)
  }
  const maint=alternative.modelSectionClosure.sections.find(s=>s.section==='COST_MAINT')!
  expect(maint.state).toBe('COMPONENTS_DOCUMENTED_NOT_CALIBRATED')
  expect(maint.allIndividualFormulasValidated).toBe(false)
  expect(alternative.cases.map(c=>c.knownCostComponentsUsd)).toEqual([4562.351292749036,9030.407149808703])
 })
 it('gives every priced expense/concept one monetary section, never capital again under finance/utilization',()=>{
  const closure=result.modelSectionClosure
  expect(closure.sections.flatMap(s=>s.fixedComponents).map(c=>c.id).sort()).toEqual(
   result.monthly.budget.expenses.map(e=>e.economicExpenseId).sort())
  for(const s of closure.scenarios){
   const sections=closure.sections.flatMap(section=>section.cycleCoverage.find(c=>c.cycleId===s.cycleId)!.components)
   expect(sections.map(c=>c.id).sort()).toEqual([...PILOT_VARIABLE_CONCEPTS].sort())
   expect(sections.filter(c=>c.id==='MX_DEF'||c.id==='US_DEF').every(c=>c.section==='FUEL')).toBe(true)
   expect(closure.sections.find(s=>s.section==='COST_PAYROLL')!.fixedComponents).toHaveLength(1)
   expect(s.fixedDriverComponent.section).toBe('LABOR')
   expect(closure.fixedComponents.some(c=>c.id===s.fixedDriverComponent.id)).toBe(false)
  }
 })
 it('rejects stale/altered formula totals, ownership and missing scenario identities',()=>{
  const monthly=structuredClone(result.monthly),cases=structuredClone(result.cases)
  monthly.knownCfuAllocations[0].resources[0].knownAllocatedFixedComponentUsd+=1
  expect(()=>auditPublicModelSectionClosure(monthly,cases)).toThrow('MODEL_CLOSURE_MAX_ALLOCATION')
  cases[0].knownCostComponentsUsd+=1
  expect(()=>auditPublicModelSectionClosure(result.monthly,cases)).toThrow('MODEL_CLOSURE_KNOWN_COST_SUM')
  expect(()=>auditPublicModelSectionClosure(result.monthly,[result.cases[0],result.cases[0]])).toThrow('MODEL_CLOSURE_CYCLE_IDENTITY')
  const duplicate=structuredClone(result.monthly)
  duplicate.budget.expenses.push(structuredClone(duplicate.budget.expenses[0]))
  expect(()=>auditPublicModelSectionClosure(duplicate,result.cases)).toThrow('MODEL_CLOSURE_EXPENSE_IDENTITY')
  const drift=structuredClone(result.cases)
  drift[0].projection.lineage.exposures[0].cycleDays+=1
  expect(()=>auditPublicModelSectionClosure(result.monthly,drift)).toThrow('MODEL_CLOSURE_TIME_ALLOCATION')
  const swapped=structuredClone(result.monthly)
  // Group sum remains identical: only the resource assignment is corrupted.
  swapped.knownMonthlyComponentsUsdByResource.MX_TRACTOR+=1
  swapped.knownMonthlyComponentsUsdByResource.US_TRACTOR-=1
  expect(()=>auditPublicModelSectionClosure(swapped,result.cases)).toThrow('MODEL_CLOSURE_POOL_RESOURCE_ALLOCATION')
 })
 it('joins exactly the 20 economic concepts in both existing cycles without source refresh',()=>{
  expect(result.cases).toHaveLength(2)
  for(const c of result.cases){
   expect(c.projection.lineage.variableCosts.map(v=>v.conceptId).sort()).toEqual([...PILOT_VARIABLE_CONCEPTS].sort())
   expect(c.projection.lineage.variableCosts.filter(v=>v.disposition==='DOCUMENTED_PARTIAL')).toHaveLength(6)
   expect(c.projection.lineage.variableCosts.filter(v=>v.disposition==='MISSING')).toHaveLength(3)
   expect(c.projection.outputs.productiveCostUsd).toBeNull()
   expect(c.projection.outputs.cvuUsd).toBeNull()
   expect(c.projection.status).toBe('INCOMPLETE')
  }
  expect(result.sourcePins).toHaveLength(79)
  expect(result.adoptedValues).toBe(0)
  expect(result.externalWrites).toBe(false)
 })
 it('independently sums documented components; neither sums old totals nor fabricates unknown fees',()=>{
  const expected=[3589.00831433379,6808.526579236404]
  result.cases.forEach((c,index)=>{
   const known=c.projection.lineage.variableCosts.filter(v=>v.amountUsd!==null).reduce((sum,v)=>sum+v.amountUsd!,0)
   expect(c.projection.knownVariableSubtotalUsd).toBeCloseTo(known,8)
   expect(known).toBeCloseTo(expected[index],8)
   expect(Object.values(c.projection.knownVariableComponentsUsdByResource!).reduce((sum,n)=>sum+n,0)).toBeCloseTo(known,8)
   expect(c.knownCostComponentsUsd).toBeCloseTo(c.knownFixedAllocatedSubtotalUsd+known,8)
   expect(c.knownAmountsAreCompleteOrLowerBounds).toBe(false)
   expect(c.projection.knownVariableComponentsUsdByResource!.SHARED_TRAILER).toBe(0)
   // Diagnostic zero sum of no known box-variable rows is not zero full box cost.
   expect(c.projection.resources.find(r=>r.resourceId==='SHARED_TRAILER')!.cvuUsd).toBeNull()
  })
 })
 it('replaces original MX distance wages once, separates fixed EM quota and preserves admin pool',()=>{
  result.cases.forEach((c,index)=>{
   const p=research.supportingPilotOrdinaryDuty.driver.scenarios.find(d=>d.cycleScenarioId===c.cycleId&&d.restInterpretation===options.restInterpretation)!
   const fixed=p.fixedContributionMonthlyMxn/18.3688/p.compatibleKnownCyclesPerMonth
   expect(amount(index,'MX_DRIVER_TOTAL')).toBeCloseTo(p.variableWageAndEmployerComponentUsd,8)
   expect(c.projection.fixedOperatingAllocationUsd).toBeCloseTo(fixed,8)
   expect(amount(index,'MX_DRIVER_TOTAL')+fixed).toBeCloseTo(p.wageAndKnownEmployerComponentUsd,8)
   expect(c.projection.lineage.budget.expenses.some(e=>e.economicExpenseId==='MX_DRIVER_FIXED_EMPLOYER_QUOTA')).toBe(false)
   expect(c.projection.lineage.budget.expenses.filter(e=>e.economicExpenseId==='GROUP_ADMIN_PAYROLL_PUBLIC_SCALE')).toHaveLength(1)
   expect(c.knownFixedAllocatedSubtotalUsd).toBeCloseTo(result.monthly.knownCfuAllocations[index].knownAllocatedFixedSubtotalUsd+fixed,8)
  })
 })
 it('retains US statutory/wait and lubricant boundaries instead of calling an aggregate complete',()=>{
  const rows=result.cases[0].projection.lineage.variableCosts
  for(const id of ['MX_DRIVER_TOTAL','US_DRIVER_TOTAL','US_ATTACHED_MAINT_LUBE','MX_TRAVEL_EXPENSES']){
   const row=rows.find(r=>r.conceptId===id)!
   expect(row.disposition).toBe('DOCUMENTED_PARTIAL')
   expect(row.unresolvedRationale).toBeTruthy()
   expect(row.amountUsd).toBeGreaterThan(0)
  }
  expect(rows.filter(r=>r.conceptId==='US_DRIVER_TOTAL')).toHaveLength(1)
 })
 it('keeps road diesel separate from idle and DEF; varies only selected DEF consumption',()=>{
  const low=composePublicPilotCost(research,{...options,defFraction:.03})
  const high=composePublicPilotCost(research,{...options,defFraction:.05})
  for(let i=0;i<2;i++){
   for(const id of ['MX_ROAD_FUEL','US_ROAD_FUEL','MX_IDLE_FUEL','US_IDLE_FUEL']){
    expect(low.cases[i].projection.lineage.variableCosts.find(v=>v.conceptId===id)!.amountUsd).toBe(amount(i,id))
   }
   for(const id of ['MX_DEF','US_DEF']){
    expect(low.cases[i].projection.lineage.variableCosts.find(v=>v.conceptId===id)!.amountUsd).toBeCloseTo(amount(i,id)*.75,8)
    expect(high.cases[i].projection.lineage.variableCosts.find(v=>v.conceptId===id)!.amountUsd).toBeCloseTo(amount(i,id)*1.25,8)
   }
  }
 })
 it('allocates wear on disjoint attached/bobtail mileage, with no second box charge',()=>{
  result.cases.forEach((c,i)=>{
   const p=research.supportingMxBobtailWearReference.scenarios.find(s=>s.cycleScenarioId===c.cycleId)!
   const rate=research.supportingMxBobtailWearReference.printedCostsMxnPer1000VehicleKm
   expect(amount(i,'MX_BOBTAIL_MAINT_LUBE')).toBeCloseTo(p.mxBobtailKm*(rate.maintenanceLabor+rate.maintenanceParts+rate.lubricants)/1000/18.3688,8)
   expect(amount(i,'MX_BOBTAIL_TIRES')).toBeCloseTo(p.mxBobtailKm*rate.tires/1000/18.3688,8)
   const base=research.supportingPilotVariableEconomics.scenarios.find(s=>s.cycleScenarioId===c.cycleId)!
   expect(amount(i,'MX_ATTACHED_TIRES')).toBe(base.rows.find(v=>v.id==='MX_TIRES')!.amountUsd)
  })
 })
 it('does not turn an unresolved approach or bobtail wear into documented zero',()=>{
  const legacy=consolidateBinationalReferenceBudget()
  const readback=composePublicPilotCost(legacy,{...options,borderLinkBasis:'UNRESOLVED_LINK',bobtailWearBasis:'UNPRICED'})
  for(const c of readback.cases){
   for(const id of ['MX_BOBTAIL_MAINT_LUBE','MX_BOBTAIL_TIRES']){
    const row=c.projection.lineage.variableCosts.find(r=>r.conceptId===id)!
    expect(row.amountUsd).toBeNull();expect(row.disposition).toBe('MISSING')
   }
   expect(c.projection.outputs.productiveCostUsd).toBeNull()
  }
 })
 it('financing changes capital alone, never fuel/wages or the fixed driver quota',()=>{
  const financeId=research.supportingPilotFinancedCfu.monthlyScenarios.find(s=>s.cashBaseId==='ALL_CAPITAL_CASH_NET_PLUS_VAT_PUBLIC_ADMIN_SCALE')!.id
  const financed=composePublicPilotCost(research,{...options,monthlyBudget:{...options.monthlyBudget,financeMonthlyScenarioId:financeId}})
  financed.cases.forEach((c,i)=>{
   expect(c.projection.lineage.fundingMode).toBe('FINANCED')
   expect(c.projection.lineage.variableCosts).toEqual(result.cases[i].projection.lineage.variableCosts)
   expect(c.projection.fixedOperatingAllocationUsd).toBe(result.cases[i].projection.fixedOperatingAllocationUsd)
  })
 })
 it('weekly-rest alternative changes payroll only and does not add advertised weekly salary',()=>{
  const alternative=composePublicPilotCost(research,{...options,restInterpretation:'RATE_INCLUDES_WEEKLY_REST'})
  alternative.cases.forEach((c,i)=>{
   expect(c.projection.fixedOperatingAllocationUsd).toBe(result.cases[i].projection.fixedOperatingAllocationUsd)
   expect(c.projection.lineage.variableCosts.find(v=>v.conceptId==='MX_DRIVER_TOTAL')!.amountUsd).toBeLessThan(amount(i,'MX_DRIVER_TOTAL'))
   expect(c.projection.lineage.variableCosts.filter(v=>v.conceptId!=='MX_DRIVER_TOTAL')).toEqual(result.cases[i].projection.lineage.variableCosts.filter(v=>v.conceptId!=='MX_DRIVER_TOTAL'))
  })
 })
 it('source identity, arithmetic and upstream immutability are enforced',()=>{
  const before=JSON.stringify(research)
  composePublicPilotCost(research,options)
  expect(JSON.stringify(research)).toBe(before)
  expect(()=>composePublicPilotCost(research,options,file=>readLocalDocument(file)+' ')).toThrow('PILOT_COST_SOURCE_HASH')
  const broken=structuredClone(research)
  broken.supportingPilotVariableEconomics.scenarios[0].rows[0].amountUsd+=1
  expect(()=>composePublicPilotCost(broken,options)).toThrow('PILOT_COST_VARIABLE_RECONSTRUCTION')
  const missing=structuredClone(research)
  missing.supportingOperatingFluids.sources=[]
  expect(()=>composePublicPilotCost(missing,options)).toThrow()
 })
 it('rejects silent option selection, incompatible source scenario and unpriced null wear',()=>{
  expect(()=>composePublicPilotCost(research,{})).toThrow()
  expect(()=>composePublicPilotCost(research,{...options,approved:true})).toThrow()
  expect(()=>composePublicPilotCost(research,{...options,defFraction:.06})).toThrow()
  expect(()=>composePublicPilotCost(research,{...options,bobtailWearBasis:'UNPRICED'})).toThrow('PILOT_COST_RESEARCH_BASIS_MISMATCH')
  const broken=structuredClone(research)
  broken.supportingMxBobtailWearReference.scenarios[0].rows[0].conditionalAmountUsd=null
  expect(()=>composePublicPilotCost(broken,options)).toThrow('PILOT_COST_BOBTAIL_ARITHMETIC')
 })
 it('bad partial evidence or missing remainder explanation suppresses even known-variable diagnostics',()=>{
  const input=structuredClone(result.cases[0].projection.lineage)
  input.variableCosts.find(v=>v.disposition==='DOCUMENTED_PARTIAL')!.evidenceIds=['DOES_NOT_EXIST']
  const bad=calculateBinationalBudgetCostProjection(input)
  expect(bad.knownVariableSubtotalUsd).toBeNull()
  expect(bad.outputs.productiveCostUsd).toBeNull()
  const noScope=structuredClone(result.cases[0].projection.lineage)
  delete noScope.variableCosts.find(v=>v.disposition==='DOCUMENTED_PARTIAL')!.unresolvedRationale
  expect(calculateBinationalBudgetCostProjection(noScope).issues.some(i=>i.code==='MISSING_PARTIAL_SCOPE_RATIONALE')).toBe(true)
 })
 it('blocks the fixed operating quota if already represented in the fixed worksheet',()=>{
  const input=structuredClone(result.cases[0].projection.lineage)
  const duplicate=structuredClone(input.budget.expenses.find(e=>e.economicExpenseId==='MX_TRACTOR_RESERVED_YARD')!)
  duplicate.economicExpenseId='MX_DRIVER_FIXED_EMPLOYER_QUOTA'
  input.budget.expenses.push(duplicate)
  const bad=calculateBinationalBudgetCostProjection(input)
  expect(bad.issues.some(i=>i.code==='FIXED_OPERATING_ALREADY_IN_BUDGET')).toBe(true)
  expect(bad.fixedOperatingAllocationUsd).toBeNull()
  expect(bad.outputs.cfuUsd).toBeNull()
 })
 it('synthetic completion exercises full fixed/variable sums including payroll; is not pilot evidence',()=>{
  const input=structuredClone(result.cases[0].projection.lineage)
  input.evidenceScope='SYNTHETIC_VALIDATION'
  const reference=input.exposures[0].evidenceIds
  for(const e of input.budget.expenses)if(!e.amount)e.amount={value:1,unit:'USD/month',referencePeriod:input.budget.referencePeriod!,
   evidenceIds:reference,derivation:'Synthetic one-dollar closure fixture; not adopted benchmark or actual cost.',kind:'DOCUMENTED_PUBLIC_MODEL'}
  for(const row of input.variableCosts){
   row.disposition='DOCUMENTED_COMPONENT';row.unresolvedRationale=null
   if(row.amountUsd===null){row.amountUsd=1;row.evidenceIds=reference;row.derivation='Synthetic one-dollar closure fixture only.'}
  }
  const readback=calculateBinationalBudgetCostProjection(input)
  expect(readback.issues).toEqual([])
  const fixed=readback.resources.reduce((sum,r)=>{
   const e=input.exposures.find(e=>e.resourceId===r.resourceId)!
   return sum+r.monthlyFixedUsd!*Math.max(e.totalCycleKm/e.productiveKmPerMonth,e.cycleDays/e.productiveDaysPerMonth)
  },0)+input.fixedOperatingComponent!.monthlyUsd/input.fixedOperatingComponent!.compatibleCyclesPerMonth
  const variable=input.variableCosts.reduce((sum,r)=>sum+r.amountUsd!,0)
  expect(readback.outputs.cfuUsd).toBeCloseTo(fixed,8)
  expect(readback.outputs.cvuUsd).toBeCloseTo(variable,8)
  expect(readback.outputs.productiveCostUsd).toBeCloseTo(fixed+variable,8)
  expect(readback.quoteReady).toBe(false)
  expect(readback.evidenceScope).toBe('SYNTHETIC_VALIDATION')
 })
 it('explicit ATRI all-maintenance hypothesis replaces only US maintenance, closes its planning boundary and retains other missing costs',()=>{
  const selected=composePublicPilotCost(research,{...options,usMaintenanceBasis:'ATRI2024_ALL_RM_PLANNING'})
  expect(selected.sourcePins).toHaveLength(80)
  expect(selected.sourcePins.at(-1)).toEqual(US_MAINTENANCE_PLANNING_PIN)
  selected.cases.forEach((c,i)=>{
   const previous=result.cases[i].projection.lineage.variableCosts
   const next=c.projection.lineage.variableCosts
   expect(next).toHaveLength(20)
   expect(next.filter(v=>v.conceptId!=='US_ATTACHED_MAINT_LUBE')).toEqual(previous.filter(v=>v.conceptId!=='US_ATTACHED_MAINT_LUBE'))
   const changed=next.find(v=>v.conceptId==='US_ATTACHED_MAINT_LUBE')!
   const km=research.supportingPilotVariableEconomics.scenarios.find(s=>s.cycleScenarioId===c.cycleId)!.rows.find(r=>r.id==='US_MAINT')!.km
   expect(changed.amountUsd).toBeCloseTo(km/1.609344*.198,10)
   expect(changed.disposition).toBe('DOCUMENTED_COMPONENT')
   expect(changed.unresolvedRationale).toBeNull()
   expect(changed.derivation).toContain('declared inference')
   expect(c.usMaintenancePlanning).toMatchObject({operationsYear:2024,routineLubricationIsPlanningInference:true,extraLubricantsAdded:false})
   expect(next.filter(v=>v.disposition==='DOCUMENTED_PARTIAL')).toHaveLength(5)
   expect(next.filter(v=>v.disposition==='MISSING')).toHaveLength(3)
   expect(c.projection.outputs.productiveCostUsd).toBeNull()
   expect(c.projection.outputs.cvuUsd).toBeNull()
   expect(c.knownFixedAllocatedSubtotalUsd).toBe(result.cases[i].knownFixedAllocatedSubtotalUsd)
  })
 })
 it('independently reconciles the actual rate replacement delta, not addition of TTI and ATRI',()=>{
  const before=JSON.stringify(research)
  const selected=composePublicPilotCost(research,{...options,usMaintenanceBasis:'ATRI2024_ALL_RM_PLANNING'})
  selected.cases.forEach((c,i)=>{
   const km=c.usMaintenancePlanning!.attachedKm
   const delta=km/1.609344*(.198-.212)
   expect(c.projection.knownVariableSubtotalUsd!-result.cases[i].projection.knownVariableSubtotalUsd!).toBeCloseTo(delta,8)
   expect(c.knownCostComponentsUsd-result.cases[i].knownCostComponentsUsd).toBeCloseTo(delta,8)
   expect(delta).toBeLessThan(0)
   expect(c.knownAmountsAreCompleteOrLowerBounds).toBe(false)
   expect(c.completeCostUsd).toBeNull()
  })
  expect(JSON.stringify(research)).toBe(before)
  expect(selected.calibrated).toBe(false)
  expect(selected.quoteReady).toBe(false)
 })
 it('preserves the historical TTI path without requiring or silently selecting the additional policy',()=>{
  const explicit=composePublicPilotCost(research,{...options,usMaintenanceBasis:'TTI_UNRESOLVED_LUBE'},file=>{
   if(file===US_MAINTENANCE_PLANNING_PIN.file)throw new Error('Unexpected new policy access')
   return readLocalDocument(file)
  },()=>{throw new Error('Unexpected archive access')})
  expect(explicit.cases).toEqual(result.cases)
  expect(explicit.sourcePins).toHaveLength(79)
  expect(explicit.usMaintenanceBasis).toBe('TTI_UNRESOLVED_LUBE')
  expect(explicit.cases.every(c=>c.usMaintenancePlanning===null)).toBe(true)
 })
 it('binds the new maintenance hypothesis to its original report, not the TTI reference',()=>{
  const selected=composePublicPilotCost(research,{...options,usMaintenanceBasis:'ATRI2024_ALL_RM_PLANNING'})
  for(const c of selected.cases){
   const row=c.projection.lineage.variableCosts.find(v=>v.conceptId==='US_ATTACHED_MAINT_LUBE')!
   expect(row.evidenceIds).toEqual(['PILOT:US_ATRI_ALL_MAINT:ATRI2025_MAINTENANCE_ORIGINAL'])
   const source=c.projection.lineage.budget.evidence.find(e=>e.id===row.evidenceIds[0])!
   expect(source.locator).toContain('Table8')
   expect(source.locator).toContain('not explicitly named')
   expect(source.resourceIds).toEqual(['US_TRACTOR','SHARED_TRAILER'])
   expect(c.projection.lineage.variableCosts.filter(v=>v.conceptId==='US_ATTACHED_MAINT_LUBE')).toHaveLength(1)
  }
 })
 it('rejects modified policy bytes, modified original archive and conflicting upstream archive identity',()=>{
  const selected={...options,usMaintenanceBasis:'ATRI2024_ALL_RM_PLANNING'}
  expect(()=>composePublicPilotCost(research,selected,file=>readLocalDocument(file)+(file===US_MAINTENANCE_PLANNING_PIN.file?' ':''))).toThrow('PILOT_US_MAINTENANCE_POLICY_HASH')
  expect(()=>composePublicPilotCost(research,selected,readLocalDocument,file=>{
   const bytes=Buffer.from(readLocalDocumentBytes(file));bytes[0]^=1;return bytes
  })).toThrow('PILOT_US_MAINTENANCE_ARCHIVE_HASH')
  const broken=structuredClone(research)
  broken.supportingDriverEconomics.usSource.archive.sha256='0'.repeat(64)
  expect(()=>composePublicPilotCost(broken,selected)).toThrow('PILOT_US_MAINTENANCE_ARCHIVE_IDENTITY')
  expect(()=>composePublicPilotCost(research,{...options,usMaintenanceBasis:'LATEST_OR_COMPLETE'})).toThrow()
 })
 it('retains driver bonus/statutory/wait and tax boundaries; source presence does not certify employer totals',()=>{
  const policy=JSON.parse(readLocalDocument(US_MAINTENANCE_PLANNING_PIN.file))
  expect(policy.driverCoverageReview).toMatchObject({wagesBenefitsExcludeIncentivesBonuses:true,employerTaxCoverageEstablished:false,bonusAmountsIntegratedIntoPilot:false})
  expect(policy.driverCoverageReview.annualUsdPerRecipient).toEqual({safety:1680,starting:2122,retention:1832,referral:1738})
  const selected=composePublicPilotCost(research,{...options,usMaintenanceBasis:'ATRI2024_ALL_RM_PLANNING'})
  selected.cases.forEach((c,i)=>{
   const driver=c.projection.lineage.variableCosts.find(v=>v.conceptId==='US_DRIVER_TOTAL')!
   expect(driver).toEqual(result.cases[i].projection.lineage.variableCosts.find(v=>v.conceptId==='US_DRIVER_TOTAL'))
   expect(driver.disposition).toBe('DOCUMENTED_PARTIAL')
   expect(driver.unresolvedRationale).toContain('statutory')
  })
 })
 it('keeps the selected maintenance replacement invariant across finance, DEF and rest alternatives',()=>{
  const selectedOptions={...options,usMaintenanceBasis:'ATRI2024_ALL_RM_PLANNING'}
  const selected=composePublicPilotCost(research,selectedOptions)
  const financeId=research.supportingPilotFinancedCfu.monthlyScenarios.find(s=>s.cashBaseId==='ALL_CAPITAL_CASH_NET_PLUS_VAT_PUBLIC_ADMIN_SCALE')!.id
  for(const variation of [{...selectedOptions,monthlyBudget:{...options.monthlyBudget,financeMonthlyScenarioId:financeId}},
   {...selectedOptions,defFraction:.05},{...selectedOptions,restInterpretation:'RATE_INCLUDES_WEEKLY_REST'}]){
   const actual=composePublicPilotCost(research,variation)
   actual.cases.forEach((c,i)=>{
    expect(c.usMaintenancePlanning).toEqual(selected.cases[i].usMaintenancePlanning)
    expect(c.projection.lineage.variableCosts.find(v=>v.conceptId==='US_ATTACHED_MAINT_LUBE')).toEqual(selected.cases[i].projection.lineage.variableCosts.find(v=>v.conceptId==='US_ATTACHED_MAINT_LUBE'))
   })
  }
 })
})
