import {describe,it,expect} from 'vitest'
import {normalizeInsuranceReference,calculateUsEmployerStatutoryReference,calculateOwnedTrailerInsurancePlanningReference} from '../scripts/lib/reference-insurance-employer.js'
import {readLocalDocument} from '../scripts/assemble-economic-reference-cards.js'

const rules={taxYear:2026,ruleYear:2026,socialSecurityRate:0.062,socialSecurityCapUsd:184500,medicareRate:0.0145}
const employee=(id:string,wage:number) => ({id,annualTaxableWageUsd:wage,compensationBasis:'WAGES_ONLY'})
const trailerRule=JSON.parse(readLocalDocument('docs/research/B2_SHARED_BOX_INSURANCE_REFERENCE_2026-10-01.json'))

describe('one owned box US insurance planning reference, not a complete binational premium',()=>{
  it('connects published monetary range without fabricating insured value or a midpoint',()=>{
    const r=calculateOwnedTrailerInsurancePlanningReference(trailerRule)
    expect(r.publishedMonthlyRangeUsd).toEqual({low:25,high:150})
    expect(r.publishedAnnualEquivalentRangeUsd).toEqual({low:300,high:1800})
    expect(r).toMatchObject({valueBasedMonthlyRangeUsd:null,selectedMonthlyPremiumUsd:null,
      completeBinationalMonthlyInsuranceUsd:null,mxOrBorderCoverageProven:false,
      duplicateBoxChargeAdded:false,otherCoverageCostsSetToZero:false,eligibleForBudget:false,
      representationsAreAlternativesNotSum:true,statisticalConfidenceInterval:false,quotedPolicy:false})
  })
  it.each([25000,50000,60000,100000])('calculates value rule for synthetic USD value %s without clamping or adding alternatives',value=>{
    const r=calculateOwnedTrailerInsurancePlanningReference({...trailerRule,statedValueUsd:value})
    expect(r.valueBasedMonthlyRangeUsd!.low).toBeCloseTo(value*.01/12,10)
    expect(r.valueBasedMonthlyRangeUsd!.high).toBeCloseTo(value*.03/12,10)
    expect(r.publishedRangeIsClamp).toBe(false)
    expect(r.selectedMonthlyPremiumUsd).toBeNull()
  })
  it.each([0,-1,Infinity,NaN])('rejects invalid insured value %s',statedValueUsd=>{
    expect(()=>calculateOwnedTrailerInsurancePlanningReference({...trailerRule,statedValueUsd})).toThrow()
  })
  it.each([0,2])('rejects physical box count %s',physicalBoxCount=>{
    expect(()=>calculateOwnedTrailerInsurancePlanningReference({...trailerRule,physicalBoxCount})).toThrow()
  })
  it('rejects a reversed range and percent-as-fraction error',()=>{
    expect(()=>calculateOwnedTrailerInsurancePlanningReference({...trailerRule,publishedMonthlyRangeUsd:{low:150,high:25}})).toThrow()
    expect(()=>calculateOwnedTrailerInsurancePlanningReference({...trailerRule,annualValueRate:{low:1,high:3}})).toThrow()
  })
  it('rejects transfer to MX, MXN or non-owned interchange',()=>{
    expect(()=>calculateOwnedTrailerInsurancePlanningReference({...trailerRule,currency:'MXN'})).toThrow()
    expect(()=>calculateOwnedTrailerInsurancePlanningReference({...trailerRule,source:{...trailerRule.source,territory:'MX'}})).toThrow()
    expect(()=>calculateOwnedTrailerInsurancePlanningReference({...trailerRule,source:{...trailerRule.source,coverage:'TRAILER_INTERCHANGE'}})).toThrow()
  })
})

describe('research insurance periods and employer components, never complete adopted budgets',() => {
  it.each([['ANNUAL_AMOUNT',12000,6,1000],['TERM_AMOUNT',6000,6,1000],['MONTHLY_AVERAGE',926,null,926]] as const)(
    'normalizes %s without confusing period and annual equivalence',(basis,amount,termMonths,monthly) => {
      const result=normalizeInsuranceReference({amount,basis,termMonths,currency:'USD'})
      expect(result.monthlyMoneyReference).toBe(monthly)
      expect(result.annualMoneyEquivalent).toBe(monthly*12)
      expect(result).toMatchObject({actualMonthlyBilling:null,monthlyEconomicInsurance:null,equivalentIsQuotedAnnualPolicy:false,eligibleForBudget:false})
    })
  it('requires the period of a term premium',() => {
    expect(() => normalizeInsuranceReference({amount:6000,basis:'TERM_AMOUNT',termMonths:null,currency:'MXN'})).toThrow('INSURANCE_TERM_REQUIRED')
  })
  it.each([0,-1,61,1.5])('rejects invalid term %s',termMonths => {
    expect(() => normalizeInsuranceReference({amount:6000,basis:'TERM_AMOUNT',termMonths,currency:'USD'})).toThrow()
  })
  it.each([NaN,Infinity,-1])('rejects invalid monetary input %s',amount => {
    expect(() => normalizeInsuranceReference({amount,basis:'ANNUAL_AMOUNT',termMonths:null,currency:'USD'})).toThrow()
  })
  it('keeps MXN gross reference separate from tax-net USD budget',() => {
    const result=normalizeInsuranceReference({amount:130784.01,basis:'ANNUAL_AMOUNT',termMonths:null,currency:'MXN'})
    expect(result.monthlyMoneyReference).toBeCloseTo(10898.6675,8)
    expect(result.currency).toBe('MXN')
    expect(result.monthlyEconomicInsurance).toBeNull()
  })
  it.each([0,54740,184500,250000])('calculates employer OASDI/HI separately at wage%s',wage => {
    const result=calculateUsEmployerStatutoryReference({...rules,employees:[employee('ONE',wage)]})
    expect(result.annualKnownEmployerTaxComponentUsd).toBeCloseTo(Math.min(wage,184500)*0.062+wage*0.0145,8)
    expect(result).toMatchObject({monthlyCompleteEmployerCostUsd:null,employeeWithholdingAddedAsEmployerCost:false,additionalEmployeeMedicareAdded:false,eligibleForBudget:false})
  })
  it('caps each employee, not the combined payroll',() => {
    const result=calculateUsEmployerStatutoryReference({...rules,employees:[employee('A',150000),employee('B',150000)]})
    expect(result.annualKnownEmployerTaxComponentUsd).toBe(22950)
    expect(result.annualKnownEmployerTaxComponentUsd).not.toBe(184500*0.062+300000*0.0145)
  })
  it('rejects duplicate employee evidence',() => {
    expect(() => calculateUsEmployerStatutoryReference({...rules,employees:[employee('A',1),employee('A',1)]})).toThrow('DUPLICATE_EMPLOYEE_REFERENCE')
  })
  it('rejects rules for a different tax year',() => {
    expect(() => calculateUsEmployerStatutoryReference({...rules,taxYear:2025,employees:[employee('A',1)]})).toThrow('EMPLOYER_RULE_YEAR_MISMATCH')
  })
  it('does not add employer taxes again to total compensation',() => {
    expect(() => calculateUsEmployerStatutoryReference({...rules,employees:[{...employee('A',1),compensationBasis:'EMPLOYER_TOTAL'}]})).toThrow()
  })
})
