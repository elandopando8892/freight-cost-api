import type { FastifyInstance } from 'fastify'
import { requireRole } from '../../src/middleware/authorize.js'
import { readOwnRelayReview } from '../../src/modules/engine/b2-own-relay-review.js'

/** QA uses the same minimal identity projection as benchmark.routes.
 * Authentication and the exact organization firewall remain upstream. */
export function registerB3OwnRelayRoute(app: FastifyInstance) {
  app.get('/engine/benchmark-owned-d2d/own-relay-review',
    { preHandler: requireRole('ADMIN', 'OPERATOR') }, async request =>
      readOwnRelayReview(request.query, { sub: request.user!.sub, orgId: request.user!.orgId! }))
}
