import { afterEach, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
vi.mock('../src/middleware/authenticate.js', () => ({ authenticate: async (request: any, reply: any) => {
  if (!request.headers.authorization) return reply.status(401).send({ error: 'Unauthorized' })
  request.user = { sub: 'mock', orgId: request.headers['x-test-org'], role: request.headers.authorization }
} }))
vi.mock('../src/config/prisma.js', () => ({ prisma: new Proxy({}, { get: () => { throw new Error('Unexpected DB access') } }) }))
import { googleRouteReviewRoutes } from '../src/modules/routing/google-route-review.routes.js'
const apps: FastifyInstance[] = []
afterEach(async () => { for (const app of apps.splice(0)) await app.close(); vi.unstubAllGlobals() })
const key = `AIza${'x'.repeat(35)}` // synthetic, never read local env files
const body = { acknowledgeUsage: true, request: { origin: 'Laredo, TX, USA', destination: 'Fort Smith, AR 72916, USA', intermediates: [], candidateOnly: true, endpointsConfirmed: false, truckRouteValidated: false } }
const headers = { authorization: 'OPERATOR', 'x-test-org': 'org-a' }
const response = { routes: [{ distanceMeters: 1000, duration: '120s', polyline: { geoJsonLinestring: { type: 'LineString', coordinates: [[-100, 30], [-99, 31]] } } }] }
async function setup(overrides = {}) {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(response)))
  const app = Fastify(); apps.push(app)
  await app.register(googleRouteReviewRoutes, { environment: 'development', enabled: 'true', apiKey: key, fetcher, ...overrides })
  return { app, fetcher }
}
it('config is authenticated, no-store, nonbillable and contains no key or content', async () => {
  const { app, fetcher } = await setup()
  const result = await app.inject({ method: 'GET', url: '/routing/google-basic/config', headers })
  expect(result.statusCode).toBe(200); expect(result.headers['cache-control']).toBe('no-store')
  expect(result.json()).toEqual({ enabled: true, remainingAttempts: 1, policy: 'LOCAL_TRANSIENT_REVIEW_ONLY', quoteReady: false })
  expect(result.body).not.toContain(key); expect(fetcher).not.toHaveBeenCalled()
})
it.each(['production', 'test', undefined])('cannot enable outside development: %s', async environment => {
  const { app, fetcher } = await setup({ environment })
  const result = await app.inject({ method: 'POST', url: '/routing/google-basic/candidate', headers, payload: body })
  expect(result.statusCode).toBe(503); expect(fetcher).not.toHaveBeenCalled()
})
it('defaults disabled and does not load private files', async () => {
  const { app, fetcher } = await setup({ enabled: undefined, apiKey: '' })
  const result = await app.inject({ method: 'GET', url: '/routing/google-basic/config', headers })
  expect(result.json().enabled).toBe(false); expect(fetcher).not.toHaveBeenCalled()
})
it.each([{ headers: {}, status: 401 }, { headers: { ...headers, authorization: 'VIEWER' }, status: 403 }, { headers: { authorization: 'OPERATOR' }, status: 403 }])('denies missing identity/org/role before provider', async item => {
  const { app, fetcher } = await setup()
  for (const method of ['GET', 'POST'] as const) {
    const result = await app.inject({ method, url: `/routing/google-basic/${method === 'GET' ? 'config' : 'candidate'}`, headers: item.headers, ...(method === 'POST' ? { payload: body } : {}) })
    expect(result.statusCode).toBe(item.status)
  }
  expect(fetcher).not.toHaveBeenCalled()
})
it.each(['ADMIN', 'OPERATOR'])('returns transient candidate for %s without adoption', async role => {
  const { app, fetcher } = await setup()
  const result = await app.inject({ method: 'POST', url: '/routing/google-basic/candidate', headers: { ...headers, authorization: role }, payload: body })
  expect(result.statusCode).toBe(200); expect(result.headers['cache-control']).toBe('no-store')
  expect(result.json()).toMatchObject({ status: 'CANDIDATE_NOT_TRUCK_VALIDATED', quoteReady: false, adoptedValues: 0, handoff: { loadedKm: null, emptyKm: null, cycleDays: null, tollsUsd: null } })
  expect(result.body).not.toContain(key); expect(fetcher).toHaveBeenCalledTimes(1)
})
it.each([{ acknowledgeUsage: false }, { orgId: 'org-b' }, { request: { ...body.request, travelMode: 'TRUCK' } }, { request: { ...body.request, origin: '' } }])('rejects consent, tenant and advanced/input injection without consuming budget', async extra => {
  const { app, fetcher } = await setup()
  const result = await app.inject({ method: 'POST', url: '/routing/google-basic/candidate', headers, payload: { ...body, ...extra } })
  expect(result.statusCode).toBe(400); expect(fetcher).not.toHaveBeenCalled()
  expect((await app.inject({ method: 'GET', url: '/routing/google-basic/config', headers })).json().remainingAttempts).toBe(1)
})
it('one process attempt across concurrency and tenants; never returns another tenants geometry', async () => {
  const { app, fetcher } = await setup()
  const results = await Promise.all(['org-a', 'org-b'].map(org => app.inject({ method: 'POST', url: '/routing/google-basic/candidate', headers: { ...headers, 'x-test-org': org }, payload: body })))
  expect(results.map(r => r.statusCode).sort()).toEqual([200, 429]); expect(fetcher).toHaveBeenCalledTimes(1)
  expect(results.find(r => r.statusCode === 429)!.body).not.toContain('coordinates')
  expect((await app.inject({ method: 'GET', url: '/routing/google-basic/config', headers })).json().remainingAttempts).toBe(0)
})
it('provider rejection consumes attempt, strips message and never retries', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: key } }), { status: 403 }))
  const { app } = await setup({ fetcher })
  const first = await app.inject({ method: 'POST', url: '/routing/google-basic/candidate', headers, payload: body })
  expect(first.statusCode).toBe(502); expect(first.json().code).toBe('ACCESS_DENIED'); expect(first.body).not.toContain(key)
  expect((await app.inject({ method: 'POST', url: '/routing/google-basic/candidate', headers, payload: body })).statusCode).toBe(429)
  expect(fetcher).toHaveBeenCalledTimes(1)
})
it('oversized input does not consume an attempt', async () => {
  const { app, fetcher } = await setup()
  expect((await app.inject({ method: 'POST', url: '/routing/google-basic/candidate', headers, payload: { pad: 'a'.repeat(8001) } })).statusCode).toBe(413)
  expect(fetcher).not.toHaveBeenCalled()
})
function durableBudget() {
  const used={map:false,routes:false}
  return {remaining:(kind:'map'|'routes'):0|1=>used[kind]?0:1,reserve:(kind:'map'|'routes')=>{if(used[kind])return false;used[kind]=true;return true}}
}
it('scoped budget requires map reservation by the same identity before one route',async()=>{
  const budget=durableBudget(),allowedRequest={origin:body.request.origin,destination:body.request.destination}
  const {app,fetcher}=await setup({budget,allowedRequest})
  const candidate=()=>app.inject({method:'POST',url:'/routing/google-basic/candidate',headers,payload:body})
  expect((await candidate()).statusCode).toBe(403);expect(fetcher).not.toHaveBeenCalled()
  expect((await app.inject({method:'POST',url:'/routing/google-basic/map-reservation',headers,payload:body})).json()).toEqual({reserved:true})
  expect(fetcher).not.toHaveBeenCalled()
  expect((await app.inject({method:'POST',url:'/routing/google-basic/candidate',headers:{...headers,'x-test-org':'org-b'},payload:body})).statusCode).toBe(403)
  expect((await candidate()).statusCode).toBe(200);expect((await candidate()).statusCode).toBe(429);expect(fetcher).toHaveBeenCalledTimes(1)
  const config=(await app.inject({method:'GET',url:'/routing/google-basic/config',headers})).json()
  expect(config.remainingMapLoads).toBe(0);expect(config.remainingAttempts).toBe(0)
  const resumed=await setup({budget,allowedRequest})
  expect((await resumed.app.inject({method:'POST',url:'/routing/google-basic/map-reservation',headers,payload:body})).statusCode).toBe(429)
  expect(resumed.fetcher).not.toHaveBeenCalled()
})
it.each([{origin:'Mexico, DF'},{destination:'Dallas, TX'},{intermediates:['Dallas, TX']}])('rejects unapproved scope before map reservation and provider: %j',async patch=>{
  const budget=durableBudget()
  const {app,fetcher}=await setup({budget,allowedRequest:{origin:body.request.origin,destination:body.request.destination}})
  for(const action of ['map-reservation','candidate'])expect((await app.inject({method:'POST',url:`/routing/google-basic/${action}`,headers,payload:{...body,request:{...body.request,...patch}}})).statusCode).toBe(400)
  expect(budget.remaining('map')).toBe(1);expect(budget.remaining('routes')).toBe(1);expect(fetcher).not.toHaveBeenCalled()
})
it.each([{}, {...headers,authorization:'VIEWER'},{authorization:'OPERATOR'}])('denies reservation without identity/org/role',async deniedHeaders=>{
  const budget=durableBudget(),{app,fetcher}=await setup({budget})
  const result=await app.inject({method:'POST',url:'/routing/google-basic/map-reservation',headers:deniedHeaders,payload:body})
  expect([401,403]).toContain(result.statusCode);expect(budget.remaining('map')).toBe(1);expect(fetcher).not.toHaveBeenCalled()
})
