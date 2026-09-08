import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { QuoteCalculationSnapshot } from './quote-snapshot.js'

export const CustomerProposalDraftRequestSchema = z.object({
  clientName: z.string().trim().min(2).max(200),
  contactName: z.string().trim().max(160).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  quoteType: z.string().trim().min(2).max(80).default('Spot'),
  goodsValue: z.string().trim().max(120).optional().nullable(),
  validUntil: z.coerce.date(),
  notes: z.string().trim().max(4000).optional().nullable(),
}).strict()

export type CustomerProposalDraftRequest = z.infer<typeof CustomerProposalDraftRequestSchema>

type Eligibility = {
  eligible: boolean
  reasons: string[]
  snapshot: QuoteCalculationSnapshot | null
}

type SourceQuote = {
  id: string
  status: 'DRAFT' | 'CONFIRMED' | 'ARCHIVED'
  confirmedAt: Date | null
  lane: { origin: string | null; destination: string | null } | null
}

export type CustomerProposalDraftPreview = {
  contractVersion: 'fcm.customer-proposal-draft.v1'
  mode: 'PREVIEW_ONLY'
  source: {
    quoteId: string
    quoteStatus: 'CONFIRMED'
    confirmedAt: string
    snapshotChecksum: string
  }
  draft: {
    clientName: string
    contactName: string | null
    contactEmail: string | null
    quoteType: string
    goodsValue: string | null
    validUntil: string
    notes: string | null
    lines: Array<{
      position: number
      origin: string
      destination: string
      equipment: string
      config: string
      operation: string
      service: string
      tariff: number
      currency: 'USD'
      borderCrossing: null
      distance: string | null
    }>
  }
  excludedFields: readonly string[]
  idempotencyFingerprint: string
}

const EXCLUDED_FIELDS = [
  'freightBaselineUsd',
  'requiredTariffUsd',
  'requiredTariffMxn',
  'costFloorUsd',
  'minSellUsd',
  'grossMarginPct',
  'assumptionSet',
  'costBase',
  'explanation',
] as const

function proposalError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode })
}

function stableFingerprint(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function equipmentLabel(snapshot: QuoteCalculationSnapshot) {
  return [snapshot.input.equipment.truckType, snapshot.input.equipment.trailer]
    .filter(Boolean)
    .join(' · ')
}

function distanceLabel(snapshot: QuoteCalculationSnapshot) {
  if (snapshot.input.mexLeg?.baseKm != null) return `${snapshot.input.mexLeg.baseKm} km`
  if (snapshot.input.usaLeg?.loadedMiles != null) return `${snapshot.input.usaLeg.loadedMiles} mi`
  return null
}

/**
 * Builds a redacted, non-persistent preview for the future Quote Desk command.
 * Persistence is intentionally not performed until CustomerQuote has an
 * approved source/idempotency relation and an additive migration.
 */
export function buildCustomerProposalDraftPreview(input: {
  quote: SourceQuote
  request: CustomerProposalDraftRequest
  eligibility: Eligibility
  idempotencyKey: string
  now?: Date
}): CustomerProposalDraftPreview {
  const { quote, request, eligibility } = input
  const now = input.now ?? new Date()
  if (quote.status !== 'CONFIRMED') {
    throw proposalError('Only a confirmed quote can prepare a customer proposal draft.', 409)
  }
  if (!eligibility.eligible || !eligibility.snapshot) {
    throw proposalError(
      `Quote is not eligible for a customer proposal: ${eligibility.reasons.join(' ') || 'missing reproducible evidence.'}`,
      409,
    )
  }
  if (!quote.confirmedAt) {
    throw proposalError('The quote has no human confirmation timestamp.', 409)
  }
  if (request.validUntil.getTime() <= now.getTime()) {
    throw proposalError('Proposal validity must be in the future.', 422)
  }
  if (!quote.lane?.origin || !quote.lane.destination) {
    throw proposalError('The confirmed quote has no governed origin and destination.', 409)
  }
  if (!/^[-A-Za-z0-9._~]{16,128}$/.test(input.idempotencyKey)) {
    throw proposalError('A valid Idempotency-Key is required for the proposal preview.', 422)
  }

  const snapshot = eligibility.snapshot
  const draft = {
    clientName: request.clientName,
    contactName: request.contactName ?? null,
    contactEmail: request.contactEmail ?? null,
    quoteType: request.quoteType,
    goodsValue: request.goodsValue ?? null,
    validUntil: request.validUntil.toISOString(),
    notes: request.notes ?? null,
    lines: [{
      position: 0 as const,
      origin: quote.lane.origin,
      destination: quote.lane.destination,
      equipment: equipmentLabel(snapshot),
      config: snapshot.input.equipment.config,
      operation: snapshot.input.operation,
      service: snapshot.input.service,
      tariff: snapshot.output.recommendedSellUsd,
      currency: 'USD' as const,
      borderCrossing: null,
      distance: distanceLabel(snapshot),
    }],
  }

  return {
    contractVersion: 'fcm.customer-proposal-draft.v1',
    mode: 'PREVIEW_ONLY',
    source: {
      quoteId: quote.id,
      quoteStatus: 'CONFIRMED',
      confirmedAt: quote.confirmedAt.toISOString(),
      snapshotChecksum: snapshot.checksum,
    },
    draft,
    excludedFields: EXCLUDED_FIELDS,
    idempotencyFingerprint: stableFingerprint({
      sourceQuoteId: quote.id,
      snapshotChecksum: snapshot.checksum,
      idempotencyKey: input.idempotencyKey,
      draft,
    }),
  }
}
