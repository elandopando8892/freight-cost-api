import { z } from 'zod'
import { BinationalFixedBudgetSchema } from '../../src/modules/engine/benchmark-binational-budget.js'
import { normalizeInsuranceReference } from './reference-insurance-employer.js'
import { verifyDatedFixArchive } from './reference-box-prospective-capital.js'

const text=z.string().min(1)
const schema=z.object({model:z.literal('FCM_MX_TRACTOR_INSURANCE_PUBLIC_MODEL_V1'),reviewedAt:z.string().datetime(),
  referencePeriod:z.literal('2026-10'),profileReference:z.literal('MX_USED_CASCADIA2021_MANUAL_D2D_OWN_RELAY_REFERENCE_V1'),
  year:z.literal(2021),coverage:z.literal('AMPLIA'),annualGrossMxn:z.literal(116952),measurementDate:z.literal('2026-09-24'),
  taxBasis:z.literal('PUBLISHED_GROSS_REFERENCE_NO_TAX_CREDIT_DEDUCTION'),territory:z.literal('MX_DOMESTIC_TRACTOR_ONLY'),
  paymentModes:z.tuple([z.literal('CASH'),z.literal('FINANCED')]),modelAssumptions:z.array(text).min(7),
  source:z.object({id:z.literal('TIMI_CASCADIA2021_YEAR_TABLE'),url:z.literal('https://timi.mx/guias/cuanto-cuesta-seguro-tractocamion'),locator:text,
    archive:z.object({file:text,sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict()}).strict(),
}).strict()

/** Pin verification is owned by the read-only consolidator; verify table identity too. */
export function calculateMxTractorInsurancePublicModel(raw:unknown,html:string,rawFx:unknown,fxHtml:string) {
  const input=schema.parse(raw),fx=verifyDatedFixArchive(rawFx,fxHtml)
  if(fx.reviewedAt>input.reviewedAt||input.measurementDate>input.reviewedAt.slice(0,10)) throw new Error('MX_INSURANCE_FUTURE_EVIDENCE')
  const tables=[...html.replace(/<!--[\s\S]*?-->/g,'').matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)]
    .map(m=>m[1]).filter(t=>/<caption>Precio anual por año de la unidad/.test(t))
  if(tables.length!==1) throw new Error('MX_INSURANCE_YEAR_TABLE_IDENTITY_MISMATCH')
  const table=tables[0]
  const headers=[...table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>m[1].replace(/<[^>]*>/g,'').trim())
  const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(m=>[...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(c=>c[1].replace(/<[^>]*>/g,'').trim()))
    .filter(r=>r[0]==='2021')
  if(headers[4]!=='Freightliner Cascadia · Amplia'||rows.length!==1||rows[0].length!==5||
    Number(rows[0][4].replace(/[$,]/g,''))!==input.annualGrossMxn||
    !table.includes('24 de septiembre de 2026')||!table.includes('con IVA')||
    !html.includes('derecho de póliza ($790)')) throw new Error('MX_INSURANCE_YEAR_TABLE_OBSERVATION_MISMATCH')
  const normalized=normalizeInsuranceReference({amount:input.annualGrossMxn,currency:'MXN',basis:'ANNUAL_AMOUNT',termMonths:null})
  const monthlyGrossMxn=normalized.monthlyMoneyReference,monthlyExactUsd=monthlyGrossMxn/fx.mxnPerUsd
  return {...input,fx,monthlyGrossMxn,monthlyExactUsd,monthlyBudgetUsd:Math.round(monthlyExactUsd*100)/100,
    economicExpenseId:'MX_TRACTOR_INSURANCE',resourceId:'MX_TRACTOR' as const,
    actualVatRecoverability:null,netEconomicPremiumMxn:null,matchedPolicyObserved:false,
    boxCoverageProven:false,cargoCoverageProven:false,borderCoverageProven:false,
    completeBinationalInsurance:false,premiumFinanceModeled:false,calibrated:false,quoteReady:false,adoptedValues:0,
    unresolvedCoverage:['MX_CARGO_COVERAGE_AND_ALLOCATION','BORDER_INTERCHANGE_TERRITORIAL_TERMS'],
  }
}

/** One domestic tractor model row in a copy, not closure of all D2D insurance. */
export function applyMxTractorInsurancePublicModel(rawBudget:unknown,raw:unknown,html:string,rawFx:unknown,fxHtml:string) {
  const budget=BinationalFixedBudgetSchema.parse(rawBudget),model=calculateMxTractorInsurancePublicModel(raw,html,rawFx,fxHtml)
  const resource=budget.resources.find(r=>r.resourceId==='MX_TRACTOR')
  if(budget.referencePeriod!==model.referencePeriod) throw new Error('MX_INSURANCE_PERIOD_MISMATCH')
  if(!resource||(resource.profileReference!==null&&resource.profileReference!==model.profileReference)) throw new Error('MX_INSURANCE_PROFILE_MISMATCH')
  const rows=budget.expenses.filter(e=>e.economicExpenseId===model.economicExpenseId)
  if(rows.length!==1) throw new Error('MX_INSURANCE_ROW_IDENTITY_MISMATCH')
  const row=rows[0]
  if(row.amount!==null) throw new Error('MX_INSURANCE_WOULD_OVERWRITE')
  if(row.family!=='INSURANCE'||row.scope!=='DIRECT_RESOURCE'||row.basis!=='PERIOD_PREMIUM_NORMALIZED_ONCE'||
    row.allocations.length!==1||row.allocations[0].resourceId!=='MX_TRACTOR'||row.allocations[0].share!==1) throw new Error('MX_INSURANCE_ALLOCATION_MISMATCH')
  const sources=[model.source,model.fx.source],ids=sources.map(s=>`MX_INSURANCE_${s.id}`)
  if(new Set(ids).size!==ids.length||budget.evidence.some(e=>ids.includes(e.id))) throw new Error('MX_INSURANCE_DUPLICATE_EVIDENCE')
  resource.profileReference=model.profileReference
  budget.evidence.push(...sources.map((s,i)=>({id:ids[i],url:s.url,locator:s.locator,
    observedAt:model.reviewedAt.slice(0,10),referencePeriod:model.referencePeriod,groupReference:budget.groupReference,
    resourceIds:['MX_TRACTOR' as const],profileReferences:[{resourceId:'MX_TRACTOR' as const,profileReference:model.profileReference}],
    kind:'DOCUMENTED_PUBLIC_MODEL' as const,limitations:model.modelAssumptions.join('; ')})))
  row.amount={value:model.monthlyBudgetUsd,unit:'USD/month',referencePeriod:model.referencePeriod,evidenceIds:ids,
    kind:'DOCUMENTED_PUBLIC_MODEL',derivation:`116952MXN annual gross /12 /FIX${model.fx.mxnPerUsd}; final monthly USD cents; no extra fee, discount, cargo, trailer or VAT-credit deduction.`}
  row.allocationRationale='One MX domestic tractor Amplia category proxy, same cash/asset-financed reference. Cargo/border terms still unresolved separately, not insured implicitly.'
  return {budget,model}
}
