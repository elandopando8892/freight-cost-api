import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readRouteSource, reviewD2DRouteEvidence } from '../scripts/review-d2d-route-evidence.js'

const file = 'docs/research/B2_D2D_ROUTE_ITINERARY_EVIDENCE_2026-09-30.json'
const fixture = () => JSON.parse(readRouteSource(file).toString('utf8'))
const review = (raw = fixture()) => reviewD2DRouteEvidence(raw)

describe('public route candidate, not adopted trip inputs', () => {
  it('pins the unchanged case plus three primary archives', () => {
    expect(review()).toMatchObject({ sourcePinsVerified: 4, archivedSources: 3, segmentCount: 37, plazaCount: 12 })
  })
  it('reproduces rows separately and exposes source total discrepancies without repairing them', () => {
    expect(review()).toMatchObject({ transcriptionTotals: { km: 1119.163, minutes: 652, tollsMxn: 2770 },
      publishedTotals: { km: 1119.17, minutes: 668, tollsMxn: 2770 }, differences: { km: -0.007, minutes: -16, tollsMxn: 0 } })
  })
  it('keeps four numeric matches distinct from eight unresolved tariffs', () => {
    expect(review().valueMatches).toBe(4)
    expect(review().unresolvedTariffs).toHaveLength(8)
  })
  it('does not equate zero or blank with free truck passage', () => {
    expect(review().unsupportedZeroPlazas).toEqual(['Ojo Caliente', 'Lincoln'])
    expect(fixture().contrasts.find((row: any) => row.plaza === 'Ojo Caliente').publishedAmountMxn).toBeNull()
  })
  it('excludes southbound historical Laredo observation from MX-to-US', () => {
    expect(review().excludedDirection).toBe('US_TO_MX')
    expect(fixture().excludedLaredoObservation.currentRevisedRate).toBeNull()
  })
  it('cannot fill any of twelve engine inputs from the planner total or source tariff', () => {
    const result = review()
    expect(Object.values(result.handoff)).toEqual(Array(12).fill(null))
    expect(result).toMatchObject({ status: 'INCOMPLETE', calibrated: false, quoteReady: false, productionReady: false,
      compositorInvoked: false, databaseAccessed: false, adoptedValues: 0 })
  })
  it.each(['bridgeChosenByUser', 'equipmentConfirmed', 'truckRouteValidated', 'originIsUserDeliveryAddress'])(
    'rejects silently promoting %s from this research snapshot', field => {
      const input = fixture(); input.candidate[field] = true
      expect(() => review(input)).toThrow()
    })
  it.each(['mxLoadedKm', 'mxTollsUsd', 'mxCycleDays', 'usTollsUsd', 'borderChargesUsd'])(
    'rejects seeding %s, even with zero', field => {
      const input = fixture(); input.handoff[field] = 0
      expect(() => review(input)).toThrow()
    })
  it('rejects tampered binary archives before discussing economics', () => {
    expect(() => reviewD2DRouteEvidence(fixture(), path => path.endsWith('.pdf') ? Buffer.from('tampered') : readRouteSource(path)))
      .toThrow('HASH_MISMATCH')
  })
  it('rejects tampered predecessor and semantic lineage with a recomputed hash', () => {
    const input = fixture()
    input.casePin.sha256 = '0'.repeat(64)
    expect(() => review(input)).toThrow('HASH_MISMATCH')
    const bytes = Buffer.from(JSON.stringify({ ...JSON.parse(readRouteSource(input.casePin.file).toString()), baseHead: 'f'.repeat(40) }))
    input.casePin.sha256 = createHash('sha256').update(bytes).digest('hex')
    expect(() => reviewD2DRouteEvidence(input, path => path === input.casePin.file ? bytes : readRouteSource(path)))
      .toThrow('CASE_LINEAGE_MISMATCH')
  })
  it('rejects missing/duplicated toll contrasts rather than implying completeness', () => {
    const input = fixture(); input.contrasts.pop()
    expect(() => review(input)).toThrow('CONTRAST_COVERAGE_MISMATCH')
    input.contrasts.push(input.contrasts[0])
    expect(() => review(input)).toThrow('DUPLICATE_CONTRAST')
  })
  it('rejects duplicated planner plaza coverage', () => {
    const input = fixture(); input.candidate.rows.push(input.candidate.rows[4])
    expect(() => review(input)).toThrow('DUPLICATE_PLANNED_PLAZA')
  })
  it('rejects amount without plaza and missing source', () => {
    const input = fixture(); input.candidate.rows[0][6] = 1
    expect(() => review(input)).toThrow('PLAZA_AMOUNT_MISMATCH')
    input.candidate.rows[0][6] = null; input.contrasts[0].sourceId = 'UNKNOWN'
    expect(() => review(input)).toThrow('CONTRAST_REFERENCE_MISSING')
  })
  it('rejects invalid, future and missing effective dates for claimed matches', () => {
    const input = fixture(); input.contrasts[0].effectiveFrom = '2026-02-30'
    expect(() => review(input)).toThrow()
    input.contrasts[0].effectiveFrom = '2026-10-01'
    expect(() => review(input)).toThrow('TARIFF_AFTER_CUT')
    input.contrasts[0].effectiveFrom = null
    expect(() => review(input)).toThrow('CLAIMED_MATCH_INVALID')
  })
  it('rejects a mismatched value labelled a match', () => {
    const input = fixture(); input.contrasts[0].publishedAmountMxn = 0
    expect(() => review(input)).toThrow('CLAIMED_MATCH_INVALID')
  })
  it('cannot promote an indexed page to an archived verified match', () => {
    const input = fixture(); input.contrasts[0].sourceId = 'CBP'
    expect(() => review(input)).toThrow('CLAIMED_MATCH_INVALID')
  })
  it('rejects inconsistent archive labels, duplicate source IDs and path escape', () => {
    const input = fixture(); input.sources[0].access = 'INDEXED_ONLY_DIRECT_403'
    expect(() => review(input)).toThrow()
    input.sources[0].access = 'DIRECT_ARCHIVED'; input.sources.push(input.sources[0])
    expect(() => review(input)).toThrow('DUPLICATE_SOURCE')
    expect(() => readRouteSource('../.env')).toThrow()
  })
  it('runs CLI offline without datasource or application keys, expected exit 2', () => {
    const script = fileURLToPath(new URL('../scripts/review-d2d-route-evidence.ts', import.meta.url))
    const cli = fileURLToPath(new URL('../../../node_modules/tsx/dist/cli.mjs', import.meta.url))
    const result = spawnSync(process.execPath, [cli, script, file], { encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: 'INVALID_NEVER_USE', STAGING_DATABASE_URL: 'INVALID_NEVER_USE', OPENAI_API_KEY: '' } })
    expect(result.status).toBe(2)
    expect(result.stderr).toBe('')
    expect(JSON.parse(result.stdout)).toMatchObject({ status: 'INCOMPLETE', compositorInvoked: false, databaseAccessed: false })
    expect(result.stdout).not.toContain('INVALID_NEVER_USE')
  })
})
