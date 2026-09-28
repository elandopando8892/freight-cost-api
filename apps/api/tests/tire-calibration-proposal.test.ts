import { describe, expect, it } from 'vitest'
import { buildTireCalibrationProposal, TireCalibrationProposalRequestSchema } from '../src/modules/cost-bases/tire-calibration-proposal.js'
import { reviewTireCohortRecord } from '../src/modules/cost-bases/tire-cohort.js'

function record(id: string, lifeKm: number, purchaseMxn = 6_000, open = false): any {
  const evidence = [
    { id: `mount-${id}`, kind: 'ODOMETER_CAPTURE', locator: `local://mount-${id}`, note: 'Synthetic' },
    { id: `invoice-${id}`, kind: 'INVOICE', locator: `local://invoice-${id}`, note: 'Synthetic' },
    { id: `remove-${id}`, kind: 'ODOMETER_CAPTURE', locator: `local://remove-${id}`, note: 'Synthetic' },
    { id: `inspection-${id}`, kind: 'INSPECTION', locator: `local://inspection-${id}`, note: 'Synthetic' },
  ]
  return {
    schemaVersion: 1, researchOnly: true, id, revision: 1, operationalSegment: 'INTRA_MEX',
    asset: { id: `TR-${id}`, type: 'TRACTOR', configuration: '6x4 synthetic' },
    position: { group: 'DRIVE', slot: 'D1-LI' },
    tire: { casingId: `CASE-${id}`, stage: { kind: 'NEW', sequence: null }, manufacturer: 'Synthetic', model: 'Controlled', size: '11R22.5', loadRange: 'H', serviceDescription: '146/143L' },
    distanceMeter: { basis: 'ASSET_ODOMETER', sourceId: `TR-${id}` },
    installation: { date: '2026-01-01', readingKm: 100_000, treadDepthMm: 21,
      installedCost: { currency: 'MXN', purchaseMxn, taxMxn: 960, freightMxn: 200, mountingMxn: 180, balancingMxn: 120, disposalMxn: 0, evidenceIds: [`invoice-${id}`] }, evidenceIds: [`mount-${id}`] },
    removal: open ? null : { date: '2026-09-01', readingKm: 100_000 + lifeKm, treadDepthMm: 2, reason: 'WORN_OUT', casingInspection: { outcome: 'ACCEPTED', reason: null, evidenceIds: [`inspection-${id}`] }, evidenceIds: [`remove-${id}`] },
    evidence,
  }
}

const rows = [80_000, 81_000, 82_000, 83_000, 200_000].map((life, index) => record(`cycle-${index}`, life))
const statisticsPolicy = { minimumClosedCycles: 4, minimumInspectionsPerStage: 3, outlierFenceMultiplier: 1.5, maximumOutlierShare: 0.25, maximumCoefficientOfVariation: 0.8, shapeMeanMedianGapRatio: 0.1, confidenceZ: 1.96 }
const reviewed = reviewTireCohortRecord(rows[0])
const cohortKey = ['INTRA_MEX', 'TRACTOR', '6x4 synthetic', 'DRIVE', 'Synthetic', 'Controlled', '11R22.5', 'H', '146/143L', reviewed.stageLabel].join('|')
const request = {
  proposalId: 'proposal-v1', version: 1, supersedesProposalId: null, createdOn: '2026-09-27', status: 'DRAFT', cohortKey,
  policy: { id: 'policy-synthetic', version: 1, rationale: 'Synthetic policy for controlled tests', lifeEstimator: { method: 'MEDIAN' }, installedCostEstimator: { method: 'MEDIAN' }, observedRateEstimator: { method: 'MEDIAN' }, maximumMethodDivergenceRatio: 0.05 },
  impactScenario: { quantityOnVehicle: 8, baselineTireStageCvuMxnPerKm: 0.7, baselineEvidenceId: 'synthetic-baseline', tripDistanceKm: 1_000, currency: 'MXN' },
}

describe('versioned tire calibration proposal', () => {
  it('builds a median proposal and keeps impact in an isolated MXN shadow', () => {
    const result = buildTireCalibrationProposal(rows, statisticsPolicy, request)
    expect(result.selections.lifeKm.value).toBe(82_000)
    expect(result.selections.installedCostMxn.value).toBe(7_460)
    expect(result.impact.parameterizedStageCvuMxnPerKm).toBeCloseTo(8 * 7_460 / 82_000, 12)
    expect(result.impact.directObservedStageCvuMxnPerKm).toBeCloseTo(8 * 7_460 / 82_000, 12)
    expect(result.impact.impactAtTripDistanceMxn).toBeCloseTo((8 * 7_460 / 82_000 - 0.7) * 1_000, 10)
    expect(result.proposalEligibleForEconomicReview).toBe(true)
    expect(result.legacyMappingStatus).toBe('BLOCKED_V3_CROSSED_MAPPING')
    expect(result.parameterWriteAllowed).toBe(false)
    expect(result.quoteEligible).toBe(false)
  })

  it('records observations intentionally removed by a trimmed-mean policy', () => {
    const trimmed = structuredClone(request)
    trimmed.proposalId = 'proposal-v2'; trimmed.version = 2; trimmed.supersedesProposalId = 'proposal-v1'
    trimmed.policy.version = 2
    trimmed.policy.lifeEstimator = { method: 'TRIMMED_MEAN', trimEachTailFraction: 0.2 } as any
    const result = buildTireCalibrationProposal(rows, statisticsPolicy, trimmed)
    expect(result.selections.lifeKm.value).toBe(82_000)
    expect(result.selections.lifeKm.excludedRecordIds).toEqual(['cycle-0', 'cycle-4'])
    expect(result.selections.lifeKm.includedRecordIds).toEqual(['cycle-1', 'cycle-2', 'cycle-3'])
    expect(result.request.supersedesProposalId).toBe('proposal-v1')
    expect(result.fingerprint).not.toBe(buildTireCalibrationProposal(rows, statisticsPolicy, request).fingerprint)
  })

  it('keeps a statistically blocked cohort in draft and out of economic review', () => {
    const result = buildTireCalibrationProposal(rows.slice(0, 2), statisticsPolicy, request)
    expect(result.readinessReasons).toContain('SAMPLE_BELOW_POLICY')
    expect(result.proposalEligibleForEconomicReview).toBe(false)
    expect(result.parameterWriteAllowed).toBe(false)
  })

  it('blocks material divergence between parameter quotient and direct observed rate', () => {
    const divergent = structuredClone(request)
    divergent.policy.lifeEstimator = { method: 'PERCENTILE', percentile: 0.95 } as any
    const result = buildTireCalibrationProposal(rows, statisticsPolicy, divergent)
    expect(result.impact.methodDivergenceRatio).toBeGreaterThan(0.05)
    expect(result.readinessReasons).toContain('METHOD_DIVERGENCE_ABOVE_POLICY')
    expect(result.proposalEligibleForEconomicReview).toBe(false)
  })

  it('requires unbroken version lineage and refuses publication fields', () => {
    expect(TireCalibrationProposalRequestSchema.safeParse({ ...request, version: 2 }).success).toBe(false)
    expect(TireCalibrationProposalRequestSchema.safeParse({ ...request, supersedesProposalId: 'older' }).success).toBe(false)
    expect(TireCalibrationProposalRequestSchema.safeParse({ ...request, status: 'PUBLISHED' }).success).toBe(false)
    expect(() => buildTireCalibrationProposal(rows, statisticsPolicy, { ...request, cohortKey: 'missing' })).toThrow('Unknown comparable cohort')
  })
})
