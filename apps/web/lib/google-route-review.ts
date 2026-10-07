import { z } from 'zod'

const address = z.string().trim().min(3).max(240).refine(v => !/[\x00-\x1f]/.test(v))
export function routeReviewRequest(origin: string, destination: string, intermediateText: string) {
  const intermediates = intermediateText.split('\n').map(s => s.trim()).filter(Boolean)
  const schema = z.object({ origin: address, destination: address, intermediates: z.array(address).max(10) })
    .refine(v => new Set([v.origin, ...v.intermediates, v.destination].map(s => s.toLowerCase())).size === v.intermediates.length + 2)
  const parsed = schema.safeParse({ origin, destination, intermediates })
  if (!parsed.success) throw new Error('INVALID_INPUT')
  return { acknowledgeUsage: true, request: { ...parsed.data, candidateOnly: true, endpointsConfirmed: false, truckRouteValidated: false } }
}
const geometry = z.object({ type: z.literal('LineString'), coordinates: z.array(z.tuple([
  z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90),
])).min(2).max(30000) }).refine(v => !v.coordinates.every(p => p[0] === v.coordinates[0][0] && p[1] === v.coordinates[0][1]))
const candidateSchema = z.object({
  status: z.literal('CANDIDATE_NOT_TRUCK_VALIDATED'), provider: z.literal('GOOGLE_MAPS_ROUTES'), attribution: z.literal('Google Maps'),
  observations: z.object({ distanceKm: z.number().finite().positive().max(100000), driveMinutesWithoutTraffic: z.number().finite().positive(), geometry, commercialTollsUsd: z.null() }),
  quoteReady: z.literal(false), truckRouteValidated: z.literal(false), endpointsConfirmed: z.literal(false), adoptedValues: z.literal(0),
  handoff: z.object({ loadedKm: z.null(), emptyKm: z.null(), cycleDays: z.null(), tollsUsd: z.null() }),
  displayPolicy: z.object({ mapProvider: z.literal('GOOGLE_MAPS'), attributionRequired: z.literal(true), contentPersistence: z.literal('DISABLED_PENDING_APPLICABLE_TERMS_REVIEW') }),
})
export type RouteCandidate = z.infer<typeof candidateSchema>
export function parseRouteCandidate(raw: unknown): RouteCandidate {
  const checked = candidateSchema.safeParse(raw)
  if (!checked.success) throw new Error('INVALID_RESPONSE')
  return checked.data
}
export function parseRouteReviewConfig(raw: unknown) {
  return z.object({ enabled: z.boolean(), remainingAttempts: z.number().int().min(0).max(1), remainingMapLoads: z.number().int().min(0).max(1).optional(), policy: z.literal('LOCAL_TRANSIENT_REVIEW_ONLY'), quoteReady: z.literal(false) }).parse(raw)
}
