import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { errorHandler } from '../src/middleware/error-handler.js'

const auth = vi.hoisted(() => ({ orgId: '', actorId: '', role: 'OPERATOR' }))
vi.mock('../src/middleware/authenticate.js', () => ({
  authenticate: async (request: { user?: unknown }) => {
    request.user = { sub: auth.actorId, orgId: auth.orgId, role: auth.role }
  },
}))

const localUrl = process.env.FCM_TEST_DATABASE_URL

describe.skipIf(!localUrl)('reviewed quote persistence on disposable local PostgreSQL', () => {
  let app: FastifyInstance
  let db: PrismaClient
  let previewId: string
  let originalOrgId: string
  let originalResult: Awaited<ReturnType<typeof import('../src/modules/engine/engine.calculator.js')['calculate']>>
  const key = '9208a3b5-629a-4ac0-bac9-a1d8ec817752'
  const send = (saveKey = key) => app.inject({ method: 'POST', url: '/quotes/from-preview',
    headers: { 'idempotency-key': saveKey }, payload: { previewId, label: 'Local integration' } })

  beforeAll(async () => {
    // The opt-in URL is supplied only by the local test command, never CI defaults.
    process.env.DATABASE_URL = localUrl
    delete process.env.VERCEL_ENV
    db = new PrismaClient({ datasourceUrl: localUrl })
    const org = await db.organization.create({ data: { name: 'Disposable quote integrity test' } })
    originalOrgId = org.id
    const actor = await db.user.create({ data: { orgId: org.id,
      supabaseId: crypto.randomUUID(), email: `fcm-quote-test-${crypto.randomUUID()}@example.invalid`, role: 'OPERATOR' } })
    auth.orgId = org.id
    auth.actorId = actor.id
    const { calculate } = await import('../src/modules/engine/engine.calculator.js')
    const { buildQuoteCalculationSnapshot } = await import('../src/modules/quotes/quote-snapshot.js')
    const equipment = { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' }
    const input = { policy: 'OPERATIONAL_V3' as const, operation: 'D2D Export', service: 'One Way', equipment,
      params: {}, fxRate: 18.75,
      mexLeg: { baseKm: 225, operation: 'D2D Export', service: 'One Way', equipment, route: 'Straight & Danger' },
      usaLeg: { loadedMiles: 435, operation: 'D2D Export', service: 'One Way', equipment, outState: 'TX',
        dieselUsdGal: 5.152, fscUsdMile: 0.8, marketRpm: 2.5,
        originCondition: 'Very Tight' as const, destCondition: 'Very Tight' as const },
    }
    originalResult = calculate(input)
    const snapshot = buildQuoteCalculationSnapshot(input, originalResult)
    const preview = await db.quoteCalculationPreview.create({ data: {
      orgId: org.id, expiresAt: new Date(Date.now() + 20 * 60_000),
      capture: { origin: 'Monterrey', destination: 'Dallas', mexBorder: 'Nuevo Laredo', usBorder: 'Laredo',
        route: 'Straight & Danger', operation: input.operation, service: input.service, equipment, fxRate: input.fxRate },
      lineage: { costBase: null, set: null, policy: originalResult.policy, readiness: 'LEGACY' },
      snapshot: JSON.parse(JSON.stringify(snapshot)), result: JSON.parse(JSON.stringify({ ...originalResult, warnings: [] })),
    } })
    previewId = preview.id
    const { quotesRoutes } = await import('../src/modules/quotes/quotes.routes.js')
    app = Fastify({ logger: false })
    app.setErrorHandler(errorHandler)
    await app.register(quotesRoutes)
    await app.ready()
  })
  afterAll(async () => {
    if (app) await app.close()
    if (db && originalOrgId) await db.organization.delete({ where: { id: originalOrgId } })
    if (db) await db.$disconnect()
  })

  it('atomically deduplicates concurrent retries and replays the exact saved market reference', async () => {
    const [one, two] = await Promise.all([send(), send()])
    expect([one.statusCode, two.statusCode].sort()).toEqual([200, 201])
    const id = one.json().id as string
    expect(two.json().id).toBe(id)
    expect(await db.quote.count({ where: { orgId: originalOrgId } })).toBe(1)
    expect(await db.quoteSaveIntent.count({ where: { orgId: originalOrgId } })).toBe(1)
    const detail = await app.inject({ method: 'GET', url: `/quotes/${id}` })
    expect(detail.statusCode).toBe(200)
    expect(detail.json()).toMatchObject({ id, freightBaselineUsd: originalResult.freightBaselineUsd,
      explanation: { snapshot: { input: { fxRate: 18.75, usaLeg: { marketRpm: 2.5 } } } } })
    const replay = await app.inject({ method: 'POST', url: `/quotes/${id}/replay` })
    expect(replay.statusCode).toBe(200)
    expect(replay.json()).toMatchObject({ reproducible: true, outputMatches: true, checksumMatches: true })
  })

  it('creates another copy only with a new key, and rejects cross-organization use', async () => {
    expect((await send('eb781280-b1cb-4619-90c6-62a9e9468327')).statusCode).toBe(201)
    expect(await db.quote.count({ where: { orgId: originalOrgId } })).toBe(2)
    auth.orgId = 'other-org'
    expect((await send('a271673b-bbc5-4910-8303-e85872567955')).statusCode).toBe(404)
    auth.orgId = originalOrgId
  })
})
