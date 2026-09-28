import { expect, it } from 'vitest'
import contract from '../../../docs/FCM_TIRE_COHORT_SEGMENT_CONTRACT_2026-09-28.json'
import { OperationalSegmentSchema } from '../src/modules/cost-bases/operational-segments.js'
import { TireCohortRecordSchema } from '../src/modules/cost-bases/tire-cohort.js'

it('audits every governed segment against the actual tire cohort v1 schema', () => {
  const cohortFields = TireCohortRecordSchema.innerType().shape
  expect(contract.segments.map(item => item.id).sort()).toEqual([...OperationalSegmentSchema.options].sort())
  for (const segment of contract.segments) {
    expect(cohortFields.operationalSegment.safeParse(segment.id).success)
      .toBe(segment.cohortIdAccepted)
  }
  expect(contract.segments.filter(item => item.cohortIdAccepted)).toHaveLength(4)
  expect(contract.legacyCohortIdsWithoutAutomaticMapping.sort()).toEqual(
    cohortFields.operationalSegment.options
      .filter(id => !OperationalSegmentSchema.safeParse(id).success).sort(),
  )
  const currency = cohortFields.installation.shape.installedCost.shape.currency
  expect(currency.safeParse(contract.cohortCostCurrency).success).toBe(true)
  expect(currency.safeParse('USD').success).toBe(false)
  expect(contract.adoptedParameterCount).toBe(0)
  expect(contract.quoteEligible).toBe(false)
})
