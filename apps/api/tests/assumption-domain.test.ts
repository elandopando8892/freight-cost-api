import { describe, expect, it } from 'vitest'
import {
  AssumptionValueDomainError,
  assertAssumptionValueDomain,
  assumptionSetCrossFieldIssues,
  assumptionValueDomainIssue,
  canonicalAssumptionIdentityIssues,
} from '../src/modules/assumptions/assumption-domain.js'
import { DEFAULT_ASSUMPTIONS } from '../src/data/default-assumptions.js'
import { BulkUpdateParamsSchema } from '../src/modules/assumptions/assumptions.schema.js'
import { CreateCostBaseSchema } from '../src/modules/cost-bases/cost-bases.schema.js'

const positiveDivisors = [
  ['GENERAL_BASE', 'Periodo de Operación'],
  ['GENERAL_BASE', 'Tamaño de Flota'],
  ['GENERAL_BASE', 'Índice de Operatividad'],
  ['GENERAL_BASE', 'Operadores'],
  ['GENERAL_BASE', 'Kilómetros promedio x operador'],
  ['FUEL', 'Rendimiento Cargado'],
  ['FUEL', 'Rendimiento Vacío'],
  ['FINANCE', 'Tipo de Cambio'],
  ['TECHNICAL_MARGIN', 'Rate Rounding MEX USD'],
  ['TECHNICAL_MARGIN', 'Rate Rounding USA USD'],
  ['COST_TIRES', 'Life KM Direccion'],
  ['COST_TIRES', 'Life KM Traccion'],
  ['COST_TIRES', 'Life KM Remolque'],
  ['COST_TIRES', 'Life KM Recapeadas'],
  ['COST_INSURANCE', 'Periodo de Poliza'],
  ['COST_CAPITAL', 'Periodo Depreciacion'],
] as const

const complementDivisorMargins = [
  'UT Rate One Way',
  'UT Rate Backhaul',
  'UT Rate Roundtrip',
  'Minimum Gross Margin',
  'Target Gross Margin',
  'Premium Gross Margin',
] as const

describe('versioned assumption mathematical domain', () => {
  it.each(positiveDivisors)('rejects zero and negative divisors for %s / %s', (section, field) => {
    expect(assumptionValueDomainIssue({ section, field, value: 0 })).toMatch(/greater than 0/i)
    expect(assumptionValueDomainIssue({ section, field, value: -1 })).toMatch(/greater than 0/i)
  })

  it.each(complementDivisorMargins)('rejects %s at or above one', (field) => {
    expect(assumptionValueDomainIssue({ section: 'TECHNICAL_MARGIN', field, value: 1 })).toMatch(/less than 1/i)
    expect(assumptionValueDomainIssue({ section: 'TECHNICAL_MARGIN', field, value: 1.25 })).toMatch(/less than 1/i)
  })

  it('rejects a tandem fuel penalty that zeroes or reverses efficiency', () => {
    expect(assumptionValueDomainIssue({ section: 'CONFIG', field: 'Tandem Fuel Penalty', value: 1 })).toMatch(/less than 1/i)
  })

  it('rejects negative costs and quantities without using recommended lows as the boundary', () => {
    expect(assumptionValueDomainIssue({ section: 'FUEL', field: 'Diesel MX', value: -0.01 })).toMatch(/zero or greater/i)
    expect(assumptionValueDomainIssue({ section: 'COST_PAYROLL', field: 'Qty Despachador', value: -1 })).toMatch(/zero or greater/i)
  })

  it('rejects non-finite and overflow-prone values with a 422 domain error', () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.MAX_VALUE]) {
      expect(() => assertAssumptionValueDomain({ section: 'FUEL', field: 'Diesel MX', value }))
        .toThrow(AssumptionValueDomainError)
      try {
        assertAssumptionValueDomain({ section: 'FUEL', field: 'Diesel MX', value })
      } catch (error) {
        expect(error).toMatchObject({ statusCode: 422 })
      }
    }
  })

  it('does not turn recommended ranges into hard business limits', () => {
    expect(assumptionValueDomainIssue({ section: 'FUEL', field: 'Diesel MX', value: 500 })).toBeNull()
    expect(assumptionValueDomainIssue({ section: 'GENERAL_BASE', field: 'Periodo de Operación', value: 1 })).toBeNull()
    expect(assumptionValueDomainIssue({ section: 'TECHNICAL_MARGIN', field: 'UT Rate One Way', value: 0.99 })).toBeNull()
  })

  it('declares finite numbers at both public write schemas', () => {
    expect(BulkUpdateParamsSchema.safeParse([
      { section: 'FUEL', field: 'Diesel MX', value: Number.POSITIVE_INFINITY },
    ]).success).toBe(false)
    expect(CreateCostBaseSchema.safeParse({
      code: 'MX-DOMAIN',
      name: 'Mexico domain test',
      scope: 'INTRA_MEX',
      assumptionOverrides: [
        { section: 'FUEL', field: 'Diesel MX', value: Number.POSITIVE_INFINITY },
      ],
    }).success).toBe(false)
  })

  it('detects an unknown factor and the canonical parameter it displaced at the same row count', () => {
    const candidates = DEFAULT_ASSUMPTIONS.slice(1).map(({ section, field }) => ({ section, field }))
    candidates.push({ section: 'FACTORS', field: 'Hidden Override' })

    expect(candidates).toHaveLength(DEFAULT_ASSUMPTIONS.length)
    expect(canonicalAssumptionIdentityIssues(candidates)).toEqual(expect.arrayContaining([
      expect.stringMatching(/Missing canonical assumptions/i),
      expect.stringMatching(/Unknown assumptions are not allowed/i),
    ]))
  })

  it('enforces ordered sell margins only as a cross-field invariant', () => {
    const values = DEFAULT_ASSUMPTIONS.map(({ section, field, value }) => ({ section, field, value }))
    values.find((candidate) => candidate.field === 'Minimum Gross Margin')!.value = 0.3
    values.find((candidate) => candidate.field === 'Target Gross Margin')!.value = 0.2

    expect(assumptionSetCrossFieldIssues(values, 'INTRA_MEX')).toEqual(expect.arrayContaining([
      expect.stringMatching(/Minimum <= Target <= Premium/i),
    ]))
  })

  it('enforces a complete fuel mix only for cross-border bases', () => {
    const values = DEFAULT_ASSUMPTIONS.map(({ section, field, value }) => ({ section, field, value }))
    values.find((candidate) => candidate.field === 'Fuel Purchase Mix MX')!.value = 0.2
    values.find((candidate) => candidate.field === 'Fuel Purchase Mix US')!.value = 0.7

    expect(assumptionSetCrossFieldIssues(values, 'CROSS_BORDER')).toEqual(expect.arrayContaining([
      expect.stringMatching(/must equal 1/i),
    ]))
    expect(assumptionSetCrossFieldIssues(values, 'INTRA_MEX')).toEqual([])
  })
})
