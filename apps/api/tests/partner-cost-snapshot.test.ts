import { describe, expect, it } from 'vitest'
import { frozenPartnerCost, partnerHash, reviewedPartnerCost } from '../src/modules/engine/partner-cost-snapshot.js'
import { thirdPartyFixture } from './fixtures/third-party-cost.js'

describe('frozen partner economics', () => {
  it('uses a stable checksum regardless of property order', () => {
    expect(partnerHash({ a: 1, b: { d: 2, c: 3 } })).toBe(partnerHash({ b: { c: 3, d: 2 }, a: 1 }))
  })
  it('retains FX, terms, input and exact cent-rounded results across JSON storage', () => {
    const report = reviewedPartnerCost(thirdPartyFixture())
    expect(frozenPartnerCost(JSON.parse(JSON.stringify(report)))).toEqual(report)
    expect(report.purchaseCostUsd).toBe(2530)
    expect(report.input.fx?.mxnPerUsd).toBe(17)
    expect(report.reviewChecksum).toMatch(/^[a-f0-9]{64}$/)
  })
  it.each(['input', 'output', 'version'])('detects modified %s', kind => {
    const report = reviewedPartnerCost(thirdPartyFixture())
    if (kind === 'input') report.input.mex.linehaul += 1
    if (kind === 'output') report.purchaseCostUsd = 1
    if (kind === 'version') report.modelVersion = 'future'
    expect(() => frozenPartnerCost(report)).toThrow('integrity mismatch')
  })
})
