import { describe, expect, it } from 'vitest'
import { PARAMETER_DEFINITIONS } from '../src/data/parameter-catalog.js'
import { benchmarkRateRequirements } from '../src/modules/engine/benchmark-rates.js'
import { calculateBenchmarkD2D } from '../src/modules/engine/benchmark-d2d.js'

// Synthetic arithmetic fixtures, not adopted benchmark data.
function fixture() {
  const leg = (country: 'MX' | 'US') => {
    const needed = new Set(Object.values(benchmarkRateRequirements(country)).flat())
    const datum = (value: number, unit: string) => ({ value, unit, evidenceIds: ['test'], derivation: 'Synthetic' })
    return {
      parameters: { country, serviceDate: '2026-09-29', baseRevision: `TEST-${country}`,
        parameters: PARAMETER_DEFINITIONS.filter(p => needed.has(p.key)).map(p => ({
          key: p.key, value: p.defaultValue, unit: p.unit, evidenceIds: ['test'], derivation: 'Synthetic' })),
        evidence: [{ id: 'test', url: 'https://example.org/test', locator: 'Fixture', country,
          equipment: 'TRACTOR_DRY_VAN_SINGLE', observedAt: '2026-09-01', validFrom: '2026-09-01', validUntil: '2026-09-30', limitations: 'Not economic evidence' }] },
      trip: { loadedKm: datum(100, 'km'), emptyKm: datum(20, 'km'), cycleDays: datum(1, 'days'), tollsUsd: datum(0, 'USD') },
    }
  }
  return {
    model: 'FCM_CARRIER_BENCHMARK_D2D_V1', direction: 'MX_TO_US', serviceDate: '2026-09-29',
    assetAllocation: 'SEPARATE_TRACTOR_TRAILER_PER_LEG', allocationRationale: 'Synthetic separate fleets',
    route: { mxEndpoint: 'Test origin', mxGateway: 'Test MX gateway', usGateway: 'Test US gateway', usEndpoint: 'Test destination' },
    mx: leg('MX'), us: leg('US'),
    borderCharges: [{ id: 'bundle', covers: ['CROSSING', 'INTERCHANGE'], amountUsd: 150.25,
      provider: 'Synthetic', derivation: 'One bundle counted once', sourceUrl: 'https://example.org/test', locator: 'Fixture',
      observedAt: '2026-09-01', validFrom: '2026-09-01', validUntil: '2026-09-30' }],
  }
}

describe('D2D benchmark assembly', () => {
  it('counts a crossing/interchange bundle exactly once, preserves lineage and reconciles cents', () => {
    const result = calculateBenchmarkD2D(fixture())
    expect(result.status).toBe('BENCHMARK_ESTIMATE')
    const mx = result.legs.mx.leg!.costs!; const us = result.legs.us.leg!.costs!
    const expectedCents = Math.round(mx.productionCostUsd * 100) + Math.round(us.productionCostUsd * 100) + 15025
    expect(result.costs!.productionCostUsd).toBe(expectedCents / 100)
    expect(result.costs!.borderServicesUsd).toBe(150.25)
    expect(result.legs.mx.parameterLineage.lineage.baseRevision).toBe('TEST-MX')
    expect(result.purchaseCostUsd).toBeNull(); expect(result.sellPriceUsd).toBeNull(); expect(result.calibrated).toBe(false)
  })
  it('supports reverse direction without swapping national economic inputs', () => {
    const input = fixture(); input.direction = 'US_TO_MX'
    const result = calculateBenchmarkD2D(input)
    expect(result.travelOrder).toEqual(['us', 'border', 'mx'])
    expect(result.legs.us.parameterLineage.country).toBe('US')
  })
  it.each(['duplicate-coverage', 'duplicate-id', 'missing', 'expired', 'country', 'date', 'parameter', 'trip'] as const)('blocks %s', failure => {
    const input = fixture()
    if (failure === 'duplicate-coverage') input.borderCharges.push({ ...input.borderCharges[0], id: 'second' })
    if (failure === 'duplicate-id') {
      input.borderCharges[0].covers = ['CROSSING']; input.borderCharges.push({ ...input.borderCharges[0], covers: ['INTERCHANGE'] })
    }
    if (failure === 'missing') input.borderCharges = []
    if (failure === 'expired') input.borderCharges[0].validUntil = '2026-09-28'
    if (failure === 'country') input.mx.parameters.country = 'US'
    if (failure === 'date') input.us.parameters.serviceDate = '2026-09-28'
    if (failure === 'parameter') input.mx.parameters.parameters = []
    const result = calculateBenchmarkD2D(failure === 'trip' ? { ...input, us: { ...input.us, trip: { ...input.us.trip, tollsUsd: null } } } : input)
    expect(result.status).toBe('INCOMPLETE'); expect(result.costs).toBeNull(); expect(result.issues.length).toBeGreaterThan(0)
  })
  it('accepts documented zero services but rejects unsupported allocation and injected totals', () => {
    const input = fixture(); input.borderCharges[0].amountUsd = 0
    expect(calculateBenchmarkD2D(input).costs!.borderServicesUsd).toBe(0)
    expect(() => calculateBenchmarkD2D({ ...input, assetAllocation: 'SHARED_TRAILER' })).toThrow()
    expect(() => calculateBenchmarkD2D({ ...input, productionCostUsd: 1 })).toThrow()
  })
})
