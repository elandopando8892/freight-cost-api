import { Prisma } from '@prisma/client'

/**
 * PostgreSQL row locks used by every mutation that can change the meaning or
 * lifecycle of an assumption version. Callers must re-read and revalidate the
 * guarded record after acquiring the lock.
 */
export async function lockAssumptionVersion(
  tx: Prisma.TransactionClient,
  orgId: string,
  versionId: string,
) {
  await tx.$queryRaw(Prisma.sql`
    SELECT "id"
    FROM "AssumptionSet"
    WHERE "id" = ${versionId} AND "orgId" = ${orgId}
    FOR UPDATE
  `)
}

/** Serializes activation/default and base-level lifecycle transitions. */
export async function lockOrganizationLifecycle(
  tx: Prisma.TransactionClient,
  orgId: string,
) {
  await tx.$queryRaw(Prisma.sql`
    SELECT "id" FROM "Organization" WHERE "id" = ${orgId} FOR UPDATE
  `)
}

/** Serializes activation/default and base-level lifecycle transitions. */
export async function lockCostBaseLifecycle(
  tx: Prisma.TransactionClient,
  orgId: string,
  costBaseId: string,
) {
  // Organization is the shared lock for all governed mutations in the tenant;
  // CostBase is the narrower lock for its own lifecycle.
  await lockOrganizationLifecycle(tx, orgId)
  await tx.$queryRaw(Prisma.sql`
    SELECT "id"
    FROM "CostBase"
    WHERE "id" = ${costBaseId} AND "orgId" = ${orgId}
    FOR UPDATE
  `)
}
