import type { EngineOutput } from './engine.types.js'
import type { OperationalSegment } from '../cost-bases/operational-segments.js'

export type ObservedTripCosts = {
  sourceReference: string
  asOf: string
  allocationMethod: string
  mexProductionCostUsd?: number
  usaProductionCostUsd?: number
}

type LegComparison = {
  modeledUsd: number
  observedUsd: number
  varianceUsd: number
  variancePct: number
}

function compare(modeledUsd: number, observedUsd: number): LegComparison {
  return {
    modeledUsd,
    observedUsd,
    varianceUsd: modeledUsd - observedUsd,
    variancePct: (modeledUsd - observedUsd) / observedUsd * 100,
  }
}

/** One observed movement is a diagnostic comparison, never model approval. */
export function compareObservedTripCosts(
  segment: OperationalSegment,
  result: EngineOutput,
  observed: ObservedTripCosts,
) {
  const mexModeled = result.mexLeg?.productionCostUsd
  const usaModeled = result.usaLeg
    ? result.usaLeg.cvuInclFuelUsd + result.usaLeg.cfuUsd
    : undefined
  if ((mexModeled === undefined) !== (observed.mexProductionCostUsd === undefined)
    || (usaModeled === undefined) !== (observed.usaProductionCostUsd === undefined)) {
    throw Object.assign(new Error('Provide observed production cost for each modeled leg, and no other leg.'), { statusCode: 422 })
  }
  const mex = mexModeled === undefined ? null : compare(mexModeled, observed.mexProductionCostUsd!)
  const usa = usaModeled === undefined ? null : compare(usaModeled, observed.usaProductionCostUsd!)
  const modeledTotal = (mexModeled ?? 0) + (usaModeled ?? 0)
  const observedTotal = (observed.mexProductionCostUsd ?? 0) + (observed.usaProductionCostUsd ?? 0)
  return {
    status: 'COMPARISON_ONLY' as const,
    sourceStatus: 'USER_SUPPLIED_UNVERIFIED' as const,
    segment,
    sourceReference: observed.sourceReference,
    asOf: observed.asOf,
    allocationMethod: observed.allocationMethod,
    legs: { mex, usa },
    total: compare(modeledTotal, observedTotal),
    limitations: [
      'One trip does not establish economic fidelity or authorize publication.',
      'Observed amounts and allocation method were supplied by the caller, not independently verified.',
      'This compares production cost only; it does not validate carrier buy rates, risk, margins, or sell price.',
    ],
  }
}
