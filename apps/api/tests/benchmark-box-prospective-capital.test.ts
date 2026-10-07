import {describe,expect,it} from 'vitest'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'
import {consolidateBinationalReferenceBudget} from '../scripts/consolidate-binational-reference-budget.js'
import {calculateBoxProspectiveScenarios,applyBoxProspectiveCashScenario,verifyDatedFixArchive} from '../scripts/lib/reference-box-prospective-capital.js'
import {reconcileBinationalFixedBudget} from '../src/modules/engine/benchmark-binational-budget.js'

const read=(name:string)=>JSON.parse(readLocalDocument(`docs/research/${name}_2026-10-02.json`))
const policy=read('B2_BOX_PROSPECTIVE_SCENARIOS'),fx=read('B2_FX_REFERENCE')
const market=JSON.parse(readLocalDocument('docs/research/B2_MX_USED_MARKET_COMPARABILITY_2026-10-01.json'))
const summary=consolidateBinationalReferenceBudget(),baseline=summary.reviewedPublicModelBudgets.CASH
const archive=readLocalDocument(fx.source.archive.file)

describe('one conditional shared-box cash market capital, dated FIX and two tax bases',()=>{
  it('uses latest determined FIX column, not DOF, payment or an unavailable future FIX',()=>{
    expect(verifyDatedFixArchive(fx,archive).mxnPerUsd).toBe(18.3688)
    for(const rate of [18.0692,18.0710]) expect(()=>verifyDatedFixArchive({...fx,mxnPerUsd:rate},archive)).toThrow('COLUMN_MISMATCH')
    expect(()=>verifyDatedFixArchive({...fx,observationDate:'2026-10-02'},archive)).toThrow('COLUMN_MISMATCH')
    expect(()=>verifyDatedFixArchive(fx,'<html>18.3688</html>')).toThrow('COLUMN_MISMATCH')
  })
  it('keeps two tax hypotheses, converts once before rounding final dollars',()=>{
    const m=calculateBoxProspectiveScenarios(policy,market,fx)
    expect(m.scenarios[0].monthlyCapitalMxn).toBe(3750)
    expect(m.scenarios[1].monthlyCapitalMxn).toBeCloseTo(6853.448275862069,8)
    for(const s of m.scenarios){
      expect(s.monthlyCapitalUsd).toBe(s.monthlyCapitalMxn/18.3688)
      expect(s.monthlyBudgetUsd).toBe(Math.round(s.monthlyCapitalUsd*100)/100)
      expect(s.financedMonthlyCapitalMxn).toBeNull()
    }
    expect(m).toMatchObject({selectedScenario:null,alternativesNotAdded:true,onePhysicalBox:true,
      ageEffectIdentified:false,terminalValueIsObservedResidual:false,holdingIsRemainingLife:false,
      purchaseVatRecoveryAssumedObserved:false,equityOpportunityCostAssumedZero:false,
      transactionChargesExcludedNotAssumedZero:true,wholePilotCostUsd:null,calibrated:false,adoptedValues:0})
  })
  it.each(['NET_PLUS_VAT','GROSS_INCLUDES_VAT'])('integrates only one box into independent %s cash budget',id=>{
    const before=structuredClone(baseline)
    const a=applyBoxProspectiveCashScenario(baseline,policy,market,fx,id)
    expect(baseline).toEqual(before)
    for(let i=0;i<baseline.expenses.length;i++){
      if(baseline.expenses[i].economicExpenseId==='SHARED_TRAILER_CAPITAL'){
        expect(a.budget.expenses[i].amount!.value).toBe(a.scenario.monthlyBudgetUsd)
        expect(a.budget.expenses[i].allocations).toEqual([{resourceId:'SHARED_TRAILER',share:1}])
      }else expect(a.budget.expenses[i]).toEqual(baseline.expenses[i])
    }
    expect(a.budget.expenses.filter(e=>e.amount!==null)).toHaveLength(3)
    expect(reconcileBinationalFixedBudget(a.budget)).toMatchObject({status:'INCOMPLETE',monthlyGroupTotalUsd:null,cfuUsd:null,cvuUsd:null})
    expect(a).toEqual(applyBoxProspectiveCashScenario(baseline,policy,market,fx,id))
    expect(()=>applyBoxProspectiveCashScenario(a.budget,policy,market,fx,id)).toThrow('WOULD_OVERWRITE')
  })
  it('root reports sensitivities without silently changing baseline or financing',()=>{
    const r=summary.reviewedSharedBoxCashSensitivity
    expect(r).toMatchObject({selectedScenario:null,baselineChanged:false,financedBoxCostUsd:null,conditionalPlanningOnly:true})
    expect(r.scenarios.map(s=>s.modeledExpenseRows)).toEqual([3,3])
    expect(baseline.expenses.find(e=>e.economicExpenseId==='SHARED_TRAILER_CAPITAL')!.amount).toBeNull()
    expect(summary.reviewedPublicModelBudgets.FINANCED.expenses.find(e=>e.economicExpenseId==='SHARED_TRAILER_CAPITAL')!.amount).toBeNull()
    expect(Object.values(summary.outputs).every(v=>v===null)).toBe(true)
  })
  it('rejects substituted original FX archive',()=>{
    expect(()=>consolidateBinationalReferenceBudget(readLocalDocument,file=>file===fx.source.archive.file?
      new TextEncoder().encode('substituted'):readLocalDocumentBytes(file))).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH:BANXICO_FIX_20261001')
  })
  it('rejects different equipment, unknown matching specs and a false horizon',()=>{
    const changed=structuredClone(market);changed.offers.find((o:{sourceId:string})=>o.sourceId==='UTILITY_2019').lengthFeet=48
    expect(()=>calculateBoxProspectiveScenarios(policy,changed,fx)).toThrow('COMPARABILITY_MISMATCH')
    expect(()=>calculateBoxProspectiveScenarios({...policy,holdingMonths:36},market,fx)).toThrow('COMPARABILITY_MISMATCH')
    const missing=structuredClone(market);for(const o of missing.offers) delete o.roof
    expect(()=>calculateBoxProspectiveScenarios(policy,missing,fx)).toThrow('COMPARABILITY_MISMATCH')
  })
  it('rejects invalid FX, missing permission and attempted financed selection',()=>{
    for(const rate of [0,-1,Infinity,NaN]) expect(()=>calculateBoxProspectiveScenarios(policy,market,{...fx,mxnPerUsd:rate})).toThrow()
    expect(()=>calculateBoxProspectiveScenarios({...policy,permissionEvidence:'INFERRED'},market,fx)).toThrow()
    expect(()=>applyBoxProspectiveCashScenario(baseline,policy,market,fx,'FINANCED')).toThrow()
  })
  it('rejects period/profile/accounting scope mismatch, duplicate evidence and future FX',()=>{
    expect(()=>applyBoxProspectiveCashScenario({...baseline,referencePeriod:'2026-11'},policy,market,fx,'NET_PLUS_VAT')).toThrow('PERIOD_MISMATCH')
    expect(()=>applyBoxProspectiveCashScenario(baseline,{...policy,profileReference:'OTHER'},market,fx,'NET_PLUS_VAT')).toThrow()
    const wrong=structuredClone(baseline);wrong.resources.find(r=>r.resourceId==='SHARED_TRAILER')!.profileReference='OTHER'
    expect(()=>applyBoxProspectiveCashScenario(wrong,policy,market,fx,'NET_PLUS_VAT')).toThrow('PROFILE_MISMATCH')
    const allocation=structuredClone(baseline);allocation.expenses.find(e=>e.economicExpenseId==='SHARED_TRAILER_CAPITAL')!.allocations=[{resourceId:'MX_TRACTOR',share:1}]
    expect(()=>applyBoxProspectiveCashScenario(allocation,policy,market,fx,'NET_PLUS_VAT')).toThrow('ALLOCATION_MISMATCH')
    const duplicate=structuredClone(baseline);duplicate.evidence.push({...duplicate.evidence[0],id:'BOX_PROSPECTIVE_UTILITY_2021'})
    expect(()=>applyBoxProspectiveCashScenario(duplicate,policy,market,fx,'NET_PLUS_VAT')).toThrow('DUPLICATE_EVIDENCE')
    expect(()=>calculateBoxProspectiveScenarios(policy,market,{...fx,reviewedAt:'2026-10-03T07:43:00Z'})).toThrow('FX_FROM_FUTURE')
  })
})
