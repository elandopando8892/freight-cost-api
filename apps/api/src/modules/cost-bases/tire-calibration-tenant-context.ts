import { Prisma, type Role } from '@prisma/client'

export type TireCalibrationDatabaseIdentity = {
  internalUserId: string
  orgId: string
  role: Role
}

/**
 * Sets transaction-local RLS context for the Neon/Prisma data path.
 *
 * The values must come from the internal User resolved after Supabase token
 * verification. They deliberately do not come from user_metadata or JWT domain
 * claims. `is_local = true` makes PostgreSQL discard them at transaction end.
 */
export async function setTireCalibrationTenantContext(
  tx: Prisma.TransactionClient,
  identity: TireCalibrationDatabaseIdentity,
) {
  await tx.$queryRaw(Prisma.sql`
    SELECT
      set_config('app.current_org_id', ${identity.orgId}, true),
      set_config('app.current_user_id', ${identity.internalUserId}, true),
      set_config('app.current_role', ${identity.role}, true)
  `)
}
