import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { prisma } from '../../config/prisma.js'
import { CreateLaneSchema, UpdateLaneSchema, buildLaneKey } from './lanes.schema.js'
import { assertScopeCompatible } from '../cost-bases/cost-bases.service.js'

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode })
}

const LANE_IDENTITY_FIELDS = [
  'origin', 'destination', 'costBaseId', 'equipmentId', 'operationType', 'serviceType', 'config',
] as const

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
    const current = await prisma.lane.findFirstOrThrow({
      where: { id, orgId },
      include: { _count: { select: { quotes: true } } },
    })
    const identityChanged = LANE_IDENTITY_FIELDS.some((field) => (
      input[field] !== undefined && input[field] !== current[field]
    ))
    if ((current._count?.quotes ?? 0) > 0 && identityChanged) {
      throw httpError('La identidad de una lane con cotizaciones guardadas es inmutable; crea una lane nueva.', 409)
    }
    const costBaseId = input.costBaseId === undefined ? current.costBaseId : input.costBaseId
    const operation = input.operationType ?? current.operationType
    if (costBaseId) {
      const base = await prisma.costBase.findFirstOrThrow({ where: { id: costBaseId, orgId } })
      assertScopeCompatible(base.scope, operation)
    }
    const merged = { ...current, ...input, costBaseId, operationType: operation }
    const laneKey = identityChanged
      ? buildLaneKey(
          orgId, merged.origin, merged.destination, merged.equipmentId ?? undefined,
          merged.operationType, merged.serviceType, merged.config, merged.costBaseId,
        )
      : current.laneKey
    const updated = await prisma.lane.updateMany({
      where: {
        id,
        orgId,
        updatedAt: current.updatedAt,
        ...(identityChanged ? { quotes: { none: {} } } : {}),
      },
      data: { ...input, laneKey },
    })
    if (updated.count !== 1) {
      throw httpError(
        identityChanged
          ? 'La lane cambió o recibió una cotización mientras se editaba; recarga antes de continuar.'
          : 'La lane cambió mientras se editaba; recarga antes de continuar.',
        409,
      )
    }
    return prisma.lane.findFirstOrThrow({
      where: { id, orgId },
      include: { equipment: true, costBase: true },
    })
  })

  app.delete('/lanes/:id', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const lane = await prisma.lane.findFirstOrThrow({
      where: { id, orgId },
      include: { _count: { select: { quotes: true } } },
    })
    if ((lane._count?.quotes ?? 0) > 0) {
      throw httpError('No se puede eliminar una lane con cotizaciones guardadas.', 409)
    }
    const deleted = await prisma.lane.deleteMany({ where: { id, orgId, quotes: { none: {} } } })
    if (deleted.count !== 1) throw httpError('La lane recibió una cotización y ya no puede eliminarse.', 409)
    return reply.status(204).send()
  })
}
