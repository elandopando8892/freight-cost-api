import { describe, expect, it } from 'vitest'
import { defaultCostBaseProfile } from '../src/modules/cost-bases/cost-base-profile.js'
import { evaluateC1QuoteReadiness, type C1ReadinessBase } from '../src/modules/pilot/c1-quote-readiness.js'

const eligible = (): C1ReadinessBase => ({
  code: 'XBF-XB-PILOT', scope: 'CROSS_BORDER', status: 'ACTIVE', isDefault: true,
  versions: [{ version: 2, status: 'PUBLISHED', isActive: true,
    applicabilityContext: defaultCostBaseProfile('CROSS_BORDER'), parameterCount: 210 }],
})

describe('C1 quote-readiness inventory gate', () => {
  it('requires exactly one tenant target and rejects a duplicate code across organizations', () => {
    expect(evaluateC1QuoteReadiness([])).toMatchObject({
      targetBaseFound: false, targetCandidateForNewCalculation: false, blockers: ['TARGET_BASE_MISSING'],
    })
    expect(evaluateC1QuoteReadiness([eligible(), eligible()])).toMatchObject({
      targetBaseFound: true, targetCandidateForNewCalculation: false,
      blockers: ['TARGET_CODE_AMBIGUOUS_ACROSS_ORGS'],
    })
  })

  it('accepts only an active base with one published active, complete and valid version', () => {
    expect(evaluateC1QuoteReadiness([eligible()])).toMatchObject({
      targetCandidateForNewCalculation: true, blockers: [],
    })
    expect(evaluateC1QuoteReadiness([{ ...eligible(), isDefault: false }]).targetCandidateForNewCalculation).toBe(true)
  })

  it.each([
    ['draft base', (base: C1ReadinessBase) => { base.status = 'DRAFT' }, 'BASE_NOT_ACTIVE'],
    ['archived base', (base: C1ReadinessBase) => { base.status = 'ARCHIVED' }, 'BASE_NOT_ACTIVE'],
    ['no active version', (base: C1ReadinessBase) => { base.versions[0].isActive = false }, 'ACTIVE_VERSION_COUNT_INVALID'],
    ['two active versions', (base: C1ReadinessBase) => { base.versions.push({ ...base.versions[0], version: 3 }) }, 'ACTIVE_VERSION_COUNT_INVALID'],
    ['draft active version', (base: C1ReadinessBase) => { base.versions[0].status = 'DRAFT' }, 'ACTIVE_VERSION_NOT_PUBLISHED'],
    ['incomplete catalog', (base: C1ReadinessBase) => { base.versions[0].parameterCount = 209 }, 'CANONICAL_PARAMETERS_INCOMPLETE'],
    ['legacy profile', (base: C1ReadinessBase) => { base.versions[0].applicabilityContext = null }, 'APPLICABILITY_PROFILE_MISSING'],
    ['invalid profile', (base: C1ReadinessBase) => { base.versions[0].applicabilityContext = { invalid: true } }, 'APPLICABILITY_PROFILE_INVALID'],
    ['profile for another scope', (base: C1ReadinessBase) => { base.versions[0].applicabilityContext = defaultCostBaseProfile('LOCAL') }, 'APPLICABILITY_PROFILE_INVALID'],
  ])('fails closed for %s', (_name, change, blocker) => {
    const base = eligible()
    change(base)
    expect(evaluateC1QuoteReadiness([base])).toMatchObject({
      targetCandidateForNewCalculation: false,
      blockers: expect.arrayContaining([blocker]),
    })
  })
})
