import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'
import { consolidateBinationalReferenceBudget } from '../scripts/consolidate-binational-reference-budget.js'

type Pin = { file: string; sha256: string }
type Source = { id: string; url: string; archive: Pin }
type Offer = { sourceId: string; askingMxn: number; [key: string]: unknown }
const dossier = JSON.parse(readLocalDocument('docs/research/B2_MX_USED_MARKET_COMPARABILITY_2026-10-01.json'))
const report = consolidateBinationalReferenceBudget()
const offers = dossier.offers as Offer[]
const offer = (id: string) => offers.find(o => o.sourceId === id)!
const sources = dossier.sources as Source[]
const archive = (id: string) => readLocalDocument(sources.find(s => s.id === id)!.archive.file)

describe('MX used capital: same specifications do not establish future net value or service life', () => {
  it.each(dossier.pins as Pin[])('keeps prior evidence $file intact', pin => {
    expect(createHash('sha256').update(readLocalDocument(pin.file)).digest('hex')).toBe(pin.sha256)
  })
  it.each(sources)('rejects altered archive $id from the consolidated report', source => {
    expect(() => consolidateBinationalReferenceBudget(file => readLocalDocument(file) + (file === source.archive.file ? ' ' : '')))
      .toThrow(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
  })
  it.each(['UTILITY_2021', 'UTILITY_2019', 'RYT_CASCADIA_2021', 'RYT_CASCADIA_2018'])('ties %s price/currency to the selected product, not a recommended item', id => {
    const scripts = [...archive(id).matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)]
      .map(m => JSON.parse(m[1]))
    // URL serialization encodes the accented path; preserve exact product identity.
    const expectedUrl = new URL(sources.find(s => s.id === id)!.url).href
    const product = scripts.find(p => p['@type'] === 'Product' && p.offers?.url && new URL(p.offers.url).href === expectedUrl)
    expect(product).toBeDefined()
    expect(product.offers.priceCurrency).toBe('MXN')
    expect(Number(product.offers.price)).toBe(offer(id).askingMxn)
  })
  it('matches the published box specifications without confusing stock quantity with sampled units', () => {
    for (const key of dossier.trailerMarketContrast.matchedSpecificationFields as string[]) {
      expect(offer('UTILITY_2021')[key]).toBe(offer('UTILITY_2019')[key])
    }
    expect(offer('UTILITY_2021').availableUnitsPublished).toBe(2)
    expect(offer('UTILITY_2019').availableUnitsPublished).toBe(3)
    expect(report.supportingMxUsedCapital.samePublishedSpecs).toBe(true)
    expect(report.supportingMxUsedCapital.trailer.publishedPriceGapMxn).toBe(90000)
  })
  it('computes price-gap arithmetic, never used remaining life or predicted resale', () => {
    expect(report.supportingMxUsedCapital.trailer).toMatchObject({
      newerPublishedAskingMxn: 630000, olderPublishedAskingMxn: 540000,
      publishedPriceGapMxn: 90000, modelYearGap: 2, monthlyEquivalentOfPublishedGapMxn: 3750,
      classification: 'CROSS_SECTION_ARITHMETIC_NOT_OBSERVED_DEPRECIATION',
      selectedPlannedHoldingMonths: null, remainingLifeMonths: null,
      netResidualMxn: null, monthlyCompleteCapitalMxn: null, monthlyCompleteCapitalUsd: null,
      sameAssetLongitudinalObservation: false, eligibleForBudget: false, selected: false,
    })
    expect(report.supportingMxUsedCapital.trailer.olderToNewerAskingRatio).toBeCloseTo(6 / 7, 12)
  })
  it('does not silently align unknown 2019 tax treatment or import a VAT rate', () => {
    expect(offer('UTILITY_2021').taxTreatment).toBe('PLUS_IVA')
    expect(offer('UTILITY_2019').taxTreatment).toBe('UNRESOLVED')
    expect(report.supportingMxUsedCapital.trailer.economicTaxBasisCompatible).toBeNull()
    const text = archive('UTILITY_2019')
    const description = [...text.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)]
      .map(m => JSON.parse(m[1])).find(p => p['@type'] === 'Product').description
    expect(description.trim()).toBe('') // No quoted tax-inclusive description supplied by this product.
    expect(report.supportingMxUsedCapital.trailer.completeCapitalBridge).toContain('futureResaleAndTaxAlignmentCorrectionMxn')
  })
  it('rejects a tractor age-only estimate with differing axle/ratio/wheels and lower older average mileage', () => {
    const newer = offer('RYT_CASCADIA_2021'), older = offer('RYT_CASCADIA_2018')
    expect(newer.differentialLb).not.toBe(older.differentialLb)
    expect(newer.differentialRatio).not.toBe(older.differentialRatio)
    expect(newer.wheelSize).not.toBe(older.wheelSize)
    expect(older.odometerKm as number).toBeLessThan(newer.odometerKm as number)
    expect(offer('RODAL_2021').transmission).toBe('MANUAL_18_SPEEDS')
    expect(newer.transmission).toBe('DT12_AUTOMATIC')
    expect(report.supportingMxUsedCapital.tractor).toMatchObject({
      decision: 'REJECT_AGE_ONLY_CAPITAL_MODEL_AND_TRANSFER_TO_RODAL', monthlyDepreciationMxn: null,
      remainingLifeMonths: null, netResidualMxn: null, usAnlModelTransferred: false,
      historicalReeferModelTransferred: false, newBookLifeTransferred: false,
    })
  })
  it('leaves the capital rows incomplete, with no FX, engine calls, adoption or actual quote output', () => {
    expect(report.budgetRows.find(r => r.economicExpenseId === 'SHARED_TRAILER_CAPITAL')!.refs).toContain('mxUsedMarket#/trailerMarketContrast')
    expect(report.budgetRows.find(r => r.economicExpenseId === 'MX_TRACTOR_CAPITAL')!.refs).toContain('mxUsedMarket#/mxTractorReview')
    expect(report.supportingMxUsedCapital).toMatchObject({ engineInvoked: false, fxConversionPerformed: false })
    expect(report.originalBudgetBaseline.completeRows).toBe(0)
    expect(report.authoritativeBudget.conditions).toHaveLength(11)
    expect(report.authoritativeBudget.completeRows).toBe(2)
    expect(report.reviewedMxCapitalSensitivity.baselineChanged).toBe(false)
    expect(report.reviewedBinationalCapitalCashScenarios.scenarios.map(s=>s.modeledExpenseRows)).toEqual([4,4])
    expect(report.conditionalUs.scenarios[1].conditionalComponentSumUsdPerMonth).toBeCloseTo(1395.7846208090596, 8)
    expect(Object.values(report.outputs).every(v => v === null)).toBe(true)
    expect(dossier.outcome).toMatchObject({ completeBudgetRowsFilled: 0, cfuUsd: null, cvuUsd: null, calibrated: false, quoteReady: false, adoptedValues: 0 })
  })
})
