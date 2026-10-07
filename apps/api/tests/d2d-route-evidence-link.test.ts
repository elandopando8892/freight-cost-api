import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readRouteSource } from '../scripts/review-d2d-route-evidence.js'
import { reviewD2DRouteEvidenceLink } from '../src/modules/routing/d2d-route-evidence-link.js'

const caseFile = 'docs/research/B2_D2D_READINESS_CASE_2026-09-30.json'
const linkFile = 'docs/research/B2_D2D_SAKBE_ROUTE_LINK_2026-09-30.json'
const read = (file: string) => readRouteSource(file).toString('utf8')
const fixture = () => JSON.parse(read(linkFile))
const context = () => JSON.parse(read(caseFile))
const review = (link = fixture(), source = read, caseContext = context()) => reviewD2DRouteEvidenceLink(link, caseContext, source)
// Re-pin a modified in-memory document to test semantic guards, not just hashes.
function modified(which: 'casePin' | 'requestPin' | 'detailPin', change: (document: any) => void) {
  const link = fixture(), document = JSON.parse(read(link[which].file))
  change(document)
  const content = JSON.stringify(document)
  link[which].sha256 = createHash('sha256').update(content).digest('hex')
  return { link, source: (file: string) => file === link[which].file ? content : read(file) }
}

describe('real SAKBE evidence attachment, never adopted trip inputs', () => {
  it('verifies case/request/detail pins and attaches real MX row sums separately from approval', () => {
    const result = review()
    expect(result).toMatchObject({ status: 'INCOMPLETE', sourcePinsVerified: 3, evidenceLinked: true,
      adoptionEligible: false, tripInputsChanged: false, adoptedValues: 0,
      compositorInvoked: false, networkAccessed: false, databaseAccessed: false })
    expect(result.observedMxDetail).toMatchObject({ currency: 'MXN', segmentCount: 67,
      tollPointCount: 14, positiveTollCount: 13, summary: null, routeGeometry: null,
      rowSums: { distanceKm: 1124.5764209526735, idealMinutes: 709.8829924923754, observedTollsMxn: 4770 } })
    expect(result.coverage).toEqual({ mx: 'DETAIL_ONLY_NOT_OPERATIONAL', border: 'UNVERIFIED', us: 'NO_EVIDENCE', operatingCycle: 'NO_EVIDENCE' })
  })
  it('shows zero La Carbonera without certifying free passage or adding a missing bridge amount', () => {
    const result = review()
    expect(result.observedMxDetail.unverifiedZeroTollPoints.map(row => row.instruction)).toEqual(['Cruce la caseta La Carbonera'])
    expect(result.gaps.find(row => row.code === 'CROSSING_INTERCHANGE_COVERAGE_PENDING')!.fields)
      .toEqual(['borderCharges.CROSSING', 'borderCharges.INTERCHANGE'])
    expect(JSON.stringify(result)).not.toContain('loadedKm":1124')
  })
  it('provides seven actionable gaps linked to preflight fields, not seven new sprints', () => {
    const result = review()
    expect(result.gaps).toHaveLength(7)
    expect(result.gapCountsByStage).toEqual({ case: 2, route: 1, mx: 2, us: 1, borderCharges: 1 })
    expect(result.gaps.find(row => row.stage === 'us')!.action).toContain('Laredo to Fort Smith, AR 72916')
    expect(result.gaps.every(row => row.fields.length && row.action.length)).toBe(true)
  })
  it('rejects tampered pins and path escapes before parsing evidence', () => {
    const link = fixture(); link.detailPin.sha256 = '0'.repeat(64)
    expect(() => review(link)).toThrow('ROUTE_PIN_HASH_MISMATCH')
    link.detailPin.file = '../.env'
    expect(() => review(link)).toThrow()
    link.detailPin = link.requestPin
    expect(() => review(link)).toThrow('DUPLICATE_ROUTE_PIN')
  })
  it.each(['caseReference', 'baseHead', 'direction', 'route'])(
    'rejects attachment to a different case despite a valid source pin: %s', field => {
      const changed = context()
      if (field === 'route') changed.route.usEndpoint = 'Different destination'
      else changed[field] = field === 'direction' ? 'US_TO_MX' : 'different'
      expect(() => review(fixture(), read, changed)).toThrow('ROUTE_CASE_LINEAGE_MISMATCH')
    })
  it.each(['referenceId', 'referenceLabel', 'casePoint'])(
    'rejects renamed/replaced destination binding: %s', field => {
      const link = fixture(); link.binding.gateway[field] = field === 'referenceId' ? 192383 : 'Different gateway'
      expect(() => review(link)).toThrow('ROUTE_POINT_BINDING_MISMATCH')
    })
  it.each(['mode', 'axles', 'destination', 'sakbeVehicleClass'])(
    'rejects re-pinned detail of a different request/profile: %s', field => {
      const { link, source } = modified('detailPin', detail => {
        if (field === 'mode') detail.request.mode = 'cuota'
        if (field === 'axles') detail.request.axles = 6
        if (field === 'destination') detail.request.destination.id = 192383
        if (field === 'sakbeVehicleClass') detail.request.sakbeVehicleClass = '12'
      })
      expect(() => review(link, source)).toThrow('ROUTE_REQUEST_MISMATCH')
    })
  it('rejects re-pinned modified predecessor, future observations and invalid cut date', () => {
    const changed = modified('casePin', value => { value.consolidation.sha256 = '0'.repeat(64) })
    expect(() => review(changed.link, changed.source)).toThrow('ROUTE_CASE_LINEAGE_MISMATCH')
    const future = modified('detailPin', value => { value.retrievedAt = '2026-10-01T00:00:00.000Z' })
    expect(() => review(future.link, future.source)).toThrow('ROUTE_OBSERVATION_AFTER_CUT_OR_DIRECTION')
    const link = fixture(); link.cutDate = '2026-02-30'
    expect(() => review(link)).toThrow()
  })
  it.each(['totals', 'sequence', 'limits'])(
    'rejects re-pinned inconsistent segment integrity: %s', kind => {
      const changed = modified('detailPin', value => {
        if (kind === 'totals') value.observations.detailTotals.observedTollsMxn = 2770
        if (kind === 'sequence') value.observations.segments[1].index = 0
        if (kind === 'limits') value.issues = []
      })
      expect(() => review(changed.link, changed.source)).toThrow()
    })
  it.each(['quoteReady', 'handoff', 'summary', 'geometry', 'missingCost', 'coordinates'])(
    'rejects approval/default/schema manipulation even with a new pin: %s', kind => {
      const changed = modified('detailPin', value => {
        if (kind === 'quoteReady') value.quoteReady = true
        if (kind === 'handoff') value.handoff.loadedKm = 1124.5764209526735
        if (kind === 'summary') value.observations.summary = value.observations.detailTotals
        if (kind === 'geometry') value.observations.geometry = { type: 'LineString', coordinates: [] }
        if (kind === 'missingCost') delete value.observations.segments[0].observedTollMxn
        if (kind === 'coordinates') value.observations.segments[11].tollPoint.coordinates = [500000, 4000000]
      })
      expect(() => review(changed.link, changed.source)).toThrow()
    })
  it('rejects promotion of unapproved binding and additional engine inputs in the link', () => {
    const link = fixture(); link.approval.bridgeChosen = true
    expect(() => review(link)).toThrow()
    link.approval.bridgeChosen = false; link.loadedKm = 0
    expect(() => review(link)).toThrow()
  })
  it('hermetic integrated CLI preserves all 41 preflight gaps and eight null trip inputs', () => {
    const root = fileURLToPath(new URL('../../../', import.meta.url))
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL('../../../node_modules/tsx/dist/cli.mjs', import.meta.url)),
      fileURLToPath(new URL('../scripts/run-d2d-readiness-case.ts', import.meta.url)), caseFile, linkFile,
    ], { cwd: root, encoding: 'utf8', timeout: 15000,
      env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: 'invalid-never-use',
        STAGING_DATABASE_URL: 'invalid-never-use', INEGI_SAKBE_TOKEN: '', OPENAI_API_KEY: '' } })
    expect(result.error).toBeUndefined(); expect(result.status).toBe(2)
    expect(result.stderr).toBe('')
    const report = JSON.parse(result.stdout)
    expect(report.readiness).toMatchObject({ compositorInvoked: false, costs: null, compositor: null,
      supportingRouteEvidence: { evidenceLinked: true, sourcePinsVerified: 3, adoptedValues: 0 } })
    expect(report.readiness.issues).toHaveLength(41)
    expect(Object.values(report.readiness.lineage.mx.trip)).toEqual([null, null, null, null])
    expect(Object.values(report.readiness.lineage.us.trip)).toEqual([null, null, null, null])
    expect(report.bindings.every((row: any) => !row.canonicalParametersCreated)).toBe(true)
    expect(report.decision.businessGatesClosed).toBe(0)
    expect(result.stdout).not.toContain('invalid-never-use')
  })
})
