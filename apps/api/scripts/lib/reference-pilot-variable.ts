import {z} from 'zod'
import {FuelResearchSchema,KM_PER_INTERNATIONAL_MILE} from '../review-fuel-reference.js'
import {MaintenanceResearchSchema} from '../review-maintenance-tires-reference.js'
import {DriverTravelExpenseCoverageSchema} from './reference-variable-components.js'

const n=z.number().finite().nonnegative().max(1e9),positive=n.positive()
const policySchema=z.object({model:z.literal('FCM_PILOT_VARIABLE_PUBLIC_SCENARIOS_V1'),reviewedAt:z.string().datetime(),scope:z.literal('OWN_MX_US_RELAY_SAME_TRAILER'),
  mxFuelPriceId:z.literal('MX_NATIONAL_REPORTED'),mxLitersPer1000Km:z.literal(483.92),usFuelPriceId:z.literal('US_PADD3_RETAIL'),usPerformanceId:z.literal('US_ORNL_HEAVY_BIN'),usDriverFleetGroup:z.literal('LT_26'),
  performancePolicy:z.literal('SAME_RATE_LOADED_EMPTY_DECLARED_TRANSFER_NOT_MEASURED'),compositePolicy:z.literal('ATTACHED_KM_ONLY_NO_SEPARATE_TRAILER_VARIABLE_CHARGE'),paidToPhysicalKmRatio:z.literal(1),
  assumptions:z.array(z.string()).min(10),adoptedValues:z.literal(0),quoteReady:z.literal(false)}).strict()
const resourceSchema=z.object({resourceId:z.enum(['MX_TRACTOR','US_TRACTOR','SHARED_TRAILER']),loadedKm:positive,emptyKm:positive,totalCycleKm:positive,
  attachedKm:n.optional(),bobtailKm:n.optional()}).passthrough()
const cycleSchema=z.object({scenarios:z.array(z.object({id:z.enum(['NETWORK_EXPECTED_EMPTY_PROXY','DEDICATED_EMPTY_SAME_BOX_RETURN']),selected:z.literal(false),quoteReady:z.literal(false),
  allocationResources:z.array(resourceSchema).length(3),fixedComponentAllocations:z.array(z.object({monthlyComponentScenarioId:z.string(),knownFixedComponentAllocationUsd:positive,
    completeCfuUsd:z.null(),completeCvuUsd:z.null(),completeD2DCostUsd:z.null(),missingAmountsDefaultedToZero:z.literal(false)}).passthrough()).length(2)}).passthrough()).length(2)}).passthrough()
const driverSchema=z.object({mxSource:z.object({rateMxnPerPaidLoadedKm:z.literal(2.1),rateMxnPerPaidEmptyKm:z.literal(2.1),completeEmployerCost:z.literal(false)}).passthrough(),
  travelExpenseCoverage:DriverTravelExpenseCoverageSchema,
  usReportedCompensationAlternatives:z.array(z.object({fleetSize:z.string(),usdPerMile:positive,operationsYear:z.literal(2024),selected:z.literal(false),extraEcecOrFederalTaxesAdded:z.literal(false)}).passthrough()).length(5)}).passthrough()
const fxSchema=z.object({model:z.literal('FCM_DATED_FIX_VALUATION_REFERENCE_V1'),observationDate:z.literal('2026-10-01'),column:z.literal('FIX_DETERMINATION'),mxnPerUsd:z.literal(18.3688)}).passthrough()

/** Additive prospective projection, not adoption or complete CFU/CVU.
 * Composite variable rates cover attached mileage once, never a second box row.
 * Forecast transfer and mixed historic periods remain visible on every result. */
export function calculatePilotVariableScenarios(rawPolicy:unknown,rawCycles:unknown,rawModel:unknown,rawFuel:unknown,rawMaintenance:unknown,rawDriver:unknown,rawFx:unknown){
  const p=policySchema.parse(rawPolicy),cycles=cycleSchema.parse(rawCycles),fuel=FuelResearchSchema.parse(rawFuel),maintenance=MaintenanceResearchSchema.parse(rawMaintenance),driver=driverSchema.parse(rawDriver),fx=fxSchema.parse(rawFx)
  const model=z.object({fuel:z.object({litersPer1000VehicleKm:z.literal(483.92)}).passthrough()}).passthrough().parse(rawModel)
  if(p.mxLitersPer1000Km!==model.fuel.litersPer1000VehicleKm)throw new Error('PILOT_VARIABLE_CONSUMPTION_MISMATCH')
  const mxPrice=fuel.prices.find(r=>r.id===p.mxFuelPriceId),usPrice=fuel.prices.find(r=>r.id===p.usFuelPriceId),mpg=fuel.performance.find(r=>r.id===p.usPerformanceId)
  if(!mxPrice||mxPrice.country!=='MX'||mxPrice.unit!=='MXN/liter'||mxPrice.value!==27||mxPrice.observationDate!=='2026-09-25'||!usPrice||usPrice.country!=='US'||usPrice.unit!=='USD/US-gallon'||usPrice.value!==5.955||usPrice.observationDate!=='2026-09-28'||!mpg||mpg.unit!=='mile/US-gallon'||mpg.value!==7.9||mpg.emptyConfirmed!==false)throw new Error('PILOT_VARIABLE_FUEL_SOURCE_MISMATCH')
  const selectedDriver=driver.usReportedCompensationAlternatives.filter(r=>r.fleetSize===p.usDriverFleetGroup)
  if(selectedDriver.length!==1||selectedDriver[0].usdPerMile!==.817||new Set(driver.usReportedCompensationAlternatives.map(r=>r.fleetSize)).size!==5)throw new Error('PILOT_VARIABLE_DRIVER_COHORT_MISMATCH')
  if(new Set(cycles.scenarios.map(s=>s.id)).size!==2)throw new Error('PILOT_VARIABLE_CYCLE_DUPLICATE')
  const record=(id:string,country:'MX'|'US',unit:string)=>{
    const rows=maintenance.records.filter(r=>r.id===id)
    if(rows.length!==1||rows[0].country!==country||rows[0].unit!==unit||rows[0].assetScope!=='TRACTOR_AND_TRAILER_COMPOSITE_UNSPLIT'||
      rows[0].referencePeriod!==(country==='MX'?'2025':'2024')||rows[0].sourceId!==(country==='MX'?'IMT_PT881':'TTI_UMR2025_C'))throw new Error('PILOT_VARIABLE_MAINTENANCE_SCOPE_MISMATCH')
    return rows[0]
  }
  const mxMaint=(record('MX_LABOR','MX','MXN/1000vehicle-km').value+record('MX_PARTS','MX','MXN/1000vehicle-km').value)/1000
  const mxLube=record('MX_LUBRICANTS','MX','MXN/1000vehicle-km').value/1000,mxTires=record('MX_TIRES','MX','MXN/1000vehicle-km').value/1000
  const usMaint=record('US_MAINT','US','USD/vehicle-mile').value/KM_PER_INTERNATIONAL_MILE,usTires=record('US_TIRES','US','USD/vehicle-mile').value/KM_PER_INTERNATIONAL_MILE
  const scenarios=cycles.scenarios.map(c=>{
    if(new Set(c.allocationResources.map(r=>r.resourceId)).size!==3||new Set(c.fixedComponentAllocations.map(r=>r.monthlyComponentScenarioId)).size!==2)throw new Error('PILOT_VARIABLE_RESOURCE_OR_FIXED_DUPLICATE')
    const mx=c.allocationResources.find(r=>r.resourceId==='MX_TRACTOR')!,us=c.allocationResources.find(r=>r.resourceId==='US_TRACTOR')!,box=c.allocationResources.find(r=>r.resourceId==='SHARED_TRAILER')!
    for(const r of [mx,us,box])if(Math.abs(r.loadedKm+r.emptyKm-r.totalCycleKm)>1e-7)throw new Error('PILOT_VARIABLE_DISTANCE_NOT_CONSERVED')
    const dedicated=c.id==='DEDICATED_EMPTY_SAME_BOX_RETURN',mxAttachedKm=mx.attachedKm??mx.loadedKm+(dedicated?mx.emptyKm:0),usAttachedKm=us.totalCycleKm
    const mxBobtailKm=mx.bobtailKm??(dedicated?0:mx.emptyKm)
    if((mx.attachedKm===undefined)!==(mx.bobtailKm===undefined)||Math.abs(mxAttachedKm+mxBobtailKm-mx.totalCycleKm)>1e-7||mxAttachedKm<mx.loadedKm)throw new Error('PILOT_VARIABLE_ATTACHMENT_NOT_CONSERVED')
    if(Math.abs(box.loadedKm-mx.loadedKm-us.loadedKm)>1e-7||Math.abs(box.emptyKm-us.emptyKm-(mxAttachedKm-mx.loadedKm))>1e-7)throw new Error('PILOT_VARIABLE_BOX_SCOPE_MISMATCH')
    const rows:{id:string;country:'MX'|'US';covers:string;km:number;nativeCurrency:'MXN'|'USD';nativePerKm:number;amountNative:number;amountUsd:number;sourceIds:string[]}[]=[]
    const add=(id:string,country:'MX'|'US',covers:string,km:number,rate:number,sourceIds:string[])=>{
      const amountNative=km*rate;rows.push({id,country,covers,km,nativeCurrency:country==='MX'?'MXN':'USD',nativePerKm:rate,amountNative,amountUsd:country==='MX'?amountNative/fx.mxnPerUsd:amountNative,sourceIds})
    }
    add('MX_FUEL','MX','TRACTOR_ROAD_FUEL_CONSTANT_CONSUMPTION',mx.totalCycleKm,p.mxLitersPer1000Km/1000*mxPrice.value,['IMT_TABLE4_2_FUEL',mxPrice.id])
    add('MX_MAINT','MX','ATTACHED_TRACTOR_BOX_UNSPLIT',mxAttachedKm,mxMaint,['MX_LABOR','MX_PARTS'])
    add('MX_LUBE','MX','ATTACHED_TRACTOR_BOX_UNSPLIT',mxAttachedKm,mxLube,['MX_LUBRICANTS'])
    add('MX_TIRES','MX','ATTACHED_TRACTOR_BOX_UNSPLIT',mxAttachedKm,mxTires,['MX_TIRES'])
    add('MX_DRIVER_PAY','MX','ADVERTISED_PAY_NOT_EMPLOYER_TOTAL',mx.totalCycleKm,2.1,['TRAYECTO_QUERETARO_DIRECT_RECHECK'])
    add('US_FUEL','US','TRACTOR_ROAD_FUEL_CONSTANT_HEAVY_BIN_PROXY',us.totalCycleKm,usPrice.value/mpg.value/KM_PER_INTERNATIONAL_MILE,[usPrice.id,mpg.id])
    add('US_MAINT','US','ATTACHED_TRACTOR_BOX_UNSPLIT',usAttachedKm,usMaint,['US_MAINT'])
    add('US_TIRES','US','ATTACHED_TRACTOR_BOX_UNSPLIT',usAttachedKm,usTires,['US_TIRES'])
    add('US_DRIVER_PAY','US','REPORTED_WAGES_PLUS_BENEFITS_NOT_EMPLOYER_TOTAL',us.totalCycleKm,selectedDriver[0].usdPerMile/KM_PER_INTERNATIONAL_MILE,['ATRI2025_FIG7_LT26'])
    const knownVariableComponentSubtotalUsd=rows.reduce((sum,r)=>sum+r.amountUsd,0)
    return {cycleScenarioId:c.id,rows,mxAttachedKm,usAttachedKm,mxBobtailKm,
      unresolvedMxBobtailMaintenanceUsd:mxBobtailKm===0?{status:'NO_BOBTAIL_MOVEMENT',amountUsd:null}:{status:'UNPRICED_TRACTOR_ONLY_COMPONENT',amountUsd:null},
      conditionalRoadFuelQuantity:{mxLiters:mx.totalCycleKm*p.mxLitersPer1000Km/1000,usGallons:us.totalCycleKm/KM_PER_INTERNATIONAL_MILE/mpg.value,idleFuelQuantity:null},
      travelExpenseCoverage:driver.travelExpenseCoverage,
      knownVariableComponentSubtotalUsd,sharedTrailerSeparateVariableCostUsd:null,sharedTrailerVariableTreatment:'INCLUDED_UNSPLIT_ATTACHED_COMPOSITES_NOT_ZERO_COST',
      partialOperatingAlternatives:c.fixedComponentAllocations.map(f=>({monthlyComponentScenarioId:f.monthlyComponentScenarioId,knownFixedComponentAllocationUsd:f.knownFixedComponentAllocationUsd,
        knownVariableComponentSubtotalUsd,knownOperatingComponentsUsd:f.knownFixedComponentAllocationUsd+knownVariableComponentSubtotalUsd,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,isLowerBound:false})),
      completeCvuUsd:null,completeD2DCostUsd:null,selected:false,quoteReady:false,missingAmountsDefaultedToZero:false}
  })
  return {sourceRef:'pilotVariables',...p,fx,scenarios,sourcePeriods:{mxMaintenance:'2025_NET_MODEL',usMaintenance:'2024_TTI_ESTIMATE',usDriver:'2024_ATRI_TRUCKLOAD_LT26',mxFuel:mxPrice.observationDate,usFuel:usPrice.observationDate,usPerformance:'2006-2008'},
    sourceLedger:{mxFuelPrice:mxPrice,usFuelPrice:usPrice,usPerformance:mpg,mxConsumptionSource:'variableComponents#/fuel/litersPer1000VehicleKm',
      maintenanceRecords:maintenance.records,maintenanceSources:maintenance.sources,mxDriverSource:driver.mxSource,
      usDriverGroup:selectedDriver[0],usDriverBoundary:'REPORTED_WAGES_PLUS_BENEFITS_EXCLUDES_INCENTIVES_BONUSES_NO_COMPLETE_STATUTORY_SCOPE',
      travelExpenseCoverage:driver.travelExpenseCoverage},
    homogeneousTaxBasis:false,jointObservedCohort:false,target53FootCalibrated:false,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,
    remaining:['TOLLS_AND_CROSSING_SERVICES','IDLE_FUEL_DEF_AND_UNRESOLVED_LUBRICANTS','MX_DRIVER_EMPLOYER_BURDEN_AND_WAIT_PAY',
      'MX_TRAVEL_EXPENSES_NOT_PRICED_US_PER_DIEM_ALREADY_UNSPLIT','US_ADDITIONAL_WAIT_PAY_NOT_ESTABLISHED_BY_ASSET_EXPOSURE',
      'US_INCENTIVES_AND_STATUTORY_SCOPE','NETWORK_MX_BOBTAIL_MAINTENANCE','MISSING_FIXED_COVERAGES_AND_FINANCED_BOX','TRUCK_ROUTE_CAPACITY_AND_TAX_HYPOTHESES'],
    actualCarrierCostObserved:false,externalWrites:false}
}
