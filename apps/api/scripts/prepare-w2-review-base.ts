// Child process only: administrative client never enters the authenticated runtime.
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { prepareW2Review } from './lib/w2-review-preparation.js'
import { assertW2GateOpen, W2_GATE_DEADLINE } from '../src/config/w2-local-gate.js'
import catalog from '../src/modules/cost-bases/cost-base-wizard.catalog.json'
import type { WizardCatalog } from '../src/modules/cost-bases/cost-base-wizard-draft.js'
import { w2SafeDiagnostic, type W2PreparationPhase } from './lib/w2-safe-diagnostic.js'
import { W2DiagnosticRollback, W2_DIAGNOSTIC_RECEIPT, w2RollbackAfterPreparation } from './lib/w2-diagnostic-rollback.js'
import { w2PreparationAuthority } from './lib/w2-preparation-mode.js'
import { w2WithConnectedPreparation } from './lib/w2-connected-preparation.js'

let phase: W2PreparationPhase = 'input'

async function main() {
  assertW2GateOpen()
  const { url, actorId, sourceHash, baseHash, password, expiresAt, diagnosticOnly } = JSON.parse(readFileSync(0, 'utf8'))
  if (typeof diagnosticOnly !== 'boolean') throw new Error('Explicit preparation mode required')
  if(process.env.FCM_W2_GATE_APPROVAL!==w2PreparationAuthority(diagnosticOnly,'4f5fc2de0c3d178dace917231e1092040dec21fd',W2_GATE_DEADLINE))
    throw new Error('Scoped human authority reference required')
  const target=new URL(url)
  if(target.hostname!=='ep-autumn-thunder-av6e9bsh.c-11.us-east-1.aws.neon.tech' || target.pathname!=='/neondb'
    || !['postgres:','postgresql:'].includes(target.protocol)) throw new Error('W2 preview target required')
  if(Date.parse(expiresAt)<=Date.now() || Date.parse(expiresAt)>Date.now()+24*60*60*1000) throw new Error('Role expiry outside scope')
  const db = new PrismaClient({ datasourceUrl: url, log: [] })
  try {
    const result=await w2WithConnectedPreparation(db,()=>db.$transaction(async tx => {
    await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10000ms'")
    await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '2000ms'")
    if(diagnosticOnly) return w2RollbackAfterPreparation(async () => {
      await prepareW2Review(tx,{actorId,sourceHash,baseHash,password,expiresAt,catalog:catalog as unknown as WizardCatalog}, next => { phase = next })
      phase = 'rollback'
    })
    const prepared=await prepareW2Review(tx,{actorId,sourceHash,baseHash,password,expiresAt,catalog:catalog as unknown as WizardCatalog}, next => { phase = next })
    phase='commit'
    return prepared
    }, { timeout: 30_000 }),assertW2GateOpen,next=>{phase=next})
    console.log(JSON.stringify(result))
  } catch (error) {
    if (!(error instanceof W2DiagnosticRollback)) throw error
    console.log(JSON.stringify(W2_DIAGNOSTIC_RECEIPT))
  } finally { await db.$disconnect() }
}
main().catch(error=>{ console.error(JSON.stringify(w2SafeDiagnostic(phase,error))); process.exitCode=2 })
