import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {z} from 'zod'
import relaySnapshot from '../engine/b2-own-relay.snapshot.json'
import {RelaySnapshot} from '../engine/b2-own-relay-contract.js'
import {readOwnRelayReview} from '../engine/b2-own-relay-review.js'
import {BinationalCostProjectionSchema,calculateBinationalBudgetCostProjection} from '../engine/benchmark-binational-cost-projection.js'
import {PlanningSelection,PlanningViewSchema,type PlanningView} from './version-planning-contract.js'
import {planningCalculationMatches} from './planning-calculation-recovery.js'

const sha=z.string().regex(/^[a-f0-9]{64}$/),id=z.string().min(1)
const BindingSchema=z.object({orgId:id,sub:id,role:z.enum(['ADMIN','OPERATOR']),baseId:id,versionId:id,versionFingerprint:sha}).strict()
export type FamilyBaseBinding=z.infer<typeof BindingSchema>
export const OWN_RELAY_FAMILY_METHOD='FCM_OWN_RELAY_FAMILY_BASE_V1' as const
export const OwnRelayFamilyBaseSchema=z.object({
  method:z.literal(OWN_RELAY_FAMILY_METHOD),status:z.literal('LOCAL_DRAFT_PROPOSAL'),
  borderProcess:z.literal('OWN_RELAY_SAME_TRAILER'),referencePeriod:z.literal('2026-09'),
  context:PlanningViewSchema.shape.context,scope:PlanningViewSchema.shape.scope,
  versionFingerprint:sha,bindingSha256:sha,sourceSnapshotSha256:sha,sourceScenarioSha256:sha,
  receipt:z.object({revision:z.number().int().positive(),requestId:z.string().uuid(),commandSha256:sha}).strict(),
  selection:PlanningSelection,familyInput:BinationalCostProjectionSchema,
  fixedLedger:z.array(z.unknown()).length(32),
  policyReference:z.object({file:id,sha256:sha,scope:z.literal('PUBLIC_PLANNING_VALIDATION_ONLY_NOT_OPERATIONAL_CALIBRATION_OR_ADOPTION')}).strict(),
  fingerprint:sha,calibrated:z.literal(false),quoteReady:z.literal(false),adoptedValues:z.literal(0),
  appliedToCanonicalParams:z.literal(false),published:z.literal(false),
}).strict()
export type OwnRelayFamilyBase=z.infer<typeof OwnRelayFamilyBaseSchema>
// Structural producer contract keeps the offline research scripts out of the
// API build graph; their complete case objects remain intact for hashing.
type Source={scenarioPayloadSha256:string;sourcePins:z.infer<typeof RelaySnapshot>['payload']['sourcePins'];cases:Array<{
  cycleId:string;fundingMode:string;fx:{date:string};restInterpretation:string;
  lineage:z.infer<typeof BinationalCostProjectionSchema>;fixedLedger:unknown[];
  planningOutputs:ReturnType<typeof calculateBinationalBudgetCostProjection>['outputs'];
}>}
type ReadPlanning=(binding:FamilyBaseBinding)=>Promise<PlanningView>
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
function fail(code:string):never{throw new Error(code)}

/** Local seam: upstream supplies the existing authenticated, validated planning
 * reader, not a request body pretending to be a session. No authentication,
 * database initialization, source refresh, writes or activation occur here.
 * Source cases must match the packaged B2 scenario; all economics use its kernel.
 */
export function createOwnRelayFamilyBridge(source:Source,readPlanning:ReadPlanning){
  const pinned=RelaySnapshot.parse(relaySnapshot)
  if(hash(pinned.payload)!==pinned.sha256||source.scenarioPayloadSha256!==pinned.payload.sourceScenarioSha256
    ||hash(source.cases)!==source.scenarioPayloadSha256||!isDeepStrictEqual(source.sourcePins,pinned.payload.sourcePins))
    fail('FAMILY_BASE_SOURCE_DRIFT')
  // Own a copy: callers cannot mutate source cases after construction.
  const trusted=structuredClone(source)
  const policyPin=pinned.payload.sourcePins.find(p=>p.id==='b2AuthorizedPlanningPolicy')!
  if(!policyPin)fail('FAMILY_BASE_POLICY_PIN_REQUIRED')
  function validate(raw:unknown,rawBinding:FamilyBaseBinding){
    const b=BindingSchema.parse(rawBinding),p=OwnRelayFamilyBaseSchema.parse(raw)
    if(!isDeepStrictEqual(p.context,{orgId:b.orgId,baseId:b.baseId,versionId:b.versionId})
      ||p.scope.orgId!==b.orgId||p.scope.sub!==b.sub)fail('FAMILY_BASE_CONTEXT_MISMATCH')
    const cases=trusted.cases.filter(c=>c.cycleId===p.selection.cycleId&&c.fundingMode===p.selection.fundingMode
      &&c.fx.date===p.selection.fxDate&&c.restInterpretation===p.selection.restInterpretation)
    const {fingerprint,...body}=p
    if(cases.length!==1||hash(body)!==fingerprint||p.sourceSnapshotSha256!==pinned.sha256
      ||p.sourceScenarioSha256!==trusted.scenarioPayloadSha256
      ||!isDeepStrictEqual(p.familyInput,BinationalCostProjectionSchema.parse(cases[0].lineage))
      ||!isDeepStrictEqual(p.fixedLedger,cases[0].fixedLedger)
      ||p.policyReference.file!==policyPin.file||p.policyReference.sha256!==policyPin.sha256)
      fail('FAMILY_BASE_STORED_CONTENT_CHANGED')
    return structuredClone(p)
  }
  async function prepare(rawBinding:FamilyBaseBinding):Promise<OwnRelayFamilyBase>{
    const b=BindingSchema.parse(rawBinding),view=PlanningViewSchema.parse(await readPlanning(b))
    const expectedContext={orgId:b.orgId,baseId:b.baseId,versionId:b.versionId}
    if(!isDeepStrictEqual(view.context,expectedContext)||view.scope.orgId!==b.orgId||view.scope.sub!==b.sub)
      fail('FAMILY_BASE_CONTEXT_MISMATCH')
    const p=view.latest
    if(!view.editable||!p||view.revision!==p.revision)fail('FAMILY_BASE_DRAFT_RECEIPT_REQUIRED')
    if(p.savedBy!==p.calculation.scope.sub||p.calculation.scope.orgId!==b.orgId
      ||p.versionId!==b.versionId||!isDeepStrictEqual(p.context,expectedContext)
      ||p.bindingSha256!==view.bindingSha256)fail('FAMILY_BASE_RECEIPT_MISMATCH')
    if(view.versionFingerprint!==b.versionFingerprint||p.versionFingerprint!==b.versionFingerprint)
      fail('FAMILY_BASE_VERSION_CHANGED')
    // B3's authenticated reader validates the audit author. A same-tenant
    // caller may use that receipt, but cannot relabel its calculation identity.
    const verified=readOwnRelayReview({...p.selection,expectedSnapshot:p.calculation.sha256},{orgId:b.orgId,sub:p.savedBy})
    if(!planningCalculationMatches(p.calculation,verified))fail('FAMILY_BASE_PLANNING_RESULT_CHANGED')
    const cases=trusted.cases.filter(c=>c.cycleId===p.selection.cycleId&&c.fundingMode===p.selection.fundingMode
      &&c.fx.date===p.selection.fxDate&&c.restInterpretation===p.selection.restInterpretation)
    if(cases.length!==1)fail('FAMILY_BASE_SELECTION_NOT_SUPPORTED')
    const c=cases[0],familyInput=BinationalCostProjectionSchema.parse(c.lineage)
    if(familyInput.budget.referencePeriod!=='2026-09'||familyInput.evidenceScope!=='DOCUMENTED_PUBLIC_PLANNING')
      fail('FAMILY_BASE_PERIOD_OR_SCOPE_CHANGED')
    const result=calculateBinationalBudgetCostProjection(familyInput)
    if(result.issues.length||!isDeepStrictEqual(result.outputs,c.planningOutputs)
      ||result.outputs.productiveCostUsd!==verified.case.outputs.productiveCostUsd)fail('FAMILY_BASE_RECONCILIATION_FAILED')
    const body={method:OWN_RELAY_FAMILY_METHOD,status:'LOCAL_DRAFT_PROPOSAL' as const,
      borderProcess:'OWN_RELAY_SAME_TRAILER' as const,referencePeriod:'2026-09' as const,
      context:expectedContext,scope:{orgId:b.orgId,sub:b.sub},versionFingerprint:b.versionFingerprint,
      bindingSha256:view.bindingSha256,sourceSnapshotSha256:pinned.sha256,sourceScenarioSha256:trusted.scenarioPayloadSha256,
      receipt:{revision:p.revision,requestId:p.requestId,commandSha256:p.commandSha256},selection:p.selection,
      familyInput,fixedLedger:c.fixedLedger,policyReference:{file:policyPin.file,sha256:policyPin.sha256,
        scope:'PUBLIC_PLANNING_VALIDATION_ONLY_NOT_OPERATIONAL_CALIBRATION_OR_ADOPTION' as const},
      calibrated:false as const,quoteReady:false as const,adoptedValues:0 as const,
      appliedToCanonicalParams:false as const,published:false as const}
    return OwnRelayFamilyBaseSchema.parse({...structuredClone(body),fingerprint:hash(body)})
  }
  return {prepare,validate,async calculate(raw:unknown,binding:FamilyBaseBinding){
    const proposal=validate(raw,binding),current=await prepare(binding)
    if(!isDeepStrictEqual(proposal,current))fail('FAMILY_BASE_PROPOSAL_CHANGED')
    // No cloned rate engine: one existing kernel and its evidence/pool/MAX guards.
    return calculateBinationalBudgetCostProjection(current.familyInput)
  }}
}
