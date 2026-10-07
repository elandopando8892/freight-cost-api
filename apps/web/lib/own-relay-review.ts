import { RelayResponse, type RelayContext } from '../../api/src/modules/engine/b2-own-relay-contract'
export { relayCycles, relayFunding, relayDates, relayRest } from '../../api/src/modules/engine/b2-own-relay-contract'
export type { RelayContext, RelayReview } from '../../api/src/modules/engine/b2-own-relay-contract'

export function ownRelayPath(context: RelayContext, sha256?: string) {
  const query = new URLSearchParams(context)
  if (sha256) query.set('expectedSnapshot', sha256)
  return `/api/v1/engine/benchmark-owned-d2d/own-relay-review?${query}`
}
export function parseOwnRelayReview(raw: unknown, context: RelayContext, expectedOrgId: string) {
  const data = RelayResponse.parse(raw)
  if (data.scope.orgId !== expectedOrgId || Object.entries(context).some(([k, v]) => data.case[k as keyof RelayContext] !== v))
    throw new Error('RELAY_RESPONSE_CONTEXT_MISMATCH')
  const ids = new Set(data.evidence.map(e => e.id))
  if ([...data.case.fixedEvidenceIds, ...data.case.variableCosts.flatMap(v => v.evidenceIds)].some(id => !ids.has(id)))
    throw new Error('RELAY_RESPONSE_EVIDENCE_MISSING')
  return data
}
