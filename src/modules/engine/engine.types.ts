import type { ParamMap } from '../assumptions/assumptions.service.js'

/**
 * Freight Cost Engine — two-leg cross-border model.
 *
 * A cross-border lane is split into two legs priced by two different engines
 * (per the spreadsheet's `quickRate` sheet):
 *
 *   • MEX leg  (origin → border)  → d2d_mexRateProduction  → cost-plus PVT
 *   • USA leg  (border → dest)    → d2d_usaRateProduction  → market FreightSale
 *
 *   FreightPrice = PVT_mex + FreightSale_usa  (+ border fee + accessorials)
 *
 * Operation type decides which legs run:
 *   D2D Export     → MEX (origin→border) + USA (border→dest)
 *   D2D Import     → USA (origin→border) + MEX (border→dest)
 *   Intra-Mex / MX Northbound / MX Southbound / Local → MEX only
 *   Drayage / USA domestic                            → USA only
 */

export type MarketCondition =
  | 'Very Tight'
  | 'Moderately Tight'
  | 'Slightly Tight'
  | 'Neutral'
  | 'Slightly Loose'
  | 'Moderately Loose'
  | 'Very Loose'

export interface MarketSnapshot {
  fxRate: number          // MXN per USD (spreadsheet base model uses 1.0)
  dieselUsUsdL: number    // USD per liter, US border diesel (default 0.95)
}

export interface EquipmentSpec {
  truckType: string       // "Truck Trailer" | "Rabon" | "Thorton" | "3.5 tons" | "1.5 tons" — drives km/L
  trailerType: string     // "Dry Van" | "Flatbed" | "Reefer" | "Hazmat" | "Chassis" | "Power Only" | "Overdim"
  config: string          // "Single" | "Tandem"
  driverType: string      // "B1" | "Licencia E" | "Interstate" | "Intrastate"
}

/** Resolved MEX-route facts (from mexLaneExpenses in the sheet). */
export interface MexLaneData {
  km: number              // route kilometres (mexLaneExpenses col B)
  transitHrs: number      // hours en route        (col H)
  driverExpenses: number  // driver expenses MXN    (col D) — CAGR = driverExpenses / 20
  routeType: string       // lane factor key, e.g. "Straight & Danger" (d2dFactors LANE FACTOR)
}

/** Resolved USA-route facts (from usaLaneData + usaLaneMktPrice + usaMktCondition + d2d_usaFuel). */
export interface UsaLaneData {
  miles: number             // route miles (usaLaneData col C)
  routeExpenses: number     // route expenses USD (usaLaneData col E)
  marketRpm: number         // DAT benchmark $/mile (usaLaneMktPrice col C)
  outboundCondition: MarketCondition  // origin market condition for trailer type (usaMktCondition)
  fscOriginUsdMile: number  // fuel surcharge $/mile at origin state (d2d_usaFuel col D)
  fscDestUsdMile: number    // fuel surcharge $/mile at destination state
}

export interface EngineInput {
  operationType: string
  serviceType: string
  equipment: EquipmentSpec
  params: ParamMap
  market: MarketSnapshot
  mexLane?: MexLaneData
  usaLane?: UsaLaneData
  borderCrossing?: boolean   // apply border crossing fee when assembling
  overrides?: Partial<ParamMap>
}

// ── MEX leg breakdown (d2d_mexRateProduction columns) ──────────────────────
export interface MexLegOutput {
  km: number
  litros: number          // N / performanceFactor(truckType)
  fracTransit: number     // transitHrs / 12
  fracWait: number        // (load+unload) / 12
  fracViaje: number       // fracTransit + fracWait

  cbfa: number            // CBFA = B63 × min(fracViaje, 1)
  serviceFactor: number
  cbvr: number            // CBVR = svcFactor × (B64 − tarifaUS + tarifaMX) × km
  ut: number              // UT (B65)
  cbtt: number            // CBFA + CBVR + UT

  configFactor: number
  eact: number            // CBTT × (configFactor − 1)
  driverFactor: number
  eaeo: number            // km × tarifaMX × (driverFactor − 1)
  laneFactor: number
  eafr: number            // CBVR × (laneFactor − 1)
  cagr: number            // driverExpenses / 20
  cagv: number            // km < 251 ? 0 : CAGR + gastoAdicional
  ita: number             // CAGV + EAFR + EAEO + EACT + CAGR

  cit: number             // CBTT + ITA
  margenPct: number
  margen: number          // CBTT × margenPct
  tbt: number             // CIT + margen

  trailerFactor: number
  emtr: number            // CBTT × (trailerFactor − 1)
  operationFactor: number
  emto: number            // CBTT × (operationFactor − 1)
  icem: number            // EMTR + EMTO
  icc: number             // litros × dieselUsdL

  pvt: number             // TBT + ICEM + ICC  (sale price, this leg)
  cvt: number             // CIT − EACT − UT − CBFA + ICC  (cost of sale)
}

// ── USA leg breakdown (d2d_usaRateProduction columns) ──────────────────────
export interface UsaLegOutput {
  miles: number
  haulage: number         // B64 × miles
  markup: number          // by mileage tier
  linehaulSale: number    // haulage × (1 + markup)
  ofsc: number            // origin fuel surcharge $/mile
  fuel: number            // ofsc × miles
  odhRule: number         // origin deadhead miles
  odhFee: number          // odhRule × (tarifaUS + ofsc)
  ifsc: number            // dest fuel surcharge $/mile
  idhRule: number         // inbound deadhead miles (by market condition)
  idhFee: number          // idhRule × (tarifaUS + ifsc)
  tdhFee: number          // odhFee + idhFee
  routeExpenses: number
  addlFees: number        // routeExpenses + tdhFee
  freightSale: number     // linehaulSale + fuel + addlFees  (sale price, this leg)
  freightCost: number     // haulage + fuel + addlFees       (cost of sale)
  marketRate: number      // marketRpm × miles + fuel         (DAT benchmark)
}

// ── Cross-border assembly (quickRate) ──────────────────────────────────────
export interface EngineOutput {
  operationType: string
  mexLeg: MexLegOutput | null
  usaLeg: UsaLegOutput | null

  freightPrice: number      // PVT_mex + FreightSale_usa (legs that apply)
  borderFee: number
  crossborderRate: number   // freightPrice + borderFee
  cogs: number              // CVT_mex + FreightCost_usa + borderFee
  grossProfit: number       // crossborderRate − cogs
  grossMargin: number       // grossProfit / crossborderRate
  marketRefPrice: number    // market reference (DAT for USA, PVT for MX)

  // ── Legacy aliases (API compatibility) ──
  requiredTariffUsd: number   // = crossborderRate
  requiredTariffMxn: number   // = crossborderRate × fxRate
  productionCostUsd: number   // = cogs
  totalMiles: number
  fxRateUsed: number
}
