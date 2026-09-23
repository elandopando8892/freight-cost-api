import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { errorHandler } from '../src/middleware/error-handler.js'
import { thirdPartyFixture } from './fixtures/third-party-cost.js'
import { reviewedPartnerCost, partnerHash } from '../src/modules/engine/partner-cost-snapshot.js'

const db = vi.hoisted(() => ({ findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() }))
vi.mock('../src/config/prisma.js', () => ({ prisma: { partnerCostEstimate: db } }))
vi.mock('../src/middleware/authenticate.js', () => ({ authenticate: async (req: { headers: { authorization?: string }; user?: unknown }, reply: { status: (s: number) => { send: (b: unknown) => unknown } }) => {
  if (!req.headers.authorization) return reply.status(401).send({ error: 'Unauthorized' })
  req.user = { sub: 'actor', orgId: 'org-one', role: req.headers.authorization }
} }))
const { partnerCostRoutes } = await import('../src/modules/engine/partner-cost.routes.js')
let app: FastifyInstance
const body = () => { const input = thirdPartyFixture(); return { input, reviewChecksum: reviewedPartnerCost(input).reviewChecksum } }
const save = (payload: unknown = body(), role = 'OPERATOR') => app.inject({ method: 'POST', url: '/partner-cost-estimates', headers: { authorization: role, 'idempotency-key': randomUUID() }, payload: payload as object })
beforeEach(async () => {
  vi.resetAllMocks(); db.findUnique.mockResolvedValue(null); db.create.mockResolvedValue({ id: randomUUID(), version: 1 })
  app = Fastify(); app.setErrorHandler(errorHandler); await app.register(partnerCostRoutes)
})
afterEach(async () => { await app.close() })
it.each(['ADMIN', 'OPERATOR'])('saves server-generated economics for %s', async role => {
  const response = await save(body(), role)
  expect(response.statusCode).toBe(201)
  expect(response.headers['cache-control']).toBe('no-store')
  expect(db.create.mock.calls[0][0].data).toMatchObject({ orgId: 'org-one', actorId: 'actor', version: 1, snapshot: { purchaseCostUsd: 2530, input: thirdPartyFixture() } })
  expect(response.json()).not.toHaveProperty('saveKey')
})
it.each([{ role: '', status: 401 }, { role: 'VIEWER', status: 403 }])('blocks $role writes before any DB access', async ({ role, status }) => {
  expect((await save(body(), role)).statusCode).toBe(status)
  expect(db.findUnique).not.toHaveBeenCalled(); expect(db.create).not.toHaveBeenCalled()
})
it('rejects client totals and changed input after review', async () => {
  expect((await save({ ...body(), purchaseCostUsd: 1 })).statusCode).toBe(400)
  const changed = body(); changed.input.mex.linehaul++
  expect((await save(changed)).statusCode).toBe(409)
  expect(db.create).not.toHaveBeenCalled()
})
it('rejects incomplete costs and missing review/key', async () => {
  const input = thirdPartyFixture(); input.crossing = { mode: 'UNKNOWN' }
  expect((await save({ input, reviewChecksum: reviewedPartnerCost(input).reviewChecksum })).statusCode).toBe(422)
  expect((await save({ input })).statusCode).toBe(400)
  expect((await app.inject({ method: 'POST', url: '/partner-cost-estimates', headers: { authorization: 'OPERATOR' }, payload: body() })).statusCode).toBe(400)
  expect(db.create).not.toHaveBeenCalled()
})
it('reconciles a previous save and rejects key reuse with another intent', async () => {
  const payload = body()
  db.findUnique.mockResolvedValue({ id: 'saved', version: 1, intentHash: partnerHash(payload) })
  expect((await save(payload)).json()).toEqual({ id: 'saved', version: 1 })
  expect((await save({ ...payload, previousId: randomUUID() })).statusCode).toBe(409)
  expect(db.create).not.toHaveBeenCalled()
})
it('does not allow a foreign parent', async () => {
  db.findFirst.mockResolvedValue(null)
  const previousId = randomUUID()
  expect((await save({ ...body(), previousId })).statusCode).toBe(404)
  expect(db.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: previousId, orgId: 'org-one' } }))
})
it('allows viewer reads scoped by tenant, without leaking retry keys', async () => {
  const id = randomUUID()
  db.findFirst.mockResolvedValueOnce({ id, version: 1, snapshot: reviewedPartnerCost(thirdPartyFixture()) }).mockResolvedValueOnce(null)
  const response = await app.inject({ method: 'GET', url: `/partner-cost-estimates/${id}`, headers: { authorization: 'VIEWER' } })
  expect(response.statusCode).toBe(200)
  expect(db.findFirst.mock.calls[0][0]).toMatchObject({ where: { id, orgId: 'org-one' }, select: { snapshot: true } })
  expect(db.findFirst.mock.calls[0][0].select).not.toHaveProperty('saveKey')
})
