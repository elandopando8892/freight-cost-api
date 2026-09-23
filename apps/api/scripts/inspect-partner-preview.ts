import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { evaluatePartnerMigrationGate, type MigrationRecord } from '../src/modules/pilot/partner-migration-gate.js';

// Explicit API project: never infer it from the root's WEB .vercel link.
const project = 'prj_mw1xLIqutlRSIG2F2BryfPqDvN2L';
const team = 'team_KUG1PtOwoJ16eUqxiOJ330Os';
const expectedNeon = 'broad-art-99750179';
const expectedHost = 'ep-autumn-thunder-av6e9bsh.c-11.us-east-1.aws.neon.tech';
const keys = ['STAGING_NEON_PROJECT_ID', 'STAGING_DATABASE_URL', 'STAGING_DATABASE_URL_UNPOOLED'];

export function readVerifiedPartnerPreviewTarget() {
  const cli = process.env.VERCEL_CLI_PATH;
  if (!cli) throw new Error('CLI required');
  const api = (endpoint: string) => JSON.parse(execFileSync(process.execPath, [cli, 'api', endpoint, '--method', 'GET', '--raw'], {
    encoding: 'utf8', timeout: 30_000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  }));
  const metadata = api(`/v9/projects/${project}/env?teamId=${team}&target=preview`).envs;
  const values: Record<string, string> = {};
  for (const key of keys) {
    const matches = metadata.filter((item: { key: string }) => item.key === key);
    // Branch overrides, ambiguity or shared production scope require human review.
    if (matches.length !== 1) throw new Error('Ambiguous staging configuration');
    const entry = matches[0];
    if (entry.gitBranch || entry.target?.length !== 1 || entry.target[0] !== 'preview') throw new Error('Unsafe scope');
    const result = api(`/v1/projects/${project}/env/${encodeURIComponent(entry.id)}?teamId=${team}`);
    if (result.key !== key || typeof result.value !== 'string') throw new Error('Missing value');
    values[key] = result.value;
  }
  if (values.STAGING_NEON_PROJECT_ID !== expectedNeon) throw new Error('Project changed');
  const runtime = new URL(values.STAGING_DATABASE_URL);
  const direct = new URL(values.STAGING_DATABASE_URL_UNPOOLED);
  for (const url of [runtime, direct]) {
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname.replace('-pooler.', '.') !== expectedHost || url.pathname !== '/neondb') throw new Error('Target changed');
  }
  if (direct.hostname !== expectedHost) throw new Error('Direct endpoint required');
  return direct;
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Read-only preview migration inventory. Run from apps/api with VERCEL_CLI_PATH pointing to an installed Vercel dist/index.js. Reads only three staging values in memory; no credentials are printed or written. No migrate/seed/deploy commands.');
    return;
  }
  const direct = readVerifiedPartnerPreviewTarget();
  const root = resolve('prisma/migrations');
  const artifacts = readdirSync(root, { withFileTypes: true }).filter(item => item.isDirectory()).map(item => {
    const sql = readFileSync(resolve(root, item.name, 'migration.sql'), 'utf8');
    // Prisma recognizes LF/CRLF variants; do not misreport a Windows checkout as drift.
    const lf = sql.replace(/\r\n/g, '\n');
    return { name: item.name, checksums: [sql, lf, lf.replace(/\n/g, '\r\n')].map(text => createHash('sha256').update(text).digest('hex')) };
  });
  direct.searchParams.set('connect_timeout', '10');
  const db = new PrismaClient({ datasourceUrl: direct.toString(), log: [] });
  try {
    const records = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10000ms'");
      return tx.$queryRaw<MigrationRecord[]>`SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at`;
    }, { timeout: 15_000 });
    const gate = evaluatePartnerMigrationGate(artifacts, records);
    console.log(JSON.stringify({ schemaVersion: 'fcm.partner-preview-inventory.v1', checkedAt: new Date().toISOString(), mode: 'READ_ONLY', project, team, configuredNeonProject: expectedNeon, host: expectedHost, database: 'neondb', ledgerRecords: records.length, artifactCount: artifacts.length, writesAttempted: false, authenticatedFlowTested: false, ...gate }, null, 2));
    if (!gate.schemaCurrent) process.exitCode = 1;
  } finally { await db.$disconnect(); }
}

if (require.main === module) main().catch(() => {
  // Never print raw Vercel/Prisma errors, which can contain connection values.
  console.error('Read-only inventory unavailable: verify CLI login, exact preview target, connectivity and migration ledger. No migration was attempted.');
  process.exitCode = 2;
});
