import { describe, expect, it } from 'vitest'
import { approvalReviewBlocker, singleAdminApprovalConfirmation } from '../src/modules/approvals/approval-rules.js'

describe('approval review rules', () => {
  it('requires a pending request and a different reviewer', () => {
    expect(approvalReviewBlocker({ status: 'PENDING', requestedById: 'requester', reviewerId: 'reviewer' })).toBeNull()
    expect(approvalReviewBlocker({ status: 'PENDING', requestedById: 'same', reviewerId: 'same' })).toBe('A requester cannot decide their own request.')
    expect(approvalReviewBlocker({ status: 'APPROVED', requestedById: 'requester', reviewerId: 'reviewer' })).toBe('Only a pending approval can be decided.')
  })

  it('allows an explicitly confirmed self-review only for single-admin mode', () => {
    const base = { status: 'PENDING', requestedById: 'same', reviewerId: 'same' }
    expect(approvalReviewBlocker({ ...base, allowSingleAdminSelfReview: true })).toBe('Single-admin review requires explicit confirmation.')
    expect(approvalReviewBlocker({ ...base, allowSingleAdminSelfReview: true, singleAdminConfirmed: true })).toBeNull()
    expect(singleAdminApprovalConfirmation('approval-1')).toBe('CONFIRM_SINGLE_ADMIN_APPROVAL:approval-1')
  })
})
