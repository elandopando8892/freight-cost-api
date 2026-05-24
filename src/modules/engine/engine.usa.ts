/**
 * USA leg — exact reproduction of Freight Cost Model V3.0 `usaLaneProd`.
 *
 * Validated vs US-RATE-PROD-2026-Q2-520 (Laredo→Dallas Flatbed D2D Export One Way):
 *   CVU incl fuel 850.57, CFU 48.90, Technical (incl fuel) 1284.96,
 *   Trailer Risk 269.84 → Required ex-fuel 1043.16 → RPM 2.398, FSC 0.80
 *   Quote flat = 435 × (2.398 + 0.80) = 1391 ✓
 *
 * Note: V3.0's usaLaneProd has the Service/Operation columns swapped; the
 * operation-factor lookup keys off the service value and vice-versa, which
 * nulls operation/service risk for standard one-way lanes. Replicated faithfully.
 */
import { getParam, type ParamMap } from '../assumptions/assumptions.service.js'
import {
  trailerFactor, operationFactor, serviceFactor, driverFactor,
  equipmentFactors, repositionPct,
} from './engine.factors.js'
import type { UsaLegInput, UsaLegOutput } from './engine.types.js'

const KML_TO_MPG = 2.3521458
const mround = (x: number, m: number) => Math.round(x / m) * m

export function calculateUsaLeg(lane: UsaLegInput, params: ParamMap): UsaLegOutput {
  const { equipment } = lane
  const isRoundtrip = lane.service === 'Roundtrip'
  const isBackhaul = lane.service === 'Backhaul'

  const rendCargado = getParam(params, 'FUEL', 'Rendimiento Cargado', 2.8)
  const rendVacio = getParam(params, 'FUEL', 'Rendimiento Vacío', 3.2)
  const tarifaUs = getParam(params, 'LABOR', 'Tarifa Operador US', 0.6)
  const deadheadBase = getParam(params, 'UTILIZATION', 'Deadhead Base', 0.15)
  const loadTime = getParam(params, 'UTILIZATION', 'Load Time', 2)
  const unloadTime = getParam(params, 'UTILIZATION', 'Unload Time', 2)
  const maintTiresPerMile = getParam(params, 'UTILIZATION', 'Maint and Tires Rate per Mile', 0.3779349672)
  const monthlyFixedCost = getParam(params, 'FINANCE', 'Monthly Fixed Cost', 381384.0354)
  const flota = getParam(params, 'GENERAL_BASE', 'Tamaño de Flota', 50)
  const periodo = getParam(params, 'GENERAL_BASE', 'Periodo de Operación', 26)
  const kmPerOperator = getParam(params, 'GENERAL_BASE', 'Kilómetros promedio x operador', 22000)

  const eq = equipmentFactors(equipment.truckType)
  const P = lane.loadedMiles

  // Outputs-derived fixed cost rates (V3.0 quirk: /(Periodo×Flota), per-mile via km/operator)
  const fixedPerDay = monthlyFixedCost / (periodo * flota)
  const fixedPerMile = fixedPerDay / kmPerOperator * 1.60934

  // ── Fuel efficiency ──────────────────────────────────────────────────
  const loadedMpg = rendCargado * KML_TO_MPG * eq.fuel
  const emptyMpg = rendVacio * KML_TO_MPG * eq.fuel

  // ── Empty miles (market reposition, else deadhead fallback) ──────────
  const originReposPct = repositionPct(lane.originCondition)
  const destReposPct = repositionPct(lane.destCondition)
  const marketBased = originReposPct > 0 || destReposPct > 0
  const originEmptyMiles = isRoundtrip || isBackhaul ? 0 : P * originReposPct
  const destReposMiles = isRoundtrip || isBackhaul ? 0 : P * destReposPct
  const deadheadFallbackPct = marketBased ? 0 : isBackhaul ? 0 : deadheadBase
  const totalEmptyMiles = marketBased ? originEmptyMiles + destReposMiles : deadheadFallbackPct * P
  const totalOperationalMiles = P + totalEmptyMiles

  // ── CVU ──────────────────────────────────────────────────────────────
  const fuelGallons = (loadedMpg > 0 ? P / loadedMpg : 0) + (emptyMpg > 0 ? totalEmptyMiles / emptyMpg : 0)
  const fuelCostUsd = fuelGallons * lane.dieselUsdGal
  const driverCostUsd = totalOperationalMiles * tarifaUs * driverFactor(equipment.driver, params) * eq.driver + (lane.driverExpenses ?? 0)
  const maintTiresUsd = totalOperationalMiles * maintTiresPerMile * eq.maint
  const cvuExFuelUsd = driverCostUsd + maintTiresUsd
  const cvuInclFuelUsd = cvuExFuelUsd + fuelCostUsd

  // ── CFU ──────────────────────────────────────────────────────────────
  const transitDaysRaw = lane.transitDaysRaw ?? 0
  const cycleDays = (P > 0 ? transitDaysRaw * (totalOperationalMiles / P) : transitDaysRaw) + (loadTime + unloadTime) / 24
  const cfuByDistanceUsd = totalOperationalMiles * fixedPerMile * eq.fixed
  const cfuByTimeUsd = cycleDays * fixedPerDay * eq.fixed
  const cfuUsd = isBackhaul ? 0 : Math.max(cfuByDistanceUsd, cfuByTimeUsd)

  // ── Technical tariff (ex / incl fuel) ────────────────────────────────
  const utRate = isBackhaul
    ? getParam(params, 'TECHNICAL_MARGIN', 'UT Rate Backhaul', 0.1)
    : isRoundtrip
      ? getParam(params, 'TECHNICAL_MARGIN', 'UT Rate Roundtrip', 0.2)
      : getParam(params, 'TECHNICAL_MARGIN', 'UT Rate One Way', 0.3)
  const technicalTariffExFuelUsd = (cvuExFuelUsd + cfuUsd) / (1 - utRate)
  const technicalTariffInclFuelUsd = (cvuInclFuelUsd + cfuUsd) / (1 - utRate)

  // ── Risk (swap quirk: op factor keyed off service, svc off operation) ─
  const trailerFac = trailerFactor(equipment.trailer, params)
  const trailerRiskUsd = Math.max(trailerFac - 1, 0) * (cvuInclFuelUsd + cfuUsd)
  const opFactor = operationFactor(lane.service, params)
  const operationRiskUsd = Math.max(opFactor - 1, 0) * (cvuInclFuelUsd + cfuUsd)
  const svcFactor = serviceFactor(lane.operation, params)
  const serviceRiskUsd = lane.service === 'Expedited' ? Math.max(svcFactor - 1, 0) * (cvuInclFuelUsd + cfuUsd) : 0
  const totalRiskAdjUsd = trailerRiskUsd + operationRiskUsd + serviceRiskUsd

  // ── Required tariff ──────────────────────────────────────────────────
  const requiredTariffExFuelUsd = technicalTariffExFuelUsd + totalRiskAdjUsd
  const requiredTariffUsd = mround(technicalTariffInclFuelUsd + totalRiskAdjUsd, 50)
  const rpm = P > 0 ? requiredTariffExFuelUsd / P : 0
  const fsc = lane.fscUsdMile
  const flatUsd = P * (rpm + fsc)

  return {
    loadedMiles: P, emptyMiles: totalEmptyMiles, totalOperationalMiles,
    loadedMpg, emptyMpg, fuelGallons, fuelCostUsd, driverCostUsd, maintTiresUsd,
    cvuExFuelUsd, cvuInclFuelUsd, cycleDays,
    cfuByDistanceUsd, cfuByTimeUsd, cfuUsd,
    utRate, technicalTariffExFuelUsd, technicalTariffInclFuelUsd,
    trailerFactor: trailerFac, trailerRiskUsd, operationRiskUsd, serviceRiskUsd, totalRiskAdjUsd,
    requiredTariffExFuelUsd, requiredTariffUsd, rpm, fsc, flatUsd,
  }
}
