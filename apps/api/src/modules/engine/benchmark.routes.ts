import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import { calculateOwnedD2DScenarios } from './benchmark-owned-d2d.js'
import { benchmarkForm } from './benchmark-form.js'
import { readB2Evidence } from './b2-evidence.js'
import { readOwnRelayReview } from './b2-own-relay-review.js'
import { projectBenchmarkReview } from './benchmark-review-projection.js'

/** Stateless calculation: identity comes only from verified authentication. */
export async function benchmarkRoutes(app: FastifyInstance) {
  app.addHook('onSend', async (_request, reply) => { reply.header('Cache-Control', 'no-store') })
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', async (request, reply) => {
    if (!request.user?.sub || !request.user?.orgId) return reply.status(403).send({ error: 'Se requiere identidad y organización válidas.' })
  })
  app.get('/engine/benchmark-owned-d2d/form', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async () => benchmarkForm())
  app.get('/engine/benchmark-owned-d2d/b2-evidence', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async request =>
    readB2Evidence(request.query, { sub: request.user!.sub, orgId: request.user!.orgId! }))
  app.get('/engine/benchmark-owned-d2d/own-relay-review', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async request =>
    readOwnRelayReview(request.query, { sub: request.user!.sub, orgId: request.user!.orgId! }))
  app.post('/engine/benchmark-owned-d2d', { bodyLimit: 256_000, preHandler: requireRole('ADMIN', 'OPERATOR') }, async request => {
    const result = calculateOwnedD2DScenarios(request.body)
    return projectBenchmarkReview(result)
  })
}
