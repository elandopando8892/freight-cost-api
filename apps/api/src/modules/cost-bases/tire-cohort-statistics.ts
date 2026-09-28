import { createHash } from 'node:crypto'
import { z } from 'zod'
import { reviewTireCohortRecord, type TireCohortRecord } from './tire-cohort.js'

export const TireCohortStatisticsPolicySchema = z.object({
  minimumClosedCycles: z.number().int().min(2),
  minimumInspectionsPerStage: z.number().int().min(2),
  outlierFenceMultiplier: z.number().finite().positive(),
  maximumOutlierShare: z.number().finite().min(0).max(1),
  maximumCoefficientOfVariation: z.number().finite().positive(),
  shapeMeanMedianGapRatio: z.number().finite().positive(),
  confidenceZ: z.number().finite().positive().max(4),
}).strict()

type Reviewed = ReturnType<typeof reviewTireCohortRecord>

function groupBy<T>(values: T[], keyFor: (value: T) => string) {
  const groups = new Map<string, T[]>()
  for (const value of values) {
    const key = keyFor(value)
    const group = groups.get(key)
    if (group) group.push(value)
    else groups.set(key, [value])
  }
  return groups
}

function quantile(sorted: number[], probability: number) {
  if (!sorted.length) throw new Error('Cannot calculate an empty quantile')
  const index = (sorted.length - 1) * probability
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  return lower === upper
    ? sorted[lower]
    : sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

function summarize(
  rows: Reviewed[],
  value: (row: Reviewed) => number,
  policy: z.infer<typeof TireCohortStatisticsPolicySchema>,
) {
  const ordered = rows.map(row => ({ id: row.record.id, value: value(row) }))
    .sort((left, right) => left.value - right.value)
  const values = ordered.map(row => row.value)
  const mean = values.reduce((total, item) => total + item, 0) / values.length
  const median = quantile(values, 0.5)
  const p25 = quantile(values, 0.25)
  const p75 = quantile(values, 0.75)
  const iqr = p75 - p25
  const sampleStandardDeviation = values.length > 1
    ? Math.sqrt(values.reduce((total, item) => total + (item - mean) ** 2, 0) / (values.length - 1))
    : null
  const coefficientOfVariation = sampleStandardDeviation == null || mean === 0
    ? null
    : sampleStandardDeviation / Math.abs(mean)
  const lowerFence = p25 - policy.outlierFenceMultiplier * iqr
  const upperFence = p75 + policy.outlierFenceMultiplier * iqr
  const outliers = ordered.filter(row => row.value < lowerFence || row.value > upperFence)
  const meanMedianGapRatio = median === 0 ? null : (mean - median) / Math.abs(median)
  const shape = values.length < 4 || meanMedianGapRatio == null
    ? 'INSUFFICIENT_FOR_SHAPE'
    : meanMedianGapRatio > policy.shapeMeanMedianGapRatio
      ? 'RIGHT_SKEWED'
      : meanMedianGapRatio < -policy.shapeMeanMedianGapRatio
        ? 'LEFT_SKEWED'
        : 'ROUGHLY_SYMMETRIC'
  return {
    count: values.length,
    mean,
    median,
    minimum: values[0],
    maximum: values.at(-1)!,
    p25,
    p75,
    p90: quantile(values, 0.9),
    p95: quantile(values, 0.95),
    iqr,
    sampleStandardDeviation,
    coefficientOfVariation,
    meanMedianGapRatio,
    shape,
    outlierMethod: `TUKEY_IQR_${policy.outlierFenceMultiplier}`,
    lowerFence,
    upperFence,
    outlierCount: outliers.length,
    outlierShare: outliers.length / values.length,
    outliers,
  }
}

function productFamily(record: TireCohortRecord) {
  return [record.operationalSegment, record.asset.type, record.asset.configuration,
    record.position.group, record.tire.manufacturer, record.tire.model, record.tire.size,
    record.tire.loadRange, record.tire.serviceDescription].join('|')
}

function stageRank(row: Reviewed) {
  return row.record.tire.stage.kind === 'NEW' ? 0 : row.record.tire.stage.sequence!
}

function stageCohortKey(row: Reviewed) {
  return `${productFamily(row.record)}|${row.stageLabel}`
}

function wilson(successes: number, total: number, zValue: number) {
  if (!total) return { lower: null, upper: null }
  const proportion = successes / total
  const zSquared = zValue ** 2
  const denominator = 1 + zSquared / total
  const center = (proportion + zSquared / (2 * total)) / denominator
  const spread = zValue * Math.sqrt((proportion * (1 - proportion) + zSquared / (4 * total)) / total) / denominator
  return { lower: Math.max(0, center - spread), upper: Math.min(1, center + spread) }
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value !== null && typeof value === 'object') return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`
  return JSON.stringify(value)
}

/** Research aggregation only. No output from this function is quote-eligible or automatically adoptable. */
export function aggregateTireCohorts(
  inputs: unknown[],
  policyInput: unknown,
) {
  const policy = TireCohortStatisticsPolicySchema.parse(policyInput)
  if (!inputs.length) throw new Error('Tire cohort aggregation requires records')
  const reviewed = inputs.map(reviewTireCohortRecord)
  const recordIds = new Set<string>()
  const casingStages = new Set<string>()
  for (const row of reviewed) {
    if (recordIds.has(row.record.id)) throw new Error(`Duplicate tire cohort record id: ${row.record.id}`)
    recordIds.add(row.record.id)
    const casingStage = `${row.record.tire.casingId}|${row.stageLabel}`
    if (casingStages.has(casingStage)) throw new Error(`Duplicate casing stage: ${casingStage}`)
    casingStages.add(casingStage)
  }

  const included = reviewed.filter(row => row.readiness === 'READY_FOR_ECONOMIC_REVIEW')
  const excluded = reviewed.filter(row => row.readiness !== 'READY_FOR_ECONOMIC_REVIEW')
    .map(row => ({ id: row.record.id, blockers: row.blockers }))
  const stageGroups = groupBy(included, stageCohortKey)
  const cohorts = [...stageGroups.entries()].map(([key, rows]) => {
    const lifeKm = summarize(rows, row => row.observedKm!, policy)
    const costMxnPerKm = summarize(rows, row => row.observedCostMxnPerKm!, policy)
    const readinessReasons: string[] = []
    if (rows.length < policy.minimumClosedCycles) readinessReasons.push('SAMPLE_BELOW_POLICY')
    if (lifeKm.coefficientOfVariation != null && lifeKm.coefficientOfVariation > policy.maximumCoefficientOfVariation) readinessReasons.push('LIFE_VARIABILITY_ABOVE_POLICY')
    if (costMxnPerKm.coefficientOfVariation != null && costMxnPerKm.coefficientOfVariation > policy.maximumCoefficientOfVariation) readinessReasons.push('COST_VARIABILITY_ABOVE_POLICY')
    if (lifeKm.outlierShare > policy.maximumOutlierShare) readinessReasons.push('LIFE_OUTLIER_SHARE_ABOVE_POLICY')
    if (costMxnPerKm.outlierShare > policy.maximumOutlierShare) readinessReasons.push('COST_OUTLIER_SHARE_ABOVE_POLICY')
    const sample = rows[0].record
    return {
      key,
      operationalSegment: sample.operationalSegment,
      assetType: sample.asset.type,
      assetConfiguration: sample.asset.configuration,
      position: sample.position.group,
      product: {
        manufacturer: sample.tire.manufacturer!, model: sample.tire.model!, size: sample.tire.size!,
        loadRange: sample.tire.loadRange!, serviceDescription: sample.tire.serviceDescription!,
      },
      stage: rows[0].stageLabel,
      recordIds: rows.map(row => row.record.id).sort(),
      lifeKm,
      costMxnPerKm,
      readyForParameterProposalReview: readinessReasons.length === 0,
      readinessReasons,
    }
  }).sort((left, right) => left.key.localeCompare(right.key))

  const familyGroups = groupBy(included, row => productFamily(row.record))
  const casingAcceptance = [...familyGroups.entries()].map(([key, familyRows]) => {
    const stages = [...groupBy(familyRows, row => row.stageLabel).entries()]
      .map(([stage, stageRows]) => ({ stage, rank: stageRank(stageRows[0]), rows: stageRows }))
      .sort((left, right) => left.rank - right.rank)
    let expectedRank = 0
    let cumulativeRate = 1
    let cumulativeEligible = true
    const stageResults = stages.map(stage => {
      const accepted = stage.rows.filter(row => row.casingOutcome === 'ACCEPTED').length
      const rejected = stage.rows.filter(row => row.casingOutcome === 'REJECTED').length
      const inspected = accepted + rejected
      const conditionalAcceptanceRate = inspected ? accepted / inspected : null
      const chainContiguous = stage.rank === expectedRank
      expectedRank = stage.rank + 1
      if (conditionalAcceptanceRate != null) cumulativeRate *= conditionalAcceptanceRate
      const stageEligible = inspected >= policy.minimumInspectionsPerStage
      cumulativeEligible = cumulativeEligible && chainContiguous && stageEligible
      return {
        stage: stage.stage,
        accepted,
        rejected,
        inspected,
        conditionalAcceptanceRate,
        confidenceInterval: wilson(accepted, inspected, policy.confidenceZ),
        chainContiguous,
        stageEligible,
        rawCumulativeAcceptanceRate: conditionalAcceptanceRate == null ? null : cumulativeRate,
        cumulativeRateEligibleForReview: cumulativeEligible,
      }
    })
    return { key, stages: stageResults }
  }).sort((left, right) => left.key.localeCompare(right.key))

  const result = {
    policy,
    receivedRecordCount: reviewed.length,
    includedRecordCount: included.length,
    excludedRecordCount: excluded.length,
    excluded,
    cohorts,
    casingAcceptance,
    researchOnly: true as const,
    parameterWriteAllowed: false as const,
    quoteEligible: false as const,
    publicationRequiresExplicitApproval: true as const,
  }
  return {
    ...result,
    fingerprint: createHash('sha256').update(stable(result)).digest('hex'),
  }
}
