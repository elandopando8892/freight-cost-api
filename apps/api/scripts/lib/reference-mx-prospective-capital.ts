import {z} from 'zod'
import {BinationalFixedBudgetSchema} from '../../src/modules/engine/benchmark-binational-budget.js'
import {calculateReferenceDebtSchedule} from './reference-debt-schedule.js'
import {verifyDatedFixArchive} from './reference-box-prospective-capital.js'

const text=z.string().min(1)
const offer=z.object({sourceId:z.enum(['RODAL_2021','TODOCAMION_2019']),year:z.number().int().min(2000).max(2100),
  country:z.literal('MX'),currency:z.literal('MXN'),currencyBasis:z.enum(['PUBLISHED_MXN','DECLARED_MXN_HYPOTHESIS_FROM_MEXICO_LOCAL_AD']),
  askingNet:z.number().finite().positive().max(1e12),taxTreatment:z.literal('PLUS_IVA'),brand:z.literal('Freightliner'),
  model:z.literal('Cascadia'),engine:z.literal('DD15'),powerHp:z.literal(450),transmission:z.literal('MANUAL'),
  speeds:z.literal(18),differentialLb:z.literal(46000),odometerKm:z.number().finite().nonnegative().nullable()}).strict()
const schema=z.object({model:z.literal('FCM_MX_TRACTOR_PROSPECTIVE_CONDITIONAL_V1'),reviewedAt:z.string().datetime(),
  referencePeriod:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  profileReference:z.literal('MX_USED_CASCADIA2021_MANUAL_D2D_OWN_RELAY_REFERENCE_V1'),
  permissionEvidence:z.literal('USER_AUTORIZO_CAMBIO_METODOLOGICO_2026_10_02'),
  measurement:z.literal('NET_MARKET_VALUE_USE_NO_PURCHASE_OR_DISPOSAL_EVENT'),conditionalPlanningOnly:z.literal(true),
  holdingMonths:z.number().int().positive().max(360),offers:z.array(offer).length(2),
  finance:z.object({rateKind:z.literal('EXPLICIT_PLANNING_NOMINAL_ANNUAL'),
    annualNominalHypotheses:z.tuple([z.literal(0.115),z.literal(0.157)]),existingBalanceFractionHypothesis:z.literal(0.8),
    remainingTermHypothesisMonths:z.literal(60),publishedOfferExpired:z.literal(true),providerNominalBasisConfirmed:z.literal(false),
    newOriginationEvent:z.literal(false)}).strict(),
  modelAssumptions:z.array(text).min(1),sources:z.array(z.object({id:text,url:z.string().url(),locator:text,
    archive:z.object({file:text,sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict()}).strict()).length(3),
}).strict()
const rodalSchema=z.object({sourceId:z.literal('RODAL_2021'),year:z.literal(2021),askingMxn:z.number().finite().positive(),
  taxTreatment:z.literal('PLUS_IVA'),engine:z.literal('DD15'),transmission:z.literal('MANUAL_18_SPEEDS'),
  differentialLb:z.literal(46000),odometerKm:z.number().finite().nonnegative()}).passthrough()

export function calculateMxProspectiveCapital(rawPolicy:unknown,rawRodal:unknown,rawFx:unknown,fxHtml:string) {
  const policy=schema.parse(rawPolicy),rodal=rodalSchema.parse(rawRodal),fx=verifyDatedFixArchive(rawFx,fxHtml)
  if(new Set(policy.sources.map(s=>s.id)).size!==3) throw new Error('MX_PROSPECTIVE_DUPLICATE_SOURCE')
  const newer=policy.offers.find(o=>o.sourceId==='RODAL_2021'),older=policy.offers.find(o=>o.sourceId==='TODOCAMION_2019')
  if(!newer||!older||newer.year!==rodal.year||newer.askingNet!==rodal.askingMxn||newer.odometerKm!==rodal.odometerKm||
    (newer.year-older.year)*12!==policy.holdingMonths||newer.askingNet<=older.askingNet||
    newer.currencyBasis!=='PUBLISHED_MXN'||older.currencyBasis!=='DECLARED_MXN_HYPOTHESIS_FROM_MEXICO_LOCAL_AD') throw new Error('MX_PROSPECTIVE_REFERENCE_MISMATCH')
  if(fx.reviewedAt>policy.reviewedAt) throw new Error('MX_PROSPECTIVE_FUTURE_FX')
  const loss=(newer.askingNet-older.askingNet)/policy.holdingMonths
  const existingPrincipal=newer.askingNet*policy.finance.existingBalanceFractionHypothesis
  const scenarios=[{id:'CASH',mode:'CASH' as const,monthlyCapitalMxn:loss,monthlyDebtInterestMxn:0,annualNominalHypothesis:null,
    existingBalanceProxyMxn:0,regularDebtPaymentMxn:null,balanceAtWindowEndMxn:null},
    ...policy.finance.annualNominalHypotheses.map(rate=>{
      const debt=calculateReferenceDebtSchedule({currency:'MXN',principal:existingPrincipal,rateKind:policy.finance.rateKind,
        annualRate:rate,termMonths:policy.finance.remainingTermHypothesisMonths,comparisonMonths:policy.holdingMonths,
        totalGraceMonths:0,graceTreatment:'CAPITALIZE_MONTHLY_INTEREST',openingFeeCash:0,
        feeTreatment:'PAID_UPFRONT_EXCLUDED_FROM_PRINCIPAL',balloon:0})
      return {id:rate===0.115?'FINANCED_LOW':'FINANCED_HIGH',mode:'FINANCED' as const,
        monthlyCapitalMxn:loss+debt.averageInterestOverComparisonMonths,
        monthlyDebtInterestMxn:debt.averageInterestOverComparisonMonths,annualNominalHypothesis:rate,
        existingBalanceProxyMxn:existingPrincipal,regularDebtPaymentMxn:debt.regularPaymentAfterGrace,
        balanceAtWindowEndMxn:debt.rows[Math.min(policy.holdingMonths,debt.rows.length)-1].closingBalance}
    })].map(s=>({...s,monthlyCapitalUsd:s.monthlyCapitalMxn/fx.mxnPerUsd,
      monthlyBudgetUsd:Math.round(s.monthlyCapitalMxn/fx.mxnPerUsd*100)/100,selected:false}))
  return {...policy,fx,scenarios,resourceId:'MX_TRACTOR' as const,economicExpenseId:'MX_TRACTOR_CAPITAL',
    marketUseLossMonthlyMxn:loss,selectedScenario:null,alternativesNotAdded:true,
    ageEffectIdentified:false,terminalValueIsObservedResidual:false,holdingIsRemainingLife:false,
    publishedCurrencyCodeForOlderOffer:false,actualAssetsOrDebtObserved:false,
    actualAllInInvoiceComplete:false,unknownTransactionChargesSetToZero:false,
    debtHelperZeroOpeningFeeIsNoOriginationEventNotObservedFreeLoan:true,
    publishedRateOrCatConvertedToConfirmedNominal:false,loanPrincipalAddedToExpense:false,
    equityOpportunityCostAssumedZero:false,wholePilotCostUsd:null,calibrated:false,quoteReady:false,adoptedValues:0}
}

export function applyMxProspectiveCapitalScenario(rawBudget:unknown,rawPolicy:unknown,rawRodal:unknown,rawFx:unknown,fxHtml:string,rawId:unknown) {
  const budget=BinationalFixedBudgetSchema.parse(rawBudget),model=calculateMxProspectiveCapital(rawPolicy,rawRodal,rawFx,fxHtml)
  const id=z.enum(['CASH','FINANCED_LOW','FINANCED_HIGH']).parse(rawId),scenario=model.scenarios.find(s=>s.id===id)!
  if(budget.referencePeriod!==model.referencePeriod) throw new Error('MX_PROSPECTIVE_PERIOD_MISMATCH')
  const resource=budget.resources.find(r=>r.resourceId==='MX_TRACTOR')
  if(!resource||(resource.profileReference!==null&&resource.profileReference!==model.profileReference)) throw new Error('MX_PROSPECTIVE_PROFILE_MISMATCH')
  const rows=budget.expenses.filter(e=>e.economicExpenseId===model.economicExpenseId)
  if(rows.length!==1) throw new Error('MX_PROSPECTIVE_IDENTITY_MISMATCH')
  const row=rows[0]
  if(row.amount!==null) throw new Error('MX_PROSPECTIVE_WOULD_OVERWRITE')
  if(row.family!=='CAPITAL'||row.basis!=='ECONOMIC_DEPRECIATION_PLUS_INTEREST_ONLY'||row.scope!=='DIRECT_RESOURCE'||
    row.allocations.length!==1||row.allocations[0].resourceId!=='MX_TRACTOR'||row.allocations[0].share!==1) throw new Error('MX_PROSPECTIVE_ALLOCATION_MISMATCH')
  const sources=[...model.sources,model.fx.source],ids=sources.map(s=>`MX_PROSPECTIVE_${s.id}`)
  if(new Set(ids).size!==ids.length||budget.evidence.some(e=>ids.includes(e.id))) throw new Error('MX_PROSPECTIVE_DUPLICATE_EVIDENCE')
  resource.profileReference=model.profileReference
  budget.evidence.push(...sources.map((s,i)=>({id:ids[i],url:s.url,locator:s.locator,
    observedAt:model.reviewedAt.slice(0,10),referencePeriod:model.referencePeriod,groupReference:budget.groupReference,
    resourceIds:['MX_TRACTOR' as const],profileReferences:[{resourceId:'MX_TRACTOR' as const,profileReference:model.profileReference}],
    kind:'DOCUMENTED_PUBLIC_MODEL' as const,limitations:model.modelAssumptions.join('; ')})))
  row.amount={value:scenario.monthlyBudgetUsd,unit:'USD/month',referencePeriod:model.referencePeriod,evidenceIds:ids,
    kind:'DOCUMENTED_PUBLIC_MODEL',derivation:`${id}: (1198275.86 - 750000)/24 + mean24month declared existing-debt interest; MXN/FIX ${model.fx.mxnPerUsd} dated${model.fx.observationDate}; final cents only. Conditional cross-section analogy, not calibrated depreciation or actual lender terms.`}
  row.allocationRationale='One MX tractor only; alternative payment modes not added. No shared box, US tractor or admin expense in this row.'
  return {budget,model,scenario}
}
