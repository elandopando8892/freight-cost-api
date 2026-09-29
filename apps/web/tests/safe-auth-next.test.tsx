import { describe, expect, it } from 'vitest'
import { safeAuthNext } from '../lib/supabase/safe-next'

const callback = 'https://freight-cost-preview-elandopando8892s-projects.vercel.app/auth/callback'

describe('OAuth return path', () => {
  it('preserves a same-origin path, query and fragment', () => {
    expect(safeAuthNext('/cost-bases/tires?view=research#evidence', callback))
      .toBe('/cost-bases/tires?view=research#evidence')
  })

  it.each([
    null,
    '',
    'https://evil.example/',
    '//evil.example/',
    '/\\evil.example/',
    '/%5cevil.example/',
    '/%2fevil.example/',
    '/safe\r\nLocation: https://evil.example/',
    'javascript:alert(1)',
  ])('falls back to root for an unsafe return target: %s', value => {
    expect(safeAuthNext(value, callback)).toBe('/')
  })
})
