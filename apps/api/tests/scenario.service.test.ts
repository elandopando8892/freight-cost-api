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
})
