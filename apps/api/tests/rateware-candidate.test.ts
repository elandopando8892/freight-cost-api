import { describe, expect, it } from 'vitest'
import { assessRatewareCandidate } from '../src/modules/quotes/rateware-candidate.js'
describe('Rateware candidate preflight', () => {
  it('does not invent commercial enrichment fields', () => {
    const result = assessRatewareCandidate({ lane: { origin: 'Monterrey', destination: 'Dallas', operation: 'D2D Export', service: 'One Way', equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' } }, economics: { requiredTariffUsd: 2500, currency: { primary: 'USD' } } })
    expect(result).toMatchObject({ structurallyReady: true, humanEnrichmentRequired: ['carrier', 'effectiveDate', 'rateOwner'], mapped: { allInUsd: 2500 } })
  })
})
