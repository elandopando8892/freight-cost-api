import { createHash } from 'node:crypto'
import { z } from 'zod'
import { readLocalDocument } from '../assemble-economic-reference-cards.js'
import { BinationalCostProjectionSchema } from '../../src/modules/engine/benchmark-binational-cost-projection.js'
import { pilotCostLineageHash, resolvePilotCostRemainders } from './pilot-cost-resolution.js'

const url = z.string().url().refine(v => new URL(v).protocol === 'https:')
/** Narrow receipt of THIS human decision, not a public tariff or a mutable
 * global default. Benchmark prices below cannot be injected as cost amounts. */
export const B2OperatingProfileSchema = z.object({
  model: z.literal('FCM_B2_USER_CONFIRMED_OPERATING_PROFILE_V1'),
  decisionId: z.literal('B2_USER_SCOPE_20261003'), confirmedOn: z.literal('2026-10-03'),
  caseReference: BinationalCostProjectionSchema.shape.caseReference,
  company: z.object({ stage: z.literal('EXISTING_BINATIONAL_OPERATION'), permits: z.literal('CURRENT_VALID_DECLARED_BY_USER'),
    authorityIndependentlyVerified: z.literal(false), yearsOfAuthorityAndCleanHistoryEstablished: z.literal(false),
    initialAuthorityFeesAddedAutomatically: z.literal(false), recurringComplianceExcluded: z.literal(false) }).strict(),
  compensation: z.object({ scope: z.literal('MARKET_STANDARD_BONUSES_AND_ADDITIONAL_BENEFITS_REQUIRED'),
    statutoryMinimumAloneSufficient: z.literal(false), genericExtraBenefitPercentAdded: z.literal(false),
    hiringBonusAutomaticallyRecurring: z.literal(false) }).strict(),
  lodging: z.object({ policy: z.literal('MIXED_ROADSIDE_HOTEL_AND_PENSION'),
    countryScope: z.literal('BOTH_MX_AND_US'), hotelShare: z.null(), perCycleNightCounts: z.null(),
    baseReservedYardIsTravelLodging: z.literal(false) }).strict(),
  reference: z.object({ period: z.literal('2026-09'), windowStart: z.literal('2026-09-28'), windowEnd: z.literal('2026-09-30'),
    interpretation: z.literal('LAST_MONDAY_BASED_CALENDAR_WEEK_PORTION_IN_SEPTEMBER_NOT_EXACT_DEPARTURE'), exactDepartureDate: z.null() }).strict(),
  cargo: z.object({ commodity: z.literal('AUTOMOTIVE_PARTS'), declaredValueUsd: z.literal(75000), mxCargoInsurancePayer: z.literal('CLIENT'),
    carrierPolicy: z.literal('GLOBAL_FLEET_POLICY'),
    usLiabilitiesTreatment: z.literal('IN_GLOBAL_FLEET_POLICY_NOT_ADDITIONAL_PER_SHIPMENT_PREMIUM'),
    supplementalCarrierTripPremium: z.literal('EXCLUDED_BY_CONFIRMED_COST_SCOPE'),
    policyOrCoiSufficiencyVerified: z.literal(false), territorialAndCustodyContinuityVerified: z.literal(false), monthlyFleetPremiumExcluded: z.literal(false) }).strict(),
  benchmark: z.object({ capture: z.literal('PRIMARY_WEB_TEXT_EXTRACT_NOT_ORIGINAL_SOURCE_ARCHIVE'), observedOn: z.literal('2026-10-03'),
    fx: z.object({ sourceUrl: url, column: z.literal('FIX_DETERMINATION_NOT_DOF_OR_PAYMENT'),
      observations: z.tuple([
        z.object({ date: z.literal('2026-09-28'), mxnPerUsd: z.literal(17.8413) }).strict(),
        z.object({ date: z.literal('2026-09-29'), mxnPerUsd: z.literal(18.0710) }).strict(),
        z.object({ date: z.literal('2026-09-30'), mxnPerUsd: z.literal(18.0692) }).strict(),
      ]), selectedForCostEngine: z.literal(false) }).strict(),
    usMie: z.object({ sourceUrl: url, notice: z.literal('2025-54'), effectiveFrom: z.literal('2025-10-01'),
      referenceThrough: z.literal('2026-09-30'), transportationConusUsdPerDay: z.literal(80), locator: z.string().min(1),
      isHotelPriceOrMandatoryAllowance: z.literal(false), selectedForCostEngine: z.literal(false) }).strict(),
    usBenefits: z.object({ sourceUrl: url, releaseDate: z.literal('2026-09-09'), dataPeriod: z.literal('2026-06'),
      group: z.literal('TRANSPORTATION_AND_MATERIAL_MOVING_NOT_TRUCK_DRIVER_ONLY'), extraBonusOrBenefitsAddedToExistingAggregate: z.literal(false) }).strict(),
    mxBenefits: z.object({ sourceUrl: url, population: z.literal('NATIONAL_SINGLE_DRYVAN_DRIVER_QUERETARO_NOT_BINATIONAL_FLEET_SAMPLE'),
      publishedHiringBonusMxn: z.literal(15000), hiringBonusBasis: z.literal('DEFERRED_RECRUITMENT_NOT_RECURRING_MONTHLY_BONUS'),
      publishedVouchersMxn: z.literal(3430), voucherFrequency: z.null(), otherPublishedBenefits: z.array(z.string().min(1)),
      extraBenefitsMonthlyMxn: z.null(), historicalSeptemberOfferVerified: z.literal(false) }).strict(),
    pension: z.object({ sourceUrl: url, publishedMxnPer24Hours: z.literal(260),
      equipmentScope: z.literal('TRACTOR_PLUS_ONE_TRAILER_OR_TRAILER_OVER_9M'), location: z.literal('CUAUTITLAN_IZCALLI_MX'),
      hotelRoomIncluded: z.literal(false), taxBasisVerified: z.literal(false), historicalSeptemberPriceVerified: z.literal(false), selectedForCostEngine: z.literal(false) }).strict(),
    mxMonthlyVoucherComparator: z.object({ sourceUrl: url,
      population: z.literal('CDMX_SINGLE_DRYVAN_DRIVER_MEXICO_BAJIO_LAREDO_KNOWLEDGE_REQUIRED'),
      publishedVouchersMxnPerEmployeeMonth: z.literal(3430), publishedWelcomeBonusMxn: z.literal(10000),
      recruitmentClosed: z.literal(true), exactOfferPublicationDate: z.null(), originalQueretaroOfferFrequencyChanged: z.literal(false),
      extraBenefitsMonthlyTotalMxn: z.null(), statutoryTaxAndRosterTreatmentVerified: z.literal(false), selectedForCostEngine: z.literal(false) }).strict(),
    hotel: z.object({ sourceUrl: url, location: z.literal('FEDERAL57_KM108_MATEHUALA_SALTILLO'), publicPriceMxnPerNight: z.null(),
      truckParkingInRoomRateVerified: z.literal(false), historicalSeptemberPriceVerified: z.literal(false) }).strict(),
    fleetInsuranceContextUrl: url,
  }).strict(), calibrated: z.literal(false), quoteReady: z.literal(false), adoptedValues: z.literal(0),
}).strict()

export const B2_OPERATING_PROFILE_PIN = {
  id: 'confirmedB2OperatingProfile', file: 'docs/research/B2_CONFIRMED_OPERATING_PROFILE_2026-10-03.json',
  sha256: '161d071f3038f5fe8fc0a8fac09b78bb00e4c480f2e79744164e9e00f9cb9d39',
} as const

export function readB2OperatingProfile(read = readLocalDocument) {
  const body = read(B2_OPERATING_PROFILE_PIN.file)
  if (createHash('sha256').update(body).digest('hex') !== B2_OPERATING_PROFILE_PIN.sha256) throw new Error('B2_OPERATING_PROFILE_HASH')
  return B2OperatingProfileSchema.parse(JSON.parse(body))
}

const candidateReferenceSchema = z.object({
  fxObservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  usMieEffectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  mxWorkRiskBasis: z.literal('INITIAL_CARGO_CLASS_V_RATE_SENSITIVITY_NOT_ACTUAL_EXISTING_PREMIUM'),
  foreignLiabilityAlternativeId: z.string().nullable(),
}).strict()

/** Reuse the existing remainder adapter for cost-scope exclusion ONLY. Keep
 * historical monetary inputs unmodified; mismatch gates apply even when a
 * synthetic resolution has made the historical arithmetic complete. */
export function applyB2OperatingProfile(rawBase: unknown, rawProfile: unknown, rawReference: unknown) {
  const base = BinationalCostProjectionSchema.parse(rawBase), profile = B2OperatingProfileSchema.parse(rawProfile)
  const reference = candidateReferenceSchema.parse(rawReference)
  const driverRows = base.variableCosts.filter(r => r.conceptId === 'US_DRIVER_TOTAL')
  if (driverRows.length !== 1 || !['DOCUMENTED_COMPONENT', 'DOCUMENTED_PARTIAL'].includes(driverRows[0].disposition))
    throw new Error('B2_PROFILE_US_DRIVER_KNOWN_COMPONENT_REQUIRED')
  // This existing concept already carries US wage/benefit/M&IE travel. Expose
  // the newly confirmed US lodging remainder without adding a second wage or
  // allowance and without introducing another engine or canonical parameter.
  const driver = driverRows[0]
  driver.disposition = 'DOCUMENTED_PARTIAL'
  driver.unresolvedRationale = `${driver.unresolvedRationale ?? ''}; User-confirmed mixed US roadside hotel/pension remains unpriced; M&IE or a sleeper cab is not a hotel/parking charge.`
  const evidenceId = `USER_SCOPE:${profile.decisionId}:CARGO_NON_INCREMENTAL`
  const scope = resolvePilotCostRemainders(base, {
    model: 'FCM_B2_EXPLICIT_REMAINDER_RESOLUTION_V1', baseLineageSha256: pilotCostLineageHash(base),
    evidenceScope: base.evidenceScope, fixed: [],
    // DOCUMENTED_PUBLIC_MODEL is the worksheet's existing declaration kind,
    // not proof that FMCSA documented the user's payer or insurance contract.
    evidence: [{ id: evidenceId, url: profile.benchmark.fleetInsuranceContextUrl,
      locator: `Human decision ${profile.decisionId}, ${profile.confirmedOn}: MX cargo paid by client; US liabilities within global fleet policy. Public URL is insurance context ONLY, not evidence of this payer or contract.`,
      observedAt: profile.confirmedOn, referencePeriod: base.budget.referencePeriod!, groupReference: base.budget.groupReference,
      resourceIds: ['SHARED_TRAILER'], profileReferences: base.budget.resources.filter(r => r.resourceId === 'SHARED_TRAILER')
        .map(r => ({ resourceId: r.resourceId, profileReference: r.profileReference! })),
      kind: 'DOCUMENTED_PUBLIC_MODEL', limitations: 'User-confirmed cost boundary, not verified coverage, insured limits, actual fleet premium or public observation. Historical candidate period is retained; this does not approve it for September.' }],
    variable: [{ conceptId: 'SUPPLEMENTAL_CARGO_VALUE_INSURANCE', mode: 'DOCUMENTED_EXCLUSION', valueUsdPerCycle: null,
      evidenceIds: [evidenceId], derivation: 'No incremental carrier per-shipment premium: MX paid by client; US policy costs belong to the monthly fleet pool. USD75000 remains cargo risk context, not a premium.',
      zeroOrExclusionRationale: 'Excluded supplemental carrier trip charge only. Retain all monthly fleet insurance, territorial/custody remainders and liability verification; do not assert these cost zero.' }],
  })
  const issues: { code: string; field: string; rationale: string }[] = []
  const add = (code: string, field: string, rationale: string) => issues.push({ code, field, rationale })
  if (base.budget.referencePeriod !== profile.reference.period)
    add('B2_REFERENCE_PERIOD_REVALUATION_REQUIRED', 'budget.referencePeriod', 'Historical monetary worksheet must be rebuilt for September, not relabeled.')
  if (reference.fxObservationDate > profile.reference.windowEnd)
    add('B2_FX_AFTER_REFERENCE_WINDOW', 'fxObservationDate', 'October FIX must not value the September reference case.')
  if (reference.usMieEffectiveFrom !== null && reference.usMieEffectiveFrom > profile.reference.windowStart)
    add('B2_MIE_NOT_EFFECTIVE_FOR_WHOLE_REFERENCE_WINDOW', 'usMieEffectiveFrom', 'Equal nominal USD80 does not make the October notice applicable to September. Use the prior applicable notice.')
  add('B2_EXISTING_EMPLOYER_RISK_IS_INITIAL_RATE_PROXY', 'mxWorkRiskBasis', 'Initial classV rate remains a sensitivity, not an observed or matched existing-employer premium. Preserve the amount for comparison, not calibrated acceptance.')
  if (reference.foreignLiabilityAlternativeId !== null) {
    add('B2_FOREIGN_PREMIUM_COHORT_UNMATCHED', 'foreignLiabilityAlternativeId',
      'Existing valid authority establishes neither Indiana new-authority scope nor two years of clean history/foreign insurance eligibility; neither proxy is automatically matched.')
  }
  const compensationRemainder = scope.result.lineage.variableCosts.find(r => r.conceptId === 'MX_DRIVER_TOTAL')!
  if (compensationRemainder.disposition !== 'DOCUMENTED_PARTIAL')
    add('B2_MX_MARKET_BENEFITS_EVIDENCE_REQUIRED', 'variableCosts.MX_DRIVER_TOTAL', 'Arithmetic remainder alone is not evidence of market-standard bonus/benefit coverage.')
  add('B2_MIXED_LODGING_EVIDENCE_REQUIRED', 'lodging', 'Mixed lodging in both countries requires night mix, tax/bundle boundaries and applicable published prices. Food or reserved home yard is not lodging.')
  const benchmarkNextInputs = [
    { id: 'MX_MARKET_EXTRA_BENEFITS', target: 'MX_DRIVER_TOTAL', classification: 'CVU',
      status: 'PUBLIC_MONTHLY_VOUCHER_COMPONENT_IDENTIFIED_TOTAL_PACKAGE_UNRESOLVED', sourceUrl: profile.benchmark.mxMonthlyVoucherComparator.sourceUrl,
      note: 'Separate CDMX dryvan comparator explicitly publishes3430MXN/employee-month. Do not rewrite the original offer frequency, treat either welcome bonus as monthly recurring, equate a closed job to a current market mean or add statutory benefits twice. Employee-month allocation and incremental employer treatment remain pending.' },
    { id: 'MIXED_ROADSIDE_LODGING', target: 'MX_TRAVEL_EXPENSES_AND_APPLICABLE_US_TRAVEL', classification: 'CVU',
      status: 'PENSION_PUBLIC_PROXY_HOTEL_PRICE_AND_MIX_UNRESOLVED', sourceUrl: profile.benchmark.pension.sourceUrl,
      note: '260MXN/24h is one tractor plus trailer, not260 per asset or a hotel room; no September price or tax certification. Off-base stops must not duplicate reserved base yard.' },
    { id: 'RECURRING_PERMITS_AND_FLEET_INSURANCE', target: 'MONTHLY_FIXED_REMAINDERS', classification: 'CFU',
      status: 'EXISTING_OPERATION_SCOPE_DEFINED_MONETARY_APPLICABILITY_PENDING', sourceUrl: profile.benchmark.fleetInsuranceContextUrl,
      note: 'Retain recurring permits and monthly fleet liabilities; no startup fees or blanket zero merely because permits are current.' },
  ]
  return { model: 'FCM_B2_CONFIRMED_PROFILE_APPLICATION_V1', profile, changes: scope.changes,
    referenceCompatibility: { compatible: issues.length === 0, issues, input: reference },
    benchmarkNextInputs,
    cargoValueFxSensitivity: profile.benchmark.fx.observations.map(row => ({ ...row, declaredValueMxn: Math.round(profile.cargo.declaredValueUsd * row.mxnPerUsd * 100) / 100,
      purpose: 'CARGO_VALUE_CONTEXT_NOT_INSURANCE_PREMIUM_OR_ENGINE_FX_SELECTION', selectedForCostEngine: false })),
    userCostCase: { referencePeriod: profile.reference.period, outputs: { cfuUsd: null, cvuUsd: null, productiveCostUsd: null, purchaseUsd: null, sellUsd: null },
      arithmeticComplete: false, economicEvidenceAccepted: false, b2Complete: false },
    historicalScopeProjection: scope.result,
    sourceAuthority: { decision: 'USER_CONFIRMED', publicInsuranceUrlProvesUserContract: false, permitsOrCoiIndependentlyVerified: false },
    originalInputsChanged: false, calibrated: false, quoteReady: false, adoptedValues: 0, externalWrites: false }
}
