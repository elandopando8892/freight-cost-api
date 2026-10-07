import { describe, expect, it } from 'vitest'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'
import { consolidateBinationalReferenceBudget } from '../scripts/consolidate-binational-reference-budget.js'
import { readSeptemberLaborReceipt, B2_SEPTEMBER_LABOR_PIN, reviewB2SeptemberLabor } from '../scripts/review-b2-september-labor.js'
import { calculateMxDriverPublicForecast, joinPilotDriverForecastComponents } from '../scripts/lib/reference-mx-driver-forecast.js'
import { readUsDriverPlanning } from '../scripts/lib/reference-us-driver-planning.js'
import { US_DRIVER_PLANNING_PIN } from '../scripts/compose-public-pilot-cost.js'

const r = consolidateBinationalReferenceBudget(undefined, undefined, 'POSTAL_REFERENCE', 'PUBLIC_LINK_FORECAST', 'IMT_C3_NON_ARTICULATED_PROXY')
const policy = JSON.parse(readLocalDocument('docs/research/B2_MX_DRIVER_FORECAST_2026-10-02.json'))
const septemberPolicy = { ...policy, referenceMonth: '2026-09', riskPolicy: 'EXISTING_EMPLOYER_RATE_UNKNOWN' }
const run = (p: unknown = septemberPolicy, fx: unknown = { mxnPerUsd: 17.8413, observationDate: '2026-09-28' }) =>
  calculateMxDriverPublicForecast(p, r.supportingPilotCycleExposure, r.supportingPilotPhysicalCycle,
    r.supportingMxVariableDriver, r.supportingPilotVariableEconomics, fx)

describe('September labor reconstruction, not a mixed-period full quotation', () => {
  it('verifies the dated receipt across line endings and rejects altered period or prices', () => {
    const body = readLocalDocument(B2_SEPTEMBER_LABOR_PIN.file).replace(/\r\n/g, '\n')
    expect(readSeptemberLaborReceipt(() => body)).toEqual(readSeptemberLaborReceipt(() => body.replace(/\n/g, '\r\n')))
    expect(() => readSeptemberLaborReceipt(() => body.replace('2025-54', '2026-60'))).toThrow('B2_SEPTEMBER_LABOR_HASH')
  })
  it('uses September30covered days and per-person unknown existing risk, not initial-classV or zero risk', () => {
    const s = run()
    expect(s.monthCoveredDays).toBe(30)
    for (const c of s.scenarios) {
      expect(c.primary.contributions.coveredDays).toBe(30)
      expect(c.relief.contributions.coveredDays).toBe(14)
      expect(c.primary.contributions.workRiskContributionMxn).toBeNull()
      expect(c.relief.contributions.workRiskContributionMxn).toBeNull()
      expect(c.monthlyContributionReferenceMxn).toBeCloseTo(c.primary.contributions.knownContributionsMxn + c.relief.contributions.knownContributionsMxn / 12, 8)
      expect(c.fixedContributionMonthlyMxn).toBeCloseTo(117.31 * .204 * (30 + 14 / 12), 8)
      expect(c.referenceTransfer).toMatchObject({ existingEmployerRiskMonthlyMxn: null,
        completeEmployerContributionMonthlyMxn: null, knownContributionSubtotalExcludesUnknownRisk: true })
    }
  })
  it.each([
    { mxnPerUsd: 18.3688, observationDate: '2026-10-01' }, { mxnPerUsd: 17.8413 },
    { mxnPerUsd: 18.0710, observationDate: '2026-09-28' },
  ])('rejects missing/mismatched/post-period FX %#', fx => {
    expect(() => run(septemberPolicy, fx)).toThrow('DRIVER_FORECAST_REFERENCE_FX_MISMATCH')
  })
  it('rejects an initial-employer risk policy for the September existing-company comparison', () => {
    expect(() => run({ ...septemberPolicy, riskPolicy: policy.riskPolicy })).toThrow('DRIVER_FORECAST_REFERENCE_RISK_MISMATCH')
  })
  it('keeps the historical October contract and output identical', () => {
    const historical = calculateMxDriverPublicForecast(policy, r.supportingPilotCycleExposure, r.supportingPilotPhysicalCycle,
      r.supportingMxVariableDriver, r.supportingPilotVariableEconomics, { mxnPerUsd: 18.3688 })
    expect(historical).toEqual(r.supportingMxDriverForecast)
    expect(historical.monthCoveredDays).toBe(31)
    expect(() => run(policy, { mxnPerUsd: 17.8413, observationDate: '2026-09-28' })).toThrow('DRIVER_FORECAST_REFERENCE_FX_MISMATCH')
  })
  it('forbids joining September payroll to the historical whole-trip compositor', () => {
    expect(() => joinPilotDriverForecastComponents(run(), r.supportingPilotPhysicalCycle, r.supportingPilotRoadBorderEconomics))
      .toThrow('PILOT_PAYROLL_REFERENCE_MIXING')
  })
  it('checks IRS notice and effective date against the period instead of relabeling October', () => {
    const us = JSON.parse(readLocalDocument(US_DRIVER_PLANNING_PIN.file))
    expect(() => readUsDriverPlanning({ ...us, referencePeriod: '2026-09' })).toThrow('US_DRIVER_PLANNING_PERIOD_NOTICE_MISMATCH')
    const p = { ...us, referencePeriod: '2026-09', mealAndIncidentals: { ...us.mealAndIncidentals, notice: '2025-54', effectiveFrom: '2025-10-01' },
      sources: us.sources.map((s: { id: string }) => s.id === 'IRS_NOTICE2026_60_TRANSPORTATION_MIE' ? { ...s, id: 'IRS_NOTICE2025_54_TRANSPORTATION_MIE',
        url: 'https://www.irs.gov/pub/irs-drop/n-25-54.pdf', period: 'EFFECTIVE_2025-10-01' } : s) }
    expect(readUsDriverPlanning(p).mealAndIncidentals.notice).toBe('2025-54')
    expect(() => readUsDriverPlanning({ ...p, referencePeriod: '2026-10' })).toThrow('US_DRIVER_PLANNING_PERIOD_NOTICE_MISMATCH')
    expect(() => readUsDriverPlanning({ ...p, sources: p.sources.map((s: { id: string }) => s.id === 'IRS_NOTICE2025_54_TRANSPORTATION_MIE' ?
      { ...s, url: 'https://www.irs.gov/pub/irs-drop/n-26-60.pdf' } : s) })).toThrow('US_DRIVER_PLANNING_NOTICE_SOURCE_MISMATCH')
  })
  it('reconstructs12separate comparisons without FX selection, double food or a complete-trip output', () => {
    const before = JSON.stringify(policy), result = reviewB2SeptemberLabor()
    expect(result.cases).toHaveLength(12)
    expect(new Set(result.cases.map(c => `${c.cycleId}:${c.restInterpretation}:${c.fx.date}`)).size).toBe(12)
    expect(result.sourcePins.filter(p => p.id === B2_SEPTEMBER_LABOR_PIN.id)).toHaveLength(1)
    for (const c of result.cases) {
      expect(c.mxCoveredDays).toBe(30)
      expect(c.mx.fixedQuotaUsdPerCycle).toBeCloseTo(c.mx.fixedQuotaMonthlyMxn / c.fx.mxnPerUsd / c.compatibleCyclesPerMonth, 9)
      expect(c.mx.knownIncomeLinkedUsdPerCycle).toBeCloseTo(c.mx.knownIncomeLinkedMonthlyMxn / c.fx.mxnPerUsd / c.compatibleCyclesPerMonth, 9)
      expect(c.mx.primary.annualRoadWagesMxn + c.mx.relief.annualRoadWagesMxn).toBeGreaterThan(0)
      expect(c.mx.directFoodIncludedInDriverAgain).toBe(false)
      expect(c.mx.existingRiskMonthlyMxn).toBeNull()
      expect(c.mx.completeEmployerContributionsMonthlyMxn).toBeNull()
      expect(c.us.mieNotice).toBe('2025-54')
      expect(c.us.mieEffectiveFrom).toBe('2025-10-01')
      expect(c.us.mixedLodgingUsd).toBeNull()
      expect(c.historicalNonLaborUsdSumTransferred).toBe(false)
      expect(c.otherCostsRebuiltForSeptember).toBe(false)
      expect(c.completeTripCostUsd).toBeNull()
      expect(c.selectedForCostEngine).toBe(false)
    }
    expect(JSON.stringify(policy)).toBe(before)
    expect(reviewB2SeptemberLabor()).toEqual(result)
    expect(result).toMatchObject({ calibrated: false, quoteReady: false, b2Complete: false, adoptedValues: 0, externalWrites: false })
  })
})
