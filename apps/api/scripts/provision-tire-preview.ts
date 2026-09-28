import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { parse } from 'dotenv'
import { PrismaClient } from '@prisma/client'

// One-off authorized Sprint 15 target. Never migrates the shared neondb database.
const database = 'fcm_tire_s15_20260928'
const role = 'fcm_tire_s15_app'
const expectedProject = 'broad-art-99750179'
const expectedHost = 'ep-autumn-thunder-av6e9bsh.c-11.us-east-1.aws.neon.tech'

async function main() {
  const [input, output, confirmation] = process.argv.slice(2)
  if (!input || !output || confirmation !== '--apply-isolated-sprint15') throw new Error('Explicit isolated Sprint 15 target required')
  if (existsSync(output)) throw new Error('Output already exists; inspect previous provision before retrying')
  const env = parse(readFileSync(input))
  const url = new URL(env.STAGING_DATABASE_URL_UNPOOLED || '')
  if (env.STAGING_NEON_PROJECT_ID !== expectedProject || url.hostname !== expectedHost || url.pathname !== '/neondb') throw new Error('Staging identity mismatch')
  const owner = new PrismaClient({ datasourceUrl: url.toString() })
  const password = randomBytes(32).toString('hex')
  try {
    const existing = await owner.$queryRawUnsafe<any[]>(`SELECT datname AS name FROM pg_database WHERE datname='${database}' UNION ALL SELECT rolname AS name FROM pg_roles WHERE rolname='${role}'`)
    if (existing.length) throw new Error('Dedicated target already exists; refusing overwrite')
    await owner.$executeRawUnsafe(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`)
    await owner.$executeRawUnsafe(`CREATE DATABASE ${database} TEMPLATE template0`)
    url.pathname = '/' + database
    const adminUrl = url.toString()
    const runtimeUrl = new URL(adminUrl)
    runtimeUrl.username = role
    runtimeUrl.password = password
    // Private generated artifact, never logged or committed. Retained for deployment.
    writeFileSync(output, `STAGING_DATABASE_URL=${runtimeUrl.toString()}\nTIRE_PREVIEW_ADMIN_DATABASE_URL=${adminUrl}\n`, { flag: 'wx', mode: 0o600 })
    const result = spawnSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--schema', 'apps/api/prisma/schema.prisma'], {
      env: { ...process.env, DATABASE_URL: adminUrl, DIRECT_URL: adminUrl }, encoding: 'utf8', windowsHide: true,
    })
    if (result.status !== 0) throw new Error('Isolated migration failed; retain private artifact for recovery')
    const isolated = new PrismaClient({ datasourceUrl: adminUrl })
    try {
      for (const sql of [
        `REVOKE CONNECT ON DATABASE ${database} FROM PUBLIC`,
        `GRANT CONNECT ON DATABASE ${database} TO ${role}`,
        `GRANT USAGE ON SCHEMA public TO ${role}`,
        `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`,
        `REVOKE ALL ON TABLE "_prisma_migrations" FROM ${role}`,
        `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`,
      ]) await isolated.$executeRawUnsafe(sql)
      const migrations = await isolated.$queryRawUnsafe<any[]>('SELECT count(*)::int AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL')
      const policies = await isolated.$queryRawUnsafe<any[]>(`SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname IN ('TireCohortSourceSnapshot','TireCohortSourceHead','TireCalibrationDossier','TireCalibrationReviewEvent','TireCalibrationApprovalPackage') ORDER BY relname`)
      const runtime = new PrismaClient({ datasourceUrl: runtimeUrl.toString() })
      try {
        const identity = await runtime.$queryRawUnsafe<any[]>('SELECT current_database() AS database, current_user AS role, rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user')
        if (identity[0]?.rolsuper !== false || identity[0]?.rolbypassrls !== false || policies.length !== 5 || policies.some(p => !p.relrowsecurity || !p.relforcerowsecurity)) throw new Error('Runtime RLS verification failed')
        console.log(JSON.stringify({ project: expectedProject, database, role, migrations, policies, identity, remoteMigration: 'PASS', businessDataCopied: false, authUsersChanged: false }, null, 2))
      } finally { await runtime.$disconnect() }
    } finally { await isolated.$disconnect() }
  } finally { await owner.$disconnect() }
}
main().catch(error => { console.error(error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[REDACTED]') : 'Provision failed'); process.exitCode = 1 })
