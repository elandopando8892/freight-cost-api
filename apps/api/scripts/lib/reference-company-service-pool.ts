import {z} from 'zod'
import {splitEqualCents} from './reference-central-admin-pool.js'

const policySchema=z.object({model:z.literal('FCM_COMPANY_PUBLIC_SERVICE_POOL_V1'),reviewedAt:z.string().datetime(),
  capture:z.literal('PRIMARY_WEB_READER_EXTRACTION_NOT_ORIGINAL_HTTP'),referencePeriod:z.literal('2026-10'),
  quantityBasis:z.literal('SEVEN_NAMED_ADMIN_FUNCTIONS_NOT_3_7_FTE_OR_DRIVER_LINES'),
  office:z.object({memberships:z.literal(7),monthlyUsdPerMembership:z.literal(100),
    includedServices:z.tuple([z.literal('WORKSPACE'),z.literal('INTERNET'),z.literal('PRINTING_SCANNING')]),
    businessAddressIncluded:z.literal(false),phoneIncluded:z.literal(false),continuousAccessIncluded:z.literal(false),taxUsd:z.null()}).strict(),
  mobile:z.object({adminLines:z.literal(7),baseMonthlyTotalUsd:z.literal(175),providerFeeMonthlyUsdPerLine:z.literal(4.49),
    actualSurchargeMonthlyUsd:z.null(),governmentTaxMonthlyUsd:z.null(),deviceCostUsd:z.null(),
    connectionChargeUsdPerLine:z.literal(35),connectionEventModeled:z.literal(false),autopayDiscountApplied:z.literal(false)}).strict(),
  yard:z.object({usComboSpacesPerPair:z.literal(1),publishedMonthlyUsdPerCombo:z.literal(200),
    allocationCostCentre:z.literal('US_TRACTOR'),sameSharedBoxIncluded:z.literal(true),mxYardMonthlyUsd:z.null(),
    taxAndPaymentFeesUsd:z.null(),introductoryDurationKnown:z.literal(false)}).strict(),
  fleetPairs:z.tuple([z.literal(1),z.literal(10)]),
  allocationDriver:z.literal('SHARED_OFFICE_MOBILE_EQUAL_PAIRS_THEN_TWO_TRACTORS_YARD_US_ONLY'),
  sources:z.array(z.object({id:z.string(),url:z.string().url(),locator:z.string(),archive:z.object({file:z.string(),sha256:z.string()}).strict().optional()}).strict()).length(4),
  modelAssumptions:z.array(z.string()).min(8),decision:z.literal('PARTIAL_PUBLIC_SERVICE_COMPONENTS_NOT_COMPLETE_COMPANY_BUDGET'),
}).strict()

/** Dated public-component projection, not a provider activation or a complete fleet budget. */
export function calculateCompanyServicePool(raw:unknown,inventory:readonly {fieldSuffix:string}[],adminFunctions:number) {
  const policy=policySchema.parse(raw)
  if(adminFunctions!==7||inventory.length!==23||new Set(inventory.map(r=>r.fieldSuffix)).size!==23) throw new Error('COMPANY_INVENTORY_OR_FUNCTION_SCOPE_MISMATCH')
  const expected=['MILEONE_SERVICES','MILEONE_FAQ','TMOBILE_CORE_BROADBAND_FACTS','OUTPOST_LAREDO_COMBO']
  if(new Set(policy.sources.map(s=>s.id)).size!==4||expected.some(id=>!policy.sources.some(s=>s.id===id))) throw new Error('COMPANY_SOURCE_IDENTITY_MISMATCH')
  const pool=[{id:'ADMIN_OFFICE_WORKSPACE_BUNDLE',cents:policy.office.memberships*10000},
    {id:'ADMIN_MOBILE_TARIFF_AND_PROVIDER_FEE',cents:Math.round((policy.mobile.baseMonthlyTotalUsd+policy.mobile.adminLines*policy.mobile.providerFeeMonthlyUsdPerLine)*100)}]
  const yardCents=Math.round(policy.yard.publishedMonthlyUsdPerCombo*100)
  const fleetScenarios=policy.fleetPairs.map(pairs=>{
    const shares=pool.map(line=>({...line,pairCents:splitEqualCents(line.cents,pairs)}))
    const pairAllocations=Array.from({length:pairs},(_,i)=>{
      const sharedLines=shares.map(line=>{
        const resources=splitEqualCents(line.pairCents[i],2)
        return {id:line.id,monthlyComponentUsd:line.pairCents[i]/100,resources:{MX_TRACTOR:resources[0]/100,US_TRACTOR:resources[1]/100,SHARED_TRAILER:0}}
      })
      const lines=[...sharedLines,{id:'US_YARD_SINGLE_TRACTOR_SAME_BOX_COMBO',monthlyComponentUsd:yardCents/100,
        resources:{MX_TRACTOR:0,US_TRACTOR:yardCents/100,SHARED_TRAILER:0}}]
      return {pairIndex:i+1,lines,monthlyComponentUsd:lines.reduce((sum,l)=>sum+Math.round(l.monthlyComponentUsd*100),0)/100}
    })
    return {pairs,pairAllocations,sharedPoolMonthlyComponentUsd:pool.reduce((sum,l)=>sum+l.cents,0)/100,
      fleetMonthlyComponentUsd:(pool.reduce((sum,l)=>sum+l.cents,0)+yardCents*pairs)/100,
      resourceBudgetJoinAllowed:pairs===1,selected:false,completeCompanyBudgetUsd:null,completeD2DCostUsd:null}
  })
  const linked:Record<string,string[]>={Internet:['ADMIN_OFFICE_WORKSPACE_BUNDLE'],Imprenta:['ADMIN_OFFICE_WORKSPACE_BUNDLE'],
    'Telefonia Celular':['ADMIN_MOBILE_TARIFF_AND_PROVIDER_FEE'],'Renta Patio':['US_YARD_SINGLE_TRACTOR_SAME_BOX_COMBO']}
  return {...policy,fleetScenarios,canonicalCompanyRelationships:inventory.map(row=>({...row,
    componentIds:linked[row.fieldSuffix]??[],status:linked[row.fieldSuffix]?'PARTIAL_SCOPE_COMPONENT_NOT_COMPLETE_FIELD':'UNRESOLVED_NOT_ZERO',
    completeMonthlyUsd:null})),tmsAddedAgain:false,standaloneIncludedServicesChargedAgain:false,
    unknownExpensesDefaultedToZero:false,canonicalCompanyFamilyFilled:false,adoptedValues:0,quoteReady:false,
    remaining:['ACTUAL_TAX_SURCHARGE_DEVICES','MX_YARD_AND_BORDER_STORAGE','OTHER_COMPANY_COMPONENTS_AND_LOCATION_ELIGIBILITY',
      'CONTINUOUS_HUMAN_COVERAGE_AND_WORKLOAD','COMPATIBLE_FLEET_RESOURCE_REBASING','RESOURCE_EXPOSURE_AND_TRIP_CYCLE']}
}
