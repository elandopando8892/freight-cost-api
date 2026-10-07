import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseBenchmarkEvidenceRegister, reconcileBenchmarkEvidenceInventory } from '../src/modules/engine/benchmark-evidence-inventory.js'
import { benchmarkRateRequirements } from '../src/modules/engine/benchmark-rates.js'
import { PARAMETER_DEFINITIONS } from '../src/data/parameter-catalog.js'
import { readLocalDocument } from './assemble-economic-reference-cards.js'
import { consolidateBinationalReferenceBudget } from './consolidate-binational-reference-budget.js'
import { auditModelParameterConsumers, auditTireFormulaBindings } from './lib/model-parameter-consumers.js'
import { auditFixedMaintenanceFormulaContracts } from './lib/model-formula-contracts.js'
import relaySnapshot from '../src/modules/engine/b2-own-relay.snapshot.json'
import {RelaySnapshot} from '../src/modules/engine/b2-own-relay-contract.js'
import {OPERATIONAL_SEGMENTS} from '../src/modules/cost-bases/operational-segments.js'
import {defaultCostBaseProfile} from '../src/modules/cost-bases/cost-base-profile.js'
import {parameterApplicability} from '../src/modules/cost-bases/cost-base-applicability.js'
import {readB2PlanningPolicy,B2_PLANNING_POLICY_PIN} from './lib/b2-planning-scenario.js'

export const CURRENT_REGISTER = 'docs/C1_B1_PARAMETER_SOURCE_REGISTER_2026-10-01.md'
type Budget = ReturnType<typeof consolidateBinationalReferenceBudget>
type ReconciliationBudget = Omit<Budget, 'sourcePins'> & { sourcePins: ReadonlyArray<Budget['sourcePins'][number]> }
type Component = { name: string; value: number; unit: string; period: string; basis: string }
const component = (name: string, value: number, unit: string, period: string, basis: string): Component => {
  if (!Number.isFinite(value) || value < 0) throw new Error(`INVALID_COMPONENT:${name}`)
  return { name, value, unit, period, basis }
}

/** Reconcile granular inventory and public-family evidence without distributing
 * aggregates into fictitious microinputs. This is a report, not a second engine,
 * source refresh, adopted base, or acceptance of an externally supplied budget. */
export function reconcileEconomicModelInventory(markdown: string, r: ReconciliationBudget) {
  const rows = parseBenchmarkEvidenceRegister(markdown)
  if (new Set(rows.map(row => row.key)).size !== rows.length) throw new Error('DUPLICATE_CANONICAL_KEY')
  const requirements = { MX: benchmarkRateRequirements('MX'), US: benchmarkRateRequirements('US') }
  const inventoryAudit = reconcileBenchmarkEvidenceInventory(rows, requirements)
  if (inventoryAudit.issues.length) throw new Error(`CANONICAL_FORMULA_INVENTORY:${inventoryAudit.issues.map(i => `${i.key}:${i.code}`).join(',')}`)
  const pins = new Set<string>(r.sourcePins.map(pin => pin.id))
  if (pins.size !== r.sourcePins.length) throw new Error('DUPLICATE_SOURCE_PIN')
  const v = r.supportingPilotVariableEconomics, fx = v.fx.mxnPerUsd
  if (v.fx.use !== 'DATED_RESEARCH_VALUATION_NOT_PAYMENT_OR_FORECAST') throw new Error('FX_SCOPE_MISMATCH')
  const first = v.scenarios[0]
  const rate = (id: string) => {
    const matches = first.rows.filter(row => row.id === id)
    if (matches.length !== 1) throw new Error(`VARIABLE_COMPONENT_IDENTITY:${id}`)
    return matches[0]
  }
  const periods = v.sourcePeriods
  const planning = '2026-10 DECLARED_PUBLIC_MODEL_NOT_OBSERVED_CARRIER'
  const nativeRate = (id: string, period: string) => component(id, rate(id).nativePerKm,
    `${rate(id).nativeCurrency}/vehicle-km`, period, rate(id).covers)
  const usdRate = (id: string, period: string) => component(`${id}_NORMALIZED`,
    rate(id).nativePerKm / (rate(id).nativeCurrency === 'MXN' ? fx : 1), 'USD/vehicle-km', period,
    'DATED_FX_NORMALIZATION_NOT_MICROPARAMETER_CALIBRATION')
  const section = (name: string, role: string, formula: string, sourcePinIds: string[], components: Component[], gap: string) => {
    for (const id of sourcePinIds) if (!pins.has(id)) throw new Error(`MISSING_SECTION_SOURCE:${name}:${id}`)
    return { section: name, economicRole: role, formula,
      canonicalKeys: rows.filter(row => row.section === name).map(row => row.key),
      canonicalEvidence: {
        candidate: rows.filter(row => row.section === name && row.status === 'CANDIDATO').length,
        contrast: rows.filter(row => row.section === name && row.status === 'CONTRASTE').length,
        missing: rows.filter(row => row.section === name && row.status === 'FALTANTE').length,
      }, sourcePinIds, components, closureGap: gap,
      state: role === 'OUTSIDE_PRODUCTIVE_COST' ? 'SEPARATE_POLICY_NOT_A_COST_RATE' : 'PARTIAL_PUBLIC_MODEL_NOT_CALIBRATED' }
  }
  const cashCapital = r.supportingAdminScaleReference.scenarios.flatMap(s => s.lines
    .filter(l => /^(MX_TRACTOR|US_TRACTOR|SHARED_TRAILER)_CAPITAL$/.test(l.id))
    .map(l => component(`${s.id}:${l.id}`, l.monthlyUsd, 'USD/resource-month', planning, 'CASH_SCENARIO_ALTERNATIVE_NOT_ADDITIVE')))
  const insurance = r.supportingAdminScaleReference.scenarios[0].lines.filter(l => l.id.endsWith('_INSURANCE'))
    .map(l => component(l.id, l.monthlyUsd, 'USD/resource-month', planning, 'DOMESTIC_REFERENCE_NOT_COMPLETE_CROSSBORDER_COVERAGE'))
  const sections = [
    section('GENERAL_BASE', 'PROFILE_AND_SCOPE', 'Define country, segment, assets, ownership and expense bearer before allocating.',
      ['selection', 'economicProfiles'], [component('SHARED_PHYSICAL_BOX_COUNT', 1, 'box', planning, 'SAME_BOX_OWN_MX_US_RELAY')],
      'The pilot profile is explicit; other operating segments/equipment are not calibrated by this case.'),
    section('COST_CAPITAL', 'CFU_MONTHLY_BUDGET', '(capitalizable acquisition - net residual)/holding months + interest + supported fees; rental is an alternative.',
      ['mxProspective', 'usProspectiveCapital', 'boxProspective', 'datedFx'], cashCapital,
      'Select and reconcile public tax/residual/holding alternatives; do not equate an asking price or full debt payment with economic cost.'),
    section('COST_INSURANCE', 'CFU_MONTHLY_BUDGET', 'Premium for covered term / covered months, then allocate each resource once.',
      ['mxInsuranceModel', 'usInsurancePublicModel', 'boxInsuranceCfu', 'crossborderLiabilityForecast'],
      [...insurance, ...r.supportingBoxInsuranceCfu.monthlyAlternatives.map(a => component(a.id, a.monthlyUsd, 'USD/box-month', planning,
        'PUBLIC_GUIDE_ENDPOINT_NOT_BINATIONAL_POLICY'))],
      'Distinguish domestic liability, foreign liability, physical box and cargo; source transfers remain hypotheses, not verified policy coverage.'),
    section('COST_PAYROLL', 'CFU_SHARED_ADMIN_POOL', 'One administrative employer-cost pool; conserve allocated shares, excluding driver compensation.',
      ['adminPool', 'adminScale'], [component('ADMIN_PAYROLL_POOL', r.supportingAdminScaleReference.payrollComponentMonthlyUsd,
        'USD/group-month', planning, 'PUBLIC_STOCK_SCALE_TRANSFER_NOT_ACTUAL_FTE')],
      'Validate workload/coverage sensitivity and geography; preserve one pool, not seven full roles per tractor.'),
    section('COST_COMPANY', 'CFU_SHARED_AND_DIRECT_SERVICES', 'Quantity × supported unit cost, at group or resource scope; allocate shared services once.',
      ['companyServicesCfu', 'adminScale', 'mxReservedYard', 'permitComponentScenario', 'driverConnectivity', 'boxVisibility'],
      [component('TMS_TWO_NAMED_ACCOUNTS', r.supportingAdminScaleReference.tmsComponentMonthlyUsd, 'USD/group-month', planning, 'TWO_ACCOUNTS_NOT_FRACTIONAL_FTE'),
        component('OFFICE_MOBILE_US_RESERVED_BAYS', r.supportingCompanyServicesCfu.knownMonthlyComponentUsd, 'USD/group-month', planning,
          'PARTIAL_SERVICE_BASKET_EXCLUDES_PAYROLL_TMS_MX_YARD'),
        component('RECURRING_COMPLIANCE_COMPONENTS', r.recurringPermitComponents.monthlyKnownComponentSumUsd, 'USD/group-month', planning,
          'PARTIAL_FIXED_COMPLIANCE_CROSSWALK_NOT_ALL_CANONICAL_COMPANY_KEYS')],
      'Close a bounded service/compliance basket and fiscal treatment, not 46 invented Qty/PU values. Compliance needs an explicit family mapping.'),
    section('COST_MAINT', 'CVU_DISTANCE_RATE', 'Exclusive maintenance/lubricant rates × applicable attached or bobtail distance.',
      ['maintenanceReference', 'variableComponents', 'mxBobtailWear'],
      [nativeRate('MX_MAINT', periods.mxMaintenance), usdRate('MX_MAINT', periods.mxMaintenance), nativeRate('MX_LUBE', periods.mxMaintenance),
        nativeRate('US_MAINT', periods.usMaintenance)],
      'IMT/TTI are historical public proxies, not matched 53-foot observations. Attached composites already include box wear; bobtail needs its own boundary.'),
    section('COST_TIRES', 'CVU_DISTANCE_RATE', 'Tyre rate × applicable vehicle-km; detailed lifecycle is an alternative, not an additional expense.',
      ['maintenanceReference', 'variableComponents', 'mxBobtailWear'],
      [nativeRate('MX_TIRES', periods.mxMaintenance), usdRate('MX_TIRES', periods.mxMaintenance), nativeRate('US_TIRES', periods.usMaintenance)],
      'Do not fabricate position/installation/lifetime from aggregate rates or charge shared-box tyres again.'),
    section('FINANCE', 'CAPITAL_REPLACEMENT_AND_SEPARATE_BEARER', 'Replace cash capital with depreciation + interest + supported fees; separate carrier/XBF working capital.',
      ['cashFinanced', 'pilotFinancedCfu', 'datedFx'],
      [component('DATED_FIX_MXN_PER_USD', fx, 'MXN/USD', v.fx.observationDate, v.fx.use)],
      'Cash/finance alternatives exist; not real debt. Working-capital scope is not silently zero or absorbed into productive cost.'),
    section('FUEL', 'CVU_CONSUMPTION', 'Road price × loaded/empty consumption; add separately supported idle/DEF only where excluded from road consumption.',
      ['fuelReference', 'pilotVariables', 'operatingFluids', 'datedFx'],
      [component('MX_DIESEL_PRICE', v.sourceLedger.mxFuelPrice.value, v.sourceLedger.mxFuelPrice.unit, periods.mxFuel, v.sourceLedger.mxFuelPrice.use),
        component('MX_ROAD_LITERS_PER_KM', v.mxLitersPer1000Km / 1000, 'liter/vehicle-km', periods.mxMaintenance, v.performancePolicy),
        usdRate('MX_FUEL', periods.mxFuel),
        component('US_DIESEL_PRICE', v.sourceLedger.usFuelPrice.value, v.sourceLedger.usFuelPrice.unit, periods.usFuel, v.sourceLedger.usFuelPrice.use),
        component('US_ROAD_PERFORMANCE', v.sourceLedger.usPerformance.value, v.sourceLedger.usPerformance.unit, periods.usPerformance, v.performancePolicy),
        usdRate('US_FUEL', periods.usFuel)],
      'Dated prices need refresh for service validity. Loaded/empty transfer, historical performance and idle/SCR reserve need sensitivity, not an observed-consumption claim.'),
    section('LABOR', 'CVU_DRIVER_AND_FIXED_EMPLOYER_BOUNDARY', 'Driver road earnings + compatible employer costs/benefits; separate fixed statutory component and included travel allowance.',
      ['driverComponents', 'mxDriverForecast', 'mxVariableDriver', 'tripSupplements', 'pilotOrdinaryDuty'],
      [nativeRate('MX_DRIVER_PAY', planning), nativeRate('US_DRIVER_PAY', periods.usDriver)],
      'Road rates are not complete employer costs. Preserve rest/benefit alternatives; avoid double benefits, per diem or weekly guarantees.'),
    section('UTILIZATION', 'CFU_DENOMINATORS_AND_CYCLE', 'CFU_resource = monthly fixed × MAX(cycle km/monthly km, cycle days/monthly productive days); one serial box cycle.',
      ['pilotCycle', 'pilotOrdinaryDuty', 'dryVanCapacity', 'dryVanDenominator'],
      [component('MONTHLY_PRODUCTIVE_ASSET_DAYS', r.supportingPilotCycleExposure.productiveElapsedAssetDaysPerMonth,
        'productive elapsed days/resource-month', planning, r.supportingPilotCycleExposure.productiveDaysBasis)],
      'Capacity/duty/empty shares are public-model assumptions; ordinary-duty clock supersedes older nominal cycles. Not calendar days or an observed legal roster.'),
    section('RISK', 'OUTSIDE_PRODUCTIVE_COST', 'Explicit retained-risk policy/reserve, separate from insurance and ordinary productive cost.',
      ['capitalInsurance', 'crossborderInsuranceExposure'], [],
      'No default percentage; missing policy is not zero loss and premium/deductible is not a calibrated risk reserve.'),
    section('TECHNICAL_MARGIN', 'OUTSIDE_PRODUCTIVE_COST', 'Keep cost estimate, negotiated purchase tariff and sale price independent.',
      ['selection'], [], 'No margin is inferred from benchmark or added to CFU/CVU; commercial pricing remains outside B2 cost validation.'),
  ]
  if (sections.length !== 13 || new Set(sections.map(s => s.section)).size !== 13) throw new Error('SECTION_COVERAGE_MISMATCH')
  if (sections.reduce((n, s) => n + s.canonicalKeys.length, 0) !== rows.length) throw new Error('UNMAPPED_CANONICAL_KEYS')
  // Only conversions of identified public inputs belong in canonical units.
  // A family rate is never reverse-engineered into filter prices, tyre lives,
  // FTEs, insurance policies or arbitrary Qty/PU pairs.
  const mileKm = 1.609344, gallonLiters = 3.785411784
  type Transfer = Component & { country: 'MX' | 'US'; sourcePinIds: string[]; normalization: string; limitation: string }
  const transfer = (country: 'MX' | 'US', name: string, value: number, unit: string, period: string,
    sourcePinIds: string[], normalization: string, limitation: string): Transfer => ({
    ...component(name, value, unit, period, 'EXPLICIT_PUBLIC_TRANSFER_NOT_CALIBRATED'), country, sourcePinIds, normalization, limitation,
  })
  const transfers: Record<string, Transfer[]> = {
    'fcm.v3.fuel.diesel-mx': [transfer('MX', 'MX_NATIONAL_RETAIL', v.sourceLedger.mxFuelPrice.value, 'MXN/L', periods.mxFuel,
      ['fuelReference'], 'Native MXN/liter; USD/liter uses this value / dated FIX.', 'National dated retail, not route receipt or contractual price.')],
    'fcm.v3.fuel.diesel-us-border': [transfer('US', 'US_PADD3_RETAIL', v.sourceLedger.usFuelPrice.value / gallonLiters, 'USD/L', periods.usFuel,
      ['fuelReference'], 'USD/US-gallon / 3.785411784 liter/US-gallon.', 'PADD3 dated regional price, not certified border or inland purchasing mix.')],
    'fcm.v3.finance.tipo-de-cambio': [transfer('MX', 'DATED_FIX', fx, 'MXN/USD', v.fx.observationDate,
      ['datedFx'], 'Original dated FIX; no implicit exchange forecast.', 'Research valuation date, not settlement or service-date FX.')],
    'fcm.v3.labor.tarifa-operador-mx': [transfer('MX', 'MX_ADVERTISED_ROAD_PAY', rate('MX_DRIVER_PAY').nativePerKm * mileKm / fx,
      'USD/mile', planning, ['driverComponents', 'datedFx'], 'MXN/km × 1.609344 km/mile / dated FIX.',
      'Advertised road remuneration only; employer components replace this in the public pilot. Not total driver cost.')],
    'fcm.v3.labor.tarifa-operador-us': [transfer('US', 'US_SMALL_FLEET_WAGES_BENEFITS', rate('US_DRIVER_PAY').nativePerKm * mileKm,
      'USD/mile', periods.usDriver, ['driverComponents'], 'Published mileage pay normalized back from USD/km using 1.609344.',
      'Selected historical wages/benefits aggregate excludes unresolved incentives and employer scope.')],
  }
  for (const key of ['fcm.v3.fuel.rendimiento-cargado', 'fcm.v3.fuel.rendimiento-vacio']) {
    transfers[key] = [
      transfer('MX', 'MX_CONSTANT_ROAD_CONSUMPTION_TRANSFER', 1000 / v.mxLitersPer1000Km, 'km/L', periods.mxMaintenance,
        ['fuelReference', 'pilotVariables'], '1000 km / 483.92 liters.',
        'IMT flat-road 40-foot reference transferred to 53-foot and empty movement; not separate observed payload efficiencies.'),
      transfer('US', 'US_HISTORICAL_HEAVY_BIN_TRANSFER', v.sourceLedger.usPerformance.value * mileKm / gallonLiters, 'km/L', periods.usPerformance,
        ['fuelReference', 'pilotVariables'], '7.9 mile/US-gallon × 1.609344 km/mile / 3.785411784 liter/US-gallon.',
        'Historical heavy-bin performance transferred equally to loaded/empty; not an observed empty or target-asset efficiency.'),
    ]
  }
  const canonicalInputMatrix = rows.map(row => {
    const definition = PARAMETER_DEFINITIONS.find(d => d.key === row.key)!
    const family = sections.find(s => s.section === row.section)!
    const alternatives = transfers[row.key] ?? []
    for (const a of alternatives) {
      if (a.unit !== row.unit || !row.countries.includes(a.country)) throw new Error(`INPUT_TRANSFER_UNIT_SCOPE:${row.key}`)
      if (a.sourcePinIds.some(id => !pins.has(id))) throw new Error(`INPUT_TRANSFER_SOURCE:${row.key}`)
    }
    const relocatedDef = row.key === 'fcm.v3.cost-maint.reserve-def-urea'
    return { key: row.key, field: definition.field, section: row.section, canonicalUnit: row.unit,
      countryDependencies: row.countries.map(country => ({ country,
        rates: Object.entries(requirements[country]).filter(([, keys]) => keys.includes(row.key)).map(([name]) => name) })),
      historicalRegister: { status: row.status, sourceLocator: row.sourceLocator, adoptionGap: row.adoptionGap },
      canonicalValue: null, // No default/catalog value is an adopted benchmark.
      benchmarkAlternatives: alternatives,
      publicModelTreatment: relocatedDef ? 'SEPARATE_DEF_COMPONENT_DO_NOT_ADD_TO_MAINTENANCE' : alternatives.length
        ? 'EXPLICIT_PUBLIC_TRANSFER_NOT_CALIBRATED' : 'FAMILY_EVIDENCE_NOT_A_MICROPARAMETER_VALUE',
      economicDestination: relocatedDef ? 'CVU_OPERATING_FLUIDS' : family.economicRole,
      formula: relocatedDef ? 'DEF volume fraction × road+idle diesel consumed × DEF unit price, once outside maintenance.' : family.formula,
      familySourcePinIds: family.sourcePinIds, familyComponentNames: family.components.map(c => c.name),
      familyComponentsAreDirectInputValues: false,
      closureGap: relocatedDef ? 'Public pilot prices DEF separately; never inject its cost again through the legacy maintenance reserve.'
        : alternatives.length ? alternatives.map(a => a.limitation).join(' ') : `${row.adoptionGap} Family alternative: ${family.closureGap}`,
      calibrated: false, adopted: false }
  })
  // The135-rate register is not the210-input model catalog. Preserve both
  // scopes and expose references omitted by the benchmark adapter, without
  // adopting defaults or claiming that source inspection executes a branch.
  const completeCatalog = auditModelParameterConsumers(new Set(rows.map(row => row.key)))
  const completeCatalogMatrix = completeCatalog.keys.map(item => {
    const benchmark = canonicalInputMatrix.find(row => row.key === item.key)
    const family = sections.find(s => s.section === item.section)
    const relatedPublicFamilySourcePinIds = family?.sourcePinIds ?? ({
      BORDER: ['borderLinkPlanning', 'pilotRoadBorder', 'pilotOrdinaryDuty'],
      COST_CROSSBORDER: ['permitComponentScenario', 'companyServicesCfu', 'driverConnectivity', 'boxVisibility', 'crossborderInsuranceExposure'],
      CONFIG: ['economicProfiles', 'selection'],
    } as Record<string, string[]>)[item.section] ?? []
    for (const id of relatedPublicFamilySourcePinIds)
      if (!pins.has(id)) throw new Error(`MISSING_CATALOG_FAMILY_SOURCE:${item.section}:${id}`)
    return { ...item, benchmarkEvidenceState: benchmark?.historicalRegister.status ?? 'NOT_IN_BENCHMARK_REGISTER',
      benchmarkFamilySourcePinIds: benchmark?.familySourcePinIds ?? [],
      relatedPublicFamilySourcePinIds, relatedFamilyEvidenceIsDirectInputCalibration: false,
      benchmarkAlternatives: benchmark?.benchmarkAlternatives ?? [],
      economicDestination: benchmark?.economicDestination ?? family?.economicRole ??
        ({ BORDER: 'TRIP_BORDER_INPUTS', COST_CROSSBORDER: 'CFU_COMPLIANCE_AND_SHARED_SERVICES', CONFIG: 'OTHER_EQUIPMENT_OR_OPERATION_POLICY' } as Record<string, string>)[item.section] ?? 'UNMAPPED_ECONOMIC_ROLE',
      // Non-adapter inputs may already have family evidence or other consumers;
      // absence from this register is not evidence of zero or of inactivity.
      economicEvidenceComplete: false }
  })
  const canonicalTransfer = (key: string, country: 'MX' | 'US') => transfers[key].find(a => a.country === country)!.value
  const fuelRateVerification = (['MX', 'US'] as const).map(country => {
    const price = canonicalTransfer(country === 'MX' ? 'fcm.v3.fuel.diesel-mx' : 'fcm.v3.fuel.diesel-us-border', country)
    const usdPerLiter = country === 'MX' ? price / fx : price
    const loadedKmPerLiter = canonicalTransfer('fcm.v3.fuel.rendimiento-cargado', country)
    const emptyKmPerLiter = canonicalTransfer('fcm.v3.fuel.rendimiento-vacio', country)
    const recalculatedUsdPerKm = usdPerLiter / loadedKmPerLiter
    const declaredUsdPerKm = rate(`${country}_FUEL`).nativePerKm / (country === 'MX' ? fx : 1)
    if (!Number.isFinite(recalculatedUsdPerKm) || Math.abs(recalculatedUsdPerKm - declaredUsdPerKm) > 1e-10)
      throw new Error(`CANONICAL_FUEL_RATE_MISMATCH:${country}`)
    return { country, usdPerLiter, loadedKmPerLiter, emptyKmPerLiter, recalculatedUsdPerKm,
      declaredUsdPerKm, loadedEmptyEqualityIsDeclaredTransfer: true, formula: 'USD/liter / km/liter = USD/km', calibrated: false }
  })
  // Audit the current public-budget arithmetic against independent resource
  // inputs, not the obsolete seven-role pool or the older nominal box cycle.
  const partialCfuVerification = r.supportingPilotOrdinaryDuty.scenarios.flatMap(c => {
    const movement = r.supportingPilotCycleExposure.scenarios.find(s => s.id === c.id)
    if (!movement) throw new Error('CFU_CYCLE_JOIN_MISMATCH')
    return c.conditionalFixedAllocations.map(a => {
      const budget = r.supportingAdminScaleReference.scenarios.find(s => s.id === a.monthlyComponentScenarioId)
      if (!budget || new Set(a.resources.map(x => x.resourceId)).size !== 3) throw new Error('CFU_BUDGET_JOIN_MISMATCH')
      const resources = a.resources.map(x => {
        const physical = movement.allocationResources.find(y => y.resourceId === x.resourceId)
        if (!physical) throw new Error('CFU_RESOURCE_JOIN_MISMATCH')
        const days = x.resourceId === 'MX_TRACTOR' ? c.knownMxElapsedClockDays : x.resourceId === 'US_TRACTOR' ? c.knownUsElapsedClockDays : c.knownBoxClockDays
        const monthlyKm = x.resourceId === 'SHARED_TRAILER'
          ? physical.totalCycleKm * c.compatibleKnownCyclesPerMonth : physical.monthlyKmCapacity
        const monthlyUsd = budget.knownResourceMonthlyComponents[x.resourceId]
        const byDistance = monthlyUsd * physical.totalCycleKm / monthlyKm
        const byTime = monthlyUsd * days / r.supportingPilotCycleExposure.productiveElapsedAssetDaysPerMonth
        const recalculatedUsd = Math.max(byDistance, byTime)
        if (Math.abs(recalculatedUsd - x.conditionalOldDistanceKnownClockMaxUsd) > 1e-7) throw new Error('CFU_RESOURCE_ARITHMETIC_MISMATCH')
        return { resourceId: x.resourceId, monthlyUsd, cycleKm: physical.totalCycleKm, monthlyKm, cycleDays: days,
          monthlyProductiveDays: r.supportingPilotCycleExposure.productiveElapsedAssetDaysPerMonth, byDistance, byTime, recalculatedUsd }
      })
      const subtotalUsd = resources.reduce((n, x) => n + x.recalculatedUsd, 0)
      if (Math.abs(subtotalUsd - a.conditionalComponentAllocationUsd) > 1e-7) throw new Error('CFU_SUBTOTAL_ARITHMETIC_MISMATCH')
      return { cycleId: c.id, cashBudgetAlternative: a.monthlyComponentScenarioId, resources, subtotalUsd,
        basis: 'KNOWN_CASH_FIXED_COMPONENTS_ONLY_NOT_COMPLETE_CFU', boxChargedOnce: true,
        fullPilotCostUsd: null }
    })
  })
  return { model: 'FCM_B2_MODEL_INVENTORY_RECONCILIATION_V1',
    registerFile: CURRENT_REGISTER, registerSha256: createHash('sha256').update(markdown).digest('hex'),
    canonicalInventory: { documentedKeys: rows.length, candidates: rows.filter(r => r.status === 'CANDIDATO').length,
      contrasts: rows.filter(r => r.status === 'CONTRASTE').length, missingEvidence: rows.filter(r => r.status === 'FALTANTE').length,
      adoptedValues: 0, aggregateEvidenceDoesNotCalibrateMicroparameters: true },
    sourcePins: r.sourcePins, sourceRefreshPerformed: false,
    sections, canonicalInputMatrix, completeCatalog: { ...completeCatalog, keys: completeCatalogMatrix },
    tireFormulaVerification: auditTireFormulaBindings(), fixedMaintenanceFormulaVerification: auditFixedMaintenanceFormulaContracts(),
    fuelRateVerification, partialCfuVerification,
    matrixCoverage: { canonicalKeys: canonicalInputMatrix.length, keysWithExplicitPublicAlternatives: canonicalInputMatrix.filter(i => i.benchmarkAlternatives.length).length,
      microvaluesInferredFromAggregates: 0, defaultsAdopted: 0,
      authoritativeDependencies: 'benchmarkRateRequirements(MX/US), not copied register rate labels' },
    tripInputs: { names: ['loaded/empty distances', 'times', 'route tolls', 'border and incremental services'],
      role: 'SEPARATE_TRIP_DATA_NOT_OPERATING_BASE_MICROPARAMETERS',
      exactTollCoverageRequiredForModelValidation: false, costsRequiredForCompletePilotEstimate: true },
    baseSelectionComplete: false, calibrated: false, quoteReady: false, adoptedValues: 0,
    fullPilotOutputs: r.outputs, externalChanges: r.externalChanges }
}

/** Local review packet only. Templates are not persisted bases; dated family
 * transfers are not permission to fill a V3 version or publish a cost base. */
export function prepareOperatingBaseAdoptionPacket() {
  const report=reconcileEconomicModelInventory(readLocalDocument(CURRENT_REGISTER),consolidateBinationalReferenceBudget())
  const snapshot=RelaySnapshot.parse(relaySnapshot)
  if(createHash('sha256').update(JSON.stringify(snapshot.payload)).digest('hex')!==snapshot.sha256)
    throw new Error('ADOPTION_PLANNING_SNAPSHOT_DRIFT')
  const parameters=report.completeCatalog.keys.map(row=>({
    ...row,canonicalUnit:row.unit,proposedCanonicalValue:null,
    alternatives:row.benchmarkAlternatives,
    state:row.benchmarkAlternatives.length?'PUBLIC_TRANSFER_REVIEW_REQUIRED'
      :!row.staticEngineConsumers.length&&!row.consumedByBenchmark?'NO_LITERAL_READER_REVIEW'
      :row.relatedPublicFamilySourcePinIds.length?'FAMILY_EVIDENCE_ONLY':'INPUT_EVIDENCE_REQUIRED',
    adoptionBlockers:['COMPATIBLE_SCOPE_PERIOD_AND_EVIDENCE_REVIEW_REQUIRED','SPECIFIC_VALUE_ADOPTION_NOT_AUTHORIZED'],
  }))
  const segmentTemplates=OPERATIONAL_SEGMENTS.map(segment=>{
    const profile=segment.status==='CONFIGURABLE'?defaultCostBaseProfile(segment.scope):null
    const fields=profile?PARAMETER_DEFINITIONS.map(d=>({key:d.key,...parameterApplicability(segment.scope,d,profile)})):[]
    return {id:segment.id,label:segment.label,scope:segment.scope,modelStatus:segment.status,
      applicabilityReference:'DEFAULT_V3_TEMPLATE_NOT_OBSERVED_BASE',profile,fields,
      readyForAdoption:false,blockers:profile?['NO_REVIEWED_VALUES_OR_BASE_VERSION','FAMILY_EVIDENCE_IS_NOT_MICROPARAMETER_CALIBRATION']
        :['SEGMENT_MODEL_PENDING_NO_PROFILE_INFERRED']}
  })
  const v3BorderProcess=defaultCostBaseProfile('CROSS_BORDER').borderProcess
  const methodBridgeRequired=String(v3BorderProcess)!==String(snapshot.payload.borderProcess)
  return {model:'FCM_S2_OPERATING_BASE_ADOPTION_REVIEW_V1',
    inventory:{keys:parameters.length,benchmark:report.completeCatalog.counts.benchmark,
      outsideBenchmark:report.completeCatalog.counts.outsideBenchmark,
      withoutLiteralReader:report.completeCatalog.counts.outsideBenchmarkWithoutLiteralReader},
    register:{file:CURRENT_REGISTER,sha256:report.registerSha256,historicalCounts:report.canonicalInventory},
    parameters,sectionCoverage:report.completeCatalog.sectionCoverage,
    economicFamilies:report.sections,planningAssumptions:readB2PlanningPolicy(),
    planningAssumptionsPin:B2_PLANNING_POLICY_PIN,
    sourcePins:report.sourcePins,segmentTemplates,
    pilot:{borderProcess:snapshot.payload.borderProcess,v3BorderProcess,methodBridgeRequired,
      snapshotSha256:snapshot.sha256,referencePeriod:snapshot.payload.referencePeriod,
      caseCount:snapshot.payload.cases.length,sourcePinCount:snapshot.payload.sourcePins.length,
      planningFlags:{calibrated:snapshot.payload.calibrated,quoteReady:snapshot.payload.quoteReady},
      blockers:['OWN_RELAY_TO_V3_BRIDGE_NOT_IMPLEMENTED','CANONICAL_TRANSFERS_HAVE_DIFFERENT_REFERENCE_PERIODS',
        'PLANNING_RESERVES_NOT_TARGET_MARKET_OBSERVATIONS','RISK_PURCHASE_SALE_MARGIN_POLICIES_SEPARATE']},
    adoptedValues:0,quoteReady:false,persistedBasesInspected:false,externalWrites:false,
    sourceRefreshPerformed:false,defaultsUsedAsEvidence:false,
    decision:'REVIEW_PACKET_COMPLETE_OPERATIONAL_ADOPTION_OPEN',
    boundaries:['Static readers prove source references, not execution for every segment.',
      'Seven canonical fields with public alternatives do not calibrate the remaining fields.',
      'The planning snapshot is hash-validated here; its88 sources are not individually refreshed or reverified by this packet.',
      'This report neither approves an economic value nor mutates base parameters, formulas, users or infrastructure.']}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw new Error('Usage: tsx apps/api/scripts/reconcile-economic-model-inventory.ts')
    console.log(JSON.stringify(reconcileEconomicModelInventory(readLocalDocument(CURRENT_REGISTER), consolidateBinationalReferenceBudget()), null, 2))
    process.exitCode = 2 // Report delivered; economic calibration/pilot still incomplete.
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Model inventory reconciliation failed')
    process.exitCode = 1
  }
}
