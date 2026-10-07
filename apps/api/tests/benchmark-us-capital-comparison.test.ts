import { describe, expect, it } from 'vitest'
import { calculateUsCapitalComparison } from '../scripts/lib/reference-us-capital-comparison.js'

const input={askingUsd:40495,holdingMonths:36,monthlyKm:11307.27,
  annualAgeRetention:0.9071,retentionPerThousandAdditionalMiles:0.999,
  listingFeeUsd:49,acquisitionAdjustmentUsd:null,otherDisposalCostsUsd:null,
  downPaymentFraction:0.1,loanMonths:72,financingFeeMonthlyUsd:null,
  nominalHypothesis:{annualRate:0.09,kind:'INDEPENDENT_ANALYTICAL_NOMINAL_HYPOTHESIS_NOT_APR_CONVERSION',providerNominalConfirmed:false}}

describe('US capital cash/financed reference without silently filling incomplete costs',()=>{
  it('keeps the same asset, forward miles and listing allocation in both modes',()=>{
    const r=calculateUsCapitalComparison(input)
    expect(r.additionalMiles).toBeCloseTo(input.monthlyKm/1.609344*36,8)
    expect(r.grossEndpointUsd).toBeCloseTo(40495*0.9071**3*0.999**(r.additionalMiles/1000),8)
    expect(r.listingAllocationMonthlyUsd).toBeCloseTo(49/36,12)
    expect(r.cash.supportedComponentMonthlyUsd).toBeCloseTo(r.askingValueLossMonthlyUsd+49/36,10)
    expect(r.financed.supportedAndHypothesizedComponentMonthlyUsd-r.cash.supportedComponentMonthlyUsd)
      .toBeCloseTo(r.financed.analyticalInterestMonthlyUsd,10)
  })
  it('does not call unknown fees zero, APR nominal, or the holding window service life',()=>{
    const r=calculateUsCapitalComparison(input)
    expect(r.cash.completeCapitalMonthlyUsd).toBeNull()
    expect(r.financed.completeCapitalMonthlyUsd).toBeNull()
    expect(r).toMatchObject({eligibleForBudget:false,calibrated:false,appliedToPilot:false,
      componentsAreCostOrCfuFloor:false,listingIsAllDisposalCosts:false,providerAprConvertedToNominal:false,
      holdingIsRemainingServiceLife:false,completeCfuUsd:null,completeD2dUsd:null})
    expect(r.financed.unknownFeesExcludedFromScheduleNotAssumedZero).toBe(true)
  })
  it('retains the remaining debt but never adds full payment or repayment to depreciation',()=>{
    const r=calculateUsCapitalComparison(input)
    const first36=r.financed.debtSchedule.rows.slice(0,36)
    expect(r.financed.analyticalInterestMonthlyUsd).toBeCloseTo(first36.reduce((s,row)=>s+row.accruedInterest,0)/36,10)
    expect(r.financed.balanceAtHoldingEndUsd).toBe(first36[35].closingBalance)
    expect(r.financed.balanceAtHoldingEndUsd).toBeGreaterThan(0)
    expect(r.financed.principalOrFullPaymentAddedToCapital).toBe(false)
    expect(r.financed.analyticalInterestMonthlyUsd).toBeLessThan(r.financed.regularDebtPaymentUsd)
  })
  it('a documented numerical bridge remains research, not an adopted model',()=>{
    const r=calculateUsCapitalComparison({...input,acquisitionAdjustmentUsd:360,otherDisposalCostsUsd:72,financingFeeMonthlyUsd:5})
    expect(r.cash.completeCapitalMonthlyUsd).toBeCloseTo(r.cash.supportedComponentMonthlyUsd+12,10)
    expect(r.financed.completeCapitalMonthlyUsd).toBeCloseTo(r.cash.completeCapitalMonthlyUsd!+r.financed.analyticalInterestMonthlyUsd+5,10)
    expect(r.eligibleForBudget).toBe(false)
  })
  it('one unresolved disposal correction cannot close the cash bridge',()=>{
    expect(calculateUsCapitalComparison({...input,acquisitionAdjustmentUsd:0}).cash.completeCapitalMonthlyUsd).toBeNull()
  })
  it('allows an explicitly documented acquisition discount, so the component is not a cost floor',()=>{
    const r=calculateUsCapitalComparison({...input,acquisitionAdjustmentUsd:-360,otherDisposalCostsUsd:0})
    expect(r.cash.completeCapitalMonthlyUsd).toBeCloseTo(r.cash.supportedComponentMonthlyUsd-10,10)
    expect(()=>calculateUsCapitalComparison({...input,acquisitionAdjustmentUsd:-40495})).toThrow()
  })
  it('a zero-rate declared hypothesis does not invent fee-free financed capital',()=>{
    const r=calculateUsCapitalComparison({...input,nominalHypothesis:{...input.nominalHypothesis,annualRate:0}})
    expect(r.financed.analyticalInterestMonthlyUsd).toBe(0)
    expect(r.financed.completeCapitalMonthlyUsd).toBeNull()
  })
  it('interest ends with debt, not with the longer holding horizon',()=>{
    const r=calculateUsCapitalComparison({...input,loanMonths:12})
    expect(r.financed.balanceAtHoldingEndUsd).toBe(0)
    expect(r.financed.analyticalInterestMonthlyUsd).toBeCloseTo(r.financed.debtSchedule.totalAccruedInterest/36,10)
  })
  it('repeats without changing the input or accumulating cash flows',()=>{
    const before=structuredClone(input)
    expect(calculateUsCapitalComparison(input)).toEqual(calculateUsCapitalComparison(input))
    expect(input).toEqual(before)
  })
  it.each([['monthlyKm',0],['holdingMonths',0],['listingFeeUsd',-1],['askingUsd',Infinity],['downPaymentFraction',1]])('rejects invalid %s',(key,value)=>{
    expect(()=>calculateUsCapitalComparison({...input,[key]:value})).toThrow()
  })
  it('rejects labelling a provider APR as confirmed nominal interest',()=>{
    expect(()=>calculateUsCapitalComparison({...input,nominalHypothesis:{annualRate:0.09,kind:'APR',providerNominalConfirmed:true}})).toThrow()
  })
  it('rejects extra actual odometer which would repeat historical mileage',()=>{
    expect(()=>calculateUsCapitalComparison({...input,currentOdometerMiles:868507})).toThrow()
  })
})
