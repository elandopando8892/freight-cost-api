import { getParam, type ParamMap } from '../assumptions/assumptions.service.js'
import { usdToMxn, round2, round4 } from '../../utils/currency.js'
import { kmToMiles, milesToKm } from '../../utils/units.js'
import { calculateCvu } from './engine.cvu.js'
import { calculateCfu } from './engine.cfu.js'
import { calculateRisk } from './engine.risk.js'
import type { EngineInput, EngineOutput } from './engine.types.js'

// Monthly fixed cost per truck in USD — derived from fleet overhead assumptions
// In a full implementation this would be seeded as an assumption param
const MONTHLY_FIXED_COST_PER_TRUCK_USD = 2800

export function calculate(input: EngineInput): EngineOutput {
  const { lane, equipment, market } = input
  // Merge base params with any overrides
  const params: ParamMap = Object.assign({}, input.params, input.overrides ?? {})

  const fxRate = market.fxRate

  // ── Distance resolution ───────────────────────────────────────────────
  const deadheadBase = getParam(params, 'UTILIZATION', 'Deadhead Base', 0.15)
  const loadedMiles = lane.loadedMiles ?? (lane.baseKm ? kmToMiles(lane.baseKm) : 0)
  const loadedKm = lane.baseKm ?? milesToKm(loadedMiles)

  const returnKm = lane.returnKm ?? (lane.isRoundtrip ? loadedKm : loadedKm * deadheadBase)
  const emptyKm = lane.isRoundtrip ? returnKm : loadedKm * deadheadBase
  const totalKm = loadedKm + emptyKm

  // ── Cycle time ────────────────────────────────────────────────────────
  const avgSpeedKmH = 65
  const loadTime = getParam(params, 'UTILIZATION', 'Load Time', 2)
  const unloadTime = getParam(params, 'UTILIZATION', 'Unload Time', 2)
  const borderFrictionDays = lane.isD2D
    ? getParam(params, 'BORDER', 'Border Friction Time', 0.75)
    : 0

  const driveHours = totalKm / avgSpeedKmH
  const cycleDays = round4((driveHours + loadTime + unloadTime) / 24 + borderFrictionDays)

  // ── Config flags ──────────────────────────────────────────────────────
  const isTandem = equipment.config === 'Tandem'
  const monthlyFixedCostUsd = MONTHLY_FIXED_COST_PER_TRUCK_USD

  // ── CVU ───────────────────────────────────────────────────────────────
  const cvu = calculateCvu({
    loadedKm,
    emptyKm,
    cycleDays,
    baseMxKm: loadedKm,   // assume full route in MX for D2D; refine per lane type later
    params,
    equipment,
    market,
    isTandem,
  })

  // ── CFU ───────────────────────────────────────────────────────────────
  const cfu = calculateCfu({
    totalKm,
    cycleDays,
    params,
    equipment,
    isTandem,
    monthlyFixedCostUsd,
  })

  // ── Technical Tariff ──────────────────────────────────────────────────
  const productionCostUsd = round2(cvu.totalCvuUsd + cfu.totalCfuUsd)

  const utRate = getUtRate(lane.serviceType, params)
  const utMargin = round2(productionCostUsd * utRate)
  const technicalTariffUsd = round2(productionCostUsd + utMargin)

  // ── Risk ──────────────────────────────────────────────────────────────
  const risk = calculateRisk({
    technicalTariffUsd,
    mxLinehaulUsd: cvu.fuelUsd + cvu.driverUsd,  // proxy for MX linehaul exposure
    params,
    trailerType: equipment.trailerType,
    config: equipment.config,
    operationType: lane.operationType,
  })

  // ── Required Tariff ───────────────────────────────────────────────────
  const requiredTariffUsd = round2(technicalTariffUsd + risk.totalRiskAdjUsd)
  const requiredTariffMxn = round2(usdToMxn(requiredTariffUsd, fxRate))
  const tariffPerLoadedMile = loadedMiles > 0 ? round4(requiredTariffUsd / loadedMiles) : 0
  const carrierMargin = productionCostUsd > 0
    ? round4((requiredTariffUsd - productionCostUsd) / requiredTariffUsd)
    : 0

  return {
    loadedKm,
    emptyKm,
    totalKm,
    loadedMiles,
    cycleDays,
    cvu,
    cfu,
    risk,
    productionCostUsd,
    utMargin,
    technicalTariffUsd,
    requiredTariffUsd,
    requiredTariffMxn,
    tariffPerLoadedMile,
    carrierMargin,
    fxRateUsed: fxRate,
  }
}

function getUtRate(serviceType: string, params: ParamMap): number {
  switch (serviceType) {
    case 'Backhaul':
      return getParam(params, 'TECHNICAL_MARGIN', 'UT Rate Backhaul', 0.1)
    case 'Roundtrip':
      return getParam(params, 'TECHNICAL_MARGIN', 'UT Rate Roundtrip', 0.2)
    default:
      return getParam(params, 'TECHNICAL_MARGIN', 'UT Rate One Way', 0.3)
  }
}
