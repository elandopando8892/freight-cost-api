import { z } from 'zod'

const schema = z.object({
  year: z.literal(2026),
  jurisdiction: z.literal('NUEVO_LEON'),
  monthlySalaryMxn: z.number().finite().positive().max(1e7),
  compensationBasis: z.literal('GROSS_FIXED_WAGES_ONLY_HYPOTHESIS'),
  profile: z.literal('FIRST_YEAR_MINIMUM_BENEFITS_NO_ABSENCE'),
  annualPaymentHypothesis: z.literal('TWELVE_WAGES_AGUINALDO_VACATION_PREMIUM'),
  reliefHypothesis: z.literal('NO_SPECIAL_EXEMPT_PERSON_ENTITY_OR_CREDIT_ASSUMED'),
  referenceRate: z.literal(0.03),
}).strict()

/** Narrow annual research accrual, not a tax declaration or an employer total.
 * Paid remuneration is distinct from contribution SBC and employer contributions. */
export function calculateNlPayrollTaxReference(input: unknown) {
  const p = schema.parse(input)
  const annualWagesMxn = p.monthlySalaryMxn * 12
  const annualAguinaldoMxn = p.monthlySalaryMxn / 30 * 15
  const annualVacationPremiumMxn = p.monthlySalaryMxn / 30 * 12 * 0.25
  const annualTaxableRemunerationHypothesisMxn = annualWagesMxn + annualAguinaldoMxn + annualVacationPremiumMxn
  const annualTaxReferenceMxn = annualTaxableRemunerationHypothesisMxn * p.referenceRate
  return {
    ...p, annualWagesMxn, annualAguinaldoMxn, annualVacationPremiumMxn,
    annualTaxableRemunerationHypothesisMxn, annualTaxReferenceMxn,
    meanMonthTaxAccrualMxn: annualTaxReferenceMxn / 12,
    basis: 'ANNUAL_PAID_COMPONENTS_HYPOTHESIS_NOT_SBC' as const,
    monthlyTaxDueMxn: null, completeMonthlyEmployerCostMxn: null,
    sbcUsedAsTaxBase: false, employerContributionsIncludedInTaxBase: false,
    paidVacationWageAddedAgain: false, actualExemptionEligibilityEstablished: false,
    isObservedPayroll: false, isLowerBound: false, eligibleForBudget: false, selected: false,
  }
}
