import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { errorHandler } from '../src/middleware/error-handler.js'

const auth = vi.hoisted(() => ({ orgId: 'org-1', role: 'OPERATOR' as 'ADMIN' | 'OPERATOR' | 'VIEWER' }))
vi.mock('../src/middleware/authenticate.js', () => ({
  authenticate: async (request: { user?: unknown }) => {
    request.user = { sub: 'viewer-1', orgId: auth.orgId, role: auth.role }
  },
}))
vi.mock('../src/config/prisma.js', () => ({ prisma: { quoteCalculationPreview: { create: vi.fn() } } }))
vi.mock('../src/modules/engine/lane-resolver.service.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/modules/engine/lane-resolver.service.js')>()), resolveRoute: vi.fn(),
}))
vi.mock('../src/modules/cost-bases/cost-bases.service.js', () => ({
  resolveCalculationContext: vi.fn(), assertCalculationOverrides: vi.fn(), scopeForOperation: vi.fn(() => 'CROSS_BORDER'),
}))

const { engineRoutes } = await import('../src/modules/engine/engine.routes.js')
const { prisma } = await import('../src/config/prisma.js')
const { resolveRoute } = await import('../src/modules/engine/lane-resolver.service.js')
const { resolveCalculationContext } = await import('../src/modules/cost-bases/cost-bases.service.js')
const equipment = { truckType: 'Truck Trailer', trailer: 'Flatbed', config: 'Single', driver: 'B1' }

describe('server-issued route calculation preview', () => {
  let app: FastifyInstance
  beforeEach(async () => {
    vi.clearAllMocks()
    auth.orgId = 'org-1'
    auth.role = 'OPERATOR'
    vi.mocked(resolveRoute).mockResolvedValue({
      mexLeg: { baseKm: 225, routeExpensesMxn: 0, baseHours: 0, returnKm: 240, returnLoaded: false,
        operation: 'D2D Export', service: 'One Way', route: 'Straight & Danger', equipment },
      usaLeg: { loadedMiles: 435, transitDaysRaw: 0, driverExpenses: 0, outState: 'TX',
        dieselUsdGal: 5.152, fscUsdMile: 0.8, marketRpm: 2.5,
        originCondition: 'Very Tight', destCondition: 'Very Tight',
        operation: 'D2D Export', service: 'One Way', equipment },
      warnings: [],
    })
    vi.mocked(resolveCalculationContext).mockResolvedValue({ costBase: null, set: null,
      defaultPolicy: 'OPERATIONAL_V3', applicabilityProfile: null } as never)
    vi.mocked(prisma.quoteCalculationPreview.create).mockResolvedValue({ id: 'preview-1' } as never)
    app = Fastify({ logger: false })
    app.setErrorHandler(errorHandler)
    await app.register(engineRoutes)
    await app.ready()
  })
  afterEach(async () => { await app.close() })

  it('binds capture, resolved legs, FX, policy and benchmark to the same tenant preview', async () => {
    const response = await app.inject({ method: 'POST', url: '/engine/quote-by-route', payload: {
      outboundLocation: 'Monterrey', inboundLocation: 'Dallas', operation: 'D2D Export',
      service: 'One Way', equipment, fxRate: 18.75,
    } })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ previewId: 'preview-1', fxRateUsed: 18.75,
      resolved: { mexLeg: { returnKm: 240 }, usaLeg: { marketRpm: 2.5 } } })
    expect(prisma.quoteCalculationPreview.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      orgId: 'org-1', capture: expect.objectContaining({ origin: 'Monterrey', destination: 'Dallas', fxRate: 18.75 }),
      snapshot: expect.objectContaining({ input: expect.objectContaining({ policy: 'OPERATIONAL_V3', fxRate: 18.75,
        mexLeg: expect.objectContaining({ returnKm: 240 }), usaLeg: expect.objectContaining({ marketRpm: 2.5 }) }) }),
    }) }))
  })

  it('never writes a preview for an invalid required route', async () => {
    vi.mocked(resolveRoute).mockResolvedValue({ warnings: ['Missing USA'] })
    const response = await app.inject({ method: 'POST', url: '/engine/quote-by-route', payload: {
      outboundLocation: 'Monterrey', inboundLocation: 'Dallas', operation: 'D2D Export', equipment,
    } })
    expect(response.statusCode).toBe(422)
    expect(prisma.quoteCalculationPreview.create).not.toHaveBeenCalled()
  })

  it.each(['/engine/quote-by-route', '/engine/calculate', '/engine/compare-observed-cost'])(
    'rejects VIEWER from %s before calculation or preview writes', async url => {
      auth.role = 'VIEWER'
      const response = await app.inject({ method: 'POST', url, payload: {
        outboundLocation: 'Monterrey', inboundLocation: 'Dallas', operation: 'D2D Export', equipment,
      } })
      expect(response.statusCode).toBe(403)
      expect(response.json()).toMatchObject({ error: 'Forbidden' })
      expect(resolveRoute).not.toHaveBeenCalled()
      expect(resolveCalculationContext).not.toHaveBeenCalled()
      expect(prisma.quoteCalculationPreview.create).not.toHaveBeenCalled()
    },
  )
})
