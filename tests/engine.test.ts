import { describe, it, expect } from 'vitest'
import { calculate } from '../src/modules/engine/engine.calculator.js'
import { calculateMexLeg } from '../src/modules/engine/engine.mex.js'
import { calculateUsaLeg } from '../src/modules/engine/engine.usa.js'
import type { EquipmentSpec, MarketSnapshot } from '../src/modules/engine/engine.types.js'

// Empty param map → engine falls back to the verified spreadsheet defaults.
const params = {}
// Spreadsheet base model: FX = 1, US border diesel = 0.95 USD/L
const market: MarketSnapshot = { fxRate: 1, dieselUsUsdL: 0.95 }

const dryVan: EquipmentSpec = { truckType: 'Truck Trailer', trailerType: 'Dry Van', config: 'Single', driverType: 'B1' }
const flatbed: EquipmentSpec = { truckType: 'Truck Trailer', trailerType: 'Flatbed', config: 'Single', driverType: 'B1' }

describe('MEX leg — d2d_mexRateProduction', () => {
  it('Mexico DF → Nuevo Laredo, 1120km, Dry Van, D2D Export → PVT 1803.04', () => {
    const leg = calculateMexLeg(
      { km: 1120, transitHrs: 27, driverExpenses: 964.2857, routeType: 'Straight & Danger' },
      dryVan, 'D2D Export', 'One Way', params, market,
    )
    expect(leg.cbtt).toBeCloseTo(901.29, 1)
    expect(leg.cit).toBeCloseTo(997.72, 1)
    expect(leg.tbt).toBeCloseTo(1268.11, 1)
    expect(leg.pvt).toBeCloseTo(1803.04, 1)
  })

  it('MTY → Nuevo Laredo, 225km, Flatbed, D2D Export → PVT 595.02', () => {
    const leg = calculateMexLeg(
      { km: 225, transitHrs: 4, driverExpenses: 142.8571, routeType: 'Straight & Danger' },
      flatbed, 'D2D Export', 'One Way', params, market,
    )
    expect(leg.cbfa).toBeCloseTo(49.04, 1)
    expect(leg.cbvr).toBeCloseTo(150.21, 1)
    expect(leg.cbtt).toBeCloseTo(279.26, 1)
    expect(leg.cagv).toBe(0)              // route < 251 km → no travel per-diem
    expect(leg.margenPct).toBe(0.4)       // route < 501 km
    expect(leg.emtr).toBeCloseTo(69.81, 1) // Flatbed +25%
    expect(leg.emto).toBeCloseTo(55.85, 1) // D2D Export +20%
    expect(leg.pvt).toBeCloseTo(595.02, 1)
  })

  it('Aguascalientes → Nuevo Laredo, 787km, Dry Van → PVT 1380.20', () => {
    const leg = calculateMexLeg(
      { km: 787, transitHrs: 22, driverExpenses: 785.7142, routeType: 'Straight & Danger' },
      dryVan, 'D2D Export', 'One Way', params, market,
    )
    expect(leg.margenPct).toBe(0.35)      // 501 ≤ km < 1001
    expect(leg.pvt).toBeCloseTo(1380.2, 0)
  })
})

describe('USA leg — d2d_usaRateProduction', () => {
  it('St Johns → Laredo, 3681mi, Dry Van, D2D Import → FreightSale 4564.41', () => {
    const leg = calculateUsaLeg(
      {
        miles: 3681, routeExpenses: 600, marketRpm: 1.58,
        outboundCondition: 'Very Loose', fscOriginUsdMile: 0, fscDestUsdMile: 0.41,
      },
      dryVan, 'D2D Import', params,
    )
    expect(leg.haulage).toBeCloseTo(3377.74, 1)
    expect(leg.linehaulSale).toBeCloseTo(3884.41, 1)
    expect(leg.odhFee).toBeCloseTo(80, 1)   // import: ODH from Very Loose DryVan = 200 × 0.4
    expect(leg.idhFee).toBe(0)              // import → IDH = 0
    expect(leg.freightSale).toBeCloseTo(4564.41, 1)
  })

  it('Laredo → Dallas, 435mi, Flatbed, D2D Export → FreightSale 979.01', () => {
    const leg = calculateUsaLeg(
      {
        miles: 435, routeExpenses: 0, marketRpm: 2.33,
        outboundCondition: 'Moderately Tight', fscOriginUsdMile: 0.41, fscDestUsdMile: 0.41,
      },
      flatbed, 'D2D Export', params,
    )
    expect(leg.haulage).toBeCloseTo(399.16, 1)
    expect(leg.markup).toBe(0.6)            // < 501 mi
    expect(leg.linehaulSale).toBeCloseTo(638.66, 1)
    expect(leg.odhFee).toBe(0)             // export → ODH = 0
    expect(leg.idhFee).toBeCloseTo(162, 1) // Flatbed Moderately Tight = 200 × (0.4+0.41)
    expect(leg.freightSale).toBeCloseTo(979.01, 1)
    expect(leg.marketRate).toBeCloseTo(1191.9, 1)
  })
})

describe('Cross-border assembly — quickRate', () => {
  it('MTY → Dallas, Flatbed, D2D Export → CrossborderRate 1724.03', () => {
    const r = calculate({
      operationType: 'D2D Export',
      serviceType: 'One Way',
      equipment: flatbed,
      params,
      market,
      mexLane: { km: 225, transitHrs: 4, driverExpenses: 142.8571, routeType: 'Straight & Danger' },
      usaLane: {
        miles: 435, routeExpenses: 0, marketRpm: 2.33,
        outboundCondition: 'Moderately Tight', fscOriginUsdMile: 0.41, fscDestUsdMile: 0.41,
      },
      borderCrossing: true,
    })
    expect(r.mexLeg?.pvt).toBeCloseTo(595.02, 1)
    expect(r.usaLeg?.freightSale).toBeCloseTo(979.01, 1)
    expect(r.freightPrice).toBeCloseTo(1574.03, 1)
    expect(r.borderFee).toBe(150)
    expect(r.crossborderRate).toBeCloseTo(1724.03, 1)
    expect(r.grossMargin).toBeGreaterThan(0)
    expect(r.grossMargin).toBeLessThan(1)
  })

  it('MX-only lane (Intra-Mex) runs only the MEX leg', () => {
    const r = calculate({
      operationType: 'Intra-Mex',
      serviceType: 'One Way',
      equipment: dryVan,
      params,
      market,
      mexLane: { km: 300, transitHrs: 6, driverExpenses: 214.2857, routeType: 'Straight & Danger' },
    })
    expect(r.mexLeg).not.toBeNull()
    expect(r.usaLeg).toBeNull()
    expect(r.borderFee).toBe(0)
    expect(r.crossborderRate).toBeCloseTo(r.mexLeg!.pvt, 4)
  })
})
