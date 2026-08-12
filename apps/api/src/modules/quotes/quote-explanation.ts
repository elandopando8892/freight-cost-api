import type { EngineOutput, EquipmentSpec } from '../engine/engine.types.js'
import type { QuoteCalculationSnapshot } from './quote-snapshot.js'

type QuoteExplanationInput = {
  operation: string
  service: string
  equipment: EquipmentSpec
  fxRate?: number
  overrides?: Record<string, number>
  mex?: { baseKm: number; routeExpensesMxn: number; baseHours: number; route: string } | undefined
  usa?: { loadedMiles: number; transitDaysRaw: number; driverExpenses: number; outState: string; dieselUsdGal: number; fscUsdMile: number; originCondition: string; destCondition: string } | undefined
}

type Lineage = {
  costBase: { id: string; code: string; name: string; scope: string; status: string } | null
  set: { id: string; name: string; version: number; status: string } | null
  policy: string
}

export type QuoteExplanation = {
  format: 'fcm.quote-explanation.v1'
  input: {
    operation: string
    service: string
    equipment: EquipmentSpec
    fxRateRequested: number | null
    overrideCount: number
    legs: { mex: QuoteExplanationInput['mex'] | null; usa: QuoteExplanationInput['usa'] | null }
  }
  lineage: Lineage
  calculation: {
    freightBaselineUsd: number
    fxRateUsed: number
    mex: { tariffUsd: number; productionCostUsd: number; riskAdjUsd: number; referenceKey: string } | null
    usa: { tariffUsd: number; productionCostUsd: number; riskAdjUsd: number; referenceKey: string; marketRateUsd: number } | null
    commercial: EngineOutput['commercial']
  }
  decision: {
    disposition: 'READY' | 'REVIEW' | 'NO_GO'
    alerts: { code: string; message: string }[]
  }
  snapshot: QuoteCalculationSnapshot
}

export function buildQuoteExplanation(input: QuoteExplanationInput, result: EngineOutput, lineage: Lineage, snapshot: QuoteCalculationSnapshot): QuoteExplanation {
  const alerts: QuoteExplanation['decision']['alerts'] = []
  if (!lineage.costBase) alerts.push({ code: 'LEGACY_LINEAGE', message: 'No cost base was selected; this quote uses legacy assumption lineage.' })
  if (lineage.set?.status && lineage.set.status !== 'PUBLISHED') {
    alerts.push({ code: 'VERSION_NOT_PUBLISHED', message: `Assumption version v${lineage.set.version} is ${lineage.set.status.toLowerCase()}; it is not production-governed.` })
  }
  if (result.commercial.noGoFlag) alerts.push({ code: 'NO_GO', message: 'Recommended sell is below the risk-adjusted cost floor.' })
  if (result.commercial.reviewFlag) alerts.push({ code: 'COMMERCIAL_REVIEW', message: 'Commercial review is required before using this quote.' })
  for (const note of result.commercial.notes) alerts.push({ code: 'COMMERCIAL_NOTE', message: note })

  return {
    format: 'fcm.quote-explanation.v1',
    input: {
      operation: input.operation,
      service: input.service,
      equipment: input.equipment,
      fxRateRequested: input.fxRate ?? null,
      overrideCount: Object.keys(input.overrides ?? {}).length,
      legs: { mex: input.mex ?? null, usa: input.usa ?? null },
    },
    lineage,
    calculation: {
      freightBaselineUsd: result.freightBaselineUsd,
      fxRateUsed: result.fxRateUsed,
      mex: result.mexLeg ? {
        tariffUsd: result.mexLeg.requiredTariffUsd,
        productionCostUsd: result.mexLeg.productionCostUsd,
        riskAdjUsd: result.mexLeg.totalRiskAdjUsd,
        referenceKey: result.mexLeg.referenceKey,
      } : null,
      usa: result.usaLeg ? {
        tariffUsd: result.usaLeg.flatUsd,
        productionCostUsd: result.usaLeg.cvuInclFuelUsd + result.usaLeg.cfuUsd,
        riskAdjUsd: result.usaLeg.totalRiskAdjUsd,
        referenceKey: result.usaLeg.referenceKey,
        marketRateUsd: result.usaLeg.marketRateUsd,
      } : null,
      commercial: result.commercial,
    },
    decision: {
      disposition: result.commercial.noGoFlag ? 'NO_GO' : alerts.length > 0 ? 'REVIEW' : 'READY',
      alerts,
    },
    snapshot,
  }
}
