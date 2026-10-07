import { beforeAll, describe, expect, it } from 'vitest'
import { composePublicMonthlyBudget } from '../scripts/compose-public-monthly-budget.js'
import { consolidateBinationalReferenceBudget } from '../scripts/consolidate-binational-reference-budget.js'
import { reconcileBinationalFixedBudget } from '../src/modules/engine/benchmark-binational-budget.js'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'
import { PUBLIC_LIABILITY_ALTERNATIVE_IDS } from '../scripts/lib/reference-crossborder-liability-forecast.js'

describe('real public components -> dated resource monthly budget -> known CFU allocation', () => {
  let research: ReturnType<typeof consolidateBinationalReferenceBudget>
  const options = { cashTaxScenario: 'NET_PLUS_VAT', financeMonthlyScenarioId: null,
    boxInsuranceAlternativeId: 'PUBLIC_GUIDE_LOW', mxYardAlternativeId: 'NET_PLUS_VAT_RESERVE' }
  beforeAll(() => { research = consolidateBinationalReferenceBudget() })
  it.each(PUBLIC_LIABILITY_ALTERNATIVE_IDS.map((id, i) => ({ id, annual: [7500, 12000, 5000, 9000][i] })))
  ('allocates explicit $id annual sensitivity once to MX CFU, without closing foreign coverage', ({ id, annual }) => {
    const before = JSON.stringify(research)
    const base = composePublicMonthlyBudget(research, options)
    const selected = composePublicMonthlyBudget(research, { ...options, foreignLiabilityAlternativeId: id })
    const monthly = Math.round(annual / 12 * 100) / 100
    const rows = selected.budget.expenses.filter(e => e.economicExpenseId === 'MX_TRACTOR_FOREIGN_LIABILITY_PUBLIC_PROXY')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ family: 'INSURANCE', scope: 'DIRECT_RESOURCE', amount: { value: monthly },
      allocations: [{ resourceId: 'MX_TRACTOR', share: 1 }] })
    expect(selected.budget.expenses).toHaveLength(33)
    expect(selected.budget.expenses.filter(e => e.amount)).toHaveLength(27)
    expect(selected.unresolved.map(e => e.id)).toEqual(base.unresolved.map(e => e.id))
    expect(selected.unresolved.find(e => e.id === 'MX_TRACTOR_FOREIGN_LIABILITY_REMAINDER')!.reason).toContain('replace the public proxy')
    expect(selected.knownGroupMonthlyComponentUsd - base.knownGroupMonthlyComponentUsd).toBeCloseTo(monthly, 9)
    expect(selected.knownMonthlyComponentsUsdByResource.MX_TRACTOR - base.knownMonthlyComponentsUsdByResource.MX_TRACTOR).toBeCloseTo(monthly, 9)
    for (const resource of ['US_TRACTOR', 'SHARED_TRAILER'])
      expect(selected.knownMonthlyComponentsUsdByResource[resource]).toBe(base.knownMonthlyComponentsUsdByResource[resource])
    selected.knownCfuAllocations.forEach((c, i) => {
      const mx = c.resources.find(r => r.resourceId === 'MX_TRACTOR')!
      expect(c.knownAllocatedFixedSubtotalUsd - base.knownCfuAllocations[i].knownAllocatedFixedSubtotalUsd)
        .toBeCloseTo(monthly * Math.max(mx.cycleKm / mx.monthlyKm, mx.cycleDays / mx.monthlyProductiveDays), 9)
      for (const resource of ['US_TRACTOR', 'SHARED_TRAILER'])
        expect(c.resources.find(r => r.resourceId === resource)).toEqual(base.knownCfuAllocations[i].resources.find(r => r.resourceId === resource))
      expect(c.fullCfuUsd).toBeNull()
    })
    expect(selected.liabilityPlanning).toMatchObject({ id, annualPlanningPoolUsd: annual, monthlyPlanningUsd: monthly,
      monthlyExactUsd: annual / 12, classification: 'CFU', sourceIsForeignQuote: false,
      actualEligibilityVerified: false, actualAnnualPremiumUsd: null, taxesFeesVerified: false,
      sourceUnitDenominatorMatched: false, isMarketBound: false, temporaryPremiumAdded: false,
      physicalDamageAdded: false, cargoAdded: false, boxChargedAgain: false,
      annualAndTemporaryMutuallyExclusive: true, calibrated: false, adoptedValues: 0 })
    expect(selected.fullMonthlyBudgetUsd).toBeNull()
    expect(selected.quoteReady).toBe(false)
    expect(JSON.stringify(research)).toBe(before)
  })
  it('omitted/null foreign sensitivity selects no premium and performs no new policy read', () => {
    const noRead = () => { throw new Error('UNEXPECTED_FOREIGN_POLICY_READ') }
    const omitted = composePublicMonthlyBudget(research, options, noRead)
    const explicit = composePublicMonthlyBudget(research, { ...options, foreignLiabilityAlternativeId: null }, noRead)
    expect(explicit.budget).toEqual(omitted.budget)
    expect(explicit.knownCfuAllocations).toEqual(omitted.knownCfuAllocations)
    expect(explicit.liabilityPlanning).toBeNull()
    expect(omitted.liabilityPlanning).toBeNull()
    expect(omitted.knownGroupMonthlyComponentUsd).toBe(7968.87)
  })
  it('rejects unknown IDs, caller amounts, changed policy bytes and published endpoints', () => {
    const chosen = { ...options, foreignLiabilityAlternativeId: PUBLIC_LIABILITY_ALTERNATIVE_IDS[0] }
    expect(() => composePublicMonthlyBudget(research, { ...chosen, foreignLiabilityAlternativeId: 'INVENTED' })).toThrow()
    expect(() => composePublicMonthlyBudget(research, { ...chosen, annualPremiumUsd: 1 })).toThrow()
    expect(() => composePublicMonthlyBudget(research, chosen, file => readLocalDocument(file) + ' ')).toThrow('MONTHLY_LIABILITY_POLICY_HASH')
    const changed = structuredClone(research)
    changed.supportingCrossborderLiabilityForecast.premiums[0].annualPlanningPoolUsd += 1
    expect(() => composePublicMonthlyBudget(changed, chosen)).toThrow('MONTHLY_LIABILITY_PUBLISHED_PREMIUM_IDENTITY')
  })
  it.each(['HASH', 'FILE', 'DUPLICATE'])('rejects altered foreign source pin %s', variation => {
    const changed = structuredClone(research)
    const pin = changed.sourcePins.find(p => p.id === 'crossborderLiabilityForecast')!
    if (variation === 'HASH') Object.defineProperty(pin, 'sha256', { value: '0'.repeat(64) })
    if (variation === 'FILE') Object.defineProperty(pin, 'file', { value: 'other.json' })
    if (variation === 'DUPLICATE') Object.defineProperty(changed, 'sourcePins', { value: [...changed.sourcePins, { ...pin }] })
    expect(() => composePublicMonthlyBudget(changed, { ...options, foreignLiabilityAlternativeId: PUBLIC_LIABILITY_ALTERNATIVE_IDS[0] }))
      .toThrow('MONTHLY_LIABILITY_PIN_IDENTITY')
  })
  it('keeps the same single insurance pool when financed capital replaces cash capital', () => {
    const chosen = { ...options, foreignLiabilityAlternativeId: PUBLIC_LIABILITY_ALTERNATIVE_IDS[2] }
    const financeId = research.supportingPilotFinancedCfu.monthlyScenarios.find(s => s.cashBaseId === 'ALL_CAPITAL_CASH_NET_PLUS_VAT_PUBLIC_ADMIN_SCALE')!.id
    const cash = composePublicMonthlyBudget(research, chosen)
    const financed = composePublicMonthlyBudget(research, { ...chosen, financeMonthlyScenarioId: financeId })
    expect(financed.liabilityPlanning).toEqual(cash.liabilityPlanning)
    expect(financed.budget.expenses.filter(e => e.family !== 'CAPITAL')).toEqual(cash.budget.expenses.filter(e => e.family !== 'CAPITAL'))
    expect(financed.budget.expenses.filter(e => e.economicExpenseId === 'MX_TRACTOR_FOREIGN_LIABILITY_PUBLIC_PROXY')).toHaveLength(1)
  })
  it('assembles26 real component rows without silently closing6 unknown obligations', () => {
    const r = composePublicMonthlyBudget(research, options)
    expect(r.budget.expenses).toHaveLength(32)
    expect(r.budget.expenses.filter(e => e.amount)).toHaveLength(26)
    expect(r.unresolved.map(e => e.id)).toEqual(['MX_TRACTOR_PERMITS', 'US_TRACTOR_PERMITS', 'SHARED_TRAILER_PERMITS',
      'MX_TRACTOR_FOREIGN_LIABILITY_REMAINDER', 'BOX_BINATIONAL_COVERAGE_REMAINDER', 'GROUP_SERVICE_TAX_INSTALLATION_REMAINDER'])
    expect(r.knownGroupMonthlyComponentUsd).toBe(7968.87)
    expect(r.knownMonthlyComponentsUsdByResource).toEqual({ MX_TRACTOR: 3807.58, US_TRACTOR: 3723.66, SHARED_TRAILER: 437.63 })
    expect(r.fullMonthlyBudgetUsd).toBeNull()
    expect(r.auditStatus).toBe('INCOMPLETE')
    expect(reconcileBinationalFixedBudget(r.budget).issues.every(i => i.code === 'MISSING_MONTHLY_AMOUNT')).toBe(true)
  })
  it('conserves a single3020.22admin pool without old seven-role/combined-pool duplication', () => {
    const r = composePublicMonthlyBudget(research, options)
    const pool = r.budget.expenses.filter(e => e.family === 'ADMIN_PAYROLL')
    expect(pool).toHaveLength(1)
    expect(pool[0].amount!.value).toBe(3020.22)
    expect(pool[0].allocations).toEqual([{ resourceId: 'MX_TRACTOR', share: .5 }, { resourceId: 'US_TRACTOR', share: .5 }, { resourceId: 'SHARED_TRAILER', share: 0 }])
    expect(r.budget.expenses.some(e => e.family === 'ADMIN_AND_COMPANY')).toBe(false)
    expect(r.budget.expenses.find(e => e.economicExpenseId === 'GROUP_TMS_NAMED_ACCOUNTS')!.amount!.value).toBe(138)
  })
  it('retains one-box capital, premium, bay and visibility costs, not duplicate national boxes', () => {
    const r = composePublicMonthlyBudget(research, options)
    for (const id of ['SHARED_TRAILER_CAPITAL', 'SHARED_TRAILER_INSURANCE', 'ONE_BOX_US_RESERVED_YARD', 'BOX_GOLDEN_SERVICE', 'BOX_INSTALLED_SERVICE_ALLOCATION']) {
      const rows = r.budget.expenses.filter(e => e.economicExpenseId === id)
      expect(rows).toHaveLength(1)
      expect(rows[0].allocations).toEqual([{ resourceId: 'SHARED_TRAILER', share: 1 }])
    }
    expect(r.budget.expenses.find(e => e.economicExpenseId === 'SHARED_TRAILER_INSURANCE')!.amount!.value).toBe(25)
  })
  it('keeps partial permit components distinct from the null complete-family remainder', () => {
    const r = composePublicMonthlyBudget(research, options)
    expect(r.budget.expenses.find(e => e.economicExpenseId === 'US_IRP_WORKED_EXAMPLE_PROXY')!.amount!.value).toBe(168.46)
    expect(r.budget.expenses.find(e => e.economicExpenseId === 'US_UCR_ONE_ENTITY')!.amount!.value).toBe(3.83)
    expect(r.budget.expenses.find(e => e.economicExpenseId === 'US_HVUT_ONE_TAXABLE_POWER_UNIT')!.amount!.value).toBe(45.83)
    expect(r.budget.expenses.find(e => e.economicExpenseId === 'US_TRACTOR_PERMITS')!.amount).toBeNull()
    expect(r.budget.expenses.find(e => e.economicExpenseId === 'SHARED_TRAILER_PERMITS')!.amount).toBeNull()
    expect(r.monthlyRounding).toContain('ROUND_SUPPORTED_EXPENSE_ONCE')
  })
  it.each(['NET_PLUS_VAT', 'GROSS_INCLUDES_VAT'])('uses explicit cash %s tax alternatives without summing them', tax => {
    const r = composePublicMonthlyBudget(research, { ...options, cashTaxScenario: tax })
    expect(r.paymentMode).toBe('CASH')
    expect(r.budget.expenses.find(e => e.economicExpenseId === 'SHARED_TRAILER_CAPITAL')!.amount!.value).toBe(tax === 'NET_PLUS_VAT' ? 204.15 : 373.1)
    expect(r.knownGroupMonthlyComponentUsd).toBe(tax === 'NET_PLUS_VAT' ? 7968.87 : 8137.82)
  })
  it('uses separate box premium and MX yard sensitivity endpoints, not hidden defaults', () => {
    const low = composePublicMonthlyBudget(research, options)
    const highBox = composePublicMonthlyBudget(research, { ...options, boxInsuranceAlternativeId: 'PUBLIC_GUIDE_HIGH' })
    expect(highBox.knownGroupMonthlyComponentUsd - low.knownGroupMonthlyComponentUsd).toBeCloseTo(150 - 25, 10)
    const grossYard = composePublicMonthlyBudget(research, { ...options, mxYardAlternativeId: 'PRICE_ALREADY_GROSS_SENSITIVITY' })
    expect(low.knownGroupMonthlyComponentUsd - grossYard.knownGroupMonthlyComponentUsd).toBeCloseTo(480.21 - 413.97, 10)
  })
  it('replaces three capital lines for finance, preserving the same admin/insurance/company/cycle', () => {
    const f = research.supportingPilotFinancedCfu.monthlyScenarios.find(x => x.cashBaseId === 'ALL_CAPITAL_CASH_NET_PLUS_VAT_PUBLIC_ADMIN_SCALE')!
    const cash = composePublicMonthlyBudget(research, options)
    const financed = composePublicMonthlyBudget(research, { ...options, financeMonthlyScenarioId: f.id })
    expect(financed.paymentMode).toBe('FINANCED')
    expect(financed.knownGroupMonthlyComponentUsd - cash.knownGroupMonthlyComponentUsd).toBeCloseTo(f.capitalReplacements.reduce((n, p) => n + p.monthlyDeltaUsd, 0), 9)
    expect(financed.budget.expenses.filter(e => e.family !== 'CAPITAL')).toEqual(cash.budget.expenses.filter(e => e.family !== 'CAPITAL'))
    for (const p of f.capitalReplacements) expect(financed.budget.expenses.find(e => e.economicExpenseId === p.id)!.amount!.value).toBe(p.financedMonthlyUsd)
    expect(financed.fullPilotCostUsd).toBeNull()
  })
  it('recalculates both cycle allocations from resource monthly amounts with MAX, box once', () => {
    const r = composePublicMonthlyBudget(research, options)
    expect(r.knownCfuAllocations).toHaveLength(2)
    for (const c of r.knownCfuAllocations) {
      expect(c.resources).toHaveLength(3)
      for (const resource of c.resources) expect(resource.knownAllocatedFixedComponentUsd).toBeCloseTo(Math.max(
        resource.monthlyUsd * resource.cycleKm / resource.monthlyKm,
        resource.monthlyUsd * resource.cycleDays / resource.monthlyProductiveDays), 10)
      expect(c.knownAllocatedFixedSubtotalUsd).toBeCloseTo(c.resources.reduce((n, x) => n + x.knownAllocatedFixedComponentUsd, 0), 10)
      expect(c.fullCfuUsd).toBeNull()
    }
  })
  it('preserves upstream budgets/pins and adds real-source compatible lineage, not approvals', () => {
    const before = JSON.stringify(research)
    const r = composePublicMonthlyBudget(research, options)
    expect(JSON.stringify(research)).toBe(before)
    expect(r.budget.resources.every(x => x.profileReference !== null)).toBe(true)
    expect(r.budget.evidence.every(e => e.kind === 'DOCUMENTED_PUBLIC_MODEL' && e.referencePeriod === '2026-10')).toBe(true)
    expect(r.sourcePins).toHaveLength(79)
    expect(r).toMatchObject({ calibrated: false, quoteReady: false, adoptedValues: 0, originalBudgetChanged: false, externalWrites: false })
  })
  it('rejects missing/unknown options and incompatible finance scopes', () => {
    expect(() => composePublicMonthlyBudget(research, {})).toThrow()
    expect(() => composePublicMonthlyBudget(research, { ...options, adopted: true })).toThrow()
    expect(() => composePublicMonthlyBudget(research, { ...options, financeMonthlyScenarioId: 'MISSING' })).toThrow('MONTHLY_BUDGET_FINANCE_NOT_FOUND')
    const f = research.supportingPilotFinancedCfu.monthlyScenarios.find(x => x.cashBaseId.includes('GROSS_INCLUDES_VAT'))!
    expect(() => composePublicMonthlyBudget(research, { ...options, financeMonthlyScenarioId: f.id })).toThrow('MONTHLY_BUDGET_FINANCE_SCOPE')
  })
  it('rejects altered seeds, existing amounts, duplicates and missing monetary sources', () => {
    const duplicate = structuredClone(research)
    const base = duplicate.reviewedMxInsuranceSensitivity.scenarios.find(s => s.id === 'ALL_CAPITAL_CASH_NET_PLUS_VAT')!
    base.budget.expenses.push(base.budget.expenses.find(e => e.economicExpenseId === 'SHARED_TRAILER_INSURANCE')!)
    expect(() => composePublicMonthlyBudget(duplicate, options)).toThrow('MONTHLY_BUDGET_EXPENSE_IDENTITY')
    const existing = structuredClone(research)
    const e = existing.reviewedMxInsuranceSensitivity.scenarios.find(s => s.id === 'ALL_CAPITAL_CASH_NET_PLUS_VAT')!.budget
    e.expenses.find(e => e.economicExpenseId === 'SHARED_TRAILER_INSURANCE')!.amount = e.expenses.find(e => e.economicExpenseId === 'MX_TRACTOR_INSURANCE')!.amount
    expect(() => composePublicMonthlyBudget(existing, options)).toThrow('MONTHLY_BUDGET_BOX_PREMIUM_OVERWRITE')
    const noSources = structuredClone(research)
    noSources.supportingCompanyServicesCfu.sources = []
    expect(() => composePublicMonthlyBudget(noSources, options)).toThrow()
  })
})
