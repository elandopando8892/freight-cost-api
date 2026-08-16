import { describe, expect, it } from 'vitest'
import { buildQuoteCalculationSnapshot } from '../src/modules/quotes/quote-snapshot.js'
import { calculate } from '../src/modules/engine/engine.calculator.js'
import { buildScenario, scenarioFieldsFor, unknownScenarioKeys } from '../src/modules/scenarios/scenario.service.js'

describe('scenario lab', () => {
  it('compares a proposed parameter without mutating the quote snapshot', () => {
    const input = { operation: 'Intra-Mex', service: 'One Way', equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' }, params: { 'FUEL__Diesel MX': 28, 'FUEL__Rendimiento Cargado': 2.8, 'FUEL__Rendimiento Vacío': 3.2 }, mexLeg: { baseKm: 300, routeExpensesMxn: 0, baseHours: 0, route: 'Straight & Danger', operation: 'Intra-Mex', service: 'One Way', equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' } } } as const
    const snapshot = buildQuoteCalculationSnapshot(input, calculate(input))
    const scenario = buildScenario(snapshot, [{ key: 'FUEL__Diesel MX', value: 60 }])

    expect(snapshot.input.params['FUEL__Diesel MX']).toBe(28)
    expect(scenario.policy).toBe('READ_ONLY_SCENARIO_NO_PERSISTENCE')
    expect(scenario.proposed.costFloorUsd).toBeGreaterThan(scenario.baseline.costFloorUsd)
    expect(scenario.delta.costFloorUsd.absolute).toBeGreaterThan(0)
    expect(scenarioFieldsFor(snapshot)).toContainEqual(expect.objectContaining({ key: 'FUEL__Diesel MX', label: 'Diesel MX', currentValue: 28 }))
    expect(unknownScenarioKeys(snapshot, [{ key: 'FUEL__Diesel MX', value: 30 }, { key: 'FUEL__Not present', value: 1 }])).toEqual(['FUEL__Not present'])
  })

  it('computes the scenario delta with the historical snapshot engine semantics', () => {
    const input = { policy: 'OPERATIONAL_V3' as const, operation: 'Intra-Mex', service: 'One Way', equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' }, params: { 'FUEL__Diesel MX': 28, 'FUEL__Rendimiento Cargado': 2.8, 'FUEL__Rendimiento Vacío': 3.2 }, mexLeg: { baseKm: 300, routeExpensesMxn: 0, baseHours: 0, route: 'Straight & Danger', operation: 'Intra-Mex', service: 'One Way', equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' } } } as const
    const currentSnapshot = buildQuoteCalculationSnapshot(input, calculate(input))
    const legacySnapshot = { ...currentSnapshot, engineVersion: 'fcm-v3' as const }
    const changes = [{ key: 'FUEL__Diesel MX', value: 60 }]
    const scenario = buildScenario(legacySnapshot, changes)

    const legacyBaseline = calculate({ ...legacySnapshot.input, compatibilityMode: 'LEGACY_FCM_V3' })
    const legacyProposed = calculate({ ...legacySnapshot.input, overrides: { 'FUEL__Diesel MX': 60 }, compatibilityMode: 'LEGACY_FCM_V3' })
    const currentBaseline = calculate(legacySnapshot.input)
    const currentProposed = calculate({ ...legacySnapshot.input, overrides: { 'FUEL__Diesel MX': 60 } })
    const expectedLegacyDelta = legacyProposed.commercial.costFloorUsd - legacyBaseline.commercial.costFloorUsd
    const currentDelta = currentProposed.commercial.costFloorUsd - currentBaseline.commercial.costFloorUsd

    expect(scenario.baseline.costFloorUsd).toBe(legacyBaseline.commercial.costFloorUsd)
    expect(scenario.proposed.costFloorUsd).toBe(legacyProposed.commercial.costFloorUsd)
    expect(scenario.delta.costFloorUsd.absolute).toBeCloseTo(expectedLegacyDelta, 9)
    expect(Math.abs(expectedLegacyDelta - currentDelta)).toBeGreaterThan(1e-6)
  })
})
