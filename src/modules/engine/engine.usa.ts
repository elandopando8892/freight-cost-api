/**
 * USA leg — exact reproduction of d2d_usaRateProduction (columns O..AG).
 *
 *   Haulage      = B64 × miles                              (P)
 *   Markup       = mileage tier                             (Q)
 *   LinehaulSale = Haulage × (1 + Markup)                   (R)
 *   OFSC         = origin-state fuel surcharge $/mile       (S)
 *   Fuel         = OFSC × miles                             (T)
 *   ODH Rule     = D2D Export ? 0 : deadhead(outbound cond) (U)
 *   ODH Fee      = ODH Rule × (tarifaUS + OFSC)             (V)
 *   IFSC         = dest-state fuel surcharge $/mile         (W)
 *   IDH Rule     = D2D Import ? 0 : deadhead(outbound cond) (X)
 *   IDH Fee      = IDH Rule × (tarifaUS + IFSC)             (Y)
 *   TDH Fee      = ODH Fee + IDH Fee                        (Z)
 *   Add'l Fees   = RouteExpenses + TDH Fee                  (AC)
 *   FreightSale  = LinehaulSale + Fuel + Add'l Fees         (AE)
 *   FreightCost  = Haulage + Fuel + Add'l Fees              (AF)
 *   MarketRate   = marketRpm × miles + Fuel                 (AG)
 *
 * Validated vs production row St Johns→Laredo 3681mi D2D Import:
 *   Haulage 3377.74, LinehaulSale 3884.41, FreightSale 4564.41 ✓
 */
import { getParam, type ParamMap } from '../assumptions/assumptions.service.js'
import { round4 } from '../../utils/currency.js'
import { mileageMarkup, deadheadMiles } from './engine.factors.js'
import type { EquipmentSpec, UsaLaneData, UsaLegOutput } from './engine.types.js'

export function calculateUsaLeg(
  lane: UsaLaneData,
  equipment: EquipmentSpec,
  operationType: string,
  params: ParamMap,
): UsaLegOutput {
  const cvuPerMile = getParam(params, 'GENERAL_BASE', 'CVU Base per KM', 0.9176159091) // B64 (per mile here)
  const tarifaUS = getParam(params, 'LABOR', 'Tarifa Operador US', 0.4)          // B8

  const miles = lane.miles

  const haulage = round4(cvuPerMile * miles)
  const markup = mileageMarkup(miles, params)
  const linehaulSale = round4(haulage * (1 + markup))

  const ofsc = lane.fscOriginUsdMile
  const fuel = round4(ofsc * miles)

  // Deadhead: ODH skipped on export, IDH skipped on import; both keyed off outbound condition
  const odhRule = operationType === 'D2D Export' ? 0 : deadheadMiles(equipment.trailerType, lane.outboundCondition)
  const odhFee = round4(odhRule * (tarifaUS + ofsc))

  const ifsc = lane.fscDestUsdMile
  const idhRule = operationType === 'D2D Import' ? 0 : deadheadMiles(equipment.trailerType, lane.outboundCondition)
  const idhFee = round4(idhRule * (tarifaUS + ifsc))

  const tdhFee = round4(odhFee + idhFee)
  const routeExpenses = lane.routeExpenses
  const addlFees = round4(routeExpenses + tdhFee)

  const freightSale = round4(linehaulSale + fuel + addlFees)
  const freightCost = round4(haulage + fuel + addlFees)
  const marketRate = round4(lane.marketRpm * miles + fuel)

  return {
    miles, haulage, markup, linehaulSale,
    ofsc, fuel, odhRule, odhFee,
    ifsc, idhRule, idhFee, tdhFee,
    routeExpenses, addlFees,
    freightSale, freightCost, marketRate,
  }
}
