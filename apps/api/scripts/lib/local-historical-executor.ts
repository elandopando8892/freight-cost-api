import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { buildHistoricalMigrationPackage, verifyHistoricalCoexistence } from './historical-migration-package.js'
import type { CutoverMigrationRecord, CutoverUserInventory, ProductionCutoverPlanInput } from './production-cutover-plan.js'
import type { FcmAccessScope } from '../../src/modules/auth/fcm-access-scope.js'
type Options={container:string;database:string;input:ProductionCutoverPlanInput&{scope:FcmAccessScope};schema:string}
const installed=createRequire(resolve('package.json'))
const q=(s:string)=>`'${s.replace(/'/g,"''")}'`
const ident=(s:string)=>`"${s.replace(/"/g,'""')}"`
const sha=(s:string)=>createHash('sha256').update(s).digest('hex')
const stable=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item)
const sorted=(rows:unknown[])=>rows.map(stable).sort()

/** Local rehearsal executor, not a remote writer. It accepts only an owned
 * loopback Docker fixture. Never reads environment database URLs or credentials,
 * provisions Auth, links users, marks deferred SQL applied, or retries failures.
 * A durable per-database marker blocks another attempt even with fresh inputs. */
export function executeLocalHistoricalTransition(options:Options){
  if(!/^fcm-historical-executor-[a-f0-9]{12}$/.test(options.container)||!/^fcm_hist_[a-z0-9_]{1,40}$/.test(options.database)
    ||options.database.endsWith('_restore')||process.platform!=='win32')throw new Error('LOCAL_EXECUTOR_TARGET_REQUIRED')
  if(process.env.DOCKER_HOST||process.env.DOCKER_CONTEXT)throw new Error('LOCAL_EXECUTOR_DOCKER_OVERRIDE')
  const run=(exe:string,args:string[],code:string,input?:string,env?:NodeJS.ProcessEnv,cwd?:string)=>{
    const result=spawnSync(exe,args,{input,env,cwd,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:120000,maxBuffer:16*1024*1024})
    if(result.status!==0||result.error)throw new Error(code)
    return result.stdout.trim()
  }
  const endpoint=run('docker',['context','inspect','--format','{{.Endpoints.docker.Host}}'],'LOCAL_EXECUTOR_DOCKER_UNAVAILABLE')
  if(!['npipe:////./pipe/dockerDesktopLinuxEngine','npipe:////./pipe/docker_engine'].includes(endpoint))throw new Error('LOCAL_EXECUTOR_DOCKER_REQUIRED')
  const owned=run('docker',['inspect',options.container,'--format','{{.Id}}|{{index .Config.Labels "fcm.disposable"}}'],'LOCAL_EXECUTOR_NOT_OWNED')
  if(!/^[a-f0-9]{64}\|historical-executor-20261008$/.test(owned))throw new Error('LOCAL_EXECUTOR_NOT_OWNED')
  const assertOwned=()=>{
    if(run('docker',['inspect',options.container,'--format','{{.Id}}|{{index .Config.Labels "fcm.disposable"}}'],'LOCAL_EXECUTOR_NOT_OWNED')!==owned)throw new Error('LOCAL_EXECUTOR_OWNER_CHANGED')
  }
  const mapping=run('docker',['port',options.container,'5432/tcp'],'LOCAL_EXECUTOR_PORT_UNAVAILABLE')
  const port=mapping.match(/^127\.0\.0\.1:(\d+)$/)?.[1];if(!port)throw new Error('LOCAL_EXECUTOR_LOOPBACK_REQUIRED')
  const database=options.database,restore=database+'_restore'
  const sql=(db:string,body:string)=>{
    assertOwned()
    return run('docker',['exec','-i',options.container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',db],'LOCAL_EXECUTOR_SQL_FAILED',body)
  }
  const read=<T>(body:string,db=database):T=>JSON.parse(sql(db,`BEGIN READ ONLY; SET LOCAL statement_timeout='30s'; ${body}; COMMIT;`))
  if(sql(database,`SELECT to_regnamespace('fcm_historical_run') IS NOT NULL`) ==='t')throw new Error('LOCAL_TRANSITION_ALREADY_ATTEMPTED')
  const bundle=buildHistoricalMigrationPackage(options.input,options.schema)
  const users=read<CutoverUserInventory[]>(`SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'orgId',"orgId",'role',role::text,'emailHash',encode(sha256(convert_to(lower(btrim(email)),'UTF8')),'hex'),'identityFingerprint',encode(sha256(convert_to(to_jsonb(u)::text,'UTF8')),'hex')) ORDER BY id),'[]'::jsonb) FROM public."User" u`)
  const ledger=()=>read<CutoverMigrationRecord[]>(`SELECT COALESCE(jsonb_agg(jsonb_build_object('migration_name',migration_name,'checksum',checksum,'finished_at',finished_at::text,'rolled_back_at',rolled_back_at::text) ORDER BY migration_name,started_at),'[]'::jsonb) FROM public."_prisma_migrations"`)
  const normalizeLedger=(rows:CutoverMigrationRecord[])=>sorted(rows.map(r=>({...r,finished_at:r.finished_at===null?null:new Date(r.finished_at).toISOString(),rolled_back_at:r.rolled_back_at===null?null:new Date(r.rolled_back_at).toISOString()})))
  if(stable(sorted(users))!==stable(sorted(options.input.users))||stable(normalizeLedger(ledger()))!==stable(normalizeLedger(options.input.ledger)))throw new Error('LOCAL_TRANSITION_INVENTORY_CHANGED')
  const directory=mkdtempSync('D:/andre/validation/fcm-historical-execution-')
  for(const file of bundle.files){
    const dst=resolve(directory,file.path)
    if(!dst.startsWith(resolve(directory)+sep))throw new Error('LOCAL_EXECUTOR_PACKAGE_PATH')
    mkdirSync(dirname(dst),{recursive:true});writeFileSync(dst,file.content,{flag:'wx'})
  }
  const assertPackage=()=>{for(const f of bundle.files)if(sha(readFileSync(resolve(directory,f.path),'utf8'))!==sha(f.content))throw new Error('LOCAL_EXECUTOR_PACKAGE_CHANGED')}
  const env:NodeJS.ProcessEnv={}
  for(const name of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP'])if(process.env[name]!==undefined)env[name]=process.env[name]
  const url=(db:string)=>`postgresql://postgres:local-synthetic-only@127.0.0.1:${port}/${db}`
  env.DATABASE_URL=url(database);env.CHECKPOINT_DISABLE='1';env.PRISMA_HIDE_UPDATE_MESSAGE='true'
  const prisma=(args:string[],code:string)=>{assertOwned();assertPackage();return run(process.execPath,[installed.resolve('prisma'),...args],code,undefined,env,directory)}
  const tables=read<{name:string;columns:string[]}[]>(`SELECT jsonb_agg(jsonb_build_object('name',t.table_name,'columns',(SELECT jsonb_agg(c.column_name ORDER BY ordinal_position) FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=t.table_name)) ORDER BY t.table_name) FROM information_schema.tables t WHERE t.table_schema='public' AND t.table_type='BASE TABLE'`)
  const dataEvidence=(db:string)=>read<{name:string;hash:string}[]>(`SELECT jsonb_agg(to_jsonb(e) ORDER BY name) FROM (${tables.map(t=>`SELECT ${q(t.name)} AS name,encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text),'[]'::jsonb)::text,'UTF8')),'hex') AS hash FROM (SELECT ${t.columns.map(ident).join(',')} FROM public.${ident(t.name)}) r`).join(' UNION ALL ')}) e`,db)
  const baseline=dataEvidence(database)
  const oldLedger=read<{id:string;hash:string}[]>(`SELECT jsonb_agg(jsonb_build_object('id',id,'hash',encode(sha256(convert_to(to_jsonb(m)::text,'UTF8')),'hex')) ORDER BY id) FROM public."_prisma_migrations" m`)
  sql(database,`BEGIN; CREATE SCHEMA fcm_historical_run; REVOKE ALL ON SCHEMA fcm_historical_run FROM PUBLIC;
    CREATE TABLE fcm_historical_run.manifest(fingerprint text PRIMARY KEY,state text NOT NULL);
    REVOKE ALL ON ALL TABLES IN SCHEMA fcm_historical_run FROM PUBLIC;
    INSERT INTO fcm_historical_run.manifest VALUES(${q(bundle.fingerprint)},'STARTED'); COMMIT;`)
  const archive=`/tmp/${database}.dump`
  assertOwned();run('docker',['exec',options.container,'pg_dump','-U','postgres','-d',database,'-Fc','-f',archive],'LOCAL_TRANSITION_BACKUP_FAILED')
  sql('postgres',`CREATE DATABASE ${ident(restore)}`)
  assertOwned();run('docker',['exec',options.container,'pg_restore','--exit-on-error','-U','postgres','-d',restore,archive],'LOCAL_TRANSITION_RESTORE_FAILED')
  if(stable(dataEvidence(restore))!==stable(baseline)||stable(dataEvidence(database))!==stable(baseline))throw new Error('LOCAL_TRANSITION_BACKUP_CHANGED')
  prisma(['migrate','diff','--from-url',url(database),'--to-url',url(restore),'--exit-code'],'LOCAL_TRANSITION_RESTORE_SCHEMA_CHANGED')
  if(sql(restore,`SELECT fingerprint||'|'||state FROM fcm_historical_run.manifest`)!==bundle.fingerprint+'|STARTED')throw new Error('LOCAL_TRANSITION_RESTORE_MARKER_CHANGED')
  sql(database,`UPDATE fcm_historical_run.manifest SET state='UNCERTAIN' WHERE fingerprint=${q(bundle.fingerprint)}`)
  // Native Prisma owns truthful bookkeeping. No migrate resolve or SQL INSERT
  // into its ledger, no catch/retry, and no finalization file in this capsule.
  prisma(['migrate','deploy','--schema',resolve(directory,'schema.prisma')],'LOCAL_TRANSITION_MIGRATE_FAILED')
  prisma(['migrate','status','--schema',resolve(directory,'schema.prisma')],'LOCAL_TRANSITION_STATUS_FAILED')
  const afterData=dataEvidence(database).filter(t=>t.name!=='_prisma_migrations')
  if(stable(afterData)!==stable(baseline.filter(t=>t.name!=='_prisma_migrations')))throw new Error('LOCAL_TRANSITION_HISTORICAL_DATA_CHANGED')
  const retainedLedger=read<{id:string;hash:string}[]>(`SELECT jsonb_agg(jsonb_build_object('id',id,'hash',encode(sha256(convert_to(to_jsonb(m)::text,'UTF8')),'hex')) ORDER BY id) FROM public."_prisma_migrations" m WHERE id IN (${oldLedger.map(r=>q(r.id)).join(',')})`)
  if(stable(sorted(retainedLedger))!==stable(sorted(oldLedger)))throw new Error('LOCAL_TRANSITION_OLD_LEDGER_CHANGED')
  const drift=prisma(['migrate','diff','--from-url',url(database),'--to-schema-datamodel',resolve(directory,'schema.prisma'),'--script'],'LOCAL_TRANSITION_DIFF_FAILED')
  verifyHistoricalCoexistence(options.input,ledger(),drift)
  sql(database,`UPDATE fcm_historical_run.manifest SET state='VERIFIED' WHERE fingerprint=${q(bundle.fingerprint)}`)
  return {schemaVersion:'fcm.local-historical-execution.v1',packageDirectory:directory,packageFingerprint:bundle.fingerprint,
    backup:'PASS' as const,restore:'PASS' as const,migrationsApplied:bundle.pendingNames.length,nativeLedger:true as const,
    coexistence:'PASS' as const,productionTouched:false as const,realLoginValidated:false as const}
}
