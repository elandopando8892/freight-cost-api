import { describe, expect, it } from 'vitest'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'
import { consolidateBinationalReferenceBudget } from '../scripts/consolidate-binational-reference-budget.js'
import { rebuildSeptemberOperatingComponents } from '../scripts/lib/reference-september-operating-components.js'
import { reviewB2SeptemberLabor } from '../scripts/review-b2-september-labor.js'
import { US_MAINTENANCE_PLANNING_PIN } from '../scripts/compose-public-pilot-cost.js'

const r = consolidateBinationalReferenceBudget(undefined, undefined, 'POSTAL_REFERENCE', 'PUBLIC_LINK_FORECAST', 'IMT_C3_NON_ARTICULATED_PROXY')
const maintenance = JSON.parse(readLocalDocument(US_MAINTENANCE_PLANNING_PIN.file))
const fx = { date: '2026-09-28', mxnPerUsd: 17.8413 }
const rebuild = (research = r, valuation: unknown = fx, policy: unknown = maintenance) => rebuildSeptemberOperatingComponents(research, valuation, policy)

describe('September native operating economics joined to rebuilt labor, not a full quote', () => {
  it('rebuilds18/20nonlabor rows per cycle without old fixed allocations or driver rows', () => {
    const before = JSON.stringify(r), result = rebuild()
    expect(result).toHaveLength(2)
    for (const c of result) {
      const count = c.cycleId === 'NETWORK_EXPECTED_EMPTY_PROXY' ? 18 : 20
      expect(c.rows).toHaveLength(count)
      expect(new Set(c.rows.map(v => v.id)).size).toBe(count)
      expect(c.rows.some(v => /DRIVER|SHARED_TRAILER/.test(v.id))).toBe(false)
      expect(c.knownNonLaborVariableComponentsUsd).toBeCloseTo(c.rows.reduce((sum, v) => sum + v.amountUsd, 0), 9)
      expect(c).toMatchObject({ sourceDatesPreserved: true, oldDriverRowsExcluded: true,
        octoberFixedAllocationsTransferred: false, octoberUsdSubtotalsTransferred: false,
        completeCvuUsd: null, completeTripCostUsd: null, quoteReady: false, adoptedValues: 0 })
    }
    expect(JSON.stringify(r)).toBe(before)
    expect(rebuild()).toEqual(result)
  })
  it('changes only native-MXN valuation across the three pinned FIX comparisons', () => {
    const second = rebuild(r, { date: '2026-09-30', mxnPerUsd: 18.0692 })
    for (const first of rebuild()) {
      const later = second.find(c => c.cycleId === first.cycleId)!
      for (const row of first.rows) {
        const next = later.rows.find(v => v.id === row.id)!
        expect(next.quantity).toBe(row.quantity)
        expect(next.nativeUnitPrice).toBe(row.nativeUnitPrice)
        expect(next.amountNative).toBe(row.amountNative)
        expect(next.amountUsd).toBeCloseTo(row.amountNative / (row.nativeCurrency === 'MXN' ? 18.0692 : 1), 10)
        if (row.nativeCurrency === 'USD') expect(next.amountUsd).toBe(row.amountUsd)
      }
    }
  })
  it.each([{ date: '2026-09-28', mxnPerUsd: 18.0710 }, { date: '2026-10-01', mxnPerUsd: 18.3688 },
    { mxnPerUsd: 17.8413 }, { date: '2026-09-28', mxnPerUsd: 17.8413, selected: true }])('rejects FX mismatch or implicit selection %#', f => {
    expect(() => rebuild(r, f)).toThrow()
  })
  it('preserves source periods and documents fuel evidence and transfer limitations', () => {
    for (const c of rebuild()) {
      expect(c.rows.find(v => v.id === 'MX_ROAD_FUEL')).toMatchObject({ sourcePeriod: '2026-09-25', nativeUnitPrice: 27,
        scope: 'NATIONAL_INDEXED_PRICE_AND_DECLARED_CONSTANT_CONSUMPTION_NOT_CARRIER_OBSERVATION' })
      expect(c.rows.find(v => v.id === 'US_ROAD_FUEL')).toMatchObject({ sourcePeriod: '2026-09-28', nativeUnitPrice: 5.955 })
      expect(c.rows.find(v => v.id === 'MX_TIRES')!.sourcePeriod).toBe('2025_NET_MODEL')
      expect(c.rows.find(v => v.id === 'US_TIRES')!.sourcePeriod).toBe('2024_TTI_ESTIMATE')
      expect(c.matchedCarrierCohort).toBe(false)
      expect(c.homogeneousTaxBasis).toBe(false)
      expect(c.isLowerBound).toBe(false)
    }
  })
  it('replaces US maintenance once instead of adding ATRI to TTI or a second lubricant/box charge', () => {
    for (const c of rebuild()) {
      const original = r.supportingPilotVariableEconomics.scenarios.find(s => s.cycleScenarioId === c.cycleId)!
      const row = c.rows.find(v => v.id === 'US_MAINT')!
      expect(row.amountUsd).toBeCloseTo(original.usAttachedKm / 1.609344 * .198, 10)
      expect(row.sourceIds).toEqual(['ATRI2025_MAINTENANCE_ORIGINAL'])
      expect(c.rows.filter(v => v.id === 'US_MAINT')).toHaveLength(1)
      expect(c.rows.some(v => v.id === 'US_LUBE')).toBe(false)
      expect(c.extraBoxVariableChargeAdded).toBe(false)
      expect(c.extraUsLubricantChargeAdded).toBe(false)
    }
    expect(() => rebuild(r, fx, { ...maintenance, extraLubricantsAdded: true })).toThrow()
  })
  it('uses disjoint attached and bobtail kilometre quantities, plus independently normalized idle volume', () => {
    for (const c of rebuild()) {
      const s = r.supportingPilotVariableEconomics.scenarios.find(v => v.cycleScenarioId === c.cycleId)!
      const duty = r.supportingPilotOrdinaryDuty.scenarios.find(v => v.id === c.cycleId)!
      expect(c.rows.find(v => v.id === 'MX_MAINT')!.quantity).toBe(s.mxAttachedKm)
      for (const v of c.rows.filter(v => v.id.startsWith('MX_BOBTAIL_'))) expect(v.quantity).toBe(s.mxBobtailKm)
      expect(c.rows.find(v => v.id === 'MX_IDLE_FUEL')!.quantity).toBeCloseTo(1830 / 12 * duty.knownMxElapsedClockDays / 24 * .8 * 3.785411784, 9)
      expect(c.rows.find(v => v.id === 'US_IDLE_FUEL')!.quantity).toBeCloseTo(1830 / 12 * duty.knownUsElapsedClockDays / 24 * .8, 9)
    }
  })
  it.each(['rate', 'amount', 'currency', 'duplicate', 'distance', 'fuel', 'bobtail', 'idle'] as const)('rejects corrupted native lineage: %s', defect => {
    const changed = structuredClone(r), s = changed.supportingPilotVariableEconomics.scenarios[0]
    if (defect === 'rate') s.rows[0].nativePerKm += .1
    if (defect === 'amount') s.rows[0].amountUsd += .1
    if (defect === 'currency') s.rows[0].nativeCurrency = 'USD'
    if (defect === 'duplicate') s.rows[1].id = s.rows[0].id
    if (defect === 'distance') s.mxAttachedKm += 1
    if (defect === 'fuel') s.conditionalRoadFuelQuantity.mxLiters += 1
    if (defect === 'bobtail') changed.supportingMxBobtailWearReference.scenarios[0].mxBobtailKm += 1
    if (defect === 'idle') changed.supportingPilotOrdinaryDuty.scenarios[0].knownMxElapsedClockDays = 25
    expect(() => rebuild(changed)).toThrow(/B2_SEPTEMBER_/)
  })
  it('joins12labor comparisons to native nonlabor economics without old wages or the fixed quota in CVU', () => {
    const result = reviewB2SeptemberLabor()
    expect(result.cases).toHaveLength(12)
    expect(result.sourcePins.filter(p => p.id === US_MAINTENANCE_PLANNING_PIN.id)).toHaveLength(1)
    for (const c of result.cases) {
      const s = c.knownVariableComposition
      expect(s.mxDriverVariableUsd).toBe(c.mx.knownIncomeLinkedUsdPerCycle)
      expect(s.mxDirectFoodUsd).toBe(c.mx.directFoodUsdPerCycle)
      expect(s.usCompensationAndMieUsd).toBe(c.us.knownCompensationAndMieUsd)
      expect(s.subtotalUsd).toBeCloseTo(s.nonLaborUsd + s.mxDriverVariableUsd + s.mxDirectFoodUsd + s.usCompensationAndMieUsd, 9)
      expect(s).toMatchObject({ oldMileageDriverRowsIncluded: false, fixedQuotaIncludedInVariableAgain: false,
        directFoodIncludedInDriverAgain: false, isCompleteCvu: false, isLowerBound: false, missingAmountsDefaultedToZero: false })
      expect(s.remaining).not.toContain('MX_DEF')
      expect(s.remaining).toContain('MX_ROAD_TOLL_REMAINDER')
      expect(s.remaining).toContain('HANDOFF_INCREMENTAL_SERVICES')
      expect(c.operatingComponents.fx).toEqual(c.fx)
      expect(c.selectedVariableCostsRebuiltForSeptember).toBe(true)
      expect(c.completeCfuUsd).toBeNull()
      expect(c.completeCvuUsd).toBeNull()
      expect(c.completeTripCostUsd).toBeNull()
      expect(c.mx.existingRiskMonthlyMxn).toBeNull()
      expect(c.us.mixedLodgingUsd).toBeNull()
    }
    expect(result).toMatchObject({ b2Complete: false, calibrated: false, quoteReady: false, adoptedValues: 0, externalWrites: false })
  })
})
