import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/middleware/authenticate.js', () => ({
  authenticate: async (request: any) => {
    request.user = {
      sub: 'internal-user-a', supabaseId: '00000000-0000-4000-8000-000000000301',
      orgId: 'org-a', role: 'OPERATOR',
    }
  },
}))

import { createTireCohortV2ResearchRoutes } from '../src/modules/cost-bases/tire-cohort-v2.routes.js'

describe('tire cohort v2 isolated HTTP boundary', () => {
  it('registers no route while the release flag is off', async () => {
    const app = Fastify()
    const persistence = { capture: vi.fn(), current: vi.fn() }
    await app.register(createTireCohortV2ResearchRoutes(persistence as any))
    await app.ready()
    expect((await app.inject({ method: 'POST', url: '/cost-bases/tire-cohort-v2-research', payload: {} })).statusCode).toBe(404)
    expect((await app.inject({ method: 'GET', url: '/cost-bases/tire-cohort-v2-research/current?comparisonKey=x' })).statusCode).toBe(404)
    await app.close()
  })

  it('passes internal tenant identity to the isolated enabled route', async () => {
    const app = Fastify()
    const persistence = {
      capture: vi.fn(async () => ({ snapshotId: 'v2-snapshot', researchOnly: true, quoteEligible: false })),
      current: vi.fn(async () => ({ snapshotId: 'v2-snapshot', researchOnly: true, quoteEligible: false })),
    }
    const ensureRuntimeSafe = vi.fn(async () => {})
    await app.register(createTireCohortV2ResearchRoutes(persistence as any, true, ensureRuntimeSafe))
    await app.ready()
    expect(ensureRuntimeSafe).toHaveBeenCalledOnce()
    const captured = await app.inject({ method: 'POST', url: '/cost-bases/tire-cohort-v2-research', payload: { fixture: true } })
    const read = await app.inject({ method: 'GET', url: '/cost-bases/tire-cohort-v2-research/current?comparisonKey=US%7CUSD' })
    expect(captured.statusCode).toBe(201)
    expect(read.statusCode).toBe(200)
    expect(captured.headers['cache-control']).toBe('no-store')
    expect(read.headers['cache-control']).toBe('no-store')
    expect(persistence.capture).toHaveBeenCalledWith(expect.objectContaining({
      internalUserId: 'internal-user-a', orgId: 'org-a', role: 'OPERATOR',
      supabaseId: '00000000-0000-4000-8000-000000000301',
    }), { fixture: true })
    expect(persistence.current).toHaveBeenCalledWith(expect.objectContaining({ orgId: 'org-a' }), 'US|USD')
    await app.close()
  })

  it('refuses to register capture when the runtime role cannot enforce RLS', async () => {
    const app = Fastify()
    const persistence = { capture: vi.fn(), current: vi.fn() }
    await expect(app.register(createTireCohortV2ResearchRoutes(
      persistence as any, true, async () => { throw new Error('TIRE_V2_CAPTURE_RUNTIME_RLS_UNSAFE') },
    ))).rejects.toThrow('TIRE_V2_CAPTURE_RUNTIME_RLS_UNSAFE')
    expect(persistence.capture).not.toHaveBeenCalled()
    await app.close()
  })
})
