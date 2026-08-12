/**
 * Freight Cost Model V3.0 — orchestrator.
 *
 * Runs the MEX and/or USA leg cost engines by operation type and sums the
 * leg "flats" the way the QuoteDesk consumes the ReferenceKeys:
 *   leg flat = loadedMiles × (RPM + FSC)
 *   Freight Baseline = MROUND(Σ leg flats, 100)
 *
 * Validated end-to-end: Monterrey→Dallas Flatbed D2D Export
 *   MX flat 1200 + USA flat 1391 → Freight Baseline 2600 ✓
 */
import { getParam, type ParamMap } from '../assumptions/assumptions.service.js'
import { calculateMexLeg } from './engine.mex.js'
import { calculateUsaLeg } from './engine.usa.js'
import { calculateDrayageLeg } from './engine.drayage.js'
import { calculateCommercial } from './engine.commercial.js'
import type { EngineInput, EngineOutput, MexLegOutput, UsaLegOutput, DrayageLegInput } from './engine.types.js'

const mround = (x: number, m: number) => Math.round(x / m) * m

// Adapt a resolver-produced USA leg (origin→dest miles) into a drayage cycle
// input. The cycle's deadhead legs + billable time come from params (defaults),
// so an unenriched resolver lane still gets correct drayage pricing.
function usaToDrayage(u: import('./engine.types.js').UsaLegInput): DrayageLegInput {
  return {
    loadedMiles: u.loadedMiles,
    transitDaysRaw: u.transitDaysRaw,
    driverExpenses: u.driverExpenses,
    dieselUsdGal: u.dieselUsdGal,
    fscUsdMile: u.fscUsdMile,
    outState: u.outState,
    marketRpm: u.marketRpm,
    operation: u.operation,
    service: u.service,
    equipment: u.equipment,
    origin: u.origin,
    dest: u.dest,
    // Container return unspecified → engine assumes return to port (conservative).
  }
}

function legsFor(operation: string): { mex: boolean; usa: boolean } {
  switch (operation) {
    case 'D2D Export':
    case 'D2D Import':
      return { mex: true, usa: true }
    case 'Drayage':
      return { mex: false, usa: true }
    default: // Intra-Mex, MX Northbound, MX Southbound, Local
      return { mex: true, usa: false }
  }
}

export function calculate(input: EngineInput): EngineOutput {
  const params: ParamMap = Object.assign({}, input.params, input.overrides ?? {})
  const policy = input.policy ?? 'OPERATIONAL_V3'
  const { operation } = input
  const fxRate = input.fxRate && input.fxRate > 0 ? input.fxRate : 17.5
  const need = legsFor(operation)

  let mexLeg: MexLegOutput | null = null
  if (need.mex && input.mexLeg) mexLeg = calculateMexLeg(input.mexLeg, params, policy)

  // Drayage runs its own cycle engine (fills the USA-side slot). It accepts an
  // explicit drayageLeg, or adapts a resolver-produced usaLeg into one.
  let usaLeg: UsaLegOutput | null = null
  if (operation === 'Drayage') {
    const dray = input.drayageLeg ?? (input.usaLeg ? usaToDrayage(input.usaLeg) : null)
    if (dray) usaLeg = calculateDrayageLeg(dray, params)
  } else if (need.usa && input.usaLeg) {
    usaLeg = calculateUsaLeg(input.usaLeg, params)
  }

  // Leg flats (what the quote sums). MX flat = required tariff; USA flat = miles×(RPM+FSC).
  const mexFlat = mexLeg ? mexLeg.requiredTariffUsd : 0
  const usaFlat = usaLeg ? usaLeg.flatUsd : 0
  const freightBaselineUsd = mround(mexFlat + usaFlat, 100)

  // ── Commercial / decision layer ───────────────────────────────────────
  const productionCostUsd =
    (mexLeg ? mexLeg.productionCostUsd : 0) + (usaLeg ? usaLeg.cvuInclFuelUsd + usaLeg.cfuUsd : 0)
  const riskAdjUsd = (mexLeg ? mexLeg.totalRiskAdjUsd : 0) + (usaLeg ? usaLeg.totalRiskAdjUsd : 0)
  const loadedMiles = (mexLeg ? mexLeg.loadedMiles : 0) + (usaLeg ? usaLeg.loadedMiles : 0)
  const cycleDays = (mexLeg ? mexLeg.cycleDays : 0) + (usaLeg ? usaLeg.cycleDays : 0)
  const mixMx = getParam(params, 'FUEL', 'Fuel Purchase Mix MX', 0.3)
  const mixUs = getParam(params, 'FUEL', 'Fuel Purchase Mix US', 0.7)
  // Market reference: USA leg = DAT all-in; MX leg has no spot market → cost-plus proxy.
  const marketReferenceUsd =
    (usaLeg && usaLeg.marketRateUsd > 0 ? usaLeg.marketRateUsd : usaLeg ? usaFlat : 0) +
    (mexLeg ? mexLeg.requiredTariffUsd : 0)
  const commercial = calculateCommercial({
    productionCostUsd,
    riskAdjUsd,
    recommendedSellUsd: freightBaselineUsd,
    marketReferenceUsd,
    loadedMiles,
    cycleDays,
    fuelMixOk: Math.abs(mixMx + mixUs - 1) < 1e-6,
    params,
  })

  return {
    policy,
    operation,
    mexLeg,
    usaLeg,
    freightBaselineUsd,
    commercial,
    requiredTariffUsd: freightBaselineUsd,
    fxRateUsed: fxRate,
  }
}
