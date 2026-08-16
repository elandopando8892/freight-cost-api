export type DraftRouteRevision = {
  id: string
  orgId: string
  updatedAt: Date
}

/**
 * Optimistic concurrency boundary shared by draft edits and the irreversible
 * transition into production. Any intervening write changes updatedAt and
 * makes the guarded update affect zero rows.
 */
export function draftRouteTransitionWhere(route: DraftRouteRevision) {
  return {
    id: route.id,
    orgId: route.orgId,
    status: 'DRAFT' as const,
    updatedAt: route.updatedAt,
  }
}

export function assertSingleDraftRouteTransition(count: number) {
  if (count !== 1) {
    throw Object.assign(
      new Error('The route changed while it was being reviewed. Reload it and repeat the transition.'),
      { statusCode: 409 },
    )
  }
}
