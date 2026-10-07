import { expect, it } from 'vitest'
import Fastify from 'fastify'
import { registerB3OwnRelayRoute } from '../scripts/lib/b3-own-relay-route.js'
import { readOwnRelayReview } from '../src/modules/engine/b2-own-relay-review.js'

const actor = { sub: 'actor-a', orgId: 'org-a', role: 'ADMIN' as const, supabaseId: 'public-auth-id' }
const path = '/engine/benchmark-owned-d2d/own-relay-review'

it('reproduces strict-reader rejection of an unprojected authenticated actor', () => {
  expect(() => readOwnRelayReview({}, actor)).toThrow()
})
it.each(['ADMIN', 'OPERATOR'] as const)('QA route projects a complete %s actor without relaxing the reader', async role => {
  const app = Fastify()
  app.addHook('onRequest', async (_request, reply) => { reply.header('Cache-Control', 'no-store') })
  app.addHook('preHandler', async request => { request.user = { ...actor, role } })
  registerB3OwnRelayRoute(app)
  try {
    const result = await app.inject({ method: 'GET', url: path })
    expect(result.statusCode).toBe(200)
    expect(result.headers['cache-control']).toBe('no-store')
    expect(result.json()).toEqual(readOwnRelayReview({}, { sub: actor.sub, orgId: actor.orgId }))
    expect(result.json().scope).toEqual({ sub: actor.sub, orgId: actor.orgId })
  } finally { await app.close() }
})
it('retains VIEWER denial before the reader runs', async () => {
  const app = Fastify()
  app.addHook('preHandler', async request => { request.user = { ...actor, role: 'VIEWER' } })
  registerB3OwnRelayRoute(app)
  try { expect((await app.inject({ method: 'GET', url: path })).statusCode).toBe(403) }
  finally { await app.close() }
})
