import { getParam, type ParamMap } from '../assumptions/assumptions.service.js'
import { round4 } from '../../utils/currency.js'
import type { EquipmentConfig } from '@prisma/client'
import type { CfuBreakdown } from './engine.types.js'

interface CfuInput {
  totalKm: number
  cycleDays: number
  params: ParamMap
  equipment: EquipmentConfig
  isTandem: boolean
  monthlyFixedCostUsd: number  // passed in from org's fixed cost assumption
}

export function calculateCfu(input: CfuInput): CfuBreakdown {
  const { totalKm, cycleDays, params, equipment, isTandem, monthlyFixedCostUsd } = input

  const fleetSize = getParam(params, 'GENERAL_BASE', 'Tamaño de Flota', 50)
  const operativity = getParam(params, 'GENERAL_BASE', 'Índice de Operatividad', 0.9)
  const operators = getParam(params, 'GENERAL_BASE', 'Operadores', 52)
  const avgKmPerOperator = getParam(params, 'GENERAL_BASE', 'Kilómetros promedio x operador', 22000)
  const operatingDays = getParam(params, 'GENERAL_BASE', 'Periodo de Operación', 26)

  // Sheet formula: Operadores × km/operator (productivity basis)
  const monthlyFleetKm = round4(operators * avgKmPerOperator)
  // Sheet formula: fleetSize × operativity × Periodo de Operación (asset availability basis)
  const productiveTruckDays = round4(fleetSize * operativity * operatingDays)

  const tandemCfuFactor = isTandem ? getParam(params, 'CONFIG', 'Tandem CFU Factor', 1.2) : 1

  const fixedCostPerKm = round4((monthlyFixedCostUsd / monthlyFleetKm) * equipment.fixedCostFactor)
  const fixedCostPerDay = round4(monthlyFixedCostUsd / productiveTruckDays)

  const cfuByDistance = round4(fixedCostPerKm * totalKm * tandemCfuFactor)
  const cfuByTime = round4(fixedCostPerDay * cycleDays * tandemCfuFactor)

  // Conservative: take the higher of the two
  const totalCfuUsd = round4(Math.max(cfuByDistance, cfuByTime))

  return {
    monthlyFleetKm,
    productiveTruckDays,
    fixedCostPerKm,
    fixedCostPerDay,
    cfuByDistance,
    cfuByTime,
    totalCfuUsd,
  }
}
