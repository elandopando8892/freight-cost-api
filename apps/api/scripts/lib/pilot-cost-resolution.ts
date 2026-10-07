import { createHash } from 'node:crypto'
import { z } from 'zod'
import { BinationalFixedBudgetSchema } from '../../src/modules/engine/benchmark-binational-budget.js'
import { BinationalCostProjectionSchema, calculateBinationalBudgetCostProjection, PILOT_VARIABLE_CONCEPTS } from '../../src/modules/engine/benchmark-binational-cost-projection.js'

const text = z.string().trim().min(1).max(2000), money = z.number().finite().nonnegative().max(1e9)
export const PilotCostResolutionSchema = z.object({
  model: z.literal('FCM_B2_EXPLICIT_REMAINDER_RESOLUTION_V1'),
  baseLineageSha256: z.string().regex(/^[a-f0-9]{64}$/),
  evidenceScope: z.enum(['SYNTHETIC_VALIDATION', 'DOCUMENTED_PUBLIC_PLANNING']),
  evidence: BinationalFixedBudgetSchema.shape.evidence,
  fixed: z.array(z.object({ economicExpenseId: text, mode: z.enum(['SUPPLY_REMAINDER', 'REPLACE_FOREIGN_PROXY']),
    valueUsdPerMonth: money, evidenceIds: z.array(text).min(1), derivation: text, zeroRationale: text.nullable() }).strict()).max(100),
  variable: z.array(z.object({ conceptId: z.enum(PILOT_VARIABLE_CONCEPTS), mode: z.enum(['SUPPLY_REMAINDER', 'DOCUMENTED_EXCLUSION']),
    valueUsdPerCycle: money.nullable(), evidenceIds: z.array(text).min(1), derivation: text, zeroOrExclusionRationale: text.nullable() }).strict()).max(20),
}).strict()

export function pilotCostLineageHash(raw: unknown) {
  return createHash('sha256').update(JSON.stringify(BinationalCostProjectionSchema.parse(raw))).digest('hex')
}

/** One bounded adapter into the EXISTING cost projection. No network, DB,
 * source certification, adoption or hidden defaults. Supplied prices/rules
 * still need an economic evidence review outside this arithmetic operation. */
export function resolvePilotCostRemainders(rawBase: unknown, rawResolution: unknown) {
  const base = BinationalCostProjectionSchema.parse(rawBase), request = PilotCostResolutionSchema.parse(rawResolution)
  if (!base.fixedOperatingComponent) throw new Error('CLOSURE_DRIVER_FIXED_COMPONENT_REQUIRED')
  if (pilotCostLineageHash(base) !== request.baseLineageSha256) throw new Error('CLOSURE_STALE_BASE')
  if (base.evidenceScope === 'SYNTHETIC_VALIDATION' && request.evidenceScope !== 'SYNTHETIC_VALIDATION') throw new Error('CLOSURE_SYNTHETIC_SCOPE_UPGRADE')
  const unique = (ids: string[], name: string) => { if (new Set(ids).size !== ids.length) throw new Error(`CLOSURE_DUPLICATE_${name}`) }
  unique(request.fixed.map(r => r.economicExpenseId), 'FIXED_RESOLUTION')
  unique(request.variable.map(r => r.conceptId), 'VARIABLE_RESOLUTION')
  for (const r of [...request.fixed, ...request.variable]) unique(r.evidenceIds, 'RESOLUTION_REFERENCE')
  unique([...base.budget.evidence, ...request.evidence].map(e => e.id), 'EVIDENCE')
  const input = structuredClone(base)
  input.evidenceScope = request.evidenceScope
  input.budget.evidence.push(...request.evidence)
  const changes: { id: string; mode: string; priorUsd: number | null; additionOrReplacementUsd: number | null }[] = []
  for (const r of request.fixed) {
    const found = input.budget.expenses.filter(e => e.economicExpenseId === r.economicExpenseId)
    if (found.length !== 1 || found[0].amount !== null) throw new Error(`CLOSURE_FIXED_TARGET_NOT_MISSING:${r.economicExpenseId}`)
    if (Math.abs(r.valueUsdPerMonth * 100 - Math.round(r.valueUsdPerMonth * 100)) > 1e-7) throw new Error('CLOSURE_MONTHLY_WHOLE_CENTS_REQUIRED')
    if (r.valueUsdPerMonth === 0 && !r.zeroRationale) throw new Error('CLOSURE_ZERO_REQUIRES_BASIS')
    const proxy = input.budget.expenses.filter(e => e.economicExpenseId === 'MX_TRACTOR_FOREIGN_LIABILITY_PUBLIC_PROXY')
    if (r.economicExpenseId === 'MX_TRACTOR_FOREIGN_LIABILITY_REMAINDER' && proxy.length && r.mode !== 'REPLACE_FOREIGN_PROXY') throw new Error('CLOSURE_FOREIGN_PREMIUM_MUST_REPLACE_PROXY')
    if (r.mode === 'REPLACE_FOREIGN_PROXY') {
      if (r.economicExpenseId !== 'MX_TRACTOR_FOREIGN_LIABILITY_REMAINDER' || proxy.length !== 1 || r.valueUsdPerMonth <= 0) throw new Error('CLOSURE_FOREIGN_REPLACEMENT_SCOPE')
      input.budget.expenses = input.budget.expenses.filter(e => e !== proxy[0])
    }
    const target = found[0]
    target.amount = { value: r.valueUsdPerMonth, unit: 'USD/month', referencePeriod: input.budget.referencePeriod!,
      evidenceIds: r.evidenceIds, derivation: `${r.derivation}${r.zeroRationale ? `; explicit zero: ${r.zeroRationale}` : ''}`,
      kind: r.valueUsdPerMonth === 0 ? 'DOCUMENTED_ZERO' : 'DOCUMENTED_PUBLIC_MODEL' }
    target.allocationRationale = `${target.allocationRationale}; resolution: ${r.derivation}`
    changes.push({ id: r.economicExpenseId, mode: r.mode, priorUsd: r.mode === 'REPLACE_FOREIGN_PROXY' ? proxy[0].amount?.value ?? null : null, additionOrReplacementUsd: r.valueUsdPerMonth })
  }
  for (const r of request.variable) {
    const found = input.variableCosts.filter(v => v.conceptId === r.conceptId)
    if (found.length !== 1 || !['MISSING', 'DOCUMENTED_PARTIAL'].includes(found[0].disposition)) throw new Error(`CLOSURE_VARIABLE_TARGET_NOT_UNRESOLVED:${r.conceptId}`)
    const target = found[0], prior = target.amountUsd
    if (r.mode === 'DOCUMENTED_EXCLUSION') {
      if (target.disposition !== 'MISSING' || r.valueUsdPerCycle !== null || !r.zeroOrExclusionRationale) throw new Error('CLOSURE_EXCLUSION_CANNOT_ERASE_KNOWN_COMPONENT')
      target.disposition = 'DOCUMENTED_EXCLUSION'
    } else {
      if (r.valueUsdPerCycle === null) throw new Error('CLOSURE_REMAINDER_VALUE_REQUIRED')
      if (r.valueUsdPerCycle === 0 && !r.zeroOrExclusionRationale) throw new Error('CLOSURE_ZERO_REQUIRES_BASIS')
      target.amountUsd = (prior ?? 0) + r.valueUsdPerCycle
      target.disposition = 'DOCUMENTED_COMPONENT'
    }
    target.evidenceIds = [...new Set([...target.evidenceIds, ...r.evidenceIds])]
    target.derivation = `${target.derivation ?? ''}; separately supplied remainder: ${r.derivation}`
    target.unresolvedRationale = null
    target.exclusionOrZeroRationale = r.zeroOrExclusionRationale
    changes.push({ id: r.conceptId, mode: r.mode, priorUsd: prior, additionOrReplacementUsd: r.valueUsdPerCycle })
  }
  const result = calculateBinationalBudgetCostProjection(input)
  const invalid = result.issues.filter(i => !['MISSING_MONTHLY_AMOUNT', 'UNRESOLVED_VARIABLE_COMPONENT', 'UNRESOLVED_VARIABLE_REMAINDER'].includes(i.code))
  if (invalid.length) throw new Error(`CLOSURE_INVALID_CONTRACT:${invalid.map(i => i.code).join(',')}`)
  return { model: request.model, baseLineageSha256: request.baseLineageSha256, changes, result,
    arithmeticComplete: result.outputs.productiveCostUsd !== null,
    evidenceReviewedByThisAdapter: false, publicSourcesIndependentlyVerified: false,
    acceptedForB2: false, calibrated: false, quoteReady: false, adoptedValues: 0, externalWrites: false }
}

/** Template lists only actual unresolved targets, not invented missing prices.
 * Nulls intentionally do NOT parse as a resolved request. */
export function preparePilotCostResolution(raw: unknown) {
  const base = BinationalCostProjectionSchema.parse(raw)
  const proxy = base.budget.expenses.some(e => e.economicExpenseId === 'MX_TRACTOR_FOREIGN_LIABILITY_PUBLIC_PROXY')
  return { model: 'FCM_B2_EXPLICIT_REMAINDER_RESOLUTION_V1', baseLineageSha256: pilotCostLineageHash(base), evidenceScope: base.evidenceScope,
    evidence: [], fixed: base.budget.expenses.filter(e => !e.amount).map(e => ({ economicExpenseId: e.economicExpenseId,
      mode: e.economicExpenseId === 'MX_TRACTOR_FOREIGN_LIABILITY_REMAINDER' && proxy ? 'REPLACE_FOREIGN_PROXY' : 'SUPPLY_REMAINDER',
      valueUsdPerMonth: null, evidenceIds: [], derivation: null, zeroRationale: null })),
    variable: base.variableCosts.filter(v => ['MISSING', 'DOCUMENTED_PARTIAL'].includes(v.disposition)).map(v => ({ conceptId: v.conceptId,
      mode: 'SUPPLY_REMAINDER', valueUsdPerCycle: null, evidenceIds: [], derivation: null, zeroOrExclusionRationale: null })) }
}
