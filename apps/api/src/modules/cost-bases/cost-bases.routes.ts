import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import {
  ArchiveCostBaseVersionSchema, CreateCostBaseSchema, CreateCostBaseVersionSchema,
  PublishCostBaseVersionSchema, UpdateCostBaseSchema,
} from './cost-bases.schema.js'
import {
  activateCostBaseVersion, archiveCostBaseVersion, createCostBase, createCostBaseVersion,
  getCostBase, getCostBaseVersionImpact, listCostBases, publishCostBaseVersion, updateCostBase,
} from './cost-bases.service.js'

export async function costBasesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/cost-bases', async (request) => listCostBases((request.user as JwtPayload).orgId))

  app.post('/cost-bases', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const user = request.user as JwtPayload
    const base = await createCostBase(user.orgId, CreateCostBaseSchema.parse(request.body), user.sub)
    return reply.status(201).send(base)
  })

  app.get('/cost-bases/:id', async (request) => {
    const { id } = request.params as { id: string }
    return getCostBase((request.user as JwtPayload).orgId, id)
  })

  app.patch('/cost-bases/:id', { preHandler: requireRole('ADMIN') }, async (request) => {
    const { id } = request.params as { id: string }
    return updateCostBase((request.user as JwtPayload).orgId, id, UpdateCostBaseSchema.parse(request.body))
  })

  app.post('/cost-bases/:id/versions', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as JwtPayload
    const version = await createCostBaseVersion(user.orgId, id, CreateCostBaseVersionSchema.parse(request.body ?? {}), user.sub)
    return reply.status(201).send(version)
  })

  app.post('/cost-bases/:id/versions/:versionId/activate', { preHandler: requireRole('ADMIN') }, async (request) => {
    const { id, versionId } = request.params as { id: string; versionId: string }
    return activateCostBaseVersion((request.user as JwtPayload).orgId, id, versionId)
  })

  app.get('/cost-bases/:id/versions/:versionId/impact', async (request) => {
    const { id, versionId } = request.params as { id: string; versionId: string }
    return getCostBaseVersionImpact((request.user as JwtPayload).orgId, id, versionId)
  })

  app.post('/cost-bases/:id/versions/:versionId/publish', { preHandler: requireRole('ADMIN') }, async (request) => {
    const { id, versionId } = request.params as { id: string; versionId: string }
    const user = request.user as JwtPayload
    return publishCostBaseVersion(user.orgId, id, versionId, user.sub, PublishCostBaseVersionSchema.parse(request.body))
  })

  app.post('/cost-bases/:id/versions/:versionId/archive', { preHandler: requireRole('ADMIN') }, async (request) => {
    const { id, versionId } = request.params as { id: string; versionId: string }
    const user = request.user as JwtPayload
    return archiveCostBaseVersion(user.orgId, id, versionId, user.sub, ArchiveCostBaseVersionSchema.parse(request.body))
  })
}
