import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {z} from 'zod'
import type {Prisma} from '@prisma/client'
import {createOwnRelayFamilyBridge,type OwnRelayFamilyBase} from './own-relay-family-base.js'
import {createVersionPlanning} from './version-planning.js'
import {PlanningViewSchema} from './version-planning-contract.js'
import {lockOrganizationLifecycle,lockAssumptionVersion} from '../assumptions/assumption-version-lock.js'
import type {WizardCatalog} from './cost-base-wizard-draft.js'
const sha=z.string().regex(/^[a-f0-9]{64}$/)
export const FAMILY_BASE_RECORD_KIND='FCM_FAMILY_BASE_PROPOSAL_V1' as const
export const FamilyBaseSaveSchema=z.object({context:PlanningViewSchema.shape.context,
  expectedRevision:z.number().int().min(0).max(128),expectedVersionFingerprint:sha,
  expectedPlanningRequestId:z.string().uuid(),expectedPlanningRevision:z.number().int().positive(),
  expectedSnapshot:sha,requestId:z.string().uuid()}).strict()
const RecordSchema=z.object({kind:z.literal(FAMILY_BASE_RECORD_KIND),versionId:z.string().min(1),
  revision:z.number().int().min(1).max(128),requestId:z.string().uuid(),commandSha256:sha,
  savedAt:z.string().datetime(),savedBy:z.string().min(1),proposalJson:z.string().min(1).max(1_000_000),proposalSha256:sha}).strict()
type Actor={orgId:string;sub:string;role:'ADMIN'|'OPERATOR'|'VIEWER'}
type Transaction=<T>(work:(tx:Prisma.TransactionClient)=>Promise<T>)=>Promise<T>
const hash=(v:string)=>createHash('sha256').update(v).digest('hex')
function canonical(v:unknown):string{
  if(Array.isArray(v))return `[${v.map(canonical).join(',')}]`
  if(v&&typeof v==='object')return `{${Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`
  return JSON.stringify(v)
}
function fail(code:string):never{throw new Error(code)}
function allowed(a:Actor):asserts a is Actor&{role:'ADMIN'|'OPERATOR'}{
  if(!a.orgId||!a.sub||!['ADMIN','OPERATOR'].includes(a.role))fail('Forbidden')
}

/** Existing audit table, no migration. The economic JSON is a string inside
 * JSONB: native numeric literals survive provider serialization byte-for-byte.
 * Upstream middleware must authenticate Actor; this factory does not issue roles.
 */
export function createFamilyBaseStore(transaction:Transaction,source:Parameters<typeof createOwnRelayFamilyBridge>[0],catalog:WizardCatalog){
  async function load(tx:Prisma.TransactionClient,actor:Actor&{role:'ADMIN'|'OPERATOR'},baseId:string,versionId:string){
    const planning=await createVersionPlanning(work=>work(tx),catalog).read(actor,baseId,versionId)
    // Authentication may carry provider claims (e.g. supabaseId). Only the
    // domain identity belongs in the strict calculation binding.
    const binding={orgId:actor.orgId,sub:actor.sub,role:actor.role,baseId,versionId,versionFingerprint:planning.versionFingerprint}
    const bridge=createOwnRelayFamilyBridge(source,async()=>planning)
    const rows=await tx.costBaseAuditEvent.findMany({where:{orgId:actor.orgId,costBaseId:baseId,action:'METADATA_UPDATED',
      AND:[{payload:{path:['kind'],equals:FAMILY_BASE_RECORD_KIND}},{payload:{path:['versionId'],equals:versionId}}]},
      select:{payload:true,actorId:true},take:129})
    if(rows.length>128)fail('FAMILY_PROPOSAL_HISTORY_LIMIT')
    const records=rows.map(row=>{
      const r=RecordSchema.parse(row.payload)
      if(r.versionId!==versionId||r.savedBy!==row.actorId||hash(r.proposalJson)!==r.proposalSha256)
        fail('FAMILY_PROPOSAL_HISTORY_INVALID')
      let decoded:unknown
      try{decoded=JSON.parse(r.proposalJson)}catch{fail('FAMILY_PROPOSAL_JSON_INVALID')}
      // The tenant/version owns the proposal; each immutable body is still
      // verified against its audited author, never rebound to the caller.
      const proposal=bridge.validate(decoded,{...binding,sub:r.savedBy})
      const originalCommand={context:proposal.context,expectedRevision:r.revision-1,expectedVersionFingerprint:proposal.versionFingerprint,
        expectedPlanningRequestId:proposal.receipt.requestId,expectedPlanningRevision:proposal.receipt.revision,
        expectedSnapshot:proposal.sourceSnapshotSha256,requestId:r.requestId}
      if(hash(canonical({command:originalCommand,actorId:r.savedBy}))!==r.commandSha256)fail('FAMILY_PROPOSAL_COMMAND_CHANGED')
      return {...r,proposal}
    }).sort((a,b)=>a.revision-b.revision)
    if(records.some((r,i)=>r.revision!==i+1)||new Set(records.map(r=>r.requestId)).size!==records.length)fail('FAMILY_PROPOSAL_HISTORY_INVALID')
    const latest=records.at(-1)?.proposal??null
    const current=latest&&latest.versionFingerprint===planning.versionFingerprint&&latest.bindingSha256===planning.bindingSha256
      &&latest.receipt.requestId===planning.latest?.requestId&&latest.receipt.revision===planning.revision
    const view={context:planning.context,scope:planning.scope,revision:records.length,latest,
      status:!latest?'NONE' as const:current?'CURRENT' as const:'STALE' as const,appliedToParams:false as const,quoteReady:false as const}
    return {view,records,planning,bridge,binding}
  }
  return {async read(actor:Actor,baseId:string,versionId:string){
    allowed(actor);return transaction(async tx=>(await load(tx,actor,baseId,versionId)).view)
  },async save(actor:Actor,baseId:string,versionId:string,raw:unknown){
    allowed(actor);const command=FamilyBaseSaveSchema.parse(raw)
    if(!isDeepStrictEqual(command.context,{orgId:actor.orgId,baseId,versionId}))fail('FAMILY_PROPOSAL_CONTEXT_MISMATCH')
    const commandSha256=hash(canonical({command,actorId:actor.sub}))
    return transaction(async tx=>{
      await lockOrganizationLifecycle(tx,actor.orgId);await lockAssumptionVersion(tx,actor.orgId,versionId)
      const {view,records,planning,bridge,binding}=await load(tx,actor,baseId,versionId)
      const prior=records.find(r=>r.requestId===command.requestId)
      if(prior){if(prior.commandSha256!==commandSha256)fail('FAMILY_PROPOSAL_REQUEST_ID_REUSED');return {...view,replayed:true}}
      if(view.revision>=128)fail('FAMILY_PROPOSAL_HISTORY_LIMIT')
      if(view.revision!==command.expectedRevision)fail('FAMILY_PROPOSAL_REVISION_CONFLICT')
      if(planning.versionFingerprint!==command.expectedVersionFingerprint)fail('FAMILY_PROPOSAL_VERSION_CHANGED')
      if(!planning.latest||planning.latest.requestId!==command.expectedPlanningRequestId||planning.revision!==command.expectedPlanningRevision
        ||planning.latest.calculation.sha256!==command.expectedSnapshot)fail('FAMILY_PROPOSAL_PLANNING_CHANGED')
      const proposal=await bridge.prepare(binding)
      // A different authorized author does not turn the same B3 receipt into
      // a new economic revision. Replay ownership is checked above separately.
      if(view.status==='CURRENT'||view.latest?.fingerprint===proposal.fingerprint)fail('FAMILY_PROPOSAL_UNCHANGED')
      const proposalJson=JSON.stringify(proposal)
      const record=RecordSchema.parse({kind:FAMILY_BASE_RECORD_KIND,versionId,revision:view.revision+1,requestId:command.requestId,commandSha256,
        savedAt:new Date().toISOString(),savedBy:actor.sub,proposalJson,proposalSha256:hash(proposalJson)})
      await tx.costBaseAuditEvent.create({data:{orgId:actor.orgId,costBaseId:baseId,actorId:actor.sub,action:'METADATA_UPDATED',
        note:`Family-base proposal revision ${record.revision}; no parameter adoption.`,payload:record as unknown as Prisma.InputJsonValue}})
      return {...view,revision:record.revision,latest:proposal as OwnRelayFamilyBase,status:'CURRENT' as const,replayed:false}
    })
  }}
}
