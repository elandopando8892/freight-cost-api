import {describe,it,expect} from 'vitest'
import {readLocalDocument} from '../scripts/assemble-economic-reference-cards.js'
import {calculateUsTractorInsurancePublicModel,applyUsTractorInsurancePublicModel} from '../scripts/lib/reference-insurance-employer.js'
import {reconcileBinationalFixedBudget} from '../src/modules/engine/benchmark-binational-budget.js'

const load=(name:string)=>JSON.parse(readLocalDocument(`docs/research/${name}`))
const model=load('B2_US_INSURANCE_PUBLIC_MODEL_2026-10-02.json')
const baseline=load('B2_BINATIONAL_FIXED_BUDGET_WORKSHEET_2026-10-01.json').budget
describe('reviewed US-only premium model, not matched policy',()=>{
  it('normalizes annual cargo, preserves cents and cash/financed coverage',()=>{
    const r=calculateUsTractorInsurancePublicModel(model)
    expect(r.cargoMonthlyExactUsd).toBeCloseTo(1553/12,12)
    expect(r.monthlyExactUsd).toBeCloseTo(926+1553/12,12)
    expect(r.monthlyBudgetUsd).toBe(1055.42)
    expect(r.annualExpenseReferenceUsd).toBe(12665)
    expect(r.annualRoundingDifferenceUsd).toBe(0.04)
    expect(r.annualExpenseReferenceUsd).not.toBe((926+129)*12)
    expect(r).toMatchObject({planningPremiumScopeComplete:true,actualInvoiceComplete:false,
      jointStatisticalEstimate:false,matchedPolicyObserved:false,boxCoverageProven:false,
      mxCoverageProven:false,calibrationOrCanonicalAdoption:false,quoteReady:false})
    expect(r.paymentModes).toEqual(['CASH','FINANCED'])
  })
  it('fills one model row while preserving the original and all nine unknowns',()=>{
    const original=structuredClone(baseline)
    const r=applyUsTractorInsurancePublicModel(baseline,model)
    expect(baseline).toEqual(original)
    expect(r.budget.expenses.filter(e=>e.amount!==null)).toHaveLength(1)
    for(const e of original.expenses.filter((e:{economicExpenseId:string})=>e.economicExpenseId!=='US_TRACTOR_INSURANCE')) {
      expect(r.budget.expenses.find(row=>row.economicExpenseId===e.economicExpenseId)).toEqual(e)
    }
    const audit=reconcileBinationalFixedBudget(r.budget)
    const i=r.budget.expenses.findIndex(e=>e.economicExpenseId==='US_TRACTOR_INSURANCE')
    expect(audit.issues.some(issue=>issue.field===`expenses.${i}`)).toBe(false)
    expect(audit).toMatchObject({status:'INCOMPLETE',monthlyGroupTotalUsd:null,cfuUsd:null,cvuUsd:null,calibrated:false,quoteReady:false,adoptedValues:0})
    expect(audit.issues.filter(issue=>issue.code==='MISSING_MONTHLY_AMOUNT')).toHaveLength(9)
    expect(r.budget.evidence.every(e=>e.kind==='DOCUMENTED_PUBLIC_MODEL' && e.resourceIds.length===1 && e.resourceIds[0]==='US_TRACTOR')).toBe(true)
  })
  it.each([
    ['multiple power units',{planningUsPowerUnits:2}],['multiple cargo policies',{planningCargoPolicies:2}],
    ['specialty premium',{autoMonthlyProxyUsd:734}],['monthly display as annual',{cargoAnnualProxyUsd:129}],
    ['MX territory',{operatingTerritory:'MX_AND_US'}],['MX resource',{resourceId:'MX_TRACTOR'}],
    ['actual policy',{decision:'ACTUAL_QUOTED_POLICY'}],['unsupported currency',{currency:'MXN'}],
    ['premium financing',{premiumPaymentBasis:'FINANCED_PREMIUM_WITH_UNKNOWN_FEES'}],
    ['extra box charge',{extraBoxPremiumUsd:25}],
  ])('rejects %s',(_,mutation)=>{
    expect(()=>calculateUsTractorInsurancePublicModel({...model,...mutation})).toThrow()
  })
  it('rejects duplicate sources',()=>{
    expect(()=>calculateUsTractorInsurancePublicModel({...model,sources:[model.sources[0],model.sources[0]]})).toThrow('US_INSURANCE_MODEL_SOURCE_SET_MISMATCH')
  })
  it('refuses incompatible profile or month',()=>{
    const wrong=structuredClone(baseline)
    wrong.resources.find((r:{resourceId:string})=>r.resourceId==='US_TRACTOR').profileReference='OTHER'
    expect(()=>applyUsTractorInsurancePublicModel(wrong,model)).toThrow('US_INSURANCE_MODEL_PROFILE_MISMATCH')
    expect(()=>applyUsTractorInsurancePublicModel({...baseline,referencePeriod:'2026-09'},model)).toThrow('US_INSURANCE_MODEL_BUDGET_PERIOD_MISMATCH')
  })
  it('refuses overwrites, evidence duplicates and changed cost allocation',()=>{
    const prepared=applyUsTractorInsurancePublicModel(baseline,model).budget
    expect(()=>applyUsTractorInsurancePublicModel(prepared,model)).toThrow('US_INSURANCE_MODEL_WOULD_OVERWRITE_EXISTING_AMOUNT')
    const duplicate=structuredClone(prepared)
    duplicate.expenses.find(e=>e.economicExpenseId==='US_TRACTOR_INSURANCE')!.amount=null
    expect(()=>applyUsTractorInsurancePublicModel(duplicate,model)).toThrow('US_INSURANCE_MODEL_DUPLICATE_EVIDENCE')
    const scope=structuredClone(baseline)
    scope.expenses.find((e:{economicExpenseId:string})=>e.economicExpenseId==='US_TRACTOR_INSURANCE').scope='GROUP_SHARED'
    expect(()=>applyUsTractorInsurancePublicModel(scope,model)).toThrow('US_INSURANCE_MODEL_ALLOCATION_MISMATCH')
    const share=structuredClone(baseline)
    share.expenses.find((e:{economicExpenseId:string})=>e.economicExpenseId==='US_TRACTOR_INSURANCE').allocations[0].share=0.5
    expect(()=>applyUsTractorInsurancePublicModel(share,model)).toThrow('US_INSURANCE_MODEL_ALLOCATION_MISMATCH')
  })
})
