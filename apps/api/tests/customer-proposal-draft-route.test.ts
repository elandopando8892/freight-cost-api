import { beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'

const authState = vi.hoisted(() => ({ orgId: 'org-1', role: 'ADMIN' as 'ADMIN' | 'OPERATOR' | 'VIEWER' }))
const snapshot = vi.hoisted(() => ({
  format: 'fcm.calculation-snapshot.v1',
  engineVersion: 'fcm-v3.1-profiled',
  input: {
    policy: 'WORKBOOK_V3',
    operation: 'D2D Export',
    service: 'One Way',
    equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'Interstate' },
    params: {},
    mexLeg: { baseKm: 250 },
  },
  output: { freightBaselineUsd: 1486, requiredTariffUsd: 1600, requiredTariffMxn: 28000, fxRateUsed: 17.5, costFloorUsd: 1680, recommendedSellUsd: 1756 },
  checksum: 'snapshot-checksum',
}))

vi.mock('../src/middleware/authenticate.js', () => ({
  authenticate: async (request: { user?: unknown }) => {
    request.user = { sub: 'user-1', orgId: authState.orgId, role: authState.role }
  },
}))

vi.mock('../src/middleware/authorize.js', () => ({
  requireRole: (...allowed: string[]) => async (request: { user?: { role?: string } }, reply: { status: (status: number) => { send: (body: unknown) => unknown } }) => {
    if (!request.user || !allowed.includes(request.user.role ?? '')) return reply.status(403).send({ error: 'Forbidden' })
  },
}))

vi.mock('../src/config/prisma.js', () => ({
  prisma: {
    quote: { findFirstOrThrow: vi.fn() },
  },
}))

vi.mock('../src/modules/quotes/quote-governance.js', () => ({
  buildRatewareHandoff: vi.fn(),
  confirmationEligibility: vi.fn(() => ({ eligible: true, reasons: [], snapshot })),
  ratewareEconomicsDriftReasons: vi.fn(() => []),
}))

vi.mock('../src/modules/quotes/rateware-candidate.js', () => ({
  assessRatewareCandidate: vi.fn(),
  assessRatewareReadiness: vi.fn(),
}))

const { quotesRoutes } = await import('../src/modules/quotes/quotes.routes.js')
const { prisma } = await import('../src/config/prisma.js')

const quote = {
  id: 'quote-1',
  status: 'CONFIRMED',
  confirmedAt: new Date('2026-09-07T12:00:00.000Z'),
  explanation: { decision: { disposition: 'READY' } },
  lane: { origin: 'Laredo, TX', destination: 'Monterrey, NL' },
}

describe('customer proposal draft preview route', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    authState.orgId = 'org-1'
    authState.role = 'ADMIN'
    vi.mocked(prisma.quote.findFirstOrThrow).mockResolvedValue(quote as never)
    app = Fastify({ logger: false })
    await app.register(quotesRoutes)
    await app.ready()
  })

  it('scopes the source quote by the authenticated organization and never writes', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/quotes/quote-1/customer-proposal-draft/preview',
      headers: { authorization: 'Bearer x', 'idempotency-key': 'preview-key-20260907' },
      payload: { clientName: 'Northstar Distribution', validUntil: '2026-09-30' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ mode: 'PREVIEW_ONLY', source: { quoteId: 'quote-1' } })
    expect(prisma.quote.findFirstOrThrow).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'quote-1', orgId: 'org-1' },
    }))
  })

  it('blocks VIEWER before reading the quote', async () => {
    authState.role = 'VIEWER'

    const response = await app.inject({
      method: 'POST',
      url: '/quotes/quote-1/customer-proposal-draft/preview',
      headers: { authorization: 'Bearer x', 'idempotency-key': 'preview-key-20260907' },
      payload: { clientName: 'Northstar Distribution', validUntil: '2026-09-30' },
    })

    expect(response.statusCode).toBe(403)
    expect(prisma.quote.findFirstOrThrow).not.toHaveBeenCalled()
  })

  it('uses the current org when the same quote id is requested by another tenant', async () => {
    authState.orgId = 'org-2'

    const response = await app.inject({
      method: 'POST',
      url: '/quotes/quote-1/customer-proposal-draft/preview',
      headers: { authorization: 'Bearer x', 'idempotency-key': 'preview-key-20260907' },
      payload: { clientName: 'Northstar Distribution', validUntil: '2026-09-30' },
    })

    expect(response.statusCode).toBe(200)
    expect(prisma.quote.findFirstOrThrow).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'quote-1', orgId: 'org-2' },
    }))
  })
})

