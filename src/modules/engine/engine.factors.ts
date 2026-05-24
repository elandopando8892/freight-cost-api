/**
 * Factor & equipment lookup tables — mirror Freight Cost Model V3.0 exactly
 * (Factors sheet + Equipments sheet). Each value reads from the assumption
 * ParamMap (FACTORS section) and falls back to the verified V3.0 default.
 */
import { getParam, type ParamMap } from '../assumptions/assumptions.service.js'

export type MarketCondition =
  | 'Very Tight' | 'Moderately Tight' | 'Balanced'
  | 'Slightly Loose' | 'Very Loose'
  // legacy/condition aliases that may appear in market data
  | 'Slightly Tight' | 'Neutral' | 'Moderately Loose'

// ── LANE FACTOR (route geometry/danger) ────────────────────────────────────
export function laneFactor(route: string, params: ParamMap): number {
  switch (route) {
    case 'Mostly Straight':   return getParam(params, 'FACTORS', 'Lane Mostly Straight', 1.0)
    case 'Mixed Lane':        return getParam(params, 'FACTORS', 'Lane Mixed Lane', 1.1)
    case 'Mostly Curvy':      return getParam(params, 'FACTORS', 'Lane Mostly Curvy', 1.2)
    case 'Straight & Danger': return getParam(params, 'FACTORS', 'Lane Straight & Danger', 1.05)
    case 'Mixed & Danger':    return getParam(params, 'FACTORS', 'Lane Mixed & Danger', 1.2)
    case 'Curvy & Danger':    return getParam(params, 'FACTORS', 'Lane Curvy & Danger', 1.3)
    default:                  return getParam(params, 'FACTORS', 'Lane Mostly Straight', 1.0)
  }
}

// ── OPERATION FACTOR ────────────────────────────────────────────────────────
export function operationFactor(operation: string, params: ParamMap): number {
  switch (operation) {
    case 'MX Northbound': return getParam(params, 'FACTORS', 'Op MX Northbound', 1.0)
    case 'MX Southbound': return getParam(params, 'FACTORS', 'Op MX Southbound', 0.7)
    case 'Intra-Mex':     return getParam(params, 'FACTORS', 'Op Intra-Mex', 1.0)
    case 'Local':         return getParam(params, 'FACTORS', 'Op Local', 1.0)
    case 'D2D Export':    return getParam(params, 'FACTORS', 'Op D2D Export', 1.15)
    case 'D2D Import':    return getParam(params, 'FACTORS', 'Op D2D Import', 0.85)
    case 'Drayage':       return getParam(params, 'FACTORS', 'Op Drayage', 1.15)
    default:              return 1.0  // unknown → neutral (matches sheet IFERROR fallback)
  }
}

// ── SERVICE FACTOR ──────────────────────────────────────────────────────────
export function serviceFactor(service: string, params: ParamMap): number {
  switch (service) {
    case 'One Way':   return getParam(params, 'FACTORS', 'Svc One Way', 1.0)
    case 'Backhaul':  return getParam(params, 'FACTORS', 'Svc Backhaul', 0.6)
    case 'Roundtrip': return getParam(params, 'FACTORS', 'Svc Roundtrip', 1.6)
    case 'Expedited': return getParam(params, 'FACTORS', 'Svc Expedited', 1.4)
    default:          return 1.0
  }
}

// ── TRAILER FACTOR ──────────────────────────────────────────────────────────
export function trailerFactor(trailer: string, params: ParamMap): number {
  switch (trailer) {
    case 'Dry Van':    return getParam(params, 'FACTORS', 'Trailer Dry Van', 1.0)
    case 'Flatbed':    return getParam(params, 'FACTORS', 'Trailer Flatbed', 1.3)
    case 'Overdim':    return getParam(params, 'FACTORS', 'Trailer Overdim', 1.8)
    case 'Hazmat':     return getParam(params, 'FACTORS', 'Trailer Hazmat', 1.2)
    case 'Reefer':     return getParam(params, 'FACTORS', 'Trailer Reefer', 1.5)
    case 'Chassis':    return getParam(params, 'FACTORS', 'Trailer Chassis', 1.15)
    case 'Power Only': return getParam(params, 'FACTORS', 'Trailer Power Only', 0.8)
    default:           return 1.0
  }
}

// ── DRIVER FACTOR ───────────────────────────────────────────────────────────
export function driverFactor(driver: string, params: ParamMap): number {
  switch (driver) {
    case 'Intrastate': return getParam(params, 'FACTORS', 'Driver Intrastate', 0.9)
    case 'Interstate': return getParam(params, 'FACTORS', 'Driver Interstate', 1.0)
    case 'B1':         return getParam(params, 'FACTORS', 'Driver B1', 1.15)
    case 'CDL':        return getParam(params, 'FACTORS', 'Driver CDL', 1.0)
    case 'Licencia E': return getParam(params, 'FACTORS', 'Driver Licencia E', 1.35)
    default:           return 1.0
  }
}

// ── REPOSITION (deadhead %) by market condition — USA leg ──────────────────
const REPOSITION: Record<string, number> = {
  'Very Tight': 0.03, 'Moderately Tight': 0.05, Balanced: 0.1,
  'Slightly Loose': 0.15, 'Very Loose': 0.25,
  // aliases
  'Slightly Tight': 0.05, Neutral: 0.1, 'Moderately Loose': 0.15,
}
export function repositionPct(condition: string): number {
  return REPOSITION[condition] ?? 0
}

// ── EQUIPMENT factors (Fuel, Fixed, Maint/Tires, Driver/Access) ─────────────
interface EquipFactors { fuel: number; fixed: number; maint: number; driver: number }
const EQUIPMENT: Record<string, EquipFactors> = {
  'Truck Trailer': { fuel: 1, fixed: 1, maint: 1, driver: 1 },
  Thorton:         { fuel: 1.33, fixed: 0.72, maint: 0.8, driver: 0.85 },
  Rabon:           { fuel: 1.75, fixed: 0.58, maint: 0.65, driver: 0.75 },
  '3.5 tons':      { fuel: 2.85, fixed: 0.38, maint: 0.45, driver: 0.55 },
  '1.5 tons':      { fuel: 3.5, fixed: 0.25, maint: 0.3, driver: 0.45 },
}
export function equipmentFactors(truckType: string): EquipFactors {
  return EQUIPMENT[truckType] ?? EQUIPMENT['Truck Trailer']
}
