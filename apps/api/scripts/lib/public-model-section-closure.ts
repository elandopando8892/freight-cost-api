import { PARAMETER_DEFINITIONS } from '../../src/data/parameter-catalog.js'
import { benchmarkRateRequirements } from '../../src/modules/engine/benchmark-rates.js'
import { BINATIONAL_RESOURCES } from '../../src/modules/engine/benchmark-binational-budget.js'
import { PILOT_VARIABLE_CONCEPTS } from '../../src/modules/engine/benchmark-binational-cost-projection.js'
import type { calculateBinationalBudgetCostProjection } from '../../src/modules/engine/benchmark-binational-cost-projection.js'
import type { composePublicMonthlyBudget } from '../compose-public-monthly-budget.js'
import { auditTireFormulaBindings } from './model-parameter-consumers.js'
import { auditFixedMaintenanceFormulaContracts } from './model-formula-contracts.js'

type Monthly = ReturnType<typeof composePublicMonthlyBudget>
type Projection = ReturnType<typeof calculateBinationalBudgetCostProjection>
type Case = { cycleId: string; projection: Projection; knownFixedAllocatedSubtotalUsd: number; knownCostComponentsUsd: number }
type Concept = typeof PILOT_VARIABLE_CONCEPTS[number]
type Layer = 'OPERATING_BASE' | 'TRIP_INPUT' | 'SERVICE_SCOPE'

// Monetary ownership is exclusive. FINANCE/UTILIZATION explain transformations,
// not additional copies of capital/CFU. This crosswalk does NOT distribute a
// family aggregate among canonical microinputs or certify every field formula.
const fixedSections = {
  CAPITAL: 'COST_CAPITAL', INSURANCE: 'COST_INSURANCE', ADMIN_PAYROLL: 'COST_PAYROLL',
  COMPANY: 'COST_COMPANY', PERMITS: 'COST_CROSSBORDER',
} as const
const variableSections: Record<Concept, { section: string; layer: Layer }> = {
  MX_ROAD_FUEL: { section: 'FUEL', layer: 'OPERATING_BASE' },
  US_ROAD_FUEL: { section: 'FUEL', layer: 'OPERATING_BASE' },
  MX_IDLE_FUEL: { section: 'FUEL', layer: 'OPERATING_BASE' },
  US_IDLE_FUEL: { section: 'FUEL', layer: 'OPERATING_BASE' },
  MX_DEF: { section: 'FUEL', layer: 'OPERATING_BASE' },
  US_DEF: { section: 'FUEL', layer: 'OPERATING_BASE' },
  MX_DRIVER_TOTAL: { section: 'LABOR', layer: 'OPERATING_BASE' },
  US_DRIVER_TOTAL: { section: 'LABOR', layer: 'OPERATING_BASE' },
  MX_ATTACHED_MAINT_LUBE: { section: 'COST_MAINT', layer: 'OPERATING_BASE' },
  MX_BOBTAIL_MAINT_LUBE: { section: 'COST_MAINT', layer: 'OPERATING_BASE' },
  US_ATTACHED_MAINT_LUBE: { section: 'COST_MAINT', layer: 'OPERATING_BASE' },
  MX_ATTACHED_TIRES: { section: 'COST_TIRES', layer: 'OPERATING_BASE' },
  MX_BOBTAIL_TIRES: { section: 'COST_TIRES', layer: 'OPERATING_BASE' },
  US_ATTACHED_TIRES: { section: 'COST_TIRES', layer: 'OPERATING_BASE' },
  MX_ROAD_TOLLS: { section: 'GENERAL_BASE', layer: 'TRIP_INPUT' },
  US_ROAD_TOLLS: { section: 'GENERAL_BASE', layer: 'TRIP_INPUT' },
  BRIDGE_TOLLS: { section: 'BORDER', layer: 'TRIP_INPUT' },
  HANDOFF_INCREMENTAL_SERVICES: { section: 'BORDER', layer: 'TRIP_INPUT' },
  MX_TRAVEL_EXPENSES: { section: 'LABOR', layer: 'OPERATING_BASE' },
  SUPPLEMENTAL_CARGO_VALUE_INSURANCE: { section: 'COST_INSURANCE', layer: 'SERVICE_SCOPE' },
}
const context: Record<string, string> = {
  GENERAL_BASE: 'Pilot profile and expense bearer; trip tolls are not base microparameters.',
  COST_CAPITAL: 'Supported acquisition/residual/holding alternatives, not quoted carrier assets.',
  COST_INSURANCE: 'Premium components do not certify foreign territory, custody or cargo coverage.',
  COST_PAYROLL: 'One administrative employer-cost pool; no driver pay added to this pool.',
  COST_COMPANY: 'Bounded service basket, not invented prices for all company Qty/PU fields.',
  COST_MAINT: 'Aggregate versus detailed schedule are alternatives; included lubricant/DEF boundaries matter.',
  COST_TIRES: 'Public aggregates and detailed physical lifecycles are alternatives. Legacy price permutation is diagnosed; canonical additive retreads are blocked until their position/lifecycle is explicit.',
  FINANCE: 'Financed capital replaces cash capital. Dated FX is not future settlement FX; XBF working capital is separate.',
  FUEL: 'Dated prices and historical performance transfers; loaded/empty/idle/DEF hypotheses are not measured consumption.',
  LABOR: 'Driver earnings, employer costs, fixed quota and travel must have disjoint inclusions.',
  UTILIZATION: 'Capacity/time/km/empty assumptions transform fixed cost; not a second expense or actual duty roster.',
  RISK: 'Retained-risk policy is separate; neither calibrated nor implicitly zero.',
  TECHNICAL_MARGIN: 'Negotiated buy, selling price and margin are outside the productive-cost estimate.',
  BORDER: 'Aggregated incremental crossing/relay inputs, not a new research project for each plaza.',
  CONFIG: 'Only this dry-van own-relay profile is modeled; other modalities/equipment remain uncalibrated.',
  COST_CROSSBORDER: 'Fixed compliance family owns supported permit components once, including domestic obligations.',
}
const close = (actual: number | null, expected: number, code: string) => {
  if (actual === null || !Number.isFinite(actual) || !Number.isFinite(expected) || Math.abs(actual - expected) > 1e-7)
    throw new Error(`MODEL_CLOSURE_${code}`)
}

/** Derived closure view of the EXISTING public compositor. Recheck conservation
 * and MAX allocation, preserve missing scope, and separate base gaps from trip
 * data. Not another engine, source refresh, canonical adoption or release gate. */
export function auditPublicModelSectionClosure(monthly: Monthly, cases: readonly Case[]) {
  const expectedCycles = ['NETWORK_EXPECTED_EMPTY_PROXY', 'DEDICATED_EMPTY_SAME_BOX_RETURN']
  if (cases.length !== 2 || expectedCycles.some(id => cases.filter(c => c.cycleId === id).length !== 1))
    throw new Error('MODEL_CLOSURE_CYCLE_IDENTITY')
  const expenses = monthly.budget.expenses
  if (new Set(expenses.map(e => e.economicExpenseId)).size !== expenses.length) throw new Error('MODEL_CLOSURE_EXPENSE_IDENTITY')
  if (expenses.filter(e => e.family === 'ADMIN_PAYROLL').length !== 1) throw new Error('MODEL_CLOSURE_SINGLE_ADMIN_POOL')
  for (const owner of BINATIONAL_RESOURCES) {
    if (expenses.filter(e => e.family === 'CAPITAL' && e.scope === 'DIRECT_RESOURCE' &&
      e.allocations.length === 1 && e.allocations[0].resourceId === owner).length !== 1)
      throw new Error('MODEL_CLOSURE_SINGLE_RESOURCE_CAPITAL')
  }
  const fixedComponents = expenses.map(e => {
    if (e.family === 'ADMIN_AND_COMPANY') throw new Error('MODEL_CLOSURE_COMBINED_FAMILY_REQUIRES_CROSSWALK')
    return { id: e.economicExpenseId, section: fixedSections[e.family], layer: 'OPERATING_BASE' as const,
      scope: e.scope, allocations: e.allocations, amountMonthlyUsd: e.amount?.value ?? null,
      evidenceIds: e.amount?.evidenceIds ?? [], derivation: e.amount?.derivation ?? null,
      state: e.amount === null ? 'MISSING' as const : 'DOCUMENTED_COMPONENT' as const,
      remaining: e.amount === null ? e.allocationRationale : null }
  })
  close(monthly.knownGroupMonthlyComponentUsd, expenses.reduce((n, e) => n + (e.amount?.value ?? 0), 0), 'MONTHLY_SUM')
  const allocatedCents = Object.fromEntries(BINATIONAL_RESOURCES.map(id => [id, 0])) as Record<typeof BINATIONAL_RESOURCES[number], number>
  for (const expense of expenses) {
    if (!expense.amount) continue
    if (expense.allocations.some(a => a.share === null || !BINATIONAL_RESOURCES.includes(a.resourceId)) ||
      new Set(expense.allocations.map(a => a.resourceId)).size !== expense.allocations.length)
      throw new Error('MODEL_CLOSURE_POOL_SHARES')
    close(expense.allocations.reduce((n, a) => n + a.share!, 0), 1, 'POOL_SHARES')
    const cents = Math.round(expense.amount.value * 100)
    close(expense.amount.value * 100, cents, 'WHOLE_CENTS')
    const parts = BINATIONAL_RESOURCES.map(id => {
      const raw = cents * (expense.allocations.find(a => a.resourceId === id)?.share ?? 0)
      return { id, cents: Math.floor(raw), remainder: raw - Math.floor(raw) }
    })
    const remainder = cents - parts.reduce((n, p) => n + p.cents, 0)
    if (remainder < 0 || remainder > parts.length) throw new Error('MODEL_CLOSURE_POOL_ROUNDING')
    const ranked = [...parts].sort((a, b) => b.remainder - a.remainder || BINATIONAL_RESOURCES.indexOf(a.id) - BINATIONAL_RESOURCES.indexOf(b.id))
    ranked.slice(0, remainder).forEach(p => { p.cents++ })
    for (const p of parts) allocatedCents[p.id] += p.cents
  }
  for (const id of BINATIONAL_RESOURCES) close(monthly.knownMonthlyComponentsUsdByResource[id], allocatedCents[id] / 100, 'POOL_RESOURCE_ALLOCATION')
  close(Object.values(monthly.knownMonthlyComponentsUsdByResource).reduce((n, v) => n + v, 0),
    monthly.knownGroupMonthlyComponentUsd, 'MONTHLY_POOL_CONSERVATION')
  const benchmarkKeys = new Set([...Object.values(benchmarkRateRequirements('MX')).flat(), ...Object.values(benchmarkRateRequirements('US')).flat()])
  const sections = [...new Set(PARAMETER_DEFINITIONS.map(p => p.section))]
  if (sections.some(s => !context[s])) throw new Error('MODEL_CLOSURE_UNMAPPED_SECTION')
  const scenarios = cases.map(c => {
    const p = c.projection, rows = p.lineage.variableCosts
    if (p.cycleScenarioId !== c.cycleId || rows.length !== PILOT_VARIABLE_CONCEPTS.length ||
      PILOT_VARIABLE_CONCEPTS.some(id => rows.filter(r => r.conceptId === id).length !== 1))
      throw new Error('MODEL_CLOSURE_VARIABLE_IDENTITY')
    if (JSON.stringify(p.lineage.budget.expenses) !== JSON.stringify(expenses)) throw new Error('MODEL_CLOSURE_BUDGET_IDENTITY')
    const allocation = monthly.knownCfuAllocations.find(a => a.cycleId === c.cycleId)
    if (!allocation || allocation.resources.length !== 3 || p.lineage.exposures.length !== 3)
      throw new Error('MODEL_CLOSURE_EXPOSURE_IDENTITY')
    const allocations = BINATIONAL_RESOURCES.map(id => {
      const a = allocation.resources.filter(r => r.resourceId === id), e = p.lineage.exposures.filter(r => r.resourceId === id)
      if (a.length !== 1 || e.length !== 1) throw new Error('MODEL_CLOSURE_EXPOSURE_IDENTITY')
      const exposure = e[0], monthlyUsd = monthly.knownMonthlyComponentsUsdByResource[id]
      close(a[0].monthlyUsd, monthlyUsd, 'RESOURCE_MONTHLY')
      const byKm = monthlyUsd * exposure.totalCycleKm / exposure.productiveKmPerMonth
      const byTime = monthlyUsd * exposure.cycleDays / exposure.productiveDaysPerMonth
      close(a[0].byDistanceUsd, byKm, 'DISTANCE_ALLOCATION')
      close(a[0].byTimeUsd, byTime, 'TIME_ALLOCATION')
      close(a[0].knownAllocatedFixedComponentUsd, Math.max(byKm, byTime), 'MAX_ALLOCATION')
      return { resourceId: id, knownMonthlyUsd: monthlyUsd, byDistanceUsd: byKm, byTimeUsd: byTime,
        knownAllocatedFixedUsd: Math.max(byKm, byTime) }
    })
    const driverFixed = p.lineage.fixedOperatingComponent
    if (!driverFixed || expenses.some(e => e.economicExpenseId === driverFixed.conceptId)) throw new Error('MODEL_CLOSURE_FIXED_DRIVER_PARTITION')
    const driverFixedUsd = driverFixed.monthlyUsd / driverFixed.compatibleCyclesPerMonth
    close(p.fixedOperatingAllocationUsd, driverFixedUsd, 'FIXED_DRIVER_ALLOCATION')
    close(c.knownFixedAllocatedSubtotalUsd, allocations.reduce((n, a) => n + a.knownAllocatedFixedUsd, 0) + driverFixedUsd, 'FIXED_SUBTOTAL')
    const variableComponents = rows.map(r => ({ id: r.conceptId, ...variableSections[r.conceptId],
      resourceId: r.resourceId, amountCycleUsd: r.amountUsd, state: r.disposition,
      evidenceIds: r.evidenceIds, derivation: r.derivation, remaining: r.unresolvedRationale ??
        (r.disposition === 'MISSING' ? 'Required service input remains unpriced; absence is not zero.' : null) }))
    const knownVariableUsd = rows.reduce((n, r) => n + (r.amountUsd ?? 0), 0)
    close(p.knownVariableSubtotalUsd, knownVariableUsd, 'VARIABLE_SUBTOTAL')
    close(c.knownCostComponentsUsd, c.knownFixedAllocatedSubtotalUsd + knownVariableUsd, 'KNOWN_COST_SUM')
    const gaps = [...fixedComponents.filter(r => r.state === 'MISSING').map(r => ({ id: r.id, section: r.section,
      layer: r.layer, state: r.state, remaining: r.remaining })),
    ...variableComponents.filter(r => r.state === 'MISSING' || r.state === 'DOCUMENTED_PARTIAL')
      .map(r => ({ id: r.id, section: r.section, layer: r.layer, state: r.state, remaining: r.remaining }))]
    return { cycleId: c.cycleId, allocations, fixedDriverComponent: { id: driverFixed.conceptId, section: 'LABOR',
      monthlyUsd: driverFixed.monthlyUsd, knownAllocatedFixedUsd: driverFixedUsd, evidenceIds: driverFixed.evidenceIds },
      variableComponents, gaps,
      gapCounts: { operatingBase: gaps.filter(g => g.layer === 'OPERATING_BASE').length,
        tripInputs: gaps.filter(g => g.layer === 'TRIP_INPUT').length, serviceScope: gaps.filter(g => g.layer === 'SERVICE_SCOPE').length },
      completeOutputs: p.outputs, knownCostComponentsUsd: c.knownCostComponentsUsd,
      completeCostReady: p.outputs.productiveCostUsd !== null && gaps.length === 0 }
  })
  return { model: 'FCM_B2_PUBLIC_MODEL_SECTION_CLOSURE_V1',
    scope: 'PUBLIC_FAMILY_PILOT_NOT_CANONICAL_MICROINPUT_CALIBRATION',
    tireFormulaVerification: auditTireFormulaBindings(),
    fixedMaintenanceFormulaVerification: auditFixedMaintenanceFormulaContracts(),
    sections: sections.map(section => {
      const keys = PARAMETER_DEFINITIONS.filter(p => p.section === section)
      const fixed = fixedComponents.filter(c => c.section === section)
      const cycles = scenarios.map(s => ({ cycleId: s.cycleId,
        components: s.variableComponents.filter(c => c.section === section),
        gaps: s.gaps.filter(g => g.section === section) }))
      return { section, catalogKeys: keys.length, benchmarkKeys: keys.filter(p => benchmarkKeys.has(p.key)).length,
        context: context[section], fixedComponents: fixed, cycleCoverage: cycles,
        state: section === 'TECHNICAL_MARGIN' ? 'OUTSIDE_PRODUCTIVE_COST' : section === 'RISK' ? 'SEPARATE_RISK_POLICY_NOT_ZERO' :
          cycles.some(c => c.gaps.length) ? 'INCOMPLETE_COMPONENT_SCOPE' : fixed.length || cycles.some(c => c.components.length)
            ? 'COMPONENTS_DOCUMENTED_NOT_CALIBRATED' : 'MODEL_CONTEXT_NOT_INDIVIDUALLY_CALIBRATED',
        canonicalValuesAdopted: 0, allIndividualFormulasValidated: false, matchedAssetCalibration: false }
    }),
    fixedComponents, scenarios,
    checkedInvariants: ['ONE_ADMIN_POOL', 'ONE_CAPITAL_ALLOCATION_PER_RESOURCE', 'MONTHLY_POOL_CONSERVATION', 'POOL_RESOURCE_CENTS_ALLOCATION',
      'RESOURCE_MAX_TIME_DISTANCE', 'FIXED_DRIVER_OUTSIDE_ADMIN_AND_CVU', 'TWENTY_VARIABLE_CONCEPT_IDENTITIES', 'KNOWN_SUMS_RECONCILED'],
    exactTollCoverageRequiredForModelValidation: false, tripCostsRequiredForCompleteEstimate: true,
    microvaluesInferredFromAggregates: 0, sourceRefreshPerformed: false,
    calibrated: false, quoteReady: false, adoptedValues: 0, externalWrites: false }
}
