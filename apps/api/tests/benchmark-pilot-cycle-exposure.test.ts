import {describe,it,expect} from 'vitest'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'
import {calculatePilotCycleExposureScenarios as calculate,calculateUsNominalMovementClock as usClock} from '../scripts/lib/reference-pilot-cycle-exposure.js'
import {consolidateBinationalReferenceBudget} from '../scripts/consolidate-binational-reference-budget.js'
const file='docs/research/B2_PILOT_CYCLE_EXPOSURE_SCENARIOS_2026-10-02.json'
const load=(path:string)=>JSON.parse(readLocalDocument(path))
const policy=load(file),mx=load('docs/research/B2_SAKBE_MX_LIVE_DETAIL_2026-09-30.json'),capacity=load('docs/research/B2_US_DRYVAN_CAPACITY_2026-10-01.json')
const root=consolidateBinationalReferenceBudget(),components=root.partialFixedWithCompanyScenarios
const result=()=>calculate(policy,mx,capacity,components)
const postalFile='docs/research/B2_US_POSTAL_ROUTE_REFERENCE_2026-10-03.json',postal=load(postalFile)
describe('prospective whole resource cycles and known fixed component allocation',()=>{
  it('reuses the same full chain for the postal reference, without adding it to city distance',()=>{
    const r=calculate(policy,mx,capacity,components,postal)
    expect(r.usRoadBasis).toBe('POSTAL_REFERENCE')
    expect(r.usLoadedReferenceKm).toBeCloseTo(734.4*1.609344,8)
    expect(r.usLoadedReferenceKm-result().usLoadedReferenceKm).toBeCloseTo(26.4*1.609344,8)
    expect(r.usClock.nominalDrivingHours).toBeCloseTo(697/60,10)
    expect(r.usClock.elapsedHours-result().usClock.elapsedHours).toBeCloseTo(17/60,10)
    expect(r.usPostalRoadReference).toMatchObject({destinationPostalPointMatched:true,actualDeliveryAddressMatched:false,
      bridgeCrossingIncluded:false,truckRestrictionsValidated:false,quoteReady:false,adoptedOperationalValues:0})
    expect(r.usCityRoadReference).toEqual(policy.usCityRoadReference)
    expect(r.legacyCityReferenceUsed).toBe(false)
    expect(r.usLoadedCityProxyKmIsCompatibilityAlias).toBe(true)
    for(const s of r.scenarios){
      expect(s.allocationResources[1].loadedKm).toBe(r.usLoadedReferenceKm)
      expect(s.allocationResources[2].loadedKm).toBeCloseTo(r.mxLoadedKm+r.usLoadedReferenceKm,8)
      for(const asset of s.allocationResources){
        expect(s.modeledEquivalentCyclesPerMonth*asset.totalCycleKm).toBeLessThanOrEqual(asset.monthlyKmCapacity+1e-7)
        expect(s.modeledEquivalentCyclesPerMonth*asset.cycleDays).toBeLessThanOrEqual(24+1e-7)
      }
    }
    expect(root.supportingPilotCycleExposure.usRoadBasis).toBe('POSTAL_REFERENCE')
  })
  it('retains a reproducible legacy counterfactual and recomposes fixed/variable cash and finance, not just added fuel',()=>{
    const legacy=consolidateBinationalReferenceBudget(readLocalDocument,readLocalDocumentBytes,'LEGACY_CITY')
    const now=root.supportingMxReservedYard,old=legacy.supportingMxReservedYard
    expect(legacy.supportingPilotCycleExposure.usRoadBasis).toBe('LEGACY_CITY')
    expect(now.cash).toHaveLength(8);expect(now.financed).toHaveLength(128)
    for(const payment of ['cash','financed'] as const)for(const c of now[payment]){
      const prior=old[payment].find(p=>p.baseCostId===c.baseCostId)!
      expect(c.knownCvuComponentUsd).toBeGreaterThan(prior.knownCvuComponentUsd)
      expect(c.knownCvuComponentUsd-prior.knownCvuComponentUsd).toBeGreaterThan(c.cycleScenarioId==='NETWORK_EXPECTED_EMPTY_PROXY'?52.3141608:96.6661063)
      for(const a of c.alternatives){
        expect(a.totalKnownComponentsUsd).toBeCloseTo(a.knownCfuComponentUsd+c.knownCvuComponentUsd,8)
        expect(a.knownCfuComponentUsd).toBeGreaterThan(prior.alternatives.find(p=>p.premiumAlternativeId===a.premiumAlternativeId)!.knownCfuComponentUsd)
        expect(a.completeD2DCostUsd).toBeNull()
        expect(a.quoteReady).toBe(false)
      }
      expect(c.completeD2DCostUsd).toBeNull()
    }
    expect(root.supportingPilotOrdinaryDuty.scenarios[0].knownBoxClockDays).toBeGreaterThan(legacy.supportingPilotOrdinaryDuty.scenarios[0].knownBoxClockDays)
    expect(root.partialFixedWithCompanyScenarios).toEqual(legacy.partialFixedWithCompanyScenarios)
    expect(Object.values(root.outputs).every(v=>v===null)).toBe(true)
  })
  it('reproduces current postal known components separately from legacy monetary fixtures',()=>{
    const expected=[{cycle:'NETWORK_EXPECTED_EMPTY_PROXY',cvu:3552.087567884155,cfu:[984.2756578479704,1004.426459508111],
      total:[4536.363225732125,4556.514027392265]},
      {cycle:'DEDICATED_EMPTY_SAME_BOX_RETURN',cvu:6768.189274905106,cfu:[2238.9663803911917,2281.5513159832503],
        total:[9007.155655296297,9049.740590888356]}]
    for(const e of expected){
      const c=root.supportingMxReservedYard.cash.find(c=>c.cycleScenarioId===e.cycle&&c.baseCostId.includes('NET_PLUS_VAT')&&c.baseCostId.includes('RATE_EXCLUDES_WEEKLY_REST'))!
      expect(c.knownCvuComponentUsd).toBeCloseTo(e.cvu,8)
      expect(c.alternatives.map(a=>a.premiumAlternativeId)).toEqual(['PUBLIC_GUIDE_LOW','PUBLIC_GUIDE_HIGH'])
      for(let i=0;i<c.alternatives.length;i++){
        expect(c.alternatives[i].knownCfuComponentUsd).toBeCloseTo(e.cfu[i],8)
        expect(c.alternatives[i].totalKnownComponentsUsd).toBeCloseTo(e.total[i],8)
      }
    }
  })
  it.each(['truckRestrictionsValidated','bridgeCrossingIncluded','actualDeliveryAddressMatched','quoteReady'])('does not accept a claim of%s as source certification',key=>{
    expect(()=>calculate(policy,mx,capacity,components,{...postal,[key]:true})).toThrow()
  })
  it('rejects edited postal values, source identity, observation archive or invalid basis',()=>{
    expect(()=>calculate(policy,mx,capacity,components,{...postal,distanceMiles:708})).toThrow()
    expect(()=>calculate(policy,mx,capacity,components,{...postal,sourceUrl:'https://example.test'})).toThrow()
    expect(()=>consolidateBinationalReferenceBudget(path=>path===postalFile?readLocalDocument(path)+' ':readLocalDocument(path))).toThrow('SOURCE_HASH_MISMATCH:pilotUsPostalRoad')
    expect(()=>consolidateBinationalReferenceBudget(readLocalDocument,path=>path===postal.evidenceArchive.file?Buffer.from('edited'):readLocalDocumentBytes(path))).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH:US_POSTAL_ROUTE_OBSERVATION')
    expect(()=>consolidateBinationalReferenceBudget(readLocalDocument,readLocalDocumentBytes,'unknown' as never)).toThrow('US_ROAD_BASIS_INVALID')
  })
  it('does not mutate the legacy policy, public observation or retained components',()=>{
    const before=JSON.stringify({policy,postal,components})
    const first=calculate(policy,mx,capacity,components,postal)
    expect(calculate(policy,mx,capacity,components,postal)).toEqual(first)
    expect(JSON.stringify({policy,postal,components})).toBe(before)
  })
  it.each([[480,8,0,0],[600,10.5,.5,0],[660,25,.5,13.5],[680,25+1/3,.5,13.5]])('US movement%imin has elapsed%fh with no terminal pause/reset', (minutes,elapsed,breaks,rest)=>{
    const r=usClock(minutes)
    expect(r.elapsedHours).toBeCloseTo(elapsed,10)
    expect(r.breakHours).toBe(breaks)
    expect(r.offDutyHours).toBe(rest)
    expect(r.timeline.at(-1)?.kind).toBe('DRIVING')
    expect(r.weeklyDutyComplianceProven).toBe(false)
  })
  it.each([0,-1,NaN,Infinity,60001])('rejects invalid driving duration%s',minutes=>expect(()=>usClock(minutes)).toThrow())
  it('uses primary708mile city proxy and combined1999truck capacity, not own-only divisor',()=>{
    const r=result()
    expect(r.usLoadedCityProxyKm).toBeCloseTo(1139.415552,8)
    expect(r.usCapacityProxyKmPerMonth).toBeCloseTo(11307.27187593797,8)
    expect(r.usCityRoadReference).toMatchObject({truckValidated:false,zip72916OrBridgeEndpointMatched:false})
    expect(r.productiveElapsedAssetDaysPerMonth).toBe(24)
  })
  it('network total uses L/(1-e), same box only follows US next-pickup empty recovery',()=>{
    const s=result().scenarios[0],mxR=s.allocationResources[0],us=s.allocationResources[1],box=s.allocationResources[2]
    expect(mxR.totalCycleKm).toBeCloseTo(mxR.loadedKm/(1-.0761),9)
    expect(us.totalCycleKm).toBeCloseTo(us.loadedKm/(1-.0761),9)
    expect(box.emptyKm).toBe(us.emptyKm)
    expect(box.emptyKm).not.toBeCloseTo(mxR.emptyKm+us.emptyKm,8)
    expect(box.totalCycleKm).toBeCloseTo(mxR.loadedKm+us.loadedKm+us.emptyKm,8)
    expect(s.mxTractorWaitsForSameBox).toBe(false)
  })
  it('dedicated same-box return keeps MX waiting and records both national return phases once',()=>{
    const s=result().scenarios[1],[mxR,us,box]=s.allocationResources
    expect(s.mxTractorWaitsForSameBox).toBe(true)
    expect(s.mxCommittedWaitingForUsHours).toBeCloseTo(us.cycleDays*24,9)
    expect(mxR.cycleDays).toBeCloseTo(box.cycleDays,10)
    expect(box.emptyKm).toBeCloseTo(mxR.emptyKm+us.emptyKm,9)
    expect(mxR.emptyKm).toBe(mxR.loadedKm)
    expect(us.emptyKm).toBe(us.loadedKm)
    expect(s.serialBoxTimeline.map(p=>p.resource)).toEqual(['MX_TRACTOR','DETACHED','US_TRACTOR','DETACHED','MX_TRACTOR'])
    expect(s.serialBoxTimeline[2].hours).toBeCloseTo(us.cycleDays*24-4,9)
  })
  it('keeps serial time conserved and capacity feasible for every resource, no phantom box ratio',()=>{
    for(const s of result().scenarios){
      expect(s.attachmentReview.issues).toEqual([])
      expect(s.attachmentReview.minimumTrailerDays).toBeCloseTo(s.boxCycleDays,10)
      expect(s.serialBoxTimeline.at(-1)!.endHour).toBeCloseTo(s.boxCycleDays*24,10)
      for(let i=1;i<s.serialBoxTimeline.length;i++)expect(s.serialBoxTimeline[i].startHour).toBe(s.serialBoxTimeline[i-1].endHour)
      for(const r of s.allocationResources){
        expect(s.modeledEquivalentCyclesPerMonth*r.totalCycleKm).toBeLessThanOrEqual(r.monthlyKmCapacity+1e-7)
        expect(s.modeledEquivalentCyclesPerMonth*r.cycleDays).toBeLessThanOrEqual(24+1e-7)
      }
      expect(s.capacitySourceMatchedToPilot).toBe(false)
    }
  })
  it('one MAX per resource after full cycle, never separate MAX per box phase or distance+time',()=>{
    for(const s of result().scenarios) for(const a of s.fixedComponentAllocations){
      expect(a.resources).toHaveLength(3)
      for(const r of a.resources)expect(r.allocatedKnownFixedComponentUsd).toBe(Math.max(r.byDistanceUsd,r.byTimeUsd))
      expect(a.knownFixedComponentAllocationUsd).toBeCloseTo(a.resources.reduce((sum,r)=>sum+r.allocatedKnownFixedComponentUsd,0),9)
      expect(a).toMatchObject({completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,isLowerBound:false,missingAmountsDefaultedToZero:false})
    }
  })
  it('root projections repeat without changing full outputs, baseline or monthly compositions',()=>{
    expect(result()).toEqual(root.supportingPilotCycleExposure.sourceRef?calculate(policy,mx,capacity,components):null)
    expect(root.partialFixedWithCompanyScenarios.map(s=>s.displayUsd)).toEqual([32174.88,32343.83])
    expect(root.authoritativeBudget.completeRows).toBe(2)
    expect(Object.values(root.outputs).every(v=>v===null)).toBe(true)
    expect(root.supportingPilotCycleExposure.scenarios.every((s:{selected:boolean;quoteReady:boolean;actualEmptyKm:number|null})=>!s.selected&&!s.quoteReady&&s.actualEmptyKm===null)).toBe(true)
  })
  it('rejects ten-pair components mixed with one-pair cycles or duplicate scenario identities',()=>{
    expect(()=>calculate(policy,mx,capacity,components.map(c=>({...c,modeledFleetPairs:10})))).toThrow()
    expect(()=>calculate({...policy,scenarios:[policy.scenarios[0],policy.scenarios[0]]},mx,capacity,components)).toThrow('PILOT_CYCLE_DUPLICATE_IDENTITY')
  })
  it('rejects source graph misread87→89, calendar substitution and physical-empty mismatch',()=>{
    expect(()=>calculate({...policy,borderPolicy:{...policy.borderPolicy,northboundCrossingMinutes:89}},mx,capacity,components)).toThrow()
    expect(()=>calculate({...policy,productiveElapsedAssetDaysPerMonth:268/12},mx,capacity,components)).toThrow()
    expect(()=>calculate({...policy,scenarios:policy.scenarios.map((s:{emptyShareOfTotalKm:number})=>({...s,emptyShareOfTotalKm:.5}))},mx,capacity,components)).toThrow('PILOT_EMPTY_SCENARIO_MISMATCH')
  })
  it('rejects edited source table even with same combined count',()=>{
    const c=structuredClone(capacity),o=c.observations.find((s:{id:string})=>s.id==='H12026')
    o.averageCompanyDriverTrucks=1600;o.averageOwnerOperatorTrucks=399
    expect(()=>calculate(policy,mx,c,components)).toThrow('PILOT_CAPACITY_COHORT_MISMATCH')
  })
  it('detects altered policy and archived crossing graphic',()=>{
    expect(()=>consolidateBinationalReferenceBudget(path=>path===file?readLocalDocument(path)+' ':readLocalDocument(path))).toThrow()
    expect(()=>consolidateBinationalReferenceBudget(readLocalDocument,path=>path.endsWith('TTI_BORDER_COMPARISON_20261002.pdf')?Buffer.from('edited'):readLocalDocumentBytes(path))).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH:TTI_WORLD_TRADE_VISUAL')
  })
})
