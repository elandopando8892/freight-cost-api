import { prisma } from '../../config/prisma.js'

/** Look up our internal user record (identity is owned by Supabase Auth). */
export async function getMe(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, orgId: true, createdAt: true },
  })
}
