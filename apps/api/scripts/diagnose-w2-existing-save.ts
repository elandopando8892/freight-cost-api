import { execFileSync } from 'node:child_process'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient, type Prisma } from '@prisma/client'
import { readVerifiedPartnerPreviewTarget } from './inspect-partner-preview.js'
import { W2_GATE_ROLE, W2_GATE_TABLES, W2_GATE_EVENT_COLUMNS } from '../src/config/w2-local-gate.js'
import { assertExistingDiagnosticOpen, assertExistingDiagnosticRole, W2_EXISTING_DEADLINE, W2_EXISTING_MARKER } from './lib/w2-existing-diagnostic-gate.js'
import { W2DiagnosticRollback } from './lib/w2-diagnostic-rollback.js'
import { w2SafeDiagnostic } from './lib/w2-safe-diagnostic.js'
import { createVersionWizard } from '../src/modules/cost-bases/cost-base-wizard-version.js'
import snapshot from '../src/modules/cost-bases/cost-base-wizard.catalog.json'
import type { WizardCatalog } from '../src/modules/cost-bases/cost-base-wizard-draft.js'

const root=resolve(__dirname,'../../..'), orgId='cmsqrb5ye0001q7mn6i4dbx2b'
const baseId='cmuuuwhbx0002sips941fqodr', versionId='cmuuuwhc20004sipsywu5stvk'
const sourceId='cmsqufvfh0004pn7gp3c35crj'
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
const open=()=>assertExistingDiagnosticOpen(process.env.FCM_W2_EXISTING_APPROVAL)
let owner:PrismaClient|undefined, runtime:PrismaClient|undefined, activated=false, operation='preflight'
async function main() {
  open()
  if(process.argv.slice(2).join(' ')!=='--diagnose-existing') throw new Error('Diagnostic-only authority')
  const git=(...args:string[])=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim()
  if(!/^[dD]:[\\/]/.test(realpathSync(root)) || git('branch','--show-current')!=='codex/cost-tires-release-s14'
    || git('rev-parse','HEAD')!=='4f5fc2de0c3d178dace917231e1092040dec21fd') throw new Error('Checkout changed')
  const catalog=snapshot as unknown as WizardCatalog
  if(hash({profile:catalog.profile,cards:catalog.cards})!==catalog.revision) throw new Error('W2 catalog changed')
  const target=readVerifiedPartnerPreviewTarget()
  target.searchParams.set('connect_timeout','10');target.searchParams.set('connection_limit','1')
  owner=new PrismaClient({datasourceUrl:target.toString(),log:[]});await owner.$connect()
  const inventory=async(db:PrismaClient)=>db.$transaction(async tx=>{
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
    const qa=await tx.assumptionSet.findUniqueOrThrow({where:{id:versionId},include:{params:{orderBy:{id:'asc'}},costBase:true}})
    const source=await tx.assumptionSet.findUniqueOrThrow({where:{id:sourceId},include:{params:{orderBy:{id:'asc'}}}})
    const users=await tx.user.findMany({where:{orgId},orderBy:{id:'asc'},select:{id:true,orgId:true,role:true,supabaseId:true,updatedAt:true}})
    const events=await tx.costBaseAuditEvent.findMany({where:{orgId,costBaseId:baseId},orderBy:{id:'asc'}})
    return {qa,source,users,events}
  },{timeout:20000})
  const before=await inventory(owner)
  if(hash(before.source)!=='47a5bf5ea3571cad8b0c40a15b3715c93d0ab6ab93e1c9ad529f0e7270076346'
    || hash(before.qa)!=='dc45b03c932f830dc77d65062f14b0ce4ad09d631d94e4f164e72eb6ec89e05c'
    || before.qa.costBaseId!==baseId || before.qa.orgId!==orgId || before.events.length!==1
    || before.qa.status!=='DRAFT' || before.qa.isActive || before.qa.params.length!==210) throw new Error('Inventory changed')
  const admins=before.users.filter(u=>u.role==='ADMIN' && /^[a-f0-9-]{36}$/i.test(u.supabaseId ?? ''))
  if(admins.length!==1) throw new Error('W2 linked admin required')
  open()
  const password=randomBytes(32).toString('hex')
  // Reserve and reactivate atomically. No CREATE, GRANT, membership or Auth mutation.
  await owner.$transaction(async tx=>{
    const [role]=await tx.$queryRawUnsafe<any[]>(`SELECT rolcanlogin AS login,shobj_description(oid,'pg_authid') AS marker,(SELECT count(*)::int FROM pg_stat_activity WHERE usename='${W2_GATE_ROLE}') AS sessions FROM pg_roles WHERE rolname='${W2_GATE_ROLE}'`)
    assertExistingDiagnosticRole(role);open()
    await tx.$executeRawUnsafe(`ALTER ROLE ${W2_GATE_ROLE} LOGIN PASSWORD '${password}' VALID UNTIL '${W2_EXISTING_DEADLINE}'`)
    await tx.$executeRawUnsafe(`COMMENT ON ROLE ${W2_GATE_ROLE} IS '${W2_EXISTING_MARKER}'`)
  },{timeout:10000})
  activated=true
  const limited=new URL(target.toString());limited.username=W2_GATE_ROLE;limited.password=password
  runtime=new PrismaClient({datasourceUrl:limited.toString(),log:[]});await runtime.$connect();open()
  const [role]=await runtime.$queryRawUnsafe<any[]>(`SELECT current_user AS name,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication,rolinherit,(SELECT count(*)::int FROM pg_auth_members WHERE member=r.oid) AS memberships,(SELECT count(*)::int FROM pg_class WHERE relowner=r.oid) AS owns,has_schema_privilege(current_user,'public','CREATE') AS schema_create,has_database_privilege(current_user,current_database(),'CREATE') AS database_create FROM pg_roles r WHERE rolname=current_user`)
  if(role.name!==W2_GATE_ROLE || ['rolsuper','rolbypassrls','rolcreatedb','rolcreaterole','rolreplication','rolinherit','schema_create','database_create','memberships','owns'].some(k=>role[k])) throw new Error('Role attributes differ')
  const columns=await runtime.$queryRawUnsafe<any[]>(`SELECT c.relname AS table,a.attname AS column,has_table_privilege(current_user,c.oid,'SELECT') AS reads,has_column_privilege(current_user,c.oid,a.attname,'INSERT') AS inserts,has_column_privilege(current_user,c.oid,a.attname,'UPDATE') AS updates,has_table_privilege(current_user,c.oid,'DELETE,TRUNCATE,REFERENCES,TRIGGER') AS unsafe FROM pg_class c JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','p','v','m','f')`)
  if(columns.some(c=>c.unsafe || c.reads!==W2_GATE_TABLES.includes(c.table) || c.inserts!==(c.table==='CostBaseAuditEvent' && W2_GATE_EVENT_COLUMNS.includes(c.column)) || c.updates!==(['Organization','AssumptionSet'].includes(c.table)&&c.column==='id'))) throw new Error('Effective table/column privileges differ')
  for(const table of W2_GATE_TABLES) if(!columns.some(c=>c.table===table&&c.reads)) throw new Error('Missing table')
  const [extra]=await runtime.$queryRawUnsafe<any[]>(`SELECT (SELECT count(*)::int FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='S' AND has_sequence_privilege(current_user,oid,'USAGE,UPDATE')) AS sequences,(SELECT count(*)::int FROM pg_proc WHERE pronamespace='public'::regnamespace AND prosecdef AND has_function_privilege(current_user,oid,'EXECUTE')) AS definers`)
  if(extra.sequences || extra.definers) throw new Error('Additional write capability')
  console.log(JSON.stringify({event:'EXISTING_QA_DIAGNOSTIC_RESERVED',baseId,versionId,deadline:W2_EXISTING_DEADLINE,newGrants:false,credentialStored:false}))
  const actor={orgId,sub:admins[0].id,role:'ADMIN' as const}
  const reader=createVersionWizard(work=>runtime!.$transaction(work),catalog)
  operation='wizard-read'
  const view=await reader.read(actor,baseId,versionId)
  if(view.draft.revision!==0 || view.draft.decisions.length) throw new Error('Inventory changed')
  const body={context:{orgId,baseId,versionId},expectedRevision:0,expectedVersionFingerprint:view.versionFingerprint,requestId:randomUUID(),decisions:[{
    conceptId:'diesel-mx',referenceRevision:catalog.revision,mode:'MARKSMAN',value:catalog.cards.find(c=>c.id==='diesel-mx')!.standard.value,
    identification:'PARTIAL',provisionalAccepted:true,justification:'Prueba QA no comercial de persistencia. Referencia pública nacional de septiembre de 2026, no precio observado del corredor ni costo del carrier. Aplicabilidad parcial pendiente de revisión fiscal y abastecimiento; no aplicar parámetros, activar base ni cotizar.',
  }]}
  // Exactly the current service's default transaction options; no speculative timeout increase.
  const diagnostic=createVersionWizard(work=>runtime!.$transaction(async tx=>{
    let locks=0
    const traced=new Proxy(tx,{get(target,key){
      if(key==='$queryRaw') return async (...args:unknown[])=>{
        operation=++locks===1?'lock-organization':'lock-version'
        const started=Date.now();const result=await (target.$queryRaw as any)(...args)
        console.log(JSON.stringify({event:'W2_DIAGNOSTIC_STEP',operation,elapsedMs:Date.now()-started}));return result
      }
      if(key==='costBaseAuditEvent') return new Proxy(target.costBaseAuditEvent,{get(model,method){
        if(method==='create') return async (...args:unknown[])=>{
          operation='insert-audit';const started=Date.now();const result=await (model.create as any)(...args)
          console.log(JSON.stringify({event:'W2_DIAGNOSTIC_STEP',operation,elapsedMs:Date.now()-started}));return result
        }
        return Reflect.get(model,method)
      }})
      return Reflect.get(target,key)
    }}) as Prisma.TransactionClient
    await work(traced)
    throw new W2DiagnosticRollback()
  }),catalog)
  open();operation='begin-save';let intentional=false
  try { await diagnostic.save(actor,baseId,versionId,body) }
  catch(error) {
    if(error instanceof W2DiagnosticRollback) intentional=true
    else {console.error(JSON.stringify({...w2SafeDiagnostic('wizard-save',error),operation}));process.exitCode=2}
  }
  const after=await inventory(runtime)
  const unchanged=hash(after)===hash(before)
  console.log(JSON.stringify({event:'W2_EXISTING_DIAGNOSTIC_RESULT',intentionalRollback:intentional,allInventoryUnchanged:unchanged,metadataEvents:after.events.length,committedProposals:0,authenticatedSaveTested:false}))
  if(!unchanged) throw new Error('Diagnostic rollback invariant failed')
}
main().catch(error=>{console.error(JSON.stringify({...w2SafeDiagnostic(operation==='wizard-read'?'wizard-read':'input',error),operation}));process.exitCode=2}).finally(async()=>{
  await runtime?.$disconnect()
  try {
    if(owner) {
      // Inspect marker even after uncertain ALTER response. Only disable this gate's role.
      const [role]=await owner.$queryRawUnsafe<any[]>(`SELECT shobj_description(oid,'pg_authid') AS marker FROM pg_roles WHERE rolname='${W2_GATE_ROLE}'`)
      if(role?.marker===W2_EXISTING_MARKER) {
        await owner.$executeRawUnsafe(`ALTER ROLE ${W2_GATE_ROLE} NOLOGIN`)
        const [state]=await owner.$queryRawUnsafe<any[]>(`SELECT rolcanlogin,(SELECT count(*)::int FROM pg_stat_activity WHERE usename='${W2_GATE_ROLE}') AS sessions FROM pg_roles WHERE rolname='${W2_GATE_ROLE}'`)
        console.log(JSON.stringify({temporaryRoleDisabled:!state.rolcanlogin,remainingRoleSessions:state.sessions,activated}))
        if(state.rolcanlogin || state.sessions) throw new Error('Cleanup incomplete')
      } else if(activated) throw new Error('Cleanup ownership changed')
    }
  } catch {console.error('W2 existing-role cleanup requires attention');process.exitCode=2}
  finally {await owner?.$disconnect()}
})
