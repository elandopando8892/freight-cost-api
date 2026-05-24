/**
 * MEX leg — exact reproduction of d2d_mexRateProduction (columns L..BC).
 *
 *   CBFA = B63 × MIN(fracViaje, 1)                         (V)
 *   CBVR = svcFactor × (B64 − tarifaUS + tarifaMX) × km    (X)
 *   UT   = B65                                             (Y)
 *   CBTT = CBFA + CBVR + UT                                (Z)
 *   EACT = CBTT × (configFactor − 1)                       (AB)
 *   EAEO = km × tarifaMX × (driverFactor − 1)             (AD)
 *   EAFR = CBVR × (laneFactor − 1)                         (AF)
 *   CAGR = driverExpenses / 20                             (AG)
 *   CAGV = km < 251 ? 0 : CAGR + gastoAdicional            (AH)
 *   ITA  = CAGV + EAFR + EAEO + EACT + CAGR                (AI)
 *   CIT  = CBTT + ITA                                      (AJ)
 *   MARGEN = CBTT × kmTierMargin                           (AS)
 *   TBT  = CIT + MARGEN                                    (AT)
 *   EMTR = CBTT × (trailerFactor − 1)                      (AV)
 *   EMTO = CBTT × (operationFactor − 1)                    (AX)
 *   ICEM = EMTR + EMTO                                     (AY)
 *   ICC  = litros × dieselUsdL                             (AZ)
 *   PVT  = TBT + ICEM + ICC                                (BA)
 *   CVT  = CIT − EACT − UT − CBFA + ICC                    (BB)
 *
 * Validated vs production rows:
 *   Mexico DF→NLaredo 1120km DryVan D2DExport: PVT 1803.04 ✓
 *   MTY→NLaredo        225km Flatbed D2DExport: PVT  595.02 ✓
 */
import { getParam, type ParamMap } from '../assumptions/assumptions.service.js'
import { round4 } from '../../utils/currency.js'
import {
  performanceFactor, trailerFactor, operationFactor, serviceFactor,
  configFactor, driverFactor, laneFactor, kmTierMargin,
} from './engine.factors.js'
import type { EquipmentSpec, MarketSnapshot, MexLaneData, MexLegOutput } from './engine.types.js'

const LOAD_HOURS = 2
const UNLOAD_HOURS = 2
const CAGV_MIN_KM = 251       // routes shorter than this carry no travel per-diem
const CAGR_DIVISOR = 20

export function calculateMexLeg(
  lane: MexLaneData,
  equipment: EquipmentSpec,
  operationType: string,
  serviceType: string,
  params: ParamMap,
  market: MarketSnapshot,
): MexLegOutput {
  // Base rates from d2dCostCards totals
  const cbfaRate = getParam(params, 'FINANCE', 'CBFA Daily Rate', 73.5648)        // B63
  const cvuPerKm = getParam(params, 'GENERAL_BASE', 'CVU Base per KM', 0.9176159091) // B64
  const ut       = getParam(params, 'GENERAL_BASE', 'UT Per Trip', 80)            // B65
  const tarifaUS = getParam(params, 'LABOR', 'Tarifa Operador US', 0.4)           // D9
  const tarifaMX = getParam(params, 'LABOR', 'Tarifa Operador MX', 0.15)          // D10
  const gastoAdic = getParam(params, 'GENERAL_BASE', 'Gasto Adicional sobre Ruta', 0) // D2
  const dieselUsdL = market.dieselUsUsdL > 0
    ? market.dieselUsUsdL
    : getParam(params, 'FUEL', 'Diesel US Border', 0.95)                          // B13

  const km = lane.km

  // Fuel: km / performance(truckType)
  const perf = performanceFactor(equipment.truckType, params)
  const litros = round4(km / perf)

  // Timing (12-hour working-day model)
  const fracTransit = round4(lane.transitHrs / 12)
  const fracWait = round4((LOAD_HOURS + UNLOAD_HOURS) / 12)
  const fracViaje = round4(fracTransit + fracWait)

  // CBFA — fixed asset cost, capped at one productive day
  const cbfa = round4(fracViaje < 1 ? fracViaje * cbfaRate : cbfaRate)

  // CBVR — variable route cost
  const svc = serviceFactor(serviceType, params)
  const cbvr = round4(svc * (cvuPerKm - tarifaUS + tarifaMX) * km)

  const cbtt = round4(cbfa + cbvr + ut)

  // Added-effect terms that belong to ITA
  const cfgF = configFactor(equipment.config, params)
  const eact = round4(cbtt * (cfgF - 1))

  const drvF = driverFactor(equipment.driverType, params)
  const eaeo = round4(km * tarifaMX * (drvF - 1))

  const laneF = laneFactor(lane.routeType, params)
  const eafr = round4(cbvr * (laneF - 1))

  const cagr = round4(lane.driverExpenses / CAGR_DIVISOR)
  const cagv = km < CAGV_MIN_KM ? 0 : round4(cagr + gastoAdic)
  const ita = round4(cagv + eafr + eaeo + eact + cagr)

  const cit = round4(cbtt + ita)

  // Margin by km tier
  const margenPct = kmTierMargin(km, params)
  const margen = round4(cbtt * margenPct)
  const tbt = round4(cit + margen)

  // Market effects — ICEM is only trailer + operation
  const trlF = trailerFactor(equipment.trailerType, params)
  const emtr = round4(cbtt * (trlF - 1))
  const opF = operationFactor(operationType, params)
  const emto = round4(cbtt * (opF - 1))
  const icem = round4(emtr + emto)

  const icc = round4(litros * dieselUsdL)

  const pvt = round4(tbt + icem + icc)
  const cvt = round4(cit - eact - ut - cbfa + icc)

  return {
    km, litros, fracTransit, fracWait, fracViaje,
    cbfa, serviceFactor: svc, cbvr, ut, cbtt,
    configFactor: cfgF, eact, driverFactor: drvF, eaeo, laneFactor: laneF, eafr,
    cagr, cagv, ita,
    cit, margenPct, margen, tbt,
    trailerFactor: trlF, emtr, operationFactor: opF, emto, icem, icc,
    pvt, cvt,
  }
}
