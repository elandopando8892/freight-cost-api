import { describe, expect, it } from 'vitest'
import { aggregateTireCohorts, TireCohortStatisticsPolicySchema } from '../src/modules/cost-bases/tire-cohort-statistics.js'

const evidence = (id: string) => [
  { id: `mount-${id}`, kind: 'ODOMETER_CAPTURE', locator: `local://mount-${id}`, note: 'Synthetic test' },
  { id: `invoice-${id}`, kind: 'INVOICE', locator: `local://invoice-${id}`, note: 'Synthetic test' },
  { id: `remove-${id}`, kind: 'ODOMETER_CAPTURE', locator: `local://remove-${id}`, note: 'Synthetic test' },
  { id: `inspection-${id}`, kind: 'INSPECTION', locator: `local://inspection-${id}`, note: 'Synthetic test' },
]

function record(id: string, options: {
  lifeKm: number
  purchaseMxn?: number
  outcome?: 'ACCEPTED' | 'REJECTED' | 'PENDING'
  stage?: number | null
  open?: boolean
}): any {
  const refs = evidence(id)
  const stage = options.stage == null ? { kind: 'NEW', sequence: null } : { kind: 'RETREAD', sequence: options.stage }
  return {
    schemaVersion: 1, researchOnly: true, id, revision: 1, operationalSegment: 'INTRA_MEX',
    asset: { id: `TR-${id}`, type: 'TRACTOR', configuration: '6x4 synthetic' },
    position: { group: 'DRIVE', slot: 'D1-LI' },
    tire: { casingId: `CASE-${id}`, stage, manufacturer: 'Synthetic', model: 'Controlled', size: '11R22.5', loadRange: 'H', serviceDescription: '146/143L' },
    distanceMeter: { basis: 'ASSET_ODOMETER', sourceId: `TR-${id}` },
    installation: {
      date: '2026-01-01', readingKm: 100_000, treadDepthMm: 21,
      installedCost: { currency: 'MXN', purchaseMxn: options.purchaseMxn ?? 6_000, taxMxn: 960, freightMxn: 200, mountingMxn: 180, balancingMxn: 120, disposalMxn: 0, evidenceIds: [`invoice-${id}`] },
      evidenceIds: [`mount-${id}`],
    },
    removal: options.open ? null : {
      date: '2026-09-01', readingKm: 100_000 + options.lifeKm, treadDepthMm: 2, reason: 'WORN_OUT',
      casingInspection: { outcome: options.outcome ?? 'ACCEPTED', reason: options.outcome === 'REJECTED' ? 'Synthetic rejection' : null, evidenceIds: [`inspection-${id}`] },
      evidenceIds: [`remove-${id}`],
    },
    evidence: refs,
  }
}

const policy = {
  minimumClosedCycles: 4,
  minimumInspectionsPerStage: 3,
  outlierFenceMultiplier: 1.5,
  maximumOutlierShare: 0.25,
  maximumCoefficientOfVariation: 0.8,
  shapeMeanMedianGapRatio: 0.1,
  confidenceZ: 1.96,
}

describe('tire cohort statistical aggregation', () => {
  it('reports center, robust spread, percentiles and outliers without removing them', () => {
    const rows = [80_000, 81_000, 82_000, 83_000, 200_000]
      .map((lifeKm, index) => record(`new-${index}`, { lifeKm, outcome: index === 4 ? 'REJECTED' : 'ACCEPTED' }))
    const result = aggregateTireCohorts(rows, policy)
    const cohort = result.cohorts[0]
    expect(cohort.lifeKm.count).toBe(5)
    expect(cohort.lifeKm.mean).toBe(105_200)
    expect(cohort.lifeKm.median).toBe(82_000)
    expect(cohort.lifeKm.p25).toBe(81_000)
    expect(cohort.lifeKm.p75).toBe(83_000)
    expect(cohort.lifeKm.shape).toBe('RIGHT_SKEWED')
    expect(cohort.lifeKm.outliers).toEqual([{ id: 'new-4', value: 200_000 }])
    expect(cohort.recordIds).toContain('new-4')
    expect(cohort.readyForParameterProposalReview).toBe(true)
    expect(result.parameterWriteAllowed).toBe(false)
    expect(result.quoteEligible).toBe(false)
  })

  it('calculates conditional and raw cumulative casing acceptance with Wilson intervals', () => {
    const rows = [
      ...[80_000, 81_000, 82_000, 83_000, 84_000].map((lifeKm, index) => record(`new-${index}`, { lifeKm, outcome: index === 4 ? 'REJECTED' : 'ACCEPTED' })),
      ...[60_000, 61_000, 62_000, 63_000].map((lifeKm, index) => record(`retread-${index}`, { lifeKm, stage: 1, outcome: index === 3 ? 'REJECTED' : 'ACCEPTED', purchaseMxn: 3_000 })),
    ]
    const result = aggregateTireCohorts(rows, policy)
    const stages = result.casingAcceptance[0].stages
    expect(stages.map(stage => stage.stage)).toEqual(['NEW', 'RETREAD_1'])
    expect(stages[0].conditionalAcceptanceRate).toBe(0.8)
    expect(stages[1].conditionalAcceptanceRate).toBe(0.75)
    expect(stages[1].rawCumulativeAcceptanceRate).toBeCloseTo(0.6, 12)
    expect(stages[1].cumulativeRateEligibleForReview).toBe(true)
    expect(stages[0].confidenceInterval.lower).toBeGreaterThan(0)
    expect(stages[0].confidenceInterval.upper).toBeLessThanOrEqual(1)
  })

  it('excludes incomplete cycles and blocks small or discontinuous stage chains', () => {
    const rows = [
      record('open', { lifeKm: 50_000, open: true }),
      record('retread-two-a', { lifeKm: 40_000, stage: 2 }),
      record('retread-two-b', { lifeKm: 41_000, stage: 2 }),
    ]
    const result = aggregateTireCohorts(rows, policy)
    expect(result.excluded).toEqual([{ id: 'open', blockers: ['CYCLE_OPEN'] }])
    expect(result.cohorts[0].readinessReasons).toContain('SAMPLE_BELOW_POLICY')
    expect(result.casingAcceptance[0].stages[0].chainContiguous).toBe(false)
    expect(result.casingAcceptance[0].stages[0].cumulativeRateEligibleForReview).toBe(false)
  })

  it('rejects duplicates and does not double count casing stages', () => {
    const duplicateId = record('same', { lifeKm: 80_000 })
    expect(() => aggregateTireCohorts([duplicateId, structuredClone(duplicateId)], policy)).toThrow('Duplicate tire cohort record id')
    const otherId = structuredClone(duplicateId)
    otherId.id = 'other'
    expect(() => aggregateTireCohorts([duplicateId, otherId], policy)).toThrow('Duplicate casing stage')
  })

  it('requires every threshold to be explicit and valid', () => {
    expect(TireCohortStatisticsPolicySchema.safeParse({ ...policy, minimumClosedCycles: 1 }).success).toBe(false)
    const { confidenceZ: _, ...missing } = policy
    expect(TireCohortStatisticsPolicySchema.safeParse(missing).success).toBe(false)
    expect(() => aggregateTireCohorts([], policy)).toThrow('requires records')
  })
})
