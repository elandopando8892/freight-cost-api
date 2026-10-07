import { expect, it } from 'vitest'
import { selectIdentityContacts } from '../scripts/lib/production-identity-contacts.js'

const targets = [{ id: 'historical-a', emailHash: 'a'.repeat(64), identityFingerprint: 'b'.repeat(64) }]
const records = [{ id: 'historical-a', email: 'owner@example.test', emailHash: 'a'.repeat(64), identityFingerprint: 'b'.repeat(64) },
  { id: 'unrelated', email: 'private@example.test', emailHash: 'c'.repeat(64), identityFingerprint: 'd'.repeat(64) }]

it('returns only pinned historical contacts, never unrelated rows or legacy identities', () => {
  expect(selectIdentityContacts(records, targets)).toEqual([{ id: 'historical-a', email: 'owner@example.test', emailHash: 'a'.repeat(64) }])
})

it.each([
  [records, []],
  [records, [...targets, ...targets]],
  [[], targets],
  [[{ ...records[0], emailHash: 'c'.repeat(64) }], targets],
  [[{ ...records[0], identityFingerprint: 'd'.repeat(64) }], targets],
  [[{ ...records[0], email: 'owner@example.test\n' }], targets],
])('rejects unsealed, missing, duplicated or drifted contacts', (rows, pins) => {
  expect(() => selectIdentityContacts(rows, pins)).toThrow()
})
