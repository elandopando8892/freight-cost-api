import { describe,expect,it } from 'vitest'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'
import { applyUsTractorInsurancePublicModel } from '../scripts/lib/reference-insurance-employer.js'
import { calculateUsProspectiveCapital,applyUsProspectiveCapitalPublicModel } from '../scripts/lib/reference-us-prospective-capital.js'
import { reconcileBinationalFixedBudget } from '../src/modules/engine/benchmark-binational-budget.js'
import { consolidateBinationalReferenceBudget } from '../scripts/consolidate-binational-reference-budget.js'

const policy=JSON.parse(readLocalDocument('docs/research/B2_US_PROSPECTIVE_CAPITAL_2026-10-02.json'))
const summary=consolidateBinationalReferenceBudget()
const comparison=summary.supportingUsCapitalComparison.scenarios.find(s=>s.exposureId==='H12026')!
const original=JSON.parse(readLocalDocument('docs/research/B2_BINATIONAL_FIXED_BUDGET_WORKSHEET_2026-10-01.json')).budget
const insured=applyUsTractorInsurancePublicModel(original,JSON.parse(readLocalDocument('docs/research/B2_US_INSURANCE_PUBLIC_MODEL_2026-10-02.json'))).budget

describe('approved prospective US market capital, paired non-adopted budgets',()=>{
  it('measures value use, without adding published listing or unknown transaction charges',()=>{
    const m=calculateUsProspectiveCapital(policy,comparison)
    expect(m.marketValueUseLossMonthlyUsd).toBeCloseTo(472.9918087706058,10)
    expect(m.modes.CASH.monthlyBudgetUsd).toBe(472.99)
    expect(m.modes.FINANCED.monthlyBudgetUsd).toBe(691.43)
    expect(m.modes.FINANCED.monthlyModelUsd-m.modes.CASH.monthlyModelUsd).toBeCloseTo(218.43498551304322,10)
    expect(m.transactionCosts).toMatchObject({listingEventIncluded:false,publishedListingReferenceUsd:49,
      acquisitionAdjustmentUsd:null,otherDisposalCostsUsd:null,financingFeeMonthlyUsd:null,unknownAmountsSetToZero:false})
    expect(m.modes.CASH.monthlyModelUsd).not.toBe(comparison.cash.supportedComponentMonthlyUsd)
  })
  it('does not certify actual capital/debt, service life, equity return or full pilot',()=>{
    expect(calculateUsProspectiveCapital(policy,comparison)).toMatchObject({modelFamilyResolved:true,
      actualAllInInvoiceComplete:false,actualCarrierAssetsOrDebtObserved:false,holdingIsRemainingServiceLife:false,
      publishedAprConvertedToNominal:false,loanPrincipalAddedToExpense:false,
      equityOpportunityCostIncluded:false,equityOpportunityCostAssumedZero:false,wholePilotCostUsd:null,
      representativeMonthIsWindowAverageNotFirstLoanMonth:true,calibrated:false,quoteReady:false,adoptedValues:0})
  })
  it('keeps paired modes separate and changes only the US capital amount',()=>{
    const before=structuredClone(insured)
    const cash=applyUsProspectiveCapitalPublicModel(insured,policy,comparison,'CASH')
    const financed=applyUsProspectiveCapitalPublicModel(insured,policy,comparison,'FINANCED')
    expect(insured).toEqual(before)
    for(let i=0;i<insured.expenses.length;i++){
      if(insured.expenses[i].economicExpenseId==='US_TRACTOR_CAPITAL'){
        expect(cash.budget.expenses[i].amount!.value).toBe(472.99)
        expect(financed.budget.expenses[i].amount!.value).toBe(691.43)
      } else {
        expect(cash.budget.expenses[i]).toEqual(insured.expenses[i])
        expect(financed.budget.expenses[i]).toEqual(insured.expenses[i])
      }
    }
    expect(cash.budget.evidence).toEqual(financed.budget.evidence)
    expect(cash.budget.expenses.find(e=>e.economicExpenseId==='US_TRACTOR_CAPITAL')!.allocations).toEqual([{resourceId:'US_TRACTOR',share:1}])
  })
  it('both remain incomplete with eight unknown amounts, original blank untouched',()=>{
    for(const mode of ['CASH','FINANCED']){
      const b=applyUsProspectiveCapitalPublicModel(insured,policy,comparison,mode).budget
      expect(b.expenses.filter(e=>e.amount===null)).toHaveLength(8)
      expect(reconcileBinationalFixedBudget(b)).toMatchObject({status:'INCOMPLETE',cfuUsd:null,cvuUsd:null,monthlyGroupTotalUsd:null})
    }
    expect(original.expenses.every((e:{amount:unknown})=>e.amount===null)).toBe(true)
  })
  it('root publishes both budgets rather than choosing an actual payment mode',()=>{
    const a=summary.reviewedPublicModelBudgets
    expect(a.CASH.expenses.find(e=>e.economicExpenseId==='US_TRACTOR_CAPITAL')!.amount!.value).toBe(472.99)
    expect(a.FINANCED.expenses.find(e=>e.economicExpenseId==='US_TRACTOR_CAPITAL')!.amount!.value).toBe(691.43)
    expect(summary.authoritativeBudgetDisplayMode).toBe('CASH_REFERENCE_BASELINE_NOT_SELECTED_ACTUAL_FINANCING')
    expect(summary.budgetPaymentModeComparisons.CASH.status).toBe('INCOMPLETE')
    expect(summary.budgetPaymentModeComparisons.FINANCED.status).toBe('INCOMPLETE')
    expect(Object.values(summary.outputs).every(v=>v===null)).toBe(true)
  })
  it.each(['CASH','FINANCED'])('repeats %s without mutation or duplicate evidence',mode=>{
    const first=applyUsProspectiveCapitalPublicModel(insured,policy,comparison,mode)
    expect(first).toEqual(applyUsProspectiveCapitalPublicModel(insured,policy,comparison,mode))
    expect(()=>applyUsProspectiveCapitalPublicModel(first.budget,policy,comparison,mode)).toThrow('WOULD_OVERWRITE')
  })
  it('rejects a different exposure or missing explicit methodological permission',()=>{
    expect(()=>calculateUsProspectiveCapital(policy,{...comparison,exposureId:'FY2025'})).toThrow('EXPOSURE_MISMATCH')
    expect(()=>calculateUsProspectiveCapital({...policy,permissionEvidence:'INFERRED'},comparison)).toThrow()
  })
  it('rejects costs silently changed to zero and duplicate sources',()=>{
    expect(()=>calculateUsProspectiveCapital(policy,{...comparison,input:{...comparison.input,acquisitionAdjustmentUsd:0}})).toThrow('MUST_REMAIN_NULL')
    expect(()=>calculateUsProspectiveCapital({...policy,sources:[...policy.sources,policy.sources[0]]},comparison)).toThrow('DUPLICATE_SOURCE')
  })
  it('rejects other period/profile/mode and shared-box charging',()=>{
    expect(()=>applyUsProspectiveCapitalPublicModel({...insured,referencePeriod:'2026-11'},policy,comparison,'CASH')).toThrow('PERIOD_MISMATCH')
    expect(()=>applyUsProspectiveCapitalPublicModel(insured,{...policy,profileReference:'OTHER'},comparison,'CASH')).toThrow('PROFILE_MISMATCH')
    expect(()=>applyUsProspectiveCapitalPublicModel(insured,policy,comparison,'SUM_BOTH')).toThrow()
    const changed=structuredClone(insured)
    changed.expenses.find(e=>e.economicExpenseId==='US_TRACTOR_CAPITAL')!.allocations=[{resourceId:'SHARED_TRAILER',share:1}]
    expect(()=>applyUsProspectiveCapitalPublicModel(changed,policy,comparison,'CASH')).toThrow('ALLOCATION_MISMATCH')
  })
})
