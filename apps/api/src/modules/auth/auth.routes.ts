import { FastifyInstance } from 'fastify'
import { RegisterSchema, LoginSchema, type JwtPayload } from './auth.schema.js'
import { registerUser, loginUser, getMe } from './auth.service.js'
import { authenticate } from '../../middleware/authenticate.js'

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {
    const input = RegisterSchema.parse(request.body)
    const { user, org } = await registerUser(input)
    const token = app.jwt.sign({ sub: user.id, orgId: user.orgId, role: user.role } as JwtPayload)
    return reply.status(201).send({ token, user: { id: user.id, email: user.email, role: user.role, orgId: org.id } })
  })

  app.post('/auth/login', async (request, reply) => {
    const input = LoginSchema.parse(request.body)
    const user = await loginUser(input)
    const token = app.jwt.sign({ sub: user.id, orgId: user.orgId, role: user.role } as JwtPayload)
    return reply.send({ token, user: { id: user.id, email: user.email, role: user.role, orgId: user.orgId } })
  })

  app.get('/auth/me', { preHandler: authenticate }, async (request, reply) => {
    const payload = request.user as JwtPayload
    const user = await getMe(payload.sub)
    if (!user) return reply.status(404).send({ error: 'User not found' })
    return reply.send(user)
  })
}
