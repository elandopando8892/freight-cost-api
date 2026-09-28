import { describe, expect, it } from 'vitest'
import { reviewTireCohortRecord, TireCohortRecordSchema } from '../src/modules/cost-bases/tire-cohort.js'

const evidence = [
  { id: 'mount', kind: 'ODOMETER_CAPTURE', locator: 'local://mount.jpg', note: 'Controlled fixture only' },
  { id: 'invoice', kind: 'INVOICE', locator: 'local://invoice.pdf', note: 'Controlled fixture only' },
  { id: 'remove', kind: 'ODOMETER_CAPTURE', locator: 'local://remove.jpg', note: 'Controlled fixture only' },
  { id: 'inspection', kind: 'INSPECTION', locator: 'local://inspection.pdf', note: 'Controlled fixture only' },
] as const

const fixture = () => ({
  schemaVersion: 1,
  researchOnly: true,
  id: 'synthetic-cycle-1',
  revision: 1,
  operationalSegment: 'INTRA_MEX',
  asset: { id: 'TR-TEST-01', type: 'TRACTOR', configuration: '6x4 synthetic' },
  position: { group: 'DRIVE', slot: 'D1-LI' },
  tire: {
    casingId: 'CASE-TEST-01', stage: { kind: 'NEW', sequence: null },
    manufacturer: 'Synthetic', model: 'Controlled', size: '11R22.5',
    loadRange: 'H', serviceDescription: '146/143L',
  },
  distanceMeter: { basis: 'ASSET_ODOMETER', sourceId: 'TR-TEST-01' },
  installation: {
    date: '2026-01-01', readingKm: 100_000, treadDepthMm: 21,
    installedCost: {
      currency: 'MXN', purchaseMxn: 6_000, taxMxn: 960, freightMxn: 200,
      mountingMxn: 180, balancingMxn: 120, disposalMxn: 0, evidenceIds: ['invoice'],
    },
    evidenceIds: ['mount'],
  },
  removal: {
    date: '2026-09-01', readingKm: 180_000, treadDepthMm: 2,
    reason: 'WORN_OUT',
    casingInspection: { outcome: 'ACCEPTED', reason: null, evidenceIds: ['inspection'] },
    evidenceIds: ['remove'],
  },
  evidence: structuredClone(evidence),
})

describe('tire cohort capture contract', () => {
  it('derives observed life and installed economics from one closed physical cycle', () => {
    const result = reviewTireCohortRecord(fixture())
    expect(result.stageLabel).toBe('NEW')
    expect(result.observedKm).toBe(80_000)
    expect(result.installedCostMxn).toBe(7_460)
    expect(result.observedCostMxnPerKm).toBeCloseTo(7_460 / 80_000, 12)
    expect(result.readiness).toBe('READY_FOR_ECONOMIC_REVIEW')
    expect(result.quoteEligible).toBe(false)
    expect(result.databaseWriteAllowed).toBe(false)
  })

  it('keeps an open or economically incomplete cycle pending instead of using zero', () => {
    const record = fixture()
    record.removal = null as unknown as ReturnType<typeof fixture>['removal']
    record.installation.installedCost.freightMxn = null as unknown as number
    const result = reviewTireCohortRecord(record)
    expect(result.observedKm).toBeNull()
    expect(result.installedCostMxn).toBeNull()
    expect(result.observedCostMxnPerKm).toBeNull()
    expect(result.blockers).toEqual(expect.arrayContaining(['CYCLE_OPEN', 'INSTALLED_COST_INCOMPLETE']))
  })

  it('represents retread sequence without introducing a RETREAD wheel position', () => {
    const record = fixture()
    record.tire.stage = { kind: 'RETREAD', sequence: 2 }
    expect(reviewTireCohortRecord(record).stageLabel).toBe('RETREAD_2')
    record.position.group = 'RETREAD' as 'DRIVE'
    expect(TireCohortRecordSchema.safeParse(record).success).toBe(false)
  })

  it.each([
    ['invalid calendar date', (record: any) => { record.installation.date = '2026-02-30' }],
    ['removal before install', (record: any) => { record.removal.date = '2025-12-31' }],
    ['non-growing reading', (record: any) => { record.removal.readingKm = 100_000 }],
    ['new with sequence', (record: any) => { record.tire.stage.sequence = 1 }],
    ['retread without sequence', (record: any) => { record.tire.stage = { kind: 'RETREAD', sequence: null } }],
    ['rejected casing without reason', (record: any) => { record.removal.casingInspection.outcome = 'REJECTED' }],
    ['unknown evidence', (record: any) => { record.removal.evidenceIds = ['missing'] }],
    ['duplicate evidence', (record: any) => { record.evidence.push(record.evidence[0]) }],
    ['unsupported segment', (record: any) => { record.operationalSegment = 'INTERGALACTIC' }],
    ['publication escape', (record: any) => { record.quoteEligible = true }],
  ])('rejects %s', (_, mutate) => {
    const record = fixture()
    mutate(record)
    expect(TireCohortRecordSchema.safeParse(record).success).toBe(false)
  })

  it('changes its fingerprint when readings, cost or evidence change', () => {
    const baseline = reviewTireCohortRecord(fixture()).fingerprint
    for (const mutate of [
      (record: ReturnType<typeof fixture>) => { record.removal.readingKm += 1 },
      (record: ReturnType<typeof fixture>) => { record.installation.installedCost.mountingMxn += 1 },
      (record: ReturnType<typeof fixture>) => { record.evidence[0].note += ' amended' },
    ]) {
      const record = fixture()
      mutate(record)
      expect(reviewTireCohortRecord(record).fingerprint).not.toBe(baseline)
    }
  })
})
