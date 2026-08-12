import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import {
  CreateSetSchema,
  UpdateSetSchema,
  BulkUpdateParamsSchema,
  ResetParamsSchema,
} from './assumptions.schema.js'
import {
  listSets,
  createSet,
  getSet,
  updateSet,
  deleteSet,
  activateSet,
  getParams,
  bulkUpdateParams,
  resetParams,
} from './assumptions.service.js'

export async function assumptionsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/assumptions/sets', async (request) => {
    const { orgId } = request.user as JwtPayload
    return listSets(orgId)
  })

  app.post('/assumptions/sets', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const input = CreateSetSchema.parse(request.body)
    const set = await createSet(orgId, input)
    return reply.status(201).send(set)
  })

  app.get('/assumptions/sets/:id', async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    return getSet(orgId, id)
  })

  app.put('/assumptions/sets/:id', { preHandler: requireRole('ADMIN') }, async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const input = UpdateSetSchema.parse(request.body)
    return updateSet(orgId, id, input)
  })

  app.delete('/assumptions/sets/:id', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    await deleteSet(orgId, id)
    return reply.status(204).send()
  })

  app.post('/assumptions/sets/:id/activate', { preHandler: requireRole('ADMIN') }, async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    return activateSet(orgId, id)
  })

  app.get('/assumptions/sets/:id/params', async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    return getParams(orgId, id)
  })

  app.patch('/assumptions/sets/:id/params', { preHandler: requireRole('ADMIN') }, async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const updates = BulkUpdateParamsSchema.parse(request.body)
    return bulkUpdateParams(orgId, id, updates)
  })

  // Reset params to V3.0 recommended values (whole set, or only the given fields).
  app.post('/assumptions/sets/:id/params/reset', { preHandler: requireRole('ADMIN') }, async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const body = ResetParamsSchema.parse(request.body ?? {})
    return resetParams(orgId, id, body.fields)
  })
}
