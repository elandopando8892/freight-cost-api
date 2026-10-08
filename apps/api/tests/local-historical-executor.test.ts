import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { executeLocalHistoricalTransition } from '../scripts/lib/local-historical-executor.js'
import type { CutoverUserInventory, CutoverMigrationRecord } from '../scripts/lib/production-cutover-plan.js'
const sha=(s:string)=>createHash('sha256').update(s).digest('hex')
const requireInstalled=createRequire(resolve('package.json'))
const container=process.env.FCM_EXECUTOR_TEST_CONTAINER
if(container&&!/^fcm-historical-executor-[a-f0-9]{12}$/.test(container))throw new Error('EXECUTOR_FIXTURE_NOT_OWNED')
const scope={version:1 as const,users:[
  {email:'sales@heymarksman.com',subject:'00000000-0000-4000-8000-000000000001'},
  {email:'jgonzalez@xbfreight.com',subject:'00000000-0000-4000-8000-000000000002'},
]}
const schema=readFileSync(resolve('prisma/schema.prisma'),'utf8')
const artifacts=readdirSync(resolve('prisma/migrations'),{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>{
  const sql=readFileSync(resolve('prisma/migrations',d.name,'migration.sql'),'utf8')
  return {name:d.name,sql,checksum:sha(sql)}
}).sort((a,b)=>a.name.localeCompare(b.name))
const sql=(database:string,query:string)=>execFileSync('docker',['exec','-i',container!,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',database],{input:query,encoding:'utf8',windowsHide:true,timeout:60000})
const input=(database:string,source=artifacts)=>({scope,artifacts:source,
  ledger:JSON.parse(sql(database,`SELECT jsonb_agg(jsonb_build_object('migration_name',migration_name,'checksum',checksum,'finished_at',finished_at::text,'rolled_back_at',rolled_back_at::text) ORDER BY migration_name) FROM "_prisma_migrations"`)) as CutoverMigrationRecord[],
  users:JSON.parse(sql(database,`SELECT jsonb_agg(jsonb_build_object('id',id,'orgId',"orgId",'role',role::text,'emailHash',encode(sha256(convert_to(lower(btrim(email)),'UTF8')),'hex'),'identityFingerprint',encode(sha256(convert_to(to_jsonb(u)::text,'UTF8')),'hex')) ORDER BY id) FROM "User" u`)) as CutoverUserInventory[],
  authMatches:scope.users.map(u=>({emailHash:sha(u.email),supabaseId:u.subject,verified:true}))})
it('rejects a non-owned target before issuing SQL',()=>{
  expect(()=>executeLocalHistoricalTransition({container:'unrelated-container',database:'production',input:{scope,artifacts,ledger:[],users:[],authMatches:[]},schema})).toThrow('LOCAL_EXECUTOR_TARGET_REQUIRED')
})
describe.skipIf(!container)('owned local Prisma transition executor',()=>{
  beforeAll(()=>{
    const label=execFileSync('docker',['inspect',container!,'--format','{{index .Config.Labels "fcm.disposable"}}'],{encoding:'utf8',windowsHide:true}).trim()
    if(label!=='historical-executor-20261008')throw new Error('EXECUTOR_FIXTURE_NOT_OWNED')
    const mapping=execFileSync('docker',['port',container!,'5432/tcp'],{encoding:'utf8',windowsHide:true}).trim()
    const port=mapping.match(/^127\.0\.0\.1:(\d+)$/)?.[1];if(!port)throw new Error('LOOPBACK_REQUIRED')
    const dir=mkdtempSync('D:/andre/validation/fcm-executor-baseline-')
    writeFileSync(resolve(dir,'schema.prisma'),schema,{flag:'wx'})
    mkdirSync(resolve(dir,'migrations'))
    writeFileSync(resolve(dir,'migrations/migration_lock.toml'),'provider = "postgresql"\n',{flag:'wx'})
    for(const a of artifacts.slice(0,33)){
      mkdirSync(resolve(dir,'migrations',a.name));writeFileSync(resolve(dir,'migrations',a.name,'migration.sql'),a.sql,{flag:'wx'})
    }
    for(const database of ['fcm_hist_source','fcm_hist_failure','fcm_hist_stale']){
      sql('postgres',`CREATE DATABASE "${database}"`)
      execFileSync(process.execPath,[requireInstalled.resolve('prisma'),'migrate','deploy','--schema',resolve(dir,'schema.prisma')],{cwd:dir,encoding:'utf8',windowsHide:true,timeout:120000,
        env:{PATH:process.env.PATH,Path:process.env.Path,SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP,DATABASE_URL:`postgresql://postgres:local-synthetic-only@127.0.0.1:${port}/${database}`,CHECKPOINT_DISABLE:'1'}})
      sql(database,`INSERT INTO "Organization"(id,name,"updatedAt") VALUES('executor-org','Synthetic executor',CURRENT_TIMESTAMP);
        INSERT INTO "User"(id,"orgId",email,role,"kindeId","updatedAt") VALUES('owner','executor-org','sales@heymarksman.com','ADMIN','old-owner',CURRENT_TIMESTAMP),('historic','executor-org','historical@example.invalid','ADMIN','old-history',CURRENT_TIMESTAMP);
        INSERT INTO "AssumptionSet"(id,"orgId",name,"updatedAt") VALUES('historic-base','executor-org','Synthetic economic version',CURRENT_TIMESTAMP);
        INSERT INTO "AssumptionParam"(id,"setId",section,field,value,unit,"updatedAt") VALUES('historic-parameter','historic-base','COST_CAPITAL','synthetic_cost',75000,'USD',CURRENT_TIMESTAMP);`)
    }
  },180000)
  it('verifies full backup/restore and native ledger, preserving historical economics and denying replay',()=>{
    const initial=input('fcm_hist_source')
    const result=executeLocalHistoricalTransition({container:container!,database:'fcm_hist_source',input:initial,schema})
    expect(result).toMatchObject({backup:'PASS',restore:'PASS',migrationsApplied:13,nativeLedger:true,coexistence:'PASS',productionTouched:false,realLoginValidated:false})
    expect(sql('fcm_hist_source',`SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`).trim()).toBe('46')
    expect(sql('fcm_hist_source',`SELECT count(*) FROM "User" WHERE "supabaseId" IS NULL AND "kindeId" IS NOT NULL`).trim()).toBe('2')
    expect(sql('fcm_hist_source',`SELECT value FROM "AssumptionParam" WHERE id='historic-parameter'`).trim()).toBe('75000')
    expect(sql('fcm_hist_source_restore',`SELECT count(*) FROM "_prisma_migrations"`).trim()).toBe('33')
    expect(sql('fcm_hist_source_restore',`SELECT value FROM "AssumptionParam" WHERE id='historic-parameter'`).trim()).toBe('75000')
    expect(()=>executeLocalHistoricalTransition({container:container!,database:'fcm_hist_source',input:input('fcm_hist_source'),schema})).toThrow('LOCAL_TRANSITION_ALREADY_ATTEMPTED')
    expect(sql('fcm_hist_source',`SELECT state FROM fcm_historical_run.manifest`).trim()).toBe('VERIFIED')
  },180000)
  it('refuses a stale full-user projection before creating an execution marker',()=>{
    const initial=input('fcm_hist_stale');initial.users[0].orgId='other-tenant'
    expect(()=>executeLocalHistoricalTransition({container:container!,database:'fcm_hist_stale',input:initial,schema})).toThrow('LOCAL_TRANSITION_INVENTORY_CHANGED')
    expect(sql('fcm_hist_stale',`SELECT to_regnamespace('fcm_historical_run') IS NULL`).trim()).toBe('t')
    expect(sql('fcm_hist_stale',`SELECT count(*) FROM "_prisma_migrations"`).trim()).toBe('33')
  },30000)
  it('retains a failed native migration and stops without automatic retry or false applied status',()=>{
    const brokenSql='SELECT 1/0;\n',source=[...artifacts,{name:'20261008060000_synthetic_failure',sql:brokenSql,checksum:sha(brokenSql)}]
    const initial=input('fcm_hist_failure',source)
    expect(()=>executeLocalHistoricalTransition({container:container!,database:'fcm_hist_failure',input:initial,schema})).toThrow('LOCAL_TRANSITION_MIGRATE_FAILED')
    expect(sql('fcm_hist_failure',`SELECT count(*) FROM "_prisma_migrations" WHERE migration_name='20261008060000_synthetic_failure' AND finished_at IS NULL AND rolled_back_at IS NULL`).trim()).toBe('1')
    expect(sql('fcm_hist_failure',`SELECT state FROM fcm_historical_run.manifest`).trim()).toBe('UNCERTAIN')
    expect(()=>executeLocalHistoricalTransition({container:container!,database:'fcm_hist_failure',input:initial,schema})).toThrow('LOCAL_TRANSITION_ALREADY_ATTEMPTED')
    expect(sql('fcm_hist_failure',`SELECT count(*) FROM "_prisma_migrations" WHERE migration_name='20261008060000_synthetic_failure'`).trim()).toBe('1')
    expect(sql('fcm_hist_failure_restore',`SELECT count(*) FROM "_prisma_migrations"`).trim()).toBe('33')
  },180000)
})
