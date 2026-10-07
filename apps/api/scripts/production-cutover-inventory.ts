import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { selectIdentityContacts, type IdentityContactPin } from './lib/production-identity-contacts.js'

const sha = (value: string) => createHash('sha256').update(value).digest('hex')

/** Production-only metadata/identity inventory. No customer/business tables,
 * backup creation, migration application, account provisioning or logins.
 * Email and legacy identities stay inside this process; only their hashes leave.
 */
export async function productionCutoverInventory(env: NodeJS.ProcessEnv = process.env, contactPins?: IdentityContactPin[]) {
  if (env.VERCEL_ENV !== 'production' ||
      (env.VERCEL_PROJECT_ID && env.VERCEL_PROJECT_ID !== 'prj_mw1xLIqutlRSIG2F2BryfPqDvN2L'))
    throw new Error('CUTOVER_PRODUCTION_API_SCOPE_REQUIRED')
  const target = new URL(env.DATABASE_URL ?? '')
  if (!['postgres:', 'postgresql:'].includes(target.protocol) || !target.hostname.endsWith('.neon.tech'))
    throw new Error('CUTOVER_NEON_TARGET_REQUIRED')
  if (contactPins && (env.VERCEL_PROJECT_ID !== 'prj_mw1xLIqutlRSIG2F2BryfPqDvN2L' ||
      sha(target.hostname + target.pathname) !== env.FCM_PRODUCTION_TARGET_FINGERPRINT))
    throw new Error('CONTACT_TARGET_NOT_PINNED')
  target.searchParams.set('connect_timeout', '10')
  const db = new PrismaClient({ datasourceUrl: target.toString(), log: [] })
  try {
    const report = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10000ms'")
      const role = await tx.$queryRaw<{ superuser: boolean; bypassrls: boolean; can_create_schema: boolean }[]>`
        SELECT rolsuper AS superuser, rolbypassrls AS bypassrls,
          has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_schema
        FROM pg_roles WHERE rolname=current_user
      `
      const ledger = await tx.$queryRaw<{
        migration_name: string; checksum: string; finished_at: string | null; rolled_back_at: string | null;
      }[]>`
        SELECT migration_name, checksum, finished_at::text, rolled_back_at::text
        FROM "_prisma_migrations" ORDER BY migration_name, started_at
      `
      const records = await tx.$queryRaw<{ document: Record<string, unknown>; email_hash: string; identity_fingerprint: string }[]>`
        SELECT to_jsonb(u) AS document,
          encode(sha256(convert_to(lower(btrim(u.email)), 'UTF8')), 'hex') AS email_hash,
          encode(sha256(convert_to(to_jsonb(u)::text, 'UTF8')), 'hex') AS identity_fingerprint
        FROM "User" u ORDER BY u.id
      `
      if (contactPins) return { contacts: selectIdentityContacts(records.map(r => ({
        id: String(r.document.id), email: String(r.document.email), emailHash: r.email_hash,
        identityFingerprint: r.identity_fingerprint,
      })), contactPins) }
      const users = records.map(({ document: u, email_hash, identity_fingerprint }) => {
        const email = String(u.email ?? '').trim().toLowerCase()
        if (!email.includes('@') || /[\x00-\x20\x7f]/.test(email)) throw new Error('CUTOVER_USER_EMAIL_INVALID')
        return { id: String(u.id), emailHash: email_hash, orgId: String(u.orgId), role: String(u.role),
          identityFingerprint: identity_fingerprint,
          hasLegacyIdentity: typeof u.kindeId === 'string' && !!u.kindeId.trim(),
          hasSupabaseIdentity: typeof u.supabaseId === 'string' && !!u.supabaseId.trim() }
      })
      const dir = resolve('prisma/migrations')
      const artifacts = readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => {
        const sql = readFileSync(resolve(dir, d.name, 'migration.sql'), 'utf8')
        const lf = sql.replace(/\r\n/g, '\n')
        return { name: d.name, checksum: sha(sql), checksumVariants: [...new Set([sha(lf), sha(lf.replace(/\n/g, '\r\n'))])] }
      }).sort((a, b) => a.name.localeCompare(b.name))
      return { role, ledger, users, artifacts }
    }, { timeout: 20_000 })
    return { schemaVersion: 'fcm.production-cutover-inventory.v1', mode: 'READ_ONLY',
      targetFingerprint: sha(target.hostname + target.pathname), ...report,
      ...('users' in report ? { userFingerprint: sha(JSON.stringify(report.users)) } : {}), writesPerformed: false }
  } finally { await db.$disconnect() }
}
