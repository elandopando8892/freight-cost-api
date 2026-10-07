import {describe,it,expect} from 'vitest'
import {consolidateBinationalReferenceBudget as consolidate} from '../scripts/consolidate-binational-reference-budget.js'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'
import {readBorderLinkPlanning} from '../scripts/lib/reference-border-link-planning.js'
import {calculatePilotCycleExposureScenarios as cycle} from '../scripts/lib/reference-pilot-cycle-exposure.js'
import {calculatePilotVariableScenarios as variable} from '../scripts/lib/reference-pilot-variable.js'

const load=(path:string)=>JSON.parse(readLocalDocument(path))
const file='docs/research/B2_BORDER_LINK_PLANNING_2026-10-03.json',policy=load(file),km=5*1.609344
const old=consolidate(),now=consolidate(undefined,undefined,'POSTAL_REFERENCE','PUBLIC_LINK_FORECAST')
const base=old.partialFixedWithCompanyScenarios,cyclePolicy=load('docs/research/B2_PILOT_CYCLE_EXPOSURE_SCENARIOS_2026-10-02.json')
const mx=load('docs/research/B2_SAKBE_MX_LIVE_DETAIL_2026-09-30.json'),capacity=load('docs/research/B2_US_DRYVAN_CAPACITY_2026-10-01.json')
const postal=load('docs/research/B2_US_POSTAL_ROUTE_REFERENCE_2026-10-03.json')
const cases=now.supportingPilotCycleExposure.scenarios
const mxResource=(s:typeof cases[number])=>{
  const r=s.allocationResources.find(r=>r.resourceId==='MX_TRACTOR')
  if(!r||r.resourceId!=='MX_TRACTOR')throw new Error('TEST_MX_RESOURCE_MISSING')
  return r
}
const project=(cycles:unknown)=>variable(load('docs/research/B2_PILOT_VARIABLE_SCENARIOS_2026-10-02.json'),cycles,
  load('docs/research/B2_VARIABLE_COMPONENTS_REFERENCE_2026-10-01.json'),load('docs/research/B2_FUEL_PRICE_PERFORMANCE_REFERENCE_2026-09-30.json'),
  load('docs/research/B2_MAINTENANCE_TIRES_REFERENCE_2026-09-30.json'),old.supportingDriverEconomics,load('docs/research/B2_FX_REFERENCE_2026-10-02.json'))

describe('explicit public border-yard link forecast through the same economic chain',()=>{
  it('retains approximate evidence apart from spatial, time and reverse hypotheses',()=>{
    expect(readBorderLinkPlanning(policy)).toMatchObject({publishedBridgeProximityMiles:5,linkDistanceKmPerMovementHypothesis:km,
      nationalApproachMinutesPerMovementHypothesis:14,sourceEndpointMatched:false,reverseGeometryObserved:false,truckRouteValidated:false,
      mxSakbeApproachAddedAgain:false,bridgeSpanAddedAgain:false,usPostalLegAddedAgain:false,quoteReady:false,adoptedOperationalValues:0})
    expect(now.borderLinkBasis).toBe('PUBLIC_LINK_FORECAST')
    expect(old.borderLinkBasis).toBe('UNRESOLVED_LINK')
    expect(old.supportingPilotCycleExposure.borderLinkPlanning).toBeNull()
  })
  it('adds two MX link movements in network and four in dedicated, without applying empty factor again',()=>{
    cases.forEach((s,i)=>{
      const prior=old.supportingPilotCycleExposure.scenarios[i],mx=mxResource(s),priorMx=mxResource(prior)
      expect(mx.totalCycleKm-priorMx.totalCycleKm).toBeCloseTo(km*(i?4:2),9)
      expect(mx.loadedKm-priorMx.loadedKm).toBeCloseTo(km,9)
      expect(mx.emptyKm-priorMx.emptyKm).toBeCloseTo(km*(i?3:1),9)
      expect(mx.totalCycleKm).toBeCloseTo(mx.attachedKm!+mx.bobtailKm!,9)
      expect(s.mandatoryBobtailLinkKm).toBeCloseTo(km*(i?2:1),9)
    })
  })
  it('charges only attached border distance to one box and keeps postal US road unchanged',()=>{
    cases.forEach((s,i)=>{
      const prior=old.supportingPilotCycleExposure.scenarios[i],box=s.allocationResources[2]
      expect(box.totalCycleKm-prior.allocationResources[2].totalCycleKm).toBeCloseTo(km*(i?2:1),9)
      expect(box.loadedKm).toBeCloseTo(s.allocationResources[0].loadedKm+s.allocationResources[1].loadedKm,9)
      expect(s.allocationResources[1]).toEqual(prior.allocationResources[1])
      expect(box.emptyKm).toBeCloseTo(s.allocationResources[1].emptyKm+(i?mxResource(s).attachedKm-mxResource(s).loadedKm:0),9)
    })
    expect(now.partialFixedWithCompanyScenarios).toEqual(old.partialFixedWithCompanyScenarios)
  })
  it('recomputes fuel and mileage pay using all tractor movements, but not bobtail composite wear',()=>{
    now.supportingPilotVariableEconomics.scenarios.forEach((s,i)=>{
      const prior=old.supportingPilotVariableEconomics.scenarios[i],newMxKm=km*(i?4:2),newAttached=km*(i?2:1)
      expect(s.conditionalRoadFuelQuantity.mxLiters-prior.conditionalRoadFuelQuantity.mxLiters).toBeCloseTo(newMxKm*.48392,9)
      for(const row of s.rows){
        const before=prior.rows.find(r=>r.id===row.id)!
        expect(row.km-before.km).toBeCloseTo(row.country==='US'?0:row.id.match(/FUEL|DRIVER/)?newMxKm:newAttached,9)
      }
      expect(s.unresolvedMxBobtailMaintenanceUsd).toEqual({status:'UNPRICED_TRACTOR_ONLY_COMPONENT',amountUsd:null})
      expect(s.mxBobtailKm-prior.mxBobtailKm).toBeCloseTo(km*(i?2:1),9)
    })
  })
  it('includes approach once per crossing task, preserves ordered movements and parallel box topology',()=>{
    now.supportingPilotOrdinaryDuty.scenarios.forEach((s,i)=>{
      const movements=i?['MX_LOADED_NORTH','MX_BOBTAIL_SOUTH','MX_BOBTAIL_NORTH','MX_ATTACHED_EMPTY_SOUTH']:['MX_LOADED_NORTH','MX_BOBTAIL_SOUTH']
      for(const id of movements)expect(s.timeline.filter(t=>t.kind==='TASK'&&t.id===id).reduce((v,t)=>v+t.hours,0)).toBeCloseTo((87+14)/60,10)
      const before=old.supportingPilotOrdinaryDuty.scenarios[i]
      expect(s.totalKnownTaskHours-before.totalKnownTaskHours).toBeCloseTo(14/60*movements.length,10)
      expect(s.serialBoxTimeline.map(t=>t.resource)).toEqual(before.serialBoxTimeline.map(t=>t.resource))
      expect(s.serialBoxTimeline.some(t=>t.id.includes('BOBTAIL'))).toBe(false)
      expect(s.timeline.at(-1)!.endHour).toBeCloseTo(s.knownMxElapsedClockDays*24,10)
      expect(s.compatibleKnownCyclesPerMonth).toBeLessThan(before.compatibleKnownCyclesPerMonth)
      const resources=cases[i].allocationResources
      for(const resource of resources)expect(resource.totalCycleKm*s.compatibleKnownCyclesPerMonth).toBeLessThanOrEqual(resource.monthlyKmCapacity+1e-7)
    })
  })
  it('recomposes all272cash/finance comparisons and conserves component sums without certifying a full cost',()=>{
    for(const payment of ['cash','financed'] as const){
      expect(now.supportingMxReservedYard[payment]).toHaveLength(payment==='cash'?8:128)
      for(const c of now.supportingMxReservedYard[payment]){
        const before=old.supportingMxReservedYard[payment].find(p=>p.baseCostId===c.baseCostId)!
        expect(c.knownCvuComponentUsd).toBeGreaterThan(before.knownCvuComponentUsd)
        for(const a of c.alternatives){
          const prior=before.alternatives.find(p=>p.premiumAlternativeId===a.premiumAlternativeId)!
          expect(a.knownCfuComponentUsd).toBeGreaterThan(prior.knownCfuComponentUsd)
          expect(a.totalKnownComponentsUsd).toBeCloseTo(a.knownCfuComponentUsd+c.knownCvuComponentUsd,8)
          expect(a.completeD2DCostUsd).toBeNull();expect(a.quoteReady).toBe(false)
        }
      }
    }
    expect(Object.values(now.outputs).every(v=>v===null)).toBe(true)
    expect(Object.values(now.externalChanges).every(v=>v===false)).toBe(true)
  })
  it('recalculates incursion and annual shares instead of reusing the old insurance exposure',()=>{
    const n=now.supportingCrossborderInsuranceExposure.scenarios[0],d=now.supportingCrossborderInsuranceExposure.scenarios[1]
    expect(n.windows[0].elapsedHours).toBeCloseTo(21.8666666667,8)
    expect(d.windows[1].elapsedHours).toBeCloseTo(5.8666666667,8)
    expect(n.conditional24hPremiumMultiplier).toBe(1);expect(d.conditional24hPremiumMultiplier).toBe(2)
    expect(d.conditionalAnnualPremiumShare).toBeGreaterThan(old.supportingCrossborderInsuranceExposure.scenarios[1].conditionalAnnualPremiumShare)
    expect(d.temporaryAlternative.costUsd).toBeNull();expect(d.annualAlternative.costUsd).toBeNull()
  })
  it('keeps old unresolved component fixtures reproducible and never adds cash financing or a second box',()=>{
    const match=(prefix:string)=>old.supportingMxReservedYard.cash.find(s=>s.baseCostId===`${prefix}:RATE_EXCLUDES_WEEKLY_REST:ALL_CAPITAL_CASH_NET_PLUS_VAT_PUBLIC_ADMIN_SCALE`)!
    expect(match('NETWORK_EXPECTED_EMPTY_PROXY').knownCvuComponentUsd).toBeCloseTo(3552.087567884155,8)
    expect(match('DEDICATED_EMPTY_SAME_BOX_RETURN').knownCvuComponentUsd).toBeCloseTo(6768.189274905106,8)
    expect(now.supportingSharedBoxFinancePlanning).toEqual(old.supportingSharedBoxFinancePlanning)
    expect(now.supportingCargoTripInsurance).toEqual(old.supportingCargoTripInsurance)
  })
  it('rejects an unmatched legacy US city origin and unsupported basis',()=>{
    expect(()=>consolidate(undefined,undefined,'LEGACY_CITY','PUBLIC_LINK_FORECAST')).toThrow('BORDER_LINK_REQUIRES_MATCHED_POSTAL_YARD_REFERENCE')
    expect(()=>cycle(cyclePolicy,mx,capacity,base,undefined,policy)).toThrow('BORDER_LINK_REQUIRES_MATCHED_POSTAL_YARD_REFERENCE')
    expect(()=>consolidate(undefined,undefined,'POSTAL_REFERENCE','ANY_LINK' as never)).toThrow('BORDER_LINK_BASIS_INVALID')
  })
  it('rejects fabricated values, endpoint certification or extra span/approach',()=>{
    for(const patch of [{publishedBridgeProximityMiles:6},{linkDistanceKmPerMovementHypothesis:8.34422},{nationalApproachMinutesPerMovementHypothesis:0},
      {mxSakbeApproachAddedAgain:true},{bridgeSpanAddedAgain:true},{sourceEndpointMatched:true},{quoteReady:true},{extraFeeUsd:10}]){
      expect(()=>readBorderLinkPlanning({...policy,...patch})).toThrow()
    }
  })
  it('binds the reference card and earlier evidence hash, rejecting silent source edits',()=>{
    expect(()=>consolidate(f=>f===file?readLocalDocument(f).replace('"publishedBridgeProximityMiles": 5','"publishedBridgeProximityMiles": 6'):readLocalDocument(f))).toThrow('SOURCE_HASH_MISMATCH:borderLinkPlanning')
    expect(()=>consolidate(readLocalDocument,f=>f===policy.priorEvidence.file?Buffer.from('changed'):readLocalDocumentBytes(f))).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH:US_POSTAL_ROUTE_OBSERVATION')
  })
  it('rejects dropped bobtail distance or a box with those kilometers before cost projection',()=>{
    const data=structuredClone(now.supportingPilotCycleExposure)
    mxResource(data.scenarios[1]).bobtailKm=0
    expect(()=>project(data)).toThrow('PILOT_VARIABLE_ATTACHMENT_NOT_CONSERVED')
    const badBox=structuredClone(now.supportingPilotCycleExposure),box=badBox.scenarios[1].allocationResources[2]
    box.emptyKm+=km;box.totalCycleKm+=km
    expect(()=>project(badBox)).toThrow('PILOT_VARIABLE_BOX_SCOPE_MISMATCH')
  })
  it('is deterministic and leaves public inputs and prior scenario untouched',()=>{
    const before=JSON.stringify([policy,cyclePolicy,mx,capacity,postal,base])
    const a=cycle(cyclePolicy,mx,capacity,base,postal,policy)
    expect(cycle(cyclePolicy,mx,capacity,base,postal,policy)).toEqual(a)
    expect(JSON.stringify([policy,cyclePolicy,mx,capacity,postal,base])).toBe(before)
    expect(consolidate(undefined,undefined,'POSTAL_REFERENCE','PUBLIC_LINK_FORECAST').supportingMxReservedYard.cash).toEqual(now.supportingMxReservedYard.cash)
  })
})
