import { createHash } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import type { CutoverMigrationRecord, CutoverUserInventory } from './production-cutover-plan.js'

const role = z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/)
const optionsSchema = z.object({
  mode: z.enum(['NEON', 'LOCAL_REHEARSAL']), databaseUrl: z.string(),
  expectedTargetFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  migrationRole: role, runtimeRoles: z.array(role).min(1).max(20),
}).strict()
export type TransitionInspectionOptions = z.infer<typeof optionsSchema>
const sha = (value: string) => createHash('sha256').update(value).digest('hex')

/** This is an inspection, never a maintenance operation or a durable fence.
 * NOLOGIN does not disconnect existing sessions. Reject both login-capable
 * roles and remaining sessions; never ALTER ROLE, terminate clients or infer
 * that a quiet pg_stat_activity proves all app writers are stopped. */
export function validateTransitionInspectionOptions(raw: TransitionInspectionOptions) {
  let options: TransitionInspectionOptions, url: URL
  try {
    options = optionsSchema.parse(raw); url = new URL(options.databaseUrl)
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.password || url.hash
      || !/^\/[a-zA-Z0-9_-]+$/.test(url.pathname) || decodeURIComponent(url.username) !== options.migrationRole
      || options.runtimeRoles.includes(options.migrationRole) || new Set(options.runtimeRoles).size !== options.runtimeRoles.length)
      throw new Error()
    // Reject socket/host overrides, schema changes, opaque driver options and
    // duplicate query arguments that could select a different target.
    const allowed = new Set(['sslmode', 'sslaccept', 'schema', 'connection_limit', 'connect_timeout', 'pool_timeout'])
    if ([...url.searchParams.keys()].some(key => !allowed.has(key) || url.searchParams.getAll(key).length !== 1)
      || (url.searchParams.has('schema') && url.searchParams.get('schema') !== 'public')) throw new Error()
    if (options.mode === 'NEON') {
      if (!/^[a-z0-9.-]+\.neon\.tech$/.test(url.hostname) || url.hostname.includes('-pooler.') || (url.port && url.port !== '5432')) throw new Error()
      url.searchParams.set('sslmode', 'require'); url.searchParams.set('sslaccept', 'strict')
    } else if (!['localhost', '127.0.0.1'].includes(url.hostname) || !/^\/fcm_adapter_[a-z0-9_]+$/.test(url.pathname)) throw new Error()
    if (sha(url.hostname + url.pathname) !== options.expectedTargetFingerprint) throw new Error()
  } catch { throw new Error('TRANSITION_INSPECTION_TARGET_INVALID') }
  return { options, url }
}

export async function inspectPostgresTransition(raw: TransitionInspectionOptions, signal?: AbortSignal) {
  const { options, url } = validateTransitionInspectionOptions(raw)
  if (signal?.aborted) throw new Error('TRANSITION_INSPECTION_ABORTED')
  url.searchParams.set('connection_limit', '1'); url.searchParams.set('connect_timeout', '10'); url.searchParams.set('pool_timeout', '10')
  const db = new PrismaClient({ datasourceUrl: url.toString(), log: [] })
  try {
    const snapshot = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10000ms'")
      const [identity] = await tx.$queryRaw<{ database: string; role: string; canReadAll: boolean; owner: boolean; readOnly: string }[]>`
        SELECT current_database() AS database,current_user AS role,(r.rolsuper OR r.rolbypassrls) AS "canReadAll",
          d.datdba=r.oid AS owner,current_setting('transaction_read_only') AS "readOnly"
        FROM pg_roles r JOIN pg_database d ON d.datname=current_database() WHERE r.rolname=current_user`
      if (!identity || identity.database !== url.pathname.slice(1) || identity.role !== options.migrationRole || identity.readOnly !== 'on')
        throw new Error('IDENTITY_MISMATCH')
      const roles = await tx.$queryRaw<{ name: string; login: boolean; connect: boolean }[]>`
        SELECT rolname AS name,rolcanlogin AS login,has_database_privilege(oid,current_database(),'CONNECT') AS connect
        FROM pg_roles ORDER BY rolname`
      const sessions = await tx.$queryRaw<{ count: number }[]>`
        SELECT count(*)::int AS count FROM pg_stat_activity
        WHERE datname=current_database() AND pid<>pg_backend_pid()
          AND (backend_type='client backend' OR backend_type IS NULL)`
      const [attempt] = await tx.$queryRaw<{ exists: boolean }[]>`
        SELECT (to_regnamespace('fcm_transition_control') IS NOT NULL OR to_regnamespace('fcm_historical_run') IS NOT NULL) AS exists`
      const issues: string[] = []
      if (!identity.canReadAll || !identity.owner) issues.push('INSPECTION_ROLE_INSUFFICIENT')
      for (const name of options.runtimeRoles) {
        const actual = roles.find(r => r.name === name)
        if (!actual) issues.push('RUNTIME_ROLE_MISSING')
        else if (actual.login) issues.push('RUNTIME_LOGIN_STILL_ENABLED')
      }
      if (roles.some(r => r.name !== identity.role && r.login && r.connect)) issues.push('OTHER_LOGIN_CAN_CONNECT')
      if (sessions[0]?.count !== 0) issues.push('OTHER_CLIENT_SESSIONS_PRESENT')
      if (attempt?.exists) issues.push('TARGET_ALREADY_ATTEMPTED')
      // Do not report partial business/identity inventory as safe when RLS could
      // have filtered it. Catalog inspection still explains the failed gate.
      let ledger: CutoverMigrationRecord[] = [], users: CutoverUserInventory[] = []
      if (!issues.length) {
        ledger = await tx.$queryRaw<CutoverMigrationRecord[]>`
          SELECT migration_name,checksum,finished_at::text,rolled_back_at::text
          FROM public."_prisma_migrations" ORDER BY migration_name,started_at`
        users = await tx.$queryRaw<CutoverUserInventory[]>`
          SELECT id,"orgId",role::text AS role,
            encode(sha256(convert_to(lower(btrim(email)),'UTF8')),'hex') AS "emailHash",
            encode(sha256(convert_to(to_jsonb(u)::text,'UTF8')),'hex') AS "identityFingerprint"
          FROM public."User" u ORDER BY id`
      }
      return { issues: [...new Set(issues)].sort(), ledger, users }
    }, { isolationLevel: 'RepeatableRead', maxWait: 10000, timeout: 20000 })
    if (signal?.aborted) throw new Error('ABORTED')
    return { schemaVersion: 'fcm.postgres-transition-inspection.v1', targetFingerprint: options.expectedTargetFingerprint,
      observedAt: new Date().toISOString(), inspectionPassed: snapshot.issues.length === 0, ...snapshot,
      writesPerformed: false as const, maintenanceEstablished: false as const, migrationAuthorized: false as const }
  } catch { throw new Error('TRANSITION_INSPECTION_FAILED') }
  finally { await db.$disconnect() }
}
