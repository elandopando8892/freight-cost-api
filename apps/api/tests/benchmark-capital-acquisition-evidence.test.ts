import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../../../docs/research')
const dossier = JSON.parse(readFileSync(resolve(root, 'B2_CAPITAL_ACQUISITION_BRIDGE_2026-09-29.json'), 'utf8'))
const sources = new Map<string, any>(dossier.sources.map((source: any) => [source.id, source]))

describe('public capital bridge: offers do not become governed amounts', () => {
  it('keeps economic outputs uncalibrated and no gates closed', () => {
    expect(dossier).toMatchObject({ calibrated: false, quoteReady: false, adoptedValues: 0 })
    expect(Object.values(dossier.outputs).every(value => value === null)).toBe(true)
    expect(dossier.decision).toMatchObject({ B2: 'PARTIAL', B1: 'OPEN', E1: 'OPEN', businessGatesClosed: 0 })
    expect(dossier.method).toMatchObject({ transferToGovernedContract: false, fxConversionPerformed: false, distributionOrMedianEstimated: false, targetPeriod: null })
  })
  it.each(['MX', 'US'])('keeps %s acquisition, used remaining life, residual and financing unknown', country => {
    const card = dossier.acquisitionCards.find((item: any) => item.country === country)
    expect(sources.has(card.sourceId)).toBe(true)
    expect(card).toMatchObject({ condition: 'USED', proposalStatus: 'NOT_ADOPTED', sourceMatchesTargetService: false })
    for (const field of ['discount', 'nonRecoverablePurchaseTaxes', 'directDeliveryAndPreparation', 'capitalizableAcquisitionCost', 'remainingHorizonMonths', 'netResidualAtEnd', 'monthlyInterestExpense', 'monthlyDepreciation', 'fxRate']) {
      expect(card[field], field).toBeNull()
    }
  })
  it('keeps exact MX asking price distinct from rounded header and capitalizable cost', () => {
    const price = dossier.acquisitionCards[0].askingPrice
    expect(price).toMatchObject({ value: 1198275.86, currency: 'MXN', taxTreatment: 'PLUS_IVA', headerRoundedValue: 1198276 })
    expect(price.headerRoundedValue - price.value).toBeCloseTo(0.14, 8)
  })
  it('records the individual US asset without claiming USD or a change in another stock price', () => {
    const card = dossier.acquisitionCards[1]
    expect(card).toMatchObject({ stock: '20753', sleeperInches: 48, odometer: { value: 531334, unit: 'mile' }, askingPrice: { value: 45000, currency: null } })
    expect(sources.get(card.sourceId).url).toBe('https://schneider.com/used-equipment/semi-trucks-for-sale/20753')
    expect(sources.get(card.sourceId).snapshotSha256).toBeNull()
    expect(card.historicalOfferDisposition).toContain('No price-change or depreciation inference')
  })
  it('recomputes 52-week average rather than calling four weeks a calendar month', () => {
    const lease = dossier.leaseContrast
    expect(lease.weeklyBasePayment * lease.leaseWeeks).toBe(lease.annualBasePayment)
    expect(lease.annualBasePayment / dossier.method.monthsPerYear).toBe(lease.averageMonthlyBasePayment)
    expect(lease.weeklyBasePayment * 4).toBe(lease.fourWeekPayment)
    expect(lease.averageMonthlyBasePayment - lease.fourWeekPayment).toBe(230)
  })
  it('does not import unavailable starting TRAC payments, deposits or maintenance reserves as all-in rent', () => {
    expect(dossier.leaseContrast).toMatchObject({ availableUnits: 0, usableInOwnedProfile: false, usableAsCurrentLeaseQuote: false, allInMonthlyCost: null, remainingBuyoutBalance: null, maintenanceAccountContribution: null, maintenanceExpenseIncluded: null, insuranceIncluded: null, currency: null })
    expect(dossier.leaseContrast.classification).toContain('NOT_PURE_OPERATING_RENT')
    expect(dossier.leaseContrast.moneyDownEconomicTreatment).toBe('UNRESOLVED_NOT_AMORTIZED_EXPENSE')
    expect(sources.has('SFI_REQUIREMENTS')).toBe(true)
    expect(sources.has('SFI_MAINTENANCE')).toBe(true)
  })
  it('keeps one physical trailer, unknown cost rather than omission or double charge', () => {
    expect(dossier.sharedTrailer).toMatchObject({ owner: null, tenure: null, costBearer: null, allocationBetweenLegs: null, monthlyCapitalCost: null, costKnownZero: false, chargedFullToBothLegs: false })
    expect(dossier.method.doubleCountingRules).toHaveLength(5)
  })
  it.each(dossier.unchangedFiles)('preserves prior $file without adoption', ({ file, sha256 }: any) => {
    expect(createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex')).toBe(sha256)
  })
})
