import { execFileSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { readFileSync, realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { createServer } from 'node:net'
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { parse } from 'dotenv'
import { readVerifiedPartnerPreviewTarget } from './inspect-partner-preview.js'
import { W2_GATE_ROLE, W2_GATE_TABLES, W2_GATE_EVENT_COLUMNS, W2_GATE_DEADLINE, W2_GATE_MARKER, assertW2GateOpen as assertLegacyGateOpen, w2GatePath, w2GateRequestAllowed } from '../src/config/w2-local-gate.js'
import { assertW2Source, w2CloneParams } from './lib/w2-review-preparation.js'
import { w2ChildDiagnostic, w2SafeDiagnostic } from './lib/w2-safe-diagnostic.js'
import { w2PreparationMode, w2PreparationAuthority } from './lib/w2-preparation-mode.js'
import { wizardReviewSourceFingerprint } from '../src/modules/cost-bases/cost-base-wizard-review-context.js'
import { W2_CLOSEOUT_AUTHORITY, W2_CLOSEOUT_DEADLINE, W2_CLOSEOUT_IDS, W2_CLOSEOUT_MARKER, W2_CLOSEOUT_READBACK_MARKER, W2_CLOSEOUT_PREVIOUS_MARKER, assertW2CloseoutOpen, assertW2CloseoutRole } from './lib/w2-closeout-gate.js'
import { WIZARD_REVIEW_METADATA_KIND } from '../src/modules/cost-bases/cost-base-wizard-review-context.js'
import {B3_DEADLINE,B3_MARKER,B3_REPAIR_MARKER,B3_ROUTE_FIX_MARKER,B3_AUTHORITY,B3_ROUTE_FIX_AUTHORITY,B3_FINAL_DEADLINE,B3_FINAL_MARKER,B3_FINAL_AUTHORITY,assertB3Open,assertB3FinalOpen,assertB3Role,b3RequestAllowed} from './lib/b3-saas-gate.js'
import {registerB3OwnRelayRoute} from './lib/b3-own-relay-route.js'
import type {PlanningCommand} from '../src/modules/cost-bases/version-planning-contract.js'
import {B3_OPTIMIZED_DEADLINE,B3_OPTIMIZED_MARKER,B3_OPTIMIZED_AUTHORITY,assertB3OptimizedOpen} from './lib/b3-saas-gate.js'
import {B3_TRACE_DEADLINE,B3_TRACE_MARKER,B3_TRACE_AUTHORITY,assertB3TraceOpen} from './lib/b3-saas-gate.js'
import {createVersionPlanning} from '../src/modules/cost-bases/version-planning.js'
import {WIZARD_TRANSACTION_OPTIONS} from '../src/modules/cost-bases/cost-base-wizard-transaction.js'
import planningCatalog from '../src/modules/cost-bases/cost-base-wizard.catalog.json'
import type {WizardCatalog} from '../src/modules/cost-bases/cost-base-wizard-draft.js'
import {B3_RECOVERY_DEADLINE,B3_RECOVERY_MARKER,B3_RECOVERY_AUTHORITY,assertB3RecoveryOpen,b3RecoveryReplayAllowed} from './lib/b3-saas-gate.js'
import {PlanningRecord,PlanningSave,PLANNING_KIND} from '../src/modules/cost-bases/version-planning-contract.js'
import {S2_FAMILY_AUTHORITY,createS2FamilyWindow,assertS2FamilyOpen,assertS2FamilyRole,s2FamilyRequestAllowed,createS2FamilyAttempt} from './lib/b3-saas-gate.js'
import {S2_FAMILY_AMENDMENT_AUTHORITY,S2_FAMILY_PRIOR_MARKER,createS2FamilyAmendedWindow,assertS2FamilyAmendedOpen,assertS2FamilyAmendedRole} from './lib/b3-saas-gate.js'
import {S2_FAMILY_ACTOR_FIX_AUTHORITY,S2_FAMILY_ACTOR_FIX_PRIOR_MARKER,createS2FamilyActorFixWindow,assertS2FamilyActorFixOpen,assertS2FamilyActorFixRole} from './lib/b3-saas-gate.js'
import {createFamilyBaseStore,FAMILY_BASE_RECORD_KIND} from '../src/modules/cost-bases/family-base-store.js'
import {registerFamilyBaseRoutes} from '../src/modules/cost-bases/family-base.routes.js'
import {decodeFamilySource} from '../src/modules/cost-bases/family-base-source.js'
import familyPack from '../src/modules/cost-bases/b2-family-source.pack.json'

const root = resolve(__dirname, '../../..'), orgId = 'cmsqrb5ye0001q7mn6i4dbx2b'
const sourceId = 'cmsqufvfh0004pn7gp3c35crj', release = '4f5fc2de0c3d178dace917231e1092040dec21fd'
const resumeSaved=process.argv.slice(2).join(' ')==='--resume-saved'
const b3Repair=process.argv.slice(2).join(' ')==='--b3-repair-verified'
const b3RouteFix=process.argv.slice(2).join(' ')==='--b3-route-fix-authorized'
const b3Final=process.argv.slice(2).join(' ')==='--b3-final-validation-authorized'
const b3Optimized=process.argv.slice(2).join(' ')==='--b3-optimized-validation-authorized'
const b3Trace=process.argv.slice(2).join(' ')==='--b3-trace-validation-authorized'
const b3Recovery=process.argv.slice(2).join(' ')==='--b3-recovery-validation-authorized'
const s2FamilyAmended=process.argv.slice(2).join(' ')==='--s2-family-amendment-validation-authorized'
const s2FamilyActorFix=process.argv.slice(2).join(' ')==='--s2-family-actor-fix-validation-authorized'
const s2Family=s2FamilyActorFix||s2FamilyAmended||process.argv.slice(2).join(' ')==='--s2-family-validation-authorized'
const familyWindow=s2FamilyActorFix?createS2FamilyActorFixWindow():s2FamilyAmended?createS2FamilyAmendedWindow():s2Family?createS2FamilyWindow():undefined
const b3=s2Family||b3Recovery||b3Trace||b3Optimized||b3Final||b3RouteFix||b3Repair||process.argv.slice(2).join(' ')==='--b3'
const resumeExisting=b3||resumeSaved||process.argv.slice(2).join(' ')==='--resume-existing'
const activeDeadline=familyWindow?.deadline??(b3Recovery?B3_RECOVERY_DEADLINE:b3Trace?B3_TRACE_DEADLINE:b3Optimized?B3_OPTIMIZED_DEADLINE:b3Final?B3_FINAL_DEADLINE:b3?B3_DEADLINE:resumeExisting?W2_CLOSEOUT_DEADLINE:W2_GATE_DEADLINE)
const activeMarker=familyWindow?.marker??(b3?(b3Recovery?B3_RECOVERY_MARKER:b3Trace?B3_TRACE_MARKER:b3Optimized?B3_OPTIMIZED_MARKER:b3Final?B3_FINAL_MARKER:b3RouteFix?B3_ROUTE_FIX_MARKER:b3Repair?B3_REPAIR_MARKER:B3_MARKER):resumeSaved?W2_CLOSEOUT_READBACK_MARKER:resumeExisting?W2_CLOSEOUT_MARKER:W2_GATE_MARKER)
const assertW2GateOpen=s2FamilyActorFix?()=>assertS2FamilyActorFixOpen(familyWindow!):s2FamilyAmended?()=>assertS2FamilyAmendedOpen(familyWindow!):s2Family?()=>assertS2FamilyOpen(familyWindow!):b3Recovery?assertB3RecoveryOpen:b3Trace?assertB3TraceOpen:b3Optimized?assertB3OptimizedOpen:b3Final?assertB3FinalOpen:b3?assertB3Open:resumeExisting?assertW2CloseoutOpen:assertLegacyGateOpen
const assertResumeRole=(role:Parameters<typeof assertB3Role>[0])=>s2FamilyActorFix?assertS2FamilyActorFixRole(role):s2FamilyAmended?assertS2FamilyAmendedRole(role):s2Family?assertS2FamilyRole(role):b3?assertB3Role(role,b3Recovery?'recovery-validation':b3Trace?'trace-validation':b3Optimized?'optimized-validation':b3Final?'final-validation':b3RouteFix?'route-fix':b3Repair):assertW2CloseoutRole(role,resumeSaved)
const deadline = Date.parse(activeDeadline)
const digest = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex')
let phase = 'preflight', app: FastifyInstance | undefined, runtime: PrismaClient | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let cleanupTarget: URL | undefined, preparationAttempted=false, closing=false

/** Separate admin client only for the explicitly authorized NOLOGIN cleanup.
 * The marker must identify this cut. Never disable an unmarked/foreign role. */
async function disableOwnRole() {
  if(!cleanupTarget || !preparationAttempted) return
  const admin=new PrismaClient({datasourceUrl:cleanupTarget.toString(),log:[]})
  try {
    const rows=await admin.$queryRawUnsafe<any[]>(`SELECT rolname,rolcanlogin,shobj_description(oid,'pg_authid') AS marker FROM pg_roles WHERE rolname='${W2_GATE_ROLE}'`)
    if(!rows.length) { console.log(JSON.stringify({temporaryRoleAbsent:true}));return }
    if(resumeExisting && rows[0].marker===(s2FamilyActorFix?S2_FAMILY_ACTOR_FIX_PRIOR_MARKER:s2FamilyAmended?S2_FAMILY_PRIOR_MARKER:s2Family?B3_RECOVERY_MARKER:b3?(b3Recovery?B3_TRACE_MARKER:b3Trace?B3_OPTIMIZED_MARKER:b3Optimized?B3_FINAL_MARKER:b3Final?B3_ROUTE_FIX_MARKER:b3RouteFix?B3_REPAIR_MARKER:b3Repair?B3_MARKER:W2_CLOSEOUT_READBACK_MARKER):resumeSaved?W2_CLOSEOUT_MARKER:W2_CLOSEOUT_PREVIOUS_MARKER) && !rows[0].rolcanlogin){
      const [state]=await admin.$queryRawUnsafe<any[]>(`SELECT count(*)::int AS sessions FROM pg_stat_activity WHERE usename='${W2_GATE_ROLE}'`)
      if(state.sessions)throw new Error('Role cleanup incomplete')
      console.log(JSON.stringify({temporaryRoleUnchangedAndDisabled:true,remainingRoleSessions:0}));return
    }
    if(rows[0].marker!==activeMarker) throw new Error('Cleanup role ownership not established')
    await admin.$executeRawUnsafe(`ALTER ROLE ${W2_GATE_ROLE} NOLOGIN`)
    const [state]=await admin.$queryRawUnsafe<any[]>(`SELECT rolcanlogin,(SELECT count(*)::int FROM pg_stat_activity WHERE usename='${W2_GATE_ROLE}') AS sessions FROM pg_roles WHERE rolname='${W2_GATE_ROLE}'`)
    console.log(JSON.stringify({temporaryRoleDisabled:!state.rolcanlogin,remainingRoleSessions:state.sessions,role:W2_GATE_ROLE}))
    if(state.rolcanlogin || state.sessions) throw new Error('Role cleanup incomplete')
  } finally { await admin.$disconnect() }
}

async function freePort(port: number) {
  const server = createServer()
  await new Promise<void>((ok, no) => { server.once('error', no); server.listen(port, '127.0.0.1', () => server.close(error => error ? no(error) : ok())) })
}

async function verifyRuntime(db: PrismaClient) {
  phase='verify-effective-role'
  const [role] = await db.$queryRawUnsafe<any[]>(`SELECT current_user AS name,current_database() AS database,
    rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication,rolinherit,
    (SELECT count(*)::int FROM pg_auth_members WHERE member=r.oid) AS memberships,
    (SELECT count(*)::int FROM pg_class WHERE relowner=r.oid) AS owns,
    has_schema_privilege(current_user,'public','CREATE') AS schema_create,
    has_database_privilege(current_user,current_database(),'CREATE') AS database_create
    FROM pg_roles r WHERE rolname=current_user`)
  if (!role || role.name !== W2_GATE_ROLE || role.database !== 'neondb'
    || ['rolsuper','rolbypassrls','rolcreatedb','rolcreaterole','rolreplication','rolinherit','schema_create','database_create'].some(k=>role[k])
    || role.memberships || role.owns) throw new Error('Role attributes differ')
  phase='verify-effective-columns'
  const columns = await db.$queryRawUnsafe<any[]>(`SELECT c.relname AS table,a.attname AS column,
    has_table_privilege(current_user,c.oid,'SELECT') AS reads,
    has_column_privilege(current_user,c.oid,a.attname,'INSERT') AS inserts,
    has_column_privilege(current_user,c.oid,a.attname,'UPDATE') AS updates,
    has_table_privilege(current_user,c.oid,'DELETE,TRUNCATE,REFERENCES,TRIGGER') AS unsafe
    FROM pg_class c JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
    WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','p','v','m','f')`)
  if (columns.some(c => c.unsafe || c.reads !== W2_GATE_TABLES.includes(c.table)
    || c.inserts !== (c.table==='CostBaseAuditEvent' && W2_GATE_EVENT_COLUMNS.includes(c.column))
    || c.updates !== (['Organization','AssumptionSet'].includes(c.table) && c.column==='id'))) throw new Error('Effective table/column privileges differ')
  for (const table of W2_GATE_TABLES) if (!columns.some(c=>c.table===table && c.reads)) throw new Error('Missing table')
  phase='verify-effective-extra'
  const [extra] = await db.$queryRawUnsafe<any[]>(`SELECT
    (SELECT count(*)::int FROM pg_class WHERE relnamespace='public'::regnamespace AND CASE WHEN relkind='S' THEN has_sequence_privilege(current_user,oid,'USAGE,UPDATE') ELSE false END) AS sequences,
    (SELECT count(*)::int FROM pg_proc WHERE pronamespace='public'::regnamespace AND prosecdef AND has_function_privilege(current_user,oid,'EXECUTE')) AS definers`)
  if (extra.sequences || extra.definers) throw new Error('Additional write capability')
  console.log(JSON.stringify({ effectivePrivilegesVerified: true, role: role.name, selectTables: 6, insertColumns: W2_GATE_EVENT_COLUMNS.length,
    updateColumns: ['Organization.id','AssumptionSet.id'], publicDefiners: 0, ownedObjects: 0 }))
}

async function main() {
  // Human amendment preserves the diagnostic attempt and permits one additional QA commit.
  const mode=resumeExisting?'PERSISTENCE_QA':w2PreparationMode(process.argv.slice(2))
  const diagnosticOnly = mode==='DIAGNOSTIC_ROLLBACK'
  const apply = mode!=='READ_ONLY'
  assertW2GateOpen()
  phase='verify-checkout'
  const git = (...args:string[])=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim()
  if (!/^[dD]:[\\/]/.test(realpathSync(root)) || git('branch','--show-current')!=='codex/cost-tires-release-s14' || git('rev-parse','HEAD')!==release) throw new Error('Checkout changed')
  if (apply && (s2Family?process.env.FCM_S2_FAMILY_GATE_APPROVAL:b3?process.env.FCM_B3_GATE_APPROVAL:process.env.FCM_W2_GATE_APPROVAL) !== (s2FamilyActorFix?S2_FAMILY_ACTOR_FIX_AUTHORITY:s2FamilyAmended?S2_FAMILY_AMENDMENT_AUTHORITY:s2Family?S2_FAMILY_AUTHORITY:b3?(b3Recovery?B3_RECOVERY_AUTHORITY:b3Trace?B3_TRACE_AUTHORITY:b3Optimized?B3_OPTIMIZED_AUTHORITY:b3Final?B3_FINAL_AUTHORITY:b3RouteFix?B3_ROUTE_FIX_AUTHORITY:B3_AUTHORITY):resumeExisting?W2_CLOSEOUT_AUTHORITY:w2PreparationAuthority(diagnosticOnly,release,W2_GATE_DEADLINE))) throw new Error('Scoped human approval reference missing')
  await freePort(3002)
  phase='verify-auth-public-config'
  const publicSource = parse(readFileSync('D:/andre/worktrees/freight-cost-model/supabase-auth-migration-20260830/apps/web/.env.local'))
  const authUrl=publicSource.NEXT_PUBLIC_SUPABASE_URL, authKey=publicSource.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (authUrl!=='https://alqjqzqagdmcywpjtnnr.supabase.co' || !authKey?.startsWith('sb_publishable_')) throw new Error('Auth target changed')
  phase='verify-preview-target'
  const target=readVerifiedPartnerPreviewTarget(); target.searchParams.set('connect_timeout','10'); target.searchParams.set('connection_limit','1')
  cleanupTarget=new URL(target.toString())
  const owner=new PrismaClient({datasourceUrl:target.toString(),log:[]})
  let ids:{baseId:string;versionId:string;params:number}
  try {
    phase='read-source-inventory'
    // All inventory reads are known up front. Prisma's batch transaction avoids
    // an interactive callback's wall-clock deadline/round trips between queries.
    // PostgreSQL READ ONLY and the per-statement 10 s limit remain in force.
    const [,,source,admins,existingBase,roles,base,users]=await owner.$transaction([
      owner.$executeRawUnsafe('SET TRANSACTION READ ONLY'),
      owner.$executeRawUnsafe("SET LOCAL statement_timeout = '10000ms'"),
      owner.assumptionSet.findUniqueOrThrow({where:{id:sourceId},include:{params:{orderBy:{id:'asc'}}}}),
      owner.user.findMany({where:{orgId,role:'ADMIN'},select:{id:true,supabaseId:true}}),
      owner.costBase.count({where:{orgId,code:'W2-QA-BINATIONAL-20261004'}}),
      owner.$queryRawUnsafe<{marker:string;login:boolean;sessions:number}[]>(`SELECT rolcanlogin AS login,shobj_description(oid,'pg_authid') AS marker,(SELECT count(*)::int FROM pg_stat_activity WHERE usename='${W2_GATE_ROLE}') AS sessions FROM pg_roles WHERE rolname='${W2_GATE_ROLE}'`),
      owner.costBase.findUniqueOrThrow({where:{id:'cmsqufvfb0002pn7gxy5i7cke'}}),
      owner.user.findMany({where:{orgId},orderBy:{id:'asc'},select:{id:true,orgId:true,role:true,supabaseId:true,updatedAt:true}}),
    ])
      if (admins.length!==1 || !/^[a-f0-9-]{36}$/i.test(admins[0].supabaseId) || existingBase!==(resumeExisting?1:0) || roles.length!==(resumeExisting?1:0)
        || source.orgId!==orgId || source.status!=='PUBLISHED' || !source.isActive || source.params.length!==210
        || base.operationalSegment!==null || base.status!=='ACTIVE') throw new Error('Inventory changed')
      assertW2Source(source,base,digest(source))
      // Pins from the immediately preceding authorized read-only preflight.
      if(digest(source.params)!=='b49ddf13d25846f47f2b63eccdc5ffdfbdd04ec5d4d4a9475f7819ff97569537'
        || wizardReviewSourceFingerprint({...source,costBase:base})!=='d57cf350def7c324cd5e2bf448e7d22cf1e8f2a1570852cf8310afbda553c92d')
        throw new Error('Source changed since authorized preflight')
      if(resumeExisting)assertResumeRole(roles[0])
    const before={source,base,users,actorId:admins[0].id,sourceHash:digest(source),baseHash:digest(base)}
    console.log(JSON.stringify({mode:'READ_ONLY_PREFLIGHT',roleAbsent:!resumeExisting,reviewBaseAbsent:!resumeExisting,sourceParams:210,sourceHash:before.sourceHash,apply,resumeExisting}))
    if (!apply) return
    assertW2GateOpen()
    phase='create-review-base-binding-role'
    const password=randomBytes(32).toString('hex'), expiresAt=activeDeadline
    if(resumeExisting){
      phase='reuse-existing-review-base-role'
      ids={...W2_CLOSEOUT_IDS}
      const qa=await owner.assumptionSet.findUniqueOrThrow({where:{id:ids.versionId},include:{params:{orderBy:{id:'asc'}},costBase:true}})
      if(digest(qa)!=='dc45b03c932f830dc77d65062f14b0ce4ad09d631d94e4f164e72eb6ec89e05c'
        ||await owner.costBaseAuditEvent.count({where:{orgId,costBaseId:ids.baseId}})!==(s2Family||b3Recovery?3:b3||resumeSaved?2:1))throw new Error('Inventory changed')
      if(b3||resumeSaved){
        const events=await owner.costBaseAuditEvent.findMany({where:{orgId,costBaseId:ids.baseId,action:'METADATA_UPDATED'},select:{payload:true,actorId:true}})
        const proposals=events.filter(e=>(e.payload as any)?.kind===WIZARD_REVIEW_METADATA_KIND)
        const payload=proposals[0]?.payload as any
        if(proposals.length!==1||proposals[0].actorId!==before.actorId||payload?.versionId!==ids.versionId
          ||payload?.draft?.revision!==1||payload.draft.decisions?.length!==1||payload.draft.receipts?.length!==1)throw new Error('Saved receipt differs')
      }
      assertW2GateOpen();preparationAttempted=true
      await owner.$transaction(async tx=>{
        const [role]=await tx.$queryRawUnsafe<{marker:string;login:boolean;sessions:number}[]>(`SELECT rolcanlogin AS login,shobj_description(oid,'pg_authid') AS marker,(SELECT count(*)::int FROM pg_stat_activity WHERE usename='${W2_GATE_ROLE}') AS sessions FROM pg_roles WHERE rolname='${W2_GATE_ROLE}'`)
        assertResumeRole(role);assertW2GateOpen()
        await tx.$executeRawUnsafe(`ALTER ROLE ${W2_GATE_ROLE} LOGIN PASSWORD '${password}' VALID UNTIL '${expiresAt}'`)
        await tx.$executeRawUnsafe(`COMMENT ON ROLE ${W2_GATE_ROLE} IS '${activeMarker}'`)
      },{timeout:15000})
    } else {
    const childEnv={...process.env,NODE_ENV:'development',VERCEL_ENV:'preview',STAGING_DATABASE_URL:target.toString(),DATABASE_URL:''}
    preparationAttempted=true
    const output=execFileSync(process.execPath,[resolve(root,'node_modules/tsx/dist/cli.mjs'),resolve(__dirname,'prepare-w2-review-base.ts')],{
      cwd:resolve(root,'apps/api'),env:childEnv,input:JSON.stringify({url:target.toString(),actorId:before.actorId,sourceHash:before.sourceHash,baseHash:before.baseHash,password,expiresAt,diagnosticOnly}),
      encoding:'utf8',windowsHide:true,timeout:60000,stdio:['pipe','pipe','pipe'],
    })
    if (diagnosticOnly) {
      phase='verify-diagnostic-rollback'
      const receipt=JSON.parse(output)
      if(receipt.event!=='W2_DIAGNOSTIC_ROLLBACK' || receipt.completedPreparation!==true || receipt.committed!==false)
        throw new Error('Diagnostic receipt differs')
      const after=await owner.$transaction(async tx=>{
        await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
        await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10000ms'")
        const source=await tx.assumptionSet.findUniqueOrThrow({where:{id:sourceId},include:{params:{orderBy:{id:'asc'}}}})
        const base=await tx.costBase.findUniqueOrThrow({where:{id:before.base.id}})
        const users=await tx.user.findMany({where:{orgId},orderBy:{id:'asc'},select:{id:true,orgId:true,role:true,supabaseId:true,updatedAt:true}})
        const reviewBases=await tx.costBase.count({where:{orgId,code:'W2-QA-BINATIONAL-20261004'}})
        const roles=await tx.$queryRaw`SELECT rolname FROM pg_roles WHERE rolname=${W2_GATE_ROLE}` as unknown[]
        return {sourceUnchanged:digest(source)===before.sourceHash,sourceBaseUnchanged:digest(base)===before.baseHash,
          usersUnchanged:digest(users)===digest(before.users),reviewBaseAbsent:reviewBases===0,temporaryRoleAbsent:roles.length===0}
      },{timeout:20000})
      if(Object.values(after).some(value=>!value)) throw new Error('Diagnostic rollback invariant failed')
      console.log(JSON.stringify({event:'W2_DIAGNOSTIC_ROLLBACK_VERIFIED',...after,sourceHash:before.sourceHash,runtimeStarted:false,authenticatedPersistenceTested:false}))
      return
    }
    ids=JSON.parse(output)
    }
    phase='verify-clone'
    const created=await owner.assumptionSet.findUniqueOrThrow({where:{id:ids.versionId},include:{params:true,costBase:true}})
    const sourceAfter=await owner.assumptionSet.findUniqueOrThrow({where:{id:sourceId},include:{params:{orderBy:{id:'asc'}}}})
    const oldBase=await owner.costBase.findUniqueOrThrow({where:{id:before.base.id}})
    if (digest(sourceAfter)!==before.sourceHash || digest(oldBase)!==digest(before.base) || created.params.length!==210
      || digest(w2CloneParams(created.params))!==digest(w2CloneParams(before.source.params)) || created.status!=='DRAFT' || created.isActive
      || created.calibrationEvidence!==null || created.costBase?.status!=='DRAFT' || created.costBase.isDefault
      || created.applicabilityContext!==null || created.costBase.operationalSegment!==null
      || digest(await owner.user.findMany({where:{orgId},orderBy:{id:'asc'},select:{id:true,orgId:true,role:true,supabaseId:true,updatedAt:true}}))!==digest(before.users)) throw new Error('Clone invariant failed')
    console.log(JSON.stringify({...(resumeExisting?{reviewBaseReused:ids.baseId}:{reviewBaseCreated:ids.baseId}),versionId:ids.versionId,sourceParamsUnchanged:true,clonedParams:210,
      usersUnchanged:true,sourceBaseUnchanged:true,status:'DRAFT',active:false,calibrated:false}))
    const limited=new URL(target.toString()); limited.username=W2_GATE_ROLE; limited.password=password
    runtime=new PrismaClient({datasourceUrl:limited.toString(),log:[]})
    phase='verify-effective-privileges'; await verifyRuntime(runtime)
    console.log(JSON.stringify({...(resumeExisting?{roleReactivated:W2_GATE_ROLE}:{roleCreated:W2_GATE_ROLE}),expiresAt,credentialStored:false,deadline:new Date(deadline).toISOString()}))
    Object.assign(process.env,{NODE_ENV:'development',VERCEL_ENV:'preview',FCM_PREVIEW_EXISTING_USERS_ONLY:'true',
      STAGING_DATABASE_URL:limited.toString(),DATABASE_URL:'',SUPABASE_URL:authUrl,SUPABASE_PUBLISHABLE_KEY:authKey,
      SUPABASE_EXPECTED_PROJECT_REF:'alqjqzqagdmcywpjtnnr',SUPABASE_JWT_AUDIENCE:'authenticated',OPENAI_API_KEY:'',
      GOOGLE_ROUTES_API_KEY:'',RATEWARE_API_URL:'',CRON_SECRET:'',LOG_LEVEL:'fatal'})
  } finally { await owner.$disconnect() }
  // First import of the app's singleton occurs only AFTER the admin process exits.
  ;(globalThis as unknown as {prisma:PrismaClient}).prisma=runtime!
  const {authenticateExisting}=await import('../src/middleware/authenticate-existing.js')
  const {getMe}=await import('../src/modules/auth/auth.service.js')
  const {versionWizard}=await import('../src/modules/cost-bases/cost-base-wizard-version.service.js')
  const versionPlanning=createVersionPlanning(work=>runtime!.$transaction(work,WIZARD_TRANSACTION_OPTIONS),
    planningCatalog as WizardCatalog,event=>console.log(JSON.stringify(event)))
  let verifiedPlanning:{actor:Parameters<typeof versionPlanning.save>[0];body:PlanningCommand}|undefined
  let planningAttempted=false
  if(b3Recovery||s2Family){
    const events=await runtime!.costBaseAuditEvent.findMany({where:{orgId,costBaseId:ids!.baseId,action:'METADATA_UPDATED'},select:{payload:true,actorId:true}})
    const stored=events.filter(e=>(e.payload as any)?.kind===PLANNING_KIND)
    if(stored.length!==1||!stored[0].actorId)throw new Error('Single planning receipt required')
    const p=PlanningRecord.parse(stored[0].payload),actor={orgId,sub:stored[0].actorId,role:'ADMIN' as const}
    const view=await versionPlanning.read(actor,ids!.baseId,ids!.versionId)
    if(view.revision!==1||!view.latest||view.latest.savedBy!==actor.sub)throw new Error('Planning receipt differs')
    verifiedPlanning={actor,body:PlanningSave.parse({context:p.context,selection:p.selection,expectedRevision:p.revision-1,
      expectedVersionFingerprint:p.versionFingerprint,expectedSnapshot:p.calculation.sha256,requestId:p.requestId,planningAccepted:true,note:p.note})}
    planningAttempted=true
    console.log(JSON.stringify({existingPlanningRecovered:true,revision:1,newPlanningCommandsAllowed:false}))
  }
  const familyStore=s2Family?createFamilyBaseStore(work=>runtime!.$transaction(work,WIZARD_TRANSACTION_OPTIONS),decodeFamilySource(familyPack),planningCatalog as WizardCatalog):undefined
  const familyAttempt=createS2FamilyAttempt()
  let verifiedFamily:{actor:Parameters<NonNullable<typeof familyStore>['save']>[0];body:unknown}|undefined
  if(s2Family){
    const initial=await familyStore!.read(verifiedPlanning!.actor,ids!.baseId,ids!.versionId)
    if(initial.status!=='NONE'||initial.revision!==0)throw new Error('S2 family proposal already exists')
    console.log(JSON.stringify({s2FamilyWindow:familyWindow,initialFamilyRevision:0,planningRevision:1,newPlanningCommandsAllowed:false}))
  }
  // Only retain an already authenticated, successfully saved command in memory.
  // This control tests the real DB receipt, not a second authenticated HTTP request.
  let verifiedSave: { actor: Parameters<typeof versionWizard.save>[0]; body: Parameters<typeof versionWizard.save>[3] } | undefined
  let saveAttempted=false
  if(resumeSaved){
    const events=await runtime!.costBaseAuditEvent.findMany({where:{orgId,costBaseId:ids!.baseId,action:'METADATA_UPDATED'},select:{payload:true,actorId:true}})
    const stored=events.find(e=>(e.payload as any)?.kind===WIZARD_REVIEW_METADATA_KIND)
    if(!stored?.actorId)throw new Error('Saved actor missing')
    const actor={orgId,sub:stored.actorId,role:'ADMIN' as const}
    const view=await versionWizard.read(actor,ids!.baseId,ids!.versionId)
    if(view.draft.revision!==1||view.draft.receipts.length!==1||view.draft.decisions.length!==1
      ||view.draft.decisions[0].conceptId!=='diesel-mx'||view.draft.decisions[0].mode!=='MARKSMAN')throw new Error('Saved receipt differs')
    verifiedSave={actor,body:{context:{orgId,baseId:ids!.baseId,versionId:ids!.versionId},expectedRevision:0,
      expectedVersionFingerprint:view.versionFingerprint,requestId:view.draft.receipts[0].requestId,
      decisions:view.draft.decisions.map(({evidenceQuality,...decision})=>decision)}}
    saveAttempted=true
    console.log(JSON.stringify({existingSavedDecisionRecovered:true,revision:1,receiptCount:1,newHttpWritesAllowed:false}))
  }
  const {errorHandler}=await import('../src/middleware/error-handler.js')
  const {requireRole}=await import('../src/middleware/authorize.js')
  const wizardPath=w2GatePath(ids!.baseId,ids!.versionId)
  const baseline=await runtime!.assumptionSet.findUniqueOrThrow({where:{id:ids!.versionId},include:{params:{orderBy:{id:'asc'}},costBase:true}})
  const baselineHash=digest(baseline)
  const sourceBaseline=await runtime!.assumptionSet.findUniqueOrThrow({where:{id:sourceId},include:{params:{orderBy:{id:'asc'}}}})
  const sourceBaseBaseline=await runtime!.costBase.findUniqueOrThrow({where:{id:'cmsqufvfb0002pn7gxy5i7cke'}})
  const usersBaseline=await runtime!.user.findMany({where:{orgId},orderBy:{id:'asc'},select:{id:true,orgId:true,role:true,supabaseId:true,updatedAt:true}})
  const priorEvents=s2Family?await runtime!.costBaseAuditEvent.findMany({where:{orgId,costBaseId:ids!.baseId},orderBy:{id:'asc'}}):[]
  const priorEventIds=new Set(priorEvents.map(e=>e.id))
  async function start() {
    app=Fastify({logger:false,bodyLimit:64*1024})
    const readTimings=new WeakMap<FastifyRequest,{start:number;authenticated?:number}>()
    app.addHook('onResponse',async(req,reply)=>{
      const timing=readTimings.get(req)
      if(timing)console.log(JSON.stringify({event:'B3_PLANNING_READ_TIMING',status:reply.statusCode,
        totalMs:Math.round(performance.now()-timing.start),
        identityMs:timing.authenticated===undefined?null:Math.round(timing.authenticated-timing.start),
        handlerAndResponseMs:timing.authenticated===undefined?null:Math.round(performance.now()-timing.authenticated)}))
    })
    app.setErrorHandler((error,request,reply)=>{
      // The normal 500 response stays generic. Never emit SQL, body, headers or tokens.
      console.error(JSON.stringify(w2SafeDiagnostic(request.method==='PUT'?'wizard-save':'wizard-read',error)))
      return errorHandler(error instanceof Error?error:new Error('Unhandled scoped W2 error'),request,reply)
    })
    app.addHook('onRequest',async(req,reply)=>{
      reply.header('Cache-Control','no-store')
      if(b3&&req.method==='GET'&&req.url.split('?',1)[0]===wizardPath.replace(/wizard$/,'planning'))
        readTimings.set(req,{start:performance.now()})
      if(Date.now()>=deadline) return reply.code(403).send({error:'W2_GATE_EXPIRED'})
      if(!(s2Family?s2FamilyRequestAllowed(req.method,req.url,ids!.baseId,ids!.versionId):b3?b3RequestAllowed(req.method,req.url,ids!.baseId,ids!.versionId):w2GateRequestAllowed(req.method,req.url,ids!.baseId,ids!.versionId))) return reply.code(403).send({error:'W2_GATE_OUT_OF_SCOPE'})
    })
    app.addHook('preHandler',async(req,reply)=>{
      if(['/health','/ready'].includes(req.url.split('?',1)[0])) return
      await authenticateExisting(req,reply)
      const timing=readTimings.get(req)
      if(timing)timing.authenticated=performance.now()
      if(reply.sent) return
      if(req.user?.orgId!==orgId) return reply.code(403).send({error:'W2_GATE_OTHER_ORGANIZATION'})
    })
    app.get('/health',async()=>({status:'ok',release}))
    app.get('/ready',async()=>{await runtime!.$queryRaw`SELECT 1`;return {database:'connected',release}})
    app.get('/auth/me',async(req)=>getMe(req.user!.sub))
    app.get(wizardPath,async(req)=>versionWizard.read(req.user!,ids!.baseId,ids!.versionId))
    if(s2Family)registerFamilyBaseRoutes(app,{...familyStore!,save:async(actor,baseId,versionId,body)=>{
      assertW2GateOpen();familyAttempt.begin(actor,body)
      try{
        const result=await familyStore!.save(actor,baseId,versionId,body)
        if(result.revision!==1||result.status!=='CURRENT')throw new Error('S2 family receipt differs')
        familyAttempt.completed(actor,body)
        if(!result.replayed)verifiedFamily={actor:structuredClone(actor),body:structuredClone(body)}
        console.log(JSON.stringify({authenticatedFamilyProposalSave:true,revision:result.revision,replayed:result.replayed,appliedToParams:result.appliedToParams,quoteReady:result.quoteReady}))
        return result
      }catch(error){setImmediate(()=>void close());throw error}
    }})
    if(b3){
      const planningPath=wizardPath.replace(/wizard$/,'planning')
      registerB3OwnRelayRoute(app)
      app.get(planningPath,{preHandler:requireRole('ADMIN','OPERATOR')},async req=>versionPlanning.read(req.user!,ids!.baseId,ids!.versionId))
      app.put(planningPath,{bodyLimit:16000,preHandler:requireRole('ADMIN','OPERATOR')},async(req,reply)=>{
        if(b3Recovery&&!b3RecoveryReplayAllowed(req.user!,req.body,verifiedPlanning))return reply.code(403).send({error:'B3_RECOVERY_EXACT_RECEIPT_ONLY'})
        if(planningAttempted&&(!verifiedPlanning||digest(req.body)!==digest(verifiedPlanning.body)))return reply.code(409).send({error:'B3_GATE_ATTEMPT_CONSUMED'})
        planningAttempted=true
        const result=await versionPlanning.save(req.user!,ids!.baseId,ids!.versionId,req.body)
        if(!result.replayed)verifiedPlanning={actor:structuredClone(req.user!),body:structuredClone(req.body) as PlanningCommand}
        console.log(JSON.stringify({authenticatedPlanningSave:true,revision:result.revision,replayed:result.replayed,
          productiveCostUsd:result.latest?.calculation.case.outputs.productiveCostUsd,appliedToParams:result.appliedToParams}))
        return result
      })
    }
    app.put(wizardPath,{preHandler:requireRole('ADMIN')},async(req,reply)=>{
      if(resumeSaved)return reply.code(403).send({error:'W2_GATE_SAVED_READBACK_ONLY'})
      const body=req.body as any
      if(resumeExisting && saveAttempted && (!verifiedSave || digest(body)!==digest(verifiedSave.body)))
        return reply.code(409).send({error:'W2_GATE_ATTEMPT_ALREADY_CONSUMED'})
      saveAttempted=true
      const current=await versionWizard.read(req.user!,ids!.baseId,ids!.versionId)
      if(current.draft.revision>0 && !current.draft.receipts.some(r=>r.requestId===body?.requestId)) return reply.code(409).send({error:'W2_GATE_ONE_DECISION_ONLY'})
      if(current.draft.revision===0 && (body?.decisions?.length!==1 || body.decisions[0].conceptId!=='diesel-mx' || body.decisions[0].mode!=='MARKSMAN')) return reply.code(422).send({error:'W2_GATE_EXPECTED_SINGLE_REFERENCE_DECISION'})
      const result=await versionWizard.save(req.user!,ids!.baseId,ids!.versionId,body)
      if (!result.replayed) verifiedSave={actor:structuredClone(req.user!),body:structuredClone(body)}
      console.log(JSON.stringify({authenticatedWizardSave:true,actorId:req.user!.sub,role:req.user!.role,revision:result.draft.revision,replayed:result.replayed,appliedToParams:result.appliedToParams}))
      return result
    })
    await app.listen({host:'127.0.0.1',port:3002})
    const anonymous=await app.inject({method:'GET',url:wizardPath})
    const denied=await app.inject({method:'POST',url:'/cost-bases'})
    console.log(JSON.stringify({runtime:'W2_SCOPED_ONLY',baseId:ids!.baseId,versionId:ids!.versionId,anonymousStatus:anonymous.statusCode,outOfScopeStatus:denied.statusCode,
      url:`http://localhost:3001/cost-bases/${ids!.baseId}/versions/${ids!.versionId}/build`,deadline:new Date(deadline).toISOString()}))
  }
  async function check() {
    const now=await runtime!.assumptionSet.findUniqueOrThrow({where:{id:ids!.versionId},include:{params:{orderBy:{id:'asc'}},costBase:true}})
    const eventCount=await runtime!.costBaseAuditEvent.count({where:{costBaseId:ids!.baseId,action:'METADATA_UPDATED'}})
    const intact=digest(now)===baselineHash
    const sourceNow=await runtime!.assumptionSet.findUniqueOrThrow({where:{id:sourceId},include:{params:{orderBy:{id:'asc'}}}})
    const sourceBaseNow=await runtime!.costBase.findUniqueOrThrow({where:{id:sourceBaseBaseline.id}})
    const usersNow=await runtime!.user.findMany({where:{orgId},orderBy:{id:'asc'},select:{id:true,orgId:true,role:true,supabaseId:true,updatedAt:true}})
    const sourceIntact=digest(sourceNow)===digest(sourceBaseline)&&digest(sourceBaseNow)===digest(sourceBaseBaseline)
    const usersIntact=digest(usersNow)===digest(usersBaseline)
    console.log(JSON.stringify({baselineHash,parametersProfileCalibrationStateUnchanged:intact,sourceIntact,usersIntact,metadataEvents:eventCount}))
    if(!intact || !sourceIntact || !usersIntact || (s2Family?eventCount<3||eventCount>4:b3Recovery?eventCount!==3:eventCount<(b3?2:1)||eventCount>(b3?3:2))) throw new Error('W2 invariant failed')
    if(s2Family){
      const events=await runtime!.costBaseAuditEvent.findMany({where:{orgId,costBaseId:ids!.baseId},orderBy:{id:'asc'}})
      const original=events.filter(e=>priorEventIds.has(e.id)),added=events.filter(e=>!priorEventIds.has(e.id))
      if(digest(original)!==digest(priorEvents)||added.length>1||added.some(e=>(e.payload as any)?.kind!==FAMILY_BASE_RECORD_KIND))throw new Error('S2 event history changed')
      console.log(JSON.stringify({priorEventsUnchanged:true,priorEventCount:priorEvents.length,newFamilyEvents:added.length}))
    }
  }
  async function replayVerifiedSave() {
    assertW2GateOpen()
    if(s2Family){
      if(!verifiedFamily)throw new Error('S2 authenticated family save not available')
      const before=await runtime!.costBaseAuditEvent.count({where:{costBaseId:ids!.baseId}})
      const result=await familyStore!.save(verifiedFamily.actor,ids!.baseId,ids!.versionId,structuredClone(verifiedFamily.body))
      const after=await runtime!.costBaseAuditEvent.count({where:{costBaseId:ids!.baseId}})
      if(!result.replayed||result.revision!==1||before!==after)throw new Error('S2 replay invariant failed')
      console.log(JSON.stringify({realFamilyReceiptReplay:true,secondHttpAuthenticationTested:false,revision:1,metadataEventsBefore:before,metadataEventsAfter:after}));await check();return
    }
    if(b3){
      if(!verifiedPlanning)throw new Error('B3 verified save not available')
      const before=await runtime!.costBaseAuditEvent.count({where:{costBaseId:ids!.baseId,action:'METADATA_UPDATED'}})
      const result=await versionPlanning.save(verifiedPlanning.actor,ids!.baseId,ids!.versionId,structuredClone(verifiedPlanning.body))
      const after=await runtime!.costBaseAuditEvent.count({where:{costBaseId:ids!.baseId,action:'METADATA_UPDATED'}})
      if(!result.replayed||result.revision!==1||before!==after||result.appliedToParams)throw new Error('B3 replay invariant failed')
      console.log(JSON.stringify({realPlanningReceiptReplay:true,secondHttpAuthenticationTested:false,revision:1,metadataEventsBefore:before,metadataEventsAfter:after}));await check();return
    }
    if (!verifiedSave) { console.log(JSON.stringify({realReplayPendingAuthenticatedSave:true})); return }
    const before=await runtime!.costBaseAuditEvent.count({where:{costBaseId:ids!.baseId,action:'METADATA_UPDATED'}})
    const result=await versionWizard.save(verifiedSave.actor,ids!.baseId,ids!.versionId,structuredClone(verifiedSave.body))
    const after=await runtime!.costBaseAuditEvent.count({where:{costBaseId:ids!.baseId,action:'METADATA_UPDATED'}})
    if (!result.replayed || result.draft.revision!==1 || result.appliedToParams || before!==after) throw new Error('Real DB replay invariant failed')
    console.log(JSON.stringify({realDatabaseReceiptReplay:true,secondHttpAuthenticationTested:false,
      replayed:result.replayed,revision:result.draft.revision,metadataEventsBefore:before,metadataEventsAfter:after,appliedToParams:result.appliedToParams}))
    await check()
  }
  async function coldReadback() {
    assertW2GateOpen()
    if(!b3||!verifiedPlanning)throw new Error('B3 verified save not available')
    if(s2Family&&!verifiedFamily)throw new Error('S2 authenticated family save not available')
    const actor=s2Family?verifiedFamily!.actor:verifiedPlanning.actor
    const view=s2Family?await familyStore!.read(actor,ids!.baseId,ids!.versionId):await versionPlanning.read(actor,ids!.baseId,ids!.versionId)
    const output=execFileSync(process.execPath,[resolve(root,'node_modules/tsx/dist/cli.mjs'),resolve(__dirname,'b3-cold-readback.ts')],{
      cwd:resolve(root,'apps/api'),env:{NODE_ENV:'development',VERCEL_ENV:'preview',PATH:process.env.PATH},
      input:JSON.stringify({familyValidation:s2Family,familyActorFix:s2FamilyActorFix,familyAmended:s2FamilyAmended,familyWindow,recoveryValidation:b3Recovery,traceValidation:b3Trace,optimizedValidation:b3Optimized,url:process.env.STAGING_DATABASE_URL,actor,baseId:ids!.baseId,
        versionId:ids!.versionId,expectedViewSha256:digest(view)}),encoding:'utf8',windowsHide:true,timeout:45000,stdio:['pipe','pipe','pipe'],
    })
    const receipt=JSON.parse(output)
    if(receipt.independentProcessReadback!==true||receipt.fullViewSha256!==digest(view))throw new Error('B3 cold readback receipt differs')
    console.log(JSON.stringify(receipt));await check()
  }
  const close=async()=>{
    if(closing)return;closing=true;clearTimeout(timer)
    let failed=false
    try{await app?.close();await check()}catch{failed=true}
    finally{await runtime?.$disconnect();try{await disableOwnRole()}catch{failed=true;console.error('W2 own-role cleanup requires attention')}}
    process.exit(failed?2:0)
  }
  phase='start-runtime'; await start()
  timer=setTimeout(()=>{void close().catch(()=>process.exit(2))},Math.max(1,deadline-Date.now()))
  createInterface({input:process.stdin}).on('line',line=>{
    void (async()=>{
      if(line==='restart'){await app?.close();await check();await start()}
      else if(line==='check') await check()
      else if(line==='replay') await replayVerifiedSave()
      else if(line==='cold') await coldReadback()
      else if(line==='stop') await close()
    })().catch(()=>{console.error('W2 control stopped; inspect state.');void close()})
  })
  process.once('SIGINT',()=>void close());process.once('SIGTERM',()=>void close())
}
main().catch(async error=>{
  clearTimeout(timer)
  const diagnostic=w2ChildDiagnostic(error)
  if(diagnostic) console.error(JSON.stringify(diagnostic))
  const safe=w2SafeDiagnostic('input',error)
  console.error(JSON.stringify({...safe,stopped:true,phase,message:'W2 stopped; inspect role/base inventory before any retry. No automatic rotation or data deletion.'}))
  await app?.close();await runtime?.$disconnect()
  try{await disableOwnRole()}catch{console.error('W2 own-role cleanup requires attention')}
  process.exitCode=2
})
