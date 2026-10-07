import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { errorHandler } from '../src/middleware/error-handler.js'
import snapshot from '../src/modules/engine/b2-own-relay.snapshot.json'
import { RelayPayload } from '../src/modules/engine/b2-own-relay-contract.js'
import { projectOwnRelayReview } from '../scripts/project-b2-own-relay-review.js'

vi.mock('../src/middleware/authenticate.js', () => ({ authenticate: async (request: any, reply: any) => {
  if (!request.headers.authorization) return reply.status(401).send({ error: 'Unauthorized' })
  request.user = { sub: request.headers['x-user'] ?? 'test', orgId: request.headers['x-org'], role: request.headers.authorization }
} }))
vi.mock('../src/config/prisma.js', () => ({ prisma: new Proxy({}, { get: () => { throw new Error('Unexpected DB access') } }) }))
const { benchmarkRoutes } = await import('../src/modules/engine/benchmark.routes.js')
let app: FastifyInstance
const path = '/engine/benchmark-owned-d2d/own-relay-review'
const headers = { authorization: 'OPERATOR', 'x-org': 'org-a' }
beforeEach(async () => { app = Fastify(); app.setErrorHandler(errorHandler); await app.register(benchmarkRoutes) })
afterEach(async () => { await app.close() })

it('reproduces the existing public planning compositor and all 88 source pins, without new arithmetic', () => {
  expect(projectOwnRelayReview()).toEqual(snapshot)
  expect(snapshot.payload.sourcePins).toHaveLength(88)
  expect(snapshot.payload.cases).toHaveLength(24)
})
it.each(snapshot.payload.cases)('returns the exact $cycleId/$fundingMode/$fxDate/$restInterpretation comparison', async c => {
  const query = new URLSearchParams({ cycleId: c.cycleId, fundingMode: c.fundingMode, fxDate: c.fxDate, restInterpretation: c.restInterpretation })
  const result = await app.inject({ method: 'GET', url: `${path}?${query}`, headers })
  expect(result.statusCode).toBe(200); expect(result.headers['cache-control']).toBe('no-store')
  expect(result.json().case).toEqual(c)
  expect(result.json()).toMatchObject({ borderProcess: 'OWN_RELAY_SAME_TRAILER', comparisonOnly: true,
    calibrated: false, quoteReady: false, adoptedValues: 0, actualCarrierCostObserved: false,
    notesPersisted: false, scope: { sub: 'test', orgId: 'org-a' } })
})
it.each(['ADMIN', 'OPERATOR'])('retains existing %s role authorization', async role => {
  expect((await app.inject({ method: 'GET', url: path, headers: { ...headers, authorization: role } })).statusCode).toBe(200)
})
it.each([
  { headers: {}, status: 401 }, { headers: { ...headers, authorization: 'VIEWER' }, status: 403 },
  { headers: { authorization: 'ADMIN' }, status: 403 },
])('rejects missing identity/org or VIEWER', async t => {
  expect((await app.inject({ method: 'GET', url: path, headers: t.headers })).statusCode).toBe(t.status)
})
it.each(['orgId=other', 'baseId=other', 'purchaseUsd=1', 'fxDate=2026-10-04', 'fundingMode=OTHER', 'file=private', 'accepted=true'])('rejects query injection %s', async query => {
  expect((await app.inject({ method: 'GET', url: `${path}?${query}`, headers })).statusCode).toBe(400)
})
it('enforces the snapshot fingerprint and deterministic repeat/reload under current account scope', async () => {
  expect((await app.inject({ method: 'GET', url: `${path}?expectedSnapshot=${'0'.repeat(64)}`, headers })).statusCode).toBe(409)
  const first = await app.inject({ method: 'GET', url: path, headers })
  const repeat = await app.inject({ method: 'GET', url: `${path}?expectedSnapshot=${snapshot.sha256}`, headers })
  expect(repeat.json()).toEqual(first.json())
  const other = await app.inject({ method: 'GET', url: path, headers: { ...headers, 'x-org': 'org-b', 'x-user': 'other' } })
  expect(other.json().scope).toEqual({ orgId: 'org-b', sub: 'other' })
  expect(other.json().case).toEqual(first.json().case) // Public reference, not private company costs.
})
it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)('provides no %s mutation for review', async method => {
  expect((await app.inject({ method, url: path, headers, payload: { adoptedValues: 1 } })).statusCode).toBe(404)
})
it('rejects corrupted sums, duplicated resources/contexts, adoption, prices and unsafe sources', () => {
  for (const mutate of [
    (p: any) => { p.cases[0].outputs.productiveCostUsd += 100 },
    (p: any) => { p.cases[0].resources[1] = p.cases[0].resources[0] },
    (p: any) => { p.cases[1] = p.cases[0] }, (p: any) => { p.quoteReady = true },
    (p: any) => { p.adoptedValues = 1 }, (p: any) => { p.cases[0].outputs.purchaseUsd = 0 },
    (p: any) => { p.evidence[0].url = 'javascript:alert(1)' },
    (p: any) => { p.cases[0].variableCosts[0].evidenceIds = ['unknown'] },
    (p: any) => { p.cases[0].variableCosts[0].amountUsd = null },
  ]) {
    const p = structuredClone(snapshot.payload); mutate(p); expect(() => RelayPayload.parse(p)).toThrow()
  }
})
