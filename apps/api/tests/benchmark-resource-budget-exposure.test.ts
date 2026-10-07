import { describe, expect, it } from 'vitest'
import { BINATIONAL_RESOURCES, BinationalFixedBudgetSchema } from '../src/modules/engine/benchmark-binational-budget.js'
import { ReferenceBudgetExposureSchema, reconcileReferenceBudgetExposure } from '../scripts/lib/reference-budget-exposure.js'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'
import { consolidateBinationalReferenceBudget } from '../scripts/consolidate-binational-reference-budget.js'

const read = (file: string) => JSON.parse(readLocalDocument(`docs/research/${file}`))

// Only arithmetic fixtures; never adopted rates, route distances, fleet or cycle.
function syntheticFixture() {
  const rawBudget = read('B2_BINATIONAL_FIXED_BUDGET_WORKSHEET_2026-10-01.json').budget
  rawBudget.referencePeriod = '2026-10'
  rawBudget.resources.forEach((r: { resourceId: string; profileReference: string }) => { r.profileReference = `SYNTHETIC_${r.resourceId}` })
  const source = { id: 'synthetic', url: 'https://example.org/unit-test', locator: 'Synthetic only, not benchmark',
    observedAt: '2026-10-01', referencePeriod: '2026-10', groupReference: rawBudget.groupReference,
    resourceIds: [...BINATIONAL_RESOURCES], profileReferences: structuredClone(rawBudget.resources),
    kind: 'DOCUMENTED_PUBLIC_MODEL', limitations: 'Invented solely for unit tests' }
  rawBudget.evidence = [source]
  rawBudget.expenses.forEach((e: { amount: unknown; scope: string; allocations: { share: number }[] }) => {
    e.amount = { value: 100, unit: 'USD/month', referencePeriod: '2026-10', evidenceIds: ['synthetic'],
      derivation: 'Synthetic test amount, not a reference', kind: 'DOCUMENTED_PUBLIC_MODEL' }
    if (e.scope === 'GROUP_SHARED') e.allocations.forEach((a, i) => { a.share = [.6, .3, .1][i] })
  })
  const budget = BinationalFixedBudgetSchema.parse(rawBudget)
  const exposure = ReferenceBudgetExposureSchema.parse({
    model: 'FCM_RESOURCE_FLEET_BUDGET_EXPOSURE_V1', groupReference: budget.groupReference,
    referencePeriod: '2026-10', serviceDate: '2026-10-15', budgetScope: 'RESOURCE_COHORT_FLEET_MONTH',
    exposureBasis: 'CALENDAR_MONTH_COMPATIBLE_ELAPSED_ASSET_DAYS',
    resources: BINATIONAL_RESOURCES.map((resourceId, i) => {
      const d = (value: number, unit: string) => ({ value, unit, evidenceIds: ['synthetic'], derivation: 'Synthetic only' })
      return { resourceId, assetReference: `physical_${resourceId}`, profileReference: `SYNTHETIC_${resourceId}`,
        assetQuantity: d([10, 5, 8][i], 'assets/resource-fleet'), totalKmPerMonth: d([100000, 50000, 80000][i], 'km/resource-fleet-month'),
        productiveAssetDaysPerMonth: d([200, 100, 160][i], 'asset-days/resource-fleet-month'),
        cycleTotalKm: d([1600, 1200, 2800][i], 'km/resource-cycle'), cycleLoadedKm: d([1500, 1000, 2500][i], 'km/resource-cycle'),
        cycleDays: d([4, 3, 6][i], 'days/resource-cycle') }
    }),
    evidence: [{ ...source, validFrom: '2026-10-01', validUntil: '2026-10-31' }],
    trailerAttachment: { model: 'FCM_SERIAL_TRAILER_ATTACHMENT_V1', timeBasis: 'COMPATIBLE_ELAPSED_DAYS_NOT_DRIVING_HOURS',
      scope: 'SERIAL_PHASES_NO_OVERLAP_OR_DUPLICATED_BORDER_WAIT', mxTractorReference: 'physical_MX_TRACTOR', usTractorReference: 'physical_US_TRACTOR',
      mxAttachedDays: { value: 2, unit: 'days', evidenceIds: ['synthetic'], derivation: 'Synthetic only' },
      borderDetachedDays: { value: 1, unit: 'days', evidenceIds: ['synthetic'], derivation: 'Synthetic only' },
      usAttachedDays: { value: 2, unit: 'days', evidenceIds: ['synthetic'], derivation: 'Synthetic only' },
      evidenceIds: ['synthetic'], derivation: 'Serial test phases, not the actual pilot' },
  })
  return { budget, exposure }
}
type Fixture = ReturnType<typeof syntheticFixture>
const evaluate = (f: Fixture) => reconcileReferenceBudgetExposure(f.budget, f.exposure)

describe('resource fleet budget/capacity bridge using existing MAX and box review', () => {
  it('normalizes numerator and both denominators together and conserves the group pool', () => {
    const result = evaluate(syntheticFixture())
    expect(result.issues).toEqual([])
    expect(result.status).toBe('BUDGET_EXPOSURE_SCENARIO_ONLY')
    expect(result.budget.monthlyGroupTotalUsd).toBe(1000)
    expect(result.resources!.map(r => r.fleetFixedUsd)).toEqual([360, 330, 310])
    expect(result.resources!.map(r => r.fixedAllocationUsd)).toEqual([7.2, 9.9, 11.625])
    expect(result.fixedAllocationUsd).toBeCloseTo(28.725, 8)
    for (const r of result.resources!) {
      expect(r.fixedUsdPerAssetMonth / r.kmPerAssetMonth).toBeCloseTo(r.fixedUsdPerKm, 10)
      expect(r.fixedUsdPerAssetMonth / r.productiveDaysPerAssetMonth).toBeCloseTo(r.fixedUsdPerAssetDay, 10)
      expect(r.fixedAllocationUsd).toBe(Math.max(r.byDistanceUsd, r.byTimeUsd))
      expect(r.trailerChargedPerLeg).toBe(false)
    }
  })
  it('is invariant when the same fleet and fixed pool are coherently scaled', () => {
    const before = evaluate(syntheticFixture())
    const f = syntheticFixture()
    f.budget.expenses.forEach(e => { e.amount!.value *= 3 })
    f.exposure.resources.forEach(r => { r.assetQuantity!.value *= 3; r.totalKmPerMonth!.value *= 3; r.productiveAssetDaysPerMonth!.value *= 3 })
    const after = evaluate(f)
    expect(after.fixedAllocationUsd).toBeCloseTo(before.fixedAllocationUsd!, 10)
    expect(after.resources!.map(r => r.fixedUsdPerAssetMonth)).toEqual(before.resources!.map(r => r.fixedUsdPerAssetMonth))
  })
  it('keeps box time separate from both full tractor return cycles', () => {
    const result = evaluate(syntheticFixture())
    expect(result.attachment!.minimumTrailerDays).toBe(5)
    expect(result.lineage.resources[2].cycleDays!.value).toBe(6)
    expect(result.lineage.resources[0].cycleDays!.value + result.lineage.resources[1].cycleDays!.value).toBe(7)
    expect(result.issues).toEqual([])
    expect(result.resources!.filter(r => r.resourceId === 'SHARED_TRAILER')).toHaveLength(1)
  })
  it.each([
    ['missing fleet scope', 'MISSING_RESOURCE_FLEET_BUDGET_SCOPE', (f: Fixture) => { f.exposure.budgetScope = null }],
    ['missing elapsed-days basis', 'MISSING_COMPATIBLE_ELAPSED_ASSET_DAYS', (f: Fixture) => { f.exposure.exposureBasis = null }],
    ['missing service date', 'MISSING_SERVICE_DATE', (f: Fixture) => { f.exposure.serviceDate = null }],
    ['different group', 'BUDGET_EXPOSURE_GROUP_MISMATCH', (f: Fixture) => { f.exposure.groupReference = 'OTHER' }],
    ['different month', 'BUDGET_EXPOSURE_PERIOD_MISMATCH', (f: Fixture) => { f.exposure.referencePeriod = '2026-09' }],
    ['different profile', 'BUDGET_EXPOSURE_PROFILE_MISMATCH', (f: Fixture) => { f.exposure.resources[0].profileReference = 'OTHER' }],
    ['missing count', 'MISSING_RESOURCE_EXPOSURE_INPUT', (f: Fixture) => { f.exposure.resources[0].assetQuantity = null }],
    ['over calendar capacity', 'EXCEEDS_RESOURCE_CALENDAR_CAPACITY', (f: Fixture) => { f.exposure.resources[0].productiveAssetDaysPerMonth!.value = 311 }],
    ['full cycle below loaded distance', 'CYCLE_BELOW_LOADED_DISTANCE', (f: Fixture) => { f.exposure.resources[0].cycleTotalKm!.value = 1499 }],
    ['box omits loaded phase', 'BOX_BELOW_COMBINED_LOADED_DISTANCE', (f: Fixture) => { f.exposure.resources[2].cycleTotalKm!.value = 2499 }],
    ['box loaded distance omits phase', 'BOX_LOADED_DISTANCE_BELOW_NATIONAL_PHASES', (f: Fixture) => { f.exposure.resources[2].cycleLoadedKm!.value = 2499 }],
    ['box omits serial time', 'BOX_BELOW_SERIAL_ATTACHMENT_DAYS', (f: Fixture) => { f.exposure.resources[2].cycleDays!.value = 4.99 }],
    ['missing serial box cycle', 'MISSING_SERIAL_BOX_CYCLE', (f: Fixture) => { f.exposure.trailerAttachment = null }],
    ['same physical tractor twice', 'PHYSICAL_RESOURCE_IDENTITY_COLLISION', (f: Fixture) => { f.exposure.resources[1].assetReference = f.exposure.resources[0].assetReference }],
    ['attachment uses another tractor', 'ATTACHMENT_RESOURCE_MISMATCH', (f: Fixture) => { f.exposure.trailerAttachment!.usTractorReference = 'OTHER' }],
    ['duplicate resource', 'REQUIRE_ONE_EXPOSURE_RESOURCE', (f: Fixture) => { f.exposure.resources[1].resourceId = 'MX_TRACTOR' }],
    ['unknown evidence', 'MISSING_EXPOSURE_EVIDENCE', (f: Fixture) => { f.exposure.resources[0].totalKmPerMonth!.evidenceIds = ['unknown'] }],
    ['duplicate source', 'DUPLICATE_EXPOSURE_SOURCE', (f: Fixture) => { f.exposure.evidence.push(structuredClone(f.exposure.evidence[0])) }],
    ['duplicate source resource', 'DUPLICATE_EXPOSURE_EVIDENCE_RESOURCE', (f: Fixture) => { f.exposure.evidence[0].resourceIds.push('MX_TRACTOR') }],
    ['duplicate reference', 'DUPLICATE_EXPOSURE_REFERENCE', (f: Fixture) => { f.exposure.resources[0].totalKmPerMonth!.evidenceIds.push('synthetic') }],
    ['aggregate context only', 'EXPOSURE_CONTEXT_NOT_COMPATIBLE_INPUT', (f: Fixture) => { f.exposure.evidence[0].kind = 'CONTEXT_ONLY' }],
    ['evidence uses other month', 'EXPOSURE_EVIDENCE_SCOPE_MISMATCH', (f: Fixture) => { f.exposure.evidence[0].referencePeriod = '2024-01' }],
    ['evidence uses another profile', 'EXPOSURE_EVIDENCE_PROFILE_MISMATCH', (f: Fixture) => { f.exposure.evidence[0].profileReferences[0].profileReference = 'OTHER' }],
    ['source expired', 'EXPOSURE_SOURCE_OUTSIDE_VALIDITY', (f: Fixture) => { f.exposure.evidence[0].validUntil = '2026-10-14' }],
    ['future source', 'EXPOSURE_SOURCE_OUTSIDE_VALIDITY', (f: Fixture) => { f.exposure.evidence[0].observedAt = '2026-10-16' }],
    ['incomplete monetary pool', 'MISSING_MONTHLY_AMOUNT', (f: Fixture) => { f.budget.expenses[0].amount = null }],
    ['group duplicated by shares', 'ALLOCATION_MUST_SUM_TO_ONE', (f: Fixture) => { f.budget.expenses.at(-1)!.allocations.forEach(a => { a.share = 1 }) }],
  ] as const)('blocks %s without emitting fixed cost', (_name, code, mutate) => {
    const f = syntheticFixture(); mutate(f)
    const result = evaluate(f)
    expect(result.issues.map(i => i.code)).toContain(code)
    expect(result.resources).toBeNull()
    expect(result.fixedAllocationUsd).toBeNull()
  })
  it('uses actual reference-month capacity, including leap February', () => {
    const f = syntheticFixture()
    f.exposure.referencePeriod = '2024-02'; f.exposure.resources[0].productiveAssetDaysPerMonth!.value = 291
    const result = evaluate(f)
    expect(result.calendarDaysInReferenceMonth).toBe(29)
    expect(result.issues.map(i => i.code)).toContain('EXCEEDS_RESOURCE_CALENDAR_CAPACITY')
  })
  it('rejects per-vehicle units, fractional assets and client-provided acceptance flags', () => {
    const f = syntheticFixture()
    expect(() => reconcileReferenceBudgetExposure(f.budget, { ...f.exposure, quoteReady: true })).toThrow()
    expect(() => reconcileReferenceBudgetExposure(f.budget, { ...f.exposure, exposureBasis: 'ANNUAL_AVERAGE_DRIVING_DAYS' })).toThrow()
    const badUnit = structuredClone(f.exposure) as any
    badUnit.resources[0].totalKmPerMonth.unit = 'km/vehicle-month'
    expect(() => reconcileReferenceBudgetExposure(f.budget, badUnit)).toThrow()
    f.exposure.resources[0].assetQuantity!.value = .5
    expect(() => evaluate(f)).toThrow()
  })
  it('blocks numerical overflow rather than returning infinite currency', () => {
    const f = syntheticFixture(); f.exposure.resources[0].totalKmPerMonth!.value = 1e-310
    const result = evaluate(f)
    expect(result.issues.map(i => i.code)).toContain('EXPOSURE_ARITHMETIC_RANGE_EXCEEDED')
    expect(result.fixedAllocationUsd).toBeNull()
  })
  it('does not promote a compatible arithmetic fixture to price or operating acceptance', () => {
    expect(evaluate(syntheticFixture())).toMatchObject({ calibrated: false, quoteReady: false, adoptedValues: 0,
      cvuUsd: null, purchaseUsd: null, sellUsd: null, activeEngineInvoked: false })
  })
  it('connects the real handoff without taking physical case counts as fleet quantities', () => {
    const report = consolidateBinationalReferenceBudget()
    expect(report.resourceBudgetExposure).toMatchObject({ status: 'INCOMPLETE', fixedAllocationUsd: null,
      resources: null, referencePiecesTransferredToBudget: true,transferIsExplicitReviewedModel:true,
      historicalAnnualExposureRelabelledCalendarMonth: false })
    expect(report.resourceBudgetExposure.physicalCase.resourcesInOneService).toEqual({ MX_TRACTOR: 1, US_TRACTOR: 1, SHARED_TRAILER: 1 })
    expect(report.resourceBudgetExposure.lineage.resources.every(r => r.assetQuantity === null)).toBe(true)
    expect(report.resourceBudgetExposure.completionPackages).toHaveLength(4)
    expect(report.resourceBudgetExposure.issues.length).toBeGreaterThan(15)
    expect(Object.values(report.outputs).every(v => v === null)).toBe(true)
  })
})
