import { beforeAll, describe, expect, it } from 'vitest'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'
import { consolidateBinationalReferenceBudget } from '../scripts/consolidate-binational-reference-budget.js'
import { composePublicPilotCost } from '../scripts/compose-public-pilot-cost.js'
import { applyB2OperatingProfile, B2OperatingProfileSchema, B2_OPERATING_PROFILE_PIN, readB2OperatingProfile } from '../scripts/lib/b2-operating-profile.js'
import { prepareB2Closeout } from '../scripts/prepare-b2-closeout.js'
import { pilotCostLineageHash, preparePilotCostResolution } from '../scripts/lib/pilot-cost-resolution.js'

const options = { monthlyBudget: { cashTaxScenario: 'NET_PLUS_VAT', financeMonthlyScenarioId: null,
  boxInsuranceAlternativeId: 'PUBLIC_GUIDE_LOW', mxYardAlternativeId: 'NET_PLUS_VAT_RESERVE' },
  restInterpretation: 'RATE_EXCLUDES_WEEKLY_REST', defFraction: .04,
  borderLinkBasis: 'PUBLIC_LINK_FORECAST', bobtailWearBasis: 'IMT_C3_NON_ARTICULATED_PROXY',
  usMaintenanceBasis: 'ATRI2024_ALL_RM_PLANNING', usDriverBasis: 'BLS2025_ECEC2026_MIE_PLANNING',
  mxFoodEmployerBasis: 'REMUNERATIVE_FOOD_NL_EXEMPT_PLANNING' }
const reference = { fxObservationDate: '2026-10-01', usMieEffectiveFrom: '2026-10-01', foreignLiabilityAlternativeId: null,
  mxWorkRiskBasis: 'INITIAL_CARGO_CLASS_V_RATE_SENSITIVITY_NOT_ACTUAL_EXISTING_PREMIUM' }
let research: ReturnType<typeof consolidateBinationalReferenceBudget>
let pilot: ReturnType<typeof composePublicPilotCost>
let profile: ReturnType<typeof readB2OperatingProfile>
beforeAll(() => {
  profile = readB2OperatingProfile()
  research = consolidateBinationalReferenceBudget(undefined, undefined, 'POSTAL_REFERENCE', 'PUBLIC_LINK_FORECAST', 'IMT_C3_NON_ARTICULATED_PROXY')
  pilot = composePublicPilotCost(research, options)
})

describe('human-confirmed B2 profile -> existing public compositor, not economic calibration', () => {
  it('reads the hash-pinned answers including both countries without inventing a departure, mix or payment frequency', () => {
    expect(profile.reference).toMatchObject({ period: '2026-09', exactDepartureDate: null })
    expect(profile.company).toMatchObject({ stage: 'EXISTING_BINATIONAL_OPERATION', authorityIndependentlyVerified: false,
      recurringComplianceExcluded: false, initialAuthorityFeesAddedAutomatically: false })
    expect(profile.lodging).toMatchObject({ countryScope: 'BOTH_MX_AND_US', hotelShare: null, perCycleNightCounts: null })
    expect(profile.benchmark.mxBenefits).toMatchObject({ publishedHiringBonusMxn: 15000, publishedVouchersMxn: 3430,
      voucherFrequency: null, extraBenefitsMonthlyMxn: null })
    expect(profile.benchmark.mxMonthlyVoucherComparator).toMatchObject({ publishedVouchersMxnPerEmployeeMonth: 3430,
      recruitmentClosed: true, originalQueretaroOfferFrequencyChanged: false, selectedForCostEngine: false })
    expect(profile.cargo).toMatchObject({ commodity: 'AUTOMOTIVE_PARTS', declaredValueUsd: 75000, mxCargoInsurancePayer: 'CLIENT',
      policyOrCoiSufficiencyVerified: false, monthlyFleetPremiumExcluded: false })
    expect(() => readB2OperatingProfile(() => readLocalDocument(B2_OPERATING_PROFILE_PIN.file) + ' ')).toThrow('B2_OPERATING_PROFILE_HASH')
  })
  it.each(['NETWORK_EXPECTED_EMPTY_PROXY', 'DEDICATED_EMPTY_SAME_BOX_RETURN'])('excludes only the supplemental trip premium and opens US lodging without erasing known components: %s', cycleId => {
    const base = pilot.cases.find(c => c.cycleId === cycleId)!.projection.lineage, before = JSON.stringify(base)
    const r = applyB2OperatingProfile(base, profile, reference), p = r.historicalScopeProjection
    const cargo = p.lineage.variableCosts.find(v => v.conceptId === 'SUPPLEMENTAL_CARGO_VALUE_INSURANCE')!
    expect(cargo).toMatchObject({ disposition: 'DOCUMENTED_EXCLUSION', amountUsd: null })
    expect(cargo.exclusionOrZeroRationale).toContain('Retain all monthly fleet insurance')
    expect(p.lineage.budget.expenses).toEqual(base.budget.expenses)
    expect(p.fixedOperatingAllocationUsd).toBe(pilot.cases.find(c => c.cycleId === cycleId)!.projection.fixedOperatingAllocationUsd)
    const usBefore = base.variableCosts.find(v => v.conceptId === 'US_DRIVER_TOTAL')!
    expect(p.lineage.variableCosts.find(v => v.conceptId === 'US_DRIVER_TOTAL')).toMatchObject({
      disposition: 'DOCUMENTED_PARTIAL', amountUsd: usBefore.amountUsd, evidenceIds: usBefore.evidenceIds })
    expect(p.knownVariableSubtotalUsd).toBe(pilot.cases.find(c => c.cycleId === cycleId)!.projection.knownVariableSubtotalUsd)
    expect(p.issues).not.toContainEqual({ field: 'variableCosts.SUPPLEMENTAL_CARGO_VALUE_INSURANCE', code: 'UNRESOLVED_VARIABLE_COMPONENT' })
    expect(p.issues).toContainEqual({ field: 'variableCosts.US_DRIVER_TOTAL', code: 'UNRESOLVED_VARIABLE_REMAINDER' })
    expect(preparePilotCostResolution(p.lineage).variable).toHaveLength(7)
    expect(preparePilotCostResolution(p.lineage).variable.some(v => v.conceptId === 'SUPPLEMENTAL_CARGO_VALUE_INSURANCE')).toBe(false)
    expect(r.referenceCompatibility.compatible).toBe(false)
    expect(r.userCostCase).toMatchObject({ referencePeriod: '2026-09', b2Complete: false, arithmeticComplete: false })
    expect(JSON.stringify(base)).toBe(before)
    expect(applyB2OperatingProfile(base, profile, reference)).toEqual(r)
    expect(() => applyB2OperatingProfile(p.lineage, profile, reference)).toThrow('CLOSURE_DUPLICATE_EVIDENCE')
  })
  it('exposes October-period/FX/notice mismatch even though September and October transportation M&IE are nominally80', () => {
    const r = applyB2OperatingProfile(pilot.cases[0].projection.lineage, profile, reference)
    expect(r.referenceCompatibility.issues.map(i => i.code)).toEqual([
      'B2_REFERENCE_PERIOD_REVALUATION_REQUIRED', 'B2_FX_AFTER_REFERENCE_WINDOW',
      'B2_MIE_NOT_EFFECTIVE_FOR_WHOLE_REFERENCE_WINDOW', 'B2_EXISTING_EMPLOYER_RISK_IS_INITIAL_RATE_PROXY', 'B2_MIXED_LODGING_EVIDENCE_REQUIRED',
    ])
    expect(profile.benchmark.usMie).toMatchObject({ notice: '2025-54', effectiveFrom: '2025-10-01', transportationConusUsdPerDay: 80 })
    expect(r.cargoValueFxSensitivity.map(s => s.declaredValueMxn)).toEqual([1338097.5, 1355325, 1355190])
    expect(r.cargoValueFxSensitivity.every(s => !s.selectedForCostEngine)).toBe(true)
    expect(Object.values(r.userCostCase.outputs).every(v => v === null)).toBe(true)
  })
  it.each(['NEW_AUTHORITY_INDIANA_2025:PUBLISHED_LOWER_ENDPOINT', 'EXPERIENCED_CLEAN_2PLUS_YEARS:PUBLISHED_LOWER_ENDPOINT'])('does not equate valid permits to matching insurance underwriting: %s', foreignLiabilityAlternativeId => {
    const p = composePublicPilotCost(research, { ...options, monthlyBudget: { ...options.monthlyBudget, foreignLiabilityAlternativeId } })
    const r = applyB2OperatingProfile(p.cases[0].projection.lineage, profile, { ...reference, foreignLiabilityAlternativeId })
    expect(r.referenceCompatibility.issues.some(i => i.code === 'B2_FOREIGN_PREMIUM_COHORT_UNMATCHED')).toBe(true)
    expect(r.historicalScopeProjection.lineage.budget.expenses).toEqual(p.cases[0].projection.lineage.budget.expenses)
    expect(r.historicalScopeProjection.lineage.budget.expenses.find(e => e.economicExpenseId === 'MX_TRACTOR_FOREIGN_LIABILITY_REMAINDER')!.amount).toBeNull()
  })
  it('cash and financed closeouts integrate the profile while keeping September outputs separate from October snapshots', () => {
    const financeId = research.supportingPilotFinancedCfu.monthlyScenarios.find(s => s.cashBaseId === 'ALL_CAPITAL_CASH_NET_PLUS_VAT_PUBLIC_ADMIN_SCALE')!.id
    for (const financeMonthlyScenarioId of [null, financeId]) {
      const r = prepareB2Closeout({ options: { ...options, monthlyBudget: { ...options.monthlyBudget, financeMonthlyScenarioId } },
        operatingProfileId: profile.decisionId })
      expect(r.status).toBe('CONFIRMED_PROFILE_REVALUATION_PENDING')
      expect(r.sourcePins).toHaveLength(83)
      expect(r.inventory.parameterMatrix).toHaveLength(210)
      expect(r.b2Complete).toBe(false)
      for (const c of r.cases) {
        expect(c.currentIssues).toHaveLength(13)
        expect(c.resources).toBeNull()
        expect(c.outputs.productiveCostUsd).toBeNull()
        expect(c.requiredInputsReferencePeriod).toBe('2026-10')
        expect(c.historicalReferenceComparison).toMatchObject({ acceptedForUserReferencePeriod: false })
        expect(c.profileApplication!.profile.lodging.countryScope).toBe('BOTH_MX_AND_US')
      }
    }
  })
  it('old resolutions cannot erase this scope change and synthetic full arithmetic cannot override September acceptance', () => {
    const c = pilot.cases[0], applied = applyB2OperatingProfile(c.projection.lineage, profile, reference)
    const id = 'SYNTHETIC_SCOPE_TEST', base = applied.historicalScopeProjection.lineage
    const template = preparePilotCostResolution(base)
    const resolution = { ...template, evidenceScope: 'SYNTHETIC_VALIDATION',
      evidence: [{ id, url: 'https://example.invalid/synthetic-only', locator: 'Synthetic validation, no public price.',
        observedAt: '2026-10-03', referencePeriod: '2026-10', groupReference: base.budget.groupReference,
        resourceIds: ['MX_TRACTOR', 'US_TRACTOR', 'SHARED_TRAILER'], profileReferences: base.budget.resources.map(r => ({ resourceId: r.resourceId, profileReference: r.profileReference! })),
        kind: 'DOCUMENTED_PUBLIC_MODEL', limitations: 'Test sentinels, not benchmark adoption.' }],
      fixed: template.fixed.map(r => ({ ...r, valueUsdPerMonth: 101, evidenceIds: [id], derivation: 'Synthetic disjoint fixed remainder.' })),
      variable: template.variable.map(r => ({ ...r, valueUsdPerCycle: 11, evidenceIds: [id], derivation: 'Synthetic disjoint variable remainder.' })) }
    const r = prepareB2Closeout({ options, operatingProfileId: profile.decisionId, resolutions: [{ cycleId: c.cycleId, resolution }] })
    expect(r.cases[0].historicalReferenceComparison!.arithmeticComplete).toBe(true)
    expect(r.cases[0].arithmeticComplete).toBe(false)
    expect(r.cases[0].outputs.productiveCostUsd).toBeNull()
    expect(r.arithmeticComplete).toBe(false)
    expect(r.b2Complete).toBe(false)
    const stale = { ...resolution, baseLineageSha256: pilotCostLineageHash(c.projection.lineage) }
    expect(() => prepareB2Closeout({ options, operatingProfileId: profile.decisionId, resolutions: [{ cycleId: c.cycleId, resolution: stale }] })).toThrow('CLOSURE_STALE_BASE')
  })
  it.each(['cargoPremium', 'benefitPercent', 'hotelNightly', 'coveredPolicy'])('rejects tampered policy assertions rather than monetize them: %s', kind => {
    const p = structuredClone(profile)
    if (kind === 'cargoPremium') (p.cargo as Record<string, unknown>).declaredValueUsd = 500000
    if (kind === 'benefitPercent') (p.compensation as Record<string, unknown>).genericExtraBenefitPercentAdded = true
    if (kind === 'hotelNightly') (p.benchmark.hotel as Record<string, unknown>).publicPriceMxnPerNight = 1000
    if (kind === 'coveredPolicy') (p.cargo as Record<string, unknown>).policyOrCoiSufficiencyVerified = true
    expect(() => B2OperatingProfileSchema.parse(p)).toThrow()
  })
})
