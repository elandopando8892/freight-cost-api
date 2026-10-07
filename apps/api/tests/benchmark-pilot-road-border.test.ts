import {describe,it,expect} from 'vitest'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'
import {consolidateBinationalReferenceBudget as consolidate,REFERENCE_BUDGET_PINS} from '../scripts/consolidate-binational-reference-budget.js'
import {calculatePilotRoadBorderScenarios as calculate} from '../scripts/lib/reference-pilot-road-border.js'
const load=(file:string)=>JSON.parse(readLocalDocument('docs/research/'+file))
const p=load('B2_PILOT_ROAD_BORDER_SCENARIOS_2026-10-02.json'),t=load('B2_MX_TOLL_FOLLOWUP_2026-09-30.json'),b=load('B2_BINATIONAL_BORDER_2026-09-30.json'),
  d=load('B2_SAKBE_MX_LIVE_DETAIL_2026-09-30.json'),fx=load('B2_FX_REFERENCE_2026-10-02.json'),root=consolidate(),v=root.supportingPilotVariableEconomics
const run=(policy:unknown=p,tolls:unknown=t,border:unknown=b,detail:unknown=d,variables:unknown=v,exchange:unknown=fx)=>calculate(policy,tolls,border,detail,variables,exchange)
describe('public road and physical border components, not a complete D2D price',()=>{
  it('joins deterministically without modifying source bytes or baseline outputs',()=>{
    const before=readLocalDocument('docs/research/B2_MX_TOLL_FOLLOWUP_2026-09-30.json')
    expect(run()).toEqual(root.supportingPilotRoadBorderEconomics);expect(run()).toEqual(run())
    expect(readLocalDocument('docs/research/B2_MX_TOLL_FOLLOWUP_2026-09-30.json')).toBe(before)
    expect(Object.values(root.outputs).every(x=>x===null)).toBe(true);expect(root.authoritativeBudget.completeRows).toBe(2)
  })
  it('preserves original4770 and selects4751 once per13 coverage groups, omitting unpriced43',()=>{
    const r=run();expect(r.providerOriginalTotalMxn).toBe(4770);expect(r.knownForwardRoadComponentsMxn).toBe(4751)
    expect(r.selections).toHaveLength(13);expect(new Set(r.selections.map(s=>s.coverageGroup)).size).toBe(13)
    expect(r.omittedUnpricedPoints.map(s=>s.segmentIndex)).toEqual([43])
    expect(r.selections.find(s=>s.segmentIndex===36)).toMatchObject({amountMxn:125,providerObservedMxn:144})
  })
  it('network crosses loaded north and bobtail south, without charging a five-axle empty box',()=>{
    const s=run().scenarios[0];expect(s.knownRoadComponentsMxn).toBe(4751)
    expect(s.crossings.map(c=>[c.id,c.axles,c.physicalBoxOnTractor,c.amountNative,c.currency])).toEqual([
      ['MX_LOADED_NORTH',5,true,144,'MXN'],['MX_BOBTAIL_SOUTH',3,false,14.25,'USD']])
    expect(s.knownBridgeComponentsUsd).toBeCloseTo(144/18.3688+14.25,10)
  })
  it('dedicated return includes two bobtail crossings and one attached return, not four C5 charges',()=>{
    const s=run().scenarios[1];expect(s.knownRoadComponentsMxn).toBe(9502)
    expect(s.crossings.map(c=>[c.id,c.axles,c.amountNative,c.currency])).toEqual([
      ['MX_LOADED_NORTH',5,144,'MXN'],['MX_BOBTAIL_SOUTH',3,14.25,'USD'],['MX_BOBTAIL_NORTH',3,65,'MXN'],['MX_ATTACHED_EMPTY_SOUTH',5,23.75,'USD']])
    expect(s.knownBridgeComponentsUsd).toBeCloseTo((144+65)/18.3688+14.25+23.75,10)
    expect(s.crossings.every(c=>c.resourceId==='MX_TRACTOR')).toBe(true)
  })
  it('converts only MXN and adds the component subtotal once to each existing alternative',()=>{
    for(const s of run().scenarios){
      expect(s.knownRoadComponentsUsd).toBeCloseTo(s.knownRoadComponentsMxn/18.3688,10)
      for(const c of s.crossings)expect(c.amountUsd).toBe(c.currency==='USD'?c.amountNative:c.amountNative/18.3688)
      for(const a of s.partialAlternatives)expect(a.knownComponentsWithRoadBridgeUsd).toBe(a.knownOperatingComponentsUsd+s.knownRoadBridgeComponentsUsd)
    }
  })
  it('never prorates C5 tolls into C3 or claims physically complete cycles, CFU, CVU, or a lower bound',()=>{
    const r=run();expect(r).toMatchObject({completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,externalWrites:false,quoteReady:false,adoptedValues:0})
    for(const s of r.scenarios){
      expect(s).toMatchObject({fullRoadTollsUsd:null,fullCrossingServicesUsd:null,existingCycleAndVariableAmountsPhysicallyComplete:false,priorCycleRecalculationRequired:true,missingAmountsDefaultedToZero:false,quoteReady:false})
      expect(Object.values(s.unpricedComponents).every(x=>x===null)).toBe(true)
      for(const a of s.partialAlternatives)expect(a).toMatchObject({completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,isLowerBound:false})
    }
  })
  it('rejects duplicate selections, cycles and fixed alternatives',()=>{
    const a=structuredClone(p);a.mxForwardSelections[1]=a.mxForwardSelections[0];expect(()=>run(a)).toThrow('PILOT_ROAD_SELECTION_DUPLICATE')
    const c=structuredClone(v);c.scenarios[1]=c.scenarios[0];expect(()=>run(p,t,b,d,c)).toThrow('PILOT_ROAD_SELECTION_DUPLICATE')
    const f=structuredClone(v);f.scenarios[0].partialOperatingAlternatives[1]=f.scenarios[0].partialOperatingAlternatives[0];expect(()=>run(p,t,b,d,f)).toThrow('PILOT_ROAD_FIXED_DUPLICATE')
  })
  it('rejects duplicate or overlapping evidence and unbound bobtail sources',()=>{
    const a=structuredClone(t);a.sources.push(a.sources[0]);expect(()=>run(p,a)).toThrow('PILOT_ROAD_SOURCE_DUPLICATE')
    const o=structuredClone(t);o.rows[1].coverageGroup=o.rows[0].coverageGroup;expect(()=>run(p,o)).toThrow('PILOT_ROAD_OVERLAPPING_COVERAGE')
    const u=structuredClone(p);u.mxNorthboundBobtailSource.url='https://example.com';expect(()=>run(u)).toThrow('PILOT_BORDER_BOBTAIL_SOURCE_MISMATCH')
  })
  it('rejects altered source coverage, observed total, choice, axle class and future period',()=>{
    const a=structuredClone(t);a.rows[0].instruction+='tamper';expect(()=>run(p,a)).toThrow('PILOT_ROAD_SOURCE_COVERAGE_MISMATCH')
    const z=structuredClone(d);z.observations.segments.find((s:{observedTollMxn:number})=>s.observedTollMxn>0).observedTollMxn+=1;expect(()=>run(p,t,b,z)).toThrow('PILOT_ROAD_PROVIDER_TOTAL_MISMATCH')
    const choice=structuredClone(p);choice.mxForwardSelections[0].alternativeIndex=100;expect(()=>run(choice)).toThrow('PILOT_ROAD_ALTERNATIVE_MISMATCH')
    expect(()=>run({...p,referenceDate:'2027-01-01'})).toThrow();expect(()=>run(p,t,b,{...d,request:{...d.request,axles:3}})).toThrow()
    expect(()=>run(p,t,b,d,v,{...fx,mxnPerUsd:0})).toThrow()
  })
  it('rejects negative/NaN partial amounts, invalid crossing order and silent quote selection',()=>{
    for(const amount of [-1,NaN,Infinity]){const a=structuredClone(v);a.scenarios[0].partialOperatingAlternatives[0].knownOperatingComponentsUsd=amount;expect(()=>run(p,t,b,d,a)).toThrow()}
    const a=structuredClone(p);a.borderTimeline.NETWORK_EXPECTED_EMPTY_PROXY.reverse();expect(()=>run(a)).toThrow('PILOT_BORDER_TIMELINE_MISMATCH')
    expect(()=>run({...p,selected:true})).toThrow()
  })
  for(const id of ['mxTollFollowup','borderTariffResearch','pilotRoadBorder'])it('fails closed on document tampering: '+id,()=>{
    const pin=REFERENCE_BUDGET_PINS.find(p=>p.id===id)!
    expect(()=>consolidate(f=>readLocalDocument(f)+(f===pin.file?' ':''))).toThrow('SOURCE_HASH_MISMATCH:'+id)
  })
  for(const file of ['docs/research/sources/LAREDO_2026_O_114_REVIEW_20260930.pdf','docs/research/B2_ROUTE_CAPUFE_TARIFFS_SOURCE_2026-09-30.pdf','docs/research/B2_D2D_SAKBE_ROUTE_LINK_2026-09-30.json','docs/research/B2_SAKBE_MX_COMPARISON_REQUEST_2026-09-30.json'])it('fails closed on archive tampering: '+file,()=>{
    expect(()=>consolidate(readLocalDocument,f=>f===file?new Uint8Array([1,2,3]):readLocalDocumentBytes(f))).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH:')
  })
})
