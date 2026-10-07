import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PARAMETER_DEFINITIONS } from '../src/data/parameter-catalog.js'
import { benchmarkRateRequirements } from '../src/modules/engine/benchmark-rates.js'
import { deriveTireLifecycleCandidate } from '../src/modules/cost-bases/tire-lifecycle-economics.js'
import { costPerVehicleKm, reviewMaintenanceTires, verifyMaintenanceFiles,
  readScopedMaintenanceFile } from '../scripts/review-maintenance-tires-reference.js'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const fixture = JSON.parse(readFileSync(resolve(root, 'docs/research/B2_MAINTENANCE_TIRES_REFERENCE_2026-09-30.json'), 'utf8'))
const copy = () => structuredClone(fixture)
const readBytes = (file: string) => readFileSync(resolve(root, file))
describe('Public maintenance/tires: exclusive contrast, never pilot inputs', () => {
  it('verifies three primary PDFs and seven untouched prior dossiers', () => {
    expect(verifyMaintenanceFiles(fixture, readBytes)).toBe(10)
    expect(readScopedMaintenanceFile(root, fixture.sources[0].file)).toEqual(readBytes(fixture.sources[0].file))
  })
  it('reconstructs MX printed output costs per 1000 km, not rounded inputs', () => {
    const mx = reviewMaintenanceTires(fixture).contrasts[0]
    expect(mx.maintenancePublishedComponentsWithoutTires).toBeCloseTo(5.61754, 12)
    expect(mx.separateLubricants).toBeCloseTo(0.27967, 12)
    expect(mx.tires).toBeCloseTo(0.96996, 12)
    expect(mx.sourceSelectedSubtotalPerVehicleKm).toBeCloseTo(6.86717, 12)
    expect(mx.currency).toBe('MXN')
  })
  it('converts US vehicle-mile once and retains estimates and different year', () => {
    const us = reviewMaintenanceTires(fixture).contrasts[1]
    expect(us.maintenancePublishedComponentsWithoutTires).toBeCloseTo(0.212 / 1.609344, 12)
    expect(us.tires).toBeCloseTo(0.048 / 1.609344, 12)
    expect(us.sourceSelectedSubtotalPerVehicleKm).toBeCloseTo(0.26 / 1.609344, 12)
    expect(us.separateLubricants).toBeNull()
    expect(us.lubricantsBreakdownEstablished).toBe(false)
    expect(us.referencePeriod).toBe('2024')
    expect(fixture.sources[1].kind).toBe('RESEARCH_AGGREGATE_ESTIMATE')
  })
  it.each([0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER])('rejects invalid numeric contrast %s', value => {
    expect(() => costPerVehicleKm(value, 'USD/vehicle-mile')).toThrow()
  })
  it('rejects invented tire-km and currency conversion units', () => {
    expect(() => costPerVehicleKm(1, 'USD/tire-mile' as never)).toThrow()
    expect(() => costPerVehicleKm(1, 'USD/1000vehicle-km' as never)).toThrow()
  })
  it('preserves missing pilot rates, FX, asset split and no adoption', () => {
    const report = reviewMaintenanceTires(fixture)
    for (const card of report.countryCards) {
      expect(card.maintenanceUsdPerKm).toBeNull(); expect(card.tiresUsdPerKm).toBeNull()
      expect(card.pilotCvuUsd).toBeNull(); expect(card.fxMxnPerUsd).toBeNull()
      expect(card.tractorOnlyRate).toBeNull(); expect(card.trailerOnlyRate).toBeNull()
      expect(card.allocationShares).toBeNull()
    }
    expect(report).toMatchObject({ calibrated: false, quoteReady: false, adoptedValues: 0 })
    expect(report.sharedTrailer.comboRatesAddableAcrossCountries).toBe(false)
  })
  it.each(['calibrated', 'quoteReady', 'reviewed'])('rejects approval-like field %s', field => {
    const input = copy(); input[field] = true
    expect(() => reviewMaintenanceTires(input)).toThrow()
  })
  it('rejects identical item in inclusion and exclusion', () => {
    const input = copy(); input.records[0].includes.push('TIRES')
    expect(() => reviewMaintenanceTires(input)).toThrow('INCLUSION_BOUNDARY_OVERLAP')
  })
  it('rejects maintenance with no explicit tire exclusion', () => {
    const input = copy(); input.records[0].excludes = input.records[0].excludes.filter((x: string) => x !== 'TIRES')
    expect(() => reviewMaintenanceTires(input)).toThrow('MAINTENANCE_MUST_EXCLUDE_TIRES')
  })
  it('rejects tire costs that claim maintenance', () => {
    const input = copy(); input.records[3].includes.push('MAINT_EXTRA')
    expect(() => reviewMaintenanceTires(input)).toThrow('TIRES_MUST_EXCLUDE_MAINTENANCE')
  })
  it('rejects duplicate rows or inclusion items', () => {
    const input = copy(); input.records[1].id = input.records[0].id
    expect(() => reviewMaintenanceTires(input)).toThrow('DUPLICATE_RECORD_ID')
    const other = copy(); other.records[0].includes.push('MAINT_LABOR')
    expect(() => reviewMaintenanceTires(other)).toThrow('INCLUSION_BOUNDARY_OVERLAP')
  })
  it('rejects double counted physical cost item in a selected group', () => {
    const input = copy(); input.records[1].includes = ['MAINT_LABOR']; input.records[1].excludes = ['TIRES', 'FUEL']
    expect(() => reviewMaintenanceTires(input)).toThrow('DOUBLE_COUNTED_ITEM')
  })
  it('rejects double selected record', () => {
    const input = copy(); input.groups[0].recordIds.push('MX_LABOR')
    expect(() => reviewMaintenanceTires(input)).toThrow('DOUBLE_COUNTED_ITEM')
  })
  it('rejects mixed country or source scope', () => {
    const input = copy(); input.records[0].sourceId = 'TTI_UMR2025_C'
    expect(() => reviewMaintenanceTires(input)).toThrow('SOURCE_COUNTRY_MISMATCH')
    const other = copy(); other.groups[0].recordIds[0] = 'US_MAINT'
    expect(() => reviewMaintenanceTires(other)).toThrow('GROUP_SCOPE_MISMATCH')
  })
  it('rejects a questionnaire as numeric price evidence', () => {
    const input = copy(); input.records[4].sourceId = 'ATRI_MC_FORM2026'
    expect(() => reviewMaintenanceTires(input)).toThrow('METHOD_FORM_IS_NOT_A_PRICE')
  })
  it('rejects cost year relabeling', () => {
    const input = copy(); input.records[4].referencePeriod = '2026'
    expect(() => reviewMaintenanceTires(input)).toThrow('REFERENCE_PERIOD_MISMATCH')
  })
  it('rejects future or invalid reference period', () => {
    const input = copy(); input.sources[1].referencePeriod = '2027'; input.records[4].referencePeriod = '2027'
    expect(() => reviewMaintenanceTires(input)).toThrow('INVALID_REFERENCE_PERIOD')
  })
  it('rejects country unit swap', () => {
    const input = copy(); input.records[0].unit = 'USD/vehicle-mile'
    expect(() => reviewMaintenanceTires(input)).toThrow('UNIT_COUNTRY_MISMATCH')
  })
  it('requires both cards and component coverage', () => {
    const input = copy(); input.countryCards[1].country = 'MX'
    expect(() => reviewMaintenanceTires(input)).toThrow('COUNTRY_COVERAGE_MISMATCH')
    const other = copy(); other.groups[0].recordIds.pop()
    expect(() => reviewMaintenanceTires(other)).toThrow('GROUP_COMPONENT_COVERAGE_MISMATCH')
  })
  it('rejects missing record references', () => {
    const input = copy(); input.groups[0].recordIds[0] = 'NOT_FOUND'
    expect(() => reviewMaintenanceTires(input)).toThrow('MISSING_RECORD_REFERENCE')
  })
  it('keeps maintenance methodology separate from questionnaire observations', () => {
    expect(fixture.methodBoundary.ttiExactSameBoundaryVerified).toBe(false)
    const input = copy(); input.methodBoundary.rmExcludes = ['TIRES']
    expect(() => reviewMaintenanceTires(input)).toThrow('INCLUSION_BOUNDARY_INCOMPLETE')
  })
  it('does not allocate combo cost to tractor-only, use arbitrary half or combine currencies', () => {
    const input = copy(); input.sharedTrailer.arbitraryHalfSplitAllowed = true
    expect(() => reviewMaintenanceTires(input)).toThrow()
    const other = copy(); other.records[0].assetScope = 'TRACTOR_ONLY'
    expect(() => reviewMaintenanceTires(other)).toThrow()
  })
  it('does not replace rounded VOC equivalents with physical wheels or installed life', () => {
    const mx = fixture.printedPrecision.mx
    expect(mx.tireEquivalentNewPer1000KmRounded * mx.newTireMxn).not.toBeCloseTo(969.96, 2)
    expect(mx.partsPercentOfVehicleRounded / 100 * mx.vehiclePriceMxn).not.toBeCloseTo(3607.52, 2)
    expect(mx.laborHoursPer1000Km * mx.laborMxnPerHour).not.toBeCloseTo(2010.02, 2)
    expect(fixture.engineBridge.parameterExpansionAllowed).toBe(false)
    expect(fixture.engineBridge.impliedInstalledPricesAllowed).toBe(false)
  })
  it('conciles all 31 maintenance and 12 tire keys to the real benchmark dependencies', () => {
    for (const c of ['MX', 'US'] as const) {
      const deps = benchmarkRateRequirements(c)
      expect(deps.maintenanceUsdPerKm).toHaveLength(31)
      expect(deps.tiresUsdPerKm).toHaveLength(12)
      expect(deps.maintenanceUsdPerKm.every(key => PARAMETER_DEFINITIONS.find(d => d.key === key)?.section === 'COST_MAINT')).toBe(true)
      expect(deps.tiresUsdPerKm.every(key => PARAMETER_DEFINITIONS.find(d => d.key === key)?.section === 'COST_TIRES')).toBe(true)
    }
  })
  it('reuses lifecycle mathematics without treating retreads as extra physical wheels', () => {
    // Synthetic boundary test only, not a public benchmark or a persisted base.
    const evidence = [{ id: 'SYNTHETIC', sourceUrl: 'https://example.org/synthetic', observedOn: '2026-09-30' }]
    const result = deriveTireLifecycleCandidate({ position: 'DRIVE', quantityOnVehicle: 2,
      identity: { manufacturer: 'TEST', model: 'TEST', size: 'TEST', loadRange: 'TEST',
        serviceDescription: 'TEST', application: 'TEST', fitmentStatus: 'VERIFIED_EXACT', evidence },
      newTire: { installedCostMxn: 100, lifeKm: 1000, costBasis: 'DELIVERED_INSTALLED_WITH_DISPOSAL', evidence },
      retreadStages: [{ stage: 1, reachProbability: 0.5, installedCostMxn: 50, lifeKm: 500,
        costBasis: 'DELIVERED_INSTALLED_WITH_DISPOSAL', evidence }],
      expectedTerminalCasingCreditMxn: 0, terminalCasingEvidence: evidence,
      currency: 'MXN', evidenceStatus: 'EVIDENCED_FOR_TARGET_FLEET' })
    expect(result.vehicleCostMxnPerKm).toBeCloseTo(0.2, 12)
    expect(result.retreadIsPhysicalPosition).toBe(false)
    expect(result.quoteEligible).toBe(false); expect(result.databaseWriteAllowed).toBe(false)
  })
  it('detects altered prior dossier or archived PDF bytes', () => {
    expect(() => verifyMaintenanceFiles(fixture, () => Buffer.from('altered'))).toThrow('SOURCE_HASH_MISMATCH')
  })
  it('rejects duplicate pinned files and unsafe paths', () => {
    const input = copy(); input.unchangedFiles[0] = input.unchangedFiles[1]
    expect(() => verifyMaintenanceFiles(input, readBytes)).toThrow('DUPLICATE_PINNED_FILE')
    expect(() => readScopedMaintenanceFile(root, '../outside.json')).toThrow()
  })
  it('ends this research cut and advances to fixed/exposure/trailer without false closure', () => {
    const decision = reviewMaintenanceTires(fixture).decision
    expect(decision.nextCut).toBe('FIXED_EXPOSURE_TRAILER_CONSOLIDATION')
    expect(decision.researchCutClosed).toBe(true); expect(decision.economicFamilyClosed).toBe(false)
    expect(decision.businessGatesClosed).toBe(0)
    expect(Object.values(fixture.externalChanges).every(v => v === false)).toBe(true)
  })
})

