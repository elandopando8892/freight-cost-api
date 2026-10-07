import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { composeB2PlanningScenario } from './compose-b2-planning-scenario.js'
import { RelayPayload, RelaySnapshot } from '../src/modules/engine/b2-own-relay-contract.js'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex')
/** Read-only packaging; the existing compositor is the sole arithmetic producer. */
export function projectOwnRelayReview() {
  const original = composeB2PlanningScenario()
  for (const pin of original.sourcePins) {
    const bytes = readFileSync(resolve(root, pin.file))
    const input = 'hashPolicy' in pin && pin.hashPolicy === 'UTF8_CRLF_TO_LF_NO_OTHER_NORMALIZATION'
      ? bytes.toString('utf8').replace(/\r\n/g, '\n') : bytes
    if (createHash('sha256').update(input).digest('hex') !== pin.sha256)
      throw new Error(`RELAY_SOURCE_DRIFT:${pin.id}`)
  }
  const sources = new Map<string, { id: string; url: string; locator: string; limitations: string; observedAt: string }>()
  for (const c of original.cases) for (const e of c.lineage.budget.evidence) {
    const row = { id: e.id, url: e.url, locator: e.locator, limitations: e.limitations, observedAt: e.observedAt }
    const old = sources.get(e.id)
    if (old && JSON.stringify(old) !== JSON.stringify(row)) throw new Error(`RELAY_EVIDENCE_COLLISION:${e.id}`)
    sources.set(e.id, row)
  }
  const payload = RelayPayload.parse({ model: 'FCM_B2_OWN_RELAY_REVIEW_V1', referencePeriod: '2026-09',
    borderProcess: 'OWN_RELAY_SAME_TRAILER', sourceScenarioSha256: original.scenarioPayloadSha256,
    calibrated: false, quoteReady: false, adoptedValues: 0, actualCarrierCostObserved: false,
    notesPersisted: false, comparisonOnly: true, sourcePins: original.sourcePins,
    limitations: [
      'Escenario de planeación pública, no costo observado del carrier ni cotización. No modifica el perfil V3 de la base seleccionada.',
      'Las fechas FIX, el retorno y la interpretación del descanso son comparaciones explícitas, no fecha real de servicio o contrato.',
      'Reservas de seguro, prestaciones, hospedaje y peajes son hipótesis identificadas, no tarifas publicadas para este viaje.',
      'Territorio/custodia, nómina y fiscalidad, movimientos adicionales y precios históricos siguen sin acreditación operativa.',
      'CFU incluye una caja y la cuota fija patronal MX una vez; CVU conserva componentes y exclusiones documentadas. No prueba calibración de 210 inputs.',
      'Consulta sin guardado ni adopción: purchase/sell siguen null. El motor V3 y sus cotizaciones históricas no se reinterpretan.',
    ],
    evidence: [...sources.values()],
    cases: original.cases.map(c => ({ cycleId: c.cycleId, fundingMode: c.fundingMode,
      fxDate: c.fx.date, mxnPerUsd: c.fx.mxnPerUsd, restInterpretation: c.restInterpretation,
      sharedBoxAllocationCount: 1, resources: c.resources,
      outputs: { cfuUsd: c.planningOutputs.cfuUsd, cvuUsd: c.planningOutputs.cvuUsd,
        productiveCostUsd: c.planningOutputs.productiveCostUsd, purchaseUsd: null, sellUsd: null },
      reserves: c.fixedLedger.filter(v => v.disposition === 'EXPLICIT_PLANNING_REMAINDER').map(v => v.id),
      fixedEvidenceIds: [...new Set(c.fixedLedger.flatMap(v => v.evidenceIds))],
      variableCosts: c.lineage.variableCosts.map(v => ({ conceptId: v.conceptId, resourceId: v.resourceId,
        disposition: v.disposition, amountUsd: v.amountUsd, evidenceIds: v.evidenceIds,
        derivation: v.derivation, exclusionOrZeroRationale: v.exclusionOrZeroRationale })),
    })),
  })
  return RelaySnapshot.parse({ sha256: hash(payload), payload })
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--check')) throw new Error('Usage: project-b2-own-relay-review.ts [--check]')
  const next = projectOwnRelayReview()
  if (process.argv[2] === '--check') {
    const stored = JSON.parse(readFileSync(resolve(root, 'apps/api/src/modules/engine/b2-own-relay.snapshot.json'), 'utf8'))
    if (JSON.stringify(next) !== JSON.stringify(stored)) throw new Error('RELAY_SNAPSHOT_STALE')
    console.log(JSON.stringify({ verified: true, contexts: next.payload.cases.length, sourcePins: next.payload.sourcePins.length, sha256: next.sha256 }))
  } else console.log(JSON.stringify(next))
}
