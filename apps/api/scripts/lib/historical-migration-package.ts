import { createHash } from 'node:crypto'
import { buildHistoricalCutoverPlan } from './historical-cutover-plan.js'
import { buildMigrationInventoryPlan, FINALIZE_SUPABASE_IDENTITY, type CutoverMigrationRecord, type ProductionCutoverPlanInput } from './production-cutover-plan.js'
import type { FcmAccessScope } from '../../src/modules/auth/fcm-access-scope.js'
type Input = ProductionCutoverPlanInput & { scope:FcmAccessScope }
const sha=(s:string)=>createHash('sha256').update(s).digest('hex')
const ledgerProjection=(rows:CutoverMigrationRecord[])=>rows.map(r=>({name:r.migration_name,checksum:r.checksum.toLowerCase(),
  finished:r.finished_at===null?null:new Date(r.finished_at).toISOString(),
  rollback:r.rolled_back_at===null?null:new Date(r.rolled_back_at).toISOString()})).map(r=>JSON.stringify(r)).sort()

/** A separate, sealed review package for Prisma; original source/history never
 * changes. The deferred file remains in the repository, not falsely applied.
 * Source authenticity, backup, authority and target are runner preconditions. */
export function buildHistoricalMigrationPackage(input:Input,schema:string){
  const plan=buildHistoricalCutoverPlan(input)
  if(!plan.reviewReady)throw new Error('HISTORICAL_PACKAGE_PLAN_BLOCKED')
  const datasource=schema.match(/datasource\s+db\s*\{([^}]+)\}/)?.[1].replace(/\s+/g,' ').trim()
  if(datasource!=='provider = "postgresql" url = env("DATABASE_URL")')throw new Error('HISTORICAL_PACKAGE_SCHEMA_INVALID')
  const files=[{path:'schema.prisma',content:schema},{path:'migrations/migration_lock.toml',content:'provider = "postgresql"\n'},
    ...input.artifacts.filter(a=>a.name!==FINALIZE_SUPABASE_IDENTITY).sort((a,b)=>a.name.localeCompare(b.name)).map(a=>({path:`migrations/${a.name}/migration.sql`,content:a.sql}))]
  return {schemaVersion:'fcm.historical-migration-package.v1',files,
    fingerprint:sha(JSON.stringify({plan:plan.planFingerprint,files:files.map(f=>({path:f.path,sha256:sha(f.content)}))})),
    planFingerprint:plan.planFingerprint,pendingNames:plan.pendingMigrations.map(a=>a.name),
    deferredMigration:FINALIZE_SUPABASE_IDENTITY,writesAuthorized:false as const}
}

/** Accepts only one exact legacy difference, never an arbitrary Prisma diff.
 * Returned validation proves configuration/history, not login or promotion. */
export function verifyHistoricalCoexistence(before:Input,after:CutoverMigrationRecord[],driftSql:string){
  const planned=buildHistoricalCutoverPlan(before), actual=buildMigrationInventoryPlan({artifacts:before.artifacts,ledger:after})
  if(!planned.reviewReady||!actual.ready||actual.pendingMigrations.length||actual.deferredFinalize?.name!==FINALIZE_SUPABASE_IDENTITY)
    throw new Error('HISTORICAL_COEXISTENCE_LEDGER_BLOCKED')
  const remaining=ledgerProjection(after)
  for(const row of ledgerProjection(before.ledger)){
    const index=remaining.indexOf(row)
    if(index<0)throw new Error('HISTORICAL_COEXISTENCE_HISTORY_CHANGED')
    remaining.splice(index,1)
  }
  if(remaining.length!==planned.pendingMigrations.length)throw new Error('HISTORICAL_COEXISTENCE_HISTORY_CHANGED')
  const sql=driftSql.replace(/--[^\r\n]*/g,'').replace(/\s+/g,' ').trim()
  if(sql!=='DROP INDEX "User_kindeId_key"; ALTER TABLE "User" DROP COLUMN "kindeId";')
    throw new Error('HISTORICAL_COEXISTENCE_UNEXPECTED_DRIFT')
  return {validated:true as const,deferredMigration:FINALIZE_SUPABASE_IDENTITY,retirementApplied:false as const,
    planFingerprint:planned.planFingerprint,ledgerFingerprint:actual.fingerprint,loginValidated:false as const}
}
