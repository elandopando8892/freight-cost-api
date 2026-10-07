import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { calculateFacilityReferenceContrast, calculateStaffingReferenceContrast } from '../scripts/lib/reference-facility-staffing.js'
import { consolidateBinationalReferenceBudget } from '../scripts/consolidate-binational-reference-budget.js'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'
import { ADMIN_ROLES } from '../src/modules/engine/benchmark-payroll-capital-contract.js'

const dossier = JSON.parse(readLocalDocument('docs/research/B2_OFFICE_YARD_ADMIN_SCENARIOS_2026-10-01.json'))
const report = consolidateBinationalReferenceBudget()
const projection = report.supportingFacilityStaffing
const facility = dossier.facilityScenarios[0]
const staff = projection.staffingContrasts[2]

describe('explicit office/yard units and staffing contrasts, never fake whole overhead', () => {
  it.each(dossier.sources as { id: string; archive: { file: string; sha256: string } }[])('pins archive/readout and fails closed $id', source => {
    expect(createHash('sha256').update(readLocalDocument(source.archive.file)).digest('hex')).toBe(source.archive.sha256)
    expect(() => consolidateBinationalReferenceBudget(file => readLocalDocument(file) + (file === source.archive.file ? ' ' : '')))
      .toThrow(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
  })
  it.each(dossier.reusedPins as { file: string; sha256: string }[])('retains prior evidence $file', pin => {
    expect(createHash('sha256').update(readLocalDocument(pin.file)).digest('hex')).toBe(pin.sha256)
  })
  it('traces office price to the captured primary response, not a per-seat multiplier', () => {
    const source = readLocalDocument(dossier.sources[0].archive.file)
    expect(source).toContain('12,599')
    expect(source).toContain('MXN mensuales')
    expect(dossier.facilityObservations.office.monthlyBeforeVat.collaborativeTwoToThreePeople).toBe(12599)
    for (const scenario of projection.facilityContrasts) {
      const line = scenario.lines.find(l => l.economicExpenseId === 'MX_OFFICE_BUNDLE')!
      expect(line).toMatchObject({ quantity: 1, quantityUnit: 'OFFICE_MONTH', publishedMonthlyExtension: 12599, monthlyEconomicCost: null })
      expect(line.coveredServices).toEqual(expect.arrayContaining(['INTERNET', 'FIXED_PHONE', 'OFFICE_CLEANING', 'OFFICE_SECURITY']))
    }
  })
  it('retains separate alternative parking footprints and does not use the $60 car tariff', () => {
    const [combo, separate] = projection.facilityContrasts
    expect(combo.knownPublishedComponentsByCurrencyAndBasis).toEqual({ 'MXN:BEFORE_VAT': 12599, 'USD:TAX_FEES_UNKNOWN': 200 })
    expect(separate.knownPublishedComponentsByCurrencyAndBasis).toEqual({ 'MXN:BEFORE_VAT': 12599, 'USD:TAX_FEES_UNKNOWN': 325 })
    expect(dossier.facilityObservations.usYard).toMatchObject({ temporaryIntroductoryPrices: true, discountDurationMonths: null,
      nonPromotionalRates: null, actualPaymentMethod: null, publishedCreditCardFeeFraction: .03, officeAmenityNotPricedOrIncludedAsFree: true })
    expect(readLocalDocument(dossier.sources[1].archive.file)).toContain('temporary based on yard occupancy')
    expect(dossier.facilityObservations.usYard.footprintsFeet.trailer).toEqual([53, 12])
  })
  it('does not turn an unspecified MX rental period into USD/month or per-bay cost', () => {
    expect(dossier.facilityObservations.mxYard).toMatchObject({ askingAmount: 4000, hectares: 1, period: null,
      monthlyPrice: null, normalizedPerBay: null, samePropertyAsOtherYard: false, excludedFromMonthlyCalculations: true })
    for (const s of projection.facilityContrasts) {
      expect(s.missingPriceIds).toEqual(['MX_YARD_UNRESOLVED'])
      expect(s.lines.find(l => l.economicExpenseId === 'MX_YARD_UNRESOLVED')).toMatchObject({
        quantityUnit: 'YARD_LEASE_MONTH', publishedMonthlyExtension: null, monthlyEconomicCost: null })
      expect(s.completeMonthlyOverhead).toBeNull()
    }
  })
  it('does not read a fully booked zero checkout total as free yard parking', () => {
    expect(dossier.facilityObservations.secondaryContrastRejected).toMatchObject({
      publishedSubscriptionUsd: 150, directHttpArchiveStatus: 404, displayedAvailabilityTotalZeroIsNotPrice: true, includedInCalculations: false })
  })
  it.each([
    { quantity: undefined }, { quantity: 0 }, { quantity: 1.5 }, { quantity: -1 },
    { publishedMonthlyUnitPrice: Infinity }, { publishedMonthlyUnitPrice: -1 },
    { currency: 'EUR' }, { quantityUnit: 'PER_TRUCK' }, { priceBasis: 'EMPLOYER_TOTAL' },
  ])('rejects incompatible facility input %j', change => {
    const candidate = structuredClone(facility)
    Object.assign(candidate.lines[0], change)
    expect(() => calculateFacilityReferenceContrast(candidate)).toThrow()
  })
  it('rejects duplicate expense identity and service-scope overlap, including bundled phone', () => {
    const candidate = structuredClone(facility)
    candidate.lines.push({ ...candidate.lines[0] })
    expect(() => calculateFacilityReferenceContrast(candidate)).toThrow('DUPLICATE_FACILITY_EXPENSE')
    candidate.lines.at(-1).economicExpenseId = 'TELMEX_ALREADY_IN_OFFICE'
    candidate.lines.at(-1).coveredServices = ['INTERNET']
    expect(() => calculateFacilityReferenceContrast(candidate)).toThrow('FACILITY_SERVICE_OVERLAP')
  })
  it('rejects adding separate tractor parking to the same combo space coverage', () => {
    const candidate = structuredClone(facility)
    candidate.lines.push(dossier.facilityScenarios[1].lines[1])
    expect(() => calculateFacilityReferenceContrast(candidate)).toThrow('FACILITY_SERVICE_OVERLAP')
  })
  it('allows the same service at explicitly different sites, never silently global-deduplicates', () => {
    const candidate = structuredClone(facility)
    candidate.lines.push({ ...candidate.lines[0], economicExpenseId: 'ANOTHER_OFFICE', serviceScope: 'OTHER_SITE' })
    expect(calculateFacilityReferenceContrast(candidate).knownPublishedComponentsByCurrencyAndBasis['MXN:BEFORE_VAT']).toBe(25198)
  })
  it('keeps all seven administrative roles and unknown FTE distinct from zero', () => {
    for (const s of projection.staffingContrasts) {
      expect(s.roles.map(r => r.role)).toEqual([...ADMIN_ROLES])
      expect(s.roles.filter(r => r.fte === null).every(r => r.monthlySalaryComponent === null && r.status === 'UNRESOLVED_NOT_ZERO')).toBe(true)
      expect(s).toMatchObject({ actualFteCountsKnown: false, completeMonthlyAdminEmployerCost: null,
        coversContinuousOperations: false, eligibleForBudget: false, selected: false, fxConversionPerformed: false })
      expect(s.roles.every(r => r.monthlyEmployerCost === null && r.monthlyBenefits === null)).toBe(true)
    }
    expect(projection.staffingContrasts.map(s => s.unknownRoles.length)).toEqual([6, 6, 5])
  })
  it('computes MX one-monitor salary endpoints without asserting a full CS function or payroll burden', () => {
    expect(projection.staffingContrasts[0].knownSalaryComponentsOnly).toBe(15000)
    expect(projection.staffingContrasts[1].knownSalaryComponentsOnly).toBe(16000)
    const readout = JSON.parse(readLocalDocument(dossier.sources[3].archive.file))
    expect(readout.sources.find((s: { id: string }) => s.id === 'MX_TRACKING')).toMatchObject({
      mapping: 'SATELLITE_MONITORING_ONLY_NOT_COMPLETE_TRACKING_AND_CUSTOMER_SERVICE',
      shiftHoursPublished: 8, absolutePublicationDate: null, availabilityConfirmed: false })
  })
  it('reuses verified US wages, annual/12, with two explicitly assumed FTE only', () => {
    expect(staff.knownSalaryComponentsOnly).toBeCloseTo((54740 + 51070) / 12, 8)
    expect(staff.knownSalaryComponentsOnly).toBe(8817.5)
    expect(staff.rolesWithSalaryComponent).toBe(2)
    expect(staff.roles.find(r => r.role === 'SAFETY_MANAGER')).toMatchObject({ monthlyWageReference: 93860 / 12, fte: null })
    expect(dossier.policy).toMatchObject({ staffPerTruckInferred: false, benefitRatioFromOtherCohortApplied: false,
      officeAndSalaryLocationsHarmonized: false })
  })
  const staffInput = () => ({ scenarioId: staff.scenarioId, country: staff.country, currency: staff.currency,
    assumption: staff.assumption, illustrativeNotCarrierFacts: true,
    roles: staff.roles.map(({ role, fte, fteRationale, monthlyWageReference, wageBasis, sourceId }) =>
      ({ role, fte, fteRationale, monthlyWageReference, wageBasis, sourceId })) })
  it('rejects missing role, duplicate role, country/currency mismatch and carrier-fact claims', () => {
    const a = staffInput(); a.roles.pop()
    expect(() => calculateStaffingReferenceContrast(a)).toThrow()
    const b = staffInput(); b.roles[0].role = b.roles[1].role
    expect(() => calculateStaffingReferenceContrast(b)).toThrow('STAFFING_ROLE_COVERAGE_MISMATCH')
    expect(() => calculateStaffingReferenceContrast({ ...staffInput(), currency: 'MXN' })).toThrow('STAFFING_COUNTRY_CURRENCY_MISMATCH')
    expect(() => calculateStaffingReferenceContrast({ ...staffInput(), illustrativeNotCarrierFacts: false })).toThrow()
  })
  it('requires quantity and wage provenance rather than inventing staffing defaults', () => {
    const a = staffInput(); a.roles[0].fteRationale = null
    expect(() => calculateStaffingReferenceContrast(a)).toThrow('STAFFING_FTE_RATIONALE_REQUIRED')
    const b = staffInput(); b.roles[0].sourceId = null
    expect(() => calculateStaffingReferenceContrast(b)).toThrow('STAFFING_WAGE_PROVENANCE_REQUIRED')
    const c = staffInput(); c.roles[0].fte = -1
    expect(() => calculateStaffingReferenceContrast(c)).toThrow()
  })
  it('keeps a failed-search-only billing salary out of both MX arithmetic cases', () => {
    const readout = JSON.parse(readLocalDocument(dossier.sources[3].archive.file))
    expect(readout).toMatchObject({ capture: 'STRUCTURED_READOUT_NOT_ORIGINAL_HTTP_RESPONSE' })
    expect(readout.sources.find((s: { id: string }) => s.id === 'MX_BILLING_SEARCH_ONLY')).toMatchObject({ includedInCalculations: false })
    for (const s of projection.staffingContrasts.filter(s => s.country === 'MX')) {
      expect(s.roles.find(r => r.role === 'BILLING_ADMIN')).toMatchObject({ monthlyWageReference: null, monthlySalaryComponent: null })
    }
  })
  it('does not combine geographic wage proxies, currency/tax bases or incomplete families into CFU', () => {
    expect(projection).toMatchObject({ actualFleetSize: null, actualStaffingAndSiteKnown: false,
      facilityAndSalaryComponentsCombined: false, monthlyCompleteGroupPoolUsd: null, eligibleForBudget: false })
    expect(Object.values(report.outputs).every(v => v === null)).toBe(true)
    expect(report.originalBudgetBaseline).toMatchObject({ completeRows: 0, originalWorksheetModified: false })
    // Separate later US capital/insurance models do not complete this overhead pool.
    expect(report.authoritativeBudget).toMatchObject({ completeRows: 2, monthlyGroupTotalUsd: null, calibratedRows: 0 })
    const adminIndex=report.reviewedPublicModelBudget.expenses.findIndex(e=>e.economicExpenseId==='GROUP_ADMIN_COMPANY_SINGLE_POOL')
    expect(report.reviewedPublicModelBudget.expenses[adminIndex].amount).toBeNull()
    expect(report.authoritativeBudget.conditions).toContainEqual({field:`expenses.${adminIndex}`,code:'MISSING_MONTHLY_AMOUNT'})
    expect(report).toMatchObject({ adoptedValues: 0, calibrated: false, quoteReady: false, refreshedExternallyThisCut: false })
    expect(Object.values(report.externalChanges).every(v => v === false)).toBe(true)
  })
})
