import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readRouteSource } from '../scripts/review-d2d-route-evidence.js'
import { reviewMxTollReconciliation } from '../src/modules/routing/mx-toll-reconciliation.js'

const manifestFile = 'docs/research/B2_MX_TOLL_RECONCILIATION_2026-09-30.json'
const caseFile = 'docs/research/B2_D2D_READINESS_CASE_2026-09-30.json'
const routeFile = 'docs/research/B2_D2D_SAKBE_ROUTE_LINK_2026-09-30.json'
const fixture = () => JSON.parse(readRouteSource(manifestFile).toString('utf8'))
const followupFile = 'docs/research/B2_MX_TOLL_FOLLOWUP_2026-09-30.json'
const followup = () => JSON.parse(readRouteSource(followupFile).toString('utf8'))
const context = () => JSON.parse(readRouteSource(caseFile).toString('utf8'))
const review = (manifest = fixture(), source = readRouteSource, caseContext = context()) => reviewMxTollReconciliation(manifest, caseContext, source)

describe('MX toll annex: byte-pinned research, never cost adoption', () => {
  it('extends evidence to every point without approving conflicts or the unsupported zero', () => {
    const result = review(followup())
    expect(result).toMatchObject({ tollPointCount:14, datedNumericMatches:7, undatedNumericMatches:5,
      missingPrimaryTariffs:[], unsupportedZeroPoints:[43], sourcePinsVerified:8,
      unarchivedSources:['SICT_LOSLP','SICT_MXPACHUCA','SICT_MATEHUALA','SICT_CARBONERA'],
      approvedTollPoints:0, approvedTotalMxn:null, adoptedValues:0, quoteReady:false })
    expect(result.rows.find(row=>row.segmentIndex===36)).toMatchObject({
      observedMxn:144, status:'NUMERIC_CONFLICT_OR_OTHER_MOVEMENT', movementConfirmed:false })
    expect(result.rows.find(row=>row.segmentIndex===43)).toMatchObject({
      observedMxn:0, status:'ZERO_UNVERIFIED', adoptionEligible:false })
  })
  it('transcribes META C5 from its original JSON without treating updated_at as effectiveFrom', () => {
    const m=followup(), alt=m.rows.find((row:any)=>row.segmentIndex===32).alternatives[0]
    const source=m.sources.find((row:any)=>row.id==='META_VENTURA')
    const rates=JSON.parse(readRouteSource(source.file).toString('utf8'))
    const rate=rates.find((row:any)=>row.id===89 && row.bypass_id===7 && row.kind.trim()==='C5')
    expect(Number(rate.price)).toBe(alt.amountMxn)
    expect(alt.effectiveFrom).toBeNull()
    expect(review(m).rows.find(row=>row.segmentIndex===32)?.status).toBe('UNDATED_NUMERIC_MATCH_ONLY')
  })
  it('preserves every original provider observation and the same route/case pins in the followup', () => {
    const before=fixture(), after=followup()
    expect(after.routeLinkPin).toEqual(before.routeLinkPin)
    expect(after.rows.map((row:any)=>[row.segmentIndex,row.instruction,row.observedMxn])).toEqual(
      before.rows.map((row:any)=>[row.segmentIndex,row.instruction,row.observedMxn]))
    expect(after.handoff).toEqual(before.handoff)
    expect(review(after).coverageGroupsToReview).toEqual([{group:'CARBONERA_PUERTO_MEXICO',segmentIndices:[40,43]}])
  })
  it('keeps followup integration offline and economic readiness unchanged', () => {
    const root=fileURLToPath(new URL('../../../',import.meta.url))
    const run=(annex:string)=>spawnSync(process.execPath,[fileURLToPath(new URL('../../../node_modules/tsx/dist/cli.mjs',import.meta.url)),
      'apps/api/scripts/run-d2d-readiness-case.ts',caseFile,routeFile,annex],{cwd:root,encoding:'utf8',timeout:30_000,
      env:{...process.env,DATABASE_URL:'invalid',STAGING_DATABASE_URL:'invalid',GOOGLE_ROUTES_API_KEY:'',SAKBE_TOKEN:''}})
    const before=run(manifestFile), after=run(followupFile)
    expect(before.status).toBe(2);expect(after.status).toBe(2)
    const a=JSON.parse(before.stdout), b=JSON.parse(after.stdout)
    expect(b.readiness.issues).toEqual(a.readiness.issues)
    expect(b.readiness.lineage).toEqual(a.readiness.lineage)
    expect(b.readiness.supportingMxTollEvidence).toMatchObject({datedNumericMatches:7,undatedNumericMatches:5,
      approvedTotalMxn:null, compositorInvoked:false, networkAccessed:false, databaseAccessed:false})
    expect(b.readiness.compositorInvoked).toBe(false)
  })
  it('covers all real toll points, including zero, without choosing or summing alternatives', () => {
    const result = review()
    expect(result).toMatchObject({ status:'INCOMPLETE', tollPointCount:14, datedNumericMatches:6,
      undatedNumericMatches:3, missingPrimaryTariffs:[11,32,36,50], unsupportedZeroPoints:[43],
      approvedTollPoints:0, approvedTotalMxn:null, adoptionEligible:false, tripInputsChanged:false,
      sourcePinsVerified:6, routePinsVerified:3, unarchivedSources:['SICT_LOSLP'],
      compositorInvoked:false, networkAccessed:false, databaseAccessed:false,
      handoff:{tollsMxn:null,tollsUsd:null,serviceDate:null,crossingUsd:null,interchangeUsd:null} })
    expect(result.coverageGroupsToReview).toEqual([{group:'CARBONERA_PUERTO_MEXICO',segmentIndices:[40,43]}])
    expect(result.rows.every(row => !row.adoptionEligible && !row.movementConfirmed)).toBe(true)
  })
  it('requires raw PDF bytes, not UTF8-decoded binary, for hashes', () => {
    expect(()=>review(fixture(),file=>Buffer.from(readRouteSource(file).toString('utf8')))).toThrow('TOLL_PIN_HASH_MISMATCH')
  })
  it('rejects a changed source archive before any classification', () => {
    expect(()=>review(fixture(),file=>file.endsWith('.html')?Buffer.from('altered'):readRouteSource(file))).toThrow('TOLL_PIN_HASH_MISMATCH')
  })
  it('rejects altered route pin',()=>{const m=fixture();m.routeLinkPin.sha256='0'.repeat(64);expect(()=>review(m)).toThrow('TOLL_PIN_HASH_MISMATCH')})
  it('requires complete coverage including the unpaid point',()=>{const m=fixture();m.rows=m.rows.filter((row:any)=>row.segmentIndex!==43);expect(()=>review(m)).toThrow('TOLL_SEGMENT_COVERAGE_MISMATCH')})
  it.each(['instruction','observedMxn','segmentIndex'])('rejects renamed/repriced/rebound provider row %s',field=>{
    const m=fixture();m.rows[0][field]=field==='instruction'?'other':999;expect(()=>review(m)).toThrow('TOLL_SEGMENT_COVERAGE_MISMATCH')
  })
  it('rejects duplicate row and ordering drift',()=>{const m=fixture();m.rows[1]=m.rows[0];expect(()=>review(m)).toThrow('TOLL_SEGMENT_COVERAGE_MISMATCH')})
  it('rejects another case HEAD',()=>{const m=fixture();m.baseHead='0'.repeat(40);expect(()=>review(m)).toThrow('TOLL_CASE_OR_PROFILE_MISMATCH')})
  it('rejects future tariff or invalid calendar date',()=>{const m=fixture();m.rows[2].alternatives[0].effectiveFrom='2026-10-01';expect(()=>review(m)).toThrow('TOLL_TARIFF_AFTER_CUT');m.rows[2].alternatives[0].effectiveFrom='2026-02-30';expect(()=>review(m)).toThrow()})
  it('rejects duplicate sources and missing source references',()=>{const m=fixture();m.sources.push(m.sources[0]);expect(()=>review(m)).toThrow('DUPLICATE_TOLL_SOURCE');const n=fixture();n.rows[2].alternatives[0].sourceId='unknown';expect(()=>review(n)).toThrow('TOLL_SOURCE_MISSING')})
  it('rejects duplicate movement alternative',()=>{const m=fixture();m.rows[2].alternatives.push(m.rows[2].alternatives[0]);expect(()=>review(m)).toThrow('DUPLICATE_TOLL_ALTERNATIVE')})
  it('classifies changed documentary contrasts as conflicts, never fixes provider amounts',()=>{const m=fixture();m.rows[2].alternatives[0].amountMxn=999;const result=review(m);expect(result.rows[2]).toMatchObject({observedMxn:642,status:'NUMERIC_CONFLICT_OR_OTHER_MOVEMENT',adoptionEligible:false})})
  it.each(['adoptionEligible','quoteReady'])('rejects promotion flag %s',flag=>{const m=fixture();m[flag]=true;expect(()=>review(m)).toThrow()})
  it('rejects payable handoff and confirmed movement, even on a dated match',()=>{const m=fixture();m.handoff.tollsMxn=4770;expect(()=>review(m)).toThrow();const n=fixture();n.rows[2].movementConfirmed=true;expect(()=>review(n)).toThrow()})
  it('runs the integrated CLI with unchanged economic issues/lineage and no usable datasource',()=>{
    const root=fileURLToPath(new URL('../../../',import.meta.url))
    const run=(files:string[])=>spawnSync(process.execPath,[fileURLToPath(new URL('../../../node_modules/tsx/dist/cli.mjs',import.meta.url)),
      'apps/api/scripts/run-d2d-readiness-case.ts',...files],{cwd:root,encoding:'utf8',timeout:30_000,
      env:{...process.env,DATABASE_URL:'invalid',STAGING_DATABASE_URL:'invalid',GOOGLE_ROUTES_API_KEY:'',SAKBE_TOKEN:''}})
    const before=run([caseFile,routeFile]),after=run([caseFile,routeFile,manifestFile])
    expect(before.status).toBe(2);expect(after.status).toBe(2)
    const a=JSON.parse(before.stdout),b=JSON.parse(after.stdout)
    expect(b.readiness.issues).toEqual(a.readiness.issues)
    expect(b.readiness.lineage).toEqual(a.readiness.lineage)
    expect(b.readiness.supportingMxTollEvidence).toMatchObject({tollPointCount:14,approvedTotalMxn:null,datedNumericMatches:6})
    expect(b.readiness.compositorInvoked).toBe(false)
  })
})
