import { createHash } from 'node:crypto'
import packaged from './b2-evidence.snapshot.json'
import { B2EvidenceQuery, B2EvidenceSnapshot } from './b2-evidence-contract.js'

const snapshot = B2EvidenceSnapshot.parse(packaged)
if (createHash('sha256').update(JSON.stringify(snapshot.payload)).digest('hex') !== snapshot.sha256)
  throw new Error('B2_PACKAGED_INTEGRITY_FAILED')

/** Derived public research only. Never resolves a remainder, adopts a value or writes a note. */
export function readB2Evidence(rawQuery: unknown, identity: { sub: string; orgId: string }) {
  const query = B2EvidenceQuery.parse(rawQuery)
  if (query.expectedSnapshot && query.expectedSnapshot !== snapshot.sha256)
    throw Object.assign(new Error('B2_SNAPSHOT_CHANGED_RELOAD_REQUIRED'), { statusCode: 409 })
  const selected = snapshot.payload.cases.find(c => c.cycleId === query.cycleId && c.fundingMode === query.fundingMode)
  if (!selected) throw new Error('B2_CONTEXT_MISSING')
  const p = snapshot.payload
  return structuredClone({ model: p.model, profileId: p.profileId, referencePeriod: p.referencePeriod,
    sha256: snapshot.sha256, sourceObservedOn: p.sourceObservedOn, capture: p.capture,
    presetPolicy: p.presetPolicy, calibrated: p.calibrated, quoteReady: p.quoteReady,
    adoptedValues: p.adoptedValues, notesPersisted: p.notesPersisted,
    canonicalParameterCount: p.canonicalParameterCount, sourcePinCount: p.sourcePins.length,
    scope: { sub: identity.sub, orgId: identity.orgId }, case: selected })
}
