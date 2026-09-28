import { createHash, randomUUID } from 'node:crypto'
import { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { TireCalibrationTenantIdentitySchema } from './tire-calibration-multitenant-contract.js'
import { setTireCalibrationTenantContext } from './tire-calibration-tenant-context.js'
import { reviewTireCohortRecordV2, TireCohortRecordV2Schema } from './tire-cohort-v2.js'
import {
  createTireCohortV2ResearchSnapshot, TireCohortV2ResearchPolicySchema,
  verifyTireCohortV2ResearchSnapshot,
} from './tire-cohort-v2-statistics.js'

export const CaptureTireCohortV2ResearchSchema = z.object({
  requestId: z.string().uuid(),
  comparisonKey: z.string().trim().min(1),
  records: z.array(TireCohortRecordV2Schema).min(1),
  policy: TireCohortV2ResearchPolicySchema,
}).strict()

export class TireCohortV2ResearchError extends Error {
  constructor(readonly code: string, readonly statusCode = 409) {
    super(code)
    this.name = 'TireCohortV2ResearchError'
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

function checkedSnapshot(row: {
  id: string; orgId: string; comparisonKey: string; version: number; requestId: string;
  aggregationFingerprint: string; snapshotFingerprint: string; createdById: string;
  createdAt: Date; payload: Prisma.JsonValue;
}, orgId: string) {
  const { snapshot, aggregation } = verifyTireCohortV2ResearchSnapshot(row.payload, orgId)
  if (row.orgId !== orgId || snapshot.snapshotId !== row.id || snapshot.comparisonKey !== row.comparisonKey ||
      snapshot.version !== row.version || snapshot.requestId !== row.requestId ||
      snapshot.aggregationFingerprint !== row.aggregationFingerprint ||
      snapshot.snapshotFingerprint !== row.snapshotFingerprint ||
      snapshot.createdById !== row.createdById || snapshot.createdAt !== row.createdAt.toISOString()) {
    throw new TireCohortV2ResearchError('SOURCE_SNAPSHOT_INTEGRITY_FAILURE')
  }
  return { snapshot, aggregation }
}

export class TireCohortV2ResearchPersistence {
  constructor(private readonly database: PrismaClient) {}

  async capture(identityInput: unknown, input: unknown) {
    const identity = TireCalibrationTenantIdentitySchema.parse(identityInput)
    if (!['ADMIN', 'OPERATOR'].includes(identity.role)) throw new TireCohortV2ResearchError('ROLE_FORBIDDEN', 403)
    const command = CaptureTireCohortV2ResearchSchema.parse(input)
    if (command.records.some(record => reviewTireCohortRecordV2(record).comparisonKey !== command.comparisonKey)) {
      throw new TireCohortV2ResearchError('SOURCE_COMPARISON_KEY_MISMATCH', 422)
    }
    const commandFingerprint = digest(command)

    return this.database.$transaction(async tx => {
      await setTireCalibrationTenantContext(tx, identity)
      const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT "id" FROM "Organization" WHERE "id" = ${identity.orgId} FOR UPDATE
      `)
      if (locked.length !== 1) throw new TireCohortV2ResearchError('TENANT_RESOURCE_NOT_FOUND', 404)
      const prior = await tx.tireCohortV2ResearchSnapshot.findUnique({
        where: { orgId_requestId: { orgId: identity.orgId, requestId: command.requestId } },
      })
      if (prior) {
        if (prior.commandFingerprint !== commandFingerprint) throw new TireCohortV2ResearchError('IDEMPOTENCY_CONFLICT')
        checkedSnapshot(prior, identity.orgId)
        return {
          snapshotId: prior.id, comparisonKey: prior.comparisonKey, version: prior.version,
          aggregationFingerprint: prior.aggregationFingerprint, snapshotFingerprint: prior.snapshotFingerprint,
          researchOnly: true as const, parameterWriteAllowed: false as const, quoteEligible: false as const,
        }
      }
      const head = await tx.tireCohortV2ResearchHead.findFirst({
        where: { orgId: identity.orgId, comparisonKey: command.comparisonKey },
      })
      const version = (head?.revision ?? 0) + 1
      const snapshot = createTireCohortV2ResearchSnapshot({
        snapshotId: randomUUID(), orgId: identity.orgId, createdById: identity.internalUserId,
        requestId: command.requestId, version, createdAt: new Date().toISOString(),
        comparisonKey: command.comparisonKey, records: command.records, policy: command.policy,
      })
      await tx.tireCohortV2ResearchSnapshot.create({ data: {
        id: snapshot.snapshotId, orgId: identity.orgId, comparisonKey: command.comparisonKey,
        version, requestId: command.requestId, commandFingerprint,
        aggregationFingerprint: snapshot.aggregationFingerprint,
        snapshotFingerprint: snapshot.snapshotFingerprint, payload: asJson(snapshot),
        createdById: identity.internalUserId, createdAt: new Date(snapshot.createdAt),
      } })
      if (head) {
        await tx.tireCohortV2ResearchHead.update({ where: { id: head.id }, data: {
          currentSnapshotId: snapshot.snapshotId, revision: version, updatedById: identity.internalUserId,
        } })
      } else {
        await tx.tireCohortV2ResearchHead.create({ data: {
          orgId: identity.orgId, comparisonKey: command.comparisonKey,
          currentSnapshotId: snapshot.snapshotId, revision: version, updatedById: identity.internalUserId,
        } })
      }
      return {
        snapshotId: snapshot.snapshotId, comparisonKey: snapshot.comparisonKey, version,
        aggregationFingerprint: snapshot.aggregationFingerprint,
        snapshotFingerprint: snapshot.snapshotFingerprint,
        researchOnly: true as const, parameterWriteAllowed: false as const, quoteEligible: false as const,
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  }

  async current(identityInput: unknown, comparisonKey: string) {
    const identity = TireCalibrationTenantIdentitySchema.parse(identityInput)
    const key = z.string().trim().min(1).parse(comparisonKey)
    return this.database.$transaction(async tx => {
      await setTireCalibrationTenantContext(tx, identity)
      const head = await tx.tireCohortV2ResearchHead.findFirst({
        where: { orgId: identity.orgId, comparisonKey: key }, include: { currentSnapshot: true },
      })
      if (!head) throw new TireCohortV2ResearchError('SOURCE_SNAPSHOT_NOT_FOUND', 404)
      const { snapshot, aggregation } = checkedSnapshot(head.currentSnapshot, identity.orgId)
      if (head.currentSnapshotId !== snapshot.snapshotId || head.revision !== snapshot.version ||
          head.comparisonKey !== snapshot.comparisonKey) {
        throw new TireCohortV2ResearchError('SOURCE_SNAPSHOT_INTEGRITY_FAILURE')
      }
      return {
        snapshotId: snapshot.snapshotId, comparisonKey: snapshot.comparisonKey, version: snapshot.version,
        aggregation, snapshotFingerprint: snapshot.snapshotFingerprint,
        researchOnly: true as const, parameterWriteAllowed: false as const, quoteEligible: false as const,
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  }
}
