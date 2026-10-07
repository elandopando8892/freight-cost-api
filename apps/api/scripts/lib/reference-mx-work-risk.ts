import { z } from 'zod'
import { calculateMxEmployerReference } from './reference-mx-employer.js'

const common = {
  employerInput: z.unknown(),
  employerActivity: z.literal('EXCLUSIVE_GENERAL_CARGO_TRANSPORT_FRACTION_712'),
  employeeRegistrationHypothesis: z.literal('SAME_TRANSPORT_EMPLOYER_REGISTRATION'),
}
const schema = z.discriminatedUnion('registrationBasis', [
  z.object({...common, registrationBasis:z.literal('NEW_REGISTRATION_CLASS_V_REFERENCE'),
    riskClass:z.literal('V'), referenceRate:z.literal(.0758875)}).strict(),
  z.object({...common, registrationBasis:z.literal('EXISTING_REGISTRATION_RATE_UNKNOWN'),
    riskClass:z.literal('V'), referenceRate:z.null()}).strict(),
])

/** Employer/activity classification, not occupation-specific office risk.
 * No claim about an actual carrier's registration or annual accident history. */
export function calculateMxWorkRiskReference(raw: unknown) {
  const p=schema.parse(raw)
  const employer=calculateMxEmployerReference(p.employerInput)
  const workRiskContributionMxn=p.referenceRate === null ? null : employer.sbcPeriodBaseMxn*p.referenceRate
  return {
    month:employer.month, monthlySalaryMxn:employer.monthlySalaryMxn,
    employerActivity:p.employerActivity, employeeRegistrationHypothesis:p.employeeRegistrationHypothesis,
    registrationBasis:p.registrationBasis,riskClass:p.riskClass,referenceRate:p.referenceRate,
    coveredDays:employer.coveredDays,cappedDailySbcMxn:employer.cappedDailySbcMxn,
    sbcPeriodBaseMxn:employer.sbcPeriodBaseMxn,workRiskContributionMxn,
    knownContributionComponentExcludingRiskMxn:employer.knownContributionComponentMxn,
    contributionComponentIncludingRiskMxn:workRiskContributionMxn === null ? null : employer.knownContributionComponentMxn+workRiskContributionMxn,
    conditionalWageBenefitsContributionSumMxn:workRiskContributionMxn === null ? null : employer.conditionalComponentSumMxn+workRiskContributionMxn,
    scope:'PUBLIC_INITIAL_REGISTRATION_HYPOTHESIS_NOT_ACTUAL_EMPLOYER_RATE' as const,
    workerWithholdingAdded:false,classifiedByEmployeeOccupation:false,
    actualEmployerRateEstablished:false,completeMonthlyEmployerCostMxn:null,
    effectiveCompleteBurden:null,isObservedPayroll:false,isLowerBound:false,eligibleForBudget:false,selected:false,
  }
}
