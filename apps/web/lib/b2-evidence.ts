import { z } from 'zod'

export const cycles = ['NETWORK_EXPECTED_EMPTY_PROXY', 'DEDICATED_EMPTY_SAME_BOX_RETURN'] as const
export const fundingModes = ['CASH', 'FINANCED'] as const
export type EvidenceContext = { cycleId: typeof cycles[number]; fundingMode: typeof fundingModes[number] }
const source = z.object({ id: z.string().min(1), title: z.string().min(1),
  url: z.string().url().refine(v => new URL(v).protocol === 'https:'),
  kind: z.enum(['LODGING_COMPARATOR', 'MEAL_CONTEXT_NOT_LODGING']), observedOn: z.literal('2026-10-03'),
  historicalSeptemberPriceVerified: z.literal(false), comparisonValue: z.number().finite().nonnegative().nullable(),
  currency: z.enum(['MXN', 'USD']), unit: z.string().min(1), taxBasisVerified: z.literal(false),
  selectedForCostEngine: z.literal(false), limitation: z.string().min(1) }).strict()
const row = z.object({ id: z.enum(['MX_TRAVEL_EXPENSES', 'US_DRIVER_TOTAL']), country: z.enum(['MX', 'US']),
  title: z.string().min(1), canonicalKey: z.null(), valueUsdPerCycle: z.null(), included: z.string().min(1),
  missing: z.array(z.string().min(1)).min(1), sources: z.array(source).min(1), effect: z.string().min(1) }).strict()
const response = z.object({ model: z.literal('FCM_B2_READ_EVIDENCE_V1'), profileId: z.literal('B2_USER_SCOPE_20261003'),
  referencePeriod: z.literal('2026-09'), sha256: z.string().regex(/^[a-f0-9]{64}$/), sourceObservedOn: z.literal('2026-10-03'),
  capture: z.literal('PINNED_LOCAL_PUBLIC_RESEARCH_NOT_LIVE_SOURCE_ARCHIVE'),
  presetPolicy: z.literal('EXISTING_COMPARISON_PRESETS_NOT_USER_FINANCE_SELECTION'), calibrated: z.literal(false),
  quoteReady: z.literal(false), adoptedValues: z.literal(0), notesPersisted: z.literal(false), canonicalParameterCount: z.literal(210),
  sourcePinCount: z.number().int().positive(), scope: z.object({ sub: z.string().min(1), orgId: z.string().min(1) }).strict(),
  case: z.object({ cycleId: z.enum(cycles), fundingMode: z.enum(fundingModes), historicalReferencePeriod: z.literal('2026-10'),
    acceptedForUserReferencePeriod: z.literal(false), issues: z.array(z.object({ field: z.string(), code: z.string().min(1), rationale: z.string().min(1) }).strict()).min(1),
    fixedRemainders: z.array(z.string().min(1)).min(1), variableRemainders: z.array(z.string().min(1)).min(1),
    outputs: z.object({ cfuUsd: z.null(), cvuUsd: z.null(), productiveCostUsd: z.null(), purchaseUsd: z.null(), sellUsd: z.null() }).strict(),
    rows: z.tuple([row, row]) }).strict() }).strict()
export type B2Evidence = z.infer<typeof response>
export function parseB2Evidence(raw: unknown, context: EvidenceContext): B2Evidence {
  const value = response.parse(raw)
  if (value.case.cycleId !== context.cycleId || value.case.fundingMode !== context.fundingMode ||
    value.case.rows[0].id !== 'MX_TRAVEL_EXPENSES' || value.case.rows[0].country !== 'MX' ||
    value.case.rows[1].id !== 'US_DRIVER_TOTAL' || value.case.rows[1].country !== 'US') throw new Error('B2_RESPONSE_CONTEXT_MISMATCH')
  return value
}
export function b2EvidencePath(context: EvidenceContext, sha256?: string) {
  const query = new URLSearchParams({ profileId: 'B2_USER_SCOPE_20261003', referencePeriod: '2026-09', ...context })
  if (sha256) query.set('expectedSnapshot', sha256)
  return `/api/v1/engine/benchmark-owned-d2d/b2-evidence?${query}`
}
