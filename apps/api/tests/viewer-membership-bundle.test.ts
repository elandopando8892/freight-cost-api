import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
import { buildViewerMembershipBundle, type ViewerMembershipInput } from '../scripts/lib/viewer-membership-bundle.js'
const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const fixture = (): ViewerMembershipInput => ({
  scope: { version: 1, users: [
    { email: 'sales@heymarksman.com', subject: '00000000-0000-4000-8000-000000000001' },
    { email: 'jgonzalez@xbfreight.com', subject: '00000000-0000-4000-8000-000000000002' },
  ] },
  users: [{ id: 'sales-original', orgId: 'original-org', role: 'ADMIN', emailHash: sha('sales@heymarksman.com'), identityFingerprint: sha('complete-sales') },
    { id: 'historic', orgId: 'original-org', role: 'ADMIN', emailHash: sha('history@example.invalid'), identityFingerprint: sha('complete-history') }],
  authMatches: [
    { emailHash: sha('sales@heymarksman.com'), supabaseId: '00000000-0000-4000-8000-000000000001', verified: true },
    { emailHash: sha('jgonzalez@xbfreight.com'), supabaseId: '00000000-0000-4000-8000-000000000002', verified: true },
  ], memberId: 'new-viewer-id', authorityReference: 'synthetic-approval', promotedPairReference: 'synthetic-paired-supabase-release',
})
it('prepares only a viewer in the original owner tenant, with no write authorization', () => {
  const input = fixture(), before = structuredClone(input), plan = buildViewerMembershipBundle(input)
  expect(plan.member).toEqual({ id: 'new-viewer-id', orgId: 'original-org', email: 'jgonzalez@xbfreight.com',
    supabaseId: '00000000-0000-4000-8000-000000000002', role: 'VIEWER' })
  expect(plan.writesAuthorized).toBe(false)
  expect(plan.applyOnlyAfterPromotion).toBe(true)
  expect(plan.fingerprint).toMatch(/^[a-f0-9]{64}$/)
  expect(input).toEqual(before)
})
it.each(['unverified', 'missing-owner', 'colliding-id', 'missing-authority', 'missing-promotion'])('rejects %s before producing SQL', kind => {
  const input = fixture()
  if (kind === 'unverified') input.authMatches[1].verified = false
  if (kind === 'missing-owner') input.users.shift()
  if (kind === 'colliding-id') input.memberId = 'historic'
  if (kind === 'missing-authority') input.authorityReference = ''
  if (kind === 'missing-promotion') input.promotedPairReference = ''
  expect(() => buildViewerMembershipBundle(input)).toThrow()
})
