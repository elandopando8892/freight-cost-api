import { describe, expect, it } from 'vitest'
import { classifyCoverage } from '../src/modules/catalog/coverage.service.js'

const definition = { defaultValue: 10, low: 5, high: 15 }

describe('cost-base parameter coverage', () => {
  it('classifies a missing value as incomplete', () => {
    expect(classifyCoverage(definition)).toBe('MISSING')
  })

  it('classifies the canonical value as inherited', () => {
    expect(classifyCoverage(definition, { value: 10, low: null, high: null })).toBe('INHERITED')
  })

  it('classifies an in-range changed value as base-specific', () => {
    expect(classifyCoverage(definition, { value: 12, low: null, high: null })).toBe('SPECIFIC')
  })

  it('prioritizes an out-of-range warning over the specific state', () => {
    expect(classifyCoverage(definition, { value: 20, low: null, high: null })).toBe('OUT_OF_RANGE')
  })

  it('uses parameter-specific bounds when present', () => {
    expect(classifyCoverage(definition, { value: 16, low: 0, high: 20 })).toBe('SPECIFIC')
  })
})
