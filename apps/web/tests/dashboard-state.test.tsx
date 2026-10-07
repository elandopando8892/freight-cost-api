import { describe, expect, it } from 'vitest'
import { dashboardErrorCopy, section } from '../lib/dashboard-state'

describe('dashboard query state stays serializable and honest', () => {
  it('retains a successful empty result, not an error', async () => {
    expect(await section(Promise.resolve([]))).toEqual({ data: [], error: null })
  })
  it('does not send native fetch errors, cause, stack or internal messages into RSC props', async () => {
    const failure = new TypeError('private internal request', { cause: { code: 'ECONNREFUSED', token: 'synthetic-secret' } })
    const result = await section(Promise.reject(failure))
    expect(result).toEqual({ data: null, error: { status: null, kind: 'UNAVAILABLE' } })
    expect(JSON.stringify(result)).not.toMatch(/private|stack|cause|token|synthetic-secret/)
    expect(result.error).not.toBeInstanceOf(Error)
    expect(dashboardErrorCopy(result.error!.status, result.error!.kind).href).toBe('/')
  })
  it.each([401, 403, 404, 422, 429, 503])('preserves HTTP status %s without its response body', async (status) => {
    const error = Object.assign(new Error('private response'), { status, body: { secret: 'synthetic' } })
    expect(await section(Promise.reject(error))).toEqual({ data: null, error: { status, kind: 'HTTP' } })
  })
  it.each([null, undefined, 'unexpected failure', new TypeError('render bug')])('keeps unknown failures separate from empty data', async (failure) => {
    expect(await section(Promise.reject(failure))).toEqual({ data: null, error: { status: null, kind: 'UNKNOWN' } })
  })
  it('does not classify an invalid status as expired authentication', async () => {
    expect(await section(Promise.reject(Object.assign(new Error(), { status: '401' })))).toEqual({ data: null, error: { status: null, kind: 'UNKNOWN' } })
    expect(dashboardErrorCopy(401).href).toBe('/login')
    expect(dashboardErrorCopy(403).href).toBe('/')
    expect(dashboardErrorCopy(503).detail).toContain('no está disponible')
  })
  it('isolates successful and failing requests', async () => {
    const [good, failed] = await Promise.all([section(Promise.resolve({ count: 3 })), section(Promise.reject(null))])
    expect(good.data).toEqual({ count: 3 })
    expect(failed.data).toBeNull()
  })
})
