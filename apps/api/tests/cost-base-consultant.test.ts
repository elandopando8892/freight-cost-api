import { describe, expect, it } from 'vitest'
import { PARAMETER_DEFINITIONS } from '../src/data/parameter-catalog.js'
import { applicabilitySummary, parameterApplicability } from '../src/modules/cost-bases/cost-base-applicability.js'
import { buildCostBaseConsultantRequest, evaluateCostBaseDraft } from '../src/modules/cost-bases/cost-base-consultant.js'
import type { CostBaseConsultantDraft } from '../src/modules/cost-bases/cost-base-consultant.schema.js'
import { calculateMexLeg } from '../src/modules/engine/engine.mex.js'
import { CostBaseApplicabilityPreviewSchema, CreateCostBaseSchema } from '../src/modules/cost-bases/cost-bases.schema.js'
import { listRecommendedCostBasePresets } from '../src/modules/cost-bases/recommended-cost-base-presets.js'
import { defaultCostBaseProfile, parseCostBaseProfile, profileConsistencyIssues } from '../src/modules/cost-bases/cost-base-profile.js'

const borderParameter = PARAMETER_DEFINITIONS.find((definition) =>
  definition.section === 'BORDER' && definition.field === 'Border Transactional Cost',
)!
const crossborderFixed = PARAMETER_DEFINITIONS.find((definition) => definition.section === 'COST_CROSSBORDER')!

const draft = (scope: CostBaseConsultantDraft['scope']): CostBaseConsultantDraft => ({
  scope,
  code: 'TEST-2026',
  name: 'Base de prueba',
  description: null,
  defaultPolicy: 'OPERATIONAL_V3',
  currency: 'USD',
  isDefault: true,
  applicabilityProfile: defaultCostBaseProfile(scope, 'OPERATIONAL_V3'),
  assumptionOverrides: [],
})

describe('cost-base parameter applicability', () => {
  it.each(['DRAYAGE', 'LOCAL', 'INTRA_MEX', 'INTRA_US'] as const)(
    'marks Border and cross-border fixed costs as not applicable for %s',
    (scope) => {
      expect(parameterApplicability(scope, borderParameter).applicability).toBe('NOT_APPLICABLE')
      expect(parameterApplicability(scope, crossborderFixed).applicability).toBe('NOT_APPLICABLE')
      expect(applicabilitySummary(scope).border).toBe('NOT_APPLICABLE')
    },
  )

  it('requires Border for D2D cross-border', () => {
    expect(parameterApplicability('CROSS_BORDER', borderParameter).applicability).toBe('REQUIRED')
    expect(parameterApplicability('CROSS_BORDER', crossborderFixed).applicability).toBe('REQUIRED')
    expect(applicabilitySummary('CROSS_BORDER').border).toBe('REQUIRED')
  })

  it.each(['CROSS_BORDER', 'DRAYAGE', 'LOCAL', 'INTRA_MEX', 'INTRA_US'] as const)(
    'classifies every canonical parameter exactly once for %s',
    (scope) => {
      const summary = applicabilitySummary(scope)
      expect(Object.values(summary.counts).reduce((sum, count) => sum + count, 0)).toBe(PARAMETER_DEFINITIONS.length)
      for (const definition of PARAMETER_DEFINITIONS) {
        expect(parameterApplicability(scope, definition).reason.length).toBeGreaterThan(0)
      }
    },
  )

  it('separates country-specific fuel, labor and finance assumptions', () => {
    const dieselMx = PARAMETER_DEFINITIONS.find((item) => item.section === 'FUEL' && item.field === 'Diesel MX')!
    const driverUs = PARAMETER_DEFINITIONS.find((item) => item.section === 'LABOR' && item.field === 'Tarifa Operador US')!
    const capitalUs = PARAMETER_DEFINITIONS.find((item) => item.section === 'FINANCE' && item.field === 'Cost of Capital US')!
    expect(parameterApplicability('INTRA_US', dieselMx).applicability).toBe('NOT_APPLICABLE')
    expect(parameterApplicability('INTRA_US', driverUs).applicability).toBe('REQUIRED')
    expect(parameterApplicability('INTRA_US', capitalUs).applicability).toBe('REQUIRED')
    expect(parameterApplicability('INTRA_MEX', capitalUs).applicability).toBe('NOT_APPLICABLE')
  })

  it('distinguishes conditional and governance-only parameters', () => {
    const longHaulFloor = PARAMETER_DEFINITIONS.find((item) => item.section === 'UTILIZATION' && item.field === 'Billable Day Floor Long-haul')!
    const inflation = PARAMETER_DEFINITIONS.find((item) => item.section === 'FINANCE' && item.field === 'Inflation Buffer')!
    expect(parameterApplicability('INTRA_MEX', longHaulFloor)).toEqual(expect.objectContaining({ applicability: 'CONDITIONAL' }))
    expect(parameterApplicability('INTRA_MEX', inflation)).toEqual(expect.objectContaining({ applicability: 'NOT_IMPLEMENTED' }))
  })

  it('makes trailer ownership costs conditional for a mixed Dry Van / Power Only base', () => {
    const trailerCapital = PARAMETER_DEFINITIONS.find((item) =>
      item.section === 'COST_CAPITAL' && item.field === 'PU Remolque',
    )!
    const powerOnly = { ...defaultCostBaseProfile('INTRA_MEX'), trailerTypes: ['Power Only'] as const }
    const mixed = { ...defaultCostBaseProfile('INTRA_MEX'), trailerTypes: ['Dry Van', 'Power Only'] as const }
    expect(parameterApplicability('INTRA_MEX', trailerCapital, powerOnly).applicability).toBe('NOT_APPLICABLE')
    expect(parameterApplicability('INTRA_MEX', trailerCapital, mixed)).toEqual(expect.objectContaining({
      applicability: 'CONDITIONAL',
      condition: expect.stringContaining('Power Only'),
    }))
  })

  it('reports WORKBOOK_V3 legacy dependencies instead of applying operational exclusions', () => {
    const profile = {
      ...defaultCostBaseProfile('INTRA_US', 'WORKBOOK_V3'),
      trailerTypes: ['Power Only'] as const,
    }
    const trailerCapital = PARAMETER_DEFINITIONS.find((item) => item.section === 'COST_CAPITAL' && item.field === 'PU Remolque')!
    const dollyCapital = PARAMETER_DEFINITIONS.find((item) => item.section === 'COST_CAPITAL' && item.field === 'PU Dolly')!
    const capitalMx = PARAMETER_DEFINITIONS.find((item) => item.section === 'FINANCE' && item.field === 'Cost of Capital MX')!
    const capitalUs = PARAMETER_DEFINITIONS.find((item) => item.section === 'FINANCE' && item.field === 'Cost of Capital US')!
    expect(parameterApplicability('INTRA_US', trailerCapital, profile).applicability).toBe('REQUIRED')
    expect(parameterApplicability('INTRA_US', dollyCapital, profile).applicability).toBe('REQUIRED')
    expect(parameterApplicability('INTRA_US', capitalMx, profile).applicability).toBe('REQUIRED')
    expect(parameterApplicability('INTRA_US', capitalUs, profile).applicability).toBe('NOT_IMPLEMENTED')
  })
})

describe('recommended cost-base standards', () => {
  const presets = listRecommendedCostBasePresets()

  it('provides one editable standard for every governed scope', () => {
    expect(presets).toHaveLength(5)
    expect(new Set(presets.map((preset) => preset.id)).size).toBe(5)
    expect(new Set(presets.map((preset) => preset.code)).size).toBe(5)
    expect(new Set(presets.map((preset) => preset.scope))).toEqual(new Set([
      'CROSS_BORDER', 'DRAYAGE', 'LOCAL', 'INTRA_MEX', 'INTRA_US',
    ]))
    expect(presets.every((preset) => preset.assumptionOverrides.length === 0)).toBe(true)
    expect(new Set(presets.map((preset) => JSON.stringify(preset.applicability.counts))).size).toBeGreaterThan(2)
  })

  it('keeps Border aligned with scope and accepts the template audit source', () => {
    for (const preset of presets) {
      expect(preset.applicability.border).toBe(preset.scope === 'CROSS_BORDER' ? 'REQUIRED' : 'NOT_APPLICABLE')
      expect(CreateCostBaseSchema.parse({
        ...preset,
        setupMode: 'RECOMMENDED_TEMPLATE',
        presetId: preset.id,
      })).toEqual(expect.objectContaining({
        scope: preset.scope,
        setupMode: 'RECOMMENDED_TEMPLATE',
        presetId: preset.id,
      }))
    }
  })

  it('does not let a recommended preset hide an arbitrary cloned baseline', () => {
    const preset = presets[0]
    expect(() => CreateCostBaseSchema.parse({
      ...preset,
      setupMode: 'RECOMMENDED_TEMPLATE',
      presetId: preset.id,
      cloneFromSetId: 'set-from-another-baseline',
    })).toThrow(/canonical baseline/i)
  })
})

describe('cost-base applicability profile contract', () => {
  it.each([
    ['INTRA_MEX', ['B1', 'Licencia E']],
    ['LOCAL', ['B1', 'Licencia E']],
    ['INTRA_US', ['Interstate', 'Intrastate', 'CDL']],
    ['DRAYAGE', ['Interstate', 'Intrastate', 'CDL']],
    ['CROSS_BORDER', ['B1', 'Licencia E', 'Interstate', 'Intrastate', 'CDL']],
  ] as const)(
    'ships the canonical driver and factor defaults for %s',
    (scope, expectedDriverTypes) => {
      const profile = defaultCostBaseProfile(scope, 'OPERATIONAL_V3')
      expect(profileConsistencyIssues(scope, profile, 'OPERATIONAL_V3')).toEqual([])
      expect(parseCostBaseProfile(scope, profile, 'OPERATIONAL_V3')).toEqual(profile)
      expect(profile.factorScheduleVersion).toBe('FCM_V3_FACTORS_2026_1')
      expect(profile.driverTypes).toEqual(expectedDriverTypes)
    },
  )

  it.each([
    ['INTRA_MEX', 'CDL'],
    ['LOCAL', 'Interstate'],
    ['INTRA_US', 'B1'],
    ['DRAYAGE', 'Licencia E'],
  ] as const)('rejects a %s profile with the foreign driver type %s', (scope, foreignDriverType) => {
    const profile = defaultCostBaseProfile(scope)
    const inconsistent = { ...profile, driverTypes: [...profile.driverTypes, foreignDriverType] }

    expect(profileConsistencyIssues(scope, inconsistent)).toEqual(expect.arrayContaining([
      expect.stringMatching(/exclusivamente (mexicana|estadounidense)/i),
    ]))
    expect(() => parseCostBaseProfile(scope, inconsistent)).toThrow(/operadores/i)
  })

  it('rejects a non-canonical factor schedule version', () => {
    const profile = {
      ...defaultCostBaseProfile('CROSS_BORDER'),
      factorScheduleVersion: 'FCM_V3_FACTORS_CUSTOM',
    }
    expect(() => parseCostBaseProfile('CROSS_BORDER', profile)).toThrow()
  })

  it('falls back only for legacy null and rejects corrupt persisted JSON', () => {
    const legacy = parseCostBaseProfile('INTRA_MEX', null)
    expect(legacy.scope).toBe('INTRA_MEX')
    expect(legacy.truckTypes).toContain('Rabon')
    expect(defaultCostBaseProfile('INTRA_MEX').truckTypes).not.toContain('Rabon')
    expect(() => parseCostBaseProfile('INTRA_MEX', { scope: 'INTRA_MEX' })).toThrow()
  })

  it('blocks unsupported ownership and small-vehicle cost models', () => {
    const leased = { ...defaultCostBaseProfile('INTRA_MEX'), ownershipModels: ['LEASED'] as const }
    const localTruck = { ...defaultCostBaseProfile('LOCAL'), truckTypes: ['Rabon'] as const }
    expect(profileConsistencyIssues('INTRA_MEX', leased)).toEqual(expect.arrayContaining([
      expect.stringContaining('LEASED'),
    ]))
    expect(profileConsistencyIssues('LOCAL', localTruck)).toEqual(expect.arrayContaining([
      expect.stringContaining('Truck Trailer'),
    ]))
  })

  it('rejects a country/scope contradiction at the create boundary', () => {
    const profile = { ...defaultCostBaseProfile('INTRA_MEX'), countries: ['US'] as const }
    expect(() => CreateCostBaseSchema.parse({
      code: 'BAD-MX', name: 'Base contradictoria', scope: 'INTRA_MEX', applicabilityProfile: profile,
    })).toThrow()
  })

  it('keeps the server and wizard aligned on the complete operation set for a scope', () => {
    const partial = {
      ...defaultCostBaseProfile('CROSS_BORDER'),
      operations: ['D2D Export'] as const,
    }
    expect(profileConsistencyIssues('CROSS_BORDER', partial)).toEqual(expect.arrayContaining([
      expect.stringContaining('operaciones canónicas'),
    ]))
    expect(() => parseCostBaseProfile('CROSS_BORDER', partial)).toThrow()
  })

  it('validates the same profile contract for deterministic UI previews', () => {
    const profile = defaultCostBaseProfile('DRAYAGE')
    expect(CostBaseApplicabilityPreviewSchema.parse({ scope: 'DRAYAGE', applicabilityProfile: profile })).toEqual({
      scope: 'DRAYAGE',
      applicabilityProfile: profile,
    })
    expect(() => CostBaseApplicabilityPreviewSchema.parse({ scope: 'LOCAL', applicabilityProfile: profile })).toThrow()
    expect(() => CostBaseApplicabilityPreviewSchema.parse({
      scope: 'DRAYAGE',
      applicabilityProfile: { ...profile, trailerTypes: ['Chassis', 'Dry Van'] },
    })).toThrow(/único tipo de remolque/)
  })
})

describe('cost-base consultant guardrails', () => {
  it('blocks a Border override on an Intra-Mex draft', () => {
    const candidate = draft('INTRA_MEX')
    candidate.assumptionOverrides = [{ section: 'BORDER', field: borderParameter.field, value: borderParameter.defaultValue }]
    expect(evaluateCostBaseDraft(candidate)).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: 'BLOCKER', field: `BORDER__${borderParameter.field}` }),
    ]))
  })

  it('reports a mathematically invalid margin as a BLOCKER before create', () => {
    const candidate = draft('INTRA_MEX')
    candidate.assumptionOverrides = [{ section: 'TECHNICAL_MARGIN', field: 'UT Rate One Way', value: 1 }]
    const issues = evaluateCostBaseDraft(candidate)

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        severity: 'BLOCKER',
        field: 'TECHNICAL_MARGIN__UT Rate One Way',
        message: expect.stringMatching(/less than 1/i),
      }),
    ]))
    expect(issues).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: 'WARNING', field: 'TECHNICAL_MARGIN__UT Rate One Way' }),
    ]))
  })

  it('keeps the OpenAI request supervised, stateless and without tools', () => {
    const request = buildCostBaseConsultantRequest({
      message: 'Es una operación FTL sólo dentro de México.',
      draft: draft('INTRA_MEX'),
      messages: [],
    })
    expect(request.store).toBe(false)
    expect(request.metadata.mode).toBe('cost_base_consultant')
    expect(request).not.toHaveProperty('tools')
  })
})

describe('domestic engine isolation', () => {
  const lane = {
    baseKm: 500,
    routeExpensesMxn: 0,
    baseHours: 8,
    operation: 'Intra-Mex',
    service: 'One Way',
    route: 'Straight & Danger',
    equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' },
  }

  it('does not consume border diesel blend or cross-border fixed costs for Intra-Mex', () => {
    const baseline = calculateMexLeg(lane, {})
    const polluted = calculateMexLeg(lane, {
      'FUEL__Diesel US Border': 99,
      'FUEL__Fuel Purchase Mix MX': 0,
      'FUEL__Fuel Purchase Mix US': 1,
      'COST_CROSSBORDER__CTPAT': 9_999_999,
      'COST_CROSSBORDER__Renta Oficinas Patios': 9_999_999,
    })
    expect(baseline.blendedDieselUsdL).toBeCloseTo(28 / 17.5, 6)
    expect(polluted.blendedDieselUsdL).toBeCloseTo(baseline.blendedDieselUsdL, 6)
    expect(polluted.cfuUsd).toBeCloseTo(baseline.cfuUsd, 6)
    expect(polluted.requiredTariffUsd).toBe(baseline.requiredTariffUsd)
  })
})
