import { prisma } from '../../config/prisma.js'

export interface OrganizationMember {
  id: string
  email: string
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER'
  createdAt: Date
  identityLinked: boolean
}

/** Supports nullable pre-cutover identities without exposing or decoding their UUID. */
export function listOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
  return prisma.$queryRaw<OrganizationMember[]>`
    SELECT "id", "email", "role", "createdAt",
      ("supabaseId" IS NOT NULL) AS "identityLinked"
    FROM "User"
    WHERE "orgId" = ${orgId}
    ORDER BY "createdAt" ASC
  `
}
