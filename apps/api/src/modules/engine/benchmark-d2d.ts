import { z } from 'zod'
import { BenchmarkLegSchema } from './benchmark-leg.js'
import { BenchmarkParametersSchema, calculateBenchmarkFromParameters } from './benchmark-rates.js'
import { SharedTrailerSchema, calculateSharedTrailer } from './benchmark-shared-trailer.js'
import { reviewTrailerAttachment } from './benchmark-trailer-attachment.js'

const text = z.string().trim().min(1).max(1000)
const leg = z.object({ parameters: BenchmarkParametersSchema, trip: BenchmarkLegSchema.shape.trip }).strict()
const concept = z.enum(['CROSSING', 'INTERCHANGE'])

export const BenchmarkD2DSchema = z.object({
  model: z.literal('FCM_CARRIER_BENCHMARK_D2D_V1'),
  direction: z.enum(['MX_TO_US', 'US_TO_MX']),
  serviceDate: BenchmarkLegSchema.shape.serviceDate,
  assetAllocation: z.enum(['SEPARATE_TRACTOR_TRAILER_PER_LEG', 'SHARED_TRAILER']),
  sharedTrailer: SharedTrailerSchema.optional(),
  allocationRationale: text,
  route: z.object({ mxEndpoint: text, mxGateway: text, usGateway: text, usEndpoint: text }).strict(),
  mx: leg, us: leg,
  borderCharges: z.array(z.object({
    id: text, covers: z.array(concept).min(1).max(2),
    amountUsd: z.number().finite().nonnegative().max(1e9).refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 1e-5),
    provider: text, derivation: text,
    sourceUrl: z.string().url().refine(url => new URL(url).protocol === 'https:'), locator: text,
    observedAt: BenchmarkLegSchema.shape.serviceDate,
    validFrom: BenchmarkLegSchema.shape.serviceDate, validUntil: BenchmarkLegSchema.shape.serviceDate,
  }).strict()).max(2),
}).strict()

/** Recompute both legs; never accept client-provided CFU/CVU totals. */
export function calculateBenchmarkD2D(raw: unknown, rawTrailerAttachment?: unknown) {
  const input = BenchmarkD2DSchema.parse(raw)
  const issues: { field: string; code: string }[] = []
  const shared = input.assetAllocation === 'SHARED_TRAILER'
  const attachment = rawTrailerAttachment === undefined ? null : reviewTrailerAttachment(rawTrailerAttachment,
    input.sharedTrailer?.assetReference ?? '',
    { mx:input.mx.trip.cycleDays?.value ?? null, us:input.us.trip.cycleDays?.value ?? null },
    input.sharedTrailer?.evidence.map(row => row.id) ?? [])
  if (attachment) {
    if (!shared || !input.sharedTrailer) issues.push({field:'trailerAttachment',code:'SHARED_TRAILER_REQUIRED'})
    issues.push(...attachment.issues.map(issue => ({...issue,field:`trailerAttachment.${issue.field}`})))
  }
  if (shared !== Boolean(input.sharedTrailer)) issues.push({ field: 'sharedTrailer', code: 'TRAILER_ALLOCATION_MISMATCH' })
  for (const [key, country] of [['mx', 'MX'], ['us', 'US']] as const) {
    const expectedScope = shared ? 'TRACTOR_ONLY' : 'TRACTOR_AND_TRAILER'
    if (input[key].parameters.assetCostScope !== expectedScope) issues.push({ field: key, code: 'LEG_ASSET_SCOPE_MISMATCH' })
    if (input[key].parameters.country !== country) issues.push({ field: key, code: 'LEG_COUNTRY_MISMATCH' })
    if (input[key].parameters.serviceDate !== input.serviceDate) issues.push({ field: key, code: 'LEG_DATE_MISMATCH' })
  }
  const ids = new Set<string>()
  const coverage = new Set<string>()
  for (const charge of input.borderCharges) {
    if (ids.has(charge.id)) issues.push({ field: 'borderCharges', code: 'DUPLICATE_CHARGE_ID' })
    ids.add(charge.id)
    for (const item of charge.covers) {
      if (coverage.has(item)) issues.push({ field: item, code: 'DUPLICATE_BORDER_COVERAGE' })
      coverage.add(item)
    }
    if (charge.observedAt > input.serviceDate || charge.validFrom > charge.validUntil ||
        input.serviceDate < charge.validFrom || input.serviceDate > charge.validUntil) {
      issues.push({ field: charge.id, code: 'BORDER_EVIDENCE_OUTSIDE_VALIDITY' })
    }
  }
  for (const required of ['CROSSING', 'INTERCHANGE']) {
    if (!coverage.has(required)) issues.push({ field: required, code: 'BORDER_COST_UNDOCUMENTED' })
  }
  const mx = calculateBenchmarkFromParameters(input.mx.parameters, input.mx.trip)
  const us = calculateBenchmarkFromParameters(input.us.parameters, input.us.trip)
  for (const [key, result] of [['mx', mx], ['us', us]] as const) {
    const details = result.leg ? result.leg.issues : result.parameterLineage.issues
    issues.push(...details.map(issue => ({ ...issue, field: `${key}.${issue.field}` })))
  }
  const trailer = input.sharedTrailer ? calculateSharedTrailer(input.sharedTrailer, input.serviceDate,
    (input.mx.trip.loadedKm?.value ?? 0) + (input.us.trip.loadedKm?.value ?? 0),
    attachment?.minimumTrailerDays ?? ((input.mx.trip.cycleDays?.value ?? 0) + (input.us.trip.cycleDays?.value ?? 0))) : null
  if (trailer) issues.push(...trailer.issues.map(issue => ({ ...issue, field: `sharedTrailer.${issue.field}` })))
  const envelope = { model: input.model, direction: input.direction,
    travelOrder: input.direction === 'MX_TO_US' ? ['mx', 'border', 'us'] : ['us', 'border', 'mx'],
    calibrated: false, sourceStatus: 'DOCUMENTED_UNVERIFIED', purchaseCostUsd: null, sellPriceUsd: null,
    exclusions: ['Taxes', 'Transloading', 'Risk reserves', 'Carrier margin', 'XBF margin'],
    lineage: input, legs: { mx, us }, sharedTrailer: trailer,
    ...(attachment ? { trailerAttachment:attachment } : {}) }
  if (issues.length || !mx.leg?.costs || !us.leg?.costs || (shared && !trailer?.costs)) {
    return { ...envelope, status: 'INCOMPLETE', issues, costs: null }
  }
  const cents = (value: number) => Math.round(value * 100)
  const cfu = cents(mx.leg.costs.cfuUsd) + cents(us.leg.costs.cfuUsd) + cents(trailer?.costs?.cfuUsd ?? 0)
  const cvu = cents(mx.leg.costs.cvuUsd) + cents(us.leg.costs.cvuUsd) + cents(trailer?.costs?.cvuUsd ?? 0)
  const border = input.borderCharges.reduce((sum, charge) => sum + cents(charge.amountUsd), 0)
  const total = cfu + cvu + border
  if (![cfu, cvu, border, total].every(Number.isSafeInteger)) {
    return { ...envelope, status: 'INCOMPLETE', issues: [{ field: 'costs', code: 'NUMERIC_RANGE_EXCEEDED' }], costs: null }
  }
  return { ...envelope, status: 'BENCHMARK_ESTIMATE', issues, costs: {
    cfuUsd: cfu / 100, cvuUsd: cvu / 100, borderServicesUsd: border / 100, productionCostUsd: total / 100,
  } }
}
