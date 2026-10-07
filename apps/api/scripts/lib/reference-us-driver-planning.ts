import { z } from 'zod'
import { calculateUsNominalMovementClock } from './reference-pilot-cycle-exposure.js'
import type { calculatePilotCycleExposureScenarios } from './reference-pilot-cycle-exposure.js'

type Exposure = ReturnType<typeof calculatePilotCycleExposureScenarios>
type Ordinary = { id: string; knownUsElapsedClockDays: number; usAssetWaitAndHandoffDeltaHours: number }
const source = z.object({ id: z.string().min(1), url: z.string().url(), locator: z.string().min(1), period: z.string().min(1) }).strict()
const schema = z.object({
  model: z.literal('FCM_US_DRIVER_HOURLY_MIE_PLANNING_V1'), referencePeriod: z.enum(['2026-09', '2026-10']),
  wage: z.object({ period: z.literal('2025-05'), soc: z.literal('53-3032'), meanHourlyUsd: z.literal(28.71),
    hourlyInputNotAnnualDividedBy2080: z.literal(true) }).passthrough(),
  employerCostFactor: z.object({ period: z.literal('2026-06'), totalHourlyUsd: z.literal(36.38), wagesHourlyUsd: z.literal(24.97),
    benefitsHourlyUsd: z.literal(11.41), workerCompensationIncludedInThisPeriod: z.literal(true), futureSeriesBoundaryMustBeRevalidated: z.literal(true) }).passthrough(),
  mealAndIncidentals: z.object({ notice: z.enum(['2025-54', '2026-60']), effectiveFrom: z.enum(['2025-10-01', '2026-10-01']), publishedTransportationConusUsdPerDay: z.literal(80),
    allocation: z.literal('DECLARED_ALLOWANCE_PER_STARTED_24H_ASSIGNED_US_CYCLE_BLOCK_NOT_TAX_CALENDAR_DAY_SUBSTANTIATION'),
    lodging: z.literal('SLEEPER_CAB_ORDINARY_REFERENCE_SCOPE_NO_ROUTINE_HOTEL_CHARGE'), otherIncidentalRateAdded: z.literal(false),
    deductionOrTaxSavingsComputed: z.literal(false), carrierReimbursementObserved: z.literal(false) }).strict(),
  timePolicy: z.object({ scope: z.literal('ONE_EQUIVALENT_HOURLY_COMPENSATED_US_DRIVER_POSITION_PER_ASSIGNED_DUTY_NOT_MONTHLY_GUARANTEE'),
    paid: z.literal('NOMINAL_LOADED_AND_EMPTY_DRIVING_PLUS_MOVEMENT_BREAKS_TERMINAL_HANDLING_HANDOFF_AND_ORDINARY_DUTY_SYNCHRONIZATION_WAIT'),
    unpaid: z.literal('NOMINAL_MOVEMENT_OFF_DUTY_PLUS_DECLARED_RECOVERY_REST'),
    paidLeaveAndPremiumsAddedAgain: z.literal(false), weeklyDutyOrLaborComplianceProven: z.literal(false) }).passthrough(),
  replacesMileageAggregate: z.literal(true), extraAtRiPerDiemOrBonusesOrStatutoryPercentAdded: z.literal(false),
  scope: z.literal('DECLARED_ORDINARY_US_EMPLOYEE_COMPENSATION_AND_MIE_SCENARIO_NOT_OBSERVED_CARRIER_COST'),
  sources: z.array(source).length(4), limitations: z.array(z.string().min(1)).min(10),
  calibrated: z.literal(false), quoteReady: z.literal(false), adoptedValues: z.literal(0),
}).passthrough()
const close = (a: number, b: number, name: string) => {
  if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a - b) > 1e-7) throw new Error(`US_DRIVER_PLANNING_${name}`)
}
export function readUsDriverPlanning(raw: unknown) {
  const p = schema.parse(raw)
  const september = p.referencePeriod === '2026-09'
  if (p.mealAndIncidentals.notice !== (september ? '2025-54' : '2026-60') ||
      p.mealAndIncidentals.effectiveFrom !== (september ? '2025-10-01' : '2026-10-01')) throw new Error('US_DRIVER_PLANNING_PERIOD_NOTICE_MISMATCH')
  const expectedSources = ['BLS_OEWS_MAY2025_DRIVER', 'BLS_ECEC_JUNE2026_OCCUPATION', 'BLS_ECEC_CONCEPTS',
    september ? 'IRS_NOTICE2025_54_TRANSPORTATION_MIE' : 'IRS_NOTICE2026_60_TRANSPORTATION_MIE']
  if (new Set(p.sources.map(s => s.id)).size !== 4 || expectedSources.some(id => !p.sources.some(s => s.id === id)))
    throw new Error('US_DRIVER_PLANNING_SOURCE_IDENTITY')
  const mieSource = p.sources.find(s => s.id === expectedSources[3])!
  if (mieSource.url !== (september ? 'https://www.irs.gov/pub/irs-drop/n-25-54.pdf' : 'https://www.irs.gov/pub/irs-drop/n-26-60.pdf') ||
      mieSource.period !== `EFFECTIVE_${p.mealAndIncidentals.effectiveFrom}`) throw new Error('US_DRIVER_PLANNING_NOTICE_SOURCE_MISMATCH')
  return p
}

/** Whole US assignment: cost per worked-hour proxy on explicitly paid duties,
 * plus a separate ordinary M&IE allowance. Not salary on all asset elapsed time,
 * actual payroll, tax deduction, HOS certification, or a second mileage rate. */
export function calculateUsDriverPlanning(raw: unknown, exposure: Exposure, ordinary: Ordinary) {
  const p = readUsDriverPlanning(raw)
  if (exposure.usRoadBasis !== 'POSTAL_REFERENCE' || !exposure.usPostalRoadReference) throw new Error('US_DRIVER_PLANNING_REQUIRES_POSTAL_REFERENCE')
  const cycles = exposure.scenarios.filter(s => s.id === ordinary.id)
  if (cycles.length !== 1) throw new Error('US_DRIVER_PLANNING_CYCLE_IDENTITY')
  const cycle = cycles[0], us = cycle.allocationResources.filter(r => r.resourceId === 'US_TRACTOR')
  if (us.length !== 1) throw new Error('US_DRIVER_PLANNING_RESOURCE_IDENTITY')
  const road = exposure.usPostalRoadReference, policy = exposure.movementPolicy
  const outbound = calculateUsNominalMovementClock(road.durationMinutes)
  const emptyRatio = cycle.emptyShareOfTotalKm / (1 - cycle.emptyShareOfTotalKm)
  const recovery = calculateUsNominalMovementClock(road.durationMinutes * emptyRatio)
  close(us[0].loadedKm, road.distanceMiles * road.internationalMileKm, 'LOADED_DISTANCE')
  close(us[0].emptyKm, us[0].loadedKm * emptyRatio, 'EMPTY_DISTANCE')
  close(exposure.usClock.elapsedHours, outbound.elapsedHours, 'OUTBOUND_CLOCK')
  const dedicated = ordinary.id === 'DEDICATED_EMPTY_SAME_BOX_RETURN'
  const nominalDrivingHours = outbound.nominalDrivingHours + recovery.nominalDrivingHours
  const paidBreakHours = outbound.breakHours + recovery.breakHours
  const terminalHandlingHours = policy.terminalHandlingHours
  const handoffHours = policy.handoffHours * (dedicated ? 2 : 1)
  const synchronizationWaitHours = ordinary.usAssetWaitAndHandoffDeltaHours
  if (!Number.isFinite(synchronizationWaitHours) || synchronizationWaitHours < 0 || synchronizationWaitHours > 1000)
    throw new Error('US_DRIVER_PLANNING_WAIT_RANGE')
  const paidWorkerHours = nominalDrivingHours + paidBreakHours + terminalHandlingHours + handoffHours + synchronizationWaitHours
  const unpaidMovementRestHours = outbound.offDutyHours + recovery.offDutyHours
  const unpaidRecoveryRestHours = policy.recoveryRestHours
  const assignedElapsedHours = ordinary.knownUsElapsedClockDays * 24
  close(us[0].cycleDays * 24 + synchronizationWaitHours, assignedElapsedHours, 'ORDINARY_CLOCK')
  close(paidWorkerHours + unpaidMovementRestHours + unpaidRecoveryRestHours, assignedElapsedHours, 'PAID_UNPAID_PARTITION')
  if (!(paidWorkerHours > 0) || !(assignedElapsedHours > 0) || assignedElapsedHours > 1000) throw new Error('US_DRIVER_PLANNING_HOUR_RANGE')
  const employerCostFactor = p.employerCostFactor.totalHourlyUsd / p.employerCostFactor.wagesHourlyUsd
  const totalEmployerHourlyUsd = p.wage.meanHourlyUsd * employerCostFactor
  const grossWageComponentUsd = p.wage.meanHourlyUsd * paidWorkerHours
  const employerBenefitsComponentUsd = (totalEmployerHourlyUsd - p.wage.meanHourlyUsd) * paidWorkerHours
  const employerCompensationUsd = totalEmployerHourlyUsd * paidWorkerHours
  close(grossWageComponentUsd + employerBenefitsComponentUsd, employerCompensationUsd, 'COMPENSATION_SUM')
  const startedAwayAssignmentBlocks = Math.ceil(assignedElapsedHours / 24 - 1e-10)
  const mealAndIncidentalsUsd = startedAwayAssignmentBlocks * p.mealAndIncidentals.publishedTransportationConusUsdPerDay
  return { model: p.model, cycleId: cycle.id, sourcePeriods: { wage: p.wage.period, employerFactor: p.employerCostFactor.period,
    mieEffectiveFrom: p.mealAndIncidentals.effectiveFrom },
    employerCostFactor, totalEmployerHourlyUsd, nominalDrivingHours, paidBreakHours, terminalHandlingHours, handoffHours,
    synchronizationWaitHours, paidWorkerHours, unpaidMovementRestHours, unpaidRecoveryRestHours, assignedElapsedHours,
    grossWageComponentUsd, employerBenefitsComponentUsd, employerCompensationUsd, startedAwayAssignmentBlocks, mealAndIncidentalsUsd,
    knownOrdinaryDriverAndMieUsd: employerCompensationUsd + mealAndIncidentalsUsd,
    replacesMileageAggregate: true, ordinaryScopePricedUnderDeclaredHypotheses: true,
    actualCarrierCompensationOrReimbursementObserved: false, extraStatutoryOrBonusPercentAdded: false,
    taxSubstantiationOrDeductionComputed: false, allCarrierTravelCovered: false,
    compensationContract: p.timePolicy.scope, travelScope: p.mealAndIncidentals,
    sources: p.sources, limitations: p.limitations,
    calibrated: false, quoteReady: false, adoptedValues: 0 }
}
