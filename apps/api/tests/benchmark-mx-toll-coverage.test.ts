import {describe,it,expect} from 'vitest'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'
import {consolidateBinationalReferenceBudget as consolidate} from '../scripts/consolidate-binational-reference-budget.js'
import {reviewMxTollCoverage as review} from '../scripts/lib/reference-mx-toll-coverage.js'
const load=(f:string)=>JSON.parse(readLocalDocument('docs/research/'+f))
const p=load('B2_MX_TOLL_COVERAGE_2026-10-02.json'),d=load('B2_SAKBE_MX_LIVE_DETAIL_2026-09-30.json'),root=consolidate(),r=root.supportingPilotRoadBorderEconomics
describe('review toll identity and overlapping collection without adopting prices',()=>{
  it('is deterministic, immutable and connected to consolidation',()=>{
    const before=JSON.stringify([p,d,r]);expect(review(p,d,r)).toEqual(root.supportingMxTollCoverage);expect(review(p,d,r)).toEqual(review(p,d,r));expect(JSON.stringify([p,d,r])).toBe(before)
  })
  it('keeps bundled T0642 once, not642+278 or a fleet discount',()=>{
    const result=review(p,d,r);expect(result.jorobas).toMatchObject({selectedC5Mxn:642,additionalAutomaticChargeMxn:0,discountApplied:false,c5RevenueSplitMxn:null,movementConfirmed:false})
    expect(result.knownForwardRoadComponentsMxn).toBe(4751);expect(result.providerOriginalTotalMxn).toBe(4770);expect(result.addedCostMxn).toBe(0)
  })
  it('matches Carbonera/OjoCaliente within25m, not LosChorros or another306',()=>{
    const result=review(p,d,r);expect(result.carbonera.geographicSeparationMeters).toBeGreaterThan(6);expect(result.carbonera.geographicSeparationMeters).toBeLessThan(8)
    expect(result.carbonera).toMatchObject({identityConfirmed:true,distinctFromLosChorros:true,historicalC5Mxn:0,currentC5Mxn:null,currentC5Cell:'BLANK_NOT_ZERO',exemptionVerified:false})
    expect(result).toMatchObject({quoteReady:false,adoptedValues:0,completeRoadTollsMxn:null,completeD2DCostUsd:null,truckRouteValidated:false,externalWrites:false})
    expect(Object.values(root.outputs).every(x=>x===null)).toBe(true)
  })
  it('rejects second charge, discount and a promoted historical zero',()=>{
    for(const q of [{...p,jorobas:{...p.jorobas,additionalAutomaticChargeMxn:278}},{...p,jorobas:{...p.jorobas,discountApplied:true}},{...p,carbonera:{...p.carbonera,currentC5Mxn:0}},{...p,carbonera:{...p.carbonera,exemptionVerified:true}}])expect(()=>review(q,d,r)).toThrow()
  })
  it('preserves272 legacy-city partial comparisons and monetary totals',()=>{
    const yard=consolidate(readLocalDocument,readLocalDocumentBytes,'LEGACY_CITY').supportingMxReservedYard
    expect(yard.cash).toHaveLength(8);expect(yard.financed).toHaveLength(128)
    const selected=yard.cash.filter(c=>c.baseCostId.includes('NET_PLUS_VAT')&&c.baseCostId.includes('RATE_EXCLUDES_WEEKLY_REST'))
    expect(selected[0].alternatives.map(a=>a.totalKnownComponentsUsd)).toEqual([4467.636500746187,4487.720750540846])
    expect(selected[1].alternatives.map(a=>a.totalKnownComponentsUsd)).toEqual([8881.362783399098,8923.947718991156])
    expect(selected.map(c=>c.knownCvuComponentUsd)).toEqual([3498.7601448746027,6670.379469781055])
  })
  it('rejects duplicate and mislocated Carbonera points',()=>{
    const q=structuredClone(d);q.observations.segments.push(q.observations.segments.find((s:{index:number})=>s.index===43));expect(()=>review(p,q,r)).toThrow('MX_TOLL_COVERAGE_DUPLICATE_POINT')
    const v=structuredClone(d);v.observations.segments.find((s:{index:number})=>s.index===43).tollPoint.coordinates=[-100.731940493,25.186824872];expect(()=>review(p,v,r)).toThrow('MX_TOLL_COVERAGE_GEOGRAPHIC_MISMATCH')
  })
  it('rejects substituted movement, price or source identity',()=>{
    const v=structuredClone(r);v.selections.find(s=>s.segmentIndex===16)!.amountMxn=920;expect(()=>review(p,d,v)).toThrow('MX_TOLL_COVERAGE_SUBTOTAL_BINDING')
    const s=structuredClone(p);s.sources[1]=s.sources[0];expect(()=>review(s,d,r)).toThrow('MX_TOLL_COVERAGE_SOURCE_BINDING')
    const q=structuredClone(d);q.observations.segments.find((s:{index:number})=>s.index===43).observedTollMxn=306;expect(()=>review(p,q,r)).toThrow('MX_TOLL_COVERAGE_POINT_BINDING')
  })
  it('rejects invalid coordinates and a duplicated cost selection',()=>{
    const q=structuredClone(d);q.observations.segments.find((s:{index:number})=>s.index===43).tollPoint.coordinates=[-100,NaN];expect(()=>review(p,q,r)).toThrow()
    const s=structuredClone(r);s.selections[1]=s.selections[0];expect(()=>review(p,d,s)).toThrow('MX_TOLL_COVERAGE_SUBTOTAL_BINDING')
  })
  it('fails closed on changed policy bytes',()=>expect(()=>consolidate(f=>readLocalDocument(f)+(f.endsWith('B2_MX_TOLL_COVERAGE_2026-10-02.json')?' ':''))).toThrow('SOURCE_HASH_MISMATCH:mxTollCoverage'))
  for(const source of p.sources.slice(0,3))it('fails closed on changed original:'+source.id,()=>{
    expect(()=>consolidate(readLocalDocument,f=>f===source.archive.file?new Uint8Array([1]):readLocalDocumentBytes(f))).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH:'+source.id)
  })
})
