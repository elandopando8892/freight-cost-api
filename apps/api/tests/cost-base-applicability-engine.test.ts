import { describe, expect, it } from 'vitest'
import { PARAMETER_DEFINITIONS } from '../src/data/parameter-catalog.js'
import { calculate } from '../src/modules/engine/engine.calculator.js'
import type { EngineInput } from '../src/modules/engine/engine.types.js'
import { parameterApplicability } from '../src/modules/cost-bases/cost-base-applicability.js'
import { listRecommendedCostBasePresets } from '../src/modules/cost-bases/recommended-cost-base-presets.js'
import { defaultCostBaseProfile } from '../src/modules/cost-bases/cost-base-profile.js'

const equipment = {
  truckType: 'Truck Trailer',
  trailer: 'Dry Van',
  config: 'Single',
  driver: 'B1',
}

function inputFor(operation: string, service: string, trailer = 'Dry Van'): EngineInput {
  const selectedEquipment = { ...equipment, trailer }
  const common = {
    policy: 'OPERATIONAL_V3' as const,
    operation,
    service,
    equipment: selectedEquipment,
    params: {},
  }
  if (operation === 'Drayage') {
    return {
      ...common,
      equipment: { ...selectedEquipment, trailer: 'Chassis' },
      drayageLeg: {
        loadedMiles: 42,
        dieselUsdGal: 4.75,
        fscUsdMile: 0.55,
        outState: 'TX',
        operation,
        service,
        equipment: { ...selectedEquipment, trailer: 'Chassis' },
      },
    }
  }

  const mexLeg = {
    baseKm: 620,
    routeExpensesMxn: 1_250,
    baseHours: 10,
    operation,
    service,
    route: 'Straight & Danger',
    equipment: selectedEquipment,
  }
  const usaLeg = {
    loadedMiles: 390,
    transitDaysRaw: 1,
    driverExpenses: 0,
    outState: 'TX',
    dieselUsdGal: 4.75,
    fscUsdMile: 0.55,
    originCondition: 'Balanced' as const,
    destCondition: 'Balanced' as const,
    operation,
    service,
    equipment: selectedEquipment,
  }
  if (operation === 'D2D Export' || operation === 'D2D Import') return { ...common, mexLeg, usaLeg }
  if (operation === 'Intra-US' || operation === 'US Northbound' || operation === 'US Southbound') return { ...common, usaLeg }
  return { ...common, mexLeg }
}

function calculationProjection(input: EngineInput) {
  const output = calculate(input)
  return {
    freightBaselineUsd: output.freightBaselineUsd,
    requiredTariffUsd: output.requiredTariffUsd,
    mexLeg: output.mexLeg,
    usaLeg: output.usaLeg,
    commercial: output.commercial,
  }
}

describe('cost-base applicability matches operational engine consumption', () => {
  for (const preset of listRecommendedCostBasePresets()) {
    it(`${preset.scope}: excluded and not-yet-implemented parameters are non-interfering across enabled operations and services`, () => {
      const scenarios = preset.applicabilityProfile.operations.flatMap((operation) =>
        preset.applicabilityProfile.services.map((service) => inputFor(
          operation,
          service,
          preset.applicabilityProfile.trailerTypes[0],
        )),
      )
      const baselines = scenarios.map(calculationProjection)
      const excluded = PARAMETER_DEFINITIONS.filter((definition) => {
        const status = parameterApplicability(preset.scope, definition, preset.applicabilityProfile).applicability
        return status === 'NOT_APPLICABLE' || status === 'NOT_IMPLEMENTED'
      })

      for (const definition of excluded) {
        const key = `${definition.section}__${definition.field}`
        const shock = definition.defaultValue + (Math.abs(definition.defaultValue) + 1) * 1_000
        scenarios.forEach((scenario, index) => {
          expect(
            calculationProjection({ ...scenario, params: { [key]: shock } }),
            `${preset.scope} consumed excluded parameter ${key} for ${scenario.operation}/${scenario.service}`,
          ).toEqual(baselines[index])
        })
      }
    })
  }

  it('enforces the trailer-cost condition route by route in a mixed Dry Van / Power Only profile', () => {
    const profile = {
      ...defaultCostBaseProfile('INTRA_MEX'),
      trailerTypes: ['Dry Van', 'Power Only'] as Array<'Dry Van' | 'Power Only'>,
    }
    const trailerCapital = PARAMETER_DEFINITIONS.find((definition) =>
      definition.section === 'COST_CAPITAL' && definition.field === 'PU Remolque',
    )!
    expect(parameterApplicability('INTRA_MEX', trailerCapital, profile).applicability).toBe('CONDITIONAL')

    const key = `${trailerCapital.section}__${trailerCapital.field}`
    const shock = { [key]: 5_000_000 }
    const powerOnly = inputFor('Intra-Mex', 'One Way', 'Power Only')
    const dryVan = inputFor('Intra-Mex', 'One Way', 'Dry Van')
    expect(calculationProjection({ ...powerOnly, params: shock })).toEqual(calculationProjection(powerOnly))
    expect(calculationProjection({ ...dryVan, params: shock })).not.toEqual(calculationProjection(dryVan))
  })
})

describe('WORKBOOK_V3 applicability reports its historical dependencies honestly', () => {
  for (const scope of ['CROSS_BORDER', 'INTRA_MEX', 'INTRA_US', 'DRAYAGE', 'LOCAL'] as const) {
    it(`${scope}: only values marked excluded or not implemented are non-interfering`, () => {
      const profile = defaultCostBaseProfile(scope, 'WORKBOOK_V3')
      const scenarios = profile.operations.flatMap((operation) =>
        profile.services.map((service) => ({
          ...inputFor(operation, service, profile.trailerTypes[0]),
          policy: 'WORKBOOK_V3' as const,
        })),
      )
      const baselines = scenarios.map(calculationProjection)
      const excluded = PARAMETER_DEFINITIONS.filter((definition) => {
        const status = parameterApplicability(scope, definition, profile).applicability
        return status === 'NOT_APPLICABLE' || status === 'NOT_IMPLEMENTED'
      })

      for (const definition of excluded) {
        const key = `${definition.section}__${definition.field}`
        const shock = definition.defaultValue + (Math.abs(definition.defaultValue) + 1) * 1_000
        scenarios.forEach((scenario, index) => {
          expect(
            calculationProjection({ ...scenario, params: { [key]: shock } }),
            `${scope} WORKBOOK consumed excluded parameter ${key} for ${scenario.operation}/${scenario.service}`,
          ).toEqual(baselines[index])
        })
      }
    })
  }
})
