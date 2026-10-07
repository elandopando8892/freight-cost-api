import { z } from 'zod'
import { BinationalFixedBudgetSchema } from '../../src/modules/engine/benchmark-binational-budget.js'

const money = z.number().finite().nonnegative().max(1e9)

const usPlanningInsuranceSchema=z.object({
  model:z.literal('FCM_US_TRACTOR_INSURANCE_PUBLIC_MODEL_V1'),verifiedAt:z.string().datetime(),
  referencePeriod:z.literal('2026-10'),resourceId:z.literal('US_TRACTOR'),
  profileReference:z.literal('US_USED_CASCADIA2021_SLEEPER_D2D_OWN_RELAY_REFERENCE_V1'),
  currency:z.literal('USD'),planningUsPowerUnits:z.literal(1),planningCargoPolicies:z.literal(1),
  operatingTerritory:z.literal('US_ONLY_OWN_RELAY'),paymentModes:z.tuple([z.literal('CASH'),z.literal('FINANCED')]),
  premiumPaymentBasis:z.literal('ANNUAL_PREMIUM_EXPENSE_NO_PREMIUM_FINANCE_MODEL'),
  autoMonthlyProxyUsd:z.literal(926),cargoAnnualProxyUsd:z.literal(1553),monthlyCargoDisplayUsd:z.literal(129),
  autoProxyApplication:z.literal('PUBLISHED_POWER_UNIT_MEAN_APPLIED_TO_TRACTOR_ONLY_AS_MODEL_NOT_OBSERVED_MATCH'),
  cargoProxyApplication:z.literal('PUBLISHED_POLICY_MEDIAN_APPLIED_TO_ONE_US_POLICY_NOT_PER_TRAILER_OR_TRIP'),
  sources:z.array(z.object({id:z.string().min(1),url:z.string().url(),locator:z.string().min(1),
    archive:z.object({file:z.string().startsWith('docs/research/sources/'),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict()}).strict()).length(2),
  modelAssumptions:z.array(z.string().min(1)).min(9),
  decision:z.literal('REVIEWED_PUBLIC_PLANNING_PREMIUM_MODEL_NOT_POLICY_OR_CANONICAL_PARAMETER_ADOPTION'),
}).strict()

/** Explicit cross-sample planning model: not a summed sample mean or an observed policy. */
export function calculateUsTractorInsurancePublicModel(raw:unknown) {
  const input=usPlanningInsuranceSchema.parse(raw)
  for(const id of ['PROGRESSIVE_US_2025','INSUREON_CARGO_2025']) {
    if(input.sources.filter(s=>s.id===id).length!==1) throw new Error('US_INSURANCE_MODEL_SOURCE_SET_MISMATCH')
  }
  const cargoMonthlyExactUsd=input.cargoAnnualProxyUsd/12
  const monthlyExactUsd=input.autoMonthlyProxyUsd+cargoMonthlyExactUsd
  const monthlyBudgetUsd=Math.round(monthlyExactUsd*100)/100
  const annualExpenseReferenceUsd=input.autoMonthlyProxyUsd*12+input.cargoAnnualProxyUsd
  return {...input,cargoMonthlyExactUsd,monthlyExactUsd,monthlyBudgetUsd,annualExpenseReferenceUsd,
    annualRoundingDifferenceUsd:Math.round((monthlyBudgetUsd*12-annualExpenseReferenceUsd)*100)/100,
    economicExpenseId:'US_TRACTOR_INSURANCE',evidenceKind:'DOCUMENTED_PUBLIC_MODEL' as const,
    planningPremiumScope:['PRIMARY_LIABILITY','TRACTOR_PHYSICAL_DAMAGE_PROXY','ONE_US_CARGO_POLICY'],
    planningPremiumScopeComplete:true,actualInvoiceComplete:false,matchedPolicyObserved:false,
    jointStatisticalEstimate:false,boxCoverageProven:false,mxCoverageProven:false,
    calibrationOrCanonicalAdoption:false,quoteReady:false}
}

/** Populate one reviewed model family in a COPY; all other unknown expenses remain unknown. */
export function applyUsTractorInsurancePublicModel(rawBudget:unknown,rawModel:unknown) {
  const budget=BinationalFixedBudgetSchema.parse(rawBudget)
  const model=calculateUsTractorInsurancePublicModel(rawModel)
  if(budget.referencePeriod!==null && budget.referencePeriod!==model.referencePeriod) throw new Error('US_INSURANCE_MODEL_BUDGET_PERIOD_MISMATCH')
  const resource=budget.resources.find(r=>r.resourceId==='US_TRACTOR')
  if(!resource || (resource.profileReference!==null && resource.profileReference!==model.profileReference)) throw new Error('US_INSURANCE_MODEL_PROFILE_MISMATCH')
  const rows=budget.expenses.filter(e=>e.economicExpenseId===model.economicExpenseId)
  if(rows.length!==1) throw new Error('US_INSURANCE_MODEL_EXPENSE_IDENTITY_MISMATCH')
  const row=rows[0]
  if(row.amount!==null) throw new Error('US_INSURANCE_MODEL_WOULD_OVERWRITE_EXISTING_AMOUNT')
  if(row.family!=='INSURANCE' || row.scope!=='DIRECT_RESOURCE' || row.basis!=='PERIOD_PREMIUM_NORMALIZED_ONCE' ||
    row.allocations.length!==1 || row.allocations[0].resourceId!=='US_TRACTOR' || row.allocations[0].share!==1) throw new Error('US_INSURANCE_MODEL_ALLOCATION_MISMATCH')
  budget.referencePeriod=model.referencePeriod
  resource.profileReference=model.profileReference
  const evidenceIds=model.sources.map(s=>`US_INSURANCE_MODEL_${s.id}`)
  if(budget.evidence.some(s=>evidenceIds.includes(s.id))) throw new Error('US_INSURANCE_MODEL_DUPLICATE_EVIDENCE')
  budget.evidence.push(...model.sources.map((s,i)=>({id:evidenceIds[i],url:s.url,locator:s.locator,
    observedAt:model.verifiedAt.slice(0,10),referencePeriod:model.referencePeriod,groupReference:budget.groupReference,
    resourceIds:['US_TRACTOR' as const],profileReferences:[{resourceId:'US_TRACTOR' as const,profileReference:model.profileReference}],
    kind:'DOCUMENTED_PUBLIC_MODEL' as const,limitations:model.modelAssumptions.join('; ')})))
  row.amount={value:model.monthlyBudgetUsd,unit:'USD/month',referencePeriod:model.referencePeriod,
    evidenceIds,kind:'DOCUMENTED_PUBLIC_MODEL',
    derivation:'926USD/power-unit-month +1553USD/cargo-policy-year /12; one US planning tractor/policy; final monthly cents rounding, annual+0.04USD; mixed mean/median not jointly observed'}
  row.allocationRationale='One reviewed US-only tractor premium model, cash and asset-financed alternatives use same coverage proxy. No additional auto/tractor PD or whole box premium charged here.'
  return {budget,model}
}
const premiumSchema = z.object({
  amount: money, currency: z.enum(['MXN','USD']),
  basis: z.enum(['ANNUAL_AMOUNT','TERM_AMOUNT','MONTHLY_AVERAGE']),
  termMonths: z.number().int().min(1).max(60).nullable(),
}).strict()

/** Research normalization, not billing, underwriting, VAT recovery or rate adoption. */
export function normalizeInsuranceReference(raw: unknown) {
  const input = premiumSchema.parse(raw)
  if(input.basis === 'TERM_AMOUNT' && input.termMonths === null) throw new Error('INSURANCE_TERM_REQUIRED')
  const monthlyMoneyReference = input.basis === 'ANNUAL_AMOUNT' ? input.amount/12 :
    input.basis === 'TERM_AMOUNT' ? input.amount/input.termMonths! : input.amount
  return {...input, monthlyMoneyReference, annualMoneyEquivalent:monthlyMoneyReference*12,
    equivalentIsQuotedAnnualPolicy:false, actualMonthlyBilling:null, monthlyEconomicInsurance:null,
    selected:false, eligibleForBudget:false}
}

const orderedRange = z.object({low:money.positive(),high:money.positive()}).strict()
  .refine(r=>r.low<=r.high,{message:'INSURANCE_RANGE_REVERSED'})
const trailerPlanningSchema = z.object({
  source:z.object({id:z.string().min(1),url:z.string().url(),publishedOn:z.string().date(),
    verifiedAt:z.string().datetime(),kind:z.literal('BROKER_PUBLISHED_PLANNING_RULE'),
    territory:z.literal('US'),coverage:z.literal('OWNED_TRAILER_PHYSICAL_DAMAGE')}).strict(),
  currency:z.literal('USD'),physicalBoxCount:z.literal(1),
  publishedMonthlyRangeUsd:orderedRange,
  annualValueRate:orderedRange.refine(r=>r.high<=1,{message:'INSURANCE_RATE_NOT_FRACTION'}),
  statedValueUsd:money.positive().nullable(),
}).strict()

/** Two alternative broker heuristics, not two premiums, a bound, or a binational policy. */
export function calculateOwnedTrailerInsurancePlanningReference(raw:unknown) {
  const input=trailerPlanningSchema.parse(raw)
  const valueBasedMonthlyRangeUsd=input.statedValueUsd===null ? null : {
    low:input.statedValueUsd*input.annualValueRate.low/12,
    high:input.statedValueUsd*input.annualValueRate.high/12,
  }
  return {...input,
    economicExpenseId:'SHARED_TRAILER_INSURANCE',resourceId:'SHARED_TRAILER',
    publishedAnnualEquivalentRangeUsd:{low:input.publishedMonthlyRangeUsd.low*12,
      high:input.publishedMonthlyRangeUsd.high*12},
    valueBasedMonthlyRangeUsd,representationsAreAlternativesNotSum:true,
    publishedRangeIsClamp:false,statisticalConfidenceInterval:false,
    selectedMonthlyPremiumUsd:null,completeBinationalMonthlyInsuranceUsd:null,
    mxOrBorderCoverageProven:false,duplicateBoxChargeAdded:false,
    otherCoverageCostsSetToZero:false,quotedPolicy:false,eligibleForBudget:false,
    missing:['MX_AND_BORDER_TERRITORIAL_TERMS','OWNERSHIP_CUSTODY_AND_GARAGING_ASSUMPTIONS',
      'DEDUCTIBLE_FEES_AND_OTHER_COVERAGES','REVIEWED_MODEL_SELECTION_AND_ALLOCATION'],
  }
}

const employerSchema = z.object({
  taxYear:z.number().int().min(2000).max(2100),
  ruleYear:z.number().int().min(2000).max(2100),
  socialSecurityRate:z.number().finite().min(0).max(1), socialSecurityCapUsd:money,
  medicareRate:z.number().finite().min(0).max(1),
  employees:z.array(z.object({id:z.string().trim().min(1), annualTaxableWageUsd:money,
    compensationBasis:z.literal('WAGES_ONLY')}).strict()).min(1).max(10000),
}).strict()

/** Cap is per employee, not per fleet or FTE aggregate. Wage proxies remain hypotheses. */
export function calculateUsEmployerStatutoryReference(raw:unknown) {
  const input=employerSchema.parse(raw)
  if(input.taxYear !== input.ruleYear) throw new Error('EMPLOYER_RULE_YEAR_MISMATCH')
  if(new Set(input.employees.map(e => e.id)).size !== input.employees.length) throw new Error('DUPLICATE_EMPLOYEE_REFERENCE')
  const employees=input.employees.map(e => {
    const socialSecurityBaseUsd=Math.min(e.annualTaxableWageUsd,input.socialSecurityCapUsd)
    const annualSocialSecurityUsd=socialSecurityBaseUsd*input.socialSecurityRate
    const annualMedicareUsd=e.annualTaxableWageUsd*input.medicareRate
    return {...e,socialSecurityBaseUsd,annualSocialSecurityUsd,annualMedicareUsd,
      annualKnownEmployerTaxComponentUsd:annualSocialSecurityUsd+annualMedicareUsd,
      annualCompleteEmployerCostUsd:null}
  })
  const annualKnownEmployerTaxComponentUsd=employees.reduce((sum,e) => sum+e.annualKnownEmployerTaxComponentUsd,0)
  return {...input,employees,annualKnownEmployerTaxComponentUsd,
    meanMonthKnownEmployerTaxComponentUsd:annualKnownEmployerTaxComponentUsd/12,
    excluded:['FUTA','SUTA','WORKERS_COMPENSATION','HEALTH_RETIREMENT','PAID_LEAVE_OTHER_BENEFITS'],
    employeeWithholdingAddedAsEmployerCost:false, additionalEmployeeMedicareAdded:false,
    monthlyCompleteEmployerCostUsd:null,eligibleForBudget:false,selected:false}
}
