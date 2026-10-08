import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'
import { buildHistoricalCutoverPlan, PRESERVE_HISTORICAL_AUTHORS } from '../scripts/lib/historical-cutover-plan.js'
import { FINALIZE_SUPABASE_IDENTITY } from '../scripts/lib/production-cutover-plan.js'
const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const fixture = () => {
  const scope = { version: 1 as const, users: [
    { email: 'sales@heymarksman.com', subject: '00000000-0000-4000-8000-000000000001' },
    { email: 'jgonzalez@xbfreight.com', subject: '00000000-0000-4000-8000-000000000002' },
  ] }
  const artifacts = readdirSync(resolve('prisma/migrations'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => {
    const sql = readFileSync(resolve('prisma/migrations', d.name, 'migration.sql'), 'utf8')
    return { name: d.name, sql, checksum: sha(sql), checksumVariants: [sha(sql.replace(/\r\n/g, '\n'))] }
  })
  return { scope, artifacts, ledger: [] as { migration_name: string; checksum: string; finished_at: string | null; rolled_back_at: string | null }[],
    users: [
      { id: 'owner', orgId: 'original-org', role: 'ADMIN', emailHash: sha('sales@heymarksman.com'), identityFingerprint: sha('full-owner') },
      { id: 'history', orgId: 'historic-org', role: 'ADMIN', emailHash: sha('historical@example.invalid'), identityFingerprint: sha('full-historical') },
    ], authMatches: scope.users.map(u => ({ emailHash: sha(u.email), supabaseId: u.subject, verified: true })) }
}
it('plans source migrations without activating historical actors or authorizing writes', () => {
  const input = fixture(), before = structuredClone(input), plan = buildHistoricalCutoverPlan(input)
  expect(plan.reviewReady).toBe(true)
  expect(plan.pendingMigrations.map(m => m.name)).not.toContain(FINALIZE_SUPABASE_IDENTITY)
  expect(plan.pendingMigrations.map(m => m.name)).toContain(PRESERVE_HISTORICAL_AUTHORS)
  expect(plan.deferredFinalize?.name).toBe(FINALIZE_SUPABASE_IDENTITY)
  expect(plan.existingMappings.map(m => m.id)).toEqual(['owner'])
  expect(plan.historicalUsers.map(m => m.id)).toEqual(['history'])
  expect(plan.membershipRequired).toEqual([{ emailHash: sha('jgonzalez@xbfreight.com'), supabaseId: '00000000-0000-4000-8000-000000000002' }])
  expect(plan.writesAuthorized).toBe(false)
  expect(input).toEqual(before)
})
it.each(['unknown', 'unfinished', 'duplicate', 'checksum', 'nullable-missing', 'nullable-changed', 'final-applied', 'unverified', 'empty-owner'])('blocks %s without partial executable work', kind => {
  const input = fixture(), file = input.artifacts[0]
  const record = { migration_name: file.name, checksum: file.checksum, finished_at: '2026-10-08T10:00:00Z', rolled_back_at: null }
  if (kind === 'unknown') input.ledger.push({ ...record, migration_name: '20261008000000_unknown' })
  if (kind === 'unfinished') input.ledger.push({ ...record, finished_at: null })
  if (kind === 'duplicate') input.ledger.push(record, record)
  if (kind === 'checksum') input.ledger.push({ ...record, checksum: sha('changed') })
  if (kind === 'nullable-missing') input.artifacts = input.artifacts.filter(m => m.name !== PRESERVE_HISTORICAL_AUTHORS)
  if (kind === 'nullable-changed') { const m = input.artifacts.find(m => m.name === PRESERVE_HISTORICAL_AUTHORS)!; m.sql += '\nDELETE FROM "User";'; m.checksum = sha(m.sql) }
  if (kind === 'final-applied') { const m = input.artifacts.find(m => m.name === FINALIZE_SUPABASE_IDENTITY)!; input.ledger.push({ ...record, migration_name: m.name, checksum: m.checksum }) }
  if (kind === 'unverified') input.authMatches[0].verified = false
  if (kind === 'empty-owner') input.users.shift()
  const plan = buildHistoricalCutoverPlan(input)
  expect(plan.reviewReady).toBe(false)
  expect(plan.pendingMigrations).toEqual([])
  expect(plan.existingMappings).toEqual([])
  expect(plan.membershipRequired).toEqual([])
  expect(plan.writesAuthorized).toBe(false)
})
it('retains rolled-back attempts and every historical full-row change in the fingerprint', () => {
  const input = fixture(), before = buildHistoricalCutoverPlan(input)
  input.ledger.push({ migration_name: 'old-rolled-back', checksum: sha('old'), finished_at: null, rolled_back_at: '2026-10-08T10:00:00Z' })
  const historical = buildHistoricalCutoverPlan(input)
  expect(historical.reviewReady).toBe(true)
  expect(historical.planFingerprint).not.toBe(before.planFingerprint)
  input.users[1].identityFingerprint = sha('changed historic business fields')
  expect(buildHistoricalCutoverPlan(input).planFingerprint).not.toBe(historical.planFingerprint)
})
it('omits applied additive migrations and remains stable across ordering', () => {
  const input = fixture(), file = input.artifacts.find(m => m.name !== FINALIZE_SUPABASE_IDENTITY)!
  input.ledger.push({ migration_name: file.name, checksum: file.checksum, finished_at: '2026-10-08T10:00:00Z', rolled_back_at: null })
  const before = buildHistoricalCutoverPlan(input)
  expect(before.pendingMigrations.map(m => m.name)).not.toContain(file.name)
  input.artifacts.reverse(); input.users.reverse(); input.authMatches.reverse()
  expect(buildHistoricalCutoverPlan(input).planFingerprint).toBe(before.planFingerprint)
})
