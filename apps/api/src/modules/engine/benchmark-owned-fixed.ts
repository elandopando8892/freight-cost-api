import { z } from 'zod'
import { CapitalScenariosSchema, calculateCapitalScenarios } from './benchmark-capital-scenarios.js'
import { BenchmarkLegSchema } from './benchmark-leg.js'
import { round2 } from '../../utils/currency.js'

const text = z.string().trim().min(1).max(1000)
const monthly = z.object({ value: z.number().finite().nonnegative(), unit: z.literal('USD/trailer-month'),
  evidenceIds: z.array(text).min(1), derivation: text }).strict()
export const OwnedFixedSchema = z.object({
  capital: CapitalScenariosSchema,
  allocation: z.literal('TRAILER_ONLY_EXCLUDES_TRACTOR_AND_VARIABLE_COSTS'),
  allocationRationale: text, allocationEvidenceIds: z.array(text).min(1),
  evidence: BenchmarkLegSchema.shape.evidence,
  // One finance assumption per capital scenario; do not assume identical debt across horizons.
  financing: z.array(z.object({ scenarioId: text, basis: z.literal('INTEREST_ONLY_MONTHLY_AVERAGE'),
    interest: monthly }).strict()).min(1).max(20),
  expenses: z.array(z.object({ concept: z.enum(['INSURANCE', 'PERMITS', 'OVERHEAD']), amount: monthly }).strict()).max(3),
}).strict()

/** Local owned-asset scenario assembly; monthly interest is documented, never inferred from a payment. */
export function calculateOwnedFixedScenarios(raw: unknown) {
  const input = OwnedFixedSchema.parse(raw)
  const capital = calculateCapitalScenarios(input.capital)
  const issues = capital.issues.map(issue => ({ ...issue, field: `capital.${issue.field}` }))
  const sources = new Map(input.evidence.map(s => [s.id, s]))
  if (sources.size !== input.evidence.length) issues.push({ field: 'evidence', code: 'DUPLICATE_EVIDENCE' })
  const check = (field: string, ids: string[]) => {
    if (new Set(ids).size !== ids.length) issues.push({ field, code: 'DUPLICATE_REFERENCE' })
    for (const id of ids) {
      const source = sources.get(id)
      if (!source) { issues.push({ field, code: 'MISSING_EVIDENCE' }); continue }
      if (source.country !== input.capital.country) issues.push({ field, code: 'COUNTRY_MISMATCH' })
      const date = input.capital.serviceDate
      if (source.observedAt > date || source.validFrom > source.validUntil || source.validFrom > date || source.validUntil < date) {
        issues.push({ field, code: 'EVIDENCE_OUTSIDE_VALIDITY' })
      }
    }
  }
  check('allocationEvidenceIds', input.allocationEvidenceIds)
  const scenarioIds = new Set(input.capital.scenarios.map(s => s.id))
  const finance = new Map(input.financing.map(f => [f.scenarioId, f]))
  if (finance.size !== input.financing.length) issues.push({ field: 'financing', code: 'DUPLICATE_FINANCING' })
  for (const id of scenarioIds) if (!finance.has(id)) issues.push({ field: id, code: 'MISSING_FINANCING' })
  input.financing.forEach((f, i) => {
    if (!scenarioIds.has(f.scenarioId)) issues.push({ field: `financing.${i}`, code: 'UNKNOWN_SCENARIO' })
    check(`financing.${i}`, f.interest.evidenceIds)
  })
  const concepts = new Set(input.expenses.map(e => e.concept))
  if (concepts.size !== input.expenses.length) issues.push({ field: 'expenses', code: 'DUPLICATE_EXPENSE' })
  for (const concept of ['INSURANCE', 'PERMITS', 'OVERHEAD'] as const) {
    if (!concepts.has(concept)) issues.push({ field: concept, code: 'MISSING_EXPENSE' })
  }
  input.expenses.forEach((e, i) => check(`expenses.${i}`, e.amount.evidenceIds))
  const envelope = { lineage: input, capital, calibrated: false as const, sourceStatus: 'DOCUMENTED_UNVERIFIED',
    cfuUsd: null, exclusions: ['Principal repayments', 'Rent', 'Variable costs', 'Equity opportunity cost', 'Taxes not explicitly in inputs'] }
  if (issues.length || !capital.scenarios) return { ...envelope, status: 'INCOMPLETE', issues, scenarios: null }
  const cents = (n: number) => Math.round(n * 100)
  const expenseCents = input.expenses.map(e => cents(e.amount.value))
  const scenarios = capital.scenarios.map(s => {
    const interest = cents(finance.get(s.id)!.interest.value)
    const total = cents(s.monthlyDepreciationUsd) + interest + expenseCents.reduce((sum, n) => sum + n, 0)
    if (![interest, total, ...expenseCents].every(Number.isSafeInteger)) issues.push({ field: s.id, code: 'NUMERIC_RANGE_EXCEEDED' })
    return { id: s.id, monthlyDepreciationUsd: s.monthlyDepreciationUsd, monthlyInterestUsd: interest / 100,
      expenses: input.expenses.map(e => ({ concept: e.concept, monthlyUsd: round2(e.amount.value) })), monthlyFixedUsd: total / 100 }
  })
  return { ...envelope, status: issues.length ? 'INCOMPLETE' : 'SCENARIO_ONLY', issues, scenarios: issues.length ? null : scenarios }
}
