import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { B2EvidencePayload, B2EvidenceSnapshot } from '../src/modules/engine/b2-evidence-contract.js'
import { prepareB2Closeout } from './prepare-b2-closeout.js'
import { consolidateBinationalReferenceBudget } from './consolidate-binational-reference-budget.js'
import { readLocalDocumentBytes } from './assemble-economic-reference-cards.js'

const root = fileURLToPath(new URL('../../../', import.meta.url))
export const hashB2 = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
/** Code-only policy: tolerate Git CRLF checkout; retain BOM, whitespace and all other bytes. */
export const hashProducerSource = (text: string) => createHash('sha256').update(text.replace(/\r\n/g, '\n'), 'utf8').digest('hex')
/** Evidence is immutable byte content, deliberately NOT normalized. */
export const hashEvidenceBytes = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const hashFile = (file: string) => hashProducerSource(readFileSync(resolve(root, file), 'utf8'))
/** Local-only projection of the existing compositor. No HTTP, DB, writes or new arithmetic. */
export function projectB2Evidence() {
  const research = consolidateBinationalReferenceBudget(undefined, undefined, 'POSTAL_REFERENCE', 'PUBLIC_LINK_FORECAST', 'IMT_C3_NON_ARTICULATED_PROXY')
  const financeId = research.supportingPilotFinancedCfu.monthlyScenarios.find(s => s.cashBaseId === 'ALL_CAPITAL_CASH_NET_PLUS_VAT_PUBLIC_ADMIN_SCALE')?.id
  if (!financeId) throw new Error('B2_COMPARISON_PRESET_MISSING')
  const options = { monthlyBudget: { cashTaxScenario: 'NET_PLUS_VAT', financeMonthlyScenarioId: null as string | null,
    boxInsuranceAlternativeId: 'PUBLIC_GUIDE_LOW', mxYardAlternativeId: 'NET_PLUS_VAT_RESERVE' },
    restInterpretation: 'RATE_EXCLUDES_WEEKLY_REST', defFraction: .04,
    borderLinkBasis: 'PUBLIC_LINK_FORECAST', bobtailWearBasis: 'IMT_C3_NON_ARTICULATED_PROXY',
    usMaintenanceBasis: 'ATRI2024_ALL_RM_PLANNING', usDriverBasis: 'BLS2025_ECEC2026_MIE_PLANNING',
    mxFoodEmployerBasis: 'REMUNERATIVE_FOOD_NL_EXEMPT_PLANNING' }
  const runs = [null, financeId].map(id => prepareB2Closeout({ options: { ...options, monthlyBudget: { ...options.monthlyBudget, financeMonthlyScenarioId: id } }, operatingProfileId: 'B2_USER_SCOPE_20261003' }))
  const profile = runs[0].operatingProfile!
  for (const pin of runs[0].sourcePins) {
    if (hashEvidenceBytes(readLocalDocumentBytes(pin.file)) !== pin.sha256) throw new Error(`B2_SOURCE_DRIFT:${pin.id}`)
  }
  const commonSource = { observedOn: profile.benchmark.observedOn, historicalSeptemberPriceVerified: false,
    taxBasisVerified: false, selectedForCostEngine: false }
  const rows = [
    { id: 'MX_TRAVEL_EXPENSES', country: 'MX', title: 'Pernocta MX · hotel de paso + pensión', canonicalKey: null, valueUsdPerCycle: null,
      included: 'El concepto existente conserva comida del operador MX. El patio reservado de base no sustituye pernocta en viaje.',
      missing: ['Noches por ciclo y mezcla de hotel/pensión no seleccionadas.', 'Precio histórico de septiembre, impuestos y estacionamiento incluido no acreditados.'],
      sources: [
        { ...commonSource, id: 'B2_MX_PENSION', title: 'Pensión de trailers 40-5 · Cuautitlán Izcalli', url: profile.benchmark.pension.sourceUrl,
          kind: 'LODGING_COMPARATOR', comparisonValue: profile.benchmark.pension.publishedMxnPer24Hours, currency: 'MXN', unit: '24 horas · tractor y una caja',
          limitation: 'Comparador publicado de estacionamiento. No incluye habitación ni demuestra precio de septiembre; no es tarifa del recorrido.' },
        { ...commonSource, id: 'B2_MX_HOTEL', title: 'Hotel San Pedro Express · Federal 57 km 108', url: profile.benchmark.hotel.sourceUrl,
          kind: 'LODGING_COMPARATOR', comparisonValue: null, currency: 'MXN', unit: 'noche · precio pendiente',
          limitation: 'Existencia de hotel de paso, sin precio público ni acreditación del estacionamiento incluido o vigencia de septiembre.' },
      ], effect: 'Remanente dentro de MX_TRAVEL_EXPENSES → CVU. No se suma dos veces ni se interpreta null como cero.' },
    { id: 'US_DRIVER_TOTAL', country: 'US', title: 'Pernocta US · hotel de paso + pensión', canonicalKey: null, valueUsdPerCycle: null,
      included: 'El agregado existente conserva salario, prestaciones de referencia y comida. La hipótesis histórica de sleeper no satisface la pernocta mixta confirmada.',
      missing: ['Precio y evidencia de alojamiento US pendientes.', 'Noches por ciclo, mezcla hotel/pensión y vigencia de septiembre pendientes.'],
      sources: [{ ...commonSource, id: 'B2_US_MIE_CONTEXT', title: 'IRS Notice 2025-54 · contexto de comida, no alojamiento', url: profile.benchmark.usMie.sourceUrl,
        kind: 'MEAL_CONTEXT_NOT_LODGING', comparisonValue: null, currency: 'USD', unit: 'M&IE · no precio de hotel',
        limitation: 'M&IE no acredita alojamiento ni una obligación de pago. No existe tarifa de hotel/pensión US en este expediente.' }],
      effect: 'Remanente dentro de US_DRIVER_TOTAL → CVU. No se crea un segundo cargo ni se usa comida como tarifa de hotel.' },
  ]
  const payload = B2EvidencePayload.parse({ model: 'FCM_B2_READ_EVIDENCE_V1', profileId: profile.decisionId,
    referencePeriod: profile.reference.period, sourceObservedOn: profile.benchmark.observedOn,
    capture: 'PINNED_LOCAL_PUBLIC_RESEARCH_NOT_LIVE_SOURCE_ARCHIVE', caseReference: profile.caseReference,
    presetPolicy: 'EXISTING_COMPARISON_PRESETS_NOT_USER_FINANCE_SELECTION', calibrated: false, quoteReady: false,
    producerHashPolicy: 'UTF8_CRLF_TO_LF_NO_OTHER_NORMALIZATION',
    adoptedValues: 0, arithmeticComplete: false, notesPersisted: false, canonicalParameterCount: 210,
    producerPins: ['apps/api/scripts/prepare-b2-closeout.ts', 'apps/api/scripts/project-b2-evidence.ts', 'apps/api/src/modules/engine/engine.outputs.ts'].map(file => ({ file, sha256: hashFile(file) })),
    sourcePins: runs[0].sourcePins,
    cases: runs.flatMap(r => r.cases.map(c => ({ cycleId: c.cycleId, fundingMode: c.fundingMode,
      historicalReferencePeriod: c.historicalReferenceComparison?.referencePeriod, acceptedForUserReferencePeriod: false,
      issues: c.profileApplication!.referenceCompatibility.issues,
      fixedRemainders: c.requiredInputs.fixed.map(v => v.economicExpenseId), variableRemainders: c.requiredInputs.variable.map(v => v.conceptId),
      outputs: { cfuUsd: c.outputs.cfuUsd, cvuUsd: c.outputs.cvuUsd, productiveCostUsd: c.outputs.productiveCostUsd, purchaseUsd: c.outputs.purchaseUsd, sellUsd: c.outputs.sellUsd }, rows }))),
  })
  return B2EvidenceSnapshot.parse({ sha256: hashB2(payload), payload })
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--check')) throw new Error('Usage: project-b2-evidence.ts [--check]')
    const result = projectB2Evidence()
    if (process.argv[2] === '--check') {
      const packaged = B2EvidenceSnapshot.parse(JSON.parse(readFileSync(resolve(root, 'apps/api/src/modules/engine/b2-evidence.snapshot.json'), 'utf8')))
      if (JSON.stringify(result) !== JSON.stringify(packaged)) throw new Error('B2_PACKAGED_SNAPSHOT_STALE')
      console.log(JSON.stringify({ verified: true, contexts: result.payload.cases.length, sourcePins: result.payload.sourcePins.length, sha256: result.sha256, quoteReady: false }))
    } else console.log(JSON.stringify(result, null, 2))
  } catch (e) { console.error(e instanceof Error ? e.message : 'B2_PROJECTION_FAILED'); process.exitCode = 1 }
}
