import {describe,it,expect} from 'vitest'
import {calculateBoxInsuranceCfu as calculate} from '../scripts/lib/reference-box-insurance-cfu.js'
import {consolidateBinationalReferenceBudget as consolidate} from '../scripts/consolidate-binational-reference-budget.js'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'
const doc=(file:string)=>JSON.parse(readLocalDocument(`docs/research/${file}`)),file='B2_BOX_INSURANCE_CFU_2026-10-02.json'
const policy=doc(file),guide=doc('B2_SHARED_BOX_INSURANCE_REFERENCE_2026-10-01.json'),root=consolidate(),duty=root.supportingPilotOrdinaryDuty,
  base=root.supportingAdminScaleReference.scenarios,result=()=>calculate(policy,guide,duty,base)

describe('one shared-box premium component connected to ordinary-cycle CFU, not policy acceptance',()=>{
  it('reproduces connected result without changing inputs, active outputs or quote eligibility',()=>{
    const before=JSON.stringify({policy,guide,duty,base}),r=result()
    expect(r).toEqual(root.supportingBoxInsuranceCfu)
    expect(JSON.stringify({policy,guide,duty,base})).toBe(before)
    expect(Object.values(root.outputs).every(v=>v===null)).toBe(true)
    expect(r).toMatchObject({quoteReady:false,adoptedValues:0,quotedPolicy:false,completeBinationalInsuranceUsd:null,
      completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,unknownAmountsDefaultedToZero:false,externalWrites:false})
  })
  it('uses two public monthly endpoints once, never sum, midpoint or value formula',()=>{
    const r=result()
    expect(r.monthlyAlternatives.map(m=>m.monthlyUsd)).toEqual([25,150])
    expect(r.sourceGuide.valueBasedMonthlyRangeUsd).toBeNull()
    expect(r).toMatchObject({physicalBoxCount:1,duplicateCountryPremiumsAdded:false,coverageAndPriceAreDifferentEvidence:true,
      sourceGeographyTransferredAsHypothesis:true})
  })
  it('allocates over the same serial box cycle and max, not MX plus US clocks or two assets',()=>{
    const r=result()
    expect(r.cycleAllocations).toHaveLength(4)
    for(const a of r.cycleAllocations){
      const s=duty.scenarios.find(s=>s.id===a.cycleScenarioId)!
      expect(a.timeExposure).toBeCloseTo(s.knownBoxClockDays/24,12)
      expect(a.distanceExposure).toBeCloseTo(1/s.compatibleKnownCyclesPerMonth,12)
      for(const m of a.alternatives)expect(m.fixedTripComponentUsd).toBeCloseTo(m.monthlyUsd*Math.max(a.timeExposure,a.distanceExposure),12)
    }
    for(const cycleId of duty.scenarios.map(s=>s.id)){
      const rows=r.cycleAllocations.filter(a=>a.cycleScenarioId===cycleId)
      expect(rows[0].alternatives.map(a=>({id:a.id,monthlyUsd:a.monthlyUsd}))).toEqual(rows[1].alternatives.map(a=>({id:a.id,monthlyUsd:a.monthlyUsd})))
      for(const a of rows[0].alternatives)expect(a.fixedTripComponentUsd).toBeCloseTo(rows[1].alternatives.find(b=>b.id===a.id)!.fixedTripComponentUsd,10)
    }
  })
  it('changes only CFU/total in every cash and financed alternative',()=>{
    const r=result();expect(r.cash).toHaveLength(8);expect(r.financed).toHaveLength(128)
    for(const row of [...r.cash,...r.financed]){
      const prior=row.paymentMode==='CASH'?duty.cash.scenarios.find(s=>s.id===row.baseCostId)!:duty.financed.scenarios.find(s=>s.id===row.baseCostId)!
      expect(row.knownCvuComponentUsd).toBe(prior.knownCvuComponentUsd)
      expect(row.alternatives).toHaveLength(2)
      for(const a of row.alternatives){
        expect(a.component.resourceId).toBe('SHARED_TRAILER')
        expect(a.knownCfuComponentUsd).toBeCloseTo(prior.knownCfuComponentUsd+a.component.amountUsd,10)
        expect(a.totalKnownComponentsUsd).toBeCloseTo(prior.totalKnownComponentsUsd+a.component.amountUsd,10)
      }
    }
  })
  it('keeps the insurance increment independent of tractor/box debt mode or original VAT capital alternative',()=>{
    const r=result()
    for(const row of r.financed){
      const cash=r.cash.find(c=>c.baseCostId===row.cashComparisonId)!
      expect(row.alternatives.map(a=>a.component)).toEqual(cash.alternatives.map(a=>a.component))
      expect(row.adminOrVariableCostAddedAgain).toBe(false)
    }
    expect(r.premiumFinanceExpenseUsd).toBeNull()
  })
  it('distinguishes potential territory reach from actual insurance and premium matching',()=>{
    expect(result().coverageEvidence).toEqual({namedAssetAndCoverageScheduleRequired:true,
      qualitasPhysicalDamageTheftExtensionToUsCanadaDocumented:true,qualitasUsAutoLiabilityInferred:false,
      detachedTheftRequiresSecuredContractualYard:true,commonInsuredLegalOwnerObserved:false,
      matchedBinationalPremiumObserved:false,fullInsuranceFamilyComplete:false})
  })
  it.each(['qualitasUsAutoLiabilityInferred','commonInsuredLegalOwnerObserved','matchedBinationalPremiumObserved','fullInsuranceFamilyComplete'])('rejects unsupported coverage claim %s',field=>{
    const p=structuredClone(policy);p.coverageEvidence[field]=true
    expect(()=>calculate(p,guide,duty,base)).toThrow()
  })
  it('rejects another source, currency, ownership count or pricing representation',()=>{
    for(const update of [{currency:'MXN'},{physicalBoxCount:2},{statedValueUsd:30000}])expect(()=>calculate(policy,{...guide,...update},duty,base)).toThrow()
    const g=structuredClone(guide);g.source.id='UNMATCHED';expect(()=>calculate(policy,g,duty,base)).toThrow('BOX_INSURANCE_GUIDE_SCOPE_MISMATCH')
    expect(()=>calculate({...policy,premiumBasis:'VALUE_PLUS_MONTHLY'},guide,duty,base)).toThrow()
  })
  it('rejects duplicate cycle/resource/base identity',()=>{
    const d=structuredClone(duty);d.scenarios[1]=d.scenarios[0]
    expect(()=>calculate(policy,guide,d,base)).toThrow('BOX_INSURANCE_CYCLE_DUPLICATE')
    const d2=structuredClone(duty);d2.scenarios[0].conditionalFixedAllocations[0].resources[1]=d2.scenarios[0].conditionalFixedAllocations[0].resources[0]
    expect(()=>calculate(policy,guide,d2,base)).toThrow('BOX_INSURANCE_RESOURCE_DUPLICATE')
    expect(()=>calculate(policy,guide,duty,[base[0],base[0]])).toThrow('BOX_INSURANCE_BASE_DUPLICATE')
  })
  it('rejects reused premium instead of appending another one',()=>{
    const b=structuredClone(base);b[0].lines.push({id:'SHARED_BOX_INSURANCE',resourceId:'SHARED_TRAILER',monthlyUsd:25,kind:'TEST_ONLY'})
    expect(()=>calculate(policy,guide,duty,b)).toThrow('BOX_INSURANCE_ALREADY_IN_BASE')
    const d=structuredClone(duty);d.cash.scenarios[0].fixedComponents[3].id='SHARED_BOX_INSURANCE'
    expect(()=>calculate(policy,guide,d,base)).toThrow('BOX_INSURANCE_ALREADY_APPLIED')
  })
  it('rejects mismatched physical capacity/clocks, totals and cash-finance pair',()=>{
    const d=structuredClone(duty);d.scenarios[0].compatibleKnownCyclesPerMonth*=2
    expect(()=>calculate(policy,guide,d,base)).toThrow('BOX_INSURANCE_SHARED_CYCLE_MISMATCH')
    const d2=structuredClone(duty);d2.cash.scenarios[0].totalKnownComponentsUsd+=1
    expect(()=>calculate(policy,guide,d2,base)).toThrow('BOX_INSURANCE_COST_SUM_MISMATCH')
    const d3=structuredClone(duty);d3.financed.scenarios[0].cashComparisonId='MISSING'
    expect(()=>calculate(policy,guide,d3,base)).toThrow('BOX_INSURANCE_CASH_FINANCE_JOIN_MISMATCH')
  })
  it.each([0,-1,NaN,Infinity])('rejects invalid monthly premium %s',low=>expect(()=>calculate(policy,{...guide,publishedMonthlyRangeUsd:{low,high:150}},duty,base)).toThrow())
  it('verifies both authored policy and primary PDF pins in the connected path',()=>{
    expect(()=>consolidate(path=>path.endsWith(file)?readLocalDocument(path)+' ':readLocalDocument(path))).toThrow()
    expect(()=>consolidate(readLocalDocument,path=>path.endsWith('QUALITAS_RESIDENT_CARGO_TERMS_20261002.pdf')?
      new Uint8Array([1,2,3]):readLocalDocumentBytes(path))).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH:QUALITAS_RESIDENT_CARGO_202606')
    expect(root.sourcePins.find(p=>p.id==='boxInsuranceCfu')!.sha256).toHaveLength(64)
    expect(result().sources.find(s=>s.id==='QUALITAS_RESIDENT_CARGO_202606')!.archive!.sha256).toBe('beaa23a16d67a74fb79b92841086a14a273a58b6aed2d4ca61b4df137f0779e4')
  })
  it('preserves the legacy-city computed example as a partial component, not total-cost bounds',()=>{
    const r=consolidate(readLocalDocument,readLocalDocumentBytes,'LEGACY_CITY').supportingBoxInsuranceCfu,red=r.cycleAllocations.find(a=>a.cycleScenarioId==='NETWORK_EXPECTED_EMPTY_PROXY')!,
      dedicated=r.cycleAllocations.find(a=>a.cycleScenarioId==='DEDICATED_EMPTY_SAME_BOX_RETURN')!
    expect(red.alternatives.map(a=>a.fixedTripComponentUsd)).toEqual([4.016849958931788,24.10109975359073])
    expect(dedicated.alternatives.map(a=>a.fixedTripComponentUsd)).toEqual([8.51698711841173,51.10192271047039])
    expect(r.completeD2DCostUsd).toBeNull()
    expect(r.sourceGuide.statisticalConfidenceInterval).toBe(false)
  })
})
