import { z } from 'zod'
import { BinationalFixedBudgetSchema } from '../../src/modules/engine/benchmark-binational-budget.js'
import { calculateUsCapitalComparison } from './reference-us-capital-comparison.js'

const text=z.string().min(1)
const policySchema=z.object({
  model:z.literal('FCM_US_PROSPECTIVE_MARKET_CAPITAL_V1'), reviewedAt:z.string().datetime(),
  referencePeriod:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  profileReference:text, exposureId:z.literal('H12026'), planningPowerUnits:z.literal(1),
  measurement:z.literal('MARKET_VALUE_USE_LOSS_NO_PURCHASE_OR_DISPOSAL_EVENT'),
  financing:z.literal('EXISTING_REFERENCE_DEBT_NO_NEW_ORIGINATION_EVENT'),
  permissionEvidence:z.literal('USER_AUTORIZO_CAMBIO_METODOLOGICO_2026_10_02'),
  modelAssumptions:z.array(text).min(1),
  sources:z.array(z.object({id:text,url:z.string().url(),locator:text}).strict()).min(3),
}).strict()
const comparisonSchema=z.object({exposureId:text,input:z.unknown()}).passthrough()

/** Approved change of measurement, not zeroing unknown purchase/sale invoices.
 * Reuse the same residual and debt arithmetic; measure current market-value use
 * loss without claiming a purchase, sale, remaining life or lender contract. */
export function calculateUsProspectiveCapital(rawPolicy:unknown,rawComparison:unknown) {
  const policy=policySchema.parse(rawPolicy), comparison=comparisonSchema.parse(rawComparison)
  if(comparison.exposureId!==policy.exposureId) throw new Error('US_PROSPECTIVE_CAPITAL_EXPOSURE_MISMATCH')
  if(new Set(policy.sources.map(s=>s.id)).size!==policy.sources.length) throw new Error('US_PROSPECTIVE_CAPITAL_DUPLICATE_SOURCE')
  const reference=calculateUsCapitalComparison(comparison.input)
  if(reference.input.acquisitionAdjustmentUsd!==null || reference.input.otherDisposalCostsUsd!==null ||
    reference.input.financingFeeMonthlyUsd!==null) throw new Error('US_PROSPECTIVE_CAPITAL_UNKNOWN_TRANSACTION_COSTS_MUST_REMAIN_NULL')
  const valueLoss=reference.askingValueLossMonthlyUsd
  const interest=reference.financed.analyticalInterestMonthlyUsd
  const cents=(v:number)=>Math.round(v*100)/100
  const modes={
    CASH:{monthlyModelUsd:valueLoss,monthlyBudgetUsd:cents(valueLoss),monthlyDebtInterestUsd:0},
    FINANCED:{monthlyModelUsd:valueLoss+interest,monthlyBudgetUsd:cents(valueLoss+interest),monthlyDebtInterestUsd:interest},
  }
  return {...policy,economicExpenseId:'US_TRACTOR_CAPITAL',resourceId:'US_TRACTOR' as const,currency:'USD',
    marketValueProxyUsd:reference.input.askingUsd,holdingMonths:reference.input.holdingMonths,
    monthlyKmHypothesis:reference.input.monthlyKm,grossTerminalMarketValueUsd:reference.grossEndpointUsd,
    marketValueUseLossMonthlyUsd:valueLoss,modes,
    componentsPerHypothesizedKmUsd:{cash:valueLoss/reference.input.monthlyKm,financed:(valueLoss+interest)/reference.input.monthlyKm},
    debt:{principalProxyUsd:reference.financed.borrowedAskingPrincipalUsd,
      annualNominalHypothesis:reference.input.nominalHypothesis.annualRate,
      remainingTermHypothesisMonths:reference.input.loanMonths,
      balanceAtHoldingEndUsd:reference.financed.balanceAtHoldingEndUsd,
      regularPaymentUsd:reference.financed.regularDebtPaymentUsd},
    transactionCosts:{acquisitionAdjustmentUsd:null,otherDisposalCostsUsd:null,financingFeeMonthlyUsd:null,
      publishedListingReferenceUsd:reference.input.listingFeeUsd,listingEventIncluded:false,
      unknownAmountsSetToZero:false,reason:'No purchase, refinancing, listing or realized sale is an event in this prospective market-value use model.'},
    grossValueIsRealizedNetSale:false,actualCarrierAssetsOrDebtObserved:false,
    actualAllInInvoiceComplete:false,holdingIsRemainingServiceLife:false,
    publishedAprConvertedToNominal:false,loanPrincipalAddedToExpense:false,
    equityOpportunityCostIncluded:false,equityOpportunityCostAssumedZero:false,
    capitalReturnPolicy:'EQUITY_REQUIRED_RETURN_IS_NOT_DEPRECIATION_OR_DEBT_INTEREST; SEPARATE_UNRESOLVED_FINANCE_POLICY',
    representativeMonthIsWindowAverageNotFirstLoanMonth:true,wholePilotCostUsd:null,
    modelFamilyResolved:true,calibrated:false,quoteReady:false,adoptedValues:0,
  }
}

export function applyUsProspectiveCapitalPublicModel(rawBudget:unknown,rawPolicy:unknown,rawComparison:unknown,rawMode:unknown) {
  const budget=BinationalFixedBudgetSchema.parse(rawBudget),model=calculateUsProspectiveCapital(rawPolicy,rawComparison)
  const mode=z.enum(['CASH','FINANCED']).parse(rawMode)
  if(budget.referencePeriod!==model.referencePeriod) throw new Error('US_PROSPECTIVE_CAPITAL_BUDGET_PERIOD_MISMATCH')
  const resource=budget.resources.find(r=>r.resourceId==='US_TRACTOR')
  if(resource?.profileReference!==model.profileReference) throw new Error('US_PROSPECTIVE_CAPITAL_PROFILE_MISMATCH')
  const rows=budget.expenses.filter(e=>e.economicExpenseId===model.economicExpenseId)
  if(rows.length!==1) throw new Error('US_PROSPECTIVE_CAPITAL_EXPENSE_IDENTITY_MISMATCH')
  const row=rows[0]
  if(row.amount!==null) throw new Error('US_PROSPECTIVE_CAPITAL_WOULD_OVERWRITE_EXISTING_AMOUNT')
  if(row.family!=='CAPITAL'||row.basis!=='ECONOMIC_DEPRECIATION_PLUS_INTEREST_ONLY'||row.scope!=='DIRECT_RESOURCE'||
    row.allocations.length!==1||row.allocations[0].resourceId!=='US_TRACTOR'||row.allocations[0].share!==1) {
    throw new Error('US_PROSPECTIVE_CAPITAL_ALLOCATION_MISMATCH')
  }
  const evidenceIds=model.sources.map(s=>`US_PROSPECTIVE_CAPITAL_${s.id}`)
  if(budget.evidence.some(e=>evidenceIds.includes(e.id))) throw new Error('US_PROSPECTIVE_CAPITAL_DUPLICATE_EVIDENCE')
  budget.evidence.push(...model.sources.map((s,i)=>({id:evidenceIds[i],url:s.url,locator:s.locator,
    observedAt:model.reviewedAt.slice(0,10),referencePeriod:model.referencePeriod,groupReference:budget.groupReference,
    resourceIds:['US_TRACTOR' as const],profileReferences:[{resourceId:'US_TRACTOR' as const,profileReference:model.profileReference}],
    kind:'DOCUMENTED_PUBLIC_MODEL' as const,limitations:model.modelAssumptions.join('; ')})))
  row.amount={value:model.modes[mode].monthlyBudgetUsd,unit:'USD/month',referencePeriod:model.referencePeriod,
    evidenceIds,kind:'DOCUMENTED_PUBLIC_MODEL',derivation:`${mode}: current asking-market proxy * (1 - ANL age/additional-mile retention)/36 + ${mode==='CASH'?'no debt in cash scenario':'mean first36 months interest on declared existing debt'}; no purchase/sale/refinance event; final cents rounding; not actual invoice or equity required return`}
  row.allocationRationale='One US reference tractor only; market-use capital charged once. Cash and financed are separate alternatives, not summed; box and MX tractor are not included.'
  return {budget,model,mode}
}
