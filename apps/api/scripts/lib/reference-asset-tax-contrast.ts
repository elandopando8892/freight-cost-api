import { z } from 'zod'

const schema = z.object({
  currency: z.literal('MXN'), newerQuotedNet: z.number().finite().positive().max(1e12),
  olderQuotedAmount: z.number().finite().positive().max(1e12),
  olderQuoteBasis: z.enum(['NET_PLUS_VAT', 'GROSS_INCLUDES_VAT']),
  vatRate: z.number().finite().nonnegative().max(1),
  nonrecoverablePurchaseVatFraction: z.number().finite().min(0).max(1),
  analogyMonths: z.number().int().positive().max(360),
  saleVatTreatment: z.literal('NET_OF_OUTPUT_VAT_FOR_TAXABLE_ENTERPRISE_SALE'),
}).strict()

/** Asking-price tax normalization only: no purchase, credit or disposal event. */
export function normalizeReferenceAskingTaxBasis(raw:unknown) {
  const input=schema.pick({olderQuotedAmount:true,olderQuoteBasis:true,vatRate:true}).parse(raw)
  const olderNetAskingReference=input.olderQuoteBasis==='NET_PLUS_VAT'
    ? input.olderQuotedAmount : input.olderQuotedAmount/(1+input.vatRate)
  const olderGrossAskingReference=input.olderQuoteBasis==='NET_PLUS_VAT'
    ? input.olderQuotedAmount*(1+input.vatRate) : input.olderQuotedAmount
  return {olderNetAskingReference,olderGrossAskingReference,
    olderOutputVatReference:olderGrossAskingReference-olderNetAskingReference}
}

/** Tax arithmetic for two asking-price observations, not a residual forecast or
 * an eligibility/tax-return determination. Purchase credit and output sale VAT
 * are separate: lack of purchase credit does not entitle retention of sale VAT. */
export function compareReferenceAssetTaxBases(raw: unknown) {
  const input = schema.parse(raw)
  const purchaseInputVatReference = input.newerQuotedNet * input.vatRate
  const purchaseCashReference = input.newerQuotedNet + purchaseInputVatReference
  const purchaseEconomicReference = input.newerQuotedNet + purchaseInputVatReference * input.nonrecoverablePurchaseVatFraction
  const {olderNetAskingReference,olderGrossAskingReference}=normalizeReferenceAskingTaxBasis({
    olderQuotedAmount:input.olderQuotedAmount,olderQuoteBasis:input.olderQuoteBasis,vatRate:input.vatRate})
  return {
    input, purchaseInputVatReference, purchaseCashReference, purchaseEconomicReference,
    purchaseCreditReference: purchaseInputVatReference * (1 - input.nonrecoverablePurchaseVatFraction),
    olderNetAskingReference, olderGrossAskingReference,
    olderOutputVatReference: olderGrossAskingReference - olderNetAskingReference,
    contrastAmount: purchaseEconomicReference - olderNetAskingReference,
    monthlyEquivalentOfContrast: (purchaseEconomicReference - olderNetAskingReference) / input.analogyMonths,
    classification: 'CROSS_SECTION_TAX_ASSUMPTION_CONTRAST_NOT_NET_RESIDUAL_OR_DEPRECIATION',
    actualPurchaseCredit: null, predictedNetResidual: null, remainingLifeMonths: null,
    completeMonthlyCapital: null, eligibleForBudget: false, selected: false,
    exclusions: ['Acquisition/delivery/condition adjustments', 'Disposal costs and future market/condition changes',
      'Debt interest and equity policy', 'Working-capital cost of delayed VAT recovery', 'Actual taxpayer eligibility, incentives or exemptions'],
  }
}
