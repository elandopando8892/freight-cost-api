import { describe, it, expect } from 'vitest'
import { calculateMexLeg } from '../src/modules/engine/engine.mex.js'
import { calculateUsaLeg } from '../src/modules/engine/engine.usa.js'
import { calculate } from '../src/modules/engine/engine.calculator.js'
import type { MexLegInput, UsaLegInput } from '../src/modules/engine/engine.types.js'

// Empty param map → engine uses the verified Freight Cost Model V3.0 defaults.
const params = {}

describe('MEX leg — Freight Cost Model V3.0 (mexLaneProd)', () => {
  // MX-RATE-PROD-2026-Q2-01: Monterrey → Nuevo Laredo, Flatbed, D2D Export, One Way, B1
  const mty: MexLegInput = {
    baseKm: 225,
    routeExpensesMxn: 0,
    baseHours: 0,
    operation: 'D2D Export',
    service: 'One Way',
    route: 'Straight & Danger',
    equipment: { truckType: 'Truck Trailer', trailer: 'Flatbed', config: 'Single', driver: 'B1' },
  }

  it('distances & timing', () => {
    const r = calculateMexLeg(mty, params)
    expect(r.loadedKm).toBe(225)
    expect(r.emptyKm).toBeCloseTo(33.75, 2)
    expect(r.totalKm).toBeCloseTo(258.75, 2)
    expect(r.loadedMiles).toBeCloseTo(139.81, 1)
    expect(r.totalMiles).toBeCloseTo(160.78, 1)
    expect(r.cycleDays).toBeCloseTo(0.33, 2)
  })

  it('CVU components', () => {
    const r = calculateMexLeg(mty, params)
    expect(r.blendedDieselUsdL).toBeCloseTo(1.523, 2)
    expect(r.fuelUsd).toBeCloseTo(145.37, 0)
    expect(r.maintTiresUsd).toBeCloseTo(60.76, 0)
    expect(r.driverUsd).toBeCloseTo(33.28, 1)   // B1 driver factor 1.15
    expect(r.borderUsd).toBe(200)
    expect(r.cvuUsd).toBeCloseTo(439.42, 0)
  })

  it('CFU (max of distance/time)', () => {
    const r = calculateMexLeg(mty, params)
    expect(r.cfuByDistanceUsd).toBeCloseTo(86.26, 0)
    expect(r.cfuByTimeUsd).toBeCloseTo(107.57, 0)
    expect(r.cfuUsd).toBeCloseTo(107.57, 0)
  })

  it('production → technical tariff', () => {
    const r = calculateMexLeg(mty, params)
    expect(r.productionCostUsd).toBeCloseTo(546.98, 0)
    expect(r.utMargin).toBe(0.3)
    expect(r.technicalTariffUsd).toBeCloseTo(781.41, 0)
  })

  it('risk adjustments', () => {
    const r = calculateMexLeg(mty, params)
    expect(r.routeRiskUsd).toBeCloseTo(10.31, 0)
    expect(r.trailerRiskUsd).toBeCloseTo(164.10, 0)
    expect(r.flatbedComplexityUsd).toBeCloseTo(136.75, 0)
    expect(r.securityRiskUsd).toBeCloseTo(13.67, 0)
    expect(r.operationRiskUsd).toBeCloseTo(82.05, 0)
    expect(r.totalRiskAdjUsd).toBeCloseTo(406.87, 0)
  })

  it('Carrier Required Tariff = MROUND(1188.28, 100) = $1,200', () => {
    const r = calculateMexLeg(mty, params)
    expect(r.requiredTariffUsd).toBe(1200)
    expect(r.rpm).toBeCloseTo(6.56, 1)
    expect(r.fsc).toBeCloseTo(0.90, 1)
  })

  it('Dry Van variant lands below Flatbed', () => {
    const dv = calculateMexLeg({ ...mty, equipment: { ...mty.equipment, trailer: 'Dry Van' } }, params)
    const fb = calculateMexLeg(mty, params)
    expect(dv.requiredTariffUsd).toBeLessThan(fb.requiredTariffUsd)
  })

  // MEX backhaul KEEPS its CFU (max distance/time) — verified vs V3.0 mexLaneProd row
  // "Nuevo Laredo, Tamaulipas - Queretaro, Queretaro ... D2D Import Backhaul B1" = $1,400.
  it('MEX backhaul keeps CFU → Nuevo Laredo→Queretaro D2D Import = $1,400', () => {
    const r = calculateMexLeg({
      baseKm: 910, routeExpensesMxn: 0, baseHours: 0,
      operation: 'D2D Import', service: 'Backhaul', route: 'Straight & Danger',
      equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' },
    }, params)
    expect(r.cfuUsd).toBeCloseTo(303.37, 0)   // CFU NOT zeroed on backhaul (vs USA leg which is)
    expect(r.loadedMiles).toBeCloseTo(565.4, 1)
    expect(r.requiredTariffUsd).toBe(1400)
    expect(r.rpm).toBeCloseTo(1.56, 1)
    expect(r.fsc).toBeCloseTo(0.92, 1)
  })

  it('carrier edits a cost card → cost moves (their own economics)', () => {
    const base = calculateMexLeg(mty, params)
    // Carrier raises tractor value $220k → $400k (more depreciation/finance → higher fixed cost)
    const pricier = calculateMexLeg(mty, { 'COST_CAPITAL__PU Tracto': 400000 })
    expect(pricier.cfuUsd).toBeGreaterThan(base.cfuUsd)
    // Carrier raises their insurance premium → fixed cost up
    const moreInsurance = calculateMexLeg(mty, { 'COST_INSURANCE__Poliza x Vehiculo': 24000 })
    expect(moreInsurance.cfuUsd).toBeGreaterThan(base.cfuUsd)
    // Carrier buys cheaper tires → maint/tires down
    const cheaperTires = calculateMexLeg(mty, { 'COST_TIRES__PU Traccion': 300 })
    expect(cheaperTires.maintTiresUsd).toBeLessThan(base.maintTiresUsd)
  })
})

describe('USA leg — Freight Cost Model V3.0 (usaLaneProd)', () => {
  // US-RATE-PROD-2026-Q2-520: Laredo → Dallas, Flatbed, D2D Export, One Way, B1
  const lrd: UsaLegInput = {
    loadedMiles: 435,
    transitDaysRaw: 0,
    driverExpenses: 0,
    outState: 'TX',
    dieselUsdGal: 5.152,
    fscUsdMile: 0.8,
    originCondition: 'Very Tight',
    destCondition: 'Very Tight',
    operation: 'D2D Export',
    service: 'One Way',
    equipment: { truckType: 'Truck Trailer', trailer: 'Flatbed', config: 'Single', driver: 'B1' },
  }

  it('CVU / CFU / technical', () => {
    const r = calculateUsaLeg(lrd, params)
    expect(r.totalOperationalMiles).toBeCloseTo(461.1, 0)
    expect(r.fuelCostUsd).toBeCloseTo(358.15, 0)
    expect(r.driverCostUsd).toBeCloseTo(318.16, 0)
    expect(r.maintTiresUsd).toBeCloseTo(174.27, 0)
    expect(r.cvuInclFuelUsd).toBeCloseTo(850.57, 0)
    expect(r.cfuUsd).toBeCloseTo(48.90, 0)
    expect(r.technicalTariffInclFuelUsd).toBeCloseTo(1284.96, 0)
  })

  it('risk → required ex-fuel → RPM/FSC → flat 1391', () => {
    const r = calculateUsaLeg(lrd, params)
    expect(r.trailerRiskUsd).toBeCloseTo(269.84, 0)
    expect(r.requiredTariffExFuelUsd).toBeCloseTo(1043.16, 0)
    expect(r.rpm).toBeCloseTo(2.398, 1)
    expect(r.fsc).toBe(0.8)
    expect(r.flatUsd).toBeCloseTo(1391, 0)
  })
})

describe('Cross-border assembly — Monterrey → Dallas Flatbed D2D Export = $2,600', () => {
  const equipment = { truckType: 'Truck Trailer', trailer: 'Flatbed', config: 'Single', driver: 'B1' }
  it('sums MX flat 1200 + USA flat 1391 → MROUND 2600', () => {
    const r = calculate({
      operation: 'D2D Export', service: 'One Way', equipment, params,
      mexLeg: { baseKm: 225, routeExpensesMxn: 0, baseHours: 0, operation: 'D2D Export', service: 'One Way', route: 'Straight & Danger', equipment },
      usaLeg: {
        loadedMiles: 435, transitDaysRaw: 0, driverExpenses: 0, outState: 'TX',
        dieselUsdGal: 5.152, fscUsdMile: 0.8, originCondition: 'Very Tight', destCondition: 'Very Tight',
        operation: 'D2D Export', service: 'One Way', equipment,
      },
    })
    expect(r.mexLeg?.requiredTariffUsd).toBe(1200)
    expect(r.usaLeg?.flatUsd).toBeCloseTo(1391, 0)
    expect(r.freightBaselineUsd).toBe(2600)
  })

  it('commercial layer: cost floor < sell tiers, margin & flags', () => {
    const r = calculate({
      operation: 'D2D Export', service: 'One Way', equipment, params,
      mexLeg: { baseKm: 225, routeExpensesMxn: 0, baseHours: 0, operation: 'D2D Export', service: 'One Way', route: 'Straight & Danger', equipment },
      usaLeg: {
        loadedMiles: 435, transitDaysRaw: 0, driverExpenses: 0, outState: 'TX',
        dieselUsdGal: 5.152, fscUsdMile: 0.8, originCondition: 'Very Tight', destCondition: 'Very Tight',
        operation: 'D2D Export', service: 'One Way', equipment,
      },
    })
    const c = r.commercial
    expect(c.costFloorUsd).toBeGreaterThan(0)
    expect(c.recommendedSellUsd).toBe(2600)
    // sell tiers ordered min < target < premium
    expect(c.minSellUsd).toBeLessThan(c.targetSellUsd)
    expect(c.targetSellUsd).toBeLessThan(c.premiumSellUsd)
    // recommended ($2,600) above cost floor → positive margin, no No-Go
    expect(c.grossProfitUsd).toBeGreaterThan(0)
    expect(c.grossMarginPct).toBeGreaterThan(0)
    expect(c.noGoFlag).toBe(false)
    expect(c.gpPerLoadedMileUsd).toBeGreaterThan(0)
    // recommended lane is clean: none of the V3.0 validations fire on defaults
    expect(c.reviewFlag).toBe(false)
    expect(c.notes).toHaveLength(0)
  })
})
