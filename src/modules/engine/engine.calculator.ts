/**
 * Freight Cost Engine — orchestrator.
 *
 * Reproduces the spreadsheet's `quickRate` assembly: run the MEX and/or USA
 * leg engines depending on operation type, then combine.
 *
 *   FreightPrice    = PVT_mex + FreightSale_usa
 *   CrossborderRate = FreightPrice + BorderFee
 *   COGS            = CVT_mex + FreightCost_usa + BorderFee
 *   GrossProfit     = CrossborderRate − COGS
 *   MarketRef       = PVT_mex + MarketRate_usa (DAT)
 *
 * Validated end-to-end vs quickRate:
 *   Mexico DF→Memphis D2D Export: FreightPrice 3505.52, +border = 3655.52 ✓
 *   MTY→Dallas Flatbed D2D Export: FreightPrice 1574.03, +border = 1724.03 ✓
 */
import { getParam, type ParamMap } from '../assumptions/assumptions.service.js'
import { round2, round4, usdToMxn } from '../../utils/currency.js'
import { kmToMiles } from '../../utils/units.js'
import { calculateMexLeg } from './engine.mex.js'
import { calculateUsaLeg } from './engine.usa.js'
import type {
  EngineInput, EngineOutput, MexLegOutput, UsaLegOutput,
} from './engine.types.js'

/** Which legs an operation type requires. */
function legsFor(operationType: string): { mex: boolean; usa: boolean } {
  switch (operationType) {
    case 'D2D Export':       // origin(MX) → border → dest(US)
    case 'D2D Import':       // origin(US) → border → dest(MX)
      return { mex: true, usa: true }
    case 'Drayage':          // short cross-dock haul, priced US-side
      return { mex: false, usa: true }
    case 'Intra-Mex':
    case 'MX Northbound':
    case 'MX Southbound':
    case 'Local':
      return { mex: true, usa: false }
    default:
      return { mex: true, usa: false }
  }
}

export function calculate(input: EngineInput): EngineOutput {
  const params: ParamMap = Object.assign({}, input.params, input.overrides ?? {})
  const { equipment, market, operationType, serviceType } = input
  const fxRate = market.fxRate > 0 ? market.fxRate : 1

  const need = legsFor(operationType)

  let mexLeg: MexLegOutput | null = null
  if (need.mex && input.mexLane) {
    mexLeg = calculateMexLeg(input.mexLane, equipment, operationType, serviceType, params, market)
  }

  let usaLeg: UsaLegOutput | null = null
  if (need.usa && input.usaLane) {
    usaLeg = calculateUsaLeg(input.usaLane, equipment, operationType, params)
  }

  // ── Assembly (quickRate) ──────────────────────────────────────────────
  const freightPrice = round4((mexLeg?.pvt ?? 0) + (usaLeg?.freightSale ?? 0))

  const isCrossborder = !!(mexLeg && usaLeg)
  const borderFee = input.borderCrossing && isCrossborder
    ? getParam(params, 'BORDER', 'Border Crossing Fee', 150)
    : 0

  const crossborderRate = round4(freightPrice + borderFee)
  const cogs = round4((mexLeg?.cvt ?? 0) + (usaLeg?.freightCost ?? 0) + borderFee)
  const grossProfit = round4(crossborderRate - cogs)
  const grossMargin = crossborderRate > 0 ? round4(grossProfit / crossborderRate) : 0
  const marketRefPrice = round4((mexLeg?.pvt ?? 0) + (usaLeg?.marketRate ?? 0) + borderFee)

  // Total distance in miles (MEX km → miles + USA miles)
  const mexMiles = mexLeg ? kmToMiles(mexLeg.km) : 0
  const totalMiles = round4(mexMiles + (usaLeg?.miles ?? 0))

  return {
    operationType,
    mexLeg,
    usaLeg,
    freightPrice,
    borderFee,
    crossborderRate,
    cogs,
    grossProfit,
    grossMargin,
    marketRefPrice,
    requiredTariffUsd: crossborderRate,
    requiredTariffMxn: round2(usdToMxn(crossborderRate, fxRate)),
    productionCostUsd: cogs,
    totalMiles,
    fxRateUsed: fxRate,
  }
}
