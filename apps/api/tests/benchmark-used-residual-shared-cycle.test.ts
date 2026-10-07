import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { calculateSharedTrailer } from '../src/modules/engine/benchmark-shared-trailer.js'
import { allocateFixedCost } from '../src/modules/engine/fixed-cost-allocation.js'

const research = resolve(__dirname, '../../../docs/research')
const d = JSON.parse(readFileSync(resolve(research, 'B2_USED_RESIDUAL_SHARED_CYCLE_2026-09-29.json'), 'utf8'))
const model = d.sources.find((source: any) => source.id === 'ANL_ESD_21_4')

describe('historical residual model, explicitly conditional and not a remaining-life estimate', () => {
  it('records reviewed government-hosted pages and the source units without inventing precision', () => {
    expect(model).toMatchObject({ publicationYear: 2021, observationPeriod: 'September 2019 listing data',
      annualAgeRetention: 0.9071, retentionPerThousandAdditionalMiles: 0.9990,
      pages: 227, readRelevantPages: [89, 90, 91, 201], visualRelevantPagesReviewed: true,
      governmentMirrorDownloaded: true, byteIdentityToCanonicalEstablished: false })
    expect(model.snapshotSha256).toBe('c49755ae06436d51fda2c629d9b3ab8595279713f7e852d825e9a90e400d4425')
  })
  it('cancels historical initial price, starting age and starting mileage in an incremental model ratio', () => {
    // Dimensionless mathematical check only; these are not empirical acquisition/age/mileage inputs.
    const a = Math.log(model.annualAgeRetention)
    const m = Math.log(model.retentionPerThousandAdditionalMiles)
    const value = (age: number, mileageThousands: number) => Math.exp(a * age + m * mileageThousands)
    const ratio = value(5 + 3, 531.334 + 248.031) / value(5, 531.334)
    expect(ratio).toBeCloseTo(Math.exp(a * 3 + m * 248.031), 12)
  })
  it.each(d.usTractor.residualScenarios)('independently recomputes $id using additional miles / 1000', (row: any) => {
    const years = row.horizonMonths / 12
    const miles = 82677 * row.multiplier * years
    const q = Math.exp(Math.log(0.9071) * years + Math.log(0.9990) * miles / 1000)
    expect(row.additionalMiles).toBeCloseTo(miles, 8)
    expect(row.grossRetentionFraction).toBeCloseTo(q, 12)
    expect(row.grossOfferAnchorUnits).toBeCloseTo(45000 * q, 7)
    expect(row.valueLossPer100AnchorPerMonth).toBeCloseTo(100 * (1 - q) / row.horizonMonths, 10)
    expect(row).toMatchObject({ grossOfferAnchorCurrency: null, netResidualUsd: null,
      capitalizableCostUsd: null, monthlyDepreciationUsd: null, remainingEconomicLifeMonths: null })
  })
  it('does not apply the odometer twice, or use all miles as thousands of miles', () => {
    const row = d.usTractor.residualScenarios[1]
    const q = row.grossRetentionFraction
    expect(q).toBeCloseTo(0.5823621101586334, 12)
    expect(q).not.toBeCloseTo(0.9071 ** 3 * 0.9990 ** ((531334 + 248031) / 1000), 8)
    expect(q).not.toBeCloseTo(0.9071 ** 3 * 0.9990 ** 248031, 8)
  })
  it('keeps zero-additional-mileage counterfactual separate from the operating scenario', () => {
    expect(d.usTractor.ageOnlyCounterfactual.grossRetentionFraction).toBeCloseTo(0.746389464911, 12)
    expect(d.usTractor.ageOnlyCounterfactual.grossRetentionFraction).toBeGreaterThan(d.usTractor.residualScenarios[1].grossRetentionFraction)
    expect(d.usTractor.residualScenarios.map((row: any) => row.grossRetentionFraction)).toEqual(
      [...d.usTractor.residualScenarios.map((row: any) => row.grossRetentionFraction)].sort((a, b) => b - a))
  })
  it('does not turn planned holding, scenario spread, source significance or book life into calibration', () => {
    expect(d.method).toMatchObject({ horizonMonths: 36,
      horizonKind: 'CONDITIONAL_PLANNED_HOLDING_PERIOD_NOT_OBSERVED_REMAINING_LIFE',
      uncertaintyKind: 'SCENARIO_SPREAD_NOT_CONFIDENCE_OR_PREDICTION_INTERVAL',
      manufactureAgeUsedToInferLife: false, bookLifeTransferred: false, referencePeriod: null,
      sourceValidityCertified: false, transferToGovernedContract: false })
    expect(d.usTractor.adoptedScenarioId).toBeNull()
  })
  it('does not transfer US sleeper coefficients to MX or the shared trailer', () => {
    expect(d.method).toMatchObject({ sourceToMXTransferred: false, sourceToTrailerTransferred: false })
    expect(d.mxTractor).toMatchObject({ remainingEconomicLifeMonths: null, netResidualMxn: null, conditionalRetentionFraction: null })
    expect(d.sharedTrailer).toMatchObject({ chosenEconomicOwner: null, chosenCostBearer: null,
      chosenSettlementShares: null, countryOfEconomicBase: null, knownZeroCost: false })
    expect(d.sharedTrailer.responsibilityOptions.every((option: any) => !option.actualOwnershipEstablished)).toBe(true)
  })
  it('retains business outputs unknown rather than treating gross reference as net capital', () => {
    expect(d).toMatchObject({ calibrated: false, quoteReady: false, adoptedValues: 0 })
    expect(Object.values(d.outputs).every(value => value === null)).toBe(true)
    expect(d.decision).toMatchObject({ B2: 'PARTIAL', B1: 'OPEN', E1: 'OPEN', businessGatesClosed: 0 })
    expect(d.method.netResidualEquation).toContain('K_disposal')
    expect(d.method.depreciationBridge).toContain('A_capitalizable')
  })
  it.each(d.unchangedFiles)('leaves $file unchanged', ({ file, sha256 }: any) => {
    expect(createHash('sha256').update(readFileSync(resolve(research, file))).digest('hex')).toBe(sha256)
  })
})

describe('reuse one physical trailer-cycle allocation, not max separately for each leg', () => {
  // The USD amounts, exposure, trip and 40/60 split here are synthetic tests only.
  // They are never put into a real dossier or accepted as public benchmark inputs.
  function input() {
    const s = d.sharedTrailer.stressOnly
    const datum = (value: number, unit: string) => ({ value, unit,
      evidenceIds: ['synthetic'], derivation: 'Synthetic allocation regression; no economic evidence' })
    return { assetReference: 'SYNTHETIC-ONE-TRAILER', scopeDeclaration: 'LEG_INPUTS_EXCLUDE_ALL_TRAILER_COSTS',
      allocationEvidence: 'Synthetic one physical cycle; not actual owner or settlement evidence', allocationEvidenceIds: ['synthetic'],
      costAgreement: { tenure: 'OWNED', fixedCostBasis: 'DEPRECIATION_AND_FINANCING',
        includedInMonthlyFixed: [], derivation: 'Synthetic only', evidenceIds: ['synthetic'] },
      monthlyFixedUsd: datum(s.monthlyFixedUsd, 'USD/trailer-month'),
      productiveKmPerMonth: datum(s.monthlyTrailerKm, 'km/trailer-month'),
      productiveDaysPerMonth: datum(s.monthlyTrailerDays, 'days/trailer-month'),
      maintenanceUsdPerKm: datum(0, 'USD/km'), tiresUsdPerKm: datum(0, 'USD/km'),
      totalKm: datum(s.mx.km + s.us.km, 'km'), cycleDays: datum(s.mx.days + s.us.days, 'days'),
      evidence: [{ id: 'synthetic', url: 'https://example.org/synthetic', locator: 'Synthetic regression only',
        country: 'MX', equipment: 'TRACTOR_DRY_VAN_SINGLE', observedAt: '2026-09-01',
        validFrom: '2026-09-01', validUntil: '2026-09-30', limitations: 'Not a benchmark or actual allocation agreement' }] }
  }
  it('uses the existing shared-trailer calculator and obtains one 125 USD synthetic allocation', () => {
    const result = calculateSharedTrailer(input(), '2026-09-29', 1000, 2.5)
    expect(result.issues).toEqual([])
    expect(result).toMatchObject({ calibrated: false, sourceStatus: 'DOCUMENTED_UNVERIFIED' })
    expect(result.costs).toMatchObject({ cfuUsd: 125, cfuByDistanceUsd: 100, cfuByTimeUsd: 125 })
    const s = d.sharedTrailer.stressOnly
    const perLegMax = [s.mx, s.us].reduce((sum, leg) => sum + allocateFixedCost(
      s.monthlyFixedUsd * leg.km / s.monthlyTrailerKm,
      s.monthlyFixedUsd * leg.days / s.monthlyTrailerDays), 0)
    expect(perLegMax).toBe(s.sumOfPerLegMaxUsd)
    expect(perLegMax - result.costs!.cfuUsd).toBe(s.overAllocationUsd)
  })
  it.each(['MX_PROVIDES', 'US_PROVIDES'])('conserves one cost in the unselected %s accountability option', id => {
    const option = d.sharedTrailer.responsibilityOptions.find((item: any) => item.id === id)
    const cfu = calculateSharedTrailer(input(), '2026-09-29', 1000, 2.5).costs!.cfuUsd
    expect(option.reportingShareMX + option.reportingShareUS).toBe(1)
    expect(cfu * option.reportingShareMX + cfu * option.reportingShareUS).toBe(cfu)
    expect(option.actualOwnershipEstablished).toBe(false)
  })
  it('splits only the already calculated synthetic whole-cycle total, not its monthly cost or denominators', () => {
    const example = d.sharedTrailer.stressOnly.splitExample
    const whole = calculateSharedTrailer(input(), '2026-09-29', 1000, 2.5).costs!.cfuUsd
    expect(example.mxShare + example.usShare).toBe(1)
    expect(whole * example.mxShare).toBe(example.mxUsd)
    expect(whole * example.usShare).toBe(example.usUsd)
    expect(example.mxUsd + example.usUsd).toBe(whole)
    expect(d.sharedTrailer.chosenSettlementShares).toBeNull()
  })
  it('reverses travel order without changing the one-cycle allocation or economic base', () => {
    const direct = input(), reverse = input()
    const s = d.sharedTrailer.stressOnly
    reverse.totalKm.value = s.us.km + s.mx.km
    reverse.cycleDays.value = s.us.days + s.mx.days
    expect(calculateSharedTrailer(reverse, '2026-09-29', 1000, 2.5).costs).toEqual(
      calculateSharedTrailer(direct, '2026-09-29', 1000, 2.5).costs)
  })
  it('does not replace missing trailer economics with documented synthetic zero', () => {
    const result = calculateSharedTrailer({ ...input(), monthlyFixedUsd: null }, '2026-09-29', 1000, 2.5)
    expect(result.costs).toBeNull()
    expect(result.issues).toContainEqual({ field: 'monthlyFixedUsd', code: 'MISSING_TRAILER_INPUT' })
  })
})
