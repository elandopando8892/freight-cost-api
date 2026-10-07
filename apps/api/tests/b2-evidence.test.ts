import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { errorHandler } from '../src/middleware/error-handler.js'
import snapshot from '../src/modules/engine/b2-evidence.snapshot.json'
import { B2EvidencePayload, B2EvidenceQuery } from '../src/modules/engine/b2-evidence-contract.js'
import { projectB2Evidence, hashProducerSource, hashEvidenceBytes } from '../scripts/project-b2-evidence.js'
vi.mock('../src/middleware/authenticate.js', () => ({ authenticate: async (request: any, reply: any) => {
  if (!request.headers.authorization) return reply.status(401).send({ error: 'Unauthorized' })
  request.user = { sub: request.headers['x-test-user'] ?? 'test', orgId: request.headers['x-test-org'], role: request.headers.authorization }
} }))
vi.mock('../src/config/prisma.js', () => ({ prisma: new Proxy({}, { get: () => { throw new Error('Unexpected database access') } }) }))
const { benchmarkRoutes } = await import('../src/modules/engine/benchmark.routes.js')
let app: FastifyInstance
const url = '/engine/benchmark-owned-d2d/b2-evidence'
const headers = { authorization: 'OPERATOR', 'x-test-org': 'org-a' }
beforeEach(async () => { app = Fastify(); app.setErrorHandler(errorHandler); await app.register(benchmarkRoutes) })
afterEach(async () => { await app.close() })
it('reproduces real local research, hashes and four cases without new arithmetic or adoption', () => {
  expect(projectB2Evidence()).toEqual(snapshot)
  expect(createHash('sha256').update(JSON.stringify(snapshot.payload)).digest('hex')).toBe(snapshot.sha256)
  expect(snapshot.payload.sourcePins).toHaveLength(83)
  expect(snapshot.payload.cases.every(c => c.fixedRemainders.length === 6 && c.variableRemainders.length === 7 && Object.values(c.outputs).every(v => v === null))).toBe(true)
  expect(snapshot.payload.cases.every(c => c.issues.length === 5 && c.rows.every(r => r.canonicalKey === null && r.valueUsdPerCycle === null))).toBe(true)
})
it('normalizes only producer CRLF and preserves detection of semantic changes', () => {
  expect(snapshot.payload.producerHashPolicy).toBe('UTF8_CRLF_TO_LF_NO_OTHER_NORMALIZATION')
  for (const pin of snapshot.payload.producerPins) {
    const text = readFileSync(fileURLToPath(new URL(`../../../${pin.file}`, import.meta.url)), 'utf8')
    const lf = text.replace(/\r\n/g, '\n'), crlf = lf.replace(/\n/g, '\r\n')
    expect(hashProducerSource(lf)).toBe(pin.sha256); expect(hashProducerSource(crlf)).toBe(pin.sha256)
    expect(hashProducerSource(lf + '// semantic drift')).not.toBe(pin.sha256)
    expect(hashProducerSource(lf + ' ')).not.toBe(pin.sha256)
  }
})
it('retains byte-exact source hashes rather than normalizing public evidence', () => {
  const pin = snapshot.payload.sourcePins.find(p => p.id === 'confirmedB2OperatingProfile')!
  const bytes = readFileSync(fileURLToPath(new URL(`../../../${pin.file}`, import.meta.url)))
  expect(hashEvidenceBytes(bytes)).toBe(pin.sha256)
  expect(hashEvidenceBytes(Buffer.from(bytes.toString('utf8').replace(/\n/g, '\r\n')))).not.toBe(pin.sha256)
  expect(hashProducerSource('\ufeffx\n')).not.toBe(hashProducerSource('x\n'))
})
it.each(['ADMIN', 'OPERATOR'])('serves public-only read data to %s through existing guards', async role => {
  const r = await app.inject({ method: 'GET', url, headers: { ...headers, authorization: role } })
  expect(r.statusCode).toBe(200); expect(r.headers['cache-control']).toBe('no-store')
  expect(r.json()).toMatchObject({ quoteReady: false, calibrated: false, notesPersisted: false, adoptedValues: 0,
    referencePeriod: '2026-09', sourcePinCount: 83, scope: { sub: 'test', orgId: 'org-a' } })
  expect(r.json().case.rows[0].sources[0]).toMatchObject({ comparisonValue: 260, historicalSeptemberPriceVerified: false, selectedForCostEngine: false })
  expect(r.json().case.rows[1].sources[0]).toMatchObject({ comparisonValue: null, kind: 'MEAL_CONTEXT_NOT_LODGING' })
})
it.each([{ headers: {}, status: 401 }, { headers: { ...headers, authorization: 'VIEWER' }, status: 403 }, { headers: { authorization: 'OPERATOR' }, status: 403 }])('rejects absent identity or unauthorized role', async t => {
  expect((await app.inject({ method: 'GET', url, headers: t.headers })).statusCode).toBe(t.status)
})
it.each(['orgId=org-b', 'purchaseUsd=1', 'resolution=1', 'file=docs/private', 'referencePeriod=2026-10', 'profileId=other', 'fundingMode=other', 'cycleId=other'])('rejects query injection %s', async query => {
  expect((await app.inject({ method: 'GET', url: `${url}?${query}`, headers })).statusCode).toBe(400)
})
it('rejects a stale fingerprint, supports exact reload, and never leaks the previous account scope', async () => {
  expect((await app.inject({ method: 'GET', url: `${url}?expectedSnapshot=${'0'.repeat(64)}`, headers })).statusCode).toBe(409)
  const a = await app.inject({ method: 'GET', url: `${url}?expectedSnapshot=${snapshot.sha256}`, headers })
  const b = await app.inject({ method: 'GET', url, headers: { ...headers, 'x-test-org': 'org-b', 'x-test-user': 'other' } })
  expect(a.json().scope.orgId).toBe('org-a'); expect(b.json().scope).toEqual({ orgId: 'org-b', sub: 'other' })
  expect(a.json().case).toEqual(b.json().case)
})
it.each(snapshot.payload.cases)('matches exact requested context $cycleId/$fundingMode', async c => {
  const r = await app.inject({ method: 'GET', url: `${url}?cycleId=${c.cycleId}&fundingMode=${c.fundingMode}`, headers })
  expect(r.json().case).toEqual(c)
})
it('fails closed if numeric outputs, adoption, canonical mappings or duplicate contexts enter the projection', () => {
  for (const change of [ (p: any) => { p.quoteReady = true }, (p: any) => { p.cases[0].outputs.cvuUsd = 0 },
    (p: any) => { p.cases[0].rows[0].canonicalKey = 'INVENTED_KEY' }, (p: any) => { p.cases[1] = p.cases[0] } ]) {
    const p = structuredClone(snapshot.payload); change(p); expect(() => B2EvidencePayload.parse(p)).toThrow()
  }
  expect(() => B2EvidenceQuery.parse({ expectedSnapshot: 'invalid' })).toThrow()
})
it('does not expose mutation endpoints for the research projection', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE'] as const)
    expect((await app.inject({ method, url, headers, payload: { note: 'not persisted' } })).statusCode).toBe(404)
})
