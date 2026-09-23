import { describe, expect, it } from 'vitest'
import { dashboardErrorCopy, section } from '../../web/lib/dashboard-state.js'

describe('dashboard partial data states', () => {
  it('keeps a valid empty response distinct from an API failure', async () => {
    expect(await section(Promise.resolve([]))).toEqual({ data: [], error: null })
    const failure = { status: 500 }
    expect(await section(Promise.reject(failure))).toEqual({ data: null, error: failure })
  })
  it.each([401, 403, 500])('does not present HTTP %s as an empty section', (status) => {
    const copy = dashboardErrorCopy(status)
    expect(copy.detail).not.toMatch(/no hay|primera base|primera cotización/i)
    expect(copy.detail).toMatch(/sesión|permiso|No se pudo/)
  })
})
