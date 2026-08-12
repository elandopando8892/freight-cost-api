import { describe, expect, it } from 'vitest'
import {
  PARAMETER_CATALOG_TOTAL,
  PARAMETER_DEFINITIONS,
  parameterKey,
  summarizeParameterCatalog,
} from '../src/data/parameter-catalog.js'

describe('canonical parameter catalog', () => {
  it('keeps all 210 workbook inputs with stable unique keys', () => {
    expect(PARAMETER_DEFINITIONS).toHaveLength(PARAMETER_CATALOG_TOTAL)
    expect(new Set(PARAMETER_DEFINITIONS.map((definition) => definition.key)).size).toBe(PARAMETER_CATALOG_TOTAL)
    expect(PARAMETER_DEFINITIONS.every((definition) => definition.key === parameterKey(definition.section, definition.field))).toBe(true)
  })

  it('preserves source, bounds, order, and the current workbook composition', () => {
    const summary = summarizeParameterCatalog()
    expect(summary).toEqual({
      total: 210,
      byKind: { ASSUMPTION: 76, COST_CARD: 134 },
      bySection: {
        GENERAL_BASE: 6, FUEL: 7, LABOR: 7, FINANCE: 7, UTILIZATION: 20, BORDER: 4,
        RISK: 7, CONFIG: 9, TECHNICAL_MARGIN: 9, COST_MAINT: 31, COST_TIRES: 12,
        COST_INSURANCE: 3, COST_PAYROLL: 14, COST_COMPANY: 46, COST_CAPITAL: 13, COST_CROSSBORDER: 15,
      },
    })
    expect(PARAMETER_DEFINITIONS.every((definition, index) => (
      definition.displayOrder === index + 1
      && definition.sourceVersion === 'FCM_V3.0'
      && definition.low <= definition.defaultValue
      && definition.defaultValue <= definition.high
    ))).toBe(true)
  })
})
