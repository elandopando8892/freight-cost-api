import { z } from 'zod'
import { BenchmarkLegSchema } from './benchmark-leg.js'
import { round2 } from '../../utils/currency.js'

const text = z.string().trim().min(1).max(1000)
const datum = (unit: string) => z.object({ value: z.number().finite().nonnegative(),
  unit: z.literal(unit), evidenceIds: z.array(text).min(1), derivation: text }).strict()

export const CapitalScenariosSchema = z.object({
  assetReference: text, condition: z.enum(['NEW', 'USED']), country: z.enum(['MX', 'US']),
  serviceDate: BenchmarkLegSchema.shape.serviceDate,
  acquisitionCost: datum('USD'),
  evidence: BenchmarkLegSchema.shape.evidence,
  scenarios: z.array(z.object({
    id: text, horizonBasis: z.enum(['FROM_NEW', 'REMAINING_FROM_ACQUISITION']),
    horizon: datum('months'), residual: datum('USD'), applicabilityRationale: text,
  }).strict()).min(1).max(20),
}).strict()

/** Depreciation sensitivity only; never returns a complete fixed cost or an adopted parameter. */
export function calculateCapitalScenarios(raw: unknown) {
  const input = CapitalScenariosSchema.parse(raw)
  const issues: { field: string; code: string }[] = []
  const sources = new Map(input.evidence.map(e => [e.id, e]))
  if (sources.size !== input.evidence.length) issues.push({ field: 'evidence', code: 'DUPLICATE_EVIDENCE' })
  if (new Set(input.scenarios.map(s => s.id)).size !== input.scenarios.length) issues.push({ field: 'scenarios', code: 'DUPLICATE_SCENARIO' })
  const check = (field: string, value: z.infer<ReturnType<typeof datum>>) => {
    if (new Set(value.evidenceIds).size !== value.evidenceIds.length) issues.push({ field, code: 'DUPLICATE_REFERENCE' })
    for (const id of value.evidenceIds) {
      const source = sources.get(id)
      if (!source) { issues.push({ field, code: 'MISSING_EVIDENCE' }); continue }
      if (source.country !== input.country) issues.push({ field, code: 'COUNTRY_MISMATCH' })
      if (source.validFrom > source.validUntil || source.observedAt > input.serviceDate ||
          source.validFrom > input.serviceDate || source.validUntil < input.serviceDate) issues.push({ field, code: 'EVIDENCE_OUTSIDE_VALIDITY' })
    }
  }
  check('acquisitionCost', input.acquisitionCost)
  if (input.acquisitionCost.value <= 0) issues.push({ field: 'acquisitionCost', code: 'NON_POSITIVE_COST' })
  const rows = input.scenarios.map((scenario, index) => {
    const field = `scenarios.${index}`
    check(`${field}.horizon`, scenario.horizon); check(`${field}.residual`, scenario.residual)
    const expected = input.condition === 'NEW' ? 'FROM_NEW' : 'REMAINING_FROM_ACQUISITION'
    if (scenario.horizonBasis !== expected) issues.push({ field, code: 'HORIZON_BASIS_MISMATCH' })
    if (!Number.isInteger(scenario.horizon.value) || scenario.horizon.value <= 0) issues.push({ field, code: 'INVALID_HORIZON' })
    if (scenario.residual.value > input.acquisitionCost.value) issues.push({ field, code: 'RESIDUAL_EXCEEDS_COST' })
    const depreciation = (input.acquisitionCost.value - scenario.residual.value) / scenario.horizon.value
    if (![input.acquisitionCost.value, scenario.residual.value, depreciation].every(n => Number.isFinite(n) && Number.isSafeInteger(Math.round(n * 100)))) {
      issues.push({ field, code: 'NUMERIC_RANGE_EXCEEDED' })
    }
    return { id: scenario.id, monthlyDepreciationUsd: round2(depreciation) }
  })
  return { status: issues.length ? 'INCOMPLETE' : 'SCENARIO_ONLY', calibrated: false as const,
    sourceStatus: 'DOCUMENTED_UNVERIFIED', lineage: input, issues,
    monthlyFixedUsd: null, cfuUsd: null, scenarios: issues.length ? null : rows }
}
