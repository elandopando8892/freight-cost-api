import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { createVersionPlanning } from '../src/modules/cost-bases/version-planning.js'
import catalog from '../src/modules/cost-bases/cost-base-wizard.catalog.json'
import type { WizardCatalog } from '../src/modules/cost-bases/cost-base-wizard-draft.js'
import { WIZARD_TRANSACTION_OPTIONS } from '../src/modules/cost-bases/cost-base-wizard-transaction.js'
import { B3_DEADLINE, assertB3Open } from './lib/b3-saas-gate.js'
import { B3_OPTIMIZED_DEADLINE, assertB3OptimizedOpen } from './lib/b3-saas-gate.js'
import { B3_TRACE_DEADLINE, assertB3TraceOpen } from './lib/b3-saas-gate.js'
import { W2_GATE_ROLE } from '../src/config/w2-local-gate.js'
import {assertB3RecoveryOpen,B3_RECOVERY_DEADLINE} from './lib/b3-saas-gate.js'
import {assertS2FamilyOpen,assertS2FamilyAmendedOpen,assertS2FamilyActorFixOpen} from './lib/b3-saas-gate.js'
import {createFamilyBaseStore} from '../src/modules/cost-bases/family-base-store.js'
import {decodeFamilySource} from '../src/modules/cost-bases/family-base-source.js'
import familyPack from '../src/modules/cost-bases/b2-family-source.pack.json'

// Parent sends the already limited credential through stdin, never argv/files/logs.
async function main() {
  const input = JSON.parse(readFileSync(0,'utf8'))
  if(input.familyValidation===true){if(input.familyActorFix===true)assertS2FamilyActorFixOpen(input.familyWindow);else if(input.familyAmended===true)assertS2FamilyAmendedOpen(input.familyWindow);else assertS2FamilyOpen(input.familyWindow)}
  else (input.recoveryValidation===true?assertB3RecoveryOpen:input.traceValidation===true?assertB3TraceOpen:input.optimizedValidation===true?assertB3OptimizedOpen:assertB3Open)()
  const url = new URL(input.url)
  if (url.username !== W2_GATE_ROLE || url.hostname !== 'ep-autumn-thunder-av6e9bsh.c-11.us-east-1.aws.neon.tech'
    || input.actor.orgId !== 'cmsqrb5ye0001q7mn6i4dbx2b'
    || input.baseId !== 'cmuuuwhbx0002sips941fqodr' || input.versionId !== 'cmuuuwhc20004sipsywu5stvk') throw new Error('Scope differs')
  const db = new PrismaClient({datasourceUrl:url.toString(),log:[]})
  try {
    if(input.familyValidation===true){
      const store=createFamilyBaseStore(work=>db.$transaction(async tx=>{
        await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');return work(tx)
      },WIZARD_TRANSACTION_OPTIONS),decodeFamilySource(familyPack),catalog as WizardCatalog)
      const view=await store.read(input.actor,input.baseId,input.versionId)
      const sha=createHash('sha256').update(JSON.stringify(view)).digest('hex')
      if(sha!==input.expectedViewSha256||view.revision!==1||view.status!=='CURRENT'||!view.latest||view.appliedToParams||view.quoteReady)throw new Error('Family readback differs')
      console.log(JSON.stringify({independentProcessReadback:true,familyProposalReadback:true,readOnlyTransaction:true,revision:1,
        fullViewSha256:sha,deadline:input.familyWindow.deadline}));return
    }
    const planning = createVersionPlanning(work=>db.$transaction(async tx=>{
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      return work(tx)
    },WIZARD_TRANSACTION_OPTIONS),catalog as WizardCatalog)
    const view = await planning.read(input.actor,input.baseId,input.versionId)
    const sha = createHash('sha256').update(JSON.stringify(view)).digest('hex')
    if (sha !== input.expectedViewSha256 || view.revision !== 1 || !view.latest || view.appliedToParams) throw new Error('Readback differs')
    console.log(JSON.stringify({independentProcessReadback:true,readOnlyTransaction:true,revision:1,
      productiveCostUsd:view.latest.calculation.case.outputs.productiveCostUsd,fullViewSha256:sha,deadline:input.recoveryValidation===true?B3_RECOVERY_DEADLINE:input.traceValidation===true?B3_TRACE_DEADLINE:input.optimizedValidation===true?B3_OPTIMIZED_DEADLINE:B3_DEADLINE}))
  } finally { await db.$disconnect() }
}
main().catch(()=>{console.error('B3 cold readback stopped; inspect state, no automatic retry.');process.exitCode=2})
