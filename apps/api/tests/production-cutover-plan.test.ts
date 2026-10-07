import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  buildProductionCutoverPlan,
  FINALIZE_SUPABASE_IDENTITY,
  type CutoverMigrationArtifact,
  type ProductionCutoverPlanInput,
} from '../scripts/lib/production-cutover-plan.js';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const add = '20260830000100_add_supabase_identity';
const cost = '20260923000100_partner_cost_estimates';
const artifact = (name: string, sql = `-- ${name}\nSELECT 1;\n`): CutoverMigrationArtifact => ({ name, sql, checksum: sha(sql) });
const at = '2026-10-07T15:00:00.000Z';
const subjectA = '11111111-1111-4111-8111-111111111111';
const subjectB = '22222222-2222-4222-8222-222222222222';
const fixture = (): ProductionCutoverPlanInput => ({
  artifacts: [artifact(cost), artifact(FINALIZE_SUPABASE_IDENTITY), artifact(add)],
  ledger: [],
  users: [
    { id: 'user-b', emailHash: sha('b@example.invalid'), orgId: 'org-b', role: 'VIEWER', identityFingerprint: sha('full-user-b') },
    { id: 'user-a', emailHash: sha('a@example.invalid'), orgId: 'org-a', role: 'ADMIN', identityFingerprint: sha('full-user-a') },
  ],
  authMatches: [
    { emailHash: sha('a@example.invalid'), supabaseId: subjectA, verified: true },
    { emailHash: sha('b@example.invalid'), supabaseId: subjectB, verified: true },
  ],
});
const applied = (file: CutoverMigrationArtifact) => ({ migration_name: file.name, checksum: file.checksum, finished_at: at, rolled_back_at: null });

describe('pure production cutover planning', () => {
  it('orders only pending migrations and defers identity finalization behind backup and reconciliation', () => {
    const plan = buildProductionCutoverPlan(fixture());
    expect(plan.ready).toBe(true);
    expect(plan.pendingMigrations.map(file => file.name)).toEqual([add, cost]);
    expect(plan.deferredFinalize).toMatchObject({ name: FINALIZE_SUPABASE_IDENTITY, requireBackup: true, requireIdentityReconciliation: true });
    expect(plan.migrationAuthorized).toBe(false);
  });
  it('maps every existing user exactly once preserving application identity, organization and role', () => {
    const plan = buildProductionCutoverPlan(fixture());
    expect(plan.identityMapping).toEqual([
      { ...fixture().users[1], supabaseId: subjectA },
      { ...fixture().users[0], supabaseId: subjectB },
    ]);
  });
  it('does not create defaults or mutate its inputs', () => {
    const input = fixture();
    const original = structuredClone(input);
    const plan = buildProductionCutoverPlan(input);
    expect(input).toEqual(original);
    plan.identityMapping[0].role = 'CHANGED';
    plan.pendingMigrations[0].sql = 'CHANGED';
    expect(input).toEqual(original);
  });
  it('does not assume a fixed migration count and omits already applied artifacts', () => {
    const input = fixture();
    input.ledger = input.artifacts.map(applied);
    expect(buildProductionCutoverPlan(input)).toMatchObject({ ready: true, pendingMigrations: [], deferredFinalize: null });
  });
  it.each([
    ['unknown active record', (input: ProductionCutoverPlanInput) => input.ledger.push(applied(artifact('20261007000100_unknown'))), 'LEDGER_UNKNOWN_MIGRATION'],
    ['unfinished active record', (input: ProductionCutoverPlanInput) => input.ledger.push({ ...applied(input.artifacts[0]), finished_at: null }), 'LEDGER_UNFINISHED_MIGRATION'],
    ['duplicate active records', (input: ProductionCutoverPlanInput) => input.ledger.push(applied(input.artifacts[0]), applied(input.artifacts[0])), 'LEDGER_DUPLICATE_MIGRATION'],
    ['changed active checksum', (input: ProductionCutoverPlanInput) => input.ledger.push({ ...applied(input.artifacts[0]), checksum: sha('changed') }), 'LEDGER_CHECKSUM_MISMATCH'],
  ])('blocks %s without producing executable work', (_label, mutate, code) => {
    const input = fixture(); mutate(input);
    const plan = buildProductionCutoverPlan(input);
    expect(plan.ready).toBe(false);
    expect(plan.issues.map(issue => issue.code)).toContain(code);
    expect(plan.pendingMigrations).toEqual([]);
    expect(plan.migrationAuthorized).toBe(false);
  });
  it('preserves rolled-back history in the fingerprint while excluding it from active ledger validation', () => {
    const input = fixture();
    const before = buildProductionCutoverPlan(input);
    input.ledger.push({ migration_name: 'historical-unknown', checksum: sha('old'), finished_at: null, rolled_back_at: at });
    const after = buildProductionCutoverPlan(input);
    expect(after.ready).toBe(true);
    expect(after.pendingMigrations.map(file => file.name)).toEqual([add, cost]);
    expect(after.planFingerprint).not.toBe(before.planFingerprint);
  });
  it('accepts a checksum variant only when explicitly listed and derived from LF/CRLF SQL', () => {
    const input = fixture(); const file = input.artifacts[0];
    const crlf = sha(file.sql.replace(/\n/g, '\r\n'));
    input.ledger.push({ ...applied(file), checksum: crlf });
    expect(buildProductionCutoverPlan(input).ready).toBe(false);
    file.checksumVariants = [crlf];
    expect(buildProductionCutoverPlan(input).ready).toBe(true);
    file.checksumVariants.push(sha('unrelated SQL'));
    expect(buildProductionCutoverPlan(input).issues.map(issue => issue.code)).toContain('ARTIFACT_INVALID_CHECKSUM_VARIANT');
  });
  it('rejects artifact SQL that does not match its declared checksum', () => {
    const input = fixture(); input.artifacts[0].sql += 'SELECT 2;';
    expect(buildProductionCutoverPlan(input).issues.map(issue => issue.code)).toContain('ARTIFACT_CHECKSUM_MISMATCH');
  });
  it('rejects duplicate or missing finalization artifacts', () => {
    const input = fixture(); input.artifacts.push({ ...input.artifacts[0] });
    expect(buildProductionCutoverPlan(input).issues.map(issue => issue.code)).toContain('ARTIFACT_DUPLICATE_NAME');
    input.artifacts = input.artifacts.filter(file => file.name !== FINALIZE_SUPABASE_IDENTITY);
    expect(buildProductionCutoverPlan(input).issues.map(issue => issue.code)).toContain('ARTIFACT_FINALIZE_MISSING');
  });
  it.each([
    ['missing Auth identity', (input: ProductionCutoverPlanInput) => input.authMatches.pop(), 'IDENTITY_MATCH_MISSING'],
    ['unverified Auth identity', (input: ProductionCutoverPlanInput) => { input.authMatches[0].verified = false; }, 'IDENTITY_NOT_VERIFIED'],
    ['duplicate email in Auth', (input: ProductionCutoverPlanInput) => input.authMatches.push({ ...input.authMatches[0] }), 'IDENTITY_DUPLICATE_EMAIL_HASH'],
    ['duplicate subject in Auth', (input: ProductionCutoverPlanInput) => { input.authMatches[1].supabaseId = subjectA; }, 'IDENTITY_DUPLICATE_SUBJECT'],
    ['malformed subject', (input: ProductionCutoverPlanInput) => { input.authMatches[0].supabaseId = 'invented-id'; }, 'IDENTITY_INVALID_SUBJECT'],
    ['duplicate inventory email', (input: ProductionCutoverPlanInput) => { input.users[1].emailHash = input.users[0].emailHash; }, 'USER_DUPLICATE_EMAIL_HASH'],
    ['duplicate inventory ID', (input: ProductionCutoverPlanInput) => { input.users[1].id = input.users[0].id; }, 'USER_DUPLICATE_ID'],
    ['missing organization', (input: ProductionCutoverPlanInput) => { input.users[0].orgId = ''; }, 'USER_INCOMPLETE_INVENTORY'],
    ['missing role', (input: ProductionCutoverPlanInput) => { input.users[0].role = ''; }, 'USER_INCOMPLETE_INVENTORY'],
    ['missing full-row fingerprint', (input: ProductionCutoverPlanInput) => { input.users[0].identityFingerprint = ''; }, 'USER_INCOMPLETE_INVENTORY'],
    ['missing email hash', (input: ProductionCutoverPlanInput) => { input.users[0].emailHash = ''; }, 'USER_INCOMPLETE_INVENTORY'],
    ['out-of-scope identity', (input: ProductionCutoverPlanInput) => input.authMatches.push({ emailHash: sha('other@example.invalid'), supabaseId: '33333333-3333-4333-8333-333333333333', verified: true }), 'IDENTITY_OUTSIDE_INVENTORY'],
  ])('blocks %s and emits no partial mapping', (_label, mutate, code) => {
    const input = fixture(); mutate(input);
    const plan = buildProductionCutoverPlan(input);
    expect(plan.ready).toBe(false);
    expect(plan.issues.map(issue => issue.code)).toContain(code);
    expect(plan.identityMapping).toEqual([]);
  });
  it('recognizes hashes and UUID subjects case-insensitively when detecting duplicates', () => {
    const input = fixture();
    input.authMatches.push({ ...input.authMatches[0], emailHash: input.authMatches[0].emailHash.toUpperCase() });
    expect(buildProductionCutoverPlan(input).issues.map(issue => issue.code)).toContain('IDENTITY_DUPLICATE_EMAIL_HASH');
  });
  it('fingerprints are stable across inventory ordering and Date/string representations', () => {
    const input = fixture(); input.ledger.push(applied(input.artifacts[0]));
    const before = buildProductionCutoverPlan(input);
    input.artifacts.reverse(); input.users.reverse(); input.authMatches.reverse(); input.ledger.reverse();
    input.ledger[0].finished_at = new Date(at);
    const after = buildProductionCutoverPlan(input);
    expect(after.planFingerprint).toBe(before.planFingerprint);
    expect(after.userFingerprint).toBe(before.userFingerprint);
    expect(after.planFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
  it.each([
    ['SQL/artifact', (input: ProductionCutoverPlanInput) => { const file = input.artifacts[0]; file.sql += '\n'; file.checksum = sha(file.sql); }],
    ['ledger', (input: ProductionCutoverPlanInput) => input.ledger.push(applied(input.artifacts[0]))],
    ['full user row', (input: ProductionCutoverPlanInput) => { input.users[0].identityFingerprint = sha('changed economic/profile fields'); }],
    ['organization', (input: ProductionCutoverPlanInput) => { input.users[0].orgId = 'other-org'; }],
    ['role', (input: ProductionCutoverPlanInput) => { input.users[0].role = 'ADMIN'; }],
    ['mapping subject', (input: ProductionCutoverPlanInput) => { input.authMatches[0].supabaseId = '33333333-3333-4333-8333-333333333333'; }],
    ['verification evidence', (input: ProductionCutoverPlanInput) => { input.authMatches[0].verified = false; }],
  ])('binds changes to %s into the plan fingerprint', (_label, mutate) => {
    const input = fixture(); const before = buildProductionCutoverPlan(input);
    mutate(input);
    expect(buildProductionCutoverPlan(input).planFingerprint).not.toBe(before.planFingerprint);
  });
  it('rejects malformed active ledger timestamps instead of treating them as applied', () => {
    const input = fixture(); input.ledger.push({ ...applied(input.artifacts[0]), finished_at: 'invalid-date' });
    expect(buildProductionCutoverPlan(input).issues.map(issue => issue.code)).toContain('LEDGER_INVALID_TIMESTAMP');
  });
  it('can plan an explicitly empty user inventory without inventing an identity', () => {
    const input = fixture(); input.users = []; input.authMatches = [];
    expect(buildProductionCutoverPlan(input)).toMatchObject({ ready: true, identityMapping: [] });
  });
});
