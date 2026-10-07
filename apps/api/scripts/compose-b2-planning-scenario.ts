import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { consolidateBinationalReferenceBudget } from './consolidate-binational-reference-budget.js'
import { composePublicPilotCost } from './compose-public-pilot-cost.js'
import { reviewB2SeptemberLabor } from './review-b2-september-labor.js'
import { B2_PLANNING_POLICY_PIN, B2_SEPTEMBER_BASELINE_SHA256, readB2PlanningPolicy, assertB2SeptemberBaseline, projectB2PlanningCase } from './lib/b2-planning-scenario.js'

/** Standalone read-only scenario. Historical closeout/snapshot and operational
 * acceptance stay unchanged. No price, acceptance or model injected via CLI. */
export function composeB2PlanningScenario() {
  const policy = readB2PlanningPolicy(), september = reviewB2SeptemberLabor()
  assertB2SeptemberBaseline(september)
  const research = consolidateBinationalReferenceBudget(undefined, undefined, 'POSTAL_REFERENCE', 'PUBLIC_LINK_FORECAST', 'IMT_C3_NON_ARTICULATED_PROXY')
  const originals = new Map(['CASH', 'FINANCED'].map(mode => {
    const fixed = september.fixedReferences.find(v => v.paymentMode === mode)!
    const pilot = composePublicPilotCost(research, { monthlyBudget: fixed.options, restInterpretation: 'RATE_EXCLUDES_WEEKLY_REST',
      defFraction: .04, borderLinkBasis: 'PUBLIC_LINK_FORECAST', bobtailWearBasis: 'IMT_C3_NON_ARTICULATED_PROXY',
      usMaintenanceBasis: 'ATRI2024_ALL_RM_PLANNING', usDriverBasis: 'BLS2025_ECEC2026_MIE_PLANNING',
      mxFoodEmployerBasis: 'REMUNERATIVE_FOOD_NL_EXEMPT_PLANNING' })
    return [mode, pilot.cases] as const
  }))
  const cases = september.cases.flatMap(c => ['CASH', 'FINANCED'].map(mode => {
    const bases = originals.get(mode)!, base = bases.find(v => v.cycleId === c.cycleId)!
    const fixed = september.fixedReferences.find(v => v.fx.date === c.fx.date && v.paymentMode === mode)!
    const lodging = september.lodgingCycleQuantities.cycles.find(v => v.cycleId === c.cycleId)!
    return projectB2PlanningCase(base.projection.lineage, c, fixed, lodging, policy)
  }))
  const key = (c: typeof cases[number]) => `${c.cycleId}:${c.fx.date}:${c.restInterpretation}:${c.fundingMode}`
  const arithmeticComplete = cases.length === 24 && new Set(cases.map(key)).size === 24 && cases.every(c =>
    c.status === 'CALCULATED_DOCUMENTED_SCENARIO_ONLY' && c.reconciliation.sumMatches && c.planningOutputs.productiveCostUsd !== null &&
    c.fixedLedger.length === 32 && c.fixedLedger.filter(v => v.disposition === 'EXPLICIT_PLANNING_REMAINDER').length === 6)
  if (!arithmeticComplete) throw new Error('B2_PLANNING_INCOMPLETE')
  return { model: 'FCM_B2_AUTHORIZED_PLANNING_CLOSEOUT_V1', completionScope: policy.authorization.scope,
    status: 'B2_PUBLIC_PLANNING_SCENARIO_VALIDATED_NOT_OPERATIONALLY_CALIBRATED', policy,
    sourcePins: [...september.sourcePins, B2_PLANNING_POLICY_PIN],
    originalSeptemberEconomySha256: B2_SEPTEMBER_BASELINE_SHA256,
    scenarioPayloadSha256: createHash('sha256').update(JSON.stringify(cases)).digest('hex'),
    cases, centralComparison: cases.filter(c => c.fx.date === '2026-09-30' && c.restInterpretation === 'RATE_EXCLUDES_WEEKLY_REST').map(c => ({
      cycleId: c.cycleId, fundingMode: c.fundingMode, ...c.planningOutputs })),
    centralSelectionBasis: 'LATEST_CONFIRMED_WEEK_FIX_AND_EXCLUDES_REST_AS_EXPLICIT_COMPARISON_NOT_ACTUAL_DATE_OR_CONTRACT',
    arithmeticComplete, b2PlanningComplete: arithmeticComplete, b2Complete: arithmeticComplete,
    humanAcceptedResults: false, allCanonicalInputsCalibrated: false, operationalCalibrationComplete: false,
    operationalAdoptionGate: 'OPEN_REQUIRES_COMPATIBLE_EVIDENCE_REVIEW_AND_SPECIFIC_ADOPTION_AUTHORIZATION',
    quoteReady: false, adoptedValues: 0, externalWrites: false,
    limitations: ['Modeled budget is not observed carrier cost, market calibration, lowest/highest market bound or actual trip.',
      'Every reserve is an identified planning judgment, not a published charge for its target scope.',
      'Dates, source population and price units are transferred explicitly; no historical Sep pricing or truck itinerary certified.',
      'Existing employer risk, full benefits/roster, territory/custody, fiscal invoices and actual purchased lodging remain unverified.',
      'Additional unmeasured approach movements, paid local bobtail access and customer customs are outside this reference scope, not certified free.',
      'Legacy detailed tire price bindings/retread lifecycle are not repaired or calibrated by this aggregate planning scenario.',
      'No HTTP, UI, persistence, Auth, source parameter adoption, business quote, deployment or new infrastructure.'] }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw new Error('Usage: compose-b2-planning-scenario.ts (no injected prices or acceptance)')
    console.log(JSON.stringify(composeB2PlanningScenario(), null, 2))
  } catch (error) { console.error(error instanceof Error ? error.message : 'B2_PLANNING_FAILED'); process.exitCode = 1 }
}
