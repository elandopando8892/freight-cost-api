/**
 * Freight Cost Engine — matches MARKSMAN D2D.01 spreadsheet formula exactly.
 *
 * Formula verified against d2d_mexRateProduction sheet:
 *
 *   CBFA = CBFA_rate × MIN(fracViaje, 1.0)
 *   CBVR = CBVR_rate × km × serviceFactor
 *   CBTT = CBFA + CBVR + UT
 *   ITA  = CAGR + CAGV         (route + travel expenses)
 *   CIT  = CBTT + ITA          (production cost)
 *   TBT  = CIT + CBTT × margenPct
 *   ICEM = CBTT × (trailerFactor-1) + CBTT × (opFactor-1) + ...
 *   ICC  = (km / rendimiento) × dieselUsdL
 *   PVT  = TBT + ICEM + ICC    (selling price / required tariff)
 *
 * Validated against production data (MTY→NL 225km Dry Van D2D Export):
 *   CBFA=49.04, CBVR=150.21, CBTT=279.26, CIT=286.40
 *   TBT=398.10, ICEM=55.85, ICC=71.25, PVT=525.20 ✓
 */

import { getParam, type ParamMap } from '../assumptions/assumptions.service.js'
import { usdToMxn, round2, round4 } from '../../utils/currency.js'
import { kmToMiles } from '../../utils/units.js'
import type { EngineInput, EngineOutput, MarketSnapshot } from './engine.types.js'

export function calculate(input: EngineInput): EngineOutput {
  const { lane, equipment, market } = input
  const params: ParamMap = Object.assign({}, input.params, input.overrides ?? {})
  const fxRate = market.fxRate

  // ── 1. Route distance ────────────────────────────────────────────────
  const totalKms = lane.baseKm ?? 0
  const loadedMiles = round4(kmToMiles(totalKms))

  // ── 2. Fuel consumption ──────────────────────────────────────────────
  const rendimiento = getParam(params, 'GENERAL_BASE', 'Rendimiento', 3)  // km/L
  const litros = round4(totalKms / rendimiento)

  // ── 3. Timing (12-hour working day model) ────────────────────────────
  const avgSpeedKmH = getParam(params, 'UTILIZATION', 'Avg Speed KmH', 55)
  const loadTime   = getParam(params, 'UTILIZATION', 'Load Time', 2)    // hours
  const unloadTime = getParam(params, 'UTILIZATION', 'Unload Time', 2)  // hours

  // Transit hours: from lane if provided, otherwise estimate from km / speed
  const transitHrs = (lane as any).transitHrs
    ? round4((lane as any).transitHrs)
    : round4(totalKms / avgSpeedKmH)

  const fracTransit = round4(transitHrs / 12)
  const fracWait    = round4((loadTime + unloadTime) / 12)
  const fracViaje   = round4(fracTransit + fracWait)

  // ── 4. CBFA — Fixed Asset Base Cost ─────────────────────────────────
  // Total fixed cost per productive truck-day (insurance + payroll + capex + compliance)
  // Capped at 1 day for multi-day trips (cost-card amortization model).
  const cbfaRate = getParam(params, 'FINANCE', 'CBFA Daily Rate', 73.5648)
  const cbfa = round4(cbfaRate * Math.min(fracViaje, 1.0))

  // ── 5. CBVR — Variable Route Base Cost ──────────────────────────────
  // Driver pay + maintenance + tires + border compliance per km
  const cbvrRate     = getParam(params, 'GENERAL_BASE', 'CBVR Rate per KM', 0.6676)
  const serviceFactor = getServiceFactor(lane.serviceType, params)
  const cbvr = round4(cbvrRate * totalKms * serviceFactor)

  // ── 6. UT — Per-trip overhead ────────────────────────────────────────
  const ut = getParam(params, 'GENERAL_BASE', 'UT Per Trip', 80)

  // ── 7. CBTT — Base Transport Cost ───────────────────────────────────
  const cbtt = round4(cbfa + cbvr + ut)

  // ── 8. Trip expense additions (ITA) ─────────────────────────────────
  // CAGR: route/toll expenses, proportional to driving time
  const cagrRate = getParam(params, 'UTILIZATION', 'CAGR Daily Rate', 21.4286)
  const cagr = round4(cagrRate * fracTransit)

  // CAGV: driver per diem — charged only when transit > 4 hours
  const cagv = transitHrs > 4 ? cagr : 0

  const ita = round4(cagr + cagv)

  // ── 9. CIT — Production Cost ─────────────────────────────────────────
  const cit = round4(cbtt + ita)

  // ── 10. Margin by km tier ────────────────────────────────────────────
  const margenPct     = getKmTierMargin(totalKms, params)
  const margenContrib = round4(cbtt * margenPct)
  const tbt           = round4(cit + margenContrib)

  // ── 11. Market effects (ICEM) ────────────────────────────────────────
  const trailerFactor   = getTrailerFactor(equipment.trailerType, params)
  const operationFactor = getOperationFactor(lane.operationType, params)
  const configFactor    = getConfigFactor(equipment.config, params)
  const driverFactor    = getDriverFactor(equipment.driverType ?? '', params)

  const emtr = round4(cbtt * (trailerFactor - 1))
  const emto = round4(cbtt * (operationFactor - 1))
  const eact = round4(cbtt * (configFactor - 1))
  const eaeo = round4(cbtt * (driverFactor - 1))
  const icem = round4(emtr + emto + eact + eaeo)

  // ── 12. Fuel cost (ICC) ──────────────────────────────────────────────
  const dieselUsdL = getDieselPrice(lane.operationType, params, market, fxRate)
  const icc = round4(litros * dieselUsdL)

  // ── 13. PVT — Required Tariff ────────────────────────────────────────
  const pvt = round4(tbt + icem + icc)

  // ── 14. Derived metrics ───────────────────────────────────────────────
  const ubt = round4(pvt - cit)
  const mct = pvt > 0 ? round4(ubt / pvt) : 0
  const requiredTariffMxn  = round2(usdToMxn(pvt, fxRate))
  const tariffPerLoadedMile = loadedMiles > 0 ? round4(pvt / loadedMiles) : 0

  return {
    totalKms,
    loadedMiles,
    litros,
    transitHrs,
    fracTransit,
    fracWait,
    fracViaje,

    cbfa,
    cbvr,
    ut,
    cbtt,

    cagr,
    cagv,
    ita,

    cit,

    margenPct,
    margenContrib,
    tbt,

    trailerFactor,
    emtr,
    operationFactor,
    emto,
    configFactor,
    eact,
    driverFactor,
    eaeo,
    icem,

    icc,

    pvt,
    ubt,
    mct,

    requiredTariffUsd: pvt,
    requiredTariffMxn,
    productionCostUsd: cit,
    tariffPerLoadedMile,
    fxRateUsed: fxRate,
    serviceFactor,
  }
}

// ── Margin tiers by km ────────────────────────────────────────────────────
function getKmTierMargin(km: number, params: ParamMap): number {
  if (km <= getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 1 Max', 501))
    return getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 1 Margin', 0.40)
  if (km <= getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 2 Max', 1001))
    return getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 2 Margin', 0.35)
  if (km <= getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 3 Max', 1501))
    return getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 3 Margin', 0.30)
  if (km <= getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 4 Max', 2001))
    return getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 4 Margin', 0.25)
  return getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 5 Margin', 0.20)
}

// ── Factor lookups (from d2dFactors sheet) ────────────────────────────────

function getTrailerFactor(trailerType: string, params: ParamMap): number {
  switch (trailerType) {
    case 'Flatbed':    return getParam(params, 'FACTORS', 'Trailer Factor Flatbed', 1.25)
    case 'Reefer':     return getParam(params, 'FACTORS', 'Trailer Factor Reefer', 2.0)
    case 'Hazmat':     return getParam(params, 'FACTORS', 'Trailer Factor Hazmat', 1.5)
    case 'Chassis':    return getParam(params, 'FACTORS', 'Trailer Factor Chassis', 1.0)
    case 'Power Only': return getParam(params, 'FACTORS', 'Trailer Factor Power Only', 0.8)
    case 'Overdim':    return getParam(params, 'FACTORS', 'Trailer Factor Overdim', 5.0)
    default:           return getParam(params, 'FACTORS', 'Trailer Factor Dry Van', 1.0)
  }
}

function getOperationFactor(operationType: string, params: ParamMap): number {
  switch (operationType) {
    case 'D2D Export':    return getParam(params, 'FACTORS', 'Op Factor D2D Export', 1.2)
    case 'D2D Import':    return getParam(params, 'FACTORS', 'Op Factor D2D Import', 0.7)
    case 'MX Northbound': return getParam(params, 'FACTORS', 'Op Factor MX Northbound', 1.0)
    case 'MX Southbound': return getParam(params, 'FACTORS', 'Op Factor MX Southbound', 0.5)
    case 'Local':         return getParam(params, 'FACTORS', 'Op Factor Local', 0.25)
    case 'Drayage':       return getParam(params, 'FACTORS', 'Op Factor Drayage', 1.0)
    default:              return getParam(params, 'FACTORS', 'Op Factor Intra-Mex', 1.0)
  }
}

function getServiceFactor(serviceType: string, params: ParamMap): number {
  switch (serviceType) {
    case 'Backhaul':  return getParam(params, 'FACTORS', 'Svc Factor Backhaul', 0.4)
    case 'Roundtrip': return getParam(params, 'FACTORS', 'Svc Factor Roundtrip', 1.5)
    case 'Expedited': return getParam(params, 'FACTORS', 'Svc Factor Expedited', 2.0)
    default:          return getParam(params, 'FACTORS', 'Svc Factor One Way', 1.0)
  }
}

function getConfigFactor(config: string, params: ParamMap): number {
  if (config === 'Tandem') return getParam(params, 'FACTORS', 'Config Factor Tandem', 1.3)
  return getParam(params, 'FACTORS', 'Config Factor Single', 1.0)
}

function getDriverFactor(driverType: string, params: ParamMap): number {
  switch (driverType) {
    case 'Licencia E': return getParam(params, 'FACTORS', 'Driver Factor Licencia E', 1.25)
    default:           return getParam(params, 'FACTORS', 'Driver Factor B1', 1.0)
  }
}

// ── Diesel price selection ────────────────────────────────────────────────
function getDieselPrice(
  operationType: string,
  params: ParamMap,
  market: MarketSnapshot,
  fxRate: number,
): number {
  // D2D / cross-border routes → US border diesel (USD/L)
  const isD2D = ['D2D Export', 'D2D Import', 'Drayage'].includes(operationType)
  if (isD2D) {
    return market.dieselUsUsdL > 0
      ? market.dieselUsUsdL
      : getParam(params, 'FUEL', 'Diesel US Border', 0.95)
  }
  // Domestic MX routes → blended MX+US diesel
  const fuelMixMx   = getParam(params, 'FUEL', 'Fuel Purchase Mix MX', 0.5)
  const fuelMixUs   = getParam(params, 'FUEL', 'Fuel Purchase Mix US', 0.5)
  const dieselMxUsd = fxRate > 0
    ? market.dieselMxMxnL / fxRate
    : getParam(params, 'FUEL', 'Diesel MX USD/L', 1.2)
  const dieselUsUsd = market.dieselUsUsdL > 0
    ? market.dieselUsUsdL
    : getParam(params, 'FUEL', 'Diesel US Border', 0.95)
  return round4(dieselMxUsd * fuelMixMx + dieselUsUsd * fuelMixUs)
}

