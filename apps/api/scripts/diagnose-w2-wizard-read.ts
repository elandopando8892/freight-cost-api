// Read-only reproduction of the wizard load. No role changes or save entry point.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { readVerifiedPartnerPreviewTarget } from './inspect-partner-preview.js'
import { w2SafeDiagnostic } from './lib/w2-safe-diagnostic.js'
import { createVersionWizard } from '../src/modules/cost-bases/cost-base-wizard-version.js'
import snapshot from '../src/modules/cost-bases/cost-base-wizard.catalog.json'
import type { WizardCatalog } from '../src/modules/cost-bases/cost-base-wizard-draft.js'
import { WIZARD_TRANSACTION_OPTIONS } from '../src/modules/cost-bases/cost-base-wizard-transaction.js'

const root=resolve(__dirname,'../../..'), orgId='cmsqrb5ye0001q7mn6i4dbx2b'
const baseId='cmuuuwhbx0002sips941fqodr', versionId='cmuuuwhc20004sipsywu5stvk'
let stage='preflight', db:PrismaClient|undefined
const samples:{model:string;action:string;elapsedMs:number;ok:boolean}[]=[]
async function main(){
  if(process.argv.slice(2).join(' ')!=='--read-only') throw new Error('Read-only mode required')
  const git=(...args:string[])=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim()
  if(!/^[dD]:[\\/]/.test(realpathSync(root)) || git('branch','--show-current')!=='codex/cost-tires-release-s14'
    ||git('rev-parse','HEAD')!=='4f5fc2de0c3d178dace917231e1092040dec21fd')throw new Error('Checkout changed')
  const catalog=snapshot as unknown as WizardCatalog
  if(createHash('sha256').update(JSON.stringify({profile:catalog.profile,cards:catalog.cards})).digest('hex')!==catalog.revision)throw new Error('W2 catalog changed')
  const target=readVerifiedPartnerPreviewTarget();target.searchParams.set('connect_timeout','10');target.searchParams.set('connection_limit','1')
  db=new PrismaClient({datasourceUrl:target.toString(),log:[]})
  // Standard Prisma 5 middleware: no query, arguments, result or identity in output.
  db.$use(async(params,next)=>{
    const started=performance.now();let ok=false
    try {const result=await next(params);ok=true;return result}
    finally {if(stage==='wizard-read') samples.push({model:['AssumptionSet','CostBaseAuditEvent'].includes(params.model??'')?params.model!:'control',action:['findFirst','findMany','executeRaw','queryRaw'].includes(params.action)?params.action:'other',elapsedMs:Math.round(performance.now()-started),ok})}
  })
  await db.$connect()
  stage='wizard-read';const started=performance.now()
  const wizard=createVersionWizard(work=>db!.$transaction(async tx=>{
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
    const [guard]=await tx.$queryRawUnsafe<{readOnly:string}[]>("SELECT current_setting('transaction_read_only') AS \"readOnly\"")
    if(guard.readOnly!=='on')throw new Error('Read-only guard unavailable')
    return work(tx)
  },WIZARD_TRANSACTION_OPTIONS),catalog)
  try {
    const view=await wizard.read({orgId,sub:'READ_ONLY_DIAGNOSTIC',role:'ADMIN'},baseId,versionId)
    console.log(JSON.stringify({event:'W2_WIZARD_READ_RESULT',readOnly:true,credentialRole:'EXISTING_PREVIEW_OWNER_READ_ONLY',authenticated:false,revision:view.draft.revision,decisions:view.draft.decisions.length,appliedToParams:view.appliedToParams,elapsedMs:Math.round(performance.now()-started),samples}))
  } catch(error){
    console.error(JSON.stringify({...w2SafeDiagnostic('wizard-read',error),readOnlyRequested:true,credentialRole:'EXISTING_PREVIEW_OWNER_READ_ONLY',elapsedMs:Math.round(performance.now()-started),samples}));process.exitCode=2
  }
}
main().catch(error=>{console.error(JSON.stringify({...w2SafeDiagnostic('input',error),stage}));process.exitCode=2}).finally(async()=>{await db?.$disconnect()})
