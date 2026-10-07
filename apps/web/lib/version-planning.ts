import { PlanningViewSchema, type PlanningView } from '../../api/src/modules/cost-bases/version-planning-contract'
import { parseOwnRelayReview } from './own-relay-review'
export type { PlanningView, PlanningCommand } from '../../api/src/modules/cost-bases/version-planning-contract'
export const versionPlanningPath=(baseId:string,versionId:string)=>`/cost-bases/${encodeURIComponent(baseId)}/versions/${encodeURIComponent(versionId)}/planning`
export const versionPlanningHref=versionPlanningPath
export function parsePlanningView(raw:unknown,initial:PlanningView) {
  const view=PlanningViewSchema.parse(raw)
  if (Object.entries(initial.context).some(([k,v])=>view.context[k as keyof typeof view.context]!==v)
    ||view.bindingSha256!==initial.bindingSha256||view.scope.orgId!==initial.scope.orgId||view.scope.sub!==initial.scope.sub)
    throw new Error('PLANNING_RESPONSE_CONTEXT_CHANGED')
  if (view.latest && (view.latest.revision!==view.revision
    ||Object.entries(view.context).some(([k,v])=>view.latest!.context[k as keyof typeof view.context]!==v)))
    throw new Error('PLANNING_RESPONSE_HISTORY_INVALID')
  if(view.latest)parseOwnRelayReview(view.latest.calculation,view.latest.selection,view.context.orgId)
  return view
}
