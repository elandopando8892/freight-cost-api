/**
 * MEX leg — Freight Cost Model V3.0 `mexLaneProd` + E2 production floors.
 *
 * V3.0 finding #2 fix: distance-based math alone underprices local/short-haul
 * because it doesn't recognize the cost of committing a unit/operator/cycle.
 * Three floors kick in by baseKm band (≤100 local, ≤300 short-haul):
 *   • Billable Day Floor → minimum cycleDays (drives CFU-by-time)
 *   • Empty KM Minimum   → minimum reposition (drives fuel/maint)
 *   • Min Trip Cost      → minimum production $ per salida (belt & suspenders)
 *
 * MX-RATE-PROD-2026-Q2-01 (Monterrey→Nuevo Laredo Flatbed D2D Export, 225km short-haul):
 *   emptyKm 40 (floor), cycleDays 0.5 (floor), CVU 444.81, CFU 162.98,
 *   Production 607.79, Technical Tariff 868.28 (margin, not markup — /(1−UT)),
 *   Risk Adj 451.19, Required Tariff MROUND(1319.47,100) = $1,300 ✓
 */
import { getParam, type ParamMap } from '../assumptions/assumptions.service.js'
import {
  laneFactor, operationFactor, trailerFactor, driverFactor, equipmentFactors,
} from './engine.factors.js'
import { deriveMonthlyFixedCost, deriveMaintTiresPerKm } from './engine.outputs.js'
import { buildReferenceKey, homologateMx } from './reference-key.js'
import type { MexLegInput, MexLegOutput } from './engine.types.js'

const MI_PER_KM = 1 / 1.60934
const mround = (x: number, m: number) => Math.round(x / m) * m

export function calculateMexLeg(lane: MexLegInput, params: ParamMap): MexLegOutput {
  const { equipment } = lane
  const isD2D = lane.operation === 'D2D Export' || lane.operation === 'D2D Import'
  const isRoundtrip = lane.service === 'Roundtrip'
  const isBackhaul = lane.service === 'Backhaul'
  const isTandem = equipment.config === 'Tandem'

  // Assumptions
  const deadheadBase = getParam(params, 'UTILIZATION', 'Deadhead Base', 0.15)
  const backhaulDeadheadFactor = getParam(params, 'UTILIZATION', 'Backhaul Deadhead Factor', 0.5)
  const loadTime = getParam(params, 'UTILIZATION', 'Load Time', 2)
  const unloadTime = getParam(params, 'UTILIZATION', 'Unload Time', 2)
  const rendCargado = getParam(params, 'FUEL', 'Rendimiento Cargado', 2.8)
  const rendVacio = getParam(params, 'FUEL', 'Rendimiento Vacío', 3.2)
  const dieselMx = getParam(params, 'FUEL', 'Diesel MX', 28)
  const dieselUs = getParam(params, 'FUEL', 'Diesel US Border', 1.49)
  const mixMx = getParam(params, 'FUEL', 'Fuel Purchase Mix MX', 0.3)
  const mixUs = getParam(params, 'FUEL', 'Fuel Purchase Mix US', 0.7)
  const fuelEscalation = getParam(params, 'FUEL', 'Fuel Escalation Buffer', 0.05)
  const tc = getParam(params, 'FINANCE', 'Tipo de Cambio', 17.5)
  const tarifaMx = getParam(params, 'LABOR', 'Tarifa Operador MX', 0.18)
  const gastoAdicional = getParam(params, 'GENERAL_BASE', 'Gasto Adicional sobre Ruta', 0.05)
  const maintTiresPerKm = deriveMaintTiresPerKm(params)          // derived from editable cost cards
  const borderTransactional = getParam(params, 'BORDER', 'Border Transactional Cost', 200)
  const monthlyFixedCost = deriveMonthlyFixedCost(params)        // derived from editable cost cards
  const operadores = getParam(params, 'GENERAL_BASE', 'Operadores', 52)
  const kmPerOperator = getParam(params, 'GENERAL_BASE', 'Kilómetros promedio x operador', 22000)
  const flota = getParam(params, 'GENERAL_BASE', 'Tamaño de Flota', 50)
  const operatividad = getParam(params, 'GENERAL_BASE', 'Índice de Operatividad', 0.9)
  const periodo = getParam(params, 'GENERAL_BASE', 'Periodo de Operación', 26)
  const tandemFuelPenalty = getParam(params, 'CONFIG', 'Tandem Fuel Penalty', 0.12)
  const tandemTollPremium = getParam(params, 'CONFIG', 'Tandem Toll Premium', 0.3)
  const tandemMaintFactor = getParam(params, 'CONFIG', 'Tandem Maint/Tires Factor', 1.35)
  // E5: tandem CFU is additive (real 2nd-unit monthly cost), not a flat multiplier.
  const tandemSecondUnitMonthly = getParam(params, 'CONFIG', 'Tandem Second Unit Monthly USD', 1800)
  const tandemManeuverHours = getParam(params, 'UTILIZATION', 'Tandem Maneuver Hours', 1.0)
  const flatbedComplexity = getParam(params, 'RISK', 'Flatbed Complexity Factor', 0.25)
  const mxSecurityRisk = getParam(params, 'RISK', 'MX Security Risk Reserve', 0.025)
  const configRiskTandem = getParam(params, 'RISK', 'Config Risk Premium Tandem', 0.1)
  // Production floors — the cost of committing a unit/operator/cycle to a short
  // move. Classify the lane by baseKm; long-haul (>300km) uses no floors (the
  // distance-based math already captures the real cycle).
  const isLocal = lane.baseKm <= 100
  const isShortHaul = !isLocal && lane.baseKm <= 300
  const billableDayFloor = isLocal
    ? getParam(params, 'UTILIZATION', 'Billable Day Floor Local', 1.0)
    : isShortHaul
      ? getParam(params, 'UTILIZATION', 'Billable Day Floor Short-haul', 0.5)
      : getParam(params, 'UTILIZATION', 'Billable Day Floor Long-haul', 0.33)
  const emptyKmFloor = isLocal
    ? getParam(params, 'UTILIZATION', 'Empty KM Min Local', 20)
    : isShortHaul
      ? getParam(params, 'UTILIZATION', 'Empty KM Min Short-haul', 40)
      : 0
  const minTripCostFloor = isLocal
    ? getParam(params, 'UTILIZATION', 'Min Trip Cost Local USD', 200)
    : isShortHaul
      ? getParam(params, 'UTILIZATION', 'Min Trip Cost Short-haul USD', 150)
      : 0

  const eq = equipmentFactors(equipment.truckType)

  // ── Distances (2 physical legs for roundtrip) ────────────────────────
  // Backhaul (E6): reduces expected deadhead vs one-way, but doesn't eliminate
  // residual reposition. The factor (default 0.5) is editable per set/lane.
  const roundtripEmptyFactor = getParam(params, 'UTILIZATION', 'Roundtrip Empty Factor', 0.03)
  const emptyPct = isRoundtrip ? roundtripEmptyFactor : isBackhaul ? deadheadBase * backhaulDeadheadFactor : deadheadBase
  // Return leg (only when roundtrip). Defaults reproduce a symmetric fully-loaded
  // return; carrier can override each field per E3.
  const rtKm = isRoundtrip ? (lane.returnKm ?? lane.baseKm) : 0
  const returnLoaded = isRoundtrip ? (lane.returnLoaded ?? true) : false
  const loadedReturnKm = returnLoaded ? rtKm : 0
  const deadheadReturnKm = returnLoaded ? 0 : rtKm
  const loadedKm = lane.baseKm + loadedReturnKm
  // Empty = outbound reposition + loaded-return reposition + full return-if-deadhead
  const emptyKmComputed = lane.baseKm * emptyPct + loadedReturnKm * emptyPct + deadheadReturnKm
  // Empty-KM floor applies universally (E6): even backhaul has residual reposition.
  const emptyKm = Math.max(emptyKmComputed, emptyKmFloor)
  const totalKm = loadedKm + emptyKm
  const loadedMiles = loadedKm * MI_PER_KM
  const emptyMiles = emptyKm * MI_PER_KM
  const totalMiles = loadedMiles + emptyMiles

  // ── Timing (roundtrip = 2 load/unload cycles if return is loaded) ────
  const baseHours = lane.baseHours ?? 0
  const returnBaseHours = isRoundtrip ? (lane.returnBaseHours ?? baseHours) : 0
  const loadUnloadCycles = isRoundtrip && returnLoaded ? 2 : 1
  // E5: tandem adds hook/unhook + inspection time for the 2nd trailer + dolly.
  const maneuverHours = isTandem ? tandemManeuverHours : 0
  const cycleHours = baseHours + returnBaseHours + (loadTime + unloadTime) * loadUnloadCycles + maneuverHours
  const cycleDays = Math.max(cycleHours / 24, billableDayFloor)

  // ── UT margin / border ───────────────────────────────────────────────
  const utMargin = isBackhaul
    ? getParam(params, 'TECHNICAL_MARGIN', 'UT Rate Backhaul', 0.1)
    : isRoundtrip
      ? getParam(params, 'TECHNICAL_MARGIN', 'UT Rate Roundtrip', 0.2)
      : getParam(params, 'TECHNICAL_MARGIN', 'UT Rate One Way', 0.3)
  const borderUsd = isD2D ? borderTransactional : 0

  // ── CVU ──────────────────────────────────────────────────────────────
  const adjLoadedKmL = rendCargado * eq.fuel * (1 - (isTandem ? tandemFuelPenalty : 0))
  const adjEmptyKmL = rendVacio * eq.fuel * (1 - (isTandem ? tandemFuelPenalty : 0))
  const blendedDieselUsdL = (dieselMx / tc) * mixMx + dieselUs * mixUs
  const fuelUsd = (loadedKm / adjLoadedKmL + emptyKm / adjEmptyKmL) * blendedDieselUsdL * (1 + fuelEscalation)
  // Tolls: outbound + return (roundtrip). Return defaults to same as outbound; override with returnRouteExpensesMxn.
  const outboundTollsMxn = lane.routeExpensesMxn ?? 0
  const returnTollsMxn = isRoundtrip ? (lane.returnRouteExpensesMxn ?? outboundTollsMxn) : 0
  const routeExpensesUsd = ((outboundTollsMxn + returnTollsMxn) / tc) * (1 + (isTandem ? tandemTollPremium : 0))
  const routeBufferUsd = routeExpensesUsd * gastoAdicional
  const maintTiresUsd = totalKm * maintTiresPerKm * eq.maint * (isTandem ? tandemMaintFactor : 1)
  const driverUsd = totalMiles * tarifaMx * driverFactor(equipment.driver, params) * eq.driver
  const cvuUsd = fuelUsd + routeExpensesUsd + routeBufferUsd + maintTiresUsd + driverUsd + borderUsd

  // ── CFU (separated by equipment config — E5) ─────────────────────────
  const monthlyFleetKm = operadores * kmPerOperator
  const productiveTruckDays = flota * operatividad * periodo
  // Tandem commits a 2nd trailer + dolly → genuinely higher fixed cost. Added at
  // PER-TRUCK scale (÷ km/operator or ÷ operating days), NOT diluted across the
  // whole fleet. Additive (not a flat ×1.2) so the uplift % varies by corridor:
  // larger on short lanes where fixed cost dominates, smaller on long ones.
  const tandemPerKm = isTandem ? tandemSecondUnitMonthly / kmPerOperator : 0
  const tandemPerDay = isTandem ? tandemSecondUnitMonthly / periodo : 0
  const fixedCostPerKm = monthlyFixedCost / monthlyFleetKm + tandemPerKm
  const fixedCostPerDay = monthlyFixedCost / productiveTruckDays + tandemPerDay
  const cfuByDistanceUsd = totalKm * fixedCostPerKm * eq.fixed
  const cfuByTimeUsd = cycleDays * fixedCostPerDay * eq.fixed
  // CFU = max(distance, time) for ALL services — V3.0 mexLaneProd does NOT zero it
  // for backhaul (verified vs row Nuevo Laredo→Queretaro D2D Import Backhaul = $1,400).
  const cfuUsd = Math.max(cfuByDistanceUsd, cfuByTimeUsd)

  // ── Production & technical tariff ────────────────────────────────────
  // Belt-and-suspenders: after applying day/km floors, the trip production still
  // has a minimum $ floor (asset commitment + dispatch + admin per salida).
  const productionCostUsd = Math.max(cvuUsd + cfuUsd, minTripCostFloor)
  const technicalTariffUsd = productionCostUsd / (1 - utMargin)
  const technicalUtilityUsd = technicalTariffUsd - productionCostUsd

  // ── Risk ─────────────────────────────────────────────────────────────
  const routeFactor = laneFactor(lane.route, params)
  const routeRiskUsd = (routeFactor - 1) * (fuelUsd + routeExpensesUsd + maintTiresUsd)
  const trailerFac = trailerFactor(equipment.trailer, params)
  const trailerRiskUsd = (trailerFac - 1) * productionCostUsd
  const flatbedComplexityUsd = equipment.trailer === 'Flatbed' ? productionCostUsd * flatbedComplexity : 0
  const securityRiskUsd = productionCostUsd * mxSecurityRisk
  const tandemRiskUsd = isTandem ? productionCostUsd * configRiskTandem : 0
  const operationFac = operationFactor(lane.operation, params)
  const operationRiskUsd = (operationFac - 1) * productionCostUsd
  const totalRiskAdjUsd =
    routeRiskUsd + trailerRiskUsd + flatbedComplexityUsd + securityRiskUsd + tandemRiskUsd + operationRiskUsd

  // ── Required tariff ──────────────────────────────────────────────────
  const rateRounding = getParam(params, 'TECHNICAL_MARGIN', 'Rate Rounding MEX USD', 100)
  const requiredTariffUsd = mround(technicalTariffUsd + totalRiskAdjUsd, rateRounding)
  const operatingProfitUsd = requiredTariffUsd - productionCostUsd
  const operatingMargin = requiredTariffUsd > 0 ? operatingProfitUsd / requiredTariffUsd : 0
  const rpm = totalMiles > 0 ? (requiredTariffUsd - fuelUsd) / totalMiles : 0
  const fsc = totalMiles > 0 ? fuelUsd / totalMiles : 0

  // ReferenceKey (mexLaneProd!CL) — homologated MX names, Backhaul→One Way.
  const referenceKey = buildReferenceKey(
    lane.origin ? homologateMx(lane.origin) : undefined,
    lane.dest ? homologateMx(lane.dest) : undefined,
    equipment, lane.operation, lane.service,
  )

  return {
    loadedKm, emptyKm, totalKm, loadedMiles, emptyMiles, totalMiles, cycleDays,
    blendedDieselUsdL, fuelUsd, routeExpensesUsd, routeBufferUsd, maintTiresUsd, driverUsd, borderUsd,
    cvuUsd,
    fixedCostPerKm, fixedCostPerDay, cfuByDistanceUsd, cfuByTimeUsd, cfuUsd,
    productionCostUsd, utMargin, technicalUtilityUsd, technicalTariffUsd,
    routeFactor, routeRiskUsd, trailerFactor: trailerFac, trailerRiskUsd, flatbedComplexityUsd,
    securityRiskUsd, tandemRiskUsd, operationFactor: operationFac, operationRiskUsd, totalRiskAdjUsd,
    requiredTariffUsd, operatingProfitUsd, operatingMargin, rpm, fsc, referenceKey,
  }
}
