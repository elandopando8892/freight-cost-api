import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { readVerifiedPartnerPreviewTarget } from './inspect-partner-preview.js'

type MigrationRow = { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Read-only tire v2 staging preflight. Uses the already verified Vercel preview Neon target in memory; reports counts and schema names only. No data rows, credentials, migrations, backups or deployments.')
    return
  }
  const direct = readVerifiedPartnerPreviewTarget()
  direct.searchParams.set('connect_timeout', '10')
  const db = new PrismaClient({ datasourceUrl: direct.toString(), log: [] })
  try {
    const result = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10000ms'")
      const [users] = await tx.$queryRaw<{ total: bigint; unlinked: bigint; malformed: bigint }[]>`
        SELECT count(*) AS total,
          count(*) FILTER (WHERE "supabaseId" IS NULL OR btrim("supabaseId") = '') AS unlinked,
          count(*) FILTER (WHERE "supabaseId" IS NOT NULL AND btrim("supabaseId") <> ''
            AND "supabaseId" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') AS malformed
        FROM "User"
      `
      const columns = await tx.$queryRaw<{ column_name: string }[]>`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'User'
          AND column_name IN ('supabaseId', 'kindeId')
      `
      const legacyKindeIds = columns.some(row => row.column_name === 'kindeId')
        ? (await tx.$queryRaw<{ count: bigint }[]>`
            SELECT count(*) AS count FROM "User"
            WHERE "kindeId" IS NOT NULL AND btrim("kindeId") <> ''
          `)[0].count
        : null
      const tables = await tx.$queryRaw<{ table_name: string }[]>`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name IN
          ('TireCohortSourceSnapshot', 'TireCohortSourceHead', 'TireCalibrationDossier',
           'TireCalibrationReviewEvent', 'TireCalibrationApprovalPackage',
           'TireCohortV2ResearchSnapshot', 'TireCohortV2ResearchHead')
      `
      const migrations = await tx.$queryRaw<MigrationRow[]>`
        SELECT migration_name, finished_at, rolled_back_at
        FROM "_prisma_migrations" ORDER BY started_at
      `
      return { users, columns, legacyKindeIds, tables, migrations }
    }, { timeout: 15_000 })
    const artifacts = readdirSync(resolve('prisma/migrations'), { withFileTypes: true })
      .filter(item => item.isDirectory()).map(item => item.name).sort()
    const applied = new Set(result.migrations
      .filter(row => row.finished_at && !row.rolled_back_at).map(row => row.migration_name))
    const pending = artifacts.filter(name => !applied.has(name))
    const failed = result.migrations.filter(row => !row.finished_at && !row.rolled_back_at)
      .map(row => row.migration_name)
    console.log(JSON.stringify({
      schemaVersion: 'fcm.tire-v2-staging-preflight.v1', checkedAt: new Date().toISOString(),
      mode: 'READ_ONLY', target: 'verified-freight-cost-api-preview-neon',
      userCount: Number(result.users.total), unlinkedSupabaseUserCount: Number(result.users.unlinked),
      malformedSupabaseIdCount: Number(result.users.malformed),
      legacyKindeIdCount: result.legacyKindeIds == null ? null : Number(result.legacyKindeIds),
      hasSupabaseIdColumn: result.columns.some(row => row.column_name === 'supabaseId'),
      hasKindeIdColumn: result.columns.some(row => row.column_name === 'kindeId'),
      existingTireTables: result.tables.map(row => row.table_name).sort(),
      appliedMigrationCount: applied.size, artifactCount: artifacts.length,
      pending, failed, writesAttempted: false, backupTaken: false,
      migrationApplied: false, previewDeployed: false,
    }, null, 2))
  } finally {
    await db.$disconnect()
  }
}

main().catch(() => {
  // Never print raw Vercel/Prisma errors: they may contain connection values.
  console.error('Read-only tire v2 staging preflight unavailable; no migration or deployment was attempted.')
  process.exitCode = 2
})
