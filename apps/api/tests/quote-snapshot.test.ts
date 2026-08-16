import { describe, expect, it } from 'vitest'
import { calculate } from '../src/modules/engine/engine.calculator.js'
import { buildQuoteCalculationSnapshot, calculateForQuoteSnapshot, snapshotOutputDifferences, verifyQuoteCalculationSnapshot } from '../src/modules/quotes/quote-snapshot.js'
import { defaultCostBaseProfile } from '../src/modules/cost-bases/cost-base-profile.js'

const engineInput = {
  policy: 'OPERATIONAL_V3' as const,
  operation: 'Intra-Mex',
  service: 'One Way',
  equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' },
  params: {},
  fxRate: 17.5,
  mexLeg: { baseKm: 250, routeExpensesMxn: 100, baseHours: 4, route: 'Mostly Straight', operation: 'Intra-Mex', service: 'One Way', equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' } },
}

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reverseObjectKeys(item)]))
  }
  return value
}

describe('quote calculation snapshot', () => {
  it('replays without reading current bases or reference data', () => {
    const result = calculate(engineInput)
    const snapshot = buildQuoteCalculationSnapshot(engineInput, result)

    expect(verifyQuoteCalculationSnapshot(snapshot)).toMatchObject({ reproducible: true, checksumMatches: true, outputMatches: true, differences: [] })
    expect(snapshot.engineVersion).toBe('fcm-v3.1-profiled')
  })

  it('dispatches historical fcm-v3 operational snapshots through frozen legacy semantics', () => {
    const legacyInput = { ...engineInput, compatibilityMode: 'LEGACY_FCM_V3' as const }
    const legacyResult = calculate(legacyInput)
    const legacySnapshot = buildQuoteCalculationSnapshot(legacyInput, legacyResult)
    legacySnapshot.engineVersion = 'fcm-v3'

    const verification = verifyQuoteCalculationSnapshot(legacySnapshot)
    // The test intentionally changes the version after checksum construction;
    // outputMatches proves replay dispatch, while checksumMatches remains false.
    expect(verification).toMatchObject({ checksumMatches: false, outputMatches: true })
    expect(calculate(engineInput).commercial.costFloorUsd).not.toBe(legacyResult.commercial.costFloorUsd)
  })

  it('derives compatibility from engineVersion when replay inputs contain alternate overrides', () => {
    const currentSnapshot = buildQuoteCalculationSnapshot(engineInput, calculate(engineInput))
    const alternateInput = {
      ...currentSnapshot.input,
      overrides: { 'FUEL__Diesel MX': 60 },
      compatibilityMode: 'LEGACY_FCM_V3' as const,
    }
    const expectedCurrent = calculate({ ...currentSnapshot.input, overrides: alternateInput.overrides })
    const currentResult = calculateForQuoteSnapshot(currentSnapshot, alternateInput)
    expect(currentResult.commercial.costFloorUsd).toBe(expectedCurrent.commercial.costFloorUsd)

    const legacySnapshot = { ...currentSnapshot, engineVersion: 'fcm-v3' as const }
    const expectedLegacy = calculate({ ...currentSnapshot.input, overrides: alternateInput.overrides, compatibilityMode: 'LEGACY_FCM_V3' })
    const legacyResult = calculateForQuoteSnapshot(legacySnapshot, { ...alternateInput, compatibilityMode: undefined })
    expect(legacyResult.commercial.costFloorUsd).toBe(expectedLegacy.commercial.costFloorUsd)
    expect(legacyResult.commercial.costFloorUsd).not.toBe(currentResult.commercial.costFloorUsd)
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

  it('keeps its checksum when JSONB reorders nested object keys', () => {
    const snapshot = buildQuoteCalculationSnapshot(engineInput, calculate(engineInput))
    const reordered = reverseObjectKeys(snapshot) as typeof snapshot
    expect(verifyQuoteCalculationSnapshot(reordered)).toMatchObject({
      reproducible: true,
      checksumMatches: true,
      outputMatches: true,
    })
  })

  it('preserves a versioned applicability profile and covers it with the checksum', () => {
    const applicabilityProfile = defaultCostBaseProfile('INTRA_MEX', 'OPERATIONAL_V3')
    const input = { ...engineInput, applicabilityProfile }
    const snapshot = buildQuoteCalculationSnapshot(input, calculate(input))

    expect(snapshot.input.applicabilityProfile).toEqual(applicabilityProfile)
    expect(verifyQuoteCalculationSnapshot(snapshot)).toMatchObject({ reproducible: true, checksumMatches: true })

    const changed = structuredClone(snapshot)
    changed.input.applicabilityProfile!.services = ['One Way', 'Expedited']
    expect(verifyQuoteCalculationSnapshot(changed)).toMatchObject({ reproducible: false, checksumMatches: false, outputMatches: true })
  })
})
