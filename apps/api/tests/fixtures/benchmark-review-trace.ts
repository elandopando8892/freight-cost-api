import { ownedD2DFixture } from './benchmark-owned-d2d.js'
import { PARAMETER_DEFINITIONS } from '../../src/data/parameter-catalog.js'
import { calculateOwnedD2DScenarios } from '../../src/modules/engine/benchmark-owned-d2d.js'
import { projectBenchmarkReview } from '../../src/modules/engine/benchmark-review-projection.js'

/** Synthetic QA only, never public benchmark evidence or product defaults. */
export function economicTraceInput() {
  const input = ownedD2DFixture()
  const key = PARAMETER_DEFINITIONS.find(p => p.section === 'COST_TIRES' && p.field === 'Qty Recapeadas')!.key
  for (const leg of [input.route.mx, input.route.us]) {
    const row = leg.parameters.parameters.find(p => p.key === key)!
    row.value = 0
    row.derivation = 'QA sintética: sin recapeadas independientes; no adoptar ni calibrar'
  }
  return input
}
export function economicTraceFixture() {
  const result = projectBenchmarkReview(calculateOwnedD2DScenarios(economicTraceInput()))
  if (!result.scenarios) throw new Error('Incomplete synthetic trace fixture')
  return { ...result, scenarios: result.scenarios }
}
