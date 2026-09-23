import { describe, expect, it } from 'vitest'
import { quoteErrorCopy } from '../lib/quote-error'

describe('safe actionable calculation errors', () => {
  it('names only known structured fields without rendering diagnostics', () => {
    const copy = quoteErrorCopy({ status: 400, body: { issues: [{ field: 'fxRate', message: 'SECRET' }, { field: 'equipment.trailer' }, { field: 'fxRate' }, { field: '__proto__' }, { field: 'private-token' }] } })
    expect(copy.description).toContain('Corrige: tipo de cambio, remolque.')
    expect(copy.description).not.toMatch(/SECRET|private-token|__proto__/)
  })
  it.each([401, 403, 422, 429, 500])('distinguishes status %s without leaking raw diagnostics', status => {
    const copy = quoteErrorCopy({ status, message: 'SECRET', body: { issues: ['SECRET'] } })
    expect(copy.title).not.toBe('No fue posible generar la tarifa')
    expect(JSON.stringify(copy)).not.toContain('SECRET')
  })
  it('preserves the governed legacy profile guidance', () => {
    expect(quoteErrorCopy({ status: 409, message: 'Legacy cost-base versions without an applicability profile are restricted to historical snapshot replay.' }).reviewBase).toBe(true)
  })
})
