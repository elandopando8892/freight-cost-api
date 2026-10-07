import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ADMIN_ROLES, PayrollCapitalContractSchema } from '../src/modules/engine/benchmark-payroll-capital-contract.js'
import { PUBLIC_COMPONENT_KINDS, PublicReferenceComponentsSchema, PublicReferenceLedgerSchema,
  auditPublicReferenceComponents, auditD2DPublicReferenceComponents, combinePublicReferenceLedger,
  type PublicReferenceComponentsInput } from '../src/modules/engine/benchmark-public-reference-components.js'

// Synthetic values ONLY. Passing structure never certifies a benchmark or source.
const families = ['CAPITAL', 'ADMIN_PAYROLL', 'COMPANY', 'DRIVER', 'INSURANCE',
  'MAINTENANCE', 'TIRES', 'FUEL', 'TOLLS', 'WORKING_CAPITAL'] as const
function syncBoundary(input: PublicReferenceComponentsInput) {
  input.core.separateCostFamilies = [...new Set(input.components.filter(row => row.disposition === 'MODELED' && row.quantity)
    .map(row => ['FUEL_PRICE', 'LOADED_PERFORMANCE', 'EMPTY_PERFORMANCE'].includes(row.kind) ? 'FUEL' as const : row.kind)
    .filter((key): key is typeof families[number] => families.includes(key as typeof families[number])))]
  return input
}
function fixture(country: 'MX' | 'US' = 'MX'): PublicReferenceComponentsInput {
  const datum = (value: number, unit: string) => ({ value, unit, evidenceIds: ['synthetic'], derivation: 'Synthetic test only' })
  const source = { id: 'synthetic', url: 'https://example.org/synthetic', locator: 'Synthetic only',
    observedAt: '2026-09-01', validFrom: '2026-09-01', validUntil: '2026-09-30', country,
    equipment: 'TRACTOR_DRY_VAN_SINGLE', limitations: 'Not economic evidence', cohortId: `${country}-TEST`,
    referencePeriod: '2026-09', sourceKind: 'MODELED_ASSUMPTION', applicabilityRationale: 'Synthetic only' }
  const core = PayrollCapitalContractSchema.parse({
    methodId: 'FCM_PAYROLL_CAPITAL_CONTRACT_V1', baseRevision: 'TEST', country,
    cohortId: `${country}-TEST`, referencePeriod: '2026-09', equipment: 'TRACTOR_DRY_VAN_SINGLE',
    serviceDate: '2026-09-29', assetCostScope: 'TRACTOR_AND_TRAILER', separateCostFamilies: [], evidence: [source],
    exposure: { fleetTractors: datum(1, 'tractors'), totalKmPerFleetMonth: datum(10000, 'km/fleet-month'),
      productiveVehicleDaysPerFleetMonth: datum(20, 'vehicle-days/fleet-month') },
    assets: ['TRACTOR', 'DRY_VAN_TRAILER'].map(assetClass => ({ id: `${country}-${assetClass}`, assetClass,
      condition: 'NEW', tenure: 'OWNED_CASH', costBearer: 'CARRIER', quantity: datum(1, 'assets/fleet'),
      acquisitionCost: datum(100, 'USD/asset'), residual: datum(20, 'USD/asset'), horizon: datum(60, 'months'),
      horizonBasis: 'FROM_NEW', depreciationBasis: 'ECONOMIC_ESTIMATE', monthlyInterest: null,
      financingBasis: null, monthlyRent: null, rentCoveredFamilies: [] })),
    administration: { method: 'ROLE_DETAIL', combinedOverhead: null, roles: ADMIN_ROLES.map(role => ({ role,
      fte: datum(0.1, 'FTE/fleet'), compensationBasis: 'EMPLOYER_TOTAL', monthlyWage: datum(10, 'USD/FTE-month'), monthlyBenefits: null })) },
    driver: { compensationBasis: 'EMPLOYER_TOTAL', wage: datum(0.1, 'USD/km'), benefits: null },
  })
  return syncBoundary(PublicReferenceComponentsSchema.parse({ methodId: 'FCM_PUBLIC_REFERENCE_COMPONENTS_V1', core,
    components: PUBLIC_COMPONENT_KINDS.map(kind => ({ id: `${country}-${kind}`, kind, disposition: 'MODELED',
      costBearer: 'CARRIER', quantity: { min: 1, max: 2, unit: ['FUEL_PRICE'].includes(kind) ? 'USD/liter' :
        kind.includes('PERFORMANCE') ? 'km/liter' : ['MAINTENANCE', 'TIRES'].includes(kind) ? 'USD/km' : 'USD/fleet-month' },
      evidenceIds: ['synthetic'], derivation: 'Synthetic interval, not a confidence interval', includedItems: ['Synthetic scope'],
      excludedFamilies: families.filter(key => key !== (['FUEL_PRICE', 'LOADED_PERFORMANCE', 'EMPTY_PERFORMANCE'].includes(kind) ? 'FUEL' : kind)),
      zeroRationale: null, scopeRationale: null })),
    evidence: [{ ...source, snapshotSha256: 'a'.repeat(64),
      originalUnit: 'Synthetic multi-column table only', originalCurrency: 'USD' }],
    policies: { risk: { treatment: 'SEPARATE_NOT_PRICED', rationale: 'Synthetic risk not priced' },
      margin: { treatment: 'OUTSIDE_PRODUCTIVE_COST', rationale: 'Synthetic margin outside cost' } },
  }))
}
const codes = (input: PublicReferenceComponentsInput) => auditPublicReferenceComponents(input).issues.map(row => row.code)
function missing(input: PublicReferenceComponentsInput, kind: typeof PUBLIC_COMPONENT_KINDS[number]) {
  const row = input.components.find(row => row.kind === kind)!
  row.disposition = 'MISSING'; row.quantity = null; row.evidenceIds = []; row.derivation = null
  syncBoundary(input)
}

describe('public reference family coverage, no adoption', () => {
  it('accepts documented ranges structurally, never selects a midpoint or emits prices', () => {
    const report = auditPublicReferenceComponents(fixture())
    expect(report.status).toBe('COMPONENTS_COMPATIBLE_UNVERIFIED'); expect(report.issues).toEqual([])
    expect(report.coverage).toHaveLength(8)
    expect(report).toMatchObject({ calibrated: false, quoteReady: false, adoptedValues: 0,
      rates: null, cfuUsd: null, cvuUsd: null, purchaseCostUsd: null, sellPriceUsd: null })
    expect(report.pendingOperationalCoverage).toContain('Border/interchange')
  })
  it.each(['calibrated', 'quoteReady', 'reviewed', 'adoptedValues'])('rejects client approval field %s', field => {
    expect(() => auditPublicReferenceComponents({ ...fixture(), [field]: true })).toThrow()
  })
  it.each(PUBLIC_COMPONENT_KINDS)('does not omit required %s', kind => {
    const input = fixture(); missing(input, kind)
    expect(codes(input)).toContain('MISSING_COMPONENT')
  })
  it('rejects absence masquerading as zero or evidence', () => {
    const input = fixture(); input.components[0].disposition = 'MISSING'; syncBoundary(input)
    expect(codes(input)).toContain('MISSING_COMPONENT_HAS_VALUE_OR_REFERENCES')
  })
  it.each(['country', 'cohort', 'period', 'expiry', 'future', 'unknown', 'duplicate', 'hash'] as const)
    ('blocks incompatible supplement provenance: %s', mode => {
      const input = fixture()
      if (mode === 'country') input.evidence[0].country = 'US'
      if (mode === 'cohort') input.evidence[0].cohortId = 'OTHER'
      if (mode === 'period') input.evidence[0].referencePeriod = '2025-09'
      if (mode === 'expiry') input.evidence[0].validUntil = '2026-09-28'
      if (mode === 'future') input.evidence[0].observedAt = '2026-09-30'
      if (mode === 'unknown') input.components[0].evidenceIds = ['unknown']
      if (mode === 'duplicate') input.evidence.push(input.evidence[0])
      if (mode === 'hash') input.evidence[0].snapshotSha256 = null
      expect(auditPublicReferenceComponents(input).status).toBe('INCOMPLETE')
    })
  it.each(['PUBLIC_CONTRAST', 'TAX_RULE'] as const)('does not upgrade %s to an input', sourceKind => {
    const input = fixture(); input.evidence[0].sourceKind = sourceKind
    expect(codes(input)).toContain('CONTEXT_ONLY_SOURCE')
  })
  it.each(['unit', 'range', 'inclusion', 'exclusion', 'reference', 'derivation', 'bearer', 'oversize'] as const)
    ('blocks invalid component representation: %s', mode => {
      const input = fixture(); const row = input.components[0]
      if (mode === 'unit') row.quantity!.unit = 'USD/year'
      if (mode === 'range') row.quantity!.min = 3
      if (mode === 'inclusion') row.includedItems = []
      if (mode === 'exclusion') row.excludedFamilies = []
      if (mode === 'reference') row.evidenceIds.push('synthetic')
      if (mode === 'derivation') row.derivation = null
      if (mode === 'bearer') row.costBearer = 'XBF'
      if (mode === 'oversize') row.quantity!.max = Number.MAX_SAFE_INTEGER
      expect(auditPublicReferenceComponents(input).status).toBe('INCOMPLETE')
    })
  it('requires justification for zero, but never permits zero consumption performance', () => {
    const input = fixture(); input.components[0].quantity!.min = 0
    expect(codes(input)).toContain('ZERO_REQUIRES_RATIONALE')
    input.components[0].zeroRationale = 'Synthetic justified endpoint'
    expect(codes(input)).not.toContain('ZERO_REQUIRES_RATIONALE')
    input.components.find(row => row.kind === 'LOADED_PERFORMANCE')!.quantity!.min = 0
    expect(codes(input)).toContain('NON_POSITIVE_COMPONENT')
  })
  it('rejects duplicate component IDs and kinds', () => {
    const input = fixture(); input.components.push(input.components[0])
    expect(codes(input)).toEqual(expect.arrayContaining(['DUPLICATE_COMPONENT_ID', 'DUPLICATE_COMPONENT_KIND']))
  })
  it('does not let a caller hide rental side-cost overlap', () => {
    const input = fixture(); const asset = input.core.assets[0]
    asset.tenure = 'RENTED'; asset.rentCoveredFamilies = ['CAPITAL', 'MAINTENANCE']
    input.core.separateCostFamilies = []
    expect(codes(input)).toEqual(expect.arrayContaining(['COMPONENT_BOUNDARY_MISMATCH', 'RENT_COVERAGE_OVERLAP', 'RENT_FAMILY_ALREADY_COVERED']))
  })
  it('reuses compatible rental inclusions without adding maintenance twice', () => {
    const input = fixture(); const asset = input.core.assets[0]
    asset.tenure = 'RENTED'; asset.rentCoveredFamilies = ['CAPITAL', 'MAINTENANCE']
    asset.acquisitionCost = null; asset.residual = null; asset.horizon = null
    asset.horizonBasis = null; asset.depreciationBasis = null
    asset.monthlyRent = { value: 1, unit: 'USD/asset-month', evidenceIds: ['synthetic'], derivation: 'Synthetic only' }
    missing(input, 'MAINTENANCE')
    expect(auditPublicReferenceComponents(input).status).toBe('COMPONENTS_COMPATIBLE_UNVERIFIED')
    expect(auditPublicReferenceComponents(input).coverage.find(row => row.kind === 'MAINTENANCE')!.status).toBe('RENT_UNVERIFIED')
  })
  it('reuses combined overhead instead of inventing 46 corporate inputs', () => {
    const input = fixture()
    input.core.administration = { method: 'COMBINED_OVERHEAD', roles: [], combinedOverhead: {
      monthlyCost: { value: 1, unit: 'USD/fleet-month', evidenceIds: ['synthetic'], derivation: 'Synthetic only' },
      coveredFamilies: ['ADMIN_PAYROLL', 'COMPANY'], employerBenefitsIncluded: true,
      excludedFamilies: families.filter(key => !['ADMIN_PAYROLL', 'COMPANY'].includes(key)),
    } }
    expect(codes(input)).toContain('CORE_FAMILY_ALREADY_COVERED')
    missing(input, 'COMPANY')
    expect(auditPublicReferenceComponents(input).status).toBe('COMPONENTS_COMPATIBLE_UNVERIFIED')
    input.components.find(row => row.kind === 'COMPANY')!.quantity = { min: 0, max: 0, unit: 'USD/fleet-month' }
    expect(codes(input)).toContain('MISSING_COMPONENT_HAS_VALUE_OR_REFERENCES')
  })
  it('allows documented XBF working-capital scope exclusion, never a silent zero', () => {
    const input = fixture(); const row = input.components.find(row => row.kind === 'WORKING_CAPITAL')!
    row.disposition = 'OUTSIDE_SCOPE'; row.costBearer = 'XBF'; row.quantity = null; row.derivation = null
    row.scopeRationale = 'Synthetic XBF financing outside carrier productive cost'; syncBoundary(input)
    expect(auditPublicReferenceComponents(input).status).toBe('COMPONENTS_COMPATIBLE_UNVERIFIED')
    row.costBearer = 'CARRIER'
    expect(codes(input)).toContain('INVALID_SCOPE_EXCLUSION')
  })
  it.each(['risk', 'margin'] as const)('keeps unresolved %s policy explicit', policy => {
    const input = fixture(); input.policies[policy] = null
    expect(auditPublicReferenceComponents(input).status).toBe('INCOMPLETE')
  })
  it('preserves existing core validations instead of replacing them', () => {
    const input = fixture(); input.core.assets[0].condition = 'USED'
    expect(codes(input)).toContain('HORIZON_BASIS_MISMATCH')
    input.core.exposure.totalKmPerFleetMonth = null
    expect(codes(input)).toContain('MISSING_INPUT')
  })
  it('keeps shared-trailer allocation and national direction unresolved when incompatible', () => {
    const mx = fixture('MX'); const us = fixture('US')
    expect(auditD2DPublicReferenceComponents({ mx, us }).status).toBe('COMPONENTS_COMPATIBLE_UNVERIFIED')
    us.core.assets[1].id = mx.core.assets[1].id
    expect(auditD2DPublicReferenceComponents({ mx, us }).issues.map(row => row.code)).toContain('SHARED_ASSET_REQUIRES_SINGLE_ALLOCATION')
    expect(auditD2DPublicReferenceComponents({ mx: us, us: mx }).issues.map(row => row.code)).toContain('D2D_COUNTRY_MISMATCH')
  })
  it('loads real file ledgers without duplicating core or inventing values', () => {
    const base = resolve(__dirname, '../../../docs/research')
    const ledger = JSON.parse(readFileSync(resolve(base, 'B2_PUBLIC_REFERENCE_COMPONENTS_LEDGER_2026-09-29.json'), 'utf8'))
    const core = JSON.parse(readFileSync(resolve(base, ledger.coreTemplateFile), 'utf8'))
    const report = auditD2DPublicReferenceComponents(combinePublicReferenceLedger(ledger, core))
    expect(report.status).toBe('INCOMPLETE'); expect(report.adoptedValues).toBe(0)
    expect(report.mx.coverage.every(row => row.status === 'MISSING')).toBe(true)
    expect(report.us.coverage.every(row => row.status === 'MISSING')).toBe(true)
    ledger.profiles[1].country = 'MX'
    expect(() => combinePublicReferenceLedger(ledger, core)).toThrow('Expected exactly one MX and one US profile')
  })
  it.each(['../secret.json', 'D:\\private.json', 'https://example.org/core.json'])('rejects external template path %s', coreTemplateFile => {
    const ledger = JSON.parse(readFileSync(resolve(__dirname,
      '../../../docs/research/B2_PUBLIC_REFERENCE_COMPONENTS_LEDGER_2026-09-29.json'), 'utf8'))
    expect(PublicReferenceLedgerSchema.safeParse(ledger).success).toBe(true)
    expect(() => PublicReferenceLedgerSchema.parse({ ...ledger, coreTemplateFile })).toThrow()
  })
  it.each(['negative', 'nan', 'infinity', 'client-reviewed', 'wrong-equipment'] as const)
    ('rejects malformed input: %s', mode => {
      const input = fixture()
      if (mode === 'negative') input.components[0].quantity!.min = -1
      if (mode === 'nan') input.components[0].quantity!.max = Number.NaN
      if (mode === 'infinity') input.components[0].quantity!.max = Number.POSITIVE_INFINITY
      if (mode === 'client-reviewed') (input.components[0] as unknown as Record<string, unknown>).state = 'REVIEWED_REFERENCE'
      if (mode === 'wrong-equipment') (input.evidence[0] as unknown as Record<string, unknown>).equipment = 'REEFER'
      expect(() => auditPublicReferenceComponents(input)).toThrow()
    })
  it('does not silently exclude carrier cost, missing source or cash flow assumptions', () => {
    const input = fixture(); const row = input.components.find(row => row.kind === 'WORKING_CAPITAL')!
    row.disposition = 'OUTSIDE_SCOPE'; row.costBearer = 'XBF'; row.quantity = null; row.derivation = null
    row.scopeRationale = null; row.evidenceIds = []; syncBoundary(input)
    expect(codes(input)).toEqual(expect.arrayContaining(['INVALID_SCOPE_EXCLUSION', 'MISSING_EVIDENCE']))
  })
  it('rejects opposite reference dates through the existing D2D check', () => {
    const mx = fixture('MX'); const us = fixture('US'); us.core.serviceDate = '2026-09-28'
    expect(auditD2DPublicReferenceComponents({ mx, us }).issues.map(row => row.code)).toContain('D2D_DATE_MISMATCH')
  })
})
