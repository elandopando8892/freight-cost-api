import { isQuoteCalculationSnapshot, verifyQuoteCalculationSnapshot, type QuoteCalculationSnapshot } from './quote-snapshot.js'

type SavedExplanation = {
  snapshot?: unknown
  decision?: { disposition?: string }
  lineage?: {
    policy?: string
    costBase?: { id?: string; code?: string; name?: string; scope?: string; status?: string } | null
    set?: { id?: string; name?: string; version?: number; status?: string } | null
  }
}

export function confirmationEligibility(value: unknown) {
  const explanation = (value ?? {}) as SavedExplanation
  const reasons: string[] = []
  if (!isQuoteCalculationSnapshot(explanation.snapshot)) {
    return { eligible: false, reasons: ['This quote has no reproducible calculation snapshot.'], snapshot: null, explanation }
  }
  const replay = verifyQuoteCalculationSnapshot(explanation.snapshot)
  if (!replay.reproducible) reasons.push('The saved calculation snapshot does not replay exactly.')
  if (explanation.decision?.disposition !== 'READY') reasons.push('The commercial decision is not READY.')
  if (!explanation.lineage?.costBase || explanation.lineage.costBase.status !== 'ACTIVE') reasons.push('The saved cost base is not active.')
  if (!explanation.lineage?.set || explanation.lineage.set.status !== 'PUBLISHED') reasons.push('The saved assumption version is not published.')
  return { eligible: reasons.length === 0, reasons, snapshot: explanation.snapshot, explanation }
}

export function buildRatewareHandoff(input: {
  quote: {
    id: string; label: string | null; operation: string; service: string; freightBaselineUsd: number; requiredTariffUsd: number; requiredTariffMxn: number; fxRateUsed: number; createdAt: Date; confirmedAt: Date | null; confirmationNote: string | null
    lane: { origin: string; destination: string } | null
    productionRoute: { id: string; code: string | null; status: string } | null
    confirmedBy: { id: string; email: string } | null
  }
  snapshot: QuoteCalculationSnapshot
  explanation: SavedExplanation
}) {
  const { quote, snapshot, explanation } = input
  return {
    contractVersion: 'fcm.rateware-handoff.v1',
    mode: 'READ_ONLY',
    source: { system: 'Freight Cost Model', quoteId: quote.id, productionRouteId: quote.productionRoute?.id ?? null, snapshotChecksum: snapshot.checksum, createdAt: quote.createdAt.toISOString() },
    governance: {
      quoteStatus: 'CONFIRMED', confirmedAt: quote.confirmedAt?.toISOString() ?? null,
      confirmedBy: quote.confirmedBy ? { id: quote.confirmedBy.id, email: quote.confirmedBy.email } : null,
      confirmationNote: quote.confirmationNote,
      decision: explanation.decision?.disposition ?? null,
      lineage: explanation.lineage ?? null,
    },
    lane: {
      origin: quote.lane?.origin ?? null, destination: quote.lane?.destination ?? null,
      operation: quote.operation, service: quote.service, equipment: snapshot.input.equipment,
      productionRoute: quote.productionRoute ? { id: quote.productionRoute.id, code: quote.productionRoute.code, status: quote.productionRoute.status } : null,
    },
    economics: {
      currency: { primary: 'USD', secondary: 'MXN', fxRateUsed: quote.fxRateUsed },
      freightBaselineUsd: quote.freightBaselineUsd,
      requiredTariffUsd: quote.requiredTariffUsd,
      requiredTariffMxn: quote.requiredTariffMxn,
      costFloorUsd: snapshot.output.costFloorUsd,
      recommendedSellUsd: snapshot.output.recommendedSellUsd,
    },
  }
}
