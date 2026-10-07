import { describe, expect, it } from 'vitest'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'
import { consolidateBinationalReferenceBudget } from '../scripts/consolidate-binational-reference-budget.js'
import { US_MAINTENANCE_PLANNING_PIN } from '../scripts/compose-public-pilot-cost.js'
import { rebuildSeptemberOperatingComponents } from '../scripts/lib/reference-september-operating-components.js'
import { reviewB2SeptemberLabor } from '../scripts/review-b2-september-labor.js'

const research = consolidateBinationalReferenceBudget(undefined, undefined, 'POSTAL_REFERENCE', 'PUBLIC_LINK_FORECAST', 'IMT_C3_NON_ARTICULATED_PROXY')
const maintenance = JSON.parse(readLocalDocument(US_MAINTENANCE_PLANNING_PIN.file))
const fx = { date: '2026-09-28', mxnPerUsd: 17.8413 }
const run = (r = research) => rebuildSeptemberOperatingComponents(r, fx, maintenance)

describe('September DEF and aggregate road/bridge components in the same economic chain', () => {
  it('rebuilds DEF from road plus idle quantities once, with native package/delivery/tax prices', () => {
    const before = JSON.stringify(research)
    for (const c of run()) {
      const find = (id: string) => c.rows.find(v => v.id === id)!
      const mxDiesel = find('MX_ROAD_FUEL').quantity + find('MX_IDLE_FUEL').quantity
      const usDiesel = find('US_ROAD_FUEL').quantity + find('US_IDLE_FUEL').quantity
      expect(find('MX_DEF').quantity).toBeCloseTo(mxDiesel * .04, 10)
      expect(find('US_DEF').quantity).toBeCloseTo(usDiesel * .04, 10)
      expect(find('MX_DEF').nativeUnitPrice).toBeCloseTo((472.2 + 314.65) * 1.16 / 20, 10)
      expect(find('US_DEF').nativeUnitPrice).toBeCloseTo(9.88 * 1.0825 / 2.5, 10)
      expect(find('MX_DEF').amountUsd).toBeCloseTo(mxDiesel * .04 * 45.6373 / fx.mxnPerUsd, 9)
      expect(find('US_DEF').amountUsd).toBeCloseTo(usDiesel * .04 * 4.27804, 9)
      expect(c.rows.filter(v => /IDLE_FUEL/.test(v.id))).toHaveLength(2)
      expect(c.rows.filter(v => v.id.endsWith('_DEF'))).toHaveLength(2)
      expect(c.defReference).toMatchObject({ fraction: .04, selectedByUser: false, actualScrVerified: false,
        idleFuelAddedAgain: false, fullContainerPurchaseAddedAgain: false, manufacturerMatchedCalibration: false,
        manufacturerSourceCapture: 'PRIMARY_WEB_READER_HTTP_403_NOT_ARCHIVED' })
      expect(c.historicalSeptemberPricesVerified).toBe(false)
      expect(find('MX_DEF').sourcePeriod).toContain('2026-10-02_NOT_SEPTEMBER')
    }
    expect(JSON.stringify(research)).toBe(before)
    expect(run()).toEqual(run())
  })
  it('keeps3/5percent as replacement sensitivities, not sums, purchases or full-cost bounds', () => {
    for (const c of run()) {
      expect(c.defSensitivity.map(v => v.fraction)).toEqual([.03, .05])
      for (const a of c.defSensitivity) {
        expect(a.knownDefComponentsUsd).toBeCloseTo(c.defReference.knownDefComponentsUsd * a.fraction / .04, 9)
        expect(a.knownNonLaborAlternativeSubtotalUsd).toBeCloseTo(c.knownNonLaborVariableComponentsUsd - c.defReference.knownDefComponentsUsd + a.knownDefComponentsUsd, 9)
        expect(a).toMatchObject({ replacesReferenceDefOnly: true, addedToReferenceAgain: false, selectedByUser: false, isFullCostBound: false })
      }
    }
  })
  it('adds one reconciled4751MXN aggregate per attached leg without provider4770 or a second Jorobas278', () => {
    for (const c of run()) {
      const multiplicity = c.cycleId === 'NETWORK_EXPECTED_EMPTY_PROXY' ? 1 : 2
      const tolls = c.rows.filter(v => v.id === 'MX_ROAD_TOLLS_KNOWN_AGGREGATE')
      expect(tolls).toHaveLength(1)
      expect(tolls[0]).toMatchObject({ nativeCurrency: 'MXN', nativeUnitPrice: 4751, quantity: multiplicity, amountNative: 4751 * multiplicity })
      expect(tolls[0].amountUsd).toBeCloseTo(4751 * multiplicity / fx.mxnPerUsd, 9)
      expect(c.roadCoverage).toMatchObject({ providerOriginalTotalMxn: 4770, extraJorobasChargeAdded: false,
        carboneraCurrentMxn: null, networkBobtailRoadMxn: null, usInlandTollsUsd: null, handoffServicesUsd: null,
        truckRouteValidated: false, reverseRoadMovementsObserved: false, undatedTariffMovementCount: 5 })
      expect(c.unreconstructedConcepts).toEqual(['MX_ROAD_TOLL_REMAINDER', 'US_ROAD_TOLLS', 'BRIDGE_DIRECTION_AND_APPLICATION', 'HANDOFF_INCREMENTAL_SERVICES'])
    }
  })
  it('preserves two/four directional crossings, US-dollar tolls on the MX tractor, and no second box span', () => {
    for (const c of run()) {
      const bridge = c.rows.filter(v => v.id.startsWith('BRIDGE_'))
      const dedicated = c.cycleId === 'DEDICATED_EMPTY_SAME_BOX_RETURN'
      expect(bridge).toHaveLength(dedicated ? 4 : 2)
      const nativeMxn = bridge.filter(v => v.nativeCurrency === 'MXN').reduce((s, v) => s + v.amountNative, 0)
      const nativeUsd = bridge.filter(v => v.nativeCurrency === 'USD').reduce((s, v) => s + v.amountNative, 0)
      expect(nativeMxn).toBe(dedicated ? 209 : 144)
      expect(nativeUsd).toBe(dedicated ? 38 : 14.25)
      expect(bridge.reduce((s, v) => s + v.amountUsd, 0)).toBeCloseTo(nativeMxn / fx.mxnPerUsd + nativeUsd, 10)
      expect(bridge.every(v => v.resourceId === 'MX_TRACTOR' && v.quantity === 1)).toBe(true)
      expect(bridge.find(v => v.id === 'BRIDGE_MX_BOBTAIL_SOUTH')).toMatchObject({ nativeCurrency: 'USD', nativeUnitPrice: 14.25, amountUsd: 14.25, unit: '3-axle-crossing' })
      expect(c.roadCoverage.mxNorthDirectionApplicationVerified).toBe(false)
      expect(c.completeTripCostUsd).toBeNull()
    }
  })
  it.each(['defPrice', 'defFraction', 'defVolume', 'defCurrency', 'defDuplicate', 'defSensitivity',
    'roadAmount', 'roadDuplicate', 'roadOverlap', 'roadDate', 'roadMultiplicity', 'jorobas', 'carbonera',
    'crossingDuplicate', 'crossingCurrency', 'crossingDirection', 'crossingAmount', 'crossingAxles', 'crossingSource'] as const)(
    'rejects corrupted native evidence: %s', defect => {
      const changed = structuredClone(research), fluids = changed.supportingOperatingFluids, roads = changed.supportingPilotRoadBorderEconomics
      if (defect === 'defPrice') Object.assign(fluids.def, { mxPackageNetMxn: 1 })
      if (defect === 'defFraction') Object.assign(fluids.def, { volumeFraction: .03 })
      if (defect === 'defVolume') fluids.scenarios[0].mxTotalDieselLiters += 1
      if (defect === 'defCurrency') fluids.scenarios[0].reference.lines[2].currency = 'USD'
      if (defect === 'defDuplicate') fluids.scenarios[0].reference.lines[2].id = 'US_DEF'
      if (defect === 'defSensitivity') fluids.scenarios[0].sensitivity[0].fraction = .04
      if (defect === 'roadAmount') roads.selections[0].amountMxn += 1
      if (defect === 'roadDuplicate') roads.selections[1].segmentIndex = roads.selections[0].segmentIndex
      if (defect === 'roadOverlap') roads.selections[1].coverageGroup = roads.selections[0].coverageGroup
      if (defect === 'roadDate') roads.selections[0].effectiveFrom = '2026-10-01'
      if (defect === 'roadMultiplicity') roads.scenarios[0].attachedMxRoadMultiplicity = 2
      if (defect === 'jorobas') Object.assign(changed.supportingMxTollCoverage.jorobas, { additionalAutomaticChargeMxn: 278 })
      if (defect === 'carbonera') Object.assign(changed.supportingMxTollCoverage.carbonera, { currentC5Mxn: 0 })
      if (defect === 'crossingDuplicate') roads.scenarios[0].crossings[1].id = 'MX_LOADED_NORTH'
      if (defect === 'crossingCurrency') roads.scenarios[0].crossings[1].currency = 'MXN'
      if (defect === 'crossingDirection') roads.scenarios[0].crossings[1].direction = 'MX_TO_US'
      if (defect === 'crossingAmount') roads.scenarios[0].crossings[1].amountNative += 1
      if (defect === 'crossingAxles') roads.scenarios[0].crossings[1].axles = 5
      if (defect === 'crossingSource') roads.scenarios[0].crossings[1].sourceId = 'SICT_BRIDGE_III'
      expect(() => run(changed)).toThrow()
    })
  it('joins24base comparisons and48replacement sensitivities with unchanged fixed allocations and all complete outputs null', () => {
    const result = reviewB2SeptemberLabor()
    expect(result.cases).toHaveLength(12)
    expect(result.cases.flatMap(c => c.fixedComparisons)).toHaveLength(24)
    expect(result.cases.flatMap(c => c.defSensitivityComparisons.flatMap(v => v.fixedComparisons))).toHaveLength(48)
    for (const c of result.cases) {
      expect(c.knownVariableComposition.nonLaborUsd).toBe(c.operatingComponents.knownNonLaborVariableComponentsUsd)
      for (const a of c.defSensitivityComparisons) {
        expect(a.knownVariableAlternativeSubtotalUsd).toBe(c.knownVariableComposition.subtotalUsd + a.deltaUsdVsReference)
        for (const alternative of a.fixedComparisons) {
          const original = c.fixedComparisons.find(v => v.paymentMode === alternative.paymentMode)!
          expect(alternative.totalKnownAlternativeComponentsUsd).toBeCloseTo(original.totalKnownComponentsUsd + a.deltaUsdVsReference, 9)
          expect(alternative).toMatchObject({ completeTripCostUsd: null, quoteReady: false })
        }
      }
      expect(c.knownVariableComposition.remaining).not.toContain('MX_DEF')
      expect(c.fixedComparisons.every(v => v.remainingFixed.length === 6)).toBe(true)
    }
    expect(result.remaining).not.toContain('VARIABLE_DEF_ROAD_BORDER_REVALUATION')
    expect(result.remaining).toContain('ROAD_BORDER_REMAINDERS_AND_APPLICATION')
    expect(result).toMatchObject({ b2Complete: false, calibrated: false, quoteReady: false, externalWrites: false, adoptedValues: 0 })
  })
})
