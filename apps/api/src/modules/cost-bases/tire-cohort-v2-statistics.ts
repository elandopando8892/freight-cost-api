import { createHash } from 'node:crypto'
import { z } from 'zod'
import { reviewTireCohortRecordV2, TireCohortRecordV2Schema } from './tire-cohort-v2.js'

export const TireCohortV2ResearchPolicySchema = z.object({
  minimumClosedCycles: z.number().int().min(2),
  outlierFenceMultiplier: z.number().finite().positive(),
  maximumOutlierShare: z.number().finite().min(0).max(1),
  maximumCoefficientOfVariation: z.number().finite().positive(),
  shapeMeanMedianGapRatio: z.number().finite().positive(),
}).strict()

type Reviewed = ReturnType<typeof reviewTireCohortRecordV2>
type Policy = z.infer<typeof TireCohortV2ResearchPolicySchema>

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
  return JSON.stringify(value)
}

const fingerprint = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex')

function quantile(sorted: number[], probability: number) {
  const position = (sorted.length - 1) * probability
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

function summarize(rows: Reviewed[], valueFor: (row: Reviewed) => number, policy: Policy) {
  const ordered = rows.map(row => ({ id: row.record.id, value: valueFor(row) }))
    .sort((left, right) => left.value - right.value || left.id.localeCompare(right.id))
  if (ordered.some(row => !Number.isFinite(row.value))) throw new Error('Non-finite tire cohort v2 observation')
  const values = ordered.map(row => row.value)
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  if (!Number.isFinite(mean)) throw new Error('Non-finite tire cohort v2 mean')
  const median = quantile(values, 0.5)
  const p25 = quantile(values, 0.25)
  const p75 = quantile(values, 0.75)
  const iqr = p75 - p25
  const deviation = values.length > 1
    ? Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1))
    : null
  const coefficientOfVariation = deviation == null || mean === 0 ? null : deviation / Math.abs(mean)
  const lowerFence = p25 - policy.outlierFenceMultiplier * iqr
  const upperFence = p75 + policy.outlierFenceMultiplier * iqr
  const outliers = ordered.filter(row => row.value < lowerFence || row.value > upperFence)
  const meanMedianGapRatio = median === 0 ? null : (mean - median) / Math.abs(median)
  if ([deviation, coefficientOfVariation, lowerFence, upperFence, meanMedianGapRatio]
    .some(value => value != null && !Number.isFinite(value))) {
    throw new Error('Non-finite tire cohort v2 statistic')
  }
  const shape = values.length < 4 || meanMedianGapRatio == null
    ? 'INSUFFICIENT_FOR_SHAPE'
    : meanMedianGapRatio > policy.shapeMeanMedianGapRatio
      ? 'RIGHT_SKEWED'
      : meanMedianGapRatio < -policy.shapeMeanMedianGapRatio
        ? 'LEFT_SKEWED'
        : 'ROUGHLY_SYMMETRIC'
  return {
    count: values.length, mean, median, minimum: values[0], maximum: values.at(-1)!,
    p25, p75, p90: quantile(values, 0.9), p95: quantile(values, 0.95),
    sampleStandardDeviation: deviation, coefficientOfVariation, meanMedianGapRatio, shape,
    lowerFence, upperFence, outliers, outlierShare: outliers.length / values.length,
  }
}

/** Native-currency research aggregation. Never bridges into v1 proposals, CVU or quotes. */
export function aggregateTireCohortsV2(inputs: unknown[], policyInput: unknown) {
  const policy = TireCohortV2ResearchPolicySchema.parse(policyInput)
  if (!inputs.length) throw new Error('Tire cohort v2 aggregation requires records')
  const reviewed = inputs.map(reviewTireCohortRecordV2)
  const ids = new Set<string>()
  const casingStages = new Set<string>()
  for (const row of reviewed) {
    if (ids.has(row.record.id)) throw new Error(`Duplicate tire cohort v2 record id: ${row.record.id}`)
    ids.add(row.record.id)
    const casingStage = JSON.stringify([row.record.tire.casingId, row.stage])
    if (casingStages.has(casingStage)) throw new Error(`Duplicate tire cohort v2 casing stage: ${casingStage}`)
    casingStages.add(casingStage)
  }

  const included = reviewed.filter(row => row.readiness === 'READY_FOR_RESEARCH_COMPARISON')
  const excluded = reviewed.filter(row => row.readiness !== 'READY_FOR_RESEARCH_COMPARISON')
    .map(row => ({ id: row.record.id, blockers: row.blockers })).sort((a, b) => a.id.localeCompare(b.id))
  const groups = new Map<string, Reviewed[]>()
  for (const row of included) groups.set(row.comparisonKey, [...(groups.get(row.comparisonKey) ?? []), row])
  const cohorts = [...groups.entries()].map(([key, rows]) => {
    const observedKm = summarize(rows, row => row.observedKm!, policy)
    const costNativePerKm = summarize(rows, row => row.observedCostNativePerKm!, policy)
    const reasons: string[] = []
    if (rows.length < policy.minimumClosedCycles) reasons.push('SAMPLE_BELOW_POLICY')
    if (observedKm.coefficientOfVariation != null && observedKm.coefficientOfVariation > policy.maximumCoefficientOfVariation) reasons.push('LIFE_VARIABILITY_ABOVE_POLICY')
    if (costNativePerKm.coefficientOfVariation != null && costNativePerKm.coefficientOfVariation > policy.maximumCoefficientOfVariation) reasons.push('COST_VARIABILITY_ABOVE_POLICY')
    if (observedKm.outlierShare > policy.maximumOutlierShare) reasons.push('LIFE_OUTLIER_SHARE_ABOVE_POLICY')
    if (costNativePerKm.outlierShare > policy.maximumOutlierShare) reasons.push('COST_OUTLIER_SHARE_ABOVE_POLICY')
    const sample = rows[0]
    return {
      key, operationalSegment: sample.record.operationalSegment, country: sample.record.leg.country,
      currency: sample.currency, assetType: sample.record.asset.type, position: sample.record.position.group,
      stage: sample.stage, recordIds: rows.map(row => row.record.id).sort(), observedKm, costNativePerKm,
      researchReviewable: reasons.length === 0, readinessReasons: reasons,
      parameterWriteAllowed: false as const, quoteEligible: false as const,
    }
  }).sort((a, b) => a.key.localeCompare(b.key))
  const result = {
    schemaVersion: 2 as const, policy, receivedRecordCount: reviewed.length,
    includedRecordCount: included.length, excludedRecordCount: excluded.length,
    excluded, cohorts, researchOnly: true as const, fxConverted: false as const,
    parameterWriteAllowed: false as const, quoteEligible: false as const,
  }
  return { ...result, fingerprint: fingerprint(result) }
}

/** Portable, integrity-checked envelope for a future isolated durable store; this module does not write it. */
export const TireCohortV2ResearchSnapshotSchema = z.object({
  schemaVersion: z.literal(2),
  researchOnly: z.literal(true),
  snapshotId: z.string().uuid(),
  orgId: z.string().trim().min(1),
  createdById: z.string().trim().min(1),
  requestId: z.string().uuid(),
  version: z.number().int().positive(),
  createdAt: z.string().datetime({ offset: true }),
  comparisonKey: z.string().trim().min(1),
  records: z.array(TireCohortRecordV2Schema).min(1),
  policy: TireCohortV2ResearchPolicySchema,
  aggregationFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  snapshotFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
}).strict()

export function createTireCohortV2ResearchSnapshot(input: Omit<z.input<typeof TireCohortV2ResearchSnapshotSchema>, 'schemaVersion' | 'researchOnly' | 'aggregationFingerprint' | 'snapshotFingerprint'>) {
  const draft = TireCohortV2ResearchSnapshotSchema.omit({ aggregationFingerprint: true, snapshotFingerprint: true }).parse({
    ...input, schemaVersion: 2, researchOnly: true,
  })
  if (draft.records.some(record => reviewTireCohortRecordV2(record).comparisonKey !== draft.comparisonKey)) {
    throw new Error('SOURCE_COMPARISON_KEY_MISMATCH')
  }
  const aggregation = aggregateTireCohortsV2(draft.records, draft.policy)
  const content = { ...draft, aggregationFingerprint: aggregation.fingerprint }
  return TireCohortV2ResearchSnapshotSchema.parse({ ...content, snapshotFingerprint: fingerprint(content) })
}

export function verifyTireCohortV2ResearchSnapshot(input: unknown, expectedOrgId: string) {
  const snapshot = TireCohortV2ResearchSnapshotSchema.parse(input)
  if (snapshot.orgId !== expectedOrgId) throw new Error('TENANT_RESOURCE_NOT_FOUND')
  const { snapshotFingerprint, ...content } = snapshot
  if (fingerprint(content) !== snapshotFingerprint) throw new Error('SOURCE_SNAPSHOT_INTEGRITY_FAILURE')
  if (snapshot.records.some(record => reviewTireCohortRecordV2(record).comparisonKey !== snapshot.comparisonKey)) {
    throw new Error('SOURCE_COMPARISON_KEY_MISMATCH')
  }
  const aggregation = aggregateTireCohortsV2(snapshot.records, snapshot.policy)
  if (aggregation.fingerprint !== snapshot.aggregationFingerprint) throw new Error('SOURCE_SNAPSHOT_INTEGRITY_FAILURE')
  return { snapshot, aggregation }
}
