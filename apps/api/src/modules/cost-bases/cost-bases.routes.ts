import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { prisma } from '../../config/prisma.js'
import { ASSISTANT_WINDOW_MS, assistantQuota } from '../assistant/assistant-governance.js'
import { CostBaseConsultantRequestSchema } from './cost-base-consultant.schema.js'
import { consultCostBase } from './cost-base-consultant.js'
import { listRecommendedCostBasePresets } from './recommended-cost-base-presets.js'
import { applicabilitySummary } from './cost-base-applicability.js'
import {
  ArchiveCostBaseSchema, ArchiveCostBaseVersionSchema, CostBaseApplicabilityPreviewSchema, CreateCostBaseSchema, CreateCostBaseVersionSchema,
  PublishCostBaseVersionSchema, UpdateCostBaseSchema, UpdateCostBaseVersionProfileSchema,
} from './cost-bases.schema.js'
import {
  activateCostBaseVersion, archiveCostBase, archiveCostBaseVersion, createCostBase, createCostBaseVersion,
  getCostBase, getCostBaseVersionImpact, listCostBases, publishCostBaseVersion, updateCostBase,
  updateCostBaseVersionProfile,
} from './cost-bases.service.js'

export async function costBasesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/cost-bases', async (request) => listCostBases((request.user as JwtPayload).orgId))

  app.get('/cost-bases/presets', async () => listRecommendedCostBasePresets())

  app.post('/cost-bases/applicability-preview', async (request) => {
    const input = CostBaseApplicabilityPreviewSchema.parse(request.body)
    return applicabilitySummary(input.scope, undefined, input.applicabilityProfile)
  })

  app.post('/cost-bases/consult', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const input = CostBaseConsultantRequestSchema.parse(request.body)
    const user = request.user as JwtPayload
    const startedAt = new Date()
    const allocation = await prisma.$transaction(async (tx) => {
      const used = await tx.assistantInteraction.count({
        where: {
          orgId: user.orgId,
          actorId: user.sub,
          createdAt: { gte: new Date(startedAt.getTime() - ASSISTANT_WINDOW_MS) },
        },
      })
      const quota = assistantQuota(used, startedAt)
      if (!quota.allowed) return { quota, interaction: null }
      const interaction = await tx.assistantInteraction.create({
        data: {
          orgId: user.orgId,
          actorId: user.sub,
          focus: 'COST_BASE_WIZARD',
          inputChars: input.message.length,
          status: 'STARTED',
        },
      })
      return { quota, interaction }
    }, { isolationLevel: 'Serializable' })

    if (!allocation.interaction) {
      return reply.status(429).send({
        error: `Límite de ${allocation.quota.limit} consultas por hora alcanzado. Puedes continuar con el formulario estructurado.`,
        quota: allocation.quota,
      })
    }

    const result = await consultCostBase(input)
    const completedAt = new Date()
    await prisma.assistantInteraction.update({
      where: { id: allocation.interaction.id },
      data: {
        status: 'COMPLETED',
        model: result.model,
        outputChars: result.reply.length,
        latencyMs: completedAt.getTime() - startedAt.getTime(),
        completedAt,
      },
    })
    return reply.send({ ...result, quota: assistantQuota(allocation.quota.used + 1, completedAt) })
  })

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
    const user = request.user as JwtPayload
    return updateCostBase(user.orgId, id, UpdateCostBaseSchema.parse(request.body), user.sub)
  })

  app.post('/cost-bases/:id/archive', { preHandler: requireRole('ADMIN') }, async (request) => {
    const { id } = request.params as { id: string }
    const user = request.user as JwtPayload
    return archiveCostBase(user.orgId, id, user.sub, ArchiveCostBaseSchema.parse(request.body ?? {}))
  })

  app.post('/cost-bases/:id/versions', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as JwtPayload
    const version = await createCostBaseVersion(user.orgId, id, CreateCostBaseVersionSchema.parse(request.body ?? {}), user.sub)
    return reply.status(201).send(version)
  })

  app.patch('/cost-bases/:id/versions/:versionId/profile', { preHandler: requireRole('ADMIN') }, async (request) => {
    const { id, versionId } = request.params as { id: string; versionId: string }
    const user = request.user as JwtPayload
    return updateCostBaseVersionProfile(
      user.orgId,
      id,
      versionId,
      UpdateCostBaseVersionProfileSchema.parse(request.body),
      user.sub,
    )
  })

  app.post('/cost-bases/:id/versions/:versionId/activate', { preHandler: requireRole('ADMIN') }, async (request) => {
    const { id, versionId } = request.params as { id: string; versionId: string }
    const user = request.user as JwtPayload
    return activateCostBaseVersion(user.orgId, id, versionId, user.sub)
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
