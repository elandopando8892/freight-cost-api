import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { prisma } from '../../config/prisma.js'
import { CreateLaneSchema, UpdateLaneSchema, buildLaneKey } from './lanes.schema.js'
import { assertScopeCompatible } from '../cost-bases/cost-bases.service.js'

export async function lanesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/lanes', async (request) => {
    const { orgId } = request.user as JwtPayload
    return prisma.lane.findMany({
      where: { orgId },
      include: { equipment: true, costBase: true },
      orderBy: { createdAt: 'desc' },
    })
  })

  app.post('/lanes', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const input = CreateLaneSchema.parse(request.body)
    if (input.costBaseId) {
      const base = await prisma.costBase.findFirstOrThrow({ where: { id: input.costBaseId, orgId } })
      assertScopeCompatible(base.scope, input.operationType)
    }
    const laneKey = buildLaneKey(orgId, input.origin, input.destination, input.equipmentId, input.operationType, input.serviceType, input.config, input.costBaseId)

    const lane = await prisma.lane.upsert({
      where: { orgId_laneKey: { orgId, laneKey } },
      create: { orgId, laneKey, ...input },
      update: { ...input },
      include: { equipment: true, costBase: true },
    })
    return reply.status(201).send(lane)
  })

  app.get('/lanes/:id', async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    return prisma.lane.findFirstOrThrow({ where: { id, orgId }, include: { equipment: true, costBase: true } })
  })

  app.put('/lanes/:id', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const input = UpdateLaneSchema.parse(request.body)
    const current = await prisma.lane.findFirstOrThrow({ where: { id, orgId } })
    const costBaseId = input.costBaseId === undefined ? current.costBaseId : input.costBaseId
    const operation = input.operationType ?? current.operationType
    if (costBaseId) {
      const base = await prisma.costBase.findFirstOrThrow({ where: { id: costBaseId, orgId } })
      assertScopeCompatible(base.scope, operation)
    }
    return prisma.lane.update({ where: { id }, data: input, include: { equipment: true, costBase: true } })
  })

  app.delete('/lanes/:id', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    await prisma.lane.findFirstOrThrow({ where: { id, orgId } })
    await prisma.lane.delete({ where: { id } })
    return reply.status(204).send()
  })
}
