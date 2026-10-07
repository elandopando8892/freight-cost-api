import { createHash } from 'node:crypto'
import { readFileSync, realpathSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

// Offline evidence review only. No engine, Prisma, network, defaults or trip writes.
const text = z.string().min(1)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value)
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}, 'Invalid calendar date')
const sha = z.string().regex(/^[a-f0-9]{64}$/)
const localPath = z.string().regex(/^docs\/research\/(?:sources\/)?[A-Za-z0-9_-]+\.(json|html|pdf)$/)
const amount = z.number().finite().nonnegative()
const source = z.object({ id: text, url: z.string().url().startsWith('https://'),
  access: z.enum(['DIRECT_ARCHIVED', 'DIRECT_UNARCHIVED', 'LIVE_BROWSER_TRANSCRIPTION', 'INDEXED_ONLY_DIRECT_403']),
  file: localPath.nullable(), sha256: sha.nullable(), locator: text }).strict().refine(row =>
  row.access === 'DIRECT_ARCHIVED' ? row.file !== null && row.sha256 !== null : row.file === null && row.sha256 === null,
  'Archive access and pin must agree')
const status = z.enum(['VALUE_MATCH_NOT_TRIP_APPROVAL', 'MISMATCH_AND_MOVEMENT_UNRESOLVED',
  'MISMATCH_AND_COVERAGE_UNRESOLVED', 'ZERO_NOT_SUPPORTED', 'ZERO_AND_MOVEMENT_UNRESOLVED',
  'OPERATOR_TARIFF_UNVERIFIED', 'UNDATED_BRIDGE_NOT_ADOPTABLE'])
const pendingTrip = z.object({ mxLoadedKm: z.null(), mxEmptyKm: z.null(), mxCycleDays: z.null(),
  mxTollsUsd: z.null(), usLoadedKm: z.null(), usEmptyKm: z.null(), usCycleDays: z.null(), usTollsUsd: z.null(),
  sharedTrailerCycleDays: z.null(), borderChargesUsd: z.null(), buyRateUsd: z.null(), sellPriceUsd: z.null() }).strict()
export const RouteEvidenceSchema = z.object({ artifact: z.literal('FCM_B2_D2D_ROUTE_PUBLIC_CANDIDATE'),
  cutDate: date, baseHead: z.string().regex(/^[a-f0-9]{40}$/), mode: z.literal('RESEARCH_ONLY_NO_TRIP_ADOPTION'),
  casePin: z.object({ file: localPath, sha256: sha }).strict(), sources: z.array(source).min(1),
  candidate: z.object({ id: text, origin: text, destination: text, direction: z.literal('MX_TO_US'),
    axles: z.literal(5), selection: z.literal('DETAILED_PUBLIC_REFERENCE_NOT_OPERATIONAL_SELECTION'),
    originIsUserDeliveryAddress: z.literal(false), bridgeChosenByUser: z.literal(false),
    equipmentConfirmed: z.literal(false), truckRouteValidated: z.literal(false),
    timeBasis: z.literal('CAR_CONSTANT_SPEED_NO_STOPS_NOT_TRUCK_CYCLE'), currency: z.literal('MXN'),
    plannerTariffEffectiveDate: z.null(),
    publishedTotals: z.object({ km: amount, minutes: amount, tollsMxn: amount }).strict(),
    rowColumns: z.tuple([z.literal('segment'), z.literal('state'), z.literal('road'), z.literal('km'),
      z.literal('carTimeHHmm'), z.literal('plaza'), z.literal('displayedAmountMxn')]),
    rows: z.array(z.tuple([text, text, text, amount, z.string().regex(/^\d{2}:[0-5]\d$/),
      text.nullable(), amount.nullable()])).min(1),
  }).strict(),
  contrasts: z.array(z.object({ plaza: text, sourceId: text, class: text, publishedAmountMxn: amount.nullable(),
    effectiveFrom: date.nullable(), status, note: text }).strict()).min(1),
  excludedLaredoObservation: z.object({ sourceId: text, direction: z.literal('US_TO_MX'),
    historicalUsdPerAxle: amount, historicalApprovalDate: date, supersedingOrdinance: text,
    supersedingApprovalDate: date, currentRevisedRate: z.null(), adopted: z.literal(false) }).strict(),
  handoff: pendingTrip,
  decision: z.object({ itineraryStatus: z.literal('CANDIDATE_PARTIAL_NOT_VALIDATED'), calibrated: z.literal(false),
    quoteReady: z.literal(false), productionReady: z.literal(false), adoptedValues: z.literal(0),
    businessGatesClosed: z.literal(0), businessGatesTotal: z.literal(4),
    next: z.literal('VALIDATE_ROUTING_API_BEFORE_FURTHER_MANUAL_CAPTURE') }).strict(),
}).strict()

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export function readRouteSource(path: string): Buffer {
  localPath.parse(path)
  const resolved = realpathSync(resolve(repoRoot, path))
  const fromRoot = relative(realpathSync(repoRoot), resolved)
  if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || resolve(repoRoot, fromRoot) !== resolved) {
    throw new Error('SOURCE_OUTSIDE_REPO')
  }
  return readFileSync(resolved)
}
export function reviewD2DRouteEvidence(raw: unknown, readSource: (path: string) => Buffer = readRouteSource) {
  const input = RouteEvidenceSchema.parse(raw)
  const sources = new Map(input.sources.map(row => [row.id, row]))
  if (sources.size !== input.sources.length) throw new Error('DUPLICATE_SOURCE')
  const pinned = [input.casePin, ...input.sources.filter(row => row.file !== null).map(row => ({ file: row.file!, sha256: row.sha256! }))]
  for (const pin of pinned) {
    if (createHash('sha256').update(readSource(pin.file)).digest('hex') !== pin.sha256) throw new Error(`HASH_MISMATCH:${pin.file}`)
  }
  const caseInput = JSON.parse(readSource(input.casePin.file).toString('utf8'))
  if (caseInput.artifact !== 'FCM_B2_D2D_PUBLIC_REFERENCE_READINESS_CASE' || caseInput.baseHead !== input.baseHead ||
    caseInput.cutDate > input.cutDate || caseInput.direction !== input.candidate.direction ||
    caseInput.route?.mxEndpoint !== 'Mexico, DF' || caseInput.route?.mxGateway !== 'Nuevo Laredo' ||
    caseInput.route?.usGateway !== 'Laredo' || caseInput.route?.usEndpoint !== 'Fort Smith, AR 72916') throw new Error('CASE_LINEAGE_MISMATCH')
  const rows = input.candidate.rows
  const plazas = rows.filter(row => row[5] !== null)
  if (new Set(plazas.map(row => row[5])).size !== plazas.length) throw new Error('DUPLICATE_PLANNED_PLAZA')
  if (new Set(input.contrasts.map(row => row.plaza)).size !== input.contrasts.length) throw new Error('DUPLICATE_CONTRAST')
  for (const row of rows) {
    if ((row[5] === null) !== (row[6] === null)) throw new Error('PLAZA_AMOUNT_MISMATCH')
  }
  if (input.contrasts.length !== plazas.length) throw new Error('CONTRAST_COVERAGE_MISMATCH')
  for (const contrast of input.contrasts) {
    const planned = plazas.find(row => row[5] === contrast.plaza)
    if (!planned || !sources.has(contrast.sourceId)) throw new Error('CONTRAST_REFERENCE_MISSING')
    if (contrast.effectiveFrom !== null && contrast.effectiveFrom > input.cutDate) throw new Error('TARIFF_AFTER_CUT')
    if (contrast.status === 'VALUE_MATCH_NOT_TRIP_APPROVAL' && (contrast.publishedAmountMxn === null ||
      contrast.effectiveFrom === null || sources.get(contrast.sourceId)!.access !== 'DIRECT_ARCHIVED' ||
      contrast.publishedAmountMxn !== planned[6])) throw new Error('CLAIMED_MATCH_INVALID')
  }
  if (!sources.has('SICT_ROUTE') || sources.get('SICT_ROUTE')!.access !== 'LIVE_BROWSER_TRANSCRIPTION' ||
    !sources.has(input.excludedLaredoObservation.sourceId)) throw new Error('SOURCE_ACCESS_MISMATCH')
  // Exact integer thousandths avoid a floating-point false mismatch, no FX/cost conversion.
  const rowKm = rows.reduce((sum, row) => sum + Math.round(row[3] * 1000), 0) / 1000
  const rowMinutes = rows.reduce((sum, row) => { const [h, m] = row[4].split(':').map(Number); return sum + h * 60 + m }, 0)
  const rowTolls = plazas.reduce((sum, row) => sum + row[6]!, 0)
  const published = input.candidate.publishedTotals
  const unresolved = input.contrasts.filter(row => row.status !== 'VALUE_MATCH_NOT_TRIP_APPROVAL')
  return { status: 'INCOMPLETE' as const, mode: input.mode, candidateId: input.candidate.id,
    sourcePinsVerified: pinned.length, archivedSources: input.sources.filter(row => row.access === 'DIRECT_ARCHIVED').length,
    segmentCount: rows.length, plazaCount: plazas.length,
    transcriptionTotals: { km: rowKm, minutes: rowMinutes, tollsMxn: rowTolls },
    publishedTotals: published, differences: { km: Number((rowKm - published.km).toFixed(3)),
      minutes: rowMinutes - published.minutes, tollsMxn: rowTolls - published.tollsMxn },
    valueMatches: input.contrasts.length - unresolved.length,
    unresolvedTariffs: unresolved.map(row => ({ plaza: row.plaza, status: row.status })),
    unsupportedZeroPlazas: plazas.filter(row => row[6] === 0).map(row => row[5]),
    excludedDirection: input.excludedLaredoObservation.direction,
    notes: ['Numeric match is not movement, direction, validity or truck route approval.',
      'Displayed zero/blank and unknown US tolls are not certified free passage.',
      'Planner rows/total discrepancies require review, not automatic row repair.',
      'Do not sum route total, aggregate sections, alternative plazas or shared CEM/CAPUFE coverage.',
      'No geometry, operating cycle, economic rate or border interchange inferred.'],
    handoff: input.handoff, calibrated: false, quoteReady: false, productionReady: false,
    compositorInvoked: false, databaseAccessed: false, adoptedValues: 0 }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const file = process.argv[2] ?? 'docs/research/B2_D2D_ROUTE_ITINERARY_EVIDENCE_2026-09-30.json'
    console.log(JSON.stringify(reviewD2DRouteEvidence(JSON.parse(readRouteSource(file).toString('utf8'))), null, 2))
    process.exitCode = 2 // Expected incomplete public reference, not a crash or quote.
  } catch (error) { console.error(error instanceof Error ? error.message : 'ROUTE_REVIEW_FAILED'); process.exitCode = 1 }
}
