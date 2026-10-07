import {describe,it,expect} from 'vitest'
import {readLocalDocument} from '../scripts/assemble-economic-reference-cards.js'
import {consolidateBinationalReferenceBudget} from '../scripts/consolidate-binational-reference-budget.js'
import {calculateAdminScaleReference as calculate} from '../scripts/lib/reference-admin-scale.js'
const file='docs/research/B2_ADMIN_SCALE_PUBLIC_MODEL_2026-10-02.json'
const policy=JSON.parse(readLocalDocument(file)),root=consolidateBinationalReferenceBudget()
const result=()=>calculate(policy,root.supportingCentralAdminPool,root.partialFixedReferenceScenarios)
describe('public-stock administrative scale without headcount/FTE/seat substitution',()=>{
  it('uses matched year-end TTS stock including contractor units, not average or owned-only',()=>{
    const r=result()
    expect(r.officePersonsPerPowerUnit).toBe(1465/7100)
    expect(r.allocatedOfficePersonEquivalent).toBe(2930/7100)
    expect(r.modeledWorkedHours).toBeCloseTo(2930/7100*160,10)
    expect(r).toMatchObject({observedFte:false,mxEmployerBenefitsImported:false,pilotFleetCountsChanged:false})
  })
  it('conserves declared hours across seven functions without seven people or seats',()=>{
    const r=result()
    expect(r.roleLines.reduce((s,x)=>s+x.weight,0)).toBeCloseTo(1,12)
    expect(r.roleLines.reduce((s,x)=>s+x.modeledWorkedHours,0)).toBeCloseTo(r.modeledWorkedHours,10)
    expect(r.roleLines.every(x=>!x.observedRoleHeadcount&&x.benefitsAlreadyIncluded&&!x.additionalFicaAdded)).toBe(true)
    expect(r.projection.namedTmsAccounts).toBe(2)
    expect(r.tmsComponentMonthlyUsd).toBe(138)
    expect(r.payrollComponentMonthlyUsd).toBeCloseTo(Math.round(27078.88/3.7*(2930/7100)*100)/100,2)
  })
  it('allocates each rounded pool once to tractors, not box, and never applies hidden fleet divisor',()=>{
    const r=result()
    expect(r.allocatedLines.reduce((s,x)=>s+Math.round(x.monthlyUsd*100),0)).toBe(Math.round(r.poolComponentMonthlyUsd*100))
    for(const s of r.scenarios){
      const base=root.partialFixedReferenceScenarios.find(x=>x.id===s.baseScenarioId)!
      expect(s.lines.slice(0,base.lines.length)).toEqual(base.lines)
      expect(s.knownResourceMonthlyComponents.SHARED_TRAILER).toBe(base.knownResourceMonthlyComponents.SHARED_TRAILER)
      expect(s.knownMonthlyComponentUsd-base.knownMonthlyModelComponentSumUsd).toBeCloseTo(r.poolComponentMonthlyUsd,9)
      expect(s.modeledFleetPairs).toBe(1)
      expect(s.companyServicesJoined).toBe(false)
      expect(s.completeFixedBudgetUsd).toBeNull()
    }
  })
  it('keeps original sensitivity, taxes/continuous coverage unresolved and full outputs incomplete',()=>{
    const r=result()
    expect(r.comparison).toMatchObject({oldPayrollMonthlyUsd:27078.88,oldTmsMonthlyUsd:483,claimedMeasuredSavingsUsd:null})
    expect(root.partialFixedWithCompanyScenarios.map(x=>x.displayUsd)).toEqual([32174.88,32343.83])
    expect(r).toMatchObject({companySeatQuantitiesAutomaticallyInherited:false,continuousCoverageProven:false,completeD2DCostUsd:null,calibrated:false,quoteReady:false})
    expect(Object.values(root.outputs).every(x=>x===null)).toBe(true)
  })
  it('is deterministic and does not mutate source arrays or baseline',()=>{
    const before=JSON.stringify([policy,root.supportingCentralAdminPool,root.partialFixedReferenceScenarios])
    expect(result()).toEqual(result())
    expect(JSON.stringify([policy,root.supportingCentralAdminPool,root.partialFixedReferenceScenarios])).toBe(before)
    const {sourceRef,...linked}=root.supportingAdminScaleReference
    expect(sourceRef).toBe('adminScale')
    expect(result()).toEqual(linked)
  })
  it.each([7437,6785,7101,0,NaN])('rejects unsupported denominator %s',totalTractors=>{
    expect(()=>calculate({...policy,observation:{...policy.observation,totalTractors}},root.supportingCentralAdminPool,root.partialFixedReferenceScenarios)).toThrow()
  })
  it('rejects duplicate functions, weight edits, or adding administration a second time',()=>{
    const old=structuredClone(root.supportingCentralAdminPool)
    old.roleLines[1]=old.roleLines[0]
    expect(()=>calculate(policy,old,root.partialFixedReferenceScenarios)).toThrow('ADMIN_SCALE_DUPLICATE_IDENTITY')
    const changed=structuredClone(root.supportingCentralAdminPool);changed.roleLines[0].fte=2
    expect(()=>calculate(policy,changed,root.partialFixedReferenceScenarios)).toThrow('ADMIN_SCALE_FUNCTIONAL_WEIGHT_MISMATCH')
    const base=structuredClone(root.partialFixedReferenceScenarios);base[0].lines.push({...base[0].lines[0],id:'TMS_SHARED'})
    expect(()=>calculate(policy,root.supportingCentralAdminPool,base)).toThrow('ADMIN_SCALE_DOUBLE_COUNT')
  })
  it('detects altered source policy in the full consolidated projection',()=>{
    expect(()=>consolidateBinationalReferenceBudget(path=>readLocalDocument(path)+(path===file?' ':''))).toThrow('SOURCE_HASH_MISMATCH:adminScale')
  })
})
