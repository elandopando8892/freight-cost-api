import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { PrismaClient, type Prisma } from '@prisma/client'
import { errorHandler } from '../src/middleware/error-handler.js'
import { thirdPartyFixture } from './fixtures/third-party-cost.js'
import { partnerHash, reviewedPartnerCost } from '../src/modules/engine/partner-cost-snapshot.js'

const auth = vi.hoisted(() => ({ orgId: '', sub: '', role: 'OPERATOR' }))
vi.mock('../src/middleware/authenticate.js', () => ({ authenticate: async (request: { user?: unknown }) => { request.user = { ...auth } } }))
const localUrl = process.env.FCM_TEST_DATABASE_URL
if (localUrl) {
  const url = new URL(localUrl)
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname !== '/fcm_partner_disposable') {
    throw new Error('Use only loopback database fcm_partner_disposable, never remote or business data')
  }
}

describe.skipIf(!localUrl)('partner persistence on disposable PostgreSQL (mock identity, real storage)', () => {
  let app: FastifyInstance
  let db: PrismaClient
  let originalOrg: string
  let otherOrg: string
  const payload = (previousId?: string) => { const input = thirdPartyFixture(); return { input, reviewChecksum: reviewedPartnerCost(input).reviewChecksum, ...(previousId ? { previousId } : {}) } }
  const send = (body = payload(), key = randomUUID()) => app.inject({ method: 'POST', url: '/partner-cost-estimates', headers: { 'idempotency-key': key }, payload: body })
  const get = (id: string) => app.inject({ method: 'GET', url: `/partner-cost-estimates/${id}` })
  beforeAll(async () => {
    process.env.DATABASE_URL = localUrl
    delete process.env.VERCEL_ENV
    db = new PrismaClient({ datasourceUrl: localUrl })
    originalOrg = (await db.organization.create({ data: { name: 'Disposable partner A' } })).id
    otherOrg = (await db.organization.create({ data: { name: 'Disposable partner B' } })).id
    auth.orgId = originalOrg; auth.sub = 'synthetic-operator'
    const { partnerCostRoutes } = await import('../src/modules/engine/partner-cost.routes.js')
    app = Fastify(); app.setErrorHandler(errorHandler); await app.register(partnerCostRoutes); await app.ready()
  })
  afterAll(async () => {
    if (app) await app.close()
    if (db && originalOrg) await db.organization.delete({ where: { id: originalOrg } })
    if (db && otherOrg) await db.organization.delete({ where: { id: otherOrg } })
    if (db) await db.$disconnect()
  })

  it('saves, reopens and reads again with exact economics; appends without mutating v1', async () => {
    const first = await send()
    expect(first.statusCode).toBe(201)
    const id = first.json().id
    const before = (await get(id)).json()
    expect(before.snapshot).toEqual(reviewedPartnerCost(thirdPartyFixture()))
    const revised = payload(id); revised.input.usa.linehaul = 1400
    revised.reviewChecksum = reviewedPartnerCost(revised.input).reviewChecksum
    const next = await send(revised)
    expect(next.statusCode).toBe(201); expect(next.json().version).toBe(2)
    const after = (await get(id)).json()
    expect(after.snapshot).toEqual(before.snapshot)
    expect(after.nextId).toBe(next.json().id)
    expect((await get(next.json().id)).json().snapshot.purchaseCostUsd).toBe(2730)
    expect((await send(payload(id))).statusCode).toBe(409)
  })

  it('isolates detail, list, cursor and parent by organization; viewer can only read', async () => {
    const id = (await send()).json().id
    auth.orgId = otherOrg
    try {
      expect((await get(id)).statusCode).toBe(404)
      expect((await send(payload(id))).statusCode).toBe(404)
      expect((await app.inject({ method: 'GET', url: `/partner-cost-estimates?cursor=${id}` })).statusCode).toBe(404)
      expect((await app.inject({ method: 'GET', url: '/partner-cost-estimates' })).json().items).toEqual([])
    } finally { auth.orgId = originalOrg }
    auth.role = 'VIEWER'
    try { expect((await get(id)).statusCode).toBe(200); expect((await send()).statusCode).toBe(403) }
    finally { auth.role = 'OPERATOR' }
  })

  it('rejects direct SQL updates and cross-tenant parent references', async () => {
    const id = (await send()).json().id
    await expect(db.partnerCostEstimate.update({ where: { id }, data: { version: 50 } })).rejects.toThrow()
    await expect(db.partnerCostEstimate.create({ data: { orgId: otherOrg, previousId: id, version: 2, actorId: auth.sub,
      saveKey: randomUUID(), intentHash: 'test', snapshot: reviewedPartnerCost(thirdPartyFixture()) as unknown as Prisma.InputJsonValue } })).rejects.toThrow()
    expect((await get(id)).json().version).toBe(1)
  })

  it('rejects altered reviewed economics without persisting any new row', async () => {
    const count = await db.partnerCostEstimate.count({ where: { orgId: originalOrg } })
    const changed = payload(); changed.input.mex.linehaul += 500
    expect((await send(changed)).statusCode).toBe(409)
    const incomplete = payload(); incomplete.input.crossing = { mode: 'UNKNOWN' }
    incomplete.reviewChecksum = reviewedPartnerCost(incomplete.input).reviewChecksum
    expect((await send(incomplete)).statusCode).toBe(422)
    expect(await db.partnerCostEstimate.count({ where: { orgId: originalOrg } })).toBe(count)
  })

  it('reads the same snapshot after reopening HTTP app and database connections', async () => {
    const id = (await send()).json().id
    const before = (await get(id)).json()
    const { prisma } = await import('../src/config/prisma.js')
    await app.close()
    await prisma.$disconnect()
    await db.$disconnect()
    db = new PrismaClient({ datasourceUrl: localUrl })
    const persisted = await db.partnerCostEstimate.findUniqueOrThrow({ where: { id } })
    expect(persisted.snapshot).toEqual(before.snapshot)
    const { partnerCostRoutes } = await import('../src/modules/engine/partner-cost.routes.js')
    app = Fastify(); app.setErrorHandler(errorHandler); await app.register(partnerCostRoutes); await app.ready()
    expect((await get(id)).json()).toEqual(before)
  })

  it('rolls back an aborted insert completely and permits a clean retry', async () => {
    const saveKey = randomUUID()
    const body = payload()
    await expect(db.$transaction(async tx => {
      await tx.partnerCostEstimate.create({ data: { orgId: originalOrg, version: 1, actorId: auth.sub,
        saveKey, intentHash: partnerHash(body), snapshot: reviewedPartnerCost(body.input) as unknown as Prisma.InputJsonValue } })
      throw new Error('Synthetic transaction abort')
    })).rejects.toThrow('Synthetic transaction abort')
    expect(await db.partnerCostEstimate.count({ where: { orgId: originalOrg, saveKey } })).toBe(0)
    const retry = await send(body, saveKey)
    expect(retry.statusCode).toBe(201)
    expect((await send(body, saveKey)).json().id).toBe(retry.json().id)
    expect(await db.partnerCostEstimate.count({ where: { orgId: originalOrg, saveKey } })).toBe(1)
  })

  // Hold an uncommitted INSERT, then prove the HTTP request is blocked on a
  // PostgreSQL lock before releasing it. Promise.all alone is not race evidence.
  async function lockedInsert(body: ReturnType<typeof payload>, heldKey: string, requestKey: string, version: number) {
    let release!: () => void
    let inserted!: () => void
    const insertedPromise = new Promise<void>(resolve => { inserted = resolve })
    const releasePromise = new Promise<void>(resolve => { release = resolve })
    const transaction = db.$transaction(async tx => {
      const row = await tx.partnerCostEstimate.create({ data: { orgId: originalOrg, previousId: body.previousId, version,
        actorId: auth.sub, saveKey: heldKey, intentHash: partnerHash(body), snapshot: reviewedPartnerCost(body.input) as unknown as Prisma.InputJsonValue } })
      inserted()
      await releasePromise
      return row
    }, { timeout: 15000 })
    await Promise.race([insertedPromise, transaction])
    const request = Promise.resolve(send(body, requestKey))
    let observedError: unknown
    try {
      let blocked = false
      for (let attempt = 0; attempt < 80; attempt++) {
        const rows = await db.$queryRaw<{ blocked: boolean }[]>`SELECT EXISTS (
          SELECT 1 FROM pg_stat_activity WHERE datname = current_database()
          AND pid <> pg_backend_pid() AND wait_event_type = 'Lock'
          AND query LIKE '%INSERT INTO%PartnerCostEstimate%'
        ) AS blocked`
        if (rows[0].blocked) { blocked = true; break }
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      expect(blocked).toBe(true)
    } catch (error) { observedError = error } finally { release() }
    const held = await transaction
    const response = await request
    if (observedError) throw observedError
    return { held, response }
  }

  it('reconciles a provably overlapping retry to one durable row', async () => {
    const key = randomUUID()
    const { held, response } = await lockedInsert(payload(), key, key, 1)
    expect(response.statusCode).toBe(200)
    expect(response.json().id).toBe(held.id)
    expect(await db.partnerCostEstimate.count({ where: { orgId: originalOrg, saveKey: key } })).toBe(1)
    const changed = payload(); changed.input.usa.linehaul++
    expect((await send(changed, key)).statusCode).toBe(409)
  })

  it('allows only one successor during a provably overlapping competing revision', async () => {
    const id = (await send()).json().id
    const { held, response } = await lockedInsert(payload(id), randomUUID(), randomUUID(), 2)
    expect(response.statusCode).toBe(409)
    expect(await db.partnerCostEstimate.count({ where: { orgId: originalOrg, previousId: id } })).toBe(1)
    expect((await get(id)).json().nextId).toBe(held.id)
  })

  it('paginates 20 at a time with no duplicates or missing versions', async () => {
    for (let i = 0; i < 23; i++) expect((await send()).statusCode).toBe(201)
    let cursor: string | null = null
    const ids: string[] = []
    do {
      const page = (await app.inject({ method: 'GET', url: `/partner-cost-estimates${cursor ? `?cursor=${cursor}` : ''}` })).json()
      expect(page.items.length).toBeLessThanOrEqual(20)
      ids.push(...page.items.map((row: { id: string }) => row.id)); cursor = page.nextCursor
    } while (cursor)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBe(await db.partnerCostEstimate.count({ where: { orgId: originalOrg } }))
  })
})
