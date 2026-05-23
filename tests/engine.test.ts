import { describe, it, expect } from 'vitest'
import { calculate } from '../src/modules/engine/engine.calculator.js'
import { buildParamMap } from '../src/modules/assumptions/assumptions.service.js'
import { DEFAULT_ASSUMPTIONS } from '../prisma/seed/assumptions.seed.js'
import { EQUIPMENT_CATALOG } from '../prisma/seed/equipment.seed.js'
import type { Lane, EquipmentConfig } from '@prisma/client'

const params = buildParamMap(
  DEFAULT_ASSUMPTIONS.map((a) => ({ section: a.section, field: a.field, value: a.value })),
)

const market = { dieselMxMxnL: 28, dieselUsUsdL: 1.49, fxRate: 17.5 }

const baseLane: Lane = {
  id: 'test-lane-1',
  orgId: 'test-org',
  laneKey: 'abc123',
  origin: 'Monterrey, NL',
  destination: 'Laredo, TX',
  equipmentId: 'eq-1',
  operationType: 'D2D Export',
  serviceType: 'One Way',
  config: 'Single',
  isD2D: true,
  isDrayage: false,
  isRoundtrip: false,
  isBackhaul: false,
  baseKm: 250,
  returnKm: null,
  loadedMiles: null,
  transitDays: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const baseEquipment = EQUIPMENT_CATALOG.find(
  (e) => e.truckType === 'Truck Trailer' && e.trailerType === 'Dry Van' && e.config === 'Single',
) as EquipmentConfig & { id: string }

const equipment: EquipmentConfig = { id: 'eq-1', dispatchService: null, ...baseEquipment }

describe('Engine Calculator', () => {
  it('produces a positive required tariff for a basic D2D Export lane', () => {
    const result = calculate({ lane: baseLane, params, equipment, market })
    expect(result.requiredTariffUsd).toBeGreaterThan(0)
    expect(result.cvu.totalCvuUsd).toBeGreaterThan(0)
    expect(result.cfu.totalCfuUsd).toBeGreaterThan(0)
  })

  it('CVU > 0 and all components are non-negative', () => {
    const result = calculate({ lane: baseLane, params, equipment, market })
    expect(result.cvu.fuelUsd).toBeGreaterThan(0)
    expect(result.cvu.driverUsd).toBeGreaterThan(0)
    expect(result.cvu.maintTiresUsd).toBeGreaterThan(0)
    expect(result.cvu.borderUsd).toBeGreaterThan(0)
    expect(result.cvu.routeBufferUsd).toBeGreaterThan(0)
  })

  it('technical tariff = production cost × (1 + UT rate)', () => {
    const result = calculate({ lane: baseLane, params, equipment, market })
    const utRate = 0.3  // One Way default
    const expected = result.productionCostUsd * (1 + utRate)
    expect(result.technicalTariffUsd).toBeCloseTo(expected, 1)
  })

  it('required tariff >= technical tariff (risk adds to cost)', () => {
    const result = calculate({ lane: baseLane, params, equipment, market })
    expect(result.requiredTariffUsd).toBeGreaterThanOrEqual(result.technicalTariffUsd)
  })

  it('MXN tariff equals USD tariff × FX rate', () => {
    const result = calculate({ lane: baseLane, params, equipment, market })
    expect(result.requiredTariffMxn).toBeCloseTo(result.requiredTariffUsd * 17.5, 0)
  })

  it('tariff per loaded mile is reasonable (between $1 and $15 USD/mi for 250km lane)', () => {
    const result = calculate({ lane: baseLane, params, equipment, market })
    expect(result.tariffPerLoadedMile).toBeGreaterThan(1)
    expect(result.tariffPerLoadedMile).toBeLessThan(15)
  })

  it('carrier margin is between 0% and 50%', () => {
    const result = calculate({ lane: baseLane, params, equipment, market })
    expect(result.carrierMargin).toBeGreaterThan(0)
    expect(result.carrierMargin).toBeLessThan(0.5)
  })

  it('backhaul has lower tariff than one-way for same lane', () => {
    const backhaulLane: Lane = { ...baseLane, serviceType: 'Backhaul', isBackhaul: true }
    const oneWayResult = calculate({ lane: baseLane, params, equipment, market })
    const backhaulResult = calculate({ lane: backhaulLane, params, equipment, market })
    expect(backhaulResult.requiredTariffUsd).toBeLessThan(oneWayResult.requiredTariffUsd)
  })

  it('tandem config produces higher tariff than single', () => {
    const tandemEquipment: EquipmentConfig = {
      ...equipment,
      config: 'Tandem',
      fuelEfficiencyFactor: 0.9,
      fixedCostFactor: 1.2,
      maintTiresFactor: 1.35,
    }
    const tandemLane: Lane = { ...baseLane, config: 'Tandem' }
    const singleResult = calculate({ lane: baseLane, params, equipment, market })
    const tandemResult = calculate({ lane: tandemLane, params, equipment: tandemEquipment, market })
    expect(tandemResult.requiredTariffUsd).toBeGreaterThan(singleResult.requiredTariffUsd)
  })

  it('overrides change the result predictably (higher diesel → higher tariff)', () => {
    const result = calculate({ lane: baseLane, params, equipment, market })
    const resultHighDiesel = calculate({
      lane: baseLane,
      params,
      equipment,
      market: { ...market, dieselMxMxnL: 35 },
    })
    expect(resultHighDiesel.requiredTariffUsd).toBeGreaterThan(result.requiredTariffUsd)
  })

  it('longer lane has higher absolute tariff', () => {
    const shortLane: Lane = { ...baseLane, baseKm: 150 }
    const longLane: Lane = { ...baseLane, baseKm: 1000 }
    const shortResult = calculate({ lane: shortLane, params, equipment, market })
    const longResult = calculate({ lane: longLane, params, equipment, market })
    expect(longResult.requiredTariffUsd).toBeGreaterThan(shortResult.requiredTariffUsd)
  })
})
