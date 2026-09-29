import { calculateOwnedD2DScenarios } from '../src/modules/engine/benchmark-owned-d2d'
import { benchmarkRateRequirements } from '../src/modules/engine/benchmark-rates'
import { PARAMETER_DEFINITIONS } from '../src/data/parameter-catalog'

// QA only: real calculator, synthetic inputs; never used by a product route.
const datum = (value: number, unit: string) => ({ value, unit, evidenceIds: ['test'], derivation: 'QA sintética, no adoptar' })
const evidence = (country: 'MX' | 'US') => [{ id: 'test', url: 'https://example.org/qa', locator: 'Fixture sintético', country,
  equipment: 'TRACTOR_DRY_VAN_SINGLE', observedAt: '2026-09-01', validFrom: '2026-09-01', validUntil: '2026-09-30', limitations: 'Sin evidencia económica' }]
const leg = (country: 'MX' | 'US') => {
  const needed = new Set(Object.values(benchmarkRateRequirements(country, true)).flat())
  return { parameters: { country, assetCostScope: 'TRACTOR_ONLY', serviceDate: '2026-09-29', baseRevision: 'QA', evidence: evidence(country),
    parameters: PARAMETER_DEFINITIONS.filter(p => needed.has(p.key)).map(p => ({ key: p.key, ...datum(p.defaultValue, p.unit) })) },
    trip: { loadedKm: datum(100, 'km'), emptyKm: datum(20, 'km'), cycleDays: datum(1, 'days'), tollsUsd: datum(0, 'USD') } }
}
const input = {
  route: { model: 'FCM_CARRIER_BENCHMARK_D2D_V1', direction: 'MX_TO_US', serviceDate: '2026-09-29', assetAllocation: 'SHARED_TRAILER', allocationRationale: 'QA',
    route: { mxEndpoint: 'QA MX', mxGateway: 'QA frontera MX', usGateway: 'QA frontera US', usEndpoint: 'QA US' }, mx: leg('MX'), us: leg('US'),
    borderCharges: [{ id: 'QA', covers: ['CROSSING', 'INTERCHANGE'], amountUsd: 150, provider: 'QA', derivation: 'QA', sourceUrl: 'https://example.org/qa', locator: 'QA', observedAt: '2026-09-01', validFrom: '2026-09-01', validUntil: '2026-09-30' }] },
  fixed: { capital: { assetReference: 'QA-TRAILER', condition: 'NEW', country: 'MX', serviceDate: '2026-09-29', acquisitionCost: datum(40000, 'USD'), evidence: evidence('MX'),
    scenarios: [120, 144].map((months, i) => ({ id: `QA-${i + 1}`, horizonBasis: 'FROM_NEW', horizon: datum(months, 'months'), residual: datum(10000, 'USD'), applicabilityRationale: 'QA' })) },
    allocation: 'TRAILER_ONLY_EXCLUDES_TRACTOR_AND_VARIABLE_COSTS', allocationRationale: 'QA', allocationEvidenceIds: ['test'], evidence: evidence('MX'),
    financing: [1, 2].map(i => ({ scenarioId: `QA-${i}`, basis: 'INTEREST_ONLY_MONTHLY_AVERAGE', interest: datum(50, 'USD/trailer-month') })),
    expenses: ['INSURANCE', 'PERMITS', 'OVERHEAD'].map(concept => ({ concept, amount: datum(10, 'USD/trailer-month') })) },
  trailer: { assetReference: 'QA-TRAILER', scopeDeclaration: 'LEG_INPUTS_EXCLUDE_ALL_TRAILER_COSTS', allocationEvidence: 'QA', allocationEvidenceIds: ['test'], evidence: evidence('MX'),
    productiveKmPerMonth: datum(10000, 'km/trailer-month'), productiveDaysPerMonth: datum(20, 'days/trailer-month'), totalKm: datum(240, 'km'), cycleDays: datum(2, 'days'), maintenanceUsdPerKm: datum(0.1, 'USD/km'), tiresUsdPerKm: datum(0.05, 'USD/km') },
}
import { parseReview } from '../../web/app/(app)/scenarios/benchmark/review-contract'
console.log(JSON.stringify(parseReview(JSON.stringify(calculateOwnedD2DScenarios(input)))))
