import { describe, expect, it } from 'vitest'
import { buildBffRequestHeaders } from '../../web/lib/bff-request-headers.js'

describe('BFF request header boundary', () => {
  it('forwards the preview retry key but takes identity only from the verified session', () => {
    const result = buildBffRequestHeaders(new Headers({
      'content-type': 'application/json', 'idempotency-key': 'preview-key-20260907',
      authorization: 'Bearer forged', cookie: 'session=untrusted', 'x-org-id': 'other-org',
    }), 'verified-session')
    expect(Object.fromEntries(result)).toEqual({
      authorization: 'Bearer verified-session',
      'content-type': 'application/json', 'idempotency-key': 'preview-key-20260907',
    })
  })
  it('does not manufacture a retry key on existing requests', () => {
    expect(Object.fromEntries(buildBffRequestHeaders(new Headers(), 'verified')))
      .toEqual({ authorization: 'Bearer verified' })
  })
})
