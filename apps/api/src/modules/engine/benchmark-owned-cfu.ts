import { z } from 'zod'
import { OwnedFixedSchema, calculateOwnedFixedScenarios } from './benchmark-owned-fixed.js'
import { BenchmarkLegSchema } from './benchmark-leg.js'
import { SharedTrailerSchema } from './benchmark-shared-trailer.js'
import { allocateFixedCost } from './fixed-cost-allocation.js'
import { round2 } from '../../utils/currency.js'

export const OwnedCfuSchema = z.object({
  fixed: OwnedFixedSchema,
  exposure: SharedTrailerSchema.pick({ productiveKmPerMonth: true, productiveDaysPerMonth: true,
    totalKm: true, cycleDays: true }).extend({
    assetReference: z.string().trim().min(1), serviceDate: BenchmarkLegSchema.shape.serviceDate,
    evidence: BenchmarkLegSchema.shape.evidence,
  }).strict(),
}).strict()

/** Same exposure for every fixed-cost scenario; no client CFU or monthly-fixed override. */
export function calculateOwnedCfuScenarios(raw: unknown) {
  const input = OwnedCfuSchema.parse(raw)
  const fixed = calculateOwnedFixedScenarios(input.fixed)
  const issues = fixed.issues.map(issue => ({ ...issue, field: `fixed.${issue.field}` }))
  const exposure = input.exposure
  const asset = input.fixed.capital
  if (exposure.assetReference !== asset.assetReference) issues.push({ field: 'exposure', code: 'ASSET_MISMATCH' })
  if (exposure.serviceDate !== asset.serviceDate) issues.push({ field: 'exposure', code: 'DATE_MISMATCH' })
  const sources = new Map(exposure.evidence.map(s => [s.id, s]))
  if (sources.size !== exposure.evidence.length) issues.push({ field: 'exposure.evidence', code: 'DUPLICATE_EVIDENCE' })
  for (const key of ['productiveKmPerMonth', 'productiveDaysPerMonth', 'totalKm', 'cycleDays'] as const) {
    const datum = exposure[key]
    const field = `exposure.${key}`
    if (!datum) { issues.push({ field, code: 'MISSING_EXPOSURE' }); continue }
    if (!datum.evidenceIds.length) issues.push({ field, code: 'MISSING_EVIDENCE_REFERENCE' })
    if (new Set(datum.evidenceIds).size !== datum.evidenceIds.length) issues.push({ field, code: 'DUPLICATE_REFERENCE' })
    for (const id of datum.evidenceIds) {
      const source = sources.get(id)
      if (!source) { issues.push({ field, code: 'MISSING_EVIDENCE' }); continue }
      // Cross-border trip evidence may come from either country; base utilization must match its economic country.
      if (key.startsWith('productive') && source.country !== asset.country) issues.push({ field, code: 'COUNTRY_MISMATCH' })
      if (source.observedAt > asset.serviceDate || source.validFrom > source.validUntil ||
          source.validFrom > asset.serviceDate || source.validUntil < asset.serviceDate) issues.push({ field, code: 'EVIDENCE_OUTSIDE_VALIDITY' })
    }
  }
  if (exposure.productiveDaysPerMonth && exposure.productiveDaysPerMonth.value > 31) {
    issues.push({ field: 'exposure.productiveDaysPerMonth', code: 'EXCEEDS_SINGLE_TRAILER_MONTH' })
  }
  const envelope = { lineage: input, fixed, calibrated: false as const, sourceStatus: 'DOCUMENTED_UNVERIFIED',
    scope: 'OWNED_TRAILER_FIXED_ALLOCATION_ONLY', cvuUsd: null, productionCostUsd: null, purchaseCostUsd: null, sellPriceUsd: null }
  if (issues.length || !fixed.scenarios) return { ...envelope, status: 'INCOMPLETE', issues, scenarios: null }
  const scenarios = fixed.scenarios.map(s => {
    const byDistance = s.monthlyFixedUsd * exposure.totalKm!.value / exposure.productiveKmPerMonth!.value
    const byTime = s.monthlyFixedUsd * exposure.cycleDays!.value / exposure.productiveDaysPerMonth!.value
    if (![byDistance, byTime].every(n => Number.isFinite(n) && Number.isSafeInteger(Math.round(n * 100)))) {
      issues.push({ field: s.id, code: 'NUMERIC_RANGE_EXCEEDED' })
    }
    return { id: s.id, monthlyFixedUsd: s.monthlyFixedUsd,
      cfuByDistanceUsd: round2(byDistance), cfuByTimeUsd: round2(byTime),
      cfuUsd: round2(allocateFixedCost(byDistance, byTime)),
      bindingBasis: byDistance === byTime ? 'TIE' : byDistance > byTime ? 'DISTANCE' : 'TIME' }
  })
  return { ...envelope, status: issues.length ? 'INCOMPLETE' : 'SCENARIO_ONLY', issues, scenarios: issues.length ? null : scenarios }
}
