import { createHash } from 'node:crypto'
import { z } from 'zod'
import { reviewTireCohortRecord } from './tire-cohort.js'
import {
  aggregateTireCohorts,
  TireCohortStatisticsPolicySchema,
} from './tire-cohort-statistics.js'

const text = z.string().trim().min(1)
const validDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
})

export const TireCalibrationEstimatorSchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('MEDIAN') }).strict(),
  z.object({ method: z.literal('MEAN_ALL') }).strict(),
  z.object({ method: z.literal('TRIMMED_MEAN'), trimEachTailFraction: z.number().finite().min(0.05).max(0.25) }).strict(),
  z.object({ method: z.literal('PERCENTILE'), percentile: z.number().finite().min(0.05).max(0.95) }).strict(),
])

export const TireCalibrationProposalRequestSchema = z.object({
  proposalId: text,
  version: z.number().int().positive(),
  supersedesProposalId: text.nullable(),
  createdOn: validDate,
  status: z.literal('DRAFT'),
  cohortKey: text,
  policy: z.object({
    id: text,
    version: z.number().int().positive(),
    rationale: text,
    lifeEstimator: TireCalibrationEstimatorSchema,
    installedCostEstimator: TireCalibrationEstimatorSchema,
    observedRateEstimator: TireCalibrationEstimatorSchema,
    maximumMethodDivergenceRatio: z.number().finite().min(0).max(1),
  }).strict(),
  impactScenario: z.object({
    quantityOnVehicle: z.number().int().positive(),
    baselineTireStageCvuMxnPerKm: z.number().finite().min(0),
    baselineEvidenceId: text,
    tripDistanceKm: z.number().finite().positive(),
    currency: z.literal('MXN'),
  }).strict(),
}).strict().superRefine((request, context) => {
  if (request.version === 1 && request.supersedesProposalId !== null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['supersedesProposalId'], message: 'Version 1 cannot supersede another proposal' })
  }
  if (request.version > 1 && request.supersedesProposalId === null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['supersedesProposalId'], message: 'Later versions must identify the proposal they supersede' })
  }
})

const hash = z.string().regex(/^[a-f0-9]{64}$/)
const TireCalibrationSelectionSchema = z.object({
  estimator: TireCalibrationEstimatorSchema,
  value: z.number().finite().positive(),
  includedRecordIds: z.array(text).min(1),
  excludedRecordIds: z.array(text),
}).strict().superRefine((selection, context) => {
  const included = new Set(selection.includedRecordIds)
  if (included.size !== selection.includedRecordIds.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['includedRecordIds'], message: 'Included record ids must be unique' })
  if (new Set(selection.excludedRecordIds).size !== selection.excludedRecordIds.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['excludedRecordIds'], message: 'Excluded record ids must be unique' })
  if (selection.excludedRecordIds.some(id => included.has(id))) context.addIssue({ code: z.ZodIssueCode.custom, path: ['excludedRecordIds'], message: 'A record cannot be both included and excluded' })
})

const TireCalibrationProposalBodySchema = z.object({
  request: TireCalibrationProposalRequestSchema,
  statisticsPolicy: TireCohortStatisticsPolicySchema,
  sourceAggregationFingerprint: hash,
  sourceRecordIds: z.array(text).min(1),
  sourceCohort: z.object({
    key: text,
    operationalSegment: text,
    position: text,
    product: z.object({ manufacturer: text, model: text, size: text, loadRange: text, serviceDescription: text }).strict(),
    stage: text,
    sampleSize: z.number().int().positive(),
  }).strict(),
  selections: z.object({
    lifeKm: TireCalibrationSelectionSchema,
    installedCostMxn: TireCalibrationSelectionSchema,
    observedCostMxnPerKm: TireCalibrationSelectionSchema,
  }).strict(),
  semanticTargets: z.object({ lifeKm: text, installedCostMxn: text }).strict(),
  impact: z.object({
    quantityOnVehicle: z.number().int().positive(),
    parameterizedStageCvuMxnPerKm: z.number().finite().nonnegative(),
    directObservedStageCvuMxnPerKm: z.number().finite().nonnegative(),
    methodDivergenceMxnPerKm: z.number().finite(),
    methodDivergenceRatio: z.number().finite().nonnegative().nullable(),
    baselineTireStageCvuMxnPerKm: z.number().finite().nonnegative(),
    baselineEvidenceId: text,
    deltaVsBaselineMxnPerKm: z.number().finite(),
    tripDistanceKm: z.number().finite().positive(),
    impactAtTripDistanceMxn: z.number().finite(),
    currency: z.literal('MXN'),
  }).strict(),
  proposalEligibleForEconomicReview: z.boolean(),
  readinessReasons: z.array(text),
  legacyMappingStatus: z.literal('BLOCKED_V3_CROSSED_MAPPING'),
  proposalStatus: z.literal('DRAFT'),
  approvalStatus: z.literal('NOT_REQUESTED'),
  parameterWriteAllowed: z.literal(false),
  quoteEligible: z.literal(false),
  publicationRequiresExplicitApproval: z.literal(true),
}).strict()

export const TireCalibrationProposalSchema = TireCalibrationProposalBodySchema.extend({ fingerprint: hash }).strict()
export type TireCalibrationProposal = z.infer<typeof TireCalibrationProposalSchema>

type Estimator = z.infer<typeof TireCalibrationEstimatorSchema>

function quantile(sorted: number[], probability: number) {
  const index = (sorted.length - 1) * probability
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  return lower === upper
    ? sorted[lower]
    : sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

function selectEstimate(observations: { id: string; value: number }[], estimator: Estimator) {
  if (!observations.length) throw new Error('Estimator requires observations')
  const ordered = [...observations].sort((left, right) => left.value - right.value || left.id.localeCompare(right.id))
  const values = ordered.map(item => item.value)
  if (estimator.method === 'MEDIAN') return {
    estimator, value: quantile(values, 0.5), includedRecordIds: ordered.map(item => item.id), excludedRecordIds: [] as string[],
  }
  if (estimator.method === 'MEAN_ALL') return {
    estimator, value: values.reduce((sum, item) => sum + item, 0) / values.length,
    includedRecordIds: ordered.map(item => item.id), excludedRecordIds: [] as string[],
  }
  if (estimator.method === 'PERCENTILE') return {
    estimator, value: quantile(values, estimator.percentile),
    includedRecordIds: ordered.map(item => item.id), excludedRecordIds: [] as string[],
  }
  const trimCount = Math.floor(values.length * estimator.trimEachTailFraction)
  const retained = ordered.slice(trimCount, ordered.length - trimCount)
  if (trimCount < 1 || retained.length < 2) throw new Error('Trimmed mean policy cannot be applied to this sample')
  return {
    estimator,
    value: retained.reduce((sum, item) => sum + item.value, 0) / retained.length,
    includedRecordIds: retained.map(item => item.id),
    excludedRecordIds: [...ordered.slice(0, trimCount), ...ordered.slice(ordered.length - trimCount)].map(item => item.id),
  }
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value !== null && typeof value === 'object') return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`
  // PostgreSQL JSONB can normalize the final insignificant decimal digit of a
  // JavaScript calculation. Hash a persistence-stable 15-significant-digit
  // representation while retaining the original numeric value in the snapshot.
  if (typeof value === 'number') return JSON.stringify(Number(value.toPrecision(15)))
  return JSON.stringify(value)
}

/** Builds a versioned research proposal. It never writes assumptions or changes quote behavior. */
export function buildTireCalibrationProposal(
  recordInputs: unknown[],
  statisticsPolicyInput: unknown,
  requestInput: unknown,
) {
  const request = TireCalibrationProposalRequestSchema.parse(requestInput)
  const statisticsPolicy = TireCohortStatisticsPolicySchema.parse(statisticsPolicyInput)
  const aggregation = aggregateTireCohorts(recordInputs, statisticsPolicy)
  const cohort = aggregation.cohorts.find(item => item.key === request.cohortKey)
  if (!cohort) throw new Error(`Unknown comparable cohort: ${request.cohortKey}`)

  const recordIds = new Set(cohort.recordIds)
  const rows = recordInputs.map(reviewTireCohortRecord).filter(row => recordIds.has(row.record.id))
  const life = selectEstimate(rows.map(row => ({ id: row.record.id, value: row.observedKm! })), request.policy.lifeEstimator)
  const installedCost = selectEstimate(rows.map(row => ({ id: row.record.id, value: row.installedCostMxn! })), request.policy.installedCostEstimator)
  const observedRate = selectEstimate(rows.map(row => ({ id: row.record.id, value: row.observedCostMxnPerKm! })), request.policy.observedRateEstimator)

  const quantity = request.impactScenario.quantityOnVehicle
  const parameterizedStageCvuMxnPerKm = quantity * installedCost.value / life.value
  const directObservedStageCvuMxnPerKm = quantity * observedRate.value
  const methodDivergenceMxnPerKm = parameterizedStageCvuMxnPerKm - directObservedStageCvuMxnPerKm
  const methodDivergenceRatio = directObservedStageCvuMxnPerKm === 0
    ? null
    : Math.abs(methodDivergenceMxnPerKm) / directObservedStageCvuMxnPerKm
  const deltaVsBaselineMxnPerKm = parameterizedStageCvuMxnPerKm
    - request.impactScenario.baselineTireStageCvuMxnPerKm
  const impactAtTripDistanceMxn = deltaVsBaselineMxnPerKm * request.impactScenario.tripDistanceKm
  const readinessReasons = [...cohort.readinessReasons]
  if (methodDivergenceRatio == null || methodDivergenceRatio > request.policy.maximumMethodDivergenceRatio) {
    readinessReasons.push('METHOD_DIVERGENCE_ABOVE_POLICY')
  }
  const sample = rows[0].record
  const stage = rows[0].stageLabel
  const semanticStem = `${sample.position.group}__${stage}`

  const result = {
    request,
    statisticsPolicy,
    sourceAggregationFingerprint: aggregation.fingerprint,
    sourceRecordIds: cohort.recordIds,
    sourceCohort: {
      key: cohort.key,
      operationalSegment: cohort.operationalSegment,
      position: cohort.position,
      product: cohort.product,
      stage,
      sampleSize: cohort.lifeKm.count,
    },
    selections: { lifeKm: life, installedCostMxn: installedCost, observedCostMxnPerKm: observedRate },
    semanticTargets: {
      lifeKm: `TIRE_LIFE_KM__${semanticStem}`,
      installedCostMxn: `TIRE_INSTALLED_COST_MXN__${semanticStem}`,
    },
    impact: {
      quantityOnVehicle: quantity,
      parameterizedStageCvuMxnPerKm,
      directObservedStageCvuMxnPerKm,
      methodDivergenceMxnPerKm,
      methodDivergenceRatio,
      baselineTireStageCvuMxnPerKm: request.impactScenario.baselineTireStageCvuMxnPerKm,
      baselineEvidenceId: request.impactScenario.baselineEvidenceId,
      deltaVsBaselineMxnPerKm,
      tripDistanceKm: request.impactScenario.tripDistanceKm,
      impactAtTripDistanceMxn,
      currency: 'MXN' as const,
    },
    proposalEligibleForEconomicReview: readinessReasons.length === 0,
    readinessReasons,
    legacyMappingStatus: 'BLOCKED_V3_CROSSED_MAPPING' as const,
    proposalStatus: 'DRAFT' as const,
    approvalStatus: 'NOT_REQUESTED' as const,
    parameterWriteAllowed: false as const,
    quoteEligible: false as const,
    publicationRequiresExplicitApproval: true as const,
  }
  return TireCalibrationProposalSchema.parse({
    ...result,
    fingerprint: createHash('sha256').update(stable(result)).digest('hex'),
  })
}

/** Parses the complete snapshot and proves its content still matches its immutable fingerprint. */
export function verifyTireCalibrationProposal(input: unknown) {
  const proposal = TireCalibrationProposalSchema.parse(input)
  const { fingerprint, ...body } = proposal
  if (createHash('sha256').update(stable(body)).digest('hex') !== fingerprint) {
    throw new Error('PROPOSAL_FINGERPRINT_MISMATCH')
  }
  return proposal
}
