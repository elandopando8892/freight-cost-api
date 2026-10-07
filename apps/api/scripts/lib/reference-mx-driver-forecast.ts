import {z} from 'zod'
import {calculateMx2026ContributionReference,calculateMxVariableDriverBenefits} from './reference-mx-variable-driver.js'

const p=z.number().finite().positive().max(1e9)
const cycleId=z.enum(['NETWORK_EXPECTED_EMPTY_PROXY','DEDICATED_EMPTY_SAME_BOX_RETURN'])
const restId=z.enum(['RATE_EXCLUDES_WEEKLY_REST','RATE_INCLUDES_WEEKLY_REST'])
const policySchema=z.object({model:z.literal('FCM_MX_DRIVER_ANNUAL_MEAN_PUBLIC_FORECAST_V1'),reviewedAt:z.string().datetime(),referenceMonth:z.enum(['2026-09','2026-10']),
  calendar:z.object({year:z.literal(2026),weeklyRestDay:z.literal('SUNDAY'),holidays:z.array(z.string().regex(/^2026-\d\d-\d\d$/)).length(7),
    primaryVacationWorkedDays:z.literal(12),reliefCoveredCalendarDays:z.literal(14),reliefScope:z.literal('TWO_NON_HOLIDAY_WEEKS_12_WORKED_DAYS_2_REST_DAYS'),
    regionalElectionDaysScope:z.literal('NOT_MODELED_PENDING_NO_ACTUAL_SERVICE_DATE')}).strict(),
  wagePolicy:z.literal('EXPLICIT_GROSS_KM_TRANSFER_NO_WEEKLY_GUARANTEE_ASSUMED'),
  holidayVacationIncomePolicy:z.literal('ROAD_EARNINGS_WORKED_DAY_MEAN_PLANNING_PROXY_NOT_OBSERVED_30DAY_HISTORY'),
  contributionBasis:z.literal('ANNUAL_MEAN_ELIGIBLE_CASH_PROXY_NOT_STATUTORY_BIMESTER_OR_RETURN'),
  riskPolicy:z.enum(['INITIAL_CARGO_CLASS_V_RATE_SENSITIVITY_NOT_ACTUAL_EXISTING_PREMIUM','EXISTING_EMPLOYER_RATE_UNKNOWN']),
  employerJurisdictionHypothesis:z.literal('NUEVO_LEON_NOT_INFERRED_FROM_ROUTE_OR_OFFER'),statePayrollRate:z.literal(.03),
  professionalDailyFloorMxn:z.literal(370.90),umaDailyMxn:z.literal(117.31),
  assumptions:z.array(z.string()).min(9),sourceRefs:z.array(z.string()).min(4),adoptedValues:z.literal(0),quoteReady:z.literal(false)}).strict()
const cyclesSchema=z.object({productiveElapsedAssetDaysPerMonth:z.literal(24),scenarios:z.array(z.object({id:cycleId,
  allocationResources:z.array(z.object({resourceId:z.enum(['MX_TRACTOR','US_TRACTOR','SHARED_TRAILER']),totalCycleKm:p,monthlyKmCapacity:p,cycleDays:p}).passthrough()).length(3)}).passthrough()).length(2)}).passthrough()
const physicalSchema=z.object({scenarios:z.array(z.object({id:cycleId,knownMxElapsedClockDays:p,knownUsClockDays:p,knownBoxClockDays:p,
  additionalMxBobtailKm:z.null(),physicalDistanceComplete:z.literal(false)}).passthrough()).length(2)}).passthrough()
const wageSchema=z.object({scenarios:z.array(z.object({cycleScenarioId:cycleId,restInterpretation:restId,paidKnownPhysicalKm:p,grossWorkAndRestMxn:p,originalPayMxn:p}).passthrough()).length(4)}).passthrough()
const variableSchema=z.object({scenarios:z.array(z.object({cycleScenarioId:cycleId,knownVariableComponentSubtotalUsd:p,
  rows:z.array(z.object({id:z.string(),amountUsd:p,amountNative:p,km:p}).passthrough())}).passthrough()).length(2)}).passthrough()
const foodRemunerationSchema=z.object({
  scope:z.literal('DECLARED_REMUNERATIVE_FOOD_WITH_REST_INCLUDED_NL_DIRECT_FOOD_EXEMPT'),
  scenarios:z.array(z.object({cycleScenarioId:cycleId,amountMxn:p}).strict()).length(2),
}).strict()

/** Financial forward budget, NOT a smoothed accrual inserted into real LSS30
 * history. Relief's road wages are already in the km pool: partition, don't add.
 * Contribution caps/fixed daily quota are per person, not a pooled carrier SBC. */
export function calculateMxDriverPublicForecast(rawPolicy:unknown,rawCycles:unknown,rawPhysical:unknown,rawWages:unknown,rawVariables:unknown,rawFx:unknown,rawFoodRemuneration?:unknown){
  const policy=policySchema.parse(rawPolicy),cycles=cyclesSchema.parse(rawCycles),physical=physicalSchema.parse(rawPhysical),wages=wageSchema.parse(rawWages),variables=variableSchema.parse(rawVariables)
  const foodRemuneration=rawFoodRemuneration===undefined?null:foodRemunerationSchema.parse(rawFoodRemuneration)
  if(foodRemuneration&&new Set(foodRemuneration.scenarios.map(s=>s.cycleScenarioId)).size!==2)throw new Error('DRIVER_FORECAST_FOOD_CYCLE_IDENTITY')
  const fx=z.object({mxnPerUsd:z.union([z.literal(18.3688),z.literal(17.8413),z.literal(18.0710),z.literal(18.0692)]),
    observationDate:z.string().optional()}).passthrough().parse(rawFx)
  const september=policy.referenceMonth==='2026-09'
  const septemberFx:Record<string,number>={'2026-09-28':17.8413,'2026-09-29':18.0710,'2026-09-30':18.0692}
  if(september ? !fx.observationDate||septemberFx[fx.observationDate]!==fx.mxnPerUsd : fx.mxnPerUsd!==18.3688)
    throw new Error('DRIVER_FORECAST_REFERENCE_FX_MISMATCH')
  if(september ? policy.riskPolicy!=='EXISTING_EMPLOYER_RATE_UNKNOWN' : policy.riskPolicy!=='INITIAL_CARGO_CLASS_V_RATE_SENSITIVITY_NOT_ACTUAL_EXISTING_PREMIUM')
    throw new Error('DRIVER_FORECAST_REFERENCE_RISK_MISMATCH')
  const expectedHolidays=['2026-01-01','2026-02-02','2026-03-16','2026-05-01','2026-09-16','2026-11-16','2026-12-25']
  if(JSON.stringify(policy.calendar.holidays)!==JSON.stringify(expectedHolidays))throw new Error('DRIVER_FORECAST_HOLIDAY_SCOPE_MISMATCH')
  for(const collection of [cycles.scenarios,physical.scenarios])if(new Set(collection.map(s=>s.id)).size!==2)throw new Error('DRIVER_FORECAST_DUPLICATE_CYCLE')
  if(new Set(variables.scenarios.map(s=>s.cycleScenarioId)).size!==2||new Set(wages.scenarios.map(s=>`${s.cycleScenarioId}:${s.restInterpretation}`)).size!==4)throw new Error('DRIVER_FORECAST_DUPLICATE_PAY')
  const calendarDays=365,weeklyRestDates:string[]=[]
  for(let day=0;day<calendarDays;day++){const date=new Date(Date.UTC(2026,0,1+day));if(date.getUTCDay()===0)weeklyRestDates.push(date.toISOString().slice(0,10))}
  if(policy.calendar.holidays.some(d=>weeklyRestDates.includes(d)))throw new Error('DRIVER_FORECAST_CALENDAR_OVERLAP')
  const holidayDays=expectedHolidays.length,poolProductiveWorkedDays=calendarDays-weeklyRestDates.length-holidayDays
  const primaryProductiveWorkedDays=poolProductiveWorkedDays-policy.calendar.primaryVacationWorkedDays
  const monthCoveredDays=new Date(Date.UTC(2026,Number(policy.referenceMonth.slice(5)),0)).getUTCDate()
  const scenarios=wages.scenarios.map(w=>{
    const c=cycles.scenarios.find(s=>s.id===w.cycleScenarioId)!,clock=physical.scenarios.find(s=>s.id===w.cycleScenarioId)!,v=variables.scenarios.find(s=>s.cycleScenarioId===w.cycleScenarioId)!
    if(new Set(c.allocationResources.map(r=>r.resourceId)).size!==3||new Set(v.rows.map(r=>r.id)).size!==v.rows.length)throw new Error('DRIVER_FORECAST_RESOURCE_OR_ROW_DUPLICATE')
    const mx=c.allocationResources.find(r=>r.resourceId==='MX_TRACTOR')!,us=c.allocationResources.find(r=>r.resourceId==='US_TRACTOR')!,original=v.rows.filter(r=>r.id==='MX_DRIVER_PAY')
    if(original.length!==1||Math.abs(w.paidKnownPhysicalKm-mx.totalCycleKm)>1e-7||Math.abs(original[0].amountNative-w.originalPayMxn)>1e-7||Math.abs(v.rows.reduce((sum,row)=>sum+row.amountUsd,0)-v.knownVariableComponentSubtotalUsd)>1e-7)throw new Error('DRIVER_FORECAST_PAY_SCOPE_MISMATCH')
    const capacityConstraints=[{id:'MX_KM',cycles:mx.monthlyKmCapacity/mx.totalCycleKm},{id:'US_KM',cycles:us.monthlyKmCapacity/us.totalCycleKm},
      {id:'MX_CLOCK',cycles:24/clock.knownMxElapsedClockDays},{id:'US_CLOCK',cycles:24/clock.knownUsClockDays},{id:'ONE_BOX_CLOCK',cycles:24/clock.knownBoxClockDays}]
    const compatibleKnownCyclesPerMonth=Math.min(...capacityConstraints.map(x=>x.cycles))
    const annualRoadWagesMxn=w.grossWorkAndRestMxn*compatibleKnownCyclesPerMonth*12
    // Direct food cash remains in the trip row. Here it changes only the income
    // bases, accruals and contributions; never pay the allowance a second time.
    const foodPerCycleMxn=foodRemuneration?.scenarios.find(s=>s.cycleScenarioId===w.cycleScenarioId)!.amountMxn??0
    const annualFoodRemunerationMxn=foodPerCycleMxn*compatibleKnownCyclesPerMonth*12
    const roadWorkedDayIncomeMxn=annualRoadWagesMxn/poolProductiveWorkedDays
    const workedDayPlanningIncomeMxn=(annualRoadWagesMxn+annualFoodRemunerationMxn)/poolProductiveWorkedDays
    const primaryRoadWagesMxn=roadWorkedDayIncomeMxn*primaryProductiveWorkedDays,reliefRoadWagesMxn=roadWorkedDayIncomeMxn*policy.calendar.primaryVacationWorkedDays
    const primaryFoodRemunerationMxn=annualFoodRemunerationMxn*primaryProductiveWorkedDays/poolProductiveWorkedDays
    const reliefFoodRemunerationMxn=annualFoodRemunerationMxn*policy.calendar.primaryVacationWorkedDays/poolProductiveWorkedDays
    const benefits=calculateMxVariableDriverBenefits({scope:'FIRST_ANNIVERSARY_NO_WAGE_INCREASE_PROJECTION',
      last30WorkedDaysPerceptionsMxn:workedDayPlanningIncomeMxn*30,aguinaldoDailyPlanningMxn:workedDayPlanningIncomeMxn,paidVacationWagesAlreadyInAnnualDistanceWages:false})
    const primaryHolidayPayMxn=workedDayPlanningIncomeMxn*holidayDays
    const primaryAnnualCashMxn=primaryRoadWagesMxn+primaryFoodRemunerationMxn+primaryHolidayPayMxn+benefits.annualBenefitAccrualMxn
    const reliefProratedBenefitsMxn=benefits.annualBenefitAccrualMxn*policy.calendar.reliefCoveredCalendarDays/calendarDays
    const reliefAnnualCashMxn=reliefRoadWagesMxn+reliefFoodRemunerationMxn+reliefProratedBenefitsMxn
    const annualExtraCashMxn=primaryHolidayPayMxn+benefits.annualBenefitAccrualMxn+reliefProratedBenefitsMxn
    const contributionInput=(dailySbcMxn:number,coveredDays:number)=>({dailySbcMxn,coveredDays,umaDailyMxn:policy.umaDailyMxn,
      riskRegistration:september?'EXISTING_RATE_UNKNOWN':'NEW_CARGO_CLASS_V'})
    const primaryContributions=calculateMx2026ContributionReference(contributionInput(primaryAnnualCashMxn/calendarDays,monthCoveredDays))
    const reliefContributions=calculateMx2026ContributionReference(contributionInput(reliefAnnualCashMxn/policy.calendar.reliefCoveredCalendarDays,policy.calendar.reliefCoveredCalendarDays))
    // Unknown risk is omitted ONLY from the explicitly known component sum,
    // not priced as zero or accepted as a complete employer contribution.
    const monthlyContributionReferenceMxn=primaryContributions.knownContributionsMxn+(primaryContributions.workRiskContributionMxn??0)+
      (reliefContributions.knownContributionsMxn+(reliefContributions.workRiskContributionMxn??0))/12
    // Separate declared NL food exemption (art160-I-g) from federal SBC.
    // Additional vacation/holiday/aguinaldo cash remains remuneration taxed by
    // the existing NL scenario. No assertion of actual carrier classification.
    const annualTaxableWagesMxn=primaryAnnualCashMxn+reliefAnnualCashMxn-annualFoodRemunerationMxn,monthlyStateTaxAccrualMxn=annualTaxableWagesMxn*policy.statePayrollRate/12
    const additionalKnownMonthlyComponentsMxn=annualExtraCashMxn/12+monthlyContributionReferenceMxn+monthlyStateTaxAccrualMxn
    const fixedContributionMonthlyMxn=primaryContributions.componentsMxn.EM_FIXED+reliefContributions.componentsMxn.EM_FIXED/12
    const incomeLinkedAdditionalMonthlyMxn=additionalKnownMonthlyComponentsMxn-fixedContributionMonthlyMxn
    const fixedEmployerComponentUsd=fixedContributionMonthlyMxn/fx.mxnPerUsd/compatibleKnownCyclesPerMonth
    const variableWageAndEmployerComponentUsd=w.grossWorkAndRestMxn/fx.mxnPerUsd+incomeLinkedAdditionalMonthlyMxn/fx.mxnPerUsd/compatibleKnownCyclesPerMonth
    const cycleAdditionalComponentUsd=additionalKnownMonthlyComponentsMxn/fx.mxnPerUsd/compatibleKnownCyclesPerMonth
    const wageAndKnownEmployerComponentUsd=w.grossWorkAndRestMxn/fx.mxnPerUsd+cycleAdditionalComponentUsd
    return {cycleScenarioId:w.cycleScenarioId,restInterpretation:w.restInterpretation,capacityConstraints,compatibleKnownCyclesPerMonth,
      monthlyKnownPaidKm:mx.totalCycleKm*compatibleKnownCyclesPerMonth,annualRoadWagesMxn,workedDayPlanningIncomeMxn,
      primary:{annualRoadWagesMxn:primaryRoadWagesMxn,annualHolidayPayMxn:primaryHolidayPayMxn,benefits,annualCashMxn:primaryAnnualCashMxn,contributions:primaryContributions},
      relief:{workedDays:12,coveredCalendarDays:14,annualRoadWagesMxn:reliefRoadWagesMxn,proratedBenefitsMxn:reliefProratedBenefitsMxn,
        annualCashMxn:reliefAnnualCashMxn,contributions:reliefContributions,roadPayAlreadyInKmPool:true,terminationVacationAccrualNotPrimaryLeaveCashReplacement:true},
      annualTaxableWagesMxn,monthlyStateTaxAccrualMxn,monthlyContributionReferenceMxn,additionalKnownMonthlyComponentsMxn,
      fixedContributionMonthlyMxn,incomeLinkedAdditionalMonthlyMxn,fixedEmployerComponentUsd,variableWageAndEmployerComponentUsd,
      payrollAllocationBasis:'SAME_PAIR_COMPATIBLE_FORECAST_CYCLES_NOT_INDEPENDENT_MAX_KM_PROXY',
      knownMonthlyWageAndNormativeComponentsMxn:annualRoadWagesMxn/12+additionalKnownMonthlyComponentsMxn,
      cycleAdditionalComponentUsd,wageAndKnownEmployerComponentUsd,
      ...(foodRemuneration?{foodRemunerationPlanning:{scope:foodRemuneration.scope,foodPerCycleMxn,annualFoodRemunerationMxn,
        primaryFoodRemunerationMxn,reliefFoodRemunerationMxn,annualTotalEmployeeCashMxn:primaryAnnualCashMxn+reliefAnnualCashMxn,
        directFoodAddedToDriverCost:false,weeklyRestAddedToFoodAgain:false,actualPayrollClassificationProven:false}}:{}),
      conditionalKnownVariableSubtotalUsd:v.knownVariableComponentSubtotalUsd-original[0].amountUsd+variableWageAndEmployerComponentUsd,
      conditionalKnownMixedComponentTotalUsd:v.knownVariableComponentSubtotalUsd-original[0].amountUsd+wageAndKnownEmployerComponentUsd,
      replacesOriginalMxPayOnce:true,holidayVacancyReliefRoadPayAddedAgain:false,
      minimumWageMeanContrast:{primaryMeanCalendarDailyMxn:primaryAnnualCashMxn/calendarDays,reliefMeanCoveredDailyMxn:reliefAnnualCashMxn/14,
        professionalDailyFloorMxn:policy.professionalDailyFloorMxn,actualDailyMinimumComplianceCertified:false},
      overtimeMxn:null,sundayOrHolidayWorkPremiumMxn:null,waitMealsLodgingMxn:null,ptuAndOtherBenefitsMxn:null,
      fullCompatibleDriverRosterCostMxn:null,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,
      dutyComplianceProven:false,additionalBobtailDistanceComplete:false,actualPayrollObserved:false,selected:false,quoteReady:false,
      ...(september?{referenceTransfer:{referenceMonth:policy.referenceMonth,fxObservationDate:fx.observationDate!,mxnPerUsd:fx.mxnPerUsd,
        existingEmployerRiskMonthlyMxn:null,completeEmployerContributionMonthlyMxn:null,
        knownContributionSubtotalExcludesUnknownRisk:true,
        nonLaborVariableSubtotalsAreHistoricalNotReconstructed:true,annualMeanIsObservedBimester:false}}:{})}
  })
  return {...policy,sourceRef:'mxDriverForecast',calendar:{...policy.calendar,calendarDays,weeklyRestDates,holidayDays,poolProductiveWorkedDays,primaryProductiveWorkedDays},
    monthCoveredDays,scenarios,driverWorkedDaysInferredFromAssetClock:false,weeklyPublishedSalaryAddedAgain:false,
    normalizedContributionProxyIsActualBimester:false,benefitAccrualIsMonthlyTaxDue:false,stateJurisdictionObserved:false,
    reliefMaintainsExistingCapacityHypothesis:true,reliefRosterOrTimetableProven:false,originalScenariosChanged:false,
    missing:['LABOR_DUTY_OVERTIME_AND_SUNDAY_HOLIDAY_ROSTER','WAIT_PAY_MEALS_LODGING','PTU_AND_EXTRA_BENEFITS_PROFILE',
      'EXISTING_ACTUAL_RISK_AND_TAX_APPLICABILITY_NOT_INFERRED','FULL_GATE_YARD_DISTANCE_AND_CYCLE'],
    completeD2DCostUsd:null,externalWrites:false}
}

/** Join only independently priced components. Existing variable subtotal already
 * has the MX pay replaced; never re-add old pay or whole old operating totals. */
export function joinPilotDriverForecastComponents(rawDriver:unknown,rawPhysical:unknown,rawRoad:unknown){
  const driver=z.object({scenarios:z.array(z.object({cycleScenarioId:cycleId,restInterpretation:restId,
    fixedEmployerComponentUsd:p,conditionalKnownVariableSubtotalUsd:p,replacesOriginalMxPayOnce:z.literal(true)}).passthrough()).length(4)}).passthrough().parse(rawDriver)
  // Until the remaining fixed/road/fuel families are rebuilt, a September
  // labor projection cannot be joined into the historical October whole trip.
  if(driver.referenceMonth==='2026-09')throw new Error('PILOT_PAYROLL_REFERENCE_MIXING')
  const physical=z.object({scenarios:z.array(z.object({id:cycleId,sameBoxChargedOnce:z.literal(true),adminPoolChargedOnce:z.literal(true),
    conditionalFixedAllocations:z.array(z.object({monthlyComponentScenarioId:z.string(),conditionalComponentAllocationUsd:p,
      resources:z.array(z.object({resourceId:z.enum(['MX_TRACTOR','US_TRACTOR','SHARED_TRAILER']),conditionalOldDistanceKnownClockMaxUsd:p}).passthrough()).length(3)}).passthrough()).length(2)}).passthrough()).length(2)}).passthrough().parse(rawPhysical)
  const road=z.object({scenarios:z.array(z.object({cycleScenarioId:cycleId,knownRoadBridgeComponentsUsd:p}).passthrough()).length(2)}).passthrough().parse(rawRoad)
  if(new Set(driver.scenarios.map(s=>`${s.cycleScenarioId}:${s.restInterpretation}`)).size!==4||new Set(physical.scenarios.map(s=>s.id)).size!==2||new Set(road.scenarios.map(s=>s.cycleScenarioId)).size!==2)throw new Error('PILOT_PAYROLL_COMPONENT_DUPLICATE_IDENTITY')
  const scenarios=driver.scenarios.flatMap(d=>{
    const f=physical.scenarios.find(s=>s.id===d.cycleScenarioId)!,r=road.scenarios.find(s=>s.cycleScenarioId===d.cycleScenarioId)!
    if(new Set(f.conditionalFixedAllocations.map(s=>s.monthlyComponentScenarioId)).size!==2)throw new Error('PILOT_PAYROLL_FIXED_ALTERNATIVE_DUPLICATE')
    return f.conditionalFixedAllocations.map(a=>{
      if(new Set(a.resources.map(s=>s.resourceId)).size!==3||Math.abs(a.resources.reduce((sum,s)=>sum+s.conditionalOldDistanceKnownClockMaxUsd,0)-a.conditionalComponentAllocationUsd)>1e-7)throw new Error('PILOT_PAYROLL_FIXED_RESOURCES_NOT_CONSERVED')
      const knownCfuComponentUsd=a.conditionalComponentAllocationUsd+d.fixedEmployerComponentUsd
      const knownCvuComponentUsd=d.conditionalKnownVariableSubtotalUsd+r.knownRoadBridgeComponentsUsd
      return {id:`${d.cycleScenarioId}:${d.restInterpretation}:${a.monthlyComponentScenarioId}`,
        cycleScenarioId:d.cycleScenarioId,restInterpretation:d.restInterpretation,monthlyComponentScenarioId:a.monthlyComponentScenarioId,
        fixedComponents:[...a.resources.map(x=>({id:`BASE_FIXED:${x.resourceId}`,resourceId:x.resourceId,amountUsd:x.conditionalOldDistanceKnownClockMaxUsd})),
          {id:'MX_DRIVER_FIXED_EM_QUOTA',resourceId:'MX_TRACTOR',amountUsd:d.fixedEmployerComponentUsd}],
        variableComponents:[{id:'VARIABLES_WITH_MX_PAY_REPLACED',amountUsd:d.conditionalKnownVariableSubtotalUsd},{id:'KNOWN_ROAD_BRIDGE',amountUsd:r.knownRoadBridgeComponentsUsd}],
        knownCfuComponentUsd,knownCvuComponentUsd,totalKnownComponentsUsd:knownCfuComponentUsd+knownCvuComponentUsd,
        sameBoxChargedOnce:true,adminPoolChargedOnce:true,originalMxPayAddedAgain:false,
        completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,isLowerBound:false,quoteReady:false,selected:false}
    })
  })
  return {model:'FCM_PILOT_KNOWN_COMPONENTS_WITH_MX_PAYROLL_V1',scenarios,allInputsShareKnownCycleScope:true,
    physicallyComplete:false,completeFixedCompanyInsuranceUsd:null,completeDriverDutyUsd:null,completeRoadBorderUsd:null,
    completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,adoptedValues:0,externalWrites:false,
    remaining:['COMPLETE_FIXED_COMPANY_INSURANCE_AND_FINANCED_ASSETS','OVERTIME_WAIT_AND_OTHER_DRIVER_SCOPE',
      'BOBTAIL_DISTANCE_CLOCK_FUEL_MAINTENANCE','IDLE_DEF_US_AUXILIARIES','FULL_ROAD_BORDER_TARIFF_AND_SERVICE_SCOPE']}
}
