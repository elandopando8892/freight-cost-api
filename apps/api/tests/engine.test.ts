import { describe, it, expect } from 'vitest'
import { calculateMexLeg } from '../src/modules/engine/engine.mex.js'
import { calculateUsaLeg } from '../src/modules/engine/engine.usa.js'
import { calculateDrayageLeg } from '../src/modules/engine/engine.drayage.js'
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

  // Post-E2: short-haul floors (baseKm=225 → short-haul band) push emptyKm to
  // the 40km min and cycleDays to the 0.5-day billable floor. Numbers shift up
  // vs the raw sheet (which lacked these floors) — this is the model asenting.
  it('distances & timing', () => {
    const r = calculateMexLeg(mty, params)
    expect(r.loadedKm).toBe(225)
    expect(r.emptyKm).toBeCloseTo(40, 2)
    expect(r.totalKm).toBeCloseTo(265, 2)
    expect(r.loadedMiles).toBeCloseTo(139.81, 1)
    expect(r.totalMiles).toBeCloseTo(164.66, 1)
    expect(r.cycleDays).toBeCloseTo(0.5, 2)   // billable-day floor for short-haul
  })

  it('CVU components', () => {
    const r = calculateMexLeg(mty, params)
    expect(r.blendedDieselUsdL).toBeCloseTo(1.523, 2)
    expect(r.fuelUsd).toBeCloseTo(148.49, 0)
    expect(r.maintTiresUsd).toBeCloseTo(62.23, 0)
    expect(r.driverUsd).toBeCloseTo(34.09, 1)   // B1 driver factor 1.15
    expect(r.borderUsd).toBe(200)
    expect(r.cvuUsd).toBeCloseTo(444.81, 0)
  })

  it('CFU (max of distance/time)', () => {
    const r = calculateMexLeg(mty, params)
    expect(r.cfuByDistanceUsd).toBeCloseTo(88.35, 0)
    expect(r.cfuByTimeUsd).toBeCloseTo(162.98, 0)   // ↑ vs old 107.57: day floor 0.5 vs 0.33
    expect(r.cfuUsd).toBeCloseTo(162.98, 0)
  })

  it('production → technical tariff', () => {
    const r = calculateMexLeg(mty, params)
    expect(r.productionCostUsd).toBeCloseTo(607.79, 0)
    expect(r.utMargin).toBe(0.3)
    expect(r.technicalTariffUsd).toBeCloseTo(868.28, 0)
  })

  it('risk adjustments', () => {
    const r = calculateMexLeg(mty, params)
    expect(r.routeRiskUsd).toBeCloseTo(10.54, 0)
    expect(r.trailerRiskUsd).toBeCloseTo(182.34, 0)
    expect(r.flatbedComplexityUsd).toBeCloseTo(151.95, 0)
    expect(r.securityRiskUsd).toBeCloseTo(15.19, 0)
    expect(r.operationRiskUsd).toBeCloseTo(91.17, 0)
    expect(r.totalRiskAdjUsd).toBeCloseTo(451.19, 0)
  })

  it('Carrier Required Tariff (post-E2 floors) = MROUND(1319.47, 100) = $1,300', () => {
    const r = calculateMexLeg(mty, params)
    expect(r.requiredTariffUsd).toBe(1300)
    expect(r.rpm).toBeCloseTo(6.99, 1)
    expect(r.fsc).toBeCloseTo(0.90, 1)
  })

  it('Dry Van variant lands below Flatbed', () => {
    const dv = calculateMexLeg({ ...mty, equipment: { ...mty.equipment, trailer: 'Dry Van' } }, params)
    const fb = calculateMexLeg(mty, params)
    expect(dv.requiredTariffUsd).toBeLessThan(fb.requiredTariffUsd)
  })

  // MEX backhaul KEEPS its CFU (max distance/time) — verified vs V3.0 mexLaneProd row
  // "Nuevo Laredo, Tamaulipas - Queretaro, Queretaro ... D2D Import Backhaul B1" = $1,400.
  // Post-E6: backhaul now carries residual deadhead (default 50% of one-way).
  // Physical costs stay real; only UT and expected deadhead are backhaul-modified.
  it('MEX backhaul (post-E6) → Nuevo Laredo→Queretaro D2D Import = $1,500', () => {
    const r = calculateMexLeg({
      baseKm: 910, routeExpensesMxn: 0, baseHours: 0,
      operation: 'D2D Import', service: 'Backhaul', route: 'Straight & Danger',
      equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' },
    }, params)
    expect(r.emptyKm).toBeCloseTo(68.25, 1)   // 910 × 0.15 × 0.5 backhaul factor
    expect(r.cfuUsd).toBeCloseTo(326.13, 0)   // CFU NOT zeroed on backhaul
    expect(r.loadedMiles).toBeCloseTo(565.4, 1)
    expect(r.requiredTariffUsd).toBe(1500)
    expect(r.rpm).toBeCloseTo(1.56, 1)
    expect(r.fsc).toBeCloseTo(0.91, 1)
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

describe('Cross-border assembly — Monterrey → Dallas Flatbed D2D Export = $2,700 (post-E2)', () => {
  const equipment = { truckType: 'Truck Trailer', trailer: 'Flatbed', config: 'Single', driver: 'B1' }
  it('sums MX flat 1300 + USA flat 1391 → MROUND 2700', () => {
    const r = calculate({
      operation: 'D2D Export', service: 'One Way', equipment, params,
      mexLeg: { baseKm: 225, routeExpensesMxn: 0, baseHours: 0, operation: 'D2D Export', service: 'One Way', route: 'Straight & Danger', equipment },
      usaLeg: {
        loadedMiles: 435, transitDaysRaw: 0, driverExpenses: 0, outState: 'TX',
        dieselUsdGal: 5.152, fscUsdMile: 0.8, originCondition: 'Very Tight', destCondition: 'Very Tight',
        operation: 'D2D Export', service: 'One Way', equipment,
      },
    })
    expect(r.mexLeg?.requiredTariffUsd).toBe(1300)
    expect(r.usaLeg?.flatUsd).toBeCloseTo(1391, 0)
    expect(r.freightBaselineUsd).toBe(2700)
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
    expect(c.recommendedSellUsd).toBe(2700)
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

describe('ReferenceKey — byte-exact vs V3.0 (mexLaneProd!CL / usaLaneProd!BV)', () => {
  const equipment = { truckType: 'Truck Trailer', trailer: 'Flatbed', config: 'Single', driver: 'B1' }

  it('MEX leg homologates MX state + key matches the sheet', () => {
    const r = calculateMexLeg({
      baseKm: 225, routeExpensesMxn: 0, baseHours: 0,
      operation: 'D2D Export', service: 'One Way', route: 'Straight & Danger', equipment,
      origin: 'Monterrey, Nuevo Leon', dest: 'Nuevo Laredo, Tamaulipas',
    }, {})
    expect(r.referenceKey).toBe('MONTERREY, NL - NUEVO LAREDO, TM TRUCK TRAILER FLATBED SINGLE D2D EXPORT ONE WAY B1')
  })

  it('USA leg key matches the sheet, normalizing Backhaul → One Way', () => {
    const r = calculateUsaLeg({
      loadedMiles: 1994, transitDaysRaw: 3, driverExpenses: 300, outState: 'NY',
      dieselUsdGal: 5.863, fscUsdMile: 0.94, originCondition: 'Neutral', destCondition: 'Very Tight',
      operation: 'D2D Import', service: 'Backhaul',
      equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' },
      origin: 'Brooklyn, NY', dest: 'Laredo, TX',
    }, {})
    expect(r.referenceKey).toBe('BROOKLYN, NY - LAREDO, TX TRUCK TRAILER DRY VAN SINGLE D2D IMPORT ONE WAY B1')
  })

  it('no origin/dest → empty key (back-compat for direct calls)', () => {
    const r = calculateMexLeg({ baseKm: 225, operation: 'D2D Export', service: 'One Way', route: 'Straight & Danger', equipment }, {})
    expect(r.referenceKey).toBe('')
  })
})

// Locks Freight Cost Model V3.0 finding #9: UT is a MARGIN OVER PRICE, not a
// markup over cost. If someone regresses to `cost × (1 + UT)`, realized margin
// becomes UT / (1 + UT) — e.g. UT=15% would only yield 13.04% real margin. The
// engine uses `cost / (1 − UT)`, so utility ÷ tariff must equal UT exactly.
describe('UT semantics — margen sobre precio (no markup sobre costo)', () => {
  const equipment = { truckType: 'Truck Trailer', trailer: 'Flatbed', config: 'Single', driver: 'B1' }

  it('MEX leg (One Way, UT ~0.30): utility ÷ tariff = utMargin', () => {
    const r = calculateMexLeg({
      baseKm: 225, operation: 'D2D Export', service: 'One Way', route: 'Straight & Danger', equipment,
    }, {})
    const realMargin = r.technicalUtilityUsd / r.technicalTariffUsd
    expect(realMargin).toBeCloseTo(r.utMargin, 6)
    expect(r.technicalTariffUsd).toBeCloseTo(r.productionCostUsd / (1 - r.utMargin), 4)
  })

  it('MEX leg (Backhaul, UT ~0.10): utility ÷ tariff = utMargin', () => {
    const r = calculateMexLeg({
      baseKm: 225, operation: 'D2D Import', service: 'Backhaul', route: 'Straight & Danger', equipment,
    }, {})
    const realMargin = r.technicalUtilityUsd / r.technicalTariffUsd
    expect(realMargin).toBeCloseTo(r.utMargin, 6)
  })

  it('USA leg: (technicalTariff − (cvu + cfu)) ÷ technicalTariff = utRate', () => {
    const r = calculateUsaLeg({
      loadedMiles: 435, dieselUsdGal: 5.152, fscUsdMile: 0.8,
      originCondition: 'Very Tight', destCondition: 'Very Tight',
      operation: 'D2D Export', service: 'One Way',
      equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' },
    }, {})
    const cost = r.cvuInclFuelUsd + r.cfuUsd
    const utility = r.technicalTariffInclFuelUsd - cost
    const realMargin = utility / r.technicalTariffInclFuelUsd
    expect(realMargin).toBeCloseTo(r.utRate, 6)
  })
})

// E6 finding: backhaul must not zero physical costs. It reduces expected deadhead
// (backhaulDeadheadFactor × one-way) and applies a lower UT — but km driven still
// have real fuel/maint/CFU. Setting the factor to 0 recovers the pre-E6 zero-
// deadhead behavior for a confirmed same-origin return.
describe('E6 — Backhaul semantic (deadhead scaled, physical costs preserved)', () => {
  const equipment = { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' }
  const base = { baseKm: 910, operation: 'D2D Import', route: 'Straight & Danger', equipment } as const

  it('factor=0 recovers pre-E6 zero-deadhead (confirmed backhaul)', () => {
    const r = calculateMexLeg({ ...base, service: 'Backhaul' },
      { 'UTILIZATION__Backhaul Deadhead Factor': 0 })
    // Long-haul (baseKm 910) → no E2 floor. factor 0 → no deadhead at all.
    expect(r.emptyKm).toBe(0)
  })

  it('default factor = 0.5 → backhaul deadhead is half of one-way', () => {
    const oneWay = calculateMexLeg({ ...base, service: 'One Way' }, {})
    const backhaul = calculateMexLeg({ ...base, service: 'Backhaul' }, {})
    // One-way deadhead = 0.15 × 910 = 136.5; backhaul default = 0.5 × 136.5 = 68.25
    expect(backhaul.emptyKm).toBeCloseTo(oneWay.emptyKm * 0.5, 1)
    // Backhaul is NOT cheaper because physical costs go away — CFU (time-based)
    // stays high; only UT drops (0.10 vs 0.30). The required tariff is lower
    // because of UT, not because we pretended the truck didn't move.
    expect(backhaul.utMargin).toBeLessThan(oneWay.utMargin)
    expect(backhaul.cfuUsd).toBeGreaterThan(0)
  })
})

// E4 finding #4/#5: drayage is a physical cycle, not FTL + a chassis surcharge.
// The cost sums real legs (port pickup + loaded linehaul + empty return + final
// reposition), separate chassis cost, billable time floor, and CONDITIONAL
// container return (port / interior drop-off / none).
describe('E4 — Drayage Cycle Engine', () => {
  const eq = { truckType: 'Truck Trailer', trailer: 'Chassis', config: 'Single', driver: 'Interstate' }
  const base = { loadedMiles: 40, dieselUsdGal: 5.0, fscUsdMile: 0.5, outState: 'CA', operation: 'Drayage', service: 'One Way', equipment: eq } as const

  it('sums real cycle legs: pickup + loaded + empty return + reposition', () => {
    const r = calculateDrayageLeg({ ...base }, {})
    // pickup 40×0.2=8, return-to-port 40, reposition 40×0.1=4 → empty 52; loaded 40; total 92
    expect(r.loadedMiles).toBe(40)
    expect(r.emptyMiles).toBeCloseTo(52, 1)
    expect(r.totalOperationalMiles).toBeCloseTo(92, 1)
    expect(r.drayageCycle?.portPickupMiles).toBeCloseTo(8, 1)
    expect(r.drayageCycle?.finalRepositionMiles).toBeCloseTo(4, 1)
  })

  it('conditional container return: none < drop-off < return-to-port', () => {
    const noReturn = calculateDrayageLeg({ ...base, emptyReturnRequired: false }, {})
    const dropOff = calculateDrayageLeg({ ...base, emptyReturnRequired: true, dropOff: true }, {})
    const toPort = calculateDrayageLeg({ ...base, emptyReturnRequired: true }, {})
    expect(noReturn.drayageCycle?.returnMode).toBe('none')
    expect(dropOff.drayageCycle?.returnMode).toBe('drop-off')
    expect(toPort.drayageCycle?.returnMode).toBe('port')
    // Physical: no return cheapest, full return to port dearest
    expect(noReturn.emptyMiles).toBeLessThan(dropOff.emptyMiles)
    expect(dropOff.emptyMiles).toBeLessThan(toPort.emptyMiles)
    expect(noReturn.requiredTariffUsd).toBeLessThanOrEqual(toPort.requiredTariffUsd)
  })

  it('unspecified return is flagged assumed-port (not silently zeroed or doubled)', () => {
    const r = calculateDrayageLeg({ ...base }, {})
    expect(r.drayageCycle?.returnMode).toBe('assumed-port')
    expect(r.emptyMiles).toBeGreaterThan(0)   // NOT zeroed
  })

  it('chassis is a separate cost line, and the billable-day floor applies', () => {
    const r = calculateDrayageLeg({ ...base }, {})
    expect(r.drayageCycle?.chassisCostUsd).toBeGreaterThan(0)  // chassis/day, not a % markup
    expect(r.cycleDays).toBeGreaterThanOrEqual(1)              // billable floor for the short cycle
  })

  it('calculator routes Drayage to the cycle engine (usaLeg slot carries drayageCycle)', () => {
    const r = calculate({
      operation: 'Drayage', service: 'One Way', equipment: eq, params: {},
      usaLeg: {
        loadedMiles: 40, dieselUsdGal: 5.0, fscUsdMile: 0.5, outState: 'CA',
        originCondition: 'Balanced', destCondition: 'Balanced',
        operation: 'Drayage', service: 'One Way', equipment: eq,
      },
    })
    expect(r.usaLeg?.drayageCycle).toBeDefined()          // proves the drayage engine ran
    expect(r.usaLeg?.drayageCycle?.returnMode).toBe('assumed-port')
    expect(r.freightBaselineUsd).toBeGreaterThan(0)
  })
})

// E3 finding #6: Roundtrip must be 2 real physical legs, not a multiplier.
// Loaded return contributes to loadedKm; empty (deadhead) return contributes to
// emptyKm; the load/unload cycle count doubles when both legs are loaded.
describe('E3 — Roundtrip 2-leg physics', () => {
  const equipment = { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' }

  it('Empty return: only outbound is loaded; return adds deadhead; fewer load/unload cycles', () => {
    const rtLoaded = calculateMexLeg({
      baseKm: 500, operation: 'D2D Import', service: 'Roundtrip', route: 'Straight & Danger', equipment,
    }, {})
    const rtEmpty = calculateMexLeg({
      baseKm: 500, operation: 'D2D Import', service: 'Roundtrip', route: 'Straight & Danger', equipment,
      returnLoaded: false,
    }, {})
    expect(rtLoaded.loadedKm).toBe(1000)              // 2 × baseKm
    expect(rtEmpty.loadedKm).toBe(500)                // outbound only
    expect(rtEmpty.emptyKm).toBeGreaterThan(rtLoaded.emptyKm)  // deadhead return
    expect(rtLoaded.cycleDays).toBeGreaterThan(rtEmpty.cycleDays)  // 2× load/unload
  })

  it('Asymmetric distance: loadedKm = baseKm + returnKm when both legs loaded', () => {
    const r = calculateMexLeg({
      baseKm: 400, operation: 'D2D Import', service: 'Roundtrip', route: 'Straight & Danger', equipment,
      returnKm: 350,  // return to a different point
    }, {})
    expect(r.loadedKm).toBe(750)   // 400 + 350
  })
})
