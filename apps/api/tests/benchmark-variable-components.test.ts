import { describe, expect, it } from 'vitest'
import { calculateVariableComponentReferences } from '../scripts/lib/reference-variable-components.js'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'

const load=(name:string)=>JSON.parse(readLocalDocument(`docs/research/${name}.json`))
const model=load('B2_VARIABLE_COMPONENTS_REFERENCE_2026-10-01')
const fuel=load('B2_FUEL_PRICE_PERFORMANCE_REFERENCE_2026-09-30')
const maintenance=load('B2_MAINTENANCE_TIRES_REFERENCE_2026-09-30')
const stage={country:'MX',distanceKm:1124.5764209526735,basis:'SAKBE_CANDIDATE_DISTANCE_NOT_TRUCK_APPROVED'}
const calculate=(m:unknown=model,f:unknown=fuel,r:unknown=maintenance,s:unknown=stage)=>calculateVariableComponentReferences(m,f,r,s)

describe('joint base-model variable components projected over a candidate MX stage',()=>{
  it('joins the same source, year, currency and exclusive family records',()=>{
    const r=calculate()
    for(const [i,expected] of [10.70421,5.61754,.27967,.96996].entries()) {
      expect(r.selectedMxBaseModel.selectedComponents[i].nativePerVehicleKm).toBeCloseTo(expected,12)
    }
    expect(r.selectedMxBaseModel.selectedSubtotalMxnPerVehicleKm).toBeCloseTo(17.57138,12)
    expect(r).toMatchObject({country:'MX',currency:'MXN',referencePeriod:'2025',eligibleForPilot:false})
  })
  it('extends published rates to the candidate once, without full-trailer or fixed-cost charges',()=>{
    const r=calculate().selectedMxBaseModel
    expect(r.conditionalSelectedCandidateStageAmountMxn).toBeCloseTo(19760.35963159939,8)
    expect(r.selectedComponents.reduce((s,c)=>s+c.conditionalCandidateStageAmountMxn,0)).toBeCloseTo(r.conditionalSelectedCandidateStageAmountMxn,8)
    expect(r).toMatchObject({capitalOrAdminAdded:false,driverCostAdded:false,extraTrailerChargeAdded:false,
      wholePublishedOperationTotalAdded:false,resourceSplit:null,loadedEmptySplit:null,emptyReturnKm:null,
      selectedSubtotalNotCompleteCvu:true,target53FootProfileMatched:false,truckRouteAdjusted:false})
  })
  it('preserves printed monetary outputs instead of rounded reconstruction',()=>{
    const r=calculate().selectedMxBaseModel
    expect(r.publishedFuelMxnPer1000VehicleKm).toBe(10704.21)
    expect(r.reconstructedRoundedFuelMxnPer1000VehicleKm).toBeCloseTo(10704.3104,8)
    expect(r.printedDifferenceMxnPer1000VehicleKm).toBeCloseTo(.1004,8)
    expect(r.impliedBaseModelKmPerLiter).toBeCloseTo(2.066457265663746,12)
    expect(r.conditionalBaseModelLiters).toBeCloseTo(544.2050216274178,8)
  })
  it('does not mix gross2026 retail prices with net2025 costs or unrelated US studies',()=>{
    const r=calculate()
    expect(r).toMatchObject({currentRetailPricesAppliedToNet2025Model:false,usFuelAndTtiSummed:false,
      crossCountryTotalUsd:null,pilotCvuUsdPerKm:null,pilotCvuUsd:null,pilotFuelTripUsd:null,
      calibrated:false,quoteReady:false,adoptedValues:0})
    expect(r.fuelContrasts).toHaveLength(4)
    expect(r.maintenanceTireContrasts).toHaveLength(2)
    expect(r.maintenanceTireContrasts[1].sourceSelectedSubtotalPerVehicleKm).toBeCloseTo(.26/1.609344,12)
  })
  it('scales linearly without inflating rounded precision or choosing a tariff',()=>{
    const r=calculate(undefined,undefined,undefined,{...stage,distanceKm:1000})
    expect(r.selectedMxBaseModel.conditionalSelectedCandidateStageAmountMxn).toBeCloseTo(17571.38,8)
    expect(r.selectedMxBaseModel.conditionalBaseModelLiters).toBe(483.92)
    expect(r.selectedMxBaseModel.selectedComponents.map(c=>c.conditionalCandidateStageAmountMxn)).toEqual([10704.21,5617.54,279.67,969.96])
  })
  it.each([0,-1,NaN,Infinity,1e7])('rejects invalid candidate distance %s',distanceKm=>{
    expect(()=>calculate(undefined,undefined,undefined,{...stage,distanceKm})).toThrow()
  })
  it.each(['USD','US','pilot'])('rejects extra unit/country/scope claims %s',claim=>{
    expect(()=>calculate(undefined,undefined,undefined,{...stage,[claim]:true})).toThrow()
  })
  it('rejects marking the40ft source as the53ft target or as observed loaded/empty',()=>{
    for(const update of [{trailerLengthFeet:53},{targetProfileMatched:true},{loadedEmptySplitEstablished:true}]) {
      const m=structuredClone(model);Object.assign(m.model,update)
      expect(()=>calculate(m)).toThrow()
    }
  })
  it.each(['sha256','file'])('rejects source archive identity mismatch %s',key=>{
    const m=structuredClone(model);m.source.archive[key]=key === 'sha256' ? '0'.repeat(64) : 'different.pdf'
    expect(()=>calculate(m)).toThrow('VARIABLE_COMPONENT_SOURCE_JOIN_MISMATCH')
  })
  it('rejects mixing source group, duplicate records or duplicate pin identities',()=>{
    const m=structuredClone(model);m.maintenanceGroupId='US_TTI_ESTIMATE'
    expect(()=>calculate(m)).toThrow('VARIABLE_COMPONENT_SOURCE_JOIN_MISMATCH')
    const d=structuredClone(model);d.maintenanceRecordIds[0]=d.maintenanceRecordIds[1]
    expect(()=>calculate(d)).toThrow('VARIABLE_COMPONENT_DUPLICATE_REFERENCE')
    const p=structuredClone(model);p.reusedPins[1].id=p.reusedPins[0].id
    expect(()=>calculate(p)).toThrow('VARIABLE_COMPONENT_DUPLICATE_REFERENCE')
  })
  it('does not accept double-counted maintenance or cross-period records',()=>{
    const m=structuredClone(maintenance);m.records[0].includes.push('TIRES')
    expect(()=>calculate(undefined,undefined,m)).toThrow()
    const p=structuredClone(maintenance);p.records[0].referencePeriod='2024'
    expect(()=>calculate(undefined,undefined,p)).toThrow('REFERENCE_PERIOD_MISMATCH')
  })
  it('rejects a material fuel transcription difference',()=>{
    const m=structuredClone(model);m.fuel.publishedCostMxnPer1000VehicleKm=12000
    expect(()=>calculate(m)).toThrow('VARIABLE_COMPONENT_FUEL_PRINTED_PRECISION_MISMATCH')
  })
  it('does not allow dropping excluded families, treating them as zero or adding an asset split',()=>{
    const m=structuredClone(model);m.excludedFamilies.pop()
    expect(()=>calculate(m)).toThrow('VARIABLE_COMPONENT_EXCLUSION_MISMATCH')
    const extra=structuredClone(model);extra.resourceSplit={tractor:.5,trailer:.5}
    expect(()=>calculate(extra)).toThrow()
  })
})
