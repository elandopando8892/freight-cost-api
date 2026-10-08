import Fastify from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const findUnique = vi.fn()
const jwtVerify = vi.fn()
vi.mock('../src/config/prisma.js', () => ({ prisma: { user: { findUnique } } }))
vi.mock('jose', () => ({ createRemoteJWKSet: vi.fn(() => ({})), jwtVerify }))
vi.mock('../src/modules/org/organization-invitations.service.js', () => ({ acceptPendingOrganizationInvitation: vi.fn() }))
const { authenticateExisting } = await import('../src/middleware/authenticate-existing.js')
const { authenticate } = await import('../src/middleware/authenticate.js')
const actor = { id: 'original', orgId: 'original-org', role: 'VIEWER', email: 'jgonzalez@xbfreight.com',
  supabaseId: '00000000-0000-4000-8000-000000000002' }
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://synthetic.supabase.co')
  vi.stubEnv('SUPABASE_EXPECTED_PROJECT_REF', '')
  vi.stubEnv('SUPABASE_JWT_AUDIENCE', 'authenticated')
  vi.stubEnv('FCM_AUTH_ACCESS_SCOPE', JSON.stringify({ version: 1, users: [
    { email: 'sales@heymarksman.com', subject: '00000000-0000-4000-8000-000000000001' },
    { email: actor.email, subject: actor.supabaseId },
  ] }))
  findUnique.mockResolvedValue(actor)
  jwtVerify.mockResolvedValue({ payload: { sub: actor.supabaseId, email: actor.email, role: 'authenticated', session_id: 'session', is_anonymous: false,
    user_metadata: { role: 'ADMIN', orgId: 'different-org' } } })
})
afterEach(() => vi.unstubAllEnvs())
async function request(handler = authenticateExisting) {
  const app = Fastify()
  app.get('/read', { preHandler: handler }, req => req.user)
  try { return await app.inject({ url: '/read', headers: { authorization: 'Bearer synthetic' } }) }
  finally { await app.close() }
}
describe.each([['read-only', authenticateExisting], ['normal', authenticate]] as const)('%s scoped authentication', (_label, handler) => {
it('returns the stored viewer identity and original tenant, never a JWT-supplied admin role', async () => {
  const result = await request(handler)
  expect(result.statusCode).toBe(200)
  expect(result.json()).toEqual({ sub: 'original', orgId: 'original-org', role: 'VIEWER', supabaseId: actor.supabaseId })
})
it('rejects a mismatched stored email rather than authenticating a wrong link', async () => {
  findUnique.mockResolvedValueOnce({ ...actor, email: 'excluded@example.test' })
  expect((await request(handler)).statusCode).toBe(403)
})
it('rejects an excluded verified actor before reading membership', async () => {
  jwtVerify.mockResolvedValueOnce({ payload: { sub: '00000000-0000-4000-8000-000000000003',
    email: 'excluded@example.test', role: 'authenticated', session_id: 'session', is_anonymous: false } })
  expect((await request(handler)).statusCode).toBe(403)
  expect(findUnique).not.toHaveBeenCalled()
})
it('denies a missing membership without creating one', async () => {
  findUnique.mockResolvedValueOnce(null)
  expect((await request(handler)).statusCode).toBe(403)
})
it('reports a missing production policy as unavailable, not a Google login failure', async () => {
  vi.stubEnv('VERCEL_ENV', 'production')
  delete process.env.FCM_AUTH_ACCESS_SCOPE
  expect((await request(handler)).statusCode).toBe(503)
  expect(findUnique).not.toHaveBeenCalled()
})
it('keeps an invalid token as 401 without reading membership', async () => {
  jwtVerify.mockRejectedValueOnce(new Error('signature-invalid'))
  expect((await request(handler)).statusCode).toBe(401)
  expect(findUnique).not.toHaveBeenCalled()
})
})
