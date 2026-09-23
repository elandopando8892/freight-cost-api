import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { thirdPartyFixture } from './fixtures/third-party-cost.js'
import { errorHandler } from '../src/middleware/error-handler.js'

vi.mock('../src/middleware/authenticate.js', () => ({
  authenticate: async (request: { headers: { authorization?: string }; user?: unknown }, reply: { status: (code: number) => { send: (body: unknown) => unknown } }) => {
    if (!request.headers.authorization) return reply.status(401).send({ error: 'Unauthorized' })
    request.user = { orgId: 'synthetic-org', role: request.headers.authorization }
  },
}))
// No database or provider should participate in this arithmetic endpoint.
vi.mock('../src/config/prisma.js', () => ({ prisma: new Proxy({}, { get: () => { throw new Error('Unexpected database access') } }) }))
const { engineRoutes } = await import('../src/modules/engine/engine.routes.js')

describe('third-party estimate route authorization', () => {
  let app: FastifyInstance
  beforeEach(async () => { app = Fastify(); app.setErrorHandler(errorHandler); await app.register(engineRoutes) })
  afterEach(async () => { await app.close() })
  it.each(['ADMIN', 'OPERATOR'])('allows %s to calculate without database writes', async role => {
    const response = await app.inject({ method: 'POST', url: '/engine/third-party-cost', headers: { authorization: role }, payload: thirdPartyFixture() })
    expect(response.statusCode).toBe(200)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.json().purchaseCostUsd).toBe(2530)
  })
  it.each([{ role: '', status: 401 }, { role: 'VIEWER', status: 403 }])('rejects $role with $status', async ({ role, status }) => {
    const response = await app.inject({ method: 'POST', url: '/engine/third-party-cost', headers: role ? { authorization: role } : {}, payload: thirdPartyFixture() })
    expect(response.statusCode).toBe(status)
  })
})
