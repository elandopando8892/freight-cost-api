import {describe,it,expect} from 'vitest'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'
import {calculateCompanyServicePool as calculate} from '../scripts/lib/reference-company-service-pool.js'
import {consolidateBinationalReferenceBudget} from '../scripts/consolidate-binational-reference-budget.js'
const file='docs/research/B2_COMPANY_SERVICE_POOL_SCENARIOS_2026-10-02.json'
const load=(path:string)=>JSON.parse(readLocalDocument(path))
const policy=load(file),inventory=load('docs/research/B1_OVERHEAD_EXPOSURE_BRIDGE_2026-09-29.json').companyPairs
const result=()=>calculate(policy,inventory,7)
describe('public office/mobile pool and US yard capacity without double charges',()=>{
  it('prices seven lines as one175 tariff, fee per line once, not per FTE or truck',()=>{
    const r=result(),one=r.fleetScenarios[0]
    expect(one.sharedPoolMonthlyComponentUsd).toBe(906.43)
    expect(one.pairAllocations[0].lines.map(l=>l.monthlyComponentUsd)).toEqual([700,206.43,200])
    expect(one.fleetMonthlyComponentUsd).toBe(1106.43)
    expect(r.mobile.actualSurchargeMonthlyUsd).toBeNull()
    expect(r.mobile.governmentTaxMonthlyUsd).toBeNull()
    expect(r.mobile.connectionEventModeled).toBe(false)
  })
  it('conserves each shared expense across ten pairs, yard capacity once per pair',()=>{
    const ten=result().fleetScenarios[1]
    expect(ten.fleetMonthlyComponentUsd).toBe(2906.43)
    expect(ten.pairAllocations[0].monthlyComponentUsd).toBe(290.65)
    expect(ten.pairAllocations[9].monthlyComponentUsd).toBe(290.64)
    expect(ten.pairAllocations.reduce((sum,p)=>sum+Math.round(p.monthlyComponentUsd*100),0)).toBe(290643)
    for(const pair of ten.pairAllocations) for(const l of pair.lines)
      expect(Math.round((l.resources.MX_TRACTOR+l.resources.US_TRACTOR+l.resources.SHARED_TRAILER)*100)).toBe(Math.round(l.monthlyComponentUsd*100))
    expect(ten.resourceBudgetJoinAllowed).toBe(false)
  })
  it('assigns US combo to its centre, not another MX yard or a second box charge',()=>{
    const lines=result().fleetScenarios[0].pairAllocations[0].lines
    expect(lines[2].resources).toEqual({MX_TRACTOR:0,US_TRACTOR:200,SHARED_TRAILER:0})
    expect(result().yard.mxYardMonthlyUsd).toBeNull()
    expect(result().office.businessAddressIncluded).toBe(false)
    expect(result().office.phoneIncluded).toBe(false)
  })
  it('maps all23 fields while included printing/internet remain one expense, no TMS again',()=>{
    const r=result()
    expect(r.canonicalCompanyRelationships).toHaveLength(23)
    expect(r.canonicalCompanyRelationships.filter(l=>l.componentIds.length)).toHaveLength(4)
    expect(r.canonicalCompanyRelationships.every(l=>l.completeMonthlyUsd===null)).toBe(true)
    expect(r).toMatchObject({tmsAddedAgain:false,standaloneIncludedServicesChargedAgain:false,unknownExpensesDefaultedToZero:false,canonicalCompanyFamilyFilled:false,adoptedValues:0,quoteReady:false})
  })
  it.each(['quantityBasis','allocationDriver','capture'])('rejects unsupported scope %s',key=>{
    expect(()=>calculate({...policy,[key]:'UNSUPPORTED'},inventory,7)).toThrow()
  })
  it('rejects zero taxes substituted for unknowns and changed member/line basis',()=>{
    expect(()=>calculate({...policy,mobile:{...policy.mobile,governmentTaxMonthlyUsd:0}},inventory,7)).toThrow()
    expect(()=>calculate({...policy,office:{...policy.office,memberships:3.7}},inventory,7)).toThrow()
    expect(()=>calculate(policy,inventory,6)).toThrow('COMPANY_INVENTORY_OR_FUNCTION_SCOPE_MISMATCH')
    expect(()=>calculate(policy,[...inventory.slice(1),inventory[1]],7)).toThrow()
  })
  it('rejects missing/duplicate provider source identities',()=>{
    expect(()=>calculate({...policy,sources:[...policy.sources.slice(1),policy.sources[1]]},inventory,7)).toThrow('COMPANY_SOURCE_IDENTITY_MISMATCH')
  })
  it('joins only one-pair components without changing earlier scenarios or full-null outputs',()=>{
    const r=consolidateBinationalReferenceBudget()
    expect(r.partialFixedWithCompanyScenarios.map(s=>s.displayUsd)).toEqual([32174.88,32343.83])
    expect(r.partialFixedWithSharedAdminScenarios.map(s=>s.displayUsd)).toEqual([31068.45,31237.40])
    for(const s of r.partialFixedWithCompanyScenarios){
      expect(s.lines).toHaveLength(18)
      expect(new Set(s.lines.map(l=>l.id)).size).toBe(18)
      expect(s).toMatchObject({modeledFleetPairs:1,oneSharedBox:true,companyPoolAddedOnce:true,fullCompanyBudgetUsd:null,
        completeFixedBudgetUsd:null,completeD2DCostUsd:null,quoteReady:false,providerServicesActivated:false})
    }
    expect(Object.values(r.outputs).every(v=>v===null)).toBe(true)
    expect(r.unjoinedAdminScaleScenarios[0].resourceBudgetJoined).toBe(false)
  })
  it('is repeatable and detects altered policy and source archive',()=>{
    expect(result()).toEqual(result())
    expect(()=>consolidateBinationalReferenceBudget(path=>path===file?readLocalDocument(path)+' ':readLocalDocument(path))).toThrow()
    expect(()=>consolidateBinationalReferenceBudget(readLocalDocument,path=>path.endsWith('OUTPOST_LAREDO_YARD_20261001.html')?Buffer.from('altered'):readLocalDocumentBytes(path))).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH')
  })
})
