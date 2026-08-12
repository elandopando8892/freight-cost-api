import { describe, expect, it } from 'vitest'
import { calculate } from '../src/modules/engine/engine.calculator.js'
import { buildQuoteCalculationSnapshot } from '../src/modules/quotes/quote-snapshot.js'
import { buildRatewareHandoff, confirmationEligibility } from '../src/modules/quotes/quote-governance.js'

const engineInput = {
  policy: 'OPERATIONAL_V3' as const, operation: 'Intra-Mex', service: 'One Way',
  equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' }, params: {}, fxRate: 17.5,
  mexLeg: { baseKm: 250, routeExpensesMxn: 0, baseHours: 4, route: 'Mostly Straight', operation: 'Intra-Mex', service: 'One Way', equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' } },
}
const result = calculate(engineInput)
const snapshot = buildQuoteCalculationSnapshot(engineInput, result)
const explanation = {
  snapshot,
  decision: { disposition: 'READY' },
  lineage: { policy: 'OPERATIONAL_V3', costBase: { id: 'base-1', code: 'MX', name: 'Mexico', scope: 'INTRA_MEX', status: 'ACTIVE' }, set: { id: 'set-1', name: 'Mexico', version: 1, status: 'PUBLISHED' } },
}

describe('quote confirmation governance', () => {
  it('allows only a reproducible, published, ready calculation to be confirmed', () => {
    expect(confirmationEligibility(explanation)).toMatchObject({ eligible: true, reasons: [] })
    expect(confirmationEligibility({ ...explanation, decision: { disposition: 'REVIEW' } })).toMatchObject({ eligible: false })
    expect(confirmationEligibility({ ...explanation, lineage: { ...explanation.lineage, set: { ...explanation.lineage.set, status: 'DRAFT' } } })).toMatchObject({ eligible: false })
  })

  it('builds a read-only Rateware handoff from confirmed evidence', () => {
    const payload = buildRatewareHandoff({
      quote: {
        id: 'quote-1', label: 'MX test', operation: 'Intra-Mex', service: 'One Way', freightBaselineUsd: result.freightBaselineUsd,
        requiredTariffUsd: result.requiredTariffUsd, requiredTariffMxn: result.requiredTariffUsd * 17.5, fxRateUsed: 17.5,
        createdAt: new Date('2026-08-11T00:00:00Z'), confirmedAt: new Date('2026-08-11T01:00:00Z'), confirmationNote: 'Reviewed by pricing.',
        lane: { origin: 'Monterrey, NL', destination: 'Saltillo, COA' }, productionRoute: null, confirmedBy: { id: 'user-1', email: 'pricing@example.com' },
      }, snapshot, explanation,
    })
    expect(payload).toMatchObject({ contractVersion: 'fcm.rateware-handoff.v1', mode: 'READ_ONLY', governance: { quoteStatus: 'CONFIRMED' }, source: { snapshotChecksum: snapshot.checksum } })
  })
})
