import { describe, expect, it } from 'vitest'
import { calculate } from '../src/modules/engine/engine.calculator.js'
import { fxFormat, marginLabel, provenanceLabel, usdPerMile } from '../../web/lib/quote-format.js'

const equipment = { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' }

describe('commercial evidence and visual units', () => {
  it('exposes the actual configured margins without changing the economic formula', () => {
    const common = { operation: 'Intra-Mex', service: 'One Way', equipment,
      mexLeg: { baseKm: 250, operation: 'Intra-Mex', service: 'One Way', equipment, route: 'Mostly Straight' } }
    const defaultResult = calculate({ ...common, params: {} })
    const changed = calculate({ ...common, params: { 'TECHNICAL_MARGIN__Minimum Gross Margin': 0.15,
      'TECHNICAL_MARGIN__Target Gross Margin': 0.22, 'TECHNICAL_MARGIN__Premium Gross Margin': 0.3 } })
    expect(defaultResult.commercial.minMarginPct).toBe(0.12)
    expect(changed.commercial).toMatchObject({ minMarginPct: 0.15, targetMarginPct: 0.22, premiumMarginPct: 0.3 })
    expect(changed.commercial.minSellUsd).not.toBe(defaultResult.commercial.minSellUsd)
    expect(marginLabel('Mínimo', changed.commercial.minMarginPct)).toBe('Mínimo (15.0%)')
    expect(marginLabel('Mínimo')).toBe('Mínimo (margen no registrado)')
  })

  it('preserves sub-dollar rate precision and distinguishes currency and market provenance', () => {
    expect(usdPerMile.format(0.48)).toBe('$0.48')
    expect(fxFormat.format(18.755)).toBe('18.755')
    expect(provenanceLabel('cost_proxy')).toBe('Aproximación por costos')
    expect(provenanceLabel()).toBe('Procedencia no registrada')
    const result = calculate({ operation: 'Intra-Mex', service: 'One Way', equipment, params: {},
      mexLeg: { baseKm: 250, operation: 'Intra-Mex', service: 'One Way', equipment, route: 'Mostly Straight' } })
    expect(result.commercial.marketReferenceProvenance).toBe('cost_proxy')
  })
})
