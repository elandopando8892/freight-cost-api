import { z } from 'zod'

const schema = z.object({
  scenarioId: z.string().trim().min(1),
  year: z.literal(2026),
  concurrentSeats: z.number().int().positive().max(100),
  coverageHoursPerDay: z.literal(24),
  coverageDaysPerWeek: z.literal(7),
  paidShiftHours: z.number().finite().positive().max(7),
  paidWorkdaysPerWeek: z.number().int().min(1).max(6),
  breakReliefHoursPerWorkday: z.number().finite().min(.5).max(7),
  annualVacationWorkdays: z.literal(12),
  additionalUnavailableWorkdays: z.number().finite().nonnegative().max(100),
  additionalUnavailableBasis: z.string().trim().min(1),
  compensationHypothesis: z.literal('FULL_MONTHLY_WAGE_NOT_PRORATED_BY_SHIFT_HOURS'),
  holidaysPolicy: z.literal('CONTINUOUS_SERVICE_HOLIDAYS_WORKED_PREMIUM_UNRESOLVED'),
  illustrativeNotCarrierFacts: z.literal(true),
}).strict()

/** Annualized capacity model, NOT a roster solver or labor compliance approval.
 * Paid weekly rest and vacation reduce seat availability, not monthly wages.
 * Holiday work is not removed here and then charged again as absent time. */
export function calculateMonitoringCoverageReference(raw: unknown) {
  const p = schema.parse(raw)
  if (p.breakReliefHoursPerWorkday >= p.paidShiftHours) throw new Error('NO_PRODUCTIVE_SHIFT_HOURS')
  if (p.paidShiftHours * p.paidWorkdaysPerWeek > 48) throw new Error('WEEKLY_2026_LIMIT_EXCEEDED')
  const yearDays = 365
  const productiveHoursPerWorkday = p.paidShiftHours - p.breakReliefHoursPerWorkday
  const annualizedWorkdaysBeforeLeave = yearDays * p.paidWorkdaysPerWeek / 7
  const annualizedAvailableWorkdays = annualizedWorkdaysBeforeLeave - p.annualVacationWorkdays - p.additionalUnavailableWorkdays
  if (annualizedAvailableWorkdays <= 0) throw new Error('NO_ANNUAL_CAPACITY')
  const productiveSeatHoursPerEmployeeYear = annualizedAvailableWorkdays * productiveHoursPerWorkday
  const requiredSeatHoursPerYear = yearDays * p.coverageHoursPerDay * p.concurrentSeats
  const analyticalEmployeeEquivalent = requiredSeatHoursPerYear / productiveSeatHoursPerEmployeeYear
  const roundedPlanningHeadcount = Math.ceil(analyticalEmployeeEquivalent)
  return {
    ...p, yearDays, weeklyLegalCapHours: 48, conservativeDailyCapHours: 7,
    productiveHoursPerWorkday, annualizedWorkdaysBeforeLeave, annualizedAvailableWorkdays,
    productiveSeatHoursPerEmployeeYear, requiredSeatHoursPerYear,
    analyticalEmployeeEquivalent, roundedPlanningHeadcount,
    roundedAnnualCapacitySeatHours: roundedPlanningHeadcount * productiveSeatHoursPerEmployeeYear,
    roundedAnnualSlackSeatHours: roundedPlanningHeadcount * productiveSeatHoursPerEmployeeYear - requiredSeatHoursPerYear,
    oneEmployeeAnnualCoverageFraction: productiveSeatHoursPerEmployeeYear / requiredSeatHoursPerYear,
    classification: 'ANNUALIZED_SEAT_CAPACITY_AND_PAYROLL_QUANTITY_HYPOTHESIS' as const,
    salaryReducedForVacationOrWeeklyRest: false, holidayUnavailableDaysSubtracted: false,
    legallyCompliantRosterEstablished: false, observedCarrierHeadcount: null,
    monitoredUnitsPerSeat: null, actualFleetQuantity: null,
    completeMonthlyPayrollMxn: null, resourceAllocationShares: null,
    coversContinuousOperations: false, eligibleForBudget: false, selected: false,
  }
}
