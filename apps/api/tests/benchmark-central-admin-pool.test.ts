import {describe,it,expect} from 'vitest'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'
import {calculateCentralAdminPoolScenarios as calculate} from '../scripts/lib/reference-central-admin-pool.js'
import {consolidateBinationalReferenceBudget} from '../scripts/consolidate-binational-reference-budget.js'
const load=(file:string)=>JSON.parse(readLocalDocument(file))
const policy=load('docs/research/B2_CENTRAL_ADMIN_POOL_SCENARIOS_2026-10-02.json')
const readout=load('docs/research/sources/BLS_ECEC_ADMIN_READOUT_20261002.json')
const tms=load('docs/research/B2_TRAILER_OVERHEAD_COMPONENTS_2026-10-01.json')

describe('one modeled central administrative pool, fleet scale then resource allocation',()=>{
  it('uses seven declared functional quantities and hourly total compensation, never a benefit multiplier',()=>{
    const r=calculate(policy,readout,tms)
    expect(r.roleLines).toHaveLength(7)
    expect(r.modeledFunctionalFullEquivalents).toBeCloseTo(3.7,12)
    expect(r.modeledWorkedHours).toBe(592)
    expect(r.payrollModelMonthlyUsd).toBe(27078.88)
    expect(r.tmsPublishedMonthlyComponentUsd).toBe(483)
    expect(r.roleLines.every(l=>l.benefitsAlreadyIncluded&&!l.additionalFicaAdded)).toBe(true)
    expect(r).toMatchObject({usEmployerModelAppliedToMxEmployees:false,ratioAppliedToOewsSalary:false,
      continuousHumanCoverageProven:false,canonicalAdminFamilyFilled:false,unknownCompanyExpensesDefaultedToZero:false,quoteReady:false})
  })
  it('conserves every pool across modeled pairs and two tractors, not thirds or full pool per pair',()=>{
    const r=calculate(policy,readout,tms)
    expect(r.fleetScenarios.map(s=>s.fleetMonthlyComponentUsd)).toEqual([27561.88,27561.88])
    expect(r.fleetScenarios.map(s=>s.representativeFirstPairMonthlyComponentUsd)).toEqual([27561.88,2756.19])
    for(const fleet of r.fleetScenarios){
      const cents=(value:number)=>Math.round(value*100)
      expect(fleet.pairAllocations.reduce((sum,p)=>sum+cents(p.monthlyComponentUsd),0)).toBe(cents(fleet.fleetMonthlyComponentUsd))
      for(const line of fleet.poolLines) expect(fleet.pairAllocations.reduce((sum,p)=>sum+cents(p.lines.find(l=>l.id===line.id)!.monthlyComponentUsd),0)).toBe(cents(line.monthlyComponentUsd))
      for(const pair of fleet.pairAllocations){
        expect(Object.values(pair.resources).reduce((sum,v)=>sum+cents(v),0)).toBe(cents(pair.monthlyComponentUsd))
        expect(pair.resources.SHARED_TRAILER).toBe(0) // explicit driver excludes dedicated box admin, not an unknown expense
      }
      expect(fleet).toMatchObject({selected:false,workloadCapacityProven:false,completeAdminCompanyBudgetUsd:null,completeCfuUsd:null,completeD2DCostUsd:null})
    }
    expect(r.fleetScenarios[1].pairAllocations.map(p=>p.monthlyComponentUsd)).toEqual([
      2756.19,2756.19,2756.19,2756.19,2756.19,2756.19,2756.19,2756.19,2756.18,2756.18])
  })
  it.each([{monthlyWorkedHoursPerFullEquivalent:2080/12},{hoursBasis:'PAID_HOURS'},
    {payrollLocationHypothesis:'MX_EMPLOYEES_WITH_US_BENEFITS'},{referencePeriod:'2027-10'},
    {allocationDriver:'EQUAL_THIRDS'},{tms:{...policy.tms,licensedUsers:3.7}}])('rejects changed denominator or unreviewed policy %j',mutation=>{
    expect(()=>calculate({...policy,...mutation},readout,tms)).toThrow()
  })
  it('rejects wrong nested ECEC block, duplicated or mismapped roles and missing benefits',()=>{
    const wrong=structuredClone(readout);wrong.rows[0].total=38.92
    expect(()=>calculate(policy,wrong,tms)).toThrow('FIRST_OCCUPATION_BLOCK')
    const duplicated=structuredClone(policy);duplicated.roleQuantities[1]=duplicated.roleQuantities[0]
    expect(()=>calculate(duplicated,readout,tms)).toThrow('DUPLICATE_IDENTITY')
    const mapped=structuredClone(policy);mapped.roleQuantities[0].group='MANAGEMENT_BUSINESS_FINANCIAL'
    expect(()=>calculate(mapped,readout,tms)).toThrow('MAPPING_MISMATCH')
    expect(()=>calculate(policy,{...readout,benefitCategories:[]},tms)).toThrow('SCOPE_INCOMPLETE')
  })
  it('rejects mismatch of fleet quantities or license-source price',()=>{
    const changed=structuredClone(policy);changed.fleetScenarios[1].usTractors=20
    expect(()=>calculate(changed,readout,tms)).toThrow('RESOURCE_QUANTITY_MISMATCH')
    const wrong=structuredClone(tms);wrong.overheadUnitComponents[1].planAlternatives[0].publishedUnitPrice=0
    expect(()=>calculate(policy,readout,wrong)).toThrow('TMS_SOURCE_MISMATCH')
  })
  it('joins only compatible one-pair compositions without changing the original or closing the whole cost',()=>{
    const r=consolidateBinationalReferenceBudget()
    expect(r.partialFixedWithSharedAdminScenarios).toHaveLength(2)
    for(const s of r.partialFixedWithSharedAdminScenarios){
      expect(s.modeledFleetPairs).toBe(1)
      const base=r.partialFixedReferenceScenarios.find(b=>b.id===s.baseScenarioId)!
      expect(s.lines).toHaveLength(13)
      expect(new Set(s.lines.map(l=>l.id)).size).toBe(13)
      expect(s.knownMonthlyModelComponentSumUsd-base.knownMonthlyModelComponentSumUsd).toBeCloseTo(s.groupAdminComponentAllocatedToThisPairUsd,9)
      expect(s.knownResourceMonthlyComponents.SHARED_TRAILER).toBe(base.knownResourceMonthlyComponents.SHARED_TRAILER)
      expect(Object.values(s.knownResourceMonthlyComponents).reduce((sum,v)=>sum+v,0)).toBeCloseTo(s.knownMonthlyModelComponentSumUsd,9)
      expect(s).toMatchObject({adminPoolAddedOnce:true,completeAdminCompanyFamily:false,completeFixedBudgetUsd:null,completeD2DCostUsd:null,
        isLowerBound:false,isCarrierObservedCost:false,missingAmountsDefaultedToZero:false,quoteReady:false})
    }
    expect(r.authoritativeBudget.completeRows).toBe(2)
    expect(r.originalBudgetBaseline.completeRows).toBe(0)
    expect(Object.values(r.outputs).every(v=>v===null)).toBe(true)
  })
  it('does not reuse one-unit UCR/cargo-policy amounts as a ten-pair resource budget',()=>{
    const r=consolidateBinationalReferenceBudget()
    expect(r.unjoinedAdminScaleScenarios).toHaveLength(1)
    expect(r.unjoinedAdminScaleScenarios[0]).toMatchObject({fleetScenarioId:'TEN_PAIRS_SHARED_ADMIN',modeledFleetPairs:10,
      adminComponentFirstPairUsd:2756.19,status:'ADMIN_SCALE_ONLY_RESOURCE_BUDGET_NOT_REBASED',
      combinedFixedComponentUsd:null,completeD2DCostUsd:null,resourceBudgetJoined:false,quoteReady:false})
    expect(r.unjoinedAdminScaleScenarios[0].unresolved).toContain('UCR_REGISTRANT_FLEET_BRACKET')
    expect(r.unjoinedAdminScaleScenarios[0].unresolved).toContain('CARGO_POLICY_ENTITY_SCOPE')
  })
  it('checks the new ECEC readout archive before producing any allocated result',()=>{
    expect(()=>consolidateBinationalReferenceBudget(readLocalDocument,file=>{
      const bytes=readLocalDocumentBytes(file)
      return file===policy.sources[0].archive.file?new Uint8Array([...bytes,32]):bytes
    })).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH:BLS_ECEC_ADMIN_READOUT')
  })
})
