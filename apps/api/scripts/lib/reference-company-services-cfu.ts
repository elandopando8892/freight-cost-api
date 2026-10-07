import {z} from 'zod'
import {allocateFixedCost} from '../../src/modules/engine/fixed-cost-allocation.js'
import {splitEqualCents} from './reference-central-admin-pool.js'

const text=z.string().min(1),n=z.number().finite().nonnegative().max(1e12),p=n.positive()
const resource=z.enum(['MX_TRACTOR','US_TRACTOR','SHARED_TRAILER']),cycle=z.enum(['NETWORK_EXPECTED_EMPTY_PROXY','DEDICATED_EMPTY_SAME_BOX_RETURN'])
const policySchema=z.object({model:z.literal('FCM_COMPANY_SERVICES_CFU_V1'),reviewedAt:z.string().datetime(),referencePeriod:z.literal('2026-10'),
  quantityBasis:z.literal('TWO_NAMED_CONTROL_RESERVATIONS_NOT_SEVEN_ROLES_OR_FRACTIONAL_INVOICES'),namedControls:z.literal(2),modeledFleetPairs:z.literal(1),monthlyAvailableDays:z.literal(24),
  office:z.object({memberships:z.literal(2),publishedMonthlyUsdPerMembership:z.literal(100),businessAddressIncluded:z.literal(false),continuousAccessIncluded:z.literal(false),phoneIncluded:z.literal(false)}).strict(),
  mobile:z.object({adminLines:z.literal(2),publishedMonthlyBlockUsd:z.literal(100),providerFeeMonthlyUsdPerLine:z.literal(4.49),autopayOrPromoApplied:z.literal(false),actualOtherSurchargesAndTaxUsd:z.null()}).strict(),
  yard:z.object({mode:z.literal('SEPARATE_RESERVED_TRACTOR_AND_TRAILER_SPACES'),tractorSpaces:z.literal(1),trailerSpaces:z.literal(1),publishedMonthlyTractorUsd:z.literal(150),publishedMonthlyTrailerUsd:z.literal(175),comboAdded:z.literal(false),introductoryDurationMonths:z.null(),mxYardMonthlyUsd:z.null(),taxAndPaymentFeesUsd:z.null()}).strict(),
  allocation:z.literal('SHARED_OFFICE_MOBILE_EQUAL_TRACTORS_DIRECT_US_TRACTOR_AND_ONE_SHARED_BOX_BAYS'),
  sources:z.array(z.object({id:text,url:z.string().url(),locator:text,capture:text,directDownloadStatus:text,
    archive:z.object({file:z.string().startsWith('docs/research/sources/'),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict().nullable()}).strict()).length(4),
  assumptions:z.array(text).min(9),completeCompanyMonthlyUsd:z.null(),completeD2DCostUsd:z.null(),quoteReady:z.literal(false),adoptedValues:z.literal(0)}).strict()
const adminSchema=z.object({model:z.literal('FCM_ADMIN_ALLOCATED_STOCK_REFERENCE_V1'),projection:z.object({namedTmsAccounts:z.literal(2),modeledPowerUnits:z.literal(2)}).passthrough(),
  scenarios:z.array(z.object({id:text,modeledFleetPairs:z.literal(1),oneSharedBox:z.literal(true),companyServicesJoined:z.literal(false),
    lines:z.array(z.object({id:text,resourceId:resource,monthlyUsd:n}).passthrough()),knownResourceMonthlyComponents:z.object({MX_TRACTOR:p,US_TRACTOR:p,SHARED_TRAILER:p}).strict()}).passthrough()).length(2)}).passthrough()
const dutySchema=z.object({model:z.literal('FCM_MX_ORDINARY_DUTY_PILOT_CONTRAST_V1'),scenarios:z.array(z.object({id:cycle,
  knownMxElapsedClockDays:p,knownUsElapsedClockDays:p,knownBoxClockDays:p,
  conditionalFixedAllocations:z.array(z.object({monthlyComponentScenarioId:text,resources:z.array(z.object({resourceId:resource,
    knownMonthlyComponentUsd:p,knownClockByTimeUsd:p,oldDistanceProxyByKmUsd:p,conditionalOldDistanceKnownClockMaxUsd:p}).passthrough()).length(3)}).passthrough()).length(2)}).passthrough()).length(2)}).passthrough()
const boxedCost=z.object({baseCostId:text,cashComparisonId:text,cycleScenarioId:cycle,paymentMode:z.enum(['CASH','FINANCED']),
  priorKnownCfuComponentUsd:p,knownCvuComponentUsd:p,alternatives:z.array(z.object({premiumAlternativeId:text,component:z.object({amountUsd:p}).passthrough(),
    knownCfuComponentUsd:p,totalKnownComponentsUsd:p,completeD2DCostUsd:z.null(),quoteReady:z.literal(false)}).passthrough()).length(2),
  boxInsuranceAddedOnce:z.literal(true),adminOrVariableCostAddedAgain:z.literal(false)}).passthrough()
const boxSchema=z.object({model:z.literal('FCM_ONE_BOX_INSURANCE_CFU_COMPONENT_V1'),cash:z.array(boxedCost).length(8),financed:z.array(boxedCost).length(128)}).passthrough()
const close=(a:number,b:number)=>Math.abs(a-b)<1e-7
const unique=(ids:string[],error:string)=>{if(new Set(ids).size!==ids.length)throw new Error(error)}
const companyId=/OFFICE_WORKSPACE|ADMIN_MOBILE|YARD|COMPANY_SERVICES/

/** Conserved reservations, not observed staffing. Fixed services follow resource
 * capacity; the same box's reserved bay is not another physical asset. */
export function calculateCompanyServicesCfu(rawPolicy:unknown,rawAdmin:unknown,rawDuty:unknown,rawBox:unknown){
  const policy=policySchema.parse(rawPolicy),admin=adminSchema.parse(rawAdmin),duty=dutySchema.parse(rawDuty),boxed=boxSchema.parse(rawBox)
  if(boxed.companyServicesAddedOnce===true)throw new Error('COMPANY_SERVICES_ALREADY_APPLIED')
  const expected=['MILEONE_SERVICES_TWO_MEMBERS','MILEONE_MEMBERSHIP_FAQ','TMOBILE_CORE_TWO_LINES','OUTPOST_SEPARATE_US_BAYS']
  if(expected.some(id=>policy.sources.filter(s=>s.id===id).length!==1))throw new Error('COMPANY_SERVICES_SOURCE_SET_MISMATCH')
  unique(admin.scenarios.map(s=>s.id),'COMPANY_SERVICES_BASE_DUPLICATE');unique(duty.scenarios.map(s=>s.id),'COMPANY_SERVICES_CYCLE_DUPLICATE')
  for(const b of admin.scenarios){
    unique(b.lines.map(l=>l.id),'COMPANY_SERVICES_BASE_LINE_DUPLICATE')
    if(b.lines.some(l=>companyId.test(l.id)))throw new Error('COMPANY_SERVICES_ALREADY_IN_BASE')
    for(const id of resource.options)if(!close(b.lines.filter(l=>l.resourceId===id).reduce((s,l)=>s+l.monthlyUsd,0),b.knownResourceMonthlyComponents[id]))throw new Error('COMPANY_SERVICES_BASE_SUM_MISMATCH')
  }
  const officeCents=Math.round(policy.office.memberships*policy.office.publishedMonthlyUsdPerMembership*100)
  const mobileCents=Math.round((policy.mobile.publishedMonthlyBlockUsd+policy.mobile.adminLines*policy.mobile.providerFeeMonthlyUsdPerLine)*100)
  const shared=[{id:'COMPANY_SERVICES_OFFICE_WORKSPACE',cents:officeCents},{id:'COMPANY_SERVICES_ADMIN_MOBILE',cents:mobileCents}]
  const monthlyLines=shared.flatMap(l=>splitEqualCents(l.cents,2).map((c,i)=>({id:`${l.id}:${i}`,resourceId:resource.options[i],monthlyUsd:c/100})))
  monthlyLines.push({id:'COMPANY_SERVICES_US_TRACTOR_YARD',resourceId:'US_TRACTOR',monthlyUsd:policy.yard.publishedMonthlyTractorUsd},
    {id:'COMPANY_SERVICES_SAME_BOX_US_YARD',resourceId:'SHARED_TRAILER',monthlyUsd:policy.yard.publishedMonthlyTrailerUsd})
  const monthlyByResource=Object.fromEntries(resource.options.map(id=>[id,monthlyLines.filter(l=>l.resourceId===id).reduce((s,l)=>s+Math.round(l.monthlyUsd*100),0)/100])) as Record<z.infer<typeof resource>,number>
  const knownMonthlyComponentUsd=monthlyLines.reduce((s,l)=>s+Math.round(l.monthlyUsd*100),0)/100
  const cycleAllocations=duty.scenarios.map(c=>{
    unique(c.conditionalFixedAllocations.map(a=>a.monthlyComponentScenarioId),'COMPANY_SERVICES_EXPOSURE_DUPLICATE')
    const projections=c.conditionalFixedAllocations.map(a=>{
      const b=admin.scenarios.find(b=>b.id===a.monthlyComponentScenarioId)
      if(!b)throw new Error('COMPANY_SERVICES_BASE_JOIN_MISMATCH')
      unique(a.resources.map(r=>r.resourceId),'COMPANY_SERVICES_RESOURCE_DUPLICATE')
      return a.resources.map(r=>{
        const days=r.resourceId==='MX_TRACTOR'?c.knownMxElapsedClockDays:r.resourceId==='US_TRACTOR'?c.knownUsElapsedClockDays:c.knownBoxClockDays
        const timeExposure=r.knownClockByTimeUsd/r.knownMonthlyComponentUsd,distanceExposure=r.oldDistanceProxyByKmUsd/r.knownMonthlyComponentUsd
        if(!close(r.knownMonthlyComponentUsd,b.knownResourceMonthlyComponents[r.resourceId])||!close(timeExposure,days/policy.monthlyAvailableDays)||
          !close(r.conditionalOldDistanceKnownClockMaxUsd,allocateFixedCost(r.oldDistanceProxyByKmUsd,r.knownClockByTimeUsd)))throw new Error('COMPANY_SERVICES_EXPOSURE_MISMATCH')
        const monthlyUsd=monthlyByResource[r.resourceId]
        return {resourceId:r.resourceId,monthlyUsd,timeExposure,distanceExposure,
          amountUsd:allocateFixedCost(monthlyUsd*distanceExposure,monthlyUsd*timeExposure)}
      })
    })
    for(const a of projections[0]){const b=projections[1].find(r=>r.resourceId===a.resourceId)!
      if(!close(a.timeExposure,b.timeExposure)||!close(a.distanceExposure,b.distanceExposure))throw new Error('COMPANY_SERVICES_TAX_BASE_CHANGED_EXPOSURE')}
    return {cycleScenarioId:c.id,resources:projections[0],fixedTripComponentUsd:projections[0].reduce((s,r)=>s+r.amountUsd,0)}
  })
  unique([...boxed.cash,...boxed.financed].map(c=>c.baseCostId),'COMPANY_SERVICES_COST_DUPLICATE')
  const join=(c:z.infer<typeof boxedCost>)=>{
    if(c.companyServicesAddedOnce===true)throw new Error('COMPANY_SERVICES_ALREADY_APPLIED')
    const allocation=cycleAllocations.find(a=>a.cycleScenarioId===c.cycleScenarioId)!
    const cash=boxed.cash.find(p=>p.baseCostId===c.cashComparisonId)
    if(!cash||cash.cycleScenarioId!==c.cycleScenarioId||!close(cash.knownCvuComponentUsd,c.knownCvuComponentUsd)||
      (boxed.cash.includes(c)?c.paymentMode!=='CASH':c.paymentMode!=='FINANCED'))throw new Error('COMPANY_SERVICES_CASH_FINANCE_JOIN_MISMATCH')
    unique(c.alternatives.map(a=>a.premiumAlternativeId),'COMPANY_SERVICES_ALTERNATIVE_DUPLICATE')
    return {...c,priorAlternatives:c.alternatives,companyFixedComponents:allocation.resources,companyFixedTripComponentUsd:allocation.fixedTripComponentUsd,
      alternatives:c.alternatives.map(a=>{
        if(!close(a.knownCfuComponentUsd,c.priorKnownCfuComponentUsd+a.component.amountUsd)||!close(a.totalKnownComponentsUsd,a.knownCfuComponentUsd+c.knownCvuComponentUsd))throw new Error('COMPANY_SERVICES_COST_SUM_MISMATCH')
        return {...a,priorKnownCfuComponentUsd:a.knownCfuComponentUsd,priorTotalKnownComponentsUsd:a.totalKnownComponentsUsd,
          knownCfuComponentUsd:a.knownCfuComponentUsd+allocation.fixedTripComponentUsd,
          totalKnownComponentsUsd:a.totalKnownComponentsUsd+allocation.fixedTripComponentUsd}
      }),companyServicesAddedOnce:true,originalInputsChanged:false,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null}
  }
  return {...policy,sourceRef:'companyServicesCfu',monthlyLines,monthlyByResource,knownMonthlyComponentUsd,cycleAllocations,
    cash:boxed.cash.map(join),financed:boxed.financed.map(join),companyServicesAddedOnce:true,
    namedReservationsAreNotObservedFte:true,oldSevenSeatPoolJoined:false,comboAndSeparateSpacesAddedTogether:false,
    standaloneBundledInternetPrintingAdded:false,payrollOrTmsAddedAgain:false,cargoOrBoxInsuranceAddedAgain:false,cvusChanged:false,
    fullInvoiceOrLongTermTariffProven:false,actualSiteOrProviderSelected:false,mxYardMonthlyUsd:null,
    completeCompanyMonthlyUsd:null,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,externalWrites:false,
    remaining:['MX_YARD_AND_BORDER_ACCESS_HANDLING','ACTUAL_TAX_SURCHARGES_DEVICES_AND_PAYMENT_COSTS','INTRODUCTORY_RATE_DURATION_NONPROMO_RENEWAL',
      'CONTINUOUS_MONITORING_AND_WORKLOAD','OTHER_COMPANY_AND_PILOT_COMPONENTS']}
}
