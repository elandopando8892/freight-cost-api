import { z } from 'zod'

const schema = z.object({
  month: z.string().regex(/^2026-(0[2-9]|1[0-2])$/),
  monthlySalaryMxn: z.number().finite().positive().max(1e7),
  compensationBasis: z.literal('GROSS_FIXED_WAGES_ONLY_HYPOTHESIS'),
  profile: z.literal('FIRST_YEAR_MINIMUM_BENEFITS_NO_ABSENCE'),
  umaDailyMxn: z.literal(117.31),
  ceavRate: z.literal(0.07513),
}).strict()

/** Narrow public counterfactual, NOT payroll determination or a universal burden.
 * Only complete 2026 Feb-Dec months, fixed wages, first-year minimum benefits,
 * full coverage/no absences, daily base >=4.01 UMA. Other regimes fail closed. */
export function calculateMxEmployerReference(raw: unknown) {
  const input = schema.parse(raw)
  const [year, month] = input.month.split('-').map(Number)
  const coveredDays = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const salaryDailyMxn = input.monthlySalaryMxn / 30
  if (salaryDailyMxn < 4.01 * input.umaDailyMxn) throw new Error('MX_EMPLOYER_PROFILE_OUT_OF_SCOPE')
  const annualAguinaldoMxn = salaryDailyMxn * 15
  const annualVacationPremiumMxn = salaryDailyMxn * 12 * .25
  const integrationFactor = 1 + (15 + 12 * .25) / 365
  const integratedDailySbcMxn = salaryDailyMxn * integrationFactor
  const cappedDailySbcMxn = Math.min(integratedDailySbcMxn, 25 * input.umaDailyMxn)
  const sbcPeriodBaseMxn = cappedDailySbcMxn * coveredDays
  const componentsMxn = {
    EM_FIXED: .204 * input.umaDailyMxn * coveredDays,
    EM_EXCESS: .011 * Math.max(cappedDailySbcMxn - 3 * input.umaDailyMxn, 0) * coveredDays,
    EM_CASH: .007 * sbcPeriodBaseMxn,
    PENSIONERS_MEDICAL: .0105 * sbcPeriodBaseMxn,
    INVALIDITY_LIFE: .0175 * sbcPeriodBaseMxn,
    CHILDCARE_SOCIAL: .01 * sbcPeriodBaseMxn,
    RETIREMENT: .02 * sbcPeriodBaseMxn,
    CEAV: input.ceavRate * sbcPeriodBaseMxn,
    HOUSING: .05 * sbcPeriodBaseMxn,
  }
  const knownContributionComponentMxn = Object.values(componentsMxn).reduce((s, v) => s + v, 0)
  const meanMonthBenefitAccrualMxn = (annualAguinaldoMxn + annualVacationPremiumMxn) / 12
  return { ...input, coveredDays, salaryDailyMxn, integrationFactor, integratedDailySbcMxn,
    cappedDailySbcMxn, sbcPeriodBaseMxn, annualAguinaldoMxn, annualVacationPremiumMxn,
    meanMonthBenefitAccrualMxn, componentsMxn, knownContributionComponentMxn,
    conditionalComponentSumMxn: input.monthlySalaryMxn + meanMonthBenefitAccrualMxn + knownContributionComponentMxn,
    ceavPublishedBracket: '4.01 UMA and above',
    paidVacationWageAddedAgain: false, sbcAddedAsCashCost: false,
    workerWithholdingAdded: false, creditWithholdingAdded: false,
    workRiskContributionMxn: null, statePayrollTaxMxn: null, otherEmployerCostsMxn: null,
    completeMonthlyEmployerCostMxn: null, effectiveCompleteBurden: null,
    isObservedPayroll: false, isLowerBound: false, eligibleForBudget: false, selected: false,
  }
}
