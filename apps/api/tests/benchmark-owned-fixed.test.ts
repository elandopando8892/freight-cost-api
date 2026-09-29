import { describe, expect, it } from 'vitest'
import { calculateOwnedFixedScenarios } from '../src/modules/engine/benchmark-owned-fixed.js'
import { calculateOwnedCfuScenarios } from '../src/modules/engine/benchmark-owned-cfu.js'
function fixture() {
  const datum = (value: number, unit: string) => ({ value, unit, evidenceIds: ['test'], derivation: 'Synthetic only' })
  const evidence = [{ id: 'test', url: 'https://example.org/test', locator: 'Fixture', country: 'US',
    equipment: 'TRACTOR_DRY_VAN_SINGLE', observedAt: '2026-09-01', validFrom: '2026-09-01', validUntil: '2026-09-30', limitations: 'Not adopted data' }]
  return { capital: { assetReference: 'TEST', condition: 'NEW', country: 'US', serviceDate: '2026-09-29',
    acquisitionCost: datum(40000, 'USD'), evidence,
    scenarios: [{ id: 'A', horizonBasis: 'FROM_NEW', horizon: datum(120, 'months'), residual: datum(10000, 'USD'), applicabilityRationale: 'Synthetic' }] },
    allocation: 'TRAILER_ONLY_EXCLUDES_TRACTOR_AND_VARIABLE_COSTS', allocationRationale: 'Synthetic', allocationEvidenceIds: ['test'], evidence,
    financing: [{ scenarioId: 'A', basis: 'INTEREST_ONLY_MONTHLY_AVERAGE', interest: datum(50, 'USD/trailer-month') }],
    expenses: ['INSURANCE', 'PERMITS', 'OVERHEAD'].map(concept => ({ concept, amount: datum(10, 'USD/trailer-month') })) }
}
describe('owned fixed scenario composition', () => {
  it('recomputes capital and sums interest and explicit expenses only', () => {
    const result = calculateOwnedFixedScenarios(fixture())
    expect(result.scenarios![0].monthlyFixedUsd).toBe(330)
    expect(result.cfuUsd).toBeNull(); expect(result.calibrated).toBe(false)
  })
  it('accepts documented debt-free zero and keeps scenarios distinct', () => {
    const input = fixture(); input.financing[0].interest.value = 0
    input.capital.scenarios.push({ ...input.capital.scenarios[0], id: 'B' })
    input.financing.push({ ...input.financing[0], scenarioId: 'B', interest: { ...input.financing[0].interest, value: 100 } })
    expect(calculateOwnedFixedScenarios(input).scenarios!.map(s => s.monthlyFixedUsd)).toEqual([280, 380])
  })
  it.each(['missing-expense', 'duplicate-expense', 'missing-finance', 'duplicate-finance', 'unknown', 'expired', 'reference', 'capital', 'overflow'] as const)('blocks %s', failure => {
    const input = fixture()
    if (failure === 'missing-expense') input.expenses.pop()
    if (failure === 'duplicate-expense') input.expenses[1].concept = 'INSURANCE'
    if (failure === 'missing-finance') input.capital.scenarios.push({ ...input.capital.scenarios[0], id: 'B' })
    if (failure === 'duplicate-finance') input.financing.push({ ...input.financing[0] })
    if (failure === 'unknown') input.financing[0].scenarioId = 'other'
    if (failure === 'expired') input.evidence[0].validUntil = '2026-09-28'
    if (failure === 'reference') input.financing[0].interest.evidenceIds = ['missing']
    if (failure === 'capital') input.capital.scenarios[0].residual.value = 50000
    if (failure === 'overflow') input.expenses[0].amount.value = 1e308
    expect(calculateOwnedFixedScenarios(input).scenarios).toBeNull()
  })
  it('rejects payment principal, rent and client fixed totals', () => {
    const input = fixture()
    expect(() => calculateOwnedFixedScenarios({ ...input, monthlyFixedUsd: 1 })).toThrow()
    expect(() => calculateOwnedFixedScenarios({ ...input, financing: [{ ...input.financing[0], principal: 500 }] })).toThrow()
    input.expenses[0].concept = 'RENT'
    expect(() => calculateOwnedFixedScenarios(input)).toThrow()
  })
})

function cfuFixture() {
  const fixed = fixture()
  const datum = (value: number, unit: string) => ({ value, unit, evidenceIds: ['test'], derivation: 'Synthetic exposure only' })
  return { fixed, exposure: { assetReference: 'TEST', serviceDate: '2026-09-29',
    evidence: fixed.evidence.map(e => ({ ...e })), productiveKmPerMonth: datum(10000, 'km/trailer-month'),
    productiveDaysPerMonth: datum(20, 'days/trailer-month'), totalKm: datum(1000, 'km'), cycleDays: datum(3, 'days') } }
}
describe('owned trailer CFU allocation', () => {
  it.each([[3, 49.5, 'TIME'], [1, 33, 'DISTANCE'], [2, 33, 'TIE']])('allocates cycle %s without summing alternative bases', (days, expected, basis) => {
    const input = cfuFixture(); input.exposure.cycleDays.value = days as number
    const result = calculateOwnedCfuScenarios(input)
    expect(result.scenarios![0]).toMatchObject({ cfuUsd: expected, bindingBasis: basis, cfuByDistanceUsd: 33 })
    expect(result.productionCostUsd).toBeNull(); expect(result.calibrated).toBe(false)
  })
  it.each(['asset', 'date', 'missing', 'source', 'expired', 'country', 'days', 'fixed', 'overflow'] as const)('blocks %s', failure => {
    const input = cfuFixture()
    if (failure === 'asset') input.exposure.assetReference = 'OTHER'
    if (failure === 'date') input.exposure.serviceDate = '2026-09-28'
    if (failure === 'source') input.exposure.totalKm.evidenceIds = ['unknown']
    if (failure === 'expired') input.exposure.evidence[0].validUntil = '2026-09-28'
    if (failure === 'country') input.exposure.evidence[0].country = 'MX'
    if (failure === 'days') input.exposure.productiveDaysPerMonth.value = 32
    if (failure === 'fixed') input.fixed.expenses.pop()
    if (failure === 'overflow') input.exposure.totalKm.value = 1e308
    const result = calculateOwnedCfuScenarios(failure === 'missing' ? { ...input, exposure: { ...input.exposure, cycleDays: null } } : input)
    expect(result.scenarios).toBeNull(); expect(result.status).toBe('INCOMPLETE')
  })
  it('rejects zero denominators and injected fixed totals', () => {
    const input = cfuFixture(); input.exposure.productiveKmPerMonth.value = 0
    expect(() => calculateOwnedCfuScenarios(input)).toThrow()
    expect(() => calculateOwnedCfuScenarios({ ...cfuFixture(), monthlyFixedUsd: 1 })).toThrow()
  })
})
