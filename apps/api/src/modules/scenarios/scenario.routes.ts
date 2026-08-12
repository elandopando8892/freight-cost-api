import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { prisma } from '../../config/prisma.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { isQuoteCalculationSnapshot, verifyQuoteCalculationSnapshot } from '../quotes/quote-snapshot.js'
import { SCENARIO_FIELDS, buildScenario, scenarioFieldsFor, unknownScenarioKeys } from './scenario.service.js'

const ScenarioSchema = z.object({
  changes: z.array(z.object({ key: z.string().regex(/^[A-Z_]+__.+$/), value: z.number().finite() })).min(1).max(20)
    .refine((changes) => new Set(changes.map((change) => change.key)).size === changes.length, 'Each scenario field can be changed only once.'),
}).strict()

export async function scenarioRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/scenarios/fields', async () => ({ policy: 'READ_ONLY_SCENARIO_NO_PERSISTENCE', fields: SCENARIO_FIELDS }))

  app.get('/scenarios/quotes/:id/context', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const quote = await prisma.quote.findFirstOrThrow({ where: { id, orgId }, select: { id: true, explanation: true } })
    const snapshot = (quote.explanation as { snapshot?: unknown } | null)?.snapshot
    if (!isQuoteCalculationSnapshot(snapshot)) return reply.status(409).send({ error: 'Esta cotización no cuenta con un snapshot reproducible para simular.' })
    const verification = verifyQuoteCalculationSnapshot(snapshot)
    if (!verification.reproducible) return reply.status(409).send({ error: 'El snapshot no se puede reproducir de forma confiable; no se generó ningún escenario.', verification })
    return { quoteId: quote.id, policy: 'READ_ONLY_SCENARIO_NO_PERSISTENCE', fields: scenarioFieldsFor(snapshot) }
  })

  app.post('/scenarios/quotes/:id', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const input = ScenarioSchema.parse(request.body)
    const quote = await prisma.quote.findFirstOrThrow({ where: { id, orgId }, select: { id: true, explanation: true } })
    const snapshot = (quote.explanation as { snapshot?: unknown } | null)?.snapshot
    if (!isQuoteCalculationSnapshot(snapshot)) return reply.status(409).send({ error: 'Esta cotización no cuenta con un snapshot reproducible para simular.' })
    const verification = verifyQuoteCalculationSnapshot(snapshot)
    if (!verification.reproducible) return reply.status(409).send({ error: 'El snapshot no se puede reproducir de forma confiable; no se generó ningún escenario.', verification })
    const unknownKeys = unknownScenarioKeys(snapshot, input.changes)
    if (unknownKeys.length) return reply.status(422).send({ error: 'El escenario contiene parámetros que no existen en el snapshot de esta cotización.', unknownKeys })
    return reply.send({ quoteId: quote.id, ...buildScenario(snapshot, input.changes) })
  })
}
