import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { LOCAL_READ_HOST, LOCAL_READ_ROLE } from '../src/config/local-read-review.js'

const { verify, resolveUser, createUser } = vi.hoisted(() => ({
  verify: vi.fn(), resolveUser: vi.fn(), createUser: vi.fn(),
}))
vi.mock('../src/config/prisma.js', () => ({ prisma: { user: { create: createUser } } }))
vi.mock('../src/modules/auth/supabase.service.js', () => ({ verifySupabaseToken: verify, resolveUser }))
vi.mock('../src/config/env.js', () => ({ env: {
  NODE_ENV: 'test', RELEASE_SHA: 'local-test', CORS_ORIGINS: '', RATE_LIMIT_MAX: 240,
  RATE_LIMIT_WINDOW: '1 minute', OPENAI_API_KEY: '', CRON_SECRET: '', EIA_API_KEY: '',
} }))

const { buildApp } = await import('../src/app.js')
let app: FastifyInstance
beforeAll(async () => {
  const environment = {
    NODE_ENV: 'development', VERCEL_ENV: 'preview', FCM_PREVIEW_EXISTING_USERS_ONLY: 'true',
    SUPABASE_EXPECTED_PROJECT_REF: 'alqjqzqagdmcywpjtnnr',
    SUPABASE_URL: 'https://alqjqzqagdmcywpjtnnr.supabase.co',
    STAGING_DATABASE_URL: `postgresql://${LOCAL_READ_ROLE}:synthetic@${LOCAL_READ_HOST}/neondb`,
    OPENAI_API_KEY: '', RATEWARE_API_URL: '', CRON_SECRET: '', GOOGLE_ROUTES_API_KEY: '',
    FCM_GOOGLE_ROUTE_REVIEW_ENABLED: 'false',
  }
  for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value)
  app = buildApp({ localReadOnlyReview: true })
  await app.ready()
})
afterAll(async () => { await app?.close(); vi.unstubAllEnvs() })

describe('local runtime real HTTP boundary with mocked providers', () => {
  it('keeps liveness accessible', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json().release).toBe('local-test')
  })
  it('keeps protected reads unauthorized without a session', async () => {
    const response = await app.inject({ method: 'GET', url: '/org' })
    expect(response.statusCode).toBe(401)
    expect(verify).not.toHaveBeenCalled()
    expect(resolveUser).not.toHaveBeenCalled()
  })
  it.each([
    ['POST', '/quotes'], ['PUT', '/org'], ['PATCH', '/cost-bases/id'],
    ['POST', '/cost-bases/consult'], ['POST', '/routing/google-basic/candidate'],
    ['GET', '/cron/fuel'], ['GET', '/routing/google-basic/config'],
  ] as const)('rejects %s %s before auth or handlers', async (method, url) => {
    const response = await app.inject({ method, url, headers: { authorization: 'Bearer synthetic' } })
    expect(response.statusCode).toBe(403)
    expect(response.json().code).toBe('LOCAL_READ_ONLY')
    expect(verify).not.toHaveBeenCalled()
    expect(resolveUser).not.toHaveBeenCalled()
    expect(createUser).not.toHaveBeenCalled()
  })
})
