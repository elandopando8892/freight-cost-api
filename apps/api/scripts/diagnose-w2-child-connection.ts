// Scoped READ_ONLY diagnostic. Child receives the already verified target only in memory.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { readVerifiedPartnerPreviewTarget } from './inspect-partner-preview.js'
import { assertW2GateOpen, W2_GATE_ROLE } from '../src/config/w2-local-gate.js'
import { w2SafeDiagnostic, w2ChildDiagnostic, type W2PreparationPhase } from './lib/w2-safe-diagnostic.js'

let phase: W2PreparationPhase='verified-target'
async function main() {
  assertW2GateOpen()
  if(process.argv.slice(2).some(arg=>arg!=='--child') || process.argv.slice(2).length>1) throw new Error('Invalid options')
  if(!process.argv.includes('--child')) {
    const target=readVerifiedPartnerPreviewTarget()
    target.searchParams.set('connect_timeout','10');target.searchParams.set('connection_limit','1')
    phase='read-only-child'
    const output=execFileSync(process.execPath,[resolve(__dirname,'../../../node_modules/tsx/dist/cli.mjs'),__filename,'--child'],{
      input:JSON.stringify({url:target.toString()}),cwd:resolve(__dirname,'..'),encoding:'utf8',windowsHide:true,
      timeout:45000,stdio:['pipe','pipe','pipe'],env:{...process.env,SUPABASE_ACCESS_TOKEN:'',FCM_W2_GATE_APPROVAL:'',DATABASE_URL:'',STAGING_DATABASE_URL:target.toString()},
    })
    const result=JSON.parse(output)
    if(result.event!=='W2_READ_ONLY_CHILD_INVENTORY' || result.transactionReadOnly!==true) throw new Error('Unexpected child output')
    console.log(JSON.stringify(result));return
  }
  const {url}=JSON.parse(readFileSync(0,'utf8')),target=new URL(url)
  if(target.hostname!=='ep-autumn-thunder-av6e9bsh.c-11.us-east-1.aws.neon.tech'||target.pathname!=='/neondb'
    ||!['postgres:','postgresql:'].includes(target.protocol)) throw new Error('W2 preview target required')
  const db=new PrismaClient({datasourceUrl:target.toString(),log:[]})
  try {
    phase='connect';await db.$connect();phase='read-only-transaction'
    const result=await db.$transaction(async tx=>{
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout='10000ms'")
      const [state]=await tx.$queryRawUnsafe<{readOnly:string}[]>("SELECT current_setting('transaction_read_only') AS \"readOnly\"")
      if(state.readOnly!=='on') throw new Error('Read-only guard not observed')
      const source=await tx.assumptionSet.findUniqueOrThrow({where:{id:'cmsqufvfh0004pn7gp3c35crj'},include:{params:{orderBy:{id:'asc'}}}})
      const sourceHash=createHash('sha256').update(JSON.stringify(source)).digest('hex')
      const count=await tx.costBase.count({where:{orgId:'cmsqrb5ye0001q7mn6i4dbx2b',code:'W2-QA-BINATIONAL-20261004'}})
      const roles=await tx.$queryRaw`SELECT rolname FROM pg_roles WHERE rolname=${W2_GATE_ROLE}` as unknown[]
      return {event:'W2_READ_ONLY_CHILD_INVENTORY',transactionReadOnly:true,sourceHash,
        sourceUnchanged:sourceHash==='47a5bf5ea3571cad8b0c40a15b3715c93d0ab6ab93e1c9ad529f0e7270076346',
        sourceParams:source.params.length,reviewBaseAbsent:count===0,temporaryRoleAbsent:roles.length===0,databaseWritesAttempted:false}
    },{timeout:20000})
    console.log(JSON.stringify(result))
  } finally { await db.$disconnect() }
}
main().catch(error=>{console.error(JSON.stringify(w2ChildDiagnostic(error)??w2SafeDiagnostic(phase,error)));process.exitCode=2})
