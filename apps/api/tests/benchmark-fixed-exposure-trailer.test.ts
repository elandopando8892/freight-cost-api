import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { consolidateFixedExposureTrailer } from '../scripts/consolidate-fixed-exposure-trailer.js'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'

const manifestFile = 'docs/research/B2_FIXED_EXPOSURE_TRAILER_CONSOLIDATION_2026-09-30.json'
const raw = JSON.parse(readLocalDocument(manifestFile))
const review = () => consolidateFixedExposureTrailer(raw, readLocalDocument)
const sha = (text: string) => createHash('sha256').update(text).digest('hex')

/** Test-only repinning lets semantic guards be exercised, not just byte guards.
 * Nothing is written or adopted. */
function changedSnapshot(changes: Record<string, (data: any) => void>) {
  const cache = new Map<string, string>()
  for (const [file, mutate] of Object.entries(changes)) {
    const doc = JSON.parse(readLocalDocument(file)); mutate(doc)
    cache.set(file, JSON.stringify(doc))
  }
  const coreFile = 'docs/research/B2_PAYROLL_CAPITAL_CONTRACT_TEMPLATE_2026-09-29.json'
  if (cache.has(coreFile)) {
    const ledgerFile = 'docs/research/B2_PUBLIC_REFERENCE_COMPONENTS_LEDGER_2026-09-29.json'
    const ledger = JSON.parse(readLocalDocument(ledgerFile))
    ledger.coreTemplateSha256 = sha(cache.get(coreFile)!)
    cache.set(ledgerFile, JSON.stringify(ledger))
  }
  const input = structuredClone(raw)
  const assemblyFile = input.sources.find((s: any) => s.id === 'assembly').file
  for (const file of [assemblyFile, ...input.sources.filter((s: any) => s.id !== 'assembly').map((s: any) => s.file)]) {
    const doc = JSON.parse(cache.get(file) ?? readLocalDocument(file))
    let updated = cache.has(file)
    for (const ref of [...(doc.sources ?? []), ...(doc.unchangedFiles ?? [])]) {
      if (cache.has(ref.file)) { ref.sha256 = sha(cache.get(ref.file)!); updated = true }
    }
    if (updated) cache.set(file, JSON.stringify(doc))
  }
  for (const source of input.sources) if (cache.has(source.file)) source.sha256 = sha(cache.get(source.file)!)
  return () => consolidateFixedExposureTrailer(input, file => cache.get(file) ?? readLocalDocument(file))
}

describe('fixed/exposure/shared-trailer handoff: never economic acceptance', () => {
  it('consolidates seventeen pinned local documents and the existing audit', () => {
    const report = review()
    expect(report.sources).toHaveLength(17)
    expect(new Set(report.sources.map(s => s.file)).size).toBe(17)
    expect(report.sources.every(s => !s.externallyRefreshedThisCut)).toBe(true)
    expect(report.existingAudit).toEqual({ status: 'INCOMPLETE', issues: 48 })
    expect(report.consolidationComplete).toBe(true)
    expect(report.status).toBe('NO_GO_ECONOMIC_HANDOFF')
  })
  it('keeps five fixed/finance sections, two exposure sections and LABOR separate per country', () => {
    for (const card of review().countries) {
      expect(card.fixedAndFinanceSections.map(s => s.section)).toEqual([
        'COST_CAPITAL', 'COST_INSURANCE', 'COST_PAYROLL', 'COST_COMPANY', 'FINANCE'])
      expect(card.exposureSections.map(s => s.section)).toEqual(['GENERAL_BASE', 'UTILIZATION'])
      expect(card.driver.destination).toBe('CVU')
      expect(card.fixedAndFinanceSections.find(s => s.section === 'FINANCE')!.destination).toBe('FINANCE')
    }
  })
  it('keeps national profiles and historical denominators distinct, not accepted for the pilot', () => {
    const report = review()
    expect(report.countries.map(c => c.country)).toEqual(['MX', 'US'])
    expect(report.countries.map(c => c.historicalExposureSourceId)).toEqual(['IMT_PT260_CASE', 'ATRI_2025_NATIONAL_2024'])
    expect(report.countries.every(c => !c.historicalExposureAcceptedForPilot && !c.observedCarrierFleet)).toBe(true)
    expect(report.handoff.routeReverseSwapsNationalBases).toBe(false)
  })
  it('does not infer a one-tractor fleet from normalized exposure', () => {
    const report = review()
    expect(report.safeguards.inferredFleetSize).toBeNull()
    expect(report.safeguards.exposureNormalization).toBe('ONE_TRACTOR_EQUIVALENT_NOT_CARRIER_FLEET_SIZE')
    for (const card of report.countries) expect(Object.values(card.exposure)).toEqual([null, null, null])
  })
  it('imports no synthetic stress, selected trailer policy or arbitrary half-split', () => {
    const trailer = review().sharedTrailer
    expect(trailer.availableUnselectedPolicies).toEqual(['MX_PROVIDES', 'US_PROVIDES', 'AGREED_POOL'])
    for (const field of ['selectedOwner', 'costBearer', 'settlementShares', 'monthlyFixedUsd', 'cfuUsd', 'cvuUsd'] as const) {
      expect(trailer[field]).toBeNull()
    }
    expect(trailer.rule).toBe('ONE_PHYSICAL_CYCLE_THEN_ALLOCATE')
    expect(trailer.syntheticStressImported).toBe(false)
    expect(trailer.defaultHalfSplit).toBe(false)
    expect(trailer.knownZeroCost).toBe(false)
    expect(trailer.compositeCountryRatesAddable).toBe(false)
    expect(JSON.stringify(trailer)).not.toContain('1000')
  })
  it('retains double-count boundaries and does not certify an unfixed insurance formula', () => {
    const rules = review().safeguards
    expect(rules.allocation).toBe('MAX_DISTANCE_TIME_NOT_SUM')
    expect(rules.adminAndCombinedOverheadAddable).toBe(false)
    expect(rules.employerTotalPlusBenefitsAddable).toBe(false)
    expect(rules.annualInsuranceTermNormalizationImplemented).toBe(false)
    expect(rules.insuranceTermRisk).toContain('non-12')
    expect(rules.activeEngineChanged).toBe(false)
    expect(rules.formulasEvaluated).toBe(false)
  })
  it('uses latest fuel and maintenance cuts without generating rates or completed gates', () => {
    const report = review()
    for (const card of report.countries) {
      expect(card.fuel.status).toBe('NO_GO_MATCHED_LOADED_EMPTY_PAIR')
      expect(card.maintenanceAndTires.status).toBe('NO_GO_TARGET_PROFILE_AND_ALLOCATION')
      expect(Object.values(card.outputs).every(value => value === null)).toBe(true)
      expect(card.referencePeriod).toBe('UNRESOLVED')
      expect(card.administration.selectedMethod).toBeNull()
    }
    expect(report.trip.routeSelected).toBe(false)
    expect(report.handoff.economicClose).toBe(false)
    expect(report.handoff.businessGatesClosed).toBe(0)
    expect(report.handoff.nextCut).toBe('D2D_CASE_READINESS_AND_HANDOFF')
    expect(report.handoff.missingPackages).toHaveLength(7)
    expect(report.handoff.inferredPurchaseOrSellPrice).toBe(false)
  })
  it.each(['calibrated', 'quoteReady'])('rejects readiness by declaration: %s', field => {
    const input = structuredClone(raw); input[field] = true
    expect(() => consolidateFixedExposureTrailer(input, readLocalDocument)).toThrow()
  })
  it.each(['adoptedValues', 'priceUsd', 'database'])('rejects adoption, output or external flags: %s', field => {
    const input = structuredClone(raw); input[field] = 1
    expect(() => consolidateFixedExposureTrailer(input, readLocalDocument)).toThrow()
  })
  it('rejects duplicate sources and aliases to other or out-of-scope documents', () => {
    const duplicate = structuredClone(raw); duplicate.sources[1] = duplicate.sources[0]
    expect(() => consolidateFixedExposureTrailer(duplicate, readLocalDocument)).toThrow('DUPLICATE_SOURCE_ID')
    for (const file of ['../secret.json', 'apps/api/package.json', raw.sources[1].file]) {
      const input = structuredClone(raw); input.sources[0].file = file
      expect(() => consolidateFixedExposureTrailer(input, readLocalDocument)).toThrow('SOURCE_ID_FILE_MISMATCH')
    }
  })
  it.each(['assembly', 'fuel', 'maintenance'])('rejects altered root source bytes: %s', id => {
    const source = raw.sources.find((s: any) => s.id === id)
    expect(() => consolidateFixedExposureTrailer(raw, file => readLocalDocument(file) + (file === source.file ? '\n' : ''))).toThrow('SOURCE_HASH_MISMATCH')
  })
  it('rejects changed nested evidence and incompatible HEAD even when root hashes are repinned', () => {
    expect(() => consolidateFixedExposureTrailer(raw, file => readLocalDocument(file) +
      (file.includes('B1_INSURANCE_COVERAGE_COST_BRIDGE') ? '\n' : ''))).toThrow('SOURCE_HASH_MISMATCH')
    const input = structuredClone(raw); input.baseHead = '0'.repeat(40)
    expect(() => consolidateFixedExposureTrailer(input, readLocalDocument)).toThrow('BASE_HEAD_MISMATCH')
  })
  it('rejects sources newer than the declared consolidation cut', () => {
    const input = structuredClone(raw); input.cutDate = '2026-09-29'
    expect(() => consolidateFixedExposureTrailer(input, readLocalDocument)).toThrow('SOURCE_DATE_AFTER_CUT')
  })
  it('rejects inferred fleet-size-one in a repinned profile', () => {
    expect(changedSnapshot({ 'docs/research/B2_REFERENCE_PROFILE_EXPOSURE_2026-09-29.json':
      data => { data.profiles[0].actualFleetTractors = 1 } })).toThrow()
  })
  it('rejects duplicate national coverage in a repinned profile', () => {
    expect(changedSnapshot({ 'docs/research/B2_REFERENCE_PROFILE_EXPOSURE_2026-09-29.json':
      data => { data.profiles.push(data.profiles[0]); data.profiles.splice(1, 1) } })).toThrow()
  })
  it('rejects policy examples relabeled as selected or known zero in repinned residual research', () => {
    for (const mutate of [
      (data: any) => { data.sharedTrailer.chosenSettlementShares = [0.5, 0.5] },
      (data: any) => { data.sharedTrailer.knownZeroCost = true },
      (data: any) => { data.sharedTrailer.responsibilityOptions[0].kind = 'SELECTED' },
    ]) expect(changedSnapshot({ 'docs/research/B2_USED_RESIDUAL_SHARED_CYCLE_2026-09-29.json': mutate })).toThrow()
  })
  it('rejects zero capital and unfounded insurance normalization in repinned documents', () => {
    expect(changedSnapshot({ 'docs/research/B2_CAPITAL_ACQUISITION_BRIDGE_2026-09-29.json':
      data => { data.acquisitionCards[0].capitalizableAcquisitionCost = 0 } })).toThrow()
    expect(changedSnapshot({ 'docs/research/B1_INSURANCE_COVERAGE_COST_BRIDGE_2026-09-29.json':
      data => { data.canonicalBridge.periodNormalizationImplemented = true } })).toThrow()
  })
  it('rejects repinned zero exposure or silently completed overhead in the core template', () => {
    for (const mutate of [
      (data: any) => { data.contracts[0].exposure.totalKmPerFleetMonth = 0 },
      (data: any) => { data.contracts[1].administration.method = 'COMBINED_OVERHEAD' },
    ]) expect(changedSnapshot({ 'docs/research/B2_PAYROLL_CAPITAL_CONTRACT_TEMPLATE_2026-09-29.json': mutate })).toThrow()
  })
  it('selects country identity rather than array position across all economic blocks', () => {
    const report = changedSnapshot({
      'docs/research/B2_CAPITAL_ACQUISITION_BRIDGE_2026-09-29.json': data => data.acquisitionCards.reverse(),
      'docs/research/B1_INSURANCE_COVERAGE_COST_BRIDGE_2026-09-29.json': data => data.pilotCards.reverse(),
      'docs/research/B2_PAYROLL_CAPITAL_CONTRACT_TEMPLATE_2026-09-29.json': data => data.contracts.reverse(),
      'docs/research/B2_FUEL_PRICE_PERFORMANCE_REFERENCE_2026-09-30.json': data => data.countryCards.reverse(),
      'docs/research/B2_MAINTENANCE_TIRES_REFERENCE_2026-09-30.json': data => data.countryCards.reverse(),
    })()
    expect(report.countries.map(c => c.country)).toEqual(['MX', 'US'])
    for (const card of report.countries) {
      expect(card.cohortId).toMatch(new RegExp(`^${card.country}_`))
      expect(card.fuel.country).toBe(card.country)
      expect(card.maintenanceAndTires.country).toBe(card.country)
    }
  })
  it('rejects newly relabeled fuel or composite maintenance rates as pending inputs', () => {
    expect(changedSnapshot({ 'docs/research/B2_FUEL_PRICE_PERFORMANCE_REFERENCE_2026-09-30.json':
      data => { data.countryCards[0].loadedKmPerLiter = 2.5 } })).toThrow()
    expect(changedSnapshot({ 'docs/research/B2_MAINTENANCE_TIRES_REFERENCE_2026-09-30.json':
      data => { data.countryCards[1].tractorOnlyRate = 0.1 } })).toThrow()
  })
})
