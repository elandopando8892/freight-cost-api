import { PrismaClient } from '@prisma/client'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildViewerMembershipBundle, type ViewerMembershipInput } from '../scripts/lib/viewer-membership-bundle.js'
const url = process.env.FCM_MEMBER_TEST_DATABASE_URL
const container = process.env.FCM_MEMBER_TEST_CONTAINER
if (url) {
  const target = new URL(url)
  if (target.hostname !== '127.0.0.1' || target.protocol !== 'postgresql:' || target.pathname !== '/fcm_actor_migrations'
      || container !== 'fcm-actor-block-20261008') throw new Error('MEMBER_FIXTURE_NOT_OWNED_LOOPBACK')
}
describe.skipIf(!url)('prepared membership SQL on synthetic Postgres', () => {
  let db: PrismaClient, bundle: ReturnType<typeof buildViewerMembershipBundle>, input: ViewerMembershipInput
  const run = (sql: string) => execFileSync('docker', ['exec','-i',container!, 'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','fcm_actor_migrations'],
    { input: sql, encoding: 'utf8', windowsHide: true, stdio: ['pipe','pipe','pipe'], timeout: 60000 })
  beforeAll(async () => {
    const label = execFileSync('docker', ['inspect',container!, '--format','{{index .Config.Labels "fcm.disposable"}}'], { encoding: 'utf8', windowsHide: true }).trim()
    if (label !== 'transition-review-20261008') throw new Error('MEMBER_FIXTURE_NOT_OWNED')
    db = new PrismaClient({ datasourceUrl: url })
    expect(await db.user.count()).toBe(0)
    await db.organization.create({ data: { id: 'actor-org', name: 'Synthetic actor lab' } })
    await db.organization.create({ data: { id: 'other-org', name: 'Synthetic other tenant' } })
    await db.user.createMany({ data: [
      { id: 'actor-owner', orgId: 'actor-org', email: 'sales@heymarksman.com', role: 'ADMIN' },
      { id: 'actor-history', orgId: 'actor-org', email: 'history@example.invalid', role: 'ADMIN' },
    ] })
    run(`ALTER TABLE "User" ADD COLUMN "kindeId" text NOT NULL DEFAULT 'synthetic-legacy';
      UPDATE "User" SET "kindeId"=id; ALTER TABLE "User" ALTER COLUMN "kindeId" DROP DEFAULT;
      CREATE UNIQUE INDEX "User_kindeId_key" ON "User"("kindeId");
      CREATE UNIQUE INDEX "ActorCompositeLegacy" ON "User"("orgId","kindeId");
      CREATE TABLE "NullableActorReference"(id text PRIMARY KEY,"actorLegacy" text REFERENCES "User"("kindeId"));
      CREATE TABLE "NullableCompositeReference"(id text PRIMARY KEY,"actorOrg" text,"actorLegacy" text,
        FOREIGN KEY("actorOrg","actorLegacy") REFERENCES "User"("orgId","kindeId"));
      CREATE UNIQUE INDEX "ActorCompositeEmail" ON "User"("orgId",email);
      CREATE TABLE "LinkedCompositeReference"(id text PRIMARY KEY,"actorOrg" text,"actorEmail" text,
        FOREIGN KEY("actorOrg","actorEmail") REFERENCES "User"("orgId",email) ON DELETE CASCADE);
      INSERT INTO "NullableActorReference" VALUES('unlinked',NULL);
      INSERT INTO "NullableCompositeReference" VALUES('unlinked','actor-org',NULL);
      CREATE TABLE "ActorReference"(id text PRIMARY KEY,"actorId" text REFERENCES "User"(id) ON DELETE CASCADE,amount numeric NOT NULL);
      INSERT INTO "ActorReference" VALUES('original-audit','actor-history',75000);`)
    const users = await db.$queryRaw<{ id: string; orgId: string; role: string; emailHash: string; identityFingerprint: string }[]>`
      SELECT id,"orgId",role::text,encode(sha256(convert_to(lower(btrim(email)),'UTF8')),'hex') AS "emailHash",
      encode(sha256(convert_to(to_jsonb(u)::text,'UTF8')),'hex') AS "identityFingerprint" FROM "User" u ORDER BY id`
    const scope = { version: 1 as const, users: [
      { email: 'sales@heymarksman.com', subject: '00000000-0000-4000-8000-000000000001' },
      { email: 'jgonzalez@xbfreight.com', subject: '00000000-0000-4000-8000-000000000002' },
    ] }
    input = { users,scope,authMatches: scope.users.map(u => ({
      emailHash: createHash('sha256').update(u.email).digest('hex'), supabaseId: u.subject, verified: true,
    })),memberId:'actor-new-viewer',authorityReference:'synthetic-authority',promotedPairReference:'synthetic-Supabase-pair' }
    bundle = buildViewerMembershipBundle(input)
  }, 60000)
  afterAll(async () => { await db?.$disconnect() })
  it.each(['tenant', 'email', 'role'])('rejects a falsified %s projection despite intact full-row fingerprints', async field => {
    const tampered = structuredClone(input)
    const owner = tampered.users.find(u => u.id === 'actor-owner')!
    if (field === 'tenant') owner.orgId = 'other-org'
    if (field === 'role') owner.role = 'VIEWER'
    if (field === 'email') {
      const history = tampered.users.find(u => u.id === 'actor-history')!
      const hash = owner.emailHash; owner.emailHash = history.emailHash; history.emailHash = hash
    }
    expect(() => run(buildViewerMembershipBundle(tampered).backupSql)).toThrow()
    expect(await db.user.count()).toBe(2)
    expect(run(`SELECT to_regnamespace('fcm_viewer_membership_backup') IS NULL`).trim()).toBe('t')
  }, 30000)
  it('blocks missing backup, then restores the original rows into its private probe', async () => {
    expect(() => run(bundle.applySql)).toThrow()
    expect(await db.user.count()).toBe(2)
    run(bundle.backupSql)
    expect(run(`SELECT restore_verified FROM fcm_viewer_membership_backup.manifest`).trim()).toBe('t')
  }, 30000)
  it('links the original owner, creates only a viewer and leaves historic references unchanged', async () => {
    run(bundle.applySql)
    expect(await db.user.findUnique({ where: { id: 'actor-new-viewer' } })).toMatchObject({ role:'VIEWER',orgId:'actor-org',supabaseId:'00000000-0000-4000-8000-000000000002' })
    expect(await db.user.findUnique({ where: { id: 'actor-owner' } })).toMatchObject({ role:'ADMIN',orgId:'actor-org',supabaseId:'00000000-0000-4000-8000-000000000001' })
    expect(run(`SELECT "actorId"||'|'||amount FROM "ActorReference" WHERE id='original-audit'`).trim()).toBe('actor-history|75000')
    expect(() => run(bundle.applySql)).toThrow()
    expect(await db.user.count()).toBe(3)
  }, 30000)
  it('does not cascade-delete new references during rollback', async () => {
    run(`INSERT INTO "ActorReference" VALUES('new-audit','actor-new-viewer',125)`)
    expect(() => run(bundle.rollbackSql)).toThrow()
    expect(await db.user.count()).toBe(3)
    expect(run(`SELECT count(*) FROM "ActorReference" WHERE id='new-audit'`).trim()).toBe('1')
    run(`DELETE FROM "ActorReference" WHERE id='new-audit'`)
    run(`INSERT INTO "LinkedCompositeReference" VALUES('linked','actor-org','jgonzalez@xbfreight.com')`)
    expect(() => run(bundle.rollbackSql)).toThrow()
    expect(run(`SELECT count(*) FROM "LinkedCompositeReference" WHERE id='linked'`).trim()).toBe('1')
    run(`DELETE FROM "LinkedCompositeReference" WHERE id='linked'`)
    run(bundle.rollbackSql)
    expect(await db.user.count()).toBe(2)
    expect(await db.user.findUnique({ where: { id:'actor-owner' } })).toMatchObject({ supabaseId:null,role:'ADMIN',orgId:'actor-org' })
    expect(run(`SELECT is_nullable FROM information_schema.columns WHERE table_name='User' AND column_name='kindeId'`).trim()).toBe('NO')
    expect(run(`SELECT phase FROM fcm_viewer_membership_backup.manifest`).trim()).toBe('ROLLED_BACK')
    expect(run(`SELECT count(*) FROM "NullableActorReference" WHERE "actorLegacy" IS NULL`).trim()).toBe('1')
    expect(run(`SELECT count(*) FROM "NullableCompositeReference" WHERE "actorLegacy" IS NULL`).trim()).toBe('1')
  }, 60000)
})
