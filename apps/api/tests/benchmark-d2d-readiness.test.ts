import { describe, expect, it, vi } from 'vitest'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { PARAMETER_DEFINITIONS } from '../src/data/parameter-catalog.js'
import * as d2d from '../src/modules/engine/benchmark-d2d.js'
import { benchmarkRateRequirements } from '../src/modules/engine/benchmark-rates.js'
import { reviewBenchmarkD2DReadiness } from '../src/modules/engine/benchmark-d2d-readiness.js'
import { prepareD2DReadinessCase } from '../scripts/prepare-d2d-readiness-case.js'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'

const manifest = JSON.parse(readLocalDocument('docs/research/B2_D2D_READINESS_CASE_2026-09-30.json'))
const publicCase = () => prepareD2DReadinessCase(manifest, readLocalDocument)

// Only a computational fixture: no amounts, defaults or identities flow to the public case.
function syntheticCompleteCase() {
  const datum = (value: number, unit: string) => ({ value, unit, evidenceIds: ['synthetic'], derivation: 'Synthetic test only; not public evidence' })
  const leg = (country: 'MX' | 'US') => {
    const needed = new Set(Object.values(benchmarkRateRequirements(country, true)).flat())
    return { parameters: { country, serviceDate: '2026-09-30', baseRevision: `SYNTHETIC-${country}`, assetCostScope: 'TRACTOR_ONLY',
      parameters: PARAMETER_DEFINITIONS.filter(p => needed.has(p.key)).map(p => ({ key: p.key,
        value: p.field === 'Qty Recapeadas' ? 0 : p.defaultValue, unit: p.unit,
        evidenceIds: ['synthetic'], derivation: 'Synthetic installed positions; no additive retread row' })),
      evidence: [{ id: 'synthetic', url: 'https://example.org/synthetic', locator: 'Test fixture', country,
        equipment: 'TRACTOR_DRY_VAN_SINGLE', observedAt: '2026-09-01', validFrom: '2026-09-01',
        validUntil: '2026-09-30', limitations: 'Not researched or adopted' }] },
      trip: { loadedKm: datum(100, 'km'), emptyKm: datum(20, 'km'), cycleDays: datum(1, 'days'), tollsUsd: datum(0, 'USD') } }
  }
  const mx = leg('MX'), us = leg('US')
  return { model: 'FCM_D2D_READINESS_V1', caseReference: 'SYNTHETIC_NOT_PUBLIC_CASE', direction: 'MX_TO_US',
    serviceDate: '2026-09-30', route: { mxEndpoint: 'Synthetic MX endpoint', mxGateway: 'Synthetic MX gateway',
      usGateway: 'Synthetic US gateway', usEndpoint: 'Synthetic US endpoint' },
    allocationRationale: 'Synthetic tractor-only legs and one physical trailer cycle', mx, us,
    sharedTrailer: { assetReference: 'SYNTHETIC_TRAILER', scopeDeclaration: 'LEG_INPUTS_EXCLUDE_ALL_TRAILER_COSTS',
      allocationEvidence: 'Synthetic only', allocationEvidenceIds: ['synthetic'],
      costAgreement: { tenure: 'OWNED', fixedCostBasis: 'DEPRECIATION_AND_FINANCING', includedInMonthlyFixed: [],
        derivation: 'Synthetic only', evidenceIds: ['synthetic'] }, monthlyFixedUsd: datum(1000, 'USD/trailer-month'),
      productiveKmPerMonth: datum(10000, 'km/trailer-month'), productiveDaysPerMonth: datum(20, 'days/trailer-month'),
      maintenanceUsdPerKm: datum(0.1, 'USD/km'), tiresUsdPerKm: datum(0.05, 'USD/km'),
      totalKm: datum(240, 'km'), cycleDays: datum(2, 'days'), evidence: mx.parameters.evidence },
    borderCharges: [{ id: 'synthetic-bundle', covers: ['CROSSING', 'INTERCHANGE'], amountUsd: 100,
      provider: 'Synthetic', derivation: 'Test bundle only', sourceUrl: 'https://example.org/synthetic', locator: 'Fixture',
      observedAt: '2026-09-01', validFrom: '2026-09-01', validUntil: '2026-09-30' }] }
}

describe('D2D public dossier to existing compositor readiness boundary', () => {
  it('binds the user-confirmed corridor without inventing geometry, trip or rates', () => {
    const report = publicCase()
    expect(report.readiness.lineage.route).toEqual({ mxEndpoint: 'Mexico, DF', mxGateway: 'Nuevo Laredo',
      usGateway: 'Laredo', usEndpoint: 'Fort Smith, AR 72916' })
    expect(report.routeSelectionSource).toBe('USER_CONFIRMED_CORRIDOR_NOT_CALCULATED_ITINERARY')
    expect(report.decision.requiresRouteChoice).toBe(false)
    expect(report.decision.itineraryValidated).toBe(false)
    expect(report.decision.namedCorridorConfirmed).toBe(true)
    expect(report.decision.requiresBridgeSelection).toBe(true)
    expect(report.decision.requiresDetailedItinerary).toBe(true)
    expect(report.readiness.lineage.serviceDate).toBeNull()
    for (const leg of [report.readiness.lineage.mx, report.readiness.lineage.us]) {
      expect(leg.parameters).toBeNull()
      expect(Object.values(leg.trip)).toEqual([null, null, null, null])
    }
    expect(report.readiness.issuesByStage.route).toEqual([])
  })
  it('does not invoke the compositor, import defaults or emit a monetary total for the real draft', () => {
    const spy = vi.spyOn(d2d, 'calculateBenchmarkD2D')
    try {
      const report = publicCase()
      expect(spy).not.toHaveBeenCalled()
      expect(report.readiness.status).toBe('INCOMPLETE')
      expect(report.readiness.compositorInvoked).toBe(false)
      expect(report.readiness.costs).toBeNull()
      expect(report.readiness.compositor).toBeNull()
      expect(report.bindings.every(b => !b.canonicalParametersCreated && b.activeBaseRevision === null)).toBe(true)
      expect(report.decision.businessGatesClosed).toBe(0)
      expect(report.decision.economicCaseComplete).toBe(false)
      expect(report.decision.businessPersisted).toBe(false)
    } finally { spy.mockRestore() }
  })
  it('exposes blockers per MX/US, border, trailer and case with canonical rate requirements', () => {
    const report = publicCase()
    expect(report.readiness.issuesByStage.mx).toHaveLength(13)
    expect(report.readiness.issuesByStage.us).toHaveLength(13)
    expect(report.readiness.issuesByStage.sharedTrailer).toHaveLength(11)
    expect(report.readiness.issuesByStage.borderCharges).toHaveLength(2)
    expect(report.readiness.issuesByStage.case).toHaveLength(2)
    for (const national of report.readiness.nationalRequirements) {
      expect(national.requirements).toEqual(benchmarkRateRequirements(national.country as 'MX' | 'US', true))
      expect(national.assetCostScope).toBe('TRACTOR_ONLY')
      expect(Object.keys(national.requirements)).toHaveLength(9)
    }
    expect(report.referenceSourceCount).toBe(17)
    expect(report.additionalEconomicConditions).toHaveLength(7)
    expect(report.additionalEconomicConditions.find(item => item.id === 'TRIP_BORDER')!.needs).toContain('user-confirmed')
    expect(report.bindings.every(b => b.compatibility === 'NO_IMPLICIT_COMPOSITE_TO_TRACTOR_ONLY_CONVERSION')).toBe(true)
  })
  it('reverses travel order but never swaps national profiles or parameters', () => {
    const reversed = prepareD2DReadinessCase({ ...manifest, direction: 'US_TO_MX' }, readLocalDocument)
    expect(reversed.readiness.travelOrder).toEqual(['us', 'border', 'mx'])
    expect(reversed.bindings.map(b => b.country)).toEqual(['MX', 'US'])
    expect(reversed.readiness.lineage.route).toEqual(manifest.route)
  })
  it.each(['costs', 'quoteReady', 'productionReady', 'adoptedValues'])('rejects injected result or readiness flag %s', field => {
    expect(() => reviewBenchmarkD2DReadiness({ ...publicCase().readiness.lineage, [field]: 1 })).toThrow()
    expect(() => prepareD2DReadinessCase({ ...manifest, [field]: 1 }, readLocalDocument)).toThrow()
  })
  it('rejects changed consolidation, mismatched HEAD and future source cut', () => {
    expect(() => prepareD2DReadinessCase(manifest, file => readLocalDocument(file) +
      (file === manifest.consolidation.file ? '\n' : ''))).toThrow('CONSOLIDATION_HASH_MISMATCH')
    expect(() => prepareD2DReadinessCase({ ...manifest, baseHead: '0'.repeat(40) }, readLocalDocument)).toThrow('BASE_HEAD_MISMATCH')
    expect(() => prepareD2DReadinessCase({ ...manifest, cutDate: '2026-09-29' }, readLocalDocument)).toThrow('SOURCE_DATE_AFTER_CUT')
  })
  it('rejects path changes or false route-selection provenance', () => {
    expect(() => prepareD2DReadinessCase({ ...manifest, consolidation: { ...manifest.consolidation,
      file: 'apps/api/package.json' } }, readLocalDocument)).toThrow()
    expect(() => prepareD2DReadinessCase({ ...manifest, routeSelectionSource: 'VERIFIED_ITINERARY' }, readLocalDocument)).toThrow()
    expect(() => prepareD2DReadinessCase({ ...manifest, route: null }, readLocalDocument)).toThrow()
  })
  it('calls the original compositor on complete synthetic inputs, not a duplicated price model', () => {
    const input = syntheticCompleteCase()
    const { caseReference: _case, model: _model, ...rest } = input
    const expected = d2d.calculateBenchmarkD2D({ ...rest, model: 'FCM_CARRIER_BENCHMARK_D2D_V1', assetAllocation: 'SHARED_TRAILER' })
    const spy = vi.spyOn(d2d, 'calculateBenchmarkD2D')
    try {
      const result = reviewBenchmarkD2DReadiness(input)
      expect(spy).toHaveBeenCalledTimes(1)
      expect(result.compositorInvoked).toBe(true)
      expect(result.status).toBe('BENCHMARK_ESTIMATE')
      expect(result.costs).toEqual(expected.costs)
      expect(result.compositor!.sharedTrailer!.costs).toEqual(expected.sharedTrailer!.costs)
      expect(result.calibrated).toBe(false)
      expect(result.quoteReady).toBe(false)
      expect(result.productionReady).toBe(false)
      expect(result.purchaseCostUsd).toBeNull(); expect(result.sellPriceUsd).toBeNull()
    } finally { spy.mockRestore() }
  })
  it.each(['country', 'date', 'assetScope', 'missingParameter', 'trip'] as const)('prevents invalid envelopes from reaching the compositor: %s', kind => {
    const input = syntheticCompleteCase()
    if (kind === 'country') input.mx.parameters.country = 'US'
    if (kind === 'date') input.us.parameters.serviceDate = '2026-09-29'
    if (kind === 'assetScope') input.mx.parameters.assetCostScope = 'TRACTOR_AND_TRAILER'
    if (kind === 'missingParameter') input.mx.parameters.parameters.pop()
    const raw = kind === 'trip' ? { ...input, us: { ...input.us, trip: { ...input.us.trip, emptyKm: null } } } : input
    const result = reviewBenchmarkD2DReadiness(raw)
    expect(result.status).toBe('INCOMPLETE')
    expect(result.compositorInvoked).toBe(false)
    expect(result.costs).toBeNull()
    expect(result.issues.length).toBeGreaterThan(0)
  })
  it.each(['borderMissing', 'borderDuplicate', 'borderExpired', 'unit', 'evidence', 'trailerTooShort', 'trailerInput'] as const)('retains original compositor validation and null total: %s', kind => {
    const input = syntheticCompleteCase()
    if (kind === 'borderMissing') input.borderCharges = []
    if (kind === 'borderDuplicate') input.borderCharges.push({ ...input.borderCharges[0], id: 'duplicate-coverage' })
    if (kind === 'borderExpired') input.borderCharges[0].validUntil = '2026-09-29'
    if (kind === 'unit') input.mx.parameters.parameters[0].unit = 'INVALID_UNIT'
    if (kind === 'evidence') input.us.parameters.evidence[0].validUntil = '2026-09-29'
    if (kind === 'trailerTooShort') input.sharedTrailer.totalKm.value = 1
    const raw = kind === 'trailerInput' ? { ...input, sharedTrailer: { ...input.sharedTrailer, monthlyFixedUsd: null } } : input
    const result = reviewBenchmarkD2DReadiness(raw)
    expect(result.compositorInvoked).toBe(true)
    expect(result.status).toBe('INCOMPLETE')
    expect(result.costs).toBeNull()
    if (kind.startsWith('border')) expect(result.issuesByStage.borderCharges.length).toBeGreaterThan(0)
  })
  it('keeps a documented zero distinct from a missing border amount or toll', () => {
    const input = syntheticCompleteCase(); input.borderCharges[0].amountUsd = 0
    expect(reviewBenchmarkD2DReadiness(input).costs!.borderServicesUsd).toBe(0)
    const withoutToll = { ...input, mx: { ...input.mx, trip: { ...input.mx.trip, tollsUsd: null } } }
    expect(reviewBenchmarkD2DReadiness(withoutToll).costs).toBeNull()
    expect(() => reviewBenchmarkD2DReadiness({ ...input, borderCharges: [{ ...input.borderCharges[0], amountUsd: null }] })).toThrow()
  })
  it('does not fill missing endpoints with placeholders or infer a service date from cut date', () => {
    const result = reviewBenchmarkD2DReadiness({ ...publicCase().readiness.lineage, route: null })
    expect(result.issuesByStage.route).toHaveLength(4)
    expect(result.lineage.route).toBeNull()
    expect(result.lineage.serviceDate).toBeNull()
    expect(() => reviewBenchmarkD2DReadiness({ ...result.lineage, serviceDate: '2026-02-30' })).toThrow()
  })
  it('runs the hermetic CLI without trusting either inherited database selector', () => {
    const root = fileURLToPath(new URL('../../../', import.meta.url))
    const child = spawnSync(process.execPath, [
      fileURLToPath(new URL('../../../node_modules/tsx/dist/cli.mjs', import.meta.url)),
      fileURLToPath(new URL('../scripts/run-d2d-readiness-case.ts', import.meta.url)),
      fileURLToPath(new URL('../../../docs/research/B2_D2D_READINESS_CASE_2026-09-30.json', import.meta.url)),
    ], { cwd: root, encoding: 'utf8', timeout: 10000,
      env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: 'invalid-database-canary',
        STAGING_DATABASE_URL: 'invalid-staging-canary', VERCEL: '1', VERCEL_ENV: 'preview' } })
    expect(child.error).toBeUndefined()
    expect(child.status).toBe(2)
    const report = JSON.parse(child.stdout)
    expect(report.readiness.status).toBe('INCOMPLETE')
    expect(report.readiness.compositorInvoked).toBe(false)
    expect(report.readiness.costs).toBeNull()
    expect(child.stdout).not.toContain('DATABASE_URL')
    expect(child.stdout).not.toContain('never_connect')
  })
})
