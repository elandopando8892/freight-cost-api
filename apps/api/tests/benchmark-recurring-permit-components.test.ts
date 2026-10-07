import {describe,it,expect} from 'vitest'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'
import {calculateRecurringPermitComponentScenario as calculate} from '../scripts/lib/reference-recurring-permit-components.js'
import {consolidateBinationalReferenceBudget} from '../scripts/consolidate-binational-reference-budget.js'
const load=(name:string)=>JSON.parse(readLocalDocument(`docs/research/${name}`))
const policy=load('B2_RECURRING_PERMIT_COMPONENT_SCENARIO_2026-10-02.json'),reg=load('B2_FIXED_REGISTRATION_COMPONENTS_2026-10-01.json'),
  irp=load('B2_IRP_CONSOLIDATED_RULES_2026-10-01.json'),hvut=load('B2_US_RECURRING_COMPLIANCE_2026-10-01.json'),box=load('B2_SHARED_BOX_TX_COMPLIANCE_2026-10-01.json')
describe('annual recurring permit component scenario, not a complete family',()=>{
  it('normalizes distinct entity/vehicle/box components once without another CAD conversion',()=>{
    const r=calculate(policy,reg,irp,hvut,box)
    expect(r.lines.map(l=>l.annualUsd)).toEqual([2021.47,46,550,101.75])
    expect(r.annualKnownComponentSumUsd).toBe(2719.22)
    expect(r.monthlyKnownComponentSumUsd).toBeCloseTo(2719.22/12,12)
    expect(r.monthlyDisplayUsd).toBe(226.60)
    expect(r.usTractorMonthlyComponentUsd).toBeCloseTo(2617.47/12,12)
    expect(r.lines.filter(l=>l.resourceId==='SHARED_TRAILER')).toHaveLength(1)
    expect(r).toMatchObject({completeUsPermitsMonthlyUsd:null,completeBoxPermitsMonthlyUsd:null,
      unknownFeesSetToZero:false,annualInvoiceFromRoundedMonth:false,secondCadConversionPerformed:false,canonicalBudgetRowsFilled:0,quoteReady:false})
  })
  it.each([{planningUsRegistrants:2},{planningUsPowerUnits:2},{planningSharedBoxes:2},{ucrRegistrationYear:2027},{ucrBracket:'B2'},
    {irpBasis:'ROUTE_PERCENTAGES'},{hvutCategory:'U'}])('rejects changed dated scope %j',mutation=>expect(()=>calculate({...policy,...mutation},reg,irp,hvut,box)).toThrow())
  it('rejects missing/duplicate/wrong UCR, IRP and fiscal scope',()=>{
    const changed=structuredClone(irp);changed.officialTestContrast.rows[1]=changed.officialTestContrast.rows[0]
    expect(()=>calculate(policy,reg,changed,hvut,box)).toThrow('PROFILE_MISMATCH')
    changed.officialTestContrast.rows[1]=irp.officialTestContrast.rows[1];changed.officialTestContrast.rows[0].texasInvoiceUsd+=1
    expect(()=>calculate(policy,reg,changed,hvut,box)).toThrow('IRP_TEST_SUM_MISMATCH')
    const u=structuredClone(reg);u.ucr.schedules[0].rows[0].annualUsd=55
    expect(()=>calculate(policy,u,irp,hvut,box)).toThrow('PROFILE_MISMATCH')
    expect(()=>calculate(policy,reg,{...irp,officialTestContrast:{...irp.officialTestContrast,administrativeAndMiscFeesIncluded:true}},hvut,box)).toThrow()
  })
  it('exposes partial resource amounts without filling whole permits or calling it a floor',()=>{
    const s=consolidateBinationalReferenceBudget()
    expect(s.partialFixedReferenceScenarios).toHaveLength(2)
    for(const p of s.partialFixedReferenceScenarios){
      expect(p.lines).toHaveLength(9)
      expect(new Set(p.lines.map(l=>l.id)).size).toBe(9)
      expect(Object.values(p.knownResourceMonthlyComponents).reduce((a,b)=>a+b,0)).toBeCloseTo(p.knownMonthlyModelComponentSumUsd,10)
      expect(p).toMatchObject({completeFixedBudgetUsd:null,completeD2DCostUsd:null,isLowerBound:false,
        isCarrierObservedCost:false,adminPoolAdded:false,oneSharedBox:true,missingAmountsDefaultedToZero:false,quoteReady:false})
    }
    expect(s.reviewedMxInsuranceSensitivity.scenarios.filter(s=>s.id.startsWith('ALL_CAPITAL_CASH_')).every(s=>s.modeledExpenseRows===5)).toBe(true)
    expect(s.authoritativeBudget.completeRows).toBe(2)
    expect(s.originalBudgetBaseline.completeRows).toBe(0)
    expect(Object.values(s.outputs).every(v=>v===null)).toBe(true)
  })
  it('rejects tampered normative archive',()=>{
    expect(()=>consolidateBinationalReferenceBudget(readLocalDocument,file=>{
      const bytes=readLocalDocumentBytes(file)
      return file===policy.sources[0].archive.file?new Uint8Array([...bytes,32]):bytes
    })).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH:IRP_FEE_INSTRUCTIONS_2026')
  })
})
