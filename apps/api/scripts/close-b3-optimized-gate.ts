import {createHash} from 'node:crypto'
import {PrismaClient} from '@prisma/client'
import {readVerifiedPartnerPreviewTarget} from './inspect-partner-preview.js'
import {W2_GATE_ROLE} from '../src/config/w2-local-gate.js'
import {B3_OPTIMIZED_MARKER} from './lib/b3-saas-gate.js'
import {w2SafeDiagnostic} from './lib/w2-safe-diagnostic.js'

// Recovery closure if the controller's stdin is unavailable. Stop the verified
// own API process first; never terminate unrelated sessions or reopen a role.
async function main(){
  const target=readVerifiedPartnerPreviewTarget()
  target.searchParams.set('connect_timeout','10');target.searchParams.set('connection_limit','1')
  const db=new PrismaClient({datasourceUrl:target.toString(),log:[]})
  const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
  try{
    await db.$transaction(async tx=>{
      const [role]=await tx.$queryRawUnsafe<any[]>(`SELECT shobj_description(oid,'pg_authid') AS marker FROM pg_roles WHERE rolname='${W2_GATE_ROLE}'`)
      if(role?.marker!==B3_OPTIMIZED_MARKER)throw new Error('Closure marker differs')
      await tx.$executeRawUnsafe(`ALTER ROLE ${W2_GATE_ROLE} NOLOGIN`)
    },{timeout:15000})
    const [,,roles,events,qa,source]=await db.$transaction([
      db.$executeRawUnsafe('SET TRANSACTION READ ONLY'),
      db.$executeRawUnsafe("SET LOCAL statement_timeout='10000ms'"),
      db.$queryRawUnsafe<any[]>(`SELECT rolcanlogin AS login,shobj_description(oid,'pg_authid') AS marker,(SELECT count(*)::int FROM pg_stat_activity WHERE usename='${W2_GATE_ROLE}') AS sessions FROM pg_roles WHERE rolname='${W2_GATE_ROLE}'`),
      db.costBaseAuditEvent.findMany({where:{orgId:'cmsqrb5ye0001q7mn6i4dbx2b',costBaseId:'cmuuuwhbx0002sips941fqodr'},select:{payload:true}}),
      db.assumptionSet.findUniqueOrThrow({where:{id:'cmuuuwhc20004sipsywu5stvk'},include:{params:{orderBy:{id:'asc'}},costBase:true}}),
      db.assumptionSet.findUniqueOrThrow({where:{id:'cmsqufvfh0004pn7gp3c35crj'},include:{params:{orderBy:{id:'asc'}}}}),
    ])
    const result={roleDisabled:roles[0]?.login===false,remainingRoleSessions:roles[0]?.sessions,
      marker:roles[0]?.marker,metadataEvents:events.length,
      planningEvents:events.filter(e=>(e.payload as {kind?:string})?.kind==='FCM_VERSION_PLANNING_V1').length,
      qaHash:hash(qa),sourceHash:hash(source)}
    console.log(JSON.stringify(result))
    if(!result.roleDisabled||result.remainingRoleSessions!==0||result.marker!==B3_OPTIMIZED_MARKER
      ||result.qaHash!=='dc45b03c932f830dc77d65062f14b0ce4ad09d631d94e4f164e72eb6ec89e05c'
      ||result.sourceHash!=='47a5bf5ea3571cad8b0c40a15b3715c93d0ab6ab93e1c9ad529f0e7270076346')throw new Error('Closure verification differs')
  }finally{await db.$disconnect()}
}
main().catch(error=>{console.error(JSON.stringify({...w2SafeDiagnostic('input',error),closureUnverified:true}));process.exitCode=2})
