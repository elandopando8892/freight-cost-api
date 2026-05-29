import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { prisma } from '../../config/prisma.js'

const UpdateOrgSchema = z.object({ name: z.string().min(2).max(120) })
const orgSelect = { id: true, name: true, country: true, createdAt: true } as const

export async function orgRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/org', async (request) => {
    const { orgId } = request.user as JwtPayload
    return prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: orgSelect })
  })

  app.put('/org', async (request) => {
    const { orgId } = request.user as JwtPayload
    const { name } = UpdateOrgSchema.parse(request.body)
    return prisma.organization.update({ where: { id: orgId }, data: { name }, select: orgSelect })
  })

  // Read-only roster of users in the caller's org.
  app.get('/org/members', async (request) => {
    const { orgId } = request.user as JwtPayload
    return prisma.user.findMany({
      where: { orgId },
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
  })
}
