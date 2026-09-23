import { describe, expect, it } from 'vitest'
import { calculateThirdPartyCost } from '../src/modules/engine/third-party-cost.js'
import { thirdPartyFixture } from './fixtures/third-party-cost.js'

describe('third-party flat purchase composition', () => {
  it('reconciles a manually calculated mixed-currency purchase and counts inclusions only once', () => {
    const result = calculateThirdPartyCost(thirdPartyFixture())
    // 17000/17 + 1700/17 + 850/17 + 1200 + 30 + 150 = 2530.
    expect(result).toMatchObject({ status: 'ESTIMATE', purchaseCostUsd: 2530, sourceStatus: 'USER_SUPPLIED_UNVERIFIED' })
    expect(result.lines).toHaveLength(6)
    expect(result.inclusions).toEqual([{ label: 'Combustible US', includedIn: 'Tarifa US' }, { label: 'Intercambio', includedIn: 'Tarifa MX' }])
    expect(result.input.mex.reference).toBe('QA-MX-001')
  })
  it.each(['MX_TO_US', 'US_TO_MX'] as const)('keeps direction %s independent of lead carrier nationality', direction => {
    const input = thirdPartyFixture()
    input.segment = 'D2D_US_MX_PARTNER'; input.direction = direction
    expect(calculateThirdPartyCost(input).purchaseCostUsd).toBe(2530)
  })
  it('does not convert missing terms or missing FX into zero-cost coverage', () => {
    const input = thirdPartyFixture()
    input.mex.fuel = { mode: 'UNKNOWN' }; input.crossing = { mode: 'UNKNOWN' }; delete input.fx
    const result = calculateThirdPartyCost(input)
    expect(result).toMatchObject({ status: 'INCOMPLETE', purchaseCostUsd: null, knownSubtotalUsd: null })
    expect(result.issues.map(issue => issue.field)).toEqual(['mex.fuel', 'crossing', 'fx'])
  })
  it('blocks an out-of-validity quote, separate charge, reversed range and future-to-trip FX', () => {
    const input = thirdPartyFixture()
    input.mex.validUntil = '2026-10-09'
    input.usa.validFrom = '2026-11-01'
    if (input.crossing.mode === 'EXTRA') input.crossing.validUntil = '2026-10-09'
    input.fx!.asOf = '2026-10-11'
    expect(calculateThirdPartyCost(input).issues.map(issue => issue.field)).toEqual(['mex', 'usa', 'crossing', 'fx.asOf'])
    expect(calculateThirdPartyCost(input).purchaseCostUsd).toBeNull()
  })
  it('accepts all-USD quotes without inventing FX and rounds each converted line to cents', () => {
    const input = thirdPartyFixture()
    input.mex.currency = 'USD'; delete input.fx
    expect(calculateThirdPartyCost(input).purchaseCostUsd).toBe(20930)
    const fractional = thirdPartyFixture()
    fractional.mex.linehaul = 0.01
    const result = calculateThirdPartyCost(fractional)
    expect(result.purchaseCostUsd).toBe(result.lines.reduce((total, line) => total + Math.round(line.usd! * 100), 0) / 100)
  })
  it.each([
    { segment: 'D2D_TRANSSHIPMENT' }, { segment: 'MX_DRAYAGE' }, { service: 'ROUNDTRIP' },
    { crossing: { mode: 'INCLUDED_MX', amount: 150 } }, { serviceDate: '2026-02-30' },
    { fx: { mxnPerUsd: 0, source: 'Synthetic', asOf: '2026-10-01' } },
  ])('rejects unsupported or contradictory input %j', change => {
    expect(() => calculateThirdPartyCost({ ...thirdPartyFixture(), ...change })).toThrow()
  })
  it('rejects negative, non-finite and overprecision prices', () => {
    for (const linehaul of [-1, NaN, Infinity, 1.001, 0.00000001]) {
      const input = thirdPartyFixture(); input.mex.linehaul = linehaul
      expect(() => calculateThirdPartyCost(input)).toThrow()
    }
  })
  it('rounds exact half-cent conversions up without binary floating-point loss', () => {
    const input = thirdPartyFixture()
    input.mex.linehaul = 2.01; input.fx!.mxnPerUsd = 2
    expect(calculateThirdPartyCost(input).lines[0].usd).toBe(1.01)
    input.fx!.mxnPerUsd = 17.1234567
    expect(() => calculateThirdPartyCost(input)).toThrow()
  })
})
