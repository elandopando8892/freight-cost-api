import { describe, expect, it } from 'vitest'
import { PARAMETER_DEFINITIONS } from '../src/data/parameter-catalog.js'
import { benchmarkRateRequirements } from '../src/modules/engine/benchmark-rates.js'
import { calculateBenchmarkD2D } from '../src/modules/engine/benchmark-d2d.js'
import { calculateOwnedD2DScenarios } from '../src/modules/engine/benchmark-owned-d2d.js'

// Synthetic arithmetic fixtures, not adopted benchmark data.
function fixture() {
  const leg = (country: 'MX' | 'US') => {
    const needed = new Set(Object.values(benchmarkRateRequirements(country)).flat())
    const datum = (value: number, unit: string) => ({ value, unit, evidenceIds: ['test'], derivation: 'Synthetic' })
    return {
      parameters: { country, serviceDate: '2026-09-29', baseRevision: `TEST-${country}`,
        parameters: PARAMETER_DEFINITIONS.filter(p => needed.has(p.key)).map(p => ({
          key: p.key, value: p.field === 'Qty Recapeadas' ? 0 : p.defaultValue, unit: p.unit,
          evidenceIds: ['test'], derivation: 'Synthetic installed positions; no additive retread row' })),
        evidence: [{ id: 'test', url: 'https://example.org/test', locator: 'Fixture', country,
          equipment: 'TRACTOR_DRY_VAN_SINGLE', observedAt: '2026-09-01', validFrom: '2026-09-01', validUntil: '2026-09-30', limitations: 'Not economic evidence' }] },
      trip: { loadedKm: datum(100, 'km'), emptyKm: datum(20, 'km'), cycleDays: datum(1, 'days'), tollsUsd: datum(0, 'USD') },
    }
  }
  return {
    model: 'FCM_CARRIER_BENCHMARK_D2D_V1', direction: 'MX_TO_US', serviceDate: '2026-09-29',
    assetAllocation: 'SEPARATE_TRACTOR_TRAILER_PER_LEG', allocationRationale: 'Synthetic separate fleets',
    route: { mxEndpoint: 'Test origin', mxGateway: 'Test MX gateway', usGateway: 'Test US gateway', usEndpoint: 'Test destination' },
    mx: leg('MX'), us: leg('US'),
    borderCharges: [{ id: 'bundle', covers: ['CROSSING', 'INTERCHANGE'], amountUsd: 150.25,
      provider: 'Synthetic', derivation: 'One bundle counted once', sourceUrl: 'https://example.org/test', locator: 'Fixture',
      observedAt: '2026-09-01', validFrom: '2026-09-01', validUntil: '2026-09-30' }],
  }
}

describe('D2D benchmark assembly', () => {
  it('counts a crossing/interchange bundle exactly once, preserves lineage and reconciles cents', () => {
    const result = calculateBenchmarkD2D(fixture())
    expect(result.status).toBe('BENCHMARK_ESTIMATE')
    const mx = result.legs.mx.leg!.costs!; const us = result.legs.us.leg!.costs!
    const expectedCents = Math.round(mx.productionCostUsd * 100) + Math.round(us.productionCostUsd * 100) + 15025
    expect(result.costs!.productionCostUsd).toBe(expectedCents / 100)
    expect(result.costs!.borderServicesUsd).toBe(150.25)
    expect(result.legs.mx.parameterLineage.lineage.baseRevision).toBe('TEST-MX')
    expect(result.purchaseCostUsd).toBeNull(); expect(result.sellPriceUsd).toBeNull(); expect(result.calibrated).toBe(false)
  })
  it('supports reverse direction without swapping national economic inputs', () => {
    const input = fixture(); input.direction = 'US_TO_MX'
    const result = calculateBenchmarkD2D(input)
    expect(result.travelOrder).toEqual(['us', 'border', 'mx'])
    expect(result.legs.us.parameterLineage.country).toBe('US')
  })
  it.each(['mx', 'us'] as const)('propagates the %s tire-method gap instead of emitting D2D totals', leg => {
    const input = fixture()
    input[leg].parameters.parameters.find(p => p.key === 'fcm.v3.cost-tires.qty-recapeadas')!.value = 8
    const result = calculateBenchmarkD2D(input)
    expect(result.status).toBe('INCOMPLETE')
    expect(result.costs).toBeNull()
    expect(result.issues).toContainEqual({ field: `${leg}.COST_TIRES__Qty Recapeadas`, code: 'RETREAD_POSITION_OR_LIFECYCLE_REQUIRED' })
    expect(result.legs[leg].leg).toBeNull()
  })
  it.each(['duplicate-coverage', 'duplicate-id', 'missing', 'expired', 'country', 'date', 'parameter', 'trip'] as const)('blocks %s', failure => {
    const input = fixture()
    if (failure === 'duplicate-coverage') input.borderCharges.push({ ...input.borderCharges[0], id: 'second' })
    if (failure === 'duplicate-id') {
      input.borderCharges[0].covers = ['CROSSING']; input.borderCharges.push({ ...input.borderCharges[0], covers: ['INTERCHANGE'] })
    }
    if (failure === 'missing') input.borderCharges = []
    if (failure === 'expired') input.borderCharges[0].validUntil = '2026-09-28'
    if (failure === 'country') input.mx.parameters.country = 'US'
    if (failure === 'date') input.us.parameters.serviceDate = '2026-09-28'
    if (failure === 'parameter') input.mx.parameters.parameters = []
    const result = calculateBenchmarkD2D(failure === 'trip' ? { ...input, us: { ...input.us, trip: { ...input.us.trip, tollsUsd: null } } } : input)
    expect(result.status).toBe('INCOMPLETE'); expect(result.costs).toBeNull(); expect(result.issues.length).toBeGreaterThan(0)
  })
  it('accepts documented zero services but rejects unsupported allocation and injected totals', () => {
    const input = fixture(); input.borderCharges[0].amountUsd = 0
    expect(calculateBenchmarkD2D(input).costs!.borderServicesUsd).toBe(0)
    expect(calculateBenchmarkD2D({ ...input, assetAllocation: 'SHARED_TRAILER' }).status).toBe('INCOMPLETE')
    expect(() => calculateBenchmarkD2D({ ...input, productionCostUsd: 1 })).toThrow()
  })
})

function sharedFixture() {
  const input = fixture()
  const datum = (value: number, unit: string) => ({ value, unit, evidenceIds: ['test'], derivation: 'Synthetic only' })
  return { ...input, assetAllocation: 'SHARED_TRAILER',
    mx: { ...input.mx, parameters: { ...input.mx.parameters, assetCostScope: 'TRACTOR_ONLY' } },
    us: { ...input.us, parameters: { ...input.us.parameters, assetCostScope: 'TRACTOR_ONLY' } },
    sharedTrailer: { assetReference: 'SYNTHETIC-TRAILER', scopeDeclaration: 'LEG_INPUTS_EXCLUDE_ALL_TRAILER_COSTS',
      allocationEvidence: 'Synthetic tractor-only allocation, not verified operational evidence',
      allocationEvidenceIds: ['test'],
      costAgreement: { tenure: 'OWNED', fixedCostBasis: 'DEPRECIATION_AND_FINANCING',
        includedInMonthlyFixed: [] as string[], derivation: 'Synthetic owned asset cost, not rent', evidenceIds: ['test'] },
      monthlyFixedUsd: datum(1000, 'USD/trailer-month'), productiveKmPerMonth: datum(10000, 'km/trailer-month'),
      productiveDaysPerMonth: datum(20, 'days/trailer-month'), maintenanceUsdPerKm: datum(0.1, 'USD/km'),
      tiresUsdPerKm: datum(0.05, 'USD/km'), totalKm: datum(240, 'km'), cycleDays: datum(2, 'days'),
      evidence: input.mx.parameters.evidence },
  }
}

function ownedFixture() {
  const { sharedTrailer, ...route } = sharedFixture()
  const { monthlyFixedUsd, costAgreement, ...trailer } = sharedTrailer
  const datum = (value: number, unit: string) => ({ value, unit, evidenceIds: ['test'], derivation: 'Synthetic only' })
  const evidence = trailer.evidence.map(e => ({ ...e }))
  const fixed = { capital: { assetReference: trailer.assetReference, country: 'MX', condition: 'NEW',
    serviceDate: route.serviceDate, evidence, acquisitionCost: datum(40000, 'USD'),
    scenarios: [{ id: 'A', horizonBasis: 'FROM_NEW', horizon: datum(120, 'months'), residual: datum(10000, 'USD'), applicabilityRationale: 'Synthetic' }] },
    allocation: 'TRAILER_ONLY_EXCLUDES_TRACTOR_AND_VARIABLE_COSTS', allocationRationale: 'Synthetic', allocationEvidenceIds: ['test'], evidence,
    financing: [{ scenarioId: 'A', basis: 'INTEREST_ONLY_MONTHLY_AVERAGE', interest: datum(50, 'USD/trailer-month') }],
    expenses: ['INSURANCE', 'PERMITS', 'OVERHEAD'].map(concept => ({ concept, amount: datum(10, 'USD/trailer-month') })) }
  return { route, trailer, fixed }
}

describe('owned D2D scenario composition', () => {
  it('derives fixed cost and counts trailer CFU/CVU once, retaining namespaced evidence', () => {
    const result = calculateOwnedD2DScenarios(ownedFixture())
    expect(result.status).toBe('SCENARIO_ONLY')
    const d2d = result.scenarios![0].result
    expect(d2d.sharedTrailer!.costs).toMatchObject({ cfuUsd: 33, cvuUsd: 36, productionCostUsd: 69 })
    const cents = [d2d.legs.mx, d2d.legs.us].reduce((n, leg) => n + Math.round(leg.leg!.costs!.productionCostUsd * 100), 0)
    expect(d2d.costs!.productionCostUsd).toBe((cents + 6900 + 15025) / 100)
    expect(d2d.sharedTrailer!.lineage.monthlyFixedUsd!.value).toBe(330)
    expect(d2d.sharedTrailer!.lineage.monthlyFixedUsd!.evidenceIds).toEqual(['capital:test', 'fixed:test'])
    expect(result.calibrated).toBe(false); expect(result.sellPriceUsd).toBeNull()
  })
  it.each(['asset', 'date', 'expense', 'trip', 'border', 'days', 'country'] as const)('blocks %s', failure => {
    const input = ownedFixture()
    if (failure === 'asset') input.trailer.assetReference = 'OTHER'
    if (failure === 'date') input.fixed.capital.serviceDate = '2026-09-28'
    if (failure === 'expense') input.fixed.expenses.pop()
    if (failure === 'trip') input.trailer.totalKm.value = 1
    if (failure === 'border') input.route.borderCharges = []
    if (failure === 'days') input.trailer.productiveDaysPerMonth.value = 32
    if (failure === 'country') input.trailer.evidence = input.trailer.evidence.map(e => ({ ...e, country: 'US' }))
    expect(calculateOwnedD2DScenarios(input).scenarios).toBeNull()
  })
  it('rejects recaptured fixed and arbitrary totals', () => {
    const input = ownedFixture()
    expect(() => calculateOwnedD2DScenarios({ ...input, trailer: { ...input.trailer, monthlyFixedUsd: sharedFixture().sharedTrailer.monthlyFixedUsd } })).toThrow()
    expect(() => calculateOwnedD2DScenarios({ ...input, productionCostUsd: 1 })).toThrow()
  })
})

describe('shared trailer D2D', () => {
  it.each([[], ['MAINTENANCE'], ['TIRES'], ['MAINTENANCE', 'TIRES']] as string[][])('accounts for leased monthly inclusions %j once', (...concepts) => {
    const input = sharedFixture()
    input.sharedTrailer.costAgreement.tenure = 'LEASED'
    input.sharedTrailer.costAgreement.fixedCostBasis = 'LEASE_RENT'
    input.sharedTrailer.costAgreement.includedInMonthlyFixed = concepts
    if (concepts.includes('MAINTENANCE')) input.sharedTrailer.maintenanceUsdPerKm.value = 0
    if (concepts.includes('TIRES')) input.sharedTrailer.tiresUsdPerKm.value = 0
    const result = calculateBenchmarkD2D(input)
    expect(result.status).toBe('BENCHMARK_ESTIMATE')
    expect(result.sharedTrailer!.costs!.cfuUsd).toBe(100)
    expect(result.sharedTrailer!.costs!.cvuUsd).toBe((concepts.includes('MAINTENANCE') ? 0 : 24) + (concepts.includes('TIRES') ? 0 : 12))
  })
  it.each(['missing', 'basis', 'owned-package', 'duplicate', 'maintenance', 'tires', 'source'] as const)('blocks agreement defect %s', mode => {
    const input = sharedFixture()
    const agreement = input.sharedTrailer.costAgreement
    if (mode === 'basis') agreement.fixedCostBasis = 'LEASE_RENT'
    if (mode === 'owned-package') agreement.includedInMonthlyFixed = ['TIRES']
    if (mode === 'duplicate') agreement.includedInMonthlyFixed = ['TIRES', 'TIRES']
    if (mode === 'maintenance' || mode === 'tires') {
      agreement.tenure = 'LEASED'; agreement.fixedCostBasis = 'LEASE_RENT'
      agreement.includedInMonthlyFixed = [mode === 'maintenance' ? 'MAINTENANCE' : 'TIRES']
    }
    if (mode === 'source') agreement.evidenceIds = ['not-in-dossier']
    const { costAgreement, ...legacy } = input.sharedTrailer
    const result = calculateBenchmarkD2D(mode === 'missing' ? { ...input, sharedTrailer: legacy } : input)
    expect(result.costs).toBeNull()
    expect(result.status).toBe('INCOMPLETE')
    if (mode === 'maintenance' || mode === 'tires') expect(result.issues).toContainEqual({
      field: `sharedTrailer.${mode === 'maintenance' ? 'maintenanceUsdPerKm' : 'tiresUsdPerKm'}`,
      code: 'COST_ALREADY_INCLUDED_IN_MONTHLY_FIXED',
    })
  })
  it.each(['monthlyFixedUsd', 'productiveKmPerMonth', 'productiveDaysPerMonth', 'maintenanceUsdPerKm', 'tiresUsdPerKm', 'totalKm', 'cycleDays'] as const)('requires explicit references for %s even when its dossier exists', field => {
    const input = sharedFixture()
    input.sharedTrailer[field].evidenceIds = []
    const result = calculateBenchmarkD2D(input)
    expect(result.costs).toBeNull()
    expect(result.issues).toContainEqual({ field: `sharedTrailer.${field}`, code: 'MISSING_EVIDENCE_REFERENCE' })
  })
  it.each(['missing-allocation', 'unknown-allocation', 'duplicate-allocation', 'unknown-input', 'duplicate-input'] as const)('blocks reference defect %s', mode => {
    const input = sharedFixture()
    if (mode === 'missing-allocation') input.sharedTrailer.allocationEvidenceIds = []
    if (mode === 'unknown-allocation') input.sharedTrailer.allocationEvidenceIds = ['other']
    if (mode === 'duplicate-allocation') input.sharedTrailer.allocationEvidenceIds = ['test', 'test']
    if (mode === 'unknown-input') input.sharedTrailer.monthlyFixedUsd.evidenceIds = ['other']
    if (mode === 'duplicate-input') input.sharedTrailer.monthlyFixedUsd.evidenceIds = ['test', 'test']
    const result = calculateBenchmarkD2D(input)
    expect(result.status).toBe('INCOMPLETE')
    expect(result.costs).toBeNull()
    expect(result.sharedTrailer!.calibrated).toBe(false)
  })
  it('reports legacy missing references as incomplete rather than inventing a link', () => {
    const input = sharedFixture()
    const { evidenceIds, ...legacyValue } = input.sharedTrailer.monthlyFixedUsd
    const { allocationEvidenceIds, ...legacyTrailer } = input.sharedTrailer
    const result = calculateBenchmarkD2D({ ...input, sharedTrailer: { ...legacyTrailer, monthlyFixedUsd: legacyValue } })
    expect(result.costs).toBeNull()
    expect(result.sharedTrailer!.evidenceCoverage.monthlyFixedUsd).toEqual([])
    expect(result.sharedTrailer!.evidenceCoverage.allocationEvidence).toEqual([])
  })
  it('preserves individual source mappings without claiming source validation', () => {
    const input = sharedFixture()
    input.sharedTrailer.evidence = [...input.sharedTrailer.evidence, { ...input.sharedTrailer.evidence[0], id: 'tires-source' }]
    input.sharedTrailer.tiresUsdPerKm.evidenceIds = ['tires-source']
    const result = calculateBenchmarkD2D(input)
    expect(result.status).toBe('BENCHMARK_ESTIMATE')
    expect(result.sharedTrailer!.evidenceCoverage.tiresUsdPerKm).toEqual(['tires-source'])
    expect(result.sharedTrailer!.evidenceCoverage.allocationEvidence).toEqual(['test'])
    expect(Object.keys(result.sharedTrailer!.evidenceCoverage)).toHaveLength(9)
    expect(result.sharedTrailer!.sourceStatus).toBe('DOCUMENTED_UNVERIFIED')
  })
  it('allocates trailer fixed, maintenance and tires once and reconciles to cents', () => {
    const result = calculateBenchmarkD2D(sharedFixture())
    expect(result.status).toBe('BENCHMARK_ESTIMATE')
    expect(result.sharedTrailer!.costs).toMatchObject({ cfuUsd: 100, cvuUsd: 36, productionCostUsd: 136 })
    const legCents = [result.legs.mx, result.legs.us].reduce((n, leg) => n + Math.round(leg.leg!.costs!.productionCostUsd * 100), 0)
    expect(result.costs!.productionCostUsd).toBe((legCents + 13600 + 15025) / 100)
    expect(result.calibrated).toBe(false)
    expect(result.sourceStatus).toBe('DOCUMENTED_UNVERIFIED')
    expect(result.purchaseCostUsd).toBeNull()
  })
  it.each(['scope', 'allocation', 'distance', 'time', 'expired', 'duplicate', 'overflow', 'missing'] as const)('blocks %s', mode => {
    const input = sharedFixture()
    if (mode === 'scope') input.mx.parameters.assetCostScope = 'TRACTOR_AND_TRAILER'
    if (mode === 'allocation') input.assetAllocation = 'SEPARATE_TRACTOR_TRAILER_PER_LEG'
    if (mode === 'distance') input.sharedTrailer.totalKm.value = 199
    if (mode === 'time') input.sharedTrailer.cycleDays.value = 1
    if (mode === 'expired') input.sharedTrailer.evidence[0].validUntil = '2026-09-28'
    if (mode === 'duplicate') input.sharedTrailer.evidence.push({ ...input.sharedTrailer.evidence[0] })
    if (mode === 'overflow') input.sharedTrailer.monthlyFixedUsd.value = 1e308
    const result = calculateBenchmarkD2D(mode === 'missing' ? { ...input, sharedTrailer: { ...input.sharedTrailer, tiresUsdPerKm: null } } : input)
    expect(result.status).toBe('INCOMPLETE')
    expect(result.costs).toBeNull()
  })
  it('accepts documented zero variable costs but rejects incorrect units', () => {
    const input = sharedFixture()
    input.sharedTrailer.maintenanceUsdPerKm.value = 0
    input.sharedTrailer.tiresUsdPerKm.value = 0
    expect(calculateBenchmarkD2D(input).sharedTrailer!.costs!.cvuUsd).toBe(0)
    input.sharedTrailer.totalKm.unit = 'miles'
    expect(() => calculateBenchmarkD2D(input)).toThrow()
  })
})

// Computational research only: these durations are not the DF/Fort Smith benchmark.
const attachmentFixture = () => {
  const days = (value:number) => ({value,unit:'days',evidenceIds:['test'],derivation:'Synthetic serial phase, not operating evidence'})
  return { model:'FCM_SERIAL_TRAILER_ATTACHMENT_V1',timeBasis:'COMPATIBLE_ELAPSED_DAYS_NOT_DRIVING_HOURS',
    scope:'SERIAL_PHASES_NO_OVERLAP_OR_DUPLICATED_BORDER_WAIT',mxTractorReference:'QA-MX-TRACTOR',usTractorReference:'QA-US-TRACTOR',
    mxAttachedDays:days(0.5),borderDetachedDays:days(0.25),usAttachedDays:days(0.5),
    evidenceIds:['test'],derivation:'Synthetic two tractors, one box. Corporate identity does not establish this allocation.' }
}

describe('research-only binational trailer exposure', () => {
  it('does not force the box to follow detached tractor returns or their empty kilometres', () => {
    const input = sharedFixture()
    input.mx.trip.cycleDays.value = 2; input.us.trip.cycleDays.value = 3
    input.sharedTrailer.cycleDays.value = 1.5; input.sharedTrailer.totalKm.value = 200
    const before = calculateBenchmarkD2D(input)
    expect(before.costs).toBeNull()
    expect(before.issues).toContainEqual({field:'sharedTrailer.cycleDays',code:'TRAILER_TIME_BELOW_LEG_CYCLES'})
    const after = calculateBenchmarkD2D(input,attachmentFixture())
    expect(after.status).toBe('BENCHMARK_ESTIMATE')
    expect(after.legs).toEqual(before.legs)
    expect(after.sharedTrailer!.costs).toMatchObject({cfuByTimeUsd:75,cfuUsd:75,cvuUsd:30,productionCostUsd:105})
    expect(after.trailerAttachment).toMatchObject({minimumTrailerDays:1.25,calibrated:false,assumptionsVerified:false})
    const cents = [after.legs.mx.leg!.costs!.productionCostUsd,after.legs.us.leg!.costs!.productionCostUsd,105,150.25]
      .reduce((sum,value) => sum + Math.round(value*100),0)
    expect(after.costs!.productionCostUsd).toBe(cents/100)
    expect(after.purchaseCostUsd).toBeNull(); expect(after.sellPriceUsd).toBeNull(); expect(after.calibrated).toBe(false)
  })
  it('preserves old outputs and accepts serial phases in either travel direction', () => {
    const input = sharedFixture()
    expect(calculateBenchmarkD2D(input,undefined)).toEqual(calculateBenchmarkD2D(input))
    const forward = calculateBenchmarkD2D(input,attachmentFixture())
    const backward = calculateBenchmarkD2D({...input,direction:'US_TO_MX'},attachmentFixture())
    expect(backward.costs).toEqual(forward.costs)
    expect(backward.travelOrder).toEqual(['us','border','mx'])
    expect(forward.trailerAttachment!.evidenceCoverage.mxAttachedDays).toEqual(['test'])
  })
  it.each(['one-tractor','tractor-is-trailer','mx-time','us-time','box-time','unknown-reference','duplicate-reference','expired','no-shared-box'] as const)
    ('fails closed for incompatible exposure: %s', kind => {
      const input = sharedFixture(), attachment = attachmentFixture()
      if (kind === 'one-tractor') attachment.usTractorReference = attachment.mxTractorReference
      if (kind === 'tractor-is-trailer') attachment.mxTractorReference = input.sharedTrailer.assetReference
      if (kind === 'mx-time') attachment.mxAttachedDays.value = 2
      if (kind === 'us-time') attachment.usAttachedDays.value = 2
      if (kind === 'box-time') input.sharedTrailer.cycleDays.value = 1
      if (kind === 'unknown-reference') attachment.borderDetachedDays.evidenceIds = ['unknown']
      if (kind === 'duplicate-reference') attachment.evidenceIds = ['test','test']
      if (kind === 'expired') input.sharedTrailer.evidence[0].validUntil = '2026-09-28'
      if (kind === 'no-shared-box') input.assetAllocation = 'SEPARATE_TRACTOR_TRAILER_PER_LEG'
      const result = calculateBenchmarkD2D(input,attachment)
      expect(result.status).toBe('INCOMPLETE'); expect(result.costs).toBeNull(); expect(result.issues.length).toBeGreaterThan(0)
      if (kind === 'one-tractor') expect(result.issues).toContainEqual({field:'trailerAttachment.tractorReferences',code:'ONE_TRACTOR_TWO_NATIONAL_BUDGETS_UNSUPPORTED'})
    })
  it('does not replace missing national cycles or accept zero loaded attachment time', () => {
    const input = sharedFixture(), attachment = attachmentFixture()
    expect(calculateBenchmarkD2D({...input,mx:{...input.mx,trip:{...input.mx.trip,cycleDays:null}}},attachment).costs).toBeNull()
    attachment.mxAttachedDays.value = 0
    expect(calculateBenchmarkD2D(input,attachment).issues).toContainEqual({field:'trailerAttachment.mxAttachedDays',code:'ZERO_LOADED_ATTACHMENT_TIME'})
  })
  it('requires an evidenced detached zero and rejects injected price, units and incomplete partitions', () => {
    const input = sharedFixture(), attachment = attachmentFixture()
    attachment.borderDetachedDays.value = 0
    expect(calculateBenchmarkD2D(input,attachment).status).toBe('BENCHMARK_ESTIMATE')
    expect(() => calculateBenchmarkD2D(input,{...attachment,borderDetachedDays:{...attachment.borderDetachedDays,evidenceIds:[]}})).toThrow()
    expect(() => calculateBenchmarkD2D(input,{...attachment,borderDetachedDays:{...attachment.borderDetachedDays,unit:'hours'}})).toThrow()
    expect(() => calculateBenchmarkD2D(input,{...attachment,mxAttachedDays:null})).toThrow()
    expect(() => calculateBenchmarkD2D(input,{...attachment,productionCostUsd:1})).toThrow()
    expect(() => calculateBenchmarkD2D(input,{...attachment,usAttachedDays:{...attachment.usAttachedDays,value:-1}})).toThrow()
    expect(() => calculateBenchmarkD2D(input,{...attachment,usAttachedDays:{...attachment.usAttachedDays,value:Infinity}})).toThrow()
  })
  it('keeps the optional research argument out of HTTP/form payload schemas', () => {
    const input = sharedFixture(), owned = ownedFixture(), attachment = attachmentFixture()
    expect(() => calculateBenchmarkD2D({...input,trailerAttachment:attachment})).toThrow()
    expect(() => calculateOwnedD2DScenarios({...owned,trailerAttachment:attachment})).toThrow()
    expect(() => calculateOwnedD2DScenarios({...owned,trailer:{...owned.trailer,trailerAttachment:attachment}})).toThrow()
  })
  it('preserves evidence namespacing in owned scenarios, without inventing a cost basis', () => {
    const input = ownedFixture()
    input.route.mx.trip.cycleDays.value = 2; input.route.us.trip.cycleDays.value = 3
    input.trailer.cycleDays.value = 1.5
    const result = calculateOwnedD2DScenarios(input,attachmentFixture())
    expect(result.status).toBe('SCENARIO_ONLY')
    const scenario = result.scenarios![0].result
    expect(scenario.trailerAttachment!.evidenceCoverage).toEqual({declaration:['trip:test'],
      mxAttachedDays:['trip:test'],borderDetachedDays:['trip:test'],usAttachedDays:['trip:test']})
    expect(scenario.sharedTrailer!.costs!.cfuUsd).toBe(24.75)
    expect(result.calibrated).toBe(false)
    const bad = attachmentFixture(); bad.evidenceIds = ['not-in-trip-dossier']
    expect(calculateOwnedD2DScenarios(input,bad).scenarios).toBeNull()
  })
})
