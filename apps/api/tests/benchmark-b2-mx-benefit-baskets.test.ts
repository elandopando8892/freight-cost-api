import { describe, expect, it } from 'vitest'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'
import { B2_MX_BASKETS_PIN, inspectMxBenefitBasket, readMxBenefitBaskets, reviewMxBenefitBaskets } from '../scripts/lib/b2-mx-benefit-baskets.js'
import { reviewB2CompensationEvidence } from '../scripts/review-b2-compensation-evidence.js'

describe('E1 MX canasta admissibility, not mixing offers into invented benefits', () => {
  it('checks facts and handles LF/CRLF identically without accepting price changes', () => {
    const body = readLocalDocument(B2_MX_BASKETS_PIN.file).replace(/\r\n/g, '\n')
    expect(readMxBenefitBaskets(() => body)).toEqual(readMxBenefitBaskets(() => body.replace(/\n/g, '\r\n')))
    expect(() => readMxBenefitBaskets(() => body.replace('3430', '5000'))).toThrow('B2_MX_BASKETS_SOURCE_HASH')
    expect(() => readMxBenefitBaskets(() => body + ' ')).toThrow('B2_MX_BASKETS_SOURCE_HASH')
  })
  it('counts employer groups, not two Trayecto pages as independent employers or duplicate charges', () => {
    const r = reviewMxBenefitBaskets()
    expect(r).toMatchObject({ sourceCount: 5, verifiedOfferCount: 3, verifiedEmployerGroupCount: 2,
      voucherComparableOfferCount: 2, voucherComparableEmployerGroupCount: 1, voucherChargesAdded: 0,
      completeSeptemberBasketCount: 0, crossEmployerBasketMerged: false })
    expect(r.baskets.map(b => b.rows.length)).toEqual([8, 8, 8, 8, 8])
    expect(r.baskets.find(b => b.id === 'TRAYECTO_NUEVO_LAREDO_ALA')!.sameGroupCorroborationNotIndependentSample).toBe(true)
  })
  it('corroborates a single monthly voucher without assuming amounts for the rest of the package', () => {
    const b = inspectMxBenefitBasket({ offerId: 'TRAYECTO_NUEVO_LAREDO_ALA' })
    expect(b.role).toBe('SINGLE_DRY_VAN')
    expect(b.knownRecurringComponentMxnPerEmployeeMonth).toBe(3430)
    expect(b.rows.find(r => r.conceptId === 'EMPLOYER_SAVINGS_FUND')).toMatchObject({
      evidenceState: 'ADVERTISED_UNPRICED', publishedAmountMxn: null, includedInPriorComponentComparison: false })
    expect(b.rows.find(r => r.conceptId === 'RECURRING_BONUS')).toMatchObject({
      evidenceState: 'NOT_ESTABLISHED_NOT_ZERO', publishedAmountMxn: null })
    expect(b.completeRecurringBasketMonthlyMxn).toBeNull()
    expect(b.septemberCostAccepted).toBe(false)
  })
  it('does not mistake a quantified welcome incentive for recurring compensation', () => {
    const b = inspectMxBenefitBasket({ offerId: 'TRAYECTO_CDMX_ALA' })
    expect(b.rows.find(r => r.conceptId === 'WELCOME_BONUS')).toMatchObject({ publishedAmountMxn: 10000,
      amountBasis: 'PER_HIRE_NOT_MONTH', evidenceState: 'ONE_OFF_NOT_RECURRING', recurringComparableComponentMxnPerEmployeeMonth: null,
      includedInPriorComponentComparison: false, contributesAdditionalChargeMxn: null })
  })
  it('a dated September full-truck offer is not a date-matched dryvan binational benefit price', () => {
    const b = inspectMxBenefitBasket({ offerId: 'FEMSA_ALTAMIRA_FULL_20260924' })
    expect(b.datedSeptemberPublication).toBe(true)
    expect(b.role).toBe('FULL')
    expect(b.comparisonEligibility).toBe('CONTEXT_ONLY_NO_COST_TRANSFER')
    expect(b.knownRecurringComponentMxnPerEmployeeMonth).toBeNull()
    expect(b.rows.find(r => r.conceptId === 'LIFE_INSURANCE')!.evidenceState).toBe('ADVERTISED_UNPRICED')
    expect(b.publicationProvesBinationalOrWholePackage).toBe(false)
  })
  it.each(['GEPP_LOCAL_WITHDRAWN', 'TRAYECTO_LOCAL_INDEX_ONLY'])('rejects cached/index-only claims when primary offer is unavailable: %s', offerId => {
    const b = inspectMxBenefitBasket({ offerId })
    expect(b.rows.every(r => r.evidenceState === 'PRIMARY_UNAVAILABLE_NO_PRICE' && r.publishedAmountMxn === null)).toBe(true)
    expect(b.knownRecurringComponentMxnPerEmployeeMonth).toBeNull()
    expect(b.completeRecurringBasketMonthlyMxn).toBeNull()
  })
  it.each([
    { offerIds: ['TRAYECTO_CDMX_ALA', 'FEMSA_ALTAMIRA_FULL_20260924'] },
    { offerId: 'TRAYECTO_CDMX_ALA', savingsPercent: .13 },
    { offerId: 'TRAYECTO_CDMX_ALA', monthlyBenefitMxn: 3430 }, { offerId: 'UNKNOWN' },
  ])('rejects cross-offer merging, statutory-ceiling percentage or caller-price injection %#', input => {
    expect(() => inspectMxBenefitBasket(input)).toThrow()
  })
  it('links the baskets to the existing economic review without adding another voucher or claiming E1 closure', () => {
    const r = reviewB2CompensationEvidence()
    expect(r.sourcePins.filter(p => p.id === B2_MX_BASKETS_PIN.id)).toHaveLength(1)
    expect(r.sourcePins).toHaveLength(85)
    expect(r.mxBenefitBaskets.baskets).toHaveLength(5)
    for (const c of r.cases) {
      expect(c.component.directMonthlyMxn).toBe(3430)
      expect(c.component.fullIntegrationSensitivity.nonRiskContributionDeltaMxn).toBeCloseTo(689.8759, 7)
      expect(c.fxComparisons).toHaveLength(3)
      expect(c.referenceCostCompositionChanged).toBe(false)
      expect(c.completeCostUsd).toBeNull()
    }
    expect(r.status).toBe('PARTIAL_COMPONENT_NOT_GATE_PASS')
    expect(r.mxBenefitBaskets).toMatchObject({ quoteReady: false, calibrated: false, adoptedValues: 0, externalWrites: false })
  })
})
