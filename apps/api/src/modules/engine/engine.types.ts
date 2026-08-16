import type { ParamMap } from '../assumptions/assumptions.service.js'
import type { CostBaseProfile } from '../cost-bases/cost-base-profile.js'
import type { MarketCondition } from './engine.factors.js'

export type { MarketCondition }

export type EnginePolicy = 'OPERATIONAL_V3' | 'WORKBOOK_V3'

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
  origin?: string            // MX "City, State" (homologated for the ReferenceKey)
  dest?: string
  // Roundtrip second leg (all optional — defaults reproduce a symmetric fully-loaded
  // return, matching pre-E3 behavior). Ignored when service !== 'Roundtrip'.
  returnKm?: number                 // return distance; default = baseKm
  returnLoaded?: boolean            // return is loaded (true) or deadhead (false); default true
  returnRouteExpensesMxn?: number   // return tolls; default = routeExpensesMxn
  returnBaseHours?: number          // return transit hours; default = baseHours
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
  marketRpm?: number               // DAT benchmark avg RPM (usaDatBenchmark); 0 if unknown
  operation: string
  service: string
  equipment: EquipmentSpec
  origin?: string                  // US metro "City, ST" for the ReferenceKey
  dest?: string
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
  referenceKey: string           // mexLaneProd!CL (Backhaul→One Way, homologated MX names)
}

// ── Drayage leg input (engine.drayage.ts) ──────────────────────────────────
// Drayage is a physical CYCLE, not a point-to-point linehaul. Only loadedMiles
// is required; the rest of the cycle is derived from params when absent.
export interface DrayageLegInput {
  loadedMiles: number                 // port terminal → delivery (container loaded)
  portPickupMiles?: number            // yard → port terminal (deadhead to grab the box)
  emptyReturnMiles?: number           // delivery → return location (empty container)
  finalRepositionMiles?: number       // return location → yard (deadhead)
  portDwellHours?: number             // dwell retrieving the container at the terminal
  deliveryServiceHours?: number       // unload / live-strip at destination
  transitDaysRaw?: number             // linehaul transit (like the USA leg)
  // Container return conditionality (finding #5): return to port, interior drop-off, or none.
  emptyReturnRequired?: boolean       // undefined → assume required (conservative) + warn upstream
  dropOff?: boolean                   // interior drop-off yard (shorter) instead of returning to port
  chassisReturnRequired?: boolean     // chassis goes back too (extra reposition/day)
  dieselUsdGal: number
  fscUsdMile: number
  outState: string
  returnTollUsd?: number
  driverExpenses?: number
  marketRpm?: number
  operation: string                   // 'Drayage'
  service: string
  equipment: EquipmentSpec
  origin?: string
  dest?: string
}

// How the empty-container return resolved (for transparency / warnings).
export type DrayageReturnMode = 'port' | 'drop-off' | 'none' | 'assumed-port'

export interface DrayageCycleBreakdown {
  portPickupMiles: number
  loadedLinehaulMiles: number
  emptyReturnMiles: number
  finalRepositionMiles: number
  portDwellHours: number
  deliveryServiceHours: number
  chassisCostUsd: number
  returnTollUsd: number
  returnMode: DrayageReturnMode
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
  marketRpm: number                // DAT benchmark RPM (0 if unknown)
  marketRateUsd: number            // (marketRpm + fsc) × loadedMiles — DAT all-in
  referenceKey: string             // usaLaneProd!BV (Backhaul→One Way)
  drayageCycle?: DrayageCycleBreakdown  // present only when produced by the drayage engine
}

// ── Commercial / decision layer ────────────────────────────────────────────
export interface CommercialOutput {
  costFloorUsd: number
  minSellUsd: number
  targetSellUsd: number
  premiumSellUsd: number
  recommendedSellUsd: number
  grossProfitUsd: number
  grossMarginPct: number
  gpPerLoadedMileUsd: number
  gpPerDayUsd: number
  marketReferenceUsd: number
  marketVsCostSpreadUsd: number
  marketVsCostSpreadPct: number
  noGoFlag: boolean
  reviewFlag: boolean
  notes: string[]
}

// ── Cross-border assembly ──────────────────────────────────────────────────
export interface EngineOutput {
  policy: EnginePolicy
  operation: string
  mexLeg: MexLegOutput | null
  usaLeg: UsaLegOutput | null
  freightBaselineUsd: number       // MX flat + USA flat (MROUND 100)
  commercial: CommercialOutput     // cost floor → sell tiers → margin → flags
  // legacy aliases
  requiredTariffUsd: number
  fxRateUsed: number
}

export interface EngineInput {
  policy?: EnginePolicy
  /** Internal replay mode for snapshots produced before profiled V3 semantics. */
  compatibilityMode?: 'LEGACY_FCM_V3'
  /** Immutable applicability context selected with the governed assumption version. */
  applicabilityProfile?: CostBaseProfile
  operation: string
  service: string
  equipment: EquipmentSpec
  params: ParamMap
  fxRate?: number
  mexLeg?: MexLegInput
  usaLeg?: UsaLegInput
  drayageLeg?: DrayageLegInput
  overrides?: Partial<ParamMap>
}
