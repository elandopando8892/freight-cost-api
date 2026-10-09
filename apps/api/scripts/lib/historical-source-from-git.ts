import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import type { CutoverMigrationArtifact } from './production-cutover-plan.js'

const sha = (value: string) => createHash('sha256').update(value).digest('hex')

/** Read immutable Git blobs, not a caller-supplied SQL list or the dirty worktree.
 * This establishes source provenance only; a commit hash is not consent.
 * Does not materialize files, run SQL, checkout a branch or contact a remote. */
export function readHistoricalSourceFromGit(repository: string, releaseSha: string) {
  if (!/^[a-f0-9]{40}$/.test(releaseSha)) throw new Error('HISTORICAL_SOURCE_FULL_SHA_REQUIRED')
  const git = (...args: string[]) => {
    try { return execFileSync('git', ['-C', repository, ...args], {
      encoding: 'utf8', windowsHide: true, timeout: 10000, maxBuffer: 4 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    }) } catch { throw new Error('HISTORICAL_SOURCE_GIT_FAILED') }
  }
  if (git('rev-parse', 'HEAD').trim() !== releaseSha) throw new Error('HISTORICAL_SOURCE_HEAD_MISMATCH')
  const base = `${releaseSha}:apps/api/prisma/`
  const schema = git('cat-file', 'blob', base + 'schema.prisma')
  const lock = git('cat-file', 'blob', base + 'migrations/migration_lock.toml')
  if (lock.replace(/#[^\r\n]*/g, '').trim() !== 'provider = "postgresql"') throw new Error('HISTORICAL_SOURCE_LOCK_INVALID')
  const entries = git('ls-tree', base + 'migrations').trim().split('\n')
  const artifacts: CutoverMigrationArtifact[] = []
  for (const row of entries) {
    const match = row.match(/^040000 tree [a-f0-9]{40}\t(\d{14}_[a-z0-9_]+)$/)
    if (!match) {
      if (!/^100644 blob [a-f0-9]{40}\tmigration_lock\.toml$/.test(row)) throw new Error('HISTORICAL_SOURCE_TREE_INVALID')
      continue
    }
    const name = match[1], tree = git('ls-tree', base + `migrations/${name}`).trim()
    if (!/^100644 blob [a-f0-9]{40}\tmigration\.sql$/.test(tree)) throw new Error('HISTORICAL_SOURCE_MIGRATION_TREE_INVALID')
    const sql = git('cat-file', 'blob', base + `migrations/${name}/migration.sql`), lf = sql.replace(/\r\n/g, '\n')
    artifacts.push({ name, sql, checksum: sha(sql), checksumVariants: [...new Set([sha(lf), sha(lf.replace(/\n/g, '\r\n'))])] })
  }
  if (artifacts.length === 0) throw new Error('HISTORICAL_SOURCE_EMPTY')
  artifacts.sort((a, b) => a.name.localeCompare(b.name))
  // Ref changes during inspection must not be silently combined with the blobs.
  if (git('rev-parse', 'HEAD').trim() !== releaseSha) throw new Error('HISTORICAL_SOURCE_HEAD_MISMATCH')
  return { releaseSha, schema, artifacts, sourceFingerprint: sha(JSON.stringify({ releaseSha, schema: sha(schema),
    lock: sha(lock), migrations: artifacts.map(a => [a.name, a.checksum]) })), writesPerformed: false as const }
}
