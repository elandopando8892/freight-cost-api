import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { backupPostgresTransition } from '../scripts/lib/postgres-backup-transport.js'
import type { TransitionInspectionOptions } from '../scripts/lib/postgres-transition-inspection.js'
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex')
const container = process.env.FCM_BACKUP_TEST_CONTAINER
const source: TransitionInspectionOptions = { mode: 'LOCAL_REHEARSAL', databaseUrl: 'postgresql://postgres:local-synthetic-only@127.0.0.1:12345/fcm_adapter_backup', expectedTargetFingerprint: sha('127.0.0.1/fcm_adapter_backup'), migrationRole: 'postgres', runtimeRoles: ['fcm_backup_app'] }
const base = () => ({ source, container: 'fcm-backup-client-202610090001', containerId: 'a'.repeat(64), directory: 'D:/andre/validation/not-created', expiresAt: new Date(Date.now() + 600000).toISOString() })
it('refuses an unowned container before reserving or connecting', async () => {
  await expect(backupPostgresTransition({ ...base(), container: 'unrelated' })).rejects.toThrow('BACKUP_CLIENT_INVALID')
})
it.each(['expired', 'aborted'])('refuses %s before reserving or connecting', async kind => {
  const options = base()
  if (kind === 'expired') options.expiresAt = '2000-01-01T00:00:00Z'
  await expect(backupPostgresTransition({ ...options, ...(kind === 'aborted' ? { signal: AbortSignal.abort() } : {}) })).rejects.toThrow('BACKUP_WINDOW_CLOSED')
})
describe.skipIf(!container)('owned PostgreSQL archive and recovery', () => {
  let containerId: string
  const docker = (...args: string[]) => execFileSync('docker', args, { encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim()
  const sql = (body: string, db = 'fcm_adapter_backup') => execFileSync('docker', ['exec', '-i', container!, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', db], { input: body, encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim()
  const options = () => ({ ...base(), container: container!, containerId, directory: mkdtempSync('D:/andre/validation/fcm-backup-test-') })
  beforeAll(() => {
    if (!/^fcm-backup-client-[a-f0-9]{12}$/.test(container!)) throw new Error('FIXTURE_NOT_OWNED')
    if (docker('inspect', container!, '--format', '{{index .Config.Labels "fcm.disposable"}}') !== 'backup-transport-20261009') throw new Error('FIXTURE_NOT_OWNED')
    containerId = docker('inspect', container!, '--format', '{{.Id}}')
    const port = docker('port', container!, '5432/tcp').match(/^127\.0\.0\.1:(\d+)$/)?.[1]
    if (!port) throw new Error('FIXTURE_NOT_LOOPBACK')
    source.databaseUrl = `postgresql://postgres:local-synthetic-only@127.0.0.1:${port}/fcm_adapter_backup`
    sql('CREATE DATABASE fcm_adapter_backup; CREATE ROLE fcm_backup_app NOLOGIN;', 'postgres')
    sql(`CREATE TABLE "User"(id text PRIMARY KEY,"orgId" text,role text,email text,"kindeId" text,"supabaseId" text,amount numeric);
      INSERT INTO "User" VALUES('owner','original-org','ADMIN','synthetic@example.invalid','legacy',NULL,75000);
      CREATE TABLE "_prisma_migrations"(migration_name text,checksum text,finished_at timestamptz,rolled_back_at timestamptz,started_at timestamptz);
      CREATE SCHEMA costs; CREATE TABLE costs.items(id serial PRIMARY KEY, owner text REFERENCES "User"(id), amount numeric);
      INSERT INTO costs.items(owner,amount) VALUES('owner',75000); SELECT nextval('costs.items_id_seq');
      CREATE INDEX items_amount ON costs.items(amount); GRANT SELECT ON costs.items TO fcm_backup_app;`)
  }, 60000)
  it('exports a durable archive and restores rows, sequence, schema and ACL without changing source', async () => {
    const opts = options(), before = sql('SELECT to_jsonb(u)::text FROM "User" u')
    const result = await backupPostgresTransition(opts)
    expect(result).toMatchObject({ databaseObjectsVerified: true, clusterRolesVerified: false, databaseSettingsVerified: false, maintenanceEstablished: false, migrationAuthorized: false })
    expect(result.sourceDataHash).toBe(result.restoredDataHash)
    expect(result.sourceSchemaHash).toBe(result.restoredSchemaHash)
    expect(sha(readFileSync(result.archivePath))).toBe(result.archiveHash)
    expect(sql('SELECT to_jsonb(u)::text FROM "User" u')).toBe(before)
    expect(sql('SELECT last_value FROM costs.items_id_seq', result.restoreDatabase)).toBe('2')
    expect(sql('SELECT amount FROM costs.items', result.restoreDatabase)).toBe('75000')
    const count = sql("SELECT count(*) FROM pg_database WHERE datname LIKE 'fcm_restore_%'", 'postgres')
    await expect(backupPostgresTransition(opts)).rejects.toThrow('BACKUP_ALREADY_RESERVED')
    expect(sql("SELECT count(*) FROM pg_database WHERE datname LIKE 'fcm_restore_%'", 'postgres')).toBe(count)
    expect(readFileSync(resolve(opts.directory, source.expectedTargetFingerprint, 'backup.jsonl'), 'utf8')).toContain('VERIFIED')
  }, 180000)
  it('blocks unsafe source logins and retains a failed reservation without retry', async () => {
    const opts = options()
    sql('ALTER ROLE fcm_backup_app LOGIN')
    try { await expect(backupPostgresTransition(opts)).rejects.toThrow('BACKUP_STOPPED_REVIEW_JOURNAL') }
    finally { sql('ALTER ROLE fcm_backup_app NOLOGIN') }
    expect(readFileSync(resolve(opts.directory, source.expectedTargetFingerprint, 'backup.jsonl'), 'utf8')).toContain('UNCERTAIN')
    await expect(backupPostgresTransition(opts)).rejects.toThrow('BACKUP_ALREADY_RESERVED')
  }, 60000)
  it('does not adopt a container with a different id', async () => {
    await expect(backupPostgresTransition({ ...options(), containerId: 'b'.repeat(64) })).rejects.toThrow('BACKUP_STOPPED_REVIEW_JOURNAL')
  }, 30000)
})
