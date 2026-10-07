import { createHash } from 'node:crypto'
import { z } from 'zod'
import { readLocalDocument } from '../assemble-economic-reference-cards.js'
import { B2OperatingProfileSchema } from './b2-operating-profile.js'
import type { consolidateBinationalReferenceBudget } from '../consolidate-binational-reference-budget.js'
import { calculateUsNominalMovementClock } from './reference-pilot-cycle-exposure.js'

const httpsUrl = z.string().url().refine(v => new URL(v).protocol === 'https:')
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const value = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(value.valueOf()) && value.toISOString().slice(0, 10) === v
})
const candidateSchema = z.object({
  id: z.string().min(1), country: z.enum(['MX', 'US']), concept: z.enum(['RIG_PARKING', 'HOTEL_ROOM']),
  amount: z.number().positive().finite().nullable(), currency: z.enum(['MXN', 'USD']),
  unit: z.enum(['RIG_24H', 'PUBLISHED_PARKING_DAY', 'ROOM_NIGHT', 'ADVERTISED_ROOM_RATE_UNSPECIFIED_PERIOD',
    'FEDERAL_MAXIMUM_LODGING_ALLOWANCE_NIGHT']),
  priceKind: z.enum(['PUBLISHED_OPERATOR_PRICE', 'PUBLISHED_MARKETPLACE_PRICE', 'ADVERTISED_STARTING_PRICE',
    'NO_PUBLISHED_PRICE', 'GOVERNMENT_REIMBURSEMENT_CONTRAST_ONLY']),
  location: z.string().min(1), url: httpsUrl, locator: z.string().min(1),
  effectiveFrom: date.nullable(), effectiveUntil: date.nullable(),
  taxAndFeesKnown: z.literal(false), roomOrParkingBundleVerified: z.literal(false), limitations: z.string().min(1),
}).strict().superRefine((v, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message })
  if ((v.amount === null) !== (v.priceKind === 'NO_PUBLISHED_PRICE')) fail('LODGING_PRICE_KIND_AMOUNT')
  if ((v.effectiveFrom === null) !== (v.effectiveUntil === null) ||
      (v.effectiveFrom && v.effectiveUntil && v.effectiveFrom > v.effectiveUntil)) fail('LODGING_EFFECTIVE_RANGE')
  const roomUnits = ['ROOM_NIGHT', 'ADVERTISED_ROOM_RATE_UNSPECIFIED_PERIOD', 'FEDERAL_MAXIMUM_LODGING_ALLOWANCE_NIGHT']
  if ((v.concept === 'HOTEL_ROOM') !== roomUnits.includes(v.unit)) fail('LODGING_CONCEPT_UNIT')
  if ((v.priceKind === 'ADVERTISED_STARTING_PRICE') !== (v.unit === 'ADVERTISED_ROOM_RATE_UNSPECIFIED_PERIOD')) fail('LODGING_ADVERTISED_UNIT')
  if ((v.priceKind === 'GOVERNMENT_REIMBURSEMENT_CONTRAST_ONLY') !== (v.unit === 'FEDERAL_MAXIMUM_LODGING_ALLOWANCE_NIGHT')) fail('LODGING_GOVERNMENT_UNIT')
})

/** Public candidates, not accepted prices or a market-wide spending policy. */
export const B2MixedLodgingBenchmarkSchema = z.object({
  model: z.literal('FCM_B2_MIXED_LODGING_BENCHMARK_V1'), observedOn: date,
  capture: z.literal('PRIMARY_WEB_TEXT_EXTRACT_NOT_ORIGINAL_ARCHIVE'),
  caseReference: z.literal('MEXICO_DF_FORT_SMITH_72916_WTB_OWN_RELAY'), countryScope: z.literal('BOTH_MX_AND_US'),
  restPolicy: z.object({ id: z.literal('CONDITIONAL_REST_WITHOUT_FIXED_HOTEL_QUOTA'), humanInstruction: z.literal('el estándar'),
    interpretation: z.literal('PLANNING_RECOMMENDATION_NOT_MEASURED_MARKET_SHARE'), rule: z.string().min(1),
    universalHotelPercentageEstablished: z.literal(false), automaticHotelNights: z.null(), mxSleeperVerifiedByThisResearch: z.literal(false),
    legalComplianceCertified: z.literal(false), sourceUrl: httpsUrl, sourceBoundary: z.string().min(1) }).strict(),
  candidates: z.array(candidateSchema).min(1).max(30), hotelShare: z.null(), cycleNightCounts: z.null(),
  selectedRateIds: z.array(z.never()).max(0), completeLodgingCvuUsd: z.null(),
  calibrated: z.literal(false), quoteReady: z.literal(false), adoptedValues: z.literal(0), externalWrites: z.literal(false),
}).strict().superRefine((v, ctx) => {
  if (new Set(v.candidates.map(c => c.id)).size !== v.candidates.length)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'LODGING_DUPLICATE_SOURCE_ID' })
})

export const B2_MIXED_LODGING_PIN = {
  id: 'mixedLodgingPublicBenchmark', file: 'docs/research/B2_MIXED_LODGING_BENCHMARK_2026-10-04.json',
  sha256: 'f75042c9dfa1c8d77651946f5efdf8b6c90dd00fc3a427d880998813b0428706',
} as const

export function readB2MixedLodgingBenchmark(read = readLocalDocument) {
  const body = read(B2_MIXED_LODGING_PIN.file)
  if (createHash('sha256').update(body).digest('hex') !== B2_MIXED_LODGING_PIN.sha256) throw new Error('B2_LODGING_BENCHMARK_HASH')
  return B2MixedLodgingBenchmarkSchema.parse(JSON.parse(body))
}

/** Local closeout evidence only. No monetary adapter, network, FX or DB call. */
export function prepareB2MixedLodgingBenchmark(rawBenchmark: unknown, rawProfile: unknown) {
  const benchmark = B2MixedLodgingBenchmarkSchema.parse(rawBenchmark)
  const profile = B2OperatingProfileSchema.parse(rawProfile)
  if (benchmark.caseReference !== profile.caseReference || benchmark.countryScope !== profile.lodging.countryScope)
    throw new Error('B2_LODGING_PROFILE_SCOPE')
  const candidates = benchmark.candidates.map(c => ({ ...c,
    targetConceptId: c.country === 'MX' ? 'MX_TRAVEL_EXPENSES' : 'US_DRIVER_TOTAL',
    referenceWindowCoveredByPublishedDates: c.effectiveFrom !== null && c.effectiveUntil !== null &&
      c.effectiveFrom <= profile.reference.windowStart && c.effectiveUntil >= profile.reference.windowEnd,
    evidenceUse: c.priceKind === 'GOVERNMENT_REIMBURSEMENT_CONTRAST_ONLY' ? 'REIMBURSEMENT_CONTRAST_NOT_COMMERCIAL_PRICE'
      : c.amount === null ? 'SOURCE_WITHOUT_PRICE' : 'UNACCEPTED_PUBLIC_PRICE_CANDIDATE',
    commercialRateApplicableToReferenceWindow: false, quantityPerCycle: null, selectedForCostEngine: false,
  }))
  const coverage = (['MX', 'US'] as const).flatMap(country => (['RIG_PARKING', 'HOTEL_ROOM'] as const).map(concept => {
    const rows = candidates.filter(c => c.country === country && c.concept === concept)
    return { country, concept, candidateIds: rows.map(c => c.id),
      pricedCommercialCandidates: rows.filter(c => c.amount !== null && c.priceKind !== 'GOVERNMENT_REIMBURSEMENT_CONTRAST_ONLY').length,
      acceptedCommercialCandidates: 0, completeCvuUsd: null }
  }))
  return { model: 'FCM_B2_MIXED_LODGING_REPORT_V1', status: 'PUBLIC_CANDIDATES_QUANTITIES_AND_APPLICABILITY_PENDING',
    profileDecisionId: profile.decisionId, caseReference: profile.caseReference, reference: profile.reference,
    observedOn: benchmark.observedOn, capture: benchmark.capture, observationAfterReferenceWindow: benchmark.observedOn > profile.reference.windowEnd,
    restPolicy: benchmark.restPolicy, hotelShare: benchmark.hotelShare, cycleNightCounts: benchmark.cycleNightCounts,
    candidates, coverage, sourcePin: B2_MIXED_LODGING_PIN,
    formula: 'roomNights * applicableRoomRate + nonBundledRigParkingUnits * applicableParkingRate + nonIncludedTaxesAndFees',
    unresolvedInputs: ['ROOM_NIGHTS_AND_PARKING_UNITS_PER_COUNTRY_AND_CYCLE', 'SUITABLE_SLEEPING_FACILITIES_AND_SITE',
      'COMMERCIAL_RATE_APPLICABLE_TO_SEPTEMBER_2026', 'TAXES_FEES_AND_PARKING_BUNDLE', 'ACCEPTED_FX_FOR_MXN_COMPONENTS'],
    boundaries: { fixedYardIsNotTravelLodging: true, parkingDoesNotProveRoomIncluded: true,
      oneRigIsNotTwoAssets: true, publishedDayIsNotAssumed24Hours: true, startingPriceIsNotFinalNightlyPrice: true,
      mieIsNotHotelPrice: true, governmentCeilingIsNotCarrierPrice: true, existingDriverAndBenefitAmountsChanged: false,
      remainderFamiliesClosed: false, measuredMarketHotelShareEstablished: false },
    completeLodgingCvuUsd: null, calibrated: false, quoteReady: false, adoptedValues: 0, externalWrites: false }
}

type Research = ReturnType<typeof consolidateBinationalReferenceBudget>
const cycleId = z.enum(['NETWORK_EXPECTED_EMPTY_PROXY', 'DEDICATED_EMPTY_SAME_BOX_RETURN'])
const hours = z.number().finite().nonnegative().max(1000)
const intervalSchema = z.object({ kind: z.enum(['TASK', 'COUNTED_BREAK', 'RELEASED_INTERVAL']), id: z.string().min(1),
  startHour: hours, endHour: hours, hours: hours, day: z.number().int().nonnegative() }).strict()
const usClockSchema = z.object({ cycleId, paidWorkerHours: hours, assignedElapsedHours: hours,
  unpaidMovementRestHours: hours, unpaidRecoveryRestHours: hours, synchronizationWaitHours: hours,
  sourcePeriods: z.object({ mieEffectiveFrom: z.literal('2025-10-01') }).passthrough() }).passthrough()
const assertClock = (a: number, b: number, name: string) => {
  if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a - b) > 1e-7) throw new Error(`B2_LODGING_${name}`)
}

/** Reconcile already declared rest exposure. No new roster, hotel nights,
 * parking billing rule, price multiplication, location or cost adoption. */
export function reconcileB2LodgingCycleQuantities(r: Research, rawUsClocks: unknown) {
  const usClocks = z.array(usClockSchema).length(2).parse(rawUsClocks)
  const duty = r.supportingPilotOrdinaryDuty, exposure = r.supportingPilotCycleExposure
  if (exposure.usRoadBasis !== 'POSTAL_REFERENCE' || !exposure.usPostalRoadReference ||
    exposure.referencePeriod !== '2026-10' || duty.scenarios.length !== 2 ||
    new Set(duty.scenarios.map(s => s.id)).size !== 2 || new Set(usClocks.map(s => s.cycleId)).size !== 2) {
    throw new Error('B2_LODGING_CYCLE_IDENTITY')
  }
  const sourcePins = ['pilotCycle', 'pilotUsPostalRoad', 'pilotOrdinaryDuty'].map(id => {
    const found = r.sourcePins.filter(p => p.id === id)
    if (found.length !== 1) throw new Error('B2_LODGING_CLOCK_SOURCE_IDENTITY')
    return found[0]
  })
  const cycles = duty.scenarios.map(s => {
    const id = cycleId.parse(s.id), timeline = z.array(intervalSchema).min(1).parse(s.timeline)
    const mxElapsedHours = hours.parse(s.knownMxElapsedClockDays * 24)
    let endHour = 0
    for (const t of timeline) {
      if (t.hours <= 0) throw new Error('B2_LODGING_INTERVAL_RANGE')
      assertClock(t.endHour - t.startHour, t.hours, 'INTERVAL_DURATION')
      assertClock(t.startHour, endHour, 'TIMELINE_CONTIGUITY')
      endHour = t.endHour
    }
    assertClock(endHour, mxElapsedHours, 'MX_ELAPSED_CLOCK')
    const taskHours = timeline.filter(t => t.kind === 'TASK').reduce((sum, t) => sum + t.hours, 0)
    const breakHours = timeline.filter(t => t.kind === 'COUNTED_BREAK').reduce((sum, t) => sum + t.hours, 0)
    assertClock(taskHours, s.totalKnownTaskHours, 'MX_TASK_PARTITION')
    assertClock(breakHours, s.countedBreakHours, 'MX_BREAK_PARTITION')
    const released = timeline.filter(t => t.kind === 'RELEASED_INTERVAL')
    const continuousReleases: { startHour: number; endHour: number; hours: number; sourceIntervalIndexes: number[] }[] = []
    released.forEach((t, i) => {
      const last = continuousReleases.at(-1)
      if (last && Math.abs(last.endHour - t.startHour) < 1e-9) {
        last.endHour = t.endHour; last.hours += t.hours; last.sourceIntervalIndexes.push(i)
      } else continuousReleases.push({ startHour: t.startHour, endHour: t.endHour, hours: t.hours, sourceIntervalIndexes: [i] })
    })
    const releasedHours = released.reduce((sum, t) => sum + t.hours, 0)
    assertClock(continuousReleases.reduce((sum, t) => sum + t.hours, 0), releasedHours, 'MERGED_RELEASE_CONSERVATION')
    assertClock(taskHours + breakHours + releasedHours, mxElapsedHours, 'MX_TOTAL_PARTITION')
    const cycle = exposure.scenarios.find(c => c.id === id)!, us = usClocks.find(c => c.cycleId === id)!
    if (!cycle || !us) throw new Error('B2_LODGING_CYCLE_JOIN')
    const minutes = exposure.usPostalRoadReference!.durationMinutes
    const ratio = cycle.emptyShareOfTotalKm / (1 - cycle.emptyShareOfTotalKm)
    const outbound = calculateUsNominalMovementClock(minutes), recovery = calculateUsNominalMovementClock(minutes * ratio)
    const usRestBlocks = [
      ...outbound.timeline.filter(t => t.kind === 'OFF_DUTY').map(t => ({ phase: 'LOADED_MOVEMENT', hours: t.endHour - t.startHour })),
      { phase: 'DECLARED_RECOVERY', hours: exposure.movementPolicy.recoveryRestHours },
      ...recovery.timeline.filter(t => t.kind === 'OFF_DUTY').map(t => ({ phase: 'EMPTY_MOVEMENT', hours: t.endHour - t.startHour })),
    ]
    assertClock(outbound.offDutyHours + recovery.offDutyHours, us.unpaidMovementRestHours, 'US_MOVEMENT_REST_PARTITION')
    assertClock(exposure.movementPolicy.recoveryRestHours, us.unpaidRecoveryRestHours, 'US_RECOVERY_PARTITION')
    const usRestHours = usRestBlocks.reduce((sum, t) => sum + t.hours, 0)
    assertClock(usRestHours + us.paidWorkerHours, us.assignedElapsedHours, 'US_TOTAL_PARTITION')
    assertClock(us.assignedElapsedHours, s.knownUsElapsedClockDays * 24, 'US_ELAPSED_CLOCK')
    assertClock(us.synchronizationWaitHours, s.usAssetWaitAndHandoffDeltaHours, 'US_PAID_WAIT_PARTITION')
    return { cycleId: id,
      mx: { targetConceptId: 'MX_TRAVEL_EXPENSES', elapsedHours: mxElapsedHours, taskHours, countedBreakHours: breakHours,
        releasedHours, rawReleasedIntervalCount: released.length, continuousReleaseCount: continuousReleases.length, continuousReleases,
        roomNights: null, parkingBillingUnits: null, lodgingUsd: null, releaseIsVerifiedOffDuty: false,
        allReleasesRequirePurchasedLodging: false, equipmentAttachedDuringReleaseEstablished: false },
      us: { targetConceptId: 'US_DRIVER_TOTAL', elapsedHours: us.assignedElapsedHours, paidWorkerHours: us.paidWorkerHours,
        synchronizationWaitHoursAlreadyPaid: us.synchronizationWaitHours, movementRestHours: us.unpaidMovementRestHours,
        recoveryRestHours: us.unpaidRecoveryRestHours, restHours: usRestHours, nominalRestBlockCount: usRestBlocks.length, restBlocks: usRestBlocks,
        restBlockChronologyAndLocationEstablished: false, roomNights: null, parkingBillingUnits: null, lodgingUsd: null },
      quantitiesAreConditionalClockOutputs: true, billableQuantitiesEstablished: false,
      lodgingQuantityFormula: 'roomNights and nonBundledParkingUnits require explicit accommodation/site/billing evidence; not ceil(elapsedDays) or restBlockCount',
      hotelShare: null, completeLodgingCvuUsd: null, selectedForCostEngine: false }
  })
  return { model: 'FCM_B2_LODGING_CYCLE_RECONCILIATION_V1', sourcePhysicalPolicyPeriod: exposure.referencePeriod,
    timeBasis: 'RETAINED_RELATIVE_CLOCK_NOT_DATED_SERVICE', sourcePins, cycles,
    calendarDatesAndRestLocationsEstablished: false, paidWaitConvertedToLodging: false, foodOrMieChanged: false,
    oldMonetarySubtotalsChanged: false, calibrated: false, quoteReady: false, adoptedValues: 0, externalWrites: false }
}
