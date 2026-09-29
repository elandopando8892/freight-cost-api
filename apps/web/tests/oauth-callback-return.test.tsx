import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth }),
}))

beforeEach(() => auth.exchangeCodeForSession.mockReset())

async function callback(url: string) {
  const { GET } = await import('../app/auth/callback/route')
  return GET({ url, nextUrl: new URL(url) } as Parameters<typeof GET>[0])
}

describe('Supabase OAuth callback', () => {
  it('exchanges a code and returns only to the same origin', async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: null })
    const origin = 'https://freight-cost-preview-elandopando8892s-projects.vercel.app'
    const unsafe = await callback(`${origin}/auth/callback?code=synthetic-code&next=${encodeURIComponent('/\\evil.example/')}`)
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('synthetic-code')
    expect(unsafe.headers.get('location')).toBe(`${origin}/`)
    expect(unsafe.headers.get('cache-control')).toContain('no-store')

    const safe = await callback(`${origin}/auth/callback?code=synthetic-code&next=${encodeURIComponent('/cost-bases/tires?view=research')}`)
    expect(safe.headers.get('location')).toBe(`${origin}/cost-bases/tires?view=research`)
  })

  it('does not redirect to a return target when code exchange fails', async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: new Error('invalid code') })
    const origin = 'https://freight-cost-preview-elandopando8892s-projects.vercel.app'
    const response = await callback(`${origin}/auth/callback?code=synthetic-code&next=/settings`)
    expect(response.headers.get('location')).toBe(`${origin}/login?error=No+se+pudo+completar+el+acceso`)
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
})
