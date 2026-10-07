import { describe, expect, it } from 'vitest'
import { calculateMonitoringCoverageReference as calculate } from '../scripts/lib/reference-monitoring-coverage.js'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'

const input = JSON.parse(readLocalDocument('docs/research/B2_MONITORING_COVERAGE_REFERENCE_2026-10-01.json')).scenario

describe('continuous monitoring staffing quantity is explicit, not observed or adopted', () => {
  it('accounts for paid weekly rest, vacation and break relief without reducing wages', () => {
    const r = calculate(input)
    expect(r.requiredSeatHoursPerYear).toBe(8760)
    expect(r.productiveSeatHoursPerEmployeeYear).toBeCloseTo((365 * 6 / 7 - 12) * 5.5, 9)
    expect(r.analyticalEmployeeEquivalent).toBeCloseTo(8760 / ((365 * 6 / 7 - 12) * 5.5), 10)
    expect(r.roundedPlanningHeadcount).toBe(6)
    expect(r.roundedAnnualSlackSeatHours).toBeGreaterThan(0)
    expect(r).toMatchObject({weeklyLegalCapHours:48,conservativeDailyCapHours:7,
      salaryReducedForVacationOrWeeklyRest:false,holidayUnavailableDaysSubtracted:false,
      legallyCompliantRosterEstablished:false,observedCarrierHeadcount:null,monitoredUnitsPerSeat:null,
      actualFleetQuantity:null,completeMonthlyPayrollMxn:null,resourceAllocationShares:null,
      coversContinuousOperations:false,eligibleForBudget:false,selected:false})
  })
  it('does not claim that one employee or three eight-hour shifts cover continuous service', () => {
    expect(calculate(input).oneEmployeeAnnualCoverageFraction).toBeLessThan(.2)
    expect(() => calculate({...input,paidShiftHours:8})).toThrow()
  })
  it('scales workload seats before rounding, not an independently rounded six employees per seat', () => {
    const r = calculate({...input,concurrentSeats:2})
    expect(r.requiredSeatHoursPerYear).toBe(17520)
    expect(r.roundedPlanningHeadcount).toBe(11)
  })
  it('sensitivity to absence increases the planning requirement, never wages per employee', () => {
    const r = calculate({...input,additionalUnavailableWorkdays:50,additionalUnavailableBasis:'Explicit absence sensitivity'})
    expect(r.roundedPlanningHeadcount).toBe(7)
    expect(r.salaryReducedForVacationOrWeeklyRest).toBe(false)
  })
  it.each([
    {year:2027},{concurrentSeats:0},{concurrentSeats:1.5},{concurrentSeats:NaN},
    {paidWorkdaysPerWeek:7},{breakReliefHoursPerWorkday:0},{breakReliefHoursPerWorkday:6},
    {paidShiftHours:0},{annualVacationWorkdays:0},{additionalUnavailableWorkdays:-1},
    {additionalUnavailableBasis:''},{illustrativeNotCarrierFacts:false},{actualFleetQuantity:40},
    {compensationHypothesis:'PRORATE_WAGE_BY_SHIFT'},{holidaysPolicy:'FREE_HOLIDAY_WORK'},
  ])('rejects unsupported or implicit policy %j', changes => {
    expect(() => calculate({...input,...changes})).toThrow()
  })
})
