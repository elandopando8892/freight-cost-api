import { describe, expect, it } from 'vitest'
import { buildRatewareRateBookContract } from '../src/modules/ratebooks/rateware-ratebook-contract.js'

const source = {
  id: 'rb_1', code: 'US-2026', name: 'US published', currency: 'USD', status: 'PUBLISHED', effectiveFrom: new Date('2026-08-01T00:00:00.000Z'), effectiveUntil: null, publishedAt: new Date('2026-08-01T12:00:00.000Z'), publicationNote: 'Approved by pricing.',
  costBase: { id: 'base_1', code: 'INTRA-US', name: 'Intra US', scope: 'INTRA_US', status: 'ACTIVE' }, set: { id: 'set_1', name: 'Diesel baseline', version: 4, status: 'PUBLISHED' },
  entries: [{ sourceQuoteId: 'quote_1', sourceQuoteVersion: 3, sourceProductionRouteId: null, origin: 'Laredo, TX', destination: 'Dallas, TX', operation: 'FTL', service: 'Dry van', equipment: '53 dry van', config: null, publishedTariff: 1450, currency: 'USD', sourceTariffUsd: 1450, sourceTariffMxn: 25000, fxRateUsed: 17.24 }],
}

describe('Rateware RateBook contract', () => {
  it('packages a published RateBook with immutable lineage and source evidence', () => {
    const result = buildRatewareRateBookContract(source, new Date('2026-08-11T00:00:00.000Z'))
    expect(result).toMatchObject({ contractVersion: 'fcm.rateware-ratebook.v1', mode: 'READ_ONLY', source: { rateBookId: 'rb_1', exportedAt: '2026-08-11T00:00:00.000Z' }, lineage: { costBase: { code: 'INTRA-US' }, assumptionSet: { version: 4 } } })
    expect(result.entries[0]).toMatchObject({ sourceQuoteId: 'quote_1', sourceProductionRouteId: null, fxRateUsed: 17.24 })
  })

  it('does not package a non-published RateBook', () => {
    expect(() => buildRatewareRateBookContract({ ...source, status: 'DRAFT' })).toThrow('Only published RateBooks')
  })
})
