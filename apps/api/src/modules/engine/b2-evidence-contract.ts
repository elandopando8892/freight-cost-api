import { z } from 'zod'

export const B2Cycle = z.enum(['NETWORK_EXPECTED_EMPTY_PROXY', 'DEDICATED_EMPTY_SAME_BOX_RETURN'])
export const B2Funding = z.enum(['CASH', 'FINANCED'])
const digest = z.string().regex(/^[a-f0-9]{64}$/)
const source = z.object({ id: z.string().min(1), title: z.string().min(1),
  url: z.string().url().refine(v => new URL(v).protocol === 'https:'),
  kind: z.enum(['LODGING_COMPARATOR', 'MEAL_CONTEXT_NOT_LODGING']),
  observedOn: z.literal('2026-10-03'), historicalSeptemberPriceVerified: z.literal(false),
  comparisonValue: z.number().finite().nonnegative().nullable(), currency: z.enum(['MXN', 'USD']),
  unit: z.string().min(1), taxBasisVerified: z.literal(false), selectedForCostEngine: z.literal(false),
  limitation: z.string().min(1) }).strict()
export const B2EvidenceRow = z.object({ id: z.enum(['MX_TRAVEL_EXPENSES', 'US_DRIVER_TOTAL']),
  country: z.enum(['MX', 'US']), title: z.string().min(1), canonicalKey: z.null(),
  valueUsdPerCycle: z.null(), included: z.string().min(1), missing: z.array(z.string().min(1)).min(1),
  sources: z.array(source).min(1), effect: z.string().min(1) }).strict()
export const B2EvidenceCase = z.object({ cycleId: B2Cycle, fundingMode: B2Funding,
  historicalReferencePeriod: z.literal('2026-10'), acceptedForUserReferencePeriod: z.literal(false),
  issues: z.array(z.object({ field: z.string(), code: z.string().min(1), rationale: z.string().min(1) }).strict()).min(1),
  fixedRemainders: z.array(z.string().min(1)).min(1), variableRemainders: z.array(z.string().min(1)).min(1),
  outputs: z.object({ cfuUsd: z.null(), cvuUsd: z.null(), productiveCostUsd: z.null(), purchaseUsd: z.null(), sellUsd: z.null() }).strict(),
  rows: z.tuple([B2EvidenceRow, B2EvidenceRow]) }).strict()
export const B2EvidencePayload = z.object({ model: z.literal('FCM_B2_READ_EVIDENCE_V1'),
  profileId: z.literal('B2_USER_SCOPE_20261003'), referencePeriod: z.literal('2026-09'),
  sourceObservedOn: z.literal('2026-10-03'), capture: z.literal('PINNED_LOCAL_PUBLIC_RESEARCH_NOT_LIVE_SOURCE_ARCHIVE'),
  caseReference: z.string().min(1), presetPolicy: z.literal('EXISTING_COMPARISON_PRESETS_NOT_USER_FINANCE_SELECTION'),
  producerHashPolicy: z.literal('UTF8_CRLF_TO_LF_NO_OTHER_NORMALIZATION'),
  calibrated: z.literal(false), quoteReady: z.literal(false), adoptedValues: z.literal(0),
  arithmeticComplete: z.literal(false), notesPersisted: z.literal(false), canonicalParameterCount: z.literal(210),
  producerPins: z.array(z.object({ file: z.string().min(1), sha256: digest }).strict()).min(1),
  sourcePins: z.array(z.object({ id: z.string().min(1), file: z.string().min(1), sha256: digest }).strict()).min(1),
  cases: z.array(B2EvidenceCase).length(4) }).strict().superRefine((v, ctx) => {
  if (new Set(v.cases.map(c => `${c.cycleId}:${c.fundingMode}`)).size !== 4)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'B2_DUPLICATE_CONTEXT' })
  for (const c of v.cases) if (c.rows[0].id !== 'MX_TRAVEL_EXPENSES' || c.rows[1].id !== 'US_DRIVER_TOTAL')
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'B2_INVALID_ROW_ORDER' })
})
export const B2EvidenceSnapshot = z.object({ sha256: digest, payload: B2EvidencePayload }).strict()
export const B2EvidenceQuery = z.object({ profileId: z.literal('B2_USER_SCOPE_20261003').default('B2_USER_SCOPE_20261003'),
  referencePeriod: z.literal('2026-09').default('2026-09'),
  cycleId: B2Cycle.default('NETWORK_EXPECTED_EMPTY_PROXY'), fundingMode: B2Funding.default('CASH'),
  expectedSnapshot: digest.optional() }).strict()
export type B2ReadCase = z.infer<typeof B2EvidenceCase>
