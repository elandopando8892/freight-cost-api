import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { errorHandler } from '../src/middleware/error-handler.js'
vi.mock('../src/middleware/authenticate.js', () => ({ authenticate: async (request: any, reply: any) => {
  if (!request.headers.authorization) return reply.status(401).send({ error: 'Unauthorized' })
  request.user = { sub: 'test', orgId: request.headers['x-test-org'], role: request.headers.authorization }
} }))
vi.mock('../src/config/prisma.js', () => ({ prisma: new Proxy({}, { get: () => { throw new Error('Unexpected database access') } }) }))
const { benchmarkRoutes } = await import('../src/modules/engine/benchmark.routes.js')
const { ownedD2DFixture } = await import('./fixtures/benchmark-owned-d2d.js')
let app: FastifyInstance
beforeEach(async () => { app = Fastify(); app.setErrorHandler(errorHandler); await app.register(benchmarkRoutes) })
afterEach(async () => { await app.close() })
const url = '/engine/benchmark-owned-d2d'
const headers = { authorization: 'OPERATOR', 'x-test-org': 'org-a' }
it.each(['ADMIN', 'OPERATOR'])('recomputes for %s, no persistence or adoption', async role => {
  const response = await app.inject({ method: 'POST', url, headers: { ...headers, authorization: role }, payload: ownedD2DFixture() })
  expect(response.statusCode).toBe(200); expect(response.headers['cache-control']).toBe('no-store')
  expect(response.json()).toMatchObject({ policy: 'STATELESS_BENCHMARK_NO_ADOPTION', calibrated: false, purchaseCostUsd: null, sellPriceUsd: null, status: 'SCENARIO_ONLY' })
  expect(response.json().scenarios[0].result.costs.productionCostUsd).toBe(967.89)
})
it.each([{ headers: {}, status: 401 }, { headers: { ...headers, authorization: 'VIEWER' }, status: 403 }, { headers: { authorization: 'OPERATOR' }, status: 403 }])('rejects missing identity or permission', async item => {
  const response = await app.inject({ method: 'POST', url, ...item, payload: ownedD2DFixture() })
  expect(response.statusCode).toBe(item.status)
})
it('rejects client tenant and total injection', async () => {
  for (const extra of [{ orgId: 'org-b' }, { productionCostUsd: 1 }]) {
    const r = await app.inject({ method: 'POST', url, headers, payload: { ...ownedD2DFixture(), ...extra } })
    expect(r.statusCode).toBe(400)
  }
})
it('keeps incomplete evidence without totals', async () => {
  const input = ownedD2DFixture(); input.fixed.expenses.pop()
  const r = await app.inject({ method: 'POST', url, headers, payload: input })
  expect(r.statusCode).toBe(200); expect(r.json()).toMatchObject({ status: 'INCOMPLETE', scenarios: null })
})
it('limits payload and does not retain another organizations input', async () => {
  const oversized = await app.inject({ method: 'POST', url, headers, payload: { padding: 'a'.repeat(256_001) } })
  expect(oversized.statusCode).toBe(413)
  const input = ownedD2DFixture(); input.fixed.capital.acquisitionCost.value += 10000
  const a = await app.inject({ method: 'POST', url, headers, payload: input })
  const b = await app.inject({ method: 'POST', url, headers: { ...headers, 'x-test-org': 'org-b' }, payload: ownedD2DFixture() })
  expect(a.json().scenarios[0].result.costs.productionCostUsd).not.toBe(b.json().scenarios[0].result.costs.productionCostUsd)
  expect(b.json().scenarios[0].result.costs.productionCostUsd).toBe(967.89)
})
