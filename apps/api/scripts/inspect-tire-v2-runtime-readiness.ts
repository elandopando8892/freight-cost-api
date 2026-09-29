import { PrismaClient } from '@prisma/client'
import { readVerifiedPartnerPreviewTarget } from './inspect-partner-preview.js'

/** Read-only check of the exact Preview database role and v2 research tables. */
async function main() {
  const target = readVerifiedPartnerPreviewTarget()
  const db = new PrismaClient({ datasourceUrl: target.toString(), log: [] })
  try {
    const result = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10000ms'")
      const roles = await tx.$queryRaw<{ superuser: boolean; bypassrls: boolean }[]>`
        SELECT rolsuper AS superuser, rolbypassrls AS bypassrls
        FROM pg_roles WHERE rolname = current_user
      `
      const tables = await tx.$queryRaw<{
        name: string; rls: boolean; forced: boolean; can_select: boolean;
        can_insert: boolean; can_update: boolean;
      }[]>`
        SELECT c.relname AS name, c.relrowsecurity AS rls,
          c.relforcerowsecurity AS forced,
          has_table_privilege(current_user, c.oid, 'SELECT') AS can_select,
          has_table_privilege(current_user, c.oid, 'INSERT') AS can_insert,
          has_table_privilege(current_user, c.oid, 'UPDATE') AS can_update
        FROM pg_class c
        WHERE c.relnamespace = 'public'::regnamespace
          AND c.relname IN ('TireCohortV2ResearchSnapshot', 'TireCohortV2ResearchHead')
        ORDER BY c.relname
      `
      const migrations = await tx.$queryRaw<{ total: bigint; incomplete: bigint }[]>`
        SELECT count(*) AS total, count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS incomplete
        FROM "_prisma_migrations"
      `
      const candidates = await tx.$queryRaw<{
        name: string; can_login: boolean; can_connect: boolean; can_read_users: boolean;
        can_read_v2: boolean; can_write_v2: boolean;
      }[]>`
        SELECT rolname AS name, rolcanlogin AS can_login,
          has_database_privilege(rolname, current_database(), 'CONNECT') AS can_connect,
          has_table_privilege(rolname, 'public."User"', 'SELECT') AS can_read_users,
          has_table_privilege(rolname, 'public."TireCohortV2ResearchSnapshot"', 'SELECT') AS can_read_v2,
          has_table_privilege(rolname, 'public."TireCohortV2ResearchSnapshot"', 'INSERT') AS can_write_v2
        FROM pg_roles WHERE rolcanlogin AND NOT rolsuper AND NOT rolbypassrls
          AND rolname !~ '^pg_' ORDER BY rolname
      `
      return { roles, tables, migrations, candidates }
    })
    console.log(JSON.stringify({
      mode: 'READ_ONLY', target: 'verified-freight-cost-api-preview-neon',
      migrationCount: Number(result.migrations[0]?.total),
      incompleteMigrations: Number(result.migrations[0]?.incomplete),
      roleBypassesRls: result.roles[0]?.superuser || result.roles[0]?.bypassrls,
      limitedRuntimeCandidates: result.candidates,
      tables: result.tables,
      writesAttempted: false,
    }, null, 2))
    if (result.tables.length !== 2 || result.roles.length !== 1 ||
        result.roles[0].superuser || result.roles[0].bypassrls ||
        result.tables.some(table => !table.rls || !table.forced || !table.can_select || !table.can_insert || !table.can_update) ||
        Number(result.migrations[0]?.total) !== 46 || Number(result.migrations[0]?.incomplete) !== 0) {
      process.exitCode = 1
    }
  } finally { await db.$disconnect() }
}

main().catch(() => {
  console.error('Runtime readiness unavailable; no database write attempted.')
  process.exitCode = 2
})
