import { isDeepStrictEqual } from 'node:util'
import type { RelayReview } from '../engine/b2-own-relay-contract.js'

/** Compatibility for observed persisted IEEE-754 representation drift, not economic tolerance.
 * Only derived USD amounts qualify: at most three adjacent binary64 values AND < 1e-9 USD.
 * Inputs (including FX), identities, evidence, order, nulls and zero remain exact.
 * Never mutates the audit payload; the immutable verified snapshot is the returned authority.
 */
export function planningCalculationMatches(stored: RelayReview, verified: RelayReview): boolean {
  const candidate = structuredClone(stored)
  const bits = (value: number) => {
    const buffer = new ArrayBuffer(8), view = new DataView(buffer)
    view.setFloat64(0, value)
    return view.getBigUint64(0)
  }
  const restore = (actual: number, expected: number) => {
    if (Object.is(actual, expected)) return expected
    if (!Number.isFinite(actual) || !Number.isFinite(expected) || actual <= 0 || expected <= 0
      || Math.abs(actual - expected) >= 1e-9) return actual
    const distance = bits(actual) - bits(expected)
    return distance >= -3n && distance <= 3n ? expected : actual
  }
  const resourceFields = ['monthlyFixedUsd','byDistanceUsd','byTimeUsd','cfuUsd','cvuUsd','costUsd'] as const
  candidate.case.resources.forEach((resource, index) => {
    const expected = verified.case.resources[index]
    if (expected) for (const field of resourceFields) resource[field] = restore(resource[field], expected[field])
  })
  for (const field of ['cfuUsd','cvuUsd','productiveCostUsd'] as const)
    candidate.case.outputs[field] = restore(candidate.case.outputs[field], verified.case.outputs[field])
  candidate.case.variableCosts.forEach((row, index) => {
    const expected = verified.case.variableCosts[index]
    if (expected && row.amountUsd !== null && expected.amountUsd !== null)
      row.amountUsd = restore(row.amountUsd, expected.amountUsd)
  })
  return isDeepStrictEqual(candidate, verified)
}
