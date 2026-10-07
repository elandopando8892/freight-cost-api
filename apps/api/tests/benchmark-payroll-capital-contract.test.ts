import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ADMIN_ROLES, PayrollCapitalContractSchema, auditD2DPayrollCapitalContracts,
  auditPayrollCapitalContract, type PayrollCapitalContractInput } from '../src/modules/engine/benchmark-payroll-capital-contract.js'

// All numeric values are synthetic representations; no benchmark or live base is used.
function fixture(country: 'MX' | 'US' = 'MX'): PayrollCapitalContractInput {
  const datum = (value: number, unit: string) => ({ value, unit, evidenceIds: ['synthetic'], derivation: 'Synthetic test only' })
  return PayrollCapitalContractSchema.parse({
    methodId: 'FCM_PAYROLL_CAPITAL_CONTRACT_V1', baseRevision: 'TEST', country,
    cohortId: `${country}-TEST`, referencePeriod: '2026-09', equipment: 'TRACTOR_DRY_VAN_SINGLE',
    serviceDate: '2026-09-29', assetCostScope: 'TRACTOR_AND_TRAILER',
    separateCostFamilies: ['COMPANY', 'INSURANCE', 'MAINTENANCE', 'TIRES'],
    evidence: [{ id: 'synthetic', url: 'https://example.org/synthetic', locator: 'Synthetic only',
      observedAt: '2026-09-01', validFrom: '2026-09-01', validUntil: '2026-09-30', country,
      equipment: 'TRACTOR_DRY_VAN_SINGLE', limitations: 'No economic evidence', cohortId: `${country}-TEST`,
      referencePeriod: '2026-09', sourceKind: 'MODELED_ASSUMPTION', applicabilityRationale: 'Synthetic only' }],
    exposure: { fleetTractors: datum(2, 'tractors'), totalKmPerFleetMonth: datum(20000, 'km/fleet-month'),
      productiveVehicleDaysPerFleetMonth: datum(40, 'vehicle-days/fleet-month') },
    assets: ['TRACTOR', 'DRY_VAN_TRAILER'].map(assetClass => ({
      id: `${country}-${assetClass}`, assetClass, condition: 'NEW', tenure: 'OWNED_CASH', costBearer: 'CARRIER',
      quantity: datum(2, 'assets/fleet'), acquisitionCost: datum(120000, 'USD/asset'), residual: datum(30000, 'USD/asset'),
      horizon: datum(assetClass === 'TRACTOR' ? 60 : 120, 'months'), horizonBasis: 'FROM_NEW',
      depreciationBasis: 'ECONOMIC_ESTIMATE', monthlyInterest: null, financingBasis: null,
      monthlyRent: null, rentCoveredFamilies: [],
    })),
    administration: { method: 'ROLE_DETAIL', combinedOverhead: null, roles: ADMIN_ROLES.map(role => ({ role,
      fte: datum(0.5, 'FTE/fleet'), compensationBasis: 'WAGES_ONLY', monthlyWage: datum(1000, 'USD/FTE-month'),
      monthlyBenefits: datum(200, 'USD/FTE-month') })) },
    driver: { compensationBasis: 'EMPLOYER_TOTAL', wage: datum(0.2, 'USD/km'), benefits: null },
  })
}
const codes = (input: PayrollCapitalContractInput) => auditPayrollCapitalContract(input).issues.map(issue => issue.code)

describe('overhead and productive exposure boundaries', () => {
  function combined() {
    const input = fixture()
    input.separateCostFamilies = ['INSURANCE', 'MAINTENANCE', 'TIRES']
    input.administration = { method: 'COMBINED_OVERHEAD', roles: [], combinedOverhead: {
      monthlyCost: { value: 1000, unit: 'USD/fleet-month', evidenceIds: ['synthetic'], derivation: 'Synthetic only' },
      coveredFamilies: ['ADMIN_PAYROLL', 'COMPANY'], employerBenefitsIncluded: true,
      excludedFamilies: ['CAPITAL', 'DRIVER', 'INSURANCE', 'MAINTENANCE', 'TIRES', 'FUEL', 'TOLLS', 'WORKING_CAPITAL'],
    } }
    return input
  }
  it('allows structurally compatible monthly overhead without emitting a price or approval', () => {
    const result = auditPayrollCapitalContract(combined())
    expect(result).toMatchObject({ status: 'CONTRACT_COMPATIBLE_UNVERIFIED', calibrated: false,
      quoteReady: false, adoptedValues: 0, monthlyFixedUsd: null, cfuUsd: null })
  })
  it('rejects a previous-period overhead source even when current exposure evidence matches', () => {
    const input = combined()
    input.evidence.push({ ...input.evidence[0], id: 'old-overhead', referencePeriod: '2025-09' })
    input.administration.combinedOverhead!.monthlyCost!.evidenceIds = ['old-overhead']
    expect(auditPayrollCapitalContract(input).issues).toContainEqual({
      field: 'administration.combinedOverhead.monthlyCost', code: 'EXPOSURE_PERIOD_MISMATCH' })
  })
  it.each(['country', 'cohortId', 'equipment'] as const)('blocks overhead from another %s', field => {
    const input = combined()
    input.evidence.push({ ...input.evidence[0], id: 'wrong-scope' })
    if (field === 'country') input.evidence[1].country = 'US'
    if (field === 'cohortId') input.evidence[1].cohortId = 'OTHER-FLEET'
    if (field === 'equipment') {
      expect(() => auditPayrollCapitalContract({ ...input,
        evidence: [input.evidence[0], { ...input.evidence[1], equipment: 'TRACTOR_REFRIGERATED' }] })).toThrow()
      return
    }
    input.administration.combinedOverhead!.monthlyCost!.evidenceIds = ['wrong-scope']
    expect(codes(input)).toContain('EVIDENCE_SCOPE_MISMATCH')
  })
  it.each(['PUBLIC_CONTRAST', 'TAX_RULE'] as const)('does not upgrade %s to overhead evidence', kind => {
    const input = combined(); input.evidence[0].sourceKind = kind
    expect(codes(input)).toContain('CONTEXT_ONLY_SOURCE')
  })
  it.each(['COMPANY', 'ADMIN_PAYROLL'] as const)('rejects charging %s again outside a combined block', family => {
    const input = combined(); input.separateCostFamilies.push(family)
    expect(codes(input)).toContain('OVERHEAD_COVERAGE_OVERLAP')
  })
  it.each([['2026-02', 28], ['2024-02', 29], ['2026-09', 30], ['2026-07', 31]] as const)
    ('uses the calendar capacity of %s, not a universal 31-day month', (month, days) => {
      const input = combined(); input.referencePeriod = month; input.evidence[0].referencePeriod = month
      input.exposure.productiveVehicleDaysPerFleetMonth!.value = 2 * days
      expect(codes(input)).not.toContain('EXCEEDS_VEHICLE_MONTH')
      input.exposure.productiveVehicleDaysPerFleetMonth!.value += 0.01
      expect(codes(input)).toContain('EXCEEDS_VEHICLE_MONTH')
    })
  it.each(['UNRESOLVED', '2026', '2026-13'])('keeps ambiguous monthly period %s incomplete', period => {
    const input = combined(); input.referencePeriod = period
    expect(codes(input)).toContain('MONTHLY_REFERENCE_PERIOD_REQUIRED')
  })
})

describe('payroll/capital methodology contract', () => {
  it('supports different economic horizons by asset without certifying a cost', () => {
    const result = auditPayrollCapitalContract(fixture())
    expect(result.status).toBe('CONTRACT_COMPATIBLE_UNVERIFIED')
    expect(result.issues).toEqual([])
    expect(result.calibrated).toBe(false); expect(result.quoteReady).toBe(false)
    expect(result.adoptedValues).toBe(0)
    expect(result.monthlyFixedUsd).toBeNull(); expect(result.cfuUsd).toBeNull(); expect(result.cvuUsd).toBeNull()
    expect(result.purchaseCostUsd).toBeNull(); expect(result.sellPriceUsd).toBeNull()
  })
  it('requires remaining life for a used acquisition, not a new-asset clock', () => {
    const input = fixture(); input.assets[0].condition = 'USED'
    expect(codes(input)).toContain('HORIZON_BASIS_MISMATCH')
    input.assets[0].horizonBasis = 'REMAINING_FROM_ACQUISITION'
    expect(codes(input)).not.toContain('HORIZON_BASIS_MISMATCH')
  })
  it.each(['country', 'cohort', 'period', 'expiry', 'context', 'tax', 'duplicate', 'unknown'] as const)('blocks incompatible provenance: %s', mode => {
    const input = fixture()
    if (mode === 'country') input.evidence[0].country = 'US'
    if (mode === 'cohort') input.evidence[0].cohortId = 'OTHER'
    if (mode === 'period') input.evidence[0].referencePeriod = '2025'
    if (mode === 'expiry') input.evidence[0].validUntil = '2026-09-28'
    if (mode === 'context') input.evidence[0].sourceKind = 'PUBLIC_CONTRAST'
    if (mode === 'tax') input.evidence[0].sourceKind = 'TAX_RULE'
    if (mode === 'duplicate') input.evidence.push(input.evidence[0])
    if (mode === 'unknown') input.assets[0].acquisitionCost!.evidenceIds = ['unknown']
    expect(auditPayrollCapitalContract(input).status).toBe('INCOMPLETE')
  })
  it('blocks fiscal life, impossible residual and fractional horizons', () => {
    const input = fixture(); input.assets[0].depreciationBasis = 'TAX_SCHEDULE'
    input.assets[0].residual!.value = 200000; input.assets[0].horizon!.value = 2.5
    expect(codes(input)).toEqual(expect.arrayContaining(['TAX_LIFE_NOT_ECONOMIC', 'RESIDUAL_EXCEEDS_COST', 'NON_INTEGER_HORIZON']))
  })
  it('requires financed assets to identify interest independently from principal', () => {
    const input = fixture(); input.assets[0].tenure = 'OWNED_FINANCED'
    input.assets[0].financingBasis = 'TOTAL_LOAN_PAYMENT'
    input.assets[0].monthlyInterest = { ...input.assets[0].residual!, unit: 'USD/asset-month', value: 500 }
    expect(codes(input)).toContain('PRINCIPAL_OR_UNDEFINED_FINANCING')
    input.assets[0].financingBasis = 'INTEREST_ONLY'
    expect(auditPayrollCapitalContract(input).status).toBe('CONTRACT_COMPATIBLE_UNVERIFIED')
  })
  it('rejects rented assets mixed with depreciation and independently modeled rent inclusions', () => {
    const input = fixture(); const asset = input.assets[0]; asset.tenure = 'RENTED'
    asset.monthlyRent = { ...asset.residual!, unit: 'USD/asset-month', value: 500 }
    asset.rentCoveredFamilies = ['CAPITAL', 'MAINTENANCE']
    expect(codes(input)).toEqual(expect.arrayContaining(['RENT_AND_OWNERSHIP_MIXED', 'RENT_COVERAGE_OVERLAP']))
    asset.acquisitionCost = null; asset.residual = null; asset.horizon = null
    asset.horizonBasis = null; asset.depreciationBasis = null
    input.separateCostFamilies = input.separateCostFamilies.filter(key => key !== 'MAINTENANCE')
    expect(auditPayrollCapitalContract(input).status).toBe('CONTRACT_COMPATIBLE_UNVERIFIED')
  })
  it('does not add employer benefits to an all-inclusive wage', () => {
    const input = fixture(); input.administration.roles[0].compensationBasis = 'EMPLOYER_TOTAL'
    expect(codes(input)).toContain('BENEFITS_ALREADY_INCLUDED')
    input.administration.roles[0].monthlyBenefits = null
    input.driver.compensationBasis = 'WAGES_ONLY'
    expect(codes(input)).toContain('MISSING_INPUT')
  })
  it('accepts a declared combined overhead only with disjoint economic boundaries', () => {
    const input = fixture(); input.administration.method = 'COMBINED_OVERHEAD'
    input.administration.combinedOverhead = { monthlyCost: { ...input.assets[0].residual!, unit: 'USD/fleet-month', value: 1000 },
      coveredFamilies: ['ADMIN_PAYROLL', 'COMPANY'], employerBenefitsIncluded: true,
      excludedFamilies: ['CAPITAL', 'DRIVER', 'INSURANCE', 'MAINTENANCE', 'TIRES', 'FUEL', 'TOLLS', 'WORKING_CAPITAL'] }
    expect(codes(input)).toEqual(expect.arrayContaining(['OVERHEAD_AND_ROLE_DETAIL_MIXED', 'OVERHEAD_COVERAGE_OVERLAP']))
    input.administration.roles = []; input.separateCostFamilies = input.separateCostFamilies.filter(key => key !== 'COMPANY')
    expect(auditPayrollCapitalContract(input).status).toBe('CONTRACT_COMPATIBLE_UNVERIFIED')
    input.administration.combinedOverhead.excludedFamilies = []
    expect(codes(input)).toContain('OVERHEAD_EXCLUSIONS_INCOMPLETE')
  })
  it('blocks missing exposure, unresolved responsibility and wrong asset quantity', () => {
    const input = fixture(); input.exposure.totalKmPerFleetMonth = null
    input.exposure.productiveVehicleDaysPerFleetMonth!.value = 100
    input.assets[0].quantity!.value = 10; input.assets[0].costBearer = null
    expect(codes(input)).toEqual(expect.arrayContaining(['MISSING_INPUT', 'EXCEEDS_VEHICLE_MONTH', 'TRACTOR_COUNT_MISMATCH', 'UNRESOLVED_COST_RESPONSIBILITY']))
  })
  it('requires whole asset counts while allowing fractional administrative FTEs', () => {
    const input = fixture(); input.assets[1].quantity!.value = 0.5
    expect(codes(input)).toContain('NON_INTEGER_ASSET_COUNT')
    input.assets[1].quantity!.value = 2
    expect(auditPayrollCapitalContract(input).status).toBe('CONTRACT_COMPATIBLE_UNVERIFIED')
  })
  it('rejects supplied review status, totals, annual wages, FX units and invalid dates', () => {
    const input = fixture()
    expect(() => auditPayrollCapitalContract({ ...input, calibrated: true })).toThrow()
    expect(() => auditPayrollCapitalContract({ ...input, monthlyFixedUsd: 1000 })).toThrow()
    expect(() => auditPayrollCapitalContract({ ...input, serviceDate: '2026-02-30' })).toThrow()
    expect(() => auditPayrollCapitalContract({ ...input, driver: { ...input.driver, wage: { ...input.driver.wage, unit: 'USD/year' } } })).toThrow()
    expect(() => auditPayrollCapitalContract({ ...input, assets: [{ ...input.assets[0], acquisitionCost: { ...input.assets[0].acquisitionCost, unit: 'MXN/asset' } }] })).toThrow()
  })
  it('keeps both real research templates incomplete and empty of evidence/numeric defaults', () => {
    const templates = JSON.parse(readFileSync(resolve(__dirname, '../../../docs/research/B2_PAYROLL_CAPITAL_CONTRACT_TEMPLATE_2026-09-29.json'), 'utf8'))
    for (const raw of templates.contracts) {
      const result = auditPayrollCapitalContract(raw)
      expect(result.status).toBe('INCOMPLETE'); expect(result.adoptedValues).toBe(0)
      expect(result.lineage.evidence).toEqual([])
      expect(JSON.stringify(raw)).not.toMatch(/"value":/)
    }
  })
  it('prevents assigning the same physical asset to both country legs', () => {
    const mx = fixture('MX'); const us = fixture('US')
    expect(auditD2DPayrollCapitalContracts({ mx, us }).status).toBe('CONTRACT_COMPATIBLE_UNVERIFIED')
    us.assets[1].id = mx.assets[1].id
    expect(auditD2DPayrollCapitalContracts({ mx, us }).issues).toContainEqual({ field: mx.assets[1].id, code: 'SHARED_ASSET_REQUIRES_SINGLE_ALLOCATION' })
    us.country = 'MX'; us.serviceDate = '2026-09-28'
    expect(auditD2DPayrollCapitalContracts({ mx, us }).issues.map(issue => issue.code)).toEqual(expect.arrayContaining(['D2D_COUNTRY_MISMATCH', 'D2D_DATE_MISMATCH']))
  })
})
