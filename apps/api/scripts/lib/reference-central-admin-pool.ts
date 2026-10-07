import { z } from 'zod'
import { ADMIN_ROLES } from '../../src/modules/engine/benchmark-payroll-capital-contract.js'

const text=z.string().trim().min(1).max(2000)
const group=z.enum(['OFFICE_ADMIN','MANAGEMENT_BUSINESS_FINANCIAL','PROFESSIONAL_RELATED'])
const money=z.number().finite().nonnegative().max(1e8)
const source=z.object({id:text,url:z.string().url(),locator:text,
  archive:z.object({file:z.string().startsWith('docs/research/sources/'),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict()}).strict()
const policySchema=z.object({
  model:z.literal('FCM_CENTRAL_ADMIN_PUBLIC_POOL_V1'),reviewedAt:z.string().datetime(),referencePeriod:z.literal('2026-10'),
  payrollLocationHypothesis:z.literal('US_CENTRAL_ADMIN_PROXY_NOT_MX_ROSTER'),
  monthlyWorkedHoursPerFullEquivalent:z.literal(160),hoursBasis:z.literal('DECLARED_WORKED_HOURS_NOT_PAID_HOURS_OR_2080_DIVIDED_BY12'),
  roleQuantities:z.array(z.object({role:z.enum(ADMIN_ROLES),fte:z.number().finite().positive().max(100),group,rationale:text}).strict()).length(7),
  fleetScenarios:z.array(z.object({id:text,pairs:z.number().int().positive().max(1000),
    mxTractors:z.number().int().positive(),usTractors:z.number().int().positive(),sharedBoxes:z.number().int().positive()}).strict()).length(2),
  allocationDriver:z.literal('EQUAL_POWER_UNIT_COUNT_NOT_ARBITRARY_THIRDS'),
  trailerPayrollShareHypothesis:z.literal('NO_ADDITIONAL_DEDICATED_BOX_ADMIN_ALL_SHARED_ADMIN_ON_POWER_UNITS'),
  tms:z.object({plan:z.literal('BASIC'),licensedUsers:z.literal(7),
    quantityBasis:z.literal('ONE_NAMED_ACCOUNT_PER_FUNCTION_NOT_PER_FTE_DRIVER_TRUCK_OR_LEG'),
    publishedMonthlyUsdPerUser:z.literal(69),taxTreatment:z.literal('UNKNOWN_NOT_ZERO')}).strict(),
  sources:z.array(source).length(2),modelAssumptions:z.array(text).min(8),
  decision:z.literal('REVIEWED_COMPENSATION_AND_LICENSE_COMPONENTS_WITH_CONSERVED_SCALE_ALLOCATION_NOT_COMPLETE_OVERHEAD'),
}).strict()
const readoutSchema=z.object({referencePeriod:z.literal('2026-June'),ownership:z.literal('PRIVATE_INDUSTRY'),
  geography:z.literal('US_NATIONAL'),unit:z.literal('USD_PER_HOUR_WORKED'),
  rows:z.array(z.object({id:group,label:text,total:money.positive(),wages:money,benefits:money}).strict()).length(3),
  benefitCategories:z.array(text),legallyRequiredIncludes:z.array(text),
}).passthrough()
const roleGroups:Record<typeof ADMIN_ROLES[number],z.infer<typeof group>>={DISPATCHER:'OFFICE_ADMIN',
  TRAFFIC_MANAGER:'MANAGEMENT_BUSINESS_FINANCIAL',OPERATIONS_MANAGER:'MANAGEMENT_BUSINESS_FINANCIAL',
  SALES_MANAGER:'MANAGEMENT_BUSINESS_FINANCIAL',SAFETY_MANAGER:'PROFESSIONAL_RELATED',TRACKING_CS:'OFFICE_ADMIN',BILLING_ADMIN:'OFFICE_ADMIN'}

/** Integer-money allocation over equal modeled capacity units. Not workload evidence. */
export function splitEqualCents(cents:number,quantity:number) {
  if(!Number.isSafeInteger(cents)||cents<0||!Number.isInteger(quantity)||quantity<1) throw new Error('ADMIN_ALLOCATION_RANGE')
  const floor=Math.floor(cents/quantity),remainder=cents-floor*quantity
  return Array.from({length:quantity},(_,i)=>floor+(i<remainder?1:0))
}

/** Pure research projection. Use hourly total compensation, never an OEWS wage multiplier.
 * Pool -> fleet pairs -> tractor cost centres; a single group's cost is conserved once. */
export function calculateCentralAdminPoolScenarios(rawPolicy:unknown,rawReadout:unknown,rawTmsReference:unknown) {
  const policy=policySchema.parse(rawPolicy),readout=readoutSchema.parse(rawReadout)
  if(!['BLS_ECEC_ADMIN_READOUT','ASCENDTMS_PRICING'].every(id=>policy.sources.some(s=>s.id===id))||
    new Set(policy.sources.map(s=>s.id)).size!==2||new Set(readout.rows.map(r=>r.id)).size!==3||
    new Set(policy.roleQuantities.map(r=>r.role)).size!==7||new Set(policy.fleetScenarios.map(s=>s.id)).size!==2) throw new Error('ADMIN_COMPONENT_DUPLICATE_IDENTITY')
  if(!['PAID_LEAVE','SUPPLEMENTAL_PAY','INSURANCE','RETIREMENT_SAVINGS','LEGALLY_REQUIRED'].every(id=>readout.benefitCategories.includes(id))||
    !['SOCIAL_SECURITY','MEDICARE','FEDERAL_STATE_UNEMPLOYMENT','WORKERS_COMPENSATION'].every(id=>readout.legallyRequiredIncludes.includes(id))) throw new Error('ADMIN_EMPLOYER_SCOPE_INCOMPLETE')
  const expected={OFFICE_ADMIN:[36.73,25.22,11.51],MANAGEMENT_BUSINESS_FINANCIAL:[88.63,59.85,28.78],PROFESSIONAL_RELATED:[73.69,50.98,22.71]}
  for(const row of readout.rows) if([row.total,row.wages,row.benefits].some((value,i)=>value!==expected[row.id][i])) throw new Error('ADMIN_ECEC_FIRST_OCCUPATION_BLOCK_MISMATCH')
  const tms=z.object({overheadUnitComponents:z.array(z.object({economicExpenseId:text,
    planAlternatives:z.array(z.object({id:text,publishedUnitPrice:money}).passthrough()).optional()}).passthrough())}).passthrough().parse(rawTmsReference)
  const tmsRows=tms.overheadUnitComponents.filter(r=>r.economicExpenseId==='TMS_SHARED_POOL')
  const plans=tmsRows[0]?.planAlternatives?.filter(p=>p.id===policy.tms.plan)
  if(tmsRows.length!==1||plans?.length!==1||plans[0].publishedUnitPrice!==policy.tms.publishedMonthlyUsdPerUser) throw new Error('ADMIN_TMS_SOURCE_MISMATCH')
  const roleLines=policy.roleQuantities.map(row=>{
    if(row.group!==roleGroups[row.role]) throw new Error('ADMIN_ROLE_OCCUPATION_MAPPING_MISMATCH')
    const reference=readout.rows.find(r=>r.id===row.group)!
    const workedHours=policy.monthlyWorkedHoursPerFullEquivalent*row.fte
    return {...row,workedHours,hourlyEmployerTotalUsd:reference.total,
      monthlyEmployerTotalUsd:Math.round(workedHours*reference.total*100)/100,
      benefitsAlreadyIncluded:true,additionalFicaAdded:false,sourceId:'BLS_ECEC_ADMIN_READOUT'}
  })
  const payrollCents=roleLines.reduce((sum,row)=>sum+Math.round(row.monthlyEmployerTotalUsd*100),0)
  const tmsCents=Math.round(policy.tms.licensedUsers*policy.tms.publishedMonthlyUsdPerUser*100)
  const poolLines=[{id:'CENTRAL_ADMIN_PAYROLL_MODEL',monthlyComponentUsd:payrollCents/100,cents:payrollCents},
    {id:'TMS_SHARED_NAMED_ACCOUNT_POOL',monthlyComponentUsd:tmsCents/100,cents:tmsCents}]
  const fleetScenarios=policy.fleetScenarios.map(fleet=>{
    if([fleet.mxTractors,fleet.usTractors,fleet.sharedBoxes].some(count=>count!==fleet.pairs)) throw new Error('ADMIN_FLEET_RESOURCE_QUANTITY_MISMATCH')
    const byPair=poolLines.map(line=>({id:line.id,cents:splitEqualCents(line.cents,fleet.pairs)}))
    const pairAllocations=Array.from({length:fleet.pairs},(_,i)=>{
      const lines=byPair.map(line=>{
        const resourceCents=splitEqualCents(line.cents[i],2)
        return {id:line.id,monthlyComponentUsd:line.cents[i]/100,resources:{
          MX_TRACTOR:resourceCents[0]/100,US_TRACTOR:resourceCents[1]/100,SHARED_TRAILER:0}}
      })
      return {pairIndex:i+1,lines,monthlyComponentUsd:lines.reduce((sum,l)=>sum+Math.round(l.monthlyComponentUsd*100),0)/100,
        resources:{MX_TRACTOR:lines.reduce((sum,l)=>sum+Math.round(l.resources.MX_TRACTOR*100),0)/100,
          US_TRACTOR:lines.reduce((sum,l)=>sum+Math.round(l.resources.US_TRACTOR*100),0)/100,SHARED_TRAILER:0}}
    })
    return {...fleet,poolLines:poolLines.map(({cents,...line})=>line),pairAllocations,
      fleetMonthlyComponentUsd:(payrollCents+tmsCents)/100,
      representativeFirstPairMonthlyComponentUsd:pairAllocations[0].monthlyComponentUsd,
      annualizedValueIsObservedAnnualPayroll:false,selected:false,workloadCapacityProven:false,
      completeAdminCompanyBudgetUsd:null,completeCfuUsd:null,completeD2DCostUsd:null}
  })
  return {...policy,roleLines,modeledFunctionalFullEquivalents:policy.roleQuantities.reduce((sum,r)=>sum+r.fte,0),
    modeledWorkedHours:roleLines.reduce((sum,r)=>sum+r.workedHours,0),payrollModelMonthlyUsd:payrollCents/100,
    tmsPublishedMonthlyComponentUsd:tmsCents/100,fleetScenarios,unknownCompanyExpensesDefaultedToZero:false,
    usEmployerModelAppliedToMxEmployees:false,ratioAppliedToOewsSalary:false,continuousHumanCoverageProven:false,
    canonicalAdminFamilyFilled:false,adoptedValues:0,quoteReady:false,
    remaining:['MODEL_FLEET_SCALE_SELECTION_AND_WORKLOAD','BINATIONAL_ADMIN_DUTIES_AND_CONTINUOUS_COVERAGE',
      'OFFICE_YARDS_MOBILE_AND_OTHER_COMPANY_TERMS','TMS_TAX_AND_FUNCTIONAL_SCOPE','RESOURCE_EXPOSURE_AND_TRIP_CYCLE']}
}
