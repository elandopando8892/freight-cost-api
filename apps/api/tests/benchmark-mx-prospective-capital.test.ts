import {describe,expect,it} from 'vitest'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'
import {consolidateBinationalReferenceBudget} from '../scripts/consolidate-binational-reference-budget.js'
import {calculateMxProspectiveCapital,applyMxProspectiveCapitalScenario} from '../scripts/lib/reference-mx-prospective-capital.js'
import {calculateReferenceDebtSchedule} from '../scripts/lib/reference-debt-schedule.js'

const policy=JSON.parse(readLocalDocument('docs/research/B2_MX_PROSPECTIVE_CAPITAL_2026-10-02.json'))
const market=JSON.parse(readLocalDocument('docs/research/B2_MX_USED_MARKET_COMPARABILITY_2026-10-01.json'))
const rodal=market.offers.find((o:{sourceId:string})=>o.sourceId==='RODAL_2021')
const fx=JSON.parse(readLocalDocument('docs/research/B2_FX_REFERENCE_2026-10-02.json'))
const html=readLocalDocument(fx.source.archive.file)
const result=consolidateBinationalReferenceBudget(),baseline=result.reviewedPublicModelBudgets.CASH

describe('conditional MX market capital from compatible manual benchmark, cash and remaining-debt alternatives',()=>{
  it('uses exact net asking, two-year analogy, dated MXN/USD conversion once',()=>{
    const m=calculateMxProspectiveCapital(policy,rodal,fx,html)
    expect(m.marketUseLossMonthlyMxn).toBeCloseTo((1198275.86-750000)/24,9)
    const c=m.scenarios[0]
    expect(c.monthlyCapitalMxn).toBe(m.marketUseLossMonthlyMxn)
    expect(c.monthlyDebtInterestMxn).toBe(0)
    expect(c.monthlyBudgetUsd).toBe(Math.round(c.monthlyCapitalMxn/18.3688*100)/100)
    expect(m).toMatchObject({selectedScenario:null,ageEffectIdentified:false,holdingIsRemainingLife:false,
      publishedCurrencyCodeForOlderOffer:false,terminalValueIsObservedResidual:false,
      unknownTransactionChargesSetToZero:false,publishedRateOrCatConvertedToConfirmedNominal:false,
      loanPrincipalAddedToExpense:false,equityOpportunityCostAssumedZero:false,wholePilotCostUsd:null,
      calibrated:false,quoteReady:false,adoptedValues:0})
  })
  it('uses same market loss in both explicit financed endpoints, never principal or whole payment',()=>{
    const m=calculateMxProspectiveCapital(policy,rodal,fx,html)
    for(const s of m.scenarios.slice(1)){
      const debt=calculateReferenceDebtSchedule({currency:'MXN',principal:1198275.86*0.8,
        rateKind:'EXPLICIT_PLANNING_NOMINAL_ANNUAL',annualRate:s.annualNominalHypothesis,
        termMonths:60,comparisonMonths:24,totalGraceMonths:0,graceTreatment:'CAPITALIZE_MONTHLY_INTEREST',
        openingFeeCash:0,feeTreatment:'PAID_UPFRONT_EXCLUDED_FROM_PRINCIPAL',balloon:0})
      expect(s.monthlyDebtInterestMxn).toBe(debt.rows.slice(0,24).reduce((a,r)=>a+r.accruedInterest,0)/24)
      expect(s.monthlyCapitalMxn).toBe(m.marketUseLossMonthlyMxn+s.monthlyDebtInterestMxn)
      expect(s.monthlyCapitalMxn).not.toBe(m.marketUseLossMonthlyMxn+s.regularDebtPaymentMxn!)
    }
    expect(m.scenarios[2].monthlyDebtInterestMxn).toBeGreaterThan(m.scenarios[1].monthlyDebtInterestMxn)
  })
  it('keeps financing hypotheses independent of expired product and unresolved provider basis',()=>{
    expect(calculateMxProspectiveCapital(policy,rodal,fx,html).finance).toMatchObject({
      annualNominalHypotheses:[0.115,0.157],publishedOfferExpired:true,providerNominalBasisConfirmed:false,newOriginationEvent:false})
    expect(()=>calculateMxProspectiveCapital({...policy,finance:{...policy.finance,providerNominalBasisConfirmed:true}},rodal,fx,html)).toThrow()
  })
  it.each(['CASH','FINANCED_LOW','FINANCED_HIGH'])('changes only one MX expense in %s, source remains intact',id=>{
    const before=structuredClone(baseline)
    const a=applyMxProspectiveCapitalScenario(baseline,policy,rodal,fx,html,id)
    expect(baseline).toEqual(before)
    expect(a.budget.expenses.filter(e=>e.amount!==null)).toHaveLength(3)
    for(let i=0;i<baseline.expenses.length;i++){
      if(baseline.expenses[i].economicExpenseId==='MX_TRACTOR_CAPITAL') expect(a.budget.expenses[i].amount!.value).toBe(a.scenario.monthlyBudgetUsd)
      else expect(a.budget.expenses[i]).toEqual(baseline.expenses[i])
    }
    expect(a.budget.expenses.find(e=>e.economicExpenseId==='MX_TRACTOR_CAPITAL')!.allocations).toEqual([{resourceId:'MX_TRACTOR',share:1}])
    expect(a).toEqual(applyMxProspectiveCapitalScenario(baseline,policy,rodal,fx,html,id))
    expect(()=>applyMxProspectiveCapitalScenario(a.budget,policy,rodal,fx,html,id)).toThrow('WOULD_OVERWRITE')
  })
  it('root links cash/financed with corresponding US mode, cash composes all three capital resources once',()=>{
    const scenarios=result.reviewedMxCapitalSensitivity.scenarios
    expect(scenarios.map(s=>s.modeledExpenseRows)).toEqual([3,3,3])
    for(const s of scenarios) expect(s.budget.expenses.find(e=>e.economicExpenseId==='US_TRACTOR_CAPITAL')!.amount!.value)
      .toBe(s.id==='CASH'?472.99:691.43)
    for(const s of result.reviewedBinationalCapitalCashScenarios.scenarios){
      expect(s.modeledExpenseRows).toBe(4)
      expect(s.budget.expenses.filter(e=>e.family==='CAPITAL'&&e.amount!==null)).toHaveLength(3)
      expect(s.status).toBe('INCOMPLETE');expect(s.completeGroupMonthlyUsd).toBeNull()
      expect(s.cfuUsd).toBeNull();expect(s.cvuUsd).toBeNull()
      expect(s.budget.expenses.find(e=>e.economicExpenseId==='SHARED_TRAILER_CAPITAL')!.allocations).toEqual([{resourceId:'SHARED_TRAILER',share:1}])
    }
    expect(result.originalBudgetBaseline.completeRows).toBe(0);expect(result.authoritativeBudget.completeRows).toBe(2)
    expect(Object.values(result.outputs).every(v=>v===null)).toBe(true)
  })
  it('pins new seller original and rejects substituted archive',()=>{
    const file=policy.sources.find((s:{id:string})=>s.id==='TODOCAMION_2019').archive.file
    const original=readLocalDocument(file)
    for(const text of ['750,000','450 HP','18 velocidades','PRECIO MÁS IVA','2025-08-12']) expect(original).toContain(text)
    expect(()=>consolidateBinationalReferenceBudget(readLocalDocument,f=>f===file?new TextEncoder().encode('substituted'):readLocalDocumentBytes(f))).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH:TODOCAMION_2019')
  })
  it('rejects original rejected automatic tractor pair and altered manual profile or horizon',()=>{
    expect(()=>calculateMxProspectiveCapital(policy,market.offers.find((o:{sourceId:string})=>o.sourceId==='RYT_CASCADIA_2021'),fx,html)).toThrow()
    expect(()=>calculateMxProspectiveCapital({...policy,holdingMonths:36},rodal,fx,html)).toThrow('REFERENCE_MISMATCH')
    const changed=structuredClone(policy);changed.offers[1].differentialLb=40000
    expect(()=>calculateMxProspectiveCapital(changed,rodal,fx,html)).toThrow()
    expect(()=>calculateMxProspectiveCapital(policy,{...rodal,askingMxn:1198276},fx,html)).toThrow('REFERENCE_MISMATCH')
  })
  it('rejects invalid amount/currency, false currency confirmation, duplicate sources or removed approval',()=>{
    const changed=structuredClone(policy);changed.offers[1].currencyBasis='PUBLISHED_MXN'
    expect(()=>calculateMxProspectiveCapital(changed,rodal,fx,html)).toThrow('REFERENCE_MISMATCH')
    changed.offers[1].askingNet=0;expect(()=>calculateMxProspectiveCapital(changed,rodal,fx,html)).toThrow()
    expect(()=>calculateMxProspectiveCapital({...policy,permissionEvidence:'INFERRED'},rodal,fx,html)).toThrow()
    expect(()=>calculateMxProspectiveCapital({...policy,sources:[policy.sources[0],policy.sources[0],policy.sources[2]]},rodal,fx,html)).toThrow('DUPLICATE_SOURCE')
  })
  it('rejects wrong period/profile/scope, repeated evidence and unsupported selection',()=>{
    expect(()=>applyMxProspectiveCapitalScenario({...baseline,referencePeriod:'2026-11'},policy,rodal,fx,html,'CASH')).toThrow('PERIOD_MISMATCH')
    const wrong=structuredClone(baseline);wrong.resources.find(r=>r.resourceId==='MX_TRACTOR')!.profileReference='OTHER'
    expect(()=>applyMxProspectiveCapitalScenario(wrong,policy,rodal,fx,html,'CASH')).toThrow('PROFILE_MISMATCH')
    const allocation=structuredClone(baseline);allocation.expenses.find(e=>e.economicExpenseId==='MX_TRACTOR_CAPITAL')!.allocations=[{resourceId:'SHARED_TRAILER',share:1}]
    expect(()=>applyMxProspectiveCapitalScenario(allocation,policy,rodal,fx,html,'CASH')).toThrow('ALLOCATION_MISMATCH')
    const dup=structuredClone(baseline);dup.evidence.push({...dup.evidence[0],id:'MX_PROSPECTIVE_RODAL_2021'})
    expect(()=>applyMxProspectiveCapitalScenario(dup,policy,rodal,fx,html,'CASH')).toThrow('DUPLICATE_EVIDENCE')
    expect(()=>applyMxProspectiveCapitalScenario(baseline,policy,rodal,fx,html,'SUM_BOTH')).toThrow()
  })
})
