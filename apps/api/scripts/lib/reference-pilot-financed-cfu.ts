import {z} from 'zod'
import {allocateFixedCost} from '../../src/modules/engine/fixed-cost-allocation.js'

const p=z.number().finite().positive().max(1e12),n=z.number().finite().nonnegative().max(1e12)
const resource=z.enum(['MX_TRACTOR','US_TRACTOR','SHARED_TRAILER'])
const cycle=z.enum(['NETWORK_EXPECTED_EMPTY_PROXY','DEDICATED_EMPTY_SAME_BOX_RETURN'])
const tax=z.enum(['NET_PLUS_VAT','GROSS_INCLUDES_VAT'])
const feeTax=z.enum(['FEE_VAT_CREDITABLE_ASSUMPTION','FEE_VAT_NOT_CREDITABLE_ASSUMPTION'])
const rest=z.enum(['RATE_EXCLUDES_WEEKLY_REST','RATE_INCLUDES_WEEKLY_REST'])
const policySchema=z.object({model:z.literal('FCM_THREE_RESOURCE_FINANCED_PILOT_COMPONENTS_V1'),reviewedAt:z.string().datetime(),referencePeriod:z.literal('2026-10'),
  scope:z.literal('SAME_OWN_MX_US_RELAY_ONE_BOX_AND_SAME_KNOWN_CYCLE_EXPOSURE'),measurement:z.literal('REPLACE_THREE_CASH_CAPITAL_LINES_WITH_PUBLIC_FINANCE_COMPONENTS_NOT_DEBT_SERVICE'),
  sourceRefs:z.array(z.string()).min(5),planningAssumptions:z.array(z.string()).min(8),adoptedValues:z.literal(0),quoteReady:z.literal(false)}).strict()
const baseSchema=z.array(z.object({id:z.string(),modeledFleetPairs:z.literal(1),oneSharedBox:z.literal(true),
  lines:z.array(z.object({id:z.string(),resourceId:resource,monthlyUsd:n}).passthrough()),
  knownResourceMonthlyComponents:z.object({MX_TRACTOR:p,US_TRACTOR:p,SHARED_TRAILER:p}).strict(),knownMonthlyComponentUsd:p,
  completeFixedBudgetUsd:z.null(),completeD2DCostUsd:z.null()}).passthrough()).length(2)
const physicalSchema=z.object({scenarios:z.array(z.object({id:cycle,physicalDistanceComplete:z.literal(false),sameBoxChargedOnce:z.literal(true),adminPoolChargedOnce:z.literal(true),
  conditionalFixedAllocations:z.array(z.object({monthlyComponentScenarioId:z.string(),conditionalComponentAllocationUsd:p,resources:z.array(z.object({resourceId:resource,
    knownMonthlyComponentUsd:p,knownClockByTimeUsd:p,oldDistanceProxyByKmUsd:p,conditionalOldDistanceKnownClockMaxUsd:p}).passthrough()).length(3)}).passthrough()).length(2)}).passthrough()).length(2)}).passthrough()
const cashSchema=z.object({scenarios:z.array(z.object({id:z.string(),cycleScenarioId:cycle,restInterpretation:rest,monthlyComponentScenarioId:z.string(),
  fixedComponents:z.array(z.object({id:z.string(),resourceId:resource,amountUsd:p}).strict()).length(4),
  variableComponents:z.array(z.object({id:z.string(),amountUsd:p}).strict()).length(2),
  knownCfuComponentUsd:p,knownCvuComponentUsd:p,totalKnownComponentsUsd:p,
  completeCfuUsd:z.null(),completeCvuUsd:z.null(),completeD2DCostUsd:z.null(),sameBoxChargedOnce:z.literal(true),adminPoolChargedOnce:z.literal(true)}).passthrough()).length(8)}).passthrough()
const usSchema=z.object({referencePeriod:z.literal('2026-10'),resourceId:z.literal('US_TRACTOR'),holdingMonths:z.literal(36),
  modes:z.object({CASH:z.object({monthlyBudgetUsd:p}).passthrough(),FINANCED:z.object({monthlyBudgetUsd:p}).passthrough()}).passthrough(),
  debt:z.object({annualNominalHypothesis:z.literal(.09),remainingTermHypothesisMonths:z.literal(72)}).passthrough(),
  publishedAprConvertedToNominal:z.literal(false),loanPrincipalAddedToExpense:z.literal(false)}).passthrough()
const mxSchema=z.array(z.object({id:z.enum(['CASH','FINANCED_LOW','FINANCED_HIGH']),monthlyBudgetUsd:p,selected:z.literal(false)}).passthrough()).length(3)
const boxSchema=z.object({scenarios:z.array(z.object({id:z.string(),cashTaxScenario:tax,resourceId:z.literal('SHARED_TRAILER'),financedShare:z.union([z.literal(.8),z.literal(1)]),annualRate:z.union([z.literal(.15),z.literal(.38)]),
  principalMxn:p,termMonths:z.literal(24),cashValueLossMonthlyMxn:p,averageInterestMxn:p,openingFeeNetMxn:p,
  feeTaxAlternatives:z.array(z.object({id:feeTax,economicFeeMxn:p,feeAllocationMxn:p,monthlyCapitalComponentMxn:p,monthlyCapitalComponentUsd:p}).passthrough()).length(2),
  principalOrDebtServiceAddedToEconomicExpense:z.literal(false),oneSharedBox:z.literal(true),selected:z.literal(false)}).passthrough()).length(8),
  actualDebtObserved:z.literal(false),publishedCatConvertedToInterest:z.literal(false),externalCalls:z.literal(false)}).passthrough()
const cents=(v:number)=>Math.round(v*100)/100
const close=(a:number,b:number)=>Math.abs(a-b)<1e-7
const capitalIds={MX_TRACTOR:'MX_TRACTOR_CAPITAL',US_TRACTOR:'US_TRACTOR_CAPITAL',SHARED_TRAILER:'SHARED_TRAILER_CAPITAL'} as const

/** Funding changes asset cost, not physical exposure or operating quantities.
 * Reuse resource MAX; replace three capital lines, never add debt service to them.
 * This joins known partial costs, not a completed carrier budget or quote. */
export function calculatePilotFinancedCfu(rawPolicy:unknown,rawBase:unknown,rawPhysical:unknown,rawCash:unknown,rawUs:unknown,rawMx:unknown,rawBox:unknown,rawFx:unknown){
  const policy=policySchema.parse(rawPolicy),base=baseSchema.parse(rawBase),physical=physicalSchema.parse(rawPhysical),cash=cashSchema.parse(rawCash)
  const us=usSchema.parse(rawUs),mx=mxSchema.parse(rawMx),box=boxSchema.parse(rawBox),fx=z.object({mxnPerUsd:z.literal(18.3688)}).passthrough().parse(rawFx)
  if(new Set(base.map(b=>b.id)).size!==2||new Set(physical.scenarios.map(s=>s.id)).size!==2||new Set(mx.map(s=>s.id)).size!==3||
    new Set(cash.scenarios.map(s=>`${s.cycleScenarioId}:${s.restInterpretation}:${s.monthlyComponentScenarioId}`)).size!==8||
    new Set(box.scenarios.map(s=>`${s.cashTaxScenario}:${s.financedShare}:${s.annualRate}`)).size!==8||new Set(box.scenarios.map(s=>s.id)).size!==8)throw new Error('FINANCED_PILOT_DUPLICATE_SCOPE')
  const mxCash=mx.find(s=>s.id==='CASH')!
  if(us.modes.FINANCED.monthlyBudgetUsd<=us.modes.CASH.monthlyBudgetUsd||mx.some(s=>s.id!=='CASH'&&s.monthlyBudgetUsd<=mxCash.monthlyBudgetUsd))throw new Error('FINANCED_PILOT_CAPITAL_SCOPE_MISMATCH')
  const monthlyScenarios=base.flatMap(b=>{
    const taxId=(['NET_PLUS_VAT','GROSS_INCLUDES_VAT'] as const).find(id=>b.id===`ALL_CAPITAL_CASH_${id}_PUBLIC_ADMIN_SCALE`)
    if(!taxId||new Set(b.lines.map(l=>l.id)).size!==b.lines.length||!close(b.lines.reduce((sum,l)=>sum+l.monthlyUsd,0),b.knownMonthlyComponentUsd))throw new Error('FINANCED_PILOT_BASE_SCOPE_MISMATCH')
    const capital=(Object.keys(capitalIds) as (keyof typeof capitalIds)[]).map(r=>{
      const rows=b.lines.filter(l=>l.id===capitalIds[r]);if(rows.length!==1||rows[0].resourceId!==r)throw new Error('FINANCED_PILOT_CAPITAL_ROW_MISMATCH')
      if(!close(b.lines.filter(l=>l.resourceId===r).reduce((sum,l)=>sum+l.monthlyUsd,0),b.knownResourceMonthlyComponents[r]))throw new Error('FINANCED_PILOT_RESOURCE_SUM_MISMATCH')
      return rows[0]
    })
    if(!close(capital[0].monthlyUsd,mxCash.monthlyBudgetUsd)||!close(capital[1].monthlyUsd,us.modes.CASH.monthlyBudgetUsd))throw new Error('FINANCED_PILOT_CASH_ANCHOR_MISMATCH')
    return box.scenarios.filter(s=>s.cashTaxScenario===taxId).flatMap(s=>{
      if(!close(s.principalMxn,630000*s.financedShare)||!close(s.openingFeeNetMxn,s.principalMxn*.01)||
        !close(capital[2].monthlyUsd,cents(s.cashValueLossMonthlyMxn/fx.mxnPerUsd))||new Set(s.feeTaxAlternatives.map(f=>f.id)).size!==2)throw new Error('FINANCED_PILOT_BOX_SCOPE_MISMATCH')
      return s.feeTaxAlternatives.flatMap(f=>{
        const feeMxn=s.openingFeeNetMxn*(f.id==='FEE_VAT_CREDITABLE_ASSUMPTION'?1:1.16)
        if(!close(f.economicFeeMxn,feeMxn)||!close(f.feeAllocationMxn,feeMxn/24)||!close(f.monthlyCapitalComponentMxn,s.cashValueLossMonthlyMxn+s.averageInterestMxn+f.feeAllocationMxn)||
          !close(f.monthlyCapitalComponentUsd,f.monthlyCapitalComponentMxn/fx.mxnPerUsd))throw new Error('FINANCED_PILOT_BOX_FEE_NOT_CONSERVED')
        return mx.filter(m=>m.id!=='CASH').map(m=>{
          const replacements={MX_TRACTOR:m.monthlyBudgetUsd,US_TRACTOR:us.modes.FINANCED.monthlyBudgetUsd,SHARED_TRAILER:cents(f.monthlyCapitalComponentUsd)}
          const lines=b.lines.map(l=>l.id===capitalIds[l.resourceId]?{...l,monthlyUsd:replacements[l.resourceId],kind:'FINANCED_PUBLIC_CAPITAL_COMPONENT'}:{...l})
          const resourceMonthly=Object.fromEntries((Object.keys(capitalIds) as (keyof typeof capitalIds)[]).map(r=>[r,lines.filter(l=>l.resourceId===r).reduce((sum,l)=>sum+l.monthlyUsd,0)])) as Record<keyof typeof capitalIds,number>
          return {id:`${b.id}:${m.id}:${s.id}:${f.id}`,cashBaseId:b.id,boxTaxScenario:taxId,mxFinanceScenarioId:m.id,usFinanceScenarioId:'FINANCED',
            boxFinanceScenarioId:s.id,boxFeeTaxScenarioId:f.id,boxFinancedShare:s.financedShare,boxAnnualRate:s.annualRate,
            lines,resourceMonthly,knownMonthlyComponentUsd:lines.reduce((sum,l)=>sum+l.monthlyUsd,0),
            capitalReplacements:capital.map(l=>({resourceId:l.resourceId,id:l.id,cashMonthlyUsd:l.monthlyUsd,financedMonthlyUsd:replacements[l.resourceId],monthlyDeltaUsd:replacements[l.resourceId]-l.monthlyUsd})),
            oneSharedBox:true,adminPoolUnchanged:true,completeMonthlyBudgetUsd:null,selected:false}
        })
      })
    })
  })
  const scenarios=monthlyScenarios.flatMap(m=>cash.scenarios.filter(c=>c.monthlyComponentScenarioId===m.cashBaseId).map(c=>{
    const clocks=physical.scenarios.find(s=>s.id===c.cycleScenarioId)!.conditionalFixedAllocations
    const clock=clocks.filter(s=>s.monthlyComponentScenarioId===m.cashBaseId)
    if(clock.length!==1||new Set(clock[0].resources.map(r=>r.resourceId)).size!==3||new Set(clocks.map(s=>s.monthlyComponentScenarioId)).size!==2)throw new Error('FINANCED_PILOT_EXPOSURE_IDENTITY_MISMATCH')
    if(!close(clock[0].resources.reduce((sum,r)=>sum+r.conditionalOldDistanceKnownClockMaxUsd,0),clock[0].conditionalComponentAllocationUsd))throw new Error('FINANCED_PILOT_EXPOSURE_SUM_MISMATCH')
    const b=base.find(s=>s.id===m.cashBaseId)!
    const resourceAllocations=clock[0].resources.map(r=>{
      const oldFixed=c.fixedComponents.filter(f=>f.id===`BASE_FIXED:${r.resourceId}`)
      if(!close(r.knownMonthlyComponentUsd,b.knownResourceMonthlyComponents[r.resourceId])||oldFixed.length!==1||oldFixed[0].resourceId!==r.resourceId||
        !close(oldFixed[0].amountUsd,r.conditionalOldDistanceKnownClockMaxUsd)||!close(r.conditionalOldDistanceKnownClockMaxUsd,allocateFixedCost(r.oldDistanceProxyByKmUsd,r.knownClockByTimeUsd)))throw new Error('FINANCED_PILOT_EXPOSURE_SCOPE_MISMATCH')
      const distanceExposure=r.oldDistanceProxyByKmUsd/r.knownMonthlyComponentUsd,timeExposure=r.knownClockByTimeUsd/r.knownMonthlyComponentUsd
      const financedFixedUsd=allocateFixedCost(m.resourceMonthly[r.resourceId]*distanceExposure,m.resourceMonthly[r.resourceId]*timeExposure)
      return {resourceId:r.resourceId,distanceExposure,timeExposure,cashFixedUsd:r.conditionalOldDistanceKnownClockMaxUsd,financedFixedUsd,
        financeDeltaUsd:financedFixedUsd-r.conditionalOldDistanceKnownClockMaxUsd}
    })
    if(new Set(c.fixedComponents.map(f=>f.id)).size!==4||!close(c.fixedComponents.reduce((sum,f)=>sum+f.amountUsd,0),c.knownCfuComponentUsd)||
      !close(c.variableComponents.reduce((sum,f)=>sum+f.amountUsd,0),c.knownCvuComponentUsd)||!close(c.totalKnownComponentsUsd,c.knownCfuComponentUsd+c.knownCvuComponentUsd)||
      c.fixedComponents.filter(f=>f.id==='MX_DRIVER_FIXED_EM_QUOTA'&&f.resourceId==='MX_TRACTOR').length!==1)throw new Error('FINANCED_PILOT_CASH_COST_NOT_CONSERVED')
    const fixedComponents=c.fixedComponents.map(f=>{const r=resourceAllocations.find(r=>f.id===`BASE_FIXED:${r.resourceId}`);return {...f,amountUsd:r?r.financedFixedUsd:f.amountUsd}})
    const knownCfuComponentUsd=fixedComponents.reduce((sum,f)=>sum+f.amountUsd,0),financeDeltaUsd=knownCfuComponentUsd-c.knownCfuComponentUsd
    return {id:`${c.id}:${m.id}`,cycleScenarioId:c.cycleScenarioId,restInterpretation:c.restInterpretation,cashComparisonId:c.id,monthlyFinanceScenarioId:m.id,
      paymentMode:'FINANCED',cashKnownCfuComponentUsd:c.knownCfuComponentUsd,cashKnownCvuComponentUsd:c.knownCvuComponentUsd,cashKnownTotalComponentsUsd:c.totalKnownComponentsUsd,
      fixedComponents,variableComponents:c.variableComponents.map(f=>({...f})),resourceAllocations,financeDeltaUsd,
      knownCfuComponentUsd,knownCvuComponentUsd:c.knownCvuComponentUsd,totalKnownComponentsUsd:knownCfuComponentUsd+c.knownCvuComponentUsd,
      samePhysicalExposure:true,sameDriverAndRoadComponents:true,boxChargedOnce:true,adminPoolChargedOnce:true,threeCapitalRowsReplacedOnce:true,
      debtPrincipalOrWholePaymentAdded:false,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,selected:false,quoteReady:false,isLowerBound:false}
  }))
  if(monthlyScenarios.length!==32||scenarios.length!==128||new Set(scenarios.map(s=>s.id)).size!==128)throw new Error('FINANCED_PILOT_GRID_NOT_CONSERVED')
  return {...policy,monthlyScenarios,scenarios,cashScenarioIds:cash.scenarios.map(s=>s.id),originalCashAlternativesChanged:false,
    monthsAreDeclaredWindowMeansNotFirstDebtPayments:true,actualDebtsOrFinanceApprovalsObserved:false,allAlternativesAddedTogether:false,
    equityRequiredReturnUsd:null,completeFixedCompanyInsuranceUsd:null,completeDriverDutyUsd:null,completePhysicalCoverage:false,
    completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,externalWrites:false,
    remaining:['COMPLETE_COMPANY_INSURANCE_PERMIT_AND_PHYSICAL_SCOPE','DRIVER_DUTY_WAIT_IDLE_DEF_OTHER_VARIABLES',
      'FINANCE_ANCILLARY_TAX_CASH_REQUIREMENTS_AND_EQUITY_POLICY_NOT_OBSERVED']}
}
