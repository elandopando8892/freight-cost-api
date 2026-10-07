import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'
import { readB2OperatingProfile } from '../scripts/lib/b2-operating-profile.js'
import { B2MixedLodgingBenchmarkSchema, B2_MIXED_LODGING_PIN, prepareB2MixedLodgingBenchmark,
  readB2MixedLodgingBenchmark } from '../scripts/lib/b2-mixed-lodging-benchmark.js'
import { prepareB2Closeout } from '../scripts/prepare-b2-closeout.js'

const options = { monthlyBudget: { cashTaxScenario: 'NET_PLUS_VAT', financeMonthlyScenarioId: null,
  boxInsuranceAlternativeId: 'PUBLIC_GUIDE_LOW', mxYardAlternativeId: 'NET_PLUS_VAT_RESERVE' },
  restInterpretation: 'RATE_EXCLUDES_WEEKLY_REST', defFraction: .04,
  borderLinkBasis: 'PUBLIC_LINK_FORECAST', bobtailWearBasis: 'IMT_C3_NON_ARTICULATED_PROXY',
  usMaintenanceBasis: 'ATRI2024_ALL_RM_PLANNING', usDriverBasis: 'BLS2025_ECEC2026_MIE_PLANNING',
  mxFoodEmployerBasis: 'REMUNERATIVE_FOOD_NL_EXEMPT_PLANNING' }

describe('B2 public mixed lodging candidates, never automatic CVU', () => {
  it('pins public observations and rejects altered bytes before interpretation', () => {
    expect(readB2MixedLodgingBenchmark().candidates).toHaveLength(7)
    expect(() => readB2MixedLodgingBenchmark(() => readLocalDocument(B2_MIXED_LODGING_PIN.file) + ' '))
      .toThrow('B2_LODGING_BENCHMARK_HASH')
  })
  it('retains amounts, currencies and actual billing units without FX, quantities, average or price adoption', () => {
    const benchmark = readB2MixedLodgingBenchmark(), profile = readB2OperatingProfile()
    const before = JSON.stringify({ benchmark, profile }), r = prepareB2MixedLodgingBenchmark(benchmark, profile)
    expect(r.candidates.find(c => c.id === 'MX_PENSION_KM405')).toMatchObject({ amount: 260, currency: 'MXN', unit: 'RIG_24H',
      targetConceptId: 'MX_TRAVEL_EXPENSES', quantityPerCycle: null })
    expect(r.candidates.filter(c => c.country === 'US' && c.concept === 'RIG_PARKING').map(c => c.amount)).toEqual([10, 12, 12.5])
    expect(r.candidates.filter(c => c.country === 'US').every(c => c.targetConceptId === 'US_DRIVER_TOTAL')).toBe(true)
    expect(r.candidates.every(c => c.selectedForCostEngine === false && c.commercialRateApplicableToReferenceWindow === false)).toBe(true)
    expect(r).toMatchObject({ completeLodgingCvuUsd: null, adoptedValues: 0, externalWrites: false, quoteReady: false, calibrated: false })
    expect(JSON.stringify({ benchmark, profile })).toBe(before)
    expect(prepareB2MixedLodgingBenchmark(benchmark, profile)).toEqual(r)
  })
  it('does not turn GSA valid historical dates or a starting hotel price into an applicable commercial nightly price', () => {
    const r = prepareB2MixedLodgingBenchmark(readB2MixedLodgingBenchmark(), readB2OperatingProfile())
    expect(r.observationAfterReferenceWindow).toBe(true)
    expect(r.candidates.find(c => c.id === 'US_GSA_FY2026_CONTRAST')).toMatchObject({
      referenceWindowCoveredByPublishedDates: true, evidenceUse: 'REIMBURSEMENT_CONTRAST_NOT_COMMERCIAL_PRICE',
      commercialRateApplicableToReferenceWindow: false })
    expect(r.coverage.find(c => c.country === 'US' && c.concept === 'HOTEL_ROOM')).toMatchObject({
      pricedCommercialCandidates: 0, acceptedCommercialCandidates: 0, completeCvuUsd: null })
    expect(r.candidates.find(c => c.id === 'MX_HOTEL_REAL_INN')).toMatchObject({
      unit: 'ADVERTISED_ROOM_RATE_UNSPECIFIED_PERIOD', referenceWindowCoveredByPublishedDates: false })
    expect(r.candidates.find(c => c.id === 'MX_HOTEL_SAN_PEDRO')!.amount).toBeNull()
  })
  it('records the requested standard as a conditional recommendation, not a universal ratio or compliance certificate', () => {
    const r = prepareB2MixedLodgingBenchmark(readB2MixedLodgingBenchmark(), readB2OperatingProfile())
    expect(r.restPolicy).toMatchObject({ humanInstruction: 'el estándar', automaticHotelNights: null,
      universalHotelPercentageEstablished: false, mxSleeperVerifiedByThisResearch: false, legalComplianceCertified: false })
    expect(r.hotelShare).toBeNull()
    expect(r.cycleNightCounts).toBeNull()
    expect(r.boundaries).toMatchObject({ fixedYardIsNotTravelLodging: true, parkingDoesNotProveRoomIncluded: true,
      oneRigIsNotTwoAssets: true, mieIsNotHotelPrice: true, remainderFamiliesClosed: false, existingDriverAndBenefitAmountsChanged: false })
  })
  it.each(['negative', 'missing', 'dates', 'unit', 'url', 'duplicate', 'adoption', 'ratio'])(
    'rejects ambiguous or unsafe register mutation: %s', mutation => {
      const b = structuredClone(readB2MixedLodgingBenchmark()) as any
      if (mutation === 'negative') b.candidates[0].amount = -1
      if (mutation === 'missing') b.candidates[0].amount = null
      if (mutation === 'dates') { b.candidates[0].effectiveFrom = '2026-02-30'; b.candidates[0].effectiveUntil = '2026-03-01' }
      if (mutation === 'unit') b.candidates[0].unit = 'ROOM_NIGHT'
      if (mutation === 'url') b.candidates[0].url = 'http://example.invalid/'
      if (mutation === 'duplicate') b.candidates.push(b.candidates[0])
      if (mutation === 'adoption') b.selectedRateIds = ['MX_PENSION_KM405']
      if (mutation === 'ratio') b.hotelShare = .5
      expect(() => B2MixedLodgingBenchmarkSchema.parse(b)).toThrow()
    })
  it('rejects a profile with a different lodging scope rather than silently applying a binational default', () => {
    const profile = structuredClone(readB2OperatingProfile()) as any
    profile.lodging.countryScope = 'MX_ONLY'
    expect(() => prepareB2MixedLodgingBenchmark(readB2MixedLodgingBenchmark(), profile)).toThrow()
  })
  it('keeps the frozen historical closeout separate from the current lodging benchmark', () => {
    const legacy = prepareB2Closeout({ options }), profile = prepareB2Closeout({ options, operatingProfileId: 'B2_USER_SCOPE_20261003' })
    expect(Object.hasOwn(legacy, 'lodgingBenchmark')).toBe(false)
    expect(legacy.sourcePins.map(p => p.id)).not.toContain(B2_MIXED_LODGING_PIN.id)
    expect(Object.hasOwn(profile, 'lodgingBenchmark')).toBe(false)
    expect(profile.sourcePins.map(p => p.id)).not.toContain(B2_MIXED_LODGING_PIN.id)
    expect(profile.sourcePins).toHaveLength(83)
    expect(profile.inventory).toEqual(legacy.inventory)
    expect(profile.inventory.parameterMatrix).toHaveLength(210)
    for (const c of profile.cases) {
      expect(c.knownPublicComponentsBeforeResolutionUsd).toEqual(legacy.cases.find(v => v.cycleId === c.cycleId)!.knownPublicComponentsBeforeResolutionUsd)
      expect(c.outputs.productiveCostUsd).toBeNull()
    }
    expect(profile).toMatchObject({ b2Complete: false, arithmeticComplete: false, allCanonicalInputsCalibrated: false, adoptedValues: 0 })
  })
  it('runs the real local CLI with the expected incomplete exit code, not a simulated accepted quote', () => {
    const root = fileURLToPath(new URL('../../../', import.meta.url))
    const child = spawnSync(process.execPath, ['--import', 'tsx', 'apps/api/scripts/prepare-b2-closeout.ts',
      JSON.stringify({ options, operatingProfileId: 'B2_USER_SCOPE_20261003' })],
    { cwd: root, encoding: 'utf8', maxBuffer: 12 * 1024 * 1024, timeout: 20000 })
    expect(child.error).toBeUndefined()
    expect(child.status).toBe(2)
    expect(child.stderr).toBe('')
    const r = JSON.parse(child.stdout)
    expect(Object.hasOwn(r, 'lodgingBenchmark')).toBe(false)
    expect(r.sourcePins).toHaveLength(83)
    expect(r).toMatchObject({ status: 'CONFIRMED_PROFILE_REVALUATION_PENDING', b2Complete: false, adoptedValues: 0, externalWrites: false })
    expect(r.cases.every((c: { outputs: { productiveCostUsd: number | null } }) => c.outputs.productiveCostUsd === null)).toBe(true)
  }, 25000)
})
