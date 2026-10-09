import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
import { readHistoricalSourceFromGit } from '../scripts/lib/historical-source-from-git.js'
import { buildHistoricalMigrationPackage } from '../scripts/lib/historical-migration-package.js'
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true }).trim()
const repository = git('rev-parse', '--show-toplevel'), release = git('rev-parse', 'HEAD')
const sha = (s: string) => createHash('sha256').update(s).digest('hex')

it('assembles the real historical package using only immutable release blobs', () => {
  const source = readHistoricalSourceFromGit(repository, release)
  expect(source.artifacts).toHaveLength(47)
  const scope = { version: 1 as const, users: [
    { email: 'sales@heymarksman.com', subject: '00000000-0000-4000-8000-000000000001' },
    { email: 'jgonzalez@xbfreight.com', subject: '00000000-0000-4000-8000-000000000002' },
  ] }
  const bundle = buildHistoricalMigrationPackage({ artifacts: source.artifacts, scope,
    ledger: source.artifacts.slice(0, 33).map(a => ({ migration_name: a.name, checksum: a.checksum, finished_at: '2026-10-09T12:00:00Z', rolled_back_at: null })),
    users: [{ id: 'owner', orgId: 'org', role: 'ADMIN', emailHash: sha(scope.users[0].email), identityFingerprint: sha('synthetic-full-row') }],
    authMatches: scope.users.map(u => ({ emailHash: sha(u.email), supabaseId: u.subject, verified: true })),
  }, source.schema)
  expect(bundle.pendingNames).toHaveLength(13)
  expect(bundle.files).toHaveLength(48)
  expect(source.writesPerformed).toBe(false)
  expect(bundle.writesAuthorized).toBe(false)
  expect(git('rev-parse', 'HEAD')).toBe(release)
}, 60000)

it.each(['HEAD', release.slice(0, 7), '0'.repeat(40)])('rejects an unpinned or different revision %s', revision => {
  expect(() => readHistoricalSourceFromGit(repository, revision)).toThrow(/HISTORICAL_SOURCE_/)
})
