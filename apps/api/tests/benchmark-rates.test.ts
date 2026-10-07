import { describe, expect, it } from 'vitest'
import { PARAMETER_DEFINITIONS, parameterKey } from '../src/data/parameter-catalog.js'
import { benchmarkRateRequirements, deriveBenchmarkRates, calculateBenchmarkFromParameters } from '../src/modules/engine/benchmark-rates.js'
import { calculateBenchmarkLeg } from '../src/modules/engine/benchmark-leg.js'

// Catalog values are test data only; never emitted as researched benchmark values.
function fixture(country: 'MX' | 'US' = 'MX') {
  const needed = new Set(Object.values(benchmarkRateRequirements(country)).flat())
  return { country, assetCostScope: 'TRACTOR_AND_TRAILER', serviceDate: '2026-09-29', baseRevision: 'SYNTHETIC-ONLY',
    parameters: PARAMETER_DEFINITIONS.filter(p => needed.has(p.key)).map(p => ({
      key: p.key, value: p.field === 'Qty Recapeadas' ? 0 : p.defaultValue, unit: p.unit,
      evidenceIds: ['test'], derivation: 'Test fixture only; installed positions, no additive retread row',
    })),
    evidence: [{ id: 'test', url: 'https://example.org/synthetic', locator: 'Fixture', country,
      equipment: 'TRACTOR_DRY_VAN_SINGLE', observedAt: '2026-09-01', validFrom: '2026-09-01', validUntil: '2026-09-30', limitations: 'Not evidence' }],
  }
}
const set = (input: ReturnType<typeof fixture>, section: string, field: string, value: number) => {
  input.parameters.find(p => p.key === parameterKey(section, field))!.value = value
}

describe('canonical benchmark rates', () => {
  it.each(['MX', 'US'] as const)('does not require excluded cross-border overhead for %s domestic carrier legs', country => {
    const needed = new Set(Object.values(benchmarkRateRequirements(country)).flat())
    const crossborderKeys = PARAMETER_DEFINITIONS.filter(p => p.section === 'COST_CROSSBORDER').map(p => p.key)
    expect(crossborderKeys.some(key => needed.has(key))).toBe(false)
    expect(deriveBenchmarkRates(fixture(country)).status).toBe('DERIVED_UNVERIFIED')
  })
  it.each(['MX', 'US'] as const)('excludes trailer capital and tires from %s tractor-only dependencies', country => {
    const input = fixture(country)
    const complete = deriveBenchmarkRates(input)
    input.assetCostScope = 'TRACTOR_ONLY'
    const needed = new Set(Object.values(benchmarkRateRequirements(country, true)).flat())
    const trailerKeys = PARAMETER_DEFINITIONS.filter(p => p.field.includes('Remolque')).map(p => p.key)
    expect(trailerKeys.some(key => needed.has(key))).toBe(false)
    input.parameters = input.parameters.filter(p => needed.has(p.key))
    const tractor = deriveBenchmarkRates(input)
    expect(tractor.status).toBe('DERIVED_UNVERIFIED')
    expect(tractor.rates!.monthlyFixedUsd!.value).toBeLessThan(complete.rates!.monthlyFixedUsd!.value)
    expect(tractor.rates!.tiresUsdPerKm!.value).toBeLessThan(complete.rates!.tiresUsdPerKm!.value)
    expect(tractor.rates!.maintenanceUsdPerKm).toEqual(complete.rates!.maintenanceUsdPerKm)
  })
  it('preserves legacy full-asset scope when scope is omitted', () => {
    const { assetCostScope, ...input } = fixture()
    expect(deriveBenchmarkRates(input).lineage.assetCostScope).toBe(assetCostScope)
  })
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
  it.each(['MX', 'US'] as const)('blocks ambiguous retreads before producing %s rates or a trip estimate', country => {
    const input = fixture(country)
    set(input, 'COST_TIRES', 'Qty Recapeadas', 8)
    const result = deriveBenchmarkRates(input)
    expect(result.status).toBe('INCOMPLETE')
    expect(result.rates).toBeNull()
    expect(result.issues).toContainEqual({ field: 'COST_TIRES__Qty Recapeadas', code: 'RETREAD_POSITION_OR_LIFECYCLE_REQUIRED' })
    expect(result.tireMethod.legacyWorkbookFormulaChanged).toBe(false)
    expect(calculateBenchmarkFromParameters(input, {}).leg).toBeNull()
    expect(input.parameters.find(p => p.key === parameterKey('COST_TIRES', 'Qty Recapeadas'))!.value).toBe(8)
    // Even when no new drive tires are declared, a standalone retread row does
    // not identify a physical position or a sequential casing lifecycle.
    set(input, 'COST_TIRES', 'Qty Traccion', 0)
    expect(deriveBenchmarkRates(input).rates).toBeNull()
  })
  it.each(['TRACTOR_ONLY', 'TRACTOR_AND_TRAILER'])('does not hide ambiguous retreads under %s ownership', scope => {
    const input = fixture(); input.assetCostScope = scope
    const needed = new Set(Object.values(benchmarkRateRequirements('MX', scope === 'TRACTOR_ONLY')).flat())
    input.parameters = input.parameters.filter(p => needed.has(p.key))
    set(input, 'COST_TIRES', 'Qty Recapeadas', 1)
    expect(deriveBenchmarkRates(input).issues).toContainEqual({ field: 'COST_TIRES__Qty Recapeadas', code: 'RETREAD_POSITION_OR_LIFECYCLE_REQUIRED' })
  })
  it.each(['Direccion', 'Traccion', 'Remolque'])('rejects fractional %s physical tire quantities rather than adopting aggregate equivalents', position => {
    const input = fixture(); set(input, 'COST_TIRES', `Qty ${position}`, 1.5)
    expect(deriveBenchmarkRates(input).issues).toContainEqual({ field: `COST_TIRES__Qty ${position}`, code: 'NON_INTEGER_PHYSICAL_TIRE_QUANTITY' })
    expect(deriveBenchmarkRates(input).rates).toBeNull()
  })
  it('derives each installed position once with its own price/life and conserves all twelve dependencies', () => {
    const input = fixture()
    for (const [position, qty, price, life] of [
      ['Direccion', 2, 100, 1000], ['Traccion', 8, 200, 2000], ['Remolque', 8, 400, 4000],
    ] as const) {
      set(input, 'COST_TIRES', `Qty ${position}`, qty)
      set(input, 'COST_TIRES', `PU ${position}`, price)
      set(input, 'COST_TIRES', `Life KM ${position}`, life)
    }
    set(input, 'COST_TIRES', 'PU Recapeadas', 1e8)
    const full = deriveBenchmarkRates(input)
    expect(full.rates!.tiresUsdPerKm!.value).toBeCloseTo(1.8, 12)
    expect(full.requirements.tiresUsdPerKm).toHaveLength(12)
    expect(full.tireMethod.publicAggregateIsAlternativeNotAdditionalExpense).toBe(true)
    input.assetCostScope = 'TRACTOR_ONLY'
    input.parameters = input.parameters.filter(p => new Set(Object.values(benchmarkRateRequirements('MX', true)).flat()).has(p.key))
    const tractor = deriveBenchmarkRates(input)
    expect(tractor.rates!.tiresUsdPerKm!.value).toBeCloseTo(1, 12)
    expect(tractor.rates!.maintenanceUsdPerKm).toEqual(full.rates!.maintenanceUsdPerKm)
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
