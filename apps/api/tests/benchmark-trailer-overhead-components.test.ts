import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { compareReferenceAssetTaxBases } from '../scripts/lib/reference-asset-tax-contrast.js'
import { readLocalDocument, readLocalDocumentBytes } from '../scripts/assemble-economic-reference-cards.js'
import { consolidateBinationalReferenceBudget } from '../scripts/consolidate-binational-reference-budget.js'
import { PARAMETER_DEFINITIONS } from '../src/data/parameter-catalog.js'

const dossier = JSON.parse(readLocalDocument('docs/research/B2_TRAILER_OVERHEAD_COMPONENTS_2026-10-01.json'))
const report = consolidateBinationalReferenceBudget()
const contrasts = report.supportingMxUsedCapital.trailer.taxSensitivity.contrasts
const base = { currency: 'MXN', newerQuotedNet: 630000, olderQuotedAmount: 540000,
  olderQuoteBasis: 'NET_PLUS_VAT', vatRate: .16, nonrecoverablePurchaseVatFraction: 0,
  analogyMonths: 24, saleVatTreatment: 'NET_OF_OUTPUT_VAT_FOR_TAXABLE_ENTERPRISE_SALE' }

describe('one box tax contrast and one group overhead pool, without adopted defaults', () => {
  it.each(dossier.reusedPins as { id: string; file: string; sha256: string }[])('preserves previous evidence $id', pin => {
    expect(createHash('sha256').update(readLocalDocument(pin.file)).digest('hex')).toBe(pin.sha256)
  })
  it.each(dossier.sources as { id: string; archive: { file: string; sha256: string } }[])('verifies original archive bytes and rejects changes $id', source => {
    expect(createHash('sha256').update(readLocalDocumentBytes(source.archive.file)).digest('hex')).toBe(source.archive.sha256)
    if (source.archive.file.endsWith('.pdf')) {
      expect(readLocalDocumentBytes(source.archive.file).subarray(0, 5).toString()).toBe('%PDF-')
      expect(() => consolidateBinationalReferenceBudget(readLocalDocument, file => {
        const bytes = readLocalDocumentBytes(file)
        if (file === source.archive.file) bytes[bytes.length - 1] ^= 1
        return bytes
      })).toThrow(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
    } else {
      expect(() => consolidateBinationalReferenceBudget(file => readLocalDocument(file) + (file === source.archive.file ? ' ' : '')))
        .toThrow(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
    }
  })
  it('retains the same docs/realpath boundary for binary and text reads', () => {
    expect(() => readLocalDocumentBytes('package.json')).toThrow('SOURCE_OUTSIDE_DOCS')
    expect(() => readLocalDocument('docs/../package.json')).toThrow('SOURCE_OUTSIDE_DOCS')
  })
  it.each([
    { olderQuoteBasis: undefined }, { vatRate: null }, { nonrecoverablePurchaseVatFraction: undefined },
    { nonrecoverablePurchaseVatFraction: 1.01 }, { nonrecoverablePurchaseVatFraction: -.01 },
    { analogyMonths: 0 }, { olderQuotedAmount: -1 }, { newerQuotedNet: Infinity }, { currency: 'USD' },
    { saleVatTreatment: 'RETAIN_OUTPUT_VAT_AS_RESIDUAL' },
  ])('rejects absent or incompatible tax assumptions %j', change => {
    expect(() => compareReferenceAssetTaxBases({ ...base, ...change })).toThrow()
  })
  it('reproduces the old 3,750 arithmetic only under explicit before-tax/full-credit assumptions', () => {
    const s = compareReferenceAssetTaxBases(base)
    expect(s.purchaseCashReference).toBe(730800)
    expect(s.purchaseCreditReference).toBe(100800)
    expect(s.purchaseEconomicReference).toBe(630000)
    expect(s.olderNetAskingReference).toBe(540000)
    expect(s.olderOutputVatReference).toBe(86400)
    expect(s.monthlyEquivalentOfContrast).toBe(3750)
  })
  it('removes sale output VAT from a VAT-inclusive older price instead of treating 540,000 as net residual', () => {
    const s = compareReferenceAssetTaxBases({ ...base, olderQuoteBasis: 'GROSS_INCLUDES_VAT' })
    expect(s.olderGrossAskingReference).toBe(540000)
    expect(s.olderNetAskingReference).toBeCloseTo(465517.24137931, 6)
    expect(s.olderOutputVatReference + s.olderNetAskingReference).toBeCloseTo(540000, 8)
    expect(s.monthlyEquivalentOfContrast).toBeCloseTo(6853.448275862, 8)
    expect(s.predictedNetResidual).toBeNull()
  })
  it('models nonrecoverable purchase VAT independently of remitting sale VAT', () => {
    const [fullCreditNet, noCreditNet, fullCreditGross, noCreditGross] = contrasts
    expect(noCreditNet.purchaseEconomicReference).toBe(730800)
    expect(noCreditNet.purchaseCreditReference).toBe(0)
    expect(noCreditNet.monthlyEquivalentOfContrast).toBe(7950)
    expect(noCreditGross.monthlyEquivalentOfContrast).toBeCloseTo(11053.448275862, 8)
    expect(noCreditNet.olderNetAskingReference).toBe(fullCreditNet.olderNetAskingReference)
    expect(noCreditGross.olderOutputVatReference).toBe(fullCreditGross.olderOutputVatReference)
    expect(noCreditGross.monthlyEquivalentOfContrast - fullCreditGross.monthlyEquivalentOfContrast).toBeCloseTo(100800 / 24, 8)
    const partial = compareReferenceAssetTaxBases({ ...base, nonrecoverablePurchaseVatFraction: .5 })
    expect(partial.purchaseCreditReference).toBe(50400)
    expect(partial.monthlyEquivalentOfContrast).toBe(5850)
  })
  it('labels all four combinations as price/tax contrasts, never selected capital/depreciation/life or actual credit', () => {
    expect(contrasts).toHaveLength(4)
    for (const s of contrasts) {
      expect(s).toMatchObject({ actualPurchaseCredit: null, predictedNetResidual: null, remainingLifeMonths: null,
        completeMonthlyCapital: null, eligibleForBudget: false, selected: false,
        classification: 'CROSS_SECTION_TAX_ASSUMPTION_CONTRAST_NOT_NET_RESIDUAL_OR_DEPRECIATION' })
    }
    expect(report.supportingMxUsedCapital.trailer.taxSensitivity).toMatchObject({ actualOlderQuoteBasis: null,
      actualCreditEligibility: null, actualApplicableVatRate: null, holdingPeriodSelected: false })
    expect(report.supportingMxUsedCapital.trailer.monthlyCompleteCapitalMxn).toBeNull()
  })
  it('covers 23 canonical company pairs without replacing missing prices or quantities with zero', () => {
    const rows = report.supportingOverheadUnits.companyRows
    const fields = rows.flatMap(r => [`Qty ${r.fieldSuffix}`, `PU ${r.fieldSuffix}`])
    expect(new Set(fields)).toEqual(new Set(PARAMETER_DEFINITIONS.filter(p => p.section === 'COST_COMPANY').map(p => p.field)))
    for (const row of rows) expect(row).toMatchObject({ quantity: null, adoptedUnitPrice: null, monthlyEconomicAmount: null })
    expect(rows.filter(r => r.status === 'UNRESOLVED_NOT_ZERO')).toHaveLength(19)
    expect(report.supportingOverheadUnits.canonicalFieldsWithUnitComponents).toBe(4)
  })
  it('maps phone/internet to one commercial-line bundle; activation does not waive new-line installation', () => {
    const component = dossier.overheadUnitComponents[0]
    expect(component).toMatchObject({ currency: 'MXN', quantityUnit: 'commercial-line-month',
      publishedGrossUnitPrice: 399, publishedBeforeTaxesUnitPrice: 336.9, economicUnitPrice: null, quantity: null,
      oneTimeInstallationGrossMxn: 1600, packageActivationFeePublishedZero: true,
      newLineInstallationInferredZero: false, advertisedPageValidityExpiredAtObservation: true })
    const rows = report.supportingOverheadUnits.companyRows.filter(r => ['Telefonia Fija', 'Internet'].includes(r.fieldSuffix))
    expect(rows).toHaveLength(2)
    expect(rows.every(r => r.componentIds.join(',') === 'MX_OFFICE_COMMS_BUNDLE')).toBe(true)
    const html = readLocalDocument(dossier.sources.find((s: { id: string }) => s.id === 'TELMEX_BUSINESS_PAGE').archive.file)
    expect(html).toContain('class="numeros_c">$399')
    expect(html).toContain('Vigencia 30 de septiembre de 2026')
    expect(component.publishedBeforeTaxesUnitPrice).not.toBeCloseTo(component.publishedGrossUnitPrice / 1.16, 2)
    expect(component.publishedTaxBreakdown).toBeNull()
  })
  it('keeps three TMS plans alternative/user-based and does not turn a trial or marketing free claim into ongoing zero', () => {
    const component = dossier.overheadUnitComponents[1]
    expect(component.planAlternatives.map((p: { publishedUnitPrice: number }) => p.publishedUnitPrice)).toEqual([69, 119, 149])
    const html = readLocalDocument(dossier.sources.find((s: { id: string }) => s.id === 'ASCENDTMS_PRICING').archive.file)
    for (const price of [69, 119, 149]) expect(html).toContain(`Monthly Per User Cost: $${price}`)
    expect(html).toContain('USD')
    expect(component).toMatchObject({ quantityUnit: 'licensed-user-month', currency: 'USD',
      plansAreAlternativesNotSum: true, chargedPerTruck: false, trialAsRecurringZero: false,
      loadBoardSubscriptionsIncluded: false, publishedTaxTreatment: null, selectedPlan: null, quantity: null })
    const ids = report.supportingOverheadUnits.companyRows.filter(r => ['Software', 'Subscriptions'].includes(r.fieldSuffix))
      .flatMap(r => r.componentIds)
    expect(new Set(ids)).toEqual(new Set(['TMS_SHARED_POOL']))
  })
  it('keeps one group pool and one box without combining USD/MXN or enabling CFU/CVU from fragments', () => {
    expect(report.supportingOverheadUnits).toMatchObject({ uniqueExpenseIds: ['MX_OFFICE_COMMS_BUNDLE', 'TMS_SHARED_POOL'],
      completeMonthlyExpenses: 0, twoCurrenciesNotAdded: true, poolChargedOnceBeforeResourceAllocation: true,
      monthlyGroupEconomicAmountUsd: null, quantityDefaultsInvented: false, payrollCovered: false,
      allocationShares: null, fxConversionPerformed: false, eligibleForBudget: false })
    expect(report.budgetRows.filter(r => r.economicExpenseId === 'SHARED_TRAILER_CAPITAL')).toHaveLength(1)
    expect(report.originalBudgetBaseline.completeRows).toBe(0)
    expect(report.authoritativeBudget).toMatchObject({ completeRows: 2, monthlyGroupTotalUsd: null })
    expect(report.authoritativeBudget.conditions).toHaveLength(11)
    expect(report.reviewedSharedBoxCashSensitivity.baselineChanged).toBe(false)
    expect(report.reviewedSharedBoxCashSensitivity.scenarios.map(s=>s.modeledExpenseRows)).toEqual([3,3])
    expect(Object.values(report.outputs).every(v => v === null)).toBe(true)
    expect(report.adoptedValues).toBe(0)
    expect(Object.values(report.externalChanges).every(v => v === false)).toBe(true)
  })
})
