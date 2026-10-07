import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { readLocalDocument } from './assemble-economic-reference-cards.js'
import { consolidateBinationalReferenceBudget, REFERENCE_BUDGET_PINS } from './consolidate-binational-reference-budget.js'
import { US_DRIVER_PLANNING_PIN, MX_FOOD_EMPLOYER_PLANNING_PIN, US_MAINTENANCE_PLANNING_PIN } from './compose-public-pilot-cost.js'
import { readLocalDocumentBytes } from './assemble-economic-reference-cards.js'
import { rebuildSeptemberOperatingComponents } from './lib/reference-september-operating-components.js'
import { rebuildSeptemberFixedComponents } from './lib/reference-september-fixed-components.js'
import { B2_OPERATING_PROFILE_PIN, readB2OperatingProfile } from './lib/b2-operating-profile.js'
import { calculateMxDriverPublicForecast } from './lib/reference-mx-driver-forecast.js'
import { calculateUsDriverPlanning } from './lib/reference-us-driver-planning.js'
import { countStartedCalendarDays } from './lib/reference-pilot-trip-supplements.js'
import { B2_MX_BASKETS_PIN, reviewMxBenefitBaskets } from './lib/b2-mx-benefit-baskets.js'
import { B2_BENEFITS_PIN } from './lib/b2-recurring-benefits.js'
import { readMxFoodEmployerPlanning } from './lib/reference-mx-food-employer-planning.js'
import { B2_MIXED_LODGING_PIN, prepareB2MixedLodgingBenchmark, readB2MixedLodgingBenchmark,
  reconcileB2LodgingCycleQuantities } from './lib/b2-mixed-lodging-benchmark.js'

export const B2_SEPTEMBER_LABOR_PIN = { id: 'b2SeptemberLabor', file: 'docs/research/B2_SEPTEMBER_LABOR_REFERENCE_2026-10-03.json',
  sha256: '78bf62082f06255f7c0488b2f793a3a436c3e8a18da0d9216d92d38e164e3598', hashPolicy: 'UTF8_CRLF_TO_LF_NO_OTHER_NORMALIZATION' } as const
const receiptSchema = z.object({ model: z.literal('FCM_B2_SEPTEMBER_LABOR_REFERENCE_V1'), referenceMonth: z.literal('2026-09'),
  profileId: z.literal('B2_USER_SCOPE_20261003'), riskPolicy: z.literal('EXISTING_EMPLOYER_RATE_UNKNOWN'),
  usMie: z.object({ notice: z.literal('2025-54'), effectiveFrom: z.literal('2025-10-01'), referenceThrough: z.literal('2026-09-30'),
    transportationConusUsdPerDay: z.literal(80), url: z.literal('https://www.irs.gov/pub/irs-drop/n-25-54.pdf'),
    isHotelPriceOrMandatoryAllowance: z.literal(false) }).passthrough(),
  wholeTripReferenceRebuilt: z.literal(false), calibrated: z.literal(false), quoteReady: z.literal(false), adoptedValues: z.literal(0),
}).passthrough()
export function readSeptemberLaborReceipt(read = readLocalDocument) {
  const body = read(B2_SEPTEMBER_LABOR_PIN.file).replace(/\r\n/g, '\n')
  if (createHash('sha256').update(body).digest('hex') !== B2_SEPTEMBER_LABOR_PIN.sha256) throw new Error('B2_SEPTEMBER_LABOR_HASH')
  return receiptSchema.parse(JSON.parse(body))
}
function pinnedJson(pin: { file: string; sha256: string }) {
  const body = readLocalDocument(pin.file)
  if (createHash('sha256').update(body).digest('hex') !== pin.sha256) throw new Error('B2_SEPTEMBER_LEGACY_SOURCE_HASH')
  return JSON.parse(body)
}

/** Reconstruct LABOR and selected native fixed/operating components. Do not carry
 * historical nonlabor USD sums into September or rewrite the original policy.
 * Trip clock/roster/food/tax remain declared hypotheses, not dated observations. */
export function reviewB2SeptemberLabor() {
  const receipt = readSeptemberLaborReceipt(), profile = readB2OperatingProfile()
  if (receipt.profileId !== profile.decisionId || receipt.referenceMonth !== profile.reference.period ||
    profile.company.stage !== 'EXISTING_BINATIONAL_OPERATION') throw new Error('B2_SEPTEMBER_PROFILE_MISMATCH')
  const r = consolidateBinationalReferenceBudget(undefined, undefined, 'POSTAL_REFERENCE', 'PUBLIC_LINK_FORECAST', 'IMT_C3_NON_ARTICULATED_PROXY')
  const forecastPin = REFERENCE_BUDGET_PINS.find(p => p.id === 'mxDriverForecast')!
  if (!forecastPin) throw new Error('B2_SEPTEMBER_FORECAST_PIN_REQUIRED')
  const historicalPolicy = pinnedJson(forecastPin), historicalUsPolicy = pinnedJson(US_DRIVER_PLANNING_PIN)
  const foodPolicy = readMxFoodEmployerPlanning(pinnedJson(MX_FOOD_EMPLOYER_PLANNING_PIN))
  const maintenancePolicy = pinnedJson(US_MAINTENANCE_PLANNING_PIN)
  for (const source of maintenancePolicy.sources as { archive: { file: string; sha256: string } }[]) {
    if (createHash('sha256').update(readLocalDocumentBytes(source.archive.file)).digest('hex') !== source.archive.sha256) throw new Error('B2_SEPTEMBER_MAINTENANCE_ARCHIVE_HASH')
  }
  const forecastPolicy = { ...historicalPolicy, referenceMonth: receipt.referenceMonth, riskPolicy: receipt.riskPolicy }
  const physical = structuredClone(r.supportingPilotPhysicalCycle)
  const foodScenarios = r.supportingPilotOrdinaryDuty.scenarios.map(o => {
    const clock = physical.scenarios.find(c => c.id === o.id)!
    const food = r.supportingPilotTripSupplements.cycleAllocations.find(c => c.cycleScenarioId === o.id)!.mxFood
    const days = countStartedCalendarDays(o.knownMxElapsedClockDays, r.supportingPilotOrdinaryDuty.shiftStartLocalHour)
    if (days * foodPolicy.foodMxnPerStartedDay !== food.amountMxn) throw new Error('B2_SEPTEMBER_FOOD_IDENTITY')
    clock.knownMxElapsedClockDays = o.knownMxElapsedClockDays
    clock.knownUsClockDays = o.knownUsElapsedClockDays
    clock.knownBoxClockDays = o.knownBoxClockDays
    return { cycleScenarioId: o.id, amountMxn: food.amountMxn }
  })
  const usPolicy = { ...historicalUsPolicy, referencePeriod: receipt.referenceMonth,
    mealAndIncidentals: { ...historicalUsPolicy.mealAndIncidentals, notice: receipt.usMie.notice, effectiveFrom: receipt.usMie.effectiveFrom },
    sources: historicalUsPolicy.sources.map((s: { id: string; url: string; locator: string; period: string }) => s.id === 'IRS_NOTICE2026_60_TRANSPORTATION_MIE' ?
      { id: 'IRS_NOTICE2025_54_TRANSPORTATION_MIE', url: receipt.usMie.url, locator: 'Notice2025-54 sections3/6, reference-period context only; not lodging/mandatory pay or actual assignment-date substantiation', period: `EFFECTIVE_${receipt.usMie.effectiveFrom}` } : s),
  }
  const usCases = r.supportingPilotOrdinaryDuty.scenarios.map(o => calculateUsDriverPlanning(usPolicy, r.supportingPilotCycleExposure, o))
  const lodgingBenchmark = prepareB2MixedLodgingBenchmark(readB2MixedLodgingBenchmark(), profile)
  const lodgingCycleQuantities = reconcileB2LodgingCycleQuantities(r, usCases)
  // Same pair of comparison presets as projectB2Evidence, not a user finance or tax selection.
  const financeId = r.supportingPilotFinancedCfu.monthlyScenarios.find(s => s.cashBaseId === 'ALL_CAPITAL_CASH_NET_PLUS_VAT_PUBLIC_ADMIN_SCALE')?.id
  if (!financeId) throw new Error('B2_SEPTEMBER_FIXED_COMPARISON_PRESET')
  const fixedReferences: ReturnType<typeof rebuildSeptemberFixedComponents>[] = []
  const cases = profile.benchmark.fx.observations.flatMap(fx => {
    const operating = rebuildSeptemberOperatingComponents(r, fx, maintenancePolicy)
    const fixed = [null, financeId].map(financeMonthlyScenarioId => rebuildSeptemberFixedComponents(r, fx, {
      cashTaxScenario: 'NET_PLUS_VAT', financeMonthlyScenarioId,
      boxInsuranceAlternativeId: 'PUBLIC_GUIDE_LOW', mxYardAlternativeId: 'NET_PLUS_VAT_RESERVE',
    }))
    fixedReferences.push(...fixed)
    const mx = calculateMxDriverPublicForecast(forecastPolicy, r.supportingPilotCycleExposure, physical, r.supportingMxVariableDriver,
      r.supportingPilotVariableEconomics, { mxnPerUsd: fx.mxnPerUsd, observationDate: fx.date },
      { scope: 'DECLARED_REMUNERATIVE_FOOD_WITH_REST_INCLUDED_NL_DIRECT_FOOD_EXEMPT', scenarios: foodScenarios })
    return mx.scenarios.map(s => {
      const us = usCases.find(u => u.cycleId === s.cycleScenarioId)!, food = foodScenarios.find(f => f.cycleScenarioId === s.cycleScenarioId)!
      const fixedMonthlyMxn = s.fixedContributionMonthlyMxn
      const variableMonthlyMxn = s.annualRoadWagesMxn / 12 + s.incomeLinkedAdditionalMonthlyMxn
      const components = operating.find(v => v.cycleId === s.cycleScenarioId)!
      const mxDriverVariableUsd = variableMonthlyMxn / fx.mxnPerUsd / s.compatibleKnownCyclesPerMonth
      const foodUsd = food.amountMxn / fx.mxnPerUsd
      const variableSubtotalUsd = components.knownNonLaborVariableComponentsUsd + mxDriverVariableUsd + foodUsd + us.knownOrdinaryDriverAndMieUsd
      const fixedQuotaUsd = fixedMonthlyMxn / fx.mxnPerUsd / s.compatibleKnownCyclesPerMonth
      return { cycleId: s.cycleScenarioId, restInterpretation: s.restInterpretation, referencePeriod: receipt.referenceMonth,
        fx, mxCoveredDays: mx.monthCoveredDays, compatibleCyclesPerMonth: s.compatibleKnownCyclesPerMonth,
        capacityBasis: 'RETAINED_DECLARED_HYPOTHESIS_NOT_OBSERVED_SEPTEMBER',
        mx: { fixedQuotaMonthlyMxn: fixedMonthlyMxn, knownIncomeLinkedMonthlyMxn: variableMonthlyMxn,
          fixedQuotaUsdPerCycle: fixedMonthlyMxn / fx.mxnPerUsd / s.compatibleKnownCyclesPerMonth,
          knownIncomeLinkedUsdPerCycle: variableMonthlyMxn / fx.mxnPerUsd / s.compatibleKnownCyclesPerMonth,
          directFoodMxnPerCycle: food.amountMxn, directFoodUsdPerCycle: food.amountMxn / fx.mxnPerUsd,
          directFoodIncludedInDriverAgain: false, primary: s.primary, relief: s.relief,
          annualTaxableWagesMxn: s.annualTaxableWagesMxn, nlStateTaxAccrualHypothesisMonthlyMxn: s.monthlyStateTaxAccrualMxn,
          knownContributionsMonthlyMxn: s.monthlyContributionReferenceMxn,
          existingRiskMonthlyMxn: null, completeEmployerContributionsMonthlyMxn: null,
          statutoryBimesterObserved: false, extraBenefitPackageMxn: null, completeDriverCostUsdPerCycle: null },
        us: { wagePeriod: us.sourcePeriods.wage, benefitPeriod: us.sourcePeriods.employerFactor,
          mieNotice: receipt.usMie.notice, mieEffectiveFrom: us.sourcePeriods.mieEffectiveFrom,
          compensationUsd: us.employerCompensationUsd, mieUsd: us.mealAndIncidentalsUsd,
          knownCompensationAndMieUsd: us.knownOrdinaryDriverAndMieUsd, actualAssignmentDatesVerified: false,
          mixedLodgingUsd: null, completeDriverAndTravelCostUsd: null },
        operatingComponents: components,
        defSensitivityComparisons: components.defSensitivity.map(a => ({ ...a,
          knownVariableAlternativeSubtotalUsd: variableSubtotalUsd + a.deltaUsdVsReference,
          fixedComparisons: fixed.map(f => ({ paymentMode: f.paymentMode,
            totalKnownAlternativeComponentsUsd: f.allocations.find(v => v.cycleId === s.cycleScenarioId)!.knownAllocatedFixedSubtotalUsd + fixedQuotaUsd + variableSubtotalUsd + a.deltaUsdVsReference,
            completeTripCostUsd: null, quoteReady: false })),
        })),
        knownVariableComposition: {
          nonLaborUsd: components.knownNonLaborVariableComponentsUsd, mxDriverVariableUsd,
          mxDirectFoodUsd: foodUsd, usCompensationAndMieUsd: us.knownOrdinaryDriverAndMieUsd,
          subtotalUsd: variableSubtotalUsd,
          oldMileageDriverRowsIncluded: false, fixedQuotaIncludedInVariableAgain: false, directFoodIncludedInDriverAgain: false,
          isCompleteCvu: false, isLowerBound: false, missingAmountsDefaultedToZero: false,
          remaining: ['EXTRA_BENEFITS_AND_EMPLOYER_RISK', 'MIXED_LODGING_MX_US', ...components.unreconstructedConcepts],
        },
        fixedComparisons: fixed.map(f => {
          const allocation = f.allocations.find(a => a.cycleId === s.cycleScenarioId)!
          const fixedSubtotalUsd = allocation.knownAllocatedFixedSubtotalUsd + fixedQuotaUsd
          return { fixedReferenceId: `${fx.date}:${f.paymentMode}`, paymentMode: f.paymentMode,
            referencePeriod: f.referencePeriod, fx: f.fx, resourceAllocations: allocation.resources,
            knownResourceFixedSubtotalUsd: allocation.knownAllocatedFixedSubtotalUsd, driverFixedQuotaUsd: fixedQuotaUsd,
            knownFixedSubtotalUsd: fixedSubtotalUsd, knownVariableSubtotalUsd: variableSubtotalUsd,
            totalKnownComponentsUsd: fixedSubtotalUsd + variableSubtotalUsd,
            remainingFixed: f.unresolved.map(row => row.id), fixedQuotaAddedOnce: true, variableSubtotalUnchangedByFinance: true,
            comparisonPresetSelectedByUser: false, isCompleteOrLowerBound: false,
            completeCfuUsd: null, completeCvuUsd: null, completeTripCostUsd: null, quoteReady: false }
        }),
        selectedFixedComponentsRevaluedForSeptember: true,
        selectedVariableCostsRebuiltForSeptember: true, otherCostsRebuiltForSeptember: false, historicalNonLaborUsdSumTransferred: false,
        selectedForCostEngine: false, calibrated: false, quoteReady: false, completeCfuUsd: null, completeCvuUsd: null, completeTripCostUsd: null }
    })
  })
  return { model: 'FCM_B2_SEPTEMBER_LABOR_REVIEW_V1', status: 'KNOWN_FIXED_AND_VARIABLE_COMPONENTS_JOINED_B2_OPEN',
    profileId: profile.decisionId, sourcePins: [...r.sourcePins, US_DRIVER_PLANNING_PIN, MX_FOOD_EMPLOYER_PLANNING_PIN,
      B2_OPERATING_PROFILE_PIN, B2_BENEFITS_PIN, B2_MX_BASKETS_PIN, B2_SEPTEMBER_LABOR_PIN, US_MAINTENANCE_PLANNING_PIN, B2_MIXED_LODGING_PIN],
    lodgingBenchmark, lodgingCycleQuantities,
    cases, fixedReferences, fixedComparisonPolicy: 'EXISTING_EVIDENCE_COMPARISON_PRESETS_NOT_USER_FINANCE_TAX_SELECTION',
    mxBenefitBaskets: reviewMxBenefitBaskets(), historicalPoliciesChanged: false,
    remaining: ['EXTRA_BENEFITS_AND_RELIEF_ENTITLEMENT', 'WORK_RISK_AND_TAX_APPLICABILITY', 'PUBLIC_RATE_COHORT_AND_HISTORICAL_TRANSFER',
      'MIXED_LODGING_MX_US', 'FIXED_COVERAGE_PERMIT_AND_SERVICE_REMAINDERS', 'ROAD_BORDER_REMAINDERS_AND_APPLICATION',
      'ACTUAL_TRIP_DATE_IF_OPERATIONAL_VALIDATION_REQUIRED'],
    b2Complete: false, calibrated: false, quoteReady: false, adoptedValues: 0, externalWrites: false }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw new Error('Usage: review-b2-september-labor.ts (no injected prices or period selection)')
    console.log(JSON.stringify(reviewB2SeptemberLabor(), null, 2)); process.exitCode = 2
  } catch (error) { console.error(error instanceof Error ? error.message : 'B2_SEPTEMBER_LABOR_FAILED'); process.exitCode = 1 }
}
