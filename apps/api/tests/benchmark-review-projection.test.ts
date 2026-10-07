import { expect, it } from 'vitest'
import { calculateOwnedD2DScenarios } from '../src/modules/engine/benchmark-owned-d2d.js'
import { projectBenchmarkReview } from '../src/modules/engine/benchmark-review-projection.js'
import { economicTraceInput, economicTraceFixture } from './fixtures/benchmark-review-trace.js'
import { parseReview } from '../../web/app/(app)/scenarios/benchmark/review-contract.js'

it('projects existing results without mutating inputs, rates or costs; client accepts actual engine output', () => {
  const result = calculateOwnedD2DScenarios(economicTraceInput())
  const before = JSON.stringify(result)
  const review = projectBenchmarkReview(result)
  expect(JSON.stringify(result)).toBe(before)
  expect(parseReview(JSON.stringify(review)).scenarios).toHaveLength(2)
  for (const [i, s] of review.scenarios!.entries()) {
    const original = result.scenarios![i].result
    expect(s.result.costs).toEqual(original.costs)
    expect(s.result.trace.resources.map(r => r.id)).toEqual(['trailer'])
    expect(review.sharedTractorResources!.map(r => r.id)).toEqual(['mx', 'us'])
    for (const [index, id] of (['mx', 'us'] as const).entries()) {
      const resource = review.sharedTractorResources![index]
      const derived = original.legs[id].parameterLineage
      expect(resource.costs).toEqual(original.legs[id].leg!.costs)
      for (const rate of resource.rates) {
        expect(rate.inputKeys).toEqual(derived.requirements[rate.key])
        expect(rate.value).toBe(derived.rates![rate.key]!.value)
      }
      expect(resource.inputs.every(p => derived.lineage.parameters.some(source => source.key === p.key && source.value === p.value))).toBe(true)
    }
    const box = s.result.trace.resources[0]
    expect(box.costs).toEqual(original.sharedTrailer!.costs)
    expect(box.inputs.find(p => p.key === 'horizon')!.value).toBe(result.lineage.fixed.capital.scenarios[i].horizon.value)
    expect(box.inputs.find(p => p.key === 'acquisitionCost')!.evidenceIds).toEqual(['capital:test'])
    expect(box.inputs.find(p => p.key === 'interest')!.evidenceIds).toEqual(['fixed:test'])
    expect(box.trip[0].evidenceIds).toEqual(['trip:test'])
  }
})
it('keeps missing inputs incomplete without inventing a trace or totals', () => {
  const input = economicTraceInput(); input.route.mx.trip.loadedKm = null as never
  const review = projectBenchmarkReview(calculateOwnedD2DScenarios(input))
  expect(review.status).toBe('INCOMPLETE'); expect(review.scenarios).toBeNull()
  expect(parseReview(JSON.stringify(review)).scenarios).toBeNull()
})
it('the complete synthetic response stays within the existing review limit', () => {
  expect(JSON.stringify(economicTraceFixture()).length).toBeLessThan(1_000_000)
})
it('supports the existing maximum of twenty scenarios within the review size limit', () => {
  const input = economicTraceInput()
  input.fixed.capital.scenarios = Array.from({ length: 20 }, (_, i) => ({ ...input.fixed.capital.scenarios[0], id: `QA-${i + 1}` }))
  input.fixed.financing = input.fixed.capital.scenarios.map(s => ({ ...input.fixed.financing[0], scenarioId: s.id }))
  const review = projectBenchmarkReview(calculateOwnedD2DScenarios(input))
  expect(review.scenarios).toHaveLength(20)
  const serialized = JSON.stringify(review)
  expect(serialized.length).toBeLessThan(1_000_000)
  expect(parseReview(serialized).scenarios).toHaveLength(20)
})
