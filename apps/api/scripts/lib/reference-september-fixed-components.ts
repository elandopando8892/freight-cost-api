import { composePublicMonthlyBudget } from '../compose-public-monthly-budget.js'
import type { consolidateBinationalReferenceBudget } from '../consolidate-binational-reference-budget.js'
import { SeptemberReferenceFxSchema } from './reference-september-operating-components.js'
import { splitEqualCents } from './reference-central-admin-pool.js'
import { allocateFixedCost } from '../../src/modules/engine/fixed-cost-allocation.js'
import { BINATIONAL_RESOURCES } from '../../src/modules/engine/benchmark-binational-budget.js'

type Research = ReturnType<typeof consolidateBinationalReferenceBudget>
type Template = ReturnType<typeof composePublicMonthlyBudget>
type Resource = typeof BINATIONAL_RESOURCES[number]
const cents = (v: number) => {
  if (!Number.isFinite(v) || v <= 0 || !Number.isSafeInteger(Math.round(v * 100))) throw new Error('B2_FIXED_NATIVE_AMOUNT')
  return Math.round(v * 100)
}

/** Reuse the October worksheet ONLY as identity/scope/exposure control. Each
 * known amount is reconstructed from native source inputs, then valued once.
 * This is a retrospective reference comparison, not observed September prices.
 * Original evidence/observation periods are retained, not relabeled September. */
export function rebuildSeptemberFixedComponents(r: Research, rawFx: unknown, rawOptions: unknown) {
  const fx = SeptemberReferenceFxSchema.parse(rawFx), template = composePublicMonthlyBudget(r, rawOptions)
  return reconstructSeptemberFixedTemplate(r, fx, template)
}

export function reconstructSeptemberFixedTemplate(r: Research, rawFx: unknown, template: Template) {
  const fx = SeptemberReferenceFxSchema.parse(rawFx), options = template.options
  if (template.budget.referencePeriod !== '2026-10' || template.oneSharedBox !== true || template.adminPoolChargedOnce !== true ||
    template.fullMonthlyBudgetUsd !== null || r.supportingPilotVariableEconomics.fx.mxnPerUsd !== 18.3688) throw new Error('B2_FIXED_TEMPLATE_REFERENCE')
  const native = new Map<string, { currency: 'MXN' | 'USD'; monthlyNative: number; formula: string; sourceRefs: string[] }>()
  const add = (id: string, currency: 'MXN' | 'USD', monthlyNative: number, formula: string, sourceRefs: string[]) => {
    cents(monthlyNative)
    if (native.has(id)) throw new Error('B2_FIXED_DUPLICATE_NATIVE_COMPONENT')
    if (sourceRefs.some(ref => r.sourcePins.filter(pin => pin.id === ref).length !== 1)) throw new Error('B2_FIXED_SOURCE_REF_IDENTITY')
    native.set(id, { currency, monthlyNative, formula, sourceRefs })
  }
  const finance = options.financeMonthlyScenarioId === null ? null : r.supportingPilotFinancedCfu.monthlyScenarios.find(s => s.id === options.financeMonthlyScenarioId)
  if (options.financeMonthlyScenarioId !== null && (!finance || finance.cashBaseId !== `ALL_CAPITAL_CASH_${options.cashTaxScenario}_PUBLIC_ADMIN_SCALE`)) throw new Error('B2_FIXED_FINANCE_IDENTITY')
  if (template.paymentMode !== (finance ? 'FINANCED' : 'CASH')) throw new Error('B2_FIXED_FUNDING_MODE')
  const mxCapital = r.reviewedMxCapitalSensitivity.scenarios.find(s => s.id === (finance?.mxFinanceScenarioId ?? 'CASH'))!.scenario
  const usCapital = r.reviewedProspectiveUsCapital.modes[finance ? 'FINANCED' : 'CASH']
  const boxCash = r.reviewedSharedBoxCashSensitivity.scenarios.find(s => s.id === options.cashTaxScenario)!.scenario
  const boxFinance = finance ? r.supportingSharedBoxFinancePlanning.scenarios.find(s => s.id === finance.boxFinanceScenarioId)!.feeTaxAlternatives.find(f => f.id === finance.boxFeeTaxScenarioId)! : null
  add('MX_TRACTOR_CAPITAL', 'MXN', mxCapital.monthlyCapitalMxn, 'Native market-use loss + existing-debt mean interest; no principal/full instalment', ['mxProspective'])
  add('US_TRACTOR_CAPITAL', 'USD', usCapital.monthlyModelUsd, 'Native market-use loss + existing-debt mean interest; no principal/full instalment', ['usProspectiveCapital'])
  add('SHARED_TRAILER_CAPITAL', 'MXN', boxFinance?.monthlyCapitalComponentMxn ?? boxCash.monthlyCapitalMxn,
    'One box: native market-use loss + selected mean interest/fee allocation if financed; no second cash capital', ['boxProspective', 'pilotFinancedCfu'])
  const mxInsurance = r.reviewedMxInsuranceSensitivity.scenarios.find(s => s.id === `ALL_CAPITAL_CASH_${options.cashTaxScenario}`)!.model
  add('MX_TRACTOR_INSURANCE', 'MXN', mxInsurance.annualGrossMxn / 12, 'Annual published gross premium /12; no second IVA/fee/discount', ['mxInsuranceModel'])
  const usInsurance = r.reviewedUsInsurancePublicModel
  add('US_TRACTOR_INSURANCE', 'USD', usInsurance.autoMonthlyProxyUsd + usInsurance.cargoAnnualProxyUsd / 12,
    'One US auto monthly proxy + one annual cargo pool /12; not a per-shipment premium', ['usInsurancePublicModel'])
  const boxPremium = r.supportingBoxInsuranceCfu.monthlyAlternatives.find(s => s.id === options.boxInsuranceAlternativeId)!
  add('SHARED_TRAILER_INSURANCE', 'USD', boxPremium.monthlyUsd, 'One explicit guide endpoint per box-month, alternatives not summed', ['boxInsuranceCfu'])
  for (const p of r.recurringPermitComponents.lines) add(p.id, 'USD', p.annualUsd / 12, 'One supported recurring annual component /12, not the full permit family', ['permitComponentScenario', 'recurringCompliance'])
  if (template.liabilityPlanning) add('MX_TRACTOR_FOREIGN_LIABILITY_PUBLIC_PROXY', 'USD', template.liabilityPlanning.annualPlanningPoolUsd / 12,
    'Optional unmatched annual planning pool /12; foreign-coverage remainder retained', ['crossborderLiabilityForecast'])
  const admin = r.supportingAdminScaleReference
  add('GROUP_ADMIN_PAYROLL_PUBLIC_SCALE', 'USD', admin.roleLines.reduce((sum, l) => sum + l.monthlyEmployerComponentUsd, 0),
    'Public headcount ratio × two power units × declared hours × weighted hourly employer total, one pool', ['adminScale', 'adminPool'])
  add('GROUP_TMS_NAMED_ACCOUNTS', 'USD', admin.projection.namedTmsAccounts * r.supportingCentralAdminPool.tms.publishedMonthlyUsdPerUser,
    'Two named control accounts × published monthly USD per user, not seven roles', ['adminScale', 'adminPool'])
  const company = r.supportingCompanyServicesCfu
  add('GROUP_OFFICE_AND_ADMIN_MOBILE', 'USD', company.office.memberships * company.office.publishedMonthlyUsdPerMembership +
    company.mobile.publishedMonthlyBlockUsd + company.mobile.adminLines * company.mobile.providerFeeMonthlyUsdPerLine,
    'Office quantities plus one mobile block and per-line fees; one shared pool', ['companyServicesCfu'])
  add('US_TRACTOR_RESERVED_YARD', 'USD', company.yard.publishedMonthlyTractorUsd, 'One reserved tractor bay, not lodging in travel', ['companyServicesCfu'])
  add('ONE_BOX_US_RESERVED_YARD', 'USD', company.yard.publishedMonthlyTrailerUsd, 'One reserved trailer bay, no combo-plus-separate duplicate', ['companyServicesCfu'])
  for (const l of r.supportingDriverConnectivity.monthlyLines) add(l.id, l.currency, l.monthlyLocal,
    'Native subscription: prepaid annual consumption /12 or one published monthly service; no first-year cash added', ['driverConnectivity'])
  for (const l of r.supportingBoxVisibility.monthlyLines) add(l.id, 'MXN', l.monthlyMxn,
    'One native gross box subscription or installed-service allocation over24months; not initial cash again', ['boxVisibility'])
  const e = r.supportingPilotTripSupplements.equipment
  const usDevice = (e.usPublishedHandsetUsd + e.usChargerCableBundleListUsd) * (1 + e.usSalesTaxRate) / e.planningHoldingMonths
  add('MX_DRIVER_HANDSET', 'MXN', e.mxPublishedHandsetMxn / e.planningHoldingMonths, 'One published checkout handset /24months, IVA not added again', ['tripSupplements'])
  add('US_DRIVER_HANDSET_AND_CHARGER', 'USD', usDevice, '(Handset + cable bundle) × declared tax /24months, one unit', ['tripSupplements'])
  for (const resource of ['MX', 'US']) add(`ADMIN_HANDSETS_${resource}_ALLOCATED_SHARE`, 'USD', e.adminHandsets * usDevice / 2,
    'Two admin devices /24months, equal tractor shares once, no third box allocation', ['tripSupplements'])
  const yard = r.supportingMxReservedYard, taxFactor = options.mxYardAlternativeId === 'NET_PLUS_VAT_RESERVE' ? 1 + yard.pricing.vatRateHypothesis : 1
  add('MX_TRACTOR_RESERVED_YARD', 'MXN', yard.pricing.publishedPatioDailyMxn * yard.quantity.annualReservedDaysHypothesis / yard.quantity.monthsPerYear * taxFactor,
    'Daily published price ×365/12 reserved days × explicit tax hypothesis, not actual dwell or hotel nights', ['mxReservedYard'])
  const ids = template.budget.expenses.map(e => e.economicExpenseId)
  if (new Set(ids).size !== ids.length || native.size !== template.budget.expenses.filter(e => e.amount !== null).length) throw new Error('B2_FIXED_EXPENSE_IDENTITY')
  const monthlyCents: Record<Resource, number> = { MX_TRACTOR: 0, US_TRACTOR: 0, SHARED_TRAILER: 0 }
  const rows = template.budget.expenses.map(e => {
    const n = native.get(e.economicExpenseId)
    if (!e.amount) {
      if (n) throw new Error('B2_FIXED_REMAINDER_OVERWRITE')
      return { id: e.economicExpenseId, family: e.family, scope: e.scope, allocations: e.allocations,
        native: null, monthlyUsd: null, originalEvidenceIds: [] as string[], remainingReason: e.allocationRationale }
    }
    if (!n || e.amount.referencePeriod !== '2026-10' || cents(n.monthlyNative / (n.currency === 'MXN' ? 18.3688 : 1)) !== cents(e.amount.value)) throw new Error(`B2_FIXED_NATIVE_ANCHOR:${e.economicExpenseId}`)
    const c = cents(n.monthlyNative / (n.currency === 'MXN' ? fx.mxnPerUsd : 1))
    if (e.scope === 'DIRECT_RESOURCE') {
      if (e.allocations.length !== 1 || e.allocations[0].share !== 1) throw new Error('B2_FIXED_DIRECT_ALLOCATION')
      monthlyCents[e.allocations[0].resourceId] += c
    } else {
      if (e.allocations.length !== 3 || new Set(e.allocations.map(a => a.resourceId)).size !== 3 ||
        e.allocations.some(a => a.share !== (a.resourceId === 'SHARED_TRAILER' ? 0 : .5))) throw new Error('B2_FIXED_SHARED_ALLOCATION')
      const parts = splitEqualCents(c, 2)
      monthlyCents.MX_TRACTOR += parts[0]; monthlyCents.US_TRACTOR += parts[1]
    }
    return { id: e.economicExpenseId, family: e.family, scope: e.scope, allocations: e.allocations,
      native: n, monthlyUsd: c / 100, originalEvidenceIds: e.amount.evidenceIds, remainingReason: null }
  })
  const sum = rows.reduce((total, row) => total + (row.monthlyUsd === null ? 0 : cents(row.monthlyUsd)), 0)
  if (sum !== Object.values(monthlyCents).reduce((a, b) => a + b, 0)) throw new Error('B2_FIXED_POOL_CONSERVATION')
  if (template.knownCfuAllocations.length !== 2 || new Set(template.knownCfuAllocations.map(c => c.cycleId)).size !== 2) throw new Error('B2_FIXED_CYCLE_IDENTITY')
  const allocations = template.knownCfuAllocations.map(c => {
    if (c.resources.length !== 3 || new Set(c.resources.map(v => v.resourceId)).size !== 3) throw new Error('B2_FIXED_RESOURCE_IDENTITY')
    const sourceCycle = r.supportingCompanyServicesCfu.cycleAllocations.find(s => s.cycleScenarioId === c.cycleId)
    if (!sourceCycle) throw new Error('B2_FIXED_SOURCE_CYCLE')
    const resources = c.resources.map(v => {
      if ([v.cycleKm, v.monthlyKm, v.cycleDays, v.monthlyProductiveDays].some(n => !Number.isFinite(n) || n <= 0) ||
        v.cycleKm > v.monthlyKm || v.cycleDays > v.monthlyProductiveDays) throw new Error('B2_FIXED_EXPOSURE_RANGE')
      const source = sourceCycle.resources.find(s => s.resourceId === v.resourceId)
      if (!source || Math.abs(v.cycleKm / v.monthlyKm - source.distanceExposure) > 1e-10 ||
        Math.abs(v.cycleDays / v.monthlyProductiveDays - source.timeExposure) > 1e-10) throw new Error('B2_FIXED_EXPOSURE_IDENTITY')
      const monthlyUsd = monthlyCents[v.resourceId] / 100
      const byDistanceUsd = monthlyUsd * v.cycleKm / v.monthlyKm, byTimeUsd = monthlyUsd * v.cycleDays / v.monthlyProductiveDays
      return { resourceId: v.resourceId, monthlyUsd, cycleKm: v.cycleKm, monthlyKm: v.monthlyKm, cycleDays: v.cycleDays,
        monthlyProductiveDays: v.monthlyProductiveDays, byDistanceUsd, byTimeUsd,
        knownAllocatedFixedComponentUsd: allocateFixedCost(byDistanceUsd, byTimeUsd) }
    })
    return { cycleId: c.cycleId, resources, knownAllocatedFixedSubtotalUsd: resources.reduce((sum, v) => sum + v.knownAllocatedFixedComponentUsd, 0), completeCfuUsd: null }
  })
  return { model: 'FCM_B2_SEPTEMBER_FIXED_COMPONENT_REVALUATION_V1', referencePeriod: '2026-09', fx,
    options, paymentMode: template.paymentMode, rows, knownMonthlyUsdByResource: Object.fromEntries(BINATIONAL_RESOURCES.map(id => [id, monthlyCents[id] / 100])),
    knownMonthlySubtotalUsd: sum / 100, allocations, unresolved: rows.filter(row => row.monthlyUsd === null).map(row => ({ id: row.id, reason: row.remainingReason })),
    originalEvidence: template.budget.evidence, originalWorksheetPeriod: template.budget.referencePeriod,
    sourceObservationPeriodsChanged: false, originalUsdSubtotalsTransferred: false,
    sourceBasis: 'PINNED_PUBLIC_NATIVE_INPUTS_REVALUED_RETROSPECTIVELY_NOT_OBSERVED_SEPTEMBER_PRICES',
    exposureBasis: 'RETAINED_DECLARED_CAPACITY_AND_RESOURCE_MAX_NOT_OBSERVED_SEPTEMBER',
    rounding: 'ROUND_NATIVE_VALUED_EXPENSE_ONCE_THEN_CONSERVE_SHARED_POOL_CENTS',
    oneSharedBox: true, adminPoolChargedOnce: true, debtPrincipalOrWholePaymentAdded: false,
    driverFixedQuotaIncluded: false, missingAmountsDefaultedToZero: false, historicalSeptemberPricesVerified: false,
    isCompleteOrLowerBound: false, completeCfuUsd: null, completeMonthlyBudgetUsd: null,
    quoteReady: false, calibrated: false, adoptedValues: 0, externalWrites: false }
}
