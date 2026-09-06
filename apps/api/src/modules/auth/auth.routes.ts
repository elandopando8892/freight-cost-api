import { FastifyInstance } from 'fastify'
import type { JwtPayload } from './auth.schema.js'
import { getMe } from './auth.service.js'
import { authenticate } from '../../middleware/authenticate.js'

export async function authRoutes(app: FastifyInstance) {
  // Login / register / logout are handled by Supabase Auth on the web side.
  // The API only needs to resolve "who am I" for the authenticated Supabase token,
  // which also triggers auto-provisioning of the User/Org on first call.
  app.get('/auth/me', { preHandler: authenticate }, async (request, reply) => {
    const payload = request.user as JwtPayload
    const user = await getMe(payload.sub)
    if (!user) return reply.status(404).send({ error: 'User not found' })
    return reply.send(user)
  })
}
