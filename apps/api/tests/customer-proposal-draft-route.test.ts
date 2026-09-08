import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { calculate } from '../src/modules/engine/engine.calculator.js'
import { buildQuoteCalculationSnapshot } from '../src/modules/quotes/quote-snapshot.js'
import { errorHandler } from '../src/middleware/error-handler.js'

const auth = vi.hoisted(() => ({ orgId: 'org-1', role: 'ADMIN', authenticated: true }))
vi.mock('../src/middleware/authenticate.js', () => ({
  authenticate: async (request: { user?: unknown }) => {
    if (auth.authenticated) request.user = { sub: 'user-1', orgId: auth.orgId, role: auth.role }
  },
}))
vi.mock('../src/config/prisma.js', () => ({
  prisma: {
    quote: { findFirst: vi.fn() },
    customerQuote: { create: vi.fn() },
    customerQuoteEmailDraft: { create: vi.fn() },
    quoteAuditEvent: { create: vi.fn() },
  },
}))

const { quotesRoutes } = await import('../src/modules/quotes/quotes.routes.js')
const { prisma } = await import('../src/config/prisma.js')
const equipment = { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' }
const engineInput = {
  policy: 'OPERATIONAL_V3' as const, operation: 'Intra-Mex', service: 'One Way', equipment, params: {}, fxRate: 17.5,
  mexLeg: { baseKm: 250, routeExpensesMxn: 0, baseHours: 4, route: 'Mostly Straight', operation: 'Intra-Mex', service: 'One Way', equipment },
}
const snapshot = buildQuoteCalculationSnapshot(engineInput, calculate(engineInput))
const source = {
  id: 'quote-1', orgId: 'org-1', status: 'CONFIRMED', confirmedAt: new Date('2026-09-07T12:00:00Z'),
  explanation: {
    snapshot, decision: { disposition: 'READY' },
    lineage: { costBase: { status: 'ACTIVE' }, set: { status: 'PUBLISHED' } },
  },
  lane: { origin: 'Monterrey', destination: 'Saltillo' },
}
const payload = { clientName: 'Northstar Distribution', validUntil: '2026-09-30' }

describe('customer proposal preview HTTP contract (real authorization and snapshot verification)', () => {
  let app: FastifyInstance
  let quote: typeof source
  const send = (body: unknown = payload, key: string | undefined = 'preview-key-20260907') => app.inject({
    method: 'POST', url: '/quotes/quote-1/customer-proposal-draft/preview',
    headers: key ? { 'idempotency-key': key } : {}, payload: body as typeof payload,
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-07T15:00:00Z'))
    Object.assign(auth, { orgId: 'org-1', role: 'ADMIN', authenticated: true })
    quote = structuredClone(source)
    vi.mocked(prisma.quote.findFirst).mockImplementation(async (args) =>
      args?.where?.id === quote.id && args?.where?.orgId === quote.orgId ? quote as never : null)
    app = Fastify({ logger: false })
    app.setErrorHandler(errorHandler)
    await app.register(quotesRoutes)
    await app.ready()
  })
  afterEach(async () => {
    await app.close()
    vi.useRealTimers()
    expect(prisma.customerQuote.create).not.toHaveBeenCalled()
    expect(prisma.customerQuoteEmailDraft.create).not.toHaveBeenCalled()
    expect(prisma.quoteAuditEvent.create).not.toHaveBeenCalled()
  })

  it.each(['ADMIN', 'OPERATOR'])('allows %s with a reproducible snapshot and only commercial fields', async (role) => {
    auth.role = role
    const response = await send()
    expect(response.statusCode).toBe(200)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.json()).toMatchObject({ mode: 'PREVIEW_ONLY', draft: { lines: [{ tariff: snapshot.output.recommendedSellUsd }] } })
    expect(Object.keys(response.json().draft).sort()).toEqual(['clientName', 'contactName', 'contactEmail', 'quoteType', 'goodsValue', 'validUntil', 'notes', 'lines'].sort())
  })
  it.each(['VIEWER', 'UNKNOWN'])('denies %s before reading the source', async (role) => {
    auth.role = role
    expect((await send()).statusCode).toBe(403)
    expect(prisma.quote.findFirst).not.toHaveBeenCalled()
  })
  it('denies a request without authenticated identity', async () => {
    auth.authenticated = false
    expect((await send()).statusCode).toBe(401)
    expect(prisma.quote.findFirst).not.toHaveBeenCalled()
  })
  it('returns 404 for the same quote id in another tenant, with no leaked source', async () => {
    auth.orgId = 'org-2'
    const response = await send()
    expect(response.statusCode).toBe(404)
    expect(response.json()).not.toHaveProperty('draft')
    expect(prisma.quote.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'quote-1', orgId: 'org-2' } }))
  })
  it.each(['DRAFT', 'ARCHIVED'])('blocks %s quotes', async (status) => {
    quote.status = status
    expect((await send()).statusCode).toBe(409)
  })
  it.each(['REVIEW', 'NO_GO'])('blocks the %s decision through actual eligibility logic', async (disposition) => {
    quote.explanation.decision.disposition = disposition
    expect((await send()).statusCode).toBe(409)
  })
  it('blocks a tampered snapshot', async () => {
    quote.explanation.snapshot.output.recommendedSellUsd += 100
    expect((await send()).statusCode).toBe(409)
  })
  it('handles malformed evidence as a readable rejection', async () => {
    quote.explanation.snapshot.input = {} as never
    expect((await send()).statusCode).toBe(409)
  })
  it('rejects client-supplied pricing and tenant fields before querying', async () => {
    expect((await send({ ...payload, orgId: 'org-2', tariff: 1 })).statusCode).toBe(400)
    expect(prisma.quote.findFirst).not.toHaveBeenCalled()
  })
  it('requires the retry key before querying', async () => {
    expect((await send(payload, '')).statusCode).toBe(400)
    expect(prisma.quote.findFirst).not.toHaveBeenCalled()
  })
  it.each(['2026-09-31', '2026-09-30T00:00:00Z'])('rejects an invalid civil date %s', async (validUntil) => {
    expect((await send({ ...payload, validUntil })).statusCode).toBe(400)
    expect(prisma.quote.findFirst).not.toHaveBeenCalled()
  })
  it('returns the same fingerprint for retries, without writing', async () => {
    const first = (await send()).json()
    const retry = (await send()).json()
    expect(retry.idempotencyFingerprint).toBe(first.idempotencyFingerprint)
    expect(first.idempotencyFingerprint).toMatch(/^[a-f0-9]{64}$/)
  })
})
