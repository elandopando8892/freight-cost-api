import { describe, expect, it } from 'vitest'
import { calculateMxWorkRiskReference as calculate } from '../scripts/lib/reference-mx-work-risk.js'
import { calculateMxEmployerReference } from '../scripts/lib/reference-mx-employer.js'

const employerInput={month:'2026-10',monthlySalaryMxn:15000,compensationBasis:'GROSS_FIXED_WAGES_ONLY_HYPOTHESIS',
  profile:'FIRST_YEAR_MINIMUM_BENEFITS_NO_ABSENCE',umaDailyMxn:117.31,ceavRate:.07513}
const base={employerInput,employerActivity:'EXCLUSIVE_GENERAL_CARGO_TRANSPORT_FRACTION_712',
  employeeRegistrationHypothesis:'SAME_TRANSPORT_EMPLOYER_REGISTRATION',
  registrationBasis:'NEW_REGISTRATION_CLASS_V_REFERENCE',riskClass:'V',referenceRate:.0758875}

describe('class V initial employer risk component under explicit public hypothesis', () => {
  it.each([[15000,1234.2634075342464],[16000,1316.5476347031963]])('calculates SBC-based component for %s', (salary,risk) => {
    const employer={...employerInput,monthlySalaryMxn:salary}
    const r=calculate({...base,employerInput:employer}), original=calculateMxEmployerReference(employer)
    expect(r.workRiskContributionMxn).toBeCloseTo(risk,9)
    expect(r.workRiskContributionMxn).toBeCloseTo((salary/30*383/365)*31*.0758875,9)
    expect(r.contributionComponentIncludingRiskMxn).toBeCloseTo(original.knownContributionComponentMxn+risk,9)
    expect(original.workRiskContributionMxn).toBeNull()
  })
  it.each([['2026-02',28],['2026-04',30],['2026-10',31]])('uses %s actual full-calendar contribution days', (month,days) => {
    const r=calculate({...base,employerInput:{...employerInput,month}})
    expect(r.coveredDays).toBe(days)
    expect(r.workRiskContributionMxn).toBeCloseTo(500*383/365*Number(days)*.0758875,9)
  })
  it('caps only SBC, not gross wages, and does not use ISN remuneration as risk base', () => {
    const r=calculate({...base,employerInput:{...employerInput,monthlySalaryMxn:300000}})
    expect(r.workRiskContributionMxn).toBeCloseTo(25*117.31*31*.0758875,9)
    expect(r.monthlySalaryMxn).toBe(300000)
  })
  it('does not replace an unknown existing-registration rate with a class mean or zero', () => {
    expect(calculate({...base,registrationBasis:'EXISTING_REGISTRATION_RATE_UNKNOWN',referenceRate:null})).toMatchObject({
      workRiskContributionMxn:null,contributionComponentIncludingRiskMxn:null,conditionalWageBenefitsContributionSumMxn:null,
      actualEmployerRateEstablished:false,completeMonthlyEmployerCostMxn:null,eligibleForBudget:false})
  })
  it('cannot turn an administrative occupation into class I or claim employer-total completeness', () => {
    expect(calculate(base)).toMatchObject({classifiedByEmployeeOccupation:false,workerWithholdingAdded:false,
      effectiveCompleteBurden:null,actualEmployerRateEstablished:false,completeMonthlyEmployerCostMxn:null,
      isObservedPayroll:false,isLowerBound:false,eligibleForBudget:false,selected:false})
  })
  it.each([{riskClass:'I'},{riskClass:'IV'},{referenceRate:.0465325},{referenceRate:7.58875},{referenceRate:0},
    {referenceRate:NaN},{referenceRate:null},{employerActivity:'OFFICE_WORK'},
    {employeeRegistrationHypothesis:'OFFICE_SEPARATE_CLASS_I'},
    {registrationBasis:'ACTUAL_CARRIER_RATE'},
    {registrationBasis:'EXISTING_REGISTRATION_RATE_UNKNOWN',referenceRate:.0758875},
    {annualSalaryBase:189000},{coveredDays:30},
    {employerInput:{...employerInput,compensationBasis:'NET'}},
    {employerInput:{...employerInput,monthlySalaryMxn:14000}}])('rejects unsupported profile %j', change => {
    expect(()=>calculate({...base,...change})).toThrow()
  })
})
