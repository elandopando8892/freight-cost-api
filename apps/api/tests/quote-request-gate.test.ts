import { describe, expect, it } from 'vitest'
import { QuoteRequestGate } from '../../web/lib/quote-request-gate.js'

describe('quote request/revision guard', () => {
  it('does not accept a delayed success for an edited draft', () => {
    const gate = new QuoteRequestGate()
    const old = gate.begin()!
    gate.invalidate()
    const current = gate.begin()!
    expect(gate.isCurrent(old)).toBe(false)
    expect(gate.isCurrent(current)).toBe(true)
    gate.finish(old)
    expect(gate.isCurrent(current)).toBe(true)
  })

  it('does not accept a delayed error after a new result', () => {
    const gate = new QuoteRequestGate()
    const old = gate.begin()!
    gate.invalidate()
    const newer = gate.begin()!
    gate.finish(old)
    expect(gate.isCurrent(old)).toBe(false)
    expect(gate.isCurrent(newer)).toBe(true)
  })

  it('invalidates an in-flight response on reset or unmount', () => {
    const gate = new QuoteRequestGate()
    const pending = gate.begin()!
    gate.invalidate()
    expect(gate.isCurrent(pending)).toBe(false)
  })

  it('deduplicates overlapping button and keyboard submissions synchronously', () => {
    const gate = new QuoteRequestGate()
    const first = gate.begin()!
    expect(gate.begin()).toBeNull()
    expect(gate.begin()).toBeNull()
    gate.finish(first)
    expect(gate.begin()).not.toBeNull()
  })
})
