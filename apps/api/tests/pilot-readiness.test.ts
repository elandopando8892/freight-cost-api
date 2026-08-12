import { describe, expect, it } from 'vitest'
import { buildPilotReadiness } from '../src/modules/pilot/pilot-readiness.js'

describe('pilot readiness', () => {
  it('blocks a pilot without operational evidence and does not require Rateware configuration', () => {
    const result = buildPilotReadiness({ profileComplete: false, activePricingBases: 0, productionRoutes: 0, confirmedQuotes: 0, invalidConfirmedQuotes: 0, publishedRateBooks: 0, pendingApprovals: 0, ratewareConfigured: false, deliveredRateBooks: 0, underReviewScenarioReviews: 0, scenarioReviewSchemaReady: false, openAIKeyRotationAttested: false, openAIModelConfigured: false, stagingSmokeStatus: "MISSING", stagingHumanStatus: "MISSING" })
    expect(result.ready).toBe(false)
    expect(result.blockers).toBe(10)
    expect(result.checks.find((check) => check.key === 'RATEWARE_RECEIPT')?.status).toBe('WARN')
  })

  it('accepts evidence-backed readiness while retaining external delivery as a warning', () => {
    const result = buildPilotReadiness({ profileComplete: true, activePricingBases: 1, productionRoutes: 1, confirmedQuotes: 2, invalidConfirmedQuotes: 0, publishedRateBooks: 1, pendingApprovals: 0, ratewareConfigured: false, deliveredRateBooks: 0, underReviewScenarioReviews: 0, scenarioReviewSchemaReady: true, openAIKeyRotationAttested: true, openAIModelConfigured: true, stagingSmokeStatus: "PASS", stagingHumanStatus: "PASS" })
    expect(result.ready).toBe(true)
    expect(result.blockers).toBe(0)
    expect(result.policy).toBe('EVIDENCE_BACKED_RELEASE_GATE')
  })
})
