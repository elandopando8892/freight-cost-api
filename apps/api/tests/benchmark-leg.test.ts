import { describe, expect, it } from 'vitest'
import { calculateBenchmarkLeg, type BenchmarkLegInput } from '../src/modules/engine/benchmark-leg.js'

// Arithmetic fixtures only; example.org is not a benchmark source.
const fixture = (): BenchmarkLegInput => {
  const value = (value: number, unit: string) => ({ value, unit, evidenceIds: ['synthetic'], derivation: 'Synthetic unit-test fixture' })
  return {
    model: 'FCM_CARRIER_BENCHMARK_LEG_V1', baseRevision: 'TEST-NOT-CALIBRATED', country: 'MX',
    equipment: 'TRACTOR_DRY_VAN_SINGLE', service: 'ONE_WAY', fixedCostScope: 'DOMESTIC_CARRIER_FLEET', serviceDate: '2026-09-29',
    rates: {
      monthlyFixedUsd: value(10000, 'USD/fleet-month'), productiveKmPerMonth: value(20000, 'km/fleet-month'),
      productiveVehicleDaysPerMonth: value(100, 'vehicle-days/fleet-month'),
      maintenanceUsdPerKm: value(0.1, 'USD/km'), tiresUsdPerKm: value(0.05, 'USD/km'),
      driverUsdPerKm: value(0.2, 'USD/km'), dieselUsdPerLiter: value(1, 'USD/liter'),
      loadedKmPerLiter: value(2, 'km/liter'), emptyKmPerLiter: value(4, 'km/liter'),
    },
    trip: { loadedKm: value(100, 'km'), emptyKm: value(20, 'km'), cycleDays: value(1, 'days'), tollsUsd: value(10, 'USD') },
    evidence: [{ id: 'synthetic', url: 'https://example.org/synthetic-test', locator: 'Fixture only',
      observedAt: '2026-09-01', validFrom: '2026-09-01', validUntil: '2026-09-30', country: 'MX',
      equipment: 'TRACTOR_DRY_VAN_SINGLE', limitations: 'Not economic evidence' }],
  }
}

describe('documented carrier benchmark leg', () => {
  it('reconciles variable costs and uses max(time, distance), not their sum', () => {
    expect(calculateBenchmarkLeg(fixture())).toMatchObject({
      status: 'BENCHMARK_ESTIMATE', calibrated: false, purchaseCostUsd: null, sellPriceUsd: null,
      costs: { totalKm: 120, fuelUsd: 55, maintenanceUsd: 12, tiresUsd: 6, driverUsd: 24,
        tollsUsd: 10, cvuUsd: 107, cfuByDistanceUsd: 60, cfuByTimeUsd: 100, cfuUsd: 100, productionCostUsd: 207 },
    })
  })
  it('selects distance when it commits more fixed cost and preserves provenance', () => {
    const input = fixture(); input.trip.cycleDays!.value = 0.1
    const result = calculateBenchmarkLeg(input)
    expect(result.costs?.cfuUsd).toBe(60)
    expect(result.lineage).toEqual(input)
    expect(result.sourceStatus).toBe('DOCUMENTED_UNVERIFIED')
  })
  it.each(['monthlyFixedUsd', 'dieselUsdPerLiter', 'tiresUsdPerKm'] as const)('does not replace absent %s with a default', key => {
    const input = fixture(); input.rates[key] = null
    expect(calculateBenchmarkLeg(input)).toMatchObject({ status: 'INCOMPLETE', costs: null,
      issues: expect.arrayContaining([{ field: `rates.${key}`, code: 'MISSING_INPUT' }]) })
  })
  it('requires evidence even for an explicit zero toll', () => {
    const input = fixture(); input.trip.tollsUsd!.value = 0; input.trip.tollsUsd!.evidenceIds = ['missing']
    expect(calculateBenchmarkLeg(input).costs).toBeNull()
    input.trip.tollsUsd!.evidenceIds = ['synthetic']
    expect(calculateBenchmarkLeg(input).costs?.tollsUsd).toBe(0)
  })
  it.each(['expired', 'future-observation', 'wrong-country', 'reversed-validity', 'duplicate'] as const)('rejects %s evidence', failure => {
    const input = fixture()
    if (failure === 'expired') input.evidence[0].validUntil = '2026-09-28'
    if (failure === 'future-observation') input.evidence[0].observedAt = '2026-09-30'
    if (failure === 'wrong-country') input.evidence[0].country = 'US'
    if (failure === 'reversed-validity') input.evidence[0].validFrom = '2026-10-01'
    if (failure === 'duplicate') input.evidence.push({ ...input.evidence[0] })
    expect(calculateBenchmarkLeg(input)).toMatchObject({ status: 'INCOMPLETE', costs: null })
  })
  it('keeps US and MX assumptions separate', () => {
    const mx = fixture(); const us = fixture(); us.country = 'US'; us.evidence[0].country = 'US'
    us.rates.driverUsdPerKm!.value = 0.4
    expect(calculateBenchmarkLeg(us).costs?.driverUsd).toBe(48)
    expect(calculateBenchmarkLeg(mx).costs?.driverUsd).toBe(24)
  })
  it('rejects incompatible units, unsupported equipment, impossible dates and zero denominators', () => {
    const input = fixture()
    expect(() => calculateBenchmarkLeg({ ...input, equipment: 'REEFER' })).toThrow()
    expect(() => calculateBenchmarkLeg({ ...input, serviceDate: '2026-02-30' })).toThrow()
    input.rates.dieselUsdPerLiter!.unit = 'MXN/liter'
    expect(() => calculateBenchmarkLeg(input)).toThrow()
    input.rates.dieselUsdPerLiter!.unit = 'USD/liter'; input.rates.loadedKmPerLiter!.value = 0
    expect(() => calculateBenchmarkLeg(input)).toThrow()
  })
  it('rejects overflow instead of returning a numeric price', () => {
    const input = fixture(); input.rates.monthlyFixedUsd!.value = Number.MAX_VALUE
    expect(calculateBenchmarkLeg(input)).toMatchObject({ status: 'INCOMPLETE', costs: null })
  })
})
