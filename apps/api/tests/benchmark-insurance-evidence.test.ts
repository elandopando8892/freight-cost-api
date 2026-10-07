import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PARAMETER_DEFINITIONS } from '../src/data/parameter-catalog.js'
import { benchmarkRateRequirements } from '../src/modules/engine/benchmark-rates.js'
import { deriveMonthlyFixedCost } from '../src/modules/engine/engine.outputs.js'

const dossier = JSON.parse(readFileSync(resolve(__dirname,
  '../../../docs/research/B1_INSURANCE_COVERAGE_COST_BRIDGE_2026-09-29.json'), 'utf8'))
const observed = dossier.observations
// Deliberately synthetic differential fixtures: never a public price or pilot calibration.
function insuranceContribution(amount: number, months: number, quantity = 1, tractors = 2) {
  const base = { 'GENERAL_BASE__Tamaño de Flota': tractors,
    'COST_INSURANCE__Prima Anual por Vehiculo': quantity,
    'COST_INSURANCE__Poliza x Vehiculo': 0,
    'COST_INSURANCE__Periodo de Poliza': months }
  const options = { includeCrossborderCosts: false, workingCapitalCountry: 'MX' as const,
    includeTrailerAssets: false, includeDollyAssets: false }
  return deriveMonthlyFixedCost({ ...base, 'COST_INSURANCE__Poliza x Vehiculo': amount }, options)
    - deriveMonthlyFixedCost(base, options)
}

describe('insurance evidence and fixed-cost boundary', () => {
  it('records unique primary sources and precise PDF identities', () => {
    expect(new Set(dossier.sources.map((s: { id: string }) => s.id)).size).toBe(5)
    for (const source of dossier.sources) {
      expect(source.url).toMatch(/^https:\/\//)
      expect(source.locator.length).toBeGreaterThan(15)
      if (source.sha256 !== null) expect(source.sha256).toMatch(/^[a-f0-9]{64}$/)
    }
  })
  it('reconstructs an annual equivalent without inventing a policy term', () => {
    expect(observed.progressive.annualEquivalentPerPowerUnit)
      .toBe(observed.progressive.transportMonthlyPerPowerUnit * 12)
    expect(observed.progressive).toMatchObject({ policyTermMonths: null,
      annualEquivalentIsQuotedAnnualPolicy: false, pilotAdopted: false })
  })
  it('preserves the IMT discrepancy instead of silently copying or repairing the publication', () => {
    const o = observed.imt
    expect(o.exampleAnnualPremium / 12).toBe(o.exampleMonthlyPremium)
    expect(o.exampleAnnualPremium / o.exampleAnnualTrips).toBe(o.printedPerTrip)
    expect(o.exampleAnnualPremium / o.exampleAnnualKm).toBeCloseTo(o.reconstructedPerKm, 10)
    expect(o.printedPerKm).toBe(1.4423)
    expect(o.reconstructedPerKm).not.toBeCloseTo(o.printedPerKm, 4)
    expect(o.perKmPrintedMatchesInputs).toBe(false)
    expect(o.reconstructionIsCurrentBenchmark).toBe(false)
  })
  it('does not merge different insured risk baskets or national/regional populations', () => {
    expect(observed.progressive.knownIncluded).toContain('PHYSICAL_DAMAGE')
    expect(observed.atri.knownExcluded).toContain('PHYSICAL_DAMAGE')
    expect(observed.atri.knownIncluded).toEqual(['LIABILITY', 'CARGO', 'EXCESS_LIABILITY'])
    expect(observed.atri).toMatchObject({ national2024: 0.102, southCentral2024: 0.104,
      combinedWithProgressive: false, annualPremiumBacksolvedFromOtherCohortMiles: false,
      outOfPocketCrashCostsAreSeparate: true })
  })
  it('keeps a regulatory filing zero separate from cargo premium and commercial need', () => {
    expect(observed.fmcsa).toMatchObject({ bipdFilingMinimumUsd: 750000,
      cargoFilingMinimumUsd: 0, cargoPremiumUsd: null,
      cargoFilingZeroMeansNoCommercialCargoNeed: false })
  })
  it('assigns the DOF numeric cell to tourism, not the adjacent cargo row', () => {
    expect(observed.sict).toMatchObject({ generalCargoHomoclave: 'SICT-03-008-A',
      generalCargoRequiresCurrentRcOrGuarantee: true, generalCargoNumericMinimumInThisRow: null,
      uma19000RowOwner: 'SICT-03-007_INTERNATIONAL_TOURISM',
      currentPilotLegalCoverageLimit: null, oldCargoRequirementAbolishedClaim: false })
  })
  it.each(['MX', 'US'] as const)('locates all three %s insurance inputs in fixed cost only', country => {
    const requirements = benchmarkRateRequirements(country)
    const insurance = PARAMETER_DEFINITIONS.filter(p => p.section === 'COST_INSURANCE')
    expect(insurance).toHaveLength(3)
    for (const parameter of insurance) {
      expect(requirements.monthlyFixedUsd).toContain(parameter.key)
      for (const [rate, keys] of Object.entries(requirements)) {
        if (rate !== 'monthlyFixedUsd') expect(keys).not.toContain(parameter.key)
      }
    }
    expect(insurance.find(p => p.key === dossier.canonicalBridge.quantityKey)?.unit).toBe('policy/vehicle')
    expect(insurance.find(p => p.key === dossier.canonicalBridge.premiumKey)?.unit).toBe('USD/year/tractor')
    expect(insurance.find(p => p.key === dossier.canonicalBridge.periodKey)?.unit).toBe('months')
  })
  it.each([1, 2, 3])('checks actual legacy quantity arithmetic with synthetic %s policies per unit', quantity => {
    expect(insuranceContribution(600, 12, quantity)).toBeCloseTo(quantity * 600 * 2 / 12, 6)
  })
  it('exhibits the annual-input/nonannual-period risk without changing the engine', () => {
    // Six-month term premium 300 -> annual equivalent 600 -> monthly 50/unit.
    const normalizedAnnual = 300 * 12 / 6
    expect(insuranceContribution(normalizedAnnual, 12)).toBeCloseTo(100, 6)
    expect(insuranceContribution(300, 6)).toBeCloseTo(100, 6)
    expect(insuranceContribution(normalizedAnnual, 6)).toBeCloseTo(200, 6)
    expect(dossier.canonicalBridge).toMatchObject({ periodNormalizationImplemented: false,
      automaticConversionOrAdoption: false, activeFormulaChanged: false,
      advancedCoverageFullyIntegratedVerified: false })
  })
  it.each(['MX', 'US'])('does not put public contrast values into the %s pilot card', country => {
    const card = dossier.pilotCards.find((c: { country: string }) => c.country === country)
    expect(card).toMatchObject({ status: 'INCOMPLETE', mode: 'PUBLIC_REFERENCE_NOT_XBF_POLICY' })
    for (const [key, value] of Object.entries(card)) {
      if (!['country', 'status', 'mode'].includes(key)) expect(value).toBeNull()
    }
  })
  it('keeps retained loss and interchange separate from default insurance amounts', () => {
    expect(dossier.coverageMapping).toHaveLength(6)
    expect(dossier.coverageMapping.find((f: { family: string }) => f.family === 'DEDUCTIBLE_AND_RETAINED_LOSS')
      .candidateDestination).toBe('RISK_SEPARATE')
    expect(dossier.coverageMapping.find((f: { family: string }) => f.family === 'TRAILER_INTERCHANGE')
      .condition).toContain('coverage not assumed')
  })
  it('leaves calibration and external effects disabled', () => {
    expect(dossier).toMatchObject({ calibrated: false, quoteReady: false, adoptedValues: 0,
      businessGatesComplete: 0, canonicalInventory: { required: 135, documented: 135,
        candidate: 3, contrast: 47, missingEvidence: 85, adopted: 0 } })
    expect(Object.values(dossier.externalChanges).every(value => value === false)).toBe(true)
  })
})
