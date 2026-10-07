import { PrismaClient } from '@prisma/client'
import { readVerifiedPartnerPreviewTarget } from './inspect-partner-preview.js'
import { W2_GATE_ROLE, W2_GATE_TABLES, W2_GATE_EVENT_COLUMNS } from '../src/config/w2-local-gate.js'
import { w2SafeDiagnostic } from './lib/w2-safe-diagnostic.js'
let phase='target'
async function main(){
  const target=readVerifiedPartnerPreviewTarget();target.searchParams.set('connect_timeout','10');target.searchParams.set('connection_limit','1')
  const db=new PrismaClient({datasourceUrl:target.toString(),log:[]})
  try{
    phase='read-only-role-and-grants'
    const [,,roles,columns,extra,events]=await db.$transaction([
      db.$executeRawUnsafe('SET TRANSACTION READ ONLY'),db.$executeRawUnsafe("SET LOCAL statement_timeout='10000ms'"),
      db.$queryRawUnsafe<any[]>(`SELECT rolname::text,rolcanlogin,rolvaliduntil::text,shobj_description(oid,'pg_authid') AS marker,
        rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication,rolinherit,
        (SELECT count(*)::int FROM pg_auth_members WHERE member=r.oid) AS memberships,
        (SELECT count(*)::int FROM pg_class WHERE relowner=r.oid) AS owns,
        (SELECT count(*)::int FROM pg_stat_activity WHERE usename=r.rolname) AS sessions,
        has_schema_privilege(r.rolname,'public','CREATE') AS schema_create,
        has_database_privilege(r.rolname,current_database(),'CREATE') AS database_create
        FROM pg_roles r WHERE rolname='${W2_GATE_ROLE}'`),
      db.$queryRawUnsafe<any[]>(`SELECT c.relname AS table,a.attname AS column,
        has_table_privilege('${W2_GATE_ROLE}',c.oid,'SELECT') AS reads,
        has_column_privilege('${W2_GATE_ROLE}',c.oid,a.attname,'INSERT') AS inserts,
        has_column_privilege('${W2_GATE_ROLE}',c.oid,a.attname,'UPDATE') AS updates,
        has_table_privilege('${W2_GATE_ROLE}',c.oid,'DELETE,TRUNCATE,REFERENCES,TRIGGER') AS unsafe
        FROM pg_class c JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
        WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','p','v','m','f')`),
      db.$queryRawUnsafe<any[]>(`SELECT
        (SELECT count(*)::int FROM pg_class WHERE relnamespace='public'::regnamespace AND CASE WHEN relkind='S' THEN has_sequence_privilege('${W2_GATE_ROLE}',oid,'USAGE,UPDATE') ELSE false END) AS sequences,
        (SELECT count(*)::int FROM pg_proc WHERE pronamespace='public'::regnamespace AND prosecdef AND has_function_privilege('${W2_GATE_ROLE}',oid,'EXECUTE')) AS definers`),
      db.costBaseAuditEvent.count({where:{orgId:'cmsqrb5ye0001q7mn6i4dbx2b',costBaseId:'cmuuuwhbx0002sips941fqodr'}}),
    ])
    console.log(JSON.stringify({mode:'READ_ONLY',roles,unexpectedColumns:columns.filter(c=>c.unsafe||c.reads!==W2_GATE_TABLES.includes(c.table)
      ||c.inserts!==(c.table==='CostBaseAuditEvent'&&W2_GATE_EVENT_COLUMNS.includes(c.column))
      ||c.updates!==(['Organization','AssumptionSet'].includes(c.table)&&c.column==='id')),extra,metadataEvents:events}))
  }finally{await db.$disconnect()}
}
main().catch(error=>{
  const sqlState=typeof error?.meta?.code==='string'&&/^[0-9A-Z]{5}$/.test(error.meta.code)?error.meta.code:undefined
  const unsupportedType=typeof error?.meta?.message==='string'&&/type [`'"](?:name|timestamptz|aclitem|oid)[`'"]/.test(error.meta.message)
  console.error(JSON.stringify({...w2SafeDiagnostic('input',error),phase,readOnly:true,sqlState,unsupportedType}));process.exitCode=2
})
