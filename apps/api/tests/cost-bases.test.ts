import { describe, expect, it } from 'vitest'
import { assertScopeCompatible, scopeForOperation } from '../src/modules/cost-bases/cost-bases.service.js'

describe('cost-base scope routing', () => {
  it.each([
    ['D2D Export', 'CROSS_BORDER'],
    ['D2D Import', 'CROSS_BORDER'],
    ['Drayage', 'DRAYAGE'],
    ['Local', 'LOCAL'],
    ['Intra-Mex', 'INTRA_MEX'],
    ['US Northbound', 'INTRA_US'],
  ] as const)('%s resolves to %s', (operation, expected) => {
    expect(scopeForOperation(operation)).toBe(expected)
    expect(() => assertScopeCompatible(expected, operation)).not.toThrow()
  })

  it('rejects a route that would silently use economics from another scope', () => {
    expect(() => assertScopeCompatible('CROSS_BORDER', 'Drayage')).toThrow(/expected DRAYAGE/)
  })

  it('leaves unknown future operations unblocked until their scope is defined', () => {
    expect(scopeForOperation('Future Specialized Service')).toBeNull()
  })
})
