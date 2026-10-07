import { beforeAll, describe, expect, it } from 'vitest'
import { consolidateBinationalReferenceBudget } from '../scripts/consolidate-binational-reference-budget.js'
import { composePublicPilotCost } from '../scripts/compose-public-pilot-cost.js'
import { pilotCostLineageHash, preparePilotCostResolution, resolvePilotCostRemainders, PilotCostResolutionSchema } from '../scripts/lib/pilot-cost-resolution.js'
import type { z } from 'zod'
import { prepareB2Closeout } from '../scripts/prepare-b2-closeout.js'

const options = { monthlyBudget: { cashTaxScenario: 'NET_PLUS_VAT', financeMonthlyScenarioId: null,
  boxInsuranceAlternativeId: 'PUBLIC_GUIDE_LOW', mxYardAlternativeId: 'NET_PLUS_VAT_RESERVE' },
  restInterpretation: 'RATE_EXCLUDES_WEEKLY_REST', defFraction: .04,
  borderLinkBasis: 'PUBLIC_LINK_FORECAST', bobtailWearBasis: 'IMT_C3_NON_ARTICULATED_PROXY',
  usMaintenanceBasis: 'ATRI2024_ALL_RM_PLANNING', usDriverBasis: 'BLS2025_ECEC2026_MIE_PLANNING',
  mxFoodEmployerBasis: 'REMUNERATIVE_FOOD_NL_EXEMPT_PLANNING' }
let research: ReturnType<typeof consolidateBinationalReferenceBudget>
let publicCases: ReturnType<typeof composePublicPilotCost>
beforeAll(() => {
  research = consolidateBinationalReferenceBudget(undefined, undefined, 'POSTAL_REFERENCE', 'PUBLIC_LINK_FORECAST', 'IMT_C3_NON_ARTICULATED_PROXY')
  publicCases = composePublicPilotCost(research, options)
})
type Lineage = typeof publicCases.cases[number]['projection']['lineage']
// These amounts are ONLY test sentinels. Not policy/default benchmark data.
function syntheticResolution(base: Lineage): z.infer<typeof PilotCostResolutionSchema> {
  const template = preparePilotCostResolution(base)
  const evidenceId = 'SYNTHETIC_REMAINDER_TEST_NOT_PUBLIC_SOURCE'
  return { model: 'FCM_B2_EXPLICIT_REMAINDER_RESOLUTION_V1', baseLineageSha256: template.baseLineageSha256,
    evidenceScope: 'SYNTHETIC_VALIDATION', evidence: [{ id: evidenceId, url: 'https://example.invalid/synthetic-only',
      locator: 'Synthetic whole-contract exercise; no published prices or observed carrier costs.', observedAt: '2026-10-03',
      referencePeriod: '2026-10', groupReference: base.budget.groupReference,
      resourceIds: ['MX_TRACTOR', 'US_TRACTOR', 'SHARED_TRAILER'],
      profileReferences: base.budget.resources.map(r => ({ resourceId: r.resourceId, profileReference: r.profileReference! })),
      kind: 'DOCUMENTED_PUBLIC_MODEL', limitations: 'Schema transport only; monetary inputs are synthetic and not a public benchmark.' }],
    fixed: template.fixed.map((r, i) => ({ economicExpenseId: r.economicExpenseId,
      mode: r.mode as 'SUPPLY_REMAINDER' | 'REPLACE_FOREIGN_PROXY', valueUsdPerMonth: 101 + i,
      evidenceIds: [evidenceId], derivation: 'Synthetic missing-scope amount solely for arithmetic validation.', zeroRationale: null })),
    variable: template.variable.map((r, i) => ({ conceptId: r.conceptId, mode: 'SUPPLY_REMAINDER', valueUsdPerCycle: 11 + i,
      evidenceIds: [evidenceId], derivation: 'Synthetic disjoint remainder, not a replacement of the known component.', zeroOrExclusionRationale: null })) }
}
describe('whole public pilot -> explicit missing-scope resolutions -> existing CFU/CVU projection', () => {
  it('produces one current210-key closeout without claiming public prices or calibration from green tests', () => {
    const r = prepareB2Closeout({ options })
    expect(r.status).toBe('INCOMPLETE_PUBLIC_COST')
    expect(r.inventory.catalog).toMatchObject({ catalog: 210, benchmark: 135, outsideBenchmarkWithLiteralReader: 58, outsideBenchmarkWithoutLiteralReader: 17 })
    expect(r.inventory.parameterMatrix).toHaveLength(210)
    expect(r.inventory.sectionCoverage).toHaveLength(16)
    expect(r.inventory.fixedMaintenanceFormulaVerification.checkedEquations).toBe(82)
    expect(r.inventory.fixedMaintenanceFormulaVerification.testedEquationsMatch).toBe(true)
    expect(r.inventory.tireFormulaVerification.mismatchedPriceBindings).toBe(3)
    expect(r.sourcePins).toHaveLength(82)
    expect(r.cases.every(c => c.currentIssues.length === 13 && c.requiredInputs.fixed.length === 6 && c.requiredInputs.variable.length === 7)).toBe(true)
    expect(r).toMatchObject({ arithmeticComplete: false, economicEvidenceAccepted: false, allCanonicalInputsCalibrated: false,
      b2Complete: false, quoteReady: false, adoptedValues: 0, externalWrites: false })
  })
  it('whole closeout keeps synthetic arithmetic completion separate from B2 acceptance', () => {
    const resolutions = publicCases.cases.map(c => ({ cycleId: c.cycleId, resolution: syntheticResolution(c.projection.lineage) }))
    const r = prepareB2Closeout({ options, resolutions })
    expect(r.status).toBe('ARITHMETIC_COMPLETE_ECONOMIC_ACCEPTANCE_PENDING')
    expect(r.arithmeticComplete).toBe(true)
    expect(r.cases.every(c => c.evidenceScope === 'SYNTHETIC_VALIDATION' && c.requiredInputs.fixed.length === 0 && c.requiredInputs.variable.length === 0)).toBe(true)
    expect(r.b2Complete).toBe(false)
    expect(r.economicEvidenceAccepted).toBe(false)
  })
  it('rejects duplicate cycle choices and caller-supplied acceptance overrides', () => {
    const entry = { cycleId: publicCases.cases[0].cycleId, resolution: syntheticResolution(publicCases.cases[0].projection.lineage) }
    expect(() => prepareB2Closeout({ options, resolutions: [entry, entry] })).toThrow('B2_DUPLICATE_CYCLE_RESOLUTION')
    expect(() => prepareB2Closeout({ options, b2Complete: true })).toThrow()
  })
  it('prepares exactly the actual13 gaps per selected public case, without giving them prices', () => {
    for (const c of publicCases.cases) {
      const t = preparePilotCostResolution(c.projection.lineage)
      expect(t.fixed).toHaveLength(6)
      expect(t.variable).toHaveLength(7)
      expect(t.fixed.every(r => r.valueUsdPerMonth === null)).toBe(true)
      expect(t.variable.every(r => r.valueUsdPerCycle === null)).toBe(true)
      expect(() => resolvePilotCostRemainders(c.projection.lineage, t)).toThrow()
    }
  })
  it.each(['CASH', 'FINANCED'])('calculates both %s cycles completely with synthetic remainders, not fake public acceptance', fundingMode => {
    const financeId = fundingMode === 'FINANCED' ? research.supportingPilotFinancedCfu.monthlyScenarios.find(s => s.cashBaseId === 'ALL_CAPITAL_CASH_NET_PLUS_VAT_PUBLIC_ADMIN_SCALE')!.id : null
    const cases = composePublicPilotCost(research, { ...options, monthlyBudget: { ...options.monthlyBudget, financeMonthlyScenarioId: financeId } }).cases
    for (const c of cases) {
      const base = c.projection.lineage, before = JSON.stringify(base), request = syntheticResolution(base)
      const resolved = resolvePilotCostRemainders(base, request), r = resolved.result
      expect(resolved.arithmeticComplete).toBe(true)
      expect(r.issues).toEqual([])
      expect(r.evidenceScope).toBe('SYNTHETIC_VALIDATION')
      expect(r.outputs.cfuUsd).toBeCloseTo(r.resources.reduce((n, x) => n + x.cfuUsd!, 0), 9)
      expect(r.outputs.cvuUsd).toBeCloseTo(c.projection.knownVariableSubtotalUsd! + request.variable.reduce((n, x) => n + x.valueUsdPerCycle!, 0), 9)
      expect(r.outputs.productiveCostUsd).toBeCloseTo(r.outputs.cfuUsd! + r.outputs.cvuUsd!, 9)
      for (const resource of r.resources) {
        const exposure = base.exposures.find(e => e.resourceId === resource.resourceId)!
        const fixedDriver = resource.resourceId === 'MX_TRACTOR' ? r.fixedOperatingAllocationUsd! : 0
        expect(resource.cfuUsd).toBeCloseTo(resource.monthlyFixedUsd! * Math.max(exposure.totalCycleKm / exposure.productiveKmPerMonth,
          exposure.cycleDays / exposure.productiveDaysPerMonth) + fixedDriver, 9)
      }
      expect(r.sharedBoxAllocationCount).toBe(1)
      expect(r.outputs.purchaseUsd).toBeNull(); expect(r.outputs.sellUsd).toBeNull()
      expect(resolved).toMatchObject({ acceptedForB2: false, evidenceReviewedByThisAdapter: false,
        publicSourcesIndependentlyVerified: false, calibrated: false, quoteReady: false, adoptedValues: 0, externalWrites: false })
      expect(JSON.stringify(base)).toBe(before)
      expect(resolvePilotCostRemainders(base, request)).toEqual(resolved)
      expect(() => resolvePilotCostRemainders(r.lineage, request)).toThrow('CLOSURE_STALE_BASE')
    }
  })
  it('a missing remainder remains missing; a successful partial call cannot unlock the total', () => {
    const base = publicCases.cases[0].projection.lineage, request = syntheticResolution(base)
    request.variable.pop()
    const r = resolvePilotCostRemainders(base, request)
    expect(r.arithmeticComplete).toBe(false)
    expect(r.result.outputs.productiveCostUsd).toBeNull()
    expect(r.result.issues).toContainEqual({ code: 'UNRESOLVED_VARIABLE_COMPONENT', field: 'variableCosts.SUPPLEMENTAL_CARGO_VALUE_INSURANCE' })
  })
  it('requires explicit source-backed zero/exclusion and cannot erase a known partial amount', () => {
    const base = publicCases.cases[0].projection.lineage, request = syntheticResolution(base)
    request.fixed[0].valueUsdPerMonth = 0
    expect(() => resolvePilotCostRemainders(base, request)).toThrow('CLOSURE_ZERO_REQUIRES_BASIS')
    request.fixed[0].zeroRationale = 'Synthetic declared exclusion solely for error-path validation.'
    expect(resolvePilotCostRemainders(base, request).arithmeticComplete).toBe(true)
    const partial = request.variable.find(r => r.conceptId === 'MX_TRAVEL_EXPENSES')!
    partial.mode = 'DOCUMENTED_EXCLUSION'; partial.valueUsdPerCycle = null
    partial.zeroOrExclusionRationale = 'Synthetic attempt to erase a supported amount must fail.'
    expect(() => resolvePilotCostRemainders(base, request)).toThrow('CLOSURE_EXCLUSION_CANNOT_ERASE_KNOWN_COMPONENT')
  })
  it('allows documented cargo exclusion only with its explicit scope, never an automatic default', () => {
    const base = publicCases.cases[0].projection.lineage, request = syntheticResolution(base)
    const cargo = request.variable.find(r => r.conceptId === 'SUPPLEMENTAL_CARGO_VALUE_INSURANCE')!
    cargo.mode = 'DOCUMENTED_EXCLUSION'; cargo.valueUsdPerCycle = null
    cargo.zeroOrExclusionRationale = 'Synthetic test of separately borne cargo supplement, not actual pilot responsibility.'
    const r = resolvePilotCostRemainders(base, request)
    expect(r.arithmeticComplete).toBe(true)
    expect(r.result.lineage.variableCosts.find(v => v.conceptId === cargo.conceptId)!.disposition).toBe('DOCUMENTED_EXCLUSION')
    cargo.zeroOrExclusionRationale = null
    expect(() => resolvePilotCostRemainders(base, request)).toThrow('CLOSURE_EXCLUSION_CANNOT_ERASE_KNOWN_COMPONENT')
  })
  it('requires a whole foreign premium to replace the public annual proxy, never duplicate it', () => {
    const base = composePublicPilotCost(research, { ...options, monthlyBudget: { ...options.monthlyBudget,
      foreignLiabilityAlternativeId: 'NEW_AUTHORITY_INDIANA_2025:PUBLISHED_LOWER_ENDPOINT' } }).cases[0].projection.lineage
    const request = syntheticResolution(base), foreign = request.fixed.find(r => r.economicExpenseId === 'MX_TRACTOR_FOREIGN_LIABILITY_REMAINDER')!
    expect(foreign.mode).toBe('REPLACE_FOREIGN_PROXY')
    foreign.mode = 'SUPPLY_REMAINDER'
    expect(() => resolvePilotCostRemainders(base, request)).toThrow('CLOSURE_FOREIGN_PREMIUM_MUST_REPLACE_PROXY')
    foreign.mode = 'REPLACE_FOREIGN_PROXY'
    const r = resolvePilotCostRemainders(base, request)
    expect(r.result.lineage.budget.expenses.some(e => e.economicExpenseId === 'MX_TRACTOR_FOREIGN_LIABILITY_PUBLIC_PROXY')).toBe(false)
    expect(r.result.lineage.budget.expenses.filter(e => e.economicExpenseId === foreign.economicExpenseId)).toHaveLength(1)
    expect(r.changes.find(c => c.id === foreign.economicExpenseId)!.priorUsd).toBe(625)
    expect(r.changes.filter(c => c.id !== foreign.economicExpenseId && c.id.includes('PERMITS')).every(c => c.priorUsd === null)).toBe(true)
  })
  it.each(['HASH', 'DUPLICATE', 'UNKNOWN', 'KNOWN', 'NO_EVIDENCE', 'WRONG_PERIOD', 'WRONG_PROFILE', 'WRONG_OWNER', 'EXTRA_OUTPUT', 'NEGATIVE', 'FRACTIONAL_CENT', 'NO_FIXED_DRIVER', 'UPGRADE_SYNTHETIC', 'DUPLICATE_REFERENCE'])
  ('rejects %s rather than returning a complete price', variation => {
    const base = structuredClone(publicCases.cases[0].projection.lineage), request = syntheticResolution(base)
    if (variation === 'HASH') request.baseLineageSha256 = '0'.repeat(64)
    if (variation === 'DUPLICATE') request.fixed.push({ ...request.fixed[0] })
    if (variation === 'UNKNOWN') request.fixed[0].economicExpenseId = 'INVENTED'
    if (variation === 'KNOWN') request.fixed[0].economicExpenseId = 'SHARED_TRAILER_CAPITAL'
    if (variation === 'NO_EVIDENCE') request.evidence = []
    if (variation === 'WRONG_PERIOD') request.evidence[0].referencePeriod = '2026-11'
    if (variation === 'WRONG_PROFILE') request.evidence[0].profileReferences[0].profileReference = 'OTHER_PROFILE'
    if (variation === 'WRONG_OWNER') request.evidence[0].resourceIds = ['SHARED_TRAILER']
    if (variation === 'EXTRA_OUTPUT') Object.defineProperty(request, 'productiveCostUsd', { value: 1, enumerable: true })
    if (variation === 'NEGATIVE') request.fixed[0].valueUsdPerMonth = -1
    if (variation === 'FRACTIONAL_CENT') request.fixed[0].valueUsdPerMonth = .001
    if (variation === 'NO_FIXED_DRIVER') { delete base.fixedOperatingComponent; request.baseLineageSha256 = pilotCostLineageHash(base) }
    if (variation === 'UPGRADE_SYNTHETIC') { base.evidenceScope = 'SYNTHETIC_VALIDATION'; request.baseLineageSha256 = pilotCostLineageHash(base); request.evidenceScope = 'DOCUMENTED_PUBLIC_PLANNING' }
    if (variation === 'DUPLICATE_REFERENCE') request.variable[0].evidenceIds.push(request.variable[0].evidenceIds[0])
    expect(() => resolvePilotCostRemainders(base, request)).toThrow()
  })
})
