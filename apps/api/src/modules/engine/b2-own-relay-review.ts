import { createHash } from 'node:crypto'
import packaged from './b2-own-relay.snapshot.json'
import { RelayQuery, RelayResponse, RelaySnapshot } from './b2-own-relay-contract.js'

const snapshot = RelaySnapshot.parse(packaged)
if (createHash('sha256').update(JSON.stringify(snapshot.payload)).digest('hex') !== snapshot.sha256)
  throw new Error('RELAY_PACKAGED_INTEGRITY_FAILED')

/** Public planning reference, not selected-base economics. No runtime research or writes. */
export function readOwnRelayReview(raw: unknown, identity: { sub: string; orgId: string }) {
  const query = RelayQuery.parse(raw)
  if (!identity.sub || !identity.orgId) throw Object.assign(new Error('RELAY_IDENTITY_REQUIRED'), { statusCode: 403 })
  if (query.expectedSnapshot && query.expectedSnapshot !== snapshot.sha256)
    throw Object.assign(new Error('RELAY_SNAPSHOT_CHANGED_RELOAD_REQUIRED'), { statusCode: 409 })
  const selected = snapshot.payload.cases.find(c => c.cycleId === query.cycleId && c.fundingMode === query.fundingMode &&
    c.fxDate === query.fxDate && c.restInterpretation === query.restInterpretation)
  if (!selected) throw new Error('RELAY_CONTEXT_MISSING')
  const ids = new Set([...selected.fixedEvidenceIds, ...selected.variableCosts.flatMap(v => v.evidenceIds)])
  const { cases: _cases, sourcePins, evidence, ...metadata } = snapshot.payload
  return RelayResponse.parse({ ...metadata, sha256: snapshot.sha256, sourcePinCount: sourcePins.length,
    scope: identity, case: selected, evidence: evidence.filter(e => ids.has(e.id)) })
}
