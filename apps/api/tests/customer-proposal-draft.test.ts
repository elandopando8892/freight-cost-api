import { describe, expect, it } from 'vitest'
import type { QuoteCalculationSnapshot } from '../src/modules/quotes/quote-snapshot.js'
import {
  buildCustomerProposalDraftPreview,
  type CustomerProposalDraftRequest,
} from '../src/modules/quotes/customer-proposal-draft.js'

const snapshot = {
  format: 'fcm.calculation-snapshot.v1',
  engineVersion: 'fcm-v3.1-profiled',
  input: {
    policy: 'WORKBOOK_V3',
    operation: 'D2D Export',
    service: 'One Way',
    equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'Interstate' },
    params: {},
    mexLeg: { baseKm: 250 },
  },
  output: {
    freightBaselineUsd: 1486,
    requiredTariffUsd: 1600,
    fxRateUsed: 17.5,
    mexTariffUsd: 1600,
    usaFlatUsd: null,
    costFloorUsd: 1680,
    recommendedSellUsd: 1756,
  },
  checksum: 'snapshot-checksum',
} as unknown as QuoteCalculationSnapshot

const request: CustomerProposalDraftRequest = {
  clientName: 'Northstar Distribution',
  contactName: 'María López',
  contactEmail: 'maria@northstar.example',
  quoteType: 'Spot',
  goodsValue: null,
  validUntil: new Date('2026-09-30T00:00:00.000Z'),
  notes: 'Condiciones capturadas por el operador',
}

const quote = {
  id: 'quote-1',
  status: 'CONFIRMED' as const,
  confirmedAt: new Date('2026-09-07T12:00:00.000Z'),
  lane: { origin: 'Laredo, TX', destination: 'Monterrey, NL' },
}

const eligibility = { eligible: true, reasons: [], snapshot }

describe('customer proposal draft preview', () => {
  it('derives a commercial line without leaking internal economics', () => {
    const result = buildCustomerProposalDraftPreview({
      quote,
      request,
      eligibility,
      idempotencyKey: 'preview-key-20260907',
      now: new Date('2026-09-07T00:00:00.000Z'),
    })

    expect(result.mode).toBe('PREVIEW_ONLY')
    expect(result.source).toMatchObject({ quoteId: 'quote-1', snapshotChecksum: 'snapshot-checksum' })
    expect(result.draft.lines[0]).toMatchObject({
      origin: 'Laredo, TX',
      destination: 'Monterrey, NL',
      equipment: 'Truck Trailer · Dry Van',
      tariff: 1756,
      currency: 'USD',
      distance: '250 km',
    })
    expect(result.draft).not.toHaveProperty('costFloorUsd')
    expect(result.draft).not.toHaveProperty('requiredTariffUsd')
    expect(result.draft).not.toHaveProperty('explanation')
    expect(result.excludedFields).toContain('grossMarginPct')
  })

  it('blocks a quote that is not confirmed or not eligible', () => {
    expect(() => buildCustomerProposalDraftPreview({
      quote: { ...quote, status: 'DRAFT' },
      request,
      eligibility,
      idempotencyKey: 'preview-key-20260907',
    })).toThrow(/confirmed quote/i)

    expect(() => buildCustomerProposalDraftPreview({
      quote,
      request,
      eligibility: { eligible: false, reasons: ['The decision is not READY.'], snapshot },
      idempotencyKey: 'preview-key-20260907',
    })).toThrow(/not eligible/i)
  })

  it('requires a future validity date and a valid idempotency key', () => {
    expect(() => buildCustomerProposalDraftPreview({
      quote,
      request: { ...request, validUntil: new Date('2026-09-06T00:00:00.000Z') },
      eligibility,
      idempotencyKey: 'preview-key-20260907',
      now: new Date('2026-09-07T00:00:00.000Z'),
    })).toThrow(/future/i)

    expect(() => buildCustomerProposalDraftPreview({
      quote,
      request,
      eligibility,
      idempotencyKey: 'short',
    })).toThrow(/Idempotency-Key/i)
  })

  it('keeps a stable fingerprint for retries and changes it for a new key', () => {
    const first = buildCustomerProposalDraftPreview({ quote, request, eligibility, idempotencyKey: 'preview-key-20260907' })
    const retry = buildCustomerProposalDraftPreview({ quote, request, eligibility, idempotencyKey: 'preview-key-20260907' })
    const next = buildCustomerProposalDraftPreview({ quote, request, eligibility, idempotencyKey: 'preview-key-20260908' })

    expect(retry.idempotencyFingerprint).toBe(first.idempotencyFingerprint)
    expect(next.idempotencyFingerprint).not.toBe(first.idempotencyFingerprint)
  })
})

