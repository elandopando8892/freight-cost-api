import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { PrismaClient } from '@prisma/client'
import { beforeAll, describe, expect, it } from 'vitest'
import { inspectPostgresTransition, type TransitionInspectionOptions } from '../scripts/lib/postgres-transition-inspection.js'
const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const container = process.env.FCM_INSPECTION_TEST_CONTAINER
const invalid = { mode: 'NEON' as const, databaseUrl: 'postgresql://migrator:synthetic-secret@example.invalid/db',
  expectedTargetFingerprint: sha('example.invalid/db'), migrationRole: 'migrator', runtimeRoles: ['app'] }

it.each(['host', 'pin', 'override', 'duplicate', 'shared-role'])('refuses %s before connecting and never echoes credentials', async kind => {
  const url = new URL('postgresql://migrator:synthetic-secret@ep-fixture.neon.tech/db')
  const options = { ...invalid, databaseUrl: url.toString(), expectedTargetFingerprint: sha(url.hostname + url.pathname) }
  if (kind === 'host') url.hostname = 'example.invalid'
  if (kind === 'pin') options.expectedTargetFingerprint = sha('different')
  if (kind === 'override') url.searchParams.set('host', '/other/socket')
  if (kind === 'duplicate') url.search = '?sslmode=require&sslmode=disable'
  if (kind === 'shared-role') options.runtimeRoles = ['migrator']
  options.databaseUrl = url.toString()
  await expect(inspectPostgresTransition(options)).rejects.toThrow('TRANSITION_INSPECTION_TARGET_INVALID')
})

describe.skipIf(!container)('read-only adapter against owned PostgreSQL', () => {
  let options: TransitionInspectionOptions, baseline: string
  const sql = (body: string, database = 'fcm_adapter_inspection') => execFileSync('docker',
    ['exec', '-i', container!, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', database],
    { input: body, encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim()
  beforeAll(() => {
    if (!/^fcm-adapter-inspection-[a-f0-9]{12}$/.test(container!)) throw new Error('FIXTURE_NOT_OWNED')
    const label = execFileSync('docker', ['inspect', container!, '--format', '{{index .Config.Labels "fcm.disposable"}}'], { encoding: 'utf8', windowsHide: true }).trim()
    if (label !== 'adapter-inspection-20261009') throw new Error('FIXTURE_NOT_OWNED')
    const mapping = execFileSync('docker', ['port', container!, '5432/tcp'], { encoding: 'utf8', windowsHide: true }).trim()
    const port = mapping.match(/^127\.0\.0\.1:(\d+)$/)?.[1]
    if (!port) throw new Error('FIXTURE_NOT_LOOPBACK')
    sql('CREATE DATABASE fcm_adapter_inspection; CREATE ROLE fcm_app NOLOGIN;', 'postgres')
    sql(`CREATE TABLE "User"(id text PRIMARY KEY,"orgId" text,role text,email text,"kindeId" text,"supabaseId" text,amount numeric);
      INSERT INTO "User" VALUES('owner','original-org','ADMIN','sales@heymarksman.com','legacy',NULL,75000);
      CREATE TABLE "_prisma_migrations"(migration_name text,checksum text,finished_at timestamptz,rolled_back_at timestamptz,started_at timestamptz);
      INSERT INTO "_prisma_migrations" VALUES('synthetic_baseline','${sha('baseline')}',CURRENT_TIMESTAMP,NULL,CURRENT_TIMESTAMP);`)
    options = { mode: 'LOCAL_REHEARSAL', databaseUrl: `postgresql://postgres:local-synthetic-only@127.0.0.1:${port}/fcm_adapter_inspection`,
      expectedTargetFingerprint: sha('127.0.0.1/fcm_adapter_inspection'), migrationRole: 'postgres', runtimeRoles: ['fcm_app'] }
    baseline = sql('SELECT to_jsonb(u)::text FROM "User" u')
  }, 60000)

  it('reads full inventory in a read-only transaction without establishing maintenance or authorizing writes', async () => {
    const result = await inspectPostgresTransition(options)
    expect(result).toMatchObject({ inspectionPassed: true, writesPerformed: false, maintenanceEstablished: false, migrationAuthorized: false })
    expect(result.users[0]).toMatchObject({ id: 'owner', orgId: 'original-org', role: 'ADMIN', emailHash: sha('sales@heymarksman.com') })
    expect(result.ledger).toHaveLength(1)
    expect(sql('SELECT to_jsonb(u)::text FROM "User" u')).toBe(baseline)
  }, 30000)

  it('blocks enabled application logins even without an active session', async () => {
    sql('ALTER ROLE fcm_app LOGIN')
    try {
      const result = await inspectPostgresTransition(options)
      expect(result.issues).toContain('RUNTIME_LOGIN_STILL_ENABLED')
      expect(result.issues).toContain('OTHER_LOGIN_CAN_CONNECT')
      expect(result.users).toEqual([])
    } finally { sql('ALTER ROLE fcm_app NOLOGIN') }
  }, 30000)

  it('NOLOGIN does not hide or terminate an already connected application session', async () => {
    sql("ALTER ROLE fcm_app LOGIN PASSWORD 'local-synthetic-only'")
    const appUrl = new URL(options.databaseUrl); appUrl.username = 'fcm_app'
    const other = new PrismaClient({ datasourceUrl: appUrl.toString(), log: [] })
    try {
      const [first] = await other.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      sql('ALTER ROLE fcm_app NOLOGIN')
      const result = await inspectPostgresTransition(options)
      expect(result.issues).toContain('OTHER_CLIENT_SESSIONS_PRESENT')
      expect(result.issues).not.toContain('RUNTIME_LOGIN_STILL_ENABLED')
      const [last] = await other.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      expect(last.pid).toBe(first.pid)
    } finally { await other.$disconnect(); sql('ALTER ROLE fcm_app NOLOGIN') }
  }, 30000)

  it('runs the source-and-database inspection CLI without printing identity or credentials', () => {
    const directory = mkdtempSync(resolve(process.platform === 'win32' ? 'D:/andre/validation' : tmpdir(), 'fcm-readiness-cli-'))
    const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true }).trim()
    const config = { repository: git('rev-parse', '--show-toplevel'), releaseSha: git('rev-parse', 'HEAD'),
      mode: options.mode, expectedTargetFingerprint: options.expectedTargetFingerprint,
      migrationRole: options.migrationRole, runtimeRoles: options.runtimeRoles }
    const file = resolve(directory, 'inspection.json')
    writeFileSync(file, JSON.stringify(config), { flag: 'wx' })
    const result = spawnSync(process.execPath, ['--import', 'tsx', resolve('scripts/inspect-transition-readiness.ts'), file],
      { env: { ...process.env, FCM_TRANSITION_INSPECTION_DATABASE_URL: options.databaseUrl },
        encoding: 'utf8', windowsHide: true, timeout: 60000 })
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout)).toMatchObject({ inspectionPassed: true, userCount: 1, ledgerCount: 1,
      migrationFiles: 47, writesPerformed: false, maintenanceEstablished: false, migrationAuthorized: false })
    expect(result.stdout + result.stderr).not.toContain('local-synthetic-only')
    expect(result.stdout).not.toContain('sales@')
    expect(sql('SELECT to_jsonb(u)::text FROM "User" u')).toBe(baseline)
  }, 65000)

  it('rejects missing runtime roles and aborted inspection', async () => {
    expect((await inspectPostgresTransition({ ...options, runtimeRoles: ['not_present'] })).issues).toContain('RUNTIME_ROLE_MISSING')
    const abort = new AbortController(); abort.abort()
    await expect(inspectPostgresTransition(options, abort.signal)).rejects.toThrow('TRANSITION_INSPECTION_ABORTED')
  }, 30000)

  it('retains a prior attempt marker and refuses a safe inventory result', async () => {
    sql('CREATE SCHEMA fcm_transition_control')
    const result = await inspectPostgresTransition(options)
    expect(result.issues).toContain('TARGET_ALREADY_ATTEMPTED')
    expect(result.inspectionPassed).toBe(false)
    expect(sql("SELECT to_regnamespace('fcm_transition_control') IS NOT NULL")).toBe('t')
    expect(sql('SELECT to_jsonb(u)::text FROM "User" u')).toBe(baseline)
  }, 30000)
})
