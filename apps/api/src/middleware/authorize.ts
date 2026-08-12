import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Role } from '@prisma/client'
import type { JwtPayload } from '../modules/auth/auth.schema.js'

/**
 * Route-level authorization. Authentication runs first at the module hook and
 * populates request.user; this guard only decides whether that role may mutate.
 */
export function requireRole(...allowed: Role[]) {
  return async function authorize(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JwtPayload | undefined
    if (!user) return reply.status(401).send({ error: 'Unauthorized' })
    if (!allowed.includes(user.role)) {
      return reply.status(403).send({ error: 'Forbidden', requiredRoles: allowed })
    }
  }
}
