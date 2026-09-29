import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import { calculateOwnedD2DScenarios } from './benchmark-owned-d2d.js'
import { benchmarkForm } from './benchmark-form.js'

/** Stateless calculation: identity comes only from verified authentication. */
export async function benchmarkRoutes(app: FastifyInstance) {
  app.addHook('onSend', async (_request, reply) => { reply.header('Cache-Control', 'no-store') })
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', async (request, reply) => {
    if (!request.user?.sub || !request.user?.orgId) return reply.status(403).send({ error: 'Se requiere identidad y organización válidas.' })
  })
  app.get('/engine/benchmark-owned-d2d/form', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async () => benchmarkForm())
  app.post('/engine/benchmark-owned-d2d', { bodyLimit: 256_000, preHandler: requireRole('ADMIN', 'OPERATOR') }, async request => {
    const result = calculateOwnedD2DScenarios(request.body)
    // Project only the review contract; avoid multiplying the original input lineage per scenario.
    return {
      policy: 'STATELESS_BENCHMARK_NO_ADOPTION', calculatedBy: 'SERVER',
      calibrated: result.calibrated, sourceStatus: result.sourceStatus,
      purchaseCostUsd: null, sellPriceUsd: null, status: result.status, issues: result.issues,
      scenarios: result.scenarios?.map(s => ({ id: s.id, result: {
        calibrated: s.result.calibrated, costs: s.result.costs,
        sharedTrailer: { lineage: { evidence: s.result.sharedTrailer!.lineage.evidence.map(e => ({ id: e.id, url: e.url, locator: e.locator })) } },
      } })) ?? null,
    }
  })
}
