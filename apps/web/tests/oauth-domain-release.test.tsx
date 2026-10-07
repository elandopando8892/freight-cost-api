import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appOrigin } from '../lib/supabase/site-url'

// Configuration/handler regression only: no provider request or real session.
const auth = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth }) }))
vi.mock('next/navigation', () => ({
  redirect: (location: string) => { throw new Error(`redirect:${location}`) },
}))

const canonicalOrigin = 'https://quotes.heymarksman.com'
const previewHost = 'freight-cost-synthetic-elandopando8892s-projects.vercel.app'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('VERCEL_ENV', 'production')
  vi.stubEnv('VERCEL_URL', previewHost)
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', canonicalOrigin)
  auth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://provider.invalid/authorize' }, error: null })
  auth.exchangeCodeForSession.mockResolvedValue({ error: null })
})

afterEach(() => { vi.unstubAllEnvs() })

async function startGoogle() {
  const { loginWithGoogle } = await import('../app/login/actions')
  return loginWithGoogle()
}

async function callback(origin: string, query: string) {
  const { GET } = await import('../app/auth/callback/route')
  const url = `${origin}/auth/callback${query}`
  return GET({ url, nextUrl: new URL(url) } as Parameters<typeof GET>[0])
}

describe('FCM quotes domain release contract (synthetic)', () => {
  it('uses the production domain, not the generated deployment hostname', async () => {
    expect(appOrigin()).toBe(canonicalOrigin)
    await expect(startGoogle()).rejects.toThrow('redirect:https://provider.invalid/authorize')
    expect(auth.signInWithOAuth).toHaveBeenCalledOnce()
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google', options: { redirectTo: `${canonicalOrigin}/auth/callback` },
    })
  })

  it('keeps preview login and callback on the preview despite the production setting', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    expect(appOrigin()).toBe(`https://${previewHost}`)
    await expect(startGoogle()).rejects.toThrow('redirect:https://provider.invalid/authorize')
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google', options: { redirectTo: `https://${previewHost}/auth/callback` },
    })
    const response = await callback(`https://${previewHost}`, '?code=synthetic-code&next=/settings')
    expect(response.headers.get('location')).toBe(`https://${previewHost}/settings`)
  })

  it('keeps local development on localhost when no site URL is configured', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('VERCEL_ENV', 'development')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    await expect(startGoogle()).rejects.toThrow('redirect:https://provider.invalid/authorize')
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google', options: { redirectTo: 'http://localhost:3001/auth/callback' },
    })
  })

  it.each(['', 'http://quotes.heymarksman.com'])('blocks an absent or insecure production site URL: %s', async site => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', site)
    await expect(startGoogle()).rejects.toThrow('NEXT_PUBLIC_SITE_URL')
    expect(auth.signInWithOAuth).not.toHaveBeenCalled()
  })

  it('exchanges the code once and returns to the same quotes origin without caching', async () => {
    const response = await callback(canonicalOrigin, '?code=synthetic-code&next=/cost-bases/tires')
    expect(auth.exchangeCodeForSession).toHaveBeenCalledOnce()
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('synthetic-code')
    expect(response.headers.get('location')).toBe(`${canonicalOrigin}/cost-bases/tires`)
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it.each(['https://rates.heymarksman.com/', '//rates.heymarksman.com/'])('rejects a cross-application return: %s', async next => {
    const response = await callback(canonicalOrigin, `?code=synthetic-code&next=${encodeURIComponent(next)}`)
    expect(response.headers.get('location')).toBe(`${canonicalOrigin}/`)
  })

  it('keeps a failed exchange at the quotes login, not the requested page', async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: new Error('synthetic expired code') })
    const response = await callback(canonicalOrigin, '?code=synthetic-code&next=/settings')
    expect(response.headers.get('location')).toBe(`${canonicalOrigin}/login?error=No+se+pudo+completar+el+acceso`)
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('does not attempt an exchange without a code', async () => {
    const response = await callback(canonicalOrigin, '?next=/settings')
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBe(`${canonicalOrigin}/login?error=No+se+pudo+completar+el+acceso`)
  })

  it('stops at the local login when the OAuth provider cannot start', async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: { url: null }, error: new Error('synthetic unavailable provider') })
    await expect(startGoogle()).rejects.toThrow('redirect:/login?error=No+se+pudo+iniciar+Google')
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled()
  })
})
