import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Documentary reconstruction only: no engine/database integration or live asset claim.
const dossier = JSON.parse(readFileSync(resolve(__dirname,
  '../../../docs/research/B1_USED_CAPITAL_LIFECYCLE_2026-09-29.json'), 'utf8'))
const prior = JSON.parse(readFileSync(resolve(__dirname,
  '../../../docs/research/B1_PILOT_ASSET_LABOR_EVIDENCE_2026-09-29.json'), 'utf8'))
const historical = dossier.historicalModel

describe('used capital public-evidence reconstruction', () => {
  it('reproduces the printed historical endpoint without declaring economic life', () => {
    // Independent iterative reconstruction, rather than the author's closed form.
    let value = historical.originalModeledValueMxn
    const series = [value]
    for (let age = 1; age <= historical.endpointAgeYears; age++) {
      value *= 1 - (age === 1 ? historical.firstYearLossFraction : historical.subsequentYearLossFraction)
      series.push(value)
    }
    expect(Math.round(value * 100) / 100).toBe(1342996.34)
    expect(value).toBeCloseTo(historical.reconstructedEndpointValueMxn, 6)
    expect(historical.printedEndpointValueMxn).toBe(1342996.34)
    expect(historical.series).toHaveLength(10)
    historical.series.forEach((row: { ageYear: number; modeledValueMxn: number }, i: number) => {
      expect(row.ageYear).toBe(i)
      expect(row.modeledValueMxn).toBeCloseTo(series[i], 6)
    })
    expect(historical.endpointIsCertifiedEconomicLife).toBe(false)
    expect(historical.currency).toBe('MXN')
  })

  it.each([1, 2, 3, 4, 5, 6, 7, 8])('reconciles model entry age %i without reusing the total horizon', age => {
    const row = historical.rebasedCases[age - 1]
    expect(row.modeledAcquisitionAgeYears).toBe(age)
    expect(row.remainingModelHorizonMonths).toBe((9 - age) * 12)
    expect(row.endpointValueMxn).toBe(historical.reconstructedEndpointValueMxn)
    expect(row.monthlyStraightLineLossMxn * row.remainingModelHorizonMonths + row.endpointValueMxn)
      .toBeCloseTo(row.modeledAcquisitionValueMxn, 6)
    expect(row.endpointFractionOfModeledAcquisition * row.modeledAcquisitionValueMxn)
      .toBeCloseTo(row.endpointValueMxn, 6)
    expect(row.pilotApplicable).toBe(false)
    expect(row.netDisposalCostsMxn).toBeNull()
    expect(row.fxMxnPerUsd).toBeNull()
    expect(row.monthlyDepreciationUsd).toBeNull()
  })

  it('does not silently use the original-price residual fraction on a used-price basis', () => {
    const row = historical.rebasedCases[4]
    expect(row.remainingModelHorizonMonths).toBe(48)
    expect(row.endpointFractionOfModeledAcquisition).toBeCloseTo(0.74805201, 8)
    expect(historical.residualFractionOfOriginalModeledValue).toBeCloseTo(0.447665447732, 8)
    expect(historical.residualFractionOfOriginalModeledValue * row.modeledAcquisitionValueMxn)
      .not.toBeCloseTo(row.endpointValueMxn, 2)
    expect(row.monthlyStraightLineLossMxn).toBeCloseTo(9423.51001675, 6)
  })

  it('keeps refrigerated illustration and new-asset accounting outside pilot calibration', () => {
    expect(historical.equipment).toBe('T3_S2_REFRIGERATED')
    expect(historical.dryVanPilotApplicable).toBe(false)
    expect(dossier.accountingContrasts).toHaveLength(6)
    for (const row of dossier.accountingContrasts) {
      expect(row.pilotApplicable).toBe(false)
      expect(dossier.sources.some((source: { id: string }) => source.id === row.sourceId)).toBe(true)
    }
    expect(dossier.accountingContrasts.find((row: { sourceId: string; assetClass: string }) =>
      row.sourceId === 'COVENANT_FY2025' && row.assetClass === 'DRY_VAN_TRAILER').condition).toBe('NEW')
  })

  it('preserves source identity, all four offer links and unresolved actual asset fields', () => {
    expect(new Set(dossier.sources.map((source: { id: string }) => source.id)).size).toBe(6)
    expect(new Set(dossier.sources.map((source: { url: string }) => source.url)).size).toBe(6)
    for (const source of dossier.sources) {
      expect(source.url).toMatch(/^https:\/\//)
      if (source.sha256 !== null) expect(source.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(source.pilotApplicable).toBe(false)
    }
    expect(historical.rebasedCases).toHaveLength(8)
    expect(dossier.pilotAssets).toHaveLength(4)
    for (const asset of dossier.pilotAssets) {
      expect(prior.sources.some((source: { id: string }) => source.id === asset.offerSourceId)).toBe(true)
      expect(asset.offerRepresentsActualPilotAsset).toBe(false)
      for (const field of ['tenure', 'capitalizableAcquisitionUsd', 'remainingLifeMonths', 'netResidualUsd',
        'residualBasis', 'monthlyInterestUsd', 'fleetQuantity', 'allocationAcrossLegs']) expect(asset[field]).toBeNull()
    }
  })

  it('leaves engine prices, inventory adoption and every external write disabled', () => {
    expect(dossier).toMatchObject({ calibrated: false, quoteReady: false, adoptedValues: 0,
      businessGatesComplete: 0, canonicalInventory: { candidate: 3, contrast: 47, missingEvidence: 85, adopted: 0 } })
    expect(dossier.engineBridge.automaticConversionOrAdoption).toBe(false)
    expect(dossier.engineBridge.activeFormulaChanged).toBe(false)
    expect(Object.values(dossier.engineBridge.quoteOutputs).every(value => value === null)).toBe(true)
    expect(Object.values(dossier.externalChanges).every(value => value === false)).toBe(true)
  })
})
