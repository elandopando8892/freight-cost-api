import { createHash } from 'node:crypto'
import { z } from 'zod'
import { TirePhysicalPositionSchema } from './tire-lifecycle-economics.js'

const text = z.string().trim().min(1)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
})
const amount = z.number().finite().min(0)
const positiveAmount = z.number().finite().positive()

const EvidenceSchema = z.object({
  id: text,
  kind: z.enum(['FLEET_DOCUMENT', 'INVOICE', 'ODOMETER_CAPTURE', 'INSPECTION', 'PUBLIC_REFERENCE']),
  locator: text,
  note: text,
}).strict()

const EvidenceRefsSchema = z.array(text).min(1)

const StageSchema = z.object({
  kind: z.enum(['NEW', 'RETREAD']),
  sequence: z.number().int().positive().nullable(),
}).strict().superRefine((stage, context) => {
  if ((stage.kind === 'NEW') !== (stage.sequence === null)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'New stage has no sequence; retread stage requires one' })
  }
})

const InstalledCostSchema = z.object({
  currency: z.literal('MXN'),
  purchaseMxn: positiveAmount.nullable(),
  taxMxn: amount.nullable(),
  freightMxn: amount.nullable(),
  mountingMxn: amount.nullable(),
  balancingMxn: amount.nullable(),
  disposalMxn: amount.nullable(),
  evidenceIds: EvidenceRefsSchema,
}).strict()

export const TireCohortRecordSchema = z.object({
  schemaVersion: z.literal(1),
  researchOnly: z.literal(true),
  id: text,
  revision: z.number().int().positive(),
  operationalSegment: z.enum([
    'D2D_MX_US_HANDOFF',
    'D2D_BINATIONAL_SAME_COMPANY',
    'D2D_TRANSSHIPMENT',
    'MX_DRAYAGE',
    'INTRA_MEX',
    'MX_LOCAL',
  ]),
  asset: z.object({
    id: text,
    type: z.enum(['TRACTOR', 'TRAILER']),
    configuration: text,
  }).strict(),
  position: z.object({
    group: TirePhysicalPositionSchema,
    slot: text,
  }).strict(),
  tire: z.object({
    casingId: text,
    stage: StageSchema,
    manufacturer: text.nullable(),
    model: text.nullable(),
    size: text.nullable(),
    loadRange: text.nullable(),
    serviceDescription: text.nullable(),
  }).strict(),
  distanceMeter: z.object({
    basis: z.enum(['ASSET_ODOMETER', 'TELEMATICS_DISTANCE', 'CONTROLLED_ROUTE_LEDGER']),
    sourceId: text,
  }).strict(),
  installation: z.object({
    date,
    readingKm: z.number().finite().min(0),
    treadDepthMm: z.number().finite().positive().nullable(),
    installedCost: InstalledCostSchema,
    evidenceIds: EvidenceRefsSchema,
  }).strict(),
  removal: z.object({
    date,
    readingKm: z.number().finite().positive(),
    treadDepthMm: z.number().finite().min(0).nullable(),
    reason: z.enum(['WORN_OUT', 'DAMAGE', 'IRREGULAR_WEAR', 'PREVENTIVE_ROTATION', 'OTHER']),
    casingInspection: z.object({
      outcome: z.enum(['ACCEPTED', 'REJECTED', 'PENDING']),
      reason: text.nullable(),
      evidenceIds: EvidenceRefsSchema,
    }).strict(),
    evidenceIds: EvidenceRefsSchema,
  }).strict().nullable(),
  evidence: z.array(EvidenceSchema).min(1),
}).strict().superRefine((record, context) => {
  const issue = (path: (string | number)[], message: string) => context.addIssue({
    code: z.ZodIssueCode.custom,
    path,
    message,
  })
  const evidenceIds = new Set(record.evidence.map(item => item.id))
  if (evidenceIds.size !== record.evidence.length) issue(['evidence'], 'Duplicate evidence id')
  const checkRefs = (path: (string | number)[], refs: string[]) => {
    if (new Set(refs).size !== refs.length || refs.some(id => !evidenceIds.has(id))) {
      issue(path, 'Invalid evidence reference')
    }
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

export type TireCohortRecord = z.infer<typeof TireCohortRecordSchema>

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
  return JSON.stringify(value)
}

export function reviewTireCohortRecord(input: unknown) {
  const record = TireCohortRecordSchema.parse(input)
  const blockers: string[] = []
  const identity = [record.tire.manufacturer, record.tire.model, record.tire.size,
    record.tire.loadRange, record.tire.serviceDescription]
  if (identity.some(value => value == null)) blockers.push('PRODUCT_IDENTITY_INCOMPLETE')

  const costParts = record.installation.installedCost
  const costValues = [costParts.purchaseMxn, costParts.taxMxn, costParts.freightMxn,
    costParts.mountingMxn, costParts.balancingMxn, costParts.disposalMxn]
  if (costValues.some(value => value == null)) blockers.push('INSTALLED_COST_INCOMPLETE')
  if (!record.removal) blockers.push('CYCLE_OPEN')
  if (record.removal?.casingInspection.outcome === 'PENDING') blockers.push('CASING_INSPECTION_PENDING')

  const observedKm = record.removal
    ? record.removal.readingKm - record.installation.readingKm
    : null
  const installedCostMxn = costValues.every(value => value != null)
    ? costValues.reduce<number>((total, value) => total + value!, 0)
    : null
  const observedCostMxnPerKm = observedKm != null && installedCostMxn != null
    ? installedCostMxn / observedKm
    : null
  if (observedCostMxnPerKm != null && (!Number.isFinite(observedCostMxnPerKm) || observedCostMxnPerKm < 0)) {
    throw new Error('Invalid tire cohort arithmetic')
  }

  return {
    record,
    fingerprint: createHash('sha256').update(canonical(record)).digest('hex'),
    stageLabel: record.tire.stage.kind === 'NEW' ? 'NEW' : `RETREAD_${record.tire.stage.sequence}`,
    observedKm,
    installedCostMxn,
    observedCostMxnPerKm,
    casingOutcome: record.removal?.casingInspection.outcome ?? null,
    readiness: blockers.length ? 'INCOMPLETE' as const : 'READY_FOR_ECONOMIC_REVIEW' as const,
    blockers,
    quoteEligible: false as const,
    releaseApproved: false as const,
    databaseWriteAllowed: false as const,
  }
}
