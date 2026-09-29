import { describe, expect, it } from 'vitest'
import { calculateCapitalScenarios } from '../src/modules/engine/benchmark-capital-scenarios.js'

// Synthetic arithmetic, not economic adoption or a vendor offer.
function fixture() {
  const datum = (value: number, unit: string) => ({ value, unit, evidenceIds: ['fixture'], derivation: 'Synthetic test' })
  return { assetReference: 'TEST', condition: 'NEW', country: 'US', serviceDate: '2026-09-29',
    acquisitionCost: datum(40000, 'USD'),
    evidence: [{ id: 'fixture', url: 'https://example.org/test', locator: 'Synthetic', observedAt: '2026-09-01',
      validFrom: '2026-09-01', validUntil: '2026-09-30', country: 'US', equipment: 'TRACTOR_DRY_VAN_SINGLE', limitations: 'Not a benchmark' }],
    scenarios: [{ id: 'A', horizonBasis: 'FROM_NEW', horizon: datum(120, 'months'), residual: datum(10000, 'USD'), applicabilityRationale: 'Synthetic' },
      { id: 'B', horizonBasis: 'FROM_NEW', horizon: datum(144, 'months'), residual: datum(6000, 'USD'), applicabilityRationale: 'Synthetic' }] }
}
describe('capital scenario sensitivity', () => {
  it('keeps scenarios separate and never labels depreciation as CFU', () => {
    const result = calculateCapitalScenarios(fixture())
    expect(result.scenarios).toEqual([{ id: 'A', monthlyDepreciationUsd: 250 }, { id: 'B', monthlyDepreciationUsd: 236.11 }])
    expect(result.status).toBe('SCENARIO_ONLY'); expect(result.calibrated).toBe(false)
    expect(result.monthlyFixedUsd).toBeNull(); expect(result.cfuUsd).toBeNull()
  })
  it('requires remaining horizon for used equipment', () => {
    const input = fixture(); input.condition = 'USED'
    expect(calculateCapitalScenarios(input).scenarios).toBeNull()
    input.scenarios.forEach(s => { s.horizonBasis = 'REMAINING_FROM_ACQUISITION'; s.horizon.value = 36 })
    expect(calculateCapitalScenarios(input).status).toBe('SCENARIO_ONLY')
  })
  it.each(['zero', 'fraction', 'residual', 'unknown', 'expired', 'country', 'duplicate', 'overflow'] as const)('blocks %s', mode => {
    const input = fixture()
    if (mode === 'zero') input.scenarios[0].horizon.value = 0
    if (mode === 'fraction') input.scenarios[0].horizon.value = 1.5
    if (mode === 'residual') input.scenarios[0].residual.value = 50000
    if (mode === 'unknown') input.acquisitionCost.evidenceIds = ['unknown']
    if (mode === 'expired') input.evidence[0].validUntil = '2026-09-28'
    if (mode === 'country') input.evidence[0].country = 'MX'
    if (mode === 'duplicate') input.scenarios[1].id = 'A'
    if (mode === 'overflow') input.acquisitionCost.value = 1e308
    expect(calculateCapitalScenarios(input).scenarios).toBeNull()
  })
  it('rejects injected totals and incorrect currency units', () => {
    expect(() => calculateCapitalScenarios({ ...fixture(), cfuUsd: 10 })).toThrow()
    const input = fixture(); input.acquisitionCost.unit = 'MXN'
    expect(() => calculateCapitalScenarios(input)).toThrow()
  })
})
