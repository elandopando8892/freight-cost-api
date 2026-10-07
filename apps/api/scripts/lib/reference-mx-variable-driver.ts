import {z} from 'zod'

const n=z.number().finite().nonnegative().max(1e9),p=n.positive()
const month=z.string().regex(/^2026-(0[2-9]|1[0-2])$/)
const periodMonth=z.string().regex(/^2026-(0[1-9]|1[0-2])$/)
const historyRow=z.object({month:periodMonth,eligibleVariableReceiptsMxn:n,daysSalaryEarned:z.number().int().positive().max(31)}).strict()
const employerSchema=z.object({month,scope:z.literal('DECLARED_PROSPECTIVE_VARIABLE_OR_MIXED_NO_ABSENCE'),
  previousBimester:z.array(historyRow).length(2),allEligibleVariableReceiptsDeclared:z.literal(true),
  fixedIntegratedDailyMxn:n,currentGrossWagesIncludingRestMxn:p,
  annualBenefitAccrualMxn:n,benefitAccrualIncludedInCurrentWages:z.boolean(),
  umaDailyMxn:z.literal(117.31),riskRegistration:z.enum(['NEW_CARGO_CLASS_V','EXISTING_RATE_UNKNOWN'])}).strict()

/** Shared statutory rates for a declared full/partial coverage period. Partial
 * coverage is a separate employment projection, NOT an absence adjustment. */
export function calculateMx2026ContributionReference(raw:unknown){
  const i=z.object({dailySbcMxn:p,coveredDays:z.number().int().positive().max(31),umaDailyMxn:z.literal(117.31),
    riskRegistration:z.enum(['NEW_CARGO_CLASS_V','EXISTING_RATE_UNKNOWN'])}).strict().parse(raw)
  if(i.dailySbcMxn<4.01*i.umaDailyMxn)throw new Error('MX_VARIABLE_CEAV_BRACKET_OUT_OF_SCOPE')
  const cappedDailySbcMxn=Math.min(i.dailySbcMxn,25*i.umaDailyMxn),sbcPeriodBaseMxn=cappedDailySbcMxn*i.coveredDays
  const componentsMxn={EM_FIXED:.204*i.umaDailyMxn*i.coveredDays,
    EM_EXCESS:.011*Math.max(cappedDailySbcMxn-3*i.umaDailyMxn,0)*i.coveredDays,
    EM_CASH:.007*sbcPeriodBaseMxn,PENSIONERS_MEDICAL:.0105*sbcPeriodBaseMxn,
    INVALIDITY_LIFE:.0175*sbcPeriodBaseMxn,CHILDCARE_SOCIAL:.01*sbcPeriodBaseMxn,
    RETIREMENT:.02*sbcPeriodBaseMxn,CEAV:.07513*sbcPeriodBaseMxn,HOUSING:.05*sbcPeriodBaseMxn}
  const knownContributionsMxn=Object.values(componentsMxn).reduce((v,x)=>v+x,0)
  const workRiskContributionMxn=i.riskRegistration==='NEW_CARGO_CLASS_V'?sbcPeriodBaseMxn*.0758875:null
  return {...i,cappedDailySbcMxn,sbcPeriodBaseMxn,componentsMxn,knownContributionsMxn,workRiskContributionMxn}
}

/** LSS30 variable/mixed base: eligible receipts / earned days, plus separately
 * declared integrated fixed elements. NOT the fixed salary /30 integration factor.
 * Accrual is economic expense, not automatically a receipt or SBC adjustment.
 * This narrow projection rejects absences, other CEAV brackets and unmatched periods. */
export function calculateMxVariableEmployerMonth(raw:unknown){
  const i=employerSchema.parse(raw),m=Number(i.month.slice(5))
  const previousFirstMonth=2*Math.floor((m-1)/2)-1
  if(m<3||i.previousBimester.some((r,index)=>Number(r.month.slice(5))!==previousFirstMonth+index))throw new Error('MX_VARIABLE_BIMESTER_MISMATCH')
  const coveredDays=new Date(Date.UTC(2026,m,0)).getUTCDate()
  for(const r of i.previousBimester)if(r.daysSalaryEarned>new Date(Date.UTC(2026,Number(r.month.slice(5)),0)).getUTCDate())throw new Error('MX_VARIABLE_EARNED_DAYS_OUT_OF_PERIOD')
  const previousEarnedDays=i.previousBimester.reduce((v,r)=>v+r.daysSalaryEarned,0)
  const variableDailyMxn=i.previousBimester.reduce((v,r)=>v+r.eligibleVariableReceiptsMxn,0)/previousEarnedDays
  const integratedDailySbcMxn=variableDailyMxn+i.fixedIntegratedDailyMxn
  const {cappedDailySbcMxn,sbcPeriodBaseMxn,componentsMxn,knownContributionsMxn,workRiskContributionMxn}=calculateMx2026ContributionReference({
    dailySbcMxn:integratedDailySbcMxn,coveredDays,umaDailyMxn:i.umaDailyMxn,riskRegistration:i.riskRegistration})
  const additionalBenefitAccrualMxn=i.benefitAccrualIncludedInCurrentWages?0:i.annualBenefitAccrualMxn/12
  return {...i,coveredDays,previousEarnedDays,variableDailyMxn,integratedDailySbcMxn,cappedDailySbcMxn,sbcPeriodBaseMxn,
    componentsMxn,knownContributionsMxn,workRiskContributionMxn,additionalBenefitAccrualMxn,
    knownMonthlyComponentsMxn:i.currentGrossWagesIncludingRestMxn+additionalBenefitAccrualMxn+knownContributionsMxn+(workRiskContributionMxn??0),
    unknownRiskExcludedFromKnownSubtotal:workRiskContributionMxn===null,statePayrollTaxMxn:null,otherEmployerCostsMxn:null,
    completeMonthlyEmployerCostMxn:null,actualPayrollObserved:false,workerWithholdingAdded:false,
    fixedSalaryFactorApplied:false,sbcAddedAsCashExpense:false,benefitAccrualAutomaticallyAddedToSbc:false,quoteReady:false}
}

/** Full first-anniversary planning accrual, not leave replaced with cash.
 * Art259/89 worked-day average is distinct from LSS earned-day denominator.
 * Aguinaldo daily basis is independently supplied; no legal equivalence presumed. */
export function calculateMxVariableDriverBenefits(raw:unknown){
  const i=z.object({scope:z.literal('FIRST_ANNIVERSARY_NO_WAGE_INCREASE_PROJECTION'),
    last30WorkedDaysPerceptionsMxn:p,aguinaldoDailyPlanningMxn:p,
    paidVacationWagesAlreadyInAnnualDistanceWages:z.boolean()}).strict().parse(raw)
  const vacationDailyMxn=i.last30WorkedDaysPerceptionsMxn/30,annualVacationWagesMxn=vacationDailyMxn*12
  const annualVacationPremiumMxn=annualVacationWagesMxn*.25,annualAguinaldoMxn=i.aguinaldoDailyPlanningMxn*15
  const additionalAnnualVacationWagesMxn=i.paidVacationWagesAlreadyInAnnualDistanceWages?0:annualVacationWagesMxn
  return {...i,vacationDailyMxn,annualVacationWagesMxn,additionalAnnualVacationWagesMxn,annualVacationPremiumMxn,annualAguinaldoMxn,
    annualBenefitAccrualMxn:additionalAnnualVacationWagesMxn+annualVacationPremiumMxn+annualAguinaldoMxn,
    daysWorkedInferredFromAssetClock:false,vacationReplacedByCash:false,quoteReady:false}
}

const policySchema=z.object({model:z.literal('FCM_MX_VARIABLE_DRIVER_PUBLIC_RULES_V1'),reviewedAt:z.string().datetime(),
  restRate:z.literal(.1666),rateMxnPerPaidKm:z.literal(2.1),rateGrossness:z.literal('UNCONFIRMED_GROSS_INTERPRETATION_HYPOTHESIS'),
  sources:z.array(z.object({id:z.string(),url:z.string().url(),locator:z.string(),archive:z.object({file:z.string(),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict().nullable()}).strict()).min(3),
  assumptions:z.array(z.string()).min(6),adoptedValues:z.literal(0),quoteReady:z.literal(false)}).strict()
const pilotSchema=z.object({scenarios:z.array(z.object({cycleScenarioId:z.string(),knownVariableComponentSubtotalUsd:p,
  rows:z.array(z.object({id:z.string(),km:p,amountNative:p,amountUsd:p}).passthrough())}).passthrough()).length(2)}).passthrough()

/** Preserve original public pay proxy. Alternative wage row replaces it, never
 * adds a second MX payroll row. No inference of SBC/capacity from weekly salary. */
export function calculateMxDriverRestAlternatives(rawPolicy:unknown,rawPilot:unknown,rawFx:unknown){
  const policy=policySchema.parse(rawPolicy),pilot=pilotSchema.parse(rawPilot)
  const fx=z.object({mxnPerUsd:z.literal(18.3688)}).passthrough().parse(rawFx)
  if(new Set(pilot.scenarios.map(s=>s.cycleScenarioId)).size!==2)throw new Error('MX_DRIVER_DUPLICATE_CYCLE')
  const scenarios=pilot.scenarios.flatMap(s=>{
    const rows=s.rows.filter(r=>r.id==='MX_DRIVER_PAY')
    if(rows.length!==1||new Set(s.rows.map(r=>r.id)).size!==s.rows.length)throw new Error('MX_DRIVER_PAY_ROW_IDENTITY')
    const pay=rows[0]
    if(Math.abs(pay.km*policy.rateMxnPerPaidKm-pay.amountNative)>1e-7||Math.abs(pay.amountNative/fx.mxnPerUsd-pay.amountUsd)>1e-7)throw new Error('MX_DRIVER_PAY_SCOPE_MISMATCH')
    if(Math.abs(s.rows.reduce((v,r)=>v+r.amountUsd,0)-s.knownVariableComponentSubtotalUsd)>1e-7)throw new Error('MX_DRIVER_SUBTOTAL_NOT_CONSERVED')
    return (['RATE_EXCLUDES_WEEKLY_REST','RATE_INCLUDES_WEEKLY_REST'] as const).map(restInterpretation=>{
      const workPayMxn=restInterpretation==='RATE_EXCLUDES_WEEKLY_REST'?pay.amountNative:pay.amountNative/(1+policy.restRate)
      const weeklyRestPayMxn=workPayMxn*policy.restRate,grossWorkAndRestMxn=workPayMxn+weeklyRestPayMxn
      const replacementAmountUsd=grossWorkAndRestMxn/fx.mxnPerUsd
      return {cycleScenarioId:s.cycleScenarioId,restInterpretation,paidKnownPhysicalKm:pay.km,workPayMxn,weeklyRestPayMxn,grossWorkAndRestMxn,
        replacementRow:{id:'MX_DRIVER_PAY',amountNative:grossWorkAndRestMxn,amountUsd:replacementAmountUsd},
        originalPayRowRemovedOnce:true,originalPayMxn:pay.amountNative,
        conditionalKnownVariableSubtotalUsd:s.knownVariableComponentSubtotalUsd-pay.amountUsd+replacementAmountUsd,
        completeEmployerPayMxn:null,completeCvuUsd:null,completeD2DCostUsd:null,selected:false,quoteReady:false,
        paidWaitLodgingMealsMxn:null,benefitAccrualMxn:null,sbcDailyMxn:null,employerContributionsMxn:null,
        extraBobtailKmDefaultedToZero:false,advertisedWeeklyPayAddedAgain:false}
    })
  })
  return {...policy,sourceRef:'mxVariableDriver',scenarios,originalVariableScenariosChanged:false,
    grossNetConfirmed:false,restInclusionConfirmed:false,capacityFromWeeklyPayInferred:false,
    missing:['DECLARED_PROSPECTIVE_GROSS_AND_REST_SCOPE','PLANNED_WORKED_DAY_BENEFIT_BASE_AND_VACATION_PRODUCTIVE_CAPACITY',
      'DECLARED_VARIABLE_BIMESTER_AND_FIXED_INTEGRATED_ELEMENTS','STATE_PAYROLL_TAX_JURISDICTION',
      'WAIT_PAY_LODGING_MEALS_AND_ADDITIONAL_BOBTAIL_DISTANCE','EXTRA_BENEFITS_SCOPE_NOT_ZERO'],
    completeD2DCostUsd:null,externalWrites:false}
}
