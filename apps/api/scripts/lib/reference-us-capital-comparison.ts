import { z } from 'zod'
import { calculateReferenceDebtSchedule } from './reference-debt-schedule.js'

const schema = z.object({
  askingUsd: z.number().finite().positive().max(1e9),
  holdingMonths: z.number().int().min(1).max(360),
  monthlyKm: z.number().finite().positive().max(1e6),
  annualAgeRetention: z.number().positive().max(1),
  retentionPerThousandAdditionalMiles: z.number().positive().max(1),
  listingFeeUsd: z.number().finite().nonnegative().max(1e6),
  acquisitionAdjustmentUsd: z.number().finite().min(-1e9).max(1e9).nullable(),
  otherDisposalCostsUsd: z.number().finite().nonnegative().max(1e9).nullable(),
  downPaymentFraction: z.number().nonnegative().max(1).refine(v => v < 1),
  nominalHypothesis: z.object({
    annualRate: z.number().finite().nonnegative().max(1),
    kind: z.literal('INDEPENDENT_ANALYTICAL_NOMINAL_HYPOTHESIS_NOT_APR_CONVERSION'),
    providerNominalConfirmed: z.literal(false),
  }).strict(),
  loanMonths: z.number().int().min(1).max(360),
  financingFeeMonthlyUsd: z.number().finite().nonnegative().max(1e9).nullable(),
}).strict().refine(s=>s.acquisitionAdjustmentUsd === null || s.askingUsd+s.acquisitionAdjustmentUsd > 0,
  'Acquisition adjustment must leave a positive capitalizable acquisition')

/** Public research comparison, never an adopted budget or lender quote.
 * The same forward mileage drives residual and distance divisor. Missing adders
 * remain null: a computable component is not a lower bound on actual cost. */
export function calculateUsCapitalComparison(raw: unknown) {
  const input = schema.parse(raw)
  const additionalMiles = input.monthlyKm / 1.609344 * input.holdingMonths
  const retention = input.annualAgeRetention ** (input.holdingMonths / 12) *
    input.retentionPerThousandAdditionalMiles ** (additionalMiles / 1000)
  const grossEndpointUsd = input.askingUsd * retention
  const askingValueLossMonthlyUsd = (input.askingUsd - grossEndpointUsd) / input.holdingMonths
  const listingAllocationMonthlyUsd = input.listingFeeUsd / input.holdingMonths
  const supportedCashComponentMonthlyUsd = askingValueLossMonthlyUsd + listingAllocationMonthlyUsd
  // Zero here means the schedule excludes fees, NOT that a lender charges none.
  // Actual unknown fees remain null outside this pure amortization calculation.
  const schedule = calculateReferenceDebtSchedule({currency:'USD',
    principal:input.askingUsd * (1-input.downPaymentFraction),
    rateKind:'EXPLICIT_PLANNING_NOMINAL_ANNUAL', annualRate:input.nominalHypothesis.annualRate,
    termMonths:input.loanMonths, comparisonMonths:input.holdingMonths,
    totalGraceMonths:0, graceTreatment:'CAPITALIZE_MONTHLY_INTEREST',
    openingFeeCash:0, feeTreatment:'PAID_UPFRONT_EXCLUDED_FROM_PRINCIPAL', balloon:0})
  const analyticalInterestMonthlyUsd = schedule.averageInterestOverComparisonMonths
  const completeDepreciation = input.acquisitionAdjustmentUsd === null || input.otherDisposalCostsUsd === null
    ? null : supportedCashComponentMonthlyUsd +
      (input.acquisitionAdjustmentUsd + input.otherDisposalCostsUsd) / input.holdingMonths
  const completeFinanced = completeDepreciation === null || input.financingFeeMonthlyUsd === null
    ? null : completeDepreciation + analyticalInterestMonthlyUsd + input.financingFeeMonthlyUsd
  return {input, classification:'PUBLIC_COMPONENTS_WITH_DECLARED_FINANCE_SENSITIVITY' as const,
    additionalMiles, retention, grossEndpointUsd, askingValueLossMonthlyUsd, listingAllocationMonthlyUsd,
    cash:{supportedComponentMonthlyUsd:supportedCashComponentMonthlyUsd, debtInterestUsd:0,
      completeCapitalMonthlyUsd:completeDepreciation},
    financed:{supportedAndHypothesizedComponentMonthlyUsd:supportedCashComponentMonthlyUsd+analyticalInterestMonthlyUsd,
      analyticalInterestMonthlyUsd, regularDebtPaymentUsd:schedule.regularPaymentAfterGrace,
      borrowedAskingPrincipalUsd:schedule.originalBorrowedPrincipal,
      balanceAtHoldingEndUsd:input.holdingMonths >= input.loanMonths ? 0 : schedule.rows[input.holdingMonths-1].closingBalance,
      completeCapitalMonthlyUsd:completeFinanced, unknownFeesExcludedFromScheduleNotAssumedZero:true,
      principalOrFullPaymentAddedToCapital:false, debtSchedule:schedule},
    sameAssetDepreciationAcrossModes:true, holdingIsRemainingServiceLife:false,
    currentOdometerAddedToIncrementalExponent:false, listingIsAllDisposalCosts:false,
    futureSaleOrFutureFeeGuaranteed:false, providerAprConvertedToNominal:false,
    actualContractObserved:false, componentsAreCostOrCfuFloor:false,
    eligibleForBudget:false, appliedToPilot:false, calibrated:false,
    completeFormula:'(asking - grossResidual + acquisitionAdjustment + listingFee + otherDisposalCosts)/holdingMonths + scenarioInterest + financingFeeMonthly',
    completeCfuUsd:null, completeD2dUsd:null,
  }
}
