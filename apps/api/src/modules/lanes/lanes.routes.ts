import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { prisma } from '../../config/prisma.js'
import { CreateLaneSchema, UpdateLaneSchema, buildLaneKey } from './lanes.schema.js'

export async function lanesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/lanes', async (request) => {
    const { orgId } = request.user as JwtPayload
    return prisma.lane.findMany({
      where: { orgId },
      include: { equipment: true },
      orderBy: { createdAt: 'desc' },
    })
  })

  app.post('/lanes', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const input = CreateLaneSchema.parse(request.body)
    const laneKey = buildLaneKey(orgId, input.origin, input.destination, input.equipmentId, input.operationType, input.serviceType, input.config)

    const lane = await prisma.lane.upsert({
      where: { orgId_laneKey: { orgId, laneKey } },
      create: { orgId, laneKey, ...input },
      update: { ...input },
      include: { equipment: true },
    })
    return reply.status(201).send(lane)
  })

  app.get('/lanes/:id', async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    return prisma.lane.findFirstOrThrow({ where: { id, orgId }, include: { equipment: true } })
  })

  app.put('/lanes/:id', async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const input = UpdateLaneSchema.parse(request.body)
    await prisma.lane.findFirstOrThrow({ where: { id, orgId } })
    return prisma.lane.update({ where: { id }, data: input, include: { equipment: true } })
  })

  app.delete('/lanes/:id', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    await prisma.lane.findFirstOrThrow({ where: { id, orgId } })
    await prisma.lane.delete({ where: { id } })
    return reply.status(204).send()
  })
}
