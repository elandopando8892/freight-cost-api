import { describe, expect, it } from 'vitest'
import {
  aggregateTireCohortsV2, createTireCohortV2ResearchSnapshot,
  verifyTireCohortV2ResearchSnapshot,
} from '../src/modules/cost-bases/tire-cohort-v2-statistics.js'
import { aggregateTireCohorts } from '../src/modules/cost-bases/tire-cohort-statistics.js'
import { reviewTireCohortRecordV2 } from '../src/modules/cost-bases/tire-cohort-v2.js'

const policy = {
  minimumClosedCycles: 2, outlierFenceMultiplier: 1.5,
  maximumOutlierShare: 0.25, maximumCoefficientOfVariation: 0.3,
  shapeMeanMedianGapRatio: 0.2,
}

function fixture(id: string, country: 'MX' | 'US' = 'US', currency: 'MXN' | 'USD' = 'USD', km = 80_000) {
  return {
    schemaVersion: 2, researchOnly: true, id, revision: 1,
    operationalSegment: 'D2D_BINATIONAL_OWN',
    leg: { country, costBearer: 'BASE_OPERATOR', costKind: 'DIRECT_TIRE_COST', evidenceIds: ['operator'] },
    asset: { id: `TR-${id}`, type: 'TRACTOR', configuration: 'synthetic 6x4' },
    position: { group: 'DRIVE', slot: 'D1-LI' },
    tire: { casingId: `CASE-${id}`, stage: { kind: 'NEW', sequence: null },
      manufacturer: 'Synthetic', model: 'Controlled', size: '11R22.5', loadRange: 'H', serviceDescription: '146/143L',
      fitmentStatus: 'VERIFIED_EXACT', fitmentEvidenceIds: ['fitment'] },
    distanceMeter: { basis: 'ASSET_ODOMETER', sourceId: `TR-${id}` },
    installation: { date: '2026-01-01', readingKm: 100_000, treadDepthMm: 21,
      installedCost: { currency, costBasis: 'DELIVERED_INSTALLED_WITH_DISPOSAL',
        purchaseAmount: 800, taxAmount: 40, freightAmount: 20, mountingAmount: 15,
        balancingAmount: 5, disposalAmount: 0, evidenceIds: ['invoice'] }, evidenceIds: ['install'] },
    removal: { date: '2026-09-01', readingKm: 100_000 + km, treadDepthMm: 2, reason: 'WORN_OUT',
      casingInspection: { outcome: 'ACCEPTED', reason: null, evidenceIds: ['inspection'] }, evidenceIds: ['remove'] },
    evidence: [
      { id: 'operator', kind: 'FLEET_DOCUMENT', locator: 'local://operator.pdf', note: 'Synthetic' },
      { id: 'fitment', kind: 'FLEET_DOCUMENT', locator: 'local://fitment.pdf', note: 'Synthetic' },
      { id: 'invoice', kind: 'INVOICE', locator: 'local://invoice.pdf', note: 'Synthetic' },
      { id: 'install', kind: 'ODOMETER_CAPTURE', locator: 'local://install.jpg', note: 'Synthetic' },
      { id: 'remove', kind: 'ODOMETER_CAPTURE', locator: 'local://remove.jpg', note: 'Synthetic' },
      { id: 'inspection', kind: 'INSPECTION', locator: 'local://inspection.pdf', note: 'Synthetic' },
    ],
  }
}

describe('tire cohort v2 research aggregation and snapshot contract', () => {
  it('separates MXN, USD and country even for the same product and segment', () => {
    const rows = [fixture('usd-a'), fixture('usd-b', 'US', 'USD', 82_000),
      fixture('mxn-a', 'US', 'MXN'), fixture('mx-a', 'MX', 'USD')]
    const result = aggregateTireCohortsV2(rows, policy)
    expect(result.cohorts).toHaveLength(3)
    const usUsd = result.cohorts.find(row => row.country === 'US' && row.currency === 'USD')!
    expect(usUsd.recordIds).toEqual(['usd-a', 'usd-b'])
    expect(usUsd.costNativePerKm.count).toBe(2)
    expect(usUsd.costNativePerKm.mean).toBeCloseTo(((880 / 80_000) + (880 / 82_000)) / 2, 12)
    expect(usUsd.researchReviewable).toBe(true)
    expect(result.cohorts.filter(row => row.recordIds.length === 1).every(row =>
      row.readinessReasons.includes('SAMPLE_BELOW_POLICY'))).toBe(true)
    expect(result.fxConverted).toBe(false)
    expect(result.parameterWriteAllowed).toBe(false)
    expect(result.quoteEligible).toBe(false)
    expect(() => aggregateTireCohorts(rows, policy)).toThrow()
  })

  it('excludes unverified observations rather than treating missing cost as zero', () => {
    const incomplete = fixture('pending')
    incomplete.installation.installedCost.freightAmount = null as unknown as number
    const result = aggregateTireCohortsV2([fixture('complete'), incomplete], policy)
    expect(result.receivedRecordCount).toBe(2)
    expect(result.includedRecordCount).toBe(1)
    expect(result.excluded).toEqual([{ id: 'pending', blockers: ['INSTALLED_COST_INCOMPLETE'] }])
    expect(result.cohorts[0].costNativePerKm.mean).toBe(0.011)
    expect(result.cohorts[0].researchReviewable).toBe(false)
  })

  it('rejects duplicate record IDs and duplicate physical casing stages', () => {
    expect(() => aggregateTireCohortsV2([fixture('a'), fixture('a')], policy)).toThrow('Duplicate tire cohort v2 record id')
    const repeatedCasing = fixture('b')
    repeatedCasing.tire.casingId = 'CASE-a'
    expect(() => aggregateTireCohortsV2([fixture('a'), repeatedCasing], policy)).toThrow('Duplicate tire cohort v2 casing stage')
  })

  it('produces a deterministic fingerprint regardless of input order', () => {
    const a = fixture('a')
    const b = fixture('b')
    expect(aggregateTireCohortsV2([a, b], policy).fingerprint)
      .toBe(aggregateTireCohortsV2([b, a], policy).fingerprint)
  })

  it('verifies tenant and all snapshot content, including evidence not used by the aggregate', () => {
    const snapshot = createTireCohortV2ResearchSnapshot({
      snapshotId: '33333333-3333-4333-8333-333333333333', orgId: 'tenant-a',
      createdById: 'operator-a', requestId: '44444444-4444-4444-8444-444444444444',
      version: 1, createdAt: '2026-09-28T12:00:00.000Z',
      comparisonKey: reviewTireCohortRecordV2(fixture('a')).comparisonKey,
      records: [fixture('a')], policy,
    })
    expect(verifyTireCohortV2ResearchSnapshot(snapshot, 'tenant-a').aggregation.fingerprint)
      .toBe(snapshot.aggregationFingerprint)
    expect(() => verifyTireCohortV2ResearchSnapshot(snapshot, 'tenant-b')).toThrow('TENANT_RESOURCE_NOT_FOUND')
    const altered = structuredClone(snapshot)
    altered.records[0].evidence[0].note = 'Changed after capture'
    expect(() => verifyTireCohortV2ResearchSnapshot(altered, 'tenant-a')).toThrow('SOURCE_SNAPSHOT_INTEGRITY_FAILURE')
    const alteredPolicy = structuredClone(snapshot)
    alteredPolicy.policy.minimumClosedCycles = 3
    expect(() => verifyTireCohortV2ResearchSnapshot(alteredPolicy, 'tenant-a')).toThrow('SOURCE_SNAPSHOT_INTEGRITY_FAILURE')
  })

  it('requires an explicit research policy and refuses empty input', () => {
    expect(() => aggregateTireCohortsV2([], policy)).toThrow('requires records')
    expect(() => aggregateTireCohortsV2([fixture('a')], { ...policy, maximumOutlierShare: 2 })).toThrow()
  })

  it('rejects finite inputs whose arithmetic would overflow', () => {
    const overflow = fixture('overflow')
    overflow.installation.installedCost.purchaseAmount = Number.MAX_VALUE
    overflow.installation.installedCost.taxAmount = Number.MAX_VALUE
    expect(() => aggregateTireCohortsV2([overflow], policy)).toThrow('Non-finite tire cohort v2 arithmetic')
    expect(() => aggregateTireCohortsV2([fixture('a', 'US', 'USD', 80_000),
      fixture('b', 'US', 'USD', 82_000)], { ...policy, outlierFenceMultiplier: Number.MAX_VALUE }))
      .toThrow('Non-finite tire cohort v2 statistic')
  })
})
