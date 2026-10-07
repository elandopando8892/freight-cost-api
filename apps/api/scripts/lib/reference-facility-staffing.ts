import { z } from 'zod'
import { ADMIN_ROLES } from '../../src/modules/engine/benchmark-payroll-capital-contract.js'

const text = z.string().trim().min(1).max(2000)
const amount = z.number().finite().nonnegative().max(1e9)
const facilitySchema = z.object({
  scenarioId: text, assumption: text, illustrativeNotCarrierFacts: z.literal(true),
  lines: z.array(z.object({
    economicExpenseId: text, serviceScope: text, sourceId: text,
    quantity: z.number().int().positive().max(10000),
    quantityUnit: z.enum(['OFFICE_MONTH', 'PARKING_SPACE_MONTH', 'YARD_LEASE_MONTH']),
    currency: z.enum(['MXN', 'USD']), publishedMonthlyUnitPrice: amount.nullable(),
    priceBasis: z.enum(['BEFORE_VAT', 'TAX_FEES_UNKNOWN']),
    coveredServices: z.array(text).min(1),
  }).strict()).min(1).max(50),
}).strict()

/** Research contrast only: quantities are declared scenarios, not inferred from
 * fleet size or adopted defaults. Separate money bases are never combined. */
export function calculateFacilityReferenceContrast(raw: unknown) {
  const input = facilitySchema.parse(raw)
  const expenseIds = new Set<string>()
  const covered = new Set<string>()
  const subtotals: Record<string, number> = {}
  const lines = input.lines.map(line => {
    if (expenseIds.has(line.economicExpenseId)) throw new Error('DUPLICATE_FACILITY_EXPENSE')
    expenseIds.add(line.economicExpenseId)
    for (const service of line.coveredServices) {
      const key = JSON.stringify([line.serviceScope, service])
      if (covered.has(key)) throw new Error('FACILITY_SERVICE_OVERLAP')
      covered.add(key)
    }
    const publishedMonthlyExtension = line.publishedMonthlyUnitPrice === null
      ? null : line.quantity * line.publishedMonthlyUnitPrice
    if (publishedMonthlyExtension !== null) {
      const key = `${line.currency}:${line.priceBasis}`
      subtotals[key] = (subtotals[key] ?? 0) + publishedMonthlyExtension
    }
    return { ...line, publishedMonthlyExtension, monthlyEconomicCost: null }
  })
  return { ...input, lines, knownPublishedComponentsByCurrencyAndBasis: subtotals,
    missingPriceIds: lines.filter(l => l.publishedMonthlyExtension === null).map(l => l.economicExpenseId),
    classification: 'ILLUSTRATIVE_PUBLISHED_COMPONENTS_NOT_COMPLETE_FACILITY_BUDGET',
    completeMonthlyOverhead: null, fxConversionPerformed: false, eligibleForBudget: false, selected: false }
}

const staffingSchema = z.object({
  scenarioId: text, country: z.enum(['MX', 'US']), currency: z.enum(['MXN', 'USD']),
  assumption: text, illustrativeNotCarrierFacts: z.literal(true),
  roles: z.array(z.object({ role: z.enum(ADMIN_ROLES), fte: z.number().finite().min(0).max(10000).nullable(),
    fteRationale: text.nullable(), monthlyWageReference: amount.nullable(),
    wageBasis: z.enum(['WORKER_WAGES_ONLY', 'ADVERTISED_SALARY_BASIS_UNRESOLVED']).nullable(),
    sourceId: text.nullable(),
  }).strict()).length(ADMIN_ROLES.length),
}).strict()

export function calculateStaffingReferenceContrast(raw: unknown) {
  const input = staffingSchema.parse(raw)
  if ((input.country === 'MX' ? 'MXN' : 'USD') !== input.currency) throw new Error('STAFFING_COUNTRY_CURRENCY_MISMATCH')
  if (new Set(input.roles.map(r => r.role)).size !== ADMIN_ROLES.length) throw new Error('STAFFING_ROLE_COVERAGE_MISMATCH')
  let knownSalaryComponentsOnly = 0
  const roles = input.roles.map(row => {
    if (row.fte !== null && row.fteRationale === null) throw new Error('STAFFING_FTE_RATIONALE_REQUIRED')
    if (row.monthlyWageReference !== null && (!row.sourceId || !row.wageBasis)) throw new Error('STAFFING_WAGE_PROVENANCE_REQUIRED')
    const monthlySalaryComponent = row.fte === null || row.monthlyWageReference === null
      ? null : row.fte * row.monthlyWageReference
    if (monthlySalaryComponent !== null) knownSalaryComponentsOnly += monthlySalaryComponent
    return { ...row, monthlySalaryComponent, monthlyBenefits: null, monthlyEmployerCost: null,
      status: monthlySalaryComponent === null ? 'UNRESOLVED_NOT_ZERO' : 'SALARY_COMPONENT_NOT_EMPLOYER_TOTAL' }
  })
  return { ...input, roles, knownSalaryComponentsOnly,
    rolesWithSalaryComponent: roles.filter(r => r.monthlySalaryComponent !== null).length,
    unknownRoles: roles.filter(r => r.monthlySalaryComponent === null).map(r => r.role),
    completeMonthlyAdminEmployerCost: null, coversContinuousOperations: false,
    classification: 'ILLUSTRATIVE_STAFFING_SALARY_COMPONENTS_NOT_FULL_ADMIN_PAYROLL',
    actualFteCountsKnown: false, eligibleForBudget: false, selected: false, fxConversionPerformed: false }
}
