import { getParam, type ParamMap } from '../assumptions/assumptions.service.js'
import { mxnToUsd, round4 } from '../../utils/currency.js'
import { kmToMiles } from '../../utils/units.js'
import type { EquipmentConfig } from '@prisma/client'
import type { MarketSnapshot, CvuBreakdown } from './engine.types.js'

interface CvuInput {
  loadedKm: number
  emptyKm: number
  cycleDays: number
  baseMxKm: number     // km portion in Mexico (for driver day split)
  params: ParamMap
  equipment: EquipmentConfig
  market: MarketSnapshot
  isTandem: boolean
}

export function calculateCvu(input: CvuInput): CvuBreakdown {
  const { loadedKm, emptyKm, cycleDays, baseMxKm, params, equipment, market, isTandem } = input
  const totalKm = loadedKm + emptyKm
  const loadedMiles = kmToMiles(loadedKm)
  const fxRate = market.fxRate

  // ── Fuel ──────────────────────────────────────────────────────────────
  const fuelMixMx = getParam(params, 'FUEL', 'Fuel Purchase Mix MX', 0.3)
  const fuelMixUs = getParam(params, 'FUEL', 'Fuel Purchase Mix US', 0.7)
  const dieselMxUsdL = mxnToUsd(market.dieselMxMxnL, fxRate)
  const blendedDieselUsdL = round4(dieselMxUsdL * fuelMixMx + market.dieselUsUsdL * fuelMixUs)

  const baseLoadedKmL = getParam(params, 'FUEL', 'Rendimiento Cargado', 2.8)
  const baseEmptyKmL = getParam(params, 'FUEL', 'Rendimiento Vacío', 3.2)
  const escalationBuffer = getParam(params, 'FUEL', 'Fuel Escalation Buffer', 0.05)
  const tandemFuelPenalty = isTandem ? getParam(params, 'CONFIG', 'Tandem Fuel Penalty', 0.12) : 0

  const adjLoadedKmL = round4(baseLoadedKmL * equipment.fuelEfficiencyFactor * (1 - tandemFuelPenalty))
  const adjEmptyKmL = round4(baseEmptyKmL * equipment.fuelEfficiencyFactor * (1 - tandemFuelPenalty))

  const fuelUsd = round4(
    (loadedKm / adjLoadedKmL + emptyKm / adjEmptyKmL) * blendedDieselUsdL * (1 + escalationBuffer),
  )

  // ── Driver ────────────────────────────────────────────────────────────
  const driverRateMxUsdMi = getParam(params, 'LABOR', 'Tarifa Operador MX', 0.18)
  const sueldoBaseMxnDay = getParam(params, 'LABOR', 'Sueldo Base Operador MX', 500)
  const viaticosMxnDay = getParam(params, 'LABOR', 'Viáticos MX', 350)
  const cargaSocial = getParam(params, 'LABOR', 'Carga Social', 0.3)

  // Proportion of days in MX
  const mxProportion = totalKm > 0 ? Math.min(1, baseMxKm / totalKm) : 1
  const driverMxDays = cycleDays * mxProportion

  const variableDriverUsd = loadedMiles * driverRateMxUsdMi
  const fixedDriverUsd = driverMxDays * mxnToUsd(sueldoBaseMxnDay + viaticosMxnDay, fxRate) * (1 + cargaSocial)
  const driverUsd = round4(variableDriverUsd + fixedDriverUsd)

  // ── Maintenance & Tires ───────────────────────────────────────────────
  // maintRatePerKm is embedded as a fixed assumption; here we derive from monthly fixed cost proxy
  // Using a standard 0.04 USD/km rate scaled by equipment factor
  const maintRatePerKm = 0.04
  const tandemMaintFactor = isTandem ? getParam(params, 'CONFIG', 'Tandem Maint/Tires Factor', 1.35) : 1
  const maintTiresUsd = round4(totalKm * maintRatePerKm * equipment.maintTiresFactor * tandemMaintFactor)

  // ── Border ────────────────────────────────────────────────────────────
  const borderFrictionDays = getParam(params, 'BORDER', 'Border Friction Time', 0.75)
  const borderDailyCostUsd = 150  // standard border processing cost
  const borderUsd = round4(borderFrictionDays * borderDailyCostUsd)

  // ── Route buffer ──────────────────────────────────────────────────────
  const gastoAdicional = getParam(params, 'GENERAL_BASE', 'Gasto Adicional sobre Ruta', 0.05)
  const routeBufferUsd = round4((fuelUsd + driverUsd + maintTiresUsd + borderUsd) * gastoAdicional)

  const totalCvuUsd = round4(fuelUsd + driverUsd + maintTiresUsd + borderUsd + routeBufferUsd)

  return {
    blendedDieselUsdL,
    adjLoadedKmL,
    adjEmptyKmL,
    fuelUsd,
    driverUsd,
    maintTiresUsd,
    borderUsd,
    routeBufferUsd,
    totalCvuUsd,
  }
}
