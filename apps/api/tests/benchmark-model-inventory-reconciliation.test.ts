import { beforeAll, describe, expect, it, vi } from 'vitest'
vi.mock('../src/config/prisma.js', () => { throw new Error('Persistence initialization forbidden in model reconciliation') })
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'
import { consolidateBinationalReferenceBudget } from '../scripts/consolidate-binational-reference-budget.js'
import { CURRENT_REGISTER, reconcileEconomicModelInventory } from '../scripts/reconcile-economic-model-inventory.js'
import { benchmarkRateRequirements } from '../src/modules/engine/benchmark-rates.js'
import { deriveMaintTiresPerKm } from '../src/modules/engine/engine.outputs.js'
import { PARAMETER_DEFINITIONS } from '../src/data/parameter-catalog.js'
import { auditModelParameterConsumers, auditTireFormulaBindings, MODEL_PARAMETER_SOURCE_FILES, readModelParameterSource } from '../scripts/lib/model-parameter-consumers.js'

describe('current inventory -> public family components -> economic formula', () => {
  let budget: ReturnType<typeof consolidateBinationalReferenceBudget>
  let markdown: string
  let report: ReturnType<typeof reconcileEconomicModelInventory>
  beforeAll(() => {
    budget = consolidateBinationalReferenceBudget()
    markdown = readLocalDocument(CURRENT_REGISTER)
    report = reconcileEconomicModelInventory(markdown, budget)
  })
  const value = (section: string, name: string) => report.sections.find(s => s.section === section)!.components.find(c => c.name === name)!.value
  it('joins all13 sections, current79-pin evidence and135 canonical keys without fake adoption', () => {
    expect(report.sections).toHaveLength(13)
    expect(report.sourcePins).toHaveLength(79)
    expect(report.canonicalInventory).toMatchObject({ documentedKeys: 135, candidates: 3, contrasts: 47, missingEvidence: 85, adoptedValues: 0 })
    expect(report.sections.reduce((n, s) => n + s.canonicalKeys.length, 0)).toBe(135)
  })
  it('independently normalizes public diesel, maintenance and tyres without using a trip total', () => {
    expect(value('FUEL', 'MX_FUEL_NORMALIZED')).toBeCloseTo(27 * 483.92 / 1000 / 18.3688, 12)
    expect(value('FUEL', 'US_FUEL_NORMALIZED')).toBeCloseTo(5.955 / 7.9 / 1.609344, 12)
    expect(value('COST_MAINT', 'MX_MAINT_NORMALIZED')).toBeCloseTo((2010.02 + 3607.52) / 1000 / 18.3688, 12)
    expect(value('COST_TIRES', 'MX_TIRES_NORMALIZED')).toBeCloseTo(969.96 / 1000 / 18.3688, 12)
    expect(value('COST_MAINT', 'US_MAINT')).toBeCloseTo(.212 / 1.609344, 12)
    expect(value('COST_TIRES', 'US_TIRES')).toBeCloseTo(.048 / 1.609344, 12)
  })
  it('conserves one admin pool and distinguishes the partial service basket', () => {
    const allocated = budget.supportingAdminScaleReference.allocatedLines.filter(l => l.id.startsWith('PUBLIC_SCALE_ADMIN_PAYROLL'))
    expect(allocated.reduce((n, l) => n + l.monthlyUsd, 0)).toBe(value('COST_PAYROLL', 'ADMIN_PAYROLL_POOL'))
    expect(value('COST_COMPANY', 'TMS_TWO_NAMED_ACCOUNTS')).toBe(2 * 69)
    expect(value('COST_COMPANY', 'OFFICE_MOBILE_US_RESERVED_BAYS')).toBeCloseTo(2 * 100 + 100 + 2 * 4.49 + 150 + 175, 12)
    expect(value('COST_COMPANY', 'RECURRING_COMPLIANCE_COMPONENTS')).toBeCloseTo((2021.47 + 46 + 550 + 101.75) / 12, 12)
  })
  it('keeps source periods and transfers explicit instead of claiming current calibrated performance', () => {
    const fuel = report.sections.find(s => s.section === 'FUEL')!
    expect(fuel.components.find(c => c.name === 'US_ROAD_PERFORMANCE')!.period).toBe('2006-2008')
    expect(fuel.components.find(c => c.name === 'MX_DIESEL_PRICE')!.period).toBe('2026-09-25')
    expect(fuel.state).toBe('PARTIAL_PUBLIC_MODEL_NOT_CALIBRATED')
    expect(report.sourceRefreshPerformed).toBe(false)
  })
  it('recalculates public fixed allocation per resource with the updated ordinary-duty box capacity', () => {
    expect(report.partialCfuVerification).toHaveLength(4)
    const network = report.partialCfuVerification.find(s => s.cycleId === 'NETWORK_EXPECTED_EMPTY_PROXY' && s.cashBudgetAlternative.includes('NET_PLUS_VAT'))!
    const box = network.resources.find(r => r.resourceId === 'SHARED_TRAILER')!
    expect(network.subtotalUsd).toBeCloseTo(398.8187283318902 + 376.24809807388925 + 34.27718531728786, 8)
    expect(box.monthlyKm).toBeCloseTo(box.cycleKm * (24 / box.cycleDays), 8)
    for (const s of report.partialCfuVerification) {
      expect(s.resources.filter(r => r.resourceId === 'SHARED_TRAILER')).toHaveLength(1)
      expect(s.resources.every(r => Math.abs(r.recalculatedUsd - Math.max(r.byDistance, r.byTime)) < 1e-8)).toBe(true)
      expect(s.fullPilotCostUsd).toBeNull()
    }
    const corrupted = structuredClone(budget)
    corrupted.supportingPilotOrdinaryDuty.scenarios[0].conditionalFixedAllocations[0].resources[0].conditionalOldDistanceKnownClockMaxUsd += 1
    expect(() => reconcileEconomicModelInventory(markdown, corrupted)).toThrow('CFU_RESOURCE_ARITHMETIC_MISMATCH')
  })
  it('does not sum capital tax alternatives or driver road rates as employer totals', () => {
    expect(report.sections.find(s => s.section === 'COST_CAPITAL')!.components).toHaveLength(6)
    expect(report.sections.find(s => s.section === 'COST_CAPITAL')!.components.every(c => c.basis === 'CASH_SCENARIO_ALTERNATIVE_NOT_ADDITIVE')).toBe(true)
    expect(report.sections.find(s => s.section === 'LABOR')!.closureGap).toContain('not complete employer costs')
  })
  it('makes trip inputs separate without excusing missing costs in the complete pilot', () => {
    expect(report.tripInputs.exactTollCoverageRequiredForModelValidation).toBe(false)
    expect(report.tripInputs.costsRequiredForCompletePilotEstimate).toBe(true)
    expect(report.fullPilotOutputs.productiveCostUsd).toBeNull()
    expect(report.calibrated).toBe(false)
    expect(report.quoteReady).toBe(false)
    expect(Object.values(report.externalChanges).every(v => v === false)).toBe(true)
  })
  it('retains one physical box and keeps risk/margin outside productive cost without zero rates', () => {
    expect(value('GENERAL_BASE', 'SHARED_PHYSICAL_BOX_COUNT')).toBe(1)
    for (const id of ['RISK', 'TECHNICAL_MARGIN']) {
      const s = report.sections.find(s => s.section === id)!
      expect(s.economicRole).toBe('OUTSIDE_PRODUCTIVE_COST')
      expect(s.components).toEqual([])
      expect(s.canonicalKeys).toEqual([]) // No consumption does not certify this section.
    }
    expect(report.sections.find(s => s.section === 'UTILIZATION')!.economicRole).toBe('CFU_DENOMINATORS_AND_CYCLE')
  })
  it('rejects missing section lineage and duplicated pins', () => {
    const missing = { ...budget, sourcePins: budget.sourcePins.filter(p => p.id !== 'mxProspective') }
    expect(() => reconcileEconomicModelInventory(markdown, missing)).toThrow('MISSING_SECTION_SOURCE:COST_CAPITAL:mxProspective')
    const duplicate = { ...budget, sourcePins: [...budget.sourcePins, budget.sourcePins[0]] }
    expect(() => reconcileEconomicModelInventory(markdown, duplicate)).toThrow('DUPLICATE_SOURCE_PIN')
  })
  it('rejects missing variable identity or invalid normalized numbers', () => {
    const missing = structuredClone(budget)
    missing.supportingPilotVariableEconomics.scenarios[0].rows = missing.supportingPilotVariableEconomics.scenarios[0].rows.filter(r => r.id !== 'MX_FUEL')
    expect(() => reconcileEconomicModelInventory(markdown, missing)).toThrow('VARIABLE_COMPONENT_IDENTITY:MX_FUEL')
    const invalid = structuredClone(budget)
    invalid.supportingPilotVariableEconomics.scenarios[0].rows.find(r => r.id === 'MX_FUEL')!.nativePerKm = NaN
    expect(() => reconcileEconomicModelInventory(markdown, invalid)).toThrow('INVALID_COMPONENT:MX_FUEL_NORMALIZED')
  })
  it('does not mutate upstream sources, existing scenarios or canonical register', () => {
    const before = JSON.stringify(budget)
    expect(reconcileEconomicModelInventory(markdown, budget)).toEqual(report)
    expect(JSON.stringify(budget)).toBe(before)
    expect(report.registerSha256).toBe('151b3d09d963c749de24038466a91fd868d7bf7c5c1536b93e08e0db18a69314')
  })
  it('maps every canonical input to actual country formula consumers, never adopts catalog defaults', () => {
    expect(report.canonicalInputMatrix).toHaveLength(135)
    expect(new Set(report.canonicalInputMatrix.map(i => i.key)).size).toBe(135)
    expect(report.matrixCoverage).toMatchObject({ canonicalKeys: 135, keysWithExplicitPublicAlternatives: 7, microvaluesInferredFromAggregates: 0, defaultsAdopted: 0 })
    for (const item of report.canonicalInputMatrix) {
      expect(item.canonicalValue).toBeNull()
      expect(item.calibrated).toBe(false)
      expect(item.adopted).toBe(false)
      expect(item.familyComponentsAreDirectInputValues).toBe(false)
      for (const dependency of item.countryDependencies) {
        const expected = Object.entries(benchmarkRateRequirements(dependency.country))
          .filter(([, keys]) => keys.includes(item.key)).map(([rate]) => rate)
        expect(dependency.rates).toEqual(expected)
      }
    }
  })
  it('normalizes dated fuel, FX and mileage pay into canonical units with native transformations visible', () => {
    const input = (key: string) => report.canonicalInputMatrix.find(i => i.key === `fcm.v3.${key}`)!
    expect(input('fuel.diesel-us-border').benchmarkAlternatives[0]).toMatchObject({ country: 'US', unit: 'USD/L', period: '2026-09-28' })
    expect(input('fuel.diesel-us-border').benchmarkAlternatives[0].value).toBeCloseTo(5.955 / 3.785411784, 12)
    expect(input('finance.tipo-de-cambio').benchmarkAlternatives[0].value).toBe(18.3688)
    expect(input('labor.tarifa-operador-mx').benchmarkAlternatives[0].value).toBeCloseTo(2.1 * 1.609344 / 18.3688, 12)
    expect(input('labor.tarifa-operador-us').benchmarkAlternatives[0].value).toBeCloseTo(.817, 12)
    for (const item of report.canonicalInputMatrix) for (const a of item.benchmarkAlternatives) {
      expect(a.unit).toBe(item.canonicalUnit)
      expect(a.sourcePinIds.every(id => report.sourcePins.some(p => p.id === id))).toBe(true)
      expect(a.normalization.length).toBeGreaterThan(0)
      expect(a.limitation.length).toBeGreaterThan(0)
    }
  })
  it('reconstructs fuel USD/km from price and performance, preserving loaded/empty transfer limits', () => {
    for (const result of report.fuelRateVerification) {
      expect(result.recalculatedUsdPerKm).toBeCloseTo(result.usdPerLiter / result.loadedKmPerLiter, 12)
      expect(result.recalculatedUsdPerKm).toBeCloseTo(result.declaredUsdPerKm, 12)
      expect(result.emptyKmPerLiter).toBe(result.loadedKmPerLiter)
      expect(result.loadedEmptyEqualityIsDeclaredTransfer).toBe(true)
      expect(result.calibrated).toBe(false)
    }
    const mx = report.fuelRateVerification.find(r => r.country === 'MX')!
    const us = report.fuelRateVerification.find(r => r.country === 'US')!
    expect(mx.loadedKmPerLiter).toBeCloseTo(1000 / 483.92, 12)
    expect(us.loadedKmPerLiter).toBeCloseTo(7.9 * 1.609344 / 3.785411784, 12)
    const corrupted = structuredClone(budget)
    corrupted.supportingPilotVariableEconomics.scenarios[0].rows.find(r => r.id === 'US_FUEL')!.nativePerKm += .01
    expect(() => reconcileEconomicModelInventory(markdown, corrupted)).toThrow('CANONICAL_FUEL_RATE_MISMATCH:US')
  })
  it('does not spread maintenance, tyres, capital, employer pools or insurance aggregates into microvalues', () => {
    for (const section of ['COST_MAINT', 'COST_TIRES', 'COST_CAPITAL', 'COST_PAYROLL', 'COST_INSURANCE', 'COST_COMPANY']) {
      const items = report.canonicalInputMatrix.filter(i => i.section === section)
      expect(items.length).toBeGreaterThan(0)
      expect(items.every(i => i.canonicalValue === null && i.benchmarkAlternatives.length === 0)).toBe(true)
    }
    const oil = report.canonicalInputMatrix.find(i => i.key === 'fcm.v3.cost-maint.10k-pu-aceite-de-motor')!
    expect(oil.familyComponentNames).toContain('MX_MAINT')
    expect(oil.publicModelTreatment).toBe('FAMILY_EVIDENCE_NOT_A_MICROPARAMETER_VALUE')
  })
  it('relocates DEF to a disjoint operating-fluid family without pretending maintenance reserve is calibrated', () => {
    const def = report.canonicalInputMatrix.find(i => i.key === 'fcm.v3.cost-maint.reserve-def-urea')!
    expect(def.countryDependencies.every(c => c.rates.includes('maintenanceUsdPerKm'))).toBe(true)
    expect(def.economicDestination).toBe('CVU_OPERATING_FLUIDS')
    expect(def.publicModelTreatment).toBe('SEPARATE_DEF_COMPONENT_DO_NOT_ADD_TO_MAINTENANCE')
    expect(def.canonicalValue).toBeNull()
    expect(def.benchmarkAlternatives).toEqual([])
    expect(report.quoteReady).toBe(false)
  })
  it('rejects undocumented dependencies and altered keys, units, country and consumers instead of reporting false complete coverage', () => {
    const missing = markdown.split(/\r?\n/).filter(l => !l.startsWith('| `fcm.v3.cost-company.qty-agua`')).join('\n')
    expect(() => reconcileEconomicModelInventory(missing, budget)).toThrow('UNDOCUMENTED_REQUIREMENT')
    expect(() => reconcileEconomicModelInventory(markdown.replace('`fcm.v3.cost-company.qty-agua`', '`fcm.v3.cost-company.unknown`'), budget)).toThrow('UNKNOWN_REGISTER_KEY')
    expect(() => reconcileEconomicModelInventory(markdown.replace('FUEL · Diesel MX | `MXN/L`', 'FUEL · Diesel MX | `USD/L`'), budget)).toThrow('UNIT_MISMATCH')
    expect(() => reconcileEconomicModelInventory(markdown.replace('FUEL · Diesel MX | `MXN/L` | MX | dieselUsdPerLiter', 'FUEL · Diesel MX | `MXN/L` | US | dieselUsdPerLiter'), budget)).toThrow('MISSING_COUNTRY_ENTRY')
    expect(() => reconcileEconomicModelInventory(markdown.replace('FUEL · Diesel MX | `MXN/L` | MX | dieselUsdPerLiter', 'FUEL · Diesel MX | `MXN/L` | MX | monthlyFixedUsd'), budget)).toThrow('RATE_DEPENDENCY_MISMATCH')
  })
  it('keeps legacy arithmetic defaults and explicit zero unchanged without initializing persistence', () => {
    // Synthetic arithmetic regression only, not researched oil price/quantity.
    const original = deriveMaintTiresPerKm({})
    const zero = deriveMaintTiresPerKm({ 'COST_MAINT__10k Qty Aceite de Motor': 0 })
    const explicit = deriveMaintTiresPerKm({ 'COST_MAINT__10k Qty Aceite de Motor': 3 })
    expect(original - zero).toBeCloseTo(60 * 5 / 10000, 12)
    expect(explicit - zero).toBeCloseTo(3 * 5 / 10000, 12)
  })
  it('accounts for all210 catalog keys without confusing135 benchmark inputs with the whole model', () => {
    const audit = report.completeCatalog
    expect(audit.keys).toHaveLength(210)
    expect(new Set(audit.keys.map(k => k.key)).size).toBe(210)
    expect(audit.keys.map(k => k.key)).toEqual(PARAMETER_DEFINITIONS.map(k => k.key))
    expect(audit.counts).toMatchObject({ catalog: 210, benchmark: 135, outsideBenchmark: 75 })
    expect(audit.counts.outsideBenchmarkWithLiteralReader + audit.counts.outsideBenchmarkWithoutLiteralReader).toBe(75)
    expect(audit.sectionCoverage.reduce((n, s) => n + s.catalogKeys, 0)).toBe(210)
    expect(audit.sectionCoverage.reduce((n, s) => n + s.benchmarkKeys, 0)).toBe(135)
    expect(audit.allApplicationConsumersScanned).toBe(false)
    expect(audit.inactiveOrUnusedKeysInferred).toBe(false)
    expect(audit.defaultsAdopted).toBe(0)
    for (const k of audit.keys) {
      expect(k.benchmarkValue).toBeNull()
      expect(k.calibrated).toBe(false)
      expect(k.adopted).toBe(false)
      expect(k.economicEvidenceComplete).toBe(false)
      expect(k.relatedFamilyEvidenceIsDirectInputCalibration).toBe(false)
      expect(k.relatedPublicFamilySourcePinIds.length).toBeGreaterThan(0)
      expect(k.relatedPublicFamilySourcePinIds.every(id => report.sourcePins.some(p => p.id === id))).toBe(true)
      expect(k.economicDestination).not.toBe('UNMAPPED_ECONOMIC_ROLE')
      expect(k).not.toHaveProperty('defaultValue')
    }
  })
  it('finds actual utilization, border, crossborder and margin readers outside the benchmark without importing them', () => {
    const k = (key: string) => report.completeCatalog.keys.find(k => k.key === `fcm.v3.${key}`)!
    for (const key of ['utilization.deadhead-base', 'border.border-transactional-cost',
      'cost-crossborder.registro-doble-matricula', 'technical-margin.minimum-gross-margin']) {
      expect(k(key).consumedByBenchmark).toBe(false)
      expect(k(key).coverage).toBe('OTHER_ENGINE_LITERAL_READ')
      expect(k(key).staticEngineConsumers.length).toBeGreaterThan(0)
      expect(k(key).benchmarkEvidenceState).toBe('NOT_IN_BENCHMARK_REGISTER')
    }
    expect(k('technical-margin.minimum-gross-margin').economicDestination).toBe('OUTSIDE_PRODUCTIVE_COST')
    expect(k('border.border-transactional-cost').economicDestination).toBe('TRIP_BORDER_INPUTS')
    expect(k('cost-crossborder.registro-doble-matricula').economicDestination).toBe('CFU_COMPLIANCE_AND_SHARED_SERVICES')
    expect(k('utilization.truck-utilization-days').relatedPublicFamilySourcePinIds).toContain('pilotCycle')
    expect(k('border.yard-transfer-cost').relatedPublicFamilySourcePinIds).toContain('pilotRoadBorder')
    const files = report.completeCatalog.sourceFiles
    expect(files.map(f => f.file)).toEqual(MODEL_PARAMETER_SOURCE_FILES)
    for (const file of files) {
      expect(file.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(file.readerCalls).toBeGreaterThan(0)
    }
    // FACTORS live outside this210-input catalog. Don't hide that namespace.
    expect(report.completeCatalog.outsideCatalogReads.some(r => r.section === 'FACTORS')).toBe(true)
  })
  it('uses AST call sites, not comments, and exposes dynamic or uncatalogued reads instead of inventing evidence', () => {
    const keys = new Set(report.canonicalInputMatrix.map(k => k.key))
    const injected = (file: string) => readModelParameterSource(file) + `
      // getParam(params, 'LABOR', 'Sueldo Base Operador MX', 999999)
      getParam(params, 'FUEL', 'Diesel MX', 999999);
      getParam(params, section, field, 999999);
      getParam(params, 'FUEL', 'Unregistered field', 999999);
    `
    const base = auditModelParameterConsumers(keys), changed = auditModelParameterConsumers(keys, injected)
    const consumers = (audit: typeof base, key: string) => audit.keys.find(k => k.key === key)!.staticEngineConsumers.length
    expect(consumers(changed, 'fcm.v3.labor.sueldo-base-operador-mx')).toBe(consumers(base, 'fcm.v3.labor.sueldo-base-operador-mx'))
    expect(consumers(changed, 'fcm.v3.fuel.diesel-mx')).toBe(consumers(base, 'fcm.v3.fuel.diesel-mx') + 7)
    expect(changed.dynamicReads.length).toBe(base.dynamicReads.length + 7)
    expect(changed.outsideCatalogReads.filter(r => r.field === 'Unregistered field')).toHaveLength(7)
    expect(changed.keys.every(k => k.benchmarkValue === null)).toBe(true)
    expect(changed.sourceFiles[0].sha256).not.toBe(base.sourceFiles[0].sha256)
  })
  it('rejects missing/invalid source syntax, non-allowlisted paths and noncanonical benchmark keys', () => {
    const keys = new Set(report.canonicalInputMatrix.map(k => k.key))
    expect(() => auditModelParameterConsumers(keys, () => '')).toThrow('MODEL_SOURCE_NO_READER_CALLS')
    expect(() => auditModelParameterConsumers(keys, () => 'function broken( {')).toThrow('MODEL_SOURCE_SYNTAX')
    expect(() => readModelParameterSource('docs/../.env')).toThrow('MODEL_SOURCE_NOT_ALLOWLISTED')
    expect(() => auditModelParameterConsumers(new Set(['fcm.v3.unknown']))).toThrow('MODEL_BENCHMARK_UNKNOWN_KEY')
  })
  it('exposes legacy tyre-price permutation instead of certifying source references as formula equivalence', () => {
    // Deliberately unequal synthetic prices: no public calibration/adoption.
    const params = Object.fromEntries(PARAMETER_DEFINITIONS.filter(d => d.section === 'COST_MAINT')
      .map(d => [`${d.section}__${d.field}`, 0]))
    for (const [position, price] of [['Direccion', 100], ['Traccion', 200], ['Recapeadas', 300], ['Remolque', 400]] as const) {
      params[`COST_TIRES__Qty ${position}`] = position === 'Recapeadas' ? 0 : 1
      params[`COST_TIRES__PU ${position}`] = price
      params[`COST_TIRES__Life KM ${position}`] = 1000
    }
    const positionalSpecification = (100 + 200 + 400) / 1000
    expect(deriveMaintTiresPerKm(params)).toBeCloseTo(.6, 12)
    expect(positionalSpecification).toBeCloseTo(.7, 12)
    expect(deriveMaintTiresPerKm(params)).not.toBeCloseTo(positionalSpecification, 12)
    // This documents an existing WORKBOOK compatibility difference; no repair
    // or automatic routing into the public-family pilot is authorized here.
    expect(report.calibrated).toBe(false)
  })
  it('connects all twelve tire fields to observed price bindings and the guarded benchmark method', () => {
    const audit = report.tireFormulaVerification
    expect(audit.rows.flatMap(r => r.canonicalKeys).sort()).toEqual(
      PARAMETER_DEFINITIONS.filter(p => p.section === 'COST_TIRES').map(p => p.key).sort())
    expect(audit.rows.map(r => r.legacyPriceField)).toEqual([
      'COST_TIRES__PU Direccion', 'COST_TIRES__PU Recapeadas', 'COST_TIRES__PU Remolque', 'COST_TIRES__PU Traccion',
    ])
    expect(audit.rows.map(r => r.legacyRowUsdPerKm)).toEqual([.1, .3, .4, .2])
    expect(audit.mismatchedPriceBindings).toBe(3)
    expect(audit.methodsEquivalent).toBe(false)
    expect(audit.rows.filter(r => r.physicalPosition)).toHaveLength(3)
    expect(audit.rows.find(r => r.position === 'Recapeadas')!.ownPriceRowIsValidPhysicalLifecycle).toBe('UNRESOLVED_RETREAD_POSITION_OR_LIFECYCLE')
    expect(audit.benchmarkMethod.positiveStandaloneRetreadRow).toBe('REQUIRES_EXPLICIT_POSITION_OR_LIFECYCLE')
    expect(audit.sourceSha256).toBe(report.completeCatalog.sourceFiles.find(s => s.file === audit.sourceFile)!.sha256)
    expect(audit.calibrated).toBe(false)
    expect(audit.canonicalLifecycleBridgeComplete).toBe(false)
    expect(audit.adoptedValues).toBe(0)
    expect(auditTireFormulaBindings()).toEqual(audit)
  })
})
