import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CompleteTireLifecycleSchema,
  deriveTireLifecycleCandidate,
  TirePhysicalPositionSchema,
} from '../src/modules/cost-bases/tire-lifecycle-economics.js'

const evidence = [{
  id: 'synthetic-controlled-evidence',
  sourceUrl: 'https://example.com/controlled-evidence',
  observedOn: '2026-09-27',
}]

const completeSyntheticLifecycle = {
  position: 'DRIVE',
  quantityOnVehicle: 8,
  identity: {
    manufacturer: 'Synthetic', model: 'Controlled', size: '11R22.5', loadRange: 'H',
    serviceDescription: '146/143L', application: 'DRIVE', fitmentStatus: 'VERIFIED_EXACT',
    evidence,
  },
  newTire: {
    installedCostMxn: 8_000, lifeKm: 100_000,
    costBasis: 'DELIVERED_INSTALLED_WITH_DISPOSAL', evidence,
  },
  retreadStages: [{
    stage: 1, reachProbability: 0.8, installedCostMxn: 3_000, lifeKm: 70_000,
    costBasis: 'DELIVERED_INSTALLED_WITH_DISPOSAL', evidence,
  }, {
    stage: 2, reachProbability: 0.5, installedCostMxn: 3_000, lifeKm: 60_000,
    costBasis: 'DELIVERED_INSTALLED_WITH_DISPOSAL', evidence,
  }],
  expectedTerminalCasingCreditMxn: 500,
  terminalCasingEvidence: evidence,
  currency: 'MXN',
  evidenceStatus: 'EVIDENCED_FOR_TARGET_FLEET',
}

describe('tire lifecycle economics', () => {
  it('models retreads as sequential casing cycles, not additional wheel positions', () => {
    expect(TirePhysicalPositionSchema.safeParse('RETREAD').success).toBe(false)
    const result = deriveTireLifecycleCandidate(completeSyntheticLifecycle)
    expect(result.expectedLifecycleCostMxn).toBe(11_400)
    expect(result.expectedLifecycleKm).toBe(186_000)
    expect(result.costMxnPerPhysicalTireKm).toBeCloseTo(11_400 / 186_000, 12)
    expect(result.vehicleCostMxnPerKm).toBeCloseTo(8 * 11_400 / 186_000, 12)
    expect(result.retreadIsPhysicalPosition).toBe(false)
    expect(result.quoteEligible).toBe(false)
    expect(result.databaseWriteAllowed).toBe(false)
  })

  it('requires exact fitment, installed cost basis and target-fleet life evidence', () => {
    for (const change of [
      { identity: { ...completeSyntheticLifecycle.identity, fitmentStatus: 'PARTIAL' } },
      { newTire: { ...completeSyntheticLifecycle.newTire, lifeKm: null } },
      { newTire: { ...completeSyntheticLifecycle.newTire, costBasis: 'ASKING_PRICE' } },
      { evidenceStatus: 'PUBLIC_REFERENCE_ONLY' },
    ]) {
      expect(CompleteTireLifecycleSchema.safeParse({ ...completeSyntheticLifecycle, ...change }).success).toBe(false)
    }
  })

  it('requires consecutive stages with non-increasing cumulative reach probabilities', () => {
    const invalidStages = completeSyntheticLifecycle.retreadStages.map((stage, index) => ({
      ...stage,
      stage: index + 2,
      reachProbability: index === 0 ? 0.5 : 0.8,
    }))
    expect(CompleteTireLifecycleSchema.safeParse({
      ...completeSyntheticLifecycle,
      retreadStages: invalidStages,
    }).success).toBe(false)
  })

  it('keeps every public observation blocked from adoption', () => {
    const pack = JSON.parse(readFileSync(
      resolve('../../docs/FCM_TIRE_LIFECYCLE_SOURCES_2026-09-27.json'),
      'utf8',
    ))
    const observations = [
      ...pack.newTirePriceObservations,
      ...pack.retreadPriceObservations,
      ...pack.lifecycleClaims,
    ]
    expect(observations.length).toBeGreaterThan(0)
    expect(observations.every((row: { adoptionStatus: string }) => row.adoptionStatus === 'BLOCKED')).toBe(true)
    expect(pack.governance.adoptedParameterCount).toBe(0)
    expect(pack.missingTargetEvidenceEs).toHaveLength(pack.missingTargetEvidence.length)
    expect(pack.identityDiscrepancies).toHaveLength(2)
    expect(pack.identityDiscrepancies.every((row: { status: string }) => row.status === 'UNRESOLVED')).toBe(true)
  })
})
