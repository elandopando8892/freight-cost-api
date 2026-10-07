import { z } from 'zod'

const ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes'
const MAX_BYTES = 2_000_000
const address = z.string().trim().min(3).max(240).refine(v => !/[\x00-\x1f]/.test(v))
export const GoogleBasicRouteRequestSchema = z.object({
  origin: address, destination: address, intermediates: z.array(address).max(10).default([]),
  candidateOnly: z.literal(true), endpointsConfirmed: z.literal(false), truckRouteValidated: z.literal(false),
}).strict().refine(v => new Set([v.origin, ...v.intermediates, v.destination].map(s => s.toLowerCase())).size ===
  v.intermediates.length + 2, 'Duplicate waypoints')
export const GOOGLE_BASIC_FIELD_MASK = 'routes.distanceMeters,routes.duration,routes.polyline.geoJsonLinestring'
export type GoogleRouteErrorCode = 'INVALID_INPUT' | 'MISSING_API_KEY' | 'INVALID_API_KEY' | 'CALL_LIMIT_REACHED' |
  'ACCESS_DENIED' | 'QUOTA_REJECTED' | 'HTTP_ERROR' | 'TRANSPORT_ERROR' | 'REQUEST_TIMEOUT' |
  'RESPONSE_TOO_LARGE' | 'INVALID_RESPONSE' | 'NO_ROUTE'
export class GoogleRouteError extends Error {
  constructor(public readonly code: GoogleRouteErrorCode) { super(code); this.name = 'GoogleRouteError' }
}

/** Fixed basic SKU profile. No caller-supplied mode, field mask, traffic, tolls or optimization. */
export function planGoogleBasicRoute(raw: unknown) {
  const checked = GoogleBasicRouteRequestSchema.safeParse(raw)
  if (!checked.success) throw new GoogleRouteError('INVALID_INPUT')
  const request = checked.data
  return {
    request, endpoint: ENDPOINT, fieldMask: GOOGLE_BASIC_FIELD_MASK,
    body: { origin: { address: request.origin }, destination: { address: request.destination },
      intermediates: request.intermediates.map(value => ({ address: value })),
      travelMode: 'DRIVE' as const, routingPreference: 'TRAFFIC_UNAWARE' as const,
      computeAlternativeRoutes: false, optimizeWaypointOrder: false,
      polylineEncoding: 'GEO_JSON_LINESTRING' as const, units: 'METRIC' as const },
    usage: { expectedSku: 'Routes: Compute Routes Essentials', publishedMonthlyFreeEvents: 10000,
      pricingReviewedOn: '2026-09-30', maximumAttemptsPerClient: 1, retries: 0,
      accountRemainingFreeEvents: null, zeroCostGuaranteed: false,
      scope: 'PER_CLIENT_NOT_ACCOUNT_WIDE_MONTHLY_CAP' },
  }
}

const line = z.object({ type: z.literal('LineString'), coordinates: z.array(z.tuple([
  z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90),
])).min(2).max(30000) }).strip()
const duration = z.string().regex(/^\d+(?:\.\d{1,9})?s$/).max(24)
  .transform(value => Number(value.slice(0, -1))).refine(value => Number.isFinite(value) && value > 0)
const resultSchema = z.object({ routes: z.array(z.object({
  distanceMeters: z.number().int().positive().max(100_000_000), duration,
  polyline: z.object({ geoJsonLinestring: line }).strip(),
}).strip()).max(1) }).strip()
type Options = { apiKey?: string; fetcher?: (url: string, init: RequestInit) => Promise<Response>; now?: () => Date }

/** Server-side transient candidate only. No database, file cache, engine import or automatic retry. */
export function createGoogleBasicRouteClient(options: Options) {
  const apiKey = options.apiKey?.trim()
  if (!apiKey) throw new GoogleRouteError('MISSING_API_KEY')
  if (!/^AIza[A-Za-z0-9_-]{35}$/.test(apiKey)) throw new GoogleRouteError('INVALID_API_KEY')
  const fetcher = options.fetcher ?? fetch
  let attempted = false
  return {
    async routeCandidate(raw: unknown) {
      const plan = planGoogleBasicRoute(raw)
      if (JSON.stringify(plan.request).includes(apiKey)) throw new GoogleRouteError('INVALID_INPUT')
      if (attempted) throw new GoogleRouteError('CALL_LIMIT_REACHED')
      // Reserve before await: parallel calls and failed requests cannot bypass this local cap.
      attempted = true
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      try {
        const response = await fetcher(ENDPOINT, { method: 'POST', redirect: 'error', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': GOOGLE_BASIC_FIELD_MASK }, body: JSON.stringify(plan.body) })
        if (response.status === 401 || response.status === 403) throw new GoogleRouteError('ACCESS_DENIED')
        if (response.status === 429) throw new GoogleRouteError('QUOTA_REJECTED')
        if (!response.ok) throw new GoogleRouteError('HTTP_ERROR')
        if (!response.body) throw new GoogleRouteError('INVALID_RESPONSE')
        const reader = response.body.getReader(), chunks: Uint8Array[] = []
        let size = 0
        try {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            size += value.byteLength
            if (size > MAX_BYTES) { await reader.cancel(); throw new GoogleRouteError('RESPONSE_TOO_LARGE') }
            chunks.push(value)
          }
        } finally { reader.releaseLock() }
        let rawResult: unknown
        try { rawResult = JSON.parse(Buffer.concat(chunks).toString('utf8')) }
        catch { throw new GoogleRouteError('INVALID_RESPONSE') }
        // Proto default empty repeated fields may be omitted. Error envelopes are not empty routes.
        if (rawResult && typeof rawResult === 'object' && !Array.isArray(rawResult) &&
            Object.keys(rawResult).length === 0) throw new GoogleRouteError('NO_ROUTE')
        const parsed = resultSchema.safeParse(rawResult)
        if (!parsed.success) throw new GoogleRouteError('INVALID_RESPONSE')
        const route = parsed.data.routes[0]
        if (!route) throw new GoogleRouteError('NO_ROUTE')
        const shape = route.polyline.geoJsonLinestring
        if (shape.coordinates.every(pair => pair[0] === shape.coordinates[0][0] && pair[1] === shape.coordinates[0][1])) {
          throw new GoogleRouteError('INVALID_RESPONSE')
        }
        return {
          artifact: 'FCM_GOOGLE_BASIC_ROUTE_CANDIDATE', status: 'CANDIDATE_NOT_TRUCK_VALIDATED',
          provider: 'GOOGLE_MAPS_ROUTES', attribution: 'Google Maps',
          retrievedAt: (options.now ?? (() => new Date()))().toISOString(),
          request: plan.request, usage: { ...plan.usage, attemptsThisClient: 1 },
          observations: { distanceKm: route.distanceMeters / 1000, driveMinutesWithoutTraffic: route.duration / 60,
            geometry: shape, commercialTollsUsd: null },
          truckRouteValidated: false, endpointsConfirmed: false, quoteReady: false, adoptedValues: 0,
          issues: ['DRIVE_NOT_TRUCK_RESTRICTION_VALIDATION', 'NOMINAL_ENDPOINTS_NOT_DELIVERY_ADDRESSES',
            'COMMERCIAL_TOLLS_UNVERIFIED', 'DRIVE_TIME_NOT_TRUCK_CYCLE', 'NOT_ADOPTED_TRIP_INPUTS'],
          handoff: { loadedKm: null, emptyKm: null, cycleDays: null, tollsUsd: null },
          displayPolicy: { mapProvider: 'GOOGLE_MAPS', attributionRequired: true,
            contentPersistence: 'DISABLED_PENDING_APPLICABLE_TERMS_REVIEW' },
        }
      } catch (error) {
        if (error instanceof GoogleRouteError) throw error
        if (controller.signal.aborted) throw new GoogleRouteError('REQUEST_TIMEOUT')
        throw new GoogleRouteError('TRANSPORT_ERROR') // Never forward provider text or secret-bearing causes.
      } finally { clearTimeout(timeout) }
    },
  }
}
