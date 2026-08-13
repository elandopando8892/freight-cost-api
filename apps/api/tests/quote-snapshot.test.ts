import { describe, expect, it } from 'vitest'
import { calculate } from '../src/modules/engine/engine.calculator.js'
import { buildQuoteCalculationSnapshot, snapshotOutputDifferences, verifyQuoteCalculationSnapshot } from '../src/modules/quotes/quote-snapshot.js'

const engineInput = {
  policy: 'OPERATIONAL_V3' as const,
  operation: 'Intra-Mex',
  service: 'One Way',
  equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' },
  params: {},
  fxRate: 17.5,
  mexLeg: { baseKm: 250, routeExpensesMxn: 100, baseHours: 4, route: 'Mostly Straight', operation: 'Intra-Mex', service: 'One Way', equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' } },
}

describe('quote calculation snapshot', () => {
  it('replays without reading current bases or reference data', () => {
    const result = calculate(engineInput)
    const snapshot = buildQuoteCalculationSnapshot(engineInput, result)

    expect(verifyQuoteCalculationSnapshot(snapshot)).toMatchObject({ reproducible: true, checksumMatches: true, outputMatches: true, differences: [] })
  })

  it('detects an altered historical input or output', () => {
    const result = calculate(engineInput)
    const snapshot = buildQuoteCalculationSnapshot(engineInput, result)
    const changed = structuredClone(snapshot)
    changed.output.freightBaselineUsd += 100

    expect(verifyQuoteCalculationSnapshot(changed)).toMatchObject({ reproducible: false, checksumMatches: false, outputMatches: false })
  })

  it('ignores only sub-nanodollar serialization noise and rejects a cent change', () => {
    const snapshot = buildQuoteCalculationSnapshot(engineInput, calculate(engineInput))
    const tinyDrift = structuredClone(snapshot.output)
    tinyDrift.costFloorUsd += 5e-10
    expect(snapshotOutputDifferences(snapshot.output, tinyDrift)).toEqual([])

    const materialDrift = structuredClone(snapshot.output)
    materialDrift.costFloorUsd += 0.01
    expect(snapshotOutputDifferences(snapshot.output, materialDrift)).toMatchObject([{ field: 'costFloorUsd' }])
  })
})
