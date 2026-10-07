import type { calculateOwnedD2DScenarios } from './benchmark-owned-d2d.js'
import { PARAMETER_DEFINITIONS } from '../../data/parameter-catalog.js'

type Calculation = ReturnType<typeof calculateOwnedD2DScenarios>
type Datum = { value: number; unit: string; evidenceIds: string[]; derivation: string }
const definitions = new Map(PARAMETER_DEFINITIONS.map(p => [p.key, p]))
const row = (key: string, label: string, section: string, datum: Datum) => ({ key, label, section, ...datum, evidenceIds: [...new Set(datum.evidenceIds)] })

/** Read-only projection of recomputed results. No formulas, defaults, files or DB access. */
export function projectBenchmarkReview(result: Calculation) {
  // Tractors do not vary with trailer capital scenarios. Serialize their lineage once.
  const first = result.scenarios?.[0].result
  const sharedTractorResources = first ? (['mx', 'us'] as const).map(id => {
    const { parameterLineage: derived, leg } = first.legs[id]
    const needed = new Set(Object.values(derived.requirements).flat())
    return {
      id, scope: derived.lineage.assetCostScope, revision: derived.baseRevision,
      serviceDate: derived.lineage.serviceDate,
      inputs: derived.lineage.parameters.filter(p => needed.has(p.key)).map(p => {
        const definition = definitions.get(p.key)!
        return row(p.key, definition.field, definition.section, p)
      }),
      rates: Object.entries(derived.rates!).map(([key, datum]) => ({ key, ...datum!, inputKeys: derived.requirements[key] })),
      trip: Object.entries(leg!.lineage.trip).map(([key, datum]) => row(key, key, 'TRIP', datum!)),
      evidence: derived.lineage.evidence, costs: leg!.costs!,
    }
  }) : undefined
  return {
    policy: 'STATELESS_BENCHMARK_NO_ADOPTION', calculatedBy: 'SERVER',
    calibrated: result.calibrated, sourceStatus: result.sourceStatus,
    purchaseCostUsd: null, sellPriceUsd: null, status: result.status, issues: result.issues,
    ...(sharedTractorResources ? { sharedTractorResources } : {}),
    scenarios: result.scenarios?.map(s => {
      const trailer = s.result.sharedTrailer!
      const fixed = result.lineage.fixed
      const capital = fixed.capital.scenarios.find(c => c.id === s.id)!
      const financing = fixed.financing.find(f => f.scenarioId === s.id)!
      const scoped = (datum: Datum, scope: string) => ({ ...datum, evidenceIds: datum.evidenceIds.map(id => `${scope}:${id}`) })
      const capitalInputs = [
        row('acquisitionCost', 'Adquisición', 'CAPITAL_SCENARIO', scoped(fixed.capital.acquisitionCost, 'capital')),
        row('horizon', `Horizonte · ${capital.horizonBasis}`, 'CAPITAL_SCENARIO', scoped(capital.horizon, 'capital')),
        row('residual', 'Residual', 'CAPITAL_SCENARIO', scoped(capital.residual, 'capital')),
        row('interest', 'Interés mensual (no principal)', 'FIXED_SCENARIO', scoped(financing.interest, 'fixed')),
        ...fixed.expenses.map(e => row(e.concept, e.concept, 'FIXED_SCENARIO', scoped(e.amount, 'fixed'))),
      ]
      const rateKeys = ['monthlyFixedUsd', 'productiveKmPerMonth', 'productiveDaysPerMonth', 'maintenanceUsdPerKm', 'tiresUsdPerKm'] as const
      const trailerInputs = rateKeys.filter(key => key !== 'monthlyFixedUsd').map(key => row(key, key, 'TRAILER', trailer.lineage[key]!))
      const box = {
        id: 'trailer', scope: 'SHARED_TRAILER_ONCE', revision: trailer.lineage.assetReference,
        serviceDate: result.lineage.route.serviceDate,
        inputs: [...capitalInputs, ...trailerInputs],
        rates: rateKeys.map(key => ({ key, ...trailer.lineage[key]!, inputKeys: key === 'monthlyFixedUsd' ? capitalInputs.map(p => p.key) : [key] })),
        trip: (['totalKm', 'cycleDays'] as const).map(key => row(key, key, 'TRIP', trailer.lineage[key]!)),
        evidence: trailer.lineage.evidence, costs: trailer.costs!,
      }
      return { id: s.id, result: {
        calibrated: s.result.calibrated, costs: s.result.costs,
        sharedTrailer: { lineage: { evidence: trailer.lineage.evidence.map(e => ({ id: e.id, url: e.url, locator: e.locator })) } },
        trace: { version: 'FCM_ECONOMIC_TRACE_V1', resources: [box], borderCharges: result.lineage.route.borderCharges },
      } }
    }) ?? null,
  }
}
