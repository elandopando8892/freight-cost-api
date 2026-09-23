import { describe, expect, it } from 'vitest'
import { calculate } from '../src/modules/engine/engine.calculator.js'
import { compareObservedTripCosts } from '../src/modules/engine/engine-economic-validation.js'

const equipment = { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' }
const result = calculate({
  operation: 'Local', service: 'One Way', equipment, params: {},
  mexLeg: { baseKm: 80, routeExpensesMxn: 100, operation: 'Local', service: 'One Way',
    route: 'Straight & Danger', equipment },
})

describe('observed trip cost comparison', () => {
  const observed = {
    sourceReference: 'trip-ledger-001', asOf: '2026-09-20',
    allocationMethod: 'Fuel, driver and allocated fixed fleet cost from trip ledger',
    mexProductionCostUsd: 400,
  }

  it('compares production cost without presenting one unverified trip as model approval', () => {
    const report = compareObservedTripCosts('MX_LOCAL', result, observed)
    expect(report).toMatchObject({ status: 'COMPARISON_ONLY', sourceStatus: 'USER_SUPPLIED_UNVERIFIED',
      segment: 'MX_LOCAL', legs: { usa: null }, total: { observedUsd: 400 } })
    expect(report.total.modeledUsd).toBeCloseTo(result.mexLeg!.productionCostUsd)
    expect(report.total.varianceUsd).toBeCloseTo(result.mexLeg!.productionCostUsd - 400)
    expect(report.total.variancePct).toBeCloseTo((result.mexLeg!.productionCostUsd - 400) / 400 * 100)
    expect(report.limitations).toEqual(expect.arrayContaining([expect.stringMatching(/does not validate carrier buy rates/i)]))
  })

  it('requires observed costs for exactly the legs the engine modeled', () => {
    expect(() => compareObservedTripCosts('MX_LOCAL', result, { ...observed, mexProductionCostUsd: undefined }))
      .toThrow(/each modeled leg/i)
    expect(() => compareObservedTripCosts('MX_LOCAL', result, { ...observed, usaProductionCostUsd: 200 }))
      .toThrow(/no other leg/i)
  })
})
