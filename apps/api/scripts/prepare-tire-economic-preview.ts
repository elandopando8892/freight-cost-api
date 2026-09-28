import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { PrismaClient, type Role } from '@prisma/client'
import { parse } from 'dotenv'

async function main() {
  const [sourceFile, outputFile, confirmation] = process.argv.slice(2)
  if (!sourceFile || !outputFile || confirmation !== '--apply-existing-preview' || existsSync(outputFile)) throw Error('Explicit existing preview and new private output required')
  const env = parse(readFileSync(sourceFile))
  const sourceUrl = new URL(env.STAGING_DATABASE_URL_UNPOOLED || '')
  if (env.STAGING_NEON_PROJECT_ID !== 'broad-art-99750179' || sourceUrl.hostname !== 'ep-autumn-thunder-av6e9bsh.c-11.us-east-1.aws.neon.tech' || sourceUrl.pathname !== '/neondb') throw Error('Source staging identity mismatch')
  const isolatedUrl = new URL(sourceUrl)
  isolatedUrl.pathname = '/fcm_tire_s15_20260928'
  const source = new PrismaClient({ datasourceUrl: sourceUrl.toString() })
  const isolated = new PrismaClient({ datasourceUrl: isolatedUrl.toString() })
  try {
    const target = await isolated.$queryRawUnsafe<any[]>('SELECT current_database() AS name')
    if (target[0]?.name !== 'fcm_tire_s15_20260928') throw Error('Incorrect destination')
    const users = await source.user.findMany({
      where: { email: { in: ['sales@heymarksman.com', 'andresmclovin@gmail.com', 'jgonzalez@xbfreight.com'] } },
      select: { id: true, orgId: true, supabaseId: true, email: true, role: true },
    })
    if (users.length !== 3 || new Set(users.map(user => user.orgId)).size !== 1 || users.some(user => !user.supabaseId)) throw Error('Existing linked same-tenant roster required')
    const expectedRoles: Record<string, Role> = { 'sales@heymarksman.com': 'ADMIN', 'andresmclovin@gmail.com': 'OPERATOR', 'jgonzalez@xbfreight.com': 'VIEWER' }
    if (users.some(user => user.role !== expectedRoles[user.email])) throw Error('Source roles changed; inspect before copying')
    const org = await source.organization.findUniqueOrThrow({ where: { id: users[0].orgId }, select: { id: true, name: true, country: true } })
    const migrated = spawnSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--schema', 'apps/api/prisma/schema.prisma'], {
      env: { ...process.env, DATABASE_URL: isolatedUrl.toString(), DIRECT_URL: isolatedUrl.toString() }, encoding: 'utf8', windowsHide: true,
    })
    if (migrated.status !== 0) throw Error('Isolated migration failed')
    await isolated.$transaction(async tx => {
      if (await tx.user.count() || await tx.organization.count()) throw Error('Preview identity tables must be empty; refusing overwrite')
      await tx.organization.create({ data: org })
      await tx.user.createMany({ data: users })
    })
    // Rotate only the disposable runtime credential; shared owner and Auth stay unchanged.
    const password = randomBytes(32).toString('hex')
    await isolated.$executeRawUnsafe(`ALTER ROLE fcm_tire_s15_app PASSWORD '${password}'`)
    const runtime = new URL(isolatedUrl)
    runtime.username = 'fcm_tire_s15_app'
    runtime.password = password
    writeFileSync(outputFile, `STAGING_DATABASE_URL=${runtime.toString()}\nTIRE_PREVIEW_ADMIN_DATABASE_URL=${isolatedUrl.toString()}\n`, { flag: 'wx', mode: 0o600 })
    const counts = { users: await isolated.user.count(), organizations: await isolated.organization.count(), assumptionSets: await isolated.assumptionSet.count(), dossiers: await isolated.tireCalibrationDossier.count() }
    console.log(JSON.stringify({ destination: target[0].name, migration: '20260928000100_tire_economic_review', counts, sourceModified: false, authModified: false, rolesPreserved: true, runtimeCredentialRotated: true }))
  } finally { await source.$disconnect(); await isolated.$disconnect() }
}
main().catch(error => { console.error(error instanceof Error && !error.name.startsWith('Prisma') ? error.message : 'Database operation failed; inspect dedicated preview only'); process.exitCode = 1 })
