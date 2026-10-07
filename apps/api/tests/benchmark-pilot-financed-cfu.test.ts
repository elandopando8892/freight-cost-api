import {describe,it,expect} from 'vitest'
import {calculatePilotFinancedCfu} from '../scripts/lib/reference-pilot-financed-cfu.js'
import {consolidateBinationalReferenceBudget,REFERENCE_BUDGET_PINS} from '../scripts/consolidate-binational-reference-budget.js'
import {readLocalDocument,pointerExists} from '../scripts/assemble-economic-reference-cards.js'

const s=consolidateBinationalReferenceBudget()
const policy=JSON.parse(readLocalDocument('docs/research/B2_PILOT_FINANCED_CFU_2026-10-02.json'))
const mx=s.reviewedMxCapitalSensitivity.scenarios.map(x=>x.scenario)
const run=(a:{policy?:unknown;base?:unknown;physical?:unknown;cash?:unknown;us?:unknown;mx?:unknown;box?:unknown;fx?:unknown}={})=>calculatePilotFinancedCfu(
  a.policy??policy,a.base??s.supportingAdminScaleReference.scenarios,a.physical??s.supportingPilotPhysicalCycle,
  a.cash??s.supportingPilotPayrollComponents,a.us??s.reviewedProspectiveUsCapital,a.mx??mx,
  a.box??s.supportingSharedBoxFinancePlanning,a.fx??{mxnPerUsd:18.3688})

describe('cash and finance share economic exposure, not debt-service cost or full quote',()=>{
  const r=s.supportingPilotFinancedCfu
  it('connects32monthly variants to128independent cycle/rest rows and keeps8cash comparisons',()=>{
    expect(r.monthlyScenarios).toHaveLength(32);expect(r.scenarios).toHaveLength(128);expect(r.cashScenarioIds).toHaveLength(8)
    expect(new Set(r.monthlyScenarios.map(x=>x.id)).size).toBe(32);expect(new Set(r.scenarios.map(x=>x.id)).size).toBe(128)
    expect(new Set(r.scenarios.map(x=>x.cycleScenarioId))).toEqual(new Set(['NETWORK_EXPECTED_EMPTY_PROXY','DEDICATED_EMPTY_SAME_BOX_RETURN']))
  })
  it('replaces exactly three capital lines without changing noncapital/admin amounts or duplicate box',()=>{
    const ids=['MX_TRACTOR_CAPITAL','US_TRACTOR_CAPITAL','SHARED_TRAILER_CAPITAL']
    for(const m of r.monthlyScenarios){
      const old=s.supportingAdminScaleReference.scenarios.find(x=>x.id===m.cashBaseId)!
      expect(m.lines).toHaveLength(old.lines.length)
      expect(m.capitalReplacements).toHaveLength(3)
      expect(m.lines.filter(x=>x.id==='SHARED_TRAILER_CAPITAL')).toHaveLength(1)
      expect(m.lines.filter(x=>!ids.includes(x.id))).toEqual(old.lines.filter(x=>!ids.includes(x.id)))
      expect(m.knownMonthlyComponentUsd).toBeCloseTo(Object.values(m.resourceMonthly).reduce((sum,x)=>sum+x,0),8)
      for(const d of m.capitalReplacements){
        expect(d.financedMonthlyUsd).toBeGreaterThan(d.cashMonthlyUsd)
        expect(d.monthlyDeltaUsd).toBeCloseTo(d.financedMonthlyUsd-d.cashMonthlyUsd,10)
        expect(m.resourceMonthly[d.resourceId]-old.knownResourceMonthlyComponents[d.resourceId]).toBeCloseTo(d.monthlyDeltaUsd,8)
      }
    }
  })
  it('uses unchanged distance/time MAX factors by resource, not one fleet divisor',()=>{
    for(const c of r.scenarios){
      const m=r.monthlyScenarios.find(x=>x.id===c.monthlyFinanceScenarioId)!
      for(const a of c.resourceAllocations){
        const delta=m.capitalReplacements.find(x=>x.resourceId===a.resourceId)!
        expect(a.financeDeltaUsd).toBeCloseTo(delta.monthlyDeltaUsd*Math.max(a.distanceExposure,a.timeExposure),8)
      }
      expect(c.financeDeltaUsd).toBeCloseTo(c.resourceAllocations.reduce((sum,a)=>sum+a.financeDeltaUsd,0),8)
    }
  })
  it('conserves CFU+CVU while driver and road variable costs are unchanged',()=>{
    for(const c of r.scenarios){
      const old=s.supportingPilotPayrollComponents.scenarios.find(x=>x.id===c.cashComparisonId)!
      expect(c.knownCvuComponentUsd).toBe(old.knownCvuComponentUsd)
      expect(c.variableComponents).toEqual(old.variableComponents)
      expect(c.fixedComponents.find(x=>x.id==='MX_DRIVER_FIXED_EM_QUOTA')).toEqual(old.fixedComponents.find(x=>x.id==='MX_DRIVER_FIXED_EM_QUOTA'))
      expect(c.knownCfuComponentUsd).toBeCloseTo(c.fixedComponents.reduce((sum,x)=>sum+x.amountUsd,0),8)
      expect(c.totalKnownComponentsUsd).toBeCloseTo(old.totalKnownComponentsUsd+c.financeDeltaUsd,8)
      expect(c).toMatchObject({samePhysicalExposure:true,sameDriverAndRoadComponents:true,boxChargedOnce:true,adminPoolChargedOnce:true,threeCapitalRowsReplacedOnce:true,debtPrincipalOrWholePaymentAdded:false})
    }
  })
  it('changes cost not nominal route/cycle capacity or asset/debt scopes',()=>{
    for(const m of r.monthlyScenarios){
      expect(m.usFinanceScenarioId).toBe('FINANCED');expect(['FINANCED_LOW','FINANCED_HIGH']).toContain(m.mxFinanceScenarioId)
      expect(m).toMatchObject({oneSharedBox:true,adminPoolUnchanged:true,completeMonthlyBudgetUsd:null,selected:false})
    }
    expect(r).toMatchObject({originalCashAlternativesChanged:false,monthsAreDeclaredWindowMeansNotFirstDebtPayments:true,
      actualDebtsOrFinanceApprovalsObserved:false,allAlternativesAddedTogether:false})
  })
  it('preserves independent purchase-value/fee-VAT alternatives without summing them',()=>{
    expect(r.monthlyScenarios.filter(x=>x.boxTaxScenario==='NET_PLUS_VAT')).toHaveLength(16)
    for(const m of r.monthlyScenarios.filter(x=>x.boxFeeTaxScenarioId==='FEE_VAT_CREDITABLE_ASSUMPTION')){
      const other=r.monthlyScenarios.find(x=>x.cashBaseId===m.cashBaseId&&x.mxFinanceScenarioId===m.mxFinanceScenarioId&&x.boxFinanceScenarioId===m.boxFinanceScenarioId&&x.boxFeeTaxScenarioId==='FEE_VAT_NOT_CREDITABLE_ASSUMPTION')!
      expect(other.resourceMonthly.SHARED_TRAILER).toBeGreaterThan(m.resourceMonthly.SHARED_TRAILER)
      expect(other.resourceMonthly.MX_TRACTOR).toBe(m.resourceMonthly.MX_TRACTOR)
    }
  })
  it('keeps complete cost and unresolved policy null rather than declaring partial sum a floor',()=>{
    expect(r).toMatchObject({equityRequiredReturnUsd:null,completeFixedCompanyInsuranceUsd:null,completeDriverDutyUsd:null,
      completePhysicalCoverage:false,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,externalWrites:false,adoptedValues:0,quoteReady:false})
    for(const c of r.scenarios)expect(c).toMatchObject({completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,isLowerBound:false,selected:false,quoteReady:false})
    expect(Object.values(s.outputs).every(x=>x===null)).toBe(true)
  })
  it('is reproducible, leaves sources/cash untouched and has no external writes',()=>{
    const inputs=[policy,s.supportingAdminScaleReference.scenarios,s.supportingPilotPhysicalCycle,s.supportingPilotPayrollComponents,s.reviewedProspectiveUsCapital,mx,s.supportingSharedBoxFinancePlanning]
    const before=JSON.stringify(inputs);expect(run()).toEqual(run());expect(JSON.stringify(inputs)).toBe(before)
    expect(Object.values(s.externalChanges).every(x=>x===false)).toBe(true)
  })
  it('all five internal source references resolve to the pinned actual document fields',()=>{
    const internal=policy.sourceRefs.filter((x:string)=>!x.startsWith('https://'))
    expect(internal).toHaveLength(5)
    for(const ref of internal){
      const [id,pointer]=ref.split('#'),pin=REFERENCE_BUDGET_PINS.find(p=>p.id===id)
      expect(pin).toBeDefined()
      expect(pointerExists(JSON.parse(readLocalDocument(pin!.file)),pointer)).toBe(true)
    }
  })
})

describe('reject mixed, duplicated and economically unbalanced finance scopes',()=>{
  it('rejects duplicated capital rows and wrong resource ownership',()=>{
    const b=structuredClone(s.supportingAdminScaleReference.scenarios)
    b[0].lines.push(b[0].lines[0]);expect(()=>run({base:b})).toThrow('FINANCED_PILOT_BASE_SCOPE_MISMATCH')
    const other=structuredClone(s.supportingAdminScaleReference.scenarios)
    other[0].lines[0].resourceId='US_TRACTOR';expect(()=>run({base:other})).toThrow('FINANCED_PILOT_CAPITAL_ROW_MISMATCH')
  })
  it('rejects changed monthly sums, mismatched cash anchor and unrelated fleet scope',()=>{
    const b=structuredClone(s.supportingAdminScaleReference.scenarios)
    b[0].knownMonthlyComponentUsd+=100;expect(()=>run({base:b})).toThrow('FINANCED_PILOT_BASE_SCOPE_MISMATCH')
    const other=structuredClone(mx);other[0].monthlyBudgetUsd+=100;expect(()=>run({mx:other})).toThrow('FINANCED_PILOT_CASH_ANCHOR_MISMATCH')
    const third=s.supportingAdminScaleReference.scenarios.map(b=>({...b,modeledFleetPairs:10}))
    expect(()=>run({base:third})).toThrow()
  })
  it('rejects repeated cycles, mx scenarios and box debt alternatives',()=>{
    const f=structuredClone(s.supportingPilotPhysicalCycle);f.scenarios[1]=f.scenarios[0]
    expect(()=>run({physical:f})).toThrow('FINANCED_PILOT_DUPLICATE_SCOPE')
    const m=structuredClone(mx);m[1]=m[0];expect(()=>run({mx:m})).toThrow('FINANCED_PILOT_DUPLICATE_SCOPE')
    const b=structuredClone(s.supportingSharedBoxFinancePlanning);b.scenarios[1]=b.scenarios[0]
    expect(()=>run({box:b})).toThrow('FINANCED_PILOT_DUPLICATE_SCOPE')
  })
  it('rejects missing/mismatched exposure and duplicated same-box allocation',()=>{
    const f=structuredClone(s.supportingPilotPhysicalCycle);f.scenarios[0].conditionalFixedAllocations[0].resources[2].resourceId='MX_TRACTOR'
    expect(()=>run({physical:f})).toThrow('FINANCED_PILOT_EXPOSURE_IDENTITY_MISMATCH')
    const other=structuredClone(s.supportingPilotPhysicalCycle);other.scenarios[0].conditionalFixedAllocations[0].resources[0].oldDistanceProxyByKmUsd+=100
    expect(()=>run({physical:other})).toThrow('FINANCED_PILOT_EXPOSURE_SCOPE_MISMATCH')
  })
  it('rejects incorrect cash fixed or variable aggregate',()=>{
    const c=structuredClone(s.supportingPilotPayrollComponents);c.scenarios[0].knownCfuComponentUsd+=100
    expect(()=>run({cash:c})).toThrow('FINANCED_PILOT_CASH_COST_NOT_CONSERVED')
    const other=structuredClone(s.supportingPilotPayrollComponents);other.scenarios[0].knownCvuComponentUsd+=100
    expect(()=>run({cash:other})).toThrow('FINANCED_PILOT_CASH_COST_NOT_CONSERVED')
  })
  it('rejects an inconsistent physical resource allocation total',()=>{
    const f=structuredClone(s.supportingPilotPhysicalCycle)
    f.scenarios[0].conditionalFixedAllocations[0].conditionalComponentAllocationUsd+=100
    expect(()=>run({physical:f})).toThrow('FINANCED_PILOT_EXPOSURE_SUM_MISMATCH')
  })
  it('rejects box fee/VAT inconsistency rather than silently rounding it away',()=>{
    const b=structuredClone(s.supportingSharedBoxFinancePlanning);b.scenarios[0].feeTaxAlternatives[0].economicFeeMxn*=1.16
    expect(()=>run({box:b})).toThrow('FINANCED_PILOT_BOX_FEE_NOT_CONSERVED')
    const other=structuredClone(s.supportingSharedBoxFinancePlanning);other.scenarios[0].principalMxn+=10
    expect(()=>run({box:other})).toThrow('FINANCED_PILOT_BOX_SCOPE_MISMATCH')
  })
  it.each([{fx:{mxnPerUsd:0}},{us:{...s.reviewedProspectiveUsCapital,publishedAprConvertedToNominal:true}},
    {box:{...s.supportingSharedBoxFinancePlanning,actualDebtObserved:true}},{box:{...s.supportingSharedBoxFinancePlanning,publishedCatConvertedToInterest:true}},
    {policy:{...policy,referencePeriod:'2027-10'}}])('rejects unsupported currency/interest/adoption/reference period %#',a=>expect(()=>run(a)).toThrow())
})
