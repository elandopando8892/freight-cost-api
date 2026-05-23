import type { EquipmentConfig, Lane } from '@prisma/client'
import type { ParamMap } from '../assumptions/assumptions.service.js'

export interface MarketSnapshot {
  dieselMxMxnL: number    // MXN per liter (used if dieselBlended not provided)
  dieselUsUsdL: number    // USD per liter (US border diesel)
  fxRate: number          // MXN per USD
}

export interface EngineInput {
  lane: Lane
  params: ParamMap
  equipment: EquipmentConfig
  market: MarketSnapshot
  overrides?: Partial<ParamMap>
}

// ── New output structure matching the spreadsheet exactly ──────────────────

/**
 * Full breakdown of the tariff calculation as per d2d_mexRateProduction logic.
 *
 * Formula flow:
 *   CBFA + CBVR + UT = CBTT
 *   CBTT + ITA (CAGR+CAGV) = CIT          ← production cost
 *   CIT + MARGEN (CBTT × margenPct) = TBT   ← base tariff
 *   TBT + ICEM (EMTR+EMTO+EACT+EAEO) + ICC = PVT  ← required tariff
 */
export interface EngineOutput {
  // ── Distances & timing ────────────────────────────────────────────────
  totalKms: number          // total route km
  loadedMiles: number       // loaded miles
  litros: number            // liters consumed (km / rendimiento)
  transitHrs: number        // hours driving
  fracTransit: number       // transitHrs / 12
  fracWait: number          // (loadTime + unloadTime) / 12
  fracViaje: number         // fracTransit + fracWait

  // ── Cost base (CBTT) ─────────────────────────────────────────────────
  cbfa: number              // Fixed asset base cost = CBFA_rate × MIN(fracViaje,1)
  cbvr: number              // Variable route base cost = CBVR_rate × km × svcFactor
  ut: number                // Per-trip overhead (Utilidad Determinada)
  cbtt: number              // CBFA + CBVR + UT

  // ── Trip additions (ITA) ─────────────────────────────────────────────
  cagr: number              // Route/toll expenses = CAGR_rate × fracTransit
  cagv: number              // Travel expenses (per diem when transitHrs > 4)
  ita: number               // ITA = CAGR + CAGV

  // ── Production cost ───────────────────────────────────────────────────
  cit: number               // CIT = CBTT + ITA  (Costo Integral de Transporte)

  // ── Margin & base tariff ──────────────────────────────────────────────
  margenPct: number         // km-tier margin %
  margenContrib: number     // CBTT × margenPct
  tbt: number               // TBT = CIT + margenContrib

  // ── Market effects (ICEM) ─────────────────────────────────────────────
  trailerFactor: number     // from d2dFactors
  emtr: number              // CBTT × (trailerFactor - 1)
  operationFactor: number   // from d2dFactors
  emto: number              // CBTT × (operationFactor - 1)
  configFactor: number      // Single=1.0, Tandem=1.3
  eact: number              // CBTT × (configFactor - 1)
  driverFactor: number      // B1=1.0, LicenciaE=1.25, etc.
  eaeo: number              // CBTT × (driverFactor - 1)
  icem: number              // EMTR + EMTO + EACT + EAEO

  // ── Fuel ─────────────────────────────────────────────────────────────
  icc: number               // ICC = litros × dieselUsdL

  // ── Final price ───────────────────────────────────────────────────────
  pvt: number               // PVT = TBT + ICEM + ICC  (required tariff USD)
  ubt: number               // Gross profit = PVT - CIT
  mct: number               // Margin % = UBT / PVT

  // ── Legacy aliases (for API compatibility) ────────────────────────────
  requiredTariffUsd: number   // = pvt
  requiredTariffMxn: number   // = pvt × fxRate
  productionCostUsd: number   // = cit
  tariffPerLoadedMile: number // = pvt / loadedMiles
  fxRateUsed: number

  // ── Service & config metadata ─────────────────────────────────────────
  serviceFactor: number       // One Way=1.0, Backhaul=0.4, Roundtrip=1.5
}
