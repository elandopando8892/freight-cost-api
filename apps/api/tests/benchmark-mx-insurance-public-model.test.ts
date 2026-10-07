import {describe,it,expect} from 'vitest'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'
import {calculateMxTractorInsurancePublicModel as calculate,applyMxTractorInsurancePublicModel as apply} from '../scripts/lib/reference-mx-insurance-public-model.js'
import {consolidateBinationalReferenceBudget} from '../scripts/consolidate-binational-reference-budget.js'

const load=(name:string)=>JSON.parse(readLocalDocument(`docs/research/${name}`))
const model=load('B2_MX_INSURANCE_PUBLIC_MODEL_2026-10-02.json'),fx=load('B2_FX_REFERENCE_2026-10-02.json')
const html=readLocalDocument(model.source.archive.file),fxHtml=readLocalDocument(fx.source.archive.file)
const baseline=consolidateBinationalReferenceBudget().reviewedPublicModelBudget
describe('MX domestic premium from dated 2021 year-table, not all D2D coverage',()=>{
  it('normalizes gross annual once, leaves fee/discount/IVA included and converts once',()=>{
    const r=calculate(model,html,fx,fxHtml)
    expect(r.monthlyGrossMxn).toBe(9746)
    expect(r.monthlyExactUsd).toBeCloseTo(116952/12/18.3688,12)
    expect(r.monthlyBudgetUsd).toBe(Math.round(9746/18.3688*100)/100)
    expect(r).toMatchObject({actualVatRecoverability:null,netEconomicPremiumMxn:null,
      completeBinationalInsurance:false,boxCoverageProven:false,cargoCoverageProven:false,borderCoverageProven:false,
      matchedPolicyObserved:false,premiumFinanceModeled:false,calibrated:false,quoteReady:false,adoptedValues:0})
    expect(r.paymentModes).toEqual(['CASH','FINANCED'])
  })
  it.each([
    ['wrong year',{year:2022}],['old 2022 premium',{annualGrossMxn:130784.01}],['extra fee',{annualGrossMxn:116952+790}],
    ['discount twice',{annualGrossMxn:116952*.7}],['net tax basis',{taxBasis:'VAT_RECOVERED'}],['binational territory',{territory:'MX_US'}],
  ])('rejects %s',(_,mutation)=>expect(()=>calculate({...model,...mutation},html,fx,fxHtml)).toThrow())
  it.each([
    ['row',html.replace('<td>$116,952</td>','<td>$130,784</td>')],
    ['column',html.replace('Freightliner Cascadia · Amplia','Kenworth T680 · Amplia')],
    ['date',html.replace('24 de septiembre de 2026','26 de septiembre de 2026')],
    ['year',html.replace('<td>2021</td>','<td>2022</td>')],
    ['removed table',html.replace(/<table\b[\s\S]*?<\/table>/g,'')],
  ])('checks real table %s, not any price occurrence',(_,changed)=>expect(()=>calculate(model,changed,fx,fxHtml)).toThrow())
  it('rejects future FX or measurement provenance',()=>{
    expect(()=>calculate({...model,reviewedAt:'2026-09-23T00:00:00Z'},html,fx,fxHtml)).toThrow('FUTURE_EVIDENCE')
  })
  it('copies one direct MX row and leaves all other expenses unchanged',()=>{
    const before=structuredClone(baseline),r=apply(baseline,model,html,fx,fxHtml)
    expect(baseline).toEqual(before)
    expect(r.budget.expenses.filter(e=>e.amount!==null)).toHaveLength(3)
    for(const e of before.expenses.filter(e=>e.economicExpenseId!=='MX_TRACTOR_INSURANCE')) expect(r.budget.expenses.find(row=>row.economicExpenseId===e.economicExpenseId)).toEqual(e)
    expect(r.budget.expenses.find(e=>e.economicExpenseId==='MX_TRACTOR_INSURANCE')!.allocations).toEqual([{resourceId:'MX_TRACTOR',share:1}])
    expect(r).toEqual(apply(baseline,model,html,fx,fxHtml))
    expect(()=>apply(r.budget,model,html,fx,fxHtml)).toThrow('WOULD_OVERWRITE')
    const duplicate=structuredClone(r.budget);duplicate.expenses.find(e=>e.economicExpenseId==='MX_TRACTOR_INSURANCE')!.amount=null
    expect(()=>apply(duplicate,model,html,fx,fxHtml)).toThrow('DUPLICATE_EVIDENCE')
  })
  it('rejects wrong profile/period/scope/allocation',()=>{
    expect(()=>apply({...baseline,referencePeriod:'2026-11'},model,html,fx,fxHtml)).toThrow('PERIOD_MISMATCH')
    const wrong=structuredClone(baseline);wrong.resources.find(r=>r.resourceId==='MX_TRACTOR')!.profileReference='OTHER'
    expect(()=>apply(wrong,model,html,fx,fxHtml)).toThrow('PROFILE_MISMATCH')
    const share=structuredClone(baseline);share.expenses.find(e=>e.economicExpenseId==='MX_TRACTOR_INSURANCE')!.allocations[0].share=.5
    expect(()=>apply(share,model,html,fx,fxHtml)).toThrow('ALLOCATION_MISMATCH')
  })
  it('adds five guarded sensitivity copies without altering previous capital or original budgets',()=>{
    const s=consolidateBinationalReferenceBudget(),r=s.reviewedMxInsuranceSensitivity
    expect(r.scenarios).toHaveLength(5)
    expect(r).toMatchObject({selectedScenario:null,baselineChanged:false,completeD2DInsurance:false,completeFixedBudgetUsd:null,completePilotCostUsd:null})
    for(const scenario of r.scenarios){
      expect(scenario.modeledExpenseRows).toBe(scenario.id.startsWith('ALL_CAPITAL_CASH_')?5:4)
      expect(scenario.issues.some(i=>i.code==='MX_CARGO_COVERAGE_AND_ALLOCATION')).toBe(true)
      expect(scenario.issues.some(i=>i.code==='BORDER_INTERCHANGE_TERRITORIAL_TERMS')).toBe(true)
      expect(scenario).toMatchObject({status:'INCOMPLETE',completeGroupMonthlyUsd:null,cfuUsd:null,cvuUsd:null,completeD2DInsurance:false})
      expect(scenario.model.monthlyBudgetUsd).toBe(r.scenarios[0].model.monthlyBudgetUsd)
    }
    expect(s.authoritativeBudget.completeRows).toBe(2)
    expect(s.originalBudgetBaseline.completeRows).toBe(0)
    expect(s.reviewedBinationalCapitalCashScenarios.scenarios.every(s=>s.modeledExpenseRows===4)).toBe(true)
    expect(Object.values(s.outputs).every(v=>v===null)).toBe(true)
  })
  it('checks archived source hash before projection',()=>{
    expect(()=>consolidateBinationalReferenceBudget(readLocalDocument,file=>{
      const b=readLocalDocumentBytes(file)
      return file===model.source.archive.file?new Uint8Array([...b,32]):b
    })).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH:TIMI_CASCADIA2021_YEAR_TABLE')
  })
})
