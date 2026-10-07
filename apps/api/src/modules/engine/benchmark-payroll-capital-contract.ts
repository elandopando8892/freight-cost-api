import { z } from 'zod'
import { BenchmarkLegSchema } from './benchmark-leg.js'

const text = z.string().trim().min(1).max(2000)
const family = z.enum(['CAPITAL', 'ADMIN_PAYROLL', 'COMPANY', 'DRIVER', 'INSURANCE',
  'MAINTENANCE', 'TIRES', 'FUEL', 'TOLLS', 'WORKING_CAPITAL'])
const datum = (unit: string, positive = false) => z.object({
  value: positive ? z.number().finite().positive() : z.number().finite().nonnegative(),
  unit: z.literal(unit), evidenceIds: z.array(text).min(1), derivation: text,
}).strict().nullable()

export const ADMIN_ROLES = ['DISPATCHER', 'TRAFFIC_MANAGER', 'OPERATIONS_MANAGER',
  'SALES_MANAGER', 'SAFETY_MANAGER', 'TRACKING_CS', 'BILLING_ADMIN'] as const

/** Local methodology contract. No review/adoption status can be supplied by a client. */
export const PayrollCapitalContractSchema = z.object({
  methodId: z.literal('FCM_PAYROLL_CAPITAL_CONTRACT_V1'), baseRevision: text,
  country: z.enum(['MX', 'US']), cohortId: text, referencePeriod: text,
  equipment: z.literal('TRACTOR_DRY_VAN_SINGLE'),
  serviceDate: BenchmarkLegSchema.shape.serviceDate,
  assetCostScope: z.enum(['TRACTOR_ONLY', 'TRACTOR_AND_TRAILER']).nullable(),
  separateCostFamilies: z.array(family),
  evidence: z.array(BenchmarkLegSchema.shape.evidence.element.extend({
    cohortId: text, referencePeriod: text,
    sourceKind: z.enum(['PUBLIC_OBSERVATION', 'MODELED_ASSUMPTION', 'PUBLIC_CONTRAST', 'TAX_RULE']),
    applicabilityRationale: text,
  }).strict()),
  exposure: z.object({
    fleetTractors: datum('tractors', true),
    totalKmPerFleetMonth: datum('km/fleet-month', true),
    productiveVehicleDaysPerFleetMonth: datum('vehicle-days/fleet-month', true),
  }).strict(),
  assets: z.array(z.object({
    id: text, assetClass: z.enum(['TRACTOR', 'DRY_VAN_TRAILER']),
    condition: z.enum(['NEW', 'USED']).nullable(),
    tenure: z.enum(['OWNED_CASH', 'OWNED_FINANCED', 'RENTED']).nullable(),
    costBearer: z.enum(['CARRIER', 'OTHER']).nullable(),
    quantity: datum('assets/fleet', true), acquisitionCost: datum('USD/asset', true),
    residual: datum('USD/asset'), horizon: datum('months', true),
    horizonBasis: z.enum(['FROM_NEW', 'REMAINING_FROM_ACQUISITION']).nullable(),
    depreciationBasis: z.enum(['ECONOMIC_ESTIMATE', 'CARRIER_BOOK_POLICY', 'TAX_SCHEDULE']).nullable(),
    monthlyInterest: datum('USD/asset-month'),
    financingBasis: z.enum(['INTEREST_ONLY', 'TOTAL_LOAN_PAYMENT']).nullable(),
    monthlyRent: datum('USD/asset-month'), rentCoveredFamilies: z.array(family),
  }).strict()).max(50),
  administration: z.object({
    method: z.enum(['ROLE_DETAIL', 'COMBINED_OVERHEAD']).nullable(),
    roles: z.array(z.object({
      role: z.enum(ADMIN_ROLES), fte: datum('FTE/fleet'),
      compensationBasis: z.enum(['WAGES_ONLY', 'EMPLOYER_TOTAL']).nullable(),
      monthlyWage: datum('USD/FTE-month'), monthlyBenefits: datum('USD/FTE-month'),
    }).strict()),
    combinedOverhead: z.object({
      monthlyCost: datum('USD/fleet-month'), coveredFamilies: z.array(family),
      excludedFamilies: z.array(family), employerBenefitsIncluded: z.boolean(),
    }).strict().nullable(),
  }).strict(),
  driver: z.object({
    compensationBasis: z.enum(['WAGES_ONLY', 'EMPLOYER_TOTAL']).nullable(),
    wage: datum('USD/km'), benefits: datum('USD/km'),
  }).strict(),
}).strict()

export type PayrollCapitalContractInput = z.infer<typeof PayrollCapitalContractSchema>
type Issue = { field: string; code: string }

/** Checks representations and provenance only; deliberately emits no price or adopted rate. */
export function auditPayrollCapitalContract(raw: unknown) {
  const input = PayrollCapitalContractSchema.parse(raw)
  const issues: Issue[] = []
  const add = (field: string, code: string) => issues.push({ field, code })
  const sources = new Map(input.evidence.map(source => [source.id, source]))
  if (sources.size !== input.evidence.length) add('evidence', 'DUPLICATE_EVIDENCE')
  if (new Set(input.separateCostFamilies).size !== input.separateCostFamilies.length) add('separateCostFamilies', 'DUPLICATE_FAMILY')
  const checkDatum = (field: string, value: z.infer<ReturnType<typeof datum>>, samePeriod = false) => {
    if (!value) { add(field, 'MISSING_INPUT'); return }
    if (value.value > Number.MAX_SAFE_INTEGER / 100) add(field, 'NUMERIC_RANGE_EXCEEDED')
    if (new Set(value.evidenceIds).size !== value.evidenceIds.length) add(field, 'DUPLICATE_REFERENCE')
    for (const id of value.evidenceIds) {
      const source = sources.get(id)
      if (!source) { add(field, 'MISSING_EVIDENCE'); continue }
      if (source.country !== input.country || source.equipment !== input.equipment || source.cohortId !== input.cohortId) add(field, 'EVIDENCE_SCOPE_MISMATCH')
      if (source.validFrom > source.validUntil || source.observedAt > input.serviceDate ||
          source.validFrom > input.serviceDate || source.validUntil < input.serviceDate) add(field, 'EVIDENCE_OUTSIDE_VALIDITY')
      if (samePeriod && source.referencePeriod !== input.referencePeriod) add(field, 'EXPOSURE_PERIOD_MISMATCH')
      if (source.sourceKind === 'PUBLIC_CONTRAST' || source.sourceKind === 'TAX_RULE') add(field, 'CONTEXT_ONLY_SOURCE')
    }
  }
  const compensation = (field: string, basis: 'WAGES_ONLY' | 'EMPLOYER_TOTAL' | null,
    wage: z.infer<ReturnType<typeof datum>>, benefits: z.infer<ReturnType<typeof datum>>) => {
    if (!basis) add(field, 'MISSING_COMPENSATION_BASIS')
    checkDatum(`${field}.wage`, wage)
    if (basis === 'WAGES_ONLY') checkDatum(`${field}.benefits`, benefits)
    if (basis === 'EMPLOYER_TOTAL' && benefits !== null) add(field, 'BENEFITS_ALREADY_INCLUDED')
  }

  if (!input.assetCostScope) add('assetCostScope', 'MISSING_ASSET_SCOPE')
  for (const [field, value] of Object.entries(input.exposure)) checkDatum(`exposure.${field}`, value, true)
  const tractors = input.exposure.fleetTractors?.value
  const vehicleDays = input.exposure.productiveVehicleDaysPerFleetMonth?.value
  // Exposure and fixed overhead are monthly fleet amounts, not arbitrary annual
  // statistics. Resolve the actual calendar capacity without assuming 31 days.
  const period = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(input.referencePeriod)
  const daysInMonth = period ? new Date(Date.UTC(Number(period[1]), Number(period[2]), 0)).getUTCDate() : null
  if (daysInMonth === null) add('referencePeriod', 'MONTHLY_REFERENCE_PERIOD_REQUIRED')
  if (tractors !== undefined && !Number.isInteger(tractors)) add('exposure.fleetTractors', 'NON_INTEGER_ASSET_COUNT')
  if (tractors !== undefined && vehicleDays !== undefined && daysInMonth !== null && vehicleDays > tractors * daysInMonth) add('exposure', 'EXCEEDS_VEHICLE_MONTH')
  if (new Set(input.assets.map(asset => asset.id)).size !== input.assets.length) add('assets', 'DUPLICATE_ASSET')
  const expectedClasses = input.assetCostScope === 'TRACTOR_AND_TRAILER' ? ['TRACTOR', 'DRY_VAN_TRAILER'] : ['TRACTOR']
  for (const assetClass of expectedClasses) {
    if (input.assets.filter(asset => asset.assetClass === assetClass).length !== 1) add('assets', `REQUIRE_ONE_${assetClass}_COHORT`)
  }
  input.assets.forEach((asset, index) => {
    const field = `assets.${index}`
    if (input.assetCostScope === 'TRACTOR_ONLY' && asset.assetClass === 'DRY_VAN_TRAILER') add(field, 'ASSET_OUTSIDE_SCOPE')
    if (asset.costBearer !== 'CARRIER') add(field, 'UNRESOLVED_COST_RESPONSIBILITY')
    if (!asset.condition || !asset.tenure) add(field, 'MISSING_ASSET_PROFILE')
    checkDatum(`${field}.quantity`, asset.quantity)
    if (asset.quantity && !Number.isInteger(asset.quantity.value)) add(field, 'NON_INTEGER_ASSET_COUNT')
    if (asset.assetClass === 'TRACTOR' && asset.quantity?.value !== tractors) add(field, 'TRACTOR_COUNT_MISMATCH')
    if (asset.tenure === 'RENTED') {
      checkDatum(`${field}.monthlyRent`, asset.monthlyRent)
      if (!asset.rentCoveredFamilies.includes('CAPITAL')) add(field, 'RENT_CAPITAL_SCOPE_MISSING')
      if (new Set(asset.rentCoveredFamilies).size !== asset.rentCoveredFamilies.length) add(field, 'DUPLICATE_RENT_FAMILY')
      if (asset.rentCoveredFamilies.some(covered => input.separateCostFamilies.includes(covered))) add(field, 'RENT_COVERAGE_OVERLAP')
      if (asset.rentCoveredFamilies.some(covered => ['ADMIN_PAYROLL', 'COMPANY', 'DRIVER'].includes(covered))) add(field, 'RENT_PAYROLL_OVERLAP')
      if (asset.acquisitionCost || asset.residual || asset.horizon || asset.monthlyInterest || asset.horizonBasis || asset.depreciationBasis || asset.financingBasis) add(field, 'RENT_AND_OWNERSHIP_MIXED')
    } else if (asset.tenure) {
      checkDatum(`${field}.acquisitionCost`, asset.acquisitionCost)
      checkDatum(`${field}.residual`, asset.residual)
      checkDatum(`${field}.horizon`, asset.horizon)
      if (!asset.depreciationBasis) add(field, 'MISSING_DEPRECIATION_BASIS')
      if (asset.depreciationBasis === 'TAX_SCHEDULE') add(field, 'TAX_LIFE_NOT_ECONOMIC')
      const expected = asset.condition === 'NEW' ? 'FROM_NEW' : 'REMAINING_FROM_ACQUISITION'
      if (asset.horizonBasis !== expected) add(field, 'HORIZON_BASIS_MISMATCH')
      if (asset.horizon && !Number.isInteger(asset.horizon.value)) add(field, 'NON_INTEGER_HORIZON')
      if (asset.residual && asset.acquisitionCost && asset.residual.value > asset.acquisitionCost.value) add(field, 'RESIDUAL_EXCEEDS_COST')
      if (asset.monthlyRent || asset.rentCoveredFamilies.length) add(field, 'RENT_AND_OWNERSHIP_MIXED')
      if (asset.tenure === 'OWNED_FINANCED') {
        checkDatum(`${field}.monthlyInterest`, asset.monthlyInterest)
        if (asset.financingBasis !== 'INTEREST_ONLY') add(field, 'PRINCIPAL_OR_UNDEFINED_FINANCING')
      } else if (asset.monthlyInterest || asset.financingBasis) add(field, 'CASH_AND_FINANCING_MIXED')
    }
  })
  const admin = input.administration
  if (!admin.method) add('administration', 'MISSING_ADMINISTRATION_METHOD')
  if (admin.method === 'ROLE_DETAIL') {
    if (admin.combinedOverhead) add('administration', 'OVERHEAD_AND_ROLE_DETAIL_MIXED')
    if (input.separateCostFamilies.includes('ADMIN_PAYROLL')) add('administration', 'PAYROLL_COVERAGE_OVERLAP')
    for (const role of ADMIN_ROLES) if (admin.roles.filter(row => row.role === role).length !== 1) add('administration.roles', `REQUIRE_ONE_${role}`)
    admin.roles.forEach((role, index) => {
      checkDatum(`administration.roles.${index}.fte`, role.fte)
      compensation(`administration.roles.${index}`, role.compensationBasis, role.monthlyWage, role.monthlyBenefits)
    })
  } else if (admin.method === 'COMBINED_OVERHEAD') {
    const overhead = admin.combinedOverhead
    if (admin.roles.length) add('administration', 'OVERHEAD_AND_ROLE_DETAIL_MIXED')
    if (!overhead) add('administration.combinedOverhead', 'MISSING_INPUT')
    else {
      checkDatum('administration.combinedOverhead.monthlyCost', overhead.monthlyCost, true)
      if (overhead.coveredFamilies.length !== 2 || !['ADMIN_PAYROLL', 'COMPANY'].every(key => overhead.coveredFamilies.includes(key as z.infer<typeof family>))) add('administration', 'OVERHEAD_SCOPE_MISMATCH')
      if (!overhead.employerBenefitsIncluded) add('administration', 'OVERHEAD_BENEFITS_UNRESOLVED')
      const excluded = ['CAPITAL', 'DRIVER', 'INSURANCE', 'MAINTENANCE', 'TIRES', 'FUEL', 'TOLLS', 'WORKING_CAPITAL'] as const
      if (!excluded.every(key => overhead.excludedFamilies.includes(key)) || overhead.excludedFamilies.some(key => overhead.coveredFamilies.includes(key))) add('administration', 'OVERHEAD_EXCLUSIONS_INCOMPLETE')
      if (overhead.coveredFamilies.some(key => input.separateCostFamilies.includes(key))) add('administration', 'OVERHEAD_COVERAGE_OVERLAP')
    }
  }
  compensation('driver', input.driver.compensationBasis, input.driver.wage, input.driver.benefits)
  if (input.separateCostFamilies.includes('DRIVER') || input.separateCostFamilies.includes('CAPITAL')) add('separateCostFamilies', 'CORE_COST_COVERAGE_OVERLAP')
  return { methodId: input.methodId, status: issues.length ? 'INCOMPLETE' as const : 'CONTRACT_COMPATIBLE_UNVERIFIED' as const,
    issues, calibrated: false as const, quoteReady: false as const, adoptedValues: 0,
    monthlyFixedUsd: null, cfuUsd: null, cvuUsd: null, purchaseCostUsd: null, sellPriceUsd: null,
    lineage: input }
}

/** A physical trailer crossing the border cannot be charged fully to both reference legs. */
export function auditD2DPayrollCapitalContracts(raw: { mx: unknown; us: unknown }) {
  const mx = auditPayrollCapitalContract(raw.mx)
  const us = auditPayrollCapitalContract(raw.us)
  const issues: Issue[] = [...mx.issues.map(issue => ({ ...issue, field: `mx.${issue.field}` })),
    ...us.issues.map(issue => ({ ...issue, field: `us.${issue.field}` }))]
  if (mx.lineage.country !== 'MX' || us.lineage.country !== 'US') issues.push({ field: 'country', code: 'D2D_COUNTRY_MISMATCH' })
  if (mx.lineage.serviceDate !== us.lineage.serviceDate) issues.push({ field: 'serviceDate', code: 'D2D_DATE_MISMATCH' })
  const mxAssets = new Set(mx.lineage.assets.map(asset => asset.id))
  for (const asset of us.lineage.assets) if (mxAssets.has(asset.id)) issues.push({ field: asset.id, code: 'SHARED_ASSET_REQUIRES_SINGLE_ALLOCATION' })
  return { status: issues.length ? 'INCOMPLETE' as const : 'CONTRACT_COMPATIBLE_UNVERIFIED' as const,
    issues, mx, us, calibrated: false as const, quoteReady: false as const, adoptedValues: 0 }
}
