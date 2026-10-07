import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import { BinationalFixedBudgetSchema, BINATIONAL_RESOURCES, reconcileBinationalFixedBudget } from '../src/modules/engine/benchmark-binational-budget.js'
import { splitEqualCents } from './lib/reference-central-admin-pool.js'
import { consolidateBinationalReferenceBudget, REFERENCE_BUDGET_PINS } from './consolidate-binational-reference-budget.js'
import { allocateFixedCost } from '../src/modules/engine/fixed-cost-allocation.js'
import { readLocalDocument } from './assemble-economic-reference-cards.js'
import { CURRENT_REGISTER, reconcileEconomicModelInventory } from './reconcile-economic-model-inventory.js'
import { PUBLIC_LIABILITY_ALTERNATIVE_IDS, readCrossborderLiabilityPlanning } from './lib/reference-crossborder-liability-forecast.js'

type Research = ReturnType<typeof consolidateBinationalReferenceBudget>
type Budget = z.infer<typeof BinationalFixedBudgetSchema>
type Resource = typeof BINATIONAL_RESOURCES[number]
const optionsSchema = z.object({
  cashTaxScenario: z.enum(['NET_PLUS_VAT', 'GROSS_INCLUDES_VAT']),
  financeMonthlyScenarioId: z.string().min(1).nullable(),
  boxInsuranceAlternativeId: z.enum(['PUBLIC_GUIDE_LOW', 'PUBLIC_GUIDE_HIGH']),
  mxYardAlternativeId: z.enum(['NET_PLUS_VAT_RESERVE', 'PRICE_ALREADY_GROSS_SENSITIVITY']),
  foreignLiabilityAlternativeId: z.enum(PUBLIC_LIABILITY_ALTERNATIVE_IDS).nullable().optional(),
}).strict()
const sourceSchema = z.object({ id: z.string().min(1), url: z.string().url(), locator: z.string().optional() }).passthrough()
const cents = (amount: number) => {
  if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(Math.round(amount * 100))) throw new Error('INVALID_MONTHLY_COMPONENT')
  return Math.round(amount * 100) / 100
}

/** Copy and assemble existing public-model amounts into the existing worksheet.
 * Required unpriced remainder rows remain null: known components must never
 * masquerade as complete permits, foreign coverage or all service costs. */
export function composePublicMonthlyBudget(r: Research, rawOptions: unknown, readSource = readLocalDocument) {
  const options = optionsSchema.parse(rawOptions)
  const baseId = `ALL_CAPITAL_CASH_${options.cashTaxScenario}`
  const matches = r.reviewedMxInsuranceSensitivity.scenarios.filter(s => s.id === baseId)
  if (matches.length !== 1) throw new Error('MONTHLY_BUDGET_BASE_IDENTITY')
  const budget = BinationalFixedBudgetSchema.parse(matches[0].budget)
  if (budget.referencePeriod !== '2026-10' || budget.resources.some(x => !x.profileReference)) throw new Error('MONTHLY_BUDGET_PROFILE_PERIOD')
  const period = budget.referencePeriod
  const row = (id: string) => {
    const found = budget.expenses.filter(e => e.economicExpenseId === id)
    if (found.length !== 1) throw new Error(`MONTHLY_BUDGET_EXPENSE_IDENTITY:${id}`)
    return found[0]
  }
  const profiles = budget.resources.map(x => ({ resourceId: x.resourceId, profileReference: x.profileReference! }))
  const evidence = (prefix: string, rawSources: unknown, resources: Resource[], limitation: string) => {
    const sources = z.array(sourceSchema).min(1).parse(rawSources)
    if (new Set(sources.map(s => s.id)).size !== sources.length) throw new Error('MONTHLY_BUDGET_DUPLICATE_SOURCE')
    const ids = sources.map(s => `${prefix}:${s.id}`)
    if (budget.evidence.some(e => ids.includes(e.id))) throw new Error('MONTHLY_BUDGET_EVIDENCE_OVERWRITE')
    budget.evidence.push(...sources.map((s, i) => ({ id: ids[i], url: s.url,
      locator: s.locator ?? `${prefix}: public reference; source period and limits retained in pinned dossier`,
      observedAt: '2026-10-03', referencePeriod: period, groupReference: budget.groupReference,
      resourceIds: resources, profileReferences: profiles.filter(p => resources.includes(p.resourceId)),
      kind: 'DOCUMENTED_PUBLIC_MODEL' as const, limitations: `${limitation} Assembly observed 2026-10-03; original source periods retained in pinned dossiers, not a fresh observation of every public price.` })))
    return ids
  }
  const amount = (value: number, evidenceIds: string[], derivation: string): NonNullable<Budget['expenses'][number]['amount']> => ({
    value: cents(value), unit: 'USD/month', referencePeriod: period, evidenceIds, derivation, kind: 'DOCUMENTED_PUBLIC_MODEL',
  })
  const all = [...BINATIONAL_RESOURCES]
  const shared = [{ resourceId: 'MX_TRACTOR' as const, share: .5 }, { resourceId: 'US_TRACTOR' as const, share: .5 }, { resourceId: 'SHARED_TRAILER' as const, share: 0 }]
  const add = (id: string, family: 'ADMIN_PAYROLL' | 'COMPANY' | 'PERMITS' | 'INSURANCE', value: number | null,
    evidenceIds: string[], derivation: string, resourceId?: Resource) => {
    if (budget.expenses.some(e => e.economicExpenseId === id)) throw new Error(`MONTHLY_BUDGET_DUPLICATE_EXPENSE:${id}`)
    const basis = { ADMIN_PAYROLL: 'EMPLOYER_COST_INCLUDES_BENEFITS', COMPANY: 'FIXED_COMPANY_EXCLUDES_OTHER_FAMILIES',
      PERMITS: 'FIXED_PERMITS_EXCLUDES_TRIP_TOLLS', INSURANCE: 'PERIOD_PREMIUM_NORMALIZED_ONCE' }[family]
    budget.expenses.push({ economicExpenseId: id, family, scope: resourceId ? 'DIRECT_RESOURCE' : 'GROUP_SHARED', basis,
      allocationRationale: resourceId ? `Direct ${resourceId}, once; ${derivation}` : `One group pool, equal tractor control shares and explicit zero box share; ${derivation}`,
      amount: value === null ? null : amount(value, evidenceIds, derivation),
      allocations: resourceId ? [{ resourceId, share: 1 }] : structuredClone(shared) })
  }
  const liabilityPlanning = options.foreignLiabilityAlternativeId == null ? null : (() => {
    const pin = REFERENCE_BUDGET_PINS.find(p => p.id === 'crossborderLiabilityForecast')!
    const observed = r.sourcePins.filter(p => p.id === pin.id)
    if (observed.length !== 1 || observed[0].file !== pin.file || observed[0].sha256 !== pin.sha256)
      throw new Error('MONTHLY_LIABILITY_PIN_IDENTITY')
    const body = readSource(pin.file)
    if (createHash('sha256').update(body).digest('hex') !== pin.sha256) throw new Error('MONTHLY_LIABILITY_POLICY_HASH')
    const { policy, premiums } = readCrossborderLiabilityPlanning(JSON.parse(body))
    if (JSON.stringify(premiums) !== JSON.stringify(r.supportingCrossborderLiabilityForecast.premiums))
      throw new Error('MONTHLY_LIABILITY_PUBLISHED_PREMIUM_IDENTITY')
    const premium = premiums.find(p => p.id === options.foreignLiabilityAlternativeId)!
    const refs = evidence('MX_FOREIGN_LIABILITY_PLANNING', [policy.source], ['MX_TRACTOR'],
      'US domestic owner-operator publication transferred to one annual MX liability planning pool. Foreign domicile, unit denominator, operator history, insured limit, fees and eligibility are unverified; not a foreign policy or market bound.')
    add('MX_TRACTOR_FOREIGN_LIABILITY_PUBLIC_PROXY', 'INSURANCE', premium.annualPlanningPoolUsd / 12, refs,
      `${premium.id}: published annual planning pool ${premium.annualPlanningPoolUsd} USD /12, once in MX fixed cost; not temporary annual/365 pricing or a verified crossborder premium.`, 'MX_TRACTOR')
    return { ...premium, monthlyExactUsd: premium.annualPlanningPoolUsd / 12,
      monthlyPlanningUsd: cents(premium.annualPlanningPoolUsd / 12), classification: 'CFU' as const,
      sourceUrl: policy.source.url, sourcePublicationDate: policy.source.publicationDate,
      sourceIsForeignQuote: false, actualEligibilityVerified: false, actualAnnualPremiumUsd: null,
      taxesFeesVerified: false, sourceUnitDenominatorMatched: false, isMarketBound: false,
      temporaryPremiumAdded: false, physicalDamageAdded: false, cargoAdded: false, boxChargedAgain: false,
      annualAndTemporaryMutuallyExclusive: true, calibrated: false, adoptedValues: 0 }
  })()
  const finance = options.financeMonthlyScenarioId === null ? null
    : r.supportingPilotFinancedCfu.monthlyScenarios.find(s => s.id === options.financeMonthlyScenarioId)
  if (options.financeMonthlyScenarioId !== null && !finance) throw new Error('MONTHLY_BUDGET_FINANCE_NOT_FOUND')
  if (finance) {
    if (finance.cashBaseId !== `${baseId}_PUBLIC_ADMIN_SCALE` || !finance.oneSharedBox || !finance.adminPoolUnchanged ||
      finance.capitalReplacements.length !== 3 || new Set(finance.capitalReplacements.map(x => x.resourceId)).size !== 3) throw new Error('MONTHLY_BUDGET_FINANCE_SCOPE')
    for (const replacement of finance.capitalReplacements) {
      const capital = row(replacement.id)
      if (capital.family !== 'CAPITAL' || capital.amount?.value !== replacement.cashMonthlyUsd) throw new Error('MONTHLY_BUDGET_FINANCE_CASH_MISMATCH')
      const refs = evidence(`FINANCE:${replacement.resourceId}`, [r.supportingSharedBoxFinancePlanning.source], [replacement.resourceId],
        'Selected public capital alternative; existing cash-source lineage retained. Rates/holding/mean interest/fees are declared hypotheses, not approved loans; BBVA range applies to box hypothesis, not proof of MX/US tractor rates.')
      capital.amount = { ...capital.amount, value: cents(replacement.financedMonthlyUsd), evidenceIds: [...capital.amount.evidenceIds, ...refs],
        derivation: `${finance.id}: replace cash capital with existing public depreciation/mean interest/fee component; no principal or full installment added. See separately pinned tractor and box model hypotheses.` }
    }
  }
  const premium = r.supportingBoxInsuranceCfu.monthlyAlternatives.find(x => x.id === options.boxInsuranceAlternativeId)
  if (!premium || r.supportingBoxInsuranceCfu.physicalBoxCount !== 1) throw new Error('MONTHLY_BUDGET_BOX_PREMIUM_SCOPE')
  const premiumRow = row('SHARED_TRAILER_INSURANCE')
  if (premiumRow.amount !== null) throw new Error('MONTHLY_BUDGET_BOX_PREMIUM_OVERWRITE')
  const boxEvidence = evidence('ONE_BOX_PD', [r.supportingBoxInsuranceCfu.sourceGuide.source], ['SHARED_TRAILER'],
    'US broker guide endpoint transferred as explicit physical-damage planning component for one box; not a binational policy, cargo, interchange liability, confidence interval or price clamp.')
  premiumRow.amount = amount(premium.monthlyUsd, boxEvidence, `${premium.id}: one selected guide endpoint per box-month, alternatives not summed.`)
  // Keep the unknown permit-family rows; add known parts separately instead of
  // labeling an IRP exercise or a Texas box renewal as the complete family.
  for (const p of r.recurringPermitComponents.lines) {
    const refs = evidence(`COMPLIANCE:${p.id}`, r.recurringPermitComponents.sources, [p.resourceId],
      'Component only: full permit row remains unpriced. IRP official exercise is a proxy, not invoice; UCR entity/HVUT period/one-box scope preserved in pinned model.')
    add(p.id, 'PERMITS', p.monthlyExactUsd, refs, `${p.chargeBasis}: annual ${p.annualUsd} USD /12; monthly cents rounded once, not reconstructed annual bill.`, p.resourceId)
  }
  for (const id of ['MX_TRACTOR_PERMITS', 'US_TRACTOR_PERMITS', 'SHARED_TRAILER_PERMITS']) {
    const remainder = row(id)
    if (remainder.amount !== null) throw new Error('MONTHLY_BUDGET_PERMIT_REMAINDER_OVERWRITE')
    remainder.allocationRationale = `Unpriced remaining obligations beyond the separately listed supported permit components; not a second charge for those components. Resource scope retained: ${id}.`
  }
  const oldPool = row('GROUP_ADMIN_COMPANY_SINGLE_POOL')
  if (oldPool.amount !== null) throw new Error('MONTHLY_BUDGET_EXISTING_POOL_OVERWRITE')
  budget.expenses = budget.expenses.filter(e => e !== oldPool)
  const adminRefs = evidence('ADMIN_PUBLIC_SCALE', [r.supportingAdminScaleReference.source, ...r.supportingCentralAdminPool.sources], all,
    'One public-stock-scale administrative employer-cost pool; source periods/geography differ, FTE/workload transfer explicit; no seven-role full pool or driver pay added.')
  add('GROUP_ADMIN_PAYROLL_PUBLIC_SCALE', 'ADMIN_PAYROLL', r.supportingAdminScaleReference.payrollComponentMonthlyUsd, adminRefs, 'One employer-cost pool, benefits already included, conserved before resource allocation.')
  add('GROUP_TMS_NAMED_ACCOUNTS', 'COMPANY', r.supportingAdminScaleReference.tmsComponentMonthlyUsd, adminRefs, 'Two published named control accounts, not fractional people or seven accounts.')
  const companyRefs = evidence('COMPANY_SERVICES', r.supportingCompanyServicesCfu.sources, all,
    'Published service quantities/price components, not contracts/tax invoices/continuous coverage; payroll, TMS, driver communication and box tracker outside this basket.')
  const company = r.supportingCompanyServicesCfu
  add('GROUP_OFFICE_AND_ADMIN_MOBILE', 'COMPANY', company.office.memberships * company.office.publishedMonthlyUsdPerMembership +
    company.mobile.publishedMonthlyBlockUsd + company.mobile.adminLines * company.mobile.providerFeeMonthlyUsdPerLine, companyRefs,
    'Shared office and admin mobile services only; no bundled internet/printing or per-resource duplicate pool.')
  add('US_TRACTOR_RESERVED_YARD', 'COMPANY', company.yard.publishedMonthlyTractorUsd, companyRefs, 'Separate one US tractor bay; no combo plus separate bay duplicate.', 'US_TRACTOR')
  add('ONE_BOX_US_RESERVED_YARD', 'COMPANY', company.yard.publishedMonthlyTrailerUsd, companyRefs, 'Separate one shared box bay, once.', 'SHARED_TRAILER')
  const phoneRefs = evidence('DRIVER_COMMUNICATION', r.supportingDriverConnectivity.sources, all, 'Driver phone/GPS/ELD price components separate from admin phone; compatibility/activation/shipping remain explicit service obligations.')
  for (const p of r.supportingDriverConnectivity.monthlyLines) add(p.id, 'COMPANY', p.monthlyUsd, phoneRefs, 'Existing normalized fixed subscription; no driver wage, complete equipment or full taxes claim.', p.resourceId)
  const visibilityRefs = evidence('ONE_BOX_VISIBILITY', r.supportingBoxVisibility.sources, ['SHARED_TRAILER'], 'One box tracker plus installed-service allocation over declared24months; initial cash not charged again and no extra generic installation.')
  for (const p of r.supportingBoxVisibility.monthlyLines) add(p.id, 'COMPANY', p.monthlyUsd, visibilityRefs, 'Existing one-box recurring/installed service component; not tractor ELD.', p.resourceId)
  const deviceRefs = evidence('COMMUNICATION_EQUIPMENT', r.supportingPilotTripSupplements.sources, all, 'Handsets and accessories allocated over existing holding window; two admin phones split once, no initial purchase cash or MX food in this fixed component.')
  for (const p of r.supportingPilotTripSupplements.monthlyLines) add(p.id, 'COMPANY', p.monthlyUsd, deviceRefs, 'Supported equipment monthly allocation; food remains variable outside fixed budget.', p.resourceId)
  const yard = r.supportingMxReservedYard.taxScenarios.find(p => p.id === options.mxYardAlternativeId)
  if (!yard) throw new Error('MONTHLY_BUDGET_MX_YARD_SCOPE')
  const yardRefs = evidence('MX_RESERVED_YARD', [r.supportingMxReservedYard.source], ['MX_TRACTOR'], 'One reserved MX tractor place, daily public price transformed365/12; tax scenario explicit, not monthly contract or trailer/interchange service.')
  add('MX_TRACTOR_RESERVED_YARD', 'COMPANY', yard.monthlyUsd, yardRefs, `${yard.id}: reserve one tractor space; no same-box or third drayage charge.`, 'MX_TRACTOR')
  add('MX_TRACTOR_FOREIGN_LIABILITY_REMAINDER', 'INSURANCE', null, [], liabilityPlanning
    ? 'Foreign eligibility, limits and fees remain unverified. A matched foreign premium must replace the public proxy, never add a second whole annual premium; separate from domestic Amplia.'
    : 'Unpriced foreign-territory liability, separate from supported domestic Amplia.', 'MX_TRACTOR')
  add('BOX_BINATIONAL_COVERAGE_REMAINDER', 'INSURANCE', null, [], 'Unpriced additional territorial/custody components if applicable; one physical box PD guide does not prove them.', 'SHARED_TRAILER')
  add('GROUP_SERVICE_TAX_INSTALLATION_REMAINDER', 'COMPANY', null, [], 'Unpriced selected-service taxes/activation/installation outside published basket; not extra speculative seven-role overhead.')
  const audit = reconcileBinationalFixedBudget(budget)
  if (audit.issues.some(i => i.code !== 'MISSING_MONTHLY_AMOUNT')) throw new Error(`MONTHLY_BUDGET_CONTRACT:${audit.issues.map(i => i.code).join(',')}`)
  const knownCents: Record<Resource, number> = { MX_TRACTOR: 0, US_TRACTOR: 0, SHARED_TRAILER: 0 }
  for (const e of budget.expenses) {
    if (!e.amount) continue
    const c = Math.round(e.amount.value * 100)
    if (e.scope === 'DIRECT_RESOURCE') knownCents[e.allocations[0].resourceId] += c
    else {
      if (e.allocations.some(a => a.share !== (a.resourceId === 'SHARED_TRAILER' ? 0 : .5))) throw new Error('MONTHLY_BUDGET_POOL_SHARE_MISMATCH')
      const parts = splitEqualCents(c, 2)
      knownCents.MX_TRACTOR += parts[0]; knownCents.US_TRACTOR += parts[1]
    }
  }
  const sumCents = budget.expenses.reduce((n, e) => n + (e.amount ? Math.round(e.amount.value * 100) : 0), 0)
  if (sumCents !== Object.values(knownCents).reduce((a, b) => a + b, 0)) throw new Error('MONTHLY_BUDGET_POOL_CONSERVATION')
  const exposure = reconcileEconomicModelInventory(readLocalDocument(CURRENT_REGISTER), r).partialCfuVerification
    .filter(s => s.cashBudgetAlternative === `${baseId}_PUBLIC_ADMIN_SCALE`)
  if (exposure.length !== 2) throw new Error('MONTHLY_BUDGET_CURRENT_EXPOSURE')
  const knownCfuAllocations = exposure.map(s => {
    const resources = s.resources.map(x => {
      const monthlyUsd = knownCents[x.resourceId] / 100
      const byDistanceUsd = monthlyUsd * x.cycleKm / x.monthlyKm
      const byTimeUsd = monthlyUsd * x.cycleDays / x.monthlyProductiveDays
      return { resourceId: x.resourceId, monthlyUsd, cycleKm: x.cycleKm, monthlyKm: x.monthlyKm,
        cycleDays: x.cycleDays, monthlyProductiveDays: x.monthlyProductiveDays, byDistanceUsd, byTimeUsd,
        knownAllocatedFixedComponentUsd: allocateFixedCost(byDistanceUsd, byTimeUsd) }
    })
    return { cycleId: s.cycleId, resources,
      knownAllocatedFixedSubtotalUsd: resources.reduce((n, x) => n + x.knownAllocatedFixedComponentUsd, 0),
      fullCfuUsd: null, fullPilotCostUsd: null, isCompleteOrLowerBound: false }
  })
  return { model: 'FCM_B2_PUBLIC_MONTHLY_BUDGET_ASSEMBLY_V1', options, paymentMode: finance ? 'FINANCED' : 'CASH',
    budget: audit.lineage, auditStatus: audit.status, liabilityPlanning, unresolved: budget.expenses.filter(e => e.amount === null).map(e => ({ id: e.economicExpenseId, family: e.family, reason: e.allocationRationale })),
    knownMonthlyComponentsUsdByResource: Object.fromEntries(BINATIONAL_RESOURCES.map(id => [id, knownCents[id] / 100])),
    knownGroupMonthlyComponentUsd: sumCents / 100, knownCfuAllocations, knownSubtotalIsCompleteOrLowerBound: false,
    monthlyRounding: 'ROUND_SUPPORTED_EXPENSE_ONCE_THEN_CONSERVE_POOL_CENTS_NOT_ROUND_EACH_FRACTIONAL_SHARE',
    fullMonthlyBudgetUsd: audit.monthlyGroupTotalUsd, fullCfuUsd: null, fullCvuUsd: null, fullPilotCostUsd: null,
    oneSharedBox: true, adminPoolChargedOnce: true, sourcePins: r.sourcePins, calibrated: false, quoteReady: false, adoptedValues: 0,
    originalBudgetChanged: false, externalWrites: false }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: tsx compose-public-monthly-budget.ts JSON_OPTIONS (explicit research scenario, no defaults)')
    console.log(JSON.stringify(composePublicMonthlyBudget(consolidateBinationalReferenceBudget(), JSON.parse(process.argv[2])), null, 2))
    process.exitCode = 2
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Monthly public-budget assembly failed')
    process.exitCode = 1
  }
}
