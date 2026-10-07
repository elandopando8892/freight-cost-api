import { createHash } from 'node:crypto'
import { z } from 'zod'
import { readLocalDocument } from '../assemble-economic-reference-cards.js'
import { calculateMx2026ContributionReference } from './reference-mx-variable-driver.js'

export const B2_BENEFITS_PIN = {
  id: 'b2RecurringBenefitsReview', file: 'docs/research/B2_RECURRING_BENEFITS_EVIDENCE_2026-10-03.json',
  sha256: '3bde7f883fc16c12014c650fba822475a5a19eb737708001079b338974a93416',
  hashPolicy: 'UTF8_CRLF_TO_LF_NO_OTHER_NORMALIZATION',
} as const
const evidenceSchema = z.object({
  model: z.literal('FCM_B2_RECURRING_BENEFITS_EVIDENCE_V1'), observedOn: z.literal('2026-10-03'),
  mx: z.object({ sourceUrl: z.literal('https://careers.trayecto.com/operador-ala-u1hSQWtXJaoU/'),
    monthlyVoucherMxnPerEmployee: z.literal(3430), welcomeBonusMxn: z.literal(10000), welcomeRecurring: z.literal(false),
    employerSavingsFundMonthlyMxn: z.null(), employerPensionMonthlyMxn: z.null(),
    historicalSeptemberOfferVerified: z.literal(false), independentEmployerCount: z.literal(1) }).passthrough(),
  us: z.object({ sourceUrl: z.literal('https://www.bls.gov/news.release/archives/ecec_09092026.htm'),
    dataPeriod: z.literal('2026-06'), totalHourlyUsd: z.literal(36.38), wagesHourlyUsd: z.literal(24.97), benefitsHourlyUsd: z.literal(11.41),
    categoryHourlyUsd: z.object({ paidLeave: z.literal(2.13), supplementalPay: z.literal(1.31), insurance: z.literal(3.51),
      retirementSavings: z.literal(1.47), legallyRequired: z.literal(3) }).strict(),
    truckDriverOnly: z.literal(false), actualCarrierCoverageVerified: z.literal(false) }).passthrough(),
  calculationContext: z.object({ umaDailyMxn: z.literal(117.31), primaryEmployeeMonths: z.literal(1),
    treatment: z.literal('FULL_SBC_INTEGRATION_HYPOTHETICAL_SENSITIVITY_ONLY_NOT_TAX_DETERMINATION'),
    actualExclusionOrIntegrationVerified: z.literal(false), reliefEmployeeMonths: z.null(), employerRiskDeltaMxn: z.null(),
    statePayrollTaxDeltaMxn: z.null(), voucherVendorFeesMxn: z.null(), additionalStatutoryAccrualDeltaMxn: z.null() }).passthrough(),
  calibrated: z.literal(false), quoteReady: z.literal(false), adoptedValues: z.literal(0),
}).passthrough()
export function readB2BenefitsEvidence(read = readLocalDocument) {
  const body = read(B2_BENEFITS_PIN.file).replace(/\r\n/g, '\n')
  if (createHash('sha256').update(body).digest('hex') !== B2_BENEFITS_PIN.sha256) throw new Error('B2_BENEFITS_SOURCE_HASH')
  return evidenceSchema.parse(JSON.parse(body))
}

const inputSchema = z.object({
  cycleId: z.enum(['NETWORK_EXPECTED_EMPTY_PROXY', 'DEDICATED_EMPTY_SAME_BOX_RETURN']),
  baselineDailySbcMxn: z.number().finite().positive().max(1e9),
  compatibleCyclesPerMonth: z.number().finite().positive().max(31),
  baselinePeriod: z.literal('2026-10'), baselineIncludesVoucher: z.literal(false),
  baselineBasis: z.literal('EXISTING_ANNUAL_MEAN_WITH_FOOD_NOT_OBSERVED_BIMESTER'),
}).strict()

/** A single employee-month comparator, NOT a full roster or adopted CVU.
 * Full integration is just a labelled sensitivity; the actual taxable base,
 * relief entitlement, risk premium, state tax and accrual effects remain null.
 * Reuse the contribution primitive twice and subtract, never charge the whole
 * baseline, SBC itself, or another fixed EM quota as cash expense. */
export function comparePrimaryMonthlyVoucher(raw: unknown) {
  const i = inputSchema.parse(raw), evidence = readB2BenefitsEvidence()
  const directMonthlyMxn = evidence.mx.monthlyVoucherMxnPerEmployee
  const contributionInput = { coveredDays: 30, umaDailyMxn: evidence.calculationContext.umaDailyMxn,
    riskRegistration: 'EXISTING_RATE_UNKNOWN' }
  const before = calculateMx2026ContributionReference({ ...contributionInput, dailySbcMxn: i.baselineDailySbcMxn })
  const after = calculateMx2026ContributionReference({ ...contributionInput, dailySbcMxn: i.baselineDailySbcMxn + directMonthlyMxn / 30 })
  const componentDeltaMxn = Object.fromEntries(Object.keys(before.componentsMxn).map(key => {
    const k = key as keyof typeof before.componentsMxn
    return [k, after.componentsMxn[k] - before.componentsMxn[k]]
  }))
  const nonRiskContributionDeltaMxn = after.knownContributionsMxn - before.knownContributionsMxn
  if (componentDeltaMxn.EM_FIXED !== 0 || nonRiskContributionDeltaMxn < 0 || !Number.isFinite(nonRiskContributionDeltaMxn))
    throw new Error('B2_BENEFITS_DELTA_BOUNDARY')
  return { ...i, directMonthlyMxn, primaryEmployeeMonths: 1,
    actualTaxTreatment: 'UNRESOLVED', actualContributionDeltaMxn: null,
    fullIntegrationSensitivity: {
      treatment: evidence.calculationContext.treatment, coveredDays: 30,
      baselineDailySbcMxn: before.dailySbcMxn, hypotheticalDailySbcMxn: after.dailySbcMxn,
      cappedDailySbcMxn: after.cappedDailySbcMxn, componentDeltaMxn, nonRiskContributionDeltaMxn,
      knownMonthlyComponentMxn: directMonthlyMxn + nonRiskContributionDeltaMxn,
      employerRiskDeltaMxn: null, statePayrollTaxDeltaMxn: null, additionalStatutoryAccrualDeltaMxn: null,
      voucherVendorFeesMxn: null, completePrimaryEmployerIncrementMxn: null,
    },
    reliefEmployeeMonths: null, reliefVoucherMonthlyMxn: null, completeRosterBenefitsMonthlyMxn: null,
    newFixedEmployerQuotaMxn: 0, statutoryBenefitsAddedAgain: false, welcomeBonusAdded: false,
    candidateConcept: 'MX_DRIVER_TOTAL', candidatePartition: 'EXISTING_INCOME_LINKED_CVU_COMPARISON_NOT_ADOPTED',
    acceptedForSeptember: false, knownComponentIsLowerBound: false, calibrated: false, quoteReady: false, adoptedValues: 0,
  }
}

export function reviewUsAggregateBenefitBoundary() {
  const { us } = readB2BenefitsEvidence()
  const roundedCategorySumHourlyUsd = Object.values(us.categoryHourlyUsd).reduce((sum, value) => sum + value, 0)
  return { sourceUrl: us.sourceUrl, dataPeriod: us.dataPeriod, cohort: 'TRANSPORTATION_AND_MATERIAL_MOVING_NOT_TRUCK_DRIVER_ONLY',
    totalHourlyUsd: us.totalHourlyUsd, wagesHourlyUsd: us.wagesHourlyUsd, benefitsHourlyUsd: us.benefitsHourlyUsd,
    categoriesAlreadyRepresented: us.categoryHourlyUsd,
    roundedCategorySumHourlyUsd, categoryRoundingDifferenceUsd: roundedCategorySumHourlyUsd - us.benefitsHourlyUsd,
    employerFactor: us.totalHourlyUsd / us.wagesHourlyUsd,
    aggregateReplacedWithRoundedCategorySum: false, extraBonusOrBenefitsAdded: false,
    incrementalUsd: null, actualCarrierCompensationVerified: false, quoteReady: false,
  }
}
