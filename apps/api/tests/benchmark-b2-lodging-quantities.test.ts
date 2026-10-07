import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'
import { consolidateBinationalReferenceBudget } from '../scripts/consolidate-binational-reference-budget.js'
import { US_DRIVER_PLANNING_PIN } from '../scripts/compose-public-pilot-cost.js'
import { B2_MIXED_LODGING_PIN, reconcileB2LodgingCycleQuantities } from '../scripts/lib/b2-mixed-lodging-benchmark.js'
import { calculateUsDriverPlanning } from '../scripts/lib/reference-us-driver-planning.js'
import { reviewB2SeptemberLabor } from '../scripts/review-b2-september-labor.js'

const r = consolidateBinationalReferenceBudget(undefined, undefined, 'POSTAL_REFERENCE', 'PUBLIC_LINK_FORECAST', 'IMT_C3_NON_ARTICULATED_PROXY')
const oldUs = JSON.parse(readLocalDocument(US_DRIVER_PLANNING_PIN.file))
const usPolicy = { ...oldUs, referencePeriod: '2026-09',
  mealAndIncidentals: { ...oldUs.mealAndIncidentals, notice: '2025-54', effectiveFrom: '2025-10-01' },
  sources: oldUs.sources.map((s: { id: string }) => s.id === 'IRS_NOTICE2026_60_TRANSPORTATION_MIE'
    ? { ...s, id: 'IRS_NOTICE2025_54_TRANSPORTATION_MIE', url: 'https://www.irs.gov/pub/irs-drop/n-25-54.pdf', period: 'EFFECTIVE_2025-10-01' } : s) }
const usClocks = r.supportingPilotOrdinaryDuty.scenarios.map(s => calculateUsDriverPlanning(usPolicy, r.supportingPilotCycleExposure, s))

describe('B2 rest exposure reconciles to clocks, not billable hotel nights', () => {
  it('merges adjacent MX release rows without merging through work or counted breaks', () => {
    const result = reconcileB2LodgingCycleQuantities(r, usClocks)
    expect(result.cycles.map(c => [c.mx.rawReleasedIntervalCount, c.mx.continuousReleaseCount])).toEqual([[4, 3], [6, 5]])
    for (const c of result.cycles) {
      expect(c.mx.continuousReleases[2].sourceIntervalIndexes).toEqual([2, 3])
      expect(c.mx.continuousReleases.reduce((sum, v) => sum + v.hours, 0)).toBeCloseTo(c.mx.releasedHours, 9)
      expect(c.mx.taskHours + c.mx.countedBreakHours + c.mx.releasedHours).toBeCloseTo(c.mx.elapsedHours, 9)
      for (let i = 1; i < c.mx.continuousReleases.length; i++)
        expect(c.mx.continuousReleases[i].startHour).toBeGreaterThan(c.mx.continuousReleases[i - 1].endHour)
    }
    expect(result.cycles[0].mx.releasedHours).toBeCloseTo(51.30195012512708, 9)
    expect(result.cycles[1].mx.releasedHours).toBeCloseTo(155.30195012512708, 9)
  })
  it('reuses US movement/recovery clocks and keeps paid synchronization wait outside rest', () => {
    const result = reconcileB2LodgingCycleQuantities(r, usClocks)
    expect(result.cycles.map(c => c.us.nominalRestBlockCount)).toEqual([2, 3])
    expect(result.cycles.map(c => c.us.restHours)).toEqual([27.5, 41])
    expect(result.cycles[1].us.synchronizationWaitHoursAlreadyPaid).toBeCloseTo(3.935283458460418, 9)
    for (const c of result.cycles) {
      expect(c.us.restBlocks.reduce((sum, v) => sum + v.hours, 0)).toBe(c.us.restHours)
      expect(c.us.paidWorkerHours + c.us.restHours).toBeCloseTo(c.us.elapsedHours, 9)
    }
    expect(result).toMatchObject({ sourcePhysicalPolicyPeriod: '2026-10', timeBasis: 'RETAINED_RELATIVE_CLOCK_NOT_DATED_SERVICE',
      calendarDatesAndRestLocationsEstablished: false, paidWaitConvertedToLodging: false, foodOrMieChanged: false })
  })
  it('does not equate release groups, US blocks or calendar/M&IE days to accommodation purchases', () => {
    for (const c of reconcileB2LodgingCycleQuantities(r, usClocks).cycles) {
      expect(c).toMatchObject({ hotelShare: null, completeLodgingCvuUsd: null, billableQuantitiesEstablished: false, selectedForCostEngine: false })
      expect(c.mx).toMatchObject({ roomNights: null, parkingBillingUnits: null, lodgingUsd: null,
        releaseIsVerifiedOffDuty: false, allReleasesRequirePurchasedLodging: false, equipmentAttachedDuringReleaseEstablished: false })
      expect(c.us).toMatchObject({ roomNights: null, parkingBillingUnits: null, lodgingUsd: null,
        restBlockChronologyAndLocationEstablished: false })
    }
  })
  it('preserves inputs and produces identical results on repeated reconciliation', () => {
    const before = JSON.stringify({ r, usClocks }), first = reconcileB2LodgingCycleQuantities(r, usClocks)
    expect(reconcileB2LodgingCycleQuantities(r, usClocks)).toEqual(first)
    expect(JSON.stringify({ r, usClocks })).toBe(before)
    expect(first.sourcePins.map(p => p.id)).toEqual(['pilotCycle', 'pilotUsPostalRoad', 'pilotOrdinaryDuty'])
  })
  it.each(['duration', 'overlap', 'mxTotal', 'task', 'break', 'source', 'duplicateCycle', 'postal'] as const)(
    'rejects corrupt source clock instead of producing plausible quantities: %s', defect => {
      const changed = structuredClone(r), s = changed.supportingPilotOrdinaryDuty.scenarios[0]
      if (defect === 'duration') s.timeline[0].hours += 1
      if (defect === 'overlap') { s.timeline[1].startHour -= .25; s.timeline[1].hours += .25 }
      if (defect === 'mxTotal') s.knownMxElapsedClockDays += 1
      if (defect === 'task') s.totalKnownTaskHours += 1
      if (defect === 'break') s.countedBreakHours += 1
      // Deliberately corrupt the fixed-size source tuple, not its production type.
      if (defect === 'source') Reflect.set(changed, 'sourcePins', changed.sourcePins.filter(p => p.id !== 'pilotOrdinaryDuty'))
      if (defect === 'duplicateCycle') changed.supportingPilotOrdinaryDuty.scenarios[1] = s
      if (defect === 'postal') changed.supportingPilotCycleExposure.usPostalRoadReference = null
      expect(() => reconcileB2LodgingCycleQuantities(changed, usClocks)).toThrow()
    })
  it.each(['movementRest', 'recoveryRest', 'paidWait', 'elapsed', 'duplicate', 'period'] as const)(
    'rejects a mismatched US labor clock: %s', defect => {
      const changed = structuredClone(usClocks)
      if (defect === 'movementRest') changed[0].unpaidMovementRestHours += 1
      if (defect === 'recoveryRest') changed[0].unpaidRecoveryRestHours += 1
      if (defect === 'paidWait') changed[0].synchronizationWaitHours += 1
      if (defect === 'elapsed') changed[0].assignedElapsedHours += 1
      if (defect === 'duplicate') changed[1] = changed[0]
      if (defect === 'period') changed[0].sourcePeriods.mieEffectiveFrom = '2026-10-01'
      expect(() => reconcileB2LodgingCycleQuantities(r, changed)).toThrow()
    })
  it('joins lodging into September without changing any prior monetary case or fixed reference', () => {
    const result = reviewB2SeptemberLabor()
    expect(createHash('sha256').update(JSON.stringify({ cases: result.cases, fixedReferences: result.fixedReferences })).digest('hex'))
      .toBe('29619c11dc85e4b626bcd617ab1b60f750a10a819e1fb1e3833d67b19f014e57')
    expect(result.sourcePins).toHaveLength(87)
    expect(result.sourcePins.filter(p => p.id === B2_MIXED_LODGING_PIN.id)).toEqual([B2_MIXED_LODGING_PIN])
    expect(result.lodgingCycleQuantities.cycles).toHaveLength(2)
    expect(result.lodgingBenchmark.candidates).toHaveLength(7)
    expect(result.cases).toHaveLength(12)
    expect(result.fixedReferences).toHaveLength(6)
    expect(result.remaining).toContain('MIXED_LODGING_MX_US')
    expect(result).toMatchObject({ b2Complete: false, calibrated: false, quoteReady: false, adoptedValues: 0, externalWrites: false })
  })
  it('runs the actual September CLI and preserves exit2 for an incomplete cost reference', () => {
    const child = spawnSync(process.execPath, ['--import', 'tsx', 'apps/api/scripts/review-b2-september-labor.ts'],
      { cwd: fileURLToPath(new URL('../../../', import.meta.url)), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 30000 })
    expect(child.error).toBeUndefined()
    expect(child.status).toBe(2)
    expect(child.stderr).toBe('')
    const result = JSON.parse(child.stdout)
    expect(result.lodgingCycleQuantities.cycles.map((c: { mx: { continuousReleaseCount: number } }) => c.mx.continuousReleaseCount)).toEqual([3, 5])
    expect(result.lodgingBenchmark.completeLodgingCvuUsd).toBeNull()
    expect(result.b2Complete).toBe(false)
  }, 35000)
})
