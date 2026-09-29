import { describe, expect, it } from 'vitest'
import { defaultCostBaseProfile } from '../src/modules/cost-bases/cost-base-profile.js'
import { evaluateC1OperatingModel } from '../src/modules/pilot/c1-operating-model.js'
import type { C1ReadinessBase } from '../src/modules/pilot/c1-quote-readiness.js'

const fleet: C1ReadinessBase = {
  code: 'XBF-XB-PILOT', scope: 'CROSS_BORDER', status: 'ACTIVE', isDefault: true,
  versions: [{ version: 2, status: 'PUBLISHED', isActive: true, parameterCount: 210,
    applicabilityContext: defaultCostBaseProfile('CROSS_BORDER') }],
}

describe('C1 operating purpose', () => {
  it('does not approve third-party benchmark economics from a complete fleet profile', () => {
    expect(evaluateC1OperatingModel('THIRD_PARTY_BENCHMARK', [fleet])).toMatchObject({
      modelMatchesPurpose: false, structuralCandidateForRequestedPurpose: false,
      economicCalibrationVerified: false, existingAlternative: null,
      blockers: ['OPERATING_MODEL_MISMATCH', 'THIRD_PARTY_BENCHMARK_ADAPTER_NOT_IMPLEMENTED'],
    })
  })
  it('points purchase costing to the separate model without claiming readiness', () => {
    expect(evaluateC1OperatingModel('THIRD_PARTY_PURCHASE', [fleet])).toMatchObject({
      structuralCandidateForRequestedPurpose: false,
      existingAlternative: { model: 'FCM_THIRD_PARTY_FLAT_V1', readiness: 'NOT_ASSESSED' },
    })
  })
  it('retains structural fleet eligibility without asserting economic calibration', () => {
    expect(evaluateC1OperatingModel('FLEET_COST', [fleet])).toMatchObject({
      structuralCandidateForRequestedPurpose: true, economicCalibrationVerified: false, blockers: [],
    })
  })
  it('preserves inventory failures for the intended methodology', () => {
    expect(evaluateC1OperatingModel('THIRD_PARTY_BENCHMARK', []).blockers).toContain('TARGET_BASE_MISSING')
    expect(evaluateC1OperatingModel('FLEET_COST', [fleet, fleet]).structuralCandidateForRequestedPurpose).toBe(false)
  })
  it.each([undefined, null, '', 'BROKERED', 'third_party_benchmark'])('rejects an unknown purpose %s', purpose => {
    expect(() => evaluateC1OperatingModel(purpose, [fleet])).toThrow()
  })
})
