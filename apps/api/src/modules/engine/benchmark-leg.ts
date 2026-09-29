import { z } from 'zod'
import { allocateFixedCost } from './fixed-cost-allocation.js'
import { round2 } from '../../utils/currency.js'

const text = z.string().trim().min(1).max(1000)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
})
const datum = (unit: string, positive = false) => z.object({
  value: positive ? z.number().finite().positive() : z.number().finite().nonnegative(),
  unit: z.literal(unit),
  evidenceIds: z.array(text).min(1),
  derivation: text,
}).strict().nullable()

/** Explicit derived inputs only. This contract never imports workbook defaults. */
export const BenchmarkLegSchema = z.object({
  model: z.literal('FCM_CARRIER_BENCHMARK_LEG_V1'),
  baseRevision: text,
  country: z.enum(['MX', 'US']),
  equipment: z.literal('TRACTOR_DRY_VAN_SINGLE'),
  service: z.literal('ONE_WAY'),
  fixedCostScope: z.literal('DOMESTIC_CARRIER_FLEET'),
  serviceDate: date,
  rates: z.object({
    monthlyFixedUsd: datum('USD/fleet-month', true),
    productiveKmPerMonth: datum('km/fleet-month', true),
    productiveVehicleDaysPerMonth: datum('vehicle-days/fleet-month', true),
    maintenanceUsdPerKm: datum('USD/km'),
    tiresUsdPerKm: datum('USD/km'),
    driverUsdPerKm: datum('USD/km'),
    dieselUsdPerLiter: datum('USD/liter', true),
    loadedKmPerLiter: datum('km/liter', true),
    emptyKmPerLiter: datum('km/liter', true),
  }).strict(),
  trip: z.object({
    loadedKm: datum('km', true), emptyKm: datum('km'),
    cycleDays: datum('days', true), tollsUsd: datum('USD'),
  }).strict(),
  evidence: z.array(z.object({
    id: text,
    url: z.string().url().refine(value => new URL(value).protocol === 'https:'),
    locator: text,
    observedAt: date, validFrom: date, validUntil: date,
    country: z.enum(['MX', 'US']),
    equipment: z.literal('TRACTOR_DRY_VAN_SINGLE'),
    limitations: text,
  }).strict()),
}).strict()

export type BenchmarkLegInput = z.infer<typeof BenchmarkLegSchema>

/** Evidence presence is not source authenticity, calibration or permission to publish. */
export function calculateBenchmarkLeg(raw: unknown) {
  const input = BenchmarkLegSchema.parse(raw)
  const issues: { field: string; code: string }[] = []
  const evidence = new Map(input.evidence.map(item => [item.id, item]))
  if (evidence.size !== input.evidence.length) issues.push({ field: 'evidence', code: 'DUPLICATE_EVIDENCE_ID' })
  for (const [group, values] of Object.entries({ rates: input.rates, trip: input.trip })) {
    for (const [key, value] of Object.entries(values)) {
      const field = `${group}.${key}`
      if (value === null) { issues.push({ field, code: 'MISSING_INPUT' }); continue }
      for (const id of value.evidenceIds) {
        const source = evidence.get(id)
        if (!source) { issues.push({ field, code: 'EVIDENCE_NOT_FOUND' }); continue }
        if (source.country !== input.country || source.equipment !== input.equipment) {
          issues.push({ field, code: 'EVIDENCE_SCOPE_MISMATCH' })
        }
        if (source.validFrom > source.validUntil || source.observedAt > input.serviceDate ||
            input.serviceDate < source.validFrom || input.serviceDate > source.validUntil) {
          issues.push({ field, code: 'EVIDENCE_OUTSIDE_VALIDITY' })
        }
      }
    }
  }
  const envelope = {
    model: input.model, baseRevision: input.baseRevision, country: input.country,
    sourceStatus: 'DOCUMENTED_UNVERIFIED' as const,
    calibrated: false, purchaseCostUsd: null, sellPriceUsd: null,
    exclusions: ['Crossing and interchange', 'Transloading', 'Taxes', 'Risk reserves', 'Carrier margin', 'XBF margin'],
    lineage: input,
  }
  if (issues.length) return { ...envelope, status: 'INCOMPLETE' as const, issues, costs: null }
  const r = input.rates
  const t = input.trip
  // Completeness above guarantees presence. Units and positive denominators are validated by the schema.
  const totalKm = t.loadedKm!.value + t.emptyKm!.value
  const fuel = (t.loadedKm!.value / r.loadedKmPerLiter!.value + t.emptyKm!.value / r.emptyKmPerLiter!.value) * r.dieselUsdPerLiter!.value
  const maintenance = totalKm * r.maintenanceUsdPerKm!.value
  const tires = totalKm * r.tiresUsdPerKm!.value
  const driver = totalKm * r.driverUsdPerKm!.value
  const byDistance = totalKm * r.monthlyFixedUsd!.value / r.productiveKmPerMonth!.value
  const byTime = t.cycleDays!.value * r.monthlyFixedUsd!.value / r.productiveVehicleDaysPerMonth!.value
  const rawValues = [totalKm, fuel, maintenance, tires, driver, byDistance, byTime, t.tollsUsd!.value]
  if (rawValues.some(value => !Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER / 100)) {
    return { ...envelope, status: 'INCOMPLETE' as const, issues: [{ field: 'costs', code: 'NUMERIC_RANGE_EXCEEDED' }], costs: null }
  }
  const variable = { fuelUsd: round2(fuel), maintenanceUsd: round2(maintenance),
    tiresUsd: round2(tires), driverUsd: round2(driver), tollsUsd: round2(t.tollsUsd!.value) }
  const cvuUsd = round2(Object.values(variable).reduce((sum, value) => sum + value, 0))
  const cfuUsd = round2(allocateFixedCost(byDistance, byTime))
  const productionCostUsd = round2(cvuUsd + cfuUsd)
  if (!Number.isSafeInteger(Math.round(productionCostUsd * 100))) {
    return { ...envelope, status: 'INCOMPLETE' as const, issues: [{ field: 'costs', code: 'NUMERIC_RANGE_EXCEEDED' }], costs: null }
  }
  return { ...envelope, status: 'BENCHMARK_ESTIMATE' as const, issues, costs: {
    totalKm, cycleDays: t.cycleDays!.value, ...variable, cvuUsd,
    cfuByDistanceUsd: round2(byDistance), cfuByTimeUsd: round2(byTime), cfuUsd, productionCostUsd,
  } }
}
