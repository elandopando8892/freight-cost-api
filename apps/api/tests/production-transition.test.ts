import { describe, expect, it } from 'vitest'
import {
  assertSingleDraftRouteTransition,
  draftRouteTransitionWhere,
} from '../src/modules/production/production-transition.js'

describe('production route optimistic transition', () => {
  it('pins the tenant, draft status and exact revision timestamp', () => {
    const updatedAt = new Date('2026-08-15T12:00:00.000Z')
    expect(draftRouteTransitionWhere({ id: 'route-1', orgId: 'org-1', updatedAt })).toEqual({
      id: 'route-1',
      orgId: 'org-1',
      status: 'DRAFT',
      updatedAt,
    })
  })

  it('fails closed when a concurrent write consumed or changed the draft', () => {
    expect(() => assertSingleDraftRouteTransition(0)).toThrowError(expect.objectContaining({ statusCode: 409 }))
    expect(() => assertSingleDraftRouteTransition(2)).toThrowError(expect.objectContaining({ statusCode: 409 }))
    expect(() => assertSingleDraftRouteTransition(1)).not.toThrow()
  })
})
