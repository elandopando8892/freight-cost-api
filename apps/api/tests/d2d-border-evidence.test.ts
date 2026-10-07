import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readRouteSource } from '../scripts/review-d2d-route-evidence.js'
import { reviewD2DBorderEvidence } from '../scripts/review-d2d-border-evidence.js'
import { prepareD2DReadinessCase } from '../scripts/prepare-d2d-readiness-case.js'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'

const caseFile = 'docs/research/B2_D2D_READINESS_CASE_2026-09-30.json'
const borderFile = 'docs/research/B2_BINATIONAL_BORDER_2026-09-30.json'
const selectedFile = 'docs/research/B2_BINATIONAL_OWN_RELAY_SELECTED.json'
const routeFile = 'docs/research/B2_D2D_SAKBE_ROUTE_LINK_2026-09-30.json'
const tollFile = 'docs/research/B2_MX_TOLL_FOLLOWUP_2026-09-30.json'
const text = (file: string) => readRouteSource(file).toString('utf8')
const load = (file: string) => JSON.parse(text(file))
const review = (raw = load(borderFile), context = load(caseFile), read = readRouteSource) =>
  reviewD2DBorderEvidence(raw, context, read)

describe('Binational border scope: evidence is not an adopted fee', () => {
  it('records user selection with the prior annex pinned, not a discovered carrier or trip', () => {
    const selected = review(load(selectedFile))
    expect(selected.confirmations.referenceVariant).toEqual({id:'OWN_MX_US_RELAY_SAME_TRAILER',
      selectionBasis:'USER_SELECTED_REFERENCE_NOT_OPERATING_EVIDENCE',sameTrailer:true,distinctMxUsTractors:true})
    expect(selected.confirmations.carrier).toBeNull()
    expect(selected.confirmations.serviceDate).toBeNull()
    expect(selected.confirmations.tractorChangeRequired).toBeNull()
    expect(selected).toMatchObject({sourcePinsVerified:4,adoptedValues:0})
    expect(selected.cycleCalculationSupport).toMatchObject({physicalStrategySelected:true,
      cycleEvidenceProvided:false,monetaryOutputAvailable:false,endpointOrFormEnabled:false})
    expect(selected.handoff).toEqual(review().handoff)
  })
  it('stops requesting the chosen variant without changing economic lineage or approval', () => {
    const prepare = (file:string) => prepareD2DReadinessCase(load(caseFile),readLocalDocument,
      load(routeFile),load(tollFile),readRouteSource,load(file))
    const before = prepare(borderFile), after = prepare(selectedFile)
    expect(before.decision.requiresPhysicalVariantSelection).toBe(true)
    expect(after.decision.requiresPhysicalVariantSelection).toBe(false)
    expect(after.decision.referenceVariant?.id).toBe('OWN_MX_US_RELAY_SAME_TRAILER')
    expect(after.readiness.lineage).toEqual(before.readiness.lineage)
    expect(after.readiness.issues).toEqual(before.readiness.issues)
    expect(after.readiness.costs).toBeNull(); expect(after.readiness.compositorInvoked).toBe(false)
    expect(after.decision.businessGatesClosed).toBe(0)
  })
  it('rejects inconsistent selection provenance or altered research while preserving the original version', () => {
    const raw = load(selectedFile)
    const {previousEvidencePin,...unpinned} = raw
    expect(() => review(unpinned)).toThrow('BORDER_VARIANT_PRIOR_EVIDENCE_REQUIRED')
    const tampered = structuredClone(raw); tampered.mexicanBridgeObservation.amountMxn = 0
    expect(() => review(tampered)).toThrow('BORDER_VARIANT_CHANGED_RESEARCH_EVIDENCE')
    const badPin = structuredClone(raw); badPin.previousEvidencePin.sha256 = '0'.repeat(64)
    expect(() => review(badPin)).toThrow('BORDER_PIN_HASH_MISMATCH')
    expect(review().cycleCalculationSupport.physicalStrategySelected).toBe(false)
  })
  it('records the user bridge choice separately from the binational carrier assumption', () => {
    const report = review()
    expect(report.confirmations).toMatchObject({ bridgeChosenByUser:true, operatingScenario:'SAME_BINATIONAL_COMPANY',
      scenarioBasis:'USER_ASSUMPTION_NOT_IDENTIFIED_CARRIER', carrier:null, serviceDate:null,
      tractorChangeRequired:null, returnLeg:null })
    expect(report).toMatchObject({ status:'INCOMPLETE', sourcePinsVerified:3,
      unarchivedSources:['SICT_BRIDGE_III'], adoptedValues:0, monetaryTotalsCalculated:false,
      tripInputsChanged:false, networkAccessed:false, databaseAccessed:false, productionReady:false })
    expect(Object.values(report.handoff).every(value => value === null)).toBe(true)
    expect(report.mexicanBridgeObservation).toMatchObject({amountMxn:144,effectiveFrom:null,adopted:false})
    expect(report.excludedUsBridgeObservation).toMatchObject({direction:'US_TO_MX',nextAdjustmentFrom:'2027-01-01',adopted:false})
    expect(report.scopeComparator.comparableFtlAmountUsd).toBeNull()
    expect(report.cycleCalculationSupport).toMatchObject({requiresDistinctNationalTractors:true,
      physicalStrategySelected:false,cycleEvidenceProvided:false,monetaryOutputAvailable:false,endpointOrFormEnabled:false})
  })
  it('requires bridge once, incremental services and a single physical trailer cycle', () => {
    const report = review()
    expect(report.requirements.map(row => row.id)).toEqual(['BRIDGE_TOLL','CROSSING','INTERCHANGE','CYCLE'])
    expect(report.requirements[0].target).toBe('TRIP_TOLLS_OR_CROSSING_BUNDLE_EXACTLY_ONCE')
    expect(report.requirements[2].missing).toContain('No implicit zero')
    expect(report.compatibility).toBe('INTERCHANGE_RESEARCH_PROFILE_NOT_AUTOMATICALLY_BINATIONAL')
  })
  it('verifies originals as bytes and preserves actual Saia exclusions, without sending a BOL', () => {
    const raw = load(borderFile)
    expect(review(raw).sourcePinsVerified).toBe(3)
    const saia = raw.sources.find((row:any) => row.id === 'SAIA_MEXICO_SCOPE')
    const normalized = text(saia.archive.file).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ')
    expect(normalized.includes('Mexico rates do not include any border crossing drayage services')).toBe(true)
    expect(normalized.includes('US/Mexico Customs Brokerage Services')).toBe(true)
    const pdf = raw.sources.find((row:any) => row.id === 'LAREDO_2026_O_114')
    expect(readRouteSource(pdf.archive.file).subarray(0,4).toString()).toBe('%PDF')
  })
  it('adds scenario evidence without filling economic inputs, altering toll results or calling the compositor', () => {
    const before = prepareD2DReadinessCase(load(caseFile),readLocalDocument,load(routeFile),load(tollFile),readRouteSource)
    const after = prepareD2DReadinessCase(load(caseFile),readLocalDocument,load(routeFile),load(tollFile),readRouteSource,load(borderFile))
    expect(after.readiness.lineage).toEqual(before.readiness.lineage)
    expect(after.readiness.issues).toEqual(before.readiness.issues)
    expect(after.readiness.supportingMxTollEvidence).toEqual(before.readiness.supportingMxTollEvidence)
    expect(after.readiness.costs).toBeNull()
    expect(after.readiness.compositorInvoked).toBe(false)
    expect(after.decision).toMatchObject({requiresBridgeSelection:false,requiresDetailedItinerary:true,
      requiresBinationalProfileValidation:true,operationalScenario:'SAME_BINATIONAL_COMPANY',economicCaseComplete:false,
      businessGatesClosed:0,businessPersisted:false,database:false})
    expect(before.decision.requiresBridgeSelection).toBe(true)
  })
  it.each(['bridgeUsd','crossingUsd','interchangeUsd','borderCharges'])('rejects invented monetary handoff %s including zero', field => {
    const raw = load(borderFile); raw.handoff[field] = 0
    expect(() => review(raw)).toThrow()
  })
  it('rejects false approval, an invented carrier and an unsupported operation choice', () => {
    const raw = load(borderFile)
    expect(() => review({...raw,adoptionEligible:true})).toThrow()
    expect(() => review({...raw,confirmations:{...raw.confirmations,carrier:'Invented carrier'}})).toThrow()
    expect(() => review({...raw,confirmations:{...raw.confirmations,operatingScenario:'TWO_INDEPENDENT_CARRIERS'}})).toThrow()
  })
  it('rejects altered case/source bytes and a different direction, cut or context', () => {
    expect(() => review(load(borderFile),load(caseFile),file => Buffer.concat([readRouteSource(file),Buffer.from('\n')]))).toThrow('BORDER_PIN_HASH_MISMATCH')
    expect(() => review(load(borderFile),{...load(caseFile),direction:'US_TO_MX'})).toThrow('BORDER_CASE_OR_DATE_MISMATCH')
    const raw = load(borderFile); raw.cutDate = '2026-09-29'
    expect(() => review(raw)).toThrow('BORDER_CASE_OR_DATE_MISMATCH')
    expect(() => review({...load(borderFile),cutDate:'2026-02-30'})).toThrow()
  })
  it('rejects duplicate, unused or dangling source identities', () => {
    const raw = load(borderFile)
    expect(() => review({...raw,sources:[...raw.sources,raw.sources[0]]})).toThrow('BORDER_SOURCE_BINDING_INVALID')
    expect(() => review({...raw,sources:raw.sources.slice(1)})).toThrow('BORDER_SOURCE_BINDING_INVALID')
    expect(() => review({...raw,sources:[...raw.sources,{...raw.sources[0],id:'unused'}]})).toThrow('BORDER_SOURCE_BINDING_INVALID')
  })
  it('requires the byte reader for integrated evidence', () => {
    expect(() => prepareD2DReadinessCase(load(caseFile),text,undefined,undefined,undefined,load(borderFile)))
      .toThrow('BORDER_BYTE_READER_REQUIRED')
  })
  it('runs the existing hermetic CLI with border annex, not a provider or database workflow', () => {
    const root = fileURLToPath(new URL('../../../',import.meta.url))
    const run = spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs','apps/api/scripts/run-d2d-readiness-case.ts',
      caseFile,routeFile,tollFile,borderFile],{cwd:root,encoding:'utf8',timeout:10000,
      env:{...process.env,DATABASE_URL:'invalid-db-canary',STAGING_DATABASE_URL:'invalid-staging-canary'}})
    expect(run.error).toBeUndefined(); expect(run.status).toBe(2)
    const report = JSON.parse(run.stdout)
    expect(report.readiness.supportingBorderEvidence.confirmations.bridgeChosenByUser).toBe(true)
    expect(report.readiness.supportingBorderEvidence.adoptedValues).toBe(0)
    expect(report.readiness.issues).toHaveLength(41)
    expect(report.readiness.costs).toBeNull()
    expect(run.stdout).not.toContain('invalid-db-canary')
  })
})
