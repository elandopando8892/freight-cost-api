import { beforeAll, describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { composeB2PlanningScenario } from '../scripts/compose-b2-planning-scenario.js'
import { reviewB2SeptemberLabor } from '../scripts/review-b2-september-labor.js'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'
import { assertB2SeptemberBaseline, B2_PLANNING_POLICY_PIN, B2_SEPTEMBER_BASELINE_SHA256,
  calculateB2PlanningFixedRemainders, calculateB2PlanningLodging, readB2PlanningPolicy } from '../scripts/lib/b2-planning-scenario.js'
import { calculateBinationalBudgetCostProjection, PILOT_VARIABLE_CONCEPTS } from '../src/modules/engine/benchmark-binational-cost-projection.js'

let report: ReturnType<typeof composeB2PlanningScenario>
let baseline: ReturnType<typeof reviewB2SeptemberLabor>
const policy = readB2PlanningPolicy()
beforeAll(() => { baseline = reviewB2SeptemberLabor(); report = composeB2PlanningScenario() }, 60000)
const oldCase = (c: typeof report.cases[number]) => baseline.cases.find(v => v.cycleId === c.cycleId &&
  v.fx.date === c.fx.date && v.restInterpretation === c.restInterpretation)!
const round = (n: number) => Math.round(n * 100) / 100

describe('B2 authorized planning closure is not operational calibration or adoption', () => {
  it('closes exactly the new human-authorized scope, without endorsing market calibration', () => {
    expect(report).toMatchObject({ b2PlanningComplete: true, b2Complete: true, arithmeticComplete: true,
      humanAcceptedResults: false, allCanonicalInputsCalibrated: false, operationalCalibrationComplete: false,
      completionScope: 'PUBLIC_PLANNING_VALIDATION_ONLY_NOT_OPERATIONAL_CALIBRATION_OR_ADOPTION',
      quoteReady: false, adoptedValues: 0, externalWrites: false })
    expect(report.policy.authorization).toMatchObject({ answer: 'Autorizar escenario de planeación explícito', hashAuthenticatesConsent: false })
    expect(report.cases).toHaveLength(24)
    expect(report.centralComparison).toHaveLength(4)
    expect(report.sourcePins).toHaveLength(88)
    expect(new Set(report.sourcePins.map(v => v.id)).size).toBe(88)
    expect(new Set(report.cases.map(v => `${v.cycleId}:${v.fundingMode}:${v.fx.date}:${v.restInterpretation}`)).size).toBe(24)
    for (const c of report.cases) {
      expect(c.status).toBe('CALCULATED_DOCUMENTED_SCENARIO_ONLY')
      expect(c.sourceStatus).toBe('DOCUMENTED_UNVERIFIED')
      expect(c.planningOutputs.productiveCostUsd).toBeGreaterThan(0)
      expect(c.planningOutputs.purchaseUsd).toBeNull(); expect(c.planningOutputs.sellUsd).toBeNull()
      expect(Object.values(c.operationalOutputs).every(v => v === null)).toBe(true)
      expect(c).toMatchObject({ actualCarrierCostObserved: false, economicCalibrationComplete: false, quoteReady: false })
    }
  })
  it('independently sums 32 monthly entries, three MAX resource allocations and the fixed quota once', () => {
    for (const c of report.cases) {
      const subtotalCents = c.fixedLedger.reduce((n, row) => n + Math.round(row.monthlyUsd * 100), 0)
      expect(c.resources.reduce((n, row) => n + Math.round(row.monthlyFixedUsd! * 100), 0)).toBe(subtotalCents)
      expect(c.fixedLedger).toHaveLength(32)
      expect(c.fixedLedger.filter(v => v.disposition === 'EXPLICIT_PLANNING_REMAINDER')).toHaveLength(6)
      const fixed = c.lineage.fixedOperatingComponent!
      const independentlyAllocated = c.resources.reduce((sum, r) => {
        const x = c.lineage.exposures.find(v => v.resourceId === r.resourceId)!
        return sum + Math.max(r.monthlyFixedUsd! * x.totalCycleKm / x.productiveKmPerMonth,
          r.monthlyFixedUsd! * x.cycleDays / x.productiveDaysPerMonth)
      }, 0) + fixed.monthlyUsd / fixed.compatibleCyclesPerMonth
      expect(c.planningOutputs.cfuUsd).toBeCloseTo(independentlyAllocated, 9)
      expect(c.planningOutputs.matchedMonthlySubtotalUsd).toBeCloseTo(subtotalCents / 100 + fixed.monthlyUsd, 9)
      expect(c.resources.filter(v => v.resourceId === 'SHARED_TRAILER')).toHaveLength(1)
      expect(c.fixedLedger.filter(v => v.id === 'GROUP_ADMIN_PAYROLL_PUBLIC_SCALE')).toHaveLength(1)
      expect(c.fixedLedger.some(v => v.id === 'MX_DRIVER_FIXED_EMPLOYER_QUOTA')).toBe(false)
    }
  })
  it('independently reconciles CVU and total, with 18 costs and two justified exclusions', () => {
    for (const c of report.cases) {
      const rows = c.lineage.variableCosts, prior = oldCase(c)
      expect(rows.map(v => v.conceptId)).toEqual([...PILOT_VARIABLE_CONCEPTS])
      expect(rows.filter(v => v.disposition === 'DOCUMENTED_COMPONENT')).toHaveLength(18)
      expect(rows.filter(v => v.disposition === 'DOCUMENTED_EXCLUSION').map(v => v.conceptId)).toEqual([
        'HANDOFF_INCREMENTAL_SERVICES', 'SUPPLEMENTAL_CARGO_VALUE_INSURANCE'])
      expect(rows.filter(v => v.disposition === 'DOCUMENTED_EXCLUSION').every(v => v.amountUsd === null && !!v.exclusionOrZeroRationale)).toBe(true)
      const sum = rows.reduce((n, v) => n + (v.amountUsd ?? 0), 0)
      const reconstructed = prior.knownVariableComposition.subtotalUsd + c.extras.extraUsdPerCycle +
        c.lodging.mxUsd + c.lodging.usUsd + 4751 / 13 * c.roadReserves.attachedMultiplicity / c.fx.mxnPerUsd +
        32 * c.roadReserves.attachedMultiplicity
      expect(c.planningOutputs.cvuUsd).toBeCloseTo(sum, 9)
      expect(sum).toBeCloseTo(reconstructed, 9)
      expect(c.planningOutputs.productiveCostUsd).toBeCloseTo(independentTotal(c), 9)
      expect(c.lineage.variableCosts.some(v => /MARGIN|RISK_PREMIUM|SELL/.test(v.conceptId))).toBe(false)
    }
  })
  it('changes only CFU capital when comparing matched financed and cash cases', () => {
    for (const cash of report.cases.filter(v => v.fundingMode === 'CASH')) {
      const financed = report.cases.find(v => v.fundingMode === 'FINANCED' && v.cycleId === cash.cycleId &&
        v.restInterpretation === cash.restInterpretation && v.fx.date === cash.fx.date)!
      expect(financed.planningOutputs.cvuUsd).toBe(cash.planningOutputs.cvuUsd)
      expect(financed.lineage.variableCosts).toEqual(cash.lineage.variableCosts)
      expect(financed.planningOutputs.cfuUsd).toBeGreaterThan(cash.planningOutputs.cfuUsd!)
      expect(cash.fixedLedger.filter(v => v.monthlyUsd !== financed.fixedLedger.find(f => f.id === v.id)!.monthlyUsd)
        .map(v => v.id)).toEqual(['MX_TRACTOR_CAPITAL', 'US_TRACTOR_CAPITAL', 'SHARED_TRAILER_CAPITAL'])
    }
  })
  it('retains original observations and incomplete September evidence without mutating source lineage', () => {
    assertB2SeptemberBaseline(baseline)
    expect(report.originalSeptemberEconomySha256).toBe(B2_SEPTEMBER_BASELINE_SHA256)
    expect(baseline.b2Complete).toBe(false)
    for (const c of report.cases) {
      const f = baseline.fixedReferences.find(v => v.paymentMode === c.fundingMode && v.fx.date === c.fx.date)!
      // The projection budget also carries variable/exposure evidence. Check
      // the original fixed subset by identity, not equality to that larger set.
      for (const original of f.originalEvidence)
        expect(c.originalFixedEvidence.find(v => v.id === original.id)).toEqual(original)
      expect(c.originalVariableRows).toEqual(oldCase(c).operatingComponents.rows)
      for (const e of c.originalFixedEvidence) {
        const transfer = c.lineage.budget.evidence.find(v => v.id === `B2_PLAN_TRANSFER:${e.id}`)!
        expect(transfer.observedAt).toBe(e.observedAt)
        expect(transfer.referencePeriod).toBe('2026-09')
        expect(e.referencePeriod).toBe('2026-10')
        expect(transfer.limitations).toContain('NOT a new observation')
      }
    }
    const refreshed = reviewB2SeptemberLabor()
    expect(JSON.stringify({ cases: refreshed.cases, fixedReferences: refreshed.fixedReferences })).toBe(
      JSON.stringify({ cases: baseline.cases, fixedReferences: baseline.fixedReferences }))
  })
  it('normalizes monthly/annual MX extras separately from road pay, US ECEC, welcome and fixed quota', () => {
    for (const c of report.cases) {
      const x = c.extras, [primary, relief] = x.persons
      expect(primary.voucherAnnualMxn).toBe(3430 * 12)
      expect(relief.voucherAnnualMxn).toBeCloseTo(3430 * 12 * 14 / 365, 9)
      for (const employee of x.persons) {
        expect(employee.bonusAnnualMxn).toBeCloseTo(employee.roadWages * 1.31 / 24.97, 9)
        expect(employee.insuranceAnnualMxn).toBeCloseTo(employee.roadWages * 3.51 / 24.97, 9)
        expect(employee.retirementAnnualMxn).toBeCloseTo(employee.roadWages * 1.47 / 24.97, 9)
        expect(employee.ptuReserveAnnualMxn).toBeCloseTo(employee.roadWages / 12, 9)
        expect(employee.fixedEmQuotaDeltaMxn).toBe(0)
        expect(employee.riskReserveMxn).toBeCloseTo(employee.contributions.sbcPeriodBaseMxn * .0758875, 9)
        expect(employee.contributions.cappedDailySbcMxn).toBeLessThanOrEqual(25 * 117.31)
      }
      const monthly = x.persons.reduce((s, e) => s + e.annualExtraMxn, 0) / 12 +
        primary.nonRiskDeltaMxn + relief.nonRiskDeltaMxn / 12 + primary.riskReserveMxn + relief.riskReserveMxn / 12 +
        x.persons.reduce((s, e) => s + e.annualExtraMxn, 0) * .03 / 12
      expect(x.monthlyExtraMxn).toBeCloseTo(monthly, 9)
      expect(x.extraUsdPerCycle).toBeCloseTo(monthly / c.fx.mxnPerUsd / oldCase(c).compatibleCyclesPerMonth, 9)
      expect(x).toMatchObject({ usBenefitAddedAgain: false, welcomeBonusRecurring: false, reliefRoadPayAddedAgain: false,
        fixedQuotaAddedAgain: false, actualMxPackageVerified: false, existingRiskRateVerified: false, taxDeterminationCertified: false })
      expect(c.lineage.variableCosts.find(v => v.conceptId === 'US_DRIVER_TOTAL')!.amountUsd).toBeCloseTo(
        oldCase(c).us.knownCompensationAndMieUsd + c.lodging.usUsd, 9)
    }
  })
  it('uses a chosen hotel/parking rule, not a claimed standard or certified purchased night count', () => {
    for (const c of report.cases) {
      const network = c.cycleId === 'NETWORK_EXPECTED_EMPTY_PROXY', lodging = c.lodging
      expect(lodging.mxBlocks).toBe(network ? 3 : 8); expect(lodging.usBlocks).toBe(network ? 2 : 3)
      expect(lodging.hotelNightsPerCountry).toBe(1)
      expect(lodging.mxUsd).toBeCloseTo((94 + (network ? 3 : 8) * 260 / c.fx.mxnPerUsd) * 1.0825, 9)
      expect(lodging.usUsd).toBeCloseTo((110 + (network ? 2 : 3) * 12.5) * 1.0825, 9)
      expect(lodging).toMatchObject({ standardHotelShareClaimed: false, actualBillableQuantitiesVerified: false,
        paidUsWaitTurnedIntoHotel: false, boxParkingChargedAgain: false, quantitiesAreChosenPlanningPolicy: true })
    }
    expect(baseline.lodgingCycleQuantities.cycles.every(v => v.mx.roomNights === null && v.us.roomNights === null)).toBe(true)
  })
  it('adds only fixed remainders with native period normalization, one box and no repeated IVA', () => {
    for (const f of baseline.fixedReferences) {
      const { values, serviceReserveBaseUsd } = calculateB2PlanningFixedRemainders(f, policy)
      expect(values.MX_TRACTOR_PERMITS.monthlyUsd).toBe(round((800 * 2 + 403.12 * 2) / 12 / f.fx.mxnPerUsd))
      expect(values.SHARED_TRAILER_PERMITS.monthlyUsd).toBe(round(700 / 12 / f.fx.mxnPerUsd))
      expect(values.US_TRACTOR_PERMITS.monthlyUsd).toBe(round(46 / 12))
      expect(values.MX_TRACTOR_FOREIGN_LIABILITY_REMAINDER.monthlyUsd).toBe(750)
      expect(values.BOX_BINATIONAL_COVERAGE_REMAINDER.monthlyUsd).toBe(125)
      expect(values.BOX_BINATIONAL_COVERAGE_REMAINDER.monthlyUsd + f.rows.find(v => v.id === 'SHARED_TRAILER_INSURANCE')!.monthlyUsd!).toBe(150)
      expect(values.GROUP_SERVICE_TAX_INSTALLATION_REMAINDER.monthlyUsd).toBe(round(serviceReserveBaseUsd * .0825 + 70 / 24))
    }
  })
  it('retains bridge payments once and labels toll reserves as budgets, not selected route tariffs', () => {
    for (const c of report.cases) {
      expect(c.roadReserves.mxUnknownTollBudgetMxn).toBeCloseTo(4751 / 13 * c.roadReserves.attachedMultiplicity, 9)
      expect(c.roadReserves.usTollBudgetUsd).toBe(32 * c.roadReserves.attachedMultiplicity)
      const originalBridges = oldCase(c).operatingComponents.rows.filter(v => v.id.startsWith('BRIDGE_'))
      expect(c.lineage.variableCosts.find(v => v.conceptId === 'BRIDGE_TOLLS')!.amountUsd).toBe(
        originalBridges.reduce((s, v) => s + v.amountUsd, 0))
      expect(c.roadReserves.oneUnpricedPointMeanBudgetNotPublishedTariff).toBe(true)
    }
  })
  it.each(['amount', 'fx', 'count', 'flag'] as const)('rejects stale or silently adopted baseline: %s', defect => {
    const changed = structuredClone(baseline)
    if (defect === 'amount') changed.cases[0].operatingComponents.rows[0].amountUsd += .01
    if (defect === 'fx') changed.cases[0].fx.mxnPerUsd += .01
    if (defect === 'count') changed.sourcePins.pop()
    if (defect === 'flag') changed.quoteReady = true
    expect(() => assertB2SeptemberBaseline(changed)).toThrow('B2_PLANNING_STALE_BASELINE')
  })
  it('rejects corrupted policy bytes and tolerates only CRLF normalization', () => {
    const body = readLocalDocument(B2_PLANNING_POLICY_PIN.file)
    expect(readB2PlanningPolicy(() => body.replace(/\r?\n/g, '\r\n'))).toEqual(policy)
    expect(() => readB2PlanningPolicy(() => body.replace('9000', '1'))).toThrow('B2_PLANNING_POLICY_HASH')
    expect(() => readB2PlanningPolicy(() => body + ' ')).toThrow('B2_PLANNING_POLICY_HASH')
  })
  it.each(['scope', 'clock', 'fx'] as const)('rejects uncertified lodging join: %s', defect => {
    const changed = structuredClone(baseline.lodgingCycleQuantities.cycles[0])
    if (defect === 'scope') Object.assign(changed.mx, { roomNights: 1 }) // deliberately invalid runtime input
    if (defect === 'clock') changed.mx.continuousReleases[0].hours += 1
    expect(() => calculateB2PlanningLodging(changed, policy, defect === 'fx' ? 0 : 18.0692)).toThrow(/B2_PLANNING_LODGING_/)
  })
  it('rejects missing or duplicate fixed identities instead of treating missing amounts as zero', () => {
    const missing = structuredClone(baseline.fixedReferences[0]); missing.unresolved.pop()
    expect(() => calculateB2PlanningFixedRemainders(missing, policy)).toThrow('B2_PLANNING_FIXED_GAPS')
    const duplicate = structuredClone(baseline.fixedReferences[0]); duplicate.rows.push(duplicate.rows.find(v => v.id === 'SHARED_TRAILER_INSURANCE')!)
    expect(() => calculateB2PlanningFixedRemainders(duplicate, policy)).toThrow('B2_PLANNING_KNOWN_FIXED')
  })
  it('fails closed in the existing kernel for duplicate CVU, a second box or an absent amount', () => {
    const original = report.cases[0].lineage
    const duplicate = structuredClone(original); duplicate.variableCosts.push(duplicate.variableCosts[0])
    expect(calculateBinationalBudgetCostProjection(duplicate).outputs.cvuUsd).toBeNull()
    const box = structuredClone(original); box.exposures[0] = box.exposures.find(v => v.resourceId === 'SHARED_TRAILER')!
    expect(calculateBinationalBudgetCostProjection(box).outputs.cfuUsd).toBeNull()
    const amount = structuredClone(original); amount.variableCosts[0].amountUsd = null
    expect(calculateBinationalBudgetCostProjection(amount).outputs.productiveCostUsd).toBeNull()
  })
  it('reproduces its payload and leaves source baseline incomplete on every run', () => {
    const next = composeB2PlanningScenario()
    expect(next.scenarioPayloadSha256).toBe(report.scenarioPayloadSha256)
    expect(next.scenarioPayloadSha256).toBe(createHash('sha256').update(JSON.stringify(report.cases)).digest('hex'))
    expect(reviewB2SeptemberLabor().cases.every(v => v.completeCfuUsd === null && v.completeCvuUsd === null)).toBe(true)
  })
  it('executes the standalone CLI without injected prices, secrets, SQL or external writes', () => {
    const root = resolve(process.cwd(), process.cwd().endsWith('api') ? '../..' : '.')
    const cli = (args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', 'apps/api/scripts/compose-b2-planning-scenario.ts', ...args],
      { cwd: root, encoding: 'utf8', timeout: 45000, maxBuffer: 20 * 1024 * 1024,
        env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP, NODE_ENV: 'test' } })
    const success = cli([])
    expect(success.error).toBeUndefined(); expect(success.status).toBe(0)
    const parsed = JSON.parse(success.stdout)
    expect(parsed.scenarioPayloadSha256).toBe(report.scenarioPayloadSha256)
    expect(parsed).toMatchObject({ b2PlanningComplete: true, operationalCalibrationComplete: false, externalWrites: false, adoptedValues: 0 })
    const invalid = cli(['--accept=true'])
    expect(invalid.status).toBe(1); expect(invalid.stdout).toBe(''); expect(invalid.stderr).toContain('no injected prices or acceptance')
  }, 60000)
})
function independentTotal(c: typeof report.cases[number]) { return c.planningOutputs.cfuUsd! + c.planningOutputs.cvuUsd! }
