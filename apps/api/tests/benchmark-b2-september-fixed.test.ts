import { describe, expect, it } from 'vitest'
import { consolidateBinationalReferenceBudget } from '../scripts/consolidate-binational-reference-budget.js'
import { composePublicMonthlyBudget } from '../scripts/compose-public-monthly-budget.js'
import { rebuildSeptemberFixedComponents, reconstructSeptemberFixedTemplate } from '../scripts/lib/reference-september-fixed-components.js'
import { reviewB2SeptemberLabor } from '../scripts/review-b2-september-labor.js'

const r = consolidateBinationalReferenceBudget(undefined, undefined, 'POSTAL_REFERENCE', 'PUBLIC_LINK_FORECAST', 'IMT_C3_NON_ARTICULATED_PROXY')
const fx = { date: '2026-09-28', mxnPerUsd: 17.8413 }
const options = { cashTaxScenario: 'NET_PLUS_VAT', financeMonthlyScenarioId: null as string | null,
  boxInsuranceAlternativeId: 'PUBLIC_GUIDE_LOW', mxYardAlternativeId: 'NET_PLUS_VAT_RESERVE' }
const template = composePublicMonthlyBudget(r, options)
const financeId = r.supportingPilotFinancedCfu.monthlyScenarios.find(s => s.cashBaseId === 'ALL_CAPITAL_CASH_NET_PLUS_VAT_PUBLIC_ADMIN_SCALE')!.id
const run = (o: unknown = options, f: unknown = fx) => rebuildSeptemberFixedComponents(r, f, o)

describe('September fixed native reconstruction and fixed/variable join', () => {
  it('reconstructs26known entries while six remainders stay null; original worksheet and evidence are unchanged', () => {
    const before = JSON.stringify(r), result = run()
    expect(result.rows).toHaveLength(32)
    expect(result.rows.filter(row => row.monthlyUsd !== null)).toHaveLength(26)
    expect(result.unresolved).toHaveLength(6)
    expect(result.rows.filter(row => row.monthlyUsd === null).map(row => row.id)).toEqual(template.unresolved.map(row => row.id))
    expect(result.originalEvidence).toEqual(template.budget.evidence)
    expect(result).toMatchObject({ referencePeriod: '2026-09', originalWorksheetPeriod: '2026-10',
      sourceObservationPeriodsChanged: false, originalUsdSubtotalsTransferred: false,
      missingAmountsDefaultedToZero: false, historicalSeptemberPricesVerified: false,
      completeCfuUsd: null, completeMonthlyBudgetUsd: null, quoteReady: false, adoptedValues: 0, externalWrites: false })
    expect(JSON.stringify(r)).toBe(before)
    expect(run()).toEqual(result)
  })
  it('uses native acquisition/use and premium bases, not rounded USD multiplied back into MXN', () => {
    const result = run(), row = (id: string) => result.rows.find(row => row.id === id)!
    expect(row('MX_TRACTOR_CAPITAL').native!.monthlyNative).toBeCloseTo(18678.16083333334, 9)
    expect(row('MX_TRACTOR_CAPITAL').monthlyUsd).toBe(1046.91)
    expect(row('MX_TRACTOR_INSURANCE').native!.monthlyNative).toBe(116952 / 12)
    expect(row('MX_TRACTOR_INSURANCE').monthlyUsd).toBe(546.26)
    expect(row('SHARED_TRAILER_CAPITAL').native!.monthlyNative).toBe(3750)
    expect(row('US_TRACTOR_INSURANCE').native!.monthlyNative).toBe(926 + 1553 / 12)
    for (const entry of result.rows.filter(v => v.native)) {
      expect(entry.monthlyUsd).toBe(Math.round(entry.native!.monthlyNative / (entry.native!.currency === 'MXN' ? fx.mxnPerUsd : 1) * 100) / 100)
      for (const ref of entry.native!.sourceRefs) expect(r.sourcePins.filter(p => p.id === ref)).toHaveLength(1)
    }
  })
  it('conserves cents once across the two tractor shares and one box, then applies one resource MAX', () => {
    const result = run()
    const rowCents = result.rows.reduce((sum, row) => sum + (row.monthlyUsd === null ? 0 : Math.round(row.monthlyUsd * 100)), 0)
    const resourceCents = Object.values(result.knownMonthlyUsdByResource).reduce((sum, n) => sum + Math.round(n * 100), 0)
    expect(rowCents).toBe(resourceCents)
    expect(result.knownMonthlySubtotalUsd).toBe(rowCents / 100)
    for (const c of result.allocations) {
      for (const v of c.resources) expect(v.knownAllocatedFixedComponentUsd).toBe(Math.max(v.monthlyUsd * v.cycleKm / v.monthlyKm, v.monthlyUsd * v.cycleDays / v.monthlyProductiveDays))
      expect(c.knownAllocatedFixedSubtotalUsd).toBe(c.resources.reduce((sum, v) => sum + v.knownAllocatedFixedComponentUsd, 0))
    }
    expect(result.rows.filter(row => row.id === 'GROUP_ADMIN_PAYROLL_PUBLIC_SCALE')).toHaveLength(1)
    expect(result.rows.filter(row => row.id === 'SHARED_TRAILER_CAPITAL')).toHaveLength(1)
  })
  it('replaces exactly three capital lines for financed sensitivity, leaving all other native entries unchanged', () => {
    const cash = run(), financed = run({ ...options, financeMonthlyScenarioId: financeId })
    const changed = cash.rows.filter(row => row.monthlyUsd !== financed.rows.find(v => v.id === row.id)!.monthlyUsd).map(row => row.id)
    expect(changed).toEqual(['MX_TRACTOR_CAPITAL', 'US_TRACTOR_CAPITAL', 'SHARED_TRAILER_CAPITAL'])
    for (const c of cash.allocations) {
      const f = financed.allocations.find(v => v.cycleId === c.cycleId)!
      for (const v of c.resources) {
        const next = f.resources.find(n => n.resourceId === v.resourceId)!
        expect(next.cycleKm).toBe(v.cycleKm); expect(next.cycleDays).toBe(v.cycleDays)
        expect(next.monthlyKm).toBe(v.monthlyKm); expect(next.monthlyProductiveDays).toBe(v.monthlyProductiveDays)
      }
    }
    expect(financed.debtPrincipalOrWholePaymentAdded).toBe(false)
    expect(financed.unresolved).toEqual(cash.unresolved)
  })
  it('retains all32existing finance alternatives and both box-tax cases as explicit alternatives, not default adoption', () => {
    for (const scenario of r.supportingPilotFinancedCfu.monthlyScenarios) {
      const result = run({ ...options, cashTaxScenario: scenario.boxTaxScenario, financeMonthlyScenarioId: scenario.id })
      expect(result.paymentMode).toBe('FINANCED')
      expect(result.options.financeMonthlyScenarioId).toBe(scenario.id)
      expect(result.adoptedValues).toBe(0)
      expect(result.rows.find(row => row.id === 'SHARED_TRAILER_CAPITAL')!.native!.monthlyNative).toBeGreaterThan(0)
    }
  })
  it('only MXN entries change with FX; USD native references, unknowns and source periods do not', () => {
    const first = run(), later = run(options, { date: '2026-09-30', mxnPerUsd: 18.0692 })
    for (const row of first.rows) {
      const next = later.rows.find(v => v.id === row.id)!
      expect(next.native).toEqual(row.native)
      expect(next.originalEvidenceIds).toEqual(row.originalEvidenceIds)
      if (!row.native || row.native.currency === 'USD') expect(next.monthlyUsd).toBe(row.monthlyUsd)
    }
    expect(first.originalEvidence).toEqual(later.originalEvidence)
  })
  it('keeps explicit guide and yard-tax alternatives disjoint, without treating reserved yards as travel lodging', () => {
    const result = run({ ...options, boxInsuranceAlternativeId: 'PUBLIC_GUIDE_HIGH', mxYardAlternativeId: 'PRICE_ALREADY_GROSS_SENSITIVITY' })
    expect(result.rows.find(v => v.id === 'SHARED_TRAILER_INSURANCE')!.monthlyUsd).toBe(150)
    expect(result.rows.find(v => v.id === 'MX_TRACTOR_RESERVED_YARD')!.native!.monthlyNative).toBe(250 * 365 / 12)
    expect(result.rows.some(v => /HOTEL|LODGING/.test(v.id))).toBe(false)
  })
  it.each(['period', 'amount', 'missing', 'duplicate', 'share', 'exposure', 'range', 'mode'] as const)('rejects inconsistent worksheet or exposure: %s', defect => {
    const changed = structuredClone(template)
    if (defect === 'period') changed.budget.referencePeriod = '2026-09'
    if (defect === 'amount') changed.budget.expenses[0].amount!.value += .01
    if (defect === 'missing') changed.budget.expenses[0].amount = null
    if (defect === 'duplicate') changed.budget.expenses.push(changed.budget.expenses[0])
    if (defect === 'share') changed.budget.expenses.find(v => v.scope === 'GROUP_SHARED')!.allocations[0].share = .6
    if (defect === 'exposure') changed.knownCfuAllocations[0].resources[0].cycleDays += .1
    if (defect === 'range') changed.knownCfuAllocations[0].resources[0].monthlyKm = 0
    if (defect === 'mode') changed.paymentMode = 'FINANCED'
    expect(() => reconstructSeptemberFixedTemplate(r, fx, changed)).toThrow(/B2_FIXED_/)
  })
  it.each([
    { date: '2026-09-28', mxnPerUsd: 18.0710 }, { date: '2026-10-01', mxnPerUsd: 18.3688 },
    { date: '2026-09-28', mxnPerUsd: 17.8413, selected: true },
  ])('rejects arbitrary/mismatched/post-period FX %#', f => expect(() => run(options, f)).toThrow())
  it('rejects injected prices and finance ids from a different tax scenario', () => {
    expect(() => run({ ...options, monthlyCapitalUsd: 1 })).toThrow()
    expect(() => run({ ...options, financeMonthlyScenarioId: 'invented' })).toThrow()
    expect(() => run({ ...options, cashTaxScenario: 'GROSS_INCLUDES_VAT', financeMonthlyScenarioId: financeId })).toThrow()
  })
  it('joins fixed and variable known components24ways, with fixed labor exactly once and the CVU unchanged by finance', () => {
    const result = reviewB2SeptemberLabor()
    expect(result.fixedReferences).toHaveLength(6)
    expect(result.cases.flatMap(c => c.fixedComparisons)).toHaveLength(24)
    for (const c of result.cases) {
      for (const f of c.fixedComparisons) {
        const ref = result.fixedReferences.find(v => `${v.fx.date}:${v.paymentMode}` === f.fixedReferenceId)!
        expect(ref.fx).toEqual(c.fx)
        expect(f.driverFixedQuotaUsd).toBe(c.mx.fixedQuotaUsdPerCycle)
        expect(f.knownFixedSubtotalUsd).toBe(f.knownResourceFixedSubtotalUsd + f.driverFixedQuotaUsd)
        expect(f.knownVariableSubtotalUsd).toBe(c.knownVariableComposition.subtotalUsd)
        expect(f.totalKnownComponentsUsd).toBe(f.knownFixedSubtotalUsd + f.knownVariableSubtotalUsd)
        expect(f.remainingFixed).toHaveLength(6)
        expect(f).toMatchObject({ comparisonPresetSelectedByUser: false, fixedQuotaAddedOnce: true,
          isCompleteOrLowerBound: false, completeCfuUsd: null, completeCvuUsd: null, completeTripCostUsd: null, quoteReady: false })
      }
      expect(c.fixedComparisons[0].knownVariableSubtotalUsd).toBe(c.fixedComparisons[1].knownVariableSubtotalUsd)
      expect(c.mx.existingRiskMonthlyMxn).toBeNull(); expect(c.us.mixedLodgingUsd).toBeNull()
    }
    expect(result).toMatchObject({ b2Complete: false, adoptedValues: 0, quoteReady: false, externalWrites: false })
  })
})
