import { describe, expect, it } from 'vitest'
import { approvalReviewBlocker } from '../src/modules/approvals/approval-rules.js'

describe('approval review rules', () => {
  it('requires a pending request and a different reviewer', () => {
    expect(approvalReviewBlocker({ status: 'PENDING', requestedById: 'requester', reviewerId: 'reviewer' })).toBeNull()
    expect(approvalReviewBlocker({ status: 'PENDING', requestedById: 'same', reviewerId: 'same' })).toBe('A requester cannot decide their own request.')
    expect(approvalReviewBlocker({ status: 'APPROVED', requestedById: 'requester', reviewerId: 'reviewer' })).toBe('Only a pending approval can be decided.')
  })
})
