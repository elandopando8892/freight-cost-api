import { describe, expect, it } from 'vitest'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'
import { B2_BENEFITS_PIN, comparePrimaryMonthlyVoucher, readB2BenefitsEvidence, reviewUsAggregateBenefitBoundary } from '../scripts/lib/b2-recurring-benefits.js'
import { reviewB2CompensationEvidence } from '../scripts/review-b2-compensation-evidence.js'

const input = { cycleId: 'NETWORK_EXPECTED_EMPTY_PROXY', baselineDailySbcMxn: 1000,
  compatibleCyclesPerMonth: 4, baselinePeriod: '2026-10', baselineIncludesVoucher: false,
  baselineBasis: 'EXISTING_ANNUAL_MEAN_WITH_FOOD_NOT_OBSERVED_BIMESTER' }
describe('E1 recurring compensation component, not adopted benchmark', () => {
  it('pins source facts independently of checkout line endings, not arbitrary prices', () => {
    const lf = readLocalDocument(B2_BENEFITS_PIN.file).replace(/\r\n/g, '\n')
    expect(readB2BenefitsEvidence(() => lf)).toEqual(readB2BenefitsEvidence(() => lf.replace(/\n/g, '\r\n')))
    expect(() => readB2BenefitsEvidence(() => lf.replace('3430', '5000'))).toThrow('B2_BENEFITS_SOURCE_HASH')
    expect(() => readB2BenefitsEvidence(() => lf + ' ')).toThrow('B2_BENEFITS_SOURCE_HASH')
  })
  it('prices only one published employee-month, not hiring, savings, pension or relief', () => {
    const before = JSON.stringify(input), r = comparePrimaryMonthlyVoucher(input)
    expect(r.directMonthlyMxn).toBe(3430)
    expect(r.primaryEmployeeMonths).toBe(1)
    expect(r.welcomeBonusAdded).toBe(false)
    expect(r.reliefVoucherMonthlyMxn).toBeNull()
    expect(r.completeRosterBenefitsMonthlyMxn).toBeNull()
    expect(r.statutoryBenefitsAddedAgain).toBe(false)
    expect(JSON.stringify(input)).toBe(before)
    expect(comparePrimaryMonthlyVoucher(input)).toEqual(r)
  })
  it('subtracts contributions before/after, never adds a new fixed EM quota or SBC as expense', () => {
    const r = comparePrimaryMonthlyVoucher(input), s = r.fullIntegrationSensitivity
    expect(s.hypotheticalDailySbcMxn).toBeCloseTo(1000 + 3430 / 30, 10)
    expect(s.componentDeltaMxn.EM_FIXED).toBe(0)
    expect(r.newFixedEmployerQuotaMxn).toBe(0)
    expect(s.nonRiskContributionDeltaMxn).toBeCloseTo(3430 * (.011 + .007 + .0105 + .0175 + .01 + .02 + .07513 + .05), 8)
    expect(s.knownMonthlyComponentMxn).toBeCloseTo(3430 + s.nonRiskContributionDeltaMxn, 8)
    expect(r.actualContributionDeltaMxn).toBeNull()
    expect(s.employerRiskDeltaMxn).toBeNull()
    expect(s.statePayrollTaxDeltaMxn).toBeNull()
    expect(s.additionalStatutoryAccrualDeltaMxn).toBeNull()
    expect(s.completePrimaryEmployerIncrementMxn).toBeNull()
    expect(r.acceptedForSeptember).toBe(false)
    expect(r.knownComponentIsLowerBound).toBe(false)
  })
  it('respects existing SBC cap instead of extrapolating unbounded contributions', () => {
    const r = comparePrimaryMonthlyVoucher({ ...input, baselineDailySbcMxn: 117.31 * 25 })
    expect(r.fullIntegrationSensitivity.nonRiskContributionDeltaMxn).toBe(0)
    expect(r.directMonthlyMxn).toBe(3430)
    expect(r.fullIntegrationSensitivity.completePrimaryEmployerIncrementMxn).toBeNull()
  })
  it('rejects unsupported CEAV bracket rather than applying the high bracket silently', () => {
    expect(() => comparePrimaryMonthlyVoucher({ ...input, baselineDailySbcMxn: 400 })).toThrow('MX_VARIABLE_CEAV_BRACKET_OUT_OF_SCOPE')
  })
  it.each([
    { ...input, directMonthlyMxn: 999 }, { ...input, baselineIncludesVoucher: true },
    { ...input, baselinePeriod: '2026-09' }, { ...input, compatibleCyclesPerMonth: 0 },
    { ...input, baselineDailySbcMxn: Infinity }, { ...input, cycleId: 'OTHER' },
  ])('rejects injected/default/double-count/unsupported comparison input %#', raw => {
    expect(() => comparePrimaryMonthlyVoucher(raw)).toThrow()
  })
  it('retains BLS aggregate instead of summing rounded categories or adding bonuses again', () => {
    const r = reviewUsAggregateBenefitBoundary()
    expect(r.employerFactor).toBe(36.38 / 24.97)
    expect(r.benefitsHourlyUsd).toBe(11.41)
    expect(r.roundedCategorySumHourlyUsd).toBeCloseTo(11.42, 10)
    expect(r.categoryRoundingDifferenceUsd).toBeCloseTo(.01, 10)
    expect(r.aggregateReplacedWithRoundedCategorySum).toBe(false)
    expect(r.extraBonusOrBenefitsAdded).toBe(false)
    expect(r.incrementalUsd).toBeNull()
    expect(r.actualCarrierCompensationVerified).toBe(false)
  })
  it('connects pinned real research to both existing cycles and three dated FX comparisons without closing E1', () => {
    const r = reviewB2CompensationEvidence()
    expect(r.cases).toHaveLength(2)
    expect(r.sourcePins.some(p => p.id === B2_BENEFITS_PIN.id)).toBe(true)
    expect(r).toMatchObject({ status: 'PARTIAL_COMPONENT_NOT_GATE_PASS', gate: 'E1', referencePeriod: '2026-09',
      quoteReady: false, b2Complete: false, calibrated: false, adoptedValues: 0, externalWrites: false })
    for (const c of r.cases) {
      expect(c.component.baselineDailySbcMxn).toBeGreaterThan(4.01 * 117.31)
      expect(c.fxComparisons.map(fx => fx.date)).toEqual(['2026-09-28', '2026-09-29', '2026-09-30'])
      for (const f of c.fxComparisons) {
        expect(f.directVoucherUsdPerCycle).toBeCloseTo(3430 / c.component.compatibleCyclesPerMonth / f.mxnPerUsd, 10)
        expect(f.knownHypotheticalComponentUsdPerCycle).toBeCloseTo(f.directVoucherUsdPerCycle + f.hypotheticalNonRiskContributionDeltaUsdPerCycle, 10)
        expect(f.selectedForCostEngine).toBe(false)
        expect(f.completeEmployerIncrementUsdPerCycle).toBeNull()
      }
      expect(c.usSecondBenefitChargeUsd).toBe(0)
      expect(c.referenceCostCompositionChanged).toBe(false)
      expect(c.completeCostUsd).toBeNull()
    }
    expect(r.remaining).toContain('RELIEF_EMPLOYEE_ENTITLEMENT')
  })
})
