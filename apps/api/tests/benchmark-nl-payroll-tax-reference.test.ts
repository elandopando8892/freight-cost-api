import { describe, expect, it } from 'vitest'
import { calculateNlPayrollTaxReference as calculate } from '../scripts/lib/reference-nl-payroll-tax.js'

const base = {year:2026,jurisdiction:'NUEVO_LEON',monthlySalaryMxn:15000,
  compensationBasis:'GROSS_FIXED_WAGES_ONLY_HYPOTHESIS',profile:'FIRST_YEAR_MINIMUM_BENEFITS_NO_ABSENCE',
  annualPaymentHypothesis:'TWELVE_WAGES_AGUINALDO_VACATION_PREMIUM',
  reliefHypothesis:'NO_SPECIAL_EXEMPT_PERSON_ENTITY_OR_CREDIT_ASSUMED',referenceRate:.03}

describe('Nuevo Leon annual planning ISN, never SBC or a monthly tax declaration', () => {
  it.each([[15000,189000,5670,472.5],[16000,201600,6048,504]])('recomputes published-rate components for %s salary', (salary,remuneration,tax,accrual) => {
    const r=calculate({...base,monthlySalaryMxn:salary})
    expect(r.annualTaxableRemunerationHypothesisMxn).toBe(remuneration)
    expect(r.annualTaxReferenceMxn).toBe(tax)
    expect(r.meanMonthTaxAccrualMxn).toBe(accrual)
    expect(r.annualTaxableRemunerationHypothesisMxn).toBe(r.annualWagesMxn+r.annualAguinaldoMxn+r.annualVacationPremiumMxn)
  })
  it('retains unknown monthly due and total; no duplicate vacation, employer quotas or SBC', () => {
    expect(calculate(base)).toMatchObject({monthlyTaxDueMxn:null,completeMonthlyEmployerCostMxn:null,
      sbcUsedAsTaxBase:false,employerContributionsIncludedInTaxBase:false,paidVacationWageAddedAgain:false,
      actualExemptionEligibilityEstablished:false,isObservedPayroll:false,isLowerBound:false,eligibleForBudget:false,selected:false})
  })
  it.each([{referenceRate:.04},{year:2027},{jurisdiction:'TAMAULIPAS'},{monthlySalaryMxn:0},
    {monthlySalaryMxn:-1},{monthlySalaryMxn:NaN},{monthlySalaryMxn:Infinity},{monthlySalaryMxn:'15000'},
    {compensationBasis:'NET'},{profile:'VARIABLE_SBC'},{annualPaymentHypothesis:'MONTHLY_CASH'},
    {reliefHypothesis:'EXEMPT_EMPLOYER'},{sbc:524.66},{employerContributions:3893},{paidVacationSalary:6000}])('rejects unsupported bases and proposal %j', change => {
    expect(() => calculate({...base,...change})).toThrow()
  })
})
