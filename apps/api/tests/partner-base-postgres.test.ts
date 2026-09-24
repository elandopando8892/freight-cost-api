import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { errorHandler } from '../src/middleware/error-handler.js'
import { thirdPartyFixture } from './fixtures/third-party-cost.js'
import { reviewedPartnerCost } from '../src/modules/engine/partner-cost-snapshot.js'

const auth = vi.hoisted(() => ({ orgId: '', sub: 'synthetic-admin', role: 'ADMIN' }))
vi.mock('../src/middleware/authenticate.js', () => ({ authenticate: async (request: { user?: unknown }) => { request.user = { ...auth } } }))
const localUrl = process.env.FCM_TEST_DATABASE_URL
// Real Docker/HTTP roundtrips are integration tests, not five-second unit cases.
// Keep bounded; held-lock transactions still have their own 15s deadline.
vi.setConfig({ testTimeout: 30000, hookTimeout: 30000 })
if (localUrl) {
  const url = new URL(localUrl)
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname !== '/fcm_partner_disposable') throw new Error('Disposable loopback database only')
}

describe.skipIf(!localUrl)('partner bases: real local PostgreSQL, synthetic identity and tariffs', () => {
  let app: FastifyInstance
  let db: PrismaClient
  let orgId: string
  let otherOrg: string
  const { serviceDate, fx, ...terms } = thirdPartyFixture()
  const trip = { serviceDate, fx }
  const post = (url: string, payload: unknown, key = randomUUID()) => app.inject({ method: 'POST', url, payload: payload as object, headers: { 'idempotency-key': key } })
  const detail = (id: string) => app.inject({ method: 'GET', url: `/partner-bases/${id}` })
  const path = (id: string, versionId: string) => `/partner-bases/${id}/versions/${versionId}`
  async function create(custom = terms) {
    const response = await post('/partner-bases', { code: `QA-${randomUUID().slice(0, 8).toUpperCase()}`, name: 'Synthetic base only', terms: custom })
    expect(response.statusCode, response.body).toBe(201)
    return (await detail(response.json().id)).json()
  }
  const publish = (base: any, active: string | null = null) => post(`${path(base.id, base.versions[0].id)}/publish`, {
    expectedActiveVersionId: active, note: 'Synthetic local approval; no commercial evidence',
  })
  beforeAll(async () => {
    process.env.DATABASE_URL = localUrl; delete process.env.VERCEL_ENV
    db = new PrismaClient({ datasourceUrl: localUrl })
    orgId = (await db.organization.create({ data: { name: 'Disposable tariff A' } })).id
    otherOrg = (await db.organization.create({ data: { name: 'Disposable tariff B' } })).id
    auth.orgId = orgId
    const { partnerBaseRoutes } = await import('../src/modules/cost-bases/partner-base.routes.js')
    const { partnerCostRoutes } = await import('../src/modules/engine/partner-cost.routes.js')
    app = Fastify(); app.setErrorHandler(errorHandler)
    await app.register(partnerBaseRoutes); await app.register(partnerCostRoutes); await app.ready()
  })
  afterAll(async () => {
    if (app) await app.close()
    if (db) {
      for (const id of [orgId, otherOrg].filter(Boolean)) await db.organization.delete({ where: { id } })
      await db.$disconnect()
    }
  })

  it('creates, publishes, calculates from stored terms, saves and reopens lineage', async () => {
    const base = await create(); const url = path(base.id, base.versions[0].id)
    expect((await post(`${url}/calculate`, trip)).statusCode).toBe(409)
    expect((await publish(base)).statusCode).toBe(200)
    const calculated = await post(`${url}/calculate`, trip)
    expect(calculated.statusCode, calculated.body).toBe(200)
    expect(calculated.json().purchaseCostUsd).toBe(2530)
    const body = { trip, reviewChecksum: calculated.json().reviewChecksum }
    const key = randomUUID()
    const saved = await post(`${url}/estimates`, body, key)
    expect(saved.statusCode, saved.body).toBe(201)
    expect((await post(`${url}/estimates`, body, key)).json().id).toBe(saved.json().id)
    await db.$disconnect()
    const reopened = await app.inject({ method: 'GET', url: `/partner-cost-estimates/${saved.json().id}` })
    expect(reopened.json().snapshot).toEqual(calculated.json())
    expect(reopened.json().snapshot.baseLineage.versionId).toBe(base.versions[0].id)
    const input = thirdPartyFixture()
    expect((await post('/partner-cost-estimates', { input, previousId: saved.json().id,
      reviewChecksum: reviewedPartnerCost(input).reviewChecksum })).statusCode).toBe(409)
  })

  it('archives without losing history, restores explicitly and never replays a stale state transition', async () => {
    const base = await create(); await publish(base)
    const versionId = base.versions[0].id; const url = path(base.id, versionId)
    const report = (await post(`${url}/calculate`, trip)).json()
    const saveBody = { trip, reviewChecksum: report.reviewChecksum }; const saveKey = randomUUID()
    const saved = (await post(`${url}/estimates`, saveBody, saveKey)).json()
    const archiveBody = { archived: true, expectedRevision: 0, expectedActiveVersionId: versionId, note: 'Synthetic tariff retirement' }
    const key = randomUUID(); const stateUrl = `/partner-bases/${base.id}/lifecycle`
    expect((await post(stateUrl, { ...archiveBody, expectedActiveVersionId: null })).statusCode).toBe(409)
    const first = await post(stateUrl, archiveBody, key)
    expect(first.statusCode, first.body).toBe(200)
    expect((await post(stateUrl, archiveBody, key)).json().id).toBe(first.json().id)
    const archived = (await detail(base.id)).json()
    expect(archived.archived).toBe(true); expect(archived.lifecycleRevision).toBe(1)
    expect(archived.activeVersionId).toBe(versionId)
    expect((await post(`${url}/calculate`, trip)).statusCode).toBe(409)
    expect((await post(`${url}/estimates`, saveBody)).statusCode).toBe(409)
    expect((await post(`${url}/estimates`, saveBody, saveKey)).json().id).toBe(saved.id)
    expect((await publish(base)).statusCode).toBe(409)
    expect((await post(`/partner-bases/${base.id}/versions`, { terms, expectedLatestVersionId: versionId })).statusCode).toBe(409)
    expect((await app.inject({ method: 'GET', url: `/partner-cost-estimates/${saved.id}` })).json().snapshot).toEqual(report)
    const restored = await post(stateUrl, { ...archiveBody, archived: false, expectedRevision: 1, note: 'Synthetic explicit restoration' })
    expect(restored.statusCode, restored.body).toBe(200)
    expect((await post(`${url}/calculate`, trip)).json().purchaseCostUsd).toBe(2530)
    expect((await post(stateUrl, archiveBody)).statusCode).toBe(409)
    expect((await post(stateUrl, archiveBody, key)).json().id).toBe(first.json().id)
    expect((await detail(base.id)).json().archived).toBe(false)
    expect((await app.inject({ method: 'GET', url: stateUrl })).json().items.map((row: any) => row.revision)).toEqual([2, 1])
    expect((await post(`${url}/calculate`, { ...trip, serviceDate: '2026-11-01' })).json().purchaseCostUsd).toBeNull()
  })

  it('enforces lifecycle roles, tenants, evidence immutability and rollback', async () => {
    const base = await create(); const url = `/partner-bases/${base.id}/lifecycle`
    const body = { archived: true, expectedRevision: 0, expectedActiveVersionId: null, note: 'Synthetic lifecycle test' }
    for (const role of ['VIEWER', 'OPERATOR']) {
      auth.role = role
      try { expect((await post(url, body)).statusCode).toBe(403) } finally { auth.role = 'ADMIN' }
    }
    auth.orgId = otherOrg
    try {
      expect((await post(url, body)).statusCode).toBe(404)
      expect((await app.inject({ method: 'GET', url })).statusCode).toBe(404)
    } finally { auth.orgId = orgId }
    await expect(db.partnerTariffBase.update({ where: { id: base.id }, data: { archived: true } })).rejects.toThrow()
    await expect(db.$transaction(async tx => {
      await tx.partnerTariffLifecycle.create({ data: { orgId, baseId: base.id, revision: 1, archived: true,
        actorId: auth.sub, note: body.note, saveKey: randomUUID(), intentHash: 'synthetic-abort' } })
      await tx.partnerTariffBase.update({ where: { id: base.id }, data: { archived: true, lifecycleRevision: 1 } })
      throw new Error('Intentional abort')
    })).rejects.toThrow('Intentional abort')
    expect((await detail(base.id)).json().archived).toBe(false)
    expect(await db.partnerTariffLifecycle.count({ where: { baseId: base.id } })).toBe(0)
    const event = (await post(url, body)).json()
    await expect(db.partnerTariffLifecycle.update({ where: { id: event.id }, data: { note: 'Altered audit note' } })).rejects.toThrow()
  })

  it('blocks new saves behind an overlapping retirement and preserves no new estimate', async () => {
    const base = await create(); await publish(base)
    const url = path(base.id, base.versions[0].id)
    const report = (await post(`${url}/calculate`, trip)).json()
    let release!: () => void; let locked!: () => void
    const held = new Promise<void>(resolve => { locked = resolve })
    const unlocked = new Promise<void>(resolve => { release = resolve })
    const transaction = db.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "PartnerTariffBase" WHERE "id" = ${base.id} FOR UPDATE`
      await tx.partnerTariffLifecycle.create({ data: { orgId, baseId: base.id, revision: 1, archived: true,
        actorId: auth.sub, note: 'Synthetic concurrent retirement', saveKey: randomUUID(), intentHash: 'held-fixture' } })
      await tx.partnerTariffBase.update({ where: { id: base.id }, data: { archived: true, lifecycleRevision: 1 } })
      locked(); await unlocked
    }, { timeout: 15000 })
    await Promise.race([held, transaction])
    const key = randomUUID()
    const pending = Promise.resolve(post(`${url}/estimates`, { trip, reviewChecksum: report.reviewChecksum }, key))
    try {
      let blocked = false
      for (let i = 0; i < 60; i++) {
        const rows = await db.$queryRaw<{ blocked: boolean }[]>`SELECT EXISTS (
          SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()
          AND wait_event_type = 'Lock' AND query LIKE '%PartnerTariffBase%FOR UPDATE%'
        ) AS blocked`
        if (rows[0].blocked) { blocked = true; break }
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      expect(blocked).toBe(true)
    } finally { release(); await transaction }
    expect((await pending).statusCode).toBe(409)
    expect(await db.partnerCostEstimate.count({ where: { orgId, saveKey: key } })).toBe(0)
  })

  it('preserves old snapshots after publishing a revision and rejects stale calculations', async () => {
    const base = await create(); await publish(base)
    const url = path(base.id, base.versions[0].id)
    const report = (await post(`${url}/calculate`, trip)).json()
    const saveBody = { trip, reviewChecksum: report.reviewChecksum }; const saveKey = randomUUID()
    const saved = (await post(`${url}/estimates`, saveBody, saveKey)).json()
    const revised = structuredClone(terms); revised.usa.linehaul = 1400
    const revision = await post(`/partner-bases/${base.id}/versions`, { terms: revised, expectedLatestVersionId: base.versions[0].id })
    expect(revision.statusCode).toBe(201)
    const next = (await detail(base.id)).json()
    expect((await publish(next, base.versions[0].id)).statusCode).toBe(200)
    expect((await post(`${url}/calculate`, trip)).statusCode).toBe(409)
    expect((await post(`${url}/estimates`, saveBody)).statusCode).toBe(409)
    // A lost successful response remains recoverable even after a new publication.
    expect((await post(`${url}/estimates`, saveBody, saveKey)).json().id).toBe(saved.id)
    const reopened = (await app.inject({ method: 'GET', url: `/partner-cost-estimates/${saved.id}` })).json()
    expect(reopened.snapshot).toEqual(report)
    expect((await post(`${path(base.id, revision.json().id)}/calculate`, trip)).json().purchaseCostUsd).toBe(2730)
  })

  it('rejects incomplete tariffs, disjoint validity, capture overrides and altered checksums', async () => {
    const incomplete = structuredClone(terms); incomplete.crossing = { mode: 'UNKNOWN' }
    expect((await publish(await create(incomplete))).statusCode).toBe(422)
    const disjoint = structuredClone(terms); disjoint.usa.validFrom = '2026-11-01'; disjoint.usa.validUntil = '2026-11-30'
    expect((await publish(await create(disjoint))).statusCode).toBe(422)
    const base = await create(); await publish(base); const url = path(base.id, base.versions[0].id)
    expect((await post(`${url}/calculate`, { ...trip, mex: terms.mex })).statusCode).toBe(400)
    expect((await post(`${url}/estimates`, { trip, reviewChecksum: 'a'.repeat(64) })).statusCode).toBe(409)
    const expired = { ...trip, serviceDate: '2026-11-01' }
    const report = (await post(`${url}/calculate`, expired)).json()
    expect(report.purchaseCostUsd).toBeNull()
    expect((await post(`${url}/estimates`, { trip: expired, reviewChecksum: report.reviewChecksum })).statusCode).toBe(422)
  })

  it('enforces tenant and role boundaries', async () => {
    const base = await create(); await publish(base); const url = path(base.id, base.versions[0].id)
    auth.orgId = otherOrg
    try {
      expect((await detail(base.id)).statusCode).toBe(404)
      expect((await post(`${url}/calculate`, trip)).statusCode).toBe(404)
      expect((await publish(base)).statusCode).toBe(404)
      expect((await app.inject({ method: 'GET', url: '/partner-bases' })).json().items).toEqual([])
    } finally { auth.orgId = orgId }
    auth.role = 'VIEWER'
    try {
      expect((await detail(base.id)).statusCode).toBe(200)
      expect((await post(`${url}/calculate`, trip)).statusCode).toBe(403)
      expect((await publish(base)).statusCode).toBe(403)
    } finally { auth.role = 'ADMIN' }
    auth.role = 'OPERATOR'
    try {
      expect((await post(`${url}/calculate`, trip)).statusCode).toBe(200)
      expect((await publish(base)).statusCode).toBe(403)
      expect((await post('/partner-bases', {})).statusCode).toBe(403)
    } finally { auth.role = 'ADMIN' }
  })

  it('blocks SQL mutation and activation of draft/cross-tenant versions', async () => {
    const base = await create(); const id = base.versions[0].id
    await expect(db.partnerTariffVersion.update({ where: { id }, data: { terms: {} } })).rejects.toThrow()
    await expect(db.partnerTariffBase.update({ where: { id: base.id }, data: { activeVersionId: id } })).rejects.toThrow()
    await publish(base)
    await expect(db.partnerTariffVersion.update({ where: { id }, data: { publicationNote: 'changed' } })).rejects.toThrow()
    auth.orgId = otherOrg
    let foreign: any
    try { foreign = await create() } finally { auth.orgId = orgId }
    await expect(db.partnerTariffBase.update({ where: { id: foreign.id }, data: { activeVersionId: id } })).rejects.toThrow()
  })

  it('reconciles create/revision retries and rejects conflicting or stale edits', async () => {
    const key = randomUUID(); const body = { code: `QA-${key.slice(0, 8).toUpperCase()}`, name: 'Retry synthetic', terms }
    const first = await post('/partner-bases', body, key)
    expect((await post('/partner-bases', body, key)).json().id).toBe(first.json().id)
    expect((await post('/partner-bases', { ...body, name: 'Changed' }, key)).statusCode).toBe(409)
    const base = (await detail(first.json().id)).json()
    const revise = { terms, expectedLatestVersionId: base.versions[0].id }; const revisionKey = randomUUID()
    const next = await post(`/partner-bases/${base.id}/versions`, revise, revisionKey)
    expect((await post(`/partner-bases/${base.id}/versions`, revise, revisionKey)).json().id).toBe(next.json().id)
    expect((await post(`/partner-bases/${base.id}/versions`, revise)).statusCode).toBe(409)
    expect((await publish(base)).statusCode).toBe(409)
  })

  it('serializes a provably blocked revision and rejects its now-stale parent', async () => {
    const base = await create()
    let release!: () => void; let locked!: () => void
    const held = new Promise<void>(resolve => { locked = resolve })
    const unlocked = new Promise<void>(resolve => { release = resolve })
    const transaction = db.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "PartnerTariffBase" WHERE "id" = ${base.id} FOR UPDATE`
      await tx.partnerTariffVersion.create({ data: { orgId, baseId: base.id, version: 2, terms,
        termsChecksum: base.versions[0].termsChecksum, actorId: auth.sub, saveKey: randomUUID(), intentHash: 'held-fixture' } })
      locked(); await unlocked
    }, { timeout: 15000 })
    await Promise.race([held, transaction])
    const pending = Promise.resolve(post(`/partner-bases/${base.id}/versions`, { terms, expectedLatestVersionId: base.versions[0].id }))
    try {
      let blocked = false
      for (let i = 0; i < 60; i++) {
        const rows = await db.$queryRaw<{ blocked: boolean }[]>`SELECT EXISTS (
          SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()
          AND wait_event_type = 'Lock' AND query LIKE '%PartnerTariffBase%FOR UPDATE%'
        ) AS blocked`
        if (rows[0].blocked) { blocked = true; break }
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      expect(blocked).toBe(true)
    } finally { release(); await transaction }
    expect((await pending).statusCode).toBe(409)
    expect(await db.partnerTariffVersion.count({ where: { baseId: base.id } })).toBe(2)
  })

  it('rolls back publication and activation together on transaction failure', async () => {
    const base = await create(); const id = base.versions[0].id
    await expect(db.$transaction(async tx => {
      await tx.partnerTariffVersion.update({ where: { id }, data: { status: 'PUBLISHED',
        publishedById: auth.sub, publishedAt: new Date(), publicationNote: 'Synthetic rollback test' } })
      await tx.partnerTariffBase.update({ where: { id: base.id }, data: { activeVersionId: id } })
      throw new Error('Intentional abort')
    })).rejects.toThrow('Intentional abort')
    const reopened = (await detail(base.id)).json()
    expect(reopened.activeVersionId).toBeNull()
    expect(reopened.versions[0].status).toBe('DRAFT')
    expect(reopened.versions[0].publishedAt).toBeNull()
    expect((await publish(reopened)).statusCode).toBe(200)
  })

  it('does not save against an old active version while a new publication holds the base lock', async () => {
    const base = await create(); await publish(base)
    const url = path(base.id, base.versions[0].id)
    const report = (await post(`${url}/calculate`, trip)).json()
    const revised = (await post(`/partner-bases/${base.id}/versions`, { terms, expectedLatestVersionId: base.versions[0].id })).json()
    let release!: () => void; let locked!: () => void
    const held = new Promise<void>(resolve => { locked = resolve })
    const unlocked = new Promise<void>(resolve => { release = resolve })
    const transaction = db.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "PartnerTariffBase" WHERE "id" = ${base.id} FOR UPDATE`
      await tx.partnerTariffVersion.update({ where: { id: revised.id }, data: { status: 'PUBLISHED',
        publishedById: auth.sub, publishedAt: new Date(), publicationNote: 'Synthetic overlapping publication' } })
      await tx.partnerTariffBase.update({ where: { id: base.id }, data: { activeVersionId: revised.id } })
      locked(); await unlocked
    }, { timeout: 15000 })
    await Promise.race([held, transaction])
    const key = randomUUID()
    const pending = Promise.resolve(post(`${url}/estimates`, { trip, reviewChecksum: report.reviewChecksum }, key))
    try {
      let blocked = false
      for (let i = 0; i < 60; i++) {
        const rows = await db.$queryRaw<{ blocked: boolean }[]>`SELECT EXISTS (
          SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()
          AND wait_event_type = 'Lock' AND query LIKE '%PartnerTariffBase%FOR UPDATE%'
        ) AS blocked`
        if (rows[0].blocked) { blocked = true; break }
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      expect(blocked).toBe(true)
    } finally { release(); await transaction }
    expect((await pending).statusCode).toBe(409)
    expect(await db.partnerCostEstimate.count({ where: { orgId, saveKey: key } })).toBe(0)
  })
})
