import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PARAMETER_DEFINITIONS } from '../src/data/parameter-catalog.js'
import { benchmarkRateRequirements } from '../src/modules/engine/benchmark-rates.js'
import { pricePerLiter, performanceKmPerLiter, reviewFuelReference, verifyFuelFiles,
  LITERS_PER_US_GALLON, KM_PER_INTERNATIONAL_MILE } from '../scripts/review-fuel-reference.js'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const fixture = JSON.parse(readFileSync(resolve(root, 'docs/research/B2_FUEL_PRICE_PERFORMANCE_REFERENCE_2026-09-30.json'), 'utf8'))
const copy = () => structuredClone(fixture)
const readBytes = (file: string) => readFileSync(resolve(root, file))

describe('Public FUEL evidence: units, contrasts and pilot NO-GO', () => {
  it('verifies both archived primary PDFs and four prior dossiers without changing them', () => {
    expect(verifyFuelFiles(fixture, readBytes)).toBe(6)
  })
  it('retains two national cards, four contrasts and no adopted pilot outputs', () => {
    const report = reviewFuelReference(fixture)
    expect(report.contrasts).toHaveLength(4)
    expect(report.countryCards.map(card => card.country)).toEqual(['MX', 'US'])
    for (const card of report.countryCards) {
      expect(card.loadedKmPerLiter).toBeNull(); expect(card.emptyKmPerLiter).toBeNull()
      expect(card.pilotFuelUsdPerKm).toBeNull(); expect(card.pilotFuelTripUsd).toBeNull()
      expect(card.routeSelected).toBe(false)
    }
    expect(report.calibrated).toBe(false); expect(report.quoteReady).toBe(false); expect(report.adoptedValues).toBe(0)
  })
  it('converts EIA USD/US-gallon to USD/liter exactly once', () => {
    expect(pricePerLiter(5.955, 'USD/US-gallon')).toBeCloseTo(1.573144571792774, 12)
    expect(pricePerLiter(27, 'MXN/liter')).toBe(27)
    expect(5.955 / pricePerLiter(5.955, 'USD/US-gallon')).toBeCloseTo(LITERS_PER_US_GALLON, 12)
  })
  it('converts MPG to km/liter with international mile and US liquid gallon', () => {
    expect(performanceKmPerLiter(7.9, 'mile/US-gallon')).toBeCloseTo(3.3586352886991495, 12)
    expect(performanceKmPerLiter(1.47, 'km/liter')).toBe(1.47)
    expect(performanceKmPerLiter(9.5, 'mile/US-gallon')).toBeCloseTo(4.038865220587584, 12)
  })
  it('independently reconciles USD/km and preserves cross-period sensitivity labels', () => {
    const report = reviewFuelReference(fixture)
    const heavy = report.contrasts.find(row => row.id === 'US_ORNL_HEAVY_BIN')!
    expect(heavy.nativeCostPerKm).toBeCloseTo(5.955 / 7.9 / KM_PER_INTERNATIONAL_MILE, 12)
    expect(heavy.nativeCostPer100Km).toBeCloseTo(46.838803161687636, 10)
    for (const row of report.contrasts) {
      expect(row.purpose).toBe('CROSS_PERIOD_PUBLIC_SENSITIVITY_NOT_BASE_INPUT')
      expect(row.emptyConfirmed).toBe(false); expect(row.targetProfileMatched).toBe(false)
      expect(row.nativeCostPer100Km).toBeCloseTo(row.nativeCostPerKm * 100, 10)
    }
  })
  it('keeps MXN outputs native, with no guessed FX or cross-country total', () => {
    const rows = reviewFuelReference(fixture).contrasts.filter(row => row.country === 'MX')
    expect(rows.map(row => row.currency)).toEqual(['MXN', 'MXN'])
    expect(rows[0].nativeCostPerKm).toBeCloseTo(27 / 1.47, 10)
    expect(rows[1].nativeCostPerKm).toBeCloseTo(27 / 2.01, 10)
    expect(fixture.countryCards[0].fxMxnPerUsd).toBeNull()
  })
  it('does not relabel lighter gross weight or a declared roundtrip load as empty', () => {
    expect(fixture.performance.every((row: any) => row.emptyConfirmed === false)).toBe(true)
    const raw = copy(); raw.performance[2].emptyConfirmed = true
    expect(() => reviewFuelReference(raw)).toThrow()
    const mixed = copy(); mixed.performance[0].loadStatus = 'TOTAL_WEIGHT_BIN_NOT_EMPTY_CERTIFIED'
    expect(() => reviewFuelReference(mixed)).toThrow('LOAD_SCOPE_MISMATCH')
  })
  it('keeps observation periods distinct from report/model/publication year', () => {
    expect(fixture.performance[0].observationPeriod).toBe('2001-2014')
    expect(fixture.performance[0].modelYear).toBe(1996)
    expect(fixture.performance[2].observationPeriod).toBe('2006-2008')
    expect(fixture.sources[2].publishedDate).toBe('2025')
  })
  it('preserves Profeco index-only versus direct EIA verification', () => {
    const report = reviewFuelReference(fixture)
    expect(report.contrasts[0].priceVerification).toBe('PRIMARY_INDEXED_EXCERPT_ONLY')
    const raw = copy(); raw.prices[0].verification = 'DIRECT_PAGE_READ'
    expect(() => reviewFuelReference(raw)).toThrow('PRICE_VERIFICATION_MISMATCH')
  })
  it('rejects a country mismatch, duplicate source IDs and future price dates', () => {
    const raw = copy(); raw.performance[0].sourceId = 'ORNL_TM2011_471'
    expect(() => reviewFuelReference(raw)).toThrow('SOURCE_COUNTRY_MISMATCH')
    const duplicate = copy(); duplicate.sources[1].id = duplicate.sources[0].id
    expect(() => reviewFuelReference(duplicate)).toThrow('DUPLICATE_RECORD_ID')
    const future = copy(); future.prices[0].observationDate = '2027-01-01'
    expect(() => reviewFuelReference(future)).toThrow('FUTURE_PRICE_OBSERVATION')
  })
  it('rejects price and performance unit-country mismatches', () => {
    const raw = copy(); raw.prices[1].unit = 'MXN/liter'
    expect(() => reviewFuelReference(raw)).toThrow('PRICE_UNIT_COUNTRY_MISMATCH')
    const other = copy(); other.performance[2].unit = 'km/liter'
    expect(() => reviewFuelReference(other)).toThrow('PERFORMANCE_UNIT_COUNTRY_MISMATCH')
  })
  it.each([0, -1, NaN, Infinity])('rejects invalid price/performance %s', value => {
    expect(() => pricePerLiter(value, 'USD/US-gallon')).toThrow()
    expect(() => performanceKmPerLiter(value, 'km/liter')).toThrow()
  })
  it('rejects wrong or Imperial gallon unit instead of guessing conversion', () => {
    expect(() => pricePerLiter(5.955, 'USD/liter' as any)).toThrow()
    expect(() => performanceKmPerLiter(7.9, 'mile/Imperial-gallon' as any)).toThrow()
    const raw = copy(); raw.units.litersPerUsGallon = 4.54609
    expect(() => reviewFuelReference(raw)).toThrow()
  })
  it('reconciles the printed ORNL MPG to rounded distance/fuel aggregates', () => {
    for (const row of fixture.performance.filter((item: any) => item.country === 'US')) {
      expect(Number((row.sourceDistanceMiles / row.sourceFuelUsGallons).toFixed(1))).toBe(row.value)
    }
  })
  it('rejects weights outside the source bin', () => {
    const raw = copy(); raw.performance[2].averageWeightLb = 45000
    expect(() => reviewFuelReference(raw)).toThrow('WEIGHT_BIN_MISMATCH')
  })
  it('ties the unit bridge to actual consumed canonical keys without using defaults', () => {
    const bridge = fixture.engineBridge
    for (const key of [bridge.fuelPriceMXKey, bridge.fuelPriceUSKey, bridge.fxKey, bridge.loadedKey, bridge.emptyKey]) {
      expect(PARAMETER_DEFINITIONS.some(definition => definition.key === key)).toBe(true)
    }
    expect(benchmarkRateRequirements('US').dieselUsdPerLiter).toEqual([bridge.fuelPriceUSKey])
    expect(benchmarkRateRequirements('MX').dieselUsdPerLiter).toEqual([bridge.fuelPriceMXKey, bridge.fxKey])
    expect(PARAMETER_DEFINITIONS.find(item => item.key === bridge.fuelPriceUSKey)!.unit).toBe('USD/L')
    expect(bridge.integrated).toBe(false); expect(bridge.adoptionPerformed).toBe(false)
  })
  it('rejects engine integration, adoption, ready flags and invented pilot zeros', () => {
    for (const mutate of [
      (raw: any) => { raw.engineBridge.integrated = true },
      (raw: any) => { raw.adoptedValues = 1 },
      (raw: any) => { raw.quoteReady = true },
      (raw: any) => { raw.calibrated = true },
      (raw: any) => { raw.countryCards[0].pilotFuelTripUsd = 0 },
      (raw: any) => { raw.externalChanges.database = true },
    ]) { const raw = copy(); mutate(raw); expect(() => reviewFuelReference(raw)).toThrow() }
  })
  it('rejects changed PDFs/dossiers and unarchived-source hash claims', () => {
    expect(() => verifyFuelFiles(fixture, file => Buffer.concat([readBytes(file), Buffer.from('\n')]))).toThrow('SOURCE_HASH_MISMATCH')
    const raw = copy(); raw.sources[0].sha256 = createHash('sha256').update('not archived').digest('hex')
    expect(() => verifyFuelFiles(raw, readBytes)).toThrow('ARCHIVE_METADATA_MISMATCH')
  })
  it('closes only the bounded research cut, carries economic gaps and moves to maintenance/tires', () => {
    const decision = reviewFuelReference(fixture).decision
    expect(decision.researchCutClosed).toBe(true)
    expect(decision.economicFamilyClosed).toBe(false)
    expect(decision.businessGatesClosed).toBe(0)
    expect(decision.nextCut).toBe('MAINTENANCE_TIRES_EXCLUSIVE_COST_PER_KM')
  })
})
