import { createHash } from 'node:crypto'
import { z } from 'zod'
import { SakbeRouteRequestSchema, sakbeTruckClass } from './sakbe.client.js'

// Offline research attachment only. No engine, database, token, fetch or input adoption.
const text = z.string().trim().min(1).max(1000)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value)
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
})
const pin = z.object({ file: z.string().regex(/^docs\/research\/[A-Za-z0-9_-]+\.json$/),
  sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict()
const binding = z.object({ casePoint: text, referenceId: z.number().int().positive(), referenceLabel: text }).strict()
export const D2DRouteEvidenceLinkSchema = z.object({
  artifact: z.literal('FCM_B2_D2D_ROUTE_EVIDENCE_LINK'), cutDate: date,
  baseHead: z.string().regex(/^[a-f0-9]{40}$/), caseReference: text,
  mode: z.literal('RESEARCH_PARTIAL_NO_TRIP_ADOPTION'),
  casePin: pin, requestPin: pin, detailPin: pin,
  binding: z.object({ country: z.literal('MX'), direction: z.literal('MX_TO_US'),
    origin: binding, gateway: binding }).strict(),
  approval: z.object({ operationalEndpointsConfirmed: z.literal(false), bridgeChosen: z.literal(false),
    equipmentConfirmed: z.literal(false), tariffsApproved: z.literal(false) }).strict(),
}).strict()
const amount = z.number().finite().nonnegative()
const point = z.object({ type: z.literal('Point'),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]) }).strict()
const feature = z.object({ type: z.literal('Feature'), geometry: point }).strict()
const tollPoint = z.union([point, feature, z.object({ type: z.literal('FeatureCollection'),
  features: z.array(feature).min(1) }).strict()])
const pendingTrip = z.object({ loadedKm: z.null(), emptyKm: z.null(), cycleDays: z.null(), tollsUsd: z.null() }).strict()
const totalsSchema = z.object({ distanceKm: amount, idealMinutes: amount, observedTollsMxn: amount }).strict()
const detailSchema = z.object({ artifact: z.literal('FCM_SAKBE_MX_DETAIL_CANDIDATE'), status: z.literal('INCOMPLETE'),
  provider: z.literal('INEGI_SAKBE_V3_1'), retrievedAt: z.string().datetime(), country: z.literal('MX'),
  direction: z.literal('MX_TO_US'), currency: z.literal('MXN'), request: z.unknown(),
  observations: z.object({ summary: z.null(), geometry: z.null(),
    segments: z.array(z.object({ index: z.number().int().nonnegative(), instruction: text,
      distanceMeters: amount, idealMinutes: amount, observedTollMxn: amount,
      tollPoint: tollPoint.nullable(), observedExtraAxleChargeMxn: amount.nullable() }).strict()).min(1).max(10000),
    detailTotals: totalsSchema }).strict(), issues: z.array(text).min(1).max(30),
  serviceDate: z.null(), tariffEffectiveDate: z.null(), taxes: z.literal('UNVERIFIED'), paymentMethod: z.null(),
  handoff: pendingTrip, calibrated: z.literal(false), quoteReady: z.literal(false),
  productionReady: z.literal(false), adoptedValues: z.literal(0),
  attribution: z.literal('INEGI - API de Ruteo SAKBE'),
  documentation: z.literal('https://www.inegi.org.mx/servicios/Ruteo/Default.html'),
}).strict()

type CaseContext = { artifact: string; baseHead: string; cutDate: string; caseReference: string; direction: string;
  routeSelectionSource: string; mode: string; consolidation: unknown;
  route: { mxEndpoint: string; mxGateway: string; usGateway: string; usEndpoint: string } }
function same(a: unknown, b: unknown): boolean {
  // Key order is irrelevant for JSON documents. All callers supply parsed/schema-checked JSON.
  const normalize = (value: any): any => Array.isArray(value) ? value.map(normalize)
    : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])])) : value
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b))
}

export function reviewD2DRouteEvidenceLink(raw: unknown, context: CaseContext, readSource: (file: string) => string) {
  const input = D2DRouteEvidenceLinkSchema.parse(raw)
  if (new Set([input.casePin.file, input.requestPin.file, input.detailPin.file]).size !== 3) throw new Error('DUPLICATE_ROUTE_PIN')
  const readPin = (source: z.infer<typeof pin>) => {
    const bytes = readSource(source.file)
    if (createHash('sha256').update(bytes).digest('hex') !== source.sha256) throw new Error('ROUTE_PIN_HASH_MISMATCH')
    return JSON.parse(bytes)
  }
  const pinnedCase = readPin(input.casePin)
  if (!same(pinnedCase, context) || input.baseHead !== context.baseHead || input.caseReference !== context.caseReference ||
    input.cutDate < context.cutDate || input.binding.direction !== context.direction) throw new Error('ROUTE_CASE_LINEAGE_MISMATCH')
  const request = SakbeRouteRequestSchema.parse(readPin(input.requestPin))
  const detail = detailSchema.parse(readPin(input.detailPin))
  const detailRequest = z.object({ ...SakbeRouteRequestSchema.innerType().shape,
    sakbeVehicleClass: z.string() }).strict().parse(detail.request)
  const { sakbeVehicleClass, ...requestFields } = detailRequest
  if (!same(request, requestFields) || sakbeVehicleClass !== String(sakbeTruckClass(request.axles))) throw new Error('ROUTE_REQUEST_MISMATCH')
  if (detail.retrievedAt.slice(0, 10) > input.cutDate || request.direction !== context.direction) throw new Error('ROUTE_OBSERVATION_AFTER_CUT_OR_DIRECTION')
  const origin = input.binding.origin, gateway = input.binding.gateway
  if (origin.casePoint !== context.route.mxEndpoint || gateway.casePoint !== context.route.mxGateway ||
    origin.referenceId !== request.origin.id || origin.referenceLabel !== request.origin.label ||
    gateway.referenceId !== request.destination.id || gateway.referenceLabel !== request.destination.label) throw new Error('ROUTE_POINT_BINDING_MISMATCH')
  const rows = detail.observations.segments
  if (rows.some((row, index) => row.index !== index)) throw new Error('ROUTE_SEGMENT_SEQUENCE_MISMATCH')
  const totals = { distanceKm: rows.reduce((sum, row) => sum + row.distanceMeters, 0) / 1000,
    idealMinutes: rows.reduce((sum, row) => sum + row.idealMinutes, 0),
    observedTollsMxn: rows.reduce((sum, row) => sum + row.observedTollMxn, 0) }
  if (Object.entries(totals).some(([key, value]) => Math.abs(value - detail.observations.detailTotals[key as keyof typeof totals]) > 1e-8)) {
    throw new Error('ROUTE_DETAIL_TOTALS_MISMATCH')
  }
  const requiredIssues = ['SUMMARY_NOT_REQUESTED', 'ROUTE_GEOMETRY_UNAVAILABLE', 'SUMMARY_DETAIL_RECONCILIATION_PENDING',
    'UNCONFIRMED_ENDPOINTS_BRIDGE_AND_EQUIPMENT', 'TRUCK_RESTRICTIONS_NOT_CERTIFIED',
    'TOLL_VIGENCY_MOVEMENT_TAX_PAYMENT_PENDING', 'IDEAL_TIME_NOT_OPERATING_CYCLE', 'NOT_ADOPTED_TRIP_INPUTS']
  if (requiredIssues.some(code => !detail.issues.includes(code))) throw new Error('ROUTE_PARTIAL_LIMITS_MISSING')
  const zeros = rows.filter(row => row.tollPoint !== null && row.observedTollMxn === 0)
  const unlocated = rows.filter(row => row.tollPoint === null && row.observedTollMxn > 0)
  const gaps = [
    { stage: 'mx', code: 'MX_SUMMARY_GEOMETRY_PENDING', fields: ['mx.trip.loadedKm'], action: 'Reconcile provider summary/route geometry; do not treat row sum as operational loaded distance.' },
    { stage: 'route', code: 'OPERATIONAL_ROUTE_EQUIPMENT_PENDING', fields: ['route.mxEndpoint', 'route.mxGateway'], action: 'Confirm load address, commercial bridge/access and actual equipment/restrictions; reference points are not operational selection.' },
    { stage: 'mx', code: 'MX_TOLL_VIGENCY_MOVEMENT_PENDING', fields: ['mx.trip.tollsUsd'], action: 'Verify operator tariff/date/movement/tax/payment and zero/coverage; no automatic conversion or adoption.' },
    { stage: 'borderCharges', code: 'CROSSING_INTERCHANGE_COVERAGE_PENDING', fields: ['borderCharges.CROSSING', 'borderCharges.INTERCHANGE'], action: 'Document crossing/interchange amounts and inclusions once; reaching a named port does not prove bridge transit or free passage.' },
    { stage: 'us', code: 'US_ROUTE_EVIDENCE_MISSING', fields: ['us.trip.loadedKm', 'us.trip.tollsUsd'], action: `Obtain compatible commercial-truck route/tolls from ${context.route.usGateway} to ${context.route.usEndpoint}; MX evidence does not cover US.` },
    { stage: 'case', code: 'EMPTY_DISTANCE_OPERATING_CYCLE_PENDING', fields: ['mx.trip.emptyKm', 'mx.trip.cycleDays', 'us.trip.emptyKm', 'us.trip.cycleDays', 'sharedTrailer.totalKm', 'sharedTrailer.cycleDays'], action: 'Document empty positioning, waits/rest/loading and one physical trailer cycle; ideal driving minutes are not productive cycle days.' },
    { stage: 'case', code: 'SERVICE_DATE_FX_PENDING', fields: ['serviceDate', 'mx.trip.tollsUsd'], action: 'Confirm service date and governed FX only after tariff scope; MXN observations are not USD inputs.' },
  ]
  return { artifact: input.artifact, status: 'INCOMPLETE', mode: input.mode,
    evidenceLinked: true, sourcePinsVerified: 3, pins: { case: input.casePin, request: input.requestPin, detail: input.detailPin },
    provider: detail.provider, retrievedAt: detail.retrievedAt, attribution: detail.attribution, documentation: detail.documentation,
    researchBinding: input.binding, operationalApproval: input.approval,
    observedMxDetail: { currency: detail.currency, segmentCount: rows.length,
      tollPointCount: rows.filter(row => row.tollPoint !== null).length,
      positiveTollCount: rows.filter(row => row.observedTollMxn > 0).length,
      rowSums: totals, summary: null, routeGeometry: null,
      unverifiedZeroTollPoints: zeros, chargedTollsWithoutPoint: unlocated },
    coverage: { mx: 'DETAIL_ONLY_NOT_OPERATIONAL', border: 'UNVERIFIED', us: 'NO_EVIDENCE', operatingCycle: 'NO_EVIDENCE' },
    providerIssues: detail.issues, gaps,
    gapCountsByStage: Object.fromEntries(['case', 'route', 'mx', 'us', 'borderCharges'].map(stage => [stage, gaps.filter(row => row.stage === stage).length])),
    // Separate attachment; never merge these observations into readiness.lineage.
    adoptionEligible: false, tripInputsChanged: false, calibrated: false, quoteReady: false,
    productionReady: false, adoptedValues: 0, compositorInvoked: false, networkAccessed: false, databaseAccessed: false }
}
