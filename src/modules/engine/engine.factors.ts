/**
 * Factor lookup tables — mirror the d2dFactors sheet exactly.
 * Every value reads from the assumption ParamMap (FACTORS section) and falls
 * back to the verified spreadsheet default when the param is absent.
 */
import { getParam, type ParamMap } from '../assumptions/assumptions.service.js'
import type { MarketCondition } from './engine.types.js'

// ── PERFORMANCE FACTOR (km/L by truck type) ────────────────────────────────
export function performanceFactor(truckType: string, params: ParamMap): number {
  switch (truckType) {
    case '1.5 tons':     return getParam(params, 'FACTORS', 'Perf Factor 1.5 tons', 12.5)
    case '3.5 tons':     return getParam(params, 'FACTORS', 'Perf Factor 3.5 tons', 10)
    case 'Rabon':        return getParam(params, 'FACTORS', 'Perf Factor Rabon', 5)
    case 'Thorton':      return getParam(params, 'FACTORS', 'Perf Factor Thorton', 4)
    default:             return getParam(params, 'FACTORS', 'Perf Factor Truck Trailer', 3) // Truck Trailer
  }
}

// ── TRAILER FACTOR ─────────────────────────────────────────────────────────
export function trailerFactor(trailerType: string, params: ParamMap): number {
  switch (trailerType) {
    case 'Flatbed':    return getParam(params, 'FACTORS', 'Trailer Factor Flatbed', 1.25)
    case 'Reefer':     return getParam(params, 'FACTORS', 'Trailer Factor Reefer', 2.0)
    case 'Hazmat':     return getParam(params, 'FACTORS', 'Trailer Factor Hazmat', 1.5)
    case 'Overdim':    return getParam(params, 'FACTORS', 'Trailer Factor Overdim', 5.0)
    case 'Chassis':    return getParam(params, 'FACTORS', 'Trailer Factor Chassis', 1.0)
    case 'Power Only': return getParam(params, 'FACTORS', 'Trailer Factor Power Only', 0.8)
    default:           return getParam(params, 'FACTORS', 'Trailer Factor Dry Van', 1.0)
  }
}

// ── OPERATION FACTOR ───────────────────────────────────────────────────────
export function operationFactor(operationType: string, params: ParamMap): number {
  switch (operationType) {
    case 'D2D Export':    return getParam(params, 'FACTORS', 'Op Factor D2D Export', 1.2)
    case 'D2D Import':    return getParam(params, 'FACTORS', 'Op Factor D2D Import', 0.7)
    case 'MX Southbound': return getParam(params, 'FACTORS', 'Op Factor MX Southbound', 0.5)
    case 'Local':         return getParam(params, 'FACTORS', 'Op Factor Local', 0.25)
    case 'MX Northbound': return getParam(params, 'FACTORS', 'Op Factor MX Northbound', 1.0)
    case 'Drayage':       return getParam(params, 'FACTORS', 'Op Factor Drayage', 1.0)
    default:              return getParam(params, 'FACTORS', 'Op Factor Intra-Mex', 1.0)
  }
}

// ── SERVICE FACTOR ─────────────────────────────────────────────────────────
export function serviceFactor(serviceType: string, params: ParamMap): number {
  switch (serviceType) {
    case 'Backhaul':  return getParam(params, 'FACTORS', 'Svc Factor Backhaul', 0.4)
    case 'Roundtrip': return getParam(params, 'FACTORS', 'Svc Factor Roundtrip', 1.5)
    case 'Expedited': return getParam(params, 'FACTORS', 'Svc Factor Expedited', 2.0)
    default:          return getParam(params, 'FACTORS', 'Svc Factor One Way', 1.0)
  }
}

// ── MODE / CONFIG FACTOR ───────────────────────────────────────────────────
export function configFactor(config: string, params: ParamMap): number {
  if (config === 'Tandem') return getParam(params, 'FACTORS', 'Config Factor Tandem', 1.3)
  return getParam(params, 'FACTORS', 'Config Factor Single', 1.0)
}

// ── DRIVER FACTOR ──────────────────────────────────────────────────────────
export function driverFactor(driverType: string, params: ParamMap): number {
  if (driverType === 'Licencia E') return getParam(params, 'FACTORS', 'Driver Factor Licencia E', 1.25)
  return getParam(params, 'FACTORS', 'Driver Factor B1', 1.0) // B1 / Interstate / Intrastate all = 1.0
}

// ── LANE FACTOR (route geometry / danger) ──────────────────────────────────
export function laneFactor(routeType: string, params: ParamMap): number {
  switch (routeType) {
    case 'Mostly Curvy':
    case 'Curvy & Danger':  return getParam(params, 'FACTORS', 'Lane Factor Curvy', 1.5)
    case 'Mixed Lane':
    case 'Mixed & Danger':  return getParam(params, 'FACTORS', 'Lane Factor Mixed', 1.25)
    default:                return getParam(params, 'FACTORS', 'Lane Factor Straight', 1.0)
  }
}

// ── MARGIN by km tier (MEX leg) ────────────────────────────────────────────
// Verified effective tiers from d2d_mexRateProduction: <501→.40 .. <3001→.20, ≥3001→.15
export function kmTierMargin(km: number, params: ParamMap): number {
  if (km < getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 1 Max', 501))
    return getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 1 Margin', 0.4)
  if (km < getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 2 Max', 1001))
    return getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 2 Margin', 0.35)
  if (km < getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 3 Max', 1501))
    return getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 3 Margin', 0.3)
  if (km < getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 4 Max', 2001))
    return getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 4 Margin', 0.25)
  if (km < getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 5 Max', 3001))
    return getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 5 Margin', 0.2)
  return getParam(params, 'TECHNICAL_MARGIN', 'Tier KM 6 Margin', 0.15)
}

// ── MARKUP by mileage tier (USA leg) ───────────────────────────────────────
// d2d_usaRateProduction Q: <501→.6, <1001→.5, <1501→.4, <2001→.3, <2501→.2, ≥2501→.15
export function mileageMarkup(miles: number, params: ParamMap): number {
  if (miles < getParam(params, 'USA_MARKUP', 'Tier MI 1 Max', 501))
    return getParam(params, 'USA_MARKUP', 'Tier MI 1 Markup', 0.6)
  if (miles < getParam(params, 'USA_MARKUP', 'Tier MI 2 Max', 1001))
    return getParam(params, 'USA_MARKUP', 'Tier MI 2 Markup', 0.5)
  if (miles < getParam(params, 'USA_MARKUP', 'Tier MI 3 Max', 1501))
    return getParam(params, 'USA_MARKUP', 'Tier MI 3 Markup', 0.4)
  if (miles < getParam(params, 'USA_MARKUP', 'Tier MI 4 Max', 2001))
    return getParam(params, 'USA_MARKUP', 'Tier MI 4 Markup', 0.3)
  if (miles < getParam(params, 'USA_MARKUP', 'Tier MI 5 Max', 2501))
    return getParam(params, 'USA_MARKUP', 'Tier MI 5 Markup', 0.2)
  return getParam(params, 'USA_MARKUP', 'Tier MI 6 Markup', 0.15)
}

// ── DEADHEAD miles by market condition + trailer type (USA leg) ─────────────
// d2d_usaRateProduction U/X IFS tables.
const DEADHEAD: Record<string, Record<MarketCondition, number>> = {
  'Dry Van': {
    'Very Tight': 25, 'Moderately Tight': 50, 'Slightly Tight': 75, Neutral: 100,
    'Slightly Loose': 125, 'Moderately Loose': 150, 'Very Loose': 200,
  },
  Flatbed: {
    'Very Tight': 100, 'Moderately Tight': 200, 'Slightly Tight': 250, Neutral: 300,
    'Slightly Loose': 400, 'Moderately Loose': 500, 'Very Loose': 600,
  },
  Reefer: {
    'Very Tight': 100, 'Moderately Tight': 200, 'Slightly Tight': 250, Neutral: 300,
    'Slightly Loose': 350, 'Moderately Loose': 400, 'Very Loose': 500,
  },
}

export function deadheadMiles(trailerType: string, condition: MarketCondition): number {
  const table = DEADHEAD[trailerType] ?? DEADHEAD['Dry Van']
  return table[condition] ?? 0
}
