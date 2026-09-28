import { createHash } from 'node:crypto'
import { Prisma, PrismaClient, type Role } from '@prisma/client'
import { z } from 'zod'
import {
  authorizeTireCalibrationTenantAction,
  TireCalibrationTenantIdentitySchema,
} from './tire-calibration-multitenant-contract.js'
import {
  TireCalibrationProposalSchema,
  verifyTireCalibrationProposal,
  type TireCalibrationProposal,
} from './tire-calibration-proposal.js'
import { setTireCalibrationTenantContext } from './tire-calibration-tenant-context.js'
import { resolveCurrentTireCohortSource } from './tire-cohort-source-persistence.js'

const text = z.string().trim().min(1).max(4000)
const hash = z.string().regex(/^[a-f0-9]{64}$/)
const continuation = {
  requestId: z.string().uuid(),
  note: text,
  expectedRevision: z.number().int().positive(),
  expectedProposalFingerprint: hash,
}

export const OpenTireCalibrationDraftSchema = z.object({
  requestId: z.string().uuid(),
  note: text,
  expectedRevision: z.literal(0),
  proposal: TireCalibrationProposalSchema,
}).strict()

export const AssignTireCalibrationReviewersSchema = z.object({
  ...continuation,
  economicOwnerId: text,
  independentReviewerId: text.nullable().default(null),
  reviewMode: z.enum(['DUAL_REVIEW', 'ECONOMIC_ONLY']).default('DUAL_REVIEW'),
}).strict().refine(command => command.reviewMode === 'ECONOMIC_ONLY'
  ? command.independentReviewerId === null : command.independentReviewerId !== null,
{ message: 'Reviewer assignment must match the explicit review mode' })

export const TireCalibrationEconomicDecisionSchema = z.object({
  ...continuation,
  decision: z.enum(['ENDORSED', 'RETURNED']),
}).strict()

export const TireCalibrationIndependentDecisionSchema = z.object({
  ...continuation,
  decision: z.enum(['APPROVED', 'REJECTED']),
}).strict()

export type TireCalibrationIdentity = z.infer<typeof TireCalibrationTenantIdentitySchema>
export type TireCalibrationReceipt = {
  sequence: number
  requestId: string
  recordedAt: string
  entryHash: string
  dossierId: string
  proposalId: string
  revision: number
  status: string
  proposalFingerprint: string
  sourceAggregationFingerprint: string
  publicationEnabled: false
  parameterWriteAllowed: false
  quoteEligible: false
}

type Transaction = Prisma.TransactionClient
type Dossier = Awaited<ReturnType<Transaction['tireCalibrationDossier']['findFirstOrThrow']>>
type Continuation = z.infer<typeof AssignTireCalibrationReviewersSchema>

export class TireCalibrationPersistenceError extends Error {
  readonly code: string
  readonly statusCode: number

  constructor(code: string, statusCode: number) {
    super(code)
    this.name = 'TireCalibrationPersistenceError'
    this.code = code
    this.statusCode = statusCode
  }
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
  return JSON.stringify(value)
}

const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex')
const asJson = (value: unknown) => value as Prisma.InputJsonValue

function statusForAuthorization(code: string, concealResource = false) {
  if (concealResource || code === 'DOSSIER_NOT_FOUND') return 404
  if (code === 'ROLE_FORBIDDEN' || code.includes('ASSIGNED_') || code === 'ONLY_AUTHOR_CAN_ASSIGN') return 403
  if (code === 'PROPOSAL_NOT_ELIGIBLE_FOR_ECONOMIC_REVIEW') return 422
  return 409
}

function deny(code: string, concealResource = false): never {
  throw new TireCalibrationPersistenceError(code, statusForAuthorization(code, concealResource))
}

function assertAuthorized(input: Parameters<typeof authorizeTireCalibrationTenantAction>[0]) {
  const decision = authorizeTireCalibrationTenantAction(input)
  if (!decision.allowed) deny(decision.code, decision.concealResource)
}

function receiptFor(input: {
  sequence: number
  requestId: string
  recordedAt: Date
  entryHash: string
  dossier: Dossier
}): TireCalibrationReceipt {
  return {
    sequence: input.sequence,
    requestId: input.requestId,
    recordedAt: input.recordedAt.toISOString(),
    entryHash: input.entryHash,
    dossierId: input.dossier.id,
    proposalId: input.dossier.proposalId,
    revision: input.dossier.revision,
    status: input.dossier.status,
    proposalFingerprint: input.dossier.proposalFingerprint,
    sourceAggregationFingerprint: input.dossier.sourceAggregationFingerprint,
    publicationEnabled: false,
    parameterWriteAllowed: false,
    quoteEligible: false,
  }
}

const StoredEventPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  commandFingerprint: hash,
  note: text,
  decision: z.string().optional(),
  economicOwnerId: text.optional(),
  independentReviewerId: text.optional(),
  reviewMode: z.enum(['DUAL_REVIEW', 'ECONOMIC_ONLY']).optional(),
  receipt: z.object({
    sequence: z.number().int().positive(), requestId: z.string().uuid(), recordedAt: z.string().datetime(),
    entryHash: hash, dossierId: text, proposalId: text, revision: z.number().int().positive(), status: text,
    proposalFingerprint: hash, sourceAggregationFingerprint: hash,
    publicationEnabled: z.literal(false), parameterWriteAllowed: z.literal(false), quoteEligible: z.literal(false),
  }).strict(),
}).strict()

async function idempotentReceipt(tx: Transaction, identity: TireCalibrationIdentity, requestId: string, command: unknown) {
  const prior = await tx.tireCalibrationReviewEvent.findUnique({
    where: { orgId_requestId: { orgId: identity.orgId, requestId } },
  })
  if (!prior) return null
  const payload = StoredEventPayloadSchema.parse(prior.payload)
  if (payload.commandFingerprint !== digest(command)) deny('IDEMPOTENCY_CONFLICT')
  return payload.receipt
}

async function lockOrganization(tx: Transaction, orgId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT "id" FROM "Organization" WHERE "id" = ${orgId} FOR UPDATE
  `)
  if (rows.length !== 1) deny('TENANT_RESOURCE_NOT_FOUND', true)
}

async function readDossier(tx: Transaction, identity: TireCalibrationIdentity, dossierId: string) {
  const dossier = await tx.tireCalibrationDossier.findFirst({ where: { id: dossierId, orgId: identity.orgId } })
  if (!dossier) deny('DOSSIER_NOT_FOUND', true)
  return dossier
}

async function lockDossier(tx: Transaction, dossierId: string, orgId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT "id" FROM "TireCalibrationDossier"
    WHERE "id" = ${dossierId} AND "orgId" = ${orgId}
    FOR UPDATE
  `)
  if (rows.length !== 1) deny('DOSSIER_NOT_FOUND', true)
}

function authorizationContext(
  identity: TireCalibrationIdentity,
  action: 'READ_DOSSIER' | 'OPEN_DRAFT' | 'ASSIGN_REVIEWERS' | 'RECORD_ECONOMIC_DECISION' | 'RECORD_INDEPENDENT_DECISION',
  dossier: Dossier | null,
  command: { expectedRevision: number; expectedProposalFingerprint?: string },
  assignments?: { economicOwnerId?: string | null; independentReviewerId?: string | null; reviewMode?: string },
  authoritativeSourceFingerprint?: string | null,
) {
  return {
    actor: identity,
    action,
    resourceOrgId: dossier?.orgId ?? identity.orgId,
    status: dossier?.status ?? 'NEW',
    reviewMode: assignments?.reviewMode ?? dossier?.reviewMode ?? 'DUAL_REVIEW',
    expectedRevision: command.expectedRevision,
    currentRevision: dossier?.revision ?? 0,
    expectedProposalFingerprint: command.expectedProposalFingerprint ?? null,
    storedProposalFingerprint: dossier?.proposalFingerprint ?? null,
    currentSourceAggregationFingerprint: authoritativeSourceFingerprint ?? null,
    storedSourceAggregationFingerprint: dossier?.sourceAggregationFingerprint ?? null,
    authorId: dossier?.authorId ?? identity.internalUserId,
    economicOwnerId: assignments?.economicOwnerId ?? dossier?.economicOwnerId ?? null,
    independentReviewerId: assignments?.independentReviewerId ?? dossier?.independentReviewerId ?? null,
  }
}

async function appendEvent(input: {
  tx: Transaction
  identity: TireCalibrationIdentity
  dossier: Dossier
  requestId: string
  command: unknown
  action: string
  fromStatus: string | null
  note: string
  decision?: string
  economicOwnerId?: string
  independentReviewerId?: string
  reviewMode?: 'DUAL_REVIEW' | 'ECONOMIC_ONLY'
}) {
  const previous = await input.tx.tireCalibrationReviewEvent.findFirst({
    where: { dossierId: input.dossier.id, orgId: input.identity.orgId },
    orderBy: { sequence: 'desc' },
  })
  const sequence = (previous?.sequence ?? 0) + 1
  const recordedAt = new Date()
  const unsigned = {
    schemaVersion: 1,
    orgId: input.identity.orgId,
    dossierId: input.dossier.id,
    requestId: input.requestId,
    sequence,
    action: input.action,
    actorId: input.identity.internalUserId,
    fromStatus: input.fromStatus,
    toStatus: input.dossier.status,
    previousEventHash: previous?.eventHash ?? null,
    recordedAt: recordedAt.toISOString(),
    commandFingerprint: digest(input.command),
  }
  const entryHash = digest(unsigned)
  const receipt = receiptFor({ sequence, requestId: input.requestId, recordedAt, entryHash, dossier: input.dossier })
  const payload = {
    schemaVersion: 1 as const,
    commandFingerprint: unsigned.commandFingerprint,
    note: input.note,
    ...(input.decision ? { decision: input.decision } : {}),
    ...(input.economicOwnerId ? { economicOwnerId: input.economicOwnerId } : {}),
    ...(input.independentReviewerId ? { independentReviewerId: input.independentReviewerId } : {}),
    ...(input.reviewMode ? { reviewMode: input.reviewMode } : {}),
    receipt,
  }
  await input.tx.tireCalibrationReviewEvent.create({ data: {
    orgId: input.identity.orgId,
    dossierId: input.dossier.id,
    requestId: input.requestId,
    sequence,
    action: input.action,
    actorId: input.identity.internalUserId,
    fromStatus: input.fromStatus,
    toStatus: input.dossier.status,
    payload: asJson(payload),
    previousEventHash: previous?.eventHash ?? null,
    eventHash: entryHash,
    createdAt: recordedAt,
  } })
  return receipt
}

function transactionOptions() {
  return { isolationLevel: Prisma.TransactionIsolationLevel.Serializable } as const
}

export class TireCalibrationPersistence {
  constructor(private readonly database: PrismaClient) {}

  async reviewers(identityInput: unknown) {
    const identity = TireCalibrationTenantIdentitySchema.parse(identityInput)
    return this.database.user.findMany({
      where: { orgId: identity.orgId, role: 'ADMIN' },
      select: { id: true, email: true }, orderBy: { email: 'asc' },
    })
  }

  async list(identityInput: unknown) {
    const identity = TireCalibrationTenantIdentitySchema.parse(identityInput)
    return this.database.$transaction(async tx => {
      await setTireCalibrationTenantContext(tx, identity)
      return tx.tireCalibrationDossier.findMany({
        where: { orgId: identity.orgId },
        include: { approvalPackage: true },
        orderBy: { updatedAt: 'desc' },
      })
    }, transactionOptions())
  }

  async get(identityInput: unknown, dossierId: string) {
    const identity = TireCalibrationTenantIdentitySchema.parse(identityInput)
    return this.database.$transaction(async tx => {
      await setTireCalibrationTenantContext(tx, identity)
      const dossier = await tx.tireCalibrationDossier.findFirst({
        where: { id: dossierId, orgId: identity.orgId },
        include: { events: { orderBy: { sequence: 'asc' } }, approvalPackage: true },
      })
      if (!dossier) deny('DOSSIER_NOT_FOUND', true)
      assertAuthorized(authorizationContext(identity, 'READ_DOSSIER', dossier, { expectedRevision: dossier.revision }))
      return dossier
    }, transactionOptions())
  }

  async open(identityInput: unknown, input: unknown) {
    const identity = TireCalibrationTenantIdentitySchema.parse(identityInput)
    const command = OpenTireCalibrationDraftSchema.parse(input)
    const proposal = verifyTireCalibrationProposal(command.proposal)
    return this.database.$transaction(async tx => {
      await setTireCalibrationTenantContext(tx, identity)
      await lockOrganization(tx, identity.orgId)
      const prior = await idempotentReceipt(tx, identity, command.requestId, command)
      if (prior) return prior
      assertAuthorized(authorizationContext(identity, 'OPEN_DRAFT', null, command))
      const source = await resolveCurrentTireCohortSource(tx, identity.orgId, proposal.request.cohortKey)
      if (source.aggregationFingerprint !== proposal.sourceAggregationFingerprint) deny('SOURCE_FINGERPRINT_STALE')
      const exists = await tx.tireCalibrationDossier.findFirst({ where: { orgId: identity.orgId, proposalId: proposal.request.proposalId } })
      if (exists) deny('DOSSIER_ALREADY_EXISTS')
      const dossier = await tx.tireCalibrationDossier.create({ data: {
        orgId: identity.orgId,
        proposalId: proposal.request.proposalId,
        version: proposal.request.version,
        status: 'DRAFT',
        revision: 1,
        proposalFingerprint: proposal.fingerprint,
        sourceAggregationFingerprint: proposal.sourceAggregationFingerprint,
        sourceSnapshotId: source.snapshotId,
        authorId: identity.internalUserId,
        proposalSnapshot: asJson(proposal),
      } })
      return appendEvent({
        tx, identity, dossier, requestId: command.requestId, command,
        action: 'DRAFT_OPENED', fromStatus: null, note: command.note,
      })
    }, transactionOptions())
  }

  async assign(identityInput: unknown, dossierId: string, input: unknown) {
    const identity = TireCalibrationTenantIdentitySchema.parse(identityInput)
    const command = AssignTireCalibrationReviewersSchema.parse(input)
    return this.mutate(identity, dossierId, command, 'ASSIGN_REVIEWERS', async (tx, dossier) => {
      const proposal = verifyTireCalibrationProposal(dossier.proposalSnapshot)
      if (!proposal.proposalEligibleForEconomicReview) deny('PROPOSAL_NOT_ELIGIBLE_FOR_ECONOMIC_REVIEW')
      const reviewerIds = [command.economicOwnerId, command.independentReviewerId].filter((id): id is string => id !== null)
      const users = await tx.user.findMany({
        where: { orgId: identity.orgId, id: { in: reviewerIds } },
        select: { id: true, role: true },
      })
      if (users.length !== reviewerIds.length || users.some(user => user.role !== 'ADMIN')) deny('REVIEWERS_MUST_BE_SAME_TENANT_ADMINS')
      const updated = await tx.tireCalibrationDossier.update({ where: { id: dossier.id }, data: {
        economicOwnerId: command.economicOwnerId,
        independentReviewerId: command.independentReviewerId,
        reviewMode: command.reviewMode,
        status: 'PENDING_ECONOMIC',
        revision: { increment: 1 },
      } })
      return appendEvent({
        tx, identity, dossier: updated, requestId: command.requestId, command,
        action: 'REVIEWERS_ASSIGNED', fromStatus: dossier.status, note: command.note,
        economicOwnerId: command.economicOwnerId, independentReviewerId: command.independentReviewerId ?? undefined,
        reviewMode: command.reviewMode,
      })
    })
  }

  async economicDecision(identityInput: unknown, dossierId: string, input: unknown) {
    const identity = TireCalibrationTenantIdentitySchema.parse(identityInput)
    const command = TireCalibrationEconomicDecisionSchema.parse(input)
    return this.mutate(identity, dossierId, command, 'RECORD_ECONOMIC_DECISION', async (tx, dossier) => {
      const status = command.decision === 'ENDORSED'
        ? (dossier.reviewMode === 'ECONOMIC_ONLY' ? 'ECONOMIC_REVIEWED' : 'PENDING_INDEPENDENT') : 'RETURNED'
      const updated = await tx.tireCalibrationDossier.update({ where: { id: dossier.id }, data: {
        status,
        revision: { increment: 1 },
      } })
      return appendEvent({
        tx, identity, dossier: updated, requestId: command.requestId, command,
        action: command.decision === 'ENDORSED' ? 'ECONOMIC_APPROVED' : 'ECONOMIC_RETURNED',
        fromStatus: dossier.status, note: command.note, decision: command.decision,
      })
    })
  }

  async independentDecision(identityInput: unknown, dossierId: string, input: unknown) {
    const identity = TireCalibrationTenantIdentitySchema.parse(identityInput)
    const command = TireCalibrationIndependentDecisionSchema.parse(input)
    return this.mutate(identity, dossierId, command, 'RECORD_INDEPENDENT_DECISION', async (tx, dossier) => {
      const status = command.decision === 'APPROVED' ? 'REVIEWED' : 'REJECTED'
      const updated = await tx.tireCalibrationDossier.update({ where: { id: dossier.id }, data: {
        status,
        revision: { increment: 1 },
      } })
      const receipt = await appendEvent({
        tx, identity, dossier: updated, requestId: command.requestId, command,
        action: command.decision === 'APPROVED' ? 'INDEPENDENT_APPROVED' : 'INDEPENDENT_REJECTED',
        fromStatus: dossier.status, note: command.note, decision: command.decision,
      })
      if (command.decision === 'APPROVED') await this.createApprovalPackage(tx, identity, updated, receipt)
      return receipt
    })
  }

  private async mutate(
    identity: TireCalibrationIdentity,
    dossierId: string,
    command: Continuation | z.infer<typeof TireCalibrationEconomicDecisionSchema> | z.infer<typeof TireCalibrationIndependentDecisionSchema>,
    action: 'ASSIGN_REVIEWERS' | 'RECORD_ECONOMIC_DECISION' | 'RECORD_INDEPENDENT_DECISION',
    work: (tx: Transaction, dossier: Dossier) => Promise<TireCalibrationReceipt>,
  ) {
    return this.database.$transaction(async tx => {
      await setTireCalibrationTenantContext(tx, identity)
      await lockOrganization(tx, identity.orgId)
      const prior = await idempotentReceipt(tx, identity, command.requestId, command)
      if (prior) return prior
      let dossier = await readDossier(tx, identity, dossierId)
      const proposal = verifyTireCalibrationProposal(dossier.proposalSnapshot)
      const source = await resolveCurrentTireCohortSource(tx, identity.orgId, proposal.request.cohortKey)
      const assignments = action === 'ASSIGN_REVIEWERS'
        ? { economicOwnerId: (command as Continuation).economicOwnerId, independentReviewerId: (command as Continuation).independentReviewerId, reviewMode: (command as Continuation).reviewMode }
        : undefined
      assertAuthorized(authorizationContext(identity, action, dossier, command, assignments, source.aggregationFingerprint))
      await lockDossier(tx, dossier.id, identity.orgId)
      dossier = await readDossier(tx, identity, dossierId)
      assertAuthorized(authorizationContext(identity, action, dossier, command, assignments, source.aggregationFingerprint))
      return work(tx, dossier)
    }, transactionOptions())
  }

  private async createApprovalPackage(tx: Transaction, identity: TireCalibrationIdentity, dossier: Dossier, receipt: TireCalibrationReceipt) {
    const proposal: TireCalibrationProposal = verifyTireCalibrationProposal(dossier.proposalSnapshot)
    const events = await tx.tireCalibrationReviewEvent.findMany({
      where: { orgId: identity.orgId, dossierId: dossier.id },
      orderBy: { sequence: 'asc' },
    })
    const body = {
      packageId: `TIRE_CALIBRATION_REVIEW__${proposal.request.proposalId}__V${proposal.request.version}`,
      packageStatus: 'EVIDENCE_READY_PUBLICATION_NOT_AUTHORIZED' as const,
      proposalId: proposal.request.proposalId,
      proposalVersion: proposal.request.version,
      proposalFingerprint: proposal.fingerprint,
      sourceAggregationFingerprint: proposal.sourceAggregationFingerprint,
      sourceSnapshotId: dossier.sourceSnapshotId,
      policy: { id: proposal.request.policy.id, version: proposal.request.policy.version },
      semanticTargets: proposal.semanticTargets,
      impact: proposal.impact,
      authorId: dossier.authorId,
      economicOwnerId: dossier.economicOwnerId,
      independentReviewerId: dossier.independentReviewerId,
      ledger: events.map(event => ({
        sequence: event.sequence, action: event.action, actorId: event.actorId,
        previousEventHash: event.previousEventHash, eventHash: event.eventHash,
      })),
      ledgerHead: receipt.entryHash,
      requiredSeparateAuthorizations: ['SHARED_SCHEMA_PERSISTENCE', 'PRODUCTION_PARAMETER_PUBLICATION'] as const,
      publicationEnabled: false as const,
      parameterWriteAllowed: false as const,
      quoteEligible: false as const,
    }
    await tx.tireCalibrationApprovalPackage.create({ data: {
      orgId: identity.orgId,
      dossierId: dossier.id,
      createdById: identity.internalUserId,
      proposalFingerprint: proposal.fingerprint,
      sourceAggregationFingerprint: proposal.sourceAggregationFingerprint,
      ledgerHeadHash: receipt.entryHash,
      packageFingerprint: digest(body),
      snapshot: asJson(body),
      quoteEligible: false,
    } })
  }
}
