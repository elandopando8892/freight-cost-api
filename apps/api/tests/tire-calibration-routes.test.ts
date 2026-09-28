import Fastify from 'fastify'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('../src/middleware/authenticate.js', () => ({
  authenticate: async (request: any) => {
    request.user = {
      sub: 'internal-admin-1',
      supabaseId: '00000000-0000-4000-8000-000000000201',
      orgId: 'org-route-test',
      role: 'ADMIN',
    }
  },
}))

import { createTireCalibrationRoutes } from '../src/modules/cost-bases/tire-calibration.routes'

const receipt = { status: 'DRAFT', quoteEligible: false }
const persistence = {
  reviewers: vi.fn(async () => [{ id: 'admin-2', email: 'reviewer@example.invalid' }]),
  list: vi.fn(async () => [{ id: 'dossier-1' }]),
  get: vi.fn(async () => ({ id: 'dossier-1' })),
  open: vi.fn(async () => receipt),
  assign: vi.fn(async () => ({ ...receipt, status: 'PENDING_ECONOMIC' })),
  economicDecision: vi.fn(async () => ({ ...receipt, status: 'PENDING_INDEPENDENT' })),
  independentDecision: vi.fn(async () => ({ ...receipt, status: 'REVIEWED' })),
}
const sources = {
  capture: vi.fn(async () => ({ snapshotId: 'source-1', version: 1 })),
  current: vi.fn(async () => ({ snapshotId: 'source-1', version: 1 })),
}

const app = Fastify()

beforeAll(async () => {
  await app.register(createTireCalibrationRoutes(persistence as any, sources as any))
  await app.ready()
})

afterAll(async () => app.close())

describe('tire calibration authenticated HTTP boundary', () => {
  it('forwards the resolved internal identity to tenant-scoped reads', async () => {
    const list = await app.inject({ method: 'GET', url: '/cost-bases/tire-calibrations' })
    const detail = await app.inject({ method: 'GET', url: '/cost-bases/tire-calibrations/dossier-1' })
    const reviewers = await app.inject({ method: 'GET', url: '/cost-bases/tire-calibration-reviewers' })
    expect(reviewers.statusCode).toBe(200)
    expect(persistence.reviewers).toHaveBeenCalledWith(expect.objectContaining({ orgId: 'org-route-test' }))
    expect(list.statusCode).toBe(200)
    expect(detail.statusCode).toBe(200)
    expect(persistence.list).toHaveBeenCalledWith(expect.objectContaining({
      internalUserId: 'internal-admin-1', orgId: 'org-route-test', role: 'ADMIN',
      supabaseId: '00000000-0000-4000-8000-000000000201',
    }))
    expect(persistence.get).toHaveBeenCalledWith(expect.any(Object), 'dossier-1')
  })

  it('exposes only the four governed mutation commands', async () => {
    const cases = [
      ['/cost-bases/tire-calibrations', persistence.open, 201],
      ['/cost-bases/tire-calibrations/dossier-1/assign-reviewers', persistence.assign, 200],
      ['/cost-bases/tire-calibrations/dossier-1/economic-decision', persistence.economicDecision, 200],
      ['/cost-bases/tire-calibrations/dossier-1/independent-decision', persistence.independentDecision, 200],
    ] as const
    for (const [url, method, statusCode] of cases) {
      const response = await app.inject({ method: 'POST', url, payload: { fixture: true } })
      expect(response.statusCode).toBe(statusCode)
      expect(method).toHaveBeenCalled()
    }
    expect((await app.inject({ method: 'POST', url: '/cost-bases/tire-calibrations/dossier-1/publish', payload: {} })).statusCode).toBe(404)
    expect((await app.inject({ method: 'POST', url: '/cost-bases/tire-calibrations/dossier-1/activate', payload: {} })).statusCode).toBe(404)
  })

  it('captures and resolves the authoritative cohort source through authenticated routes', async () => {
    const captured = await app.inject({ method: 'POST', url: '/cost-bases/tire-cohort-sources', payload: { fixture: true } })
    const current = await app.inject({ method: 'GET', url: '/cost-bases/tire-cohort-sources/current?cohortKey=INTRA_MEX%7CDRIVE' })
    expect(captured.statusCode).toBe(201)
    expect(current.statusCode).toBe(200)
    expect(sources.capture).toHaveBeenCalledWith(expect.objectContaining({ orgId: 'org-route-test' }), { fixture: true })
    expect(sources.current).toHaveBeenCalledWith(expect.objectContaining({ orgId: 'org-route-test' }), 'INTRA_MEX|DRIVE')
  })
})
