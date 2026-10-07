import { createHash } from 'node:crypto'
import { z } from 'zod'
import { reviewD2DRouteEvidenceLink } from './d2d-route-evidence-link.js'

// Offline annex, not a tariff importer or a second route/cost calculator.
const text = z.string().trim().min(1).max(1000)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value)
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
})
const path = z.string().regex(/^docs\/research\/(?:sources\/)?[A-Za-z0-9_-]+\.(json|html|pdf)$/)
const sha = z.string().regex(/^[a-f0-9]{64}$/)
const source = z.object({ id: text, url: z.string().url().startsWith('https://'),
  authority: z.enum(['OPERATOR', 'GOVERNMENT', 'PAYMENT_PROVIDER']),
  access: z.enum(['ARCHIVED', 'WEB_READER_UNARCHIVED']), file: path.nullable(), sha256: sha.nullable(), locator: text,
}).strict().refine(row => row.access === 'ARCHIVED'
  ? row.file !== null && row.sha256 !== null : row.file === null && row.sha256 === null)
export const MxTollReconciliationSchema = z.object({ artifact: z.literal('FCM_B2_MX_TOLL_RECONCILIATION'),
  cutDate: date, baseHead: z.string().regex(/^[a-f0-9]{40}$/), mode: z.literal('RESEARCH_ONLY_NO_TOLL_ADOPTION'),
  routeLinkPin: z.object({ file: path, sha256: sha }).strict(), sources: z.array(source).min(1),
  rows: z.array(z.object({ segmentIndex: z.number().int().nonnegative(), instruction: text,
    observedMxn: z.number().finite().nonnegative(), coverageGroup: text,
    alternatives: z.array(z.object({ sourceId: text, movement: text, class: z.enum(['C5', 'C5_C6']),
      amountMxn: z.number().finite().nonnegative(), effectiveFrom: date.nullable(),
      taxes: z.enum(['IVA_INCLUDED', 'UNVERIFIED']), paymentMethod: text.nullable(),
    }).strict()).max(10), movementConfirmed: z.literal(false), note: text,
  }).strict()).min(1),
  handoff: z.object({ tollsMxn: z.null(), tollsUsd: z.null(), serviceDate: z.null(), crossingUsd: z.null(), interchangeUsd: z.null() }).strict(),
  adoptionEligible: z.literal(false), quoteReady: z.literal(false),
}).strict()

type Context = Parameters<typeof reviewD2DRouteEvidenceLink>[1]
export function reviewMxTollReconciliation(raw: unknown, context: Context, readSource: (file: string) => Buffer) {
  const input = MxTollReconciliationSchema.parse(raw)
  const readPin = (pin: {file: string; sha256: string}) => {
    const bytes = readSource(pin.file)
    if (createHash('sha256').update(bytes).digest('hex') !== pin.sha256) throw new Error('TOLL_PIN_HASH_MISMATCH')
    return bytes
  }
  const readText = (file: string) => readSource(file).toString('utf8')
  const link = JSON.parse(readPin(input.routeLinkPin).toString('utf8'))
  const route = reviewD2DRouteEvidenceLink(link, context, readText)
  if (input.baseHead !== context.baseHead || input.cutDate < link.cutDate || input.cutDate < context.cutDate ||
      JSON.parse(readText(link.requestPin.file)).axles !== 5) throw new Error('TOLL_CASE_OR_PROFILE_MISMATCH')
  const sources = new Map(input.sources.map(row => [row.id, row]))
  if (sources.size !== input.sources.length) throw new Error('DUPLICATE_TOLL_SOURCE')
  const archived = input.sources.filter(row => row.access === 'ARCHIVED')
  if (new Set(archived.map(row => row.file)).size !== archived.length) throw new Error('DUPLICATE_TOLL_SOURCE_FILE')
  for (const row of archived) {
    // Hash the raw bytes: HTML/PDF are not decoded before integrity checks.
    readPin({file: row.file!, sha256: row.sha256!})
  }
  const segments = JSON.parse(readText(link.detailPin.file)).observations.segments as {
    index: number; instruction: string; observedTollMxn: number; tollPoint: unknown;
  }[]
  const tolls = segments.filter(row => row.tollPoint !== null || row.observedTollMxn > 0)
  if (input.rows.length !== tolls.length || new Set(input.rows.map(row => row.segmentIndex)).size !== input.rows.length ||
      input.rows.some((row, index) => row.segmentIndex !== tolls[index].index || row.instruction !== tolls[index].instruction ||
      row.observedMxn !== tolls[index].observedTollMxn)) throw new Error('TOLL_SEGMENT_COVERAGE_MISMATCH')
  const rows = input.rows.map(row => {
    const seen = new Set<string>()
    for (const alternative of row.alternatives) {
      if (!sources.has(alternative.sourceId)) throw new Error('TOLL_SOURCE_MISSING')
      if (alternative.effectiveFrom && alternative.effectiveFrom > input.cutDate) throw new Error('TOLL_TARIFF_AFTER_CUT')
      const key = `${alternative.sourceId}:${alternative.movement}`
      if (seen.has(key)) throw new Error('DUPLICATE_TOLL_ALTERNATIVE')
      seen.add(key)
    }
    const matches = row.alternatives.filter(value => value.amountMxn === row.observedMxn)
    const status = row.observedMxn === 0 ? 'ZERO_UNVERIFIED'
      : matches.some(value => value.effectiveFrom !== null) ? 'DATED_NUMERIC_MATCH_ONLY'
      : matches.length ? 'UNDATED_NUMERIC_MATCH_ONLY'
      : row.alternatives.length ? 'NUMERIC_CONFLICT_OR_OTHER_MOVEMENT' : 'NO_APPLICABLE_PRIMARY_TARIFF'
    return {...row, status, adoptionEligible: false as const}
  })
  const usedSources = new Set(rows.flatMap(row => row.alternatives.map(alt => alt.sourceId)))
  if (input.sources.some(row => !usedSources.has(row.id))) throw new Error('UNUSED_TOLL_SOURCE')
  const grouped = new Map<string, number[]>()
  for (const row of rows) grouped.set(row.coverageGroup, [...(grouped.get(row.coverageGroup) ?? []), row.segmentIndex])
  return { artifact: input.artifact, status: 'INCOMPLETE' as const, mode: input.mode,
    sourcePinsVerified: archived.length + 1, routePinsVerified: route.sourcePinsVerified, routePins: route.pins,
    unarchivedSources: input.sources.filter(row => row.access !== 'ARCHIVED').map(row => row.id),
    sources: input.sources, rows, tollPointCount: tolls.length,
    datedNumericMatches: rows.filter(row => row.status === 'DATED_NUMERIC_MATCH_ONLY').length,
    undatedNumericMatches: rows.filter(row => row.status === 'UNDATED_NUMERIC_MATCH_ONLY').length,
    missingPrimaryTariffs: rows.filter(row => row.status === 'NO_APPLICABLE_PRIMARY_TARIFF').map(row => row.segmentIndex),
    unsupportedZeroPoints: rows.filter(row => row.status === 'ZERO_UNVERIFIED').map(row => row.segmentIndex),
    coverageGroupsToReview: [...grouped].filter(([,indices]) => indices.length > 1).map(([group,segmentIndices]) => ({group,segmentIndices})),
    // Even a dated numeric match has no approved service, equipment, movement or payable amount.
    approvedTollPoints: 0, approvedTotalMxn: null, handoff: input.handoff,
    adoptionEligible: false, tripInputsChanged: false, calibrated: false, quoteReady: false, productionReady: false,
    adoptedValues: 0, compositorInvoked: false, networkAccessed: false, databaseAccessed: false,
  }
}
