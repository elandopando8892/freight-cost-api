import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { parse } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { readVerifiedPartnerPreviewTarget } from './inspect-partner-preview.js'
import { assertLocalReadEnvironment, LOCAL_READ_ROLE, LOCAL_READ_TABLES, localReadRoleSql } from '../src/config/local-read-review.js'

const expectedSha = '4f5fc2de0c3d178dace917231e1092040dec21fd'
const root = resolve(__dirname, '../../..')
let phase = 'preflight'

async function portFree() {
  const probe = createServer()
  await new Promise<void>((accept, reject) => {
    probe.once('error', reject)
    probe.listen(3002, '127.0.0.1', () => probe.close(error => error ? reject(error) : accept()))
  })
}

async function main() {
  if (process.argv.some(arg => arg.startsWith('--') && arg !== '--apply')) throw new Error('Unknown option')
  const apply = process.argv.includes('--apply')
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim()
  if (git('branch', '--show-current') !== 'codex/cost-tires-release-s14' || git('rev-parse', 'HEAD') !== expectedSha) {
    throw new Error('Checkout changed')
  }
  if (apply && process.env.FCM_LOCAL_READ_APPROVAL !== `CREATE_SELECT_ROLE:${LOCAL_READ_ROLE}:${expectedSha}`) {
    throw new Error('Exact scoped approval missing')
  }
  await portFree()
  // Select only the already approved public Auth configuration, never old API credentials.
  const publicSource = parse(readFileSync('D:/andre/worktrees/freight-cost-model/supabase-auth-migration-20260830/apps/web/.env.local'))
  const authUrl = publicSource.NEXT_PUBLIC_SUPABASE_URL
  const authKey = publicSource.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (authUrl !== 'https://alqjqzqagdmcywpjtnnr.supabase.co' || !authKey?.startsWith('sb_publishable_')) {
    throw new Error('Approved public Auth configuration missing')
  }
  const direct = readVerifiedPartnerPreviewTarget()
  direct.searchParams.set('connect_timeout', '10')
  direct.searchParams.set('connection_limit', '2')
  const owner = new PrismaClient({ datasourceUrl: direct.toString(), log: [] })
  let runtime: PrismaClient | undefined
  try {
    const before = await owner.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10000ms'")
      const identity = await tx.$queryRaw<{ database: string; migrations: bigint; failed: bigint; users: bigint; quotes: bigint; bases: bigint }[]>`
        SELECT current_database() AS database,
          (SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migrations,
          (SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS failed,
          (SELECT count(*) FROM "User") AS users, (SELECT count(*) FROM "Quote") AS quotes,
          (SELECT count(*) FROM "CostBase") AS bases
      `
      const roles = await tx.$queryRaw<{ name: string; superuser: boolean; bypassrls: boolean; createdb: boolean; createrole: boolean }[]>`
        SELECT rolname AS name, rolsuper AS superuser, rolbypassrls AS bypassrls,
          rolcreatedb AS createdb, rolcreaterole AS createrole
        FROM pg_roles WHERE rolname IN (${LOCAL_READ_ROLE}, 'fcm_c1_preview_20260929', 'fcm_tire_v2_preview_20260929')
        ORDER BY rolname
      `
      const tables = await tx.$queryRaw<{ name: string }[]>`
        SELECT relname AS name FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r'
      `
      return { identity: identity[0], roles, tables }
    }, { timeout: 20_000 })
    if (before.identity.database !== 'neondb' || Number(before.identity.migrations) !== 46 ||
        Number(before.identity.failed) !== 0 || Number(before.identity.users) !== 3 ||
        before.roles.some(role => role.name === LOCAL_READ_ROLE) ||
        before.roles.length !== 2 || before.roles.some(role => role.superuser || role.bypassrls || role.createdb || role.createrole) ||
        LOCAL_READ_TABLES.some(table => !before.tables.some(row => row.name === table))) {
      throw new Error('Preview inventory changed; no mutation authorized')
    }
    console.log(JSON.stringify({ mode: 'READ_ONLY_PREFLIGHT', role: LOCAL_READ_ROLE, release: expectedSha,
      project: 'broad-art-99750179', database: 'neondb', migrations: 46,
      users: Number(before.identity.users), quotes: Number(before.identity.quotes), bases: Number(before.identity.bases),
      existingRolesPreserved: before.roles.map(role => role.name), selectTables: LOCAL_READ_TABLES, credentialStored: false }))
    if (!apply) return

    const password = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    phase = 'create-select-role'
    // Only the new role and explicit privileges change. All statements are atomic.
    await owner.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10000ms'")
      for (const statement of localReadRoleSql(password, expiresAt)) await tx.$executeRawUnsafe(statement)
    }, { timeout: 20_000 })

    const limitedUrl = new URL(direct.toString())
    limitedUrl.username = LOCAL_READ_ROLE
    limitedUrl.password = password
    runtime = new PrismaClient({ datasourceUrl: limitedUrl.toString(), log: [] })
    phase = 'verify-effective-privileges'
    const verified = await runtime.$transaction(async tx => {
      const attributes = await tx.$queryRaw<{
        name: string; database: string; readonly: string; superuser: boolean; createdb: boolean; createrole: boolean;
        bypassrls: boolean; replication: boolean; inherits: boolean; memberships: bigint; owns: bigint;
        schema_create: boolean; database_create: boolean; ledger: boolean;
      }[]>`
        SELECT current_user AS name, current_database() AS database,
          current_setting('default_transaction_read_only') AS readonly,
          r.rolsuper AS superuser, r.rolcreatedb AS createdb, r.rolcreaterole AS createrole,
          r.rolbypassrls AS bypassrls, r.rolreplication AS replication, r.rolinherit AS inherits,
          (SELECT count(*) FROM pg_auth_members WHERE member=r.oid) AS memberships,
          (SELECT count(*) FROM pg_class WHERE relowner=r.oid) AS owns,
          has_schema_privilege(current_user, 'public', 'CREATE') AS schema_create,
          has_database_privilege(current_user, current_database(), 'CREATE') AS database_create,
          has_table_privilege(current_user, 'public."_prisma_migrations"', 'SELECT') AS ledger
        FROM pg_roles r WHERE r.rolname=current_user
      `
      const permissions = await tx.$queryRaw<{ name: string; reads: boolean; writes: boolean }[]>`
        SELECT relname AS name, has_table_privilege(current_user,c.oid,'SELECT') AS reads,
          has_table_privilege(current_user,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS writes
        FROM pg_class c WHERE relnamespace='public'::regnamespace AND relkind IN ('r','p','v','m','f')
        ORDER BY relname
      `
      const sequenceWrites = await tx.$queryRaw<{ total: bigint }[]>`
        SELECT count(*) AS total FROM pg_class WHERE relkind='S' AND relnamespace='public'::regnamespace
          AND has_sequence_privilege(current_user,oid,'USAGE,UPDATE')
      `
      const definers = await tx.$queryRaw<{ total: bigint }[]>`
        SELECT count(*) AS total FROM pg_proc WHERE pronamespace='public'::regnamespace AND prosecdef
          AND has_function_privilege(current_user,oid,'EXECUTE')
      `
      const counts = await tx.$queryRaw<{ users: bigint; quotes: bigint; bases: bigint }[]>`
        SELECT (SELECT count(*) FROM "User") AS users, (SELECT count(*) FROM "Quote") AS quotes,
          (SELECT count(*) FROM "CostBase") AS bases
      `
      return { attributes: attributes[0], permissions, sequenceWrites: sequenceWrites[0].total,
        definers: definers[0].total, counts: counts[0] }
    }, { timeout: 20_000 })
    const a = verified.attributes
    if (!a || a.name !== LOCAL_READ_ROLE || a.database !== 'neondb' || a.readonly !== 'on' ||
        a.superuser || a.createdb || a.createrole || a.bypassrls || a.replication || a.inherits ||
        a.schema_create || a.database_create || a.ledger || Number(a.memberships) || Number(a.owns) ||
        Number(verified.sequenceWrites) || Number(verified.definers) ||
        verified.permissions.some(p => p.writes || (p.reads && !LOCAL_READ_TABLES.some(table => table === p.name))) ||
        LOCAL_READ_TABLES.some(table => !verified.permissions.some(p => p.name === table && p.reads)) ||
        ['users', 'quotes', 'bases'].some(key => verified.counts[key as keyof typeof verified.counts] !== before.identity[key as 'users' | 'quotes' | 'bases'])) {
      throw new Error('Effective privileges differ; runtime not started')
    }
    const afterRoles = await owner.$queryRaw<typeof before.roles>`
      SELECT rolname AS name, rolsuper AS superuser, rolbypassrls AS bypassrls,
        rolcreatedb AS createdb, rolcreaterole AS createrole
      FROM pg_roles WHERE rolname IN ('fcm_c1_preview_20260929','fcm_tire_v2_preview_20260929') ORDER BY rolname
    `
    if (JSON.stringify(afterRoles) !== JSON.stringify(before.roles)) throw new Error('Prior roles changed')
    await owner.$disconnect()
    console.log(JSON.stringify({ roleCreated: LOCAL_READ_ROLE, expiresAt, effectiveSelectTables: LOCAL_READ_TABLES.length,
      tableWrites: 0, memberships: 0, ownedObjects: 0, executablePublicDefiners: 0,
      bypassRls: false, ledgerAccess: false, defaultReadOnly: true, priorRolesUnchanged: true,
      businessCountsUnchanged: true, credentialStored: false, deploy: false, migrations: false }))

    // In-memory process overrides only. Do not import server.ts/dotenv loaders.
    const environment = {
      NODE_ENV: 'development', VERCEL_ENV: 'preview', FCM_PREVIEW_EXISTING_USERS_ONLY: 'true',
      STAGING_DATABASE_URL: limitedUrl.toString(), DATABASE_URL: '', RELEASE_SHA: expectedSha,
      SUPABASE_URL: authUrl, SUPABASE_PUBLISHABLE_KEY: authKey,
      SUPABASE_EXPECTED_PROJECT_REF: 'alqjqzqagdmcywpjtnnr', SUPABASE_JWT_AUDIENCE: 'authenticated',
      PORT: '3002', LOG_LEVEL: 'fatal', OPENAI_API_KEY: '', RATEWARE_API_URL: '', CRON_SECRET: '',
      GOOGLE_ROUTES_API_KEY: '', FCM_GOOGLE_ROUTE_REVIEW_ENABLED: 'false', EIA_API_KEY: '',
      FCM_TIRE_V2_RESEARCH_CAPTURE_ENABLED: 'false', FCM_STAGING_MIGRATION_CONFIRMATION: 'DISABLED',
    }
    Object.assign(process.env, environment)
    assertLocalReadEnvironment(process.env)
    // Keep the verified, quiet limited client; owner credentials never reach the app singleton.
    ;(globalThis as unknown as { prisma: PrismaClient }).prisma = runtime
    phase = 'start-loopback-api'
    const { buildApp } = await import('../src/app.js')
    const app = buildApp({ localReadOnlyReview: true })
    await app.listen({ host: '127.0.0.1', port: 3002 })
    console.log(JSON.stringify({ mode: 'LOCAL_SELECT_ONLY', url: 'http://127.0.0.1:3002', release: expectedSha,
      provisioning: false, mutations: 'DENIED_BEFORE_AUTH', googleCalls: 0, aiEnabled: false }))
    const close = async () => { await app.close(); await runtime?.$disconnect(); process.exit(0) }
    process.once('SIGINT', close)
    process.once('SIGTERM', close)
  } catch (error) {
    await runtime?.$disconnect()
    throw error
  } finally { await owner.$disconnect() }
}

main().catch(() => {
  // Never log raw CLI/Prisma errors or the credential-bearing SQL statements.
  console.error(JSON.stringify({ stopped: true, phase, role: LOCAL_READ_ROLE,
    message: 'Scoped local runtime stopped; inspect role state before any retry. No automatic rotation or rollback.' }))
  process.exitCode = 1
})
