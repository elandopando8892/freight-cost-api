import {PrismaClient} from '@prisma/client'
import {readVerifiedPartnerPreviewTarget} from './inspect-partner-preview.js'
import {assertB3TraceOpen,B3_TRACE_MARKER} from './lib/b3-saas-gate.js'
import {W2_GATE_ROLE} from '../src/config/w2-local-gate.js'
import {createVersionPlanning} from '../src/modules/cost-bases/version-planning.js'
import {PlanningRecord,PLANNING_KIND} from '../src/modules/cost-bases/version-planning-contract.js'
import catalog from '../src/modules/cost-bases/cost-base-wizard.catalog.json'
import type {WizardCatalog} from '../src/modules/cost-bases/cost-base-wizard-draft.js'
import {readOwnRelayReview} from '../src/modules/engine/b2-own-relay-review.js'
import {isDeepStrictEqual} from 'node:util'
const context={orgId:'cmsqrb5ye0001q7mn6i4dbx2b',baseId:'cmuuuwhbx0002sips941fqodr',versionId:'cmuuuwhc20004sipsywu5stvk'}
async function main(){
  assertB3TraceOpen()
  const target=readVerifiedPartnerPreviewTarget();target.searchParams.set('connection_limit','1');target.searchParams.set('connect_timeout','10')
  const db=new PrismaClient({datasourceUrl:target.toString(),log:[]})
  try{
    const [,,roles,events,rawEvents]=await db.$transaction([
      db.$executeRawUnsafe('SET TRANSACTION READ ONLY'),db.$executeRawUnsafe("SET LOCAL statement_timeout='10000ms'"),
      db.$queryRawUnsafe<any[]>(`SELECT rolcanlogin AS login,shobj_description(oid,'pg_authid') AS marker,(SELECT count(*)::int FROM pg_stat_activity WHERE usename='${W2_GATE_ROLE}') AS sessions FROM pg_roles WHERE rolname='${W2_GATE_ROLE}'`),
      db.costBaseAuditEvent.findMany({where:{orgId:context.orgId,costBaseId:context.baseId,action:'METADATA_UPDATED'},select:{payload:true,actorId:true}}),
      db.$queryRaw<{payload:string}[]>`SELECT payload::text AS payload FROM "CostBaseAuditEvent" WHERE "orgId"=${context.orgId} AND "costBaseId"=${context.baseId} AND action='METADATA_UPDATED' AND payload->>'kind'=${PLANNING_KIND} AND payload->>'versionId'=${context.versionId} LIMIT 2`,
    ])
    if(roles[0]?.login||roles[0]?.sessions!==0||roles[0]?.marker!==B3_TRACE_MARKER)throw new Error('CLOSED_ROLE_REQUIRED')
    const stored=events.filter(e=>(e.payload as {kind?:string})?.kind===PLANNING_KIND)
    if(stored.length!==1||!stored[0].actorId)throw new Error('SINGLE_RECORD_REQUIRED')
    const parsed=PlanningRecord.safeParse(stored[0].payload)
    console.log(JSON.stringify({mode:'READ_ONLY_OWNER_DIAGNOSTIC',metadataEvents:events.length,planningEvents:stored.length,
      schemaValid:parsed.success,...(!parsed.success?{issues:parsed.error.issues.map(i=>({code:i.code,path:i.path}))}:{})}))
    if(!parsed.success)return
    const expected=readOwnRelayReview({...parsed.data.selection,expectedSnapshot:parsed.data.calculation.sha256},{orgId:context.orgId,sub:stored[0].actorId})
    if(rawEvents.length!==1)throw new Error('RAW_COUNT_DIFFERS')
    const rawRecord=PlanningRecord.parse(JSON.parse(rawEvents[0].payload))
    console.log(JSON.stringify({textTransportCalculationEqual:isDeepStrictEqual(rawRecord.calculation,expected)}))
    console.log(JSON.stringify({calculationEqual:isDeepStrictEqual(parsed.data.calculation,expected),
      differingTopLevelKeys:Object.keys(expected).filter(k=>!isDeepStrictEqual((parsed.data.calculation as any)[k],(expected as any)[k]))}))
    const differences:unknown[]=[]
    function compare(a:unknown,b:unknown,path:string){
      if(isDeepStrictEqual(a,b)||differences.length>=20)return
      if(typeof a==='number'&&typeof b==='number'){
        differences.push({path,type:'number',stored:a,expected:b,storedNegativeZero:Object.is(a,-0),expectedNegativeZero:Object.is(b,-0)});return
      }
      if(a&&b&&typeof a==='object'&&typeof b==='object'){
        for(const key of new Set([...Object.keys(a),...Object.keys(b)]))compare((a as any)[key],(b as any)[key],`${path}.${key}`)
      }else differences.push({path,storedType:typeof a,expectedType:typeof b})
    }
    compare(parsed.data.calculation.case,expected.case,'case')
    console.log(JSON.stringify({publicCalculationDifferences:differences}))
    const service=createVersionPlanning(work=>db.$transaction(async tx=>{
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');return work(tx)
    },{maxWait:2000,timeout:15000}),catalog as WizardCatalog)
    try{
      const view=await service.read({orgId:context.orgId,sub:stored[0].actorId,role:'ADMIN'},context.baseId,context.versionId)
      console.log(JSON.stringify({recovered:true,revision:view.revision,appliedToParams:view.appliedToParams}))
    }catch(error){
      const message=error instanceof Error?error.message:''
      console.log(JSON.stringify({recovered:false,reason:/^(PLANNING|WIZARD|RELAY)_[A-Z_]+$/.test(message)?message:'UNKNOWN'}))
    }
  }finally{await db.$disconnect()}
}
main().catch(()=>{console.error('B3 read-only diagnostic failed; no automatic retry.');process.exitCode=2})
