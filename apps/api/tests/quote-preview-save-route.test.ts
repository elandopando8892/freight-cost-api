import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { calculate } from '../src/modules/engine/engine.calculator.js'
import { buildQuoteCalculationSnapshot } from '../src/modules/quotes/quote-snapshot.js'
import { errorHandler } from '../src/middleware/error-handler.js'

const auth = vi.hoisted(() => ({ orgId: 'org-1', role: 'OPERATOR', authenticated: true }))
vi.mock('../src/middleware/authenticate.js', () => ({
  authenticate: async (request: { user?: unknown }) => {
    if (auth.authenticated) request.user = { sub: 'user-1', orgId: auth.orgId, role: auth.role }
  },
}))
vi.mock('../src/config/prisma.js', () => ({
  prisma: {
    quote: { create: vi.fn(), findFirstOrThrow: vi.fn(), updateMany: vi.fn(), delete: vi.fn() },
    quoteAuditEvent: { create: vi.fn() },
    quoteSaveIntent: { findUnique: vi.fn(), create: vi.fn() },
    quoteCalculationPreview: { findFirst: vi.fn() },
    assumptionSet: { findFirst: vi.fn() },
    costBase: { findFirst: vi.fn() },
    lane: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}))

const { quotesRoutes } = await import('../src/modules/quotes/quotes.routes.js')
const { prisma } = await import('../src/config/prisma.js')
const equipment = { truckType: 'Truck Trailer', trailer: 'Flatbed', config: 'Single', driver: 'B1' }
const input = {
  policy: 'OPERATIONAL_V3' as const, operation: 'D2D Export', service: 'One Way', equipment,
  params: { 'TECHNICAL_MARGIN__Minimum Gross Margin': 0.15 }, fxRate: 18.75,
  mexLeg: { baseKm: 225, routeExpensesMxn: 0, baseHours: 0, returnKm: 240, returnLoaded: false,
    operation: 'D2D Export', service: 'One Way', route: 'Straight & Danger', equipment },
  usaLeg: { loadedMiles: 435, transitDaysRaw: 0, driverExpenses: 0, outState: 'TX',
    dieselUsdGal: 5.152, fscUsdMile: 0.8, marketRpm: 2.5,
    originCondition: 'Very Tight' as const, destCondition: 'Very Tight' as const,
    operation: 'D2D Export', service: 'One Way', equipment },
}
const result = calculate(input)
const snapshot = buildQuoteCalculationSnapshot(input, result)
const previewSource = {
  id: 'preview-1', orgId: 'org-1', expiresAt: new Date('2026-09-22T23:00:00Z'),
  capture: { origin: 'Monterrey', destination: 'Dallas', mexBorder: 'Nuevo Laredo', usBorder: 'Laredo',
    route: 'Straight & Danger', operation: input.operation, service: input.service, equipment, fxRate: input.fxRate },
  lineage: { costBase: { id: 'base-1', code: 'XB', name: 'XB', scope: 'CROSS_BORDER', status: 'ACTIVE' },
    set: { id: 'set-1', name: 'v1', version: 1, status: 'PUBLISHED', isActive: true }, policy: result.policy },
  snapshot, result: { ...result, warnings: [] },
}
const key = '84e8e4c0-1041-4412-b888-d662a109bb79'

describe('saving a reviewed server preview', () => {
  let app: FastifyInstance
  let preview: typeof previewSource
  let saved: Record<string, unknown> | null
  let intents: Map<string, { intentHash: string; quote: Record<string, unknown> }>
  let activeVersion: boolean
  const send = (body: unknown = { previewId: 'preview-1', label: 'Q1' }, saveKey = key) => app.inject({
    method: 'POST', url: '/quotes/from-preview', headers: { 'idempotency-key': saveKey }, payload: body as object,
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-22T22:00:00Z'))
    Object.assign(auth, { orgId: 'org-1', role: 'OPERATOR', authenticated: true })
    preview = structuredClone(previewSource)
    saved = null
    intents = new Map()
    activeVersion = true
    vi.mocked(prisma.quoteSaveIntent.findUnique).mockImplementation(async (args) =>
      args?.where?.orgId_key?.orgId === 'org-1' ? (intents.get(args.where.orgId_key.key) ?? null) as never : null)
    vi.mocked(prisma.quoteCalculationPreview.findFirst).mockImplementation(async (args) =>
      args?.where?.id === preview.id && args?.where?.orgId === preview.orgId ? preview as never : null)
    vi.mocked(prisma.assumptionSet.findFirst).mockImplementation(async () => ({ id: 'set-1', isActive: activeVersion, status: 'PUBLISHED', costBaseId: 'base-1' }) as never)
    vi.mocked(prisma.costBase.findFirst).mockResolvedValue({ id: 'base-1', status: 'ACTIVE' } as never)
    vi.mocked(prisma.lane.upsert).mockResolvedValue({ id: 'lane-1' } as never)
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(prisma as never) as never)
    vi.mocked(prisma.quote.create).mockImplementation(async (args) => {
      saved = { id: `quote-${vi.mocked(prisma.quote.create).mock.calls.length}`, ...args.data, status: 'DRAFT' }
      return saved as never
    })
    vi.mocked(prisma.quote.findFirstOrThrow).mockImplementation(async (args) => {
      if (saved && args?.where?.id === saved.id && args?.where?.orgId === saved.orgId) return saved as never
      throw new Prisma.PrismaClientKnownRequestError('Quote not found', { code: 'P2025', clientVersion: '5.14.0' })
    })
    vi.mocked(prisma.quoteSaveIntent.create).mockImplementation(async (args) => {
      intents.set(args.data.key, { intentHash: args.data.intentHash, quote: saved! })
      return args.data as never
    })
    app = Fastify({ logger: false })
    app.setErrorHandler(errorHandler)
    await app.register(quotesRoutes)
    await app.ready()
  })
  afterEach(async () => { await app.close(); vi.useRealTimers() })

  it('persists the frozen economics, FX, observed market and resolved legs, then reuses the same save', async () => {
    const first = await send()
    expect(first.statusCode).toBe(201)
    expect(first.json()).toMatchObject({ id: 'quote-1', status: 'DRAFT', previewId: preview.id,
      requiredTariffUsd: result.requiredTariffUsd, fxRateUsed: 18.75 })
    const data = vi.mocked(prisma.quote.create).mock.calls[0][0].data
    expect(data.explanation).toMatchObject({ snapshot: {
      input: { fxRate: 18.75, params: input.params,
        mexLeg: { returnKm: 240 }, usaLeg: { marketRpm: 2.5 } },
    } })
    expect(data.usaLeg).toMatchObject({ marketRpm: result.usaLeg?.marketRpm })
    expect((await send()).statusCode).toBe(200)
    expect(prisma.quote.create).toHaveBeenCalledTimes(1)
  })

  it('creates a deliberate second copy only with a new key', async () => {
    expect((await send()).statusCode).toBe(201)
    expect((await send({ previewId: 'preview-1', label: 'Q1' }, 'a5a5e8a4-87a2-42a2-a545-0244972c784f')).statusCode).toBe(201)
    expect(prisma.quote.create).toHaveBeenCalledTimes(2)
  })

  it('opens and replays the exact saved quote id after review', async () => {
    const created = await send()
    const id = created.json().id as string
    const detail = await app.inject({ method: 'GET', url: `/quotes/${id}` })
    expect(detail.statusCode).toBe(200)
    expect(detail.json()).toMatchObject({ id, previewId: 'preview-1',
      explanation: { snapshot: { checksum: snapshot.checksum, input: { usaLeg: { marketRpm: 2.5 } } } } })
    const replay = await app.inject({ method: 'POST', url: `/quotes/${id}/replay` })
    expect(replay.statusCode).toBe(200)
    expect(replay.json()).toMatchObject({ reproducible: true, checksumMatches: true, outputMatches: true })
  })

  it('returns the same 404 for foreign and missing quote routes before any write', async () => {
    const created = await send()
    const id = created.json().id as string
    const routes = [
      (quoteId: string) => app.inject({ method: 'GET', url: `/quotes/${quoteId}` }),
      (quoteId: string) => app.inject({ method: 'POST', url: `/quotes/${quoteId}/replay` }),
      (quoteId: string) => app.inject({ method: 'POST', url: `/quotes/${quoteId}/confirm`, payload: { note: 'Reviewed for test' } }),
      (quoteId: string) => app.inject({ method: 'GET', url: `/integration/rateware/quotes/${quoteId}` }),
      (quoteId: string) => app.inject({ method: 'POST', url: `/integration/rateware/quotes/${quoteId}/enrichment`,
        payload: { carrier: 'Synthetic carrier', effectiveDate: '2026-09-22', rateOwner: 'Synthetic owner' } }),
      (quoteId: string) => app.inject({ method: 'DELETE', url: `/quotes/${quoteId}` }),
    ]
    for (const route of routes) {
      auth.orgId = 'org-2'
      const foreign = await route(id)
      auth.orgId = 'org-1'
      const missing = await route('missing')
      for (const response of [foreign, missing]) {
        expect(response.statusCode).toBe(404)
        expect(response.json()).toMatchObject({ error: 'La cotización no está disponible.' })
      }
      expect(foreign.json().error).toBe(missing.json().error)
    }
    expect(prisma.quote.findFirstOrThrow).toHaveBeenCalledWith(expect.objectContaining({ where: { id, orgId: 'org-2' } }))
    expect(prisma.quote.create).toHaveBeenCalledTimes(1)
    expect(prisma.quote.updateMany).not.toHaveBeenCalled()
    expect(prisma.quote.delete).not.toHaveBeenCalled()
    expect(prisma.quoteAuditEvent.create).not.toHaveBeenCalled()
  })

  it('does not disguise an unrelated storage failure as a missing quote', async () => {
    vi.mocked(prisma.quote.findFirstOrThrow).mockRejectedValueOnce(new Error('synthetic storage failure'))
    const response = await app.inject({ method: 'GET', url: '/quotes/missing' })
    expect(response.statusCode).toBe(500)
    expect(response.json()).toMatchObject({ error: 'Internal server error' })
  })

  it('rejects a changed label with the same idempotency key', async () => {
    expect((await send()).statusCode).toBe(201)
    expect((await send({ previewId: 'preview-1', label: 'Changed' })).statusCode).toBe(409)
    expect(prisma.quote.create).toHaveBeenCalledTimes(1)
  })

  it('rejects a version changed after review and an expired preview', async () => {
    activeVersion = false
    expect((await send()).statusCode).toBe(409)
    activeVersion = true
    preview.expiresAt = new Date('2026-09-22T21:00:00Z')
    expect((await send()).statusCode).toBe(409)
    expect(prisma.quote.create).not.toHaveBeenCalled()
  })

  it('does not expose a preview from another organization', async () => {
    auth.orgId = 'org-2'
    expect((await send()).statusCode).toBe(404)
    expect(prisma.quote.create).not.toHaveBeenCalled()
  })

  it('rejects client amounts and a manipulated server snapshot', async () => {
    expect((await send({ previewId: 'preview-1', label: 'Q1', requiredTariffUsd: 1 })).statusCode).toBe(400)
    preview.snapshot.output.requiredTariffUsd += 1
    expect((await send()).statusCode).toBe(409)
    expect(prisma.quote.create).not.toHaveBeenCalled()
  })

  it('returns a recoverable stale-calculation error for malformed server evidence', async () => {
    preview.snapshot.input = {} as never
    expect((await send()).statusCode).toBe(409)
    expect(prisma.quote.create).not.toHaveBeenCalled()
  })

  it.each(['OPERATOR', 'ADMIN'])('allows %s to save a draft', async (role) => {
    auth.role = role
    expect((await send()).statusCode).toBe(201)
    expect(saved?.status).toBe('DRAFT')
  })
  it('denies VIEWER before reading the preview', async () => {
    auth.role = 'VIEWER'
    expect((await send()).statusCode).toBe(403)
    expect(prisma.quoteCalculationPreview.findFirst).not.toHaveBeenCalled()
  })
})
