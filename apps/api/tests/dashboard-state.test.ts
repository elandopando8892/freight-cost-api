import { describe, expect, it } from 'vitest'
import { dashboardErrorCopy, section } from '../../web/lib/dashboard-state.js'

describe('dashboard partial data states', () => {
  it('keeps a valid empty response distinct from an API failure', async () => {
    expect(await section(Promise.resolve([]))).toEqual({ data: [], error: null })
    // The API client throws an Error with status; RSC receives only sanitized metadata.
    const failure = Object.assign(new Error('synthetic private body'), { status: 500, body: { secret: 'synthetic-secret' } })
    const result = await section(Promise.reject(failure))
    expect(result).toEqual({ data: null, error: { status: 500, kind: 'HTTP' } })
    expect(JSON.stringify(result)).not.toMatch(/synthetic private|synthetic-secret|stack|body/)
  })
  it.each([401, 403, 500])('does not present HTTP %s as an empty section', (status) => {
    const copy = dashboardErrorCopy(status)
    expect(copy.detail).not.toMatch(/no hay|primera base|primera cotización/i)
    expect(copy.detail).toMatch(/sesión|permiso|No se pudo/)
  })
})
