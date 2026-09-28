import { describe, expect, it } from 'vitest'
import { OperationalSegmentSchema } from '../src/modules/cost-bases/operational-segments.js'
import { reviewTireCohortRecordV2, TireCohortRecordV2Schema } from '../src/modules/cost-bases/tire-cohort-v2.js'
import { TireCohortRecordSchema } from '../src/modules/cost-bases/tire-cohort.js'

const evidence = [
  { id: 'operator', kind: 'FLEET_DOCUMENT', locator: 'local://operator.pdf', note: 'Synthetic operator evidence' },
  { id: 'install', kind: 'ODOMETER_CAPTURE', locator: 'local://install.jpg', note: 'Synthetic install evidence' },
  { id: 'invoice', kind: 'INVOICE', locator: 'local://invoice.pdf', note: 'Synthetic invoice evidence' },
  { id: 'fitment', kind: 'FLEET_DOCUMENT', locator: 'local://fitment.pdf', note: 'Synthetic fitment evidence' },
  { id: 'remove', kind: 'ODOMETER_CAPTURE', locator: 'local://remove.jpg', note: 'Synthetic removal evidence' },
  { id: 'inspection', kind: 'INSPECTION', locator: 'local://inspection.pdf', note: 'Synthetic inspection evidence' },
]

function fixture(segment = 'INTRA_US', country: 'MX' | 'US' = 'US', currency: 'MXN' | 'USD' = 'USD') {
  return {
    schemaVersion: 2, researchOnly: true, id: 'synthetic-v2-cycle', revision: 1,
    operationalSegment: segment,
    leg: { country, costBearer: 'BASE_OPERATOR', costKind: 'DIRECT_TIRE_COST', evidenceIds: ['operator'] },
    asset: { id: 'TR-TEST-1', type: 'TRACTOR', configuration: '6x4 synthetic' },
    position: { group: 'DRIVE', slot: 'D1-LI' },
    tire: { casingId: 'CASE-TEST-1', stage: { kind: 'NEW', sequence: null },
      manufacturer: 'Synthetic', model: 'Controlled', size: '11R22.5', loadRange: 'H', serviceDescription: '146/143L',
      fitmentStatus: 'VERIFIED_EXACT', fitmentEvidenceIds: ['fitment'] },
    distanceMeter: { basis: 'ASSET_ODOMETER', sourceId: 'TR-TEST-1' },
    installation: { date: '2026-01-01', readingKm: 100_000, treadDepthMm: 21,
      installedCost: { currency, costBasis: 'DELIVERED_INSTALLED_WITH_DISPOSAL',
        purchaseAmount: 800, taxAmount: 40, freightAmount: 20, mountingAmount: 15,
        balancingAmount: 5, disposalAmount: 0, evidenceIds: ['invoice'] }, evidenceIds: ['install'] },
    removal: { date: '2026-09-01', readingKm: 180_000, treadDepthMm: 2, reason: 'WORN_OUT',
      casingInspection: { outcome: 'ACCEPTED', reason: null, evidenceIds: ['inspection'] }, evidenceIds: ['remove'] },
    evidence: structuredClone(evidence),
  }
}

describe('additive tire cohort v2 research contract', () => {
  it('accepts all nine canonical segments only on their own leg', () => {
    const countryFor = (id: string): 'MX' | 'US' => id === 'INTRA_US' || id === 'US_DRAYAGE' || id === 'D2D_US_MX_PARTNER' ? 'US' : 'MX'
    for (const segment of OperationalSegmentSchema.options) {
      expect(TireCohortRecordV2Schema.safeParse(fixture(segment, countryFor(segment))).success).toBe(true)
    }
    expect(TireCohortRecordV2Schema.safeParse(fixture('D2D_MX_US_HANDOFF', 'MX')).success).toBe(false)
    expect(TireCohortRecordV2Schema.safeParse(fixture('D2D_BINATIONAL_SAME_COMPANY', 'MX')).success).toBe(false)
  })

  it('calculates native USD stage economics without converting or allowing adoption', () => {
    const reviewed = reviewTireCohortRecordV2(fixture())
    expect(reviewed.installedCostNative).toBe(880)
    expect(reviewed.observedKm).toBe(80_000)
    expect(reviewed.observedCostNativePerKm).toBeCloseTo(0.011, 12)
    expect(reviewed.currency).toBe('USD')
    expect(reviewed.readiness).toBe('READY_FOR_RESEARCH_COMPARISON')
    expect(reviewed.fxConverted).toBe(false)
    expect(reviewed.proposalEligible).toBe(false)
    expect(reviewed.parameterWriteAllowed).toBe(false)
    expect(reviewed.quoteEligible).toBe(false)
    expect(reviewed.persistenceAllowed).toBe(false)
    expect(TireCohortRecordSchema.safeParse(fixture()).success).toBe(false)
  })

  it('separates country, currency, segment and stage in comparison keys', () => {
    const usd = reviewTireCohortRecordV2(fixture('D2D_BINATIONAL_OWN', 'US', 'USD'))
    const mxn = reviewTireCohortRecordV2(fixture('D2D_BINATIONAL_OWN', 'US', 'MXN'))
    const mxLeg = reviewTireCohortRecordV2(fixture('D2D_BINATIONAL_OWN', 'MX', 'USD'))
    const retreadInput = fixture('D2D_BINATIONAL_OWN', 'US', 'USD')
    retreadInput.tire.stage = { kind: 'RETREAD', sequence: 1 } as typeof retreadInput.tire.stage
    const retread = reviewTireCohortRecordV2(retreadInput)
    expect(new Set([usd.comparisonKey, mxn.comparisonKey, mxLeg.comparisonKey, retread.comparisonKey]).size).toBe(4)
  })

  it('rejects partner cost, wrong leg, missing ownership proof and invalid cycle', () => {
    const partner = fixture('D2D_US_MX_PARTNER', 'US')
    partner.leg.costBearer = 'PARTNER' as typeof partner.leg.costBearer
    expect(TireCohortRecordV2Schema.safeParse(partner).success).toBe(false)
    const tariff = fixture()
    tariff.leg.costKind = 'PARTNER_TARIFF' as typeof tariff.leg.costKind
    expect(TireCohortRecordV2Schema.safeParse(tariff).success).toBe(false)
    expect(TireCohortRecordV2Schema.safeParse(fixture('D2D_US_MX_PARTNER', 'MX')).success).toBe(false)
    const noProof = fixture()
    noProof.leg.evidenceIds = ['missing']
    expect(TireCohortRecordV2Schema.safeParse(noProof).success).toBe(false)
    const badCycle = fixture()
    badCycle.removal.readingKm = badCycle.installation.readingKm
    expect(TireCohortRecordV2Schema.safeParse(badCycle).success).toBe(false)
    const badCurrency = fixture()
    badCurrency.installation.installedCost.currency = 'CAD' as 'USD'
    expect(TireCohortRecordV2Schema.safeParse(badCurrency).success).toBe(false)
  })

  it('accepts chassis and straight-truck assets but requires target cost and exact-fitment evidence for readiness', () => {
    const chassis = fixture('US_DRAYAGE', 'US')
    chassis.asset.type = 'CHASSIS'
    expect(TireCohortRecordV2Schema.safeParse(chassis).success).toBe(true)
    const local = fixture('MX_LOCAL', 'MX', 'MXN')
    local.asset.type = 'STRAIGHT_TRUCK'
    expect(TireCohortRecordV2Schema.safeParse(local).success).toBe(true)
    const publicOnly = fixture()
    publicOnly.evidence.push({ id: 'public', kind: 'PUBLIC_REFERENCE', locator: 'https://example.org/benchmark', note: 'Synthetic reference' })
    publicOnly.installation.installedCost.evidenceIds = ['public']
    publicOnly.tire.fitmentStatus = 'UNVERIFIED'
    publicOnly.tire.fitmentEvidenceIds = []
    const reviewed = reviewTireCohortRecordV2(publicOnly)
    expect(reviewed.readiness).toBe('INCOMPLETE')
    expect(reviewed.blockers).toEqual(expect.arrayContaining(['TARGET_COST_EVIDENCE_MISSING', 'FITMENT_UNVERIFIED']))
  })

  it('does not treat public references as fitment or measured-distance evidence', () => {
    const publicOnly = fixture()
    publicOnly.evidence.push({ id: 'public', kind: 'PUBLIC_REFERENCE', locator: 'https://example.org/benchmark', note: 'Synthetic reference' })
    publicOnly.tire.fitmentEvidenceIds = ['public']
    publicOnly.installation.evidenceIds = ['public']
    publicOnly.removal.evidenceIds = ['public']
    const reviewed = reviewTireCohortRecordV2(publicOnly)
    expect(reviewed.readiness).toBe('INCOMPLETE')
    expect(reviewed.blockers).toEqual(expect.arrayContaining(['FITMENT_UNVERIFIED', 'DISTANCE_EVIDENCE_MISSING']))
  })

  it('keeps incomplete native costs and open cycles pending rather than zero', () => {
    const incomplete = fixture()
    incomplete.installation.installedCost.freightAmount = null as unknown as number
    incomplete.removal = null as unknown as typeof incomplete.removal
    const reviewed = reviewTireCohortRecordV2(incomplete)
    expect(reviewed.installedCostNative).toBeNull()
    expect(reviewed.observedCostNativePerKm).toBeNull()
    expect(reviewed.blockers).toEqual(expect.arrayContaining(['INSTALLED_COST_INCOMPLETE', 'CYCLE_OPEN']))
  })
})
