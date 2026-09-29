import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { readVerifiedPartnerPreviewTarget } from './inspect-partner-preview.js'

const role = 'fcm_tire_v2_preview_20260929'
const team = 'team_KUG1PtOwoJ16eUqxiOJ330Os'
const project = 'prj_mw1xLIqutlRSIG2F2BryfPqDvN2L'
const expectedMigrations = 46
const tireTables = ['TireCohortV2ResearchSnapshot', 'TireCohortV2ResearchHead']

async function main() {
  const apply = process.argv.includes('--apply')
  const direct = readVerifiedPartnerPreviewTarget()
  const owner = new PrismaClient({ datasourceUrl: direct.toString(), log: [] })
  try {
    const before = await owner.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      const [database] = await tx.$queryRaw<{ name: string; migrations: bigint; users: bigint }[]>`
        SELECT current_database() AS name,
          (SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migrations,
          (SELECT count(*) FROM "User") AS users
      `
      const existing = await tx.$queryRaw<{ name: string }[]>`SELECT rolname AS name FROM pg_roles WHERE rolname = ${role}`
      const tables = await tx.$queryRaw<{ name: string; rls: boolean; forced: boolean }[]>`
        SELECT relname AS name, relrowsecurity AS rls, relforcerowsecurity AS forced
        FROM pg_class WHERE relnamespace = 'public'::regnamespace
          AND relname IN ('TireCohortV2ResearchSnapshot', 'TireCohortV2ResearchHead')
      `
      return { database, existing, tables }
    })
    if (before.database?.name !== 'neondb' || Number(before.database.migrations) !== expectedMigrations ||
        Number(before.database.users) !== 3 || before.existing.length || before.tables.length !== 2 ||
        before.tables.some(t => !t.rls || !t.forced)) throw new Error('Preview database or role inventory changed')
    console.log(JSON.stringify({ mode: apply ? 'PROVISION_PREVIEW' : 'READ_ONLY_PREFLIGHT', project: 'broad-art-99750179', database: 'neondb', role, migrations: expectedMigrations, users: 3, forcedRlsTables: 2 }))
    if (!apply) return
    if (process.env.FCM_TIRE_V2_PREVIEW_PROVISION !== `CREATE_LIMITED_ROLE:${role}`) throw new Error('Scoped provision confirmation missing')

    const password = randomBytes(32).toString('hex')
    await owner.$executeRawUnsafe(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`)
    await owner.$executeRawUnsafe(`GRANT CONNECT ON DATABASE neondb TO ${role}`)
    await owner.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${role}`)
    await owner.$executeRawUnsafe(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${role}`)
    await owner.$executeRawUnsafe(`REVOKE ALL ON TABLE "_prisma_migrations" FROM ${role}`)
    await owner.$executeRawUnsafe(`GRANT UPDATE ON TABLE "Organization" TO ${role}`)
    for (const table of tireTables) {
      await owner.$executeRawUnsafe(`GRANT INSERT, UPDATE ON TABLE "${table}" TO ${role}`)
    }

    const runtimeUrl = new URL(direct.toString())
    runtimeUrl.username = role
    runtimeUrl.password = password
    const runtime = new PrismaClient({ datasourceUrl: runtimeUrl.toString(), log: [] })
    try {
      const [identity] = await runtime.$queryRaw<{
        superuser: boolean; bypassrls: boolean; users: bigint; can_ledger: boolean;
        can_read_v2: boolean; can_write_v2: boolean;
      }[]>`
        SELECT r.rolsuper AS superuser, r.rolbypassrls AS bypassrls,
          (SELECT count(*) FROM "User") AS users,
          has_table_privilege(current_user, 'public."_prisma_migrations"', 'SELECT') AS can_ledger,
          has_table_privilege(current_user, 'public."TireCohortV2ResearchSnapshot"', 'SELECT') AS can_read_v2,
          has_table_privilege(current_user, 'public."TireCohortV2ResearchSnapshot"', 'INSERT') AS can_write_v2
        FROM pg_roles r WHERE r.rolname = current_user
      `
      if (!identity || identity.superuser || identity.bypassrls || Number(identity.users) !== 3 ||
          identity.can_ledger || !identity.can_read_v2 || !identity.can_write_v2) throw new Error('Limited role verification failed')
    } finally { await runtime.$disconnect() }
    console.log(JSON.stringify({ roleCreated: true, roleBypassesRls: false, runtimeUserRead: true, tireDmlReady: true, ledgerReadable: false }))

    const cli = process.env.VERCEL_CLI_PATH
    if (!cli) throw new Error('Vercel CLI path required')
    const deployment = spawnSync(process.execPath, [cli, 'deploy', '--yes', '--scope', team, '--project', project,
      '--env', `STAGING_DATABASE_URL=${runtimeUrl.toString()}`,
      '--env', 'FCM_TIRE_V2_RESEARCH_CAPTURE_ENABLED=false'], {
      cwd: resolve('../..'), encoding: 'utf8', windowsHide: true, timeout: 360_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    // Neither raw CLI diagnostics nor the per-deployment URL containing credentials are logged.
    if (deployment.status !== 0) throw new Error('Preview deployment failed; limited role remains for review')
    const url = deployment.stdout.match(/https:\/\/freight-cost-[a-z0-9-]+\.vercel\.app/)?.[0]
    if (!url) throw new Error('Preview URL unavailable; inspect Vercel deployment list')
    const [health, ready, disabled] = await Promise.all([
      fetch(`${url}/health`), fetch(`${url}/ready`),
      fetch(`${url}/cost-bases/tire-cohort-v2-research/current?comparisonKey=readiness`),
    ])
    const readyBody = ready.ok ? await ready.json() as { database?: string } : {}
    if (health.status !== 200 || ready.status !== 200 || readyBody.database !== 'connected' || disabled.status !== 404) {
      throw new Error('Preview smoke failed; inspect immutable deployment without enabling capture')
    }
    console.log(JSON.stringify({ apiPreviewUrl: url, health: health.status, ready: ready.status,
      database: readyBody.database, captureRoute: 'OFF', captureRouteStatus: disabled.status,
      productionChanged: false, sharedEnvironmentChanged: false }))
  } finally { await owner.$disconnect() }
}

main().catch(() => {
  console.error('Scoped Preview provision/deploy stopped. Inspect role and deployment state before retrying; credentials were not printed.')
  process.exitCode = 1
})
