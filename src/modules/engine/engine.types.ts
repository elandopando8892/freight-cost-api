import type { EquipmentConfig, Lane } from '@prisma/client'
import type { ParamMap } from '../assumptions/assumptions.service.js'

export interface MarketSnapshot {
  dieselMxMxnL: number    // MXN per liter
  dieselUsUsdL: number    // USD per liter
  fxRate: number          // MXN per USD
}

export interface EngineInput {
  lane: Lane
  params: ParamMap
  equipment: EquipmentConfig
  market: MarketSnapshot
  overrides?: Partial<ParamMap>
}

export interface CvuBreakdown {
  blendedDieselUsdL: number
  adjLoadedKmL: number
  adjEmptyKmL: number
  fuelUsd: number
  driverUsd: number
  maintTiresUsd: number
  borderUsd: number
  routeBufferUsd: number
  totalCvuUsd: number
}

export interface CfuBreakdown {
  monthlyFleetKm: number
  productiveTruckDays: number
  fixedCostPerKm: number
  fixedCostPerDay: number
  cfuByDistance: number
  cfuByTime: number
  totalCfuUsd: number
}

export interface RiskBreakdown {
  routeRiskUsd: number
  securityRiskUsd: number
  operationRiskUsd: number
  flatbedComplexityUsd: number
  tandemRiskUsd: number
  weatherBufferUsd: number
  totalRiskAdjUsd: number
}

export interface EngineOutput {
  // Distances
  loadedKm: number
  emptyKm: number
  totalKm: number
  loadedMiles: number
  cycleDays: number

  // Cost components
  cvu: CvuBreakdown
  cfu: CfuBreakdown
  risk: RiskBreakdown

  // Tariffs
  productionCostUsd: number
  utMargin: number
  technicalTariffUsd: number
  requiredTariffUsd: number
  requiredTariffMxn: number
  tariffPerLoadedMile: number
  carrierMargin: number

  // Metadata
  fxRateUsed: number
  assumptionSetId?: string
}
