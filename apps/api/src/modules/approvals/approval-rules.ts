export const singleAdminApprovalConfirmation = (approvalId: string) =>
  `CONFIRM_SINGLE_ADMIN_APPROVAL:${approvalId}`

export function approvalReviewBlocker(input: {
  status: string
  requestedById: string
  reviewerId: string
  allowSingleAdminSelfReview?: boolean
  singleAdminConfirmed?: boolean
}) {
  if (input.status !== 'PENDING') return 'Only a pending approval can be decided.'
  if (input.requestedById === input.reviewerId) {
    if (!input.allowSingleAdminSelfReview) return 'A requester cannot decide their own request.'
    if (!input.singleAdminConfirmed) return 'Single-admin review requires explicit confirmation.'
  }
  return null
}
