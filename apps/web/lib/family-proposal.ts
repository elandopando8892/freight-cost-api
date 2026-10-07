import {FamilyProposalViewSchema,type FamilyProposalView} from '../../api/src/modules/cost-bases/family-base-contract'
import type {PlanningView} from './version-planning'
export type {FamilyProposalView}
export type FamilyProposalCommand={context:PlanningView['context'];expectedRevision:number;expectedVersionFingerprint:string;
  expectedPlanningRequestId:string;expectedPlanningRevision:number;expectedSnapshot:string;requestId:string}
export const familyProposalPath=(base:string,version:string)=>`/cost-bases/${encodeURIComponent(base)}/versions/${encodeURIComponent(version)}/family-proposal`
export function parseFamilyProposalView(raw:unknown,planning:PlanningView):FamilyProposalView{
  const result=FamilyProposalViewSchema.safeParse(raw)
  if(!result.success)throw new Error('FAMILY_RESPONSE_INVALID')
  const v=result.data,p=v.latest,b=planning.latest
  if(Object.entries(planning.context).some(([k,value])=>v.context[k as keyof typeof v.context]!==value)
    ||v.scope.orgId!==planning.scope.orgId||v.scope.sub!==planning.scope.sub
    ||(v.status==='NONE')!==(p===null)||(!p&&v.revision!==0)||(p&&v.revision===0))throw new Error('FAMILY_RESPONSE_CONTEXT_CHANGED')
  if(p&&(!b||p.sourceSnapshotSha256!==b.calculation.sha256||p.sourceScenarioSha256!==b.calculation.sourceScenarioSha256))
    throw new Error('FAMILY_RESPONSE_SOURCE_CHANGED')
  if(p&&v.status==='CURRENT'&&(!b||p.receipt.requestId!==b.requestId||p.receipt.revision!==planning.revision
    ||p.receipt.commandSha256!==b.commandSha256||p.versionFingerprint!==planning.versionFingerprint
    ||p.bindingSha256!==planning.bindingSha256||Object.entries(b.selection).some(([k,value])=>p.selection[k as keyof typeof p.selection]!==value)))
    throw new Error('FAMILY_RESPONSE_RECEIPT_CHANGED')
  return v
}
