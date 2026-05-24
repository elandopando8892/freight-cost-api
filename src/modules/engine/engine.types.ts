import type { ParamMap } from '../assumptions/assumptions.service.js'
import type { MarketCondition } from './engine.factors.js'

export type { MarketCondition }

/**
 * Freight Cost Model V3.0 — cost-plus carrier engine.
 *
 * Each lane leg is priced bottom-up:
 *   CVU (variable) + CFU (fixed) = Production Cost
 *   Technical Tariff = Production / (1 − UT Margin)
 *   + Risk adjustments  → Carrier Required Tariff (MROUND)
 *
 * A cross-border quote sums the MX leg (origin→border) and USA leg
 * (border→dest) flats, the way the QuoteDesk consumes the ReferenceKeys.
 */

export interface EquipmentSpec {
  truckType: string   // "Truck Trailer" | "Thorton" | "Rabon" | "3.5 tons" | "1.5 tons"
  trailer: string     // "Dry Van" | "Flatbed" | "Reefer" | "Hazmat" | "Chassis" | "Power Only" | "Overdim"
  config: string      // "Single" | "Tandem"
  driver: string      // "B1" | "Licencia E" | "Interstate" | "Intrastate" | "CDL"
}

// ── MEX leg input (mexLaneProd) ────────────────────────────────────────────
export interface MexLegInput {
  baseKm: number             // mexLaneData lookup
  routeExpensesMxn?: number  // mexLaneData (tolls etc.); 0 if absent
  baseHours?: number         // transit hours; 0 → cycle-days floor 0.33
  operation: string
  service: string
  route: string              // lane type (e.g. "Straight & Danger")
  equipment: EquipmentSpec
}

// ── USA leg input (usaLaneProd) ────────────────────────────────────────────
export interface UsaLegInput {
  loadedMiles: number             // usaLaneData lookup
  transitDaysRaw?: number
  driverExpenses?: number
  outState: string                // for fuel/FSC lookup
  dieselUsdGal: number            // usaFuel by state
  fscUsdMile: number              // usaFuel by state
  originCondition: MarketCondition // usaMktCondition (origin market, by trailer)
  destCondition: MarketCondition   // usaMktCondition (dest market, by trailer)
  operation: string
  service: string
  equipment: EquipmentSpec
}

// ── MEX leg output ─────────────────────────────────────────────────────────
export interface MexLegOutput {
  loadedKm: number; emptyKm: number; totalKm: number
  loadedMiles: number; emptyMiles: number; totalMiles: number
  cycleDays: number
  blendedDieselUsdL: number
  fuelUsd: number; routeExpensesUsd: number; routeBufferUsd: number
  maintTiresUsd: number; driverUsd: number; borderUsd: number
  cvuUsd: number
  fixedCostPerKm: number; fixedCostPerDay: number
  cfuByDistanceUsd: number; cfuByTimeUsd: number; cfuUsd: number
  productionCostUsd: number
  utMargin: number; technicalUtilityUsd: number; technicalTariffUsd: number
  routeFactor: number; routeRiskUsd: number
  trailerFactor: number; trailerRiskUsd: number; flatbedComplexityUsd: number
  securityRiskUsd: number; tandemRiskUsd: number
  operationFactor: number; operationRiskUsd: number
  totalRiskAdjUsd: number
  requiredTariffUsd: number
  operatingProfitUsd: number; operatingMargin: number
  rpm: number; fsc: number       // ReferenceKey: USD = requiredTariff
}

// ── USA leg output ─────────────────────────────────────────────────────────
export interface UsaLegOutput {
  loadedMiles: number; emptyMiles: number; totalOperationalMiles: number
  loadedMpg: number; emptyMpg: number
  fuelGallons: number; fuelCostUsd: number
  driverCostUsd: number; maintTiresUsd: number
  cvuExFuelUsd: number; cvuInclFuelUsd: number
  cycleDays: number
  cfuByDistanceUsd: number; cfuByTimeUsd: number; cfuUsd: number
  utRate: number
  technicalTariffExFuelUsd: number; technicalTariffInclFuelUsd: number
  trailerFactor: number; trailerRiskUsd: number
  operationRiskUsd: number; serviceRiskUsd: number
  totalRiskAdjUsd: number
  requiredTariffExFuelUsd: number  // BO — basis for ReferenceKey RPM
  requiredTariffUsd: number        // BP — MROUND(incl fuel + risk, 50)
  rpm: number; fsc: number
  flatUsd: number                  // miles × (RPM + FSC) — what the quote sums
}

// ── Cross-border assembly ──────────────────────────────────────────────────
export interface EngineOutput {
  operation: string
  mexLeg: MexLegOutput | null
  usaLeg: UsaLegOutput | null
  freightBaselineUsd: number       // MX flat + USA flat (MROUND 100)
  // legacy aliases
  requiredTariffUsd: number
  fxRateUsed: number
}

export interface EngineInput {
  operation: string
  service: string
  equipment: EquipmentSpec
  params: ParamMap
  fxRate?: number
  mexLeg?: MexLegInput
  usaLeg?: UsaLegInput
  overrides?: Partial<ParamMap>
}
