import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ADMIN_ROLES, PayrollCapitalContractSchema, auditPayrollCapitalContract } from '../src/modules/engine/benchmark-payroll-capital-contract.js'
import { benchmarkRateRequirements } from '../src/modules/engine/benchmark-rates.js'
import { parseBenchmarkEvidenceRegister } from '../src/modules/engine/benchmark-evidence-inventory.js'

const research = fileURLToPath(new URL('../../../docs/research/', import.meta.url))
const load = (file: string) => JSON.parse(readFileSync(resolve(research, file), 'utf8'))
const d = load('B2_LABOR_COMPENSATION_BRIDGE_2026-09-29.json')

describe('public operator and administrative compensation bridge', () => {
  it('records the directly read MX dry-van ad without certifying freshness or payroll', () => {
    expect(d.sources[0]).toMatchObject({ capture: 'WEB_READER_DIRECT_URL_TEXT',
      publicationDate: null, currentVacancyAvailabilityVerified: false })
    expect(d.mxDriver.offer).toMatchObject({ ratePerPaidLoadedKm: 2.1, ratePerPaidEmptyKm: 2.1,
      monthlyGroceryVouchers: 3430, payIsGrossOrNet: null, pilotApplicabilityConfirmed: false })
  })
  it('preserves conflicting annual salary instead of silently treating it as monthly fixed pay', () => {
    expect(d.mxDriver.offer.headerSalary).toMatchObject({ publishedPeriod: 'ANNUAL',
      periodConflict: true, inferredMonthlySalary: null })
    expect(d.mxDriver.offer.guaranteeOrAdditionalFixedWage).toBeNull()
  })
  it('normalizes the announced wage alone, not total employer cost or USD', () => {
    expect(d.mxDriver.normalizedWageOnlyMxnPerPaidMile).toBeCloseTo(2.1 * 1.60934, 10)
    expect(d.mxDriver.offer.currencyBasis).toBe('INFERRED_FROM_EXPLICIT_PAGE_SALARY_CURRENCY')
    expect(d.mxDriver.driverUsdPerKm).toBeNull()
    expect(d.mxDriver.employerTotalMxnPerKm).toBeNull()
  })
  it('keeps paid mileage distinct from physical vehicle exposure', () => {
    expect(d.mxDriver.equations.partialPackage).toContain('paidLoadedKm')
    expect(d.mxDriver.equations.partialPackage).toContain('eligibleOperatorMonths')
    expect(d.mxDriver.equations.vehicleRate).toContain('samePeriodVehicleKm')
    // Unit/allocation regression only. Synthetic exposure, not public productivity.
    const paidKm = 8000, vehicleKm = 10000
    const partial = 2.1 * paidKm + 3430
    expect(partial / vehicleKm).toBeCloseTo(2.023, 10)
    expect(partial / vehicleKm).not.toBeCloseTo(2.1 + 3430 / paidKm, 8)
  })
  it('does not append salary from another ad or unknown statutory costs as zero', () => {
    expect(d.mxDriver.equations.advertisedWages).toContain('no extra salary')
    expect(d.mxDriver.requiredPublicModelAssumptions).toHaveLength(4)
    expect(Object.values(d.outputs).every(v => v === null)).toBe(true)
  })
  it('retains the BLS sector row and its published rounding discrepancy', () => {
    const r = d.usSectorBenefitContrast
    expect(r).toMatchObject({ wages: 32.95, benefits: 16.90, total: 49.86,
      referencePeriod: '2026-June', transferredToDriverOrAdmin: false })
    expect(r.wages + r.benefits).toBeCloseTo(49.85, 10)
    expect(r.total - r.wages - r.benefits).toBeCloseTo(0.01, 10)
    expect(Object.values(r.benefitComponents).reduce((a: number, b: any) => a + b, 0)).toBeCloseTo(r.benefits, 10)
  })
  it('does not confuse benefits share of total with a markup on wages', () => {
    const r = d.usSectorBenefitContrast
    expect(r.benefitToWageRatio).toBeCloseTo(16.9 / 32.95, 12)
    expect(r.benefitToTotalRatio).toBeCloseTo(16.9 / 49.86, 12)
    expect(r.benefitToWageRatio).not.toBeCloseTo(0.339, 3)
    expect(r.legallyRequiredAlreadyInsideBenefits).toBe(true)
  })
  it('does not pool OEWS wage, ECEC benefits and ATRI exposure into a false observed driver cost', () => {
    expect(d.usDriver.blsWageMedian).toMatchObject({ annualUsd: 60320,
      referencePeriod: '2025-May', convertedUsingAtriMiles: false, employerTotal: false })
    expect(d.usDriver.historicalTruckloadRateRange).toMatchObject({
      selectedFleetSizeGroup: null, completeEmployerCostConfirmed: false, extraEcecBenefitsAdded: false })
    expect(d.usDriver.employerTotalUsdPerKm).toBeNull()
  })
  it('normalizes historical group endpoints without making them a confidence interval', () => {
    const r = d.usDriver.historicalTruckloadRateRange
    expect(r.minUsdPerKm).toBeCloseTo(0.790 / 1.60934, 12)
    expect(r.maxUsdPerKm).toBeCloseTo(1.058 / 1.60934, 12)
    expect(r.kind).toBe('BETWEEN_FLEET_SIZE_GROUPS_NOT_CONFIDENCE_INTERVAL')
  })
  it('records employer-only federal rates without defaulting effective FUTA or state charges', () => {
    expect(d.usFederalRules).toMatchObject({ year: 2026, employerSocialSecurityRate: 0.062,
      socialSecurityAnnualTaxableWageCap: 184500, employerMedicareRate: 0.0145,
      additionalMedicareEmployerShare: 0, futaGrossRate: 0.06, futaAnnualTaxableWageCap: 7000,
      maximumCreditAssumed: false, effectiveFutaRate: null, stateUnemploymentRate: null,
      workersCompensationRate: null, addedToAtriOrEcecBenefits: false })
  })
  it('tests the Social Security cap incrementally, not against a fresh annual cap each month', () => {
    // Covered taxable wages below are synthetic boundary checks, not carrier payroll.
    const ss = (current: number, prior: number) => d.usFederalRules.employerSocialSecurityRate *
      Math.min(current, Math.max(d.usFederalRules.socialSecurityAnnualTaxableWageCap - prior, 0))
    expect(ss(10000, 180000)).toBeCloseTo(279, 10)
    expect(ss(10000, 184500)).toBe(0)
    expect(ss(10000, 0)).toBeCloseTo(620, 10)
    expect(10000 * d.usFederalRules.employerMedicareRate).toBeCloseTo(145, 10)
  })
  it('maps all seven administrative roles and fourteen canonical keys without invented FTE', () => {
    expect(d.administration.roles.map((r: any) => r.role)).toEqual([...ADMIN_ROLES])
    const register = parseBenchmarkEvidenceRegister(readFileSync(resolve(research, '../C1_B1_PARAMETER_SOURCE_REGISTER_2026-09-29.md'), 'utf8'))
    const keys = d.administration.roles.flatMap((r: any) => [r.quantityKey, r.wageKey])
    expect(new Set(keys).size).toBe(14)
    expect([...keys].sort()).toEqual(register.filter(r => r.section === 'COST_PAYROLL').map(r => r.key).sort())
    expect(d.administration.roles.every((r: any) => r.mxFte === null && r.usFte === null &&
      r.mxEmployerMonthlyUsdPerFte === null && r.usEmployerMonthlyUsdPerFte === null &&
      r.proxyValuesReusedAsCarrierCost === false)).toBe(true)
  })
  it.each(['MX', 'US'] as const)('keeps %s driver dependency separate from administrative carga social', country => {
    const requirements = benchmarkRateRequirements(country)
    expect(requirements.driverUsdPerKm).toEqual([d.engineBridge['labor' + country].key])
    expect(requirements.monthlyFixedUsd).toContain('fcm.v3.labor.carga-social')
    expect(requirements.driverUsdPerKm).not.toContain('fcm.v3.labor.carga-social')
    expect(d.engineBridge.adminBurden.defaultThirtyPercentAdopted).toBe(false)
  })
  it('reuses contract rejection of a public contrast with benefits unknown', () => {
    const template = load('B2_PAYROLL_CAPITAL_CONTRACT_TEMPLATE_2026-09-29.json').contracts[0]
    const input = structuredClone(template)
    input.evidence = [{ id: 'public-wage', url: d.sources[0].url, locator: 'Partial ad, not total cost',
      observedAt: '2026-09-29', validFrom: '2026-09-29', validUntil: '2026-09-29',
      country: input.country, cohortId: input.cohortId, referencePeriod: input.referencePeriod,
      equipment: input.equipment, sourceKind: 'PUBLIC_CONTRAST', applicabilityRationale: 'Synthetic metadata for rejection test only; no economic validity certified.',
      limitations: 'No FX or total benefits' }]
    // Hypothetical normalized amount solely for rejection behavior, not public conversion.
    input.driver = { compensationBasis: 'WAGES_ONLY', wage: { value: 0.1,
      unit: 'USD/km', evidenceIds: ['public-wage'], derivation: 'Synthetic test only' }, benefits: null }
    const report = auditPayrollCapitalContract(input)
    expect(report.issues).toContainEqual({ field: 'driver.wage', code: 'CONTEXT_ONLY_SOURCE' })
    expect(report.issues).toContainEqual({ field: 'driver.benefits', code: 'MISSING_INPUT' })
    expect(report).toMatchObject({ calibrated: false, quoteReady: false, adoptedValues: 0 })
  })
  it('rejects the MX monetary unit instead of pretending a raw rate is USD/km', () => {
    const input = structuredClone(load('B2_PAYROLL_CAPITAL_CONTRACT_TEMPLATE_2026-09-29.json').contracts[0])
    input.driver.wage = { value: 2.1, unit: 'MXN/km', evidenceIds: ['public-wage'], derivation: 'Raw announced wage' }
    expect(() => PayrollCapitalContractSchema.parse(input)).toThrow()
  })
  it('excludes a job-specific search snapshot that redirects to a generic page', () => {
    expect(d.rejectedCandidate.directResolvedUrl).toBe('https://www.ruan.com/careers/careers-drivers')
    expect(d.sources.some((s: any) => s.id === 'RUAN_JOB')).toBe(false)
  })
  it('keeps all business gates open and quantities out of governed bases', () => {
    expect(d).toMatchObject({ calibrated: false, quoteReady: false, adoptedValues: 0 })
    expect(d.decision).toMatchObject({ B2: 'PARTIAL', businessGatesClosed: 0, businessGatesTotal: 4 })
    expect(d.administration.sharedBurdenAdopted).toBeNull()
    expect(d.mxDriver.administrativeBurdenTransferred).toBe(false)
  })
  it.each(d.unchangedFiles)('preserves $file', ({ file, sha256 }: any) => {
    expect(createHash('sha256').update(readFileSync(resolve(research, file))).digest('hex')).toBe(sha256)
  })
})
