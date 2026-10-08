import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'
import { buildHistoricalMigrationPackage, verifyHistoricalCoexistence } from '../scripts/lib/historical-migration-package.js'
import { FINALIZE_SUPABASE_IDENTITY } from '../scripts/lib/production-cutover-plan.js'
const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const fixture = () => {
  const scope = { version: 1 as const, users: [
    { email: 'sales@heymarksman.com', subject: '00000000-0000-4000-8000-000000000001' },
    { email: 'jgonzalez@xbfreight.com', subject: '00000000-0000-4000-8000-000000000002' },
  ] }
  const artifacts = readdirSync(resolve('prisma/migrations'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => {
    const sql = readFileSync(resolve('prisma/migrations', d.name, 'migration.sql'), 'utf8')
    return { name: d.name, sql, checksum: sha(sql) }
  }).sort((a,b) => a.name.localeCompare(b.name))
  const ledger = artifacts.slice(0,33).map(a => ({ migration_name:a.name,checksum:a.checksum,finished_at:'2026-10-08T12:00:00Z',rolled_back_at:null as string|null }))
  return { input:{ scope,artifacts,ledger,users:[{id:'owner',orgId:'original-org',role:'ADMIN',emailHash:sha('sales@heymarksman.com'),identityFingerprint:sha('full-owner')},
      {id:'historic',orgId:'original-org',role:'ADMIN',emailHash:sha('historical@example.invalid'),identityFingerprint:sha('full-historic')}],
    authMatches:scope.users.map(u => ({emailHash:sha(u.email),supabaseId:u.subject,verified:true})) },
    schema:readFileSync(resolve('prisma/schema.prisma'),'utf8') }
}
const expectedDrift = '-- DropIndex\nDROP INDEX "User_kindeId_key";\n-- AlterTable\nALTER TABLE "User" DROP COLUMN "kindeId";\n'
const after = (f:ReturnType<typeof fixture>) => [...f.input.ledger.map(r=>({...r})),...f.input.artifacts.slice(33).filter(a => a.name!==FINALIZE_SUPABASE_IDENTITY).map(a=>({migration_name:a.name,checksum:a.checksum,finished_at:'2026-10-08T13:00:00Z',rolled_back_at:null}))]
it('packages original migration bytes, deferring only retirement without authorizing execution', () => {
  const f=fixture(), original=structuredClone(f), bundle=buildHistoricalMigrationPackage(f.input,f.schema)
  expect(bundle.files).toHaveLength(48) // 46 migration SQL, schema and provider lock
  expect(bundle.files.some(x=>x.path.includes(FINALIZE_SUPABASE_IDENTITY))).toBe(false)
  for(const a of f.input.artifacts.filter(x=>x.name!==FINALIZE_SUPABASE_IDENTITY))
    expect(bundle.files.find(x=>x.path===`migrations/${a.name}/migration.sql`)?.content).toBe(a.sql)
  expect(bundle.pendingNames).toHaveLength(13)
  expect(bundle.writesAuthorized).toBe(false)
  expect(f).toEqual(original)
})
it('accepts only the exact known Kinde coexistence while leaving retirement pending', () => {
  const f=fixture(), result=verifyHistoricalCoexistence(f.input,after(f),expectedDrift)
  expect(result).toMatchObject({validated:true,deferredMigration:FINALIZE_SUPABASE_IDENTITY,retirementApplied:false})
})
it('preserves a rolled-back attempt when the same migration later succeeds',()=>{
  const f=fixture(),m=f.input.artifacts[34]
  f.input.ledger.push({migration_name:m.name,checksum:m.checksum,finished_at:null as unknown as string,rolled_back_at:'2026-10-08T11:00:00Z'})
  expect(verifyHistoricalCoexistence(f.input,after(f),expectedDrift).validated).toBe(true)
})
it.each(['unknown-drift','missing-index','empty-drift','retirement-applied','unfinished','changed-checksum','changed-old-time','lost-rollback'])('rejects %s instead of hiding schema/history changes', kind => {
  const f=fixture();let ledger=after(f),drift=expectedDrift
  if(kind==='unknown-drift')drift+='ALTER TABLE "User" DROP COLUMN "email";'
  if(kind==='missing-index')drift='ALTER TABLE "User" DROP COLUMN "kindeId";'
  if(kind==='empty-drift')drift='-- empty schema difference'
  if(kind==='retirement-applied'){const a=f.input.artifacts.find(a=>a.name===FINALIZE_SUPABASE_IDENTITY)!;ledger.push({migration_name:a.name,checksum:a.checksum,finished_at:'2026-10-08T13:00:00Z',rolled_back_at:null})}
  if(kind==='unfinished')ledger[34].finished_at=null as unknown as string
  if(kind==='changed-checksum')ledger[34].checksum=sha('tampered')
  if(kind==='changed-old-time')ledger[0].finished_at='2026-10-08T11:00:00Z'
  if(kind==='lost-rollback')f.input.ledger.push({migration_name:'old-attempt',checksum:sha('old'),finished_at:null as unknown as string,rolled_back_at:'2026-10-08T11:00:00Z'})
  expect(()=>verifyHistoricalCoexistence(f.input,ledger,drift)).toThrow()
})
it.each(['unverified','invalid-schema','invalid-source'])('does not package %s', kind=>{
  const f=fixture()
  if(kind==='unverified')f.input.authMatches[0].verified=false
  if(kind==='invalid-schema')f.schema=''
  if(kind==='invalid-source')f.input.artifacts[0].sql+='SELECT 2;'
  expect(()=>buildHistoricalMigrationPackage(f.input,f.schema)).toThrow()
})
