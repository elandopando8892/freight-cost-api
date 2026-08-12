import { DEFAULT_ASSUMPTIONS } from './default-assumptions.js'

/** Canonical registry of Freight Cost Model inputs. Use `key` for integrations. */
export type ParameterKind = 'ASSUMPTION' | 'COST_CARD'

export type ParameterDefinition = {
  key: string
  section: string
  field: string
  label: string
  kind: ParameterKind
  defaultValue: number
  unit: string
  low: number
  high: number
  updateFrequency: string
  costBehavior: string
  activation: string
  sourceSheet: 'Assumptions' | 'Inputs'
  sourceVersion: 'FCM_V3.0'
  displayOrder: number
}

const COST_CARD_SECTIONS = new Set([
  'COST_MAINT', 'COST_TIRES', 'COST_INSURANCE', 'COST_PAYROLL',
  'COST_COMPANY', 'COST_CAPITAL', 'COST_CROSSBORDER',
])

function slug(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function parameterKey(section: string, field: string) {
  return `fcm.v3.${slug(section)}.${slug(field)}`
}

export const PARAMETER_DEFINITIONS: readonly ParameterDefinition[] = DEFAULT_ASSUMPTIONS.map((param, index) => {
  const kind: ParameterKind = COST_CARD_SECTIONS.has(param.section) ? 'COST_CARD' : 'ASSUMPTION'
  return {
    key: parameterKey(param.section, param.field), section: param.section, field: param.field,
    label: param.field, kind, defaultValue: param.value, unit: param.unit, low: param.low, high: param.high,
    updateFrequency: param.updateFrequency, costBehavior: param.costBehavior, activation: param.activation,
    sourceSheet: kind === 'COST_CARD' ? 'Inputs' : 'Assumptions', sourceVersion: 'FCM_V3.0', displayOrder: index + 1,
  }
})

export const PARAMETER_CATALOG_TOTAL = 210
const uniqueKeys = new Set(PARAMETER_DEFINITIONS.map((definition) => definition.key))
if (PARAMETER_DEFINITIONS.length !== PARAMETER_CATALOG_TOTAL || uniqueKeys.size !== PARAMETER_DEFINITIONS.length) {
  throw new Error('Parameter catalog integrity error: expected 210 uniquely identified definitions.')
}

export function summarizeParameterCatalog(definitions = PARAMETER_DEFINITIONS) {
  const byKind: Record<ParameterKind, number> = { ASSUMPTION: 0, COST_CARD: 0 }
  const bySection: Record<string, number> = {}
  for (const definition of definitions) {
    byKind[definition.kind] += 1
    bySection[definition.section] = (bySection[definition.section] ?? 0) + 1
  }
  return { total: definitions.length, byKind, bySection }
}
