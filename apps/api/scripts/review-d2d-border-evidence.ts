import { createHash } from 'node:crypto'
import { z } from 'zod'

// Case-specific research attachment. Never supplies amounts to the compositor.
const text = z.string().trim().min(1).max(1500)
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(value)
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value
})
const pin = z.object({ file: z.string().regex(/^docs\/research\/(?:sources\/)?[A-Za-z0-9_-]+\.(json|html|pdf)$/),
  sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict()
const source = z.object({ id: text, url: z.string().url().startsWith('https://'), locator: text,
  archive: pin.nullable() }).strict()
export const D2DBorderEvidenceSchema = z.object({
  artifact: z.literal('FCM_B2_BINATIONAL_BORDER_RESEARCH'), cutDate: day,
  mode: z.literal('RESEARCH_ONLY_NO_BORDER_ADOPTION'), casePin: pin,
  previousEvidencePin: pin.optional(),
  confirmations: z.object({ bridge: z.literal('NUEVO_LAREDO_III_WORLD_TRADE_BRIDGE'),
    bridgeChosenByUser: z.literal(true), axles: z.literal(5), equipment: z.literal('DRY_VAN_53'),
    operatingScenario: z.literal('SAME_BINATIONAL_COMPANY'), scenarioBasis: z.literal('USER_ASSUMPTION_NOT_IDENTIFIED_CARRIER'),
    carrier: z.null(), serviceDate: z.null(), tractorChangeRequired: z.null(), returnLeg: z.null(),
    referenceVariant: z.object({ id:z.literal('OWN_MX_US_RELAY_SAME_TRAILER'),
      selectionBasis:z.literal('USER_SELECTED_REFERENCE_NOT_OPERATING_EVIDENCE'),
      sameTrailer:z.literal(true), distinctMxUsTractors:z.literal(true) }).strict().optional() }).strict(),
  sources: z.array(source).min(1),
  mexicanBridgeObservation: z.object({ sourceId: text, amountMxn: z.number().finite().nonnegative(),
    class: z.literal('C5'), effectiveFrom: z.null(), taxes: z.literal('UNVERIFIED'),
    directionVerified: z.literal(false), adopted: z.literal(false) }).strict(),
  excludedUsBridgeObservation: z.object({ sourceId: text, direction: z.literal('US_TO_MX'),
    publishedUsdPerAxle: z.number().finite().nonnegative(), nextAdjustmentFrom: day,
    nextIncreaseUsdPerAxle: z.number().finite().nonnegative(), adopted: z.literal(false) }).strict(),
  scopeComparator: z.object({ sourceId: text, conclusion: text,
    comparableFtlAmountUsd: z.null(), adopted: z.literal(false) }).strict(),
  handoff: z.object({ bridgeMxn: z.null(), bridgeUsd: z.null(), crossingUsd: z.null(), interchangeUsd: z.null(),
    borderCharges: z.null() }).strict(),
  adoptionEligible: z.literal(false), quoteReady: z.literal(false),
}).strict()

export function reviewD2DBorderEvidence(raw: unknown, context: unknown, readSource: (file: string) => Buffer) {
  const input = D2DBorderEvidenceSchema.parse(raw)
  const verifyPin = (value: z.infer<typeof pin>) => {
    const bytes = readSource(value.file)
    if (createHash('sha256').update(bytes).digest('hex') !== value.sha256) throw new Error('BORDER_PIN_HASH_MISMATCH')
    return bytes
  }
  const boundCase = JSON.parse(verifyPin(input.casePin).toString('utf8'))
  if (Boolean(input.confirmations.referenceVariant) !== Boolean(input.previousEvidencePin)) {
    throw new Error('BORDER_VARIANT_PRIOR_EVIDENCE_REQUIRED')
  }
  if (input.previousEvidencePin) {
    const previous = D2DBorderEvidenceSchema.parse(JSON.parse(verifyPin(input.previousEvidencePin).toString('utf8')))
    const {previousEvidencePin:_previous,...current} = input
    const {referenceVariant:_variant,...confirmations} = current.confirmations
    if (previous.previousEvidencePin || previous.confirmations.referenceVariant ||
      JSON.stringify({...current,confirmations}) !== JSON.stringify(previous)) {
      throw new Error('BORDER_VARIANT_CHANGED_RESEARCH_EVIDENCE')
    }
  }
  if (JSON.stringify(boundCase) !== JSON.stringify(context) || boundCase.direction !== 'MX_TO_US' ||
    input.cutDate < boundCase.cutDate || input.excludedUsBridgeObservation.nextAdjustmentFrom <= input.cutDate) {
    throw new Error('BORDER_CASE_OR_DATE_MISMATCH')
  }
  const ids = new Set(input.sources.map(row => row.id))
  const used = [input.mexicanBridgeObservation.sourceId, input.excludedUsBridgeObservation.sourceId, input.scopeComparator.sourceId]
  const archived = input.sources.filter(row => row.archive !== null)
  if (ids.size !== input.sources.length || used.some(id => !ids.has(id)) ||
    input.sources.some(row => !used.includes(row.id)) || new Set(archived.map(row => row.archive!.file)).size !== archived.length) {
    throw new Error('BORDER_SOURCE_BINDING_INVALID')
  }
  for (const row of archived) verifyPin(row.archive!)
  return { ...input, status: 'INCOMPLETE' as const, sourcePinsVerified: archived.length + 1 + (input.previousEvidencePin ? 1 : 0),
    unarchivedSources: input.sources.filter(row => !row.archive).map(row => row.id),
    requirements: [
      { id: 'BRIDGE_TOLL', target: 'TRIP_TOLLS_OR_CROSSING_BUNDLE_EXACTLY_ONCE',
        missing: 'Dated northbound C5 tariff, tax/payment basis, FX for service date and documented bundle inclusion.' },
      { id: 'CROSSING', target: 'BORDER_SERVICES_INCREMENTAL_ONLY',
        missing: 'Binational crossing process, tractor/driver permissions, additional distance/time and costs not already in national legs.' },
      { id: 'INTERCHANGE', target: 'INTERNAL_HANDOFF_OR_DOCUMENTED_EXTERNAL_SERVICE',
        missing: 'Whether tractor/custody changes; incremental yard/inspection cost or evidenced inclusion. No implicit zero or independent-line fee.' },
      { id: 'CYCLE', target: 'CFU_CVU_AND_SHARED_TRAILER_ONCE',
        missing: 'Loaded/empty exposure, border dwell and physical tractor/trailer allocation; one trailer cycle and no duplicate capital, payroll, fuel or fixed time between national legs and service bundles.' },
    ],
    compatibility: 'INTERCHANGE_RESEARCH_PROFILE_NOT_AUTOMATICALLY_BINATIONAL',
    cycleCalculationSupport: {
      researchOnlyArgument: 'FCM_SERIAL_TRAILER_ATTACHMENT_V1',
      requiresDistinctNationalTractors: true, physicalStrategySelected: Boolean(input.confirmations.referenceVariant),
      cycleEvidenceProvided: false, monetaryOutputAvailable: false,
      endpointOrFormEnabled: false,
    },
    monetaryTotalsCalculated: false, tripInputsChanged: false, adoptedValues: 0,
    networkAccessed: false, databaseAccessed: false, productionReady: false }
}
