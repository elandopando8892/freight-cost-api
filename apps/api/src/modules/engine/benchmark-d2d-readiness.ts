import { z } from 'zod'
import { BenchmarkD2DSchema, calculateBenchmarkD2D } from './benchmark-d2d.js'
import { BenchmarkLegSchema } from './benchmark-leg.js'
import { BenchmarkParametersSchema, benchmarkRateRequirements } from './benchmark-rates.js'
import { SharedTrailerSchema } from './benchmark-shared-trailer.js'

const text = z.string().trim().min(1).max(1000)
const draftLeg = z.object({ parameters: BenchmarkParametersSchema.nullable(),
  trip: BenchmarkLegSchema.shape.trip }).strict()

/** Capture/preflight boundary for an incomplete case, not an economic approval.
 * Reuses the strict calculator schemas; no catalog defaults or substitute route. */
export const BenchmarkD2DReadinessSchema = z.object({
  model: z.literal('FCM_D2D_READINESS_V1'), caseReference: text,
  direction: BenchmarkD2DSchema.shape.direction,
  serviceDate: BenchmarkD2DSchema.shape.serviceDate.nullable(),
  route: BenchmarkD2DSchema.shape.route.nullable(),
  allocationRationale: BenchmarkD2DSchema.shape.allocationRationale.nullable(),
  mx: draftLeg, us: draftLeg,
  sharedTrailer: SharedTrailerSchema.nullable(),
  borderCharges: BenchmarkD2DSchema.shape.borderCharges.nullable(),
}).strict()

export type BenchmarkD2DReadinessInput = z.infer<typeof BenchmarkD2DReadinessSchema>
type Issue = { field: string; code: string }

/** Invokes the existing compositor only with a complete structural envelope.
 * A calculated estimate still does not establish calibration, adoption or release. */
export function reviewBenchmarkD2DReadiness(raw: unknown) {
  const input = BenchmarkD2DReadinessSchema.parse(raw)
  const issues: Issue[] = []
  if (!input.serviceDate) issues.push({ field: 'serviceDate', code: 'MISSING_SERVICE_DATE' })
  if (!input.route) for (const key of Object.keys(BenchmarkD2DSchema.shape.route.shape)) {
    issues.push({ field: `route.${key}`, code: 'MISSING_ROUTE_POINT' })
  }
  if (!input.allocationRationale) issues.push({ field: 'allocationRationale', code: 'MISSING_ALLOCATION_RATIONALE' })
  const nationalRequirements = (['mx', 'us'] as const).map(key => {
    const country = key === 'mx' ? 'MX' : 'US'
    const requirements = benchmarkRateRequirements(country, true)
    const parameters = input[key].parameters
    const keys = new Set(Object.values(requirements).flat())
    if (!parameters) for (const rate of Object.keys(requirements)) {
      issues.push({ field: `${key}.rates.${rate}`, code: 'MISSING_NATIONAL_BASE' })
    }
    else {
      if (parameters.country !== country) issues.push({ field: `${key}.parameters.country`, code: 'LEG_COUNTRY_MISMATCH' })
      if (parameters.assetCostScope !== 'TRACTOR_ONLY') issues.push({ field: `${key}.parameters.assetCostScope`, code: 'LEG_ASSET_SCOPE_MISMATCH' })
      if (input.serviceDate && parameters.serviceDate !== input.serviceDate) issues.push({ field: `${key}.parameters.serviceDate`, code: 'LEG_DATE_MISMATCH' })
      const providedKeys = new Set(parameters.parameters.map(parameter => parameter.key))
      for (const required of keys) if (!providedKeys.has(required)) {
        issues.push({ field: `${key}.parameters.${required}`, code: 'MISSING_PARAMETER' })
      }
    }
    for (const [field, datum] of Object.entries(input[key].trip)) {
      if (datum === null) issues.push({ field: `${key}.trip.${field}`, code: 'MISSING_TRIP_INPUT' })
    }
    return { country, assetCostScope: 'TRACTOR_ONLY', canonicalKeyCount: keys.size, requirements }
  })
  if (!input.sharedTrailer) {
    for (const field of ['assetReference', 'allocationEvidence', 'costAgreement', 'monthlyFixedUsd',
      'productiveKmPerMonth', 'productiveDaysPerMonth', 'maintenanceUsdPerKm', 'tiresUsdPerKm',
      'totalKm', 'cycleDays', 'evidence']) {
      issues.push({ field: `sharedTrailer.${field}`, code: 'MISSING_SHARED_TRAILER' })
    }
  }
  if (input.borderCharges === null) {
    for (const concept of ['CROSSING', 'INTERCHANGE']) issues.push({ field: `borderCharges.${concept}`, code: 'BORDER_COST_UNDOCUMENTED' })
  }
  const envelope = { model: input.model, caseReference: input.caseReference, direction: input.direction,
    travelOrder: input.direction === 'MX_TO_US' ? ['mx', 'border', 'us'] : ['us', 'border', 'mx'],
    nationalRequirements, calibrated: false, quoteReady: false, productionReady: false,
    purchaseCostUsd: null, sellPriceUsd: null, lineage: input }
  const stageOf = (issue: Issue) => {
    const root = issue.field.split('.')[0]
    if (['route', 'mx', 'us', 'sharedTrailer', 'borderCharges'].includes(root)) return root
    // The existing compositor names uncovered concepts and charge IDs directly.
    if (['BORDER_COST_UNDOCUMENTED', 'BORDER_EVIDENCE_OUTSIDE_VALIDITY',
      'DUPLICATE_BORDER_COVERAGE', 'DUPLICATE_CHARGE_ID'].includes(issue.code)) return 'borderCharges'
    return 'case'
  }
  const group = (all: Issue[]) => Object.fromEntries(['case', 'route', 'mx', 'us', 'sharedTrailer', 'borderCharges']
    .map(stage => [stage, all.filter(issue => stageOf(issue) === stage)]))
  if (issues.length) return { ...envelope, status: 'INCOMPLETE', compositorInvoked: false,
    issues, issuesByStage: group(issues), costs: null, compositor: null }
  const result = calculateBenchmarkD2D({ model: 'FCM_CARRIER_BENCHMARK_D2D_V1', direction: input.direction,
    serviceDate: input.serviceDate, assetAllocation: 'SHARED_TRAILER',
    allocationRationale: input.allocationRationale, route: input.route,
    mx: input.mx, us: input.us, sharedTrailer: input.sharedTrailer, borderCharges: input.borderCharges })
  return { ...envelope, status: result.status, compositorInvoked: true,
    issues: result.issues, issuesByStage: group(result.issues), costs: result.costs, compositor: result }
}
