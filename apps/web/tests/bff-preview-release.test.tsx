import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => ({ verifiedAccessToken: vi.fn() }))
vi.mock('@/lib/supabase/session', () => session)

const apiUrl = 'https://freight-cost-api123-elandopando8892s-projects.vercel.app'
const release = '90c132927cb96af4e3e230f102ae0c3f8171e737'

beforeEach(() => {
  vi.resetModules()
  session.verifiedAccessToken.mockReset()
  vi.stubEnv('API_URL', apiUrl)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

async function requestHealth() {
  const { GET } = await import('../app/api/v1/[...path]/route')
  const request = {
    method: 'GET',
    headers: new Headers({ authorization: 'Bearer untrusted-client-header' }),
    nextUrl: new URL('https://freight-cost-web123-elandopando8892s-projects.vercel.app/api/v1/health'),
  }
  return GET(request as Parameters<typeof GET>[0], { params: Promise.resolve({ path: ['health'] }) })
}

describe('Preview BFF release path', () => {
  it('does not contact the API without a verified Supabase session', async () => {
    session.verifiedAccessToken.mockResolvedValue(null)
    const upstream = vi.fn()
    vi.stubGlobal('fetch', upstream)

    const response = await requestHealth()
    expect(response.status).toBe(401)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'Not authenticated' })
    expect(upstream).not.toHaveBeenCalled()
  })

  it('uses configured API_URL and only the verified token, preserving release evidence', async () => {
    session.verifiedAccessToken.mockResolvedValue('synthetic-verified-session')
    const upstream = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ status: 'ok', release }),
      { status: 200, headers: { 'content-type': 'application/json', 'x-release-id': release } },
    ))
    vi.stubGlobal('fetch', upstream)

    const response = await requestHealth()
    expect(upstream).toHaveBeenCalledOnce()
    const [url, init] = upstream.mock.calls[0]
    expect(url.toString()).toBe(`${apiUrl}/health`)
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer synthetic-verified-session')
    expect(new Headers(init.headers).get('authorization')).not.toContain('untrusted-client-header')
    expect(response.status).toBe(200)
    expect(response.headers.get('x-release-id')).toBe(release)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ status: 'ok', release })
  })

  it('fails closed when the configured upstream is invalid in production', async () => {
    session.verifiedAccessToken.mockResolvedValue('synthetic-verified-session')
    vi.stubEnv('API_URL', 'http://localhost:3000')
    vi.stubEnv('NODE_ENV', 'production')
    const upstream = vi.fn()
    vi.stubGlobal('fetch', upstream)

    const response = await requestHealth()
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Invalid BFF upstream configuration or API path.' })
    expect(upstream).not.toHaveBeenCalled()
  })
})
