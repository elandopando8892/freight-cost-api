import { z } from 'zod'

const API = 'https://gaia.inegi.org.mx/sakbe_v3.1/'
const DOCS = 'https://www.inegi.org.mx/servicios/Ruteo/Default.html'
const TOKEN_PAGE = `${API}genera_token.jsp`
const MAX_BYTES = 2_000_000
const text = z.string().trim().min(1).max(1000)
const decimal = z.union([z.number(), z.string().regex(/^\d+(?:\.\d+)?$/)]).transform(Number)
  .refine(value => Number.isFinite(value) && value >= 0, 'Invalid nonnegative number')
const id = z.union([z.number(), z.string().regex(/^[1-9]\d*$/)]).transform(Number)
  .refine(value => Number.isSafeInteger(value) && value > 0, 'Invalid destination id')
const tokenSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{36}$/)
const pair = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
const line = z.object({ type: z.literal('LineString'), coordinates: z.array(pair).min(2) }).passthrough()
const multiline = z.object({ type: z.literal('MultiLineString'), coordinates: z.array(z.array(pair).min(2)).min(1) }).passthrough()
const point = z.object({ type: z.literal('Point'), coordinates: pair }).passthrough()
function geometry(raw: unknown, kind: 'line' | 'point'): unknown {
  let value = raw
  if (typeof value === 'string') { try { value = JSON.parse(value) } catch { throw new SakbeError('INVALID_RESPONSE') } }
  const shape = kind === 'line' ? z.union([line, multiline]) : point
  const feature = z.object({ type: z.literal('Feature'), geometry: shape }).passthrough()
  const parsed = z.union([shape, feature, z.object({ type: z.literal('FeatureCollection'),
    features: z.array(feature).min(1) }).passthrough()]).safeParse(value)
  if (!parsed.success) throw new SakbeError('INVALID_RESPONSE')
  // Keep geometry only: provider feature properties may echo request secrets/prose.
  const cleanGeometry = (item: any): unknown => item.type === 'FeatureCollection'
    ? { type: item.type, features: item.features.map(cleanGeometry) }
    : item.type === 'Feature' ? { type: item.type, geometry: cleanGeometry(item.geometry) }
      : { type: item.type, coordinates: item.coordinates }
  return cleanGeometry(parsed.data)
}

export type SakbeErrorCode = 'MISSING_TOKEN' | 'INVALID_TOKEN' | 'ACCESS_DENIED' | 'HTTP_ERROR' |
  'TRANSPORT_ERROR' | 'REQUEST_TIMEOUT' | 'RESPONSE_TOO_LARGE' | 'INVALID_RESPONSE' | 'PROVIDER_REJECTED' | 'INVALID_INPUT'
export class SakbeError extends Error {
  constructor(public readonly code: SakbeErrorCode) { super(code); this.name = 'SakbeError' }
}
export const SakbeRouteRequestSchema = z.object({ origin: z.object({ id: id, label: text }).strict(),
  destination: z.object({ id: id, label: text }).strict(), mode: z.enum(['optima', 'cuota', 'libre']),
  axles: z.number().int().min(2).max(9), additionalAxles: z.number().int().min(0).max(5),
  equipmentConfirmed: z.literal(false), direction: z.literal('MX_TO_US'),
  candidateOnly: z.literal(true) }).strict().refine(row => row.origin.id !== row.destination.id,
  'Origin and destination must differ')
export type SakbeRouteRequest = z.input<typeof SakbeRouteRequestSchema>

/** The v mapping is SAKBE's truck tariff class, NOT SICT UI selection value.
 * It does not certify physical dimensions, loaded/empty status or operational route. */
export function sakbeTruckClass(axles: number): number {
  if (!Number.isInteger(axles) || axles < 2 || axles > 9) throw new SakbeError('INVALID_INPUT')
  return axles + 3
}
type Fetcher = (url: string, init: RequestInit) => Promise<Response>
type Options = { token?: string; fetcher?: Fetcher; now?: () => Date }
function parse<S extends z.ZodTypeAny>(schema: S, value: unknown): z.infer<S> {
  const parsed = schema.safeParse(value)
  if (!parsed.success) throw new SakbeError('INVALID_RESPONSE')
  return parsed.data
}

export function createSakbeClient(options: Options) {
  const rawToken = options.token?.trim()
  if (!rawToken) throw new SakbeError('MISSING_TOKEN')
  const checked = tokenSchema.safeParse(rawToken)
  if (!checked.success) throw new SakbeError('INVALID_TOKEN')
  const token = checked.data
  const fetcher = options.fetcher ?? fetch
  const now = options.now ?? (() => new Date())
  // Never return arbitrary provider prose/body/errors, which could echo credentials.
  const cleanText = (value: string) => value.split(token).join('[REDACTED]')
  async function post(method: 'buscadestino' | 'optima' | 'cuota' | 'libre' | 'detalle_o' | 'detalle_c' | 'detalle_l',
    parameters: Record<string, string>) {
    const body = new URLSearchParams({ ...parameters, key: token, type: 'json', proj: 'GRS80' })
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    try {
      const response = await fetcher(`${API}${method}`, { method: 'POST', body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        redirect: 'error', signal: controller.signal })
      if (response.status === 401 || response.status === 403) throw new SakbeError('ACCESS_DENIED')
      if (!response.ok) throw new SakbeError('HTTP_ERROR')
      if (!response.body) throw new SakbeError('INVALID_RESPONSE')
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let size = 0
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          size += value.byteLength
          if (size > MAX_BYTES) { await reader.cancel(); throw new SakbeError('RESPONSE_TOO_LARGE') }
          chunks.push(value)
        }
      } finally { reader.releaseLock() }
      let raw: unknown
      try { raw = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new SakbeError('INVALID_RESPONSE') }
      const envelope = parse(z.object({ response: z.object({ success: z.boolean().optional(),
        succes: z.boolean().optional(), message: z.string().optional() }).passthrough(), data: z.unknown().optional() }).passthrough(), raw)
      const state = envelope.response
      // Live denied response uses success; docs historically say succes. Conflicting flags fail closed.
      if (state.success === false || state.succes === false) {
        if (/clave|token|autorizad/i.test(state.message ?? '')) throw new SakbeError('ACCESS_DENIED')
        throw new SakbeError('PROVIDER_REJECTED')
      }
      if (state.success !== true && state.succes !== true) throw new SakbeError('INVALID_RESPONSE')
      return envelope.data
    } catch (error) {
      if (error instanceof SakbeError) throw error
      if (controller.signal.aborted) throw new SakbeError('REQUEST_TIMEOUT')
      throw new SakbeError('TRANSPORT_ERROR') // Discard fetch/parser error prose and cause.
    } finally { clearTimeout(timeout) }
  }
  function checkedRoute(rawRequest: unknown) {
    const result = SakbeRouteRequestSchema.safeParse(rawRequest)
    if (!result.success) throw new SakbeError('INVALID_INPUT')
    return result.data
  }
  function routeParameters(request: z.output<typeof SakbeRouteRequestSchema>) {
    return { dest_i: String(request.origin.id), dest_f: String(request.destination.id),
      v: String(sakbeTruckClass(request.axles)), e: String(request.additionalAxles) }
  }
  const detailMethod = { optima: 'detalle_o', cuota: 'detalle_c', libre: 'detalle_l' } as const
  function normalizeDetail(raw: unknown) {
    const rows = parse(z.array(z.object({ direccion: text, long_m: decimal, tiempo_min: decimal,
      costo_caseta: decimal, punto_caseta: z.unknown().optional(), eje_excedente: decimal.optional() }).passthrough()).min(1), raw)
    return rows.map((row, index) => ({ index, instruction: cleanText(row.direccion),
      distanceMeters: row.long_m, idealMinutes: row.tiempo_min, observedTollMxn: row.costo_caseta,
      tollPoint: row.punto_caseta == null || row.punto_caseta === '' ? null : geometry(row.punto_caseta, 'point'),
      observedExtraAxleChargeMxn: row.eje_excedente ?? null }))
  }
  function detailTotals(rows: ReturnType<typeof normalizeDetail>) {
    return { distanceKm: rows.reduce((sum, row) => sum + row.distanceMeters, 0) / 1000,
      idealMinutes: rows.reduce((sum, row) => sum + row.idealMinutes, 0),
      observedTollsMxn: rows.reduce((sum, row) => sum + row.observedTollMxn, 0) }
  }
  function detailIssues(rows: ReturnType<typeof normalizeDetail>) {
    const issues: string[] = []
    if (rows.some(row => row.observedTollMxn === 0 && row.tollPoint !== null)) issues.push('ZERO_AT_TOLL_POINT_UNVERIFIED')
    if (rows.some(row => row.observedTollMxn > 0 && row.tollPoint === null)) issues.push('CHARGED_TOLL_POINT_MISSING')
    return issues
  }
  return {
    async searchDestinations(query: string) {
      const checkedQuery = z.string().trim().min(4).max(120).safeParse(query)
      if (!checkedQuery.success) throw new SakbeError('INVALID_INPUT')
      const data = await post('buscadestino', { buscar: checkedQuery.data, num: '10' })
      const rows = parse(z.array(z.object({ id_dest: id, nombre: text, ent_abr: text,
        geojson: z.unknown() }).passthrough()).max(10), data)
      return { provider: 'INEGI_SAKBE_V3_1', query: cleanText(checkedQuery.data), retrievedAt: now().toISOString(),
        candidates: rows.map(row => ({ id: row.id_dest, label: cleanText(row.nombre), state: cleanText(row.ent_abr),
          geometry: geometry(row.geojson, 'point') })), selectedDestination: null,
        attribution: 'INEGI - API de Ruteo SAKBE', documentation: DOCS }
    },
    // Explicit research operation, never an automatic fallback for routeCandidate.
    // Row sums are not a replacement for provider summary/route geometry.
    async detailCandidate(rawRequest: unknown) {
      const request = checkedRoute(rawRequest)
      const parameters = routeParameters(request)
      const observations = normalizeDetail(await post(detailMethod[request.mode], parameters))
      const issues = ['SUMMARY_NOT_REQUESTED', 'ROUTE_GEOMETRY_UNAVAILABLE', 'SUMMARY_DETAIL_RECONCILIATION_PENDING',
        'UNCONFIRMED_ENDPOINTS_BRIDGE_AND_EQUIPMENT', 'TRUCK_RESTRICTIONS_NOT_CERTIFIED',
        'TOLL_VIGENCY_MOVEMENT_TAX_PAYMENT_PENDING', 'IDEAL_TIME_NOT_OPERATING_CYCLE', 'NOT_ADOPTED_TRIP_INPUTS',
        ...detailIssues(observations)]
      if (request.additionalAxles > 0) {
        issues.push('EXTRA_AXLE_CHARGES_SEPARATE_NOT_ADDED_TO_BASE_TOLLS')
        if (observations.some(row => row.observedExtraAxleChargeMxn === null)) issues.push('EXTRA_AXLE_COVERAGE_INCOMPLETE')
      }
      return { artifact: 'FCM_SAKBE_MX_DETAIL_CANDIDATE', status: 'INCOMPLETE', provider: 'INEGI_SAKBE_V3_1',
        retrievedAt: now().toISOString(), country: 'MX', direction: request.direction, currency: 'MXN',
        request: { ...request, origin: { ...request.origin, label: cleanText(request.origin.label) },
          destination: { ...request.destination, label: cleanText(request.destination.label) }, sakbeVehicleClass: parameters.v },
        observations: { summary: null, geometry: null, segments: observations, detailTotals: detailTotals(observations) },
        issues, serviceDate: null, tariffEffectiveDate: null, taxes: 'UNVERIFIED', paymentMethod: null,
        handoff: { loadedKm: null, emptyKm: null, cycleDays: null, tollsUsd: null },
        calibrated: false, quoteReady: false, productionReady: false, adoptedValues: 0,
        attribution: 'INEGI - API de Ruteo SAKBE', documentation: DOCS }
    },
    async routeCandidate(rawRequest: unknown) {
      const request = checkedRoute(rawRequest)
      const parameters = routeParameters(request)
      const [summaryRaw, detailRaw] = await Promise.all([post(request.mode, parameters), post(detailMethod[request.mode], parameters)])
      const summary = parse(z.object({ long_km: decimal, tiempo_min: decimal, costo_caseta: decimal,
        peaje: z.enum(['t', 'f']), geojson: z.unknown(), advertencia: z.string().nullish(),
        eje_excedente: decimal.optional() }).passthrough(), summaryRaw)
      const observations = normalizeDetail(detailRaw)
      const issues: string[] = ['UNCONFIRMED_ENDPOINTS_BRIDGE_AND_EQUIPMENT', 'TRUCK_RESTRICTIONS_NOT_CERTIFIED',
        'TOLL_VIGENCY_MOVEMENT_TAX_PAYMENT_PENDING', 'IDEAL_TIME_NOT_OPERATING_CYCLE', 'NOT_ADOPTED_TRIP_INPUTS']
      if (summary.advertencia) issues.push('PROVIDER_WARNING_PRESENT')
      if (summary.long_km === 0) issues.push('ZERO_DISTANCE_ROUTE_UNVERIFIED')
      if (request.additionalAxles > 0) issues.push('EXTRA_AXLE_CHARGES_SEPARATE_NOT_ADDED_TO_BASE_TOLLS')
      const totals = detailTotals(observations)
      const { distanceKm: detailKm, idealMinutes: detailMinutes, observedTollsMxn: detailTolls } = totals
      if (Math.abs(detailKm - summary.long_km) > 0.001) issues.push('DISTANCE_SUMMARY_DETAIL_MISMATCH')
      if (Math.abs(detailMinutes - summary.tiempo_min) > 0.01) issues.push('TIME_SUMMARY_DETAIL_MISMATCH')
      if (Math.abs(detailTolls - summary.costo_caseta) > 0.01) issues.push('TOLL_SUMMARY_DETAIL_MISMATCH')
      if (summary.peaje === 'f' && (summary.costo_caseta > 0 || detailTolls > 0)) issues.push('TOLL_FLAG_MISMATCH')
      issues.push(...detailIssues(observations))
      if (request.additionalAxles > 0 && (summary.eje_excedente === undefined || observations.some(row => row.observedExtraAxleChargeMxn === null))) {
        issues.push('EXTRA_AXLE_COVERAGE_INCOMPLETE')
      }
      return { artifact: 'FCM_SAKBE_MX_ROUTE_CANDIDATE', status: 'INCOMPLETE', provider: 'INEGI_SAKBE_V3_1',
        retrievedAt: now().toISOString(), country: 'MX', direction: request.direction, currency: 'MXN',
        request: { ...request, origin: { ...request.origin, label: cleanText(request.origin.label) },
          destination: { ...request.destination, label: cleanText(request.destination.label) }, sakbeVehicleClass: parameters.v },
        observations: { summary: { distanceKm: summary.long_km, idealMinutes: summary.tiempo_min,
          observedTollsMxn: summary.costo_caseta, tollFlag: summary.peaje,
          observedExtraAxleChargeMxn: summary.eje_excedente ?? null,
          warningPresent: !!summary.advertencia, geometry: geometry(summary.geojson, 'line') }, segments: observations,
          detailTotals: { distanceKm: detailKm, idealMinutes: detailMinutes, observedTollsMxn: detailTolls } },
        issues, serviceDate: null, tariffEffectiveDate: null, taxes: 'UNVERIFIED', paymentMethod: null,
        handoff: { loadedKm: null, emptyKm: null, cycleDays: null, tollsUsd: null },
        calibrated: false, quoteReady: false, productionReady: false, adoptedValues: 0,
        attribution: 'INEGI - API de Ruteo SAKBE', documentation: DOCS, tokenRegistration: TOKEN_PAGE }
    },
  }
}
