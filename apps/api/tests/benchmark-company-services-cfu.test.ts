import {describe,it,expect} from 'vitest'
import {calculateCompanyServicesCfu as calculate} from '../scripts/lib/reference-company-services-cfu.js'
import {consolidateBinationalReferenceBudget as consolidate} from '../scripts/consolidate-binational-reference-budget.js'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'
import {allocateFixedCost} from '../src/modules/engine/fixed-cost-allocation.js'
const policy=JSON.parse(readLocalDocument('docs/research/B2_COMPANY_SERVICES_CFU_2026-10-02.json')),root=consolidate()
const admin=root.supportingAdminScaleReference,duty=root.supportingPilotOrdinaryDuty,boxed=root.supportingBoxInsuranceCfu
const result=()=>calculate(policy,admin,duty,boxed)

describe('company services join physical-cycle CFU once at explicit named-control scale',()=>{
 it('reproduces connected result without modifying inputs or completing B2',()=>{
  const before=JSON.stringify({policy,admin,duty,boxed}),r=result()
  expect(r).toEqual(root.supportingCompanyServicesCfu);expect(JSON.stringify({policy,admin,duty,boxed})).toBe(before)
  expect(r).toMatchObject({knownMonthlyComponentUsd:633.98,completeCompanyMonthlyUsd:null,completeCfuUsd:null,completeCvuUsd:null,
   completeD2DCostUsd:null,quoteReady:false,adoptedValues:0,externalWrites:false,fullInvoiceOrLongTermTariffProven:false})
  expect(Object.values(root.outputs).every(v=>v===null)).toBe(true)
 })
 it('conserves two memberships, one two-line tariff and one provider fee per line, not seven roles or fractional persons',()=>{
  const r=result()
  expect(r.monthlyLines.filter(l=>l.id.includes('WORKSPACE')).reduce((s,l)=>s+l.monthlyUsd,0)).toBe(200)
  expect(r.monthlyLines.filter(l=>l.id.includes('MOBILE')).reduce((s,l)=>s+l.monthlyUsd,0)).toBe(108.98)
  expect(r.monthlyByResource).toEqual({MX_TRACTOR:154.49,US_TRACTOR:304.49,SHARED_TRAILER:175})
  expect(r).toMatchObject({oldSevenSeatPoolJoined:false,payrollOrTmsAddedAgain:false,standaloneBundledInternetPrintingAdded:false})
  expect(admin.allocatedOfficePersonEquivalent).toBeCloseTo(1465/7100*2,12)
 })
 it('reserves detached bays instead of adding a combo or a second physical box',()=>{
  const r=result(),yard=r.monthlyLines.filter(l=>l.id.includes('YARD'))
  expect(yard).toEqual([{id:'COMPANY_SERVICES_US_TRACTOR_YARD',resourceId:'US_TRACTOR',monthlyUsd:150},
   {id:'COMPANY_SERVICES_SAME_BOX_US_YARD',resourceId:'SHARED_TRAILER',monthlyUsd:175}])
  expect(r.comboAndSeparateSpacesAddedTogether).toBe(false);expect(r.mxYardMonthlyUsd).toBeNull()
 })
 it('allocates each resource by its same distance/time MAX, not by total duty or two box clocks',()=>{
  const r=result()
  for(const c of r.cycleAllocations){
   const d=duty.scenarios.find(s=>s.id===c.cycleScenarioId)!
   for(const line of c.resources){
    const original=d.conditionalFixedAllocations[0].resources.find(s=>s.resourceId===line.resourceId)!
    expect(line.amountUsd).toBeCloseTo(allocateFixedCost(line.monthlyUsd*original.oldDistanceProxyByKmUsd/original.knownMonthlyComponentUsd,
     line.monthlyUsd*original.knownClockByTimeUsd/original.knownMonthlyComponentUsd),10)
   }
   expect(c.fixedTripComponentUsd).toBeCloseTo(c.resources.reduce((s,l)=>s+l.amountUsd,0),12)
  }
 })
 it('retains the legacy-city monetary fixture independently of current postal planning',()=>{
  const r=consolidate(readLocalDocument,readLocalDocumentBytes,'LEGACY_CITY').supportingCompanyServicesCfu
  expect(r.cycleAllocations.map(c=>c.fixedTripComponentUsd)).toEqual([81.0349536879117,173.61641593988122])
  const network=r.cash.find(c=>c.baseCostId==='NETWORK_EXPECTED_EMPTY_PROXY:RATE_EXCLUDES_WEEKLY_REST:ALL_CAPITAL_CASH_NET_PLUS_VAT_PUBLIC_ADMIN_SCALE')!
  const dedicated=r.cash.find(c=>c.baseCostId==='DEDICATED_EMPTY_SAME_BOX_RETURN:RATE_EXCLUDES_WEEKLY_REST:ALL_CAPITAL_CASH_NET_PLUS_VAT_PUBLIC_ADMIN_SCALE')!
  expect(network.alternatives[0].totalKnownComponentsUsd).toBeCloseTo(4095.9025074975457,9)
  expect(dedicated.alternatives[0].totalKnownComponentsUsd).toBeCloseTo(8044.350959274499,9)
  expect(r.financed[0].alternatives[0].totalKnownComponentsUsd).toBeCloseTo(4205.649946532971,9)
 })
 it('adds only one conserved company component to all cash/financed alternatives, preserving payroll/capital/CVU/insurance',()=>{
  const r=result(),prior=[...boxed.cash,...boxed.financed]
  expect(r.cash).toHaveLength(8);expect(r.financed).toHaveLength(128)
  for(const c of [...r.cash,...r.financed]){
   const original=prior.find(s=>s.baseCostId===c.baseCostId)!
   expect(c.knownCvuComponentUsd).toBe(original.knownCvuComponentUsd);expect(c.priorAlternatives).toEqual(original.alternatives)
   for(const a of c.alternatives){const old=original.alternatives.find(x=>x.premiumAlternativeId===a.premiumAlternativeId)!
    expect(a.component).toEqual(old.component)
    expect(a.knownCfuComponentUsd).toBeCloseTo(old.knownCfuComponentUsd+c.companyFixedTripComponentUsd,10)
    expect(a.totalKnownComponentsUsd).toBeCloseTo(a.knownCfuComponentUsd+c.knownCvuComponentUsd,10)
    expect(a.completeD2DCostUsd).toBeNull();expect(a.quoteReady).toBe(false)
   }
   const cash=r.cash.find(s=>s.baseCostId===c.cashComparisonId)!
   expect(c.companyFixedTripComponentUsd).toBe(cash.companyFixedTripComponentUsd)
  }
 })
 it('does not misrepresent denied downloads as original archived source bodies',()=>{
  const r=result(),unarchived=r.sources.filter(s=>s.archive===null)
  expect(unarchived.map(s=>s.id)).toEqual(['MILEONE_SERVICES_TWO_MEMBERS','TMOBILE_CORE_TWO_LINES'])
  expect(unarchived.every(s=>s.capture==='PRIMARY_WEB_READER'&&s.directDownloadStatus==='HTTP_403_NOT_ARCHIVED')).toBe(true)
 })
 it('rejects seven seats, seven lines, another fleet pair or wrong TMS scope',()=>{
  expect(()=>calculate({...policy,office:{...policy.office,memberships:7}},admin,duty,boxed)).toThrow()
  expect(()=>calculate({...policy,mobile:{...policy.mobile,adminLines:7}},admin,duty,boxed)).toThrow()
  expect(()=>calculate({...policy,modeledFleetPairs:10},admin,duty,boxed)).toThrow()
  const a=structuredClone(admin);a.projection.namedTmsAccounts=7 as 2
  expect(()=>calculate(policy,a,duty,boxed)).toThrow()
 })
 it('rejects previously joined services in original monthly lines or a second overlay',()=>{
  const a=structuredClone(admin);a.scenarios[0].lines[0].id='COMPANY_SERVICES_ALREADY_THERE'
  expect(()=>calculate(policy,a,duty,boxed)).toThrow('ALREADY_IN_BASE')
  expect(()=>calculate(policy,admin,duty,result())).toThrow()
  const b=structuredClone(boxed) as any;b.cash[0].companyServicesAddedOnce=true
  expect(()=>calculate(policy,admin,duty,b)).toThrow('ALREADY_APPLIED')
 })
 it('rejects a corrupt base sum or exposure',()=>{
  const a=structuredClone(admin);a.scenarios[0].knownResourceMonthlyComponents.MX_TRACTOR+=1
  expect(()=>calculate(policy,a,duty,boxed)).toThrow('BASE_SUM_MISMATCH')
  const d=structuredClone(duty);d.scenarios[0].conditionalFixedAllocations[0].resources[0].knownClockByTimeUsd+=1
  expect(()=>calculate(policy,admin,d,boxed)).toThrow('EXPOSURE_MISMATCH')
 })
 it('rejects tax alternatives with inconsistent physical exposure',()=>{
  const d=structuredClone(duty),r=d.scenarios[0].conditionalFixedAllocations[1].resources[0]
  r.oldDistanceProxyByKmUsd*=2;r.conditionalOldDistanceKnownClockMaxUsd=allocateFixedCost(r.oldDistanceProxyByKmUsd,r.knownClockByTimeUsd)
  expect(()=>calculate(policy,admin,d,boxed)).toThrow('TAX_BASE_CHANGED_EXPOSURE')
 })
 it('rejects mismatched cash pairing, invalid subtotal and wrong payment identity',()=>{
  const b=structuredClone(boxed);b.financed[0].cashComparisonId='missing'
  expect(()=>calculate(policy,admin,duty,b)).toThrow('CASH_FINANCE_JOIN')
  const c=structuredClone(boxed);c.cash[0].alternatives[0].totalKnownComponentsUsd+=1
  expect(()=>calculate(policy,admin,duty,c)).toThrow('COST_SUM')
  const e=structuredClone(boxed);e.financed[0].paymentMode='CASH'
  expect(()=>calculate(policy,admin,duty,e)).toThrow('CASH_FINANCE_JOIN')
 })
 it('rejects duplicate cycle, resource, source and price-alternative identities',()=>{
  const d=structuredClone(duty);d.scenarios[1]=d.scenarios[0]
  expect(()=>calculate(policy,admin,d,boxed)).toThrow('CYCLE_DUPLICATE')
  const e=structuredClone(duty);e.scenarios[0].conditionalFixedAllocations[0].resources[1]=e.scenarios[0].conditionalFixedAllocations[0].resources[0]
  expect(()=>calculate(policy,admin,e,boxed)).toThrow('RESOURCE_DUPLICATE')
  const p=structuredClone(policy);p.sources[1]=p.sources[0]
  expect(()=>calculate(p,admin,duty,boxed)).toThrow('SOURCE_SET')
  const b=structuredClone(boxed);b.cash[0].alternatives[1].premiumAlternativeId=b.cash[0].alternatives[0].premiumAlternativeId
  expect(()=>calculate(policy,admin,duty,b)).toThrow('ALTERNATIVE_DUPLICATE')
 })
 it.each(['MILEONE_FAQ_20261002.html','OUTPOST_LAREDO_YARD_20261001.html'])('rejects corrupt archived source%s',name=>{
  expect(()=>consolidate(readLocalDocument,file=>file.endsWith(name)?new Uint8Array([1,2,3]):readLocalDocumentBytes(file))).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH')
 })
})
