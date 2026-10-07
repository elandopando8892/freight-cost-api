import { createHash } from 'node:crypto'
import { z } from 'zod'
import { readLocalDocument } from '../assemble-economic-reference-cards.js'
import { readB2BenefitsEvidence } from './b2-recurring-benefits.js'
import { calculateMx2026ContributionReference } from './reference-mx-variable-driver.js'
import { calculateBinationalBudgetCostProjection, PILOT_VARIABLE_CONCEPTS } from '../../src/modules/engine/benchmark-binational-cost-projection.js'
import type { BinationalCostProjectionSchema } from '../../src/modules/engine/benchmark-binational-cost-projection.js'
import type { reviewB2SeptemberLabor } from '../review-b2-september-labor.js'

export const B2_PLANNING_POLICY_PIN = { id: 'b2AuthorizedPlanningPolicy',
  file: 'docs/research/B2_AUTHORIZED_PLANNING_POLICY_2026-10-04.json',
  sha256: '0292435008061196cbfafdbef8bcf8f0815435b8f6bcfb65bac84ed754fe6bf3',
  hashPolicy: 'UTF8_CRLF_TO_LF_NO_OTHER_NORMALIZATION' } as const
export const B2_SEPTEMBER_BASELINE_SHA256 = '29619c11dc85e4b626bcd617ab1b60f750a10a819e1fb1e3833d67b19f014e57'

const policySchema = z.object({ model: z.literal('FCM_B2_AUTHORIZED_PUBLIC_PLANNING_POLICY_V1'),
  referencePeriod: z.literal('2026-09'), recordedOn: z.literal('2026-10-04'),
  authorization: z.object({ reference: z.literal('user-question-reply:call_vH5D4gZiXUgH7xad8FFvSK1q:0'),
    answer: z.literal('Autorizar escenario de planeación explícito'),
    scope: z.literal('PUBLIC_PLANNING_VALIDATION_ONLY_NOT_OPERATIONAL_CALIBRATION_OR_ADOPTION'),
    hashAuthenticatesConsent: z.literal(false) }).strict(),
  mxInspections: z.object({ tractorGrossMxn: z.literal(800), emissionsGrossMxn: z.literal(403.12), boxGrossMxn: z.literal(700),
    tractorEventsPerYear: z.literal(1), emissionsEventsPerYear: z.literal(2), boxEventsPerYear: z.literal(1), url: z.string().url() }).passthrough(),
  usPermitRemainder: z.object({ annualAdministrativeReserveUsd: z.literal(46) }).passthrough(),
  insurance: z.object({ mxForeignAnnualReserveUsd: z.literal(9000), oneBoxMonthlyReserveTargetUsd: z.literal(150), url: z.string().url() }).passthrough(),
  services: z.object({ reserveRate: z.literal(.0825), rateUrl: z.string().url(), adminConnectionBudgetUsd: z.literal(35),
    connectionCount: z.literal(2), replacementHoldingMonths: z.literal(24) }).passthrough(),
  mxExtras: z.object({ monthlyVoucherMxn: z.literal(3430), bonusHourlyReferenceUsd: z.literal(1.31), insuranceHourlyReferenceUsd: z.literal(3.51),
    savingsPensionHourlyReferenceUsd: z.literal(1.47), wageHourlyReferenceUsd: z.literal(24.97), referenceUrl: z.string().url(),
    ptuReserveAnnualRoadWageFraction: z.literal(1 / 12), riskReserveRate: z.literal(.0758875) }).passthrough(),
  lodging: z.object({ hotelNightsPerCountryPerCycle: z.literal(1), mxHotelNightProxyUsd: z.literal(94), usHotelNightBudgetUsd: z.literal(110),
    mxParkingBlock24hProxyMxn: z.literal(260), usParkingBlock24hProxyUsd: z.literal(12.5), feeReserveRate: z.literal(.0825) }).passthrough(),
  trip: z.object({ usTollProxyPerAttachedMovementUsd: z.literal(32), usTollUrl: z.string().url() }).passthrough(),
  operationalCalibrationComplete: z.literal(false), quoteReady: z.literal(false), adoptedValues: z.literal(0), externalWrites: z.literal(false),
}).strict()
export function readB2PlanningPolicy(read = readLocalDocument) {
  const body = read(B2_PLANNING_POLICY_PIN.file).replace(/\r\n/g, '\n')
  if (createHash('sha256').update(body).digest('hex') !== B2_PLANNING_POLICY_PIN.sha256) throw new Error('B2_PLANNING_POLICY_HASH')
  return policySchema.parse(JSON.parse(body))
}
type Policy = ReturnType<typeof readB2PlanningPolicy>
type September = ReturnType<typeof reviewB2SeptemberLabor>
type Case = September['cases'][number]
type Fixed = September['fixedReferences'][number]
type Lodging = September['lodgingCycleQuantities']['cycles'][number]
type Lineage = z.infer<typeof BinationalCostProjectionSchema>
type Resource = Lineage['exposures'][number]['resourceId']
const fixedTargets = ['MX_TRACTOR_PERMITS', 'US_TRACTOR_PERMITS', 'SHARED_TRAILER_PERMITS',
  'MX_TRACTOR_FOREIGN_LIABILITY_REMAINDER', 'BOX_BINATIONAL_COVERAGE_REMAINDER', 'GROUP_SERVICE_TAX_INSTALLATION_REMAINDER']
const close = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-7
const cents = (v: number) => {
  if (!Number.isFinite(v) || v <= 0 || v > 1e9) throw new Error('B2_PLANNING_AMOUNT_RANGE')
  return Math.round(v * 100) / 100
}
export function assertB2SeptemberBaseline(s: September) {
  const hash = createHash('sha256').update(JSON.stringify({ cases: s.cases, fixedReferences: s.fixedReferences })).digest('hex')
  if (hash !== B2_SEPTEMBER_BASELINE_SHA256 || s.cases.length !== 12 || s.fixedReferences.length !== 6 || s.sourcePins.length !== 87 ||
    new Set(s.sourcePins.map(v => v.id)).size !== 87 || s.profileId !== 'B2_USER_SCOPE_20261003' || s.quoteReady || s.adoptedValues || s.externalWrites)
    throw new Error('B2_PLANNING_STALE_BASELINE')
}

/** Explicit prospective budget: no actual risk rate, MX market package or
 * statutory tax determination is inferred from the foreign ratios. Road pay
 * stays in its existing primary/relief pool; only disjoint extras are added. */
export function calculateB2PlanningMxExtras(c: Case, p: Policy) {
  const facts = readB2BenefitsEvidence(), x = p.mxExtras
  if (facts.mx.monthlyVoucherMxnPerEmployee !== x.monthlyVoucherMxn || facts.us.wagesHourlyUsd !== x.wageHourlyReferenceUsd ||
    facts.us.categoryHourlyUsd.supplementalPay !== x.bonusHourlyReferenceUsd || facts.us.categoryHourlyUsd.insurance !== x.insuranceHourlyReferenceUsd ||
    facts.us.categoryHourlyUsd.retirementSavings !== x.savingsPensionHourlyReferenceUsd) throw new Error('B2_PLANNING_BENEFIT_SOURCE')
  const wages = c.mx.primary.annualRoadWagesMxn + c.mx.relief.annualRoadWagesMxn
  const bonusRatio = x.bonusHourlyReferenceUsd / x.wageHourlyReferenceUsd
  const insuranceRatio = x.insuranceHourlyReferenceUsd / x.wageHourlyReferenceUsd
  const retirementRatio = x.savingsPensionHourlyReferenceUsd / x.wageHourlyReferenceUsd
  const bonusWorkedDayMxn = wages * bonusRatio / 306
  const persons = [
    { id: 'PRIMARY', daysPerYear: 365, roadWages: c.mx.primary.annualRoadWagesMxn, prior: c.mx.primary.contributions,
      statutoryBonusDeltaAnnualMxn: bonusWorkedDayMxn * (7 + 12 + 3 + 15) },
    { id: 'RELIEF', daysPerYear: 14, roadWages: c.mx.relief.annualRoadWagesMxn, prior: c.mx.relief.contributions,
      statutoryBonusDeltaAnnualMxn: bonusWorkedDayMxn * (12 + 3 + 15) * 14 / 365 },
  ].map(person => {
    const voucherAnnualMxn = x.monthlyVoucherMxn * 12 * person.daysPerYear / 365
    const bonusAnnualMxn = person.roadWages * bonusRatio
    const insuranceAnnualMxn = person.roadWages * insuranceRatio
    const retirementAnnualMxn = person.roadWages * retirementRatio
    const ptuReserveAnnualMxn = person.roadWages * x.ptuReserveAnnualRoadWageFraction
    const annualExtraMxn = voucherAnnualMxn + bonusAnnualMxn + insuranceAnnualMxn + retirementAnnualMxn + ptuReserveAnnualMxn + person.statutoryBonusDeltaAnnualMxn
    const contributions = calculateMx2026ContributionReference({ dailySbcMxn: person.prior.dailySbcMxn + annualExtraMxn / person.daysPerYear,
      coveredDays: person.prior.coveredDays, umaDailyMxn: 117.31, riskRegistration: 'EXISTING_RATE_UNKNOWN' })
    const nonRiskDeltaMxn = contributions.knownContributionsMxn - person.prior.knownContributionsMxn
    const riskReserveMxn = contributions.sbcPeriodBaseMxn * x.riskReserveRate
    return { ...person, voucherAnnualMxn, bonusAnnualMxn, insuranceAnnualMxn, retirementAnnualMxn, ptuReserveAnnualMxn,
      annualExtraMxn, contributions, nonRiskDeltaMxn, riskReserveMxn,
      fixedEmQuotaDeltaMxn: contributions.componentsMxn.EM_FIXED - person.prior.componentsMxn.EM_FIXED }
  })
  if (persons.some(v => v.fixedEmQuotaDeltaMxn !== 0 || v.nonRiskDeltaMxn < 0 || !Number.isFinite(v.annualExtraMxn))) throw new Error('B2_PLANNING_LABOR_PARTITION')
  const annualCashMxn = persons.reduce((sum, v) => sum + v.annualExtraMxn, 0)
  const primary = persons[0], relief = persons[1]
  const nonRiskMonthlyDeltaMxn = primary.nonRiskDeltaMxn + relief.nonRiskDeltaMxn / 12
  const riskMonthlyReserveMxn = primary.riskReserveMxn + relief.riskReserveMxn / 12
  const stateTaxMonthlyReserveMxn = annualCashMxn * .03 / 12
  const monthlyExtraMxn = annualCashMxn / 12 + nonRiskMonthlyDeltaMxn + riskMonthlyReserveMxn + stateTaxMonthlyReserveMxn
  return { persons, annualCashMxn, monthlyExtraMxn, nonRiskMonthlyDeltaMxn, riskMonthlyReserveMxn, stateTaxMonthlyReserveMxn,
    extraUsdPerCycle: monthlyExtraMxn / c.fx.mxnPerUsd / c.compatibleCyclesPerMonth,
    usBenefitAddedAgain: false, welcomeBonusRecurring: false, reliefRoadPayAddedAgain: false, fixedQuotaAddedAgain: false,
    actualMxPackageVerified: false, existingRiskRateVerified: false, taxDeterminationCertified: false,
    basis: 'AUTHORIZED_FOREIGN_RATIO_AND_CONTINGENT_RESERVES_NOT_MARKET_CALIBRATION' }
}

/** Ceil is an explicitly CHOSEN purchasing-budget rule in the new policy,
 * never a claim that the old clock proves nights, locations or invoices. */
export function calculateB2PlanningLodging(c: Lodging, p: Policy, fx: number) {
  if (c.billableQuantitiesEstablished || c.quantitiesAreConditionalClockOutputs !== true || !Number.isFinite(fx) || fx <= 0 ||
    c.mx.roomNights !== null || c.us.roomNights !== null || c.mx.parkingBillingUnits !== null || c.us.parkingBillingUnits !== null)
    throw new Error('B2_PLANNING_LODGING_SCOPE')
  if (!close(c.mx.continuousReleases.reduce((sum, v) => sum + v.hours, 0), c.mx.releasedHours) ||
    !close(c.us.restBlocks.reduce((sum, v) => sum + v.hours, 0), c.us.restHours)) throw new Error('B2_PLANNING_LODGING_CLOCK')
  const units = (hours: number[]) => hours.reduce((sum, h) => {
    if (!Number.isFinite(h) || h <= 0) throw new Error('B2_PLANNING_LODGING_DURATION')
    return sum + Math.ceil(h / 24)
  }, 0)
  const mxBlocks = units(c.mx.continuousReleases.map(v => v.hours)), usBlocks = units(c.us.restBlocks.map(v => v.hours))
  const mxRoomBudgetUsd = p.lodging.hotelNightsPerCountryPerCycle * p.lodging.mxHotelNightProxyUsd
  const usRoomBudgetUsd = p.lodging.hotelNightsPerCountryPerCycle * p.lodging.usHotelNightBudgetUsd
  const mxParkingBudgetUsd = mxBlocks * p.lodging.mxParkingBlock24hProxyMxn / fx
  const usParkingBudgetUsd = usBlocks * p.lodging.usParkingBlock24hProxyUsd
  const mxUsd = (mxRoomBudgetUsd + mxParkingBudgetUsd) * (1 + p.lodging.feeReserveRate)
  const usUsd = (usRoomBudgetUsd + usParkingBudgetUsd) * (1 + p.lodging.feeReserveRate)
  return { cycleId: c.cycleId, mxBlocks, usBlocks, hotelNightsPerCountry: p.lodging.hotelNightsPerCountryPerCycle,
    mxRoomBudgetUsd, usRoomBudgetUsd, mxParkingBudgetUsd, usParkingBudgetUsd, mxUsd, usUsd,
    quantitiesAreChosenPlanningPolicy: true, actualBillableQuantitiesVerified: false,
    standardHotelShareClaimed: false, priceUnitsTransferredExplicitly: true, realTaxInvoiceOrRoomParkingBundleVerified: false,
    paidUsWaitTurnedIntoHotel: false, boxParkingChargedAgain: false }
}

export function calculateB2PlanningFixedRemainders(f: Fixed, p: Policy) {
  const ids = f.unresolved.map(v => v.id)
  if (ids.length !== 6 || new Set(ids).size !== 6 || fixedTargets.some(id => !ids.includes(id))) throw new Error('B2_PLANNING_FIXED_GAPS')
  const known = (id: string) => {
    const rows = f.rows.filter(v => v.id === id)
    if (rows.length !== 1 || rows[0].monthlyUsd === null) throw new Error('B2_PLANNING_KNOWN_FIXED')
    return rows[0].monthlyUsd
  }
  const serviceIds = ['GROUP_OFFICE_AND_ADMIN_MOBILE', 'US_TRACTOR_RESERVED_YARD', 'ONE_BOX_US_RESERVED_YARD', 'GROUP_TMS_NAMED_ACCOUNTS']
  const serviceReserveBaseUsd = serviceIds.reduce((sum, id) => sum + known(id), 0)
  const values: Record<string, { monthlyUsd: number; formula: string; sourceUrl: string }> = {
    MX_TRACTOR_PERMITS: { monthlyUsd: cents((p.mxInspections.tractorGrossMxn * (p.mxInspections.tractorEventsPerYear + 1) +
      p.mxInspections.emissionsGrossMxn * p.mxInspections.emissionsEventsPerYear) / 12 / f.fx.mxnPerUsd),
      formula: '(published tractor inspection×1 + emissions×2 + one inspection-price administrative reserve) /12 /FX; IVA not added again', sourceUrl: p.mxInspections.url },
    US_TRACTOR_PERMITS: { monthlyUsd: cents(p.usPermitRemainder.annualAdministrativeReserveUsd / 12),
      formula: 'one46USD annual miscellaneous administrative budget unit /12, NOT another UCR or IRP registration charge',
      sourceUrl: 'https://www.federalregister.gov/documents/2026/09/01/2026-17893/fees-for-the-unified-carrier-registration-plan-and-agreement' },
    SHARED_TRAILER_PERMITS: { monthlyUsd: cents(p.mxInspections.boxGrossMxn * p.mxInspections.boxEventsPerYear / 12 / f.fx.mxnPerUsd),
      formula: 'published historical remolque inspection proxy ×1 /12 /FX; one box, existing Texas registration retained', sourceUrl: p.mxInspections.url },
    MX_TRACTOR_FOREIGN_LIABILITY_REMAINDER: { monthlyUsd: cents(p.insurance.mxForeignAnnualReserveUsd / 12),
      formula: 'domestic US experienced-cohort endpoint9000/12 as FOREIGN planning pool only, no verified foreign premium/history/limit', sourceUrl: p.insurance.url },
    BOX_BINATIONAL_COVERAGE_REMAINDER: { monthlyUsd: cents(p.insurance.oneBoxMonthlyReserveTargetUsd - known('SHARED_TRAILER_INSURANCE')),
      formula: '150USD guide high total minus already included25USD low; reserve, NOT a priced territorial/custody endorsement',
      sourceUrl: 'https://www.logrock.com/commercial-truck-insurance/truck-trailer-insurance-2/' },
    GROUP_SERVICE_TAX_INSTALLATION_REMAINDER: { monthlyUsd: cents(serviceReserveBaseUsd * p.services.reserveRate +
      p.services.adminConnectionBudgetUsd * p.services.connectionCount / p.services.replacementHoldingMonths),
      formula: 'selected US service pool ×8.25% budget reserve + two35USD planned connection replacements /24months; no second VAT on MX/device amounts', sourceUrl: p.services.rateUrl },
  }
  return { values, serviceReserveBaseUsd, serviceIds, fullInvoicesOrObligationsVerified: false }
}

/** Bridge into the installed kernel, not a second price engine. Every component
 * has a scenario evidence record. Original source observations are preserved
 * separately; a new model-period declaration never edits source dates. */
export function projectB2PlanningCase(base: Lineage, c: Case, f: Fixed, l: Lodging, p: Policy) {
  if (base.cycleScenarioId !== c.cycleId || base.fundingMode !== f.paymentMode || c.fx.date !== f.fx.date ||
    l.cycleId !== c.cycleId || f.rows.length !== base.budget.expenses.length || base.budget.referencePeriod !== '2026-10')
    throw new Error('B2_PLANNING_CASE_JOIN')
  const input = structuredClone(base), oldBudgetEvidence = structuredClone(base.budget.evidence)
  const evidenceMap = new Map(input.budget.evidence.map(e => [e.id, `B2_PLAN_TRANSFER:${e.id}`]))
  input.budget.referencePeriod = '2026-09'
  input.budget.evidence = input.budget.evidence.map(e => ({ ...e, id: evidenceMap.get(e.id)!, referencePeriod: '2026-09',
    kind: 'DOCUMENTED_PUBLIC_MODEL', locator: `Scenario transfer of ${e.id}, original model period ${e.referencePeriod}: ${e.locator}`.slice(0, 2000),
    limitations: `Retrospective planning declaration, NOT a new observation or certification of Sept price. ${e.limitations}`.slice(0, 2000) }))
  const extraEvidence = (id: string, url: string, locator: string) => {
    input.budget.evidence.push({ id, url, locator, observedAt: p.recordedOn, referencePeriod: p.referencePeriod,
      groupReference: input.budget.groupReference, resourceIds: ['MX_TRACTOR', 'US_TRACTOR', 'SHARED_TRAILER'],
      profileReferences: input.budget.resources.map(v => ({ resourceId: v.resourceId, profileReference: v.profileReference! })),
      kind: 'DOCUMENTED_PUBLIC_MODEL', limitations: 'Authorized planning hypothesis/proxy; not an observed invoice, verified carrier rate, coverage or operational calibration.' })
    return id
  }
  const planningEvidence = extraEvidence('B2_EXPLICIT_PLANNING_POLICY', p.mxExtras.referenceUrl,
    `Local policy ${B2_PLANNING_POLICY_PIN.file} sha256 ${B2_PLANNING_POLICY_PIN.sha256}; BLS supports category ratios ONLY. Other rates and judgments are identified in the policy, not attributed to BLS.`)
  const fixed = calculateB2PlanningFixedRemainders(f, p)
  const fixedLedger = input.budget.expenses.map(e => {
    const rows = f.rows.filter(v => v.id === e.economicExpenseId)
    if (rows.length !== 1) throw new Error('B2_PLANNING_FIXED_IDENTITY')
    const row = rows[0], remainder = fixed.values[e.economicExpenseId]
    if ((row.monthlyUsd === null) !== Boolean(remainder)) throw new Error('B2_PLANNING_FIXED_DISPOSITION')
    const evidenceIds = remainder ? [extraEvidence(`B2_PLAN_FIXED:${e.economicExpenseId}`, remainder.sourceUrl, remainder.formula)] :
      e.amount!.evidenceIds.map(id => evidenceMap.get(id)!)
    const value = row.monthlyUsd ?? remainder.monthlyUsd
    e.amount = { value, unit: 'USD/month', referencePeriod: p.referencePeriod, evidenceIds,
      derivation: remainder?.formula ?? `${row.native!.formula}; ${row.native!.currency} ${row.native!.monthlyNative} native/month valued at ${c.fx.date} FIX ${c.fx.mxnPerUsd}; original observations preserved`,
      kind: 'DOCUMENTED_PUBLIC_MODEL' }
    return { id: e.economicExpenseId, monthlyUsd: value, disposition: remainder ? 'EXPLICIT_PLANNING_REMAINDER' : 'NATIVE_PUBLIC_COMPONENT_TRANSFER',
      formula: e.amount.derivation, evidenceIds, originalNativeComponent: row.native }
  })
  if (input.budget.expenses.some(e => e.economicExpenseId === 'MX_TRACTOR_FOREIGN_LIABILITY_PUBLIC_PROXY')) throw new Error('B2_PLANNING_FOREIGN_DUPLICATION')
  const components = c.operatingComponents.rows
  const sum = (ids: string[]) => ids.reduce((total, id) => {
    const rows = components.filter(v => v.id === id)
    if (rows.length !== 1) throw new Error(`B2_PLANNING_VARIABLE_IDENTITY:${id}`)
    return total + rows[0].amountUsd
  }, 0)
  const extras = calculateB2PlanningMxExtras(c, p), lodging = calculateB2PlanningLodging(l, p, c.fx.mxnPerUsd)
  const multiplicity = c.operatingComponents.roadCoverage.attachedMultiplicity
  const mxUnknownTollBudgetMxn = c.operatingComponents.roadCoverage.knownForwardAggregateMxn / 13 * multiplicity
  const usTollBudgetUsd = p.trip.usTollProxyPerAttachedMovementUsd * multiplicity
  extraEvidence('B2_PLAN_US_INLAND_RESERVE', p.trip.usTollUrl, 'Physical p6 H.E.Bailey5axle PLT32 effective2024-2022, one aggregate budget unit per attached movement; no route selection/current fare claim')
  const values: Partial<Record<typeof PILOT_VARIABLE_CONCEPTS[number], number>> = {
    MX_ROAD_FUEL: sum(['MX_ROAD_FUEL']), US_ROAD_FUEL: sum(['US_ROAD_FUEL']),
    MX_IDLE_FUEL: sum(['MX_IDLE_FUEL']), US_IDLE_FUEL: sum(['US_IDLE_FUEL']), MX_DEF: sum(['MX_DEF']), US_DEF: sum(['US_DEF']),
    MX_DRIVER_TOTAL: c.mx.knownIncomeLinkedUsdPerCycle + extras.extraUsdPerCycle,
    US_DRIVER_TOTAL: c.us.knownCompensationAndMieUsd + lodging.usUsd,
    MX_ATTACHED_MAINT_LUBE: sum(['MX_MAINT', 'MX_LUBE']),
    MX_BOBTAIL_MAINT_LUBE: sum(['MX_BOBTAIL_maintenanceLabor', 'MX_BOBTAIL_maintenanceParts', 'MX_BOBTAIL_lubricants']),
    US_ATTACHED_MAINT_LUBE: sum(['US_MAINT']), MX_ATTACHED_TIRES: sum(['MX_TIRES']),
    MX_BOBTAIL_TIRES: sum(['MX_BOBTAIL_tires']), US_ATTACHED_TIRES: sum(['US_TIRES']),
    MX_ROAD_TOLLS: sum(['MX_ROAD_TOLLS_KNOWN_AGGREGATE']) + mxUnknownTollBudgetMxn / c.fx.mxnPerUsd,
    US_ROAD_TOLLS: usTollBudgetUsd,
    BRIDGE_TOLLS: sum(components.filter(v => v.id.startsWith('BRIDGE_')).map(v => v.id)),
    MX_TRAVEL_EXPENSES: c.mx.directFoodUsdPerCycle + lodging.mxUsd,
  }
  input.variableCosts = PILOT_VARIABLE_CONCEPTS.map(conceptId => {
    const exclusion = conceptId === 'HANDOFF_INCREMENTAL_SERVICES' ? 'Own relay labor/administration/reserved yards already modeled; no third-party handoff/transshipment bought. Customer customs/brokerage outside carrier scenario; not free.' :
      conceptId === 'SUPPLEMENTAL_CARGO_VALUE_INSURANCE' ? 'Confirmed customer MX cargo insurance and carrier US global fleet policy; no supplementary per-shipment premium. Existing fixed fleet premiums remain.' : null
    const resourceId: Resource = conceptId.startsWith('US_') ? 'US_TRACTOR' : conceptId === 'SUPPLEMENTAL_CARGO_VALUE_INSURANCE' ? 'SHARED_TRAILER' : 'MX_TRACTOR'
    const value = exclusion ? null : values[conceptId]
    if (!exclusion && (!Number.isFinite(value) || value! <= 0)) throw new Error(`B2_PLANNING_MISSING_VARIABLE:${conceptId}`)
    const prior = base.variableCosts.find(v => v.conceptId === conceptId)!
    return { conceptId, resourceId, amountUsd: value ?? null,
      disposition: exclusion ? 'DOCUMENTED_EXCLUSION' as const : 'DOCUMENTED_COMPONENT' as const,
      evidenceIds: [...new Set([planningEvidence, ...(conceptId === 'US_ROAD_TOLLS' ? ['B2_PLAN_US_INLAND_RESERVE'] : []),
        ...prior.evidenceIds.map(id => evidenceMap.get(id)!)] )],
      derivation: exclusion ?? `Native September components plus disjoint explicitly budgeted scope; source rows, payroll/lodging and road reserves are in this case ledger. ${conceptId}`,
      exclusionOrZeroRationale: exclusion, unresolvedRationale: null }
  })
  input.exposures = c.fixedComparisons.find(v => v.paymentMode === f.paymentMode)!.resourceAllocations.map(v => ({
    resourceId: v.resourceId, totalCycleKm: v.cycleKm, cycleDays: v.cycleDays,
    productiveKmPerMonth: v.monthlyKm, productiveDaysPerMonth: v.monthlyProductiveDays,
    evidenceIds: [planningEvidence], derivation: 'Retained explicit reference-cycle hypothesis, not observed Sep truck itinerary/roster; original resource MAX allocation.' }))
  input.fixedOperatingComponent = { conceptId: 'MX_DRIVER_FIXED_EMPLOYER_QUOTA', resourceId: 'MX_TRACTOR',
    monthlyUsd: c.mx.fixedQuotaMonthlyMxn / c.fx.mxnPerUsd, compatibleCyclesPerMonth: c.compatibleCyclesPerMonth,
    evidenceIds: [planningEvidence], derivation: 'September fixed employer quota / paired compatible cycles; unchanged by extra benefits, not in CVU again.' }
  input.taxScopeRationale = 'Retrospective September native reconstruction + authorized gross/mixed fiscal planning sensitivities and fee reserves; not homogeneous real invoices or tax compliance.'
  const projection = calculateBinationalBudgetCostProjection(input)
  const expectedVariable = c.knownVariableComposition.subtotalUsd + extras.extraUsdPerCycle + lodging.mxUsd + lodging.usUsd + mxUnknownTollBudgetMxn / c.fx.mxnPerUsd + usTollBudgetUsd
  if (projection.issues.length || projection.outputs.productiveCostUsd === null || !close(projection.outputs.cvuUsd!, expectedVariable) ||
    !close(projection.outputs.cfuUsd! + projection.outputs.cvuUsd!, projection.outputs.productiveCostUsd) || projection.sharedBoxAllocationCount !== 1)
    throw new Error(`B2_PLANNING_RECONCILIATION:${projection.issues.map(v => v.code).join(',')}`)
  return { cycleId: c.cycleId, fx: c.fx, restInterpretation: c.restInterpretation, fundingMode: f.paymentMode,
    fixedLedger, extras, lodging, roadReserves: { mxUnknownTollBudgetMxn, usTollBudgetUsd, attachedMultiplicity: multiplicity,
      oneUnpricedPointMeanBudgetNotPublishedTariff: true, additionalBobtailTollModelScope: 'NO_PAID_LOCAL_ACCESS_SELECTED_NOT_TOLL_FREE_CERTIFICATION',
      knownBridgePricesRetainedOnce: true },
    originalFixedEvidence: oldBudgetEvidence, originalVariableRows: structuredClone(components),
    planningOutputs: projection.outputs, resources: projection.resources, lineage: projection.lineage,
    reconciliation: { expectedVariableUsd: expectedVariable, sumMatches: true, fixedQuotaChargedOnce: true, sameBoxOnce: true,
      riskAndMarginNotInProductiveCost: true, observedSourceDatesChanged: false },
    operationalOutputs: { cfuUsd: null, cvuUsd: null, productiveCostUsd: null, purchaseUsd: null, sellUsd: null },
    status: projection.status, sourceStatus: projection.sourceStatus, actualCarrierCostObserved: false,
    economicCalibrationComplete: false, quoteReady: false, adoptedValues: 0, externalWrites: false }
}
