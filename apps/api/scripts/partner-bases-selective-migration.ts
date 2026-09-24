import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, mkdirSync, openSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { readVerifiedPartnerPreviewTarget } from './inspect-partner-preview.js';

// Only the two explicitly authorized tariff migrations may execute remotely.
const approved = new Map([
  ['20260923000200_partner_tariff_bases', '392da134091cbc9570ff88e6f1a7f4ec479b018f7c5198c6329c1f39c28aad27'],
  ['20260923000300_partner_tariff_lifecycle', '57644104eab7a3ee37b00ef56bed10d50f2da050a41c41aa09a85552af884a06'],
]);
const baselineEnd = '20260923000100_partner_cost_estimates';
const excluded = '20260830000200_finalize_supabase_identity';
const image = 'postgres:17-alpine';
let phase = 'initial';
const q = (text: string) => `'${text.replace(/'/g, "''")}'`;
const hash = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');
function artifacts() {
  const root = resolve('prisma/migrations');
  const files = readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => {
    const sql = readFileSync(resolve(root, d.name, 'migration.sql'), 'utf8').replace(/\r\n/g, '\n');
    return { name: d.name, sql, checksum: hash(sql), variants: [hash(sql), hash(sql.replace(/\n/g, '\r\n'))] };
  }).sort((a, b) => a.name.localeCompare(b.name));
  if (files.length !== 43 || files.filter(f => f.name <= baselineEnd && f.name !== excluded).length !== 40) throw new Error('Artifact set changed');
  for (const [name, checksum] of approved) if (files.find(f => f.name === name)?.checksum !== checksum) throw new Error('Approved SQL changed');
  return files;
}
type Artifact = ReturnType<typeof artifacts>[number];
const record = (f: Artifact) => `INSERT INTO "_prisma_migrations" (id,checksum,migration_name,started_at,finished_at,applied_steps_count) VALUES (${q(randomUUID())},${q(f.checksum)},${q(f.name)},clock_timestamp(),clock_timestamp(),1);`;
function ledgerGuard(files: Artifact[], count: number) {
  const allow = files.map(f => `(${q(f.name)}, ARRAY[${f.variants.map(q).join(',')}])`).join(',');
  return `DO $guard$ BEGIN
    IF (SELECT count(*) FROM "_prisma_migrations" WHERE rolled_back_at IS NULL) <> ${count}
      OR EXISTS(SELECT 1 FROM "_prisma_migrations" m LEFT JOIN (VALUES ${allow}) AS a(name,hashes) ON a.name=m.migration_name WHERE m.rolled_back_at IS NULL AND (m.finished_at IS NULL OR a.name IS NULL OR NOT m.checksum=ANY(a.hashes)))
      OR (SELECT count(DISTINCT migration_name) FROM "_prisma_migrations" WHERE rolled_back_at IS NULL) <> ${count}
    THEN RAISE EXCEPTION 'Ledger does not match expected migration set'; END IF;
  END $guard$;`;
}
const userFingerprint = `SELECT md5(COALESCE(jsonb_agg(to_jsonb(u) ORDER BY u.id)::text,'[]')) AS digest FROM "User" u`;
const authGuard = `DO $guard$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='User' AND column_name='kindeId')
    OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='User' AND column_name='supabaseId' AND is_nullable='YES')
    OR EXISTS(SELECT 1 FROM "_prisma_migrations" WHERE migration_name=${q(excluded)} AND rolled_back_at IS NULL)
  THEN RAISE EXCEPTION 'Auth baseline changed'; END IF;
END $guard$;`;
function selectiveSql(files: Artifact[], failBeforeCommit = false) {
  const baseline = files.filter(f => f.name <= baselineEnd && f.name !== excluded);
  const selected = files.filter(f => approved.has(f.name));
  return `BEGIN;
SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s';
SELECT pg_advisory_xact_lock(72707369);
LOCK TABLE "_prisma_migrations" IN EXCLUSIVE MODE;
${ledgerGuard(baseline, 40)}
${authGuard}
CREATE TEMP TABLE fcm_user_guard ON COMMIT DROP AS ${userFingerprint};
${selected.map(f => `${f.sql}\n${record(f)}`).join('\n')}
${authGuard}
${ledgerGuard([...baseline, ...selected], 42)}
DO $guard$ BEGIN
 IF (SELECT digest FROM fcm_user_guard) IS DISTINCT FROM (${userFingerprint}) THEN RAISE EXCEPTION 'User data changed'; END IF;
END $guard$;
${failBeforeCommit ? "DO $fail$ BEGIN RAISE EXCEPTION 'Injected rehearsal failure'; END $fail$;" : ''}
COMMIT;`;
}
function docker(args: string[], input?: string | Buffer, env = process.env, timeout = 120_000) {
  const r = spawnSync('docker', args, { input, env, encoding: 'utf8', timeout, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(phase.startsWith('rehearsal:') ? r.stderr.slice(-3000) : 'Docker/SQL operation failed (details withheld)');
  return r.stdout.trim();
}
function assertLocalDocker() {
  if (process.env.DOCKER_HOST || process.env.DOCKER_CONTEXT) throw new Error('Docker overrides prohibited');
  const endpoint = docker(['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}']);
  if (!['npipe:////./pipe/dockerDesktopLinuxEngine', 'npipe:////./pipe/docker_engine'].includes(endpoint)) throw new Error('Local Docker required');
}
const localSql = (container: string, sql: string) => docker(['exec', '-i', container, 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'fcm_partner_disposable'], sql);
async function withDisposable(run: (container: string) => void, exposeLoopback = false) {
  const container = `fcm-migration-${randomUUID().slice(0, 12)}`;
  docker(['run', '-d', '--rm', ...(exposeLoopback ? ['-p', '127.0.0.1::5432'] : ['--network', 'none']), '--name', container, '--label', 'fcm.disposable=selective-migration', '-e', 'POSTGRES_PASSWORD=local-fixture-only', '-e', 'POSTGRES_DB=fcm_partner_disposable', image]);
  try {
    let ready = false;
    for (let i=0;i<30;i++) {
      // The image starts a temporary Unix-socket server during initialization.
      // TCP readiness waits for the final server, avoiding that startup race.
      try { docker(['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'fcm_partner_disposable']); ready = true; break; } catch { await new Promise(r => setTimeout(r, 500)); }
    }
    if (!ready) throw new Error('Local PostgreSQL unavailable');
    run(container);
  } finally { docker(['stop', container]); }
}
async function rehearse(files: Artifact[]) {
  phase = 'rehearsal:start';
  await withDisposable(container => {
    phase = 'rehearsal:baseline';
    localSql(container, `CREATE TABLE "_prisma_migrations" (id VARCHAR(36) PRIMARY KEY, checksum VARCHAR(64) NOT NULL, finished_at TIMESTAMPTZ, migration_name VARCHAR(255) NOT NULL, logs TEXT, rolled_back_at TIMESTAMPTZ, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), applied_steps_count INTEGER NOT NULL DEFAULT 0);
${files.filter(f => f.name <= baselineEnd && f.name !== excluded).map(f => `BEGIN;\n${f.sql}\n${record(f)}\nCOMMIT;`).join('\n')}
INSERT INTO "Organization" (id,name,"updatedAt") VALUES ('fixture-org','Synthetic',now());
INSERT INTO "User" (id,"orgId",email,"kindeId","updatedAt") VALUES ('fixture-user','fixture-org','fixture@example.invalid','legacy-fixture',now());`);
    phase = 'rehearsal:rollback';
    let failed = false;
    try { localSql(container, selectiveSql(files, true)); } catch { failed = true; }
    if (!failed) throw new Error('Rollback test did not fail');
    localSql(container, `${ledgerGuard(files.filter(f => f.name <= baselineEnd && f.name !== excluded),40)} ${authGuard}
DO $g$ BEGIN IF to_regclass('public."PartnerTariffBase"') IS NOT NULL THEN RAISE EXCEPTION 'Partial DDL survived'; END IF; END $g$;`);
    phase = 'rehearsal:apply';
    localSql(container, selectiveSql(files));
    phase = 'rehearsal:replay';
    let replayBlocked = false;
    try { localSql(container, selectiveSql(files)); } catch { replayBlocked = true; }
    if (!replayBlocked) throw new Error('Replay not blocked');
    localSql(container, `${ledgerGuard(files.filter(f => f.name !== excluded),42)} ${authGuard}`);
    const mapping = docker(['port', container, '5432/tcp']).match(/^127\.0\.0\.1:(\d+)$/);
    if (!mapping) throw new Error('Unexpected fixture port');
    const url = `postgresql://postgres:local-fixture-only@127.0.0.1:${mapping[1]}/fcm_partner_disposable`;
    const testEnv = { ...process.env, FCM_TEST_DATABASE_URL: url, DATABASE_URL: url, DIRECT_URL: url, VERCEL_ENV: '' };
    phase = 'rehearsal:persistence';
    execFileSync(process.execPath, [resolve('../../node_modules/vitest/vitest.mjs'), 'run', 'tests/partner-cost-postgres.test.ts', 'tests/partner-base-postgres.test.ts'], { env: testEnv, timeout: 120_000, windowsHide: true, stdio: 'pipe' });
    console.log(JSON.stringify({ rehearsal: 'PASS', postgres: '17', baseline: 40, after: 42, rollback: 'PASS', duplicateApply: 'BLOCKED', legacyIdentityPreserved: true, partnerPersistenceSuite: 'PASS' }));
  }, true);
}
async function main() {
  const mode = process.argv[2];
  if (!['--rehearse', '--apply-authorized-preview'].includes(mode)) throw new Error('Use --rehearse or explicit authorized preview mode');
  assertLocalDocker();
  const files = artifacts();
  // Every remote attempt re-runs the exact transaction, rollback and replay locally.
  await rehearse(files);
  if (mode === '--rehearse') return;
  if (process.env.FCM_PARTNER_BASES_PREVIEW_APPROVAL !== '20260923:two-tariff-additive:no-auth') throw new Error('Specific preview authorization required');
  phase = 'preview:identify';
  const target = readVerifiedPartnerPreviewTarget();
  const env = { ...process.env, PGHOST: target.hostname, PGPORT: target.port || '5432', PGDATABASE: 'neondb', PGUSER: decodeURIComponent(target.username), PGPASSWORD: decodeURIComponent(target.password), PGSSLMODE: 'require', PGCONNECT_TIMEOUT: '10' };
  const client = ['run', '--rm', '-i', ...['PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD','PGSSLMODE','PGCONNECT_TIMEOUT'].flatMap(key => ['-e',key]), image];
  const remoteSql = (sql: string) => docker([...client, 'psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1'], sql, env);
  // No business data output: preflight reads only ledger and schema.
  phase = 'preview:read-only-preflight';
  remoteSql(`BEGIN READ ONLY; ${ledgerGuard(files.filter(f => f.name <= baselineEnd && f.name !== excluded),40)} ${authGuard} COMMIT;`);
  phase = 'preview:backup';
  const backupDir = resolve('D:/andre/backups/freight-cost-model', `partner-bases-${Date.now()}`);
  mkdirSync(backupDir, { recursive: true });
  const identity = execFileSync('whoami', { encoding: 'utf8' }).trim();
  execFileSync('icacls', [backupDir, '/inheritance:r', '/grant:r', `${identity}:(OI)(CI)F`, 'SYSTEM:(OI)(CI)F'], { stdio: 'pipe', windowsHide: true });
  const backup = resolve(backupDir,'preview-before.dump');
  const fd = openSync(backup, 'wx');
  let dumpStatus: number | null;
  try {
    const r = spawnSync('docker', [...client, 'pg_dump','--format=custom','--no-owner','--no-privileges','--lock-wait-timeout=10000'], { env, stdio: ['ignore',fd,'pipe'], timeout: 180_000, windowsHide: true });
    dumpStatus = r.status;
  } finally { closeSync(fd); }
  if (dumpStatus !== 0 || statSync(backup).size < 1000) throw new Error('Backup incomplete; no remote SQL applied');
  const data = readFileSync(backup);
  const backupHash = hash(data);
  docker(['run','--rm','-i','--network','none',image,'pg_restore','--list'],data);
  // A real restore in an isolated, portless disposable server, never back to preview.
  phase = 'backup:restore-local';
  await withDisposable(container => {
    docker(['exec','-i',container,'pg_restore','--exit-on-error','--no-owner','--no-privileges','-U','postgres','-d','fcm_partner_disposable'],data);
    localSql(container, `${ledgerGuard(files.filter(f => f.name <= baselineEnd && f.name !== excluded),40)} ${authGuard}`);
  });
  console.log(JSON.stringify({ backup, bytes: data.length, sha256: backupHash, restore: 'PASS', target: target.hostname, database: 'neondb' }));
  // One transaction: reviewed DDL and its real Prisma ledger records commit together.
  phase = 'preview:apply';
  remoteSql(selectiveSql(files));
  phase = 'preview:verify';
  remoteSql(`BEGIN READ ONLY; ${ledgerGuard(files.filter(f => f.name !== excluded),42)} ${authGuard} COMMIT;`);
  console.log(JSON.stringify({ applied: [...approved.keys()], appliedCount: 42, excluded, authChanged: false, deployed: false, backup, backupHash, verifiedAt: new Date().toISOString() }));
}
main().catch((error: unknown) => {
  console.error(`Selective operation stopped at ${phase}. Do not retry blindly: reconcile the read-only ledger and retained backup first.`);
  if (phase.startsWith('rehearsal:') && error instanceof Error) {
    const stderr = (error as Error & { stderr?: Buffer }).stderr;
    console.error(stderr ? stderr.toString().slice(-4000) : error.message);
  }
  process.exitCode = 1;
});
