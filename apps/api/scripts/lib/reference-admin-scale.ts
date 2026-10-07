import {z} from 'zod'
import {splitEqualCents} from './reference-central-admin-pool.js'

const positive=z.number().finite().positive()
const schema=z.object({model:z.literal('FCM_ADMIN_ALLOCATED_STOCK_REFERENCE_V1'),reviewedAt:z.string().datetime(),
  source:z.object({id:z.literal('WERNER_2025_TRUCKING_OFFICE_STOCK'),url:z.literal('https://www.sec.gov/Archives/edgar/data/793074/000079307426000071/wern-20251231.htm'),locator:z.string().min(1),capture:z.literal('PRIMARY_WEB_READER_NOT_ORIGINAL_HTTP')}).strict(),
  observation:z.object({date:z.literal('2025-12-31'),officePersons:z.literal(1465),companyTractors:z.literal(6785),contractorTractors:z.literal(315),totalTractors:z.literal(7100)}).strict(),
  projection:z.object({referencePeriod:z.literal('2026-10'),modeledPowerUnits:z.literal(2),workedHoursPerAllocatedPersonMonth:z.literal(160),hoursAreDeclaredNotObserved:z.literal(true),
    functionalWeightBasis:z.literal('EXISTING_ROLE_FTE_WEIGHTS_NORMALIZED_TO_ONE_NOT_OBSERVED_WERNER_ROLES'),payrollGeography:z.literal('US_CENTRAL_ADMIN_PROXY_NOT_MX_EMPLOYER_COST'),
    namedTmsAccounts:z.literal(2),accountQuantityBasis:z.literal('ONE_NAMED_CONTROL_OWNER_PER_NATIONAL_LEG_NOT_ONE_PER_FUNCTION_OR_FRACTIONAL_PERSON')}).strict(),
  assumptions:z.array(z.string().min(1)).min(8),decision:z.literal('PUBLIC_STOCK_SCALE_TRANSFER_AS_EXPLICIT_PROSPECTIVE_ADMIN_COMPONENT_NOT_COMPLETE_COST')}).strict()
const adminSchema=z.object({model:z.literal('FCM_CENTRAL_ADMIN_PUBLIC_POOL_V1'),payrollModelMonthlyUsd:positive,tmsPublishedMonthlyComponentUsd:positive,
  modeledFunctionalFullEquivalents:positive,roleLines:z.array(z.object({role:z.string(),fte:positive,hourlyEmployerTotalUsd:positive,benefitsAlreadyIncluded:z.literal(true),additionalFicaAdded:z.literal(false),sourceId:z.literal('BLS_ECEC_ADMIN_READOUT')}).passthrough()).length(7),
  tms:z.object({publishedMonthlyUsdPerUser:z.literal(69)}).passthrough()}).passthrough()
const fixedSchema=z.array(z.object({id:z.string(),lines:z.array(z.object({id:z.string(),resourceId:z.enum(['MX_TRACTOR','US_TRACTOR','SHARED_TRAILER']),monthlyUsd:z.number().finite().nonnegative()}).passthrough()),
  adminPoolAdded:z.literal(false),oneSharedBox:z.literal(true)}).passthrough()).length(2)

/** Scale a public-stock allocation, never relabel headcount as observed FTE.
 * Keep national legal/asset populations unchanged; no hidden fleet divisor. */
export function calculateAdminScaleReference(raw:unknown,rawAdmin:unknown,rawFixed:unknown){
  const p=schema.parse(raw),old=adminSchema.parse(rawAdmin),fixed=fixedSchema.parse(rawFixed)
  if(new Set(old.roleLines.map(r=>r.role)).size!==7||new Set(fixed.map(r=>r.id)).size!==2)throw new Error('ADMIN_SCALE_DUPLICATE_IDENTITY')
  const weight=old.roleLines.reduce((s,r)=>s+r.fte,0)
  if(Math.abs(weight-old.modeledFunctionalFullEquivalents)>1e-10||Math.abs(weight-3.7)>1e-10)throw new Error('ADMIN_SCALE_FUNCTIONAL_WEIGHT_MISMATCH')
  const stock=p.observation
  if(stock.companyTractors+stock.contractorTractors!==stock.totalTractors)throw new Error('ADMIN_SCALE_COHORT_MISMATCH')
  const officePersonsPerPowerUnit=stock.officePersons/stock.totalTractors
  const allocatedOfficePersonEquivalent=officePersonsPerPowerUnit*p.projection.modeledPowerUnits
  const modeledWorkedHours=allocatedOfficePersonEquivalent*p.projection.workedHoursPerAllocatedPersonMonth
  const roleLines=old.roleLines.map(r=>({role:r.role,weight:r.fte/weight,modeledWorkedHours:modeledWorkedHours*r.fte/weight,
    hourlyEmployerTotalUsd:r.hourlyEmployerTotalUsd,monthlyEmployerComponentUsd:modeledWorkedHours*r.fte/weight*r.hourlyEmployerTotalUsd,
    benefitsAlreadyIncluded:true,additionalFicaAdded:false,sourceIds:[p.source.id,r.sourceId],observedRoleHeadcount:false}))
  // Round one pool once, not every fractional role, before conserving integer cents.
  const payrollCents=Math.round(roleLines.reduce((s,r)=>s+r.monthlyEmployerComponentUsd,0)*100)
  const tmsCents=Math.round(p.projection.namedTmsAccounts*old.tms.publishedMonthlyUsdPerUser*100)
  const poolLines=[{id:'PUBLIC_SCALE_ADMIN_PAYROLL',cents:payrollCents},{id:'PUBLIC_SCALE_TMS_ACCOUNTS',cents:tmsCents}]
  const allocatedLines=poolLines.flatMap(l=>splitEqualCents(l.cents,2).map((c,i)=>({id:`${l.id}:${i===0?'MX_TRACTOR':'US_TRACTOR'}`,
    resourceId:i===0?'MX_TRACTOR' as const:'US_TRACTOR' as const,monthlyUsd:c/100,kind:'PUBLIC_SCALE_ALLOCATED_COMPONENT' as const})))
  const scenarios=fixed.map(f=>{
    if(new Set(f.lines.map(l=>l.id)).size!==f.lines.length||f.lines.some(l=>/ADMIN|TMS/.test(l.id)))throw new Error('ADMIN_SCALE_DOUBLE_COUNT')
    const lines=[...f.lines,...allocatedLines]
    return {id:`${f.id}_PUBLIC_ADMIN_SCALE`,baseScenarioId:f.id,modeledFleetPairs:1 as const,oneSharedBox:true as const,lines,
      knownResourceMonthlyComponents:{MX_TRACTOR:lines.filter(l=>l.resourceId==='MX_TRACTOR').reduce((s,l)=>s+l.monthlyUsd,0),
        US_TRACTOR:lines.filter(l=>l.resourceId==='US_TRACTOR').reduce((s,l)=>s+l.monthlyUsd,0),SHARED_TRAILER:lines.filter(l=>l.resourceId==='SHARED_TRAILER').reduce((s,l)=>s+l.monthlyUsd,0)},
      knownMonthlyComponentUsd:lines.reduce((s,l)=>s+l.monthlyUsd,0),completeFixedBudgetUsd:null,completeD2DCostUsd:null,
      companyServicesJoined:false,selected:false,quoteReady:false}
  })
  return {...p,officePersonsPerPowerUnit,allocatedOfficePersonEquivalent,modeledWorkedHours,roleLines,
    payrollComponentMonthlyUsd:payrollCents/100,tmsComponentMonthlyUsd:tmsCents/100,poolComponentMonthlyUsd:(payrollCents+tmsCents)/100,
    allocatedLines,scenarios,comparison:{oldFunctionalFullEquivalents:old.modeledFunctionalFullEquivalents,oldPayrollMonthlyUsd:old.payrollModelMonthlyUsd,
      oldTmsMonthlyUsd:old.tmsPublishedMonthlyComponentUsd,claimedMeasuredSavingsUsd:null},
    observedFte:false,mxEmployerBenefitsImported:false,pilotFleetCountsChanged:false,companySeatQuantitiesAutomaticallyInherited:false,
    continuousCoverageProven:false,completeAdminCompanyBudgetUsd:null,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,
    remaining:['COMPANY_PERSON_ACCOUNT_AND_SERVICE_QUANTITIES','CONTINUOUS_HUMAN_COVERAGE','COMPLETE_PHYSICAL_CYCLE','OTHER_FIXED_AND_VARIABLE_MONETARY_COMPONENTS'],
    calibrated:false,selected:false,quoteReady:false,externalWrites:false}
}
