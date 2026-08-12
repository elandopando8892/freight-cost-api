import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { prisma } from '../../config/prisma.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { ASSISTANT_FOCUSES, AssistantServiceError, generateSupervisedAdvice } from './assistant.service.js'
import { ASSISTANT_WINDOW_MS, assistantQuota } from './assistant-governance.js'

const AdviceSchema = z.object({
  question: z.string().trim().min(12, 'Describe el caso con al menos 12 caracteres.').max(1_800),
  focus: z.enum(ASSISTANT_FOCUSES).default('GENERAL'),
}).strict()

export async function assistantRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/assistant/usage', async (request) => {
    const user = request.user as JwtPayload
    const now = new Date()
    const windowStartedAt = new Date(now.getTime() - ASSISTANT_WINDOW_MS)
    const ownWhere = { orgId: user.orgId, actorId: user.sub }
    const [used, events] = await Promise.all([
      prisma.assistantInteraction.count({ where: { ...ownWhere, createdAt: { gte: windowStartedAt } } }),
      prisma.assistantInteraction.findMany({
        where: user.role === 'ADMIN' ? { orgId: user.orgId } : ownWhere,
        select: { id: true, focus: true, model: true, inputChars: true, outputChars: true, latencyMs: true, status: true, failureCode: true, createdAt: true, completedAt: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ])
    return { policy: 'METADATA_ONLY_NO_PROMPTS_OR_OUTPUTS', quota: assistantQuota(used, now), events }
  })

  app.post('/assistant/advice', async (request, reply) => {
    const input = AdviceSchema.parse(request.body)
    const user = request.user as JwtPayload
    const startedAt = new Date()
    const allocation = await prisma.$transaction(async (tx) => {
      const used = await tx.assistantInteraction.count({
        where: { orgId: user.orgId, actorId: user.sub, createdAt: { gte: new Date(startedAt.getTime() - ASSISTANT_WINDOW_MS) } },
      })
      const quota = assistantQuota(used, startedAt)
      if (!quota.allowed) return { quota, interaction: null }
      // Persist only metadata before a provider request. Prompts and answers are
      // deliberately never written to FCM's database.
      const interaction = await tx.assistantInteraction.create({
        data: { orgId: user.orgId, actorId: user.sub, focus: input.focus, inputChars: input.question.length, status: 'STARTED' },
      })
      return { quota, interaction }
    }, { isolationLevel: 'Serializable' })
    if (!allocation.interaction) return reply.status(429).send({ error: `Límite de ${allocation.quota.limit} consultas por hora alcanzado. Espera antes de volver a intentar.`, quota: allocation.quota })
    const { quota, interaction } = allocation
    try {
      const result = await generateSupervisedAdvice(input)
      const completedAt = new Date()
      await prisma.assistantInteraction.update({
        where: { id: interaction.id },
        data: { status: 'COMPLETED', model: result.model, outputChars: result.answer.length, latencyMs: completedAt.getTime() - startedAt.getTime(), completedAt },
      })
      return reply.send({ ...result, quota: assistantQuota(quota.used + 1, completedAt) })
    } catch (error) {
      const failureCode = error instanceof AssistantServiceError ? error.kind : 'UNKNOWN'
      await prisma.assistantInteraction.update({
        where: { id: interaction.id },
        data: { status: 'FAILED', failureCode, latencyMs: Date.now() - startedAt.getTime(), completedAt: new Date() },
      })
      if (error instanceof AssistantServiceError) {
        if (error.kind === 'NOT_CONFIGURED') return reply.status(503).send({ error: 'El asistente no está configurado para este entorno.' })
        if (error.kind === 'EMPTY_RESPONSE') return reply.status(502).send({ error: 'El asistente no produjo una recomendación. Intenta reformular la consulta.' })
      }
      return reply.status(503).send({ error: 'El asistente no está disponible temporalmente. No se realizó ningún cambio.' })
    }
  })
}
