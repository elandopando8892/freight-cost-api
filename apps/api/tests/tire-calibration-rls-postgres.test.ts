import { randomUUID } from 'node:crypto'
import { Prisma, PrismaClient, type Role } from '@prisma/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TireCalibrationPersistence } from '../src/modules/cost-bases/tire-calibration-persistence'
import { buildTireCalibrationProposal, verifyTireCalibrationProposal } from '../src/modules/cost-bases/tire-calibration-proposal'
import { setTireCalibrationTenantContext } from '../src/modules/cost-bases/tire-calibration-tenant-context'
import { reviewTireCohortRecord } from '../src/modules/cost-bases/tire-cohort'
import { TireCohortSourcePersistence } from '../src/modules/cost-bases/tire-cohort-source-persistence'

const adminUrl = process.env.FCM_TEST_ADMIN_DATABASE_URL
const appUrl = process.env.FCM_TEST_DATABASE_URL
for (const [name, value] of [['FCM_TEST_ADMIN_DATABASE_URL', adminUrl], ['FCM_TEST_DATABASE_URL', appUrl]] as const) {
  if (!value || !/^postgresql:\/\/[^@]+@127\.0\.0\.1:\d+\/fcm_tire_s8(?:\?|$)/.test(value)) {
    throw new Error(`${name} must target the disposable loopback fcm_tire_s8 database`)
  }
}

const admin = new PrismaClient({ datasourceUrl: adminUrl })
const app = new PrismaClient({ datasourceUrl: appUrl })
const proposalHash = 'a'.repeat(64)
const sourceHash = 'b'.repeat(64)

type Identity = { internalUserId: string; orgId: string; role: Role }
const author: Identity = { internalUserId: 'tire-author-a', orgId: 'tire-org-a', role: 'OPERATOR' }
const owner: Identity = { internalUserId: 'tire-owner-a', orgId: 'tire-org-a', role: 'ADMIN' }
const reviewer: Identity = { internalUserId: 'tire-reviewer-a', orgId: 'tire-org-a', role: 'ADMIN' }
const viewer: Identity = { internalUserId: 'tire-viewer-a', orgId: 'tire-org-a', role: 'VIEWER' }
const unassignedAdmin: Identity = { internalUserId: 'tire-unassigned-a', orgId: 'tire-org-a', role: 'ADMIN' }
const otherViewer: Identity = { internalUserId: 'tire-viewer-b', orgId: 'tire-org-b', role: 'VIEWER' }

function calibrationRecord(id: string, lifeKm: number): any {
  return {
    schemaVersion: 1, researchOnly: true, id, revision: 1, operationalSegment: 'INTRA_MEX',
    asset: { id: `TR-${id}`, type: 'TRACTOR', configuration: '6x4 synthetic' },
    position: { group: 'DRIVE', slot: 'D1-LI' },
    tire: { casingId: `CASE-${id}`, stage: { kind: 'NEW', sequence: null }, manufacturer: 'Synthetic', model: 'Controlled', size: '11R22.5', loadRange: 'H', serviceDescription: '146/143L' },
    distanceMeter: { basis: 'ASSET_ODOMETER', sourceId: `TR-${id}` },
    installation: { date: '2026-01-01', readingKm: 100_000, treadDepthMm: 21,
      installedCost: { currency: 'MXN', purchaseMxn: 6_000, taxMxn: 960, freightMxn: 200, mountingMxn: 180, balancingMxn: 120, disposalMxn: 0, evidenceIds: [`invoice-${id}`] }, evidenceIds: [`mount-${id}`] },
    removal: { date: '2026-09-01', readingKm: 100_000 + lifeKm, treadDepthMm: 2, reason: 'WORN_OUT', casingInspection: { outcome: 'ACCEPTED', reason: null, evidenceIds: [`inspection-${id}`] }, evidenceIds: [`remove-${id}`] },
    evidence: [
      { id: `mount-${id}`, kind: 'ODOMETER_CAPTURE', locator: `local://mount-${id}`, note: 'Synthetic' },
      { id: `invoice-${id}`, kind: 'INVOICE', locator: `local://invoice-${id}`, note: 'Synthetic' },
      { id: `remove-${id}`, kind: 'ODOMETER_CAPTURE', locator: `local://remove-${id}`, note: 'Synthetic' },
      { id: `inspection-${id}`, kind: 'INSPECTION', locator: `local://inspection-${id}`, note: 'Synthetic' },
    ],
  }
}

function calibrationProposal(proposalId = 'adapter-proposal-v1') {
  const rows = [80_000, 81_000, 82_000, 83_000, 200_000].map((life, index) => calibrationRecord(`adapter-cycle-${index}`, life))
  const reviewed = reviewTireCohortRecord(rows[0])
  const cohortKey = ['INTRA_MEX', 'TRACTOR', '6x4 synthetic', 'DRIVE', 'Synthetic', 'Controlled', '11R22.5', 'H', '146/143L', reviewed.stageLabel].join('|')
  const statisticsPolicy = { minimumClosedCycles: 4, minimumInspectionsPerStage: 3, outlierFenceMultiplier: 1.5, maximumOutlierShare: 0.25, maximumCoefficientOfVariation: 0.8, shapeMeanMedianGapRatio: 0.1, confidenceZ: 1.96 }
  const proposal = buildTireCalibrationProposal(rows,
    statisticsPolicy,
    { proposalId, version: 1, supersedesProposalId: null, createdOn: '2026-09-27', status: 'DRAFT', cohortKey,
      policy: { id: 'adapter-policy', version: 1, rationale: 'Synthetic policy for persistence adapter integration', lifeEstimator: { method: 'MEDIAN' }, installedCostEstimator: { method: 'MEDIAN' }, observedRateEstimator: { method: 'MEDIAN' }, maximumMethodDivergenceRatio: 0.05 },
      impactScenario: { quantityOnVehicle: 8, baselineTireStageCvuMxnPerKm: 0.7, baselineEvidenceId: 'synthetic-baseline', tripDistanceKm: 1_000, currency: 'MXN' } })
  return { proposal, rows, cohortKey, statisticsPolicy }
}

async function inContext<T>(identity: Identity, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return app.$transaction(async tx => {
    await setTireCalibrationTenantContext(tx, identity)
    return work(tx)
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

async function createDossier(id = 'tire-dossier-a') {
  return inContext(author, tx => tx.tireCalibrationDossier.create({ data: {
    id,
    orgId: author.orgId,
    proposalId: `proposal-${id}`,
    version: 1,
    status: 'DRAFT',
    revision: 0,
    proposalFingerprint: proposalHash,
    sourceAggregationFingerprint: sourceHash,
    sourceSnapshotId: 'tire-source-a',
    authorId: author.internalUserId,
    economicOwnerId: owner.internalUserId,
    independentReviewerId: reviewer.internalUserId,
    proposalSnapshot: { fixture: true },
  } }))
}

beforeAll(async () => {
  await admin.tireCalibrationApprovalPackage.deleteMany()
  await admin.tireCalibrationReviewEvent.deleteMany()
  await admin.tireCalibrationDossier.deleteMany()
  await admin.tireCohortSourceHead.deleteMany()
  await admin.tireCohortSourceSnapshot.deleteMany()
  await admin.user.deleteMany({ where: { id: { startsWith: 'tire-' } } })
  await admin.organization.deleteMany({ where: { id: { startsWith: 'tire-' } } })
  await admin.organization.createMany({ data: [
    { id: 'tire-org-a', name: 'Synthetic Tire Org A' },
    { id: 'tire-org-b', name: 'Synthetic Tire Org B' },
  ] })
  await admin.user.createMany({ data: [
    { id: author.internalUserId, orgId: author.orgId, supabaseId: '00000000-0000-4000-8000-000000000101', email: 'tire-author-a@example.invalid', role: author.role },
    { id: owner.internalUserId, orgId: owner.orgId, supabaseId: '00000000-0000-4000-8000-000000000102', email: 'tire-owner-a@example.invalid', role: owner.role },
    { id: reviewer.internalUserId, orgId: reviewer.orgId, supabaseId: '00000000-0000-4000-8000-000000000103', email: 'tire-reviewer-a@example.invalid', role: reviewer.role },
    { id: viewer.internalUserId, orgId: viewer.orgId, supabaseId: '00000000-0000-4000-8000-000000000104', email: 'tire-viewer-a@example.invalid', role: viewer.role },
    { id: unassignedAdmin.internalUserId, orgId: unassignedAdmin.orgId, supabaseId: '00000000-0000-4000-8000-000000000105', email: 'tire-unassigned-a@example.invalid', role: unassignedAdmin.role },
    { id: otherViewer.internalUserId, orgId: otherViewer.orgId, supabaseId: '00000000-0000-4000-8000-000000000106', email: 'tire-viewer-b@example.invalid', role: otherViewer.role },
  ] })
  await admin.tireCohortSourceSnapshot.create({ data: {
    id: 'tire-source-a', orgId: author.orgId, cohortKey: 'raw-rls-fixture', version: 1,
    requestId: 'raw-rls-source-request', commandFingerprint: '9'.repeat(64), aggregationFingerprint: sourceHash,
    recordsSnapshot: [], statisticsPolicy: {}, createdById: author.internalUserId,
  } })
})

afterAll(async () => {
  await app.$disconnect()
  await admin.$disconnect()
})

describe('tire calibration PostgreSQL RLS candidate', () => {
  it('completes economic-only review with one assigned ADMIN and no independent package', async () => {
    const persistence = new TireCalibrationPersistence(app)
    const sources = new TireCohortSourcePersistence(app)
    const fixture = calibrationProposal('single-review-proposal-v1')
    const actor = { ...author, supabaseId: '00000000-0000-4000-8000-000000000101' }
    const economicOwner = { ...owner, supabaseId: '00000000-0000-4000-8000-000000000102' }
    const readOnly = { ...viewer, supabaseId: '00000000-0000-4000-8000-000000000104' }
    await sources.capture(actor, { requestId: randomUUID(), note: 'Synthetic source', cohortKey: fixture.cohortKey, records: fixture.rows, statisticsPolicy: fixture.statisticsPolicy })
    const opened = await persistence.open(actor, { requestId: randomUUID(), note: 'Single review draft', expectedRevision: 0, proposal: fixture.proposal })
    const assignment = { requestId: randomUUID(), note: 'One economic reviewer available', expectedRevision: 1, expectedProposalFingerprint: fixture.proposal.fingerprint, economicOwnerId: owner.internalUserId, independentReviewerId: null, reviewMode: 'ECONOMIC_ONLY' }
    await expect(persistence.assign(actor, opened.dossierId, { ...assignment, economicOwnerId: author.internalUserId })).rejects.toMatchObject({ code: 'SEPARATION_OF_DUTIES_REQUIRED' })
    await expect(persistence.assign(actor, opened.dossierId, { ...assignment, economicOwnerId: otherViewer.internalUserId })).rejects.toMatchObject({ code: 'REVIEWERS_MUST_BE_SAME_TENANT_ADMINS' })
    const assigned = await persistence.assign(actor, opened.dossierId, assignment)
    expect(assigned).toMatchObject({ revision: 2, status: 'PENDING_ECONOMIC' })
    await expect(persistence.assign(actor, opened.dossierId, assignment)).resolves.toEqual(assigned)
    const decision = { requestId: randomUUID(), note: 'Economic evidence reviewed', expectedRevision: 2, expectedProposalFingerprint: fixture.proposal.fingerprint, decision: 'ENDORSED' }
    await expect(persistence.economicDecision(readOnly, opened.dossierId, decision)).rejects.toMatchObject({ code: 'ROLE_FORBIDDEN' })
    const approved = await persistence.economicDecision(economicOwner, opened.dossierId, decision)
    expect(approved).toMatchObject({ revision: 3, status: 'ECONOMIC_REVIEWED', quoteEligible: false })
    await expect(persistence.economicDecision(economicOwner, opened.dossierId, decision)).resolves.toEqual(approved)
    const dossier = await persistence.get(readOnly, opened.dossierId)
    expect(dossier).toMatchObject({ reviewMode: 'ECONOMIC_ONLY', status: 'ECONOMIC_REVIEWED', independentReviewerId: null, approvalPackage: null })
    expect(dossier.events).toHaveLength(3)
    expect(dossier.events[1].payload).toMatchObject({ reviewMode: 'ECONOMIC_ONLY' })
    expect(dossier.events[2].previousEventHash).toBe(dossier.events[1].eventHash)
    await expect(persistence.independentDecision(economicOwner, opened.dossierId, { ...decision, requestId: randomUUID(), expectedRevision: 3, decision: 'APPROVED' })).rejects.toMatchObject({ code: 'INDEPENDENT_REVIEW_NOT_APPLICABLE' })
    await expect(inContext(owner, tx => tx.tireCalibrationDossier.update({ where: { id: opened.dossierId }, data: { status: 'REVIEWED' } }))).rejects.toThrow()
    await expect(inContext(owner, tx => tx.tireCalibrationApprovalPackage.create({ data: {
      orgId: owner.orgId, dossierId: opened.dossierId, createdById: owner.internalUserId,
      proposalFingerprint: fixture.proposal.fingerprint, sourceAggregationFingerprint: fixture.proposal.sourceAggregationFingerprint,
      ledgerHeadHash: approved.entryHash, packageFingerprint: '0'.repeat(64), snapshot: {},
    } }))).rejects.toThrow()
  })

  it('fails closed without context and conceals another tenant', async () => {
    await createDossier()
    expect(await app.tireCalibrationDossier.findMany()).toEqual([])
    expect(await inContext(viewer, tx => tx.tireCalibrationDossier.count({ where: { id: 'tire-dossier-a' } }))).toBe(1)
    expect(await inContext(otherViewer, tx => tx.tireCalibrationDossier.count())).toBe(0)
    expect(await app.tireCalibrationDossier.findMany()).toEqual([])
  })

  it('enforces author creation, same-tenant duties and assigned updates', async () => {
    await expect(inContext(author, tx => tx.tireCalibrationDossier.create({ data: {
      id: 'tire-cross-tenant', orgId: otherViewer.orgId, proposalId: 'proposal-cross', version: 1,
      proposalFingerprint: proposalHash, sourceAggregationFingerprint: sourceHash,
      sourceSnapshotId: 'tire-source-a', authorId: author.internalUserId, proposalSnapshot: {},
    } }))).rejects.toThrow()

    await expect(inContext(author, tx => tx.tireCalibrationDossier.create({ data: {
      id: 'tire-cross-duty', orgId: author.orgId, proposalId: 'proposal-cross-duty', version: 1,
      proposalFingerprint: proposalHash, sourceAggregationFingerprint: sourceHash,
      sourceSnapshotId: 'tire-source-a', authorId: author.internalUserId, economicOwnerId: otherViewer.internalUserId, proposalSnapshot: {},
    } }))).rejects.toThrow()

    await expect(inContext(viewer, tx => tx.tireCalibrationDossier.update({ where: { id: 'tire-dossier-a' }, data: { status: 'RETURNED' } }))).rejects.toThrow()
    await expect(inContext(unassignedAdmin, tx => tx.tireCalibrationDossier.update({ where: { id: 'tire-dossier-a' }, data: { status: 'RETURNED' } }))).rejects.toThrow()
    await expect(inContext(owner, tx => tx.tireCalibrationDossier.update({ where: { id: 'tire-dossier-a' }, data: { status: 'PENDING_INDEPENDENT', revision: 1 } }))).resolves.toMatchObject({ revision: 1 })
    await expect(inContext(reviewer, tx => tx.tireCalibrationDossier.update({ where: { id: 'tire-dossier-a' }, data: { status: 'REVIEWED', revision: 2 } }))).resolves.toMatchObject({ status: 'REVIEWED' })
  })

  it('limits append-only events to the exact assigned actor and action family', async () => {
    await expect(inContext(author, tx => tx.tireCalibrationReviewEvent.create({ data: {
      id: 'tire-event-1', orgId: author.orgId, dossierId: 'tire-dossier-a', requestId: 'request-1', sequence: 1,
      action: 'DRAFT_OPENED', actorId: author.internalUserId, toStatus: 'DRAFT', eventHash: 'c'.repeat(64),
    } }))).resolves.toMatchObject({ sequence: 1 })

    await expect(inContext(author, tx => tx.tireCalibrationReviewEvent.create({ data: {
      id: 'tire-event-invalid', orgId: author.orgId, dossierId: 'tire-dossier-a', requestId: 'request-invalid', sequence: 2,
      action: 'ECONOMIC_APPROVED', actorId: author.internalUserId, eventHash: 'd'.repeat(64),
    } }))).rejects.toThrow()

    await expect(inContext(owner, tx => tx.tireCalibrationReviewEvent.create({ data: {
      id: 'tire-event-2', orgId: owner.orgId, dossierId: 'tire-dossier-a', requestId: 'request-2', sequence: 2,
      action: 'ECONOMIC_APPROVED', actorId: owner.internalUserId, previousEventHash: 'c'.repeat(64), eventHash: 'e'.repeat(64),
    } }))).resolves.toMatchObject({ actorId: owner.internalUserId })

    await expect(inContext(owner, tx => tx.tireCalibrationReviewEvent.update({ where: { id: 'tire-event-2' }, data: { eventHash: 'f'.repeat(64) } }))).rejects.toThrow()
    await expect(inContext(owner, tx => tx.tireCalibrationReviewEvent.delete({ where: { id: 'tire-event-2' } }))).rejects.toThrow()
    await expect(admin.tireCalibrationReviewEvent.update({ where: { id: 'tire-event-2' }, data: { eventHash: 'f'.repeat(64) } })).rejects.toThrow(/append-only/i)
    await expect(admin.tireCalibrationReviewEvent.delete({ where: { id: 'tire-event-2' } })).rejects.toThrow(/append-only/i)
  })

  it('creates a non-executable package only for the assigned independent reviewer', async () => {
    await expect(inContext(owner, tx => tx.tireCalibrationApprovalPackage.create({ data: {
      id: 'tire-package-invalid', orgId: owner.orgId, dossierId: 'tire-dossier-a', createdById: owner.internalUserId,
      proposalFingerprint: proposalHash, sourceAggregationFingerprint: sourceHash, ledgerHeadHash: 'e'.repeat(64),
      packageFingerprint: 'f'.repeat(64), snapshot: {},
    } }))).rejects.toThrow()

    await expect(inContext(reviewer, tx => tx.tireCalibrationApprovalPackage.create({ data: {
      id: 'tire-package-1', orgId: reviewer.orgId, dossierId: 'tire-dossier-a', createdById: reviewer.internalUserId,
      proposalFingerprint: proposalHash, sourceAggregationFingerprint: sourceHash, ledgerHeadHash: 'e'.repeat(64),
      packageFingerprint: 'f'.repeat(64), snapshot: { reviewed: true },
    } }))).resolves.toMatchObject({ quoteEligible: false })

    await expect(inContext(reviewer, tx => tx.tireCalibrationApprovalPackage.update({ where: { id: 'tire-package-1' }, data: { snapshot: { tampered: true } } }))).rejects.toThrow()
    await expect(inContext(reviewer, tx => tx.tireCalibrationApprovalPackage.delete({ where: { id: 'tire-package-1' } }))).rejects.toThrow()
    await expect(admin.tireCalibrationApprovalPackage.update({ where: { id: 'tire-package-1' }, data: { snapshot: { tampered: true } } })).rejects.toThrow(/append-only/i)
    await expect(admin.tireCalibrationApprovalPackage.delete({ where: { id: 'tire-package-1' } })).rejects.toThrow(/append-only/i)
    expect(await inContext(otherViewer, tx => tx.tireCalibrationApprovalPackage.count())).toBe(0)
  })

  it('executes the authenticated persistence adapter workflow without enabling publication', async () => {
    const persistence = new TireCalibrationPersistence(app)
    const sources = new TireCohortSourcePersistence(app)
    const fixture = calibrationProposal()
    const { proposal } = fixture
    const actor = { ...author, supabaseId: '00000000-0000-4000-8000-000000000101' }
    const economicOwner = { ...owner, supabaseId: '00000000-0000-4000-8000-000000000102' }
    const independentReviewer = { ...reviewer, supabaseId: '00000000-0000-4000-8000-000000000103' }
    const tenantViewer = { ...viewer, supabaseId: '00000000-0000-4000-8000-000000000104' }
    const foreignViewer = { ...otherViewer, supabaseId: '00000000-0000-4000-8000-000000000106' }
    await sources.capture(actor, {
      requestId: randomUUID(), note: 'Capture authoritative cohort source', cohortKey: fixture.cohortKey,
      records: fixture.rows, statisticsPolicy: fixture.statisticsPolicy,
    })
    const openCommand = { requestId: randomUUID(), note: 'Open reviewed calibration draft', expectedRevision: 0, proposal }

    const opened = await persistence.open(actor, openCommand)
    expect(opened).toMatchObject({ revision: 1, status: 'DRAFT', quoteEligible: false, parameterWriteAllowed: false })
    await expect(persistence.open(actor, openCommand)).resolves.toEqual(opened)
    await expect(persistence.open(actor, { ...openCommand, note: 'Mutated retry' })).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT', statusCode: 409 })
    const persistedDraft = await persistence.get(actor, opened.dossierId)
    expect(() => verifyTireCalibrationProposal(persistedDraft.proposalSnapshot)).not.toThrow()

    const assignCommand = {
      requestId: randomUUID(), note: 'Assign two independent administrators', expectedRevision: 1,
      expectedProposalFingerprint: proposal.fingerprint,
      economicOwnerId: owner.internalUserId, independentReviewerId: reviewer.internalUserId,
    }
    const assigned = await persistence.assign(actor, opened.dossierId, assignCommand)
    expect(assigned).toMatchObject({ revision: 2, status: 'PENDING_ECONOMIC' })

    const economicCommand = {
      requestId: randomUUID(), note: 'Economic impact is supported by the evidence', expectedRevision: 2,
      expectedProposalFingerprint: proposal.fingerprint,
      decision: 'ENDORSED' as const,
    }
    const changedRows = structuredClone(fixture.rows)
    changedRows[0].installation.installedCost.purchaseMxn += 100
    changedRows[0].revision += 1
    await sources.capture(actor, {
      requestId: randomUUID(), note: 'Advance authoritative source', cohortKey: fixture.cohortKey,
      records: changedRows, statisticsPolicy: fixture.statisticsPolicy,
    })
    await expect(persistence.economicDecision(economicOwner, opened.dossierId, economicCommand))
      .rejects.toMatchObject({ code: 'SOURCE_FINGERPRINT_STALE', statusCode: 409 })
    await sources.capture(actor, {
      requestId: randomUUID(), note: 'Restore reviewed source for controlled continuation', cohortKey: fixture.cohortKey,
      records: fixture.rows, statisticsPolicy: fixture.statisticsPolicy,
    })
    const endorsed = await persistence.economicDecision(economicOwner, opened.dossierId, economicCommand)
    expect(endorsed).toMatchObject({ revision: 3, status: 'PENDING_INDEPENDENT' })

    await expect(persistence.get(foreignViewer, opened.dossierId)).rejects.toMatchObject({ code: 'DOSSIER_NOT_FOUND', statusCode: 404 })
    await expect(persistence.get(tenantViewer, opened.dossierId)).resolves.toMatchObject({ id: opened.dossierId })

    const approved = await persistence.independentDecision(independentReviewer, opened.dossierId, {
      requestId: randomUUID(), note: 'Independent evidence review completed', expectedRevision: 3,
      expectedProposalFingerprint: proposal.fingerprint,
      decision: 'APPROVED',
    })
    expect(approved).toMatchObject({ revision: 4, status: 'REVIEWED', quoteEligible: false })

    const dossier = await persistence.get(tenantViewer, opened.dossierId)
    expect(dossier.events).toHaveLength(4)
    expect(dossier.events.map(event => event.sequence)).toEqual([1, 2, 3, 4])
    expect(dossier.events.slice(1).every((event, index) => event.previousEventHash === dossier.events[index].eventHash)).toBe(true)
    expect(dossier.approvalPackage).toMatchObject({ quoteEligible: false, ledgerHeadHash: approved.entryHash })
    expect((dossier.approvalPackage?.snapshot as any).packageStatus).toBe('EVIDENCE_READY_PUBLICATION_NOT_AUTHORIZED')
  })
})
