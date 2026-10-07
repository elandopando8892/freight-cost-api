import { describe, expect, it, vi, afterEach } from 'vitest'
import { createGoogleBasicRouteClient, planGoogleBasicRoute, GOOGLE_BASIC_FIELD_MASK } from '../src/modules/routing/google-basic-route.client.js'
import { queryGoogleBasicRoute } from '../scripts/query-google-basic-route.js'

// Entirely synthetic provider fixtures: not a researched itinerary or tariff.
const KEY = `AIza${'A'.repeat(35)}`
const request = () => ({ origin: 'Synthetic origin, TX', destination: 'Synthetic destination, AR',
  intermediates: [], candidateOnly: true, endpointsConfirmed: false, truckRouteValidated: false })
const shape = () => ({ type: 'LineString', coordinates: [[-99, 27], [-94, 35]] })
const route = () => ({ distanceMeters: 100000, duration: '3600s', polyline: { geoJsonLinestring: shape() } })
const response = (routes: unknown[] = [route()]) => new Response(JSON.stringify({ routes }))
const clock = () => new Date('2026-09-30T18:00:00Z')
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('Google basic route transient client', () => {
  it('builds a fixed basic profile without credentials or advanced billing features', () => {
    const plan = planGoogleBasicRoute(request())
    expect(plan.body).toMatchObject({ travelMode: 'DRIVE', routingPreference: 'TRAFFIC_UNAWARE',
      computeAlternativeRoutes: false, optimizeWaypointOrder: false, polylineEncoding: 'GEO_JSON_LINESTRING' })
    expect(plan.body).not.toHaveProperty('extraComputations')
    expect(plan.body).not.toHaveProperty('vehicleInfo')
    expect(plan.fieldMask).toBe(GOOGLE_BASIC_FIELD_MASK)
    expect(plan.usage).toMatchObject({ expectedSku: 'Routes: Compute Routes Essentials',
      publishedMonthlyFreeEvents: 10000, zeroCostGuaranteed: false, accountRemainingFreeEvents: null })
  })
  it.each([
    { travelMode: 'TRUCK' }, { routingPreference: 'TRAFFIC_AWARE' }, { extraComputations: ['TOLLS'] },
    { optimizeWaypointOrder: true }, { fieldMask: '*' }, { routeModifiers: { avoidTolls: true } },
    { candidateOnly: false }, { truckRouteValidated: true }, { endpointsConfirmed: true },
    { origin: 'x' }, { destination: 'Synthetic origin, TX' }, { origin: 'Bad\naddress' },
    { intermediates: Array.from({ length: 11 }, (_, i) => `Synthetic via ${i}`) },
    { intermediates: ['Synthetic origin, TX'] },
  ])('rejects unsafe or expanded profile %j before network', async extra => {
    const fetcher = vi.fn()
    const client = createGoogleBasicRouteClient({ apiKey: KEY, fetcher })
    await expect(client.routeCandidate({ ...request(), ...extra })).rejects.toThrow('INVALID_INPUT')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('supports up to ten explicit intermediates in input order without optimization', () => {
    const intermediates = Array.from({ length: 10 }, (_, i) => `Synthetic via ${i}`)
    expect(planGoogleBasicRoute({ ...request(), intermediates }).body.intermediates)
      .toEqual(intermediates.map(address => ({ address })))
  })
  it('a named commercial bridge waypoint is not proof that the returned candidate crosses it', async () => {
    // Synthetic reproduction of a mapping-method risk, not stored Google itinerary content.
    const input = { ...request(), origin: 'Synthetic yard, MX', destination: 'Synthetic yard, TX',
      intermediates: ['World Trade Bridge'] }
    const fetcher = vi.fn(async () => response())
    const candidate = await createGoogleBasicRouteClient({ apiKey: KEY, fetcher, now: clock }).routeCandidate(input)
    expect(candidate.request.intermediates).toEqual(['World Trade Bridge'])
    expect(candidate).toMatchObject({ truckRouteValidated: false, endpointsConfirmed: false,
      quoteReady: false, adoptedValues: 0,
      handoff: { loadedKm: null, emptyKm: null, cycleDays: null, tollsUsd: null } })
    expect(candidate.issues).toContain('DRIVE_NOT_TRUCK_RESTRICTION_VALIDATION')
    expect(candidate.issues).toContain('NOT_ADOPTED_TRIP_INPUTS')
    expect(candidate).not.toHaveProperty('bridgeCrossingValidated')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('provider-added crossing or truck approval cannot promote a route into costing', async () => {
    const raw = { routes: [{ ...route(), bridgeCrossingValidated: true, truckRouteValidated: true }],
      quoteReady: true, adoptedValues: 1, handoff: { loadedKm: 100 } }
    const candidate = await createGoogleBasicRouteClient({ apiKey: KEY,
      fetcher: async () => new Response(JSON.stringify(raw)) }).routeCandidate(request())
    expect(candidate).toMatchObject({ truckRouteValidated: false, quoteReady: false, adoptedValues: 0,
      handoff: { loadedKm: null, emptyKm: null, cycleDays: null, tollsUsd: null } })
    expect(candidate).not.toHaveProperty('bridgeCrossingValidated')
    expect(candidate.observations).not.toHaveProperty('truckRouteValidated')
  })
  it('requires a valid private key before constructing a network client', () => {
    const fetcher = vi.fn()
    expect(() => createGoogleBasicRouteClient({ fetcher })).toThrow('MISSING_API_KEY')
    expect(() => createGoogleBasicRouteClient({ apiKey: 'invalid', fetcher })).toThrow('INVALID_API_KEY')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('sends the key only in the header and preserves null trip handoff', async () => {
    const fetcher = vi.fn(async () => response())
    const result = await createGoogleBasicRouteClient({ apiKey: KEY, fetcher, now: clock }).routeCandidate(request())
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://routes.googleapis.com/directions/v2:computeRoutes')
    expect(url).not.toContain(KEY)
    expect(init.body).not.toContain(KEY)
    expect(init).toMatchObject({ method: 'POST', redirect: 'error',
      headers: { 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': GOOGLE_BASIC_FIELD_MASK } })
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(result.observations).toEqual({ distanceKm: 100, driveMinutesWithoutTraffic: 60,
      geometry: shape(), commercialTollsUsd: null })
    expect(result).toMatchObject({ retrievedAt: clock().toISOString(), status: 'CANDIDATE_NOT_TRUCK_VALIDATED',
      truckRouteValidated: false, quoteReady: false, adoptedValues: 0,
      handoff: { loadedKm: null, emptyKm: null, cycleDays: null, tollsUsd: null },
      displayPolicy: { mapProvider: 'GOOGLE_MAPS', contentPersistence: 'DISABLED_PENDING_APPLICABLE_TERMS_REVIEW' } })
    expect(JSON.stringify(result)).not.toContain(KEY)
  })
  it('does not return provider prose, properties or error fields that could echo a key', async () => {
    const raw = { routes: [{ ...route(), warning: KEY, polyline: { geoJsonLinestring: { ...shape(), properties: KEY } } }], extra: KEY }
    const result = await createGoogleBasicRouteClient({ apiKey: KEY, fetcher: async () => new Response(JSON.stringify(raw)) }).routeCandidate(request())
    expect(JSON.stringify(result)).not.toContain(KEY)
  })
  it('rejects a key copied into an address without consuming an attempt', async () => {
    const fetcher = vi.fn(async () => response())
    const client = createGoogleBasicRouteClient({ apiKey: KEY, fetcher })
    await expect(client.routeCandidate({ ...request(), origin: KEY })).rejects.toThrow('INVALID_INPUT')
    await client.routeCandidate(request())
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('caps concurrent and repeated calls to one attempt', async () => {
    const fetcher = vi.fn(async () => response())
    const client = createGoogleBasicRouteClient({ apiKey: KEY, fetcher })
    const results = await Promise.allSettled([client.routeCandidate(request()), client.routeCandidate(request())])
    expect(results.map(r => r.status)).toEqual(['fulfilled', 'rejected'])
    await expect(client.routeCandidate(request())).rejects.toThrow('CALL_LIMIT_REACHED')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it.each([401, 403, 429, 500])('sanitizes HTTP %s and does not retry even after failure', async status => {
    const fetcher = vi.fn(async () => new Response(KEY, { status }))
    const client = createGoogleBasicRouteClient({ apiKey: KEY, fetcher })
    await expect(client.routeCandidate(request())).rejects.toThrow(status === 429 ? 'QUOTA_REJECTED' : status < 429 ? 'ACCESS_DENIED' : 'HTTP_ERROR')
    await expect(client.routeCandidate(request())).rejects.toThrow('CALL_LIMIT_REACHED')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it.each([[], null].map(routes => ({ routes })))('does not turn empty routes %j into a zero trip', async ({ routes }) => {
    const client = createGoogleBasicRouteClient({ apiKey: KEY, fetcher: async () => new Response(JSON.stringify(routes === null ? {} : { routes })) })
    await expect(client.routeCandidate(request())).rejects.toThrow('NO_ROUTE')
  })
  it.each([
    { distanceMeters: 0 }, { distanceMeters: -1 }, { distanceMeters: 1.5 }, { duration: '-1s' },
    { duration: '0s' }, { duration: '3600' }, { duration: '1e309s' },
    { polyline: { geoJsonLinestring: { type: 'Point', coordinates: [-99, 27] } } },
    { polyline: { geoJsonLinestring: { type: 'LineString', coordinates: [[-181, 27], [-94, 35]] } } },
    { polyline: { geoJsonLinestring: { type: 'LineString', coordinates: [[-99, 27], [-99, 27]] } } },
  ])('rejects malformed provider values %j', async override => {
    const client = createGoogleBasicRouteClient({ apiKey: KEY, fetcher: async () => response([{ ...route(), ...override }]) })
    await expect(client.routeCandidate(request())).rejects.toThrow('INVALID_RESPONSE')
  })
  it('rejects unexpected alternatives rather than selecting one silently', async () => {
    const client = createGoogleBasicRouteClient({ apiKey: KEY, fetcher: async () => response([route(), route()]) })
    await expect(client.routeCandidate(request())).rejects.toThrow('INVALID_RESPONSE')
  })
  it('sanitizes invalid JSON and success-status error envelopes', async () => {
    for (const body of [KEY, JSON.stringify({ error: { message: KEY } })]) {
      await expect(createGoogleBasicRouteClient({ apiKey: KEY, fetcher: async () => new Response(body) })
        .routeCandidate(request())).rejects.toThrow('INVALID_RESPONSE')
    }
  })
  it('bounds body size without reading an unlimited stream', async () => {
    await expect(createGoogleBasicRouteClient({ apiKey: KEY, fetcher: async () => new Response('x'.repeat(2_000_001)) })
      .routeCandidate(request())).rejects.toThrow('RESPONSE_TOO_LARGE')
  })
  it('removes secret-bearing transport errors and causes', async () => {
    try {
      await createGoogleBasicRouteClient({ apiKey: KEY, fetcher: async () => { throw new Error(KEY) } }).routeCandidate(request())
      throw new Error('Expected failure')
    } catch (error) {
      expect(String(error)).toContain('TRANSPORT_ERROR')
      expect(String(error)).not.toContain(KEY)
      expect(error).not.toHaveProperty('cause')
    }
  })
  it('aborts timeout without retries', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(new Error(KEY)), { once: true })
    }))
    const pending = createGoogleBasicRouteClient({ apiKey: KEY, fetcher }).routeCandidate(request())
    const check = expect(pending).rejects.toThrow('REQUEST_TIMEOUT')
    await vi.advanceTimersByTimeAsync(15000)
    await check
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})

describe('Google basic CLI is hermetic until explicitly executed', () => {
  const args = ['--route=docs/research/B2_GOOGLE_BASIC_US_REQUEST_2026-09-30.json']
  it('plans public nominal endpoints without a key or any network call', async () => {
    const { exitCode, report } = await queryGoogleBasicRoute(args, { GOOGLE_ROUTES_API_KEY: '' })
    expect(exitCode).toBe(0)
    expect(report).toMatchObject({ status: 'DRY_RUN_NO_NETWORK', liveRequests: 0,
      databaseAccessed: false, quoteReady: false, request: { origin: 'Laredo, TX, USA', destination: 'Fort Smith, AR 72916, USA' } })
  })
  it('explicit empty key disables private-file fallback and live execution', async () => {
    const { exitCode, report } = await queryGoogleBasicRoute([...args, '--execute'], { GOOGLE_ROUTES_API_KEY: '' })
    expect(exitCode).toBe(2)
    expect(report).toMatchObject({ status: 'BLOCKED', code: 'MISSING_API_KEY', databaseAccessed: false })
  })
  it('executes exactly once with a synthetic key and suppresses content from retained CLI output', async () => {
    const fetcher = vi.fn(async () => response())
    vi.stubGlobal('fetch', fetcher)
    const result = await queryGoogleBasicRoute([...args, '--execute'], { GOOGLE_ROUTES_API_KEY: KEY })
    expect(result.exitCode).toBe(2)
    expect(result.report).toMatchObject({ status: 'CANDIDATE_NOT_TRUCK_VALIDATED',
      attemptsThisClient: 1, routeContentPersisted: false, truckRouteValidated: false })
    expect(result.report).not.toHaveProperty('observations')
    expect(JSON.stringify(result)).not.toContain(KEY)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it.each([[], [...args, '--retry'], [...args, '--execute', '--execute'], ['--route=../.env']].map(args => ({ args })))('rejects invalid CLI args %j', async ({ args }) => {
    const result = await queryGoogleBasicRoute(args, { GOOGLE_ROUTES_API_KEY: '' })
    expect(result.exitCode).toBe(1)
    expect(result.report.status).toMatch(/INVALID_ARGUMENTS|BLOCKED/)
  })
})
