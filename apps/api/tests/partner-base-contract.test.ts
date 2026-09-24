import { describe, expect, it } from 'vitest'
import { calculatePublishedPartnerBase, PartnerBaseTermsSchema } from '../src/modules/cost-bases/partner-base-contract.js'
import { thirdPartyFixture } from './fixtures/third-party-cost.js'

function fixture() {
  const { serviceDate, fx, ...terms } = thirdPartyFixture()
  return {
    base: { orgId: 'org-a', costBaseId: 'base-a', versionId: 'version-a', version: 1,
      model: 'FCM_THIRD_PARTY_FLAT_V1', baseStatus: 'ACTIVE', status: 'PUBLISHED', isActive: true, terms },
    trip: { serviceDate, fx },
  }
}

describe('published partner base contract (synthetic, no persistence)', () => {
  it('feeds existing calculator from reusable terms and retains version lineage', () => {
    const { base, trip } = fixture()
    const result = calculatePublishedPartnerBase('org-a', base, trip)
    expect(result.purchaseCostUsd).toBe(2530)
    expect(result.baseLineage).toMatchObject({ costBaseId: 'base-a', versionId: 'version-a', version: 1 })
    expect(result.sourceStatus).toBe('USER_SUPPLIED_UNVERIFIED')
    expect(result.input.assumptions).toBe(base.terms.assumptions)
  })
  it.each([{ status: 'DRAFT' }, { status: 'ARCHIVED' }, { isActive: false },
    { baseStatus: 'ARCHIVED' }, { model: 'OPERATIONAL_V3' }])('rejects non-usable lifecycle/model %j', change => {
    const { base, trip } = fixture()
    expect(() => calculatePublishedPartnerBase('org-a', { ...base, ...change }, trip)).toThrow()
  })
  it('rejects another tenant', () => {
    const { base, trip } = fixture()
    expect(() => calculatePublishedPartnerBase('org-b', base, trip)).toThrow(/organization/)
  })
  it.each(['mex', 'assumptions', 'origin', 'equipment', 'direction'])('rejects quote overrides: %s', field => {
    const { base, trip } = fixture()
    expect(() => calculatePublishedPartnerBase('org-a', base, { ...trip, [field]: 'override' })).toThrow()
  })
  it('keeps expired tariffs incomplete rather than manufacturing a price', () => {
    const { base, trip } = fixture()
    const result = calculatePublishedPartnerBase('org-a', base, { ...trip, serviceDate: '2026-11-01' })
    expect(result.status).toBe('INCOMPLETE')
    expect(result.purchaseCostUsd).toBeNull()
  })
  it('does not turn unknown conditions into zero', () => {
    const { base, trip } = fixture()
    base.terms.mex.fuel = { mode: 'UNKNOWN' }
    expect(calculatePublishedPartnerBase('org-a', base, trip).purchaseCostUsd).toBeNull()
  })
  it('hashes terms independently of trip FX and object key order', () => {
    const { base, trip } = fixture()
    const first = calculatePublishedPartnerBase('org-a', base, trip)
    const reordered = { ...base, terms: Object.fromEntries(Object.entries(base.terms).reverse()) }
    const second = calculatePublishedPartnerBase('org-a', reordered, { ...trip, fx: { ...trip.fx!, mxnPerUsd: 18 } })
    expect(second.baseLineage.termsChecksum).toBe(first.baseLineage.termsChecksum)
    expect(second.purchaseCostUsd).not.toBe(first.purchaseCostUsd)
    base.terms.usa.linehaul += 100
    expect(calculatePublishedPartnerBase('org-a', base, trip).baseLineage.termsChecksum).not.toBe(first.baseLineage.termsChecksum)
  })
  it('keeps trip date and FX out of reusable base terms', () => {
    expect(() => PartnerBaseTermsSchema.parse(thirdPartyFixture())).toThrow()
  })
})
