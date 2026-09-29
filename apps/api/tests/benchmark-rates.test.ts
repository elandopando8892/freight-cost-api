import { describe, expect, it } from 'vitest'
import { PARAMETER_DEFINITIONS, parameterKey } from '../src/data/parameter-catalog.js'
import { benchmarkRateRequirements, deriveBenchmarkRates, calculateBenchmarkFromParameters } from '../src/modules/engine/benchmark-rates.js'
import { calculateBenchmarkLeg } from '../src/modules/engine/benchmark-leg.js'

// Catalog values are test data only; never emitted as researched benchmark values.
function fixture(country: 'MX' | 'US' = 'MX') {
  const needed = new Set(Object.values(benchmarkRateRequirements(country)).flat())
  return { country, serviceDate: '2026-09-29', baseRevision: 'SYNTHETIC-ONLY',
    parameters: PARAMETER_DEFINITIONS.filter(p => needed.has(p.key)).map(p => ({
      key: p.key, value: p.defaultValue, unit: p.unit, evidenceIds: ['test'], derivation: 'Test fixture only',
    })),
    evidence: [{ id: 'test', url: 'https://example.org/synthetic', locator: 'Fixture', country,
      equipment: 'TRACTOR_DRY_VAN_SINGLE', observedAt: '2026-09-01', validFrom: '2026-09-01', validUntil: '2026-09-30', limitations: 'Not evidence' }],
  }
}
const set = (input: ReturnType<typeof fixture>, section: string, field: string, value: number) => {
  input.parameters.find(p => p.key === parameterKey(section, field))!.value = value
}

describe('canonical benchmark rates', () => {
  it.each(['MX', 'US'] as const)('derives %s rates and composes with the leg adapter', country => {
    const input = fixture(country)
    const result = deriveBenchmarkRates(input)
    expect(result.status).toBe('DERIVED_UNVERIFIED')
    expect(result.calibrated).toBe(false)
    const tripValue = (value: number, unit: string) => ({ value, unit, evidenceIds: ['test'], derivation: 'Fixture' })
    const leg = calculateBenchmarkLeg({ model: 'FCM_CARRIER_BENCHMARK_LEG_V1', country,
      baseRevision: input.baseRevision, serviceDate: input.serviceDate, equipment: 'TRACTOR_DRY_VAN_SINGLE',
      service: 'ONE_WAY', fixedCostScope: 'DOMESTIC_CARRIER_FLEET', rates: result.rates, evidence: input.evidence,
      trip: { loadedKm: tripValue(100, 'km'), emptyKm: tripValue(20, 'km'), cycleDays: tripValue(1, 'days'), tollsUsd: tripValue(0, 'USD') } })
    expect(leg.status).toBe('BENCHMARK_ESTIMATE')
    expect(leg.purchaseCostUsd).toBeNull()
  })
  it('converts MX diesel and per-mile pay explicitly', () => {
    const input = fixture(); set(input, 'FUEL', 'Diesel MX', 30); set(input, 'FINANCE', 'Tipo de Cambio', 20)
    set(input, 'LABOR', 'Tarifa Operador MX', 1.60934)
    expect(deriveBenchmarkRates(input).rates).toMatchObject({ dieselUsdPerLiter: { value: 1.5 }, driverUsdPerKm: { value: 1 } })
  })
  it('uses the matching tire position PU and isolates tires from maintenance', () => {
    const input = fixture()
    for (const p of ['Direccion', 'Traccion', 'Recapeadas', 'Remolque']) set(input, 'COST_TIRES', `Qty ${p}`, 0)
    set(input, 'COST_TIRES', 'Qty Traccion', 8); set(input, 'COST_TIRES', 'PU Traccion', 500); set(input, 'COST_TIRES', 'Life KM Traccion', 100000)
    const before = deriveBenchmarkRates(input)
    expect(before.rates?.tiresUsdPerKm?.value).toBe(0.04)
    set(input, 'COST_TIRES', 'PU Traccion', 1000)
    const after = deriveBenchmarkRates(input)
    expect(after.rates?.tiresUsdPerKm?.value).toBe(0.08)
    expect(after.rates?.maintenanceUsdPerKm).toEqual(before.rates?.maintenanceUsdPerKm)
  })
  it('reports every omitted dependency instead of using engine defaults', () => {
    const input = fixture(); input.parameters = []
    const result = deriveBenchmarkRates(input)
    expect(result.rates).toBeNull()
    expect(result.issues.length).toBe(new Set(Object.values(result.requirements).flat()).size)
  })
  it.each(['unit', 'country', 'expired', 'duplicate', 'missing-source'] as const)('blocks %s evidence', mode => {
    const input = fixture()
    if (mode === 'unit') input.parameters[0].unit = 'wrong'
    if (mode === 'country') input.evidence[0].country = 'US'
    if (mode === 'expired') input.evidence[0].validUntil = '2026-09-28'
    if (mode === 'duplicate') input.parameters.push({ ...input.parameters[0] })
    if (mode === 'missing-source') input.evidence = []
    expect(deriveBenchmarkRates(input).rates).toBeNull()
  })
  it('blocks zero denominator and excessive residual without producing rates', () => {
    const input = fixture(); set(input, 'COST_CAPITAL', 'Periodo Depreciacion', 0)
    expect(deriveBenchmarkRates(input).rates).toBeNull()
    set(input, 'COST_CAPITAL', 'Periodo Depreciacion', 60); set(input, 'COST_CAPITAL', 'PU Rescue Tracto', 1e8)
    expect(deriveBenchmarkRates(input).issues).toContainEqual({ field: 'COST_CAPITAL', code: 'RESIDUAL_EXCEEDS_ASSET' })
  })
  it('preserves canonical lineage in the composed result and blocks missing trip data', () => {
    const input = fixture()
    const datum = (value: number, unit: string) => ({ value, unit, evidenceIds: ['test'], derivation: 'Fixture' })
    const trip = { loadedKm: datum(100, 'km'), emptyKm: datum(20, 'km'), cycleDays: datum(1, 'days'), tollsUsd: datum(0, 'USD') }
    const result = calculateBenchmarkFromParameters(input, trip)
    expect(result.status).toBe('BENCHMARK_ESTIMATE')
    expect(result.parameterLineage.lineage).toEqual(input)
    expect(result.leg?.lineage.trip).toEqual(trip)
    expect(calculateBenchmarkFromParameters(input, { ...trip, tollsUsd: null }).status).toBe('INCOMPLETE')
    input.parameters = []
    expect(calculateBenchmarkFromParameters(input, trip).leg).toBeNull()
  })
})
