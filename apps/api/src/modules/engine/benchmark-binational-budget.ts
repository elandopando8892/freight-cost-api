import { z } from 'zod'
import { BenchmarkLegSchema } from './benchmark-leg.js'

export const BINATIONAL_RESOURCES = ['MX_TRACTOR', 'US_TRACTOR', 'SHARED_TRAILER'] as const
const resource = z.enum(BINATIONAL_RESOURCES)
const text = z.string().trim().min(1).max(2000)
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
const families = ['CAPITAL', 'INSURANCE', 'ADMIN_PAYROLL', 'COMPANY', 'PERMITS'] as const
const family = z.enum([...families, 'ADMIN_AND_COMPANY'])
const bases = {
  CAPITAL: 'ECONOMIC_DEPRECIATION_PLUS_INTEREST_ONLY',
  INSURANCE: 'PERIOD_PREMIUM_NORMALIZED_ONCE',
  ADMIN_PAYROLL: 'EMPLOYER_COST_INCLUDES_BENEFITS',
  COMPANY: 'FIXED_COMPANY_EXCLUDES_OTHER_FAMILIES',
  PERMITS: 'FIXED_PERMITS_EXCLUDES_TRIP_TOLLS',
  ADMIN_AND_COMPANY: 'COMBINED_EMPLOYER_AND_COMPANY_FIXED',
} as const

/** Research worksheet, not a canonical-parameter importer or pricing engine.
 * One expense identity -> one conserved monthly pool -> three cost centres.
 * Presence of documentary declarations never establishes observed costs. */
export const BinationalFixedBudgetSchema = z.object({
  model: z.literal('FCM_BINATIONAL_FIXED_BUDGET_V1'), groupReference: text,
  referencePeriod: month.nullable(),
  resources: z.array(z.object({ resourceId: resource, profileReference: text.nullable() }).strict()).length(3),
  evidence: z.array(z.object({ id: text, url: z.string().url().refine(v => new URL(v).protocol === 'https:'),
    locator: text, observedAt: BenchmarkLegSchema.shape.serviceDate,
    referencePeriod: month, groupReference: text, resourceIds: z.array(resource).min(1),
    profileReferences: z.array(z.object({ resourceId: resource, profileReference: text }).strict()).min(1),
    kind: z.enum(['PUBLIC_OBSERVATION', 'DOCUMENTED_PUBLIC_MODEL', 'CONTEXT_ONLY']), limitations: text,
  }).strict()),
  expenses: z.array(z.object({
    economicExpenseId: text, family, scope: z.enum(['DIRECT_RESOURCE', 'GROUP_SHARED']),
    basis: text, allocationRationale: text,
    amount: z.object({ value: z.number().finite().nonnegative(), unit: z.literal('USD/month'),
      referencePeriod: month, evidenceIds: z.array(text).min(1), derivation: text,
      kind: z.enum(['PUBLIC_OBSERVATION', 'DOCUMENTED_PUBLIC_MODEL', 'DOCUMENTED_ZERO']),
    }).strict().nullable(),
    allocations: z.array(z.object({ resourceId: resource, share: z.number().finite().min(0).max(1).nullable() }).strict()).min(1).max(3),
  }).strict()).min(1).max(100),
}).strict()

export function reconcileBinationalFixedBudget(raw: unknown) {
  const input = BinationalFixedBudgetSchema.parse(raw)
  const issues: { field: string; code: string }[] = []
  const add = (field: string, code: string) => issues.push({ field, code })
  const sources = new Map(input.evidence.map(s => [s.id, s]))
  if (sources.size !== input.evidence.length) add('evidence', 'DUPLICATE_EVIDENCE')
  if (!input.referencePeriod) add('referencePeriod', 'MISSING_REFERENCE_PERIOD')
  for (const id of BINATIONAL_RESOURCES) {
    const rows = input.resources.filter(r => r.resourceId === id)
    if (rows.length !== 1) add(id, 'REQUIRE_ONE_RESOURCE')
    if (rows.length === 1 && !rows[0].profileReference) add(id, 'MISSING_COMPATIBLE_PROFILE')
  }
  const keys = new Set<string>()
  const coverage = new Map(BINATIONAL_RESOURCES.map(id => [id, new Set<string>()]))
  const methods = new Map(BINATIONAL_RESOURCES.map(id => [id, new Set<string>()]))
  input.expenses.forEach((expense, i) => {
    const field = `expenses.${i}`
    if (keys.has(expense.economicExpenseId)) add(field, 'DUPLICATE_ECONOMIC_EXPENSE')
    keys.add(expense.economicExpenseId)
    if (expense.basis !== bases[expense.family]) add(field, 'COST_BASIS_MISMATCH')
    const ids = expense.allocations.map(a => a.resourceId)
    if (new Set(ids).size !== ids.length) add(field, 'DUPLICATE_RESOURCE_ALLOCATION')
    if (expense.scope === 'DIRECT_RESOURCE' && (ids.length !== 1 || expense.allocations[0].share !== 1)) add(field, 'DIRECT_ALLOCATION_MUST_BE_WHOLE')
    if (expense.scope === 'GROUP_SHARED' && !BINATIONAL_RESOURCES.every(id => ids.includes(id))) add(field, 'GROUP_ALLOCATION_MUST_DECLARE_ALL_RESOURCES')
    if (expense.allocations.some(a => a.share === null)) add(field, 'MISSING_ALLOCATION_SHARE')
    else if (Math.abs(expense.allocations.reduce((n, a) => n + a.share!, 0) - 1) > 1e-9) add(field, 'ALLOCATION_MUST_SUM_TO_ONE')
    for (const id of ids) {
      const set = coverage.get(id)!
      for (const f of expense.family === 'ADMIN_AND_COMPANY' ? ['ADMIN_PAYROLL', 'COMPANY'] : [expense.family]) set.add(f)
      if (['ADMIN_AND_COMPANY', 'ADMIN_PAYROLL', 'COMPANY'].includes(expense.family)) methods.get(id)!.add(expense.family)
    }
    if (!expense.amount) { add(field, 'MISSING_MONTHLY_AMOUNT'); return }
    const amount = expense.amount
    if (amount.referencePeriod !== input.referencePeriod) add(field, 'BUDGET_PERIOD_MISMATCH')
    const cents = amount.value * 100
    if (!Number.isSafeInteger(Math.round(cents)) || Math.abs(cents - Math.round(cents)) > 1e-7) add(field, 'AMOUNT_MUST_BE_SAFE_WHOLE_CENTS')
    if ((amount.value === 0) !== (amount.kind === 'DOCUMENTED_ZERO')) add(field, 'ZERO_REQUIRES_EXPLICIT_BASIS')
    if (new Set(amount.evidenceIds).size !== amount.evidenceIds.length) add(field, 'DUPLICATE_REFERENCE')
    for (const id of amount.evidenceIds) {
      const source = sources.get(id)
      if (!source) { add(field, 'MISSING_EVIDENCE'); continue }
      if (source.kind === 'CONTEXT_ONLY') add(field, 'CONTEXT_ONLY_SOURCE')
      if (source.referencePeriod !== input.referencePeriod || source.groupReference !== input.groupReference) add(field, 'EVIDENCE_BUDGET_SCOPE_MISMATCH')
      if (!ids.every(id => source.resourceIds.includes(id))) add(field, 'EVIDENCE_RESOURCE_SCOPE_MISMATCH')
      for (const id of ids) {
        const profiles = source.profileReferences.filter(p => p.resourceId === id)
        if (profiles.length !== 1 || profiles[0].profileReference !== input.resources.find(r => r.resourceId === id)?.profileReference) add(field, 'EVIDENCE_PROFILE_MISMATCH')
      }
      if (new Set(source.resourceIds).size !== source.resourceIds.length) add(field, 'DUPLICATE_EVIDENCE_RESOURCE')
      if (amount.kind !== 'DOCUMENTED_ZERO' && amount.kind !== source.kind) add(field, 'EVIDENCE_KIND_MISMATCH')
    }
  })
  for (const id of BINATIONAL_RESOURCES) {
    for (const f of families) if (!coverage.get(id)!.has(f)) add(id, `MISSING_${f}_BUDGET`)
    const method = methods.get(id)!
    if (method.has('ADMIN_AND_COMPANY') && method.size > 1) add(id, 'COMBINED_AND_DETAILED_ADMIN_OVERLAP')
  }
  const envelope = { model: input.model, lineage: input, issues,
    calibrated: false as const, quoteReady: false as const, adoptedValues: 0,
    sourceStatus: 'DOCUMENTED_UNVERIFIED' as const, cfuUsd: null, cvuUsd: null,
    exclusions: ['Driver', 'Fuel', 'Maintenance', 'Tires', 'Trip tolls', 'Incremental border services',
      'Loan principal', 'Working capital', 'Risk', 'Margin'],
  }
  if (issues.length) return { ...envelope, status: 'INCOMPLETE' as const, allocations: null,
    monthlyFixedUsdByResource: null, monthlyGroupTotalUsd: null }
  const totals = Object.fromEntries(BINATIONAL_RESOURCES.map(id => [id, 0])) as Record<typeof BINATIONAL_RESOURCES[number], number>
  // Largest remainder in cents preserves every pool, including 1-cent splits.
  // Canonical resource order makes ties independent of input row ordering.
  const allocations = input.expenses.map(expense => {
    const cents = Math.round(expense.amount!.value * 100)
    const parts = BINATIONAL_RESOURCES.map(resourceId => {
      const share = expense.allocations.find(a => a.resourceId === resourceId)?.share ?? 0
      const raw = cents * share
      return { resourceId, cents: Math.floor(raw), remainder: raw - Math.floor(raw) }
    })
    const remaining = cents - parts.reduce((n, p) => n + p.cents, 0)
    // Tiny floating-point share errors cannot create an unbounded remainder.
    if (remaining < 0 || remaining > parts.length) add(expense.economicExpenseId, 'ALLOCATION_NUMERIC_RANGE')
    else [...parts].sort((a, b) => b.remainder - a.remainder || BINATIONAL_RESOURCES.indexOf(a.resourceId) - BINATIONAL_RESOURCES.indexOf(b.resourceId))
      .slice(0, remaining).forEach(p => { p.cents++ })
    for (const p of parts) totals[p.resourceId] += p.cents
    return { economicExpenseId: expense.economicExpenseId, family: expense.family,
      monthlyUsd: cents / 100, resources: parts.map(p => ({ resourceId: p.resourceId, monthlyUsd: p.cents / 100 })) }
  })
  const groupCents = Object.values(totals).reduce((a, b) => a + b, 0)
  if (![groupCents, ...Object.values(totals)].every(Number.isSafeInteger)) add('totals', 'NUMERIC_RANGE_EXCEEDED')
  if (issues.length) return { ...envelope, status: 'INCOMPLETE' as const, allocations: null,
    monthlyFixedUsdByResource: null, monthlyGroupTotalUsd: null }
  return { ...envelope, status: 'BUDGET_SCENARIO_ONLY' as const, allocations,
    monthlyFixedUsdByResource: Object.fromEntries(BINATIONAL_RESOURCES.map(id => [id, totals[id] / 100])),
    monthlyGroupTotalUsd: groupCents / 100 }
}
