import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { calculateReferenceDebtSchedule } from '../scripts/lib/reference-debt-schedule.js'
import { consolidateBinationalReferenceBudget } from '../scripts/consolidate-binational-reference-budget.js'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'

const dossier = JSON.parse(readLocalDocument('docs/research/B2_CASH_FINANCED_CAPITAL_2026-10-01.json'))
const summary = consolidateBinationalReferenceBudget()
const comparison = summary.capitalPaymentModeComparison
const input = { currency: 'USD', principal: 12000, rateKind: 'EXPLICIT_PLANNING_NOMINAL_ANNUAL', annualRate: .12,
  termMonths: 12, comparisonMonths: 12, totalGraceMonths: 0, graceTreatment: 'CAPITALIZE_MONTHLY_INTEREST',
  openingFeeCash: 180, feeTreatment: 'PAID_UPFRONT_EXCLUDED_FROM_PRINCIPAL', balloon: 0 }

describe('cash and financed capital with principal, interest, source and validity boundaries', () => {
  it.each(dossier.sources as { id: string; archive: { file: string; sha256: string } }[])('verifies and rejects altered financing archive $id', source => {
    expect(createHash('sha256').update(readLocalDocument(source.archive.file)).digest('hex')).toBe(source.archive.sha256)
    expect(() => consolidateBinationalReferenceBudget(file => readLocalDocument(file) + (file === source.archive.file ? ' ' : '')))
      .toThrow(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
  })
  it('reads the used Freightliner credit terms, not the new-asset or lease product', () => {
    const source = JSON.parse(readLocalDocument(dossier.sources[0].archive.file)).legal
    expect(source.id).toBe(35)
    expect(source.title).toBe('Plan Especial Seminuevos Carga')
    const credit = source.content.split('Plan Especial Seminuevos en Credito Directo:')[1]
      .split('Plan Especial Seminuevos en Arrendamiento Financiero:')[0]
    for (const term of ['12', '60', '11.50%', '15.70%', '20.00%', '1.50%', 'gracia total']) expect(credit).toContain(term)
    expect(source.content).toContain('1.50% sobre monto a financiar')
    expect(source.content).toContain('31 de Agosto')
    expect(dossier.mxHistoricalOffer.validUntil < dossier.observedAt).toBe(true)
    expect(comparison.mxHistoricalStress).toMatchObject({ providerOfferExpired: true, providerRateBasisConfirmed: false, actualContractSchedule: null })
  })
  it('ties 9% APR and 10% down to the used semi row, never the passenger-car promotion', () => {
    const html = readLocalDocument(dossier.sources[1].archive.file)
    const usedRow = html.slice(html.indexOf('Semi-Truck - Used')).split('</tr>')[0]
    expect(usedRow).toContain('data-title="APR">as low as 9.00%')
    expect(usedRow).toContain('data-title="Down Payment">10%')
    expect(usedRow).toContain('Up to 72 months')
    expect(html).toContain(dossier.usPublishedOffer.archiveEffectiveDateText)
    const commercial = readLocalDocument(dossier.sources[2].archive.file)
    expect(commercial).toContain('$49,999.00')
    expect(comparison.usFinancedReference).toMatchObject({ publishedAprAsLowAs: .09, nominalRate: null,
      monthlyPayment: null, averageInterest: null, membershipAndEligibilityConfirmed: false })
    expect(dossier.usPublishedOffer.discountReapplied).toBe(false)
  })
  it.each(['APR', 'CAT', undefined])('rejects %s as nominal interest instead of silently mapping or defaulting', rateKind => {
    expect(() => calculateReferenceDebtSchedule({ ...input, rateKind })).toThrow()
  })
  it.each([
    { annualRate: null }, { openingFeeCash: null }, { totalGraceMonths: undefined },
    { termMonths: 0 }, { comparisonMonths: 0 }, { totalGraceMonths: 12 },
    { annualRate: Infinity }, { principal: -1 }, { balloon: 500 }, { feeTreatment: 'UNKNOWN' },
  ])('rejects incomplete or unsupported schedule %j', change => {
    expect(() => calculateReferenceDebtSchedule({ ...input, ...change })).toThrow()
  })
  it('reconciles ordinary loan cash service to original principal plus accrued interest, not fee or depreciation', () => {
    const report = calculateReferenceDebtSchedule(input)
    expect(report.regularPaymentAfterGrace).toBeCloseTo(12000 * .01 / (1 - 1.01 ** -12), 8)
    expect(report.rows[0].accruedInterest).toBe(120)
    expect(report.rows.at(-1)!.closingBalance).toBe(0)
    expect(report.totalDebtService).toBeCloseTo(12000 + report.totalAccruedInterest, 8)
    expect(report.rows.reduce((sum, row) => sum + row.balanceReduction, 0)).toBeCloseTo(12000, 8)
    expect(report.openingFeeCash).toBe(180)
    expect(report.openingFeeEconomicMonthlyAllocation).toBeNull()
  })
  it('handles zero-rate debt explicitly, rather than dividing by zero', () => {
    const report = calculateReferenceDebtSchedule({ ...input, annualRate: 0 })
    expect(report.regularPaymentAfterGrace).toBe(1000)
    expect(report.totalAccruedInterest).toBe(0)
    expect(report.totalDebtService).toBe(12000)
  })
  it('counts capitalized grace interest once; balance reduction also repays the capitalization', () => {
    const report = calculateReferenceDebtSchedule({ ...input, totalGraceMonths: 1 })
    expect(report.rows[0]).toMatchObject({ accruedInterest: 120, cashDebtService: 0, capitalizedInterest: 120, closingBalance: 12120 })
    expect(report.rows[1].accruedInterest).toBeCloseTo(121.2, 8)
    expect(report.rows.reduce((sum, row) => sum + row.balanceReduction, 0)).toBeCloseTo(12120, 8)
    expect(report.totalDebtService).toBeCloseTo(12000 + report.totalAccruedInterest, 8)
    expect(report.capitalizedGraceInterest).toBeCloseTo(120, 8)
  })
  it('averages interest over the comparison window; never silently equates debt term with remaining asset life', () => {
    const report = calculateReferenceDebtSchedule({ ...input, comparisonMonths: 6 })
    expect(report.averageInterestOverComparisonMonths).toBeCloseTo(report.rows.slice(0, 6).reduce((s, r) => s + r.accruedInterest, 0) / 6, 8)
    expect(report.averageInterestOverComparisonMonths).toBeGreaterThan(report.averageInterestOverLoanMonths)
    const longer = calculateReferenceDebtSchedule({ ...input, comparisonMonths: 24 })
    expect(longer.averageInterestOverComparisonMonths).toBeCloseTo(longer.totalAccruedInterest / 24, 8)
  })
  it('defines debt-free cash for each requested resource without claiming observed debt or acquisition total', () => {
    expect(comparison.userSelectedModes).toEqual(['CASH', 'FINANCED'])
    expect(comparison.resources.map(r => r.resourceId)).toEqual(['MX_TRACTOR', 'US_TRACTOR', 'SHARED_TRAILER'])
    for (const resource of comparison.resources) {
      expect(resource.cash).toMatchObject({ debtInterest: 0, basis: 'USER_SELECTED_DEBT_FREE_SCENARIO_NOT_CARRIER_FACT',
        capitalizableAcquisition: null, completeMonthlyCapital: null })
      expect(resource.financed.actualMonthlyInterest).toBeNull()
      expect(resource.financed.completeMonthlyCapital).toBeNull()
      expect(resource.eligibleForBudget).toBe(false)
    }
    expect(comparison.sameUnderlyingAssetAndDepreciation).toBe(true)
    expect(comparison.actualCarrierPaymentModeKnown).toBe(false)
    expect(comparison.resources[2].financed.evidenceStatus).toBe('NO_MATCHED_TRAILER_FINANCE_TERMS')
  })
  it('computes historical MX stress from pinned asking/rate inputs but does not transfer it to the US or box', () => {
    const stress = comparison.mxHistoricalStress
    expect(stress.downPaymentReferenceMxn + stress.borrowedPrincipalReferenceMxn).toBeCloseTo(1198275.86, 8)
    expect(stress.downPaymentReferenceMxn).toBeCloseTo(239655.172, 8)
    expect(stress.schedules.map(s => s.input.annualRate)).toEqual([.115, .157])
    for (const s of stress.schedules) {
      expect(s.input).toMatchObject({ currency: 'MXN', termMonths: 60, comparisonMonths: 36, totalGraceMonths: 1, balloon: 0 })
      expect(s.openingFeeCash).toBeCloseTo(stress.borrowedPrincipalReferenceMxn * .015, 8)
      expect(s.averageInterestOverComparisonMonths).toBeGreaterThan(s.averageInterestOverLoanMonths)
      expect(s.totalDebtService).toBeCloseTo(s.originalBorrowedPrincipal + s.totalAccruedInterest, 6)
      expect(s.principalRepaymentsAddedToDepreciation).toBe(false)
      expect(s.eligibleForBudget).toBe(false)
    }
    expect(stress.schedules[0].averageInterestOverComparisonMonths).toBeLessThan(stress.schedules[1].averageInterestOverComparisonMonths)
    expect(stress.appliesToUsOrTrailer).toBe(false)
    expect(comparison.usFinancedReference.borrowedPrincipalBeforeUnknownTaxesFeesUsd).toBeCloseTo(36445.5, 8)
  })
  it('keeps prior business outputs, fees, opportunity cost and FX unresolved, not zero/adopted', () => {
    expect(comparison).toMatchObject({ feeAllocationResolved: false, equityOpportunityCostResolved: false,
      monthlyPaymentAddedToDepreciation: false, fxConversionPerformed: false })
    // Acquisition-based comparison remains partial; approved prospective US use
    // capital and the earlier premium are the two modeled budget families.
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(summary.authoritativeBudget.conditions).toHaveLength(11)
    const capitalRows=summary.budgetRows.filter(row=>row.family==='CAPITAL')
    expect(capitalRows).toHaveLength(3)
    expect(capitalRows.filter(row=>row.completeAmountUsdPerMonth!==null).map(row=>row.economicExpenseId)).toEqual(['US_TRACTOR_CAPITAL'])
    expect(Object.values(summary.outputs).every(value => value === null)).toBe(true)
    expect(summary.adoptedValues).toBe(0)
    expect(Object.values(summary.externalChanges).every(value => value === false)).toBe(true)
  })
})
