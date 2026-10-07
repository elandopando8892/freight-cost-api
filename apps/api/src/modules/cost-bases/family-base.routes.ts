import type {FastifyInstance} from 'fastify'
import {requireRole} from '../../middleware/authorize.js'
import {FamilyBaseSaveSchema,type createFamilyBaseStore} from './family-base-store.js'
import {FamilyProposalViewSchema} from './family-base-contract.js'

type Service=ReturnType<typeof createFamilyBaseStore>
/** Projection only, store has already validated economics and persisted hashes. */
function present(view:Awaited<ReturnType<Service['read']>>&{replayed?:boolean}){
  const p=view.latest
  return FamilyProposalViewSchema.parse({...view,latest:p?{
    fingerprint:p.fingerprint,versionFingerprint:p.versionFingerprint,bindingSha256:p.bindingSha256,
    sourceSnapshotSha256:p.sourceSnapshotSha256,sourceScenarioSha256:p.sourceScenarioSha256,
    receipt:p.receipt,selection:p.selection,referencePeriod:p.referencePeriod,fixedEntryCount:32,
    policyReference:p.policyReference,calibrated:p.calibrated,published:p.published,adoptedValues:p.adoptedValues}:null})
}
async function respond(work:()=>Promise<Parameters<typeof present>[0]>){
  try{return present(await work())}catch(error){
    if(error instanceof Error&&/^(FAMILY_PROPOSAL_|FAMILY_BASE_)/.test(error.message))
      throw Object.assign(new Error(error.message),{statusCode:409})
    throw error
  }
}
/** Must be registered inside existing authenticated cost-base scope. */
export function registerFamilyBaseRoutes(app:FastifyInstance,service:Service){
  const path='/cost-bases/:id/versions/:versionId/family-proposal'
  const options={preHandler:requireRole('ADMIN','OPERATOR'),onSend:async(_req:unknown,reply:{header:(k:string,v:string)=>unknown})=>{reply.header('Cache-Control','no-store')}}
  app.get(path,options,async req=>{
    const {id,versionId}=req.params as {id:string;versionId:string}
    return respond(()=>service.read(req.user!,id,versionId))
  })
  app.put(path,{...options,bodyLimit:16_000},async req=>{
    const {id,versionId}=req.params as {id:string;versionId:string}
    const command=FamilyBaseSaveSchema.parse(req.body)
    if(command.context.orgId!==req.user!.orgId||command.context.baseId!==id||command.context.versionId!==versionId)
      throw Object.assign(new Error('FAMILY_PROPOSAL_CONTEXT_MISMATCH'),{statusCode:403})
    return respond(()=>service.save(req.user!,id,versionId,command))
  })
}
