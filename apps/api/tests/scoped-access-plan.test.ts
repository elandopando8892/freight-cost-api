import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
import { buildScopedAccessPlan } from '../scripts/lib/scoped-access-plan.js'
const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const scope = { version: 1 as const, users: [
  { email: 'sales@heymarksman.com', subject: '00000000-0000-4000-8000-000000000001' },
  { email: 'jgonzalez@xbfreight.com', subject: '00000000-0000-4000-8000-000000000002' },
] }
const row = (id: string, email: string, orgId = 'original-org', role = 'ADMIN') => ({ id, emailHash: sha(email), orgId, role, identityFingerprint: sha('complete-' + id) })
const fixture = () => ({ scope: structuredClone(scope), users: [row('sales-old', scope.users[0].email), row('history', 'history@example.test')],
  authMatches: scope.users.map(u => ({ emailHash: sha(u.email), supabaseId: u.subject, verified: true })) })
it('preserves complete historical records without requiring or proposing new Auth accounts', () => {
  const input = fixture(), original = structuredClone(input)
  const plan = buildScopedAccessPlan(input)
  expect(plan.reviewReady).toBe(true)
  expect(plan.proposedExistingMappings).toEqual([{ ...input.users[0], supabaseId: '00000000-0000-4000-8000-000000000001' }])
  expect(plan.historicalUsers).toEqual([input.users[1]])
  expect(plan.membershipRequired).toEqual([{ emailHash: sha('jgonzalez@xbfreight.com'), supabaseId: '00000000-0000-4000-8000-000000000002' }])
  expect(plan.historicalFinalizationBlocked).toBe(true)
  expect(plan.writesAuthorized).toBe(false)
  expect(input).toEqual(original)
})
it('does not invent roles or tenants when an approved recipient is missing from FCM', () => {
  const plan = buildScopedAccessPlan(fixture())
  expect(plan.membershipRequired[0]).not.toHaveProperty('role')
  expect(plan.membershipRequired[0]).not.toHaveProperty('orgId')
})
it.each(['missing', 'unverified', 'wrong-subject', 'duplicate-auth', 'duplicate-inventory'])('blocks %s without partial mappings', kind => {
  const input = fixture()
  if (kind === 'missing') input.authMatches.pop()
  if (kind === 'unverified') input.authMatches[0].verified = false
  if (kind === 'wrong-subject') input.authMatches[0].supabaseId = scope.users[1].subject
  if (kind === 'duplicate-auth') input.authMatches.push({ ...input.authMatches[0] })
  if (kind === 'duplicate-inventory') input.users.push({ ...input.users[0] })
  const plan = buildScopedAccessPlan(input)
  expect(plan.reviewReady).toBe(false)
  expect(plan.issues.length).toBeGreaterThan(0)
  expect(plan.proposedExistingMappings).toEqual([])
  expect(plan.membershipRequired).toEqual([])
})
it('binds excluded historical rows and policy into the review fingerprint', () => {
  const input = fixture(), before = buildScopedAccessPlan(input).inventoryFingerprint
  input.users[1].role = 'VIEWER'
  expect(buildScopedAccessPlan(input).inventoryFingerprint).not.toBe(before)
  const changed = buildScopedAccessPlan(input).inventoryFingerprint
  input.scope.users[0].subject = '00000000-0000-4000-8000-000000000003'
  expect(buildScopedAccessPlan(input).inventoryFingerprint).not.toBe(changed)
})
