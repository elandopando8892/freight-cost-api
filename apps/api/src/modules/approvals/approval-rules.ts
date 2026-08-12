export function approvalReviewBlocker(input: { status: string; requestedById: string; reviewerId: string }) {
  if (input.status !== 'PENDING') return 'Only a pending approval can be decided.'
  if (input.requestedById === input.reviewerId) return 'A requester cannot decide their own request.'
  return null
}
