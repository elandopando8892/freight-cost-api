import { describe, expect, it } from 'vitest'
import { buildQuoteExplanation } from '../src/modules/quotes/quote-explanation.js'
import { buildQuoteCalculationSnapshot } from '../src/modules/quotes/quote-snapshot.js'
import type { EngineOutput } from '../src/modules/engine/engine.types.js'

const commercial: EngineOutput['commercial'] = {
  costFloorUsd: 1000, minSellUsd: 1136, targetSellUsd: 1220, premiumSellUsd: 1333,
  recommendedSellUsd: 1200, grossProfitUsd: 200, grossMarginPct: 0.1667,
  gpPerLoadedMileUsd: 1, gpPerDayUsd: 100, marketReferenceUsd: 0,
  marketVsCostSpreadUsd: 0, marketVsCostSpreadPct: 0, noGoFlag: false, reviewFlag: false, notes: [],
}

const result: EngineOutput = {
  policy: 'OPERATIONAL_V3', operation: 'D2D Export', mexLeg: null, usaLeg: null,
  freightBaselineUsd: 1200, commercial, requiredTariffUsd: 1200, fxRateUsed: 17.5,
}
const input = { operation: 'D2D Export', service: 'One Way', equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' } }
const snapshot = buildQuoteCalculationSnapshot({ ...input, params: {} }, result)

describe('quote explanation', () => {
  it('captures immutable input, governed lineage, calculation and a ready decision', () => {
    const explanation = buildQuoteExplanation(
      input,
      result,
      {
        costBase: { id: 'base-1', code: 'XB', name: 'Cross border', scope: 'CROSS_BORDER', status: 'ACTIVE' },
        set: { id: 'set-1', name: 'Cross border', version: 3, status: 'PUBLISHED' }, policy: 'OPERATIONAL_V3',
      }, snapshot,
    )

    expect(explanation.format).toBe('fcm.quote-explanation.v1')
    expect(explanation.lineage.set?.version).toBe(3)
    expect(explanation.calculation.freightBaselineUsd).toBe(1200)
    expect(explanation.decision).toEqual({ disposition: 'READY', alerts: [] })
  })

  it('requires review when the saved calculation is not governed by a published version', () => {
    const explanation = buildQuoteExplanation(
      input,
      result,
      {
        costBase: { id: 'base-1', code: 'XB', name: 'Cross border', scope: 'CROSS_BORDER', status: 'ACTIVE' },
        set: { id: 'set-1', name: 'Cross border', version: 4, status: 'DRAFT' }, policy: 'OPERATIONAL_V3',
      }, snapshot,
    )

    expect(explanation.decision.disposition).toBe('REVIEW')
    expect(explanation.decision.alerts).toContainEqual(expect.objectContaining({ code: 'VERSION_NOT_PUBLISHED' }))
  })

  it('marks a published version on a draft base as preview-only', () => {
    const explanation = buildQuoteExplanation(
      input,
      result,
      {
        costBase: { id: 'base-1', code: 'XB', name: 'Cross border', scope: 'CROSS_BORDER', status: 'DRAFT' },
        set: { id: 'set-1', name: 'Cross border', version: 4, status: 'PUBLISHED' }, policy: 'OPERATIONAL_V3',
      }, snapshot,
    )

    expect(explanation.decision.disposition).toBe('REVIEW')
    expect(explanation.decision.alerts).toContainEqual(expect.objectContaining({ code: 'BASE_NOT_ACTIVE' }))
  })
})
