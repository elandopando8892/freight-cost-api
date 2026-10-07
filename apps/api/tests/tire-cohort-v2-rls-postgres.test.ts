import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TireCohortV2ResearchPersistence } from '../src/modules/cost-bases/tire-cohort-v2-persistence.js'
import { reviewTireCohortRecordV2 } from '../src/modules/cost-bases/tire-cohort-v2.js'
import { setTireCalibrationTenantContext } from '../src/modules/cost-bases/tire-calibration-tenant-context.js'
import {readTireTestEnvironment} from './fixtures/tire-test-environment.js'

const {adminUrl,appUrl}=readTireTestEnvironment(process.env)
const isolated = [adminUrl, appUrl].every(value =>
  value && /^postgresql:\/\/[^@]+@127\.0\.0\.1:\d+\/fcm_tire_s8(?:\?|$)/.test(value))

const author = { internalUserId: 'cohort2-author-a', supabaseId: '00000000-0000-4000-8000-000000000401', orgId: 'cohort2-org-a', role: 'OPERATOR' as const }
const viewer = { internalUserId: 'cohort2-viewer-a', supabaseId: '00000000-0000-4000-8000-000000000402', orgId: 'cohort2-org-a', role: 'VIEWER' as const }
const other = { internalUserId: 'cohort2-viewer-b', supabaseId: '00000000-0000-4000-8000-000000000403', orgId: 'cohort2-org-b', role: 'VIEWER' as const }
const policy = { minimumClosedCycles: 2, outlierFenceMultiplier: 1.5, maximumOutlierShare: 0.25,
  maximumCoefficientOfVariation: 0.3, shapeMeanMedianGapRatio: 0.2 }

function record(id: string, km: number): any {
  return {
    schemaVersion: 2, researchOnly: true, id, revision: 1, operationalSegment: 'INTRA_US',
    leg: { country: 'US', costBearer: 'BASE_OPERATOR', costKind: 'DIRECT_TIRE_COST', evidenceIds: ['operator'] },
    asset: { id: `TR-${id}`, type: 'TRACTOR', configuration: 'synthetic 6x4' },
    position: { group: 'DRIVE', slot: 'D1-LI' },
    tire: { casingId: `CASE-${id}`, stage: { kind: 'NEW', sequence: null },
      manufacturer: 'Synthetic', model: 'Controlled', size: '11R22.5', loadRange: 'H', serviceDescription: '146/143L',
      fitmentStatus: 'VERIFIED_EXACT', fitmentEvidenceIds: ['fitment'] },
    distanceMeter: { basis: 'ASSET_ODOMETER', sourceId: `TR-${id}` },
    installation: { date: '2026-01-01', readingKm: 100_000, treadDepthMm: 21,
      installedCost: { currency: 'USD', costBasis: 'DELIVERED_INSTALLED_WITH_DISPOSAL',
        purchaseAmount: 800, taxAmount: 40, freightAmount: 20, mountingAmount: 15,
        balancingAmount: 5, disposalAmount: 0, evidenceIds: ['invoice'] }, evidenceIds: ['install'] },
    removal: { date: '2026-09-01', readingKm: 100_000 + km, treadDepthMm: 2, reason: 'WORN_OUT',
      casingInspection: { outcome: 'ACCEPTED', reason: null, evidenceIds: ['inspection'] }, evidenceIds: ['remove'] },
    evidence: [
      { id: 'operator', kind: 'FLEET_DOCUMENT', locator: 'local://operator', note: 'Synthetic' },
      { id: 'fitment', kind: 'FLEET_DOCUMENT', locator: 'local://fitment', note: 'Synthetic' },
      { id: 'invoice', kind: 'INVOICE', locator: 'local://invoice', note: 'Synthetic' },
      { id: 'install', kind: 'ODOMETER_CAPTURE', locator: 'local://install', note: 'Synthetic' },
      { id: 'remove', kind: 'ODOMETER_CAPTURE', locator: 'local://remove', note: 'Synthetic' },
      { id: 'inspection', kind: 'INSPECTION', locator: 'local://inspection', note: 'Synthetic' },
    ],
  }
}

describe.skipIf(!isolated)('tire cohort v2 disposable PostgreSQL RLS', () => {
  let admin: PrismaClient
  let app: PrismaClient
  beforeAll(async () => {
    admin = new PrismaClient({ datasourceUrl: adminUrl! })
    app = new PrismaClient({ datasourceUrl: appUrl! })
    await admin.organization.createMany({ data: [
      { id: author.orgId, name: 'Synthetic V2 Org A' }, { id: other.orgId, name: 'Synthetic V2 Org B' },
    ] })
    await admin.user.createMany({ data: [
      { id: author.internalUserId, orgId: author.orgId, supabaseId: author.supabaseId, email: 'cohort2-author-a@example.invalid', role: author.role },
      { id: viewer.internalUserId, orgId: viewer.orgId, supabaseId: viewer.supabaseId, email: 'cohort2-viewer-a@example.invalid', role: viewer.role },
      { id: other.internalUserId, orgId: other.orgId, supabaseId: other.supabaseId, email: 'cohort2-viewer-b@example.invalid', role: other.role },
    ] })
  })
  afterAll(async () => {
    await app?.$disconnect()
    await admin?.$disconnect()
  })

  it('persists US/USD research, re-reads within tenant and enforces idempotency', async () => {
    const persistence = new TireCohortV2ResearchPersistence(app)
    const rows = [record('v2-a', 80_000), record('v2-b', 82_000)]
    const comparisonKey = reviewTireCohortRecordV2(rows[0]).comparisonKey
    const command = { requestId: randomUUID(), comparisonKey, records: rows, policy }
    const first = await persistence.capture(author, command)
    expect(first).toMatchObject({ version: 1, researchOnly: true, quoteEligible: false, parameterWriteAllowed: false })
    expect(await persistence.capture(author, command)).toEqual(first)
    await expect(persistence.capture(author, { ...command, records: [rows[0]] })).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' })
    const current = await persistence.current(viewer, comparisonKey)
    expect(current.aggregation.cohorts).toHaveLength(1)
    expect(current.aggregation.cohorts[0]).toMatchObject({ country: 'US', currency: 'USD', researchReviewable: true })
    expect(current.aggregation.cohorts[0].costNativePerKm.count).toBe(2)
    expect('records' in current).toBe(false)
    await expect(persistence.current(other, comparisonKey)).rejects.toMatchObject({ code: 'SOURCE_SNAPSHOT_NOT_FOUND' })
    await expect(persistence.capture(viewer, { ...command, requestId: randomUUID() })).rejects.toMatchObject({ code: 'ROLE_FORBIDDEN' })
    await expect(persistence.capture(author, { ...command, requestId: randomUUID(), comparisonKey: 'US|MXN' }))
      .rejects.toMatchObject({ code: 'SOURCE_COMPARISON_KEY_MISMATCH' })

    const second = await persistence.capture(author, { ...command, requestId: randomUUID(), records: [record('v2-c', 81_000)] })
    expect(second.version).toBe(2)
    expect((await persistence.current(author, comparisonKey)).version).toBe(2)
  })

  it('fails closed outside tenant context and forbids snapshot mutation or cross-tenant insert', async () => {
    expect(await app.tireCohortV2ResearchSnapshot.findMany()).toEqual([])
    expect(await app.tireCohortV2ResearchHead.findMany()).toEqual([])
    const stored = await admin.tireCohortV2ResearchSnapshot.findFirstOrThrow({ where: { orgId: author.orgId } })
    await expect(app.$transaction(async tx => {
      await setTireCalibrationTenantContext(tx, viewer)
      return tx.tireCohortV2ResearchSnapshot.update({ where: { id: stored.id }, data: { version: 99 } })
    })).rejects.toThrow()
    await expect(app.$transaction(async tx => {
      await setTireCalibrationTenantContext(tx, author)
      return tx.tireCohortV2ResearchSnapshot.create({ data: {
        id: randomUUID(), orgId: other.orgId, comparisonKey: stored.comparisonKey,
        version: 3, requestId: randomUUID(), commandFingerprint: 'a'.repeat(64),
        aggregationFingerprint: stored.aggregationFingerprint,
        snapshotFingerprint: stored.snapshotFingerprint, payload: stored.payload as any,
        createdById: author.internalUserId, createdAt: new Date(),
      } })
    })).rejects.toThrow()
  })
})
