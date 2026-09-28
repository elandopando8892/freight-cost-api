import { createHash } from 'node:crypto'
import { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { TireCalibrationTenantIdentitySchema } from './tire-calibration-multitenant-contract.js'
import { setTireCalibrationTenantContext } from './tire-calibration-tenant-context.js'
import { aggregateTireCohorts, TireCohortStatisticsPolicySchema } from './tire-cohort-statistics.js'
import { TireCohortRecordSchema } from './tire-cohort.js'

const text = z.string().trim().min(1).max(4000)
const hash = z.string().regex(/^[a-f0-9]{64}$/)

export const CaptureTireCohortSourceSchema = z.object({
  requestId: z.string().uuid(),
  note: text,
  cohortKey: text,
  records: z.array(TireCohortRecordSchema).min(1),
  statisticsPolicy: TireCohortStatisticsPolicySchema,
}).strict()

export type TireCohortSourceIdentity = z.infer<typeof TireCalibrationTenantIdentitySchema>

export class TireCohortSourceError extends Error {
  constructor(readonly code: string, readonly statusCode = 409) {
    super(code)
    this.name = 'TireCohortSourceError'
  }
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
  if (typeof value === 'number') return JSON.stringify(Number(value.toPrecision(15)))
  return JSON.stringify(value)
}

const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex')
const asJson = (value: unknown) => value as Prisma.InputJsonValue

async function lockOrganization(tx: Prisma.TransactionClient, orgId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT "id" FROM "Organization" WHERE "id" = ${orgId} FOR UPDATE
  `)
  if (rows.length !== 1) throw new TireCohortSourceError('TENANT_RESOURCE_NOT_FOUND', 404)
}

export async function resolveCurrentTireCohortSource(
  tx: Prisma.TransactionClient,
  orgId: string,
  cohortKey: string,
) {
  const head = await tx.tireCohortSourceHead.findFirst({
    where: { orgId, cohortKey },
    include: { currentSnapshot: true },
  })
  if (!head) throw new TireCohortSourceError('SOURCE_SNAPSHOT_NOT_FOUND')
  const records = z.array(TireCohortRecordSchema).min(1).parse(head.currentSnapshot.recordsSnapshot)
  const policy = TireCohortStatisticsPolicySchema.parse(head.currentSnapshot.statisticsPolicy)
  const aggregation = aggregateTireCohorts(records, policy)
  if (!aggregation.cohorts.some(cohort => cohort.key === cohortKey)) {
    throw new TireCohortSourceError('SOURCE_COHORT_NOT_FOUND')
  }
  if (aggregation.fingerprint !== head.currentSnapshot.aggregationFingerprint) {
    throw new TireCohortSourceError('SOURCE_SNAPSHOT_INTEGRITY_FAILURE')
  }
  return {
    headId: head.id,
    headRevision: head.revision,
    snapshotId: head.currentSnapshot.id,
    snapshotVersion: head.currentSnapshot.version,
    aggregationFingerprint: aggregation.fingerprint,
  }
}

export class TireCohortSourcePersistence {
  constructor(private readonly database: PrismaClient) {}

  async capture(identityInput: unknown, input: unknown) {
    const identity = TireCalibrationTenantIdentitySchema.parse(identityInput)
    const command = CaptureTireCohortSourceSchema.parse(input)
    if (!['ADMIN', 'OPERATOR'].includes(identity.role)) throw new TireCohortSourceError('ROLE_FORBIDDEN', 403)
    const aggregation = aggregateTireCohorts(command.records, command.statisticsPolicy)
    if (!aggregation.cohorts.some(cohort => cohort.key === command.cohortKey)) {
      throw new TireCohortSourceError('SOURCE_COHORT_NOT_FOUND', 422)
    }
    const commandFingerprint = digest(command)

    return this.database.$transaction(async tx => {
      await setTireCalibrationTenantContext(tx, identity)
      await lockOrganization(tx, identity.orgId)
      const prior = await tx.tireCohortSourceSnapshot.findUnique({
        where: { orgId_requestId: { orgId: identity.orgId, requestId: command.requestId } },
      })
      if (prior) {
        if (prior.commandFingerprint !== commandFingerprint) throw new TireCohortSourceError('IDEMPOTENCY_CONFLICT')
        return {
          snapshotId: prior.id, version: prior.version, cohortKey: prior.cohortKey,
          aggregationFingerprint: prior.aggregationFingerprint, headRevision: prior.version,
          quoteEligible: false as const, parameterWriteAllowed: false as const,
        }
      }

      const head = await tx.tireCohortSourceHead.findFirst({
        where: { orgId: identity.orgId, cohortKey: command.cohortKey },
      })
      if (head) {
        const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
          SELECT "id" FROM "TireCohortSourceHead"
          WHERE "id" = ${head.id} AND "orgId" = ${identity.orgId}
          FOR UPDATE
        `)
        if (locked.length !== 1) throw new TireCohortSourceError('SOURCE_HEAD_NOT_FOUND', 404)
      }
      const version = (head?.revision ?? 0) + 1
      const snapshot = await tx.tireCohortSourceSnapshot.create({ data: {
        orgId: identity.orgId,
        cohortKey: command.cohortKey,
        version,
        requestId: command.requestId,
        commandFingerprint,
        aggregationFingerprint: aggregation.fingerprint,
        recordsSnapshot: asJson(command.records),
        statisticsPolicy: asJson(command.statisticsPolicy),
        createdById: identity.internalUserId,
      } })
      if (head) {
        await tx.tireCohortSourceHead.update({ where: { id: head.id }, data: {
          currentSnapshotId: snapshot.id,
          revision: version,
          updatedById: identity.internalUserId,
        } })
      } else {
        await tx.tireCohortSourceHead.create({ data: {
          orgId: identity.orgId,
          cohortKey: command.cohortKey,
          currentSnapshotId: snapshot.id,
          revision: version,
          updatedById: identity.internalUserId,
        } })
      }
      return {
        snapshotId: snapshot.id, version, cohortKey: command.cohortKey,
        aggregationFingerprint: aggregation.fingerprint, headRevision: version,
        quoteEligible: false as const, parameterWriteAllowed: false as const,
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  }

  async current(identityInput: unknown, cohortKey: string) {
    const identity = TireCalibrationTenantIdentitySchema.parse(identityInput)
    return this.database.$transaction(async tx => {
      await setTireCalibrationTenantContext(tx, identity)
      return resolveCurrentTireCohortSource(tx, identity.orgId, cohortKey)
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  }
}

export const TireCohortSourceFingerprintSchema = hash
