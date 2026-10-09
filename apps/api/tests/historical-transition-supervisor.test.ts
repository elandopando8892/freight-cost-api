import { mkdtempSync, readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { expect, it, vi } from 'vitest'
import { superviseHistoricalTransition, type TransitionContract, type HistoricalTransitionPort } from '../scripts/lib/historical-transition-supervisor.js'
import { buildHistoricalMigrationPackage } from '../scripts/lib/historical-migration-package.js'
import { FINALIZE_SUPABASE_IDENTITY } from '../scripts/lib/production-cutover-plan.js'

const hash = (s: string) => createHash('sha256').update(s).digest('hex')
const testDirectory = () => mkdtempSync(resolve(process.platform === 'win32' ? 'D:/andre/validation' : tmpdir(), 'fcm-supervisor-test-'))
const contract: TransitionContract = {
  version: 1, targetFingerprint: hash('synthetic-target'), releaseSha: 'a'.repeat(40),
  packageFingerprint: hash('package'), planFingerprint: hash('plan'),
  authorityReference: 'synthetic-test-authority', startsAt: '2026-10-08T12:00:00.000Z',
  expiresAt: '2026-10-08T12:30:00.000Z',
}
it('rejects an expired window before reserving or invoking any remote operation', async () => {
  const directory = testDirectory()
  let calls = 0
  const port = { inspect: async () => { calls++; throw new Error('must not run') } } as never
  await expect(superviseHistoricalTransition({ contract, directory, port,
    now: () => Date.parse('2026-10-08T12:30:00.000Z') })).rejects.toThrow('TRANSITION_WINDOW_CLOSED')
  expect(calls).toBe(0)
})

function fixture() {
  const artifacts = readdirSync('prisma/migrations', { withFileTypes: true }).filter(d => d.isDirectory()).map(d => {
    const sql = readFileSync(resolve('prisma/migrations', d.name, 'migration.sql'), 'utf8')
    return { name: d.name, sql, checksum: hash(sql) }
  }).sort((a, b) => a.name.localeCompare(b.name))
  const scope = { version: 1 as const, users: [
    { email: 'sales@heymarksman.com', subject: '00000000-0000-4000-8000-000000000001' },
    { email: 'jgonzalez@xbfreight.com', subject: '00000000-0000-4000-8000-000000000002' },
  ] }
  const input = { scope, artifacts,
    ledger: artifacts.slice(0, 33).map(a => ({ migration_name: a.name, checksum: a.checksum, finished_at: '2026-10-08T11:00:00Z', rolled_back_at: null })),
    users: [{ id: 'owner', orgId: 'original-org', role: 'ADMIN', emailHash: hash(scope.users[0].email), identityFingerprint: hash('full-row') }],
    authMatches: scope.users.map(u => ({ emailHash: hash(u.email), supabaseId: u.subject, verified: true })),
  }
  const schema = readFileSync('prisma/schema.prisma', 'utf8'), bundle = buildHistoricalMigrationPackage(input, schema)
  const approved = { ...contract, packageFingerprint: bundle.fingerprint, planFingerprint: bundle.planFingerprint }
  let time = Date.parse('2026-10-08T12:01:00Z')
  const binding = () => ({ ...approved, observedAt: new Date(time).toISOString(), maintenanceUntil: approved.expiresAt })
  const calls: string[] = []
  const port: HistoricalTransitionPort = {
    inspect: async () => { calls.push('inspect'); return { binding: binding(), input: structuredClone(input), schema } },
    backupAndRestore: async () => { calls.push('backup'); return { binding: binding(), archiveHash: hash('archive'),
      sourceDataHash: hash('original-data'), restoredDataHash: hash('original-data'), sourceSchemaHash: hash('schema'), restoredSchemaHash: hash('schema') } },
    migrateAndInspect: async () => { calls.push('migrate'); return { binding: binding(),
      ledger: [...input.ledger, ...artifacts.slice(33).filter(a => a.name !== FINALIZE_SUPABASE_IDENTITY)
        .map(a => ({ migration_name: a.name, checksum: a.checksum, finished_at: '2026-10-08T12:02:00Z', rolled_back_at: null }))],
      driftSql: 'DROP INDEX "User_kindeId_key"; ALTER TABLE "User" DROP COLUMN "kindeId";',
      preservedDataHash: hash('original-data'), originalLedgerRowsPreserved: true } },
  }
  const directory = testDirectory()
  return { port, calls, input, options: { contract: approved, directory, port, now: () => time },
    setTime: (value: string) => { time = Date.parse(value) },
    journal: () => readFileSync(resolve(directory, approved.targetFingerprint, 'events.jsonl'), 'utf8') }
}

it('persists completion and recovers it after restart without another migration', async () => {
  const f = fixture()
  expect(await superviseHistoricalTransition(f.options)).toMatchObject({ status: 'SCHEMA_VERIFIED', replayed: false,
    realLoginValidated: false, promotionValidated: false })
  const calls = [...f.calls]
  const replay = await superviseHistoricalTransition({ ...f.options, port: {} as HistoricalTransitionPort })
  expect(replay).toMatchObject({ status: 'SCHEMA_VERIFIED', replayed: true })
  expect(f.calls).toEqual(calls)
  expect(f.journal()).not.toContain('postgresql:')
})

it.each(['target', 'release', 'authority', 'stale', 'maintenance', 'schema', 'source'])('blocks mismatched %s before backup', async kind => {
  const f = fixture(), inspect = f.port.inspect
  f.port.inspect = async (c, signal) => {
    const r = await inspect(c, signal)
    if (kind === 'target') r.binding.targetFingerprint = hash('other')
    if (kind === 'release') r.binding.releaseSha = 'b'.repeat(40)
    if (kind === 'authority') r.binding.authorityReference = 'other'
    if (kind === 'stale') r.binding.observedAt = '2026-10-08T11:00:00Z'
    if (kind === 'maintenance') r.binding.maintenanceUntil = '2026-10-08T12:10:00Z'
    if (kind === 'schema') r.schema += '\n// changed source\n'
    if (kind === 'source') r.input.users[0].orgId = 'other-org'
    return r
  }
  await expect(superviseHistoricalTransition(f.options)).rejects.toThrow('TRANSITION_STOPPED_REVIEW_JOURNAL')
  expect(f.calls).toEqual(['inspect'])
})

it.each(['restore', 'expiry', 'clock', 'inventory'])('blocks %s after backup without launching migration', async kind => {
  const f = fixture(), backup = f.port.backupAndRestore
  f.port.backupAndRestore = async (c, signal) => {
    const r = await backup(c, signal)
    if (kind === 'restore') r.restoredDataHash = hash('lost-data')
    if (kind === 'expiry') f.setTime('2026-10-08T12:30:00Z')
    if (kind === 'clock') f.setTime('2026-10-08T12:00:30Z')
    if (kind === 'inventory') f.input.users[0].identityFingerprint = hash('concurrent-write')
    return r
  }
  await expect(superviseHistoricalTransition(f.options)).rejects.toThrow('TRANSITION_STOPPED_REVIEW_JOURNAL')
  expect(f.calls).not.toContain('migrate')
})

it.each(['failure', 'data', 'ledger', 'drift', 'expiry'])('retains uncertainty after %s and rejects a new authority on the same target', async kind => {
  const f = fixture(), migrate = f.port.migrateAndInspect
  f.port.migrateAndInspect = async (c, b, signal) => {
    const r = await migrate(c, b, signal)
    if (kind === 'failure') throw new Error('postgresql://secret:password@private/db')
    if (kind === 'data') r.preservedDataHash = hash('changed-economy')
    if (kind === 'ledger') r.originalLedgerRowsPreserved = false
    if (kind === 'drift') r.driftSql += 'DROP TABLE "User";'
    if (kind === 'expiry') f.setTime('2026-10-08T12:30:00Z')
    return r
  }
  await expect(superviseHistoricalTransition(f.options)).rejects.toThrow('TRANSITION_STOPPED_REVIEW_JOURNAL')
  expect(f.journal()).toContain('MIGRATION_UNCERTAIN')
  expect(f.journal()).not.toContain('SCHEMA_VERIFIED')
  expect(f.journal()).not.toContain('secret')
  f.setTime('2026-10-08T12:31:00Z')
  await expect(superviseHistoricalTransition({ ...f.options, contract: { ...f.options.contract,
    authorityReference: 'new-reference', expiresAt: '2026-10-08T13:00:00Z' } })).rejects.toThrow('TRANSITION_ALREADY_ATTEMPTED')
  expect(f.calls.filter(c => c === 'migrate')).toHaveLength(1)
})

it('reserves the target before an asynchronous inspection so concurrent attempts cannot launch', async () => {
  const f = fixture(), inspect = f.port.inspect
  let release!: () => void
  const paused = new Promise<void>(r => { release = r })
  f.port.inspect = async (c, signal) => { await paused; return inspect(c, signal) }
  const first = superviseHistoricalTransition(f.options)
  await expect(superviseHistoricalTransition(f.options)).rejects.toThrow('TRANSITION_ALREADY_ATTEMPTED')
  release()
  expect((await first).status).toBe('SCHEMA_VERIFIED')
  expect(f.calls.filter(c => c === 'migrate')).toHaveLength(1)
})

it('does not replay completion from a later clock value', async () => {
  const f = fixture()
  await superviseHistoricalTransition(f.options)
  f.setTime('2026-10-08T12:00:30Z')
  await expect(superviseHistoricalTransition(f.options)).rejects.toThrow('TRANSITION_ALREADY_ATTEMPTED')
  expect(f.calls.filter(c => c === 'migrate')).toHaveLength(1)
})

it('bounds a hung adapter, signals cancellation and retains the uncertain reservation', async () => {
  vi.useFakeTimers()
  try {
    const f = fixture()
    let signal: AbortSignal | undefined
    f.port.backupAndRestore = async (_c, supplied) => { signal = supplied; return new Promise(() => {}) }
    const pending = expect(superviseHistoricalTransition(f.options)).rejects.toThrow('TRANSITION_STOPPED_REVIEW_JOURNAL')
    await vi.advanceTimersByTimeAsync(120000)
    await pending
    expect(signal?.aborted).toBe(true)
    expect(f.journal()).toContain('BACKUP_UNCERTAIN')
    await expect(superviseHistoricalTransition(f.options)).rejects.toThrow('TRANSITION_ALREADY_ATTEMPTED')
    expect(f.calls).not.toContain('migrate')
  } finally { vi.useRealTimers() }
})
