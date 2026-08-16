import { calculateForQuoteSnapshot, type QuoteCalculationSnapshot } from '../quotes/quote-snapshot.js'
import { PARAMETER_DEFINITIONS } from '../../data/parameter-catalog.js'

export const SCENARIO_FIELDS = [
  { key: 'FUEL__Diesel MX', label: 'Diésel MX', unit: 'MXN/L' },
  { key: 'FUEL__Diesel US Border', label: 'Diésel frontera', unit: 'USD/L' },
  { key: 'FINANCE__Tipo de Cambio', label: 'Tipo de cambio', unit: 'MXN/USD' },
  { key: 'TECHNICAL_MARGIN__Target Gross Margin', label: 'Margen bruto objetivo', unit: '%' },
] as const

export type ScenarioFieldKey = string
export type ScenarioChange = { key: ScenarioFieldKey; value: number }

function metadataFor(key: string) {
  const separator = key.indexOf('__')
  const section = separator === -1 ? 'OTHER' : key.slice(0, separator)
  const field = separator === -1 ? key : key.slice(separator + 2)
  const definition = PARAMETER_DEFINITIONS.find((item) => item.section === section && item.field === field)
  return {
    key,
    section,
    label: definition?.label ?? field,
    unit: definition?.unit ?? '',
    low: definition?.low ?? null,
    high: definition?.high ?? null,
    costBehavior: definition?.costBehavior ?? 'Snapshot input',
  }
}

/** Only the inputs proven by the quote snapshot can be used in a scenario. */
export function scenarioFieldsFor(snapshot: QuoteCalculationSnapshot) {
  return Object.entries(snapshot.input.params)
    .map(([key, currentValue]) => ({ ...metadataFor(key), currentValue }))
    .sort((a, b) => a.section.localeCompare(b.section) || a.label.localeCompare(b.label))
}

export function unknownScenarioKeys(snapshot: QuoteCalculationSnapshot, changes: ScenarioChange[]) {
  return changes.map((change) => change.key).filter((key) => !(key in snapshot.input.params))
}

function summary(result: ReturnType<typeof calculateForQuoteSnapshot>) {
  return {
    freightBaselineUsd: result.freightBaselineUsd,
    requiredTariffUsd: result.requiredTariffUsd,
    costFloorUsd: result.commercial.costFloorUsd,
    recommendedSellUsd: result.commercial.recommendedSellUsd,
    grossMarginPct: result.commercial.grossMarginPct,
  }
}

function delta(baseline: number, proposed: number) {
  const absolute = proposed - baseline
  return { absolute, percent: baseline === 0 ? null : (absolute / baseline) * 100 }
}

/** Calculates an in-memory what-if from immutable quote evidence. */
export function buildScenario(snapshot: QuoteCalculationSnapshot, changes: ScenarioChange[]) {
  const baselineResult = calculateForQuoteSnapshot(snapshot)
  const overrides = Object.fromEntries(changes.map((change) => [change.key, change.value]))
  const proposedResult = calculateForQuoteSnapshot(snapshot, { ...snapshot.input, overrides })
  const baseline = summary(baselineResult)
  const proposed = summary(proposedResult)
  return {
    policy: 'READ_ONLY_SCENARIO_NO_PERSISTENCE',
    sourceChecksum: snapshot.checksum,
    changes: changes.map((change) => ({ ...change, ...metadataFor(change.key) })),
    baseline,
    proposed,
    delta: {
      freightBaselineUsd: delta(baseline.freightBaselineUsd, proposed.freightBaselineUsd),
      requiredTariffUsd: delta(baseline.requiredTariffUsd, proposed.requiredTariffUsd),
      costFloorUsd: delta(baseline.costFloorUsd, proposed.costFloorUsd),
      recommendedSellUsd: delta(baseline.recommendedSellUsd, proposed.recommendedSellUsd),
    },
  }
}
