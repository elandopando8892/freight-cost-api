import { z } from 'zod'

// Pure wire contract, shared with the web reader. No calculator or persistence imports.
export const relayCycles = ['NETWORK_EXPECTED_EMPTY_PROXY', 'DEDICATED_EMPTY_SAME_BOX_RETURN'] as const
export const relayFunding = ['CASH', 'FINANCED'] as const
export const relayDates = ['2026-09-28', '2026-09-29', '2026-09-30'] as const
export const relayRest = ['RATE_EXCLUDES_WEEKLY_REST', 'RATE_INCLUDES_WEEKLY_REST'] as const
const digest = z.string().regex(/^[a-f0-9]{64}$/)
const amount = z.number().finite().nonnegative()
const resourceId = z.enum(['MX_TRACTOR', 'US_TRACTOR', 'SHARED_TRAILER'])
export const RelayQuery = z.object({
  cycleId: z.enum(relayCycles).default(relayCycles[0]), fundingMode: z.enum(relayFunding).default('CASH'),
  fxDate: z.enum(relayDates).default('2026-09-30'), restInterpretation: z.enum(relayRest).default(relayRest[0]),
  expectedSnapshot: digest.optional(),
}).strict()
export type RelayContext = Pick<z.infer<typeof RelayQuery>, 'cycleId' | 'fundingMode' | 'fxDate' | 'restInterpretation'>
const evidence = z.object({ id: z.string().min(1), url: z.string().url().refine(v => new URL(v).protocol === 'https:'),
  locator: z.string().min(1), limitations: z.string().min(1), observedAt: z.string().min(1) }).strict()
const resource = z.object({ resourceId, monthlyFixedUsd: amount, byDistanceUsd: amount, byTimeUsd: amount,
  cfuUsd: amount, cvuUsd: amount, costUsd: amount }).strict()
const variable = z.object({ conceptId: z.string().min(1), resourceId,
  disposition: z.enum(['DOCUMENTED_COMPONENT', 'DOCUMENTED_EXCLUSION']), amountUsd: amount.nullable(),
  evidenceIds: z.array(z.string().min(1)).min(1), derivation: z.string().min(1), exclusionOrZeroRationale: z.string().nullable(),
}).strict()
export const RelayCase = z.object({ cycleId: z.enum(relayCycles), fundingMode: z.enum(relayFunding),
  fxDate: z.enum(relayDates), restInterpretation: z.enum(relayRest), mxnPerUsd: amount.positive(),
  sharedBoxAllocationCount: z.literal(1), resources: z.array(resource).length(3),
  outputs: z.object({ cfuUsd: amount, cvuUsd: amount, productiveCostUsd: amount, purchaseUsd: z.null(), sellUsd: z.null() }).strict(),
  reserves: z.array(z.string().min(1)).length(6), variableCosts: z.array(variable).length(20),
  fixedEvidenceIds: z.array(z.string().min(1)).min(1),
}).strict().superRefine((v, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message })
  if (new Set(v.resources.map(r => r.resourceId)).size !== 3) fail('RELAY_RESOURCE_DUPLICATE')
  if (new Set(v.variableCosts.map(r => r.conceptId)).size !== 20) fail('RELAY_VARIABLE_DUPLICATE')
  const equal = (a: number, b: number) => Math.abs(a - b) < 1e-7 * Math.max(1, Math.abs(a), Math.abs(b))
  for (const r of v.resources) if (!equal(r.cfuUsd + r.cvuUsd, r.costUsd)) fail('RELAY_RESOURCE_SUM')
  for (const field of ['cfuUsd', 'cvuUsd', 'costUsd'] as const) {
    const expected = field === 'costUsd' ? v.outputs.productiveCostUsd : v.outputs[field]
    if (!equal(v.resources.reduce((s, r) => s + r[field], 0), expected)) fail('RELAY_TOTAL_SUM')
  }
  for (const row of v.variableCosts) {
    if (row.disposition === 'DOCUMENTED_COMPONENT' && row.amountUsd === null) fail('RELAY_MISSING_AMOUNT')
    if (row.disposition === 'DOCUMENTED_EXCLUSION' && (row.amountUsd !== null || !row.exclusionOrZeroRationale)) fail('RELAY_INVALID_EXCLUSION')
  }
  for (const r of v.resources) {
    const total = v.variableCosts.filter(v => v.resourceId === r.resourceId).reduce((s, v) => s + (v.amountUsd ?? 0), 0)
    if (!equal(total, r.cvuUsd)) fail('RELAY_VARIABLE_SUM')
  }
})
const metadata = {
  model: z.literal('FCM_B2_OWN_RELAY_REVIEW_V1'), referencePeriod: z.literal('2026-09'),
  borderProcess: z.literal('OWN_RELAY_SAME_TRAILER'), sourceScenarioSha256: digest,
  calibrated: z.literal(false), quoteReady: z.literal(false), adoptedValues: z.literal(0),
  actualCarrierCostObserved: z.literal(false), notesPersisted: z.literal(false),
  comparisonOnly: z.literal(true), limitations: z.array(z.string().min(1)).min(1),
}
export const RelayPayload = z.object({ ...metadata,
  sourcePins: z.array(z.object({ id: z.string().min(1), file: z.string().min(1), sha256: digest,
    hashPolicy: z.literal('UTF8_CRLF_TO_LF_NO_OTHER_NORMALIZATION').optional() }).strict()).min(1),
  cases: z.array(RelayCase).length(24), evidence: z.array(evidence).min(1),
}).strict().superRefine((v, ctx) => {
  const key = (c: RelayContext) => `${c.cycleId}:${c.fundingMode}:${c.fxDate}:${c.restInterpretation}`
  if (new Set(v.cases.map(key)).size !== 24 || new Set(v.evidence.map(e => e.id)).size !== v.evidence.length)
    ctx.addIssue({ code: 'custom', message: 'RELAY_DUPLICATE_CONTEXT_OR_EVIDENCE' })
  const ids = new Set(v.evidence.map(e => e.id))
  for (const c of v.cases) for (const id of [...c.fixedEvidenceIds, ...c.variableCosts.flatMap(v => v.evidenceIds)])
    if (!ids.has(id)) ctx.addIssue({ code: 'custom', message: 'RELAY_UNKNOWN_EVIDENCE' })
})
export const RelaySnapshot = z.object({ sha256: digest, payload: RelayPayload }).strict()
export const RelayResponse = z.object({ ...metadata, sha256: digest, sourcePinCount: z.number().int().positive(),
  scope: z.object({ sub: z.string().min(1), orgId: z.string().min(1) }).strict(), case: RelayCase,
  evidence: z.array(evidence).min(1),
}).strict()
export type RelayReview = z.infer<typeof RelayResponse>
