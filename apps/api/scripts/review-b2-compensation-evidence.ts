import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { consolidateBinationalReferenceBudget } from './consolidate-binational-reference-budget.js'
import { composePublicPilotCost } from './compose-public-pilot-cost.js'
import { B2_OPERATING_PROFILE_PIN, readB2OperatingProfile } from './lib/b2-operating-profile.js'
import { B2_BENEFITS_PIN, comparePrimaryMonthlyVoucher, readB2BenefitsEvidence, reviewUsAggregateBenefitBoundary } from './lib/b2-recurring-benefits.js'
import { B2_MX_BASKETS_PIN, reviewMxBenefitBaskets } from './lib/b2-mx-benefit-baskets.js'

/** Read-only research adapter; no route/DB/engine defaults and no amounts from
 * CLI. Existing dated cash reference is reused only to isolate benefit effects.
 * Financing does not select employee benefits; neither funding mode is adopted. */
export function reviewB2CompensationEvidence() {
  const profile = readB2OperatingProfile(), evidence = readB2BenefitsEvidence()
  if (profile.benchmark.mxMonthlyVoucherComparator.sourceUrl !== evidence.mx.sourceUrl ||
      profile.benchmark.mxMonthlyVoucherComparator.publishedVouchersMxnPerEmployeeMonth !== evidence.mx.monthlyVoucherMxnPerEmployee)
    throw new Error('B2_BENEFITS_PROFILE_SOURCE_MISMATCH')
  const research = consolidateBinationalReferenceBudget(undefined, undefined, 'POSTAL_REFERENCE', 'PUBLIC_LINK_FORECAST', 'IMT_C3_NON_ARTICULATED_PROXY')
  const pilot = composePublicPilotCost(research, {
    monthlyBudget: { cashTaxScenario: 'NET_PLUS_VAT', financeMonthlyScenarioId: null,
      boxInsuranceAlternativeId: 'PUBLIC_GUIDE_LOW', mxYardAlternativeId: 'NET_PLUS_VAT_RESERVE' },
    restInterpretation: 'RATE_EXCLUDES_WEEKLY_REST', defFraction: .04,
    borderLinkBasis: 'PUBLIC_LINK_FORECAST', bobtailWearBasis: 'IMT_C3_NON_ARTICULATED_PROXY',
    usMaintenanceBasis: 'ATRI2024_ALL_RM_PLANNING', usDriverBasis: 'BLS2025_ECEC2026_MIE_PLANNING',
    mxFoodEmployerBasis: 'REMUNERATIVE_FOOD_NL_EXEMPT_PLANNING',
  })
  const usBoundary = reviewUsAggregateBenefitBoundary(), mxBenefitBaskets = reviewMxBenefitBaskets()
  const cases = pilot.cases.map(c => {
    if (!c.mxFoodEmployerPlanning || !c.usDriverPlanning) throw new Error('B2_BENEFITS_BASELINE_REQUIRED')
    const capacities = research.supportingPilotOrdinaryDuty.driver.scenarios.filter(s =>
      s.cycleScenarioId === c.cycleId && s.restInterpretation === pilot.options.restInterpretation)
    if (capacities.length !== 1 || Math.abs(c.usDriverPlanning.employerCostFactor - usBoundary.employerFactor) > 1e-10)
      throw new Error('B2_BENEFITS_BASELINE_IDENTITY')
    const component = comparePrimaryMonthlyVoucher({ cycleId: c.cycleId,
      baselineDailySbcMxn: c.mxFoodEmployerPlanning.primary.contributions.dailySbcMxn,
      compatibleCyclesPerMonth: capacities[0].compatibleKnownCyclesPerMonth, baselinePeriod: '2026-10',
      baselineIncludesVoucher: false, baselineBasis: 'EXISTING_ANNUAL_MEAN_WITH_FOOD_NOT_OBSERVED_BIMESTER' })
    const fxComparisons = profile.benchmark.fx.observations.map(fx => ({ ...fx,
      comparisonBasis: 'SEPTEMBER_FX_ON_UNACCEPTED_OCTOBER_CAPACITY_NOT_SEPTEMBER_RECONSTRUCTION',
      directVoucherUsdPerCycle: component.directMonthlyMxn / component.compatibleCyclesPerMonth / fx.mxnPerUsd,
      hypotheticalNonRiskContributionDeltaUsdPerCycle: component.fullIntegrationSensitivity.nonRiskContributionDeltaMxn / component.compatibleCyclesPerMonth / fx.mxnPerUsd,
      knownHypotheticalComponentUsdPerCycle: component.fullIntegrationSensitivity.knownMonthlyComponentMxn / component.compatibleCyclesPerMonth / fx.mxnPerUsd,
      selectedForCostEngine: false, completeEmployerIncrementUsdPerCycle: null,
    }))
    return { cycleId: c.cycleId, component, fxComparisons,
      usExistingCompensationUsd: c.usDriverPlanning.employerCompensationUsd,
      usExistingBenefitsUsd: c.usDriverPlanning.employerBenefitsComponentUsd,
      usSecondBenefitChargeUsd: 0, referenceCostCompositionChanged: false,
      completeCfuUsd: null, completeCvuUsd: null, completeCostUsd: null }
  })
  return { model: 'FCM_B2_COMPENSATION_EVIDENCE_REVIEW_V1', gate: 'E1', status: 'PARTIAL_COMPONENT_NOT_GATE_PASS',
    profileId: profile.decisionId, referencePeriod: profile.reference.period,
    sourcePins: [...pilot.sourcePins, B2_OPERATING_PROFILE_PIN, B2_BENEFITS_PIN, B2_MX_BASKETS_PIN],
    cases, usBoundary, mxBenefitBaskets,
    remaining: ['MX_BONUS_SAVINGS_PENSION_AMOUNTS_AND_FREQUENCY', 'RELIEF_EMPLOYEE_ENTITLEMENT',
      'SEPTEMBER_PAYROLL_CAPACITY_AND_BIMESTER_APPLICABILITY', 'ACTUAL_SBC_TREATMENT_EXISTING_RISK_STATE_TAX_FEES_ACCRUAL',
      'MX_SAMPLE_AND_HISTORICAL_OFFER_APPLICABILITY', 'US_TRUCK_DRIVER_COHORT_TRANSFER',
      'MIXED_LODGING_MX_US', 'RECURRING_COMPLIANCE_AND_FLEET_INSURANCE', 'OTHER_B2_PUBLIC_COST_REMAINDERS'],
    calibrated: false, quoteReady: false, b2Complete: false, adoptedValues: 0, externalWrites: false,
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw new Error('Usage: review-b2-compensation-evidence.ts (no input amounts)')
    console.log(JSON.stringify(reviewB2CompensationEvidence(), null, 2)); process.exitCode = 2
  } catch (error) { console.error(error instanceof Error ? error.message : 'B2_BENEFITS_REVIEW_FAILED'); process.exitCode = 1 }
}
