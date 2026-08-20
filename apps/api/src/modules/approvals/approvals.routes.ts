import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import { prisma } from '../../config/prisma.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { approvalReviewBlocker, singleAdminApprovalConfirmation } from './approval-rules.js'
import { buildRatewareDeliveryEnvelope } from '../ratebooks/rateware-delivery-envelope.js'

const RequestApproval = z.object({ action: z.enum(['RATEBOOK_PUBLISH', 'RATEWARE_DELIVERY']), note: z.string().trim().min(3).max(2000) })
const DecideApproval = z.object({
  note: z.string().trim().min(3).max(2000),
  singleAdminConfirmation: z.string().trim().max(200).optional(),
})
const approvalInclude = {
  rateBook: { select: { id: true, code: true, name: true, status: true, effectiveFrom: true, effectiveUntil: true } },
  requestedBy: { select: { id: true, email: true, role: true } },
  reviewedBy: { select: { id: true, email: true, role: true } },
} as const

function httpError(message: string, statusCode: number) { return Object.assign(new Error(message), { statusCode }) }

export async function approvalsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/approvals/context', async (request) => {
    const user = request.user as JwtPayload
    const adminCount = await prisma.user.count({ where: { orgId: user.orgId, role: 'ADMIN' } })
    return { role: user.role, userId: user.sub, adminCount, singleAdminMode: adminCount === 1 }
  })
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
    const book = await prisma.rateBook.findFirstOrThrow({
      where: { id: rateBookId, orgId: user.orgId },
      include: {
        costBase: { select: { id: true, code: true, name: true, scope: true, status: true } },
        set: { select: { id: true, name: true, version: true, status: true } },
        entries: { orderBy: [{ operation: 'asc' }, { origin: 'asc' }, { destination: 'asc' }, { id: 'asc' }] },
      },
    })
    if (input.action === 'RATEBOOK_PUBLISH' && book.status !== 'DRAFT') throw httpError('Only a draft RateBook can request publication approval.', 409)
    if (input.action === 'RATEWARE_DELIVERY' && book.status !== 'PUBLISHED') throw httpError('Only a published RateBook can request Rateware delivery approval.', 409)
    const pending = await prisma.approvalRequest.findFirst({ where: { orgId: user.orgId, rateBookId, action: input.action, status: 'PENDING' }, select: { id: true } })
    if (pending) throw httpError('There is already a pending approval for this RateBook action.', 409)
    const payloadChecksum = input.action === 'RATEWARE_DELIVERY'
      ? buildRatewareDeliveryEnvelope({ orgId: user.orgId, book }).payloadChecksum
      : null
    const approval = await prisma.approvalRequest.create({ data: { orgId: user.orgId, rateBookId, action: input.action, payloadChecksum, requestNote: input.note, requestedById: user.sub }, include: approvalInclude })
    return reply.status(201).send(approval)
  })

  app.post('/approvals/:id/approve', { preHandler: requireRole('ADMIN') }, async (request) => {
    const user = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const input = DecideApproval.parse(request.body)
    const [approval, adminCount] = await Promise.all([
      prisma.approvalRequest.findFirstOrThrow({ where: { id, orgId: user.orgId }, include: approvalInclude }),
      prisma.user.count({ where: { orgId: user.orgId, role: 'ADMIN' } }),
    ])
    const singleAdminSelfReview = adminCount === 1 && approval.requestedById === user.sub
    const expectedConfirmation = singleAdminApprovalConfirmation(approval.id)
    const blocker = approvalReviewBlocker({
      status: approval.status,
      requestedById: approval.requestedById,
      reviewerId: user.sub,
      allowSingleAdminSelfReview: singleAdminSelfReview,
      singleAdminConfirmed: input.singleAdminConfirmation === expectedConfirmation,
    })
    if (blocker) throw httpError(blocker, approval.status === 'PENDING' ? 422 : 409)
    const decisionNote = singleAdminSelfReview
      ? `${input.note}\n[${expectedConfirmation}]`
      : input.note
    return prisma.approvalRequest.update({ where: { id }, data: { status: 'APPROVED', decisionNote, reviewedById: user.sub, reviewedAt: new Date() }, include: approvalInclude })
  })

  app.post('/approvals/:id/reject', { preHandler: requireRole('ADMIN') }, async (request) => {
    const user = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const input = DecideApproval.parse(request.body)
    const [approval, adminCount] = await Promise.all([
      prisma.approvalRequest.findFirstOrThrow({ where: { id, orgId: user.orgId }, select: { id: true, status: true, requestedById: true } }),
      prisma.user.count({ where: { orgId: user.orgId, role: 'ADMIN' } }),
    ])
    const singleAdminSelfReview = adminCount === 1 && approval.requestedById === user.sub
    const expectedConfirmation = singleAdminApprovalConfirmation(approval.id)
    const blocker = approvalReviewBlocker({
      status: approval.status,
      requestedById: approval.requestedById,
      reviewerId: user.sub,
      allowSingleAdminSelfReview: singleAdminSelfReview,
      singleAdminConfirmed: input.singleAdminConfirmation === expectedConfirmation,
    })
    if (blocker) throw httpError(blocker, approval.status === 'PENDING' ? 422 : 409)
    const decisionNote = singleAdminSelfReview
      ? `${input.note}\n[${expectedConfirmation}]`
      : input.note
    return prisma.approvalRequest.update({ where: { id }, data: { status: 'REJECTED', decisionNote, reviewedById: user.sub, reviewedAt: new Date() }, include: approvalInclude })
  })
}
