import type { Prisma } from '@prisma/client'
import { LOCAL_READ_ROLE, LOCAL_READ_EXPIRES, LOCAL_READ_TABLES } from '../../src/config/local-read-review.js'

export async function inspectReviewRole(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<{
    name: string; expires: Date; sessions: bigint; safe: boolean; database: string; readConfig: boolean;
    memberships: bigint; owns: bigint; schemaCreate: boolean; databaseCreate: boolean; ledger: boolean;
  }[]>`
    SELECT rolname AS name, rolvaliduntil AS expires, current_database() AS database,
      (SELECT count(*) FROM pg_stat_activity WHERE usename=r.rolname) AS sessions,
      (rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolbypassrls AND NOT rolreplication AND NOT rolinherit AND rolconnlimit=4) AS safe,
      ('default_transaction_read_only=on'=ANY(coalesce(rolconfig,ARRAY[]::text[]))) AS "readConfig",
      (SELECT count(*) FROM pg_auth_members WHERE member=r.oid) AS memberships,
      (SELECT count(*) FROM pg_class WHERE relowner=r.oid) AS owns,
      has_schema_privilege(r.oid,'public','CREATE') AS "schemaCreate",
      has_database_privilege(r.oid,current_database(),'CREATE') AS "databaseCreate",
      has_table_privilege(r.oid,'public."_prisma_migrations"','SELECT') AS ledger
    FROM pg_roles r WHERE rolname=${LOCAL_READ_ROLE}
  `
  const tables = await tx.$queryRaw<{ name: string; reads: boolean; writes: boolean }[]>`
    SELECT relname AS name, has_table_privilege(${LOCAL_READ_ROLE},c.oid,'SELECT') AS reads,
      has_table_privilege(${LOCAL_READ_ROLE},c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS writes
    FROM pg_class c WHERE relnamespace='public'::regnamespace AND relkind IN ('r','p','v','m','f') ORDER BY relname
  `
  const effects = await tx.$queryRaw<{ sequences: bigint; definers: bigint }[]>`
    SELECT (SELECT count(*) FROM pg_class WHERE CASE
      WHEN relnamespace='public'::regnamespace AND relkind='S'
      THEN has_sequence_privilege(${LOCAL_READ_ROLE},oid,'USAGE,UPDATE') ELSE false END) AS sequences,
      (SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace AND prosecdef
      AND has_function_privilege(${LOCAL_READ_ROLE},oid,'EXECUTE')) AS definers
  `
  const role = rows[0]
  if (!role || role.name !== LOCAL_READ_ROLE || role.database !== 'neondb' || role.expires?.toISOString() !== LOCAL_READ_EXPIRES ||
      Date.parse(LOCAL_READ_EXPIRES) <= Date.now() || !role.safe || !role.readConfig || role.schemaCreate || role.databaseCreate || role.ledger ||
      Number(role.memberships) || Number(role.owns) || Number(effects[0].sequences) || Number(effects[0].definers) ||
      tables.some(t => t.writes || (t.reads && !LOCAL_READ_TABLES.some(name => name === t.name))) ||
      LOCAL_READ_TABLES.some(name => !tables.some(t => t.name === name && t.reads))) throw new Error('Effective role boundary changed')
  return { sessions: Number(role.sessions), readableTables: LOCAL_READ_TABLES.length, expiresAt: LOCAL_READ_EXPIRES }
}
