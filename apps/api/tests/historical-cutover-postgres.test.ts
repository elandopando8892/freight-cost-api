import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildHistoricalCutoverPlan } from '../scripts/lib/historical-cutover-plan.js'
import { FINALIZE_SUPABASE_IDENTITY, type CutoverUserInventory } from '../scripts/lib/production-cutover-plan.js'
const container = process.env.FCM_BRIDGE_TEST_CONTAINER
if (container && container !== 'fcm-actor-block-20261008') throw new Error('BRIDGE_FIXTURE_NOT_OWNED')
const sha = (s: string) => createHash('sha256').update(s).digest('hex')
describe.skipIf(!container)('historical transition rehearsal, synthetic ledger and actors only', () => {
  it('applies the selected source SQL while preserving actors, references and the deferred retirement', () => {
    const label = execFileSync('docker', ['inspect', container!, '--format', '{{index .Config.Labels "fcm.disposable"}}'], { encoding: 'utf8', windowsHide: true }).trim()
    if (label !== 'transition-review-20261008') throw new Error('BRIDGE_FIXTURE_NOT_OWNED')
    const run = (database: string, sql: string) => execFileSync('docker', ['exec', '-i', container!, 'psql', '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', database],
      { input: sql, encoding: 'utf8', windowsHide: true, stdio: ['pipe','pipe','pipe'], timeout: 60000 })
    // CREATE (not IF NOT EXISTS) refuses adoption/replay of an earlier fixture.
    run('postgres', 'CREATE DATABASE fcm_historical_bridge')
    const artifacts = readdirSync(resolve('prisma/migrations'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => {
      const sql = readFileSync(resolve('prisma/migrations', d.name, 'migration.sql'), 'utf8')
      return { name: d.name, sql, checksum: sha(sql) }
    }).sort((a, b) => a.name.localeCompare(b.name))
    const initial = artifacts.slice(0, 33)
    expect(initial.some(a => a.name === FINALIZE_SUPABASE_IDENTITY)).toBe(false)
    run('fcm_historical_bridge', initial.map(a => a.sql).join('\n'))
    run('fcm_historical_bridge', `INSERT INTO "Organization"(id,name,"updatedAt") VALUES('bridge-org','Synthetic bridge',CURRENT_TIMESTAMP);
      INSERT INTO "User"(id,"orgId",email,role,"kindeId","updatedAt") VALUES
      ('bridge-owner','bridge-org','sales@heymarksman.com','ADMIN','legacy-owner',CURRENT_TIMESTAMP),
      ('bridge-history','bridge-org','historical@example.invalid','ADMIN','legacy-history',CURRENT_TIMESTAMP);
      CREATE TABLE "BridgeAudit"(id text PRIMARY KEY,"actorId" text REFERENCES "User"(id),amount numeric NOT NULL);
      INSERT INTO "BridgeAudit" VALUES('historic-audit','bridge-history',75000);`)
    const original = JSON.parse(run('fcm_historical_bridge', `SELECT jsonb_agg(to_jsonb(u) ORDER BY id) FROM "User" u`))
    const users = JSON.parse(run('fcm_historical_bridge', `SELECT jsonb_agg(jsonb_build_object('id',id,'orgId',"orgId",'role',role::text,
      'emailHash',encode(sha256(convert_to(lower(btrim(email)),'UTF8')),'hex'),
      'identityFingerprint',encode(sha256(convert_to(to_jsonb(u)::text,'UTF8')),'hex')) ORDER BY id) FROM "User" u`)) as CutoverUserInventory[]
    const scope = { version: 1 as const, users: [
      { email: 'sales@heymarksman.com', subject: '00000000-0000-4000-8000-000000000001' },
      { email: 'jgonzalez@xbfreight.com', subject: '00000000-0000-4000-8000-000000000002' },
    ] }
    const plan = buildHistoricalCutoverPlan({ artifacts, users, scope,
      ledger: initial.map(a => ({ migration_name: a.name, checksum: a.checksum, finished_at: '2026-10-08T10:00:00Z', rolled_back_at: null })),
      authMatches: scope.users.map(u => ({ emailHash: sha(u.email), supabaseId: u.subject, verified: true })) })
    expect(plan.reviewReady).toBe(true)
    expect(plan.pendingMigrations).toHaveLength(13)
    // Local rehearsal only: no production executor or migrate-resolve ledger.
    run('fcm_historical_bridge', plan.pendingMigrations.map(a => a.sql).join('\n'))
    const after = JSON.parse(run('fcm_historical_bridge', `SELECT jsonb_agg(to_jsonb(u)-'supabaseId' ORDER BY id) FROM "User" u`))
    expect(after).toEqual(original)
    expect(run('fcm_historical_bridge', `SELECT "actorId"||'|'||amount FROM "BridgeAudit"`).trim()).toBe('bridge-history|75000')
    expect(run('fcm_historical_bridge', `SELECT is_nullable FROM information_schema.columns WHERE table_name='User' AND column_name='supabaseId'`).trim()).toBe('YES')
    expect(run('fcm_historical_bridge', `SELECT count(*) FROM "User" WHERE "kindeId" IS NOT NULL AND "supabaseId" IS NULL`).trim()).toBe('2')
    // The retirement still fails on unlinked actors; we never erase that guard.
    expect(() => run('fcm_historical_bridge', plan.deferredFinalize!.sql)).toThrow()
    expect(run('fcm_historical_bridge', `SELECT count(*) FROM "User"`).trim()).toBe('2')
  }, 120000)
})
