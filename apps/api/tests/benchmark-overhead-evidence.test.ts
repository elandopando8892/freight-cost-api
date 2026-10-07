import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PARAMETER_DEFINITIONS } from '../src/data/parameter-catalog.js'
import { benchmarkRateRequirements } from '../src/modules/engine/benchmark-rates.js'
import { deriveMonthlyFixedCost } from '../src/modules/engine/engine.outputs.js'
import { allocateFixedCost } from '../src/modules/engine/fixed-cost-allocation.js'

const readDossier = (name: string) => JSON.parse(readFileSync(resolve(__dirname, '../../../docs/research', name), 'utf8'))
const dossier = readDossier('B1_OVERHEAD_EXPOSURE_BRIDGE_2026-09-29.json')
const eat = readDossier('B1_INEGI_EAT_2024_4841_COST_OBSERVATIONS_2026-09-29.json')
const observed = dossier.observations
const pairs = dossier.companyPairs as Array<{ fieldSuffix: string; family: string; sourceDefinition: string; overlap: string }>

describe('corporate overhead public evidence and canonical mapping', () => {
  it('uses alternative time/distance allocations for the same fixed cost, never their sum', () => {
    expect(allocateFixedCost(20, 30)).toBe(30)
    expect(allocateFixedCost(30, 20)).toBe(30)
    expect(allocateFixedCost(30, 30)).toBe(30)
  })
  it('covers every canonical company field once without adopting a value', () => {
    expect(pairs).toHaveLength(23)
    const fields = pairs.flatMap(row => [`Qty ${row.fieldSuffix}`, `PU ${row.fieldSuffix}`])
    expect(new Set(fields).size).toBe(46)
    expect(new Set(fields)).toEqual(new Set(PARAMETER_DEFINITIONS.filter(p => p.section === 'COST_COMPANY').map(p => p.field)))
    for (const row of pairs) {
      expect(row.overlap.length).toBeGreaterThan(20)
      expect('value' in row).toBe(false)
    }
  })
  it.each(['MX', 'US'] as const)('checks all 46 %s company keys are fixed-cost dependencies', country => {
    const requirements = benchmarkRateRequirements(country)
    for (const parameter of PARAMETER_DEFINITIONS.filter(p => p.section === 'COST_COMPANY')) {
      expect(requirements.monthlyFixedUsd).toContain(parameter.key)
      for (const [rate, keys] of Object.entries(requirements)) if (rate !== 'monthlyFixedUsd') expect(keys).not.toContain(parameter.key)
    }
  })
  // Synthetic differential fixtures only: no source figures or defaults adopted as benchmark.
  it.each(pairs.map(row => row.fieldSuffix))('checks the real monthly Qty*PU formula for %s', suffix => {
    const base = { [`COST_COMPANY__Qty ${suffix}`]: 0, [`COST_COMPANY__PU ${suffix}`]: 7 }
    const options = { includeCrossborderCosts: false, includeTrailerAssets: false, includeDollyAssets: false }
    const contribution = deriveMonthlyFixedCost({ ...base, [`COST_COMPANY__Qty ${suffix}`]: 2 }, options)
      - deriveMonthlyFixedCost(base, options)
    expect(contribution).toBeCloseTo(14, 6)
  })
  it('reproduces a partial national subtotal without calling it complete overhead', () => {
    const o = observed.eatPartialCorporateCategories
    const selected = o.lineIds.map((id: string) => eat.observations.expensesByLine.find((row: { id: string }) => row.id === id).value)
    expect(selected).toEqual(o.values)
    expect(selected.reduce((sum: number, value: number) => sum + value, 0)).toBe(o.sum)
    expect(o.sum / eat.observations.goodsAndServicesExpenses.value * 100).toBeCloseTo(o.shareOfGoodsServicesExpensesPct, 8)
    expect(o).toMatchObject({ isCompleteOverhead: false, isProvenFixedOfficeExpense: false,
      matchedFleetKm: null, matchedFleetVehicleDays: null, normalizedPilotMonthlyUsd: null })
    expect(eat.observations.taggedOrUnavailableLines.some((row: { value: string }) => row.value === 'ND')).toBe(true)
  })
  it('preserves the original figure label and does not use national exposure to annualize the sector', () => {
    const o = observed.atriDryVanOtherCosts
    expect(o.revenueUsdPerMile * o.otherCostsShareOfRevenuePct / 100).toBeCloseTo(o.derivedOtherCostsUsdPerMile, 8)
    expect(o).toMatchObject({ isCompleteAdministrationDefinition: false, isCfu: false,
      matchedSectorAnnualKm: null, matchedSectorVehicleDays: null })
    expect(observed.atriSeparateNationalExposure).toMatchObject({ matchesDryVanFigure27Cohort: false, usedToAnnualizeOtherCosts: false })
  })
  it('does not pretend consolidated wages or other expenses isolate office cost', () => {
    expect(observed.heartland).toMatchObject({ salarySeparatesDriversOfficeShop: false,
      isCompleteAdministrationDefinition: false, advertisingIncludedInOtherOperatingExpenses: true,
      matchedOfficeFleetExposure: null, normalizedPilotMonthlyUsd: null })
  })
  it('conserves the IMT monthly/annual contradiction without treating either as a current quote', () => {
    const o = observed.imtCommunications
    expect(o.monthlyPrinted * 12).toBe(o.annualReconstructed)
    expect(o.annualPrinted).toBe(79200)
    expect(o.annualPrinted).not.toBe(o.annualReconstructed)
    expect(o.annualPrintedMatchesMonthly).toBe(false)
    expect(o.isCurrentPilotInput).toBe(false)
  })
  it('keeps both interpretations of the ambiguous IMT trip period', () => {
    const o = observed.imtAdministration
    expect(o.monthlyFleet * 12).toBe(o.annualFleet)
    expect(o.annualFleet / o.tripCountPrinted).toBeCloseTo(o.perTripIfAnnualTrips, 8)
    expect(o.monthlyFleet / o.tripCountPrinted).toBeCloseTo(o.perTripIfMonthlyTrips, 8)
    expect(o.isTripPeriodResolved).toBe(false)
    expect(o.isCurrentPilotInput).toBe(false)
  })
  it('records source reuse and valid hashes rather than claiming a new table refresh', () => {
    expect(dossier.sources).toHaveLength(5)
    expect(dossier.sources.find((s: { id: string }) => s.id === 'EAT4841_2024_PRIOR_EXTRACTION').capture)
      .toBe('REUSE_DOCUMENTED_2026_09_29_EXTRACTION_NOT_REFRESHED_THIS_CUT')
    for (const source of dossier.sources) if (source.sha256 !== null) expect(source.sha256).toMatch(/^[a-f0-9]{64}$/)
  })
  it('does not require private XBF invoices or connect the research auditor to quotes', () => {
    expect(dossier.methodDecision).toMatchObject({ requiresPrivateXbfInvoices: false,
      connectedToActiveQuoteEngine: false, activeArithmeticChanged: false, localResearchAuditorChanged: true })
    expect(dossier).toMatchObject({ calibrated: false, quoteReady: false, adoptedValues: 0, businessGatesComplete: 0,
      canonicalInventory: { documented: 135, candidate: 3, contrast: 47, missingEvidence: 85, adopted: 0 } })
    expect(Object.values(dossier.pilotOutput).every(value => value === null)).toBe(true)
    expect(Object.values(dossier.externalChanges).every(value => value === false)).toBe(true)
  })
})
