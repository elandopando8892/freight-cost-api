import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { allocateFixedCost } from '../src/modules/engine/fixed-cost-allocation.js'

const research = resolve(__dirname, '../../../docs/research')
const read = (name: string) => JSON.parse(readFileSync(resolve(research, name), 'utf8'))
const dossier = read('B2_REFERENCE_PROFILE_EXPOSURE_2026-09-29.json')
const sourceById = new Map<string, any>(dossier.sources.map((s: any) => [s.id, s]))

describe('public reference profiles: research exposure, never active base values', () => {
  it('keeps two countries, provenance and economic status separate', () => {
    expect(dossier.profiles.map((p: any) => p.country)).toEqual(['MX', 'US'])
    expect(dossier).toMatchObject({ calibrated: false, quoteReady: false, adoptedValues: 0 })
    expect(Object.values(dossier.outputs).every(value => value === null)).toBe(true)
    expect(dossier.method).toMatchObject({ moneyInput: null, transferToGovernedContract: false,
      calendarReferencePeriod: null, governedServiceValidity: null })
  })
  it.each(['MX', 'US'])('does not relabel %s observations as the proposed owned-used dry-van profile', country => {
    const profile = dossier.profiles.find((p: any) => p.country === country)
    const source = sourceById.get(profile.exposureScenarioSourceId)
    expect(source.country).toBe(country)
    expect(profile).toMatchObject({ sourceMatchesTargetProfile: false, actualFleetTractors: null,
      actualTrailerStockRatio: null, emptyKmShare: null, economicAmounts: null })
    expect(profile.tractor).toMatchObject({ proposalStatus: 'NOT_ADOPTED',
      financingTreatment: 'UNRESOLVED_NOT_ZERO', offerIsCapitalizableCost: false })
    expect(source).toMatchObject({ visualPageReviewed: true, dryVanConfirmed: false, forHireD2DConfirmed: false })
    expect(source.snapshotSha256).toMatch(/^[a-f0-9]{64}$/)
  })
  it('distinguishes a historical model case from a measured national sample', () => {
    expect(sourceById.get('IMT_PT260_CASE')).toMatchObject({ publicationYear: 2004,
      observationYear: null, evidenceType: 'HISTORICAL_MODELED_CASE', capacityUseRoundTripPercent: 55 })
    expect(sourceById.get('ATRI_2025_NATIONAL_2024')).toMatchObject({ publicationYear: 2025,
      observationYear: 2024, evidenceType: 'PUBLIC_SAMPLE_AGGREGATE' })
    expect(sourceById.get('ATRI_2026_ACCESS')).toMatchObject({ fullReportObtained: false, formSubmissionPerformed: false })
  })
  it('recomputes MX monthly averages without a fleet size or a loaded-share inference', () => {
    const source = sourceById.get('IMT_PT260_CASE')
    expect(source.annualDistance).toEqual({ value: 120000, unit: 'km/vehicle-year' })
    expect(source.annualOperatingDays.value / 12).toBe(25)
    expect(source.annualDistance.value / 12).toBe(10000)
    expect(source.annualDistance.value / source.annualOperatingDays.value).toBe(400)
  })
  it('independently recomputes US miles and day normalization', () => {
    const source = sourceById.get('ATRI_2025_NATIONAL_2024')
    expect(source.annualDistance).toEqual({ value: 82677, unit: 'mile/truck-year' })
    // Exact international mile; analysis only. Does not replace the legacy engine constant.
    const annualKm = source.annualDistance.value * 1609344 / 1000000
    expect(dossier.method.mileToKm).toBe(1609344 / 1000000)
    expect(annualKm / 12).toBeCloseTo(11087.977824, 8)
    expect(source.annualOperatingDays.value / 12).toBeCloseTo(22.3333333333333, 10)
    expect(annualKm / source.annualOperatingDays.value).toBeCloseTo(496.476619, 6)
  })
  it.each(['MX', 'US'])('uses the existing max allocation rule for dimensionless %s fractions', country => {
    const profile = dossier.profiles.find((p: any) => p.country === country)
    const source = sourceById.get(profile.exposureScenarioSourceId)
    const km = source.annualDistance.value * (country === 'US' ? 1.609344 : 1) / 12
    const days = source.annualOperatingDays.value / 12
    // Hypothetical fractions, not route distances or invented monetary benchmark inputs.
    const distanceShare = (km * 0.3) / km
    const dayShare = (days * 0.2) / days
    expect(allocateFixedCost(distanceShare, dayShare)).toBeCloseTo(0.3)
    expect(allocateFixedCost(distanceShare, dayShare)).not.toBeCloseTo(distanceShare + dayShare)
    expect(allocateFixedCost(distanceShare / 0.8, dayShare / 0.8) / allocateFixedCost(distanceShare, dayShare)).toBeCloseTo(1.25)
    expect(dossier.sensitivity).toMatchObject({ kind: 'ANALYTICAL_STRESS_NOT_BENCHMARK_RANGE',
      sameBudgetAndScope: true, exposureMultiplier: 0.8, allocatedCostMultiplier: 1.25 })
  })
  it('does not erase or charge twice the physical shared trailer', () => {
    expect(dossier.sharedTrailer).toMatchObject({ physicalCase: 'SAME_LOADED_DRY_VAN_INTERCHANGED_NO_TRANSLOAD',
      tenure: null, economicCostBearer: null, allocationBetweenCarriers: null,
      costIncludedInProfiles: false, knownZeroCost: false, separateTrailerSubstitutionAllowed: false,
      stockRatioInferredFromServiceCombination: false })
  })
  it.each([
    ['B2_PAYROLL_CAPITAL_CONTRACT_TEMPLATE_2026-09-29.json', 'cabfda00873356406d838306bfa87b912eccd9a6026449c0ebb26046acd8bd85'],
    ['B2_PUBLIC_REFERENCE_COMPONENTS_LEDGER_2026-09-29.json', 'e57cdd449f0a285f9758ded2ac438838d38edc6eef6e06ccb082d9238a8a6d60'],
  ])('does not mutate %s to adopt a research scenario', (file, hash) => {
    expect(createHash('sha256').update(readFileSync(resolve(research, file))).digest('hex')).toBe(hash)
  })
})
