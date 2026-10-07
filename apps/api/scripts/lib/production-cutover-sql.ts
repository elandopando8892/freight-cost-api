import { createHash } from 'node:crypto';
import { buildProductionCutoverPlan, FINALIZE_SUPABASE_IDENTITY, type ProductionCutoverPlanInput, type CutoverMigrationArtifact } from './production-cutover-plan.js';
export type CutoverSqlPhase = 'backup' | 'additive' | 'finalize';
export type ProductionCutoverSqlInput = {
  phase: CutoverSqlPhase;
  input: ProductionCutoverPlanInput;
  expectedPlanFingerprint: string;
  backup: { schema: 'fcm_release_backup'; key: string; planFingerprint: string; validated: boolean };
  approval: { reference: string; phase: CutoverSqlPhase; granted: boolean; promoted?: boolean; realAuthVerified?: boolean };
};
const schema = '"fcm_release_backup"';
const q = (value: string) => `'${value.replace(/'/g, "''")}'`;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const pgHash = (expression: string) => `encode(sha256(convert_to(${expression}, 'UTF8')), 'hex')`;
const immutable = (alias: string) => `to_jsonb(${alias}) - 'kindeId' - 'supabaseId'`;
function guard(condition: string, code: string) {
  const body = ` BEGIN IF ${condition} THEN RAISE EXCEPTION ${q(code)}; END IF; END `;
  let delimiter = '$fcm_guard$';
  for (let index = 0; body.includes(delimiter); index++) delimiter = `$fcm_guard_${index}$`;
  return `DO ${delimiter}${body}${delimiter};`;
}

/** Mask literals/comments while preserving positions; only outside transaction
 * statements can be removed. Procedural BEGIN/END inside dollar bodies remain. */
function transactionBody(sql: string, requireOuter = false) {
  const chars = sql.split('');
  let offset = 0;
  const mask = (end: number) => { for (let i = offset; i < end; i++) if (chars[i] !== '\n') chars[i] = ' '; offset = end; };
  while (offset < sql.length) {
    if (sql.startsWith('--', offset)) { const end = sql.indexOf('\n', offset); mask(end < 0 ? sql.length : end); continue; }
    if (sql.startsWith('/*', offset)) {
      let end = offset + 2; let depth = 1;
      while (end < sql.length && depth) {
        if (sql.startsWith('/*', end)) { depth++; end += 2; }
        else if (sql.startsWith('*/', end)) { depth--; end += 2; }
        else end++;
      }
      if (depth) throw new Error('MIGRATION_UNTERMINATED_COMMENT');
      mask(end); continue;
    }
    const quote = sql[offset];
    if (quote === "'" || quote === '"') {
      const escapeString = quote === "'" && /[eE]/.test(sql[offset - 1] ?? '') && !/[\w]/.test(sql[offset - 2] ?? '');
      let end = offset + 1; let closed = false;
      while (end < sql.length) {
        if (escapeString && sql[end] === '\\') { end += 2; continue; }
        if (sql[end] === quote) {
          if (sql[end + 1] === quote) { end += 2; continue; }
          end++; closed = true; break;
        }
        end++;
      }
      if (!closed) throw new Error('MIGRATION_UNTERMINATED_LITERAL');
      mask(end); continue;
    }
    const dollar = sql.slice(offset).match(/^\$(?:[a-zA-Z_][a-zA-Z0-9_]*)?\$/)?.[0];
    if (dollar) {
      const end = sql.indexOf(dollar, offset + dollar.length);
      if (end < 0) throw new Error('MIGRATION_UNTERMINATED_LITERAL');
      mask(end + dollar.length); continue;
    }
    offset++;
  }
  const masked = chars.join('');
  const statements = [...masked.matchAll(/[^;]+(?:;|$)/g)].filter(match => match[0].replace(/;/g, '').trim());
  const first = statements[0]; const last = statements.at(-1);
  const outer = first && last && /^\s*BEGIN\s*;$/i.test(first[0]) && /^\s*COMMIT\s*;$/i.test(last[0]);
  if (requireOuter && !outer) throw new Error('MIGRATION_FINALIZE_WRAPPER_REQUIRED');
  for (let index = 0; index < statements.length; index++) {
    if (outer && (index === 0 || index === statements.length - 1)) continue;
    if (/^\s*(BEGIN|COMMIT|ROLLBACK|END|ABORT|START\s+TRANSACTION|PREPARE\s+TRANSACTION)\b/i.test(statements[index][0])) {
      throw new Error('MIGRATION_TRANSACTION_ESCAPE');
    }
  }
  if (!outer) return sql;
  const blank = sql.split('');
  for (const match of [first!, last!]) {
    const token = match[0].match(/\b(?:BEGIN|COMMIT)\s*;/i)!;
    const start = match.index! + token.index!;
    for (let index = start; index < start + token[0].length; index++) blank[index] = ' ';
  }
  return blank.join('');
}

function inventorySql(input: ProductionCutoverPlanInput) {
  const plan = buildProductionCutoverPlan(input);
  const rows = plan.identityMapping.map(user => `(${[user.id, user.emailHash, user.orgId, user.role, user.identityFingerprint, user.supabaseId].map(q).join(', ')})`);
  return `CREATE TEMP TABLE fcm_expected_users (id text PRIMARY KEY, email_hash text UNIQUE NOT NULL, org_id text NOT NULL, role text NOT NULL, identity_fingerprint text NOT NULL, subject text UNIQUE NOT NULL) ON COMMIT DROP;
${rows.length ? `INSERT INTO fcm_expected_users VALUES ${rows.join(',\n')};` : ''}
${guard(`(SELECT count(*) FROM public."User") <> (SELECT count(*) FROM fcm_expected_users)
 OR EXISTS (SELECT 1 FROM public."User" u LEFT JOIN fcm_expected_users e ON e.id=u.id WHERE e.id IS NULL OR e.org_id IS DISTINCT FROM u."orgId" OR e.role IS DISTINCT FROM u.role::text OR e.email_hash IS DISTINCT FROM ${pgHash('lower(btrim(u.email))')} OR e.identity_fingerprint IS DISTINCT FROM ${pgHash('to_jsonb(u)::text')})`, 'FCM_USER_INVENTORY_CHANGED')}`;
}
function ledgerGuard(input: ProductionCutoverPlanInput) {
  const active = input.ledger.filter(row => row.rolled_back_at === null);
  const values = active.map(row => `(${q(row.migration_name)}, ${q(row.checksum.toLowerCase())}, ${q(row.finished_at instanceof Date ? row.finished_at.toISOString() : row.finished_at!)}::timestamptz)`);
  const expected = values.length ? `VALUES ${values.join(',\n')}` : 'SELECT NULL::text, NULL::text, NULL::timestamptz WHERE false';
  return guard(`EXISTS (WITH expected(migration_name, checksum, finished_at) AS (${expected}), actual AS (SELECT migration_name::text, lower(checksum)::text AS checksum, finished_at FROM public."_prisma_migrations" WHERE rolled_back_at IS NULL)
 SELECT 1 FROM ((SELECT * FROM expected EXCEPT ALL SELECT * FROM actual) UNION ALL (SELECT * FROM actual EXCEPT ALL SELECT * FROM expected)) differences)`, 'FCM_LEDGER_CHANGED');
}
const kindeGuard = () => guard(`NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='User' AND column_name='kindeId')`, 'FCM_KINDE_COLUMN_REQUIRED');
function artifactBinding(input: ProductionCutoverPlanInput) {
  return hash(JSON.stringify(input.artifacts.map(file => ({ name: file.name, sqlHash: hash(file.sql), checksum: file.checksum.toLowerCase(), checksumVariants: [...new Set((file.checksumVariants ?? []).map(v => v.toLowerCase()))].sort() })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)));
}
function mappingBinding(input: ProductionCutoverPlanInput) {
  return hash(JSON.stringify(buildProductionCutoverPlan(input).identityMapping.map(user => ({ id: user.id, emailHash: user.emailHash, orgId: user.orgId, role: user.role, supabaseId: user.supabaseId }))));
}
function backupGuard(options: ProductionCutoverSqlInput) {
  return `${guard(`to_regclass('fcm_release_backup.manifest') IS NULL OR to_regclass('fcm_release_backup.users') IS NULL`, 'FCM_BACKUP_REQUIRED')}
LOCK TABLE ${schema}.manifest, ${schema}.users, ${schema}.columns, ${schema}.ledger, ${schema}."restoreProbe" IN EXCLUSIVE MODE;
${guard(`NOT EXISTS (SELECT 1 FROM ${schema}.manifest WHERE backup_key=${q(options.backup.key)} AND plan_fingerprint=${q(options.backup.planFingerprint)} AND artifact_binding=${q(artifactBinding(options.input))} AND mapping_binding=${q(mappingBinding(options.input))} AND restore_verified=true)
 OR (SELECT count(*) FROM ${schema}.manifest) <> 1`, 'FCM_BACKUP_BINDING_MISMATCH')}
${guard(`(SELECT count(*) FROM ${schema}.users) <> (SELECT user_count FROM ${schema}.manifest)
 OR EXISTS (SELECT 1 FROM ${schema}.users b WHERE b.row_hash IS DISTINCT FROM ${pgHash('b.row_data::text')} OR b.immutable_hash IS DISTINCT FROM ${pgHash("(b.row_data - 'kindeId' - 'supabaseId')::text")})`, 'FCM_BACKUP_DATA_CHANGED')}`;
}
function immutableGuard() {
  return guard(`(SELECT count(*) FROM public."User") <> (SELECT count(*) FROM ${schema}.users)
 OR EXISTS (SELECT 1 FROM public."User" u LEFT JOIN ${schema}.users b ON b.user_id=u.id WHERE b.user_id IS NULL OR b.immutable_hash IS DISTINCT FROM ${pgHash(`(${immutable('u')})::text`)})`, 'FCM_IMMUTABLE_USER_CHANGED');
}
function mappingGuard() {
  return guard(`EXISTS (SELECT 1 FROM public."User" u LEFT JOIN fcm_expected_users e ON e.id=u.id WHERE e.id IS NULL OR u."supabaseId" IS DISTINCT FROM e.subject)
 OR EXISTS (SELECT "supabaseId" FROM public."User" GROUP BY "supabaseId" HAVING count(*) <> 1)
 OR EXISTS (SELECT 1 FROM public."User" WHERE "supabaseId" IS NULL OR btrim("supabaseId")='')`, 'FCM_IDENTITY_MAPPING_CHANGED');
}
function record(file: CutoverMigrationArtifact, key: string) {
  const id = hash(`${key}:${file.name}`).slice(0, 32);
  return `INSERT INTO public."_prisma_migrations" (id, checksum, migration_name, started_at, finished_at, applied_steps_count) VALUES (${q(`${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`)}, ${q(file.checksum.toLowerCase())}, ${q(file.name)}, clock_timestamp(), clock_timestamp(), 1);`;
}
function postLedgerGuard(input: ProductionCutoverPlanInput, newlyApplied: CutoverMigrationArtifact[]) {
  const expected = [...input.ledger.filter(row => row.rolled_back_at === null).map(row => ({ name: row.migration_name, checksum: row.checksum.toLowerCase() })), ...newlyApplied.map(file => ({ name: file.name, checksum: file.checksum.toLowerCase() }))];
  const values = expected.map(file => `(${q(file.name)}, ${q(file.checksum)})`);
  const query = values.length ? `VALUES ${values.join(', ')}` : 'SELECT NULL::text, NULL::text WHERE false';
  return guard(`EXISTS (WITH expected(name, checksum) AS (${query}), actual AS (SELECT migration_name::text, lower(checksum)::text FROM public."_prisma_migrations" WHERE rolled_back_at IS NULL) SELECT 1 FROM ((SELECT * FROM expected EXCEPT ALL SELECT * FROM actual) UNION ALL (SELECT * FROM actual EXCEPT ALL SELECT * FROM expected)) differences)
 OR EXISTS (SELECT 1 FROM public."_prisma_migrations" WHERE rolled_back_at IS NULL AND finished_at IS NULL)`, 'FCM_LEDGER_POSTCONDITION_CHANGED');
}

/** Returns SQL for review only. Approval/evidence are runner preconditions, not
 * proof of consent or substitute for the durable SQL guards and human release. */
export function buildProductionCutoverSql(options: ProductionCutoverSqlInput) {
  if (!['backup', 'additive', 'finalize'].includes(options.phase)) throw new Error('PHASE_INVALID');
  if (!options.approval || options.approval.granted !== true || options.approval.phase !== options.phase || !options.approval.reference.trim()) throw new Error('APPROVAL_REQUIRED');
  if (!options.backup || options.backup.schema !== 'fcm_release_backup' || !/^[a-f0-9]{64}$/.test(options.backup.key) || !/^[a-f0-9]{64}$/.test(options.backup.planFingerprint)) throw new Error('BACKUP_DESCRIPTOR_INVALID');
  const plan = buildProductionCutoverPlan(options.input);
  if (!plan.ready) throw new Error('PLAN_BLOCKED');
  if (options.expectedPlanFingerprint !== plan.planFingerprint) throw new Error('PLAN_BINDING_MISMATCH');
  if (options.phase !== 'finalize' && options.backup.planFingerprint !== plan.planFingerprint) throw new Error('BACKUP_BINDING_MISMATCH');
  if (options.phase !== 'backup' && options.backup.validated !== true) throw new Error('BACKUP_REQUIRED');
  if (options.phase === 'finalize') {
    if (options.approval.promoted !== true || options.approval.realAuthVerified !== true) throw new Error('FINALIZE_EVIDENCE_REQUIRED');
    if (plan.pendingMigrations.length) throw new Error('ADDITIVE_MIGRATIONS_PENDING');
    if (!plan.deferredFinalize) throw new Error('FINALIZE_ALREADY_APPLIED');
  }
  const header = `BEGIN;
SET LOCAL standard_conforming_strings = on;
SET LOCAL search_path = pg_catalog, public;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SELECT pg_advisory_xact_lock(72707369);
LOCK TABLE public."User", public."_prisma_migrations" IN EXCLUSIVE MODE;
${ledgerGuard(options.input)}
${inventorySql(options.input)}
${kindeGuard()}`;
  let body: string;
  if (options.phase === 'backup') {
    body = `CREATE SCHEMA ${schema};
REVOKE ALL ON SCHEMA ${schema} FROM PUBLIC;
CREATE TABLE ${schema}.manifest (backup_key text PRIMARY KEY, plan_fingerprint text NOT NULL, user_fingerprint text NOT NULL, artifact_binding text NOT NULL, mapping_binding text NOT NULL, approval_reference text NOT NULL, user_count bigint NOT NULL, restore_verified boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), additive_finished_at timestamptz, finalize_finished_at timestamptz, final_plan_fingerprint text);
CREATE TABLE ${schema}.users AS SELECT u.id AS user_id, to_jsonb(u) AS row_data, ${pgHash('to_jsonb(u)::text')} AS row_hash, ${pgHash(`(${immutable('u')})::text`)} AS immutable_hash FROM public."User" u;
ALTER TABLE ${schema}.users ADD PRIMARY KEY (user_id);
CREATE TABLE ${schema}.columns AS SELECT * FROM information_schema.columns WHERE table_schema='public' AND table_name='User';
CREATE TABLE ${schema}.ledger AS SELECT to_jsonb(m) AS row_data FROM public."_prisma_migrations" m;
CREATE TABLE ${schema}."restoreProbe" (LIKE public."User" INCLUDING ALL);
REVOKE ALL ON ALL TABLES IN SCHEMA ${schema} FROM PUBLIC;
INSERT INTO ${schema}.manifest (backup_key, plan_fingerprint, user_fingerprint, artifact_binding, mapping_binding, approval_reference, user_count) VALUES (${q(options.backup.key)}, ${q(plan.planFingerprint)}, ${q(plan.userFingerprint)}, ${q(artifactBinding(options.input))}, ${q(mappingBinding(options.input))}, ${q(options.approval.reference)}, (SELECT count(*) FROM public."User"));
INSERT INTO ${schema}."restoreProbe" SELECT (jsonb_populate_record(NULL::${schema}."restoreProbe", b.row_data)).* FROM ${schema}.users b;
${guard(`EXISTS (SELECT 1 FROM ${schema}."restoreProbe" u FULL JOIN ${schema}.users b ON b.user_id=u.id WHERE u.id IS NULL OR b.user_id IS NULL OR to_jsonb(u) IS DISTINCT FROM b.row_data OR ${pgHash('to_jsonb(u)::text')} IS DISTINCT FROM b.row_hash)`, 'FCM_BACKUP_RESTORE_MISMATCH')}
UPDATE ${schema}.manifest SET restore_verified=true WHERE backup_key=${q(options.backup.key)};`;
  } else if (options.phase === 'additive') {
    body = `${backupGuard(options)}
${immutableGuard()}
${guard(`EXISTS (SELECT 1 FROM ${schema}.manifest WHERE additive_finished_at IS NOT NULL)`, 'FCM_PHASE_ALREADY_APPLIED')}
${guard(`EXISTS (SELECT 1 FROM public."User" u JOIN fcm_expected_users e ON e.id=u.id WHERE NULLIF(to_jsonb(u)->>'supabaseId','') IS NOT NULL AND to_jsonb(u)->>'supabaseId' IS DISTINCT FROM e.subject)`, 'FCM_IDENTITY_SUBJECT_CONFLICT')}
${plan.pendingMigrations.map(file => `${transactionBody(file.sql)}\n${record(file, options.backup.key)}`).join('\n')}
UPDATE public."User" u SET "supabaseId"=e.subject FROM fcm_expected_users e WHERE e.id=u.id;
${mappingGuard()}
ALTER TABLE public."User" ALTER COLUMN "supabaseId" SET NOT NULL;
${immutableGuard()}
${kindeGuard()}
${postLedgerGuard(options.input, plan.pendingMigrations)}
UPDATE ${schema}.manifest SET additive_finished_at=clock_timestamp() WHERE backup_key=${q(options.backup.key)};`;
  } else {
    const final = plan.deferredFinalize!;
    body = `${backupGuard(options)}
${guard(`NOT EXISTS (SELECT 1 FROM ${schema}.manifest WHERE additive_finished_at IS NOT NULL AND finalize_finished_at IS NULL)`, 'FCM_PHASE_ALREADY_APPLIED')}
${immutableGuard()}
${mappingGuard()}
${transactionBody(final.sql, true)}
${record(final, options.backup.key)}
${immutableGuard()}
${mappingGuard()}
${postLedgerGuard(options.input, [final])}
UPDATE ${schema}.manifest SET finalize_finished_at=clock_timestamp(), final_plan_fingerprint=${q(plan.planFingerprint)} WHERE backup_key=${q(options.backup.key)};`;
  }
  return { phase: options.phase, sql: `${header}\n${body}\nCOMMIT;`, planFingerprint: plan.planFingerprint, migrationAuthorized: false as const };
}
