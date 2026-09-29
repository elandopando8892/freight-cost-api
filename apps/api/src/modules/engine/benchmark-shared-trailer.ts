import { z } from 'zod'
import { BenchmarkLegSchema } from './benchmark-leg.js'
import { allocateFixedCost } from './fixed-cost-allocation.js'
import { round2 } from '../../utils/currency.js'

const datum = (unit: string, positive = false) => z.object({
  value: positive ? z.number().finite().positive() : z.number().finite().nonnegative(),
  unit: z.literal(unit), derivation: z.string().trim().min(1).max(1000),
  evidenceIds: z.array(z.string().trim().min(1)).default([]),
}).strict().nullable()

export const SharedTrailerSchema = z.object({
  assetReference: z.string().trim().min(1),
  scopeDeclaration: z.literal('LEG_INPUTS_EXCLUDE_ALL_TRAILER_COSTS'),
  allocationEvidence: z.string().trim().min(1).max(1000),
  allocationEvidenceIds: z.array(z.string().trim().min(1)).default([]),
  monthlyFixedUsd: datum('USD/trailer-month', true),
  productiveKmPerMonth: datum('km/trailer-month', true),
  productiveDaysPerMonth: datum('days/trailer-month', true),
  maintenanceUsdPerKm: datum('USD/km'), tiresUsdPerKm: datum('USD/km'),
  totalKm: datum('km', true), cycleDays: datum('days', true),
  // Each input and the allocation declaration must reference this dossier explicitly.
  evidence: BenchmarkLegSchema.shape.evidence.min(1),
}).strict()

export function calculateSharedTrailer(raw: unknown, serviceDate: string, minimumKm: number, minimumDays: number) {
  BenchmarkLegSchema.shape.serviceDate.parse(serviceDate)
  z.number().finite().nonnegative().parse(minimumKm)
  z.number().finite().nonnegative().parse(minimumDays)
  const input = SharedTrailerSchema.parse(raw)
  const issues: { field: string; code: string }[] = []
  const keys = ['monthlyFixedUsd', 'productiveKmPerMonth', 'productiveDaysPerMonth', 'maintenanceUsdPerKm', 'tiresUsdPerKm', 'totalKm', 'cycleDays'] as const
  for (const key of keys) if (!input[key]) issues.push({ field: key, code: 'MISSING_TRAILER_INPUT' })
  const ids = new Set<string>()
  for (const source of input.evidence) {
    if (ids.has(source.id)) issues.push({ field: 'evidence', code: 'DUPLICATE_EVIDENCE_ID' })
    ids.add(source.id)
    if (source.validFrom > source.validUntil || source.observedAt > serviceDate || source.validFrom > serviceDate || source.validUntil < serviceDate) {
      issues.push({ field: 'evidence', code: 'EVIDENCE_OUTSIDE_VALIDITY' })
    }
  }
  const evidenceCoverage: Record<string, string[]> = {}
  const checkReferences = (field: string, references: string[]) => {
    evidenceCoverage[field] = [...references]
    if (!references.length) issues.push({ field, code: 'MISSING_EVIDENCE_REFERENCE' })
    if (new Set(references).size !== references.length) issues.push({ field, code: 'DUPLICATE_EVIDENCE_REFERENCE' })
    for (const id of new Set(references)) {
      if (!ids.has(id)) issues.push({ field, code: 'UNKNOWN_EVIDENCE_REFERENCE' })
    }
  }
  for (const key of keys) if (input[key]) checkReferences(key, input[key]!.evidenceIds)
  checkReferences('allocationEvidence', input.allocationEvidenceIds)
  // Referential coverage does not prove authenticity, economic scope or calibration.
  const envelope = { lineage: input, evidenceCoverage, calibrated: false as const,
    sourceStatus: 'DOCUMENTED_UNVERIFIED' as const }
  if (input.totalKm && input.totalKm.value < minimumKm) issues.push({ field: 'totalKm', code: 'TRAILER_DISTANCE_BELOW_LOADED_LEGS' })
  if (input.cycleDays && input.cycleDays.value < minimumDays) issues.push({ field: 'cycleDays', code: 'TRAILER_TIME_BELOW_LEG_CYCLES' })
  if (issues.length) return { ...envelope, issues, costs: null }
  const byDistance = input.totalKm!.value * input.monthlyFixedUsd!.value / input.productiveKmPerMonth!.value
  const byTime = input.cycleDays!.value * input.monthlyFixedUsd!.value / input.productiveDaysPerMonth!.value
  const maintenance = input.totalKm!.value * input.maintenanceUsdPerKm!.value
  const tires = input.totalKm!.value * input.tiresUsdPerKm!.value
  const cfuUsd = round2(allocateFixedCost(byDistance, byTime))
  const cvuUsd = round2(round2(maintenance) + round2(tires))
  if (![byDistance, byTime, maintenance, tires, cfuUsd + cvuUsd].every(n => Number.isFinite(n) && Number.isSafeInteger(Math.round(n * 100)))) {
    return { ...envelope, issues: [{ field: 'costs', code: 'NUMERIC_RANGE_EXCEEDED' }], costs: null }
  }
  return { ...envelope, issues, costs: { cfuUsd, cvuUsd, maintenanceUsd: round2(maintenance), tiresUsd: round2(tires),
    cfuByDistanceUsd: round2(byDistance), cfuByTimeUsd: round2(byTime), productionCostUsd: round2(cfuUsd + cvuUsd) } }
}
