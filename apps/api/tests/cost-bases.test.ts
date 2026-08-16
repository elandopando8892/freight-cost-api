import { describe, expect, it } from 'vitest'
import {
  assertCalculationOverrides,
  assertCostBaseMetadataUpdate,
  assertScopeCompatible,
  calculationApplicabilityProfile,
  scopeForOperation,
} from '../src/modules/cost-bases/cost-bases.service.js'
import { defaultCostBaseProfile } from '../src/modules/cost-bases/cost-base-profile.js'
import { ArchiveCostBaseSchema, UpdateCostBaseSchema } from '../src/modules/cost-bases/cost-bases.schema.js'
import { assumptionValueDomainIssue } from '../src/modules/assumptions/assumption-domain.js'

describe('assumption mathematical domain', () => {
  it('rejects a positive divisor that would create an unsafe reciprocal', () => {
    expect(assumptionValueDomainIssue({
      section: 'GENERAL_BASE',
      field: 'Tamaño de Flota',
      value: 1e-300,
    })).toMatch(/too close to zero/i)
  })

  it('does not turn the recommended commercial low into a hard limit', () => {
    expect(assumptionValueDomainIssue({
      section: 'GENERAL_BASE',
      field: 'Periodo de Operación',
      value: 1,
    })).toBeNull()
  })
})

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

describe('versioned calculation applicability', () => {
  const equipment = { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' }

  it('uses the stored profile policy instead of a later mutable base default', () => {
    const stored = defaultCostBaseProfile('INTRA_MEX', 'OPERATIONAL_V3')
    const resolved = calculationApplicabilityProfile(
      'INTRA_MEX',
      stored,
      'WORKBOOK_V3',
      { operation: 'Intra-Mex', service: 'One Way', equipment },
    )
    expect(resolved.calculationPolicy).toBe('OPERATIONAL_V3')
  })

  it('rejects policy, service, and equipment outside the governed profile', () => {
    const stored = defaultCostBaseProfile('INTRA_MEX', 'OPERATIONAL_V3')
    expect(() => calculationApplicabilityProfile(
      'INTRA_MEX', stored, 'OPERATIONAL_V3',
      { operation: 'Intra-Mex', service: 'One Way', equipment },
      'WORKBOOK_V3',
    )).toThrow(/does not match the governed policy/i)
    expect(() => calculationApplicabilityProfile(
      'INTRA_MEX', stored, 'OPERATIONAL_V3',
      { operation: 'Intra-Mex', service: 'Expedited', equipment },
    )).toThrow(/service expedited is not enabled/i)
    expect(() => calculationApplicabilityProfile(
      'INTRA_MEX', stored, 'OPERATIONAL_V3',
      { operation: 'Intra-Mex', service: 'One Way', equipment: { ...equipment, trailer: 'Reefer' } },
    )).toThrow(/trailer reefer is not enabled/i)
  })

  it('keeps a broad compatibility envelope only for legacy null profiles', () => {
    const resolved = calculationApplicabilityProfile(
      'INTRA_MEX',
      null,
      'OPERATIONAL_V3',
      {
        operation: 'Intra-Mex',
        service: 'Expedited',
        equipment: { truckType: 'Rabon', trailer: 'Reefer', config: 'Tandem', driver: 'B1' },
      },
    )
    expect(resolved.truckTypes).toContain('Rabon')
    expect(resolved.services).toContain('Expedited')
  })
})

describe('cost-base lifecycle governance', () => {
  it('rejects lifecycle and default-effectiveness fields at the HTTP schema', () => {
    expect(UpdateCostBaseSchema.safeParse({ status: 'ACTIVE' }).success).toBe(false)
    expect(UpdateCostBaseSchema.safeParse({ status: 'ARCHIVED' }).success).toBe(false)
    expect(UpdateCostBaseSchema.safeParse({ isDefault: true }).success).toBe(false)
    expect(UpdateCostBaseSchema.safeParse({ defaultPolicy: 'WORKBOOK_V3' }).success).toBe(false)
    expect(UpdateCostBaseSchema.safeParse({}).success).toBe(false)
    expect(UpdateCostBaseSchema.parse({ name: 'Updated metadata' })).toEqual({ name: 'Updated metadata' })
    expect(ArchiveCostBaseSchema.parse({ note: 'Superseded by the 2027 network design.' })).toEqual({
      note: 'Superseded by the 2027 network design.',
    })
  })

  it('fails closed if an internal caller attempts the same lifecycle bypass', () => {
    expect(() => assertCostBaseMetadataUpdate({ status: 'ACTIVE' } as never)).toThrow(/version-governed/i)
    expect(() => assertCostBaseMetadataUpdate({ isDefault: true } as never)).toThrow(/version-governed/i)
    expect(() => assertCostBaseMetadataUpdate({ defaultPolicy: 'WORKBOOK_V3' } as never)).toThrow(/version-governed/i)
  })
})

describe('per-calculation override governance', () => {
  it('accepts an applicable canonical value inside its governed range', () => {
    expect(() => assertCalculationOverrides('INTRA_MEX', {
      'FUEL__Diesel MX': 28,
    }, defaultCostBaseProfile('INTRA_MEX'))).not.toThrow()
  })

  it('rejects unknown, out-of-range and non-applicable parameters', () => {
    expect(() => assertCalculationOverrides('INTRA_MEX', {
      'FACTORS__Hidden Trailer Factor': 99,
    }, defaultCostBaseProfile('INTRA_MEX'))).toThrow(/canonical parameter catalog/i)
    expect(() => assertCalculationOverrides('INTRA_MEX', {
      'TECHNICAL_MARGIN__UT Rate One Way': 1,
    }, defaultCostBaseProfile('INTRA_MEX'))).toThrow(/must be between/i)
    expect(() => assertCalculationOverrides('INTRA_MEX', {
      'BORDER__Border Transactional Cost': 300,
    }, defaultCostBaseProfile('INTRA_MEX'))).toThrow(/cannot be used/i)
  })
})
