import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { errorHandler } from '../src/middleware/error-handler.js'
import { createBenchmarkDossier, openBenchmarkDossier } from '../../web/lib/benchmark-dossier.js'
import { benchmarkForm } from '../src/modules/engine/benchmark-form.js'
import { ownedD2DFixture } from './fixtures/benchmark-owned-d2d.js'
import { PARAMETER_DEFINITIONS } from '../src/data/parameter-catalog.js'

vi.mock('../src/middleware/authenticate.js', () => ({ authenticate: async (request: any, reply: any) => {
  if (!request.headers.authorization) return reply.status(401).send({ error: 'Unauthorized' })
  request.user = { sub: 'qa-only', orgId: request.headers['x-test-org'], role: request.headers.authorization }
} }))
vi.mock('../src/config/prisma.js', () => ({ prisma: new Proxy({}, { get: () => { throw new Error('Unexpected database access') } }) }))
const { benchmarkRoutes } = await import('../src/modules/engine/benchmark.routes.js')
let app: FastifyInstance
beforeEach(async () => { vi.stubGlobal('crypto', webcrypto); app = Fastify(); app.setErrorHandler(errorHandler); await app.register(benchmarkRoutes) })
afterEach(async () => { await app.close(); vi.unstubAllGlobals() })
const url = '/engine/benchmark-owned-d2d', headers = { authorization: 'OPERATOR', 'x-test-org': 'qa-a' }
function syntheticWithoutStandaloneRetreads() {
  const input = ownedD2DFixture()
  const key = PARAMETER_DEFINITIONS.find(p => p.section === 'COST_TIRES' && p.field === 'Qty Recapeadas')!.key
  for (const leg of [input.route.mx, input.route.us]) {
    const row = leg.parameters.parameters.find(p => p.key === key)!
    row.value = 0; row.derivation = 'QA solamente: flota ficticia sin recapeadas; no benchmark ni cambio al fixture histórico'
  }
  return input
}
it('archives/reopens original inputs and reproduces both scenario totals through the actual HTTP handler', async () => {
  const input = syntheticWithoutStandaloneRetreads()
  const before = await app.inject({ method: 'POST', url, headers, payload: input })
  expect(before.statusCode).toBe(200); expect(before.json().status).toBe('SCENARIO_ONLY')
  expect(before.headers['cache-control']).toBe('no-store')
  expect(before.json().sharedTractorResources.map((r: { id: string }) => r.id)).toEqual(['mx', 'us'])
  expect(before.json().scenarios[0].result.trace.resources.map((r: { id: string }) => r.id)).toEqual(['trailer'])
  const saved = await createBenchmarkDossier(input, benchmarkForm())
  const reopened = await openBenchmarkDossier(saved, benchmarkForm())
  const after = await app.inject({ method: 'POST', url, headers, payload: reopened.input })
  expect(after.statusCode).toBe(200); expect(after.json()).toEqual(before.json())
  expect(after.json().scenarios).toHaveLength(2)
  expect(after.json().calibrated).toBe(false)
  expect(after.json().sellPriceUsd).toBeNull()
})
it('reopening does not grant permission or allow client totals/tenant injection', async () => {
  const reopened = await openBenchmarkDossier(await createBenchmarkDossier(syntheticWithoutStandaloneRetreads(), benchmarkForm()), benchmarkForm())
  for (const [requestHeaders, status] of [[{}, 401], [{ authorization: 'VIEWER', 'x-test-org': 'qa-a' }, 403], [{ authorization: 'OPERATOR' }, 403]] as const) {
    expect((await app.inject({ method: 'POST', url, headers: requestHeaders, payload: reopened.input })).statusCode).toBe(status)
  }
  const other = await app.inject({ method: 'POST', url, headers: { ...headers, 'x-test-org': 'qa-b' }, payload: reopened.input })
  expect(other.statusCode).toBe(200) // Portable public inputs, no stored organization record.
  for (const extra of [{ orgId: 'qa-b' }, { productionCostUsd: 1 }, { trace: { resources: [] } }])
    expect((await app.inject({ method: 'POST', url, headers, payload: { ...reopened.input, ...extra } })).statusCode).toBe(400)
})
