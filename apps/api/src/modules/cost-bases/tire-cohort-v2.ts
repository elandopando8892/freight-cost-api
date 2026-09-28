import { z } from 'zod'
import { OperationalSegmentSchema } from './operational-segments.js'
import { TireCohortRecordSchema } from './tire-cohort.js'

const v1 = TireCohortRecordSchema.innerType().shape
const evidenceRefs = z.array(z.string().trim().min(1)).min(1)
const amount = z.number().finite().min(0)
const positiveAmount = z.number().finite().positive()

const NativeInstalledCostSchema = z.object({
  currency: z.enum(['MXN', 'USD']),
  costBasis: z.literal('DELIVERED_INSTALLED_WITH_DISPOSAL'),
  purchaseAmount: positiveAmount.nullable(),
  taxAmount: amount.nullable(),
  freightAmount: amount.nullable(),
  mountingAmount: amount.nullable(),
  balancingAmount: amount.nullable(),
  disposalAmount: amount.nullable(),
  evidenceIds: evidenceRefs,
}).strict()

const fixedLegCountry: Partial<Record<z.infer<typeof OperationalSegmentSchema>, 'MX' | 'US'>> = {
  D2D_MX_US_PARTNER: 'MX',
  D2D_US_MX_PARTNER: 'US',
  MX_DRAYAGE: 'MX',
  INTRA_MEX: 'MX',
  MX_LOCAL: 'MX',
  INTRA_US: 'US',
  US_DRAYAGE: 'US',
}

/** Additive research contract. V1 snapshots and the live capture route remain unchanged. */
export const TireCohortRecordV2Schema = z.object({
  schemaVersion: z.literal(2),
  researchOnly: z.literal(true),
  id: v1.id,
  revision: v1.revision,
  operationalSegment: OperationalSegmentSchema,
  leg: z.object({
    country: z.enum(['MX', 'US']),
    costBearer: z.literal('BASE_OPERATOR'),
    costKind: z.literal('DIRECT_TIRE_COST'),
    evidenceIds: evidenceRefs,
  }).strict(),
  asset: v1.asset.extend({ type: z.enum(['TRACTOR', 'TRAILER', 'CHASSIS', 'STRAIGHT_TRUCK']) }).strict(),
  position: v1.position,
  tire: v1.tire.extend({
    fitmentStatus: z.enum(['UNVERIFIED', 'VERIFIED_EXACT']),
    fitmentEvidenceIds: z.array(z.string().trim().min(1)),
  }).strict(),
  distanceMeter: v1.distanceMeter,
  installation: v1.installation.omit({ installedCost: true }).extend({ installedCost: NativeInstalledCostSchema }).strict(),
  removal: v1.removal,
  evidence: v1.evidence,
}).strict().superRefine((record, context) => {
  const issue = (path: (string | number)[], message: string) => context.addIssue({
    code: z.ZodIssueCode.custom, path, message,
  })
  const expectedCountry = fixedLegCountry[record.operationalSegment]
  if (expectedCountry && record.leg.country !== expectedCountry) {
    issue(['leg', 'country'], `This segment only permits its own ${expectedCountry} leg`)
  }
  const ids = new Set(record.evidence.map(item => item.id))
  if (ids.size !== record.evidence.length) issue(['evidence'], 'Duplicate evidence id')
  const checkRefs = (path: (string | number)[], refs: string[]) => {
    if (new Set(refs).size !== refs.length || refs.some(id => !ids.has(id))) {
      issue(path, 'Invalid evidence reference')
    }
  }
  checkRefs(['leg', 'evidenceIds'], record.leg.evidenceIds)
  checkRefs(['tire', 'fitmentEvidenceIds'], record.tire.fitmentEvidenceIds)
  if (record.tire.fitmentStatus === 'VERIFIED_EXACT' && !record.tire.fitmentEvidenceIds.length) {
    issue(['tire', 'fitmentEvidenceIds'], 'Verified fitment needs evidence')
  }
  checkRefs(['installation', 'evidenceIds'], record.installation.evidenceIds)
  checkRefs(['installation', 'installedCost', 'evidenceIds'], record.installation.installedCost.evidenceIds)
  if (record.removal) {
    checkRefs(['removal', 'evidenceIds'], record.removal.evidenceIds)
    checkRefs(['removal', 'casingInspection', 'evidenceIds'], record.removal.casingInspection.evidenceIds)
    if (record.removal.date < record.installation.date) issue(['removal', 'date'], 'Removal precedes installation')
    if (record.removal.readingKm <= record.installation.readingKm) issue(['removal', 'readingKm'], 'Removal reading must exceed installation reading')
    if (record.removal.casingInspection.outcome === 'REJECTED' && !record.removal.casingInspection.reason) {
      issue(['removal', 'casingInspection', 'reason'], 'Rejected casing needs a reason')
    }
  }
})

export type TireCohortRecordV2 = z.infer<typeof TireCohortRecordV2Schema>

/** Native-currency, single-stage observation only; no FX, persistence or proposal bridge. */
export function reviewTireCohortRecordV2(input: unknown) {
  const record = TireCohortRecordV2Schema.parse(input)
  const blockers: string[] = []
  const identity = [record.tire.manufacturer, record.tire.model, record.tire.size,
    record.tire.loadRange, record.tire.serviceDescription]
  if (identity.some(value => value == null)) blockers.push('PRODUCT_IDENTITY_INCOMPLETE')
  const kindsFor = (ids: string[]) => new Set(record.evidence.filter(item => ids.includes(item.id)).map(item => item.kind))
  if (record.tire.fitmentStatus !== 'VERIFIED_EXACT' ||
      !kindsFor(record.tire.fitmentEvidenceIds).has('FLEET_DOCUMENT')) {
    blockers.push('FITMENT_UNVERIFIED')
  }
  if (!kindsFor(record.leg.evidenceIds).has('FLEET_DOCUMENT')) blockers.push('COST_BEARER_EVIDENCE_MISSING')
  if (!kindsFor(record.installation.evidenceIds).has('ODOMETER_CAPTURE') ||
      (record.removal && !kindsFor(record.removal.evidenceIds).has('ODOMETER_CAPTURE'))) {
    blockers.push('DISTANCE_EVIDENCE_MISSING')
  }
  const costs = record.installation.installedCost
  const costEvidenceKinds = kindsFor(costs.evidenceIds)
  if (!costEvidenceKinds.has('INVOICE') && !costEvidenceKinds.has('FLEET_DOCUMENT')) {
    blockers.push('TARGET_COST_EVIDENCE_MISSING')
  }
  const parts = [costs.purchaseAmount, costs.taxAmount, costs.freightAmount,
    costs.mountingAmount, costs.balancingAmount, costs.disposalAmount]
  if (parts.some(value => value == null)) blockers.push('INSTALLED_COST_INCOMPLETE')
  if (!record.removal) blockers.push('CYCLE_OPEN')
  if (record.removal?.casingInspection.outcome === 'PENDING') blockers.push('CASING_INSPECTION_PENDING')

  const observedKm = record.removal ? record.removal.readingKm - record.installation.readingKm : null
  const installedCostNative = parts.every(value => value != null)
    ? parts.reduce<number>((total, value) => total + value!, 0) : null
  const observedCostNativePerKm = observedKm != null && installedCostNative != null
    ? installedCostNative / observedKm : null
  if ([installedCostNative, observedCostNativePerKm]
    .some(value => value != null && !Number.isFinite(value))) {
    throw new Error('Non-finite tire cohort v2 arithmetic')
  }
  const stage = record.tire.stage.kind === 'NEW' ? 'NEW' : `RETREAD_${record.tire.stage.sequence}`
  const comparisonKey = JSON.stringify([
    record.operationalSegment, record.leg.country, costs.currency,
    record.asset.type, record.asset.configuration, record.position.group,
    record.tire.manufacturer, record.tire.model, record.tire.size,
    record.tire.loadRange, record.tire.serviceDescription, stage,
  ])
  return {
    record,
    comparisonKey,
    stage,
    observedKm,
    installedCostNative,
    observedCostNativePerKm,
    currency: costs.currency,
    readiness: blockers.length ? 'INCOMPLETE' as const : 'READY_FOR_RESEARCH_COMPARISON' as const,
    blockers,
    fxConverted: false as const,
    proposalEligible: false as const,
    parameterWriteAllowed: false as const,
    quoteEligible: false as const,
    persistenceAllowed: false as const,
  }
}
