import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import { prisma } from '../../config/prisma.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { isQuoteCalculationSnapshot, verifyQuoteCalculationSnapshot } from '../quotes/quote-snapshot.js'
import { buildScenario, unknownScenarioKeys } from '../scenarios/scenario.service.js'
import { createDraftFromApprovedScenarioReview, reviewDecisionBlocker, scenarioReviewChanges, scenarioReviewEvidence, SCENARIO_REVIEW_POLICY } from './scenario-reviews.service.js'

const ScenarioChangesSchema = z.array(z.object({ key: z.string().regex(/^[A-Z_]+__.+$/), value: z.number().finite() })).min(1).max(20)
  .refine((changes) => new Set(changes.map((change) => change.key)).size === changes.length, 'Each scenario field can be changed only once.')
const CreateScenarioReviewSchema = z.object({
  quoteId: z.string().min(1),
  changes: ScenarioChangesSchema,
  note: z.string().trim().min(3).max(2000).optional(),
}).strict()
const DecisionSchema = z.object({ note: z.string().trim().min(3).max(2000) }).strict()
const CreateDraftSchema = z.object({ note: z.string().trim().min(3).max(2000).optional() }).strict()
const reviewStatuses = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'] as const

const reviewInclude = {
  quote: { select: { id: true, label: true, operation: true, service: true, freightBaselineUsd: true, requiredTariffUsd: true } },
  createdBy: { select: { id: true, email: true, role: true } },
  reviewedBy: { select: { id: true, email: true, role: true } },
  derivedAssumptionSet: { select: { id: true, name: true, version: true, status: true, costBaseId: true } },
} as const

function httpError(message: string, statusCode: number) { return Object.assign(new Error(message), { statusCode }) }

export async function scenarioReviewRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/scenario-reviews/context', async (request) => ({ policy: SCENARIO_REVIEW_POLICY, role: (request.user as JwtPayload).role }))

  app.get('/scenario-reviews', async (request) => {
    const user = request.user as JwtPayload
    const query = request.query as { status?: string; quoteId?: string }
    const status = reviewStatuses.includes(query.status as typeof reviewStatuses[number]) ? query.status as typeof reviewStatuses[number] : undefined
    return prisma.scenarioReview.findMany({
      where: { orgId: user.orgId, ...(status ? { status } : {}), ...(query.quoteId ? { quoteId: query.quoteId } : {}) },
      include: reviewInclude,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    })
  })

  app.get('/scenario-reviews/:id', async (request) => {
    const user = request.user as JwtPayload
    const { id } = request.params as { id: string }
    return prisma.scenarioReview.findFirstOrThrow({ where: { id, orgId: user.orgId }, include: reviewInclude })
  })

  app.post('/scenario-reviews', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    const user = request.user as JwtPayload
    const input = CreateScenarioReviewSchema.parse(request.body)
    const quote = await prisma.quote.findFirstOrThrow({ where: { id: input.quoteId, orgId: user.orgId }, select: { id: true, explanation: true } })
    const snapshot = (quote.explanation as { snapshot?: unknown } | null)?.snapshot
    if (!isQuoteCalculationSnapshot(snapshot)) throw httpError('This quote has no reproducible snapshot for a review packet.', 409)
    const verification = verifyQuoteCalculationSnapshot(snapshot)
    if (!verification.reproducible) throw httpError('This quote snapshot cannot be reproduced reliably; no review packet was created.', 409)
    const unknownKeys = unknownScenarioKeys(snapshot, input.changes)
    if (unknownKeys.length) throw httpError(`The review contains fields not present in the source snapshot: ${unknownKeys.join(', ')}.`, 422)
    const scenario = buildScenario(snapshot, input.changes)
    const review = await prisma.scenarioReview.create({
      data: {
        orgId: user.orgId,
        quoteId: quote.id,
        sourceChecksum: snapshot.checksum,
        changes: scenarioReviewChanges(input.changes),
        evidence: scenarioReviewEvidence({ sourceChecksum: snapshot.checksum, scenario }),
        note: input.note,
        createdById: user.sub,
      },
      include: reviewInclude,
    })
    return reply.status(201).send({ policy: SCENARIO_REVIEW_POLICY, review })
  })

  app.post('/scenario-reviews/:id/submit', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request) => {
    const user = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const review = await prisma.scenarioReview.findFirstOrThrow({ where: { id, orgId: user.orgId }, select: { id: true, status: true, createdById: true } })
    if (review.status !== 'DRAFT') throw httpError('Only a draft scenario review can be submitted.', 409)
    if (review.createdById !== user.sub) throw httpError('Only the requester can submit this scenario review.', 403)
    return prisma.scenarioReview.update({ where: { id }, data: { status: 'UNDER_REVIEW', submittedAt: new Date() }, include: reviewInclude })
  })

  app.post('/scenario-reviews/:id/approve', { preHandler: requireRole('ADMIN') }, async (request) => {
    const user = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const { note } = DecisionSchema.parse(request.body)
    const review = await prisma.scenarioReview.findFirstOrThrow({ where: { id, orgId: user.orgId }, select: { id: true, status: true, createdById: true } })
    const blocker = reviewDecisionBlocker({ ...review, reviewerId: user.sub })
    if (blocker) throw httpError(blocker, review.status === 'UNDER_REVIEW' ? 422 : 409)
    return prisma.scenarioReview.update({ where: { id }, data: { status: 'APPROVED', decisionNote: note, reviewedById: user.sub, reviewedAt: new Date() }, include: reviewInclude })
  })

  app.post('/scenario-reviews/:id/reject', { preHandler: requireRole('ADMIN') }, async (request) => {
    const user = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const { note } = DecisionSchema.parse(request.body)
    const review = await prisma.scenarioReview.findFirstOrThrow({ where: { id, orgId: user.orgId }, select: { id: true, status: true, createdById: true } })
    const blocker = reviewDecisionBlocker({ ...review, reviewerId: user.sub })
    if (blocker) throw httpError(blocker, review.status === 'UNDER_REVIEW' ? 422 : 409)
    return prisma.scenarioReview.update({ where: { id }, data: { status: 'REJECTED', decisionNote: note, reviewedById: user.sub, reviewedAt: new Date() }, include: reviewInclude })
  })

  app.post('/scenario-reviews/:id/assumption-version', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const user = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const input = CreateDraftSchema.parse(request.body ?? {})
    const version = await createDraftFromApprovedScenarioReview({ orgId: user.orgId, reviewId: id, actorId: user.sub, note: input.note })
    return reply.status(201).send({ policy: SCENARIO_REVIEW_POLICY, version })
  })
}
