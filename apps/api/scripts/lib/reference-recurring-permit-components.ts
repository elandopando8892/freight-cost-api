import {z} from 'zod'
import {calculateSharedBoxTexasComplianceReference} from './reference-shared-box-compliance.js'
const text=z.string().min(1)
const schema=z.object({model:z.literal('FCM_RECURRING_PERMIT_COMPONENT_SCENARIO_V1'),reviewedAt:z.string().datetime(),
  referencePeriod:z.literal('2026-10'),planningUsRegistrants:z.literal(1),planningUsPowerUnits:z.literal(1),planningSharedBoxes:z.literal(1),
  ucrRegistrationYear:z.literal(2026),ucrBracket:z.literal('B1'),hvutCategory:z.literal('V'),
  irpBasis:z.literal('OFFICIAL_FEE_TEST_2_PROXY_NOT_APVD_OR_ACTUAL_DISTANCE_INVOICE'),modelAssumptions:z.array(text).min(7),
  sources:z.array(z.object({id:text,url:z.string().url(),locator:text,archive:z.object({file:text,sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict()}).strict()).length(2),
}).strict()
const registrationSchema=z.object({ucr:z.object({schedules:z.array(z.object({registrationYear:z.number().int(),rows:z.array(z.object({bracket:text,vehicleRange:text,annualUsd:z.number().finite().nonnegative()}).passthrough())}).passthrough())}).passthrough()}).passthrough()
const irpSchema=z.object({officialTestContrast:z.object({operation:z.literal('HAUL_FOR_HIRE'),termMonths:z.literal(12),jurisdictionCount:z.literal(59),
  totalDistance:z.literal(59000),administrativeAndMiscFeesIncluded:z.literal(false),rows:z.array(z.object({id:text,texasInvoiceUsd:z.number().finite().nonnegative()}).passthrough()).length(59),
}).passthrough()}).passthrough()
const hvutSchema=z.object({hvut:z.object({referenceTaxPeriod:z.object({start:z.literal('2026-07-01'),end:z.literal('2027-06-30'),months:z.literal(12)}).strict(),
  categories:z.array(z.object({category:text,annualNonLoggingUsd:z.number().finite().nonnegative()}).passthrough()),
}).passthrough()}).passthrough()

/** Supported components only: no partial item is promoted to a whole permits family. */
export function calculateRecurringPermitComponentScenario(raw:unknown,rawRegistration:unknown,rawIrp:unknown,rawHvut:unknown,rawBox:unknown) {
  const policy=schema.parse(raw),reg=registrationSchema.parse(rawRegistration),irp=irpSchema.parse(rawIrp).officialTestContrast,
    hvut=hvutSchema.parse(rawHvut).hvut,box=calculateSharedBoxTexasComplianceReference(rawBox)
  if(new Set(policy.sources.map(s=>s.id)).size!==2||!['IRP_INSTRUCTIONS_SCOPE','ATRI_PERMIT_DEFINITION_2026'].every(id=>policy.sources.some(s=>s.id===id))) throw new Error('PERMIT_COMPONENT_SOURCE_SET_MISMATCH')
  const schedules=reg.ucr.schedules.filter(s=>s.registrationYear===policy.ucrRegistrationYear)
  const brackets=schedules.flatMap(s=>s.rows.filter(r=>r.bracket===policy.ucrBracket))
  const categories=hvut.categories.filter(c=>c.category===policy.hvutCategory)
  if(schedules.length!==1||brackets.length!==1||brackets[0].vehicleRange!=='0-2'||brackets[0].annualUsd!==46||
    categories.length!==1||categories[0].annualNonLoggingUsd!==550||new Set(irp.rows.map(r=>r.id)).size!==59) throw new Error('PERMIT_COMPONENT_PROFILE_MISMATCH')
  const irpAnnualProxyUsd=irp.rows.reduce((sum,row)=>sum+Math.round(row.texasInvoiceUsd*100),0)/100
  if(irpAnnualProxyUsd!==2021.47) throw new Error('PERMIT_COMPONENT_IRP_TEST_SUM_MISMATCH')
  const lines=[
    {id:'US_IRP_WORKED_EXAMPLE_PROXY',resourceId:'US_TRACTOR' as const,annualUsd:irpAnnualProxyUsd,chargeBasis:'ONE_ANNUAL_REGISTRATION_COMPONENT_PROXY'},
    {id:'US_UCR_ONE_ENTITY',resourceId:'US_TRACTOR' as const,annualUsd:brackets[0].annualUsd,chargeBasis:'ONE_US_LEGAL_ENTITY_2026_NOT_PER_ASSET'},
    {id:'US_HVUT_ONE_TAXABLE_POWER_UNIT',resourceId:'US_TRACTOR' as const,annualUsd:categories[0].annualNonLoggingUsd,chargeBasis:'ONE_SELF_PROPELLED_VEHICLE_COVERED_TAX_YEAR'},
    {id:'ONE_BOX_TX_RECURRING',resourceId:'SHARED_TRAILER' as const,annualUsd:box.annualRecurringTexasReferenceUsd,chargeBasis:'ONE_SHARED_BOX_TX_ONLY_NOT_PER_COUNTRY'},
  ].map(l=>({...l,monthlyExactUsd:l.annualUsd/12}))
  const annualKnownComponentSumUsd=lines.reduce((sum,l)=>sum+Math.round(l.annualUsd*100),0)/100
  const monthlyKnownComponentSumUsd=annualKnownComponentSumUsd/12
  return {...policy,lines,annualKnownComponentSumUsd,monthlyKnownComponentSumUsd,
    monthlyDisplayUsd:Math.round(monthlyKnownComponentSumUsd*100)/100,
    usTractorMonthlyComponentUsd:(irpAnnualProxyUsd+46+550)/12,
    boxMonthlyComponentUsd:box.monthlyRecurringTexasReferenceUsd,
    completeUsPermitsMonthlyUsd:null,completeBoxPermitsMonthlyUsd:null,
    unknownFeesSetToZero:false,annualInvoiceFromRoundedMonth:false,secondCadConversionPerformed:false,
    canonicalBudgetRowsFilled:0,adoptedValues:0,quoteReady:false,
    remaining:['US_ADMINISTRATIVE_MISCELLANEOUS_AND_APPLICABLE_EXTRA_FEES','IRP_PROFILE_AND_REPORTING_DISTANCE_MODEL_SELECTION',
      'MX_REGISTRATION_AND_PERIODIC_COMPLIANCE','ONE_BOX_MX_BORDER_COMPLIANCE_SCOPE','WHOLE_GROUP_ADMIN_AND_COMPANY_POOL'],
  }
}
