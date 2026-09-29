import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { readVerifiedPartnerPreviewTarget } from './inspect-partner-preview.js'
import { evaluatePartnerMigrationGate, type MigrationRecord } from '../src/modules/pilot/partner-migration-gate.js'

// One reviewed staging cut. Does not relax migrate-staging.ts or production gates.
const release = '0aab09cfaddde2e71f35b32c6dd2392ed82f8f75'
const expected = [
  '20260830000200_finalize_supabase_identity',
  '20260927000100_tire_calibration_multitenant',
  '20260928000100_tire_economic_review',
  '20260928000200_tire_cohort_v2_research',
]
const backupPath = 'D:/andre/backups/freight-cost-model/staging-neon-20260929014046-00a06193.manifest.json'
let deployAttempted = false

async function main() {
  const apply = process.argv.includes('--apply')
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim()
  if (head !== release) throw new Error('Release changed')
  execFileSync('git', ['diff', '--exit-code', 'HEAD', '--', 'prisma/migrations', 'prisma/schema.prisma'], { stdio: 'pipe', windowsHide: true })
  const backup = JSON.parse(readFileSync(backupPath, 'utf8'))
  if (backup.neonProject !== 'broad-art-99750179' || backup.restore !== 'PASS' ||
      JSON.stringify(backup.sourceCounts) !== JSON.stringify(backup.restoredCounts) ||
      backup.sourceCounts.users !== 3 || backup.sourceCounts.migrations !== 42 ||
      backup.sourceCounts.legacyIds !== 3 ||
      Date.now() - Date.parse(backup.createdAt) > 2 * 60 * 60 * 1000 ||
      !Number.isFinite(Date.parse(backup.createdAt))) throw new Error('Backup gate failed')
  if (createHash('sha256').update(readFileSync(backup.archive)).digest('hex') !== backup.encryptedSha256) throw new Error('Backup checksum changed')
  readFileSync(backup.wrappedKey) // Verify recoverability artifacts remain present; never print key material.
  const root = resolve('prisma/migrations')
  const artifacts = readdirSync(root, { withFileTypes: true }).filter(item => item.isDirectory()).map(item => {
    const sql = readFileSync(resolve(root, item.name, 'migration.sql'), 'utf8')
    const lf = sql.replace(/\r\n/g, '\n')
    return { name: item.name, checksums: [sql, lf, lf.replace(/\n/g, '\r\n')].map(text => createHash('sha256').update(text).digest('hex')) }
  }).sort((a, b) => a.name.localeCompare(b.name))
  if (artifacts.length !== 46) throw new Error('Artifact count changed')
  const direct = readVerifiedPartnerPreviewTarget()
  const db = new PrismaClient({ datasourceUrl: direct.toString(), log: [] })
  try {
    const before = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      const records = await tx.$queryRaw<MigrationRecord[]>`SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations"`
      const gate = evaluatePartnerMigrationGate(artifacts, records)
      if (!gate.ledgerConsistent || JSON.stringify(gate.pending) !== JSON.stringify(expected)) throw new Error('Migration scope changed')
      const [users] = await tx.$queryRaw<{ total: bigint; invalid: bigint; legacy: bigint }[]>`
        SELECT count(*) AS total,
          count(*) FILTER (WHERE "supabaseId" IS NULL OR "supabaseId" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') AS invalid,
          count(*) FILTER (WHERE "kindeId" IS NOT NULL AND btrim("kindeId") <> '') AS legacy FROM "User"`
      if (Number(users.total) !== 3 || Number(users.invalid) !== 0 || Number(users.legacy) !== 3) throw new Error('Identity inventory changed')
      return { pending: gate.pending, users: Number(users.total) }
    })
    console.log(JSON.stringify({ mode: apply ? 'APPROVED_STAGING_CUT' : 'READ_ONLY_PREFLIGHT', release, target: 'broad-art-99750179', backupVerified: true, ...before }))
    if (!apply) return
    if (process.env.FCM_APPROVED_STAGING_CUT !== `APPLY_FOUR:${release}`) throw new Error('Explicit cut confirmation required')
    deployAttempted = true
    const child = spawnSync(process.execPath, [resolve('../../node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], {
      env: { ...process.env, DATABASE_URL: direct.toString() }, encoding: 'utf8', windowsHide: true, timeout: 180_000, stdio: ['ignore', 'pipe', 'pipe'],
    })
    // Prisma output is deliberately not echoed: connection data can appear in diagnostics.
    if (child.status !== 0) throw new Error('Migration failed; inspect ledger read-only before any retry')
    const after = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      const records = await tx.$queryRaw<MigrationRecord[]>`SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations"`
      const gate = evaluatePartnerMigrationGate(artifacts, records)
      const [users] = await tx.$queryRaw<{ total: bigint; unlinked: bigint }[]>`SELECT count(*) AS total, count(*) FILTER (WHERE "supabaseId" IS NULL) AS unlinked FROM "User"`
      const columns = await tx.$queryRaw<{ column_name: string; is_nullable: string }[]>`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'User' AND column_name IN ('kindeId', 'supabaseId')`
      const tables = await tx.$queryRaw<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }[]>`SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname IN ('TireCohortSourceSnapshot', 'TireCohortSourceHead', 'TireCalibrationDossier', 'TireCalibrationReviewEvent', 'TireCalibrationApprovalPackage', 'TireCohortV2ResearchSnapshot', 'TireCohortV2ResearchHead')`
      if (!gate.schemaCurrent || Number(users.total) !== before.users || Number(users.unlinked) !== 0 || columns.length !== 1 || columns[0].column_name !== 'supabaseId' || columns[0].is_nullable !== 'NO' || tables.length !== 7 || tables.some(t => !t.relrowsecurity || !t.relforcerowsecurity)) throw new Error('Post-cut verification failed')
      return { appliedMigrations: records.filter(r => r.finished_at && !r.rolled_back_at).length, users: Number(users.total), kindeColumnRemoved: true, supabaseIdRequired: true, forcedRlsTables: tables.length, ledgerConsistent: gate.ledgerConsistent }
    })
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), migrationApplied: true, ...after, productionTouched: false, authConfigurationChanged: false, captureEnabledByThisScript: false }, null, 2))
  } finally { await db.$disconnect() }
}

main().catch(() => {
  console.error(JSON.stringify({ error: 'Staging cut stopped. Inspect ledger read-only; do not retry blindly.', deployAttempted }))
  process.exitCode = 1
})
