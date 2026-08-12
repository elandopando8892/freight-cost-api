import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import { prisma } from '../../config/prisma.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { approvalReviewBlocker } from './approval-rules.js'

const RequestApproval = z.object({ action: z.enum(['RATEBOOK_PUBLISH', 'RATEWARE_DELIVERY']), note: z.string().trim().min(3).max(2000) })
const DecideApproval = z.object({ note: z.string().trim().min(3).max(2000) })
const approvalInclude = {
  rateBook: { select: { id: true, code: true, name: true, status: true, effectiveFrom: true, effectiveUntil: true } },
  requestedBy: { select: { id: true, email: true, role: true } },
  reviewedBy: { select: { id: true, email: true, role: true } },
} as const

function httpError(message: string, statusCode: number) { return Object.assign(new Error(message), { statusCode }) }

export async function approvalsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/approvals/context', async (request) => ({ role: (request.user as JwtPayload).role }))
  app.get('/approvals', async (request) => {
    const user = request.user as JwtPayload
    const query = request.query as { status?: string }
    const status = query.status && ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(query.status) ? query.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' : undefined
    return prisma.approvalRequest.findMany({
      where: { orgId: user.orgId, ...(user.role === 'ADMIN' ? {} : { requestedById: user.sub }), ...(status ? { status } : {}) },
      include: approvalInclude,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    })
  })

  app.post('/ratebooks/:id/approval-requests', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    const user = request.user as JwtPayload
    const { id: rateBookId } = request.params as { id: string }
    const input = RequestApproval.parse(request.body)
    const book = await prisma.rateBook.findFirstOrThrow({ where: { id: rateBookId, orgId: user.orgId }, select: { id: true, status: true } })
    if (input.action === 'RATEBOOK_PUBLISH' && book.status !== 'DRAFT') throw httpError('Only a draft RateBook can request publication approval.', 409)
    if (input.action === 'RATEWARE_DELIVERY' && book.status !== 'PUBLISHED') throw httpError('Only a published RateBook can request Rateware delivery approval.', 409)
    const pending = await prisma.approvalRequest.findFirst({ where: { orgId: user.orgId, rateBookId, action: input.action, status: 'PENDING' }, select: { id: true } })
    if (pending) throw httpError('There is already a pending approval for this RateBook action.', 409)
    const approval = await prisma.approvalRequest.create({ data: { orgId: user.orgId, rateBookId, action: input.action, requestNote: input.note, requestedById: user.sub }, include: approvalInclude })
    return reply.status(201).send(approval)
  })

  app.post('/approvals/:id/approve', { preHandler: requireRole('ADMIN') }, async (request) => {
    const user = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const { note } = DecideApproval.parse(request.body)
    const approval = await prisma.approvalRequest.findFirstOrThrow({ where: { id, orgId: user.orgId }, include: approvalInclude })
    const blocker = approvalReviewBlocker({ status: approval.status, requestedById: approval.requestedById, reviewerId: user.sub })
    if (blocker) throw httpError(blocker, approval.status === 'PENDING' ? 422 : 409)
    return prisma.approvalRequest.update({ where: { id }, data: { status: 'APPROVED', decisionNote: note, reviewedById: user.sub, reviewedAt: new Date() }, include: approvalInclude })
  })

  app.post('/approvals/:id/reject', { preHandler: requireRole('ADMIN') }, async (request) => {
    const user = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const { note } = DecideApproval.parse(request.body)
    const approval = await prisma.approvalRequest.findFirstOrThrow({ where: { id, orgId: user.orgId }, select: { id: true, status: true, requestedById: true } })
    const blocker = approvalReviewBlocker({ status: approval.status, requestedById: approval.requestedById, reviewerId: user.sub })
    if (blocker) throw httpError(blocker, approval.status === 'PENDING' ? 422 : 409)
    return prisma.approvalRequest.update({ where: { id }, data: { status: 'REJECTED', decisionNote: note, reviewedById: user.sub, reviewedAt: new Date() }, include: approvalInclude })
  })
}
