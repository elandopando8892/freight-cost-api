import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { errorHandler } from '../src/middleware/error-handler.js'
import { calculate } from '../src/modules/engine/engine.calculator.js'
import { buildQuoteCalculationSnapshot } from '../src/modules/quotes/quote-snapshot.js'

vi.mock('../src/middleware/authenticate.js', () => ({
  authenticate: async (request: { user?: unknown }) => {
    request.user = { sub: 'viewer-1', orgId: 'org-1', role: 'VIEWER' }
  },
}))
vi.mock('../src/config/prisma.js', () => ({ prisma: {
  quoteCalculationPreview: { findFirst: vi.fn() }, costBase: { findFirst: vi.fn() },
} }))

const { engineRoutes } = await import('../src/modules/engine/engine.routes.js')
const { prisma } = await import('../src/config/prisma.js')
const equipment = { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' }
const input = { operation: 'Local', service: 'One Way', equipment, params: {},
  mexLeg: { baseKm: 80, routeExpensesMxn: 100, operation: 'Local', service: 'One Way',
    route: 'Straight & Danger', equipment } }
const result = calculate(input)
const preview = {
  id: 'preview-1', orgId: 'org-1', expiresAt: new Date(Date.now() + 60_000),
  capture: { operation: 'Local', service: 'One Way' },
  lineage: { readiness: 'GOVERNED', costBase: { id: 'base-1' } },
  snapshot: buildQuoteCalculationSnapshot(input, result), result,
}
const observed = { sourceReference: 'trip-ledger-001', asOf: '2026-09-20',
  allocationMethod: 'Fuel, driver and allocated fixed fleet cost from trip ledger',
  mexProductionCostUsd: 400 }

describe('POST /engine/compare-observed-cost', () => {
  let app: FastifyInstance
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(prisma.quoteCalculationPreview.findFirst).mockResolvedValue(preview as never)
    vi.mocked(prisma.costBase.findFirst).mockResolvedValue({ operationalSegment: 'MX_LOCAL' } as never)
    app = Fastify({ logger: false })
    app.setErrorHandler(errorHandler)
    await app.register(engineRoutes)
    await app.ready()
  })
  afterEach(async () => { await app.close() })

  it('reads a tenant-scoped reproducible preview and returns a non-approval comparison', async () => {
    const response = await app.inject({ method: 'POST', url: '/engine/compare-observed-cost', payload: { previewId: 'preview-1', observed } })
    expect(response.statusCode).toBe(200)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.json()).toMatchObject({ status: 'COMPARISON_ONLY', sourceStatus: 'USER_SUPPLIED_UNVERIFIED', segment: 'MX_LOCAL' })
    expect(prisma.quoteCalculationPreview.findFirst).toHaveBeenCalledWith({ where: { id: 'preview-1', orgId: 'org-1' } })
    expect(prisma.costBase.findFirst).toHaveBeenCalledWith({ where: { id: 'base-1', orgId: 'org-1' }, select: { operationalSegment: true } })
  })

  it('rejects expired, unguided, and mismatched-leg evidence', async () => {
    vi.mocked(prisma.quoteCalculationPreview.findFirst).mockResolvedValueOnce({ ...preview, expiresAt: new Date(0) } as never)
    const expired = await app.inject({ method: 'POST', url: '/engine/compare-observed-cost', payload: { previewId: 'preview-1', observed } })
    expect(expired.statusCode).toBe(409)
    vi.mocked(prisma.costBase.findFirst).mockResolvedValueOnce({ operationalSegment: 'D2D_MX_US_PARTNER' } as never)
    const pending = await app.inject({ method: 'POST', url: '/engine/compare-observed-cost', payload: { previewId: 'preview-1', observed } })
    expect(pending.statusCode).toBe(422)
    const mismatch = await app.inject({ method: 'POST', url: '/engine/compare-observed-cost', payload: {
      previewId: 'preview-1', observed: { ...observed, usaProductionCostUsd: 100 },
    } })
    expect(mismatch.statusCode).toBe(422)
  })

  it('rejects invalid evidence before reading the preview', async () => {
    const response = await app.inject({ method: 'POST', url: '/engine/compare-observed-cost', payload: {
      previewId: 'preview-1', observed: { ...observed, asOf: '2026-02-30' },
    } })
    expect(response.statusCode).toBe(400)
    expect(prisma.quoteCalculationPreview.findFirst).not.toHaveBeenCalled()
    const future = await app.inject({ method: 'POST', url: '/engine/compare-observed-cost', payload: {
      previewId: 'preview-1', observed: { ...observed, asOf: '2099-01-01' },
    } })
    expect(future.statusCode).toBe(400)
    expect(prisma.quoteCalculationPreview.findFirst).not.toHaveBeenCalled()
  })
})
