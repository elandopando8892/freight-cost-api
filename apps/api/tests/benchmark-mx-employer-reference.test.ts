import { describe, expect, it } from 'vitest'
import { calculateMxEmployerReference as calculate } from '../scripts/lib/reference-mx-employer.js'

const base = { month:'2026-10', monthlySalaryMxn:15000,
  compensationBasis:'GROSS_FIXED_WAGES_ONLY_HYPOTHESIS',
  profile:'FIRST_YEAR_MINIMUM_BENEFITS_NO_ABSENCE', umaDailyMxn:117.31, ceavRate:.07513 }

describe('narrow hypothetical MX statutory components, not complete payroll', () => {
  it('separates benefit accrual, SBC and economic wages without paid-vacation duplication', () => {
    const r=calculate(base)
    expect(r).toMatchObject({coveredDays:31,salaryDailyMxn:500,annualAguinaldoMxn:7500,
      annualVacationPremiumMxn:1500,meanMonthBenefitAccrualMxn:750,
      paidVacationWageAddedAgain:false,sbcAddedAsCashCost:false})
    expect(r.integratedDailySbcMxn).toBeCloseTo(500*383/365,10)
    expect(r.conditionalComponentSumMxn).toBeCloseTo(15750+r.knownContributionComponentMxn,9)
  })
  it('applies employer rates on the correct daily base and 2026 CEAV, not 2030', () => {
    const r=calculate(base), s=500*383/365, d=31
    const expected={EM_FIXED:.204*117.31*d,
      EM_EXCESS:.011*(s-3*117.31)*d,EM_CASH:.007*s*d,
      PENSIONERS_MEDICAL:.0105*s*d,INVALIDITY_LIFE:.0175*s*d,
      CHILDCARE_SOCIAL:.01*s*d,RETIREMENT:.02*s*d,CEAV:.07513*s*d,HOUSING:.05*s*d}
    for(const key of Object.keys(expected) as (keyof typeof expected)[]) expect(r.componentsMxn[key]).toBeCloseTo(expected[key],8)
    expect(r.workerWithholdingAdded).toBe(false)
    expect(r.creditWithholdingAdded).toBe(false)
  })
  it('caps contribution SBC only, never the paid wage or benefit accrual', () => {
    const r=calculate({...base,monthlySalaryMxn:300000})
    expect(r.cappedDailySbcMxn).toBe(25*117.31)
    expect(r.monthlySalaryMxn).toBe(300000)
    expect(r.annualAguinaldoMxn).toBe(150000)
    expect(r.componentsMxn.CEAV).toBeCloseTo(.07513*25*117.31*31,8)
  })
  it.each([['2026-02',28],['2026-04',30],['2026-10',31]])('uses actual %s full-calendar covered days', (month,days) => {
    const r=calculate({...base,month})
    expect(r.coveredDays).toBe(days)
    expect(r.meanMonthBenefitAccrualMxn).toBe(750)
    expect(r.componentsMxn.EM_FIXED).toBeCloseTo(.204*117.31*Number(days),9)
  })
  it('does not replace risk/ISN/other costs or budget with a partial sum', () => {
    const r=calculate(base)
    expect(r).toMatchObject({workRiskContributionMxn:null,statePayrollTaxMxn:null,otherEmployerCostsMxn:null,
      completeMonthlyEmployerCostMxn:null,effectiveCompleteBurden:null,isObservedPayroll:false,
      isLowerBound:false,eligibleForBudget:false,selected:false})
  })
  it.each([
    {month:'2026-01'},{month:'2027-10'},{month:'2026-13'},
    {umaDailyMxn:113.14},{ceavRate:.11875},{monthlySalaryMxn:14000},
    {monthlySalaryMxn:-1},{monthlySalaryMxn:NaN},{monthlySalaryMxn:Infinity},
    {compensationBasis:'NET'},{compensationBasis:'EMPLOYER_TOTAL'},
    {profile:'VARIABLE_SBC'},{coveredDays:30},{riskRate:0},{monthlySalaryMxn:'15000'},
  ])('rejects unsupported or ambiguous input %j', change => {
    expect(() => calculate({...base,...change})).toThrow()
  })
})
