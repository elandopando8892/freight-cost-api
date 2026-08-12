import { describe, expect, it } from 'vitest'
import { buildQuoteCalculationSnapshot } from '../src/modules/quotes/quote-snapshot.js'
import { calculate } from '../src/modules/engine/engine.calculator.js'
import { approvedScenarioDraftValues, reviewDecisionBlocker, scenarioReviewChanges, scenarioReviewEvidence, SCENARIO_REVIEW_POLICY } from '../src/modules/scenario-reviews/scenario-reviews.service.js'
import { scenarioReviewPublishBlocker } from '../src/modules/cost-bases/cost-bases.service.js'

describe('scenario review packets', () => {
  it('stores a plain evidence snapshot with the source checksum and no execution instruction', () => {
    const evidence = scenarioReviewEvidence({
      sourceChecksum: 'snapshot-checksum',
      scenario: {
        changes: [{ key: 'FUEL__Diesel MX', value: 31, label: 'Diesel MX', unit: 'MXN/L' }],
        baseline: { requiredTariffUsd: 2000 },
        proposed: { requiredTariffUsd: 2150 },
        delta: { requiredTariffUsd: { absolute: 150, percent: 7.5 } },
      },
    })

    expect(evidence).toMatchObject({ policy: SCENARIO_REVIEW_POLICY, sourceChecksum: 'snapshot-checksum' })
    expect(evidence).not.toHaveProperty('action')
    expect(evidence).not.toHaveProperty('executor')
    expect(scenarioReviewChanges([{ key: 'FUEL__Diesel MX', value: 31 }])).toEqual([{ key: 'FUEL__Diesel MX', value: 31 }])
  })

  it('requires a different human reviewer and an under-review packet', () => {
    expect(reviewDecisionBlocker({ status: 'DRAFT', createdById: 'user-a', reviewerId: 'user-b' })).toMatch(/under review/i)
    expect(reviewDecisionBlocker({ status: 'UNDER_REVIEW', createdById: 'user-a', reviewerId: 'user-a' })).toMatch(/cannot approve/i)
    expect(reviewDecisionBlocker({ status: 'UNDER_REVIEW', createdById: 'user-a', reviewerId: 'user-b' })).toBeNull()
  })

  it('uses the reviewed snapshot values instead of any later source-version value', () => {
    const input = { operation: 'Intra-Mex', service: 'One Way', equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' }, params: { 'FUEL__Diesel MX': 28, 'FUEL__Rendimiento Cargado': 2.8, 'FUEL__Rendimiento Vacío': 3.2 }, mexLeg: { baseKm: 300, routeExpensesMxn: 0, baseHours: 0, route: 'Straight & Danger', operation: 'Intra-Mex', service: 'One Way', equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' } } } as const
    const snapshot = buildQuoteCalculationSnapshot(input, calculate(input))
    const values = approvedScenarioDraftValues(snapshot, [{ key: 'FUEL__Diesel MX', value: 31 }])

    expect(values).toMatchObject({ 'FUEL__Diesel MX': 31, 'FUEL__Rendimiento Cargado': 2.8 })
    expect(() => approvedScenarioDraftValues(snapshot, [{ key: 'FUEL__No existe', value: 99 }])).toThrow(/not present/i)
  })

  it('requires impact acknowledgement before releasing a scenario-derived draft', () => {
    expect(scenarioReviewPublishBlocker('APPROVED', false)).toMatch(/impact acknowledgement/i)
    expect(scenarioReviewPublishBlocker('REJECTED', true)).toMatch(/no longer approved/i)
    expect(scenarioReviewPublishBlocker('APPROVED', true)).toBeNull()
    expect(scenarioReviewPublishBlocker(undefined, false)).toBeNull()
  })
})
