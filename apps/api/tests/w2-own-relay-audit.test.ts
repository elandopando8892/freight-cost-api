import { describe, expect, it, vi } from 'vitest'

// This audit is arithmetic/schema-only. A persistence call cannot succeed here.
vi.mock('../src/config/prisma.js', () => ({ prisma: {} }))

import { defaultCostBaseProfile } from '../src/modules/cost-bases/cost-base-profile.js'
import { CreateCostBaseSchema } from '../src/modules/cost-bases/cost-bases.schema.js'
import { calculate } from '../src/modules/engine/engine.calculator.js'
import type { EngineInput } from '../src/modules/engine/engine.types.js'
import { deriveMonthlyFixedCost } from '../src/modules/engine/engine.outputs.js'
import { allocateFixedCost } from '../src/modules/engine/fixed-cost-allocation.js'

const profile = defaultCostBaseProfile('CROSS_BORDER', 'OPERATIONAL_V3')
const equipment = { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' }
const input: EngineInput = {
  operation: 'D2D Export', service: 'One Way', policy: 'OPERATIONAL_V3',
  equipment, params: {}, applicabilityProfile: profile,
  mexLeg: {
    baseKm: 620, baseHours: 10, routeExpensesMxn: 0, route: 'Straight & Danger',
    operation: 'D2D Export', service: 'One Way', equipment,
  },
  usaLeg: {
    loadedMiles: 390, transitDaysRaw: 1, dieselUsdGal: 4.75, fscUsdMile: 0.55,
    outState: 'TX', originCondition: 'Balanced', destCondition: 'Balanced',
    operation: 'D2D Export', service: 'One Way', equipment,
  },
}

describe('W2 own-relay support audit (synthetic, not a quote or adoption)', () => {
  const createInput = {
    code: 'SYNTHETIC-AUDIT', name: 'Arithmetic audit only', scope: 'CROSS_BORDER',
    operationalSegment: 'D2D_BINATIONAL_OWN', defaultPolicy: 'OPERATIONAL_V3',
    applicabilityProfile: profile,
  }

  it('retains the existing through-tractor creation contract', () => {
    expect(CreateCostBaseSchema.safeParse(createInput).success).toBe(true)
  })

  it.each(['YARD_TRANSFER', 'PARTNER_HANDOFF'] as const)('does not authorize unsupported %s by changing the segment label', (borderProcess) => {
    const parsed = CreateCostBaseSchema.safeParse({
      ...createInput, applicabilityProfile: { ...profile, borderProcess },
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: ['applicabilityProfile'], message: expect.stringContaining('THROUGH_TRACTOR') }),
      ]))
    }
  })

  it('characterizes that direct arithmetic ignores borderProcess; this is NOT an API bypass permission', () => {
    // API/service validation must remain in place. Calling the arithmetic
    // function directly cannot turn identical outputs into support for relay.
    const through = calculate(input)
    const relay = calculate({ ...input, applicabilityProfile: { ...profile, borderProcess: 'YARD_TRANSFER' } })
    expect(relay).toEqual(through)
  })

  it('demonstrates why separate leg MAX allocations cannot be substituted for one whole-cycle box MAX', () => {
    // Arbitrary cost units, NOT researched rates or values to persist.
    const separateLegs = allocateFixedCost(20, 80) + allocateFixedCost(80, 20)
    const wholeCycleBox = allocateFixedCost(20 + 80, 80 + 20)
    expect(separateLegs).toBe(160)
    expect(wholeCycleBox).toBe(100)
    expect(separateLegs).not.toBe(wholeCycleBox)
  })

  it('characterizes that both country aggregates include the same trailer capital inputs, without claiming observed double billing', () => {
    const params = {
      'GENERAL_BASE__Tamaño de Flota': 1,
      'COST_CAPITAL__Qty Remolque': 1, 'COST_CAPITAL__PU Remolque': 600,
      'COST_CAPITAL__Qty Rescue Remolque': 0, 'COST_CAPITAL__Periodo Depreciacion': 60,
      'COST_CAPITAL__LTV Asset Financing': 0,
    }
    for (const workingCapitalCountry of ['MX', 'US'] as const) {
      const options = { workingCapitalCountry, includeCrossborderCosts: true, includeDollyAssets: false }
      const withBox = deriveMonthlyFixedCost(params, { ...options, includeTrailerAssets: true })
      const withoutBox = deriveMonthlyFixedCost(params, { ...options, includeTrailerAssets: false })
      expect(withBox - withoutBox).toBeCloseTo(10, 8)
    }
  })
})
