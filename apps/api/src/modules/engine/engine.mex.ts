/**
 * MEX leg — exact reproduction of Freight Cost Model V3.0 `mexLaneProd`.
 *
 * Validated vs MX-RATE-PROD-2026-Q2-01 (Monterrey→Nuevo Laredo Flatbed D2D Export):
 *   CVU 439.42, CFU 107.57, Production 546.98, Technical Tariff 781.41,
 *   Risk Adj 406.87, Required Tariff MROUND(1188.28,100)=1200 ✓
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
  const tandemCfuFactor = getParam(params, 'CONFIG', 'Tandem CFU Factor', 1.2)
  const flatbedComplexity = getParam(params, 'RISK', 'Flatbed Complexity Factor', 0.25)
  const mxSecurityRisk = getParam(params, 'RISK', 'MX Security Risk Reserve', 0.025)
  const configRiskTandem = getParam(params, 'RISK', 'Config Risk Premium Tandem', 0.1)

  const eq = equipmentFactors(equipment.truckType)

  // ── Distances ────────────────────────────────────────────────────────
  const emptyPct = isRoundtrip ? 0.03 : isBackhaul ? 0 : deadheadBase
  const returnKm = isRoundtrip ? lane.baseKm : 0
  const loadedKm = lane.baseKm + returnKm
  const emptyKm = lane.baseKm * emptyPct
  const totalKm = loadedKm + emptyKm
  const loadedMiles = loadedKm * MI_PER_KM
  const emptyMiles = emptyKm * MI_PER_KM
  const totalMiles = loadedMiles + emptyMiles

  // ── Timing ───────────────────────────────────────────────────────────
  const baseHours = lane.baseHours ?? 0
  const cycleDays = Math.max((baseHours + loadTime + unloadTime) / 24, 0.33)

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
  const routeExpensesUsd = ((lane.routeExpensesMxn ?? 0) / tc) * (1 + (isTandem ? tandemTollPremium : 0))
  const routeBufferUsd = routeExpensesUsd * gastoAdicional
  const maintTiresUsd = totalKm * maintTiresPerKm * eq.maint * (isTandem ? tandemMaintFactor : 1)
  const driverUsd = totalMiles * tarifaMx * driverFactor(equipment.driver, params) * eq.driver
  const cvuUsd = fuelUsd + routeExpensesUsd + routeBufferUsd + maintTiresUsd + driverUsd + borderUsd

  // ── CFU ──────────────────────────────────────────────────────────────
  const monthlyFleetKm = operadores * kmPerOperator
  const productiveTruckDays = flota * operatividad * periodo
  const fixedCostPerKm = monthlyFixedCost / monthlyFleetKm
  const fixedCostPerDay = monthlyFixedCost / productiveTruckDays
  const configCfu = isTandem ? tandemCfuFactor : 1
  const cfuByDistanceUsd = totalKm * fixedCostPerKm * configCfu * eq.fixed
  const cfuByTimeUsd = cycleDays * fixedCostPerDay * eq.fixed * configCfu
  // CFU = max(distance, time) for ALL services — V3.0 mexLaneProd does NOT zero it
  // for backhaul (verified vs row Nuevo Laredo→Queretaro D2D Import Backhaul = $1,400).
  const cfuUsd = Math.max(cfuByDistanceUsd, cfuByTimeUsd)

  // ── Production & technical tariff ────────────────────────────────────
  const productionCostUsd = cvuUsd + cfuUsd
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
  const requiredTariffUsd = mround(technicalTariffUsd + totalRiskAdjUsd, 100)
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
