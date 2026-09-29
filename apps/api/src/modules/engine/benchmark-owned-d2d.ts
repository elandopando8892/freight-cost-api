import { z } from 'zod'
import { BenchmarkD2DSchema, calculateBenchmarkD2D } from './benchmark-d2d.js'
import { OwnedFixedSchema, calculateOwnedFixedScenarios } from './benchmark-owned-fixed.js'
import { SharedTrailerSchema } from './benchmark-shared-trailer.js'

export const OwnedD2DSchema = z.object({
  route: BenchmarkD2DSchema.omit({ sharedTrailer: true }).extend({ assetAllocation: z.literal('SHARED_TRAILER') }).strict(),
  fixed: OwnedFixedSchema,
  trailer: SharedTrailerSchema.omit({ monthlyFixedUsd: true, costAgreement: true }).strict(),
}).strict()

/** Compose from original inputs; callers cannot supply monthly fixed or completed totals. */
export function calculateOwnedD2DScenarios(raw: unknown) {
  const input = OwnedD2DSchema.parse(raw)
  const fixed = calculateOwnedFixedScenarios(input.fixed)
  const issues = fixed.issues.map(issue => ({ ...issue, field: `fixed.${issue.field}` }))
  if (input.fixed.capital.assetReference !== input.trailer.assetReference) issues.push({ field: 'trailer', code: 'ASSET_MISMATCH' })
  if (input.fixed.capital.serviceDate !== input.route.serviceDate) issues.push({ field: 'route', code: 'DATE_MISMATCH' })
  if (input.trailer.productiveDaysPerMonth && input.trailer.productiveDaysPerMonth.value > 31) {
    issues.push({ field: 'trailer.productiveDaysPerMonth', code: 'EXCEEDS_SINGLE_TRAILER_MONTH' })
  }
  for (const datum of [input.trailer.productiveDaysPerMonth, input.trailer.productiveKmPerMonth]) {
    for (const id of datum?.evidenceIds ?? []) {
      const source = input.trailer.evidence.find(e => e.id === id)
      if (source && source.country !== input.fixed.capital.country) issues.push({ field: 'trailer', code: 'UTILIZATION_COUNTRY_MISMATCH' })
    }
  }
  const envelope = { lineage: input, fixed, calibrated: false as const, sourceStatus: 'DOCUMENTED_UNVERIFIED',
    purchaseCostUsd: null, sellPriceUsd: null }
  if (issues.length || !fixed.scenarios) return { ...envelope, status: 'INCOMPLETE', issues, scenarios: null }
  // Dossiers have local IDs; namespace each instead of silently overwriting equal IDs.
  const evidence = [
    ...input.trailer.evidence.map(e => ({ ...e, id: `trip:${e.id}` })),
    ...input.fixed.evidence.map(e => ({ ...e, id: `fixed:${e.id}` })),
    ...input.fixed.capital.evidence.map(e => ({ ...e, id: `capital:${e.id}` })),
  ]
  const datum = <T extends { evidenceIds: string[] } | null>(value: T) => value ? { ...value, evidenceIds: value.evidenceIds.map(id => `trip:${id}`) } : null
  const scenarios = fixed.scenarios.map(scenario => {
    const capital = input.fixed.capital.scenarios.find(s => s.id === scenario.id)!
    const finance = input.fixed.financing.find(s => s.scenarioId === scenario.id)!
    const refs = [...new Set([
      ...[input.fixed.capital.acquisitionCost, capital.horizon, capital.residual].flatMap(d => d.evidenceIds.map(id => `capital:${id}`)),
      ...[finance.interest, ...input.fixed.expenses.map(e => e.amount)].flatMap(d => d.evidenceIds.map(id => `fixed:${id}`)),
    ])]
    const result = calculateBenchmarkD2D({ ...input.route, sharedTrailer: {
      ...input.trailer, evidence,
      allocationEvidenceIds: input.trailer.allocationEvidenceIds.map(id => `trip:${id}`),
      monthlyFixedUsd: { value: scenario.monthlyFixedUsd, unit: 'USD/trailer-month', evidenceIds: refs,
        derivation: `Recomputed owned fixed scenario ${scenario.id}; original lineage retained in fixed` },
      costAgreement: { tenure: 'OWNED', fixedCostBasis: 'DEPRECIATION_AND_FINANCING', includedInMonthlyFixed: [],
        derivation: input.fixed.allocationRationale, evidenceIds: input.fixed.allocationEvidenceIds.map(id => `fixed:${id}`) },
      productiveKmPerMonth: datum(input.trailer.productiveKmPerMonth), productiveDaysPerMonth: datum(input.trailer.productiveDaysPerMonth),
      totalKm: datum(input.trailer.totalKm), cycleDays: datum(input.trailer.cycleDays),
      maintenanceUsdPerKm: datum(input.trailer.maintenanceUsdPerKm), tiresUsdPerKm: datum(input.trailer.tiresUsdPerKm),
    } })
    issues.push(...result.issues.map(issue => ({ ...issue, field: `scenarios.${scenario.id}.${issue.field}` })))
    return { id: scenario.id, result }
  })
  return { ...envelope, status: issues.length ? 'INCOMPLETE' : 'SCENARIO_ONLY', issues, scenarios: issues.length ? null : scenarios }
}
