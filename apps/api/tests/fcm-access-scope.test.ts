import { expect, it } from 'vitest'
import { assertFcmAccess, assertFcmUserLink, parseFcmAccessScope } from '../src/modules/auth/fcm-access-scope.js'

const users = [
  { email: 'sales@heymarksman.com', subject: '00000000-0000-4000-8000-000000000001' },
  { email: 'jgonzalez@xbfreight.com', subject: '00000000-0000-4000-8000-000000000002' },
]
const raw = JSON.stringify({ version: 1, users })
it('accepts exactly the approved recipients bound to distinct permanent UUIDs', () => {
  expect(parseFcmAccessScope(raw)).toEqual({ version: 1, users })
  expect(assertFcmAccess({ sub: users[1].subject, email: 'JGONZALEZ@XBFREIGHT.COM' }, { FCM_AUTH_ACCESS_SCOPE: raw }))
    .toEqual({ email: 'jgonzalez@xbfreight.com', subject: '00000000-0000-4000-8000-000000000002' })
})
it.each(['', '{}', 'null', '{', JSON.stringify({ version: 2, users }),
  JSON.stringify({ version: 1, users: users.slice(0, 1) }),
  JSON.stringify({ version: 1, users: [users[0], users[0]] }),
  JSON.stringify({ version: 1, users: [users[0], { ...users[1], subject: users[0].subject }] }),
  JSON.stringify({ version: 1, users: [users[0], { ...users[1], email: 'historic@example.test' }] }),
  JSON.stringify({ version: 1, users: [users[0], { ...users[1], subject: 'invented' }] }),
  JSON.stringify({ version: 1, users, role: 'ADMIN' }),
  JSON.stringify({ version: 1, users: [users[0], { ...users[1], role: 'ADMIN' }] }),
])('fails closed on invalid or widened policy %s', value => expect(() => parseFcmAccessScope(value)).toThrow())
it.each([
  { sub: '00000000-0000-4000-8000-000000000003', email: users[0].email },
  { sub: users[0].subject, email: 'historic@example.test' },
  { sub: users[0].subject, email: users[1].email },
  { sub: users[0].subject, user_metadata: { email: users[0].email, role: 'ADMIN' } },
])('rejects subject/email swaps and editable metadata', claims => {
  expect(() => assertFcmAccess(claims, { FCM_AUTH_ACCESS_SCOPE: raw })).toThrow('FCM_ACCESS_NOT_AUTHORIZED')
})
it.each([{ VERCEL_ENV: 'production' }, { FCM_AUTH_SCOPE_REQUIRED: 'true' }, { FCM_AUTH_SCOPE_REQUIRED: 'invalid' }])
  ('does not allow a required scope to fall back to SaaS signup', env => expect(() => assertFcmAccess({}, env)).toThrow())
it('keeps non-production unscoped compatibility without claiming restricted access', () => {
  expect(assertFcmAccess({}, {})).toBe(null)
})
it('requires the stored link to match the approved subject and email', () => {
  expect(() => assertFcmUserLink(users[0], { supabaseId: users[0].subject, email: users[0].email })).not.toThrow()
  expect(() => assertFcmUserLink(users[0], { supabaseId: users[1].subject, email: users[0].email })).toThrow()
  expect(() => assertFcmUserLink(users[0], { supabaseId: users[0].subject, email: users[1].email })).toThrow()
})
