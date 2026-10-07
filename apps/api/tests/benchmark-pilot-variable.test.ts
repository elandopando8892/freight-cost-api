import {describe,it,expect} from 'vitest'
import {readLocalDocument} from '../scripts/assemble-economic-reference-cards.js'
import {consolidateBinationalReferenceBudget as consolidate} from '../scripts/consolidate-binational-reference-budget.js'
import {calculatePilotVariableScenarios as calculate} from '../scripts/lib/reference-pilot-variable.js'
const load=(f:string)=>JSON.parse(readLocalDocument('docs/research/'+f))
const file='B2_PILOT_VARIABLE_SCENARIOS_2026-10-02.json',p=load(file),root=consolidate(),cycles=root.supportingPilotCycleExposure,
  model=load('B2_VARIABLE_COMPONENTS_REFERENCE_2026-10-01.json'),fuel=load('B2_FUEL_PRICE_PERFORMANCE_REFERENCE_2026-09-30.json'),
  maint=load('B2_MAINTENANCE_TIRES_REFERENCE_2026-09-30.json'),driver=root.supportingDriverEconomics,fx=load('B2_FX_REFERENCE_2026-10-02.json')
const result=()=>calculate(p,cycles,model,fuel,maint,driver,fx)
describe('prospective variable mileage joined to resource cycles without a duplicate box',()=>{
  it('repeats deterministically without changing original complete outputs or selecting a quote',()=>{
    expect(result()).toEqual(root.supportingPilotVariableEconomics)
    expect(result()).toEqual(result())
    expect(Object.values(root.outputs).every(v=>v===null)).toBe(true)
    expect(root.authoritativeBudget.completeRows).toBe(2)
    expect(result()).toMatchObject({target53FootCalibrated:false,homogeneousTaxBasis:false,jointObservedCohort:false,externalWrites:false,adoptedValues:0})
  })
  it('uses27 dated retail and consumption once, not old printed2025 fuel plus new retail',()=>{
    for(const s of result().scenarios){
      const r=s.rows.find(r=>r.id==='MX_FUEL')!
      expect(r.nativePerKm).toBeCloseTo(.48392*27,12)
      expect(r.amountNative).toBeCloseTo(s.conditionalRoadFuelQuantity.mxLiters*27,8)
      expect(r.amountUsd).toBeCloseTo(r.amountNative/18.3688,9)
      expect(s.rows.filter(r=>r.id==='MX_FUEL')).toHaveLength(1)
    }
  })
  it('USroad fuel usesexact mileand7.9same-rate hypothesis, not certified light-bin empty',()=>{
    for(const s of result().scenarios){
      const r=s.rows.find(r=>r.id==='US_FUEL')!
      expect(r.nativePerKm).toBeCloseTo(5.955/7.9/1.609344,12)
      expect(r.amountUsd).toBeCloseTo(s.conditionalRoadFuelQuantity.usGallons*5.955,9)
      expect(s.conditionalRoadFuelQuantity.idleFuelQuantity).toBeNull()
    }
  })
  it('networkMXcomposite excludesbobtail but fuelanddriver coveritsphysicalkm',()=>{
    const s=result().scenarios[0],mx=cycles.scenarios[0].allocationResources[0]
    expect(s.mxAttachedKm).toBe(mx.loadedKm)
    expect(s.mxBobtailKm).toBe(mx.emptyKm)
    expect(s.unresolvedMxBobtailMaintenanceUsd).toEqual({status:'UNPRICED_TRACTOR_ONLY_COMPONENT',amountUsd:null})
    for(const r of s.rows.filter(r=>['MX_MAINT','MX_LUBE','MX_TIRES'].includes(r.id)))expect(r.km).toBe(mx.loadedKm)
    for(const r of s.rows.filter(r=>['MX_FUEL','MX_DRIVER_PAY'].includes(r.id)))expect(r.km).toBe(mx.totalCycleKm)
  })
  it('dedicated return assignscompositesoverbothattachedlegsbutnosharedboxchargeagain',()=>{
    const s=result().scenarios[1],c=cycles.scenarios[1],mx=c.allocationResources[0],us=c.allocationResources[1]
    expect(s.mxAttachedKm).toBe(mx.totalCycleKm);expect(s.usAttachedKm).toBe(us.totalCycleKm)
    expect(s.mxAttachedKm+s.usAttachedKm).toBeCloseTo(c.allocationResources[2].totalCycleKm,8)
    expect(s.sharedTrailerSeparateVariableCostUsd).toBeNull()
    expect(s.rows).toHaveLength(9)
    expect(s.rows.every(r=>!r.id.startsWith('SHARED_TRAILER'))).toBe(true)
  })
  it('paysmovementkm oncewithout weeklysalaryandselectsoneUSbenchmarknotfiveadded',()=>{
    for(const s of result().scenarios){
      const mx=s.rows.find(r=>r.id==='MX_DRIVER_PAY')!,us=s.rows.find(r=>r.id==='US_DRIVER_PAY')!
      expect(mx.nativePerKm).toBe(2.1)
      expect(us.nativePerKm).toBe(.817/1.609344)
      expect(s.rows.filter(r=>r.id.includes('DRIVER'))).toHaveLength(2)
    }
  })
  it('preservespartialfixedMAXsumsandoneadminpoolwithoutcompleteCVUorlowerboundclaim',()=>{
    for(const s of result().scenarios){
      expect(s.knownVariableComponentSubtotalUsd).toBeCloseTo(s.rows.reduce((n,r)=>n+r.amountUsd,0),9)
      for(const a of s.partialOperatingAlternatives){
        expect(a.knownOperatingComponentsUsd).toBe(a.knownFixedComponentAllocationUsd+s.knownVariableComponentSubtotalUsd)
        expect(a).toMatchObject({completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,isLowerBound:false})
      }
      expect(s.missingAmountsDefaultedToZero).toBe(false)
    }
  })
  it('retains US reported travel benefits once and never equates unresolved MX expenses to zero',()=>{
    const r=result()
    expect(r.sourceLedger.travelExpenseCoverage).toEqual(driver.travelExpenseCoverage)
    for(const s of r.scenarios){
      expect(s.travelExpenseCoverage).toEqual(driver.travelExpenseCoverage)
      expect(s.rows).toHaveLength(9)
      expect(s.rows.find(r=>r.id==='US_DRIVER_PAY')!.amountUsd).toBeCloseTo(s.usAttachedKm/1.609344*.817,10)
      expect(s.rows.filter(r=>/PER_DIEM|WAIT_PAY|MEAL/.test(r.id))).toHaveLength(0)
      expect(s.travelExpenseCoverage.mx.separateTravelExpenseAmountMxn).toBeNull()
      expect(s.travelExpenseCoverage.waiting.usAdditionalPayUsd).toBeNull()
    }
    expect(Object.values(root.outputs).every(v=>v===null)).toBe(true)
  })
  it.each(['additionalDailyAllowanceAdded','fullTripTravelExpenseCoverageConfirmed','everyCarrierProvidesPerDiemConfirmed'])('rejects an unsupported US travel coverage upgrade %s',field=>{
    const d=structuredClone(driver);Object.assign(d.travelExpenseCoverage.us,{[field]:true})
    expect(()=>calculate(p,cycles,model,fuel,maint,d,fx)).toThrow()
  })
  it('rejects unknown expense as zero, fiscal daily allowance and asset-wait-as-wage claims',()=>{
    const mx=structuredClone(driver);Object.assign(mx.travelExpenseCoverage.mx,{separateTravelExpenseAmountMxn:0})
    expect(()=>calculate(p,cycles,model,fuel,maint,mx,fx)).toThrow()
    const wait=structuredClone(driver);Object.assign(wait.travelExpenseCoverage.waiting,{assetWaitingCostProvesDriverPay:true})
    expect(()=>calculate(p,cycles,model,fuel,maint,wait,fx)).toThrow()
    expect(()=>calculate({...p,usAdditionalPerDiemUsdPerDay:80},cycles,model,fuel,maint,driver,fx)).toThrow()
    const source=structuredClone(driver);Object.assign(source.travelExpenseCoverage,{fiscalAllowanceUsedAsExpenseBenchmark:true})
    expect(()=>calculate(p,cycles,model,fuel,maint,source,fx)).toThrow()
  })
  it('rejects duplicatecyclesorresourcesandtwofixedalternativeswithsameidentity',()=>{
    const a=structuredClone(cycles);a.scenarios[1]=a.scenarios[0]
    expect(()=>calculate(p,a,model,fuel,maint,driver,fx)).toThrow('PILOT_VARIABLE_CYCLE_DUPLICATE')
    const b=structuredClone(cycles);b.scenarios[0].allocationResources[1]=b.scenarios[0].allocationResources[0]
    expect(()=>calculate(p,b,model,fuel,maint,driver,fx)).toThrow('PILOT_VARIABLE_RESOURCE_OR_FIXED_DUPLICATE')
    const c=structuredClone(cycles);c.scenarios[0].fixedComponentAllocations[1]=c.scenarios[0].fixedComponentAllocations[0]
    expect(()=>calculate(p,c,model,fuel,maint,driver,fx)).toThrow('PILOT_VARIABLE_RESOURCE_OR_FIXED_DUPLICATE')
  })
  it('rejectswrongmileunit,currency,periodorfuelbinandunchosenperformancepolicy',()=>{
    const f=structuredClone(fuel);f.prices.find((r:{id:string})=>r.id==='US_PADD3_RETAIL').unit='MXN/liter'
    expect(()=>calculate(p,cycles,model,f,maint,driver,fx)).toThrow()
    expect(()=>calculate({...p,usPerformanceId:'US_ORNL_LIGHT_BIN'},cycles,model,fuel,maint,driver,fx)).toThrow()
    expect(()=>calculate(p,cycles,model,fuel,maint,driver,{...fx,column:'DOF'})).toThrow()
  })
  it('rejectsnegativeorNaNdistanceandphantomboxtravel',()=>{
    for(const km of [-1,NaN,Infinity]){const c=structuredClone(cycles);c.scenarios[0].allocationResources[0].totalCycleKm=km;expect(()=>calculate(p,c,model,fuel,maint,driver,fx)).toThrow()}
    const c=structuredClone(cycles);const box=c.scenarios[0].allocationResources[2];box.emptyKm+=100;box.totalCycleKm+=100
    expect(()=>calculate(p,c,model,fuel,maint,driver,fx)).toThrow('PILOT_VARIABLE_BOX_SCOPE_MISMATCH')
  })
  it('rejectsmaintenanceperiodsubstitutionortractoronlylabelwithoutsourcebackedsplit',()=>{
    const a=structuredClone(maint);a.records.find((r:{id:string})=>r.id==='US_MAINT').referencePeriod='2025'
    expect(()=>calculate(p,cycles,model,fuel,a,driver,fx)).toThrow('PILOT_VARIABLE_MAINTENANCE_SCOPE_MISMATCH')
    const b=structuredClone(maint);b.records.find((r:{id:string})=>r.id==='MX_TIRES').assetScope='TRACTOR_ONLY'
    expect(()=>calculate(p,cycles,model,fuel,b,driver,fx)).toThrow()
  })
  it('does not acceptfullfixedamountsornegativecomponentsaspartial',()=>{
    const a=structuredClone(cycles);Object.assign(a.scenarios[0].fixedComponentAllocations[0],{completeCfuUsd:100})
    expect(()=>calculate(p,a,model,fuel,maint,driver,fx)).toThrow()
    const b=structuredClone(maint);b.records.find((r:{id:string})=>r.id==='US_TIRES').value=-1
    expect(()=>calculate(p,cycles,model,fuel,b,driver,fx)).toThrow()
  })
  it('detects policytampering before anyoutput',()=>expect(()=>consolidate(path=>path.endsWith(file)?readLocalDocument(path)+' ':readLocalDocument(path))).toThrow())
})
