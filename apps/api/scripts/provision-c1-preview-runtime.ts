import { execFileSync, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { FCM_API_VERCEL_PROJECT, FCM_VERCEL_PROJECT } from '../src/modules/pilot/oauth-preview-coverage.js'
import { readVerifiedPartnerPreviewTarget } from './inspect-partner-preview.js'

// One release cut. Never rotate the role serving the current Preview pair.
const role = 'fcm_c1_preview_20260929'
const priorRole = 'fcm_tire_v2_preview_20260929'
const expectedBranch = 'codex/cost-tires-release-s14'
const expectedMigrations = 46
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

function git(...args: string[]) {
  return execFileSync('git', args, { cwd: repositoryRoot, encoding: 'utf8', windowsHide: true }).trim()
}

async function main() {
  const apply = process.argv.includes('--apply')
  const resume = process.argv.includes('--resume')
  if (resume && !apply) throw new Error('Resume requires apply')
  const release = git('rev-parse', 'HEAD')
  if (git('symbolic-ref', '--short', 'HEAD') !== expectedBranch || git('status', '--porcelain')) {
    throw new Error('Clean expected branch required')
  }
  if (process.env.FCM_C1_RELEASE_SHA !== release) throw new Error('Exact release confirmation missing')
  const cli = process.env.VERCEL_CLI_PATH
  if (!cli || !existsSync(cli)) throw new Error('Verified Vercel CLI path required')
  const direct = readVerifiedPartnerPreviewTarget()
  direct.searchParams.set('connect_timeout', '10')
  const owner = new PrismaClient({ datasourceUrl: direct.toString(), log: [] })
  try {
    const before = await owner.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10000ms'")
      const [database] = await tx.$queryRaw<{ name: string; migrations: bigint; users: bigint }[]>`
        SELECT current_database() AS name,
          (SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migrations,
          (SELECT count(*) FROM "User") AS users
      `
      const roles = await tx.$queryRaw<{ name: string; superuser: boolean; bypassrls: boolean }[]>`
        SELECT rolname AS name, rolsuper AS superuser, rolbypassrls AS bypassrls
        FROM pg_roles WHERE rolname IN (${role}, ${priorRole})
      `
      const tables = await tx.$queryRaw<{ name: string; rls: boolean; forced: boolean }[]>`
        SELECT relname AS name, relrowsecurity AS rls, relforcerowsecurity AS forced
        FROM pg_class WHERE relnamespace = 'public'::regnamespace
          AND relname IN ('TireCohortV2ResearchSnapshot', 'TireCohortV2ResearchHead')
      `
      return { database, roles, tables }
    }, { timeout: 15_000 })
    const previous = before.roles.find(item => item.name === priorRole)
    const candidate = before.roles.find(item => item.name === role)
    if (before.database?.name !== 'neondb' || Number(before.database.migrations) !== expectedMigrations ||
        Number(before.database.users) !== 3 || Boolean(candidate) !== resume ||
        !previous || previous.superuser || previous.bypassrls || before.tables.length !== 2 ||
        before.tables.some(table => !table.rls || !table.forced)) {
      throw new Error('Neon staging, prior role or RLS inventory changed')
    }
    console.log(JSON.stringify({ mode: apply ? 'CREATE_LIMITED_ROLE_AND_API_PREVIEW' : 'READ_ONLY_PREFLIGHT',
      project: 'broad-art-99750179', database: 'neondb', role, priorRoleUntouched: true,
      release, migrations: expectedMigrations, users: 3, forcedRlsTables: 2 }))
    if (!apply) return
    if (process.env.FCM_C1_PREVIEW_PROVISION !== `CREATE_LIMITED_ROLE:${role}:${release}`) {
      throw new Error('Scoped role creation confirmation missing')
    }

    if (resume) {
      // A failed CLI call can leave the newly created role without a usable
      // password in this process. Only rotate it if no deployment uses this SHA.
      const result = JSON.parse(execFileSync(process.execPath, [cli, 'api',
        `/v6/deployments?projectId=${FCM_API_VERCEL_PROJECT.id}&teamId=${FCM_VERCEL_PROJECT.teamId}&limit=20`,
        '--method', 'GET', '--raw'], { encoding: 'utf8', windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000 })) as {
        deployments?: { meta?: { gitCommitSha?: string } }[]
      }
      if (!Array.isArray(result.deployments) ||
          result.deployments.some(item => item.meta?.gitCommitSha === release)) {
        throw new Error('An API deployment already references this release; do not rotate its role')
      }
    }

    const password = randomBytes(32).toString('hex')
    await owner.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10000ms'")
      if (resume) {
        await tx.$executeRawUnsafe(`ALTER ROLE ${role} PASSWORD '${password}'`)
      } else {
        await tx.$executeRawUnsafe(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`)
        await tx.$executeRawUnsafe(`GRANT CONNECT ON DATABASE neondb TO ${role}`)
        await tx.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${role}`)
        await tx.$executeRawUnsafe(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${role}`)
        await tx.$executeRawUnsafe(`REVOKE ALL ON TABLE "_prisma_migrations" FROM ${role}`)
        await tx.$executeRawUnsafe(`GRANT UPDATE ON TABLE "Organization" TO ${role}`)
        // Existing tire v2 capture remains OFF; no DML grant is needed.
      }
    }, { timeout: 20_000 })

    const runtimeUrl = new URL(direct.toString())
    runtimeUrl.username = role
    runtimeUrl.password = password
    const runtime = new PrismaClient({ datasourceUrl: runtimeUrl.toString(), log: [] })
    try {
      const [identity] = await runtime.$queryRaw<{
        name: string; superuser: boolean; createdb: boolean; createrole: boolean; bypassrls: boolean;
        users: bigint; can_ledger: boolean; can_read_quote: boolean; can_update_org: boolean; can_write_tire: boolean;
      }[]>`
        SELECT current_user AS name, r.rolsuper AS superuser, r.rolcreatedb AS createdb,
          r.rolcreaterole AS createrole, r.rolbypassrls AS bypassrls,
          (SELECT count(*) FROM "User") AS users,
          has_table_privilege(current_user, 'public."_prisma_migrations"', 'SELECT') AS can_ledger,
          has_table_privilege(current_user, 'public."Quote"', 'SELECT') AS can_read_quote,
          has_table_privilege(current_user, 'public."Organization"', 'UPDATE') AS can_update_org,
          has_table_privilege(current_user, 'public."TireCohortV2ResearchSnapshot"', 'INSERT') AS can_write_tire
        FROM pg_roles r WHERE r.rolname = current_user
      `
      if (!identity || identity.name !== role || identity.superuser || identity.createdb || identity.createrole ||
          identity.bypassrls || Number(identity.users) !== 3 || identity.can_ledger ||
          !identity.can_read_quote || !identity.can_update_org || identity.can_write_tire) {
        throw new Error('Limited runtime verification failed')
      }
    } finally { await runtime.$disconnect() }
    console.log(JSON.stringify({ roleReady: true, oldRoleRotated: false, bypassesRls: false,
      quoteRead: true, organizationUpdate: true, tireWrite: false, ledgerReadable: false }))

    const childEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      !['SUPABASE_ACCESS_TOKEN', 'DATABASE_URL', 'STAGING_DATABASE_URL', 'STAGING_DATABASE_URL_UNPOOLED'].includes(key)))
    const deployment = spawnSync(process.execPath, [cli, 'deploy', '--yes', '--scope', FCM_VERCEL_PROJECT.teamId,
      '--project', FCM_API_VERCEL_PROJECT.id, '--target', 'preview',
      '--env', `STAGING_DATABASE_URL=${runtimeUrl.toString()}`,
      '--env', `RELEASE_SHA=${release}`,
      '--env', 'FCM_TIRE_V2_RESEARCH_CAPTURE_ENABLED=false',
      '--env', 'OPENAI_API_KEY=', '--env', 'RATEWARE_API_URL=', '--env', 'CRON_SECRET=',
      '--env', 'FCM_STAGING_MIGRATION_CONFIRMATION=DISABLED',
      '--build-env', 'FCM_STAGING_MIGRATION_CONFIRMATION=DISABLED',
      '--meta', 'gitDirty=0'], {
      cwd: repositoryRoot, env: childEnv, encoding: 'utf8', windowsHide: true, timeout: 360_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    // Never print raw CLI output: deployment arguments contain a credential.
    if (deployment.status !== 0) {
      const diagnostics = `${deployment.stderr ?? ''}\n${deployment.stdout ?? ''}`
      console.error(JSON.stringify({ deployExit: deployment.status,
        unknownOption: /unknown or unexpected option/i.test(diagnostics),
        invalidEnv: /invalid.*environment|environment.*invalid/i.test(diagnostics),
        projectError: /project.*not found|not found.*project/i.test(diagnostics),
        invalidTarget: /invalid.*target|target.*invalid/i.test(diagnostics),
        buildError: /build.*fail|fail.*build/i.test(diagnostics),
        authError: /unauthorized|not authenticated/i.test(diagnostics),
        redactedLines: diagnostics.split(/\r?\n/).filter(Boolean).slice(-8)
          .map(line => line.replace(/\S{24,}/g, '[REDACTED]').slice(0, 180)) }))
      throw new Error('API Preview deployment failed; inspect Vercel without exposing credentials')
    }
    const url = deployment.stdout.match(/https:\/\/freight-cost-[a-z0-9-]+\.vercel\.app/)?.[0]
    if (!url) throw new Error('API Preview URL unavailable; inspect Vercel deployment list')
    const [health, ready, capture] = await Promise.all([
      fetch(`${url}/health`, { signal: AbortSignal.timeout(15_000) }),
      fetch(`${url}/ready`, { signal: AbortSignal.timeout(15_000) }),
      fetch(`${url}/cost-bases/tire-cohort-v2-research/current?comparisonKey=readiness`,
        { signal: AbortSignal.timeout(15_000) }),
    ])
    const healthBody = health.ok ? await health.json() as { release?: string; status?: string } : {}
    const readyBody = ready.ok ? await ready.json() as { release?: string; database?: string } : {}
    if (health.status !== 200 || ready.status !== 200 || healthBody.release !== release ||
        readyBody.release !== release || readyBody.database !== 'connected' || capture.status !== 404) {
      throw new Error('New API Preview smoke failed; inspect immutable deployment')
    }
    console.log(JSON.stringify({ apiPreviewUrl: url, release, health: health.status, ready: ready.status,
      database: readyBody.database, tireCaptureStatus: capture.status, priorPreviewUntouched: true,
      sharedEnvironmentChanged: false, productionChanged: false }))
  } finally { await owner.$disconnect() }
}

main().catch(() => {
  console.error('Scoped C1 Preview stopped. Inspect role and deployment state before retrying; no credential was printed.')
  process.exitCode = 1
})
