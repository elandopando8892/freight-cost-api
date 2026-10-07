import { z } from 'zod'

// Research arithmetic only. No provider contract, quote engine, persistence or FX.
const schema = z.object({
  currency: z.enum(['MXN', 'USD']), principal: z.number().finite().positive().max(1e12),
  rateKind: z.literal('EXPLICIT_PLANNING_NOMINAL_ANNUAL'),
  annualRate: z.number().finite().nonnegative().max(1),
  termMonths: z.number().int().min(1).max(360),
  comparisonMonths: z.number().int().min(1).max(360),
  totalGraceMonths: z.number().int().nonnegative(),
  graceTreatment: z.literal('CAPITALIZE_MONTHLY_INTEREST'),
  openingFeeCash: z.number().finite().nonnegative().max(1e12),
  feeTreatment: z.literal('PAID_UPFRONT_EXCLUDED_FROM_PRINCIPAL'),
  balloon: z.literal(0),
}).strict().refine(s => s.totalGraceMonths < s.termMonths, 'Grace must leave at least one payment')

/** Level monthly payments after explicitly capitalized grace. Unrounded research
 * schedule, not a lender's cent/day-count schedule. APR/CAT cannot enter as nominal.
 * Comparison can outlive the loan: subsequent interest is zero, not extrapolated. */
export function calculateReferenceDebtSchedule(raw: unknown) {
  const input = schema.parse(raw)
  const r = input.annualRate / 12
  const payments = input.termMonths - input.totalGraceMonths
  const afterGrace = input.principal * (1 + r) ** input.totalGraceMonths
  const payment = r === 0 ? afterGrace / payments
    : afterGrace * r / -Math.expm1(-payments * Math.log1p(r))
  let balance = input.principal
  const rows = []
  for (let month = 1; month <= input.termMonths; month++) {
    const openingBalance = balance
    const accruedInterest = openingBalance * r
    const inGrace = month <= input.totalGraceMonths
    const cashDebtService = inGrace ? 0 : month === input.termMonths ? openingBalance + accruedInterest : payment
    const capitalizedInterest = inGrace ? accruedInterest : 0
    const balanceReduction = inGrace ? 0 : cashDebtService - accruedInterest
    balance = inGrace ? openingBalance + accruedInterest : Math.max(0, openingBalance - balanceReduction)
    rows.push({ month, openingBalance, accruedInterest, cashDebtService, capitalizedInterest, balanceReduction, closingBalance: balance })
  }
  const totalAccruedInterest = rows.reduce((sum, row) => sum + row.accruedInterest, 0)
  const comparisonAccruedInterest = rows.filter(row => row.month <= input.comparisonMonths)
    .reduce((sum, row) => sum + row.accruedInterest, 0)
  const totalDebtService = rows.reduce((sum, row) => sum + row.cashDebtService, 0)
  if (![payment, totalAccruedInterest, totalDebtService, comparisonAccruedInterest].every(Number.isFinite)) {
    throw new Error('FINANCING_NUMERIC_RANGE_EXCEEDED')
  }
  return {
    classification: 'DECLARED_PLANNING_ARITHMETIC_NOT_LENDER_QUOTE' as const,
    input, rows, regularPaymentAfterGrace: payment, totalAccruedInterest,
    averageInterestOverLoanMonths: totalAccruedInterest / input.termMonths,
    averageInterestOverComparisonMonths: comparisonAccruedInterest / input.comparisonMonths,
    totalDebtService, originalBorrowedPrincipal: input.principal,
    capitalizedGraceInterest: afterGrace - input.principal,
    openingFeeCash: input.openingFeeCash, openingFeeEconomicMonthlyAllocation: null,
    actualContractMonthlyInterest: null, eligibleForBudget: false as const,
    principalRepaymentsAddedToDepreciation: false as const,
    // With capitalized grace, balance reduction includes that capitalized interest;
    // do not relabel its sum as only the original principal.
    costBridge: 'sameAssetDepreciation + averageAccruedInterest + separatelyDocumentedFeeAllocation',
  }
}
