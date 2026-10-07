import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { SECTIONS, assembleEconomicCards, pointerExists, readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'

const manifest = JSON.parse(readFileSync(fileURLToPath(new URL('../../../docs/research/B2_ECONOMIC_REFERENCE_CARDS_2026-09-30.json', import.meta.url)), 'utf8'))
const copy = () => structuredClone(manifest)

describe('MX/US economic reference cards: local assembly, not calibration', () => {
  it('conciles both cards, all thirteen sections and pinned local sources', () => {
    const report = assembleEconomicCards(manifest, readLocalDocument)
    expect(report.sourceCount).toBe(12)
    expect(report.sourceIntegrity).toBe('PINNED_LOCAL_FILES_MATCH')
    expect(report.cards.map(card => card.country)).toEqual(['MX', 'US'])
    for (const card of report.cards) {
      expect(card.sectionsDocumented).toBe(13)
      expect(card.sections.map(section => section.section)).toEqual(SECTIONS)
      expect(card.eligibleNumericSubtotals).toBe(0)
      expect(Object.values(card.outputs).every(value => value === null)).toBe(true)
    }
    expect(report.status).toBe('PARTIAL_NOT_ECONOMICALLY_COMPATIBLE')
    expect(report.existingAuditStatus).toBe('INCOMPLETE')
    expect(report.existingIssueCount).toBeGreaterThan(0)
    expect(report.adoptedValues).toBe(0)
    expect(report.quoteReady).toBe(false)
    expect(report.calibrated).toBe(false)
  })
  it.each(['calibrated', 'quoteReady'])('rejects a false declaration of readiness: %s', field => {
    const raw = copy(); raw[field] = true
    expect(() => assembleEconomicCards(raw, readLocalDocument)).toThrow()
  })
  it('rejects economic amounts, zero-as-missing and adopted values', () => {
    for (const mutate of [
      (raw: any) => { raw.cards[0].sectionRows[0].economicAmount = 0 },
      (raw: any) => { raw.cards[1].outputs.cfuUsd = 0 },
      (raw: any) => { raw.adoptedValues = 1 },
      (raw: any) => { raw.cards[0].sectionRows[1].subtotalEligible = true },
    ]) { const raw = copy(); mutate(raw); expect(() => assembleEconomicCards(raw, readLocalDocument)).toThrow() }
  })
  it('keeps different national profile evidence and readings', () => {
    expect(manifest.cards[0].profileRef.pointer).toBe('/profiles/0')
    expect(manifest.cards[1].profileRef.pointer).toBe('/profiles/1')
    for (const section of SECTIONS) {
      const mx = manifest.cards[0].sectionRows.find((row: any) => row.section === section)
      const us = manifest.cards[1].sectionRows.find((row: any) => row.section === section)
      expect(mx.countryReading).not.toBe(us.countryReading)
    }
  })
  it('rejects swapping the profile countries', () => {
    const raw = copy(); raw.cards[0].profileRef.pointer = '/profiles/1'
    expect(() => assembleEconomicCards(raw, readLocalDocument)).toThrow('PROFILE_COUNTRY_MISMATCH')
  })
  it('rejects duplicate countries and duplicate sections', () => {
    const country = copy(); country.cards[1].country = 'MX'
    expect(() => assembleEconomicCards(country, readLocalDocument)).toThrow('COUNTRY_COVERAGE_MISMATCH')
    const section = copy(); section.cards[0].sectionRows[0] = section.cards[0].sectionRows[1]
    expect(() => assembleEconomicCards(section, readLocalDocument)).toThrow('SECTION_COVERAGE_MISMATCH')
  })
  it('rejects changed source bytes rather than silently using a new dossier', () => {
    expect(() => assembleEconomicCards(manifest, file => readLocalDocument(file) + '\n')).toThrow('SOURCE_HASH_MISMATCH')
  })
  it('rejects duplicate source IDs, missing references and broken pointers', () => {
    const dup = copy(); dup.sources[1].id = dup.sources[0].id
    expect(() => assembleEconomicCards(dup, readLocalDocument)).toThrow('DUPLICATE_SOURCE_ID')
    const missing = copy(); missing.cards[0].profileRef.sourceId = 'imaginary'
    expect(() => assembleEconomicCards(missing, readLocalDocument)).toThrow('SOURCE_REF_MISSING')
    const pointer = copy(); pointer.cards[0].profileRef.pointer = '/not-here'
    expect(() => assembleEconomicCards(pointer, readLocalDocument)).toThrow('SOURCE_POINTER_MISSING')
  })
  it('rejects a modified core identity even if a caller re-pins the ledger', () => {
    const raw = copy()
    const entry = raw.sources.find((source: any) => source.id === 'ledger')
    const ledger = JSON.parse(readLocalDocument(entry.file)); ledger.coreTemplateSha256 = '0'.repeat(64)
    const content = JSON.stringify(ledger)
    entry.sha256 = createHash('sha256').update(content).digest('hex')
    expect(() => assembleEconomicCards(raw, file => file === entry.file ? content : readLocalDocument(file))).toThrow('CORE_LINEAGE_MISMATCH')
  })
  it('keeps one physical trailer cycle, unresolved responsibility, no per-leg full charge', () => {
    const report = assembleEconomicCards(manifest, readLocalDocument)
    expect(report.sharedTrailer.rule).toBe('ONE_PHYSICAL_CYCLE_THEN_ALLOCATE')
    expect(report.sharedTrailer.costIncludedInCountryTractorCards).toBe(false)
    expect(report.sharedTrailer.costBearer).toBeNull()
    expect(report.sharedTrailer.settlementShares).toBeNull()
    const raw = copy(); raw.sharedTrailer.costIncludedInCountryTractorCards = true
    expect(() => assembleEconomicCards(raw, readLocalDocument)).toThrow()
  })
  it('keeps risk separate and margin outside productive cost', () => {
    for (const [section, destination] of [['RISK', 'CFU'], ['TECHNICAL_MARGIN', 'CVU']]) {
      const raw = copy(); raw.cards[0].sectionRows.find((row: any) => row.section === section).destination = destination
      expect(() => assembleEconomicCards(raw, readLocalDocument)).toThrow('SCOPE_MISMATCH')
    }
  })
  it('does not invent a route, toll, bridge or gate completion', () => {
    const report = assembleEconomicCards(manifest, readLocalDocument)
    expect(report.trip.routeSelected).toBe(false)
    expect(report.trip.origin).toBeNull()
    expect(report.trip.borderChargesUsd).toBeNull()
    expect(report.decision.businessGatesClosed).toBe(0)
    expect(report.decision.nextCut).toBe('FUEL_PRICE_AND_LOADED_EMPTY_PERFORMANCE')
    expect(report.decision.completionQueue.map(row => row.order)).toEqual([1, 2, 3, 4, 5])
  })
  it('rejects wrong destinations and excluded status for every productive family', () => {
    for (const section of SECTIONS) {
      const raw = copy(); const row = raw.cards[0].sectionRows.find((item: any) => item.section === section)
      row.destination = row.destination === 'CFU' ? 'CVU' : 'CFU'
      expect(() => assembleEconomicCards(raw, readLocalDocument)).toThrow('SCOPE_MISMATCH')
    }
    const raw = copy(); raw.cards[0].sectionRows[0].status = 'EXCLUDED_FROM_PRODUCTIVE_COST_PENDING_POLICY'
    expect(() => assembleEconomicCards(raw, readLocalDocument)).toThrow('SECTION_STATUS_MISMATCH')
  })
  it('rejects activation/network flags and out-of-scope source paths', () => {
    const raw = copy(); raw.externalChanges.database = true
    expect(() => assembleEconomicCards(raw, readLocalDocument)).toThrow()
    const unsafe = copy(); unsafe.sources[0].file = '../secrets.json'
    expect(() => assembleEconomicCards(unsafe, readLocalDocument)).toThrow()
    expect(() => readLocalDocument('apps/api/package.json')).toThrow('SOURCE_OUTSIDE_DOCS')
  })
  it('treats formulas as explanatory text, never executable rate code', () => {
    const raw = copy(); raw.cards[0].sectionRows[0].formula = 'throw new Error("do-not-execute")'
    expect(() => assembleEconomicCards(raw, readLocalDocument)).not.toThrow()
  })
  it('distinguishes an existing null from an absent pointer and refuses inherited keys', () => {
    expect(pointerExists({ a: null }, '/a')).toBe(true)
    expect(pointerExists({ a: null }, '/a/b')).toBe(false)
    expect(pointerExists({}, '/constructor')).toBe(false)
    expect(pointerExists({ 'a/b': { '~': 1 } }, '/a~1b/~0')).toBe(true)
    expect(pointerExists({}, '/bad~2key')).toBe(false)
  })
})
