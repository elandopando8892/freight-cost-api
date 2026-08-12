import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { prisma } from '../../config/prisma.js'
import {
  effectiveInvitationStatus,
  normalizeInvitationEmail,
  organizationInvitationConfirmation,
  organizationInvitationExpiry,
} from './organization-invitations.js'

const UpdateOrgSchema = z.object({ name: z.string().min(2).max(120) })
const InvitationSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(['ADMIN', 'OPERATOR', 'VIEWER']),
})
const CreateInvitationSchema = InvitationSchema.extend({
  confirmation: z.string().min(1),
})
const InvitationParamsSchema = z.object({ id: z.string().cuid() })
const orgSelect = { id: true, name: true, country: true, createdAt: true } as const

async function invitationAvailability(orgId: string, rawEmail: string) {
  const email = normalizeInvitationEmail(rawEmail)
  const [member, invitation] = await Promise.all([
    prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { orgId: true },
    }),
    prisma.organizationInvitation.findUnique({
      where: { email },
      select: { orgId: true, status: true, expiresAt: true },
    }),
  ])
  if (member) {
    return {
      eligible: false as const,
      reason: member.orgId === orgId ? 'ALREADY_MEMBER' : 'EMAIL_UNAVAILABLE',
      email,
    }
  }
  const effectiveStatus = invitation
    ? effectiveInvitationStatus(invitation.status, invitation.expiresAt)
    : null
  if (
    invitation &&
    invitation.orgId !== orgId &&
    effectiveStatus === 'PENDING'
  ) {
    return { eligible: false as const, reason: 'EMAIL_UNAVAILABLE', email }
  }
  return {
    eligible: true as const,
    action: effectiveStatus === 'PENDING' ? 'REFRESH_PENDING' : 'CREATE_PENDING',
    email,
  }
}

export async function orgRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/org', async (request) => {
    const { orgId } = request.user as JwtPayload
    return prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: orgSelect })
  })

  app.put('/org', { preHandler: requireRole('ADMIN') }, async (request) => {
    const { orgId } = request.user as JwtPayload
    const { name } = UpdateOrgSchema.parse(request.body)
    return prisma.organization.update({ where: { id: orgId }, data: { name }, select: orgSelect })
  })

  // Read-only roster of users in the caller's org.
  app.get('/org/members', async (request) => {
    const { orgId } = request.user as JwtPayload
    const members = await prisma.user.findMany({
      where: { orgId },
      select: { id: true, email: true, role: true, kindeId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    return members.map(({ kindeId, ...member }) => ({
      ...member,
      identityLinked: Boolean(kindeId),
    }))
  })

  app.get('/org/invitations', { preHandler: requireRole('ADMIN') }, async (request) => {
    const { orgId } = request.user as JwtPayload
    const invitations = await prisma.organizationInvitation.findMany({
      where: { orgId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return invitations.map((invitation) => ({
      ...invitation,
      status: effectiveInvitationStatus(invitation.status, invitation.expiresAt),
    }))
  })

  app.post('/org/invitations/preview', { preHandler: requireRole('ADMIN') }, async (request) => {
    const { orgId } = request.user as JwtPayload
    const input = InvitationSchema.parse(request.body)
    const availability = await invitationAvailability(orgId, input.email)
    if (!availability.eligible) return availability
    const expiresAt = organizationInvitationExpiry()
    return {
      ...availability,
      role: input.role,
      expiresAt,
      confirmation: organizationInvitationConfirmation(orgId, availability.email),
      emailDelivery: 'NOT_SENT',
    }
  })

  app.post('/org/invitations', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const user = request.user as JwtPayload
    const input = CreateInvitationSchema.parse(request.body)
    const availability = await invitationAvailability(user.orgId, input.email)
    if (!availability.eligible) {
      return reply.status(409).send(availability)
    }
    const expectedConfirmation = organizationInvitationConfirmation(
      user.orgId,
      availability.email,
    )
    if (input.confirmation !== expectedConfirmation) {
      return reply.status(409).send({ error: 'Invitation confirmation does not match this tenant and email.' })
    }
    try {
      const invitation = await prisma.organizationInvitation.upsert({
        where: { email: availability.email },
        create: {
          orgId: user.orgId,
          email: availability.email,
          role: input.role,
          status: 'PENDING',
          expiresAt: organizationInvitationExpiry(),
          invitedById: user.sub,
        },
        update: {
          orgId: user.orgId,
          role: input.role,
          status: 'PENDING',
          expiresAt: organizationInvitationExpiry(),
          invitedById: user.sub,
          acceptedById: null,
          acceptedAt: null,
        },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
      })
      return reply.status(201).send({ ...invitation, emailDelivery: 'NOT_SENT' })
    } catch {
      return reply.status(409).send({ error: 'The invitation changed; preview it again.' })
    }
  })

  app.delete('/org/invitations/:id', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const { id } = InvitationParamsSchema.parse(request.params)
    const result = await prisma.organizationInvitation.updateMany({
      where: { id, orgId, status: 'PENDING' },
      data: { status: 'REVOKED' },
    })
    if (result.count !== 1) {
      return reply.status(404).send({ error: 'Pending invitation not found.' })
    }
    return reply.status(204).send()
  })
}
