import { describe, expect, it } from 'vitest'
import { BINATIONAL_RESOURCES, BinationalFixedBudgetSchema, reconcileBinationalFixedBudget } from '../src/modules/engine/benchmark-binational-budget.js'
import { prepareD2DReadinessCase } from '../scripts/prepare-d2d-readiness-case.js'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'
import { readRouteSource } from '../scripts/review-d2d-route-evidence.js'

const load = (file: string) => JSON.parse(readLocalDocument(`docs/research/${file}`))
const manifest = () => load('B2_BINATIONAL_FIXED_BUDGET_WORKSHEET_2026-10-01.json')

/** Every number below is synthetic. None is a benchmark or adopted rate. */
function fixture() {
  const raw = manifest().budget
  raw.referencePeriod = '2026-10'
  raw.resources.forEach((r: {profileReference: string | null}) => { r.profileReference = 'SYNTHETIC_PROFILE_NOT_A_CARRIER' })
  raw.evidence = [{ id: 'fixture', url: 'https://example.org/synthetic', locator: 'Unit test only',
    observedAt: '2026-10-01', referencePeriod: '2026-10', groupReference: raw.groupReference,
    resourceIds: [...BINATIONAL_RESOURCES], kind: 'DOCUMENTED_PUBLIC_MODEL', limitations: 'Synthetic, not public observations' }]
  raw.evidence[0].profileReferences = raw.resources.map((r: { resourceId: string; profileReference: string }) => ({...r}))
  raw.expenses.forEach((e: {amount: unknown; scope: string; allocations: {share: number | null}[]}) => {
    e.amount = { value: 100, unit: 'USD/month', referencePeriod: '2026-10', evidenceIds: ['fixture'],
      derivation: 'Synthetic amount only', kind: 'DOCUMENTED_PUBLIC_MODEL' }
    if (e.scope === 'GROUP_SHARED') e.allocations.forEach((a, i) => { a.share = [0.6, 0.3, 0.1][i] })
  })
  return BinationalFixedBudgetSchema.parse(raw)
}
const codes = (raw: unknown) => reconcileBinationalFixedBudget(raw).issues.map(i => i.code)
const prepare = (budget = manifest()) => prepareD2DReadinessCase(load('B2_D2D_READINESS_CASE_2026-09-30.json'),
  readLocalDocument, load('B2_D2D_SAKBE_ROUTE_LINK_2026-09-30.json'), load('B2_MX_TOLL_FOLLOWUP_2026-09-30.json'),
  readRouteSource, load('B2_BINATIONAL_OWN_RELAY_SELECTED.json'), budget)

describe('one binational monthly pool, three resources; no adoption', () => {
  it('conserves one shared admin/company expense rather than charging it twice', () => {
    const result = reconcileBinationalFixedBudget(fixture())
    expect(result.issues).toEqual([])
    expect(result).toMatchObject({status:'BUDGET_SCENARIO_ONLY',monthlyGroupTotalUsd:1000,
      monthlyFixedUsdByResource:{MX_TRACTOR:360,US_TRACTOR:330,SHARED_TRAILER:310},
      cfuUsd:null,cvuUsd:null,calibrated:false,quoteReady:false,adoptedValues:0})
    expect(result.allocations!.find(e => e.family === 'ADMIN_AND_COMPANY')!.resources.map(r => r.monthlyUsd)).toEqual([60,30,10])
  })
  it('preserves a one-cent pool and makes tie rounding independent of row order', () => {
    const raw = fixture(), pool = raw.expenses.at(-1)!
    pool.amount!.value = 0.01
    pool.allocations.forEach(a => { a.share = 1/3 })
    const before = reconcileBinationalFixedBudget(raw)
    pool.allocations.reverse(); raw.expenses.reverse(); raw.resources.reverse()
    const after = reconcileBinationalFixedBudget(raw)
    expect(after.monthlyFixedUsdByResource).toEqual(before.monthlyFixedUsdByResource)
    expect(before.allocations!.find(e => e.family === 'ADMIN_AND_COMPANY')!.resources.map(r => r.monthlyUsd)).toEqual([0.01,0,0])
    expect(before.monthlyGroupTotalUsd).toBe(900.01)
  })
  it('allows a documented zero but never makes a missing value zero', () => {
    const raw = fixture()
    raw.expenses[0].amount!.value = 0; raw.expenses[0].amount!.kind = 'DOCUMENTED_ZERO'
    expect(codes(raw)).toEqual([])
    raw.expenses[0].amount = null
    expect(reconcileBinationalFixedBudget(raw).monthlyFixedUsdByResource).toBeNull()
  })
  it.each([
    ['missing amount', 'MISSING_MONTHLY_AMOUNT', (r: ReturnType<typeof fixture>) => { r.expenses[0].amount = null }],
    ['missing month', 'MISSING_REFERENCE_PERIOD', (r: ReturnType<typeof fixture>) => { r.referencePeriod = null }],
    ['missing profile', 'MISSING_COMPATIBLE_PROFILE', (r: ReturnType<typeof fixture>) => { r.resources[0].profileReference = null }],
    ['expense duplicated', 'DUPLICATE_ECONOMIC_EXPENSE', (r: ReturnType<typeof fixture>) => { r.expenses.push(structuredClone(r.expenses[0])) }],
    ['whole group charged twice', 'ALLOCATION_MUST_SUM_TO_ONE', (r: ReturnType<typeof fixture>) => { r.expenses.at(-1)!.allocations.forEach(a => { a.share = 1 }) }],
    ['split missing', 'MISSING_ALLOCATION_SHARE', (r: ReturnType<typeof fixture>) => { r.expenses.at(-1)!.allocations[0].share = null }],
    ['partial direct allocation', 'DIRECT_ALLOCATION_MUST_BE_WHOLE', (r: ReturnType<typeof fixture>) => { r.expenses[0].allocations[0].share = 0.5 }],
    ['missing group resource', 'GROUP_ALLOCATION_MUST_DECLARE_ALL_RESOURCES', (r: ReturnType<typeof fixture>) => { r.expenses.at(-1)!.allocations.pop() }],
    ['duplicate resource', 'DUPLICATE_RESOURCE_ALLOCATION', (r: ReturnType<typeof fixture>) => { r.expenses.at(-1)!.allocations[1].resourceId = 'MX_TRACTOR' }],
    ['duplicate cost centre', 'REQUIRE_ONE_RESOURCE', (r: ReturnType<typeof fixture>) => { r.resources[1].resourceId = 'MX_TRACTOR' }],
    ['principal counted as capital', 'COST_BASIS_MISMATCH', (r: ReturnType<typeof fixture>) => { r.expenses[0].basis = 'TOTAL_LOAN_PAYMENT' }],
    ['fractional cent', 'AMOUNT_MUST_BE_SAFE_WHOLE_CENTS', (r: ReturnType<typeof fixture>) => { r.expenses[0].amount!.value = 0.001 }],
    ['undeclared zero', 'ZERO_REQUIRES_EXPLICIT_BASIS', (r: ReturnType<typeof fixture>) => { r.expenses[0].amount!.value = 0 }],
    ['zero label on a charge', 'ZERO_REQUIRES_EXPLICIT_BASIS', (r: ReturnType<typeof fixture>) => { r.expenses[0].amount!.kind = 'DOCUMENTED_ZERO' }],
    ['different amount period', 'BUDGET_PERIOD_MISMATCH', (r: ReturnType<typeof fixture>) => { r.expenses[0].amount!.referencePeriod = '2026-09' }],
    ['different source period', 'EVIDENCE_BUDGET_SCOPE_MISMATCH', (r: ReturnType<typeof fixture>) => { r.evidence[0].referencePeriod = '2026-09' }],
    ['different group', 'EVIDENCE_BUDGET_SCOPE_MISMATCH', (r: ReturnType<typeof fixture>) => { r.evidence[0].groupReference = 'OTHER' }],
    ['different equipment profile', 'EVIDENCE_PROFILE_MISMATCH', (r: ReturnType<typeof fixture>) => { r.evidence[0].profileReferences[0].profileReference = 'OTHER_COHORT' }],
    ['context not budget', 'CONTEXT_ONLY_SOURCE', (r: ReturnType<typeof fixture>) => { r.evidence[0].kind = 'CONTEXT_ONLY' }],
    ['unknown source', 'MISSING_EVIDENCE', (r: ReturnType<typeof fixture>) => { r.expenses[0].amount!.evidenceIds = ['unknown'] }],
    ['duplicate source ref', 'DUPLICATE_REFERENCE', (r: ReturnType<typeof fixture>) => { r.expenses[0].amount!.evidenceIds.push('fixture') }],
    ['source does not cover all resources', 'EVIDENCE_RESOURCE_SCOPE_MISMATCH', (r: ReturnType<typeof fixture>) => { r.evidence[0].resourceIds = ['MX_TRACTOR'] }],
    ['model falsely called observation', 'EVIDENCE_KIND_MISMATCH', (r: ReturnType<typeof fixture>) => { r.expenses[0].amount!.kind = 'PUBLIC_OBSERVATION' }],
  ] as const)('rejects %s and emits no budget', (_name, code, mutate) => {
    const raw = fixture(); mutate(raw)
    expect(codes(raw)).toContain(code)
    expect(reconcileBinationalFixedBudget(raw).monthlyFixedUsdByResource).toBeNull()
  })
  it('rejects combined overhead plus detailed payroll/company and missing family coverage', () => {
    const raw = fixture()
    raw.expenses.push({...structuredClone(raw.expenses[0]),economicExpenseId:'EXTRA_ADMIN',family:'ADMIN_PAYROLL',basis:'EMPLOYER_COST_INCLUDES_BENEFITS'})
    expect(codes(raw)).toContain('COMBINED_AND_DETAILED_ADMIN_OVERLAP')
    const missing = fixture(); missing.expenses = missing.expenses.filter(e => e.family !== 'INSURANCE')
    expect(codes(missing)).toContain('MISSING_INSURANCE_BUDGET')
  })
  it('rejects unsafe money, negative shares and client adoption fields', () => {
    const raw = fixture(); raw.expenses[0].amount!.value = Number.MAX_SAFE_INTEGER
    expect(codes(raw)).toContain('AMOUNT_MUST_BE_SAFE_WHOLE_CENTS')
    const negative = fixture(); negative.expenses[0].allocations[0].share = -1
    expect(() => reconcileBinationalFixedBudget(negative)).toThrow()
    expect(() => reconcileBinationalFixedBudget({...fixture(),calibrated:true})).toThrow()
    expect(() => reconcileBinationalFixedBudget({...fixture(),cfuUsd:99})).toThrow()
  })
  it('retains an incomplete real worksheet bound to the selected case without invoking pricing', () => {
    const after = prepare()
    const before = prepareD2DReadinessCase(load('B2_D2D_READINESS_CASE_2026-09-30.json'),readLocalDocument,
      load('B2_D2D_SAKBE_ROUTE_LINK_2026-09-30.json'),load('B2_MX_TOLL_FOLLOWUP_2026-09-30.json'),
      readRouteSource,load('B2_BINATIONAL_OWN_RELAY_SELECTED.json'))
    expect(after.readiness.supportingFixedBudget).toMatchObject({status:'INCOMPLETE',pinsVerified:2,
      monthlyFixedUsdByResource:null,canonicalRatesCreated:false,adoptedValues:0})
    expect(after.readiness.supportingFixedBudget!.issues).toHaveLength(15)
    expect(after.readiness.lineage).toEqual(before.readiness.lineage)
    expect(after.readiness.issues).toEqual(before.readiness.issues)
    expect(after.readiness).toMatchObject({costs:null,compositorInvoked:false})
    expect(after.decision).toMatchObject({budgetWorksheetConnected:true,budgetScenarioComplete:false,businessGatesClosed:0})
  })
  it('checks original hashes and requires the selected own-relay variant', () => {
    const raw = manifest(); raw.selectionPin.sha256 = '0'.repeat(64)
    expect(() => prepare(raw)).toThrow('BUDGET_PIN_HASH_MISMATCH')
    expect(() => prepareD2DReadinessCase(load('B2_D2D_READINESS_CASE_2026-09-30.json'),readLocalDocument,
      undefined,undefined,readRouteSource,load('B2_BINATIONAL_BORDER_2026-09-30.json'),manifest())).toThrow('BUDGET_SELECTED_RELAY_REQUIRED')
  })
})
