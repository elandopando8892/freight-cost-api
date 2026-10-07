import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildProductionCutoverPlan, FINALIZE_SUPABASE_IDENTITY } from '../scripts/lib/production-cutover-plan.js';
import { buildProductionCutoverSql, type CutoverSqlPhase, type ProductionCutoverSqlInput } from '../scripts/lib/production-cutover-sql.js';

const sha = (v: string) => createHash('sha256').update(v).digest('hex');
const add = '20260830000100_add_supabase_identity';
const later = '20260923000100_partner_cost_estimates';
const sqlFile = (name: string, sql: string) => ({ name, sql, checksum: sha(sql) });
const finalSql = '-- Reviewed identity finalization\nBEGIN;\nDO $$ BEGIN IF EXISTS(SELECT 1 FROM "User" WHERE "supabaseId" IS NULL) THEN RAISE EXCEPTION \'unlinked\'; END IF; END $$;\nALTER TABLE "User" ALTER COLUMN "supabaseId" SET NOT NULL;\nDROP INDEX IF EXISTS "User_kindeId_key";\nALTER TABLE "User" DROP COLUMN "kindeId";\nCOMMIT;\n';
function fixture(phase: CutoverSqlPhase = 'backup'): ProductionCutoverSqlInput {
  const input = {
    artifacts: [sqlFile(later, '-- additive marker\nSELECT 1;'), sqlFile(FINALIZE_SUPABASE_IDENTITY, finalSql), sqlFile(add, 'ALTER TABLE "User" ADD COLUMN "supabaseId" TEXT;')],
    ledger: [],
    users: [{ id: 'existing-user', emailHash: sha('fixture@example.invalid'), orgId: 'original-org', role: 'ADMIN', identityFingerprint: sha('full original row') }],
    authMatches: [{ emailHash: sha('fixture@example.invalid'), supabaseId: '11111111-1111-4111-8111-111111111111', verified: true }],
  };
  const fingerprint = buildProductionCutoverPlan(input).planFingerprint;
  return { phase, input, expectedPlanFingerprint: fingerprint, backup: { schema: 'fcm_release_backup', key: sha('release-key'), planFingerprint: fingerprint, validated: phase !== 'backup' }, approval: { granted: true, reference: 'human-decision-fixture', phase, promoted: phase === 'finalize', realAuthVerified: phase === 'finalize' } };
}
function finalizedFixture() {
  const options = fixture('finalize');
  options.input.ledger = options.input.artifacts.filter(f => f.name !== FINALIZE_SUPABASE_IDENTITY).map(f => ({ migration_name: f.name, checksum: f.checksum, finished_at: '2026-10-07T10:00:00Z', rolled_back_at: null }));
  options.input.users[0].identityFingerprint = sha('same row now with supabaseId');
  options.expectedPlanFingerprint = buildProductionCutoverPlan(options.input).planFingerprint;
  return options;
}
describe('reviewable cutover SQL generation only', () => {
  it('builds durable private backup and a real JSON restore probe before any identity DDL', () => {
    const result = buildProductionCutoverSql(fixture());
    expect(result.migrationAuthorized).toBe(false);
    expect(result.sql).toContain('CREATE SCHEMA "fcm_release_backup"');
    expect(result.sql).toContain('REVOKE ALL ON SCHEMA "fcm_release_backup" FROM PUBLIC');
    expect(result.sql).toContain('REVOKE ALL ON ALL TABLES IN SCHEMA "fcm_release_backup" FROM PUBLIC');
    expect(result.sql).toContain('LIKE public."User" INCLUDING ALL');
    expect(result.sql).toContain('jsonb_populate_record');
    expect(result.sql).toContain('information_schema.columns');
    expect(result.sql).toContain('to_jsonb(u)');
    expect(result.sql).toContain("- 'kindeId' - 'supabaseId'");
    expect(result.sql).toContain('FCM_BACKUP_RESTORE_MISMATCH');
    expect(result.sql).not.toContain('ADD COLUMN');
    expect(result.sql.trim().endsWith('COMMIT;')).toBe(true);
  });
  it('wraps additive/mapping atomically with locks, exact inventory and checksum guards', () => {
    const sql = buildProductionCutoverSql(fixture('additive')).sql;
    expect(sql).toContain("SET LOCAL lock_timeout = '5s'");
    expect(sql).toContain("SET LOCAL statement_timeout = '30s'");
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain('LOCK TABLE public."User", public."_prisma_migrations" IN EXCLUSIVE MODE');
    expect(sql).toContain('FCM_LEDGER_CHANGED');
    expect(sql).toContain('EXCEPT ALL');
    expect(sql).toContain('sha256(convert_to(lower(btrim(u.email))');
    expect(sql).toContain('FCM_USER_INVENTORY_CHANGED');
    expect(sql).toContain('FCM_IDENTITY_SUBJECT_CONFLICT');
    expect(sql).toContain('UPDATE public."User"');
    expect(sql).toContain('ALTER COLUMN "supabaseId" SET NOT NULL');
    expect(sql).toContain('FCM_KINDE_COLUMN_REQUIRED');
    expect(sql).not.toContain('DROP COLUMN "kindeId"');
    expect(sql.indexOf('ADD COLUMN')).toBeLessThan(sql.indexOf('-- additive marker'));
    expect(sql).toContain('INSERT INTO public."_prisma_migrations"');
    expect(sql).not.toMatch(/INSERT INTO public\."User"/);
    expect(sql).toContain('FCM_IMMUTABLE_USER_CHANGED');
    expect(sql).toContain('FCM_PHASE_ALREADY_APPLIED');
  });
  it('finalizes only after all additive migrations and reconciled identities, binding the original backup and current plan', () => {
    const options = finalizedFixture();
    expect(options.backup.planFingerprint).not.toBe(options.expectedPlanFingerprint);
    const sql = buildProductionCutoverSql(options).sql;
    expect(sql).toContain(options.backup.planFingerprint);
    expect(sql).toContain(options.expectedPlanFingerprint);
    expect(sql).toContain('DROP COLUMN "kindeId"');
    expect(sql).toContain('FCM_IDENTITY_MAPPING_CHANGED');
    expect(sql).toContain('FCM_IMMUTABLE_USER_CHANGED');
    expect(sql).toContain("RAISE EXCEPTION 'unlinked'");
    expect(sql.match(/^BEGIN;$/gm)).toHaveLength(1);
    expect(sql.match(/^COMMIT;$/gm)).toHaveLength(1);
  });
  it.each(['backup', 'additive', 'finalize'] as const)('requires scoped explicit approval for %s', phase => {
    const options = phase === 'finalize' ? finalizedFixture() : fixture(phase);
    options.approval.granted = false;
    expect(() => buildProductionCutoverSql(options)).toThrow('APPROVAL_REQUIRED');
    options.approval.granted = true; options.approval.phase = phase === 'backup' ? 'additive' : 'backup';
    expect(() => buildProductionCutoverSql(options)).toThrow('APPROVAL_REQUIRED');
    options.approval.phase = phase; options.approval.reference = '';
    expect(() => buildProductionCutoverSql(options)).toThrow('APPROVAL_REQUIRED');
  });
  it('rejects missing/invalid backup evidence and bindings', () => {
    const options = fixture('additive'); options.backup.validated = false;
    expect(() => buildProductionCutoverSql(options)).toThrow('BACKUP_REQUIRED');
    options.backup.validated = true; options.backup.planFingerprint = sha('other-plan');
    expect(() => buildProductionCutoverSql(options)).toThrow('BACKUP_BINDING_MISMATCH');
  });
  it('rejects a changed plan fingerprint or blocked identity inventory', () => {
    const options = fixture(); options.expectedPlanFingerprint = sha('wrong');
    expect(() => buildProductionCutoverSql(options)).toThrow('PLAN_BINDING_MISMATCH');
    options.input.authMatches.push({ ...options.input.authMatches[0] });
    expect(() => buildProductionCutoverSql(options)).toThrow('PLAN_BLOCKED');
  });
  it('rejects schema/key injection and safely quotes inventory values', () => {
    const options = fixture('additive'); options.backup.schema = 'x"; DROP TABLE "User"; --' as 'fcm_release_backup';
    expect(() => buildProductionCutoverSql(options)).toThrow('BACKUP_DESCRIPTOR_INVALID');
    options.backup.schema = 'fcm_release_backup'; options.backup.key = "'; COMMIT; --";
    expect(() => buildProductionCutoverSql(options)).toThrow('BACKUP_DESCRIPTOR_INVALID');
    const safe = fixture('additive'); safe.input.users[0].id = "user'); DROP TABLE User; --";
    safe.expectedPlanFingerprint = buildProductionCutoverPlan(safe.input).planFingerprint; safe.backup.planFingerprint = safe.expectedPlanFingerprint;
    expect(buildProductionCutoverSql(safe).sql).toContain("'user''); DROP TABLE User; --'");
  });
  it.each(['promoted', 'realAuthVerified'] as const)('requires finalization evidence: %s', field => {
    const options = finalizedFixture(); options.approval[field] = false;
    expect(() => buildProductionCutoverSql(options)).toThrow('FINALIZE_EVIDENCE_REQUIRED');
  });
  it('blocks finalize while additive work remains and blocks a replay of the completed finalization', () => {
    expect(() => buildProductionCutoverSql(fixture('finalize'))).toThrow('ADDITIVE_MIGRATIONS_PENDING');
    const options = finalizedFixture(); const file = options.input.artifacts.find(f => f.name === FINALIZE_SUPABASE_IDENTITY)!;
    options.input.ledger.push({ migration_name: file.name, checksum: file.checksum, finished_at: '2026-10-07T10:10:00Z', rolled_back_at: null });
    options.expectedPlanFingerprint = buildProductionCutoverPlan(options.input).planFingerprint;
    expect(() => buildProductionCutoverSql(options)).toThrow('FINALIZE_ALREADY_APPLIED');
  });
  it('rejects transaction escape in a checksummed artifact while preserving dollar quoted procedural bodies', () => {
    const options = fixture('additive'); const file = options.input.artifacts[0];
    file.sql = 'SELECT 1; COMMIT; SELECT 2;'; file.checksum = sha(file.sql);
    options.expectedPlanFingerprint = buildProductionCutoverPlan(options.input).planFingerprint; options.backup.planFingerprint = options.expectedPlanFingerprint;
    expect(() => buildProductionCutoverSql(options)).toThrow('MIGRATION_TRANSACTION_ESCAPE');
  });
  it('has no implicit retries or cleanup of the durable backup in later phases', () => {
    const sql = buildProductionCutoverSql(fixture('additive')).sql;
    expect(sql).not.toMatch(/DROP SCHEMA|TRUNCATE|DELETE FROM|ON CONFLICT/);
    expect(sql).toContain('FCM_BACKUP_REQUIRED');
    expect(sql).toContain('FCM_BACKUP_BINDING_MISMATCH');
    expect(sql.trim().endsWith('COMMIT;')).toBe(true);
  });
  it('pins the same reviewed SQL and mapping across backup/additive/finalize while locking backup against races', () => {
    const backup = buildProductionCutoverSql(fixture()).sql;
    const additive = buildProductionCutoverSql(fixture('additive')).sql;
    const final = buildProductionCutoverSql(finalizedFixture()).sql;
    expect(backup).toContain('artifact_binding text NOT NULL');
    expect(backup).toContain('mapping_binding text NOT NULL');
    const pinnedArtifacts = additive.match(/artifact_binding='([a-f0-9]{64})'/)![1];
    const pinnedMapping = additive.match(/mapping_binding='([a-f0-9]{64})'/)![1];
    expect(backup).toContain(pinnedArtifacts);
    expect(backup).toContain(pinnedMapping);
    expect(final).toContain(`artifact_binding='${pinnedArtifacts}'`);
    expect(final).toContain(`mapping_binding='${pinnedMapping}'`);
    expect(final).toContain('LOCK TABLE "fcm_release_backup".manifest, "fcm_release_backup".users');
  });
  it('preserves quoted COMMIT and procedural transaction words including unicode before outer wrappers', () => {
    const options = fixture('additive'); const file = options.input.artifacts[0];
    file.sql = '-- 🧪 reviewed wrapper\nBEGIN;\nSELECT \'COMMIT;\';\nDO $body$ BEGIN RAISE NOTICE \'COMMIT;\'; END $body$;\nCOMMIT;'; file.checksum = sha(file.sql);
    options.expectedPlanFingerprint = buildProductionCutoverPlan(options.input).planFingerprint; options.backup.planFingerprint = options.expectedPlanFingerprint;
    const sql = buildProductionCutoverSql(options).sql;
    expect(sql).toContain("SELECT 'COMMIT;'");
    expect(sql).toContain("DO $body$ BEGIN RAISE NOTICE 'COMMIT;'; END $body$;");
    expect(sql.match(/^BEGIN;$/gm)).toHaveLength(1);
    expect(sql.match(/^COMMIT;$/gm)).toHaveLength(1);
  });
});
