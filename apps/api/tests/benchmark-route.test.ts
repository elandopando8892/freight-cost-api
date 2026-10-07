import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { errorHandler } from '../src/middleware/error-handler.js'
import formSnapshot from '../../web/tests/visual/benchmark-form-schema.json'
vi.mock('../src/middleware/authenticate.js', () => ({ authenticate: async (request: any, reply: any) => {
  if (!request.headers.authorization) return reply.status(401).send({ error: 'Unauthorized' })
  request.user = { sub: 'test', orgId: request.headers['x-test-org'], role: request.headers.authorization }
} }))
vi.mock('../src/config/prisma.js', () => ({ prisma: new Proxy({}, { get: () => { throw new Error('Unexpected database access') } }) }))
const { benchmarkRoutes } = await import('../src/modules/engine/benchmark.routes.js')
const { ownedD2DFixture: legacyOwnedD2DFixture } = await import('./fixtures/benchmark-owned-d2d.js')
const { economicTraceInput: ownedD2DFixture } = await import('./fixtures/benchmark-review-trace.js')
let app: FastifyInstance
beforeEach(async () => { app = Fastify(); app.setErrorHandler(errorHandler); await app.register(benchmarkRoutes) })
afterEach(async () => { await app.close() })
const url = '/engine/benchmark-owned-d2d'
const headers = { authorization: 'OPERATOR', 'x-test-org': 'org-a' }
it('keeps research attachment overrides outside the ordinary HTTP and form contract', async () => {
  const input = ownedD2DFixture()
  for (const payload of [{...input,trailerAttachment:{}}, {...input,trailer:{...input.trailer,trailerAttachment:{}}}]) {
    const response = await app.inject({method:'POST',url,headers,payload})
    expect(response.statusCode).toBe(400)
  }
  const response = await app.inject({method:'GET',url:`${url}/form`,headers})
  const form = response.json()
  expect(Object.keys(form.fields)).not.toContain('trailerAttachment')
  expect(Object.keys(form.fields.trailer.fields)).not.toContain('trailerAttachment')
})
it('serves field metadata without economic defaults', async () => {
  const r = await app.inject({ method: 'GET', url: `${url}/form`, headers })
  expect(r.statusCode).toBe(200)
  expect(r.json()).toEqual(formSnapshot)
  expect(r.headers['cache-control']).toBe('no-store')
  const rows = r.json().fields.route.fields.mx.fields.parameters.fields.parameters.rows
  expect(rows.length).toBeGreaterThan(0)
  for (const row of rows) expect(Object.keys(row).sort()).toEqual(['key', 'unit'])
})
it.each([{}, { authorization: 'VIEWER', 'x-test-org': 'org-a' }])('protects form metadata', async headers => {
  const r = await app.inject({ method: 'GET', url: `${url}/form`, headers })
  expect([401, 403]).toContain(r.statusCode)
})
it.each(['ADMIN', 'OPERATOR'])('recomputes for %s, no persistence or adoption', async role => {
  const response = await app.inject({ method: 'POST', url, headers: { ...headers, authorization: role }, payload: ownedD2DFixture() })
  expect(response.statusCode).toBe(200); expect(response.headers['cache-control']).toBe('no-store')
  expect(response.json()).toMatchObject({ policy: 'STATELESS_BENCHMARK_NO_ADOPTION', calibrated: false, purchaseCostUsd: null, sellPriceUsd: null, status: 'SCENARIO_ONLY' })
  expect(response.json().scenarios[0].result.costs.productionCostUsd).toBe(965.19) // Synthetic no-retread fixture, not market calibration.
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
it('rejects empty economic values but accepts an explicit documented zero', async () => {
  const input = ownedD2DFixture()
  const empty = structuredClone(input) as any
  empty.fixed.expenses[0].amount.value = ''
  expect((await app.inject({ method: 'POST', url, headers, payload: empty })).statusCode).toBe(400)
  input.fixed.expenses[0].amount.value = 0
  expect((await app.inject({ method: 'POST', url, headers, payload: input })).json().status).toBe('SCENARIO_ONLY')
})
it('keeps incomplete evidence without totals', async () => {
  const input = ownedD2DFixture(); input.fixed.expenses.pop()
  const r = await app.inject({ method: 'POST', url, headers, payload: input })
  expect(r.statusCode).toBe(200); expect(r.json()).toMatchObject({ status: 'INCOMPLETE', scenarios: null })
})
it('retains the existing fail-closed guard on positive unallocated standalone retreads', async () => {
  const r = await app.inject({ method: 'POST', url, headers, payload: legacyOwnedD2DFixture() })
  expect(r.statusCode).toBe(200)
  expect(r.json().scenarios).toBeNull()
  expect(r.json().issues.some((i: { code: string }) => i.code === 'RETREAD_POSITION_OR_LIFECYCLE_REQUIRED')).toBe(true)
})
it('limits payload and does not retain another organizations input', async () => {
  const oversized = await app.inject({ method: 'POST', url, headers, payload: { padding: 'a'.repeat(256_001) } })
  expect(oversized.statusCode).toBe(413)
  const input = ownedD2DFixture(); input.fixed.capital.acquisitionCost.value += 10000
  const a = await app.inject({ method: 'POST', url, headers, payload: input })
  const b = await app.inject({ method: 'POST', url, headers: { ...headers, 'x-test-org': 'org-b' }, payload: ownedD2DFixture() })
  expect(a.json().scenarios[0].result.costs.productionCostUsd).not.toBe(b.json().scenarios[0].result.costs.productionCostUsd)
  expect(b.json().scenarios[0].result.costs.productionCostUsd).toBe(965.19)
})
