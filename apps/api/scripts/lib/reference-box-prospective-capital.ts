import { z } from 'zod'
import { BinationalFixedBudgetSchema } from '../../src/modules/engine/benchmark-binational-budget.js'
import { normalizeReferenceAskingTaxBasis } from './reference-asset-tax-contrast.js'

const text=z.string().min(1)
const source=z.object({id:text,url:z.string().url(),locator:text}).strict()
const fxSchema=z.object({model:z.literal('FCM_DATED_FIX_VALUATION_REFERENCE_V1'),reviewedAt:z.string().datetime(),
  observationDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),column:z.literal('FIX_DETERMINATION'),
  mxnPerUsd:z.number().finite().positive(),use:z.literal('DATED_RESEARCH_VALUATION_NOT_PAYMENT_OR_FORECAST'),
  source:source.extend({archive:z.object({file:text,sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict()}).strict(),
}).strict()
const policySchema=z.object({model:z.literal('FCM_SHARED_BOX_PROSPECTIVE_CONDITIONAL_V1'),reviewedAt:z.string().datetime(),
  referencePeriod:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),profileReference:z.literal('ONE_UTILITY4000DX2021_DRYVAN53_SHARED_MX_US_REFERENCE_V1'),
  permissionEvidence:z.literal('USER_AUTORIZO_CAMBIO_METODOLOGICO_2026_10_02'),
  measurement:z.literal('NET_MARKET_VALUE_USE_NO_PURCHASE_OR_DISPOSAL_EVENT'),scenarioOnly:z.literal(true),
  holdingMonths:z.number().int().positive().max(360),genericVatRateReference:z.number().min(0).max(1),
  newerOfferId:z.literal('UTILITY_2021'),olderOfferId:z.literal('UTILITY_2019'),
  modelAssumptions:z.array(text).min(1),sources:z.array(source).min(3),
}).strict()
const offerSchema=z.object({sourceId:text,year:z.number().int(),askingMxn:z.number().finite().positive(),taxTreatment:text}).passthrough()
const marketSchema=z.object({offers:z.array(offerSchema),trailerMarketContrast:z.object({
  newerOfferId:text,olderOfferId:text,matchedSpecificationFields:z.array(text).min(13),
}).passthrough()}).passthrough()

/** Verify the column, not merely an occurrence of the rate in another DOF/payment row. */
export function verifyDatedFixArchive(rawFx:unknown,html:string) {
  const fx=fxSchema.parse(rawFx)
  const rows=[...html.replace(/<!--[\s\S]*?-->/g,'').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(r=>[...r[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(c=>c[1].replace(/<[^>]*>/g,'').trim()))
    .filter(r=>/^\d{2}\/\d{2}\/\d{4}$/.test(r[0]??''))
    .map(r=>({date:r[0].split('/').reverse().join('-'),fix:r[1]}))
  const latest=rows.filter(r=>/^\d+\.\d+$/.test(r.fix??''))
    .sort((a,b)=>b.date.localeCompare(a.date))[0]
  if(!latest||latest.date!==fx.observationDate||Number(latest.fix)!==fx.mxnPerUsd||
    fx.observationDate>fx.reviewedAt.slice(0,10)) throw new Error('BOX_FIX_OBSERVATION_OR_COLUMN_MISMATCH')
  return fx
}

export function calculateBoxProspectiveScenarios(rawPolicy:unknown,rawMarket:unknown,rawFx:unknown) {
  const policy=policySchema.parse(rawPolicy),market=marketSchema.parse(rawMarket),fx=fxSchema.parse(rawFx)
  if(new Set(policy.sources.map(s=>s.id)).size!==policy.sources.length) throw new Error('BOX_PROSPECTIVE_DUPLICATE_SOURCE')
  const contrast=market.trailerMarketContrast
  const newer=market.offers.find(o=>o.sourceId===policy.newerOfferId),older=market.offers.find(o=>o.sourceId===policy.olderOfferId)
  if(!newer||!older||contrast.newerOfferId!==newer.sourceId||contrast.olderOfferId!==older.sourceId||
    newer.taxTreatment!=='PLUS_IVA'||older.taxTreatment!=='UNRESOLVED'||
    new Set(contrast.matchedSpecificationFields).size<13||
    [newer,older].some(o=>o.resourceClass!=='DRY_VAN_TRAILER'||o.brand!=='Utility'||o.model!=='4000 D-X'||o.lengthFeet!==53||o.widthInches!==102)||
    contrast.matchedSpecificationFields.some(key=>newer[key]==null||older[key]==null||newer[key]!==older[key])||
    (newer.year-older.year)*12!==policy.holdingMonths) throw new Error('BOX_PROSPECTIVE_COMPARABILITY_MISMATCH')
  if(fx.observationDate>policy.reviewedAt.slice(0,10)||fx.reviewedAt>policy.reviewedAt) throw new Error('BOX_PROSPECTIVE_FX_FROM_FUTURE')
  const scenarios=(['NET_PLUS_VAT','GROSS_INCLUDES_VAT'] as const).map(olderQuoteBasis=>{
    // Share net-price normalization with the historical tax contrast, without
    // creating purchase-credit inputs or substituting zero for unknown VAT recovery.
    const tax=normalizeReferenceAskingTaxBasis({olderQuotedAmount:older.askingMxn,
      olderQuoteBasis,vatRate:policy.genericVatRateReference})
    const monthlyMxn=(newer.askingMxn-tax.olderNetAskingReference)/policy.holdingMonths
    if(monthlyMxn<=0) throw new Error('BOX_PROSPECTIVE_NONPOSITIVE_VALUE_LOSS')
    const monthlyUsd=monthlyMxn/fx.mxnPerUsd
    return {id:olderQuoteBasis,mode:'CASH' as const,olderTaxBasisIsAssumption:true,
      monthlyCapitalMxn:monthlyMxn,monthlyCapitalUsd:monthlyUsd,monthlyBudgetUsd:Math.round(monthlyUsd*100)/100,
      monthlyDebtInterestMxn:0,financedMonthlyCapitalMxn:null,terminalNetMarketProxyMxn:tax.olderNetAskingReference,
      modelFamilyResolvedWithinConditionalScenario:true,selected:false}
  })
  return {...policy,fx,scenarios,resourceId:'SHARED_TRAILER' as const,economicExpenseId:'SHARED_TRAILER_CAPITAL',
    alternativesNotAdded:true,selectedScenario:null,onePhysicalBox:true,actualAssetsOrDebtObserved:false,
    ageEffectIdentified:false,terminalValueIsObservedResidual:false,holdingIsRemainingLife:false,
    futureMarketConditionCertified:false,transactionChargesExcludedNotAssumedZero:true,
    purchaseVatRecoveryAssumedObserved:false,loanPrincipalAddedToExpense:false,
    equityOpportunityCostIncluded:false,equityOpportunityCostAssumedZero:false,
    actualAllInInvoiceComplete:false,wholePilotCostUsd:null,calibrated:false,quoteReady:false,adoptedValues:0}
}

/** Independent local CASH sensitivity budgets; never overwrite or select the baseline. */
export function applyBoxProspectiveCashScenario(rawBudget:unknown,rawPolicy:unknown,rawMarket:unknown,rawFx:unknown,rawId:unknown) {
  const budget=BinationalFixedBudgetSchema.parse(rawBudget),model=calculateBoxProspectiveScenarios(rawPolicy,rawMarket,rawFx)
  const id=z.enum(['NET_PLUS_VAT','GROSS_INCLUDES_VAT']).parse(rawId)
  const scenario=model.scenarios.find(s=>s.id===id)!
  if(budget.referencePeriod!==model.referencePeriod) throw new Error('BOX_PROSPECTIVE_PERIOD_MISMATCH')
  const resource=budget.resources.find(r=>r.resourceId==='SHARED_TRAILER')
  if(!resource||(resource.profileReference!==null&&resource.profileReference!==model.profileReference)) throw new Error('BOX_PROSPECTIVE_PROFILE_MISMATCH')
  const rows=budget.expenses.filter(e=>e.economicExpenseId===model.economicExpenseId)
  if(rows.length!==1) throw new Error('BOX_PROSPECTIVE_IDENTITY_MISMATCH')
  const row=rows[0]
  if(row.amount!==null) throw new Error('BOX_PROSPECTIVE_WOULD_OVERWRITE')
  if(row.family!=='CAPITAL'||row.basis!=='ECONOMIC_DEPRECIATION_PLUS_INTEREST_ONLY'||row.scope!=='DIRECT_RESOURCE'||
    row.allocations.length!==1||row.allocations[0].resourceId!=='SHARED_TRAILER'||row.allocations[0].share!==1) throw new Error('BOX_PROSPECTIVE_ALLOCATION_MISMATCH')
  const sources=[...model.sources,model.fx.source],ids=sources.map(s=>`BOX_PROSPECTIVE_${s.id}`)
  if(new Set(ids).size!==ids.length||budget.evidence.some(e=>ids.includes(e.id))) throw new Error('BOX_PROSPECTIVE_DUPLICATE_EVIDENCE')
  resource.profileReference=model.profileReference
  budget.evidence.push(...sources.map((s,i)=>({id:ids[i],url:s.url,locator:s.locator,
    observedAt:model.reviewedAt.slice(0,10),referencePeriod:model.referencePeriod,groupReference:budget.groupReference,
    resourceIds:['SHARED_TRAILER' as const],profileReferences:[{resourceId:'SHARED_TRAILER' as const,profileReference:model.profileReference}],
    kind:'DOCUMENTED_PUBLIC_MODEL' as const,limitations:model.modelAssumptions.join('; ')})))
  row.amount={value:scenario.monthlyBudgetUsd,unit:'USD/month',referencePeriod:model.referencePeriod,evidenceIds:ids,
    kind:'DOCUMENTED_PUBLIC_MODEL',derivation:`CASH conditional ${id}: (newer net asking - older net asking proxy)/24/${model.fx.mxnPerUsd}; FIX ${model.fx.observationDate}; final USD cents only. Cross-section planning analogy, not identified depreciation or observed future residual. No box financing modeled.`}
  row.allocationRationale='One shared box once; independent cash tax-basis alternative, not summed with another box or selected baseline. No purchase/VAT-settlement event.'
  return {budget,model,scenario}
}
